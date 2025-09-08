let cur_file = null;
let lrc_data = [];
let globalart = '';
let _ms_art_url = null;

const metadata = {};

function get_meta(file) {
    jsmediatags.read(file, {
        onSuccess: function(tag) {
            const tags = tag.tags;
            metadata.title = tags.title || file.name || 'Unknown title';
            metadata.artist = tags.artist || 'Unknown artist';
            metadata.album = tags.album || 'Unknown album';
            metadata.picture = tags.picture || null;

            if (!metadata.title || !metadata.artist || !metadata.album) {
                throw_error("There is missing metadata, lyrics may not work");
            }

            document.getElementById('artist').innerHTML = `<strong>${truncate(metadata.artist)}</strong>`;
            document.getElementById('album').innerHTML = `<strong>${truncate(metadata.album)}</strong>`;
            document.getElementById('np2').innerHTML = truncate(metadata.title);

            const cover = document.getElementById('cover-art');
            if (metadata.picture) {
                const arr = new Uint8Array(metadata.picture.data);
                let binary = '';
                const cs = 8192;
                for (let i = 0; i < arr.length; i += cs) {
                    binary += String.fromCharCode.apply(null, arr.subarray(i, i + cs));
                }
                const b64 = btoa(binary);
                globalart = `data:${metadata.picture.format};base64,${b64}`;
                cover.src = globalart;
                cover.classList.remove('hidden');
                cover.title = metadata.album || metadata.title || 'Cover art';
                cover.alt = `Cover art for ${metadata.album || metadata.title} by ${metadata.artist}`;
                if ('mediaSession' in navigator) {
                    try {
                        if (_ms_art_url) { URL.revokeObjectURL(_ms_art_url); _ms_art_url = null; }
                        const blob = new Blob([new Uint8Array(metadata.picture.data)], { type: metadata.picture.format || 'image/jpeg' });
                        _ms_art_url = URL.createObjectURL(blob);
                        set_media_session_metadata(_ms_art_url);
                    } catch {
                        set_media_session_metadata();
                    }
                }
            } else {
                globalart = ''; 
                cover.classList.add('hidden');
                if ('mediaSession' in navigator) set_media_session_metadata();
            }

            get_lyrics(metadata.title, metadata.artist, metadata.album, Math.floor(document.getElementById('player').duration));
        },
        onError: function() {
            metadata.title = 'Unknown track';
            metadata.artist = 'Unknown artist';
            metadata.album = 'Unknown album';

            document.getElementById('artist').innerHTML = '';
            document.getElementById('album').innerHTML = '';
            document.getElementById('np2').innerHTML = metadata.title;
            document.getElementById('aod').innerHTML = '';
            document.getElementById('cover-art').classList.add('hidden');
            globalart = ''; 
            throw_error("This file is missing sufficient metadata, lyrics most likely won't work");
            if ('mediaSession' in navigator) set_media_session_metadata();
        }
    });
}

async function get_lyrics(trackName, artistName, albumName, duration) {
    lrc_wipe();
    stat_up(`<i class="fa-solid fa-magnifying-glass"></i> Searching lyrics...`);
    const lrc_con = document.getElementById('lyrics');
    lrc_con.innerHTML = 'Loading...';
    try {
        const response = await fetch(
            `https://lrclib.net/api/get?artist_name=${encodeURIComponent(artistName)}&track_name=${encodeURIComponent(trackName)}&album_name=${encodeURIComponent(albumName)}&duration=${duration}`,
        );
        const data = await response.json();
        if (response.ok && data.instrumental) {
            stat_up(`<i class="fa-solid fa-microphone-lines-slash"></i> This song is an instrumental`);
            lrc_con.innerHTML = '';
            return lrc_data = [lrc_parse(`Instrumental`)[0]];
        } else if (response.ok && data.syncedLyrics) {
            lrc_data = lrc_parse(data.syncedLyrics);
            stat_up(`<i class="fa-solid fa-check"></i> Found lyrics!`);
            update_lyrics();
        } else if (response.ok && data.plainLyrics) {
            lrc_data = data.plainLyrics.split('\n').map(line => ({ time: 0, text: line }));
            update_lyrics();
            stat_up(`<i class="fa-solid fa-minus"></i> No timed lyrics found`);
        } else {
            stat_up(`<i class="fa-solid fa-xmark"></i> No lyrics found`);
            lrc_con.innerHTML = '';
            lrc_data = [];
        }
    } catch (e) {
        stat_up(`<i class="fa-solid fa-xmark"></i> Error loading lyrics`);
        lrc_con.innerHTML = '';
        lrc_data = [];
        throw_error(`Lyrics could not load:<br>${e}<br>You are likely offline.`);
    }
}

function lrc_parse(syncedLyrics) {
    const lines = syncedLyrics.split('\n').filter(line => line.trim());
    return lines.map(line => {
        const match = line.match(/\[(\d{2}:\d{2}\.\d{2})\](.*)/);
        if (match) {
            const timeParts = match[1].split(':');
            const time = parseInt(timeParts[0]) * 60 + parseFloat(timeParts[1]);
            return { time, text: match[2].trim() };
        }
        console.warn(`Skipping malformed LRC line: ${line}`);
        return { time: 0, text: line.trim() };
    }).filter(line => line.text);
}

function lrc_play(lrc_currents, act_index) {
    const lrc_con = document.getElementById('lyrics');
    lrc_con.innerHTML = '';
    const player = document.getElementById('player');

    lrc_currents.forEach((line) => {
        const p = document.createElement('p');
        p.textContent = line.text || ' ';
        p.dataset.index = line.ogindex;
        p.dataset.time = line.time;
        p.style.cursor = 'pointer';

        if (line.ogindex === act_index) {
            p.classList.add('active');
        }

        p.addEventListener('click', () => {
            if (line.time > 0) {
                player.currentTime = line.time;
                if (player.paused) player.play().catch(() => { });
                stat_up(`<i class="fa-solid fa-frog"></i> Jumping to "${line.text.slice(0, 25) + '...'}" at ${Math.floor(line.time / 60)}:${String(Math.floor(line.time % 60)).padStart(2, '0')}...`);
            }
        });

        lrc_con.appendChild(p);
    });
}

function update_lyrics() {
    const player = document.getElementById('player');
    const lrc_con = document.getElementById('lyrics');
    const cur_time = player.currentTime;
    let act_index = -1;

    for (let i = 0; i < lrc_data.length; i++) {
        if (lrc_data[i].time <= cur_time && (i === lrc_data.length - 1 || lrc_data[i + 1].time > cur_time)) {
            act_index = i;
            break;
        }
    }

    const lrc_currents = [];
    let lrc_amount = 16;
    let half = Math.floor(lrc_amount / 2);

    let lrc_si = Math.max(0, act_index - half);
    let lrc_en = Math.min(lrc_data.length - 1, act_index + half);

    if (act_index < half) {
        lrc_en = Math.min(lrc_amount - 1, lrc_data.length - 1);
        lrc_si = 0;
    }
    if (act_index > lrc_data.length - half - 1) {
        lrc_si = Math.max(0, lrc_data.length - lrc_amount);
        lrc_en = lrc_data.length - 1;
    }

    if (lrc_en - lrc_si + 1 < lrc_amount && lrc_data.length >= lrc_amount) {
        if (lrc_si === 0) {
            lrc_en = Math.min(lrc_amount - 1, lrc_data.length - 1);
        } else if (lrc_en === lrc_data.length - 1) {
            lrc_si = Math.max(0, lrc_data.length - lrc_amount);
        }
    }

    for (let i = lrc_si; i <= lrc_en; i++) {
        lrc_currents.push({ ...lrc_data[i], ogindex: i });
    }

    lrc_play(lrc_currents, act_index);

    if (act_index >= 0) {
        const lrc_actel = lrc_con.querySelector(`p[data-index="${act_index}"]`);
        if (lrc_actel) {
            const lrc_actel_h = lrc_con.clientHeight;
            const lrc_act_h = lrc_actel.offsetHeight;
            const lrc_actel_top = lrc_actel.offsetTop;
            const lrc_scrollto = lrc_actel_top - (lrc_actel_h / 2) + (lrc_act_h / 2);
            lrc_con.scrollTo({ top: lrc_scrollto, behavior: 'smooth' });
        }
    }
}

function lrc_wipe() {
    document.getElementById('lyrics').innerHTML = '';
    lrc_data = [];
}

function setCurrentFile(file) {
    cur_file = file;
}

function force() {
    const player = document.getElementById('player');
    player.addEventListener('timeupdate', update_lyrics);
}

document.addEventListener('DOMContentLoaded', force);

console.log('Lyrics module loaded');
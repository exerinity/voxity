let cur_file = null;
let lrc_data = [];
let globalart = '';
let _ms_art_url = null;
let activeLyricsKey = null;
let skipLyricsUpdate = false;
let isLyricsLoading = false;
let lastLyricsRequest = null;
const lrc_con = document.getElementById('lyrics');
let lrc_amount = 16;

const metadata = {};

const LYRICS_SOURCE_KEYS = Object.freeze({
    LRCLIB: 'lrclib',
    MUSIXMATCH: 'musixmatch',
});
const DEFAULT_LYRICS_SOURCE = LYRICS_SOURCE_KEYS.LRCLIB;
const MUSIXMATCH_PROXY_BASE = 'https://lyrics.api.voxity.exerinity.com';

function getPreferredLyricsSource() {
    try {
        if (typeof window === 'undefined' || typeof window.VoxitySettings === 'undefined') {
            return DEFAULT_LYRICS_SOURCE;
        }
        const raw = window.VoxitySettings.get('lyricsSource');
        if (typeof raw === 'string' && raw.toLowerCase() === LYRICS_SOURCE_KEYS.MUSIXMATCH) {
            return LYRICS_SOURCE_KEYS.MUSIXMATCH;
        }
        return DEFAULT_LYRICS_SOURCE;
    } catch {
        return DEFAULT_LYRICS_SOURCE;
    }
}

function getLyricsSourceLabel(sourceKey) {
    return sourceKey === LYRICS_SOURCE_KEYS.MUSIXMATCH ? 'Musixmatch' : 'LRCLIB';
}

function shouldAutoSearchLyrics() {
    return typeof window.VoxitySettings === 'undefined' || window.VoxitySettings.isEnabled('autoLyrics');
}

function buildLyricsRequestKey(file, duration) {
    return [
        file?.name || '',
        file?.size || 0,
        file?.lastModified || 0,
        metadata.title || '',
        metadata.artist || '',
        metadata.album || '',
        duration || 0,
    ].join('|');
}

function maybeExecuteAutoLyrics({ force = false } = {}) {
    if (!lastLyricsRequest) return;
    if (!force && !shouldAutoSearchLyrics()) return;
    const { key, duration } = lastLyricsRequest;
    if (!force && activeLyricsKey === key) return;
    activeLyricsKey = key;
    get_lyrics(metadata.title, metadata.artist, metadata.album, duration);
}

function get_meta(file) {
    jsmediatags.read(file, {
        onSuccess: function (tag) {
            const tags = tag.tags;
            metadata.title = tags.title || file.name || 'Unknown title';
            metadata.artist = tags.artist || 'Unknown artist';
            metadata.album = tags.album || 'Unknown album';
            const hasCompleteMetadata = Boolean(tags.title && tags.artist && tags.album);
            metadata.picture = tags.picture || null;

            if (!hasCompleteMetadata) {
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

            try {
                if (typeof maybeNotifySongStart === 'function') {
                    maybeNotifySongStart(file);
                }
            } catch { }

            try {
                const player = document.getElementById('player');
                const duration = Math.floor(player?.duration || 0) || 0;
                if (hasCompleteMetadata) {
                    lastLyricsRequest = {
                        file,
                        duration,
                        key: buildLyricsRequestKey(file, duration),
                    };
                    maybeExecuteAutoLyrics();
                } else {
                    lastLyricsRequest = null;
                }
            } catch { null }
        },
        onError: function () {
            metadata.title = act_truncate(file.name) || 'Unknown title';
            metadata.artist = 'Unknown artist';
            metadata.album = 'Unknown album';

            document.getElementById('artist').innerHTML = '';
            document.getElementById('album').innerHTML = '';
            document.getElementById('np2').innerHTML = act_truncate(file.name || 'Unknown track');
            document.title = '';
            document.getElementById('cover-art').classList.add('hidden');
            globalart = '';
            if ('mediaSession' in navigator) set_media_session_metadata();
            lastLyricsRequest = null;
            try {
                if (typeof maybeNotifySongStart === 'function') {
                    maybeNotifySongStart(file);
                }
            } catch { }
        }
    });
}

function pickBestMusixmatchResult(results, { duration, trackName, artistName }) {
    if (!Array.isArray(results)) return null;
    const normalizedTitle = (trackName || '').trim().toLowerCase();
    const normalizedArtist = (artistName || '').trim().toLowerCase();
    let best = null;
    let bestScore = -Infinity;
    for (const candidate of results) {
        if (!candidate || typeof candidate !== 'object' || !candidate.lookup_id || !candidate.type) continue;
        let score = 0;
        if (candidate.type === 'Synced') {
            score += 3;
        }
        const candidateTitle = typeof candidate.title === 'string' ? candidate.title.trim().toLowerCase() : '';
        if (normalizedTitle && candidateTitle === normalizedTitle) {
            score += 2;
        }
        const candidateArtist = typeof candidate.artist === 'string' ? candidate.artist.trim().toLowerCase() : '';
        if (normalizedArtist && candidateArtist === normalizedArtist) {
            score += 1;
        }
        const candidateDuration = Number(candidate.duration_sec);
        if (Number.isFinite(candidateDuration) && Number.isFinite(duration)) {
            const diff = Math.abs(candidateDuration - duration);
            if (diff <= 2) score += 3;
            else if (diff <= 5) score += 2;
            else if (diff <= 10) score += 1;
        }
        if (score > bestScore) {
            bestScore = score;
            best = candidate;
        }
    }
    return best || results[0] || null;
}

async function fetchLyricsFromLrclib({ trackName, artistName, albumName, duration, signal }) {
    const normalizedDuration = Number.isFinite(duration) && duration > 0 ? Math.round(duration) : 0;
    const response = await fetch(
        `https://lrclib.net/api/get?artist_name=${encodeURIComponent(artistName || '')}&track_name=${encodeURIComponent(trackName || '')}&album_name=${encodeURIComponent(albumName || '')}&duration=${normalizedDuration}`,
        { signal }
    );
    const data = await response.json();
    if (!response.ok) {
        return { kind: 'none' };
    }
    if (data.instrumental) {
        return { kind: 'instrumental' };
    }
    const syncedLyrics = typeof data.syncedLyrics === 'string' ? data.syncedLyrics : '';
    if (syncedLyrics.trim()) {
        return { kind: 'synced', lyrics: data.syncedLyrics };
    }
    const plainLyrics = typeof data.plainLyrics === 'string' ? data.plainLyrics : '';
    if (plainLyrics.trim()) {
        return { kind: 'plain', lyrics: data.plainLyrics };
    }
    return { kind: 'none' };
}

async function fetchLyricsFromMusixmatch({ trackName, artistName, albumName, duration, signal }) {
    const searchParams = new URLSearchParams({
        artist: artistName || '',
        album: albumName || '',
        title: trackName || '',
    });
    const searchResponse = await fetch(`${MUSIXMATCH_PROXY_BASE}/search?${searchParams.toString()}`, { signal });
    const searchResults = await searchResponse.json();
    if (!searchResponse.ok || !Array.isArray(searchResults) || searchResults.length === 0) {
        return { kind: 'none' };
    }
    const normalizedDuration = Number.isFinite(duration) && duration > 0 ? Math.round(duration) : null;
    const selected = pickBestMusixmatchResult(searchResults, {
        duration: normalizedDuration,
        trackName,
        artistName,
    }) || searchResults[0];
    if (!selected || !selected.lookup_id || !selected.type) {
        return { kind: 'none' };
    }
    const lookupParams = new URLSearchParams({
        lookup_id: selected.lookup_id,
        type: selected.type,
    });
    const lookupResponse = await fetch(`${MUSIXMATCH_PROXY_BASE}/lookup?${lookupParams.toString()}`, { signal });
    const lookupData = await lookupResponse.json();
    if (!lookupResponse.ok || typeof lookupData?.lyrics !== 'string') {
        return { kind: 'none' };
    }
    if (!lookupData.lyrics.trim()) {
        return { kind: 'none' };
    }
    const kind = selected.type === 'Synced' ? 'synced' : 'plain';
    return { kind, lyrics: lookupData.lyrics };
}

let lyricsAbortController = null;

async function get_lyrics(trackName, artistName, albumName, duration) {
    const start = Date.now();
    if (lyricsAbortController) {
        lyricsAbortController.abort();
    }

    lyricsAbortController = new AbortController();
    const { signal } = lyricsAbortController;

    skipLyricsUpdate = false;
    isLyricsLoading = true;
    lrc_wipe();
    const sourceKey = getPreferredLyricsSource();
    const sourceLabel = getLyricsSourceLabel(sourceKey);
    stat_up(`<i class="fa-solid fa-magnifying-glass"></i> Searching ${sourceLabel}...`);

    lrc_con.innerHTML = '<div class="spinner"></div>';
    try {
        const fetcher = sourceKey === LYRICS_SOURCE_KEYS.MUSIXMATCH ? fetchLyricsFromMusixmatch : fetchLyricsFromLrclib;
        const result = await fetcher({ trackName, artistName, albumName, duration, signal });
        if (result && result.kind === 'instrumental') {
            skipLyricsUpdate = true;
            isLyricsLoading = false;
            stat_up(`<i class="fa-solid fa-microphone-lines-slash"></i> This song is an instrumental (${sourceLabel}, ${Date.now() - start}ms)`);
            lrc_con.innerHTML = 'This song is an instrumental';
            const instrumentalLine = lrc_parse('Instrumental')[0];
            lrc_data = instrumentalLine ? [instrumentalLine] : [];
            return lrc_data;
        }
        if (result && result.kind === 'synced' && typeof result.lyrics === 'string') {
            lrc_data = lrc_parse(result.lyrics);
            stat_up(`<i class="fa-solid fa-check"></i> Found lyrics for <strong>${metadata.title}</strong> by <strong>${metadata.artist}</strong> via ${sourceLabel} in ${Date.now() - start}ms`);
            isLyricsLoading = false;
            update_lyrics();
            return;
        }
        if (result && result.kind === 'plain' && typeof result.lyrics === 'string') {
            lrc_data = result.lyrics.split('\n').map(line => ({ time: 0, text: line }));
            isLyricsLoading = false;
            update_lyrics();
            stat_up(`<i class="fa-solid fa-minus"></i> Found unsynced lyrics for <strong>${metadata.title}</strong> by <strong>${metadata.artist}</strong> via ${sourceLabel} in ${Date.now() - start}ms`);
            return;
        }
        stat_up(`<i class="fa-solid fa-xmark"></i> No lyrics found via ${sourceLabel} (${Date.now() - start}ms)`);
        lrc_con.innerHTML = '';
        lrc_data = [];
        isLyricsLoading = false;
    } catch (e) {
        if (signal.aborted) {
            null;
        } else {
            stat_up(`<i class="fa-solid fa-xmark"></i> Error loading lyrics`);
            throw_error(`Lyrics could not load:<br>${e}<br>You are likely offline.`);
        }
        lrc_con.innerHTML = '';
        lrc_data = [];
        isLyricsLoading = false;
    }
}

function lrc_parse(syncedLyrics) {
    const lines = syncedLyrics.split('\n');
    return lines.map((line, index) => {
        const trimmedLine = line.trim();
        const match = line.match(/\[(\d{2}:\d{2}\.\d{2})\](.*)/);
        if (match) {
            const timeParts = match[1].split(':');
            const time = parseInt(timeParts[0]) * 60 + parseFloat(timeParts[1]);
            return {
                time,
                text: match[2].trim(),
                originalIndex: index,
                isBlank: match[2].trim() === ''
            };
        }
        return {
            time: 0,
            text: trimmedLine,
            originalIndex: index,
            isBlank: trimmedLine === ''
        };
    }).filter(line => line !== null);
}

function lrc_play(lrc_currents, act_index) {

    lrc_con.innerHTML = '';
    const player = document.getElementById('player');

    lrc_currents.forEach((line) => {
        const p = document.createElement('p');

        if (line.isBlank) {
            p.classList.add('blank-line');
            p.style.height = '0.5em';
            p.style.minHeight = '0.5em';
            p.textContent = '';
        } else {
            p.textContent = line.text || ' ';
            p.style.cursor = line.time > 0 ? 'pointer' : 'default';

            if (line.originalIndex === act_index) {
                p.classList.add('active');
            }
        }

        p.dataset.index = line.originalIndex;
        p.dataset.time = line.time;

        if (!line.isBlank && line.time > 0) {
            p.addEventListener('click', () => {
                player.currentTime = line.time;
                if (player.paused) player.play().catch(() => { });
                stat_up(`<i class="fa-solid fa-frog"></i> Jumping to "${line.text.slice(0, 25) + '...'}" at ${Math.floor(line.time / 60)}:${String(Math.floor(line.time % 60)).padStart(2, '0')}...`);
            });
        }

        lrc_con.appendChild(p);
    });
}

function update_lyrics() {
    if (skipLyricsUpdate || isLyricsLoading) return;
    const player = document.getElementById('player');

    const cur_time = player.currentTime;
    let act_index = -1;

    for (let i = 0; i < lrc_data.length; i++) {
        if (lrc_data[i].time <= cur_time && (i === lrc_data.length - 1 || lrc_data[i + 1].time > cur_time)) {
            if (!lrc_data[i].isBlank) {
                act_index = i;
            }
            break;
        }
    }

    const lrc_currents = [];
    let half = Math.floor(lrc_amount / 2);

    let display_index = act_index >= 0 ? act_index : Math.max(0, lrc_data.findLastIndex(line => line.time <= cur_time) || 0);

    let lrc_si = Math.max(0, display_index - half);
    let lrc_en = Math.min(lrc_data.length - 1, display_index + half);

    if (display_index < half) {
        lrc_en = Math.min(lrc_amount - 1, lrc_data.length - 1);
        lrc_si = 0;
    }
    if (display_index > lrc_data.length - half - 1) {
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
        lrc_currents.push({ ...lrc_data[i], originalIndex: i });
    }

    lrc_play(lrc_currents, act_index);

    const scrollTargetIndex = act_index >= 0 ? act_index : display_index;
    const lrc_actel = lrc_con.querySelector(`p[data-index="${scrollTargetIndex}"]`);
    if (lrc_actel) {
        const lrc_actel_h = lrc_con.clientHeight;
        const lrc_act_h = lrc_actel.offsetHeight;
        const lrc_actel_top = lrc_actel.offsetTop;
        const lrc_scrollto = lrc_actel_top - (lrc_actel_h / 2) + (lrc_act_h / 2);
        lrc_con.scrollTo({ top: lrc_scrollto, behavior: 'smooth' });
    }
}

function lrc_wipe() {
    document.getElementById('lyrics').innerHTML = '';
    lrc_data = [];
}

function setCurrentFile(file) {
    cur_file = file;
    activeLyricsKey = null;
    lastLyricsRequest = null;
}

function force() {
    const player = document.getElementById('player');
    player.addEventListener('timeupdate', update_lyrics);
}

document.addEventListener('DOMContentLoaded', force);

document.addEventListener('voxity:settings-changed', (event) => {
    if (!event) return;
    const key = event.detail?.key;
    if (key === 'autoLyrics') {
        if (event.detail.value) {
            maybeExecuteAutoLyrics({ force: true });
        }
        return;
    }
    if (key === 'lyricsSource' && shouldAutoSearchLyrics()) {
        maybeExecuteAutoLyrics({ force: true });
    }
});

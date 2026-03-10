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

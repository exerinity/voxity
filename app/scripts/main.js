const deb_ms = 500;
let lastact = 0;
const elements = {
    player: document.getElementById('player'),
    upload: document.getElementById('upload'),
    status: document.getElementById('status'),
    title: document.getElementById('np'),
    title2: document.getElementById('np2'),
    timeCurrent: document.getElementById('time-current'),
    timeDuration: document.getElementById('time-duration'),
    index: document.getElementById('index'),
    indexTooltip: document.getElementById('index-tooltip'),
    vol: document.getElementById('volume'),
    vol_min: document.getElementById('vol-min'),
    vol_max: document.getElementById('vol-max'),
    speed: document.getElementById('speed'),
    speed_min: document.getElementById('spd-min'),
    speed_max: document.getElementById('spd-max'),
    viz_int: document.getElementById('viz-intensity'),
    viz_mo: document.getElementById('viz-mode'),
    eq_pre: document.getElementById('eq-preset'),
    err_tab: document.getElementById('error'),
    pnow: document.getElementById('play-now'),
    stopnow: document.getElementById('cancel'),
    success_sound: document.getElementById('sucsound'),
    error_sound: document.getElementById('errsound'),
    branding: document.getElementById('branding'),
};

let stat_calls = 0;
let stat_out = null;

function stat_up(msg, ac = true) {
    stat_calls++;
    elements.status.innerHTML = msg;

    if (ac) {
        if (stat_out) {
            clearTimeout(stat_out);
        }
        stat_out = setTimeout(() => {
            if (!elements.player.src) {
                elements.status.innerHTML = '<i class="fa-solid fa-tower-broadcast"></i> Audion';
                elements.branding.innerHTML = null;
            } else if (elements.player.paused) {
                elements.status.innerHTML = `<i class="fa-solid fa-circle-pause"></i> <strong>${metadata.title || 'Unknown track'}</strong> by ${metadata.artist || 'Unknown artist'}`;
                elements.branding.innerHTML = '<i class="fa-solid fa-tower-broadcast" style="color: #8000ff;"></i> Audion';
            } else {
                elements.status.innerHTML = `<i class="fa-solid fa-circle-play"></i> <strong>${metadata.title || 'Unknown track'}</strong> by ${metadata.artist || 'Unknown artist'}`;
                elements.branding.innerHTML = '<i class="fa-solid fa-tower-broadcast fa-beat" style="color: #8000ff;"></i> Audion';
            }
            stat_out = null;
        }, 2000);
    }
}

function debounce(fn) {
    return () => {
        const now = Date.now();
        if (now - lastact < deb_ms) return;
        lastact = now;
        fn();
    };
}

function wheel(target, fall) {
    if (!target) return;
    target.addEventListener('wheel', (e) => {
        e.preventDefault();
        const raws = parseFloat(target.step);
        let step = !isNaN(raws) && raws > 0 ? raws : (fall ? fall() : 1);
        if (e.shiftKey) step *= 5;
        const direction = e.deltaY < 0 ? 1 : -1;
        const min = parseFloat(target.min);
        const max = parseFloat(target.max);
        const cur = parseFloat(target.value);
        let next = cur + direction * step;
        if (!isNaN(min)) next = Math.max(min, next);
        if (!isNaN(max)) next = Math.min(max, next);
        target.value = String(next);
        target.dispatchEvent(new Event('input', { bubbles: true }));
    }, { passive: false });
}

function play(file, name) {
    lrc_wipe();
    if (!elements.success_sound.paused) {
        elements.success_sound.pause();
    }
    const now = Date.now();
    if (now - lastact < deb_ms) return;
    lastact = now;
    elements.player.src = URL.createObjectURL(file);
    setCurrentFile(file);
    let retries = 0;
    const m_retries = 3;
    function attempt2play() {
        elements.player.play().then(() => {
            document.getElementById('plps').innerHTML = '<i class="fa-solid fa-pause"></i>';
            context_init(elements.player);
            vis_init();
            elements.title2.innerHTML = name;
            get_meta(file);
            const ra = parseFloat(elements.vol.value);
            elements.player.volume = isNaN(ra) ? 1 : Math.max(0, Math.min(1, ra / 2));
            const rt = parseFloat(elements.speed.value);
            elements.player.playbackRate = isNaN(rt) ? 1 : rateRaw;
        }).catch(e => {
            if (retries < m_retries) {
                retries++;
                setTimeout(attempt2play, 1000);
            } else {
                throw_error(e.message);
                stat_up('Error playing...');
            }
        });
    }
    elements.player.addEventListener('canplaythrough', attempt2play, { once: true });
}

function init() {
    if (/android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(navigator.userAgent)) {
        throw_error("Mobile detected");
        msg(`<h1>Mobile is not recommended</h1><p>Audion is not recommended or optimized for mobile devices. For the best experience, please use a desktop.`)
    }

    document.getElementById('app').classList.remove('hidden');

    elements.upload.addEventListener('change', function () {
        const file = elements.upload.files[0];
        if (file) {
            stat_up(`<i class="fa-solid fa-hourglass fa-spin"></i> Loading...`);
            play(file, file.name);
        }
    });

    let onrepeat = true;
    elements.player.loop = true;
    const rep_button = document.getElementById('loop');
    rep_button.innerHTML = '<i class="fa-solid fa-repeat"></i>';
    rep_button.style.color = 'green';
    document.getElementById('loop').addEventListener('click', debounce(() => {
        onrepeat = !onrepeat;
        elements.player.loop = onrepeat;
        rep_button.innerHTML = '<i class="fa-solid fa-repeat"></i>';
        rep_button.style.color = onrepeat ? 'green' : 'red';
        stat_up(onrepeat ? '<i class="fa-solid fa-repeat"></i> Loop ON' : '<i class="fa-solid fa-repeat"></i> Loop OFF');
    }));

    elements.player.addEventListener('play', () => {
        if (frame_id) {
            cancelAnimationFrame(frame_id);
        }
        frame_id = requestAnimationFrame(vis_init);
    });

    elements.player.addEventListener('pause', () => {
        if (frame_id) {
            cancelAnimationFrame(frame_id);
            frame_id = null;
        }
    });

    elements.player.addEventListener('ended', () => {
        stat_up('<i class="fa-solid fa-octagon"></i> Stopped');
    });

    elements.player.addEventListener('error', (e) => {
        const error = elements.player.error;
        let err_msg = 'Playback error: ';
        if (error) {
            if (error.code === 4) {
                err_msg = "Your browser doesn't support this file format!";
            } else {
                err_msg += ` (Code ${error.code}${error.message ? ': ' + error.message : ''})`;
            }
        }
        throw_error(err_msg);
    });

    elements.player.addEventListener('timeupdate', () => {
        const current = form_time(elements.player.currentTime);
        const duration = form_time(elements.player.duration);
        elements.timeCurrent.innerHTML = current;
        elements.timeDuration.innerHTML = duration;
        elements.index.max = elements.player.duration || 100;
        elements.index.value = elements.player.currentTime;
        update_lyrics();
    });

    elements.vol.addEventListener('input', () => {
        let hi = '<i class="fa-solid fa-volume-high"></i>';
        let med = '<i class="fa-solid fa-volume-low"></i>';
        let low = '<i class="fa-solid fa-volume-off"></i>';
        let mute = '<i class="fa-solid fa-volume-xmark"></i>';
        elements.player.volume = elements.vol.value / 2;
        elements.vol_min.innerHTML = '0';
        elements.vol_max.innerHTML = '1';

        let icon;
        if (elements.player.volume === 0) {
            icon = mute;
        } else if (elements.player.volume < 0.33) {
            icon = low;
        } else if (elements.player.volume < 0.66) {
            icon = med;
        } else {
            icon = hi;
        }

        stat_up(`${icon} Volume: ${(elements.player.volume * 100).toFixed(0)}%`);
    });

    elements.speed.addEventListener('input', () => {
        let low = '<i class="fa-solid fa-gauge-high fa-flip-horizontal"></i>';
        let med = '<i class="fa-solid fa-gauge"></i>';
        let hi = '<i class="fa-solid fa-gauge-high"></i>';
        let icon;
        if (elements.speed.value < 0.7) {
            icon = low;
        } else if (elements.speed.value < 1.3) {
            icon = med;
        } else {
            icon = hi;
        }
        elements.player.playbackRate = elements.speed.value;
        elements.speed_min.innerHTML = '0.1x';
        elements.speed_max.innerHTML = '2.0x';
        stat_up(`${icon} Speed: ${elements.speed.value}x`);
    });

    elements.index.addEventListener('input', () => {
        elements.player.currentTime = elements.index.value;
        stat_up(`<i class="fa-solid fa-music"></i> Scrubbing to: ${form_time(elements.index.value)} / ${form_time(elements.player.duration)}`);
    });

    elements.viz_mo.addEventListener('change', () => {
        stat_up(`<i class="fa-solid fa-chart-simple"></i> Visualizer mode: ${elements.viz_mo.value}`);
    });

    wheel(elements.index, () => 3);
    wheel(elements.vol, () => 0.1); 
    wheel(elements.speed, () => 0.01);
}

function form_time(t) {
    if (isNaN(t)) return '--:--';
    const m = Math.floor(t / 60);
    const s = Math.floor(t % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
}

function truncate(text, truncate_max = 50) {
    if (text.length <= truncate_max) {
        return `<span>${text}</span>`;
    }
    return `
        <div class="mqcont">
            <div class="mqtext">${text}</div>
        </div>
    `;
}

function act_truncate(text, truncate_max = 30) {
    if (text.length <= truncate_max) {
        return text;
    }
    return text.slice(0, truncate_max) + '...';
}


stat_up('<i class="fa-solid fa-tower-broadcast fa-beat" style="color: #8000ff;"></i> Welcome to Audion!');


document.addEventListener('DOMContentLoaded', init) || init();
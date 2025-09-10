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
    err_tab: document.getElementById('error'),
    pnow: document.getElementById('play-now'),
    stopnow: document.getElementById('cancel'),
    success_sound: document.getElementById('sucsound'),
    error_sound: document.getElementById('errsound'),
    branding: document.getElementById('branding'),
    queueList: document.getElementById('queue-list'),
};

let stat_calls = 0;
let stat_out = null;
let currentObjectUrl = null;
let pt = 0;
let cph = null;

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
                elements.branding.innerHTML = '<i class="fa-solid fa-tower-broadcast bop"></i> Audion';
            } else {
                elements.status.innerHTML = `<i class="fa-solid fa-circle-play"></i> <strong>${metadata.title || 'Unknown track'}</strong> by ${metadata.artist || 'Unknown artist'}`;
                elements.branding.innerHTML = '<i class="fa-solid fa-tower-broadcast fa-beat bop"></i> Audion';
            }
            stat_out = null;
        }, 2000);
    }
}

function debounce(fn) {
    return () => {
        const now = Date.now();
        if (now - lastact < deb_ms) return;
        fn();
        lastact = Date.now();
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
    const t = ++pt;
    try { elements.player.pause(); } catch { }
    lrc_wipe();
    if (!elements.success_sound.paused) {
        elements.success_sound.pause();
    }
    if (cph) {
        try { elements.player.removeEventListener('canplaythrough', cph); } catch { }
        cph = null;
    }
    try { if (currentObjectUrl) URL.revokeObjectURL(currentObjectUrl); } catch { }
    currentObjectUrl = URL.createObjectURL(file);
    elements.player.src = currentObjectUrl;
    try { elements.player.load(); } catch { }
    elements.player.classList.remove('hidden');
    setCurrentFile(file);
    let r = 0;
    const mr = 3;
    function ap() {
        if (t !== pt) return;
        elements.player.play().then(() => {
            if (t !== pt) return;
            document.getElementById('plps').innerHTML = '<i class="fa-solid fa-pause"></i>';
            context_init(elements.player);
            vis_init();
            elements.title2.innerHTML = name;
            get_meta(file);
            const ra = parseFloat(elements.vol.value);
            elements.player.volume = isNaN(ra) ? 1 : Math.max(0, Math.min(1, ra / 2));
            const rt = parseFloat(elements.speed.value);
            elements.player.playbackRate = isNaN(rt) ? 1 : rt;
        }).catch(e => {
            if (t !== pt) return;
            if (r < mr) {
                r++;
                setTimeout(() => { if (t !== pt) return; ap(); }, 1000);
            } else {
                throw_error(e.message);
                stat_up('Error playing...');
            }
        });
    }
    ap();
    cph = () => { if (t !== pt) return; ap(); };
    elements.player.addEventListener('canplaythrough', cph, { once: true });
}

const queue = [];
let currentIndex = -1;

function rqueue() {
    const ul = elements.queueList;
    if (!ul) return;
    ul.innerHTML = '';
    queue.forEach((item, idx) => {
        const li = document.createElement('li');
        li.className = 'queue-item' + (idx === currentIndex ? ' active' : '');
        const title = item.meta?.title;
        const artist = item.meta?.artist;
        const label = (title || artist) ? `${title || 'Unknown track'} by ${artist || 'Unknown artist'}` : (item.displayName || item.file.name);
        li.textContent = '';
        li.title = label;
        li.addEventListener('dblclick', () => pindex(idx));
        li.addEventListener('click', () => {
            const cur = ul.querySelector('.queue-item.focus');
            if (cur) cur.classList.remove('focus');
            li.classList.add('focus');
        });

        const lf = document.createElement('span');
        lf.className = 'qi-left';
        const n = document.createElement('span');
        n.className = 'qi-num';
        n.textContent = String(idx + 1);
        const lb = document.createElement('span');
        lb.className = 'qi-label';
        lb.textContent = label;
        lf.appendChild(n);
        lf.appendChild(lb);

        const rem = document.createElement('button');
        rem.className = 'qi-remove';
        rem.innerHTML = '<i class="fa-solid fa-xmark"></i>';
        rem.title = 'Remove from queue';
        rem.addEventListener('click', (e) => {
            e.stopPropagation();
            remq(idx);
        });
        li.appendChild(lf);
        li.appendChild(rem);

        ul.appendChild(li);
    });
}

function quf(fileList) {
    const files = Array.from(fileList).filter(f => f && f.type?.startsWith('audio/'));
    if (files.length === 0) {
        throw_error('No audio files selected');
        return;
    }
    const isemp = queue.length === 0;
    for (const f of files) {
        const item = { file: f, displayName: f.name };
        queue.push(item);
        try {
            jsmediatags.read(f, {
                onSuccess: (tag) => {
                    const t = tag?.tags || {};
                    item.meta = {
                        title: t.title || '',
                        artist: t.artist || '',
                        album: t.album || '',
                    };
                    rqueue();
                },
                onError: () => { null }
            });
        } catch { null }
    }
    rqueue();
    throw_error(`Added ${files.length} file${files.length > 1 ? 's' : ''} to queue`, true);
    if (isemp && queue.length > 0) {
        pindex(0);
    }
}

function pindex(idx) {
    if (idx < 0 || idx >= queue.length) return;
    currentIndex = idx;
    const item = queue[idx];
    play(item.file, item.displayName || item.file.name);
    rqueue();
}

function contin() {
    if (queue.length === 0) return;
    const next = currentIndex + 1;
    if (next < queue.length) {
        pindex(next);
    } else {
        throw_error('Already at the end of the queue');
    }
}

function previ() {
    if (queue.length === 0) return;
    const prev = currentIndex - 1;
    if (prev >= 0) {
        pindex(prev);
    } else {
        throw_error('Already at the start of the queue');
    }
}

function clea() {
    if (!metadata.title && !metadata.artist) {
        return throw_error('No track playing!');
    }
    if (queue.length === 0) {
        return throw_error('Queue is already empty');
    }
    window.location.reload();
    // this is scrappy but whatever
}

function remq(idx) {
    if (queue.length <= 1) {
        throw_error('There are no more tracks to remove');
        return;
    }
    if (idx < 0 || idx >= queue.length) return;
    const wasCurrent = idx === currentIndex;
    queue.splice(idx, 1);
    if (currentIndex > idx) currentIndex -= 1;
    if (wasCurrent) {
        if (idx < queue.length) {
            pindex(idx);
        } else if (queue.length > 0) {
            pindex(queue.length - 1);
        } else {
            elements.player.pause();
            elements.player.src = '';
            lrc_wipe();
            metadata.title = '';
            metadata.artist = '';
            metadata.album = '';
            document.getElementById('np2').innerHTML = '';
            document.getElementById('artist').innerHTML = '';
            document.getElementById('album').innerHTML = '';
        }
    }
    rqueue();
}

function init() {
    if (/android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(navigator.userAgent)) {
        throw_error("Mobile detected");
        msg(`<h1>Mobile is not recommended</h1><p>Audion is not recommended or optimized for mobile devices. For the best experience, please use a desktop.`)
    }

    document.getElementById('app').classList.remove('hidden');
    document.getElementById('dropzone')?.addEventListener('contextmenu', (e) => e.preventDefault(), { once: true });
    document.getElementById('droppedzone')?.addEventListener('contextmenu', (e) => e.preventDefault(), { once: true });

    elements.upload.addEventListener('change', function () {
        if (elements.upload.files && elements.upload.files.length > 0) {
            quf(elements.upload.files);
            elements.upload.value = '';
        }
    });

    let onrepeat = false;
    elements.player.loop = onrepeat;
    const rep_button = document.getElementById('loop');
    rep_button.innerHTML = '<i class="fa-solid fa-repeat"></i>';
    rep_button.style.color = onrepeat ? 'green' : 'red';
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
        if ('mediaSession' in navigator) {
            try { navigator.mediaSession.playbackState = 'playing'; } catch { }
            const setPos = navigator.mediaSession.setPositionState?.bind(navigator.mediaSession);
            if (setPos) {
                try { setPos({ duration: elements.player.duration || 0, playbackRate: elements.player.playbackRate || 1, position: elements.player.currentTime || 0 }); } catch { }
            }
        }
    });

    elements.player.addEventListener('pause', () => {
        if (frame_id) {
            cancelAnimationFrame(frame_id);
            frame_id = null;
        }
        if ('mediaSession' in navigator) {
            try { navigator.mediaSession.playbackState = 'paused'; } catch { }
            const setPos = navigator.mediaSession.setPositionState?.bind(navigator.mediaSession);
            if (setPos) {
                try { setPos({ duration: elements.player.duration || 0, playbackRate: elements.player.playbackRate || 1, position: elements.player.currentTime || 0 }); } catch { }
            }
        }
    });

    elements.player.addEventListener('ended', () => {
        if (elements.player.loop) {
            return;
        }
        const hadNext = currentIndex + 1 < queue.length;
        if (hadNext) {
            contin();
        } else {
            stat_up('<i class="fa-solid fa-octagon"></i> Stopped');
            elements.player.currentTime = 0;
            elements.player.pause();
            document.getElementById('msgsound').currentTime = 0;
            document.getElementById('msgsound').play().catch(() => { });
            document.getElementById('plps').innerHTML = '<i class="fa-solid fa-play"></i>';
            lrc_reset();
            if ('mediaSession' in navigator) {
                try { navigator.mediaSession.playbackState = 'paused'; } catch { }
            }
        }
    });

    elements.player.addEventListener('error', (e) => {
        const error = elements.player.error;
        let err_msg = 'Playback error: ';
        if (error) {
            switch (error.code) {
                case error.MEDIA_ERR_ABORTED:
                    err_msg += 'you aborted the media playback';
                    break;
                case error.MEDIA_ERR_DECODE:
                    err_msg += 'this file is either corrupted or is unsupported by your browser';
                    break;
                case error.MEDIA_ERR_SRC_NOT_SUPPORTED:
                    err_msg += 'this format is unsupported by your browser';
                    break;
                default:
                    err_msg += 'unknown';
                    break;
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
        if ('mediaSession' in navigator && navigator.mediaSession.setPositionState) {
            try {
                navigator.mediaSession.setPositionState({
                    duration: elements.player.duration || 0,
                    playbackRate: elements.player.playbackRate || 1,
                    position: elements.player.currentTime || 0,
                });
            } catch { }
        }
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

    if ('mediaSession' in navigator) {
        try {
            navigator.mediaSession.setActionHandler('play', async () => {
                try { await elements.player.play(); } catch { }
            });
            navigator.mediaSession.setActionHandler('pause', () => {
                elements.player.pause();
            });
            navigator.mediaSession.setActionHandler('nexttrack', () => { contin(); });
            navigator.mediaSession.setActionHandler('previoustrack', () => {
                previ();
            });
        } catch { }
    }

    const dropTarget = document.getElementById('dropzone');
    if (dropTarget) {
        dropTarget.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'copy';
        });
        dropTarget.addEventListener('drop', (e) => {
            e.preventDefault();
            const dt = e.dataTransfer;
            if (dt?.files && dt.files.length > 0) {
                quf(dt.files);
            }
        });
    }

    document.getElementById('nexttrack')?.addEventListener('click', debounce(() => contin()));
    document.getElementById('prevtrack')?.addEventListener('click', debounce(() => previ()));
    document.getElementById('clearqueue')?.addEventListener('click', debounce(() => {
        clea();
    }));
}
window.contin = contin;
window.previ = previ;
window.nextTrack = contin;
window.prevTrack = previ;

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


stat_up('<i class="fa-solid fa-tower-broadcast fa-beat bop"></i> Welcome to Audion!');

let inited = false;
function ri() { if (inited) return; inited = true; init(); }
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', ri, { once: true });
} else {
    ri();
}
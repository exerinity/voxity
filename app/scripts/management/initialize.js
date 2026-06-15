const deb_ms = 300;
let lastact = 0;
let showTimeRemaining = false;

function shouldPlaySoundEffects() {
    return typeof window.VoxitySettings === 'undefined' || window.VoxitySettings.isEnabled('soundEffects');
}

let stallExit = false;

function shouldPreventExit() {
    return typeof window.VoxitySettings === 'undefined' || window.VoxitySettings.isEnabled('preventExit');
}

window.addEventListener("beforeunload", (event) => {
    if (isPWA()) return;
    if (!stallExit) return;
    if (!shouldPreventExit()) return;

    event.preventDefault();
    event.returnValue = "";
});

function isPWA() {
    return (
        window.matchMedia("(display-mode: standalone)").matches ||
        window.matchMedia("(display-mode: window-controls-overlay)").matches ||
        navigator.standalone === true
    );
}

function isElectron() {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('electron') === 'true') {
        return true;
    } else return false;
}

function playUiSound(audioEl, { reset = true } = {}) {
    if (!audioEl || !shouldPlaySoundEffects()) return;
    try {
        if (reset) {
            audioEl.currentTime = 0;
        }
        const maybePromise = audioEl.play();
        if (maybePromise && typeof maybePromise.catch === 'function') {
            maybePromise.catch(() => { });
        }
    } catch { }
}

let stat_calls = 0;
let stat_out = null;
let currentObjectUrl = null;
let pt = 0;
let cph = null;
let scrollRefreshQueued = false;
let scrollResizeBound = false;
let scrollRetryAttempts = 0;
const SCROLL_HOLD_MS = 5000;
const scrollTimers = new WeakMap();
const scrollIterationHandlers = new WeakMap();

function init() {
    if (/android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(navigator.userAgent)) {
        msg(`Voxity is not recommended or optimized for mobile devices. For the best experience, please use a desktop. Since Voxity is a "two panel" design, only one panel would realistically fit.<br><br>Also, clean that dirty fucking screen.`);
    }

    playUiSound(elements.welcomesound);
    document.getElementById('app').classList.remove('hidden');
    document.getElementById('splash-screen')?.classList.add('fade-out');

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
        stat_up(onrepeat ? '<i class="fa-solid fa-repeat" style="color: green;"></i> Loop <strong>ON</strong>' : '<i class="fa-solid fa-repeat" style="color: red;"></i> Loop <strong>OFF</strong>');
    }));

    shuffleButton = document.getElementById('shuffle');
    updateShuffleButton();
    shuffleButton?.addEventListener('click', debounce(() => {
        handleShuffleButton();
    }));
    shuffleButton?.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        handleShuffleButtonAlt();
    });
    document.addEventListener('voxity:settings-changed', (event) => {
        const key = event?.detail?.key;
        if (key === 'shuffleButtonAction' || key === '*') {
            updateShuffleButton();
        }
    });

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
        if (contin({ silent: true })) {
            return;
        }
        elements.player.currentTime = 0;
        elements.player.pause();
        playUiSound(document.getElementById('donesound'));
        throw_error('Finished playing queue', true);
        document.getElementById('plps').innerHTML = '<i class="fa-solid fa-play"></i>';
        if ('mediaSession' in navigator) {
            try { navigator.mediaSession.playbackState = 'paused'; } catch { }
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
                    err_msg += 'idk man';
                    break;
            }
        }
        throw_error(err_msg + ' - skipping in 5 seconds...');

        const failedSrc = elements.player.currentSrc || elements.player.src;
        setTimeout(() => {
            if (!elements.player.error) return;
            if ((elements.player.currentSrc || elements.player.src) !== failedSrc) return;
            contin({ silent: true });
        }, 5000);
    });

    elements.player.addEventListener('timeupdate', () => {
        const current = form_time(elements.player.currentTime);
        elements.timeCurrent.innerHTML = current;
        updateTimeDurationDisplay(elements.player.currentTime, elements.player.duration);
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

    elements.timeDuration?.addEventListener('click', () => {
        showTimeRemaining = !showTimeRemaining;
        updateTimeDurationDisplay(elements.player.currentTime, elements.player.duration);
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

        stat_up(`${icon} Volume: <strong>${(elements.player.volume * 100).toFixed(0)}%</strong>`);
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
        stat_up(`${icon} Speed: <strong>${elements.speed.value}x</strong>`);
        if (parseFloat(elements.speed.value) === 2.0) stat_up(`${icon} Speed: <strong>${elements.speed.value}x</strong> - to go higher, click "Speed" above the slider!`);
    });

    attachSliderTooltip(elements.vol, elements.volTooltip, { formatValue: formatVolumeTooltipText });
    attachSliderTooltip(elements.speed, elements.speedTooltip, { formatValue: formatSpeedTooltipText });
    attachSliderTooltip(elements.index, elements.indexTooltip, { formatValue: formatIndexTooltipText, trackPointer: true });

    elements.index.addEventListener('input', () => {
        elements.player.currentTime = elements.index.value;
        stat_up(
            `<i class="fa-solid fa-music"></i> Scrubbing to: <strong>
        ${form_time(elements.index.value)} / ${form_time(elements.player.duration)}
        (${elements.player.duration
                ? Math.round((elements.index.value / elements.player.duration) * 100)
                : 0}% done)
        </strong>`
        );
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
        dropTarget.addEventListener('drop', async (e) => {
            e.preventDefault();
            const dt = e.dataTransfer;

            if (dt?.items && dt.items.length > 0) {
                const directFiles = [];
                let processed = false;

                for (const item of dt.items) {
                    const entry = item.webkitGetAsEntry?.();
                    if (!entry) continue;

                    if (entry.isDirectory) {
                        processed = true;
                        await handleEntry(entry);
                        continue;
                    }

                    if (entry.isFile) {
                        const file = item.getAsFile?.();
                        if (file) {
                            directFiles.push(file);
                        }
                    }
                }

                if (directFiles.length > 0) {
                    processed = true;
                    quf(directFiles);
                }

                if (processed) return;
            }

            if (dt?.files && dt.files.length > 0) {
                quf(dt.files);
            }
        });

    }

    document.getElementById('nexttrack')?.addEventListener('click', debounce(() => contin()));
    document.getElementById('prevtrack')?.addEventListener('click', debounce(() => previ()));
}

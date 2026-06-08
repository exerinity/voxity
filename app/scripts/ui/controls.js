document.getElementById('plps').addEventListener('click', debounce(() => {
    if (!metadata.title && !metadata.artist) {
        return throw_error('No track playing!');
    }
    if (elements.player.paused) {
        elements.player.play();
        document.getElementById('plps').innerHTML = '<i class="fa-solid fa-pause"></i>';
        stat_up('<i class="fa-solid fa-circle-play"></i> Resumed playback');
        if ('mediaSession' in navigator) {
            try { navigator.mediaSession.playbackState = 'playing'; } catch { }
        }
    } else {
        elements.player.pause();
        document.getElementById('plps').innerHTML = '<i class="fa-solid fa-play"></i>';
        stat_up('<i class="fa-solid fa-circle-pause"></i> Paused playback');
        if ('mediaSession' in navigator) {
            try { navigator.mediaSession.playbackState = 'paused'; } catch { }
        }
    }
}));

document.getElementById('rwd').addEventListener('click', debounce(() => {
    if (!elements.player.currentTime) return throw_error('No track playing!');
    const dur = elements.player.duration || 0;
    const t = Math.max(0, (elements.player.currentTime || 0) - 10);
    elements.player.currentTime = t;
    elements.index.value = t;
    stat_up(`<i class="fa-solid fa-music"></i> Scrubbing to: ${form_time(t)} / ${form_time(dur)}`);
}));

document.getElementById('branding').addEventListener('click', debounce(() => {
    const modalPromise = msg(about_content, "About Voxity");
    return modalPromise;
}));

const queueHead = document.getElementById('queuehead');
if (queueHead) {
    queueHead.addEventListener('click', debounce(() => {
        calqueue();
    }));

    const scrollCurrentTrackIntoView = debounce(() => {
        if (!scrollCurrentQueueItemIntoView()) {
            throw_error('No track playing!');
        }
    });

    queueHead.addEventListener('contextmenu', (event) => {
        event.preventDefault();
        scrollCurrentTrackIntoView();
    });

    queueHead.addEventListener('auxclick', (event) => {
        if (event.button !== 1) return;
        event.preventDefault();
        event.stopPropagation();
        if (typeof openQueueSearchModal === 'function') {
            openQueueSearchModal();
        }
    });
}

document.getElementById('fwd').addEventListener('click', debounce(() => {
    if (!elements.player.currentTime) return throw_error('No track playing!');
    const dur = elements.player.duration || 0;
    const t = Math.min(dur, (elements.player.currentTime || 0) + 10);
    elements.player.currentTime = t;
    elements.index.value = t;
    stat_up(`<i class="fa-solid fa-music"></i> Scrubbing to: <strong>${form_time(t)}</strong> / <strong>${form_time(dur)}</strong>`);
}));

document.getElementById('stop').addEventListener('click', debounce(() => {
    restr();
}));

function restr() {
    if (!elements.player.currentTime) return throw_error('No track playing!');
    elements.player.currentTime = 0;
    elements.index.value = 0;
    stat_up('<i class="fa-solid fa-arrow-rotate-left"></i> Restarted the track');
}

document.getElementById('hotkeys').addEventListener('click', debounce(() => {
    const modalPromise = msg(hotkeys_content, 'List of hotkeys');
}));


try {
    const installBtn = document.getElementById('installpwa');
    if (installBtn && typeof pwamsg === 'function') {
        installBtn.addEventListener('click', debounce(() => {
            pwamsg();
        }));
        if (!isPWA() && window.deferredInstallPrompt) {
            installBtn.classList.remove('hidden');
        }
    }
} catch { }


document.getElementById('cover-art').addEventListener('click', debounce(() => {
    enlargeCover();
}));

function enlargeCover() {
    if (!globalart) return;

    const modalPromise = msg(
        `<img src="${globalart}" title="Click to open full image in a new tab" alt="Cover art" style="max-width: 100%; height: auto; border-radius: 8px; cursor: pointer;" id="msgart">`,
        act_truncate(metadata.album || metadata.title || "Cover art")
    );

    setTimeout(() => {
        const img = document.getElementById('msgart');
        if (!img) return;

        img.onclick = () => {
            let blobUrl = globalart;

            if (globalart.startsWith('data:')) {
                const res = globalart.split(',');
                const mime = res[0].match(/:(.*?);/)[1];
                const bstr = atob(res[1]);
                let n = bstr.length;
                const u8arr = new Uint8Array(n);
                while (n--) u8arr[n] = bstr.charCodeAt(n);
                const blob = new Blob([u8arr], { type: mime });
                blobUrl = URL.createObjectURL(blob);
            }

            const name = encodeURIComponent(metadata.title || metadata.album || 'Voxity art viewer');
            window.open(`/cover.html?img=${encodeURIComponent(blobUrl)}&name=${name}`, '_blank');
        };
    }, 0);
}
function play(file, name) {
    const t = ++pt;
    try { elements.player.pause(); } catch { }
    lrc_wipe();
    if (!elements.welcomesound.paused) {
        elements.welcomesound.pause();
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
            calqueue();
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
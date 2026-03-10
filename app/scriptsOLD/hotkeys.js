function closeTopModal() {
    const stack = window.__voxityModals;
    if (!stack || stack.length === 0) return false;
    const lastModal = stack[stack.length - 1];
    try {
        lastModal.close();
    } catch {
        try {
            lastModal.overlay?.dispatchEvent(new CustomEvent('voxity:modal-close'));
        } catch { }
    }
    return true;
}

document.addEventListener('keydown', (e) => {
    const t = e.target;
    const tag = t && t.tagName ? t.tagName.toLowerCase() : '';

    if (
        (t && t.isContentEditable) ||
        tag === 'input' || tag === 'textarea' || tag === 'select' ||
        (t && t.closest && t.closest('[role="textbox"], [contenteditable="true"]'))
    ) return;

    const player = elements.player;
    if (!player) return;

    const volSlider = elements.vol;

    const getVolumeIcon = () => {
        const v = player.volume;
        if (v === 0) return '<i class="fa-solid fa-volume-xmark"></i>';
        if (v < 0.33) return '<i class="fa-solid fa-volume-off"></i>';
        if (v < 0.66) return '<i class="fa-solid fa-volume-low"></i>';
        return '<i class="fa-solid fa-volume-high"></i>';
    };

    const scrub = (amount) => {
        player.currentTime = Math.max(
            0,
            Math.min(player.duration, player.currentTime + amount)
        );

        stat_up(
            `<i class="fa-solid fa-music"></i> Scrubbing to: <strong>
        ${form_time(player.currentTime)} / ${form_time(player.duration)}
        (${amount >= 0 ? '+' : ''}${amount}s, ${player.duration
                ? Math.round((player.currentTime / player.duration) * 100)
                : 0
            }% done)
        </strong>`
        );
    };


    const jumpToPercent = (percent) => {
        const dur = player.duration || 0;
        player.currentTime = dur * percent;
        const actual = (player.currentTime / dur) * 100 || 0;
        stat_up(`<i class="fa-solid fa-music"></i> Jumping to <strong>${actual.toFixed(0)}% (${form_time(player.currentTime)} / ${form_time(dur)})</strong>`);
    };

    const changeVolume = (delta) => {
        volSlider.value = Math.max(0, Math.min(2, parseFloat(volSlider.value) + delta));
        player.volume = volSlider.value / 2;
        stat_up(`${getVolumeIcon()} Volume: <strong>${(player.volume * 100).toFixed(0)}%</strong>`);
    };

    switch (e.code) {
        case 'Escape':
            if (closeTopModal()) {
                e.preventDefault();
                return;
            }
            break;

        case 'Space':
        case 'KeyK':
            e.preventDefault();
            document.getElementById('plps')?.click();
            break;

        case 'KeyR':
            if (!e.ctrlKey) {
                e.preventDefault();
                player.currentTime = 0;
                stat_up('<i class="fa-solid fa-arrow-rotate-left"></i> Restarted the track');
            }
            break;

        case 'KeyF':
            if (e.ctrlKey || e.metaKey) {
                e.preventDefault();
                if (typeof openQueueSearchModal === 'function') {
                    openQueueSearchModal();
                }
            }
            break;

        case 'KeyT':
            document.getElementById('loop')?.click();
            break;

        case 'KeyH':
            e.preventDefault();
            document.getElementById('shuffle')?.click();
            break;

        case 'ArrowLeft':
        case 'KeyJ':
        case 'KeyA':
            e.preventDefault();
            if (e.altKey) scrub(-30);
            else if (e.shiftKey) scrub(-1);
            else if (e.ctrlKey) scrub(-5);
            else scrub(-10);
            break;

        case 'ArrowRight':
        case 'KeyL':
        case 'KeyD':
            e.preventDefault();
            if (e.altKey) scrub(30);
            else if (e.shiftKey) scrub(1);
            else if (e.ctrlKey) scrub(5);
            else scrub(10);
            break;

        case 'KeyW':
        case 'ArrowUp':
            e.preventDefault();
            changeVolume(0.02);
            break;

        case 'KeyS':
        case 'ArrowDown':
            if (!e.ctrlKey) {
                e.preventDefault();
                changeVolume(-0.02);
            }
            break;

        case 'KeyZ':
            if (typeof previ === 'function') previ();
            break;

        case 'KeyX':
            if (typeof contin === 'function') contin();
            break;

        default:
            if (e.code.startsWith('Digit')) {
                const num = parseInt(e.code.slice(5), 10);
                if (!isNaN(num)) {
                    e.preventDefault();
                    let perc = num === 0 ? 0 : num * 0.1;
                    if (e.shiftKey) perc = Math.max(0, perc - 0.05);
                    jumpToPercent(perc);
                }
            }
            break;
    }
});

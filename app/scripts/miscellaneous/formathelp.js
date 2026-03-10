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

function updateTimeDurationDisplay(currentTime, duration) {
    if (!elements.timeDuration) return;
    if (showTimeRemaining) {
        if (!Number.isFinite(duration)) {
            elements.timeDuration.innerHTML = '--:--';
            return;
        }
        const safeCurrent = Number.isFinite(currentTime) ? currentTime : 0;
        const remaining = Math.max(0, duration - safeCurrent);
        elements.timeDuration.innerHTML = `-${form_time(remaining)}`;
        return;
    }
    elements.timeDuration.innerHTML = form_time(duration);
}

function attachSliderTooltip(slider, tooltip, { formatValue } = {}) {
    if (!slider || !tooltip || typeof formatValue !== 'function') return;
    const state = { visible: false };
    const target = slider.closest('.range-wrapper') || slider;

    const updateFromClientX = (clientX) => {
        const rect = target.getBoundingClientRect();
        if (!rect || rect.width === 0) return;
        const { min, range } = getSliderBounds(slider);
        let percent;
        if (Number.isFinite(clientX)) {
            percent = (clientX - rect.left) / rect.width;
        } else {
            const sliderValue = Number.parseFloat(slider.value);
            percent = Number.isFinite(sliderValue) ? (sliderValue - min) / range : 0;
        }
        percent = Math.min(Math.max(percent, 0), 1);
        const value = min + percent * range;
        tooltip.textContent = formatValue({ value, percent, slider });
        tooltip.style.left = `${percent * 100}%`;
    };

    const show = (clientX) => {
        state.visible = true;
        tooltip.classList.remove('hidden');
        updateFromClientX(clientX);
    };

    const hide = () => {
        state.visible = false;
        tooltip.classList.add('hidden');
    };

    const handlePointerEnter = (event) => {
        if (event.pointerType === 'touch') return;
        show(event.clientX);
    };

    const handlePointerDown = (event) => {
        show(event.clientX);
    };

    const handlePointerMove = (event) => {
        if (!state.visible) return;
        updateFromClientX(event.clientX);
    };

    const handlePointerLeave = () => hide();
    const handlePointerCancel = () => hide();
    const handlePointerUp = (event) => {
        if (event.pointerType === 'touch') {
            hide();
        }
    };

    const handleFocus = () => show();
    const handleBlur = () => hide();

    target.addEventListener('pointerenter', handlePointerEnter);
    target.addEventListener('pointerdown', handlePointerDown);
    target.addEventListener('pointermove', handlePointerMove);
    target.addEventListener('pointerleave', handlePointerLeave);
    target.addEventListener('pointercancel', handlePointerCancel);
    target.addEventListener('pointerup', handlePointerUp);

    slider.addEventListener('focus', handleFocus);
    slider.addEventListener('blur', handleBlur);
    slider.addEventListener('input', () => {
        if (state.visible) {
            updateFromClientX();
        }
    });
}

function getSliderBounds(slider) {
    const minRaw = Number.parseFloat(slider.min);
    const maxRaw = Number.parseFloat(slider.max);
    const min = Number.isFinite(minRaw) ? minRaw : 0;
    let max = Number.isFinite(maxRaw) ? maxRaw : min + 100;
    if (max === min) {
        max = min + 1;
    }
    const range = max - min;
    return { min, max, range };
}

function formatIndexTooltipText({ value, percent }) {
    const duration = Number.isFinite(elements.player?.duration) ? elements.player.duration : null;
    const safeValue = duration !== null ? Math.min(Math.max(value, 0), duration) : Math.max(value, 0);
    const percentText = `${Math.round(percent * 100)}%`;
    return `${form_time(safeValue)} (${percentText})`;
}

function formatVolumeTooltipText({ percent }) {
    return `${Math.round(percent * 100)}%`;
}

function formatSpeedTooltipText({ value }) {
    if (!Number.isFinite(value)) return '--';
    const rounded = Math.round(value * 100) / 100;
    const formatted = rounded.toFixed(2).replace(/\.?0+$/, '');
    return `${formatted}x`;
}

function maxtruncate() {
    const w = window.innerWidth;
    return Math.round(20 + (w / 1920) * 10);
}
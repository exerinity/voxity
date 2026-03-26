function stat_up(msg, ac = true) {
    stat_calls++;
    elements.status.innerHTML = msg;

    if (ac) {
        if (stat_out) {
            clearTimeout(stat_out);
        }
        const delay = typeof ac === 'number' ? ac : 2500;
        stat_out = setTimeout(() => {
            if (!elements.player.src) {
                elements.status.innerHTML = `<i class="fa-solid fa-tower-broadcast bop"></i> Voxity`;
                elements.branding.innerHTML = null;
            } else if (elements.player.paused) {
                elements.status.innerHTML = `<i class="fa-solid fa-circle-pause fa-fade"></i> Now paused: <strong>${act_truncate(metadata.title || 'Unknown track', 120)}</strong> by ${metadata.artist || 'Unknown artist'}`;
                elements.branding.innerHTML = '<i class="fa-solid fa-tower-broadcast bop"></i> Voxity';
            } else {
                elements.status.innerHTML = `<i class="fa-solid fa-circle-play"></i> Now playing: <strong>${act_truncate(metadata.title || 'Unknown track', 120)}</strong> by ${metadata.artist || 'Unknown artist'}`;
                elements.branding.innerHTML = '<i class="fa-solid fa-tower-broadcast fa-beat bop"></i> Voxity';
            }
            stat_out = null;
        }, delay);
    }
}

let modalTitleStatusTimeout = null;
let modalTitleStatusContext = null;

function modal_title_up(msg, options = {}) {
    const stack = window.__voxityModals;
    if (!stack || stack.length === 0) return false;
    const topModal = stack[stack.length - 1];
    if (!topModal || typeof topModal.setTitle !== 'function') return false;

    if (modalTitleStatusTimeout) {
        clearTimeout(modalTitleStatusTimeout);
        modalTitleStatusTimeout = null;
        if (!modalTitleStatusContext || modalTitleStatusContext.modal !== topModal) {
            try {
                if (modalTitleStatusContext && typeof modalTitleStatusContext.modal?.setTitle === 'function') {
                    modalTitleStatusContext.modal.setTitle(modalTitleStatusContext.restore || 'Voxity');
                }
            } catch { }
            modalTitleStatusContext = null;
        }
    }

    let restoreText;
    if (modalTitleStatusContext && modalTitleStatusContext.modal === topModal) {
        restoreText = modalTitleStatusContext.restore;
    } else {
        restoreText = typeof topModal.getTitle === 'function'
            ? topModal.getTitle()
            : 'Voxity';
    }

    topModal.setTitle(msg || 'Voxity');
    modalTitleStatusContext = { modal: topModal, restore: restoreText };

    const duration = typeof options.duration === 'number' ? options.duration : 3000;
    modalTitleStatusTimeout = setTimeout(() => {
        try {
            const stackHasModal = Array.isArray(window.__voxityModals) && window.__voxityModals.includes(topModal);
            if (stackHasModal && modalTitleStatusContext && modalTitleStatusContext.modal === topModal) {
                topModal.setTitle(modalTitleStatusContext.restore || 'Voxity');
            }
        } catch { }
        modalTitleStatusTimeout = null;
        modalTitleStatusContext = null;
    }, Math.max(0, duration));

    return true;
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
        if (!(e.ctrlKey || e.metaKey)) {
            e.preventDefault();
        }
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
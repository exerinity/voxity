async function msg(text, tbartext, canClose = true, canDrag = true) {
    const overlay = document.createElement('div');
    overlay.classList.add('voxity-modal');
    overlay.style.position = 'fixed';
    overlay.style.top = 0;
    overlay.style.left = 0;
    overlay.style.width = '100vw';
    overlay.style.height = '100vh';
    overlay.style.background = 'var(--overlay-bg)';
    overlay.style.backdropFilter = 'blur(2px)';
    overlay.style.zIndex = 9999;
    overlay.style.display = 'flex';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';
    overlay.style.animation = 'fin 0.2s ease';
    const box = document.createElement('div');
    box.style.background = 'var(--dialog-bg)';
    box.style.color = 'var(--fg)';
    box.style.borderRadius = '16px';
    box.style.boxShadow = '0 4px 32px rgba(0,0,0,0.18)';
    box.style.padding = '2rem 2.5rem 1.5rem 2.5rem';
    box.style.maxWidth = '420px';
    box.style.width = '90vw';
    box.style.maxHeight = '80vh';
    box.style.overflow = 'hidden';
    box.style.position = 'relative';
    box.style.fontFamily = 'inherit';
    box.style.textAlign = 'center';
    box.style.animation = 'zin 0.2s ease';
    const title = document.createElement('div');
    title.style.position = 'absolute';
    title.style.top = '12px';
    title.style.left = '16px';
    title.style.fontSize = '1.2rem';
    title.style.fontWeight = 'bold';
    title.style.color = 'var(--fg)';
    title.style.cursor = canDrag ? 'move' : 'default';
    title.style.display = 'flex';
    title.style.alignItems = 'center';
    title.style.height = '24px';
    title.style.userSelect = 'none';
    const initialTitleText = tbartext || "Voxity";
    let currentTitleText = initialTitleText;
    title.innerHTML = `<i class="fa-solid fa-tower-broadcast" style="color: var(--lyric-color); margin-right: 0.5em;"></i> ${initialTitleText}`;
    let modalApi = null;
    let isClosed = false;

    let onMouseMove = null;
    let onMouseUp = null;

    const unregisterModal = () => {
        const stack = window.__voxityModals;
        if (!stack || !modalApi) return;
        const idx = stack.indexOf(modalApi);
        if (idx >= 0) stack.splice(idx, 1);
    };
    const closeModal = () => {
        if (isClosed) return;
        isClosed = true;
        try {
            if (modalApi) {
                document.dispatchEvent(new CustomEvent('voxity:modal-closed', {
                    detail: { modal: modalApi },
                }));
            }
        } catch { }
        unregisterModal();
        box.style.animation = 'zout 0.15s ease forwards';
        overlay.style.animation = 'fout 0.15s ease forwards';
        window.removeEventListener('resize', eiv);
        if (onMouseMove) document.removeEventListener('mousemove', onMouseMove);
        if (onMouseUp) document.removeEventListener('mouseup', onMouseUp);
        overlay.removeEventListener('voxity:modal-close', closeModal);
        setTimeout(() => {
            if (document.body.contains(overlay)) {
                document.body.removeChild(overlay);
            }
        }, 250);
    };
    if (canClose) {
        const close = document.createElement('button');
        close.innerHTML = '<i class="fa-solid fa-xmark"></i>';
        close.setAttribute('aria-label', 'Close');
        close.style.position = 'absolute';
        close.style.top = '12px';
        close.style.right = '16px';
        close.style.background = 'none';
        close.style.border = 'none';
        close.style.fontSize = '1.3rem';
        close.style.cursor = 'pointer';
        close.style.color = 'var(--error-bg)';
        close.style.transition = 'color 0.2s';
        close.onmouseenter = () => close.style.color = 'var(--fg)';
        close.onmouseleave = () => close.style.color = 'var(--error-bg)';
        close.onclick = closeModal;
        box.appendChild(close);
    }
    let hasCustomPosition = false;
    if (canDrag) {
        let isDragging = false;
        let offsetX = 0;
        let offsetY = 0;
        title.addEventListener('mousedown', (e) => {
            const rect = box.getBoundingClientRect();
            if (!hasCustomPosition) {
                box.style.position = 'absolute';
                box.style.left = `${rect.left}px`;
                box.style.top = `${rect.top}px`;
                hasCustomPosition = true;
            }
            isDragging = true;
            offsetX = e.clientX - rect.left;
            offsetY = e.clientY - rect.top;
            document.body.style.userSelect = 'none';
        });
        onMouseMove = (e) => {
            if (!isDragging) return;
            let newLeft = e.clientX - offsetX;
            let newTop = e.clientY - offsetY;
            const rect = box.getBoundingClientRect();
            const maxLeft = window.innerWidth - rect.width;
            const maxTop = window.innerHeight - rect.height;
            box.style.left = `${Math.min(Math.max(0, newLeft), maxLeft)}px`;
            box.style.top = `${Math.min(Math.max(0, newTop), maxTop)}px`;
        };
        onMouseUp = () => {
            isDragging = false;
            document.body.style.userSelect = '';
        };
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    }
    const eiv = () => {
        if (!hasCustomPosition) return;
        const rect = box.getBoundingClientRect();
        const left = Math.min(Math.max(0, rect.left), Math.max(0, window.innerWidth - rect.width));
        const top = Math.min(Math.max(0, rect.top), Math.max(0, window.innerHeight - rect.height));
        box.style.left = `${left}px`;
        box.style.top = `${top}px`;
    };
    window.addEventListener('resize', eiv);
    overlay.addEventListener('voxity:modal-close', closeModal);
    const content = document.createElement('div');
    content.id = 'msg-content';
    content.style.marginTop = '0.5rem';
    content.style.fontSize = '1.08rem';
    content.style.lineHeight = '1.6';
    const contentBody = document.createElement('div');
    contentBody.id = 'msg-body';
    contentBody.style.marginBottom = '1rem';
    contentBody.style.cursor = 'default';
    contentBody.style.overflowY = 'auto';
    contentBody.style.paddingRight = '8px';
    contentBody.style.maxHeight = 'calc(80vh - 6rem)';
    contentBody.innerHTML = text;
    const footer = document.createElement('div');
    footer.className = 'pop';
    footer.style.alignItems = 'center';
    if (canClose) {
        const closeBtn = document.createElement('button');
        closeBtn.className = 'bu';
        closeBtn.textContent = 'Close';
        closeBtn.style.background = 'var(--btn-bg)';
        closeBtn.style.color = 'var(--fg)';
        closeBtn.addEventListener('click', closeModal);
        footer.appendChild(closeBtn);
    }
    content.appendChild(contentBody);
    content.appendChild(footer);
    box.appendChild(title);
    box.appendChild(content);
    overlay.appendChild(box);
    document.body.appendChild(overlay);
    overlay.addEventListener('click', e => {
        if (canClose && e.target === overlay) closeModal();
    });
    if (!document.getElementById('msg-modal-animations')) {
        const style = document.createElement('style');
        style.id = 'msg-modal-animations';
        style.textContent = `
            @keyframes zin {
                from { transform: scale(0.7); opacity: 0; }
                to { transform: scale(1); opacity: 1; }
            }
            @keyframes zout {
                from { transform: scale(1); opacity: 1; }
                to { transform: scale(0.7); opacity: 0; }
            }
            @keyframes fin {
                from { opacity: 0; }
                to { opacity: 1; }
            }
            @keyframes fout {
                from { opacity: 1; }
                to { opacity: 0; }
            }
        `;
        document.head.appendChild(style);
    }
    modalApi = {
        overlay,
        close: () => closeModal(),
        setTitle: (newTitle) => {
            const nextTitle = newTitle || 'Voxity';
            title.innerHTML = `<i class="fa-solid fa-tower-broadcast" style="color: var(--lyric-color); margin-right: 0.5em;"></i> ${nextTitle}`;
            currentTitleText = nextTitle;
        },
        getTitle: () => currentTitleText,
        setContent: (html) => {
            contentBody.innerHTML = html;
            try { eiv(); } catch { }
        }
    };
    window.__voxityModals = window.__voxityModals || [];
    window.__voxityModals.push(modalApi);
    try {
        document.dispatchEvent(new CustomEvent('voxity:modal-opened', {
            detail: { modal: modalApi },
        }));
    } catch { }
    return modalApi;
}
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
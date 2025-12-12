async function msg(text, tbartext) {
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
    box.style.position = 'absolute';
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
    title.style.cursor = 'move';
    title.style.display = 'flex';
    title.style.alignItems = 'center';
    title.style.height = '24px';
    title.style.userSelect = 'none';
    title.innerHTML = `<i class="fa-solid fa-tower-broadcast" style="color: var(--lyric-color); margin-right: 0.5em;"></i> ${tbartext || "Voxity"}`

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

    let modalApi = null;
    let isClosed = false;

    const unregisterModal = () => {
        const stack = window.__voxityModals;
        if (!stack || !modalApi) return;
        const idx = stack.indexOf(modalApi);
        if (idx >= 0) stack.splice(idx, 1);
    };

    const closeModal = () => {
        if (isClosed) return;
        isClosed = true;
        unregisterModal();
        box.style.animation = 'zout 0.15s ease forwards';
        overlay.style.animation = 'fout 0.15s ease forwards';
        window.removeEventListener('resize', eiv);
        overlay.removeEventListener('voxity:modal-close', closeModal);
        setTimeout(() => {
            if (document.body.contains(overlay)) {
                document.body.removeChild(overlay);
            }
        }, 250);
    };

    close.onclick = closeModal;

    let isDragging = false;
    let offsetX = 0;
    let offsetY = 0;

    title.addEventListener('mousedown', (e) => {
        isDragging = true;
        offsetX = e.clientX - box.getBoundingClientRect().left;
        offsetY = e.clientY - box.getBoundingClientRect().top;
        document.body.style.userSelect = 'none';
    });

    document.addEventListener('mousemove', (e) => {
        if (isDragging) {
            let newLeft = e.clientX - offsetX;
            let newTop = e.clientY - offsetY;
            const rect = box.getBoundingClientRect();
            const width = rect.width;
            const height = rect.height;
            const maxLeft = window.innerWidth - width;
            const maxTop = window.innerHeight - height;
            if (newLeft < 0) newLeft = 0;
            if (newTop < 0) newTop = 0;
            if (newLeft > maxLeft) newLeft = maxLeft;
            if (newTop > maxTop) newTop = maxTop;
            box.style.left = `${newLeft}px`;
            box.style.top = `${newTop}px`;
        }
    });

    document.addEventListener('mouseup', () => {
        isDragging = false;
        document.body.style.userSelect = '';
    });

    const eiv = () => {
        const rect = box.getBoundingClientRect();
        let left = rect.left;
        let top = rect.top;
        const maxLeft = Math.max(0, window.innerWidth - rect.width);
        const maxTop = Math.max(0, window.innerHeight - rect.height);
        if (left < 0) left = 0;
        if (top < 0) top = 0;
        if (left > maxLeft) left = maxLeft;
        if (top > maxTop) top = maxTop;
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

    const contentWrap = document.createElement('div');
    contentWrap.style.marginBottom = '1rem';
    contentWrap.style.cursor = 'default';
    contentWrap.innerHTML = text;

    const footer = document.createElement('div');
    footer.className = 'pop';
    footer.style.alignItems = 'center';

    const closeBtn = document.createElement('button');
    closeBtn.className = 'bu';
    closeBtn.textContent = 'Close';
    closeBtn.style.background = 'var(--btn-bg)';
    closeBtn.style.color = 'var(--fg)';
    closeBtn.addEventListener('click', closeModal);

    footer.appendChild(closeBtn);
    content.appendChild(contentWrap);
    content.appendChild(footer);

    box.appendChild(title);
    box.appendChild(close);
    box.appendChild(content);
    overlay.appendChild(box);
    document.body.appendChild(overlay);

    overlay.addEventListener('click', e => {
        if (e.target === overlay) closeModal();
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
        setTitle: (text) => {
            title.innerHTML = `<i class=\"fa-solid fa-tower-broadcast\" style=\"color: var(--lyric-color); margin-right: 0.5em;\"></i> ${text || 'Voxity'}`;
        },
        setContent: (html) => {
            contentWrap.innerHTML = html;
            try { eiv(); } catch {}
        }
    };
    window.__voxityModals = window.__voxityModals || [];
    window.__voxityModals.push(modalApi);
    return modalApi;
}

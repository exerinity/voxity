async function msg(text) {
    const overlay = document.createElement('div');
    overlay.style.position = 'fixed';
    overlay.style.top = 0;
    overlay.style.left = 0;
    overlay.style.width = '100vw';
    overlay.style.height = '100vh';
    overlay.style.background = 'var(--overlay-bg)';
    overlay.style.backdropFilter = 'blur(7px)';
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
    title.innerHTML = `<i class="fa-solid fa-tower-broadcast" style="color: var(--lyric-colour)"></i> Audion`;

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

    const removeOverlay = () => {
        box.style.animation = 'zout 0.15s ease forwards';
        overlay.style.animation = 'fout 0.15s ease forwards';
        setTimeout(() => {
            if (document.body.contains(overlay)) {
                document.body.removeChild(overlay);
            }
        }, 250);
    };

    close.onclick = removeOverlay;

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
            // Clamp within viewport
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

    const msg = document.createElement('div');
    msg.style.marginTop = '0.5rem';
    msg.style.fontSize = '1.08rem';
    msg.style.lineHeight = '1.6';
    msg.innerHTML = `
    <div style="margin-bottom:1rem; cursor: default;">${text}</div>
    <div class="pop" style="align-items: center"><button class="bu" style="background: var(--btn-bg); color: var(--fg);">Close</button></div>
`;
    msg.querySelector('.bu').addEventListener('click', removeOverlay);

    box.appendChild(title);
    box.appendChild(close);
    box.appendChild(msg);
    overlay.appendChild(box);
    document.body.appendChild(overlay);

    overlay.addEventListener('click', e => {
        if (e.target === overlay) removeOverlay();
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
}
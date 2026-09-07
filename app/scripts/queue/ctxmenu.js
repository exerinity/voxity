let _contextMenu = null;

function _dismissContextMenu() {
    if (_contextMenu) {
        _contextMenu.remove();
        _contextMenu = null;
    }
}

function spawnContextMenu(item, tasks, { clientX = window.innerWidth / 2, clientY = window.innerHeight / 2 } = {}) {
    _dismissContextMenu();

    const menu = document.createElement('ul');
    menu.style.cssText = 'position:fixed;top:' + clientY + 'px;left:' + clientX + 'px;z-index:9999;background:var(--control-bg);border:1px solid var(--control-br);border-radius:8px;padding:0.25rem 0;list-style:none;margin:0;min-width:175px;box-shadow:0 4px 16px rgba(0,0,0,0.35);';

    const header = document.createElement('li');
    header.style.cssText = 'padding:0.45rem 0.8rem;font-size:0.8rem;color:var(--muted-2);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:220px;border-bottom:1px solid var(--control-br);margin-bottom:0.2rem;pointer-events:none;';
    header.textContent = item.file?.name || item.displayName || '';
    header.title = item.file?.name || item.displayName || '';
    menu.appendChild(header);

    tasks.forEach(({ label, icon, action }) => {
        const li = document.createElement('li');
        li.style.cssText = 'padding:0.45rem 0.8rem;cursor:pointer;display:flex;align-items:center;gap:0.6rem;font-size:0.88rem;color:var(--fg);';
        if (icon) {
            const glyph = document.createElement('i');
            glyph.className = icon;
            glyph.style.cssText = 'width:1rem;text-align:center;opacity:0.6;';
            li.appendChild(glyph);
        }
        li.appendChild(document.createTextNode(label));
        li.addEventListener('mouseenter', () => { li.style.background = 'var(--control-br)'; });
        li.addEventListener('mouseleave', () => { li.style.background = ''; });
        li.addEventListener('click', (ev) => {
            ev.stopPropagation();
            _dismissContextMenu();
            action(item);
        });
        menu.appendChild(li);
    });

    document.body.appendChild(menu);
    _contextMenu = menu;

    const rect = menu.getBoundingClientRect();
    if (rect.right > window.innerWidth) menu.style.left = Math.max(0, clientX - rect.width) + 'px';
    if (rect.bottom > window.innerHeight) menu.style.top = Math.max(0, clientY - rect.height) + 'px';
}

document.addEventListener('click', _dismissContextMenu);
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') _dismissContextMenu(); });


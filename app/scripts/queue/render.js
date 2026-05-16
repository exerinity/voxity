let _queueCtxMenu = null;

function _dismissQueueCtxMenu() {
    if (_queueCtxMenu) {
        _queueCtxMenu.remove();
        _queueCtxMenu = null;
    }
}

function _showQueueCtxMenu(e, item, idx) {
    _dismissQueueCtxMenu();
    e.preventDefault();

    const menu = document.createElement('ul');
    menu.style.cssText = 'position:fixed;top:' + e.clientY + 'px;left:' + e.clientX + 'px;z-index:9999;background:var(--control-bg);border:1px solid var(--control-br);border-radius:8px;padding:0.25rem 0;list-style:none;margin:0;min-width:175px;box-shadow:0 4px 16px rgba(0,0,0,0.35);';

    const header = document.createElement('li');
    header.style.cssText = 'padding:0.45rem 0.8rem;font-size:0.8rem;color:var(--muted-2);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:220px;border-bottom:1px solid var(--control-br);margin-bottom:0.2rem;pointer-events:none;';
    header.textContent = item.file?.name || item.displayName || '';
    header.title = item.file?.name || item.displayName || '';
    menu.appendChild(header);

    const actions = [
        {
            label: 'Copy file name',
            icon: 'fa-solid fa-file-audio',
            action() { navigator.clipboard?.writeText(item.file?.name || ''); throw_error('Copied track filename to clipboard', 2); },
        },
        {
            label: 'Copy song title',
            icon: 'fa-solid fa-tag',
            action() { navigator.clipboard?.writeText(item.meta?.title || item.displayName || item.file?.name || ''); throw_error('Copied title to clipboard', 2); },
        },
        {
            label: 'Copy song info',
            icon: 'fa-solid fa-copy',
            action() { navigator.clipboard?.writeText(item.meta ? `${item.meta.title || item.displayName || item.file?.name || ''} by ${item.meta.artist || ''}` : (item.displayName || item.file?.name || '')); throw_error('Copied song to clipboard', 2); },
        },
        {
            label: 'Move to under current',
            icon: 'fa-solid fa-arrow-turn-down',
            action() {
                if (idx === currentIndex || idx === currentIndex + 1) return;
                const [moved] = queue.splice(idx, 1);
                if (idx < currentIndex) {
                    queue.splice(currentIndex, 0, moved);
                    currentIndex -= 1;
                } else {
                    queue.splice(currentIndex + 1, 0, moved);
                }
                rqueue();
                throw_error('Moved that track to under current track', true);
            },
        },
        {
            label: 'Re-add',
            icon: 'fa-solid fa-plus',
            action() {
                queue.push({ ...item, meta: item.meta ? { ...item.meta } : undefined });
                rqueue();
                throw_error('Duplicated that track', true);
            },
        },
        {
            label: 'Search on Google',
            icon: 'fa-brands fa-google',
            action() {
                const query = item.meta ? `${item.meta.title || ''} ${item.meta.artist || ''}` : (item.displayName || item.file?.name || '');
                window.open(`https://www.google.com/search?q=${encodeURIComponent(query)}`, '_blank');
            }
        },
        {
            label: 'Enlarge cover',
            icon: 'fa-solid fa-image',
            action() { enlargeCover(); }
        },
        {
            label: 'Remove',
            icon: 'fa-solid fa-trash',
            action() {
                remq(idx);
            },
        }
    ];

    actions.forEach(({ label, icon, action }) => {
        const li = document.createElement('li');
        li.style.cssText = 'padding:0.45rem 0.8rem;cursor:pointer;display:flex;align-items:center;gap:0.6rem;font-size:0.88rem;color:var(--fg);';
        li.innerHTML = `<i class="${icon}" style="width:1rem;text-align:center;opacity:0.6;"></i>${label}`;
        li.addEventListener('mouseenter', () => { li.style.background = 'var(--control-br)'; });
        li.addEventListener('mouseleave', () => { li.style.background = ''; });
        li.addEventListener('click', (ev) => {
            ev.stopPropagation();
            _dismissQueueCtxMenu();
            action();
        });
        menu.appendChild(li);
    });

    document.body.appendChild(menu);
    _queueCtxMenu = menu;

    const rect = menu.getBoundingClientRect();
    if (rect.right > window.innerWidth) menu.style.left = (e.clientX - rect.width) + 'px';
    if (rect.bottom > window.innerHeight) menu.style.top = (e.clientY - rect.height) + 'px';
}

document.addEventListener('click', _dismissQueueCtxMenu);
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') _dismissQueueCtxMenu(); });

function rqueue() {
    const ul = elements.queueList;
    if (!ul) return;
    ul.innerHTML = '';
    queue.forEach((item, idx) => {
        const li = document.createElement('li');
        li.className = 'queue-item' + (idx === currentIndex ? ' active' : '');
        li.draggable = true;
        li.dataset.index = idx;

        const title = item.meta?.title;
        const artist = item.meta?.artist;
        const fullLabel = (title || artist) ? `${title || 'Unknown track'} by ${artist || 'Unknown artist'}` : (item.displayName || item.file.name);
        const displayTitle = title ? act_truncate(title) : null;
        const displayArtist = artist ? act_truncate(artist) : null;
        const label = (displayTitle || displayArtist) ? `${displayTitle || 'Unknown track'} by ${displayArtist || 'Unknown artist'}` : (item.displayName || item.file.name);

        li.textContent = '';
        li.title = fullLabel || 'Unknown track';
        li.addEventListener('dblclick', () => pindex(idx, { manual: true }));
        li.addEventListener('click', () => {
            const cur = ul.querySelector('.queue-item.focus');
            if (cur) cur.classList.remove('focus');
            li.classList.add('focus');
        });

        const lf = document.createElement('span');
        lf.className = 'qi-left';
        const n = document.createElement('span');
        n.className = 'qi-num';
        n.textContent = String(idx + 1);
        const lb = document.createElement('span');
        lb.className = 'qi-label';
        lb.textContent = label;
        lf.appendChild(n);
        lf.appendChild(lb);

        const rem = document.createElement('button');
        rem.className = 'qi-remove';
        rem.innerHTML = '<i class="fa-solid fa-xmark"></i>';
        rem.title = 'Remove from queue';
        rem.addEventListener('click', (e) => {
            e.stopPropagation();
            remq(idx);
        });

        const dur = document.createElement('span');
        dur.className = 'qi-dur qi-num';
        dur.textContent = form_time_short(item.duration);
        if (item.duration == null && item.file) {
            enqueueDurationLoad(item, dur);
        }

        li.appendChild(lf);
        li.appendChild(dur);
        li.appendChild(rem);

        li.addEventListener('dragstart', handleDragStart);
        li.addEventListener('dragover', handleDragOver);
        li.addEventListener('dragenter', handleDragEnter);
        li.addEventListener('dragleave', handleDragLeave);
        li.addEventListener('drop', handleDrop);
        li.addEventListener('dragend', handleDragEnd);
        li.addEventListener('contextmenu', (e) => _showQueueCtxMenu(e, item, idx));

        ul.appendChild(li);

        calqueue();
    });
}
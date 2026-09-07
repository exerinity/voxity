function getQueueContextMenuTasks(item) {
    return [
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
                const idx = queue.indexOf(item);
                if (idx < 0) return;
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
                window.open(`https://www.google.com/search?q=${encodeURIComponent(query).toLowerCase()}`, '_blank');
            }
        },
        {
            label: 'Remove',
            icon: 'fa-solid fa-trash',
            action() {
                const idx = queue.indexOf(item);
                if (idx >= 0) remq(idx);
            },
        }
    ];
}

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
        li.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            spawnContextMenu(item, getQueueContextMenuTasks(item), e);
        });

        ul.appendChild(li);

        calqueue();
    });
}
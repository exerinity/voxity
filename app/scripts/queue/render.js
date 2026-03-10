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

        ul.appendChild(li);

        calqueue();
    });
}
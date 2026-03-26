function form_time_short(sec) {
    if (!isFinite(sec) || sec <= 0) return '--:--';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
}

function ensureDurationAudioElement() {
    if (durationAudio) return durationAudio;
    durationAudio = document.createElement('audio');
    durationAudio.preload = 'metadata';
    durationAudio.style.display = 'none';
    try {
        if (document.body && !durationAudio.isConnected) {
            document.body.appendChild(durationAudio);
        }
    } catch { null }
    return durationAudio;
}

function enqueueDurationLoad(item, durEl) {
    if (!item || item.duration != null || !item.file) return;
    item._pendingDurationEl = durEl || null;
    if (item._durationLoading) {
        return;
    }
    item._durationLoading = true;
    durationLoadQueue.push(item);
    processNextDurationLoad();
}

function calqueue() {
    const qh = document.getElementById('queuehead');
    if (qh) {
        const td = queue.reduce((acc, cur) => acc + (cur.duration || 0), 0);
        let timeStr = form_time_short(td);
        let hourStr = '';
        if (td >= 3600) {
            const h = Math.floor(td / 3600);
            const m = Math.floor((td % 3600) / 60);
            const s = Math.floor(td % 60);
            hourStr = ` / ${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
        }
        qh.innerHTML = `Queue (${queue.length} track${queue.length !== 1 ? 's' : ''}, ${timeStr}${hourStr})`;
    }
}

function scrollCurrentQueueItemIntoView(options = {}) {
    const list = elements.queueList;
    if (!list) return false;

    const activeItem = list.querySelector('.queue-item.active');
    if (!activeItem) return false;

    const focused = list.querySelector('.queue-item.focus');
    if (focused && focused !== activeItem) {
        focused.classList.remove('focus');
    }
    activeItem.classList.add('focus');

    const scrollContainer = list.closest('.queue-container') || list;
    const block = (options && options.block) || 'center';
    const scrollTop = scrollContainer.scrollTop;
    const containerHeight = scrollContainer.clientHeight;

    const containerRect = scrollContainer.getBoundingClientRect();
    const itemRect = activeItem.getBoundingClientRect();
    const relativeTop = (itemRect.top - containerRect.top) + scrollTop;
    const itemHeight = itemRect.height || activeItem.offsetHeight || 0;
    const itemBottom = relativeTop + itemHeight;
    const maxScroll = Math.max(0, scrollContainer.scrollHeight - containerHeight);
    const isFullyVisible = relativeTop >= scrollTop && itemBottom <= scrollTop + containerHeight;

    let targetScrollTop = scrollTop;
    if (block === 'start') {
        targetScrollTop = relativeTop;
    } else if (block === 'end') {
        targetScrollTop = itemBottom - containerHeight;
    } else if (block === 'nearest') {
        if (!isFullyVisible) {
            targetScrollTop = relativeTop < scrollTop ? relativeTop : (itemBottom - containerHeight);
        }
    } else {
        // default to centering the item
        targetScrollTop = relativeTop - ((containerHeight - itemHeight) / 2);
    }

    if (!isFinite(targetScrollTop)) {
        targetScrollTop = 0;
    }
    scrollContainer.scrollTop = Math.max(0, Math.min(maxScroll, targetScrollTop));

    return true;
}

function getQueueItemSearchText(item) {
    if (!item) return '';
    const parts = [];
    const meta = item.meta || {};
    if (meta.title) parts.push(meta.title);
    if (meta.artist) parts.push(meta.artist);
    if (meta.album) parts.push(meta.album);
    if (item.displayName) parts.push(item.displayName);
    if (item.file && item.file.name) parts.push(item.file.name);
    return parts.join(' ').trim();
}

function computeLevenshteinDistance(a, b) {
    if (a === b) return 0;
    const lenA = a.length;
    const lenB = b.length;
    if (lenA === 0) return lenB;
    if (lenB === 0) return lenA;
    const prev = new Array(lenB + 1);
    const curr = new Array(lenB + 1);
    for (let j = 0; j <= lenB; j++) {
        prev[j] = j;
    }
    for (let i = 1; i <= lenA; i++) {
        curr[0] = i;
        const codeA = a.charCodeAt(i - 1);
        for (let j = 1; j <= lenB; j++) {
            const cost = codeA === b.charCodeAt(j - 1) ? 0 : 1;
            const insertion = curr[j - 1] + 1;
            const deletion = prev[j] + 1;
            const substitution = prev[j - 1] + cost;
            curr[j] = Math.min(insertion, deletion, substitution);
        }
        for (let j = 0; j <= lenB; j++) {
            prev[j] = curr[j];
        }
    }
    return prev[lenB];
}

function computeQueueSearchScore(text, needle, idx) {
    if (!text) return Number.POSITIVE_INFINITY;
    const haystack = text.toLowerCase();
    const query = needle.toLowerCase();
    const substringIndex = haystack.indexOf(query);
    const baselineIdx = currentIndex >= 0 ? currentIndex : 0;
    const proximityPenalty = Math.abs(idx - baselineIdx) * 0.001;
    if (substringIndex !== -1) {
        const startBonus = substringIndex === 0 ? -0.25 : 0;
        return substringIndex * 0.01 + proximityPenalty + startBonus;
    }

    const words = haystack.split(/\s+/).filter(Boolean);
    let bestDistance = query.length || 1;
    if (words.length === 0) {
        bestDistance = computeLevenshteinDistance(query, haystack.slice(0, Math.max(query.length, 32)));
    } else {
        for (const word of words) {
            const sample = word.slice(0, Math.max(query.length + 2, 8));
            const distance = computeLevenshteinDistance(query, sample);
            if (distance < bestDistance) {
                bestDistance = distance;
                if (bestDistance === 0) break;
            }
        }
    }
    const normalizedDistance = bestDistance / Math.max(query.length, 1);
    return 5 + normalizedDistance + proximityPenalty;
}

function findClosestQueueMatch(query) {
    if (!Array.isArray(queue) || queue.length === 0) return null;
    const trimmed = typeof query === 'string' ? query.trim() : '';
    if (!trimmed) return null;
    let best = null;
    queue.forEach((item, idx) => {
        const text = getQueueItemSearchText(item);
        if (!text) return;
        const score = computeQueueSearchScore(text, trimmed, idx);
        if (!isFinite(score)) return;
        if (!best || score < best.score) {
            best = { index: idx, score, item, text };
        }
    });
    return best;
}

function focusQueueItemAtIndex(idx, options = {}) {
    const list = elements.queueList;
    if (!list) return false;
    const items = list.querySelectorAll('.queue-item');
    if (!items || idx < 0 || idx >= items.length) return false;
    const target = items[idx];
    if (!target) return false;

    const currentFocus = list.querySelector('.queue-item.focus');
    if (currentFocus && currentFocus !== target) {
        currentFocus.classList.remove('focus');
    }
    target.classList.add('focus');

    const scrollOptions = {
        behavior: options.behavior || 'smooth',
        block: options.block || 'center',
        inline: options.inline || 'nearest',
    };

    try {
        target.scrollIntoView(scrollOptions);
    } catch {
        try {
            target.scrollIntoView();
        } catch { }
    }

    if (options.flash) {
        target.classList.add('search-hit');
        const timeout = options.flashDuration || 1500;
        setTimeout(() => {
            if (target.isConnected) {
                target.classList.remove('search-hit');
            }
        }, timeout);
    }

    return true;
}

function jumpToQueueSearchMatch(target, options = {}) {
    const match = typeof target === 'string' ? findClosestQueueMatch(target) : target;
    if (!match) return false;
    const highlightOptions = { flash: true, ...options };
    const focused = focusQueueItemAtIndex(match.index, highlightOptions);
    if (!focused) return false;
    return true;
}

async function openQueueSearchModal(initialQuery = '') {
    if (!elements.queueList || queue.length === 0) {
        throw_error('No tracks in the queue');
        return null;
    }

    const modal = await msg(`
        <form id="queue-search-form" style="display:flex; flex-direction:column; gap:0.75rem; text-align:left;">
            <input id="queue-search-input" type="text" autocomplete="off" placeholder="Track title, artist, album, or file name" style="padding:0.65rem 0.8rem; border-radius:10px; border:1px solid var(--fg); background:var(--dialog-bg); color:var(--fg);">
            <label style="display:flex; align-items:center; gap:0.5rem; font-size:0.95rem; opacity:0.85;">
                <input id="queue-search-play" type="checkbox" style="transform:scale(1.1);">
                <span>Play result immediately</span>
            </label>
            <div style="display:flex; justify-content:flex-end; gap:0.5rem;">
                <button type="submit" class="bu" id="queue-search-submit" style="padding: 10px 16px; background: #27ae60; color: white; border: none; border-radius: 6px; cursor: pointer;">Jump</button>
            </div>
        </form>
    `, 'Search the queue');
    window.VoxityRouter?.setModalRoute(modal, '/find');

    const input = document.getElementById('queue-search-input');
    const form = document.getElementById('queue-search-form');
    const playCheckbox = document.getElementById('queue-search-play');
    const initialValue = initialQuery || lastQueueSearchQuery || '';

    if (input) {
        input.value = initialValue;
        requestAnimationFrame(() => {
            try {
                input.focus();
                input.select();
            } catch { }
        });
    }

    if (playCheckbox) {
        playCheckbox.checked = queueSearchPlayImmediate;
        playCheckbox.addEventListener('change', () => {
            queueSearchPlayImmediate = playCheckbox.checked;
        });
    }

    const submitSearch = () => {
        if (!input) return;
        const value = input.value.trim();
        if (!value) {
            throw_error('Enter something to search');
            return;
        }
        lastQueueSearchQuery = value;
        const match = findClosestQueueMatch(value);
        if (!match) {
            throw_error('No results');
            return;
        }
        if (!jumpToQueueSearchMatch(match)) {
            throw_error('Unable to jump to result');
            return;
        }
        if (queueSearchPlayImmediate && typeof pindex === 'function') {
            pindex(match.index, { manual: true });
        }
        if (modal && typeof modal.close === 'function') {
            modal.close();
        }
    };

    form?.addEventListener('submit', (event) => {
        event.preventDefault();
        submitSearch();
    });

    return modal;
}
const deb_ms = 500;
let lastact = 0;
const elements = {
    app: document.getElementById('app'),
    player: document.getElementById('player'),
    upload: document.getElementById('upload'),
    status: document.getElementById('status'),
    title: document.getElementById('np'),
    title2: document.getElementById('np2'),
    timeCurrent: document.getElementById('time-current'),
    timeDuration: document.getElementById('time-duration'),
    index: document.getElementById('index'),
    indexTooltip: document.getElementById('index-tooltip'),
    vol: document.getElementById('volume'),
    vol_min: document.getElementById('vol-min'),
    vol_max: document.getElementById('vol-max'),
    speed: document.getElementById('speed'),
    speed_min: document.getElementById('spd-min'),
    speed_max: document.getElementById('spd-max'),
    viz_int: document.getElementById('viz-intensity'),
    viz_mo: document.getElementById('viz-mode'),
    err_tab: document.getElementById('error'),
    pnow: document.getElementById('play-now'),
    stopnow: document.getElementById('cancel'),
    welcomesound: document.getElementById('welcomesound'),
    success_sound: document.getElementById('sucsound'),
    error_sound: document.getElementById('errsound'),
    message_sound: document.getElementById('msgsound'),
    branding: document.getElementById('branding'),
    queueList: document.getElementById('queue-list'),
};

function shouldPlaySoundEffects() {
    return typeof window.VoxitySettings === 'undefined' || window.VoxitySettings.isEnabled('soundEffects');
}

let stallExit = false;

window.addEventListener("beforeunload", (event) => {
    if (isPWA()) return;
    if (!stallExit) return;

    event.preventDefault();
    event.returnValue = "";
});

function isPWA() {
    return (
        window.matchMedia("(display-mode: standalone)").matches ||
        window.matchMedia("(display-mode: window-controls-overlay)").matches ||
        navigator.standalone === true
    );
}

function playUiSound(audioEl, { reset = true } = {}) {
    if (!audioEl || !shouldPlaySoundEffects()) return;
    try {
        if (reset) {
            audioEl.currentTime = 0;
        }
        const maybePromise = audioEl.play();
        if (maybePromise && typeof maybePromise.catch === 'function') {
            maybePromise.catch(() => { });
        }
    } catch { }
}

let songNotificationCounter = 0;
let lastSongNotificationKey = null;

function shouldSendSongNotifications() {
    if (typeof window === 'undefined') return false;
    if (typeof Notification === 'undefined') return false;
    if (Notification.permission !== 'granted') return false;
    if (typeof window.VoxitySettings === 'undefined') return false;
    return !!window.VoxitySettings.isEnabled('songNotifications');
}

function buildSongNotificationKey(file) {
    const parts = [
        file?.name || '',
        file?.size || 0,
        file?.lastModified || 0,
        metadata.title || '',
        metadata.artist || '',
        metadata.album || '',
    ];
    return parts.join('|');
}

function maybeNotifySongStart(file) {
    if (!shouldSendSongNotifications()) return;
    const key = buildSongNotificationKey(file);
    if (lastSongNotificationKey && key === lastSongNotificationKey) return;
    lastSongNotificationKey = key;
    const meta = typeof metadata !== 'undefined' ? metadata : {};
    const title = meta.title || file?.name || 'Unknown title';
    const artist = meta.artist || '';
    const album = meta.album || '';
    let body = `${title}`;
    if (artist) {
        body += ` by ${artist}`;
    }
    if (album) {
        body += ` from ${album}`;
    }
    const icon = (typeof globalart !== 'undefined' && globalart) ? globalart : '/favicon.ico';
    try {
        songNotificationCounter += 1;
        new Notification('Now playing', {
            body,
            icon,
            tag: `voxity-song-${songNotificationCounter}`,
        });
    } catch { }
}

let stat_calls = 0;
let stat_out = null;
let currentObjectUrl = null;
let pt = 0;
let cph = null;
let scrollRefreshQueued = false;
let scrollResizeBound = false;
let scrollRetryAttempts = 0;
const SCROLL_HOLD_MS = 5000;
const scrollTimers = new WeakMap();
const scrollIterationHandlers = new WeakMap();

function stat_up(msg, ac = true) {
    stat_calls++;
    elements.status.innerHTML = msg;

    if (ac) {
        if (stat_out) {
            clearTimeout(stat_out);
        }
        stat_out = setTimeout(() => {
            if (!elements.player.src) {
                elements.status.innerHTML = `<i class="fa-solid fa-tower-broadcast bop"></i> Voxity`;
                elements.branding.innerHTML = null;
            } else if (elements.player.paused) {
                elements.status.innerHTML = `<i class="fa-solid fa-circle-pause"></i> Now paused: <strong>${metadata.title || 'Unknown track'}</strong> by ${metadata.artist || 'Unknown artist'}`;
                elements.branding.innerHTML = '<i class="fa-solid fa-tower-broadcast bop"></i> Voxity';
            } else {
                calqueue();
                elements.status.innerHTML = `<i class="fa-solid fa-circle-play"></i> Now playing: <strong>${metadata.title || 'Unknown track'}</strong> by ${metadata.artist || 'Unknown artist'}`;
                elements.branding.innerHTML = '<i class="fa-solid fa-tower-broadcast fa-beat bop"></i> Voxity';
            }
            stat_out = null;
        }, 2500);
    }
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

function play(file, name) {
    const t = ++pt;
    try { elements.player.pause(); } catch { }
    lrc_wipe();
    if (!elements.welcomesound.paused) {
        elements.welcomesound.pause();
    }
    if (cph) {
        try { elements.player.removeEventListener('canplaythrough', cph); } catch { }
        cph = null;
    }
    try { if (currentObjectUrl) URL.revokeObjectURL(currentObjectUrl); } catch { }
    currentObjectUrl = URL.createObjectURL(file);
    elements.player.src = currentObjectUrl;
    try { elements.player.load(); } catch { }
    elements.player.classList.remove('hidden');
    setCurrentFile(file);
    let r = 0;
    const mr = 3;
    function ap() {
        if (t !== pt) return;
        elements.player.play().then(() => {
            if (t !== pt) return;
            document.getElementById('plps').innerHTML = '<i class="fa-solid fa-pause"></i>';
            context_init(elements.player);
            vis_init();
            elements.title2.innerHTML = name;
            get_meta(file);
            sfa(metadata.picture && metadata.picture.data ? URL.createObjectURL(new Blob([new Uint8Array(metadata.picture.data)], { type: metadata.picture.format })) : '/favicon.ico');
            const ra = parseFloat(elements.vol.value);
            elements.player.volume = isNaN(ra) ? 1 : Math.max(0, Math.min(1, ra / 2));
            const rt = parseFloat(elements.speed.value);
            elements.player.playbackRate = isNaN(rt) ? 1 : rt;
            twittermoji();
            calqueue();
        }).catch(e => {
            if (t !== pt) return;
            if (r < mr) {
                r++;
                setTimeout(() => { if (t !== pt) return; ap(); }, 1000);
            } else {
                throw_error(e.message);
                stat_up('Error playing...');
            }
        });
    }
    ap();
    cph = () => { if (t !== pt) return; ap(); };
    elements.player.addEventListener('canplaythrough', cph, { once: true });
}

const queue = [];
let currentIndex = -1;
let queueIdCounter = 0;
let shuffleMode = false;
let shufflePool = [];
let shuffleHistory = [];
let shuffleButton = null;
const durationLoadQueue = [];
let durationLoadInProgress = false;
let durationAudio = null;
let durationLoadUnsupportedCount = 0;
let durationLoadUnsupportedFiles = [];

function getItemIdByIndex(idx) {
    const item = queue[idx];
    return item && typeof item.id === 'number' ? item.id : null;
}

function getCurrentItemId() {
    return getItemIdByIndex(currentIndex);
}

function findIndexById(id) {
    return queue.findIndex(item => item.id === id);
}

function pruneShuffleState() {
    if (!shuffleMode) return;
    const validIds = new Set(queue.map(item => item.id));
    const currentId = getCurrentItemId();
    shufflePool = shufflePool.filter((id) => validIds.has(id) && (currentId == null || id !== currentId));
    shuffleHistory = shuffleHistory.filter((id) => validIds.has(id));
}

function resetShufflePool() {
    if (!shuffleMode) {
        shufflePool = [];
        shuffleHistory = [];
        return;
    }
    pruneShuffleState();
    const currentId = getCurrentItemId();
    const ids = queue.map(item => item.id);
    if (ids.length <= 1) {
        shufflePool = currentId == null ? ids.slice() : [];
        return;
    }
    shufflePool = ids.filter(id => id !== currentId);
}

function ensureShufflePoolFilled() {
    if (!shuffleMode) return;
    pruneShuffleState();
    if (shufflePool.length === 0 && queue.length > 1) {
        resetShufflePool();
    }
}

function removeFromShufflePool(id) {
    if (id == null) return;
    shufflePool = shufflePool.filter(existing => existing !== id);
}

function addToShufflePool(id) {
    if (!shuffleMode) return;
    if (id == null) return;
    if (!queue.some(item => item.id === id)) return;
    if (queue.length <= 1) return;
    const currentId = getCurrentItemId();
    if (currentId != null && id === currentId) return;
    if (!shufflePool.includes(id)) {
        shufflePool.push(id);
    }
}

function onQueueItemAdded(item) {
    if (!shuffleMode) return;
    if (!item || item.id == null) return;
    addToShufflePool(item.id);
}

function onQueueItemRemoved(item) {
    if (!item || item.id == null) return;
    removeFromShufflePool(item.id);
    shuffleHistory = shuffleHistory.filter(id => id !== item.id);
}

function getNextShuffleIndex() {
    if (!shuffleMode) return null;
    pruneShuffleState();
    if (queue.length === 0) return null;
    if (queue.length === 1) {
        return currentIndex === 0 ? null : 0;
    }
    ensureShufflePoolFilled();
    while (shufflePool.length > 0) {
        const randomIdx = Math.floor(Math.random() * shufflePool.length);
        const targetId = shufflePool.splice(randomIdx, 1)[0];
        const idx = findIndexById(targetId);
        if (idx !== -1) {
            return idx;
        }
    }
    return null;
}

function updateShuffleButton() {
    if (!shuffleButton) return;
    shuffleButton.innerHTML = '<i class="fa-solid fa-shuffle"></i>';
    shuffleButton.style.color = shuffleMode ? 'green' : 'red';
    shuffleButton.setAttribute('aria-pressed', shuffleMode ? 'true' : 'false');
}

function toggleShuffle() {
    shuffleMode = !shuffleMode;
    if (shuffleMode) {
        shuffleHistory = [];
        resetShufflePool();
        stat_up('<i class="fa-solid fa-shuffle" style="color: green;"></i> Shuffle <strong>ON</strong>');
    } else {
        shuffleHistory = [];
        shufflePool = [];
        stat_up('<i class="fa-solid fa-shuffle" style="color: red;"></i> Shuffle <strong>OFF</strong>');
    }
    updateShuffleButton();
}

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
function processNextDurationLoad() {
    if (durationLoadInProgress) return;
    const nextItem = durationLoadQueue.shift();
    if (!nextItem) {
        if (durationLoadUnsupportedCount > 0) {
            if (durationLoadUnsupportedCount < 10 && durationLoadUnsupportedFiles.length > 0) {
                const list = durationLoadUnsupportedFiles.map(n => `${n}`).join('<br>');
                msg(`${durationLoadUnsupportedCount} songs were not supported, thus they were not processed. If you're certain they work with browsers, <a href="https://cobalt.tools/remux" target="_blank">try remuxing them</a>.<br><br><strong>Broken files:</strong><br>${list}`);
            } else {
                msg(`${durationLoadUnsupportedCount} songs were not supported, thus they were not processed. If you're certain they work with browsers, <a href="https://cobalt.tools/remux" target="_blank">try remuxing them</a>.`);
            }
            durationLoadUnsupportedCount = 0;
            durationLoadUnsupportedFiles = [];
        }
        return;
    }
    durationLoadInProgress = true;
    const audio = ensureDurationAudioElement();
    let objectUrl = null;

    function cleanup() {
        delete nextItem._durationLoading;
        delete nextItem._pendingDurationEl;
        durationLoadInProgress = false;
        audio.removeEventListener('loadedmetadata', handleLoaded);
        audio.removeEventListener('error', handleError);
        if (objectUrl) {
            try { URL.revokeObjectURL(objectUrl); } catch { null }
            objectUrl = null;
        }
        try {
            audio.pause();
            audio.removeAttribute('src');
            audio.load();
        } catch { null }
        processNextDurationLoad();
    }

    function handleLoaded() {
        const idx = findIndexById(nextItem.id);
        const pos = idx !== -1 ? idx + 1 : (queue.length ? queue.length : 1);
        const total = queue.length || 1;
        stat_up(`<i class="fa-solid fa-people-carry-box"></i> Loading ${nextItem.displayName || nextItem.file.name} (${pos} of ${total})...`);
        calqueue();

        const durationValue = Number.isFinite(audio.duration) ? audio.duration : NaN;

        if (!Number.isFinite(durationValue) || durationValue <= 0) {
            if (idx === currentIndex) {
                nextItem.duration = 0;
            } else if (idx !== -1) {
                queue.splice(idx, 1);
                onQueueItemRemoved(nextItem);
                durationLoadUnsupportedCount++;
                try { durationLoadUnsupportedFiles.push(nextItem.displayName || nextItem.file.name); } catch { null }
                stat_up(`<i class="fa-solid fa-circle-exclamation"></i> Ignoring broken file: ${nextItem.displayName || nextItem.file.name}`);
            }
            rqueue();
            cleanup();
            return;
        }

        nextItem.duration = durationValue;
        const targetEl = nextItem._pendingDurationEl;
        const textValue = form_time_short(durationValue);
        if (targetEl && targetEl.isConnected) {
            targetEl.textContent = textValue;
        } else {
            rqueue();
        }
        cleanup();
    }

    function handleError() {
        const idx = findIndexById(nextItem.id);
        if (idx !== -1 && idx !== currentIndex) {
            queue.splice(idx, 1);
            onQueueItemRemoved(nextItem);
            durationLoadUnsupportedCount++;
            try { durationLoadUnsupportedFiles.push(nextItem.displayName || nextItem.file.name); } catch { null }
            stat_up(`<i class="fa-solid fa-circle-exclamation"></i> Ignoring broken file: ${nextItem.displayName || nextItem.file.name}`);
        } else if (idx === currentIndex) {
            nextItem.duration = 0;
        }
        rqueue();
        cleanup();
    }

    audio.addEventListener('loadedmetadata', handleLoaded, { once: true });
    audio.addEventListener('error', handleError, { once: true });
    try {
        objectUrl = URL.createObjectURL(nextItem.file);
        audio.src = objectUrl;
        audio.load();
    } catch {
        handleError();
    }
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

        ul.appendChild(li);

        calqueue();
    });
}

let dragSrcIndex = null;

function handleDragStart(e) {
    dragSrcIndex = parseInt(this.dataset.index, 10);
    this.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
}

function handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
}

function handleDragEnter() {
    this.classList.add('drag-over');
}

function handleDragLeave() {
    this.classList.remove('drag-over');
}

function handleDrop(e) {
    e.stopPropagation();
    const dragTargetIndex = parseInt(this.dataset.index, 10);
    if (dragSrcIndex !== dragTargetIndex) {
        const [movedItem] = queue.splice(dragSrcIndex, 1);
        queue.splice(dragTargetIndex, 0, movedItem);

        if (currentIndex === dragSrcIndex) {
            currentIndex = dragTargetIndex;
        } else if (currentIndex > dragSrcIndex && currentIndex <= dragTargetIndex) {
            currentIndex -= 1;
        } else if (currentIndex < dragSrcIndex && currentIndex >= dragTargetIndex) {
            currentIndex += 1;
        }

        rqueue();
    }
    return false;
}

function handleDragEnd() {
    const items = elements.queueList.querySelectorAll('.queue-item');
    items.forEach((item) => {
        item.classList.remove('dragging', 'drag-over');
    });
}

async function handleEntry(entry, options = {}) {
    if (!entry) return;
    const opts = options && typeof options === 'object' ? options : {};
    const { fromDirectory = false } = opts;

    if (entry.isFile) {
        await new Promise(resolve => {
            entry.file(file => {
                quf([file], { ignoreInvalid: fromDirectory });
                resolve();
            });
        });

    } else if (entry.isDirectory) {
        const reader = entry.createReader();

        async function readBatch() {
            return new Promise(resolve => {
                reader.readEntries(async entries => {
                    if (entries.length === 0) return resolve();

                    for (const e of entries) {
                        await handleEntry(e, { fromDirectory: true });
                    }

                    resolve(await readBatch());
                });
            });
        }

        await readBatch();
    }
}

const AUDIO_EXTENSIONS = new Set([
    'mp3',
    'aac',
    'm4a',
    'wav',
    'ogg',
    'opus',
    'flac',
    'webm',

    // video is cool too
    'mp4',
    'm4v',
    'webm',
    'ogv'
]);

const LYRIC_EXTENSIONS = new Set(['lrc', 'srt', 'vtt']);

function getFileExtension(name) {
    if (!name || typeof name !== 'string') return '';
    const parts = name.split('.');
    if (parts.length < 2) return '';
    return parts.pop().toLowerCase();
}

function isLyricsFile(file) {
    if (!file) return false;
    const ext = getFileExtension(file.name);
    return LYRIC_EXTENSIONS.has(ext);
}

function isAudioFile(file) {
    if (!file) return false;
    if (file.type && file.type.startsWith('audio/')) return true;
    const ext = getFileExtension(file.name);
    return AUDIO_EXTENSIONS.has(ext);
}

function quf(fileList, options = {}) {
    const opts = options && typeof options === 'object' ? options : {};
    const { ignoreInvalid = false } = opts;
    const files = Array.from(fileList).filter(Boolean);
    if (files.length === 0) {
        if (!ignoreInvalid) {
            throw_error('No files selected');
        }
        return;
    }
    if (!ignoreInvalid && files.length === 1 && isLyricsFile(files[0])) {
        const name = files[0].name || '';
        const lower = name.toLowerCase();
        function padTwo(n) { return String(n).padStart(2, '0'); }
        function secondsFromHms(hms) {
            const v = hms.replace(',', '.').trim();
            const parts = v.split(':').map(Number);
            if (parts.length === 3) {
                return parts[0] * 3600 + parts[1] * 60 + parts[2];
            } else if (parts.length === 2) {
                return parts[0] * 60 + parts[1];
            }
            return parseFloat(v) || 0;
        }
        function formatLrcTimestamp(secs) {
            const mm = Math.floor(secs / 60);
            const ssFloat = secs % 60;
            const ss = ssFloat.toFixed(2);
            return `${padTwo(mm)}:${ss.padStart(5, '0')}`;
        }
        function srt_to_lrc(srt) {
            const blocks = srt.split(/\r?\n\r?\n/).map(b => b.trim()).filter(Boolean);
            const out = [];
            for (const block of blocks) {
                const timeMatch = block.match(/(\d{1,2}:\d{2}:\d{2}[,\.]\d{1,3})\s*-->\s*(\d{1,2}:\d{2}:\d{2}[,\.]\d{1,3})/);
                if (!timeMatch) continue;
                const start = timeMatch[1];
                const text = block.split(/\r?\n/).slice(1).join(' ').replace(/<[^>]+>/g, '').trim();
                if (!text) continue;
                const secs = secondsFromHms(start);
                out.push(`[${formatLrcTimestamp(secs)}]${text}`);
            }
            return out.join('\n');
        }
        function vtt_to_lrc(vtt) {
            const content = vtt.replace(/^WEBVTT[\s\S]*?\n\n/, '');
            const blocks = content.split(/\r?\n\r?\n/).map(b => b.trim()).filter(Boolean);
            const out = [];
            for (const block of blocks) {
                const timeMatch = block.match(/(\d{1,2}:)?\d{1,2}:\d{2}\.\d{3}\s*-->\s*(\d{1,2}:)?\d{1,2}:\d{2}\.\d{3}/);
                const tsLine = (block.split(/\r?\n/).find(l => /-->/.test(l)) || '').trim();
                if (!tsLine) continue;
                const startMatch = tsLine.match(/(\d{1,2}:)?\d{1,2}:\d{2}[\.,]\d{1,3}/);
                if (!startMatch) continue;
                const start = startMatch[0];
                const text = block.split(/\r?\n/).filter(l => !/-->/.test(l)).slice(1).join(' ').replace(/<[^>]+>/g, '').trim() || block.split(/\r?\n/).filter(l => !/-->/.test(l)).join(' ').replace(/<[^>]+>/g, '').trim();
                if (!text) continue;
                const secs = secondsFromHms(start);
                out.push(`[${formatLrcTimestamp(secs)}]${text}`);
            }
            return out.join('\n');
        }

        const reader = new FileReader();
        reader.onload = function (e) {
            const text = e.target.result || '';
            const ext = lower.split('.').pop();
            try {
                if (ext === 'lrc') {
                    if (typeof lrc_parse === 'function') {
                        lrc_data = lrc_parse(text);
                    } else if (typeof parse_lyrics === 'function') {
                        lrc_data = parse_lyrics(text);
                    } else {
                        throw new Error('LRC parser is missing');
                    }
                } else if (ext === 'srt') {
                    if (typeof lrc_parse !== 'function') throw new Error('LRC parser is missing');
                    const lrcText = srt_to_lrc(text);
                    lrc_data = lrc_parse(lrcText);
                } else if (ext === 'vtt') {
                    if (typeof lrc_parse !== 'function') throw new Error('LRC parser is missing');
                    const lrcText = vtt_to_lrc(text);
                    lrc_data = lrc_parse(lrcText);
                }
            } catch (err) {
                throw_error('Parse failed: ' + (err && err.message ? err.message : err), false);
                return;
            }

            if (!elements.player || !elements.player.src) {
                throw_error('Nothing playing');
                return;
            }

            try { skipLyricsUpdate = false; update_lyrics(); } catch { null }
            throw_error('Added lyrics', true);
        };
        reader.readAsText(files[0]);
        return;
    }

    const audioFiles = files.filter(isAudioFile);
    const hasInvalidFiles = files.length !== audioFiles.length;
    if (!ignoreInvalid && hasInvalidFiles) {
        throw_error('Some invalid files were added');
    }
    if (audioFiles.length === 0) {
        if (!ignoreInvalid) {
            throw_error('Not supported');
        }
        return;
    }

    const isemp = queue.length === 0;
    for (const f of audioFiles) {
        const item = { id: ++queueIdCounter, file: f, displayName: f.name };
        queue.push(item);
        onQueueItemAdded(item);
        try {
            jsmediatags.read(f, {
                onSuccess: (tag) => {
                    const t = tag?.tags || {};
                    item.meta = {
                        title: t.title || '',
                        artist: t.artist || '',
                        album: t.album || '',
                    };
                    rqueue();
                },
                onError: () => { null }
            });
        } catch { null }
    }
    rqueue();
    calqueue();
    if (isemp && queue.length > 0) {
        pindex(0);
    }
}

function pindex(idx, options = {}) {
    if (idx < 0 || idx >= queue.length) return;
    const opts = options && typeof options === 'object' ? options : {};
    const { pushHistory = true, manual = false } = opts;
    const previousId = getCurrentItemId();
    currentIndex = idx;
    const item = queue[idx];
    const currentId = item && typeof item.id === 'number' ? item.id : null;

    if (shuffleMode) {
        pruneShuffleState();
        if (manual) {
            resetShufflePool();
        }
        if (pushHistory && previousId != null && previousId !== currentId && queue.some(entry => entry.id === previousId)) {
            if (shuffleHistory[shuffleHistory.length - 1] !== previousId) {
                shuffleHistory.push(previousId);
            }
        }
        removeFromShufflePool(currentId);
    }

    play(item.file, item.displayName || item.file.name);
    rqueue();
}

function contin(options = {}) {
    const opts = options && typeof options === 'object' ? options : {};
    const { silent = false } = opts;

    if (queue.length === 0) {
        if (!silent) {
            throw_error('This is a dead end, add more tracks');
        }
        return false;
    }
    if (shuffleMode) {
        const nextIdx = getNextShuffleIndex();
        if (nextIdx === null) {
            if (!silent) {
                throw_error('This is a dead end, add more tracks');
            }
            return false;
        }
        const currentId = getCurrentItemId();
        if (currentId != null) {
            if (shuffleHistory[shuffleHistory.length - 1] !== currentId) {
                shuffleHistory.push(currentId);
            }
        }
        pindex(nextIdx, { pushHistory: false });
        return true;
    }

    const next = currentIndex + 1;
    if (next < queue.length) {
        pindex(next);
        return true;
    }
    if (!silent) {
        throw_error('This is a dead end, add more tracks');
    }
    return false;
}

function previ() {
    if (queue.length === 0) return;
    if (shuffleMode) {
        pruneShuffleState();
        const previousId = shuffleHistory.pop();
        if (previousId == null) {
            elements.player.currentTime = 0;
            stat_up('<i class="fa-solid fa-arrow-rotate-left"></i> Restarted the track');
            return;
        }
        const prevIndex = findIndexById(previousId);
        if (prevIndex === -1) {
            elements.player.currentTime = 0;
            stat_up('<i class="fa-solid fa-arrow-rotate-left"></i> Restarted the track');
            return;
        }
        const currentId = getCurrentItemId();
        if (currentId != null) {
            addToShufflePool(currentId);
        }
        pindex(prevIndex, { pushHistory: false });
        return;
    }

    const prev = currentIndex - 1;
    if (prev >= 0) {
        pindex(prev);
    } else {
        elements.player.currentTime = 0;
        stat_up('<i class="fa-solid fa-arrow-rotate-left"></i> Restarted the track');
    }
}

function resetPlayerState() {
    try { elements.player.pause(); } catch { }
    elements.player.currentTime = 0;
    if (cph) {
        try { elements.player.removeEventListener('canplaythrough', cph); } catch { }
        cph = null;
    }
    if (currentObjectUrl) {
        try { URL.revokeObjectURL(currentObjectUrl); } catch { }
        currentObjectUrl = null;
    }
    elements.player.src = '';
    try { elements.player.load(); } catch { }
    elements.player.classList.add('hidden');
    document.getElementById('plps').innerHTML = '<i class="fa-solid fa-play"></i>';
    lrc_wipe();
    if (typeof setCurrentFile === 'function') {
        try { setCurrentFile(null); } catch { }
    }
    metadata.title = '';
    metadata.artist = '';
    metadata.album = '';
    metadata.picture = null;
    elements.title2.innerHTML = '';
    const artistEl = document.getElementById('artist');
    const albumEl = document.getElementById('album');
    if (artistEl) artistEl.innerHTML = '';
    if (albumEl) albumEl.innerHTML = '';
    elements.timeCurrent.innerHTML = '--:--';
    elements.timeDuration.innerHTML = '--:--';
    elements.index.value = 0;
    elements.index.max = 100;
    if (typeof globalart !== 'undefined') {
        globalart = '';
    }
    if (typeof _ms_art_url !== 'undefined' && _ms_art_url) {
        try { URL.revokeObjectURL(_ms_art_url); } catch { }
        _ms_art_url = null;
    }
    const cover = document.getElementById('cover-art');
    if (cover) {
        cover.classList.add('hidden');
        cover.removeAttribute('src');
        cover.removeAttribute('alt');
        cover.removeAttribute('title');
    }
    sfa('/favicon.ico');
    if ('mediaSession' in navigator) {
        try { navigator.mediaSession.playbackState = 'none'; } catch { }
    }
    if (typeof set_media_session_metadata === 'function') {
        try { set_media_session_metadata(); } catch { }
    }
}

function clea() {
    if (queue.length === 0) {
        return throw_error('Queue is already empty');
    }
    const removed = queue.splice(0);
    removed.forEach(onQueueItemRemoved);
    currentIndex = -1;
    queueIdCounter = 0;
    shufflePool = [];
    shuffleHistory = [];
    pt++;
    resetPlayerState();
    rqueue();
    calqueue();
    stat_up('<i class="fa-solid fa-broom"></i> Queue cleared');
    throw_error('Cleared', true);
}

function remq(idx) {
    if (queue.length <= 1) {
        throw_error('You cannot remove the last track');
        return;
    }
    if (idx < 0 || idx >= queue.length) return;
    const wasCurrent = idx === currentIndex;
    const [removed] = queue.splice(idx, 1);
    onQueueItemRemoved(removed);
    pruneShuffleState();
    if (currentIndex > idx) currentIndex -= 1;
    if (wasCurrent) {
        if (idx < queue.length) {
            pindex(idx, { pushHistory: false });
        } else if (queue.length > 0) {
            pindex(queue.length - 1, { pushHistory: false });
        } else {
            resetPlayerState();
        }
    }
    stat_up('<i class="fa-solid fa-trash"></i> Removed from queue');
    rqueue();
}

function init() {
    if (/android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(navigator.userAgent)) {
        msg(`Voxity is not recommended or optimized for mobile devices. For the best experience, please use a desktop. Since Voxity is a "two panel" design, only one panel would realistically fit.<br><br>Also, clean that dirty fucking screen.`, 'Mobile')
    }

    playUiSound(elements.welcomesound);
    document.getElementById('preemptive_warn').classList.add('hidden');
    document.getElementById('app').classList.remove('hidden');

    document.getElementById('dropzone')?.addEventListener('contextmenu', (e) => e.preventDefault(), { once: true });
    document.getElementById('droppedzone')?.addEventListener('contextmenu', (e) => e.preventDefault(), { once: true });

    elements.upload.addEventListener('change', function () {
        if (elements.upload.files && elements.upload.files.length > 0) {
            quf(elements.upload.files);
            elements.upload.value = '';
        }
    });

    let onrepeat = false;
    elements.player.loop = onrepeat;
    const rep_button = document.getElementById('loop');
    rep_button.innerHTML = '<i class="fa-solid fa-repeat"></i>';
    rep_button.style.color = onrepeat ? 'green' : 'red';
    document.getElementById('loop').addEventListener('click', debounce(() => {
        onrepeat = !onrepeat;
        elements.player.loop = onrepeat;
        rep_button.innerHTML = '<i class="fa-solid fa-repeat"></i>';
        rep_button.style.color = onrepeat ? 'green' : 'red';
        stat_up(onrepeat ? '<i class="fa-solid fa-repeat" style="color: green;"></i> Loop <strong>ON</strong>' : '<i class="fa-solid fa-repeat" style="color: red;"></i> Loop <strong>OFF</strong>');
    }));

    shuffleButton = document.getElementById('shuffle');
    updateShuffleButton();
    shuffleButton?.addEventListener('click', debounce(() => {
        toggleShuffle();
    }));

    elements.player.addEventListener('play', () => {
        if (frame_id) {
            cancelAnimationFrame(frame_id);
        }
        frame_id = requestAnimationFrame(vis_init);
        if ('mediaSession' in navigator) {
            try { navigator.mediaSession.playbackState = 'playing'; } catch { }
            const setPos = navigator.mediaSession.setPositionState?.bind(navigator.mediaSession);
            if (setPos) {
                try { setPos({ duration: elements.player.duration || 0, playbackRate: elements.player.playbackRate || 1, position: elements.player.currentTime || 0 }); } catch { }
            }
        }
    });

    elements.player.addEventListener('pause', () => {
        if (frame_id) {
            cancelAnimationFrame(frame_id);
            frame_id = null;
        }
        if ('mediaSession' in navigator) {
            try { navigator.mediaSession.playbackState = 'paused'; } catch { }
            const setPos = navigator.mediaSession.setPositionState?.bind(navigator.mediaSession);
            if (setPos) {
                try { setPos({ duration: elements.player.duration || 0, playbackRate: elements.player.playbackRate || 1, position: elements.player.currentTime || 0 }); } catch { }
            }
        }
    });

    elements.player.addEventListener('ended', () => {
        if (elements.player.loop) {
            return;
        }
        if (contin({ silent: true })) {
            return;
        }
        elements.player.currentTime = 0;
        elements.player.pause();
        playUiSound(document.getElementById('donesound'));
        throw_error('Finished playing queue', true);
        document.getElementById('plps').innerHTML = '<i class="fa-solid fa-play"></i>';
        sfa('/favicon.ico');
        if ('mediaSession' in navigator) {
            try { navigator.mediaSession.playbackState = 'paused'; } catch { }
        }
    });

    elements.player.addEventListener('error', (e) => {
        const error = elements.player.error;
        let err_msg = 'Playback error: ';
        if (error) {
            switch (error.code) {
                case error.MEDIA_ERR_ABORTED:
                    err_msg += 'you aborted the media playback';
                    break;
                case error.MEDIA_ERR_DECODE:
                    err_msg += 'this file is either corrupted or is unsupported by your browser';
                    break;
                case error.MEDIA_ERR_SRC_NOT_SUPPORTED:
                    err_msg += 'this format is unsupported by your browser';
                    break;
                default:
                    err_msg += 'idk man';
                    break;
            }
        }
        throw_error(err_msg);
    });

    elements.player.addEventListener('timeupdate', () => {
        const current = form_time(elements.player.currentTime);
        const duration = form_time(elements.player.duration);
        elements.timeCurrent.innerHTML = current;
        elements.timeDuration.innerHTML = duration;
        elements.index.max = elements.player.duration || 100;
        elements.index.value = elements.player.currentTime;
        update_lyrics();
        if ('mediaSession' in navigator && navigator.mediaSession.setPositionState) {
            try {
                navigator.mediaSession.setPositionState({
                    duration: elements.player.duration || 0,
                    playbackRate: elements.player.playbackRate || 1,
                    position: elements.player.currentTime || 0,
                });
            } catch { }
        }
    });

    elements.vol.addEventListener('input', () => {
        let hi = '<i class="fa-solid fa-volume-high"></i>';
        let med = '<i class="fa-solid fa-volume-low"></i>';
        let low = '<i class="fa-solid fa-volume-off"></i>';
        let mute = '<i class="fa-solid fa-volume-xmark"></i>';
        elements.player.volume = elements.vol.value / 2;
        elements.vol_min.innerHTML = '0';
        elements.vol_max.innerHTML = '1';

        let icon;
        if (elements.player.volume === 0) {
            icon = mute;
        } else if (elements.player.volume < 0.33) {
            icon = low;
        } else if (elements.player.volume < 0.66) {
            icon = med;
        } else {
            icon = hi;
        }

        stat_up(`${icon} Volume: <strong>${(elements.player.volume * 100).toFixed(0)}%</strong>`);
    });

    elements.speed.addEventListener('input', () => {
        let low = '<i class="fa-solid fa-gauge-high fa-flip-horizontal"></i>';
        let med = '<i class="fa-solid fa-gauge"></i>';
        let hi = '<i class="fa-solid fa-gauge-high"></i>';
        let icon;
        if (elements.speed.value < 0.7) {
            icon = low;
        } else if (elements.speed.value < 1.3) {
            icon = med;
        } else {
            icon = hi;
        }
        elements.player.playbackRate = elements.speed.value;
        elements.speed_min.innerHTML = '0.1x';
        elements.speed_max.innerHTML = '2.0x';
        stat_up(`${icon} Speed: <strong>${elements.speed.value}x</strong>`);
        if (parseFloat(elements.speed.value) === 2.0) stat_up(`${icon} Speed: <strong>${elements.speed.value}x</strong> - to go higher, click "Speed" above the slider!`);
    });

    elements.index.addEventListener('input', () => {
        elements.player.currentTime = elements.index.value;
        stat_up(`<i class="fa-solid fa-music"></i> Scrubbing to: <strong>${form_time(elements.index.value)} / ${form_time(elements.player.duration)}</strong>`);
    });

    elements.viz_mo.addEventListener('change', () => {
        stat_up(`<i class="fa-solid fa-chart-simple"></i> Visualizer mode: <strong>${elements.viz_mo.value}</strong>`);
    });

    wheel(elements.index, () => 3);
    wheel(elements.vol, () => 0.1);
    wheel(elements.speed, () => 0.01);

    if ('mediaSession' in navigator) {
        try {
            navigator.mediaSession.setActionHandler('play', async () => {
                try { await elements.player.play(); } catch { }
            });
            navigator.mediaSession.setActionHandler('pause', () => {
                elements.player.pause();
            });
            navigator.mediaSession.setActionHandler('nexttrack', () => { contin(); });
            navigator.mediaSession.setActionHandler('previoustrack', () => {
                previ();
            });
        } catch { }
    }

    const dropTarget = document.getElementById('dropzone');
    if (dropTarget) {
        dropTarget.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'copy';
        });
        dropTarget.addEventListener('drop', async (e) => {
            e.preventDefault();
            const dt = e.dataTransfer;

            if (dt?.items && dt.items.length > 0) {
                const directFiles = [];
                let processed = false;

                for (const item of dt.items) {
                    const entry = item.webkitGetAsEntry?.();
                    if (!entry) continue;

                    if (entry.isDirectory) {
                        processed = true;
                        await handleEntry(entry);
                        continue;
                    }

                    if (entry.isFile) {
                        const file = item.getAsFile?.();
                        if (file) {
                            directFiles.push(file);
                        }
                    }
                }

                if (directFiles.length > 0) {
                    processed = true;
                    quf(directFiles);
                }

                if (processed) return;
            }

            if (dt?.files && dt.files.length > 0) {
                quf(dt.files);
            }
        });

    }

    document.getElementById('nexttrack')?.addEventListener('click', debounce(() => contin()));
    document.getElementById('prevtrack')?.addEventListener('click', debounce(() => previ()));
    document.getElementById('clearqueue')?.addEventListener('click', debounce(() => {
        clea();
    }));
}
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

function maxtruncate() {
    const w = window.innerWidth;
    return Math.round(20 + (w / 1920) * 10);
}

function scheduleScrollResume(textEl, delay = SCROLL_HOLD_MS) {
    const existing = scrollTimers.get(textEl);
    if (existing) {
        clearTimeout(existing);
    }
    textEl.classList.remove('is-scrolling-active');
    if (delay <= 0) {
        textEl.classList.add('is-scrolling-active');
        scrollTimers.delete(textEl);
        return;
    }
    const timer = setTimeout(() => {
        textEl.classList.add('is-scrolling-active');
        scrollTimers.delete(textEl);
    }, delay);
    scrollTimers.set(textEl, timer);
}

function handleScrollIteration(textEl) {
    const direction = textEl.dataset.scrollDirection || 'forward';
    if (direction === 'forward') {
        textEl.dataset.scrollDirection = 'backward';
        return;
    }
    textEl.dataset.scrollDirection = 'forward';
    scheduleScrollResume(textEl, SCROLL_HOLD_MS);
}

function ensureScrollSetup(textEl) {
    if (textEl.dataset.scrollSetup) {
        return;
    }
    textEl.dataset.scrollSetup = '1';
    textEl.dataset.scrollDirection = 'forward';
    const handler = () => handleScrollIteration(textEl);
    textEl.addEventListener('animationiteration', handler);
    scrollIterationHandlers.set(textEl, handler);
    scheduleScrollResume(textEl, SCROLL_HOLD_MS);
}

function clearScrollSetup(textEl) {
    textEl.classList.remove('is-scrolling');
    textEl.classList.remove('is-scrolling-active');
    textEl.style.removeProperty('--scroll-distance');
    textEl.style.removeProperty('--scroll-duration');
    const handler = scrollIterationHandlers.get(textEl);
    if (handler) {
        textEl.removeEventListener('animationiteration', handler);
        scrollIterationHandlers.delete(textEl);
    }
    const timer = scrollTimers.get(textEl);
    if (timer) {
        clearTimeout(timer);
        scrollTimers.delete(textEl);
    }
    delete textEl.dataset.scrollSetup;
    delete textEl.dataset.scrollDirection;
}

function queueScrollRefresh() {
    if (scrollRefreshQueued) return;
    scrollRefreshQueued = true;
    requestAnimationFrame(() => {
        scrollRefreshQueued = false;
        const containers = document.querySelectorAll('.mqcont');
        let needsRetry = false;
        containers.forEach((container) => {
            const textEl = container.querySelector('.mqtext');
            if (!textEl) return;
            const containerWidth = container.clientWidth;
            if (containerWidth === 0) {
                clearScrollSetup(textEl);
                if (container.offsetParent !== null) {
                    needsRetry = true;
                }
                return;
            }
            const textWidth = textEl.scrollWidth;
            if (textWidth <= containerWidth) {
                clearScrollSetup(textEl);
                return;
            }
            const distance = containerWidth - textWidth;
            textEl.classList.add('is-scrolling');
            textEl.style.setProperty('--scroll-distance', `${distance}px`);
            const duration = Math.min(20, Math.max(6, Math.abs(distance) / 40));
            textEl.style.setProperty('--scroll-duration', `${duration.toFixed(2)}s`);
            ensureScrollSetup(textEl);
        });
        if (needsRetry && scrollRetryAttempts < 5) {
            scrollRetryAttempts += 1;
            setTimeout(queueScrollRefresh, 200);
        } else {
            scrollRetryAttempts = 0;
        }
    });
    if (!scrollResizeBound) {
        scrollResizeBound = true;
        window.addEventListener('resize', queueScrollRefresh);
    }
}

function truncate(text) {
    const truncate_max = maxtruncate();

    if (text.length <= truncate_max) {
        return `<span>${text}</span>`;
    }
    queueScrollRefresh();
    return `
        <div class="mqcont">
            <div class="mqtext">${text}</div>
        </div>
    `;
}

function act_truncate(text) {
    const truncate_max = maxtruncate();

    if (text.length <= truncate_max) {
        return text;
    }
    return text.slice(0, truncate_max) + '...';
}

// i commented this shit out because it seemed extremely overcomplicated
/*let inited = false;
function ri() { if (inited) return; inited = true; init(); }
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', ri, { once: true });
} else {
    ri();
}*/
init();

const link = document.createElement('link');
link.rel = 'icon';
link.type = 'image/png';
link.href = '/favicon.ico';
document.getElementsByTagName('head')[0].appendChild(link);
function sfa(url) {
    if (!url) return;
    try {
        link.href = url;
    } catch { null }
}

if (typeof localStorage !== 'undefined') {
    const isFirstVisit = !localStorage.getItem('hai');
    if (isFirstVisit) {
        try { localStorage.setItem('hai', '1'); } catch { null }
        setTimeout(() => {
            msg(`<p>Voxity is a web-based audio player that lets you play local audio files directly in your browser. Just drag and drop files to get started!</p>
<p>To learn more, visit Voxity's page on my website: <a href="https://exerinity.dev/projects/voxity" target="_blank" rel="noopener">https://exerinity.dev/projects/voxity</a></p>
<p><a href="https://exerinity.dev/projects/voxity/screenshots" target="_blank" rel="noopener">View some screenshots of Voxity here</a></p>
<p>Thanks, and have fun! <i class="fa-solid fa-broadcast-tower fa-beat bop"></i></p><a href="https://exerinity.com/twitter" target="_blank"><i class="fa-brands fa-twitter" style="color:#1da1f2;"></i> Follow me on Twitter</a> - <a href="https://exerinity.dev/projects" target="_blank"><i class="fa-solid fa-globe"></i> My other projects</a>
<br><small><a href="/i/reload_fa" onclick="event.preventDefault(); loadFA()">(if you do not see any icons, click here)</a></small>
`, "Welcome to Voxity");
        }, 2500);

        stat_up('<i class="fa-solid fa-tower-broadcast fa-beat bop"></i> Welcome to Voxity!');
    } else {
        stat_up('<i class="fa-solid fa-tower-broadcast fa-beat bop"></i> Welcome back to Voxity!');
    }
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
document.getElementById('dropzone').addEventListener('contextmenu', (e) => e.preventDefault());
document.getElementById('droppedzone').addEventListener('contextmenu', (e) => e.preventDefault());
// intentionally, i am leaving the top status bar right-clickable, but to keep it cleaner, no right-click on the rest of the app

async function loadFA() {
    closeTopModal(); // for if in settings or welcome lolz
    const mod = await msg("Attempting to inject Font Awesome manually...");
    const fl = document.createElement('link');
    fl.rel = 'stylesheet';
    fl.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css';
    fl.crossOrigin = 'anonymous';
    fl.referrerPolicy = 'no-referrer';

    document.head.appendChild(fl);

    fl.onload = () => mod.setContent('Icons should have loaded <i class="fa-solid fa-font-awesome"></i>');
    fl.onerror = () => throw_error("Could not load icons");
}
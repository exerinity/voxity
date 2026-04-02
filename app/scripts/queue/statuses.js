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
        try {
            const controller = typeof window !== 'undefined' ? window.VoxityAutoAccent : null;
            if (controller && typeof controller.handleArtwork === 'function') {
                controller.handleArtwork('');
            }
        } catch { }
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

    if (typeof clean === 'function') {
        try { clean(); } catch { }
    }
    if (typeof frame_id !== 'undefined' && frame_id) {
        try { cancelAnimationFrame(frame_id); } catch { }
        frame_id = null;
    }

    try { elements.player.pause(); } catch { }
    resetPlayerState();

    if (stat_out) {
        clearTimeout(stat_out);
        stat_out = null;
    }
    if (elements.status) {
        elements.status.innerHTML = `<i class="fa-solid fa-tower-broadcast bop"></i> Voxity`;
    }
    if (elements.branding) {
        elements.branding.innerHTML = null;
    }

    rqueue();

    const queuePlaceholderItem = '<li class="queue-item placeholder">The queue is empty <i class="fa-solid fa-tower-broadcast fa-beat bop"></i></li>';
    const queueContainerMarkup = `
        <ul id="queue-list" class="queue-list">
            ${queuePlaceholderItem}
        </ul>
    `.trim();

    const queueContainer = document.getElementById('queue-container');
    if (queueContainer) {
        queueContainer.innerHTML = queueContainerMarkup;
        const refreshedList = queueContainer.querySelector('#queue-list');
        if (refreshedList) {
            elements.queueList = refreshedList;
        }
    } else if (elements.queueList) {
        elements.queueList.innerHTML = queuePlaceholderItem;
    }

    calqueue();
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

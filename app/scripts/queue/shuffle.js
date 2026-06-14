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

function getShuffleButtonAction() {
    try {
        if (typeof window !== 'undefined' && window.VoxitySettings) {
            return window.VoxitySettings.get('shuffleButtonAction') === 'jumble' ? 'jumble' : 'shuffle';
        }
    } catch { }
    return 'shuffle';
}

function updateShuffleButton() {
    if (!shuffleButton) return;
    shuffleButton.innerHTML = '<i class="fa-solid fa-shuffle"></i>';
    if (getShuffleButtonAction() === 'jumble') {
        shuffleButton.style.removeProperty('color');
        shuffleButton.setAttribute('aria-pressed', 'false');
        shuffleButton.title = 'Shuffle the queue';
        return;
    }
    shuffleButton.style.color = shuffleMode ? 'green' : 'red';
    shuffleButton.setAttribute('aria-pressed', shuffleMode ? 'true' : 'false');
    shuffleButton.title = 'Toggle shuffle';
}

function jumbleQueue() {
    if (queue.length <= 1) {
        stat_up('<i class="fa-solid fa-shuffle"></i> Nothing to shuffle');
        return;
    }
    const currentId = getCurrentItemId();
    for (let i = queue.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [queue[i], queue[j]] = [queue[j], queue[i]];
    }
    if (currentId != null) {
        currentIndex = findIndexById(currentId);
    }
    if (shuffleMode) {
        resetShufflePool();
    }
    rqueue();
    stat_up('<i class="fa-solid fa-shuffle"></i> Queue shuffled');
}

function handleShuffleButton() {
    if (getShuffleButtonAction() === 'jumble') {
        jumbleQueue();
    } else {
        toggleShuffle();
    }
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
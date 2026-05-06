const queue = [];
let currentIndex = -1;
let queueIdCounter = 0;
let shuffleMode = false;
let shufflePool = [];
let shuffleHistory = [];
let shuffleButton = null;
const durationLoadQueue = [];
let durationLoadDelay = 100;
let durationLoadInProgress = false;
let durationAudio = null;
let durationLoadUnsupportedCount = 0;
let durationLoadUnsupportedFiles = [];
let durationLoadGeneration = 0;
let lastQueueSearchQuery = '';
let queueSearchPlayImmediate = false;

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
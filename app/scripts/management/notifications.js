const SONG_NOTIFICATION_BASE_DELAY = 300;
const SONG_NOTIFICATION_MAX_DELAY = 5000;
const SONG_NOTIFICATION_BURST_WINDOW = 3000;

let songNotificationCounter = 0;
let lastSongNotificationKey = null;
let lastSongNotification = null;
let songNotificationTimer = null;
let songNotificationChangeToken = 0;
let songNotificationSettledToken = 0;
let songNotificationChangeTimes = [];
let songNotificationRapidSkipStreak = 0;

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

function getAdaptiveSongNotificationDelay() {
    const now = Date.now();
    const previousChangeTime = songNotificationChangeTimes[songNotificationChangeTimes.length - 1] || 0;
    const interval = previousChangeTime ? now - previousChangeTime : Infinity;

    if (interval < SONG_NOTIFICATION_BASE_DELAY) {
        songNotificationRapidSkipStreak += 1;
    } else if (interval > SONG_NOTIFICATION_BURST_WINDOW) {
        songNotificationRapidSkipStreak = 0;
    } else {
        songNotificationRapidSkipStreak = Math.max(0, songNotificationRapidSkipStreak - 1);
    }

    songNotificationChangeTimes.push(now);
    songNotificationChangeTimes = songNotificationChangeTimes.filter(
        (changeTime) => now - changeTime <= SONG_NOTIFICATION_BURST_WINDOW
    );

    const burstCount = Math.max(0, songNotificationChangeTimes.length - 1);
    const speedPenalty = Number.isFinite(interval) ? Math.max(0, SONG_NOTIFICATION_BASE_DELAY - interval) : 0;

    return Math.min(
        SONG_NOTIFICATION_MAX_DELAY,
        SONG_NOTIFICATION_BASE_DELAY
        + (songNotificationRapidSkipStreak * 650)
        + (burstCount * 250)
        + Math.round(speedPenalty * 0.75)
    );
}

function dispatchSongNotification(file) {
    if (!shouldSendSongNotifications()) return;

    const key = buildSongNotificationKey(file);
    if (lastSongNotificationKey && key === lastSongNotificationKey) return;
    lastSongNotificationKey = key;

    const meta = typeof metadata !== 'undefined' ? metadata : {};
    const title = meta.title || file?.name || 'Unknown title';
    const artist = meta.artist || '';
    const body = artist ? `by ${artist}` : '';
    const icon =
        (typeof globalart !== 'undefined' && globalart)
            ? globalart
            : '/app/media/voxity.png';

    try {
        if (lastSongNotification && typeof lastSongNotification.close === 'function') {
            lastSongNotification.close();
        }
        songNotificationCounter += 1;
        lastSongNotification = new Notification(title, {
            body,
            icon,
            tag: `voxity-song-${songNotificationCounter}`,
            silent: true,
        });
    } catch { }
}

function scheduleSongNotification(file) {
    if (!shouldSendSongNotifications()) return;

    const key = buildSongNotificationKey(file);
    if (lastSongNotificationKey && key === lastSongNotificationKey) return;

    songNotificationChangeToken += 1;
    const token = songNotificationChangeToken;
    const delay = getAdaptiveSongNotificationDelay();

    clearTimeout(songNotificationTimer);
    songNotificationTimer = setTimeout(() => {
        songNotificationTimer = null;
        if (token !== songNotificationChangeToken) return;
        songNotificationSettledToken = token;
        dispatchSongNotification(file);
    }, delay);
}

function maybeNotifySongStart(file) {
    scheduleSongNotification(file);
}
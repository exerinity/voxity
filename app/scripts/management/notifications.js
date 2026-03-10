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

    const body = 'by ' + artist || '';

    const icon =
        (typeof globalart !== 'undefined' && globalart)
            ? globalart
            : '/app/media/voxity.png';

    try {
        songNotificationCounter += 1;
        new Notification(title, {
            body,
            icon,
            tag: `voxity-song-${songNotificationCounter}`,
            silent: true,
        });
    } catch { }
}
let cur_file = null;
let lrc_data = [];
let globalart = '';
let _ms_art_url = null;
let activeLyricsKey = null;
let skipLyricsUpdate = false;
let isLyricsLoading = false;
let lastLyricsRequest = null;
const lrc_con = document.getElementById('lyrics');
let lrc_amount = 16;
const metadata = {};
let faviconObjectUrl = null;
let defaultFaviconHref = null;

function get_meta(file) {
    jsmediatags.read(file, {
        onSuccess: function (tag) {
            const tags = tag.tags;
            metadata.title = tags.title || file.name || 'Unknown title';
            metadata.artist = tags.artist || 'Unknown artist';
            metadata.album = tags.album || 'Unknown album';
            const hasCompleteMetadata = Boolean(tags.title && tags.artist && tags.album);
            metadata.picture = tags.picture || null;

            if (!hasCompleteMetadata) {
                throw_error("There is missing metadata, lyrics may not work", 2);
            }

            document.getElementById('artist').innerHTML = `<strong>${truncate(metadata.artist)}</strong>`;
            document.getElementById('album').innerHTML = `<strong>${truncate(metadata.album)}</strong>`;
            document.getElementById('np2').innerHTML = truncate(metadata.title);

            const cover = document.getElementById('cover-art');
            if (metadata.picture) {
                const arr = new Uint8Array(metadata.picture.data);
                let binary = '';
                const cs = 8192;
                for (let i = 0; i < arr.length; i += cs) {
                    binary += String.fromCharCode.apply(null, arr.subarray(i, i + cs));
                }
                const b64 = btoa(binary);
                globalart = `data:${metadata.picture.format};base64,${b64}`;
                cover.src = globalart;
                cover.classList.remove('hidden');
                cover.title = metadata.album || metadata.title || 'Cover art';
                cover.alt = `Cover art for ${metadata.album || metadata.title} by ${metadata.artist}`;
                notifyAutoAccentController(globalart);
                updateFaviconFromArtwork(metadata.picture);
                if ('mediaSession' in navigator) {
                    try {
                        if (_ms_art_url) { URL.revokeObjectURL(_ms_art_url); _ms_art_url = null; }
                        const blob = new Blob([new Uint8Array(metadata.picture.data)], { type: metadata.picture.format || 'image/jpeg' });
                        _ms_art_url = URL.createObjectURL(blob);
                        set_media_session_metadata(_ms_art_url);
                    } catch {
                        set_media_session_metadata();
                    }
                }
            } else {
                globalart = '';
                cover.classList.add('hidden');
                notifyAutoAccentController('');
                updateFaviconFromArtwork(null);
                if ('mediaSession' in navigator) set_media_session_metadata();
            }

            try {
                if (typeof maybeNotifySongStart === 'function') {
                    maybeNotifySongStart(file);
                }
            } catch { }

            try {
                const player = document.getElementById('player');
                const duration = Math.floor(player?.duration || 0) || 0;
                if (hasCompleteMetadata) {
                    lastLyricsRequest = {
                        file,
                        duration,
                        key: buildLyricsRequestKey(file, duration),
                    };
                    maybeExecuteAutoLyrics();
                } else {
                    lastLyricsRequest = null;
                }
            } catch { null }
        },
        onError: function () {
            metadata.title = act_truncate(file.name) || 'Unknown title';
            metadata.artist = 'Unknown artist';
            metadata.album = 'Unknown album';

            document.getElementById('artist').innerHTML = '';
            document.getElementById('album').innerHTML = '';
            document.getElementById('np2').innerHTML = act_truncate(file.name || 'Unknown track');
            document.title = '';
            document.getElementById('cover-art').classList.add('hidden');
            globalart = '';
            notifyAutoAccentController('');
            updateFaviconFromArtwork(null);
            if ('mediaSession' in navigator) set_media_session_metadata();
            lastLyricsRequest = null;
            try {
                if (typeof maybeNotifySongStart === 'function') {
                    maybeNotifySongStart(file);
                }
            } catch { }
        }
    });
}

function notifyAutoAccentController(source) {
    try {
        const controller = typeof window !== 'undefined' ? window.VoxityAutoAccent : null;
        if (controller && typeof controller.handleArtwork === 'function') {
            controller.handleArtwork(source || '');
        }
    } catch { }
}

function shouldUseDynamicFavicon() {
    if (typeof isElectron === 'function' && isElectron()) {
        return false;
    }
    if (typeof window === 'undefined' || typeof window.VoxitySettings === 'undefined') {
        return true;
    }
    try {
        return !!window.VoxitySettings.isEnabled('dynamicFavicon');
    } catch {
        return true;
    }
}

function updateFaviconFromArtwork(picture) {
    if (typeof document === 'undefined') return;
    let link = document.querySelector("link[rel*='icon']");
    if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        document.head?.appendChild(link);
    }
    if (!link) return;
    if (!defaultFaviconHref) {
        defaultFaviconHref = link.href || '/favicon.ico';
    }
    const restoreDefaultFavicon = () => {
        if (faviconObjectUrl) {
            try { URL.revokeObjectURL(faviconObjectUrl); } catch { }
            faviconObjectUrl = null;
        }
        link.href = defaultFaviconHref;
    };
    if (!shouldUseDynamicFavicon()) {
        restoreDefaultFavicon();
        return;
    }
    if (!picture || !picture.data) {
        restoreDefaultFavicon();
        return;
    }
    try {
        const blob = new Blob([new Uint8Array(picture.data)], { type: picture.format || 'image/png' });
        if (faviconObjectUrl) {
            try { URL.revokeObjectURL(faviconObjectUrl); } catch { }
        }
        faviconObjectUrl = URL.createObjectURL(blob);
        link.href = faviconObjectUrl;
    } catch {
        restoreDefaultFavicon();
    }
}

document.addEventListener('voxity:settings-changed', (event) => {
    if (!event || !event.detail) return;
    const key = event.detail.key;
    if (key === '*' || key === 'dynamicFavicon') {
        updateFaviconFromArtwork(metadata.picture || null);
    }
});
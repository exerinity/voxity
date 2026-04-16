;(function () {
    const STORAGE_KEY = 'au_settings';
    const DEFAULTS = Object.freeze({
        soundEffects: true,
        titleRotation: true,
        titleRotationInterval: 5,
        staticSongTitle: true,
        autoLyrics: true,
        lyricsSource: 'lrclib',
        lrclibMode: 'strict',
        songNotifications: false,
        wakeLock: false,
        autoAccentColor: false,
        dynamicFavicon: true,
    });

    let values = { ...DEFAULTS };

    function load() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (!raw) return;
            const parsed = JSON.parse(raw);
            if (parsed && typeof parsed === 'object') {
                values = { ...DEFAULTS, ...parsed };
                Object.keys(DEFAULTS).forEach((key) => {
                    if (typeof DEFAULTS[key] === 'boolean') {
                        values[key] = !!values[key];
                    }
                });
            }
        } catch {
            values = { ...DEFAULTS };
        }
    }

    function persist() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(values));
        } catch {
            null
        }
    }

    function emitChange(key) {
        try {
            document.dispatchEvent(new CustomEvent('voxity:settings-changed', {
                detail: { key, value: values[key], settings: { ...values } },
            }));
        } catch {
            null
        }
    }

    function set(key, value) {
        if (!(key in DEFAULTS)) return;
        const normalized = typeof DEFAULTS[key] === 'boolean' ? !!value : value;
        if (values[key] === normalized) return;
        values[key] = normalized;
        persist();
        emitChange(key);
    }

    function get(key) {
        if (!(key in DEFAULTS)) return undefined;
        return values[key];
    }

    function isEnabled(key) {
        if (!(key in DEFAULTS)) return false;
        return !!values[key];
    }

    function all() {
        return { ...values };
    }

    load();
    persist();

    window.VoxitySettings = {
        get,
        set,
        isEnabled,
        all,
        defaults: { ...DEFAULTS },
    };

    emitChange('*');
})();

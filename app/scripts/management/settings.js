; (function () {
    const STORAGE_KEY = 'au_settings';
    const DEFAULTS = Object.freeze({
        soundEffects: true,
        preventExit: true,
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
        shuffleButtonAction: 'shuffle',
        visualizer: 'spectrum',
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

    function loadFromParams() {
        try {
            const params = new URLSearchParams(window.location.search);
            const relevant = [...params.keys()].filter(key => key in DEFAULTS);
            if (!relevant.length) return;

            const hasExisting = !!localStorage.getItem(STORAGE_KEY);
            if (hasExisting && !confirm("You already have defined settings, but you have redefined them in the URL. Would you like to overwrite your settings?")) return;

            params.forEach((raw, key) => {
                if (!(key in DEFAULTS)) return;
                let coerced;
                if (typeof DEFAULTS[key] === 'boolean') {
                    coerced = /^(1|true|yes)$/i.test(raw);
                } else if (typeof DEFAULTS[key] === 'number') {
                    const n = Number(raw);
                    if (!isNaN(n)) coerced = n;
                } else {
                    coerced = raw;
                }
                if (coerced !== undefined) values[key] = coerced;
            });
        } catch {
            null
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
    loadFromParams();
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

function linkSettings() {
    const params = new URLSearchParams();
    const current = VoxitySettings.all();

    Object.entries(current).forEach(([key, value]) => {
        if (value !== VoxitySettings.defaults[key]) {
            params.set(key, value);
        }
    });

    const url = params.toString()
        ? `${location.origin}${location.pathname}?${params.toString()}`
        : location.origin + location.pathname;

    const modal = msg(`<a style="word-break: break-all;" href="${url}" target="_blank">${url}</a>`);
}
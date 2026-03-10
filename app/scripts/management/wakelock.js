const VoxityWakeLock = (() => {
    let sentinel = null;
    let desired = false;
    let requestPromise = null;
    const releaseHandlers = new WeakMap();

    const isSupported = () => typeof navigator !== 'undefined' && 'wakeLock' in navigator;
    const isVisible = () => typeof document === 'undefined'
        || typeof document.visibilityState === 'undefined'
        || document.visibilityState === 'visible';

    const attachReleaseHandler = (current) => {
        if (!current) return;
        const handler = () => {
            releaseHandlers.delete(current);
            if (sentinel === current) {
                sentinel = null;
            }
            if (!desired || !isVisible()) {
                return;
            }
            requestWakeLock({ silent: true });
        };
        releaseHandlers.set(current, handler);
        try {
            current.addEventListener('release', handler);
        } catch { }
    };

    const releaseWakeLock = async () => {
        if (!sentinel) return;
        const current = sentinel;
        const handler = releaseHandlers.get(current);
        sentinel = null;
        if (handler) {
            try {
                current.removeEventListener('release', handler);
            } catch { }
            releaseHandlers.delete(current);
        }
        try {
            await current.release();
        } catch { }
    };

    const requestWakeLock = async ({ silent = false } = {}) => {
        if (!desired || !isSupported() || !isVisible()) {
            return false;
        }
        if (sentinel) {
            return true;
        }
        if (requestPromise) {
            return requestPromise;
        }
        requestPromise = navigator.wakeLock.request('screen')
            .then((newSentinel) => {
                sentinel = newSentinel;
                attachReleaseHandler(newSentinel);
                return true;
            })
            .catch((error) => {
                if (!silent && typeof throw_error === 'function') {
                    try {
                        const message = error && error.message ? error.message : error;
                        throw_error(`Unable to keep the screen awake: ${message}`);
                    } catch { }
                }
                console.warn('Wake Lock request failed', error);
                return false;
            })
            .finally(() => {
                requestPromise = null;
            });
        return requestPromise;
    };

    const enable = async ({ silent = false, fromSettings = false } = {}) => {
        desired = true;
        if (!isSupported()) {
            if (!fromSettings) {
                desired = false;
                if (!silent && typeof throw_error === 'function') {
                    try {
                        throw_error('This browser is too archaic for that!');
                    } catch { }
                }
            }
            return false;
        }
        if (!isVisible()) {
            return true;
        }
        const acquired = await requestWakeLock({ silent });
        if (!acquired && !fromSettings) {
            desired = false;
            return false;
        }
        return acquired;
    };

    const disable = async () => {
        desired = false;
        await releaseWakeLock();
        return true;
    };

    const syncFromSettings = async (value) => {
        if (value) {
            return enable({ silent: true, fromSettings: true });
        }
        return disable();
    };

    if (typeof document !== 'undefined') {
        document.addEventListener('visibilitychange', () => {
            if (isVisible() && desired) {
                requestWakeLock({ silent: true });
            }
        });
    }

    return {
        supported: isSupported,
        enable,
        disable,
        syncFromSettings,
        isActive: () => Boolean(sentinel),
        wantsWakeLock: () => desired,
    };
})();

window.VoxityWakeLock = VoxityWakeLock;

if (typeof window !== 'undefined' && typeof window.VoxitySettings !== 'undefined') {
    VoxityWakeLock.syncFromSettings(window.VoxitySettings.isEnabled('wakeLock'));
}

document.addEventListener('voxity:settings-changed', (event) => {
    if (!event?.detail) return;
    const { key, value, settings } = event.detail;
    if (key === 'wakeLock') {
        VoxityWakeLock.syncFromSettings(!!value);
        return;
    }
    if (key === '*' && typeof settings?.wakeLock !== 'undefined') {
        VoxityWakeLock.syncFromSettings(!!settings.wakeLock);
    }
});
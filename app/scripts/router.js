(function () {
    const modalMap = new WeakMap();
    const modalStack = [];

    const getCurrentPath = () => {
        return window.location.pathname + window.location.search + window.location.hash;
    };

    const normalizePath = (path) => {
        if (typeof path !== 'string' || path.trim() === '') {
            return getCurrentPath();
        }
        if (path.startsWith('http://') || path.startsWith('https://')) {
            return path;
        }
        return path.startsWith('/') ? path : `/${path}`;
    };

    const replaceUrl = (path) => {
        const normalized = normalizePath(path);
        try {
            if (window.history && typeof window.history.replaceState === 'function') {
                const state = window.history.state || {};
                window.history.replaceState(state, '', normalized);
            }
        } catch {
            null
        }
        return normalized;
    };

    const registerModalRoute = (modal, path) => {
        if (!modal) return;
        const previousPath = getCurrentPath();
        const normalized = replaceUrl(path);
        const record = { modal, path: normalized, previousPath };
        modalStack.push(record);
        modalMap.set(modal, record);
    };

    const handleModalClosed = (modal) => {
        if (!modal) return;
        const record = modalMap.get(modal);
        if (!record) return;
        modalMap.delete(modal);
        const idx = modalStack.indexOf(record);
        if (idx !== -1) {
            modalStack.splice(idx, 1);
        }
        if (record.previousPath) {
            replaceUrl(record.previousPath);
        }
    };

    document.addEventListener('voxity:modal-closed', (event) => {
        handleModalClosed(event?.detail?.modal);
    }, false);

    window.VoxityRouter = {
        setModalRoute(modalOrPromise, path) {
            if (!modalOrPromise || !path) return;
            if (typeof modalOrPromise.then === 'function') {
                modalOrPromise.then(
                    (modal) => registerModalRoute(modal, path),
                    () => { }
                );
                return;
            }
            registerModalRoute(modalOrPromise, path);
        },
    };
})();

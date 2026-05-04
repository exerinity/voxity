let now = 0;
let titleTimer = null;

function isTitleRotationEnabled() {
    return typeof window.VoxitySettings === 'undefined' || window.VoxitySettings.isEnabled('titleRotation');
}

function getTitleRotationIntervalMs() {
    if (typeof window.VoxitySettings === 'undefined') return 5000;
    const raw = Number(window.VoxitySettings.get('titleRotationInterval'));
    const normalized = Number.isFinite(raw) ? Math.min(240, Math.max(1, Math.round(raw))) : 5;
    return normalized * 1000;
}

function shouldShowStaticSongInfo() {
    if (typeof window.VoxitySettings === 'undefined') return true;
    return window.VoxitySettings.isEnabled('staticSongTitle');
}

function setStaticTitle() {
    setTimeout(() => {
        const rotationEnabled = isTitleRotationEnabled();
        const shouldShowTitle = rotationEnabled ? true : shouldShowStaticSongInfo();

        if (!shouldShowTitle) {
            document.title = "Voxity";
            now = 0;
            return;
        }

        if (typeof metadata === "object" && metadata) {
            const title = metadata.title || "";
            const artist = metadata.artist || "";

            if (!title && !artist) {
                document.title = "Voxity";
            } else {
                document.title = `${title || "Unknown Title"} by ${artist || "Unknown Artist"} / Voxity`;
            }
        } else {
            document.title = "Voxity";
        }

        now = 0;
    }, 200); // 2 make sure all metadata is ready
}

function tabtitleOnce() {
    const scroll = [];

    if (typeof metadata === "object" && metadata) {
        const title = metadata.title || "Voxity";
        const artist = metadata.artist || "Voxity";
        const album = metadata.album || "Voxity";

        if (title === album) {
            scroll.push(title, artist, "Voxity");
        } else {
            scroll.push(title, artist, album, "Voxity");
        }
    } else {
        scroll.push("Voxity");
    }

    document.title = scroll[now];
    now = (now + 1) % scroll.length;
}

function startTitleRotation() {
    if (!isTitleRotationEnabled()) {
        stopTitleRotation();
        setStaticTitle();
        return;
    }
    if (titleTimer) return;
    tabtitleOnce();
    titleTimer = setInterval(tabtitleOnce, getTitleRotationIntervalMs());
}

function stopTitleRotation() {
    if (titleTimer) {
        clearInterval(titleTimer);
        titleTimer = null;
    }
    setStaticTitle();
    now = 0;
}

document.addEventListener('DOMContentLoaded', () => {
    try {
        const player = elements && elements.player ? elements.player : document.getElementById('player');
        if (!player) return;

        player.addEventListener('play', () => {
            if (isTitleRotationEnabled()) {
                startTitleRotation();
            } else {
                setStaticTitle();
            }
        });

        player.addEventListener('pause', stopTitleRotation);
        player.addEventListener('ended', stopTitleRotation);

        if (isTitleRotationEnabled() && !player.paused && !player.ended && player.currentTime > 0) {
            startTitleRotation();
        } else {
            setStaticTitle();
        }
    } catch (error) {
        console.error("Error in DOMContentLoaded:", error);
    }
});

document.addEventListener('voxity:settings-changed', (event) => {
    if (!event) return;
    const key = event.detail?.key;
    if (!key) return;

    if (key === 'staticSongTitle') {
        if (!isTitleRotationEnabled()) {
            setStaticTitle();
        }
        return;
    }

    if (key !== 'titleRotation' && key !== 'titleRotationInterval') return;
    const player = (typeof elements !== 'undefined' && elements?.player) ? elements.player : document.getElementById('player');
    if (!player) return;

    if (key === 'titleRotation') {
        if (event.detail.value) {
            if (!player.paused && !player.ended) {
                startTitleRotation();
            }
        } else {
            stopTitleRotation();
        }
        return;
    }

    if (titleTimer) {
        clearInterval(titleTimer);
        titleTimer = setInterval(tabtitleOnce, getTitleRotationIntervalMs());
    }
});

/* The goal of this is to make titles look better...
if you have something like "Sometimes Things Get, Whatever / Random Album Title / deadmau5 / Voxity" all crammed into the title bar,
it looks shitty, and 11 times out of 10, truncated. This doesn't matter much anyway, Voxity integrates with the Media Session API so.. */

/* and the entire point of it can be defeated by turning it off hahah */

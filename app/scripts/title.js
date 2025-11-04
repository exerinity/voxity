let now = 0;
let titleTimer = null;

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
    if (titleTimer) return; 
    tabtitleOnce();
    titleTimer = setInterval(tabtitleOnce, 5000);
}

function stopTitleRotation() {
    if (titleTimer) {
        clearInterval(titleTimer);
        titleTimer = null;
    }
    try { document.title = "Voxity"; } catch { }
    now = 0;
}

document.addEventListener('DOMContentLoaded', () => {
    try {
        const player = elements && elements.player ? elements.player : document.getElementById('player');
        if (!player) return;

        player.addEventListener('play', startTitleRotation);
        player.addEventListener('pause', stopTitleRotation);
        player.addEventListener('ended', stopTitleRotation);

        if (!player.paused && !player.ended && player.currentTime > 0) {
            startTitleRotation();
        }
    } catch { 0 }
});

/* The goal of this is to make titles look better...
if you have something like "Sometimes Things Get, Whatever / Random Album Title / deadmau5 / Voxity" all crammed into the title bar,
it looks shitty, and 11 times out of 10, truncated. This doesn't matter much anyway, Voxity integrates with the Media Session API so.. */
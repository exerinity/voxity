let now = 0;

function tabtitle() {
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

tabtitle();
setInterval(tabtitle, 5000);

/* The goal of this is to make titles look better...
if you have something like "Sometimes Things Get, Whatever / Random Album Title / deadmau5 / Voxity" all crammed into the title bar,
it looks shitty, and 11 times out of 10, truncated. This doesn't matter much anyway, Voxity integrates with the Media Session API so.. */
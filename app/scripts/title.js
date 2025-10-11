let now = 0;

function tabtitle() {
    const scroll = [];

    if (typeof metadata === "object" && metadata) {
        const title = metadata.title || "Audion";
        const artist = metadata.artist || "Audion";
        const album = metadata.album || "Audion";

        if (title === album) {
            scroll.push(title, artist, "Audion");
        } else {
            scroll.push(title, artist, album, "Audion");
        }
    } else {
        scroll.push("Audion");
    }

    document.title = scroll[now];
    now = (now + 1) % scroll.length;
}

tabtitle();
setInterval(tabtitle, 5000);

/* The goal of this is to make titles look better...
if you have something like "Sometimes Things Get, Whatever / Random Album Title / deadmau5 / Audion" all crammed into the title bar,
it looks shitty, and 11 times out of 10, truncated. This doesn't matter much anyway, Audion integrates with the Media Session API so.. */
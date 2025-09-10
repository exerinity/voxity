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
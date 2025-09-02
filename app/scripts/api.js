function set_media_session_metadata(artUrl) {
    if (!('mediaSession' in navigator)) return;
    try {
        const art = [];
        if (artUrl) {
            art.push(
                { src: artUrl, sizes: '96x96', type: 'image/jpeg' },
                { src: artUrl, sizes: '128x128', type: 'image/jpeg' },
                { src: artUrl, sizes: '256x256', type: 'image/jpeg' },
                { src: artUrl, sizes: '512x512', type: 'image/jpeg' }
            );
        }
        navigator.mediaSession.metadata = new MediaMetadata({
            title: metadata.title || 'Unknown track',
            artist: metadata.artist || 'Unknown artist',
            album: metadata.album || 'Unknown album',
            artwork: art,
        });
    } catch {}
}
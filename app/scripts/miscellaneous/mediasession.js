function set_media_session_metadata(artUrl) {
    if ('mediaSession' in navigator) {
        try {
            const art = [];
            if (artUrl) {
                art.push(
                    { src: artUrl, sizes: '96x96',  type: 'image/jpeg' },
                    { src: artUrl, sizes: '128x128', type: 'image/jpeg' },
                    { src: artUrl, sizes: '256x256', type: 'image/jpeg' },
                    { src: artUrl, sizes: '512x512', type: 'image/jpeg' }
                );
            }
            navigator.mediaSession.metadata = new MediaMetadata({
                title:   metadata.title  || 'Unknown track',
                artist:  metadata.artist || 'Unknown artist',
                album:   metadata.album  || 'Unknown album',
                artwork: art,
            });
        } catch { }
    }

    window.voxityMpris?.updateState({
        title:           metadata.title  || 'Unknown track',
        artist:          metadata.artist || 'Unknown artist',
        album:           metadata.album  || 'Unknown album',
        artUrl:          globalart || '',
        url:             elements.player?.src || '',
        trackId:         metadata.title  || String(elements.player?.src),
        durationSeconds: elements.player?.duration    || 0,
        currentSeconds:  elements.player?.currentTime || 0,
        volume:          elements.player?.volume ?? 1,
        status:          elements.player?.paused ? 'paused' : 'playing',
        shuffle:         !!document.getElementById('shuffle')?.classList.contains('active'),
        loop: (() => {
            const l = document.getElementById('loop');
            if (!l) return 'None';
            if (l.classList.contains('track')) return 'Track';
            if (l.classList.contains('active')) return 'Playlist';
            return 'None';
        })(),
    });
}
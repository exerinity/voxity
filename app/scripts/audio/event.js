elements.player.addEventListener('pause', () => {
    document.getElementById('plps').innerHTML = '<i class="fa-solid fa-play"></i>';
    stat_up('<i class="fa-solid fa-circle-pause"></i> Paused playback');
    if ('mediaSession' in navigator) {
        try { navigator.mediaSession.playbackState = 'paused'; } catch { }
    }
    window.voxityMpris?.updateState({ status: 'paused' });
});

elements.player.addEventListener('play', () => {
    stallExit = true;
    document.getElementById('plps').innerHTML = '<i class="fa-solid fa-pause"></i>';
    stat_up('<i class="fa-solid fa-circle-play"></i> Resumed playback');
    if ('mediaSession' in navigator) {
        try { navigator.mediaSession.playbackState = 'playing'; } catch { }
    }
    window.voxityMpris?.updateState({ status: 'playing' });
});
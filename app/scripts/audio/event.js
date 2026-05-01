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

elements.player.addEventListener('seeked', () => {
    stat_up(
        `<i class="fa-solid fa-music"></i> Scrubbing to: <strong>
        ${form_time(elements.player.currentTime)} / ${form_time(elements.player.duration)}
        (${elements.player.duration
            ? Math.round((elements.player.currentTime / elements.player.duration) * 100)
            : 0}% done)
        </strong>`
    );
});

elements.player.addEventListener('volumechange', () => {
    elements.vol.value = elements.player.volume * 2;
    let hi   = '<i class="fa-solid fa-volume-high"></i>';
    let med  = '<i class="fa-solid fa-volume-low"></i>';
    let low  = '<i class="fa-solid fa-volume-off"></i>';
    let mute = '<i class="fa-solid fa-volume-xmark"></i>';
    let icon;
    if (elements.player.volume === 0) {
        icon = mute;
    } else if (elements.player.volume < 0.33) {
        icon = low;
    } else if (elements.player.volume < 0.66) {
        icon = med;
    } else {
        icon = hi;
    }
    stat_up(`${icon} Volume: <strong>${(elements.player.volume * 100).toFixed(0)}%</strong>`);
});
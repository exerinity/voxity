let au_con = null;
let analyser = null;
let source = null;

function context_init(player) {
    if (!au_con) {
        try {
            au_con = new (window.AudioContext || window.webkitAudioContext)();
            source = au_con.createMediaElementSource(player);
            analyser = au_con.createAnalyser();
            analyser.fftSize = 256;

            source.connect(analyser);
            analyser.connect(au_con.destination);
        } catch (e) {
            throw_error(e.message);
        }
    }
}

function clean() {
    if (au_con) {
        au_con.close();
        au_con = null;
        analyser = null;
        source = null;
    }
}

function getAnalyser() {
    return analyser;
}

elements.player.addEventListener('pause', () => {
    document.getElementById('plps').innerHTML = '<i class="fa-solid fa-play"></i>';
    stat_up('<i class="fa-solid fa-circle-pause"></i> Paused playback');
    if ('mediaSession' in navigator) {
        try { navigator.mediaSession.playbackState = 'paused'; } catch { }
    }
});

elements.player.addEventListener('play', () => {
    document.getElementById('plps').innerHTML = '<i class="fa-solid fa-pause"></i>';
    stat_up('<i class="fa-solid fa-circle-play"></i> Resumed playback');
    if ('mediaSession' in navigator) {
        try { navigator.mediaSession.playbackState = 'playing'; } catch { }
    }
});
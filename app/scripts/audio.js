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

console.log('Audio module loaded');
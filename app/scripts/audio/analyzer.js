let au_con = null;
let analyser = null;
let source = null;
let eqFilters = [];

const EQ_BANDS = [31, 62, 125, 250, 500, 1000, 2000, 4000, 8000, 16000];

function context_init(player) {
    if (!au_con) {
        try {
            au_con = new (window.AudioContext || window.webkitAudioContext)();
            source = au_con.createMediaElementSource(player);
            analyser = au_con.createAnalyser();
            analyser.fftSize = 256;

            eqFilters = EQ_BANDS.map((freq) => {
                const filter = au_con.createBiquadFilter();
                filter.type = 'peaking';
                filter.frequency.value = freq;
                filter.Q.value = 1;
                filter.gain.value = 0;
                return filter;
            });

            let node = source;
            eqFilters.forEach((filter) => {
                node.connect(filter);
                node = filter;
            });
            node.connect(analyser);
            analyser.connect(au_con.destination);

            if (typeof applyStoredEqualizer === 'function') {
                applyStoredEqualizer();
            }
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
        eqFilters = [];
    }
}

function getAnalyser() {
    return analyser;
}

function getEqFilters() {
    return eqFilters;
}

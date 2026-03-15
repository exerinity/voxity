let FPS = 60;
let MAX_BINS = 512;
let BAR_SKIP = 1;
let INTENSITY = 1.25;
let viz_color = '#8000ff';
let frame_id = null;
let lastFrame = 0;

function vis_init() {
    const canvas = document.getElementById('visualizer');
    const ctx = canvas.getContext('2d', { alpha: false });
    const modeSel = document.getElementById('viz-mode');
    const analyser = getAnalyser();
    if (!analyser) return;

    analyser.fftSize = 2048;
    analyser.smoothingTimeConstant = 0.7;

    const len = Math.min(analyser.frequencyBinCount, MAX_BINS);
    const freqData = new Uint8Array(len);
    const timeData = new Uint8Array(len);

    const DPR = window.devicePixelRatio || 1;
    let W = canvas.clientWidth;
    let H = canvas.clientHeight;

    function resizeCanvas() {
        W = canvas.clientWidth;
        H = canvas.clientHeight;
        canvas.width  = Math.floor(W * DPR);
        canvas.height = Math.floor(H * DPR);
        ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
        ctx.lineCap  = 'round';
        ctx.lineJoin = 'round';
    }

    resizeCanvas();

    const ro = new ResizeObserver(resizeCanvas);
    ro.observe(canvas);

    if (frame_id) cancelAnimationFrame(frame_id);

    modeSel.addEventListener('change', () => {
        if (modeSel.value === 'none') ctx.clearRect(0, 0, W, H);
    });

    function draw(t) {
        frame_id = requestAnimationFrame(draw);
        if (t - lastFrame < 1000 / FPS) return;
        lastFrame = t;

        const mode = modeSel.value;
        if (mode === 'none') return;

        ctx.clearRect(0, 0, W, H);

        if (mode === 'waveform') {
            analyser.getByteTimeDomainData(timeData);
            ctx.strokeStyle = viz_color;
            ctx.lineWidth = 2;
            ctx.beginPath();
            const step = W / len;
            let x = 0;
            for (let i = 0; i < len; i += BAR_SKIP) {
                const v = (timeData[i] - 128) / 128;
                const y = H / 2 + v * H * 0.45;
                i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
                x += step * BAR_SKIP;
            }
            ctx.stroke();
            return;
        }

        analyser.getByteFrequencyData(freqData);

        if (mode === 'bars' || mode === 'spectrum') {
            const barW = W / (len / BAR_SKIP);
            let x = 0;
            ctx.fillStyle = viz_color;
            for (let i = 0; i < len; i += BAR_SKIP) {
                const v = freqData[i] / 255;
                const h = v * H * INTENSITY;
                ctx.fillRect(x, H - h, barW, h);
                x += barW;
            }
            return;
        }

        if (mode === 'circular') {
            const cx = W / 2;
            const cy = H / 2;
            const baseR = Math.min(W, H) * 0.28;
            ctx.strokeStyle = viz_color;
            ctx.lineWidth = 1.5;
            for (let i = 0; i < len; i += BAR_SKIP) {
                const a = (i / len) * Math.PI * 2;
                const v = freqData[i] / 255;
                const r2 = baseR + v * baseR * 1.2 * INTENSITY;
                const x1 = cx + Math.cos(a) * baseR;
                const y1 = cy + Math.sin(a) * baseR;
                const x2 = cx + Math.cos(a) * r2;
                const y2 = cy + Math.sin(a) * r2;
                ctx.beginPath();
                ctx.moveTo(x1, y1);
                ctx.lineTo(x2, y2);
                ctx.stroke();
            }
        }
    }

    draw(0);
}

try {
    window.addEventListener('fpschange', () => {
        lastFrame = 0;
        if (!frame_id) vis_init();
    });
} catch {}
// configuration (tweak these if you want on the fly)
let FPS = 30;
let MAX_BINS = 256;
let BAR_SKIP = 2;
let INTENSITY = 1;
let viz_color = '#8000ff';

// state
let frame_id = null;
let lastFrame = 0;

let textX = 100;
let textY = 100;
let textVX = 0.4;
let textVY = 0.4;
let textColor = randomColor();

// for the "none" mode
function randomColor() {
    return `hsl(${Math.random() * 360},100%,50%)`;
}

function vis_init() {
    const canvas = document.getElementById('visualizer');
    const ctx = canvas.getContext('2d', { alpha: false });
    const modeSel = document.getElementById('viz-mode');
    const analyser = getAnalyser();
    if (!analyser) return;

    analyser.fftSize = 1024;

    const len = Math.min(analyser.frequencyBinCount, MAX_BINS);
    const freqData = new Uint8Array(len);
    const timeData = new Uint8Array(len);

    const DPR = Math.min(window.devicePixelRatio || 1, 1.5);
    const W = canvas.clientWidth;
    const H = canvas.clientHeight;
    canvas.width = W * DPR * 0.75;
    canvas.height = H * DPR * 0.75;
    ctx.scale(DPR, DPR);

    ctx.font = "bold 20px Inter, sans-serif";
    const TEXT = "voxity";
    const TEXT_W = ctx.measureText(TEXT).width;
    const TEXT_H = 20;

    if (frame_id) cancelAnimationFrame(frame_id);

    function draw(t) {
        frame_id = requestAnimationFrame(draw);
        if (t - lastFrame < 1000 / FPS) return;
        lastFrame = t;

        ctx.clearRect(0, 0, W, H);

        const mode = modeSel.value;

        if (mode === "waveform") {
            analyser.getByteTimeDomainData(timeData);

            ctx.strokeStyle = viz_color;
            ctx.lineWidth = 2;
            ctx.beginPath();

            const step = W / len;
            let x = 0;

            for (let i = 0; i < len; i += BAR_SKIP) {
                const v = timeData[i] / 128.0;
                const y = (v * H) / 2;
                i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
                x += step * BAR_SKIP;
            }

            ctx.stroke();
            return;
        }

        if (mode !== "none" && mode !== "nonefr") {
            analyser.getByteFrequencyData(freqData);
        }

        if (mode === "bars" || mode === "spectrum") {
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

        if (mode === "circular") {
            const cx = W / 2;
            const cy = H / 2;
            const baseR = Math.min(W, H) * 0.25;

            ctx.strokeStyle = viz_color;
            ctx.lineWidth = 2;
            ctx.beginPath();

            for (let i = 0; i < len; i += BAR_SKIP) {
                const a = (i / len) * Math.PI * 2;
                const r = baseR + (freqData[i] / 255) * baseR * 0.8;
                const x = cx + Math.cos(a) * r;
                const y = cy + Math.sin(a) * r;
                i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
            }

            ctx.closePath();
            ctx.stroke();
            return;
        }

        if (mode === "none") {
            textX += textVX;
            textY += textVY;

            if (textX <= 0 || textX + TEXT_W >= W) {
                textVX *= -1;
                textColor = randomColor();
            }
            if (textY <= TEXT_H || textY >= H) {
                textVY *= -1;
                textColor = randomColor();
            }

            ctx.fillStyle = textColor;
            ctx.fillText(TEXT, textX, textY);
        }
    }

    draw(0);
}

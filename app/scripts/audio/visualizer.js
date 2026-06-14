let FPS = 60;
let MAX_BINS = 512;
let BAR_SKIP = 1;
let INTENSITY = 1.25;
let viz_color = '#8000ff';
let frame_id = null;
let lastFrame = 0;
let winampPhase = 0;
let winampX = null;
let winampY = null;
let winampVX = 0;
let winampVY = 0;
let winampPrevBass = 0;
let braviaRings = [];

function vis_init() {
    const canvas = document.getElementById('visualizer');
    const ctx = canvas.getContext('2d', { alpha: true });
    const modeSel = document.getElementById('viz-mode');
    const analyser = getAnalyser();
    if (!analyser) return;

    analyser.fftSize = 256;
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
        if (modeSel.value === 'none') {
            ctx.clearRect(0, 0, W, H);
            if (frame_id) {
                cancelAnimationFrame(frame_id);
                frame_id = null;
            }
        } else if (!frame_id) {
            draw(0);
        }
    });

    function draw(t) {
        const mode = modeSel.value;
        if (mode === 'none') {
            if (frame_id) {
                cancelAnimationFrame(frame_id);
                frame_id = null;
            }
            return;
        }

        frame_id = requestAnimationFrame(draw);
        if (t - lastFrame < 1000 / FPS) return;
        lastFrame = t;

        if (mode === 'winamp') {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.18)';
            ctx.fillRect(0, 0, W, H);
        } else {
            ctx.clearRect(0, 0, W, H);
        }

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

        if (mode === 'super') {
            analyser.getByteTimeDomainData(timeData);

            let bass = 0;
            const bassBins = Math.max(1, Math.floor(len * 0.12));
            for (let i = 0; i < bassBins; i++) bass += freqData[i];
            bass /= bassBins * 255;

            let energy = 0;
            for (let i = 0; i < len; i++) energy += freqData[i];
            energy /= len * 255;

            winampPhase += 0.012 + bass * 0.12;

            const baseR = Math.min(W, H) * 0.14 * (1 + bass * 0.8);

            if (winampX === null) { winampX = W / 2; winampY = H / 2; }

            const impact = bass - winampPrevBass;
            if (impact > 0.12) {
                const ang = Math.random() * Math.PI * 2;
                const power = 5 + bass * 18 + impact * 45;
                winampVX += Math.cos(ang) * power;
                winampVY += Math.sin(ang) * power;
            }
            winampPrevBass = bass;

            winampVX += (Math.random() - 0.5) * 0.9;
            winampVY += (Math.random() - 0.5) * 0.9;

            const maxV = Math.min(W, H) * 0.06;
            const sp = Math.hypot(winampVX, winampVY);
            if (sp > maxV) { winampVX = winampVX / sp * maxV; winampVY = winampVY / sp * maxV; }

            winampX += winampVX;
            winampY += winampVY;
            winampVX *= 0.94;
            winampVY *= 0.94;

            const margin = baseR * 2.2;
            if (winampX < margin) { winampX = margin; winampVX = Math.abs(winampVX); }
            if (winampX > W - margin) { winampX = W - margin; winampVX = -Math.abs(winampVX); }
            if (winampY < margin) { winampY = margin; winampVY = Math.abs(winampVY); }
            if (winampY > H - margin) { winampY = H - margin; winampVY = -Math.abs(winampVY); }

            const cx = winampX;
            const cy = winampY;

            ctx.globalCompositeOperation = 'lighter';
            const layers = 4;
            for (let l = 0; l < layers; l++) {
                const hue = (winampPhase * 40 + l * 90 + energy * 120) % 360;
                ctx.strokeStyle = `hsl(${hue}, 100%, ${55 + bass * 20}%)`;
                ctx.lineWidth = 1.5 + bass * 2;
                ctx.beginPath();
                const rot = winampPhase * (1 + l * 0.6);
                const lobes = 2 + l;
                for (let i = 0; i <= len; i++) {
                    const idx = i % len;
                    const v = (timeData[idx] - 128) / 128;
                    const f = freqData[idx] / 255;
                    const a = (i / len) * Math.PI * 2 * lobes + rot;
                    const r = baseR + v * baseR * 1.6 * INTENSITY + f * baseR * 0.9;
                    const x = cx + Math.cos(a) * r;
                    const y = cy + Math.sin(a) * r;
                    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
                }
                ctx.stroke();
            }
            ctx.globalCompositeOperation = 'source-over';
            return;
        }

        if (mode === 'bravia') {
            let energy = 0;
            for (let i = 0; i < len; i++) energy += freqData[i];
            energy /= len * 255;

            const spawnChance = 0.015 + energy * 0.07;
            if (braviaRings.length < 5 && Math.random() < spawnChance) {
                braviaRings.push({
                    x: Math.random() * W,
                    y: Math.random() * H,
                    r: Math.min(W, H) * (0.02 + Math.random() * 0.05),
                    t: 0,
                });
            }

            const grow = 0.2 + energy * 0.9;
            const fade = 0.0025 + energy * 0.006;
            const gap = Math.min(W, H) * 0.035;

            ctx.strokeStyle = viz_color;
            ctx.lineWidth = 2;
            for (let n = braviaRings.length - 1; n >= 0; n--) {
                const ring = braviaRings[n];
                ring.r += grow;
                ring.t += fade;
                if (ring.t >= 1) { braviaRings.splice(n, 1); continue; }
                const envelope = Math.sin(ring.t * Math.PI);
                for (let k = 0; k < 4; k++) {
                    ctx.globalAlpha = Math.max(0, envelope * (1 - k * 0.2));
                    ctx.beginPath();
                    ctx.arc(ring.x, ring.y, ring.r + k * gap, 0, Math.PI * 2);
                    ctx.stroke();
                }
            }
            ctx.globalAlpha = 1;
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
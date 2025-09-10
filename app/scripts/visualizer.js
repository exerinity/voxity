let intensity = 1;

let viz_z = 100;
let viz_y = 100;
let viz_tx = 0.3;
let viz_ty = 0.3;
let viz_col = viz_ranco();
let viz_color = '#8000ff';

function viz_ranco() {
    return `hsl(${Math.floor(Math.random() * 360)}, 100%, 50%)`;
}


function viz_nt(value) {
    //intensity = value
}

let frame_id = null;

function vis_init() {
    const canv = document.getElementById('visualizer');
    const ctx = canv.getContext('2d');
    const viz_mo = document.getElementById('viz-mode');
    const analyser = getAnalyser();

    if (!analyser) return;

    const len = analyser.frequencyBinCount;
    const data = new Uint8Array(len);

    if (frame_id) {
        cancelAnimationFrame(frame_id);
    }

    function draw() {
        frame_id = requestAnimationFrame(draw);
        analyser.getByteFrequencyData(data);
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, canv.width, canv.height);

        if (viz_mo.value === 'bars') {
            const bw = (canv.width / len) * 2.5;
            let x = 0;
            for (let i = 0; i < len; i++) {
                const bh = data[i] * intensity;
                ctx.fillStyle = viz_color;
                ctx.fillRect(x, canv.height - bh / 2, bw, bh / 2);
                x += bw + 1;
            }

        } else if (viz_mo.value === 'waveform') {
            ctx.beginPath();
            ctx.strokeStyle = viz_color;
            ctx.lineWidth = 2;
            const sliceWidth = canv.width / len;
            let x = 0;
            for (let i = 0; i < len; i++) {
                const v = (data[i] / 128.0) * intensity;
                const y = v * canv.height / 2;
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
                x += sliceWidth;
            }
            ctx.lineTo(canv.width, canv.height / 2);
            ctx.stroke();
        } else if (viz_mo.value === 'circular') {
            const centerX = canv.width / 2;
            const centerY = canv.height / 2;
            const radius = Math.min(canv.width, canv.height) / 4;
            ctx.beginPath();
            ctx.strokeStyle = viz_color;
            ctx.lineWidth = 2;
            for (let i = 0; i < len; i++) {
                const angle = (i / len) * 2 * Math.PI;
                const r = radius + (data[i] / 255) * radius * intensity;
                const x = centerX + r * Math.cos(angle);
                const y = centerY + r * Math.sin(angle);
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.closePath();
            ctx.stroke();
        }
        else if (viz_mo.value === 'spectrum') {
            const bw = canv.width / len;
            let x = 0;
            for (let i = 0; i < len; i++) {
                const bh = (data[i] / 255) * canv.height * intensity;
                ctx.fillStyle = viz_color;
                ctx.fillRect(x, canv.height - bh, bw, bh);
                x += bw;
            }
        } else if (viz_mo.value === 'none') {
            viz_z += viz_tx;
            viz_y += viz_ty;

            ctx.font = "20px 'Chirp', sans-serif";
            ctx.fontWeight = 'bold';
            const text = 'audion';
            const metrics = ctx.measureText(text);
            const textWidth = metrics.width;
            const textHeight = 20;

            if (viz_z <= 0 || viz_z + textWidth >= canv.width) {
                viz_tx *= -1;
                viz_col = viz_ranco();
            }
            if (viz_y <= textHeight || viz_y >= canv.height) {
                viz_ty *= -1;
                viz_col = viz_ranco();
            }

            ctx.save();
            ctx.fillStyle = viz_col;
            ctx.fillText(text, viz_z, viz_y);
            ctx.restore();
        }
        else if (viz_mo.value === 'nonefr') {
            null;
        }
    }
    draw();
}
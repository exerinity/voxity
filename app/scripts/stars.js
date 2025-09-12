const canvas = document.getElementById('bgstars');
const ctx = canvas.getContext('2d');

console.log('stars loaded, canvas:', canvas, 'ctx:', ctx);

const stars = [];

function initialize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    stars.length = 0;
    for (let i = 0; i < 300; i++) {
        const r = Math.random() * 1.5 + 0.5;
        stars.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            radius: r,
            alpha: Math.random() * 0.5 + 0.5,
            dx: (Math.random() - 0.5) * 0.1,
            dy: (Math.random() - 0.5) * 0.05
        });
    }
}

initialize();
window.addEventListener('resize', initialize);

let starsEnabled = true;
try {
    const stored = localStorage.getItem('audion_stars_enabled');
    if (stored === 'false') starsEnabled = false;
} catch {}

let reducedMotion = false;

function draw() {
    for (let star of stars) {
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${star.alpha})`;
        ctx.fill();

        star.alpha += (Math.random() - 0.5) * 0.05;
        if (star.alpha > 1) star.alpha = 1;
        if (star.alpha < 0.2) star.alpha = 0.2;

        star.x += star.dx;
        star.y += star.dy;

        if (star.x - star.radius > canvas.width) {
            star.x = -star.radius;
        } else if (star.x + star.radius < 0) {
            star.x = canvas.width + star.radius;
        }

        if (star.y - star.radius > canvas.height) {
            star.y = -star.radius;
        } else if (star.y + star.radius < 0) {
            star.y = canvas.height + star.radius;
        }
    }
}

const meteors = [];

function create() {
    const side = Math.random();
    let startX, startY, angle;
    if (side < 0.5) {
        startX = 0;
        startY = Math.random() * canvas.height;
        angle = Math.PI / 4 + (Math.random() - 0.5) * (Math.PI / 6);
    } else {
        startX = canvas.width;
        startY = Math.random() * canvas.height;
        angle = Math.PI * 3 / 4 + (Math.random() - 0.5) * (Math.PI / 6);
    }
    const speed = Math.random() * 2 + 1;
    const length = Math.random() * 40 + 40;
    meteors.push({ x: startX, y: startY, angle, speed, length, alpha: 1 });
    console.log('meteor created at', startX, startY, 'angle', angle * 180 / Math.PI);
}

let inter = null;
function cron() {
    if (!starsEnabled || inter !== null) return;
    const delay = Math.random() * 4000 + 1000;
    inter = setTimeout(() => {
        inter = null;
        if (!starsEnabled) return;
        create();
        cron();
    }, delay);
}
function cls() {
    if (inter !== null) {
        clearTimeout(inter);
        inter = null;
    }
}

if (starsEnabled) cron();

function met() {
    for (let i = 0; i < meteors.length; i++) {
        const s = meteors[i];

        ctx.beginPath();
        ctx.moveTo(s.x, s.y);
        const tailX = s.x - s.length * Math.cos(s.angle);
        const tailY = s.y - s.length * Math.sin(s.angle);
        ctx.lineTo(tailX, tailY);
        let gradient = ctx.createLinearGradient(s.x, s.y, tailX, tailY);
        gradient.addColorStop(0, `rgba(255, 255, 255, ${s.alpha})`);
        gradient.addColorStop(1, `rgba(255, 255, 255, 0)`);
        ctx.strokeStyle = gradient;
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(s.x, s.y, 2, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${s.alpha})`;
        ctx.fill();

        s.x += s.speed * Math.cos(s.angle);
        s.y += s.speed * Math.sin(s.angle);

        s.alpha -= 0.01;
        if (s.alpha <= 0 || s.y > canvas.height || s.y < 0 ||
            (s.angle < Math.PI / 2 && s.x > canvas.width + s.length) ||
            (s.angle >= Math.PI / 2 && s.x < -s.length)) {
            meteors.splice(i, 1);
            i--;
        }
    }
}

function shoot(count = 10) {
    console.log('shooting stars!');
    for (let i = 0; i < count; i++) {
        create();
    }
}
window.shoot = shoot;

let rafId = null;

function pause() {
    if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
    }
    cls();
}
function resume() {
    if (!starsEnabled || reducedMotion) return;
    if (rafId === null) {
        rafId = requestAnimationFrame(loop);
    }
    cron();
}

function loop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    draw();
    met();
    rafId = requestAnimationFrame(loop);
    if (Math.random() < 0.01) console.log('loop running, meteors:', meteors.length);
}

if (starsEnabled && !reducedMotion) loop();

document.addEventListener('visibilitychange', function () {
    if (document.hidden) {
        if (starsEnabled) pause();
    } else {
        if (starsEnabled) resume();
    }
});

window.addEventListener('blur', () => { if (starsEnabled) pause(); });
window.addEventListener('focus', () => { if (starsEnabled && !reducedMotion) resume(); });
function applyReducedMotion(flag) {
    reducedMotion = !!flag;
    if (reducedMotion) {
        pause();
    } else if (starsEnabled) {
        resume();
    }
}
window.setReducedMotion = applyReducedMotion;
try {
    const v = localStorage.getItem('reducedMotion');
    if (v === 'true') applyReducedMotion(true);
} catch {}

function dispatchState() {
    try {
        window.dispatchEvent(new CustomEvent('audionStarsChange', { detail: { enabled: starsEnabled } }));
    } catch {}
}

window.AudionStars = {
    enable() {
        if (starsEnabled) return;
        starsEnabled = true;
        try { localStorage.setItem('audion_stars_enabled', 'true'); } catch {}
        initialize();
        if (!reducedMotion) {
            resume();
        }
        dispatchState();
    },
    disable() {
        if (!starsEnabled) return;
        starsEnabled = false;
        try { localStorage.setItem('audion_stars_enabled', 'false'); } catch {}
        pause();
        cls();
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        dispatchState();
    },
    isEnabled() { return starsEnabled; }
};

dispatchState();
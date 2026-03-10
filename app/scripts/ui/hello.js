init();

window.deferredInstallPrompt = null;

window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    window.deferredInstallPrompt = e;
    try {
        if (!isPWA()) {
            const btn = document.getElementById('installpwa');
            if (btn) btn.classList.remove('hidden');
        }
    } catch { }
});

if (typeof localStorage !== 'undefined') {
    const isFirstVisit = !localStorage.getItem('hai');
    if (isFirstVisit) {
        try { localStorage.setItem('hai', '1'); } catch { null }
        setTimeout(() => {
            welcome();
        }, 2500);

        stat_up('<i class="fa-solid fa-tower-broadcast fa-beat bop"></i> Welcome to Voxity!');
    } else {
        stat_up('<i class="fa-solid fa-tower-broadcast fa-beat bop"></i> Welcome back to Voxity!');
    }
}

async function loadFA() {
    const mod = await msg("Attempting to inject Font Awesome manually...");
    window.VoxityRouter?.setModalRoute(mod, '/i/load_fa');
    await new Promise(resolve => setTimeout(resolve, 600));
    const fl = document.createElement('link');
    fl.rel = 'stylesheet';
    fl.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css' + '?cachebuster=' + Date.now();
    fl.crossOrigin = 'anonymous';
    fl.referrerPolicy = 'no-referrer';

    document.head.appendChild(fl);

    fl.onload = () => mod.setContent('<span class="fa-fade">Icons should have loaded <i class="fa-solid fa-font-awesome"></i></span>');
    fl.onerror = () => throw_error("Could not load icons");
}

function welcome() {
    const modalPromise = msg(`<p>Voxity is a web-based audio player that lets you play local audio files directly in your browser. Just drag and drop files to get started!</p>
<p>To learn more, visit Voxity's page on my website: <a href="https://exerinity.dev/projects/voxity" target="_blank" rel="noopener">https://exerinity.dev/projects/voxity</a></p>
<p><a href="https://exerinity.dev/projects/voxity/screenshots" target="_blank" rel="noopener">View some screenshots of Voxity here</a></p>
<p>Thanks, and have fun! <i class="fa-solid fa-broadcast-tower fa-beat bop"></i></p><a href="https://exerinity.com/twitter" target="_blank"><i class="fa-brands fa-twitter" style="color:#1da1f2;"></i> Follow me on Twitter</a> - <a href="https://exerinity.dev/projects" target="_blank"><i class="fa-solid fa-globe"></i> My other projects</a>
<br><small><a href="/i/reload_fa" onclick="event.preventDefault(); loadFA()">I do not see any icons</a></small>
`, "Welcome to Voxity");
    window.VoxityRouter?.setModalRoute(modalPromise, '/i/welcome');
}

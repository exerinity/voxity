async function pwamsg() {
    if (isPWA()) {
        return;
    }

    if (window.deferredInstallPrompt) {
        window.deferredInstallPrompt.prompt();

        const { outcome } = await window.deferredInstallPrompt.userChoice;
        window.deferredInstallPrompt = null;

        if (outcome === "accepted") {
            playUiSound(elements.time_sound)
            throw_error("Thanks for installing Voxity! <i class='fa-solid fa-heart' style='color:red;'></i>", true);
            try { document.getElementById('installpwa')?.classList.add('hidden'); } catch { }
        }
        else {
            throw_error("The request failed, showing how-to", 2);
            const modalPromise = msg(
                `<iframe src="/install.html" style="width:100%; height:400px; border:none; border-radius:8px;"></iframe><br><a href="/install" target="_blank" rel="noopener">Open this in new tab <i class="fa-solid fa-arrow-up-right-from-square"></i></a>`,
                "Install Voxity"
            );
        }
        return;
    }

    msg(
        `<iframe src="/install.html" style="width:100%; height:400px; border:none; border-radius:8px;"></iframe><br><a href="/install" target="_blank" rel="noopener">Open this in new tab <i class="fa-solid fa-arrow-up-right-from-square"></i></a>`,
        "Install Voxity"
    );
}
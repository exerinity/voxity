async function openToysModal() {
    const modal = await msg(`
        <div class="voxity-settings-modal">
            <section class="voxity-settings-section">
                <h3>Compose toast notification</h3>
                <div class="voxity-settings-field">
                    <input type="text" id="toys-toast-text" placeholder="Message..." class="voxity-settings-control" style="width:100%;box-sizing:border-box;">
                </div>
                <div class="pop" style="gap:0.5rem;margin-top:0.5rem;justify-content:center;">
                    <button class="bu" id="toys-toast-success" style="background:#047500;color:white;">Success</button>
                    <button class="bu" id="toys-toast-error" style="background:#da0000;color:white;">Error</button>
                    <button class="bu" id="toys-toast-info" style="background:#0068c8;color:white;">Info</button>
                </div>
            </section>
            <section class="voxity-settings-section">
                <h3>Compose modal</h3>
                <div class="voxity-settings-field">
                    <label for="toys-modal-html">Content (raw HTML)</label>
                    <textarea id="toys-modal-html" rows="4" placeholder="<b>Hello world!</b>" style="width:100%;box-sizing:border-box;resize:vertical;background:var(--dialog-bg);color:var(--fg);border:1px solid var(--btn-bg);border-radius:6px;padding:6px 8px;font-family:monospace;font-size:0.9rem;"></textarea>
                </div>
                <div class="voxity-settings-field">
                    <label for="toys-modal-title">Title <small>(optional)</small></label>
                    <input type="text" id="toys-modal-title" class="voxity-settings-control" style="width:100%;box-sizing:border-box;" placeholder="Voxity">
                </div>
                <div class="voxity-settings-field">
                    <label for="toys-modal-route">Route <small>(optional)</small></label>
                    <input type="text" id="toys-modal-route" class="voxity-settings-control" style="width:100%;box-sizing:border-box;" placeholder="/toys/preview">
                </div>
                <div style="display:flex;gap:1.25rem;margin-top:0.5rem;">
                    <label style="display:flex;align-items:center;gap:0.4em;cursor:pointer;user-select:none;">
                        <input type="checkbox" id="toys-modal-drag" checked> Draggable
                    </label>
                    <label style="display:flex;align-items:center;gap:0.4em;cursor:pointer;user-select:none;">
                        <input type="checkbox" id="toys-modal-close" checked> Closable
                    </label>
                </div>
                <div style="margin-top:0.75rem;">
                    <button class="bu" id="toys-modal-launch" style="background:var(--btn-bg);color:var(--fg);">Launch modal</button>
                </div>
            </section>
        </div>
    `, 'Voxitoys');

    window.VoxityRouter?.setModalRoute(modal, '/i/toys');

    setTimeout(() => {
        const toastText = document.getElementById('toys-toast-text');
        document.getElementById('toys-toast-success')?.addEventListener('click', () => {
            throw_error(toastText?.value, true);
        });
        document.getElementById('toys-toast-error')?.addEventListener('click', () => {
            throw_error(toastText?.value, false);
        });
        document.getElementById('toys-toast-info')?.addEventListener('click', () => {
            throw_error(toastText?.value, 2);
        });

        document.getElementById('toys-modal-launch')?.addEventListener('click', () => {
            const html = document.getElementById('toys-modal-html')?.value || '';
            const title = document.getElementById('toys-modal-title')?.value.trim() || undefined;
            const route = document.getElementById('toys-modal-route')?.value.trim() || '';
            const canDrag = document.getElementById('toys-modal-drag')?.checked ?? true;
            const canClose = document.getElementById('toys-modal-close')?.checked ?? true;
            const launched = msg(html, title, canClose, canDrag);
            if (route) {
                launched.then?.(m => window.VoxityRouter?.setModalRoute(m, route));
            }
        });
    }, 0);
}

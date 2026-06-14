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
                    <label for="toys-modal-html">Content (HTML)</label>
                    <textarea id="toys-modal-html" rows="4" placeholder="<b>Hello world!</b>" style="width:100%;box-sizing:border-box;resize:vertical;background:var(--dialog-bg);color:var(--fg);border:1px solid var(--btn-bg);border-radius:6px;padding:6px 8px;font-family:monospace;font-size:0.9rem;"></textarea>
                </div>
                <div class="voxity-settings-field">
                    <label for="toys-modal-title">Title <small>(optional)</small></label>
                    <input type="text" id="toys-modal-title" class="voxity-settings-control" style="width:100%;box-sizing:border-box;" placeholder="Voxity">
                </div>
                <div style="display:flex;gap:1.25rem;margin-top:0.5rem;">
                    <label style="display:flex;align-items:center;gap:0.4em;cursor:pointer;user-select:none;" title="Modals can be dragged around the screen from their title bar. Try it on this modal! This toggles whether you can do that.">
                        <input type="checkbox" id="toys-modal-drag" checked> Drag?
                    </label>
                    <label style="display:flex;align-items:center;gap:0.4em;cursor:pointer;user-select:none;" title="This toggles whether the modal can be closed: if checked, the close button and click-outside-to-close functionality will be disabled, but you can always still close modals by pressing Escape. (lol)">
                        <input type="checkbox" id="toys-modal-close" checked> Close?
                    </label>
                    <label style="display:flex;align-items:center;gap:0.4em;cursor:pointer;user-select:none;" title="If checked, this modal will exit before launching your modal, for a clear view!">
                        <input type="checkbox" id="toys-modal-close-first"> Close this?
                    </label>
                </div>
                <div style="margin-top:0.75rem;">
                    <button class="bu" id="toys-modal-launch" style="background:var(--btn-bg);color:var(--fg);">Launch modal</button>
                </div>
            </section>
            <small><a href="/i/foundmedia" onclick="event.preventDefault();closeTopModal(); openImageAccentPickerModal()">Open image accent picker</a></small>
        </div>
    `, 'Voxitoys');


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
            const canDrag = document.getElementById('toys-modal-drag')?.checked ?? true;
            const canClose = document.getElementById('toys-modal-close')?.checked ?? true;
            const closeFirst = document.getElementById('toys-modal-close-first')?.checked ?? false;
            if (closeFirst) closeTopModal();
            const launched = msg(html, title, canClose, canDrag);
        });

        document.getElementById('toys-accent-picker')?.addEventListener('click', (e) => {
            e.preventDefault();
            openImageAccentPickerModal();
        });
    }, 0);
}

async function openImageAccentPickerModal() {
    closeTopModal();
    const loadImageEl = (src) => new Promise((resolve, reject) => {
        if (!src) {
            reject(new Error('Missing image source'));
            return;
        }
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = src;
    });

    const readQueuePicture = (file) => new Promise((resolve, reject) => {
        try {
            jsmediatags.read(file, {
                onSuccess: (tag) => {
                    const picture = tag?.tags?.picture;
                    if (!picture || !picture.data) {
                        reject(new Error('No cover'));
                        return;
                    }
                    const arr = new Uint8Array(picture.data);
                    let binary = '';
                    const cs = 8192;
                    for (let i = 0; i < arr.length; i += cs) {
                        binary += String.fromCharCode.apply(null, arr.subarray(i, i + cs));
                    }
                    resolve(`data:${picture.format};base64,${btoa(binary)}`);
                },
                onError: () => reject(new Error('Read failed')),
            });
        } catch (err) {
            reject(err);
        }
    });

    const queueOptions = queue.map((item, idx) => {
        const meta = item.meta || {};
        const label = meta.title
            ? `${act_truncate(meta.title, 16)}${meta.artist ? ` by ${act_truncate(meta.artist, 16)}` : ''}${meta.album ? ` (${act_truncate(meta.album, 16)})` : ''}`
            : act_truncate(item.displayName, 16);
        return `<option value="${idx}">${label}</option>`;
    }).join('');

    const renderSourceInput = (source) => {
        if (source === 'upload') {
            return `<input type="file" id="iap-file" accept="image/*" class="voxity-settings-control" style="width:100%;box-sizing:border-box;">`;
        }
        if (source === 'playing') {
            return `<p class="voxity-settings-small">${metadata.album || metadata.title || "Nothing here"}</p>`;
        }
        if (!queueOptions) {
            return `<p class="voxity-settings-small">The queue is empty</p>`;
        }
        return `<select id="iap-queue" class="voxity-settings-control" style="width:100%;box-sizing:border-box;">${queueOptions}</select>`;
    };

    const modal = await msg(`
        <div class="voxity-settings-modal">
            <section class="voxity-settings-section">
                <div class="voxity-settings-field">
                    <label for="iap-source">Source</label>
                    <select id="iap-source" class="voxity-settings-control" style="width:100%;box-sizing:border-box;">
                        <option value="upload">Upload an image</option>
                        <option value="playing">Currently playing song</option>
                        <option value="queue">A song from the queue</option>
                    </select>
                </div>
                <div class="voxity-settings-field" id="iap-source-input">${renderSourceInput('upload')}</div>
                <div class="voxity-settings-field" id="iap-preview-wrap" style="display:none;">
                    <img id="iap-preview" alt="Image preview" style="display:block;max-width:100%;max-height:200px;margin:0 auto;">
                </div>
                <div style="margin-top:0.5rem;">
                    <button class="bu" id="iap-analyze" style="background:var(--btn-bg);color:var(--fg);">Analyze</button>
                </div>
            </section>
            <section class="voxity-settings-section" id="iap-results-section" style="display:none;">
                <h3>Found colors</h3>
                <div class="voxity-cover-accent-grid" id="iap-results"></div>
            </section>
        </div>
    `, 'Accent finder');

    const sourceSelect = modal.overlay.querySelector('#iap-source');
    const sourceInput = modal.overlay.querySelector('#iap-source-input');
    const previewWrap = modal.overlay.querySelector('#iap-preview-wrap');
    const previewImg = modal.overlay.querySelector('#iap-preview');
    const analyzeBtn = modal.overlay.querySelector('#iap-analyze');
    const resultsSection = modal.overlay.querySelector('#iap-results-section');
    const resultsGrid = modal.overlay.querySelector('#iap-results');

    let previewSrc = '';

    const setPreview = (src) => {
        previewSrc = src || '';
        if (previewSrc) {
            previewImg.src = previewSrc;
            previewWrap.style.display = '';
        } else {
            previewImg.removeAttribute('src');
            previewWrap.style.display = 'none';
        }
    };

    const updateQueuePreview = async () => {
        const sel = modal.overlay.querySelector('#iap-queue');
        const idx = sel ? parseInt(sel.value, 10) : -1;
        const item = queue[idx];
        if (!item) return setPreview('');
        const src = await readQueuePicture(item.file).catch(() => '');
        const stillSel = modal.overlay.querySelector('#iap-queue');
        if (!stillSel || parseInt(stillSel.value, 10) !== idx) return;
        setPreview(src);
    };

    const refreshSourceUi = () => {
        const source = sourceSelect?.value || 'upload';
        sourceInput.innerHTML = renderSourceInput(source);
        setPreview('');
        if (source === 'upload') {
            modal.overlay.querySelector('#iap-file')?.addEventListener('change', (e) => {
                const file = e.target.files?.[0];
                setPreview(file ? URL.createObjectURL(file) : '');
            });
        } else if (source === 'playing') {
            setPreview((typeof globalart !== 'undefined' && globalart) ? globalart : '');
        } else {
            const sel = modal.overlay.querySelector('#iap-queue');
            if (sel) {
                sel.addEventListener('change', updateQueuePreview);
                updateQueuePreview();
            }
        }
    };

    sourceSelect?.addEventListener('change', refreshSourceUi);
    refreshSourceUi();

    const renderResults = (accents) => {
        if (!resultsGrid || !resultsSection) return;
        resultsSection.style.display = '';
        if (!accents.length) {
            resultsGrid.innerHTML = `<p class="voxity-settings-small" style="grid-column:1/-1;">No colors found</p>`;
            return;
        }
        resultsGrid.innerHTML = accents.map(color => `
            <button type="button" class="voxity-cover-accent-swatch" data-color="${color}" style="--swatch-color: ${color};" title="Click to copy" aria-label="Copy ${color}">
                <span>${color}</span>
            </button>
        `).join('');
        resultsGrid.querySelectorAll('.voxity-cover-accent-swatch').forEach(swatch => {
            swatch.addEventListener('click', () => {
                const color = swatch.dataset.color;
                navigator.clipboard.writeText(color).then(() => {
                    throw_error(`Copied ${color}`, 2);
                }).catch(() => {
                    throw_error('Failed to copy - is Voxity allowed to access your clipboard?');
                });
            });
        });
    };

    analyzeBtn?.addEventListener('click', async () => {
        if (!previewSrc) return throw_error('No image to analyze');
        try {
            const image = await loadImageEl(previewSrc);
            renderResults(getAccents(image, { limit: 5 }));
        } catch {
            throw_error('Could not analyze that image');
        }
    });
}

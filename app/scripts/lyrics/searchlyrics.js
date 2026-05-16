// This file does not contain the logic for actually searching lyrics; but instead for the Search lyrics button

// the file for that is source.js

document.getElementById('searchlrclib').addEventListener('click', debounce(async () => {
    if (!navigator.onLine) {
        return throw_error('Go online to use this', 2);
    }
    if (!metadata.title && !metadata.artist) {
        return throw_error('No track playing!');
    }

    let lastResults = null;
    let lastSource = (function () {
        try {
            const v = window.VoxitySettings?.get('lyricsSource');
            return v === 'musixmatch' ? 'musixmatch' : 'lrclib';
        } catch { return 'lrclib'; }
    })();

    const searchFormHtml = () => `<div style="display: flex; flex-direction: column; gap: 0.75rem; margin: 1rem 0; text-align: left;">
            <input id="lrcse" placeholder="${metadata.title}"
                style="padding: 0.75rem; border-radius: 8px; border: 1px solid var(--control-br); background: var(--control-bg); color: var(--fg); font-size: 0.95rem;">
            <select id="lrcse_source" style="padding: 0.5rem 0.75rem; border-radius: 8px; border: 1px solid var(--control-br); background: var(--control-bg); color: var(--fg); font-size: 0.95rem;">
                <option value="lrclib" ${lastSource !== 'musixmatch' ? 'selected' : ''}>LRCLIB</option>
                <option value="musixmatch" ${lastSource === 'musixmatch' ? 'selected' : ''}>Musixmatch</option>
            </select>
            <div style="display:flex; gap:0.5rem; justify-content:flex-end;">
                <button id="lrsea" style="background: #27ae60;">Search</button>
            </div><br>
            <i style="font-size:0.9rem; color:var(--muted-2);">You can leave it blank to search by the current track's title. If you already have LRC lyrics, either drag and drop the .lrc file to the dropzone, or use the <strong><i class="fa-solid fa-paste"></i> Paste lyrics</strong> button</i>
        </div>`;

    const modal = await msg(searchFormHtml(), 'Search for lyrics');
    window.VoxityRouter?.setModalRoute(modal, '/lyrics/search');

    function attachSearchForm(initialQuery) {
        setTimeout(() => {
            const sin = document.getElementById('lrcse');
            const srcSel = document.getElementById('lrcse_source');
            if (sin) sin.value = initialQuery !== undefined ? initialQuery : `${metadata.title || ''} ${metadata.artist || ''}`.trim();
            if (srcSel) srcSel.value = lastSource;
            document.getElementById('lrsea')?.addEventListener('click', async () => {
                const q = (sin?.value || '').trim() || metadata.title;
                lastSource = srcSel?.value || 'lrclib';
                await doSearch(q, lastSource);
            });
        }, 0);
    }

    function showSearchForm() {
        modal.setTitle('Search for lyrics');
        modal.setContent(searchFormHtml());
        attachSearchForm(metadata.title || '');
    }

    async function doSearch(query, source) {
        modal.setTitle('Searching...');
        try {
            let results;
            if (source === 'musixmatch') {
                const params = new URLSearchParams({ title: query, artist: '', album: '' });
                const res = await fetch(`${MUSIXMATCH_PROXY_BASE}/search?${params}`);
                results = await res.json();
                if (!res.ok || !Array.isArray(results) || results.length === 0) {
                    modal.setTitle('Search for lyrics');
                    return throw_error('No results');
                }
            } else {
                const res = await fetch(`https://lrclib.net/api/search?q=${encodeURIComponent(query)}`);
                results = await res.json();
                if (!Array.isArray(results) || results.length === 0) {
                    modal.setTitle('Search for lyrics');
                    return throw_error('No results');
                }
            }
            lastResults = results.slice(0, 10);
            showResults(lastResults, source);
        } catch (e) {
            throw_error(e);
        }
    }

    function showResults(results, source) {
        modal.setTitle('Results');
        const listHtml = results.map(r => {
            if (source === 'musixmatch') {
                return `<p data-lookup-id="${r.lookup_id}" data-type="${r.type}" style="cursor:pointer; margin:0.5rem 0;"><strong>${r.title || ''}</strong> by ${r.artist || ''}</p>`;
            }
            return `<p data-id="${r.id}" style="cursor:pointer; margin:0.5rem 0;"><strong>${r.trackName}</strong> by ${r.artistName} (${r.albumName})</p>`;
        }).join('');
        modal.setContent(`<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.5rem;">
                <button id="back_to_search" style="padding:6px 10px; background:var(--btn-bg); border:none; border-radius:6px; cursor:pointer;">Back</button>
                <span>${results.length} result(s)</span>
            </div>
            <div style="max-height:300px; overflow-y:auto; border:1px solid var(--link); border-radius:8px; padding:0.75rem; background:var(--control-bg);">
                ${listHtml}
            </div>`);
        setTimeout(() => {
            document.getElementById('back_to_search')?.addEventListener('click', () => showSearchForm());
            const selector = source === 'musixmatch' ? '[data-lookup-id]' : '[data-id]';
            document.querySelectorAll(selector).forEach(p => {
                p.addEventListener('click', () => {
                    if (source === 'musixmatch') {
                        loadMusixmatchLyrics(p.dataset.lookupId, p.dataset.type, results);
                    } else {
                        loadLrclibLyrics(p.dataset.id, results);
                    }
                });
            });
        }, 0);
    }

    async function loadLrclibLyrics(id, results) {
        modal.setTitle('Loading...');
        try {
            const res = await fetch(`https://lrclib.net/api/get/${id}`);
            const data = await res.json();
            if (data.syncedLyrics || data.plainLyrics) {
                showLyricsPreview(data, results, 'lrclib');
            } else {
                throw_error('No lyrics found');
                showResults(results, 'lrclib');
            }
        } catch (e) {
            throw_error(e);
        }
    }

    async function loadMusixmatchLyrics(lookupId, type, results) {
        modal.setTitle('Loading...');
        try {
            const params = new URLSearchParams({ lookup_id: lookupId, type });
            const res = await fetch(`${MUSIXMATCH_PROXY_BASE}/lookup?${params}`);
            const data = await res.json();
            if (!res.ok || typeof data?.lyrics !== 'string' || !data.lyrics.trim()) {
                throw_error('No lyrics found');
                showResults(results, 'musixmatch');
                return;
            }
            const wrapped = type === 'Synced' ? { syncedLyrics: data.lyrics } : { plainLyrics: data.lyrics };
            showLyricsPreview(wrapped, results, 'musixmatch');
        } catch (e) {
            throw_error(e);
        }
    }

    function showLyricsPreview(data, results, source) {
        modal.setContent(`<div style="max-height:300px; overflow-y:auto; border:1px solid var(--control-br); border-radius:8px; padding:0.75rem; background:var(--control-bg); color:var(--fg);">
                <pre style="white-space:pre-wrap; color:var(--fg);">${data.syncedLyrics || data.plainLyrics}</pre>
            </div>
            <div style="display:flex; gap:0.5rem; justify-content:flex-end; margin-top:1rem;">
                <button id="insert_lyrics" style="padding:10px 16px; background:#27ae60; color:var(--fg-strong); border:none; border-radius:6px; cursor:pointer;">Insert lyrics</button>
            </div>`);
        modal.setTitle('Preview lyrics');
        setTimeout(() => {
            try {
                const cont = modal.overlay?.querySelector('#msg-content');
                const foot = cont?.querySelector('div[style*="justify-content:flex-end"]');
                if (foot) {
                    const back = document.createElement('button');
                    back.textContent = 'Back';
                    back.style.cssText = 'padding:10px 16px; background:var(--btn-bg); color:var(--fg); border:none; border-radius:6px; cursor:pointer;';
                    foot.prepend(back);
                    back.addEventListener('click', () => showResults(results, source));
                }
            } catch { }
            document.getElementById('insert_lyrics')?.addEventListener('click', () => {
                let parsed = [];
                if (data?.syncedLyrics && typeof data.syncedLyrics === 'string') {
                    parsed = lrc_parse(data.syncedLyrics);
                } else if (data?.plainLyrics && typeof data.plainLyrics === 'string') {
                    parsed = data.plainLyrics.split('\n').map(line => ({ time: 0, text: line }));
                }
                parsed = (parsed || []).filter(l => l && typeof l.text === 'string').sort((a, b) => a.time - b.time);
                if (!parsed || parsed.length === 0) return throw_error('No usable lines found!');
                skipLyricsUpdate = false;
                try { isLyricsLoading = false; } catch { }
                lrc_wipe();
                lrc_data = parsed;
                update_lyrics();
                modal.setTitle('Inserted lyrics');
            });
        }, 0);
    }

    attachSearchForm(undefined);
}));
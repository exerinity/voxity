// This file does not contain the logic for actually searching lyrics; but instead for the Search lyrics button

document.getElementById('searchlrclib').addEventListener('click', debounce(async () => {
    if (!navigator.onLine) {
        return throw_error('Go online to use this');
    }
    if (!metadata.title && !metadata.artist) {
        return throw_error('No track playing!');
    }

    const modal = await msg(`<div style="display: flex; flex-direction: column; gap: 0.75rem; margin: 1rem 0; text-align: left;">
            <input id="lrcse" placeholder="${metadata.title}" 
                style="padding: 0.75rem; border-radius: 8px; border: 1px solid #444; background: #2a2a2a; color: white; font-size: 0.95rem;">
            <div style="display:flex; gap:0.5rem; justify-content:flex-end;">
                <button id="lrsea" style="padding: 10px 16px; background: #27ae60; color: white; border: none; border-radius: 6px; cursor: pointer;">Search</button>
            </div><br>
            <i style="font-size:0.9rem; color:#888;">You can leave it blank to search by the current track's title. If you already have LRC lyrics, either drag and drop the .lrc file to the dropzone, or use the <strong><i class="fa-solid fa-paste"></i> Paste lyrics</strong> button</i>
        </div>
    `, 'Search for lyrics');
    window.VoxityRouter?.setModalRoute(modal, '/lyrics/search');

    setTimeout(() => {
        const sin = document.getElementById('lrcse');
        sin.value = `${metadata.title || ''} ${metadata.artist || ''}`.trim() || '';
        const sbt = document.getElementById('lrsea');

        if (sbt) {
            sbt.addEventListener('click', async () => {
                let query = sin.value.trim();
                if (!query) {
                    query = metadata.title;
                }

                try {
                    modal.setTitle('Searching...');
                    const response = await fetch(`https://lrclib.net/api/search?q=${encodeURIComponent(query)}`);
                    const results = await response.json();

                    if (results.length === 0) {
                        modal.setTitle('Search for lyrics');
                        return throw_error('No results');
                    }

                    modal.setContent(`<div style="max-height: 300px; overflow-y: auto; border: 1px solid #444; border-radius: 8px; padding: 0.75rem; background: #2a2a2a; color: white;">
                            ${results.slice(0, 10).map((result, index) => `
                                <p data-id="${result.id}" style="cursor: pointer; margin: 0.5rem 0;">
                                    <strong>${result.trackName}</strong> by ${result.artistName} (${result.albumName})
                                </p>
                            `).join('')}
                        </div>
                    `);
                    modal.setTitle('Results');
                    try { lastResults = results.slice(0, 10); } catch { lastResults = null; }
                    try {
                        modal.setContent(`<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 0.5rem;">
                                <button id="back_to_search" style="padding: 6px 10px; background: #333; color: white; border: none; border-radius: 6px; cursor: pointer;">Back</button>
                                <span style="color:#aaa; font-size:0.9rem;">${(lastResults || []).length} result(s)</span>
                            </div>
                            <div style="max-height: 300px; overflow-y: auto; border: 1px solid #444; border-radius: 8px; padding: 0.75rem; background: #2a2a2a; color: white;">
                                ${(lastResults || results || []).slice(0, 10).map((result) => `
                                    <p data-id="${result.id}" style="cursor: pointer; margin: 0.5rem 0;">
                                        <strong>${result.trackName}</strong> by ${result.artistName} (${result.albumName})
                                    </p>
                                `).join('')}
                            </div>
                        `);
                    } catch { }

                    setTimeout(() => {
                        document.getElementById('back_to_search')?.addEventListener('click', () => {
                            modal.setTitle('Search for lyrics');
                            modal.setContent(`
                                <div style="display: flex; flex-direction: column; gap: 0.75rem; margin: 1rem 0; text-align: left;">
                                    <input id="lrcse" placeholder="${metadata.title}" 
                                        style="width: 100%; padding: 0.75rem; border-radius: 8px; border: 1px solid #444; background: #2a2a2a; color: white; font-size: 0.95rem;">
                                    <div style="display:flex; gap:0.5rem; justify-content:flex-end;">
                                        <button id="lrsea" style="padding: 10px 16px; background: #27ae60; color: white; border: none; border-radius: 6px; cursor: pointer;">Search</button>
                                    </div><br>
                                    <i style="font-size:0.9rem; color:#888;">You can leave it blank to search by the current track's title. If you already have LRC lyrics, either drag and drop the .lrc file to the dropzone, or use the <strong><i class="fa-solid fa-paste"></i> Paste lyrics</strong> button</i>
                                </div>
                            `);
                            setTimeout(() => {
                                const sin2 = document.getElementById('lrcse');
                                if (sin2) sin2.value = metadata.title || '';
                                document.getElementById('lrsea')?.addEventListener('click', async () => {
                                    let query2 = (sin2?.value || '').trim();
                                    if (!query2) query2 = metadata.title;
                                    try {
                                        modal.setTitle('Searching...');
                                        const response2 = await fetch(`https://lrclib.net/api/search?q=${encodeURIComponent(query2)}`);
                                        const results2 = await response2.json();
                                        if (!Array.isArray(results2) || results2.length === 0) {
                                            modal.setTitle('No results');
                                            return;
                                        }
                                        try { lastResults = results2.slice(0, 10); } catch { }
                                        modal.setTitle('Results');
                                        modal.setContent(`<div style=\"display:flex; justify-content:space-between; align-items:center; margin-bottom: 0.5rem;\">\n                                                <button id=\"back_to_search\" style=\"padding: 6px 10px; background: #333; color: white; border: none; border-radius: 6px; cursor: pointer;\">Back</button>\n                                                <span style=\"color:#aaa; font-size:0.9rem;\">${(lastResults || []).length} result(s)</span>\n                                            </div>\n                                            <div style=\"max-height: 300px; overflow-y: auto; border: 1px solid #444; border-radius: 8px; padding: 0.75rem; background: #2a2a2a; color: white;\">\n                                                ${(lastResults || []).map((result) => `\n                                                    <p data-id=\"${result.id}\" style=\"cursor: pointer; margin: 0.5rem 0;\">\n                                                        <strong>${result.trackName}</strong> by ${result.artistName} (${result.albumName})\n                                                    </p>\n                                                `).join('')}\n                                            </div>`);
                                    } catch (e) { throw_error(e); }
                                });
                            }, 0);
                        });
                        document.querySelectorAll('[data-id]').forEach(p => {
                            p.addEventListener('click', async () => {
                                const id = p.dataset.id;
                                try {
                                    modal.setTitle('Loading...');
                                    const flrs = await fetch(`https://lrclib.net/api/get/${id}`);
                                    const flcd = await flrs.json();

                                    if (flcd.syncedLyrics || flcd.plainLyrics) {
                                        modal.setContent(`<div style="max-height: 300px; overflow-y: auto; border: 1px solid #444; border-radius: 8px; padding: 0.75rem; background: #2a2a2a; color: white;">
                                                <pre style="white-space: pre-wrap; color: white;">${flcd.syncedLyrics || flcd.plainLyrics}</pre>
                                            </div>
                                            <div style="display:flex; gap:0.5rem; justify-content:flex-end; margin-top: 1rem;">
                                                <button id="insert_lyrics" style="padding: 10px 16px; background: #27ae60; color: white; border: none; border-radius: 6px; cursor: pointer;">Insert lyrics</button>
                                            </div>
                                        `);
                                        modal.setTitle('Preview lyrics');

                                        setTimeout(() => {
                                            try {
                                                const cont = modal.overlay?.querySelector('#msg-content');
                                                const foot = cont?.querySelector('div[style*="justify-content:flex-end"]');
                                                if (foot) {
                                                    const back = document.createElement('button');
                                                    back.id = 'back_to_results';
                                                    back.textContent = 'Back';
                                                    back.style.padding = '10px 16px';
                                                    back.style.background = '#333';
                                                    back.style.color = 'white';
                                                    back.style.border = 'none';
                                                    back.style.borderRadius = '6px';
                                                    back.style.cursor = 'pointer';
                                                    foot.prepend(back);
                                                    back.addEventListener('click', () => {
                                                        modal.setTitle('Results');
                                                        const listHtml = (lastResults || []).map((r) => `
                                                            <p data-id="${r.id}" style="cursor: pointer; margin: 0.5rem 0;">
                                                                <strong>${r.trackName}</strong> by ${r.artistName} (${r.albumName})
                                                            </p>
                                                        `).join('');
                                                        modal.setContent(`<div style=\"display:flex; justify-content:space-between; align-items:center; margin-bottom: 0.5rem;\">\n                                                                <button id=\"back_to_search\" style=\"padding: 6px 10px; background: #333; color: white; border: none; border-radius: 6px; cursor: pointer;\">Back</button>\n                                                                <span style=\"color:#aaa; font-size:0.9rem;\">${(lastResults || []).length} result(s)</span>\n                                                            </div>\n                                                            <div style=\"max-height: 300px; overflow-y: auto; border: 1px solid #444; border-radius: 8px; padding: 0.75rem; background: #2a2a2a; color: white;\">\n                                                                ${listHtml}\n                                                            </div>`);
                                                        setTimeout(() => {
                                                            document.getElementById('back_to_search')?.addEventListener('click', () => {
                                                                modal.setTitle('Search for lyrics');
                                                                modal.setContent(`
                                                                    <div style="display: flex; flex-direction: column; gap: 0.75rem; margin: 1rem 0; text-align: left;">
                                                                        <input id="lrcse" placeholder="${metadata.title}" 
                                                                            style="width: 100%; padding: 0.75rem; border-radius: 8px; border: 1px solid #444; background: #2a2a2a; color: white; font-size: 0.95rem;">
                                                                        <div style="display:flex; gap:0.5rem; justify-content:flex-end;">
                                                                            <button id="lrsea" style="padding: 10px 16px; background: #27ae60; color: white; border: none; border-radius: 6px; cursor: pointer;">Search</button>
                                                                        </div><br>
                                                                        <i style="font-size:0.9rem; color:#888;">You can leave it blank to search by the current track's title. If you already have LRC lyrics, either drag and drop the .lrc file to the dropzone, or use the <strong><i class="fa-solid fa-paste"></i> Paste lyrics</strong> button</i>
                                                                    </div>
                                                                `);
                                                                setTimeout(() => {
                                                                    const sin2 = document.getElementById('lrcse');
                                                                    if (sin2) sin2.value = metadata.title || '';
                                                                    document.getElementById('lrsea')?.addEventListener('click', async () => {
                                                                        let query2 = (sin2?.value || '').trim();
                                                                        if (!query2) query2 = metadata.title;
                                                                        try {
                                                                            modal.setTitle('Searching...');
                                                                            const response2 = await fetch(`https://lrclib.net/api/search?q=${encodeURIComponent(query2)}`);
                                                                            const results2 = await response2.json();
                                                                            if (!Array.isArray(results2) || results2.length === 0) {
                                                                                modal.setTitle('No results');
                                                                                return;
                                                                            }
                                                                            try { lastResults = results2.slice(0, 10); } catch { }
                                                                            modal.setTitle('Results');
                                                                            modal.setContent(`<div style=\"display:flex; justify-content:space-between; align-items:center; margin-bottom: 0.5rem;\">\n                                                                                        <button id=\"back_to_search\" style=\"padding: 6px 10px; background: #333; color: white; border: none; border-radius: 6px; cursor: pointer;\">Back</button>\n                                                                                        <span style=\"color:#aaa; font-size:0.9rem;\">${(lastResults || []).length} result(s)</span>\n                                                                                    </div>\n                                                                                    <div style=\"max-height: 300px; overflow-y: auto; border: 1px solid #444; border-radius: 8px; padding: 0.75rem; background: #2a2a2a; color: white;\">\n                                                                                        ${(lastResults || []).map((result) => `\n                                                                                            <p data-id=\"${result.id}\" style=\"cursor: pointer; margin: 0.5rem 0;\">\n                                                                                                <strong>${result.trackName}</strong> by ${result.artistName} (${result.albumName})\n                                                                                            </p>\n                                                                                        `).join('')}\n                                                                                    </div>`);
                                                                        } catch (e) { throw_error(e); }
                                                                    });
                                                                }, 0);
                                                            });

                                                            document.querySelectorAll('[data-id]').forEach(p => {
                                                                p.addEventListener('click', async () => {
                                                                    const id = p.dataset.id;
                                                                    try {
                                                                        modal.setTitle('Loading...');
                                                                        const flrs = await fetch(`https://lrclib.net/api/get/${id}`);
                                                                        const flcd = await flrs.json();

                                                                        if (flcd.syncedLyrics || flcd.plainLyrics) {
                                                                            modal.setContent(`<div style="max-height: 300px; overflow-y: auto; border: 1px solid #444; border-radius: 8px; padding: 0.75rem; background: #2a2a2a; color: white;">
                                                                                        <pre style="white-space: pre-wrap; color: white;">${flcd.syncedLyrics || flcd.plainLyrics}</pre>
                                                                                    </div>
                                                                                    <div style="display:flex; gap:0.5rem; justify-content:flex-end; margin-top: 1rem;">
                                                                                        <button id="insert_lyrics" style="padding: 10px 16px; background: #27ae60; color: white; border: none; border-radius: 6px; cursor: pointer;">Insert lyrics</button>
                                                                                    </div>
                                                                                `);
                                                                            modal.setTitle('Preview lyrics');

                                                                            setTimeout(() => {
                                                                                try {
                                                                                    const cont = modal.overlay?.querySelector('#msg-content');
                                                                                    const foot = cont?.querySelector('div[style*="justify-content:flex-end"]');
                                                                                    if (foot) {
                                                                                        const back2 = document.createElement('button');
                                                                                        back2.id = 'back_to_results';
                                                                                        back2.textContent = 'Back';
                                                                                        back2.style.padding = '10px 16px';
                                                                                        back2.style.background = '#333';
                                                                                        back2.style.color = 'white';
                                                                                        back2.style.border = 'none';
                                                                                        back2.style.borderRadius = '6px';
                                                                                        back2.style.cursor = 'pointer';
                                                                                        foot.prepend(back2);
                                                                                        back2.addEventListener('click', () => {
                                                                                            back.click();
                                                                                        });
                                                                                    }
                                                                                } catch { }
                                                                                const insb2 = document.getElementById('insert_lyrics');
                                                                                if (insb2) {
                                                                                    insb2.addEventListener('click', () => {
                                                                                        let parsed = [];
                                                                                        if (flcd?.syncedLyrics && typeof flcd.syncedLyrics === 'string') {
                                                                                            parsed = lrc_parse(flcd.syncedLyrics);
                                                                                        } else if (flcd?.plainLyrics && typeof flcd.plainLyrics === 'string') {
                                                                                            parsed = flcd.plainLyrics.split('\n').map(line => ({ time: 0, text: line }));
                                                                                        }
                                                                                        parsed = (parsed || []).filter(l => l && typeof l.text === 'string').sort((a, b) => a.time - b.time);
                                                                                        if (!parsed || parsed.length === 0) {
                                                                                            return throw_error('No usable lines found!');
                                                                                        }
                                                                                        skipLyricsUpdate = false;
                                                                                        try { isLyricsLoading = false; } catch { }
                                                                                        lrc_wipe();
                                                                                        lrc_data = parsed;
                                                                                        update_lyrics();
                                                                                        modal.setTitle('Inserted lyrics');
                                                                                    });
                                                                                }
                                                                            }, 0);
                                                                        } else {
                                                                            throw_error('No lyrics found');
                                                                            modal.setTitle('Results');
                                                                        }
                                                                    } catch (e) {
                                                                        throw_error(e);
                                                                    }
                                                                });
                                                            });
                                                        }, 0);
                                                    });
                                                }
                                            } catch { }
                                            const insbA = document.getElementById('insert_lyrics');
                                            if (insbA) {
                                                insbA.addEventListener('click', () => {
                                                    let parsed = [];
                                                    if (flcd?.syncedLyrics && typeof flcd.syncedLyrics === 'string') {
                                                        parsed = lrc_parse(flcd.syncedLyrics);
                                                    } else if (flcd?.plainLyrics && typeof flcd.plainLyrics === 'string') {
                                                        parsed = flcd.plainLyrics.split('\n').map(line => ({ time: 0, text: line }));
                                                    }
                                                    parsed = (parsed || []).filter(l => l && typeof l.text === 'string').sort((a, b) => a.time - b.time);
                                                    if (!parsed || parsed.length === 0) {
                                                        return throw_error('No usable lines found!');
                                                    }
                                                    skipLyricsUpdate = false;
                                                    try { isLyricsLoading = false; } catch { }
                                                    lrc_wipe();
                                                    lrc_data = parsed;
                                                    update_lyrics();
                                                    modal.setTitle('Inserted lyrics');
                                                });
                                            }
                                        }, 0);
                                    } else {
                                        throw_error('No lyrics found');
                                        modal.setTitle('Results');
                                    }
                                } catch (e) {
                                    throw_error(e);
                                }
                            });
                        });
                    }, 0);
                } catch (e) {
                    throw_error(e);
                }
            });
        }
    }, 0);
}));

function changelogmsg() {
    msg(`<iframe src="/i/release_notes.html" style="width:100%; height:400px; border:none; border-radius:8px;"></iframe><hr>Voxity is ${uptodate === false ? '<strong style="color:orange;">out of date</strong>! Please <a href="#" onclick="window.location.hrefwindow.location.href.split(\'?\')[0]+\'?cachebuster=\'+Date.now();return false;">refresh to update</a>.' : '<strong style="color:green;">up to date!</strong><br><a href="/i/release_notes?standalone" target="_blank">Open this in new tab</a>'}`, 'Release notes');
}
async function pwamsg() {
    if (isPWA()) {
        return;
    }

    if (window.deferredInstallPrompt) {
        window.deferredInstallPrompt.prompt();

        const { outcome } = await window.deferredInstallPrompt.userChoice;
        window.deferredInstallPrompt = null;

        if (outcome === "accepted") {
            throw_error("Thanks for installing Voxity!", true);
        } 
        return;
    }

    msg(
        `<iframe src="/i/how_pwa.html" style="width:100%; height:400px; border:none; border-radius:8px;"></iframe><br><a href="/i/how_pwa" target="_blank" rel="noopener">Open this in new tab</a>`,
        "Install Voxity"
    );
}


document.getElementById('plps').addEventListener('click', debounce(() => {
    if (!metadata.title && !metadata.artist) {
        return throw_error('No track playing!');
    }
    if (elements.player.paused) {
        elements.player.play();
        document.getElementById('plps').innerHTML = '<i class="fa-solid fa-pause"></i>';
        stat_up('<i class="fa-solid fa-circle-play"></i> Resumed playback');
        if ('mediaSession' in navigator) {
            try { navigator.mediaSession.playbackState = 'playing'; } catch { }
        }
    } else {
        elements.player.pause();
        document.getElementById('plps').innerHTML = '<i class="fa-solid fa-play"></i>';
        stat_up('<i class="fa-solid fa-circle-pause"></i> Paused playback');
        if ('mediaSession' in navigator) {
            try { navigator.mediaSession.playbackState = 'paused'; } catch { }
        }
    }
}));

document.getElementById('rwd').addEventListener('click', debounce(() => {
    if (!elements.player.currentTime) return throw_error('No track playing!');
    const dur = elements.player.duration || 0;
    const t = Math.max(0, (elements.player.currentTime || 0) - 10);
    elements.player.currentTime = t;
    elements.index.value = t;
    stat_up(`<i class="fa-solid fa-music"></i> Scrubbing to: ${form_time(t)} / ${form_time(dur)}`);
}));

document.getElementById('branding').addEventListener('click', debounce(() => {
    return msg(about_content, "About Voxity");
}));

document.getElementById('queuehead').addEventListener('click', debounce(() => {
    calqueue();
}));

document.getElementById('fwd').addEventListener('click', debounce(() => {
    if (!elements.player.currentTime) return throw_error('No track playing!');
    const dur = elements.player.duration || 0;
    const t = Math.min(dur, (elements.player.currentTime || 0) + 10);
    elements.player.currentTime = t;
    elements.index.value = t;
    stat_up(`<i class="fa-solid fa-music"></i> Scrubbing to: <strong>${form_time(t)}</strong> / <strong>${form_time(dur)}</strong>`);
}));

document.getElementById('stop').addEventListener('click', debounce(() => {
    restr();
}));

function restr() {
    if (!elements.player.currentTime) return throw_error('No track playing!');
    elements.player.currentTime = 0;
    elements.index.value = 0;
    stat_up('<i class="fa-solid fa-arrow-rotate-left"></i> Restarted the track');
}

document.getElementById('hotkeys').addEventListener('click', debounce(() => {
    msg(hotkeys_content, 'List of hotkeys');
}));


document.getElementById('cover-art').addEventListener('click', debounce(() => {
    if (!globalart) return;

    msg(
        `<img src="${globalart}" title="Click to open full image in a new tab" alt="Cover art" style="max-width: 100%; height: auto; border-radius: 8px; cursor: pointer;" id="msgart">`,
        act_truncate(metadata.album || metadata.title || "Cover art")
    );

    setTimeout(() => {
        const img = document.getElementById('msgart');
        if (!img) return;

        img.onclick = () => {
            let blobUrl = globalart;

            if (globalart.startsWith('data:')) {
                const res = globalart.split(',');
                const mime = res[0].match(/:(.*?);/)[1];
                const bstr = atob(res[1]);
                let n = bstr.length;
                const u8arr = new Uint8Array(n);
                while (n--) u8arr[n] = bstr.charCodeAt(n);
                const blob = new Blob([u8arr], { type: mime });
                blobUrl = URL.createObjectURL(blob);
            }

            const name = encodeURIComponent(metadata.title || metadata.album || 'Voxity art viewer');
            window.open(`/i/imageview.html?img=${encodeURIComponent(blobUrl)}&name=${name}`, '_blank');
        };
    }, 0);
}));

window.addEventListener('DOMContentLoaded', () => {
    (function settingsModal() {
        const THEMES = [
            { 'dim': true, 'label': 'Dim' },
            { 'lights-out': true, 'label': 'Lights out' },
            { 'high-contrast': true, 'label': 'High contrast' },
            { 'red': true, 'label': 'Red' },
            { 'blue': true, 'label': 'Blue' },
            { 'green': true, 'label': 'Green' },
            { 'light': true, 'label': 'Light' },
            { 'synthwave': true, 'label': 'Synthwave' },
            { 'neon-purple': true, 'label': 'Neon purple' },
            { 'neon-blue': true, 'label': 'Neon blue' }
        ];

        const VIZ_OPTIONS = [
            { v: 'waveform', l: 'Waveform' },
            { v: 'spectrum', l: 'Spectrum' },
            { v: 'bars', l: 'Bars' },
            { v: 'circular', l: 'Circular' },
            { v: 'none', l: 'None (off)' },
            { v: 'nonefr', l: 'Actually none' },
        ];
        const PREFERENCE_TOGGLES = [
            {
                key: 'soundEffects',
                label: 'Enable sound effects',
                description: 'For loading the app, error messages, and finished notifications',
            },
            {
                key: 'titleRotation',
                label: 'Enable title rotation',
                description: 'Rotate the tab title with current song metadata',
            },
            {
                key: 'autoLyrics',
                label: 'Load lyrics automatically',
                description: 'Automatically query LRCLIB when a track starts',
            },
            {
                key: 'songNotifications',
                label: 'System song notifications',
                description: 'Send a desktop notification when a new track begins playing',
                requiresPermission: 'notification',
            },
        ];
        const key = 'au_theme';
        const btn = document.getElementById('settings');
        let currentTheme = 'lights-out';

        const getThemeName = (themeObj) => Object.keys(themeObj).find(key => key !== 'label') || '';
        const getThemeLabel = (themeName) => {
            const found = THEMES.find(themeObj => getThemeName(themeObj) === themeName);
            return found?.label || themeName.replace(/-/g, ' ');
        };

        function apply(theme) {
            document.documentElement.setAttribute('data-theme', theme);
            try {
                localStorage.setItem(key, theme);
            } catch { }
            currentTheme = theme;
        }

        function updateSettingsTooltip(theme) {
            if (!btn) return;
            const label = getThemeLabel(theme);
            btn.title = `Open settings (theme: ${label})`;
        }

        function openSettingsModal({ focusViz = false } = {}) {
            const current = document.documentElement.getAttribute('data-theme') || currentTheme;
            const currentViz = (document.getElementById('viz-mode')?.value) || 'waveform';
            const accentValue = (document.documentElement.style.getPropertyValue('--lyric-color') || '#8000ff').trim() || '#8000ff';
            const fpsValue = (function () {
                try {
                    const stored = parseInt(localStorage.getItem('au_fps'));
                    if (!isNaN(stored) && stored >= 1 && stored <= 300) return stored;
                } catch (e) { }
                try {
                    if (typeof FPS !== 'undefined' && Number(FPS)) return Number(FPS);
                } catch (e) { }
                return 60;
            })();
            const lrcValue = (function () {
                try {
                    const stored = parseInt(localStorage.getItem('au_lrc_amount'));
                    if (!isNaN(stored) && stored >= 1 && stored <= 48) return stored;
                } catch (e) { }
                try {
                    if (typeof lrc_amount !== 'undefined' && Number(lrc_amount)) return Number(lrc_amount);
                } catch (e) { }
                return 16;
            })();
            const preferenceSection = typeof window.VoxitySettings === 'undefined' ? '' : `
                    <div style="margin-top: 1.5rem;">
                        <div style="display:flex;flex-direction:column;gap:0.75rem;">
                            ${PREFERENCE_TOGGLES.map(toggle => {
                const checked = window.VoxitySettings.isEnabled(toggle.key) ? 'checked' : '';
                return `<div style="display:flex;gap:0.75rem;align-items:flex-start;">
                                            <input type="checkbox" id="pref_${toggle.key}" ${checked} style="margin-top:0.3rem;accent-color:var(--lyric-color,#8000ff);">
                                            <div>
                                                <label for="pref_${toggle.key}" style="font-weight:600;cursor:pointer;">${toggle.label}</label>
                                                <p style="margin:0.2rem 0 0;font-size:0.9rem;color:#aaa;">${toggle.description}</p>
                                            </div>
                                        </div>`;
            }).join('')}
                        </div>
                    </div>`;
            msg(`<div style="margin: 1rem 0;">
                        <label for="theme_select" style="display:block;margin-bottom:0.4rem;color:#bbb;">Theme</label>
                        <select id="theme_select" style="width: 100%; padding: 0.5rem; border-radius: 6px; border: 1px solid #444; background: #2a2a2a; color: white;">
                            ${THEMES.map(t => {
                const themeName = getThemeName(t);
                if (!themeName) return '';
                const label = t.label;
                const selected = current === themeName ? 'selected' : '';
                return `<option value="${themeName}" ${selected}>${label}</option>`;
            }).join('')}
                        </select>
                    </div>
                    <div>
                        <label for="accent_color"  style="display:block;margin-bottom:0.4rem;color:#bbb;">Accent color</label>
                        <input id="accent_color" type="color" value="${accentValue}" style="width: 100%; height: 50px; border: none; cursor: pointer; background: none;">
                    </div>
                    <div style="margin-top: 1.5rem;">
                        <label for="fps_slider" style="display:block;margin-bottom:0.4rem;color:#bbb;">Visualizer FPS</label>
                        <div style="display:flex;gap:0.5rem;align-items:center;">
                            <input id="fps_slider" type="range" min="1" max="300" value="${fpsValue}" style="flex: 1;">
                            <input id="fps_number" type="number" min="1" max="300" value="${fpsValue}" style="width:72px; padding:0.35rem; border-radius:6px; border:1px solid #444; background:#2a2a2a; color:white;">
                        </div>
                        <small style="color:#888;">1-300</small>
                    </div>
                    <div style="margin-top: 1.5rem;">
                        <label for="lrc_slider" style="display:block;margin-bottom:0.4rem;color:#bbb;">Lyrics amount</label>
                        <div style="display:flex;gap:0.5rem;align-items:center;">
                            <input id="lrc_slider" type="range" min="1" max="48" value="${lrcValue}" style="flex: 1;">
                            <input id="lrc_number" type="number" min="1" max="48" value="${lrcValue}" style="width:72px; padding:0.35rem; border-radius:6px; border:1px solid #444; background:#2a2a2a; color:white;">
                        </div>
                        <small style="color:#888;">Number of lyrics lines shown (1-48)</small>
                    </div>
                    <div style="margin-top: 1.5rem;">
                        <label for="vizmode_select" style="display:block;margin-bottom:0.4rem;color:#bbb;">Visualizer mode</label>
                        <select id="vizmode_select" style="width:100%; padding:0.5rem; border-radius:6px; border:1px solid #444; background:#2a2a2a; color:white;">
                            ${VIZ_OPTIONS.map(o => `<option value="${o.v}" ${o.v === currentViz ? 'selected' : ''}>${o.l}</option>`).join('')}
                        </select>
                        <p style="font-size:0.9rem; color:#888; margin:0.5rem 0 0;">Tip: click the visualizer to open this</p>
                    </div>
                    ${preferenceSection}
                    <br><small><a href="/i/reload_fa" onclick="event.preventDefault(); loadFA()">If you do not see any icons, click here</a></small>
                `, 'Voxity settings');

            setTimeout(() => {
                const select = document.getElementById('theme_select');
                const acin = document.getElementById('accent_color');
                const vizSelect = document.getElementById('vizmode_select');
                const hiddenViz = document.getElementById('viz-mode');
                const fpsSlider = document.getElementById('fps_slider');
                const fpsNumber = document.getElementById('fps_number');
                const lrcSlider = document.getElementById('lrc_slider');
                const lrcNumber = document.getElementById('lrc_number');
                const settingsApi = typeof window.VoxitySettings !== 'undefined' ? window.VoxitySettings : null;

                const requestNotificationPermission = async () => {
                    if (typeof window === 'undefined' || typeof Notification === 'undefined') {
                        throw_error('This browser does not seem to support notifications');
                        return false;
                    }
                    if (Notification.permission === 'granted') {
                        return true;
                    }
                    if (Notification.permission === 'denied') {
                        throw_error('You blocked notifications!');
                        return false;
                    }
                    try {
                        const result = await Notification.requestPermission();
                        if (result !== 'granted') {
                            throw_error('You disallowed notifications!', false);
                        }
                        return result === 'granted';
                    } catch {
                        throw_error('Something failed enabling notifications, why not try again?');
                        return false;
                    }
                };

                if (select) {
                    if (!focusViz) {
                        select.focus();
                    }
                    select.addEventListener('change', () => {
                        const next = select.value;
                        apply(next);
                        updateSettingsTooltip(next);
                    });
                }

                if (acin) {
                    acin.addEventListener('input', () => {
                        const color = acin.value;
                        document.documentElement.style.setProperty('--lyric-color', color);
                        viz_color = color;
                        uvzc(color);
                        stat_up(`<span style='color: ${color};'><i class='fa-solid fa-palette'></i> Accent color set to ${color}</span>`);
                    });
                }

                if (vizSelect) {
                    if (focusViz || !select) {
                        vizSelect.focus();
                    }
                    const applyChange = () => {
                        if (!hiddenViz) return;
                        hiddenViz.value = vizSelect.value;
                        hiddenViz.dispatchEvent(new Event('change', { bubbles: true }));
                        throw_error(`Visualizer: ${vizSelect.options[vizSelect.selectedIndex]?.text || vizSelect.value}`, true);
                    };
                    vizSelect.addEventListener('change', applyChange);
                }

                if (fpsSlider && fpsNumber) {
                    const syncFPS = (v) => {
                        const num = parseInt(v, 10);
                        const val = (isNaN(num) ? 60 : Math.max(1, Math.min(300, num)));
                        try { fpsSlider.value = val; } catch { }
                        try { fpsNumber.value = val; } catch { }
                        try { FPS = val; } catch { }
                        try { localStorage.setItem('au_fps', String(val)); } catch { }
                        try {
                            const ev = new Event('fpschange', { bubbles: true });
                            window.dispatchEvent(ev);
                        } catch { }
                        try { stat_up(`<i class="fa-solid fa-chart-simple"></i> Visualizer FPS: <strong>${val}</strong>`); } catch { }
                    };

                    fpsSlider.addEventListener('input', () => syncFPS(fpsSlider.value));
                    fpsNumber.addEventListener('change', () => syncFPS(fpsNumber.value));
                }

                if (lrcSlider && lrcNumber) {
                    const syncLRC = (v) => {
                        const num = parseInt(v, 10);
                        const val = (isNaN(num) ? 16 : Math.max(1, Math.min(48, num)));
                        try { lrcSlider.value = val; } catch { }
                        try { lrcNumber.value = val; } catch { }
                        try { lrc_amount = val; } catch { }
                        try { localStorage.setItem('au_lrc_amount', String(val)); } catch { }
                        try {
                            const ev = new Event('lrcamountchange', { bubbles: true });
                            window.dispatchEvent(ev);
                        } catch { }
                        try { stat_up(`<i class='fa-solid fa-list'></i> Showing up to <strong>${val}</strong> lines`); } catch { }
                    };

                    lrcSlider.addEventListener('input', () => syncLRC(lrcSlider.value));
                    lrcNumber.addEventListener('change', () => syncLRC(lrcNumber.value));
                }

                if (settingsApi) {
                    PREFERENCE_TOGGLES.forEach(toggle => {
                        const input = document.getElementById(`pref_${toggle.key}`);
                        if (input) {
                            input.checked = settingsApi.isEnabled(toggle.key);
                            input.addEventListener('change', async () => {
                                if (toggle.requiresPermission === 'notification' && input.checked) {
                                    const granted = await requestNotificationPermission();
                                    if (!granted) {
                                        input.checked = false;
                                        return;
                                    }
                                }
                                settingsApi.set(toggle.key, input.checked);
                            });
                        }
                    });
                }

                function uvzc(color) {
                    const visualizer = document.getElementById('visualizer');
                    if (visualizer) {
                        visualizer.style.backgroundColor = color;
                    }
                }
            }, 0);
        }

        try {
            const stored = localStorage.getItem(key);
            if (stored) {
                apply(stored);
            } else {
                apply(currentTheme);
            }
        } catch {
            apply(currentTheme);
        }

        try {
            const f = parseInt(localStorage.getItem('au_fps'));
            if (!isNaN(f)) {
                const clamped = Math.max(1, Math.min(300, f));
                try { FPS = clamped; } catch { }
            }
        } catch { }

        try {
            const la = parseInt(localStorage.getItem('au_lrc_amount'));
            if (!isNaN(la)) {
                const clamped = Math.max(1, Math.min(48, la));
                try { lrc_amount = clamped; } catch { }
            }
        } catch { }

        updateSettingsTooltip(document.documentElement.getAttribute('data-theme') || currentTheme);

        if (btn) {
            btn.addEventListener('click', debounce(() => {
                openSettingsModal();
            }));
        }

        ['vizmode', 'visualizer'].forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.addEventListener('click', debounce(() => {
                    openSettingsModal({ focusViz: true });
                }));
            }
        });
    })();
});

document.getElementById('pastelrc').addEventListener('click', debounce(() => {
    if (!metadata.title && !metadata.artist) {
        return throw_error('No track playing!');
    }
    msg(`<div style="display: flex; flex-direction: column; gap: 0.75rem; margin: 1rem 0; text-align: left;">
            <p style="margin: 0; color: #888;">They must be in LRC format - you can find them on <a href="https://lrclib.net" target="_blank" rel="noopener">LRCLIB</a> or other lyrics sites.</p>
            <textarea id="lrc_textarea" placeholder="[00:00.00] Start\n[00:10.50] Next line" rows="10" 
                style="width: 100%; padding: 0.75rem; border-radius: 8px; border: 1px solid #444; background: #2a2a2a; color: white; resize: vertical; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace; font-size: 0.95rem;"></textarea>
            <div style="display:flex; gap:0.5rem; justify-content:flex-end;">
                <button id="lrc_clear" style="padding: 10px 14px; background: #444; color: white; border: none; border-radius: 6px; cursor: pointer;">Clear</button>
                <button id="lrc_apply" style="padding: 10px 16px; background: #27ae60; color: white; border: none; border-radius: 6px; cursor: pointer;">Apply</button>
            </div><br><small style="color: #888;">You can drag and drop a .lrc or .srt/.vtt file to the dropzone or search LRCLIB for lyrics by pressing <strong><i class="fa-solid fa-magnifying-glass"></i> Search lyrics</strong></small>
        </div>
    `, 'Paste your own lyrics');

    setTimeout(() => {
        const ta = document.getElementById('lrc_textarea');
        if (lrc_data) ta.value = lrc_data.map(item => {
            const time = item.time;
            const minutes = Math.floor(time / 60);
            const seconds = Math.floor(time % 60);
            const milliseconds = Math.floor((time * 100) % 100);
            const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(milliseconds).padStart(2, '0')}`;
            return `[${formattedTime}] ${item.text}`;
        }).join('\n');
        const apply = document.getElementById('lrc_apply');
        const clr = document.getElementById('lrc_clear');

        if (ta) {
            ta.focus();
        }

        if (clr) {
            clr.addEventListener('click', () => {
                ta.value = '';
                ta.focus();
            });
        }

        if (apply) {
            const da = () => {
                const raw = (ta.value || '').trim();
                if (!raw) {
                    return throw_error('No lyrics to apply!');
                }
                try {
                    let parsed = lrc_parse(raw);
                    if (!parsed || parsed.length === 0) {
                        parsed = raw.split('\n').map(line => ({ time: 0, text: line }));
                    }
                    parsed = parsed.filter(l => l && typeof l.text === 'string').sort((a, b) => a.time - b.time);
                    if (parsed.length === 0) {
                        return throw_error('No usable lines found!');
                    }
                    skipLyricsUpdate = false;
                    lrc_wipe();
                    lrc_data = parsed;
                    update_lyrics();
                    throw_error('Applied pasted lyrics', true);
                } catch (e) {
                    console.error(e);
                    throw_error('Failed to parse LRC');
                }
            };

            apply.addEventListener('click', da);
            ta?.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                    da();
                }
            });
        }
    }, 0);
}));

document.getElementById('status').addEventListener('click', debounce(() => {
    if (!metadata.title && !metadata.artist) {
        return msg(about_content, "About Voxity");
    }
    const name = metadata.title + ' by ' + metadata.artist;
    navigator.clipboard.writeText(name).then(() => {
        throw_error(`Copied song to clipboard`, true);
    }).catch(err => {
        throw_error('Failed to copy - is Voxity allowed to access your clipboard?');
    });
}));

document.getElementById('np2').addEventListener('click', debounce(() => {
    if (!metadata.title) {
        return throw_error('No title to copy!');
    }
    navigator.clipboard.writeText(metadata.title).then(() => {
        throw_error('Copied title to clipboard', true);
    }).catch(err => {
        throw_error('Failed to copy - is Voxity allowed to access your clipboard?');
    });
}));

document.getElementById('artist').addEventListener('click', debounce(() => {
    if (!metadata.artist) {
        return throw_error('No artist to copy!');
    }
    navigator.clipboard.writeText(metadata.artist).then(() => {
        throw_error('Copied artist to clipboard', true);
    }).catch(err => {
        throw_error('Failed to copy - is Voxity allowed to access your clipboard?');
    });
}));

document.getElementById('album').addEventListener('click', debounce(() => {
    if (!metadata.album) {
        return throw_error('No album to copy!');
    }
    navigator.clipboard.writeText(metadata.album).then(() => {
        throw_error('Copied album to clipboard', true);
    }).catch(err => {
        throw_error('Failed to copy - is Voxity allowed to access your clipboard?');
    });
}));

document.getElementById('volc').addEventListener('click', debounce(() => {
    if (!elements.player.currentTime) return throw_error('No track playing!');
    const cur_vol = Math.round(elements.player.volume * 100);
    msg(`<div style="display: flex; flex-direction: column; gap: 1rem; margin: 1rem 0;">
            <div>
                <div style="display: flex; gap: 0.5rem; align-items: center;">
                    <input id="vol_inp" type="number" min="0" max="100" value="${cur_vol}" 
                        style="flex: 1; padding: 0.5rem; border-radius: 6px; border: 1px solid #444; background: #2a2a2a; color: white;">
                    <button id="set_vol" 
                        style="padding: 10px 20px; background: #333333; color: white; border: none; border-radius: 4px; cursor: pointer; white-space: nowrap;">
                        Set
                    </button>
                </div>
                <small style="color: #888;" id="footer">current: ${cur_vol}%</small>
            </div>
        </div>
    `, 'Set volume');

    setTimeout(() => {
        const input = document.getElementById('vol_inp');
        const btn = document.getElementById('set_vol');

        if (input && btn) {
            input.focus();
            input.select();

            const set_vol = () => {
                const value = parseInt(input.value);
                if (isNaN(value) || value < 0 || value > 100) {
                    throw_error('Out of range');
                    return;
                }
                elements.vol.value = value * 2;
                elements.player.volume = value / 100;

                let icon = '<i class="fa-solid fa-volume-high"></i>';
                if (value === 0) icon = '<i class="fa-solid fa-volume-xmark"></i>';
                else if (value < 33) icon = '<i class="fa-solid fa-volume-off"></i>';
                else if (value < 66) icon = '<i class="fa-solid fa-volume-low"></i>';

                throw_error(`Volume set to: ${value}% ${icon}`, true);
                document.getElementById('footer').innerHTML = `current: ${value}%`;
                elements.vol.value = elements.player.volume * 2;
            };

            btn.addEventListener('click', set_vol);
            input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') set_vol();
            });
        }
    }, 0);
}));

document.getElementById('speedc').addEventListener('click', debounce(() => {
    if (!elements.player.currentTime) return throw_error('No track playing!');
    const cur_spd = elements.speed.value;
    msg(`<div style="display: flex; flex-direction: column; gap: 1rem; margin: 1rem 0;">
            <div>
                <div style="display: flex; gap: 0.5rem; align-items: center;">
                    <input id="spd_inp" type="number" min="0.1" max="14.0" step="0.1" value="${cur_spd}" 
                        style="flex: 1; padding: 0.5rem; border-radius: 6px; border: 1px solid #444; background: #2a2a2a; color: white;">
                    <button id="set_spd" 
                        style="padding: 10px 20px; background: #333333; color: white; border: none; border-radius: 4px; cursor: pointer; white-space: nowrap;">
                        Set
                    </button>
                </div>
                <small style="color: #888;" id="footer">current: ${cur_spd}x - min: 0.1x, max: 14.0x</small>
            </div>
        </div>
    `, 'Set speed');

    setTimeout(() => {
        const input = document.getElementById('spd_inp');
        const btn = document.getElementById('set_spd');

        if (input && btn) {
            input.focus();
            input.select();

            const set_spd = () => {
                const value = parseFloat(input.value);
                if (isNaN(value) || value < 0.1 || value > 14.0) {
                    throw_error('Speed must be between 0.1 and 14.0!');
                    return;
                }
                elements.speed.value = value;
                elements.player.playbackRate = value;

                let icon = '<i class="fa-solid fa-gauge-high fa-flip-horizontal"></i>';
                if (value >= 1.5) icon = '<i class="fa-solid fa-gauge-high"></i>';
                else if (value >= 0.5) icon = '<i class="fa-solid fa-gauge"></i>';

                throw_error(`Speed set to: ${value}x ${icon}`, true);
                document.getElementById('footer').innerHTML = `current: ${value}x - min: 0.1x, max: 14.0x`;
            };

            btn.addEventListener('click', set_spd);
            input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') set_spd();
            });
        }
    }, 0);
}));

document.getElementById('prog').addEventListener('click', debounce(() => {
    if (!elements.player.currentTime) return throw_error('No track playing!');
    const dur = elements.player.duration || 0;
    const cur = elements.player.currentTime || 0;

    if (dur === 0) {
        return throw_error('No track loaded!');
    }

    msg(`<div style="display: flex; flex-direction: column; gap: 1rem; margin: 1rem 0;">
            <div>
                <div style="display: flex; gap: 0.5rem; align-items: center;">
                    <input id="ind_inp" type="number" min="0" max="${Math.floor(dur)}" value="${Math.floor(cur)}" 
                        style="flex: 1; padding: 0.5rem; border-radius: 6px; border: 1px solid #444; background: #2a2a2a; color: white;">
                    <button id="set_ind" 
                        style="padding: 10px 20px; background: #333333; color: white; border: none; border-radius: 4px; cursor: pointer; white-space: nowrap;">
                        Jump
                    </button>
                </div>
                <small style="color: #888;" id="footer">current: ${Math.floor(cur)}s / duration: ${Math.floor(dur)}s</small>
            </div>
        </div>
    `, 'Set playback time');

    setTimeout(() => {
        const input = document.getElementById('ind_inp');
        const btn = document.getElementById('set_ind');

        if (input && btn) {
            input.focus();
            input.select();

            const set_ind = () => {
                const val = parseInt(input.value);
                if (isNaN(val) || val < 0 || val > dur) {
                    throw_error(`Out of range`);
                    return;
                }
                elements.player.currentTime = val;
                elements.index.value = val;

                throw_error(`Set index to: ${form_time(val)} / ${form_time(dur)}`, true);
                document.getElementById('footer').innerHTML = `current: ${Math.floor(val)}s / duration: ${Math.floor(dur)}s`;

            };

            btn.addEventListener('click', set_ind);
            input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') set_ind();
            });
        }
    }, 0);
}));

document.getElementById('searchlrclib').addEventListener('click', debounce(async () => {
    if (!metadata.title && !metadata.artist) {
        return throw_error('No track playing!');
    }

    const modal = await msg(`<div style="display: flex; flex-direction: column; gap: 0.75rem; margin: 1rem 0; text-align: left;">
            <input id="lrcse" placeholder="${metadata.title}" 
                style="width: 100%; padding: 0.75rem; border-radius: 8px; border: 1px solid #444; background: #2a2a2a; color: white; font-size: 0.95rem;">
            <div style="display:flex; gap:0.5rem; justify-content:flex-end;">
                <button id="lrsea" style="padding: 10px 16px; background: #27ae60; color: white; border: none; border-radius: 6px; cursor: pointer;">Search</button>
            </div><br>
            <i style="font-size:0.9rem; color:#888;">You can leave it blank to search by the current track's title. If you already have LRC lyrics, either drag and drop the .lrc file to the dropzone, or use the <strong><i class="fa-solid fa-paste"></i> Paste lyrics</strong> button</i>
        </div>
    `, 'Search for lyrics');

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

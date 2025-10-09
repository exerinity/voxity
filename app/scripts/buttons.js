function getAbout() {
    return `Audion is a <abbr title="Progressive Web App">PWA</abbr> music player created by <a href="https://exerinity.dev" target="_blank" rel="noopener">exerinity</a>. It is not designed to replace or compete with any native players; but rather to be a fast quick way for casual listening.</p>
        <a href="https://exerinity.dev/projects/audion" target="_blank" rel="noopener">Learn more about Audion</a>
        <hr>
        <p>Audion uses <a href="https://github.com/aadsm/jsmediatags" target="_blank" rel="noopener">jsmediatags</a> for reading metadata, <a href="https://fontawesome.com/" target="_blank" rel="noopener">Font Awesome</a> for icons, and <a href="https://lrclib.net" target="_blank" rel="noopener">LRC Library</a> for fetching lyrics.</p><hr>Audion is ${uptodate === false ? '<strong style="color:orange;">out of date</strong>! Please <a href="#" onclick="window.location.href=window.location.href.split(\'?\')[0]+\'?cachebuster=\'+Date.now();return false;">refresh to update</a>.' : '<strong style="color:green;">up to date!</strong>'}`;
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
    msg(getAbout(), 'About Audion');
}));

document.getElementById('queuehead').addEventListener('click', debounce(() => {
    calqueue();
}));

['vizmode', 'visualizer'].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
        el.addEventListener('click', debounce(() => {
            const current = (document.getElementById('viz-mode')?.value) || 'spectrum';
            const options = [
                { v: 'spectrum', l: 'Spectrum' },
                { v: 'waveform', l: 'Waveform' },
                { v: 'bars', l: 'Bars' },
                { v: 'circular', l: 'Circular' },
                { v: 'none', l: 'None (off)' },
                { v: 'nonefr', l: 'Actually none' },
            ];
            msg(`<div style="margin:1rem 0;">
                    <select id="vizmode_select" style="width:100%; padding:0.5rem; border-radius:6px; border:1px solid #444; background:#2a2a2a; color:white;">
                        ${options.map(o => `<option value="${o.v}" ${o.v === current ? 'selected' : ''}>${o.l}</option>`).join('')}
                    </select>
                </div>
            `, 'Select visualizer mode');

            setTimeout(() => {
                const sel = document.getElementById('vizmode_select');
                const hise = document.getElementById('viz-mode');
                const applyChange = () => {
                    if (hise && sel) {
                        hise.value = sel.value;
                        hise.dispatchEvent(new Event('change', { bubbles: true }));
                        throw_error(`Visualizer: ${sel.options[sel.selectedIndex]?.text || sel.value}`, true);
                    }
                };
                sel?.addEventListener('change', applyChange);
                sel?.focus();
            }, 0);
        }));
    }
});

document.getElementById('fwd').addEventListener('click', debounce(() => {
    if (!elements.player.currentTime) return throw_error('No track playing!');
    const dur = elements.player.duration || 0;
    const t = Math.min(dur, (elements.player.currentTime || 0) + 10);
    elements.player.currentTime = t;
    elements.index.value = t;
    stat_up(`<i class="fa-solid fa-music"></i> Scrubbing to: ${form_time(t)} / ${form_time(dur)}`);
}));

document.getElementById('stop').addEventListener('click', debounce(() => {
    if (!elements.player.currentTime) return throw_error('No track playing!');
    elements.player.currentTime = 0;
    elements.index.value = 0;
    stat_up('<i class="fa-solid fa-arrow-rotate-left"></i> Restarted the track');
}));

document.getElementById('hotkeys').addEventListener('click', debounce(() => {
    msg(`<ul style="list-style-type: none; padding: 0;">
    <li><strong>Space / K</strong>: play/pause</li>
    <li><strong>Left / J / A</strong>: rewind 10 seconds</li>
    <li><strong>Right / L / D</strong>: forward 10 seconds</li>
    <li><strong>Shift + Left</strong>: rewind 1 second</li>
    <li><strong>Shift + Right</strong>: forward 1 second</li>
    <li><strong>Ctrl + Left</strong>: rewind 5 seconds</li>
    <li><strong>Ctrl + Right</strong>: forward 5 seconds</li>
    <li><strong>W / Up</strong>: volume up</li>
    <li><strong>S / Down</strong>: volume down</li>
    <li><strong>R</strong>: restart track</li>
    <li><strong>T</strong>: toggle loop</li>
    <li><strong>Numeric keys (0-9)</strong>: jump to 0-90% of track</li>
    <p><i>You can also scroll over progress bars to change values</i></p>
  </ul>
`, 'Hotkeys / keyboard shortcuts');

}));

document.getElementById('cover-art').addEventListener('click', debounce(() => {
    if (globalart) {
        msg(`<img src="${globalart}" title="Click to open full image in a new tab" alt="Cover art" style="max-width: 100%; height: auto; border-radius: 8px; cursor: pointer;" id="msgart"><small><i>Click image to open in new tab</i></small>`, `${metadata.album || metadata.title || "Cover art"}`);
        setTimeout(() => {
            const img = document.getElementById('msgart');
            if (img) {
                img.onclick = () => {
                    const ua = navigator.userAgent;
                    if (ua.includes('Firefox')) {
                        window.open(globalart, '_blank');
                    } else if (ua.includes('Chrome')) {
                        return msg(`You will need to right-click the image and select <strong>Open image in new tab</strong> on Chrome.<br><small>For some reason, on Chrome, with base64 encoded images, <strong>window.open()</strong> gives you <strong>about:blank</strong> instead of the image.</small>`, 'Hold up...');
                    } else {
                        window.open(globalart, '_blank');
                    }
                };
            }
        }, 0);
    }
}));

window.addEventListener('DOMContentLoaded', () => {
    (function theme() {
        const THEMES = ['grey', 'dim', 'lights-out', 'high-contrast', 'blue'];
        const key = 'au_theme';

        function apply(theme) {
            document.documentElement.setAttribute('data-theme', theme);
            localStorage.setItem(key, theme);
        }

        try {
            const stored = localStorage.getItem(key);
            if (stored) {
                apply(stored);
            } else {
                apply('lights-out');
            }
        } catch { }

        const btn = document.getElementById('theme');
        if (btn) {
            btn.addEventListener('click', debounce(() => {
                msg(`<div style="margin: 1rem 0;">
                        <select id="theme_select" style="width: 100%; padding: 0.5rem; border-radius: 6px; border: 1px solid #444; background: #2a2a2a; color: white;">
                            ${THEMES.map(t => {
                    const label = t.replace('-', ' ');
                    const selected = (document.documentElement.getAttribute('data-theme') || 'dim') === t ? 'selected' : '';
                    return `<option value="${t}" ${selected}>${label}</option>`;
                }).join('')}
                        </select>
                    </div>
                    <div>
                        <p style="margin: 0 0 0.5rem 0;">Accent color:</p>
                        <input id="accent_color" type="color" value="${document.documentElement.style.getPropertyValue('--lyric-colour') || '#8000ff'}" style="width: 100%; height: 50px; border: none; cursor: pointer; background: none;">
                    </div><br>
                    <p style="font-size: 0.9rem; color: #aaa; margin: 0;">To change the visualizer mode, click on the visualizer itself</p>
                `, 'Theme and accent preferences');

                setTimeout(() => {
                    const select = document.getElementById('theme_select');
                    const acin = document.getElementById('accent_color');

                    if (select) {
                        select.focus();
                        select.addEventListener('change', () => {
                            const next = select.value;
                            apply(next);
                            const label = next.replace('-', ' ');
                            throw_error(`Set theme: ${label}`, true);
                            btn.title = `Toggle theme (current: ${label})`;
                        });
                    }

                    if (acin) {
                        acin.addEventListener('input', () => {
                            const color = acin.value;
                            document.documentElement.style.setProperty('--lyric-colour', color);
                            viz_color = color;
                            uvzc(color);
                            stat_up(`<i class='fa-solid fa-palette'></i> Accent color set to: <span style='color: ${color};'>${color}</span>`);
                        });
                    }

                    function uvzc(color) {
                        const visualizer = document.getElementById('visualizer');
                        if (visualizer) {
                            visualizer.style.backgroundColor = color;
                        }
                    }
                }, 0);
            }));
        }
    })();
});

document.getElementById('pastelrc').addEventListener('click', debounce(() => {
    if (!metadata.title && !metadata.artist) {
        return throw_error('No track playing!');
    }
    msg(`<div style="display: flex; flex-direction: column; gap: 0.75rem; margin: 1rem 0; text-align: left;">
            <p style="margin: 0; color: #aaa;">They must be in LRC format - you can find them on <a href="https://lrclib.net" target="_blank" rel="noopener">LRCLIB</a> or other lyrics sites.</p>
            <textarea id="lrc_textarea" placeholder="[00:00.00] Start\n[00:10.50] Next line" rows="10" 
                style="width: 100%; padding: 0.75rem; border-radius: 8px; border: 1px solid #444; background: #2a2a2a; color: white; resize: vertical; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace; font-size: 0.95rem;"></textarea>
            <div style="display:flex; gap:0.5rem; justify-content:flex-end;">
                <button id="lrc_clear" style="padding: 10px 14px; background: #444; color: white; border: none; border-radius: 6px; cursor: pointer;">Clear</button>
                <button id="lrc_apply" style="padding: 10px 16px; background: #27ae60; color: white; border: none; border-radius: 6px; cursor: pointer;">Apply</button>
            </div><br><small style="color: #888;">Tip: You can drag and drop a .lrc or .srt/.vtt file to the dropzone</small>
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
        return msg(getAbout(), 'About Audion');
    }
    const name = metadata.title + ' by ' + metadata.artist;
    navigator.clipboard.writeText(name).then(() => {
        throw_error(`Copied song to clipboard`, true);
    }).catch(err => {
        throw_error('Failed to copy - is Audion allowed to access your clipboard?');
    });
}));

document.getElementById('np2').addEventListener('click', debounce(() => {
    if (!metadata.title) {
        return throw_error('No title to copy!');
    }
    navigator.clipboard.writeText(metadata.title).then(() => {
        throw_error('Copied title to clipboard', true);
    }).catch(err => {
        throw_error('Failed to copy - is Audion allowed to access your clipboard?');
    });
}));

document.getElementById('artist').addEventListener('click', debounce(() => {
    if (!metadata.artist) {
        return throw_error('No artist to copy!');
    }
    navigator.clipboard.writeText(metadata.artist).then(() => {
        throw_error('Copied artist to clipboard', true);
    }).catch(err => {
        throw_error('Failed to copy - is Audion allowed to access your clipboard?');
    });
}));

document.getElementById('album').addEventListener('click', debounce(() => {
    if (!metadata.album) {
        return throw_error('No album to copy!');
    }
    navigator.clipboard.writeText(metadata.album).then(() => {
        throw_error('Copied album to clipboard', true);
    }).catch(err => {
        throw_error('Failed to copy - is Audion allowed to access your clipboard?');
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

document.getElementById('searchlrclib').addEventListener('click', debounce(() => {
    if (!metadata.title && !metadata.artist) {
        return throw_error('No track playing!');
    }

    msg(`<div style="display: flex; flex-direction: column; gap: 0.75rem; margin: 1rem 0; text-align: left;">
            <input id="lrcse" placeholder="${metadata.title}" 
                style="width: 100%; padding: 0.75rem; border-radius: 8px; border: 1px solid #444; background: #2a2a2a; color: white; font-size: 0.95rem;">
            <div style="display:flex; gap:0.5rem; justify-content:flex-end;">
                <button id="lrsea" style="padding: 10px 16px; background: #27ae60; color: white; border: none; border-radius: 6px; cursor: pointer;">Search</button>
            </div>
        </div>
    `, 'Search for lyrics');

    setTimeout(() => {
        const sin = document.getElementById('lrcse');
        const sbt = document.getElementById('lrsea');

        if (sbt) {
            sbt.addEventListener('click', async () => {
                let query = sin.value.trim();
                if (!query) {
                    query = metadata.title;
                }

                try {
                    throw_error('Searching...', true);
                    const response = await fetch(`https://lrclib.net/api/search?q=${encodeURIComponent(query)}`);
                    const results = await response.json();

                    if (results.length === 0) {
                        return throw_error('No results');
                    }

                    msg(`<div style="max-height: 300px; overflow-y: auto; border: 1px solid #444; border-radius: 8px; padding: 0.75rem; background: #2a2a2a; color: white;">
                            ${results.slice(0, 10).map((result, index) => `
                                <p data-id="${result.id}" style="cursor: pointer; margin: 0.5rem 0;">
                                    <strong>${result.trackName}</strong> by ${result.artistName} (${result.albumName})
                                </p>
                            `).join('')}
                        </div>
                    `, 'Results');

                    setTimeout(() => {
                        document.querySelectorAll('[data-id]').forEach(p => {
                            p.addEventListener('click', async () => {
                                const id = p.dataset.id;
                                try {
                                    throw_error('Loading...', true);
                                    const flrs = await fetch(`https://lrclib.net/api/get/${id}`);
                                    const flcd = await flrs.json();

                                    if (flcd.syncedLyrics || flcd.plainLyrics) {
                                        msg(`<div style="max-height: 300px; overflow-y: auto; border: 1px solid #444; border-radius: 8px; padding: 0.75rem; background: #2a2a2a; color: white;">
                                                <pre style="white-space: pre-wrap; color: white;">${flcd.syncedLyrics || flcd.plainLyrics}</pre>
                                            </div>
                                            <div style="display:flex; gap:0.5rem; justify-content:flex-end; margin-top: 1rem;">
                                                <button id="insert_lyrics" style="padding: 10px 16px; background: #27ae60; color: white; border: none; border-radius: 6px; cursor: pointer;">Insert lyrics</button>
                                            </div>
                                        `, 'Preview lyrics');

                                        setTimeout(() => {
                                            const insb = document.getElementById('insert_lyrics');
                                            if (insb) {
                                                insb.addEventListener('click', () => {
                                                    if (flcd.syncedLyrics) {
                                                        lrc_data = lrc_parse(flcd.syncedLyrics);
                                                    } else {
                                                        lrc_data = flcd.plainLyrics.split('\n').map(line => ({ time: 0, text: line }));
                                                    }
                                                    update_lyrics();
                                                    throw_error('Inserted lyrics', true);
                                                });
                                            }
                                        }, 0);
                                    } else {
                                        throw_error('No lyrics found, is it an instrumental?');
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
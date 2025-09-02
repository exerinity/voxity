document.getElementById('plps').addEventListener('click', debounce(() => {
    if (!metadata.title && !metadata.artist) {
        return throw_error('No track playing!');
    }
    if (elements.player.paused) {
        elements.player.play();
        document.getElementById('plps').innerHTML = '<i class="fa-solid fa-pause"></i>';
        stat_up('<i class="fa-solid fa-circle-play"></i> Resumed playback');
    } else {
        elements.player.pause();
        document.getElementById('plps').innerHTML = '<i class="fa-solid fa-play"></i>';
        stat_up('<i class="fa-solid fa-circle-pause"></i> Paused playback');
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

document.getElementById('audionalert').addEventListener('click', debounce(() => {
    window.open('https://bsky.app/profile/exerinity.dev/post/3lxth5n5muc2f', '_blank');
}));

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
   msg(`
  <h2>Hotkeys</h2>
  <ul style="list-style-type: none; padding: 0;">
    <li><strong>Space / K</strong>: play/pause</li>
    <li><strong>Left / J / A</strong>: rewind 10 seconds</li>
    <li><strong>Right / L / D</strong>: forward 10 seconds</li>
    <li><strong>Shift + Left</strong>: rewind 1 second</li>
    <li><strong>Shift + Right</strong>: forward 1 second</li>
    <li><strong>W / Up</strong>: volume up</li>
    <li><strong>S / Down</strong>: volume down</li>
    <li><strong>R</strong>: restart track</li>
    <li><strong>T</strong>: toggle loop</li>
    <p><i>You can also scroll over progress bars to change values</i></p>
  </ul>
`);

}));

document.getElementById('cover-art').addEventListener('click', debounce(() => {
    if (globalart) {
        msg(`<img src="${globalart}" title="Click to open full image in a new tab" alt="Cover art" style="max-width: 100%; height: auto; border-radius: 8px; cursor: pointer;" id="msgart">`);
        setTimeout(() => {
            const img = document.getElementById('msgart');
            if (img) {
                img.onclick = () => {
                    const ua = navigator.userAgent;
                    if (ua.includes('Firefox')) {
                        window.open(globalart, '_blank');
                    } else if (ua.includes('Chrome')) {
                        return msg(`You will need to right-click the image and select <strong>Open image in new tab</strong> on Chrome.<br><small>For some reason, on Chrome, with base64 encoded images, <strong>window.open()</strong> gives you <strong>about:blank</strong> instead of the image.</small>`);
                    } else {
                        window.open(globalart, '_blank');
                    }
                };
            }
        }, 0);
    }
}));

document.getElementById('viscolchange').addEventListener('click', debounce(() => {
    const button = document.getElementById('viscolchange');
    const colchange = document.createElement('input');
    colchange.type = 'color';
    colchange.value = viz_color;
    colchange.style.position = 'absolute';
    colchange.style.left = `${button.offsetLeft}px`;
    colchange.style.top = `${button.offsetTop + button.offsetHeight}px`;
    colchange.style.zIndex = '1000';
    colchange.style.width = '100px';
    colchange.style.height = '50px';
    colchange.style.border = 'none';
    colchange.style.cursor = 'pointer';
    colchange.style.background = 'none';
    document.body.appendChild(colchange);
    colchange.addEventListener('input', () => {
        viz_color = colchange.value;
        button.style.color = viz_color;
        // change lyric-colour
        document.documentElement.style.setProperty('--lyric-colour', viz_color);
        stat_up(`<i class="fa-solid fa-palette"></i> Visualizer color set to: <span style="color: ${viz_color};">${viz_color}</span>`);
    });
    colchange.addEventListener('blur', () => {
        document.body.removeChild(colchange);
    });
}));

(function theme() {
    const THEMES = ['light', 'grey', 'dim', 'lights-out'];
    const key = 'au_theme';

    function apply(theme) {
        const t = THEMES.includes(theme) ? theme : 'dim';
        document.documentElement.setAttribute('data-theme', t);
        try { localStorage.setItem(key, t); } catch {}
    }

    try {
        const stored = localStorage.getItem(key);
        if (stored) apply(stored);
    } catch {}

    const btn = document.getElementById('theme');
    if (btn) {
        btn.addEventListener('click', debounce(() => {
            const cur = document.documentElement.getAttribute('data-theme') || 'dim';
            const idx = THEMES.indexOf(cur);
            const next = THEMES[(idx + 1) % THEMES.length];
            apply(next);
            const label = next.replace('-', ' ');
            stat_up(`<i class="fa-solid fa-circle-half-stroke"></i> Theme: ${label}`);
            btn.title = `Toggle theme (current: ${label})`;
        }));
    }
})();

document.getElementById('pastelrc').addEventListener('click', debounce(() => {
    msg(`
        <h2>Paste your own lyrics</h2>
        <div style="display: flex; flex-direction: column; gap: 0.75rem; margin: 1rem 0; text-align: left;">
            <p style="margin: 0; color: #aaa;">Paste LRC text (e.g., [00:12.34] Line here). Unsupported lines are ignored.</p>
            <textarea id="lrc_textarea" placeholder="[00:00.00] Start\n[00:10.50] Next line" rows="10" 
                style="width: 100%; padding: 0.75rem; border-radius: 8px; border: 1px solid #444; background: #2a2a2a; color: white; resize: vertical; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace; font-size: 0.95rem;"></textarea>
            <div style="display:flex; gap:0.5rem; justify-content:flex-end;">
                <button id="lrc_clear" style="padding: 10px 14px; background: #444; color: white; border: none; border-radius: 6px; cursor: pointer;">Clear</button>
                <button id="lrc_apply" style="padding: 10px 16px; background: #27ae60; color: white; border: none; border-radius: 6px; cursor: pointer;">Apply</button>
            </div>
        </div>
    `);

    setTimeout(() => {
        const ta = document.getElementById('lrc_textarea');
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
                    return throw_error('Please paste some LRC text first');
                }
                try {
                    let parsed = lrc_parse(raw);
                    if (!parsed || parsed.length === 0) {
                        parsed = raw.split('\n').map(line => ({ time: 0, text: line }));
                    }
                    parsed = parsed.filter(l => l && typeof l.text === 'string').sort((a,b) => a.time - b.time);
                    if (parsed.length === 0) {
                        return throw_error('No usable lines found');
                    }
                    lrc_wipe();
                    lrc_data = parsed;
                    update_lyrics();
                    stat_up('<i class="fa-solid fa-check"></i> Applied pasted lyrics');
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

document.getElementById('toys').addEventListener('click', debounce(() => {
    msg(`
        <h2>Toys</h2>
        <div style="display: flex; flex-direction: column; gap: 1rem; margin: 1rem 0;">
            <div>
                <p style="margin: 0 0 0.5rem 0;">Throw an error:</p>
                <div style="display: flex; gap: 0.5rem; align-items: center;">
                    <input id="cuserrinp" type="text" placeholder="Error message" 
                        style="flex: 1; padding: 0.5rem; border-radius: 6px; border: 1px solid #444; background: #2a2a2a; color: white;">
                    <button id="cusbtn1" 
                        style="padding: 10px 20px; background: #c0392b; color: white; border: none; border-radius: 4px; cursor: pointer; white-space: nowrap;">
                        Throw!
                    </button>
                </div>
            </div>

            <div>
                <p style="margin: 0 0 0.5rem 0;">Push a status:</p>
                <div style="display: flex; gap: 0.5rem; align-items: center;">
                    <input id="statinp" type="text" placeholder="Status message" 
                        style="flex: 1; padding: 0.5rem; border-radius: 6px; border: 1px solid #444; background: #2a2a2a; color: white;">
                    <button id="btn2" 
                        style="padding: 10px 20px; background: #2980b9; color: white; border: none; border-radius: 4px; cursor: pointer; white-space: nowrap;">
                        Send
                    </button>
                </div>
            </div>

            <div>
                <p style="margin: 0 0 0.5rem 0;">Show a message popup:</p>
                <div style="display: flex; gap: 0.5rem; align-items: center;">
                    <input id="msginp" type="text" placeholder="Dialog HTML or text" 
                        style="flex: 1; padding: 0.5rem; border-radius: 6px; border: 1px solid #444; background: #2a2a2a; color: white;">
                    <button id="msgbtn" 
                        style="padding: 10px 20px; background: #27ae60; color: white; border: none; border-radius: 4px; cursor: pointer; white-space: nowrap;">
                        Show
                    </button>
                </div>
            </div>
        </div>
    `);

    setTimeout(() => {
        const btn1 = document.getElementById('cusbtn1');
        const input1 = document.getElementById('cuserrinp');

        const btn2 = document.getElementById('btn2');
        const input2 = document.getElementById('statinp');

        const btn3 = document.getElementById('msgbtn');
        const input3 = document.getElementById('msginp');

        if (btn1 && input1) {
            btn1.addEventListener('click', () => {
                const message = input1.value.trim();
                if (message) {
                    throw_error(message, false);
                } else {
                    throw_error('You must enter a message, that\'s <i>your</i> error!', false);
                }
            });
        }

        if (btn2 && input2) {
            btn2.addEventListener('click', () => {
                const message = input2.value.trim();
                if (message) {
                    stat_up(message);
                } else {
                    stat_up('<span style="display: inline-flex; align-items: center;"><img src="https://upload.wikimedia.org/wikipedia/commons/0/0d/Winamp-logo.svg" style="width: 1.2em; height: 1.2em; margin-right: 0.4em; vertical-align: middle;">This is inspired by Winamp!</span>');
                }
            });
        }

        if (btn3 && input3) {
            btn3.addEventListener('click', () => {
                const message = input3.value.trim();
                if (message) {
                    msg(message);
                } else {
                    msg('???');
                }
            });
        }
    }, 0);
}));

document.getElementById('status').addEventListener('click', debounce(() => {
    if (!metadata.title && !metadata.artist) {
        return throw_error('No track playing!');
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
    msg(`
        <h2>Set volume</h2>
        <div style="display: flex; flex-direction: column; gap: 1rem; margin: 1rem 0;">
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
    `);

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

                stat_up(`${icon} Volume set to: ${value}%`);
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
    msg(`
        <h2>Set speed</h2>
        <div style="display: flex; flex-direction: column; gap: 1rem; margin: 1rem 0;">
            <div>
                <p style="margin: 0 0 0.5rem 0;">set playback speed (0.1-2.0):</p>
                <div style="display: flex; gap: 0.5rem; align-items: center;">
                    <input id="spd_inp" type="number" min="0.1" max="2.0" step="0.1" value="${cur_spd}" 
                        style="flex: 1; padding: 0.5rem; border-radius: 6px; border: 1px solid #444; background: #2a2a2a; color: white;">
                    <button id="set_spd" 
                        style="padding: 10px 20px; background: #333333; color: white; border: none; border-radius: 4px; cursor: pointer; white-space: nowrap;">
                        Set
                    </button>
                </div>
                <small style="color: #888;" id="footer">current: ${cur_spd}x</small>
            </div>
        </div>
    `);

    setTimeout(() => {
        const input = document.getElementById('spd_inp');
        const btn = document.getElementById('set_spd');

        if (input && btn) {
            input.focus();
            input.select();

            const set_spd = () => {
                const value = parseFloat(input.value);
                if (isNaN(value) || value < 0.1 || value > 2.0) {
                    throw_error('Speed must be between 0.1 and 2.0!');
                    return;
                }
                elements.speed.value = value;
                elements.player.playbackRate = value;

                let icon = '<i class="fa-solid fa-gauge-high fa-flip-horizontal"></i>';
                if (value >= 1.5) icon = '<i class="fa-solid fa-gauge-high"></i>';
                else if (value >= 0.5) icon = '<i class="fa-solid fa-gauge"></i>';

                stat_up(`${icon} Speed: ${value}x`);
                document.getElementById('footer').innerHTML = `current: ${value}x`;
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

    msg(`
        <h2>Set index</h2>
        <div style="display: flex; flex-direction: column; gap: 1rem; margin: 1rem 0;">
            <div>
                <p style="margin: 0 0 0.5rem 0;">jump to time (0-${Math.floor(dur)} seconds):</p>
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
    `);

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

                stat_up(`<i class="fa-solid fa-music"></i> Jumped to: ${form_time(val)} / ${form_time(dur)}`);
                document.getElementById('footer').innerHTML = `current: ${Math.floor(val)}s / duration: ${Math.floor(dur)}s`;
                
            };

            btn.addEventListener('click', set_ind);
            input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') set_ind();
            });
        }
    }, 0);
}));


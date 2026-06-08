document.getElementById('pastelrc').addEventListener('click', debounce(() => {
    if (!metadata.title && !metadata.artist) {
        return throw_error('No track playing!');
    }
    const modalPromise = msg(`<div style="display: flex; flex-direction: column; gap: 0.75rem; margin: 1rem 0; text-align: left;">
            <p style="margin: 0; color: #888;">They must be in LRC format - you can find them on <a href="https://lrclib.net" target="_blank" rel="noopener">LRCLIB</a> or other lyrics sites.</p>
            <textarea id="lrc_textarea" placeholder="[00:00.00] Start\n[00:10.50] Next line" rows="10" 
                style="width: 100%; padding: 0.75rem; border-radius: 8px; border: 1px solid #444; background: #2a2a2a; color: white; resize: vertical; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace; font-size: 0.95rem;"></textarea>
            <div style="display:flex; gap:0.5rem; justify-content:flex-end;">
                <button id="lrc_clear">Clear</button>
                <button id="lrc_apply" style="background: #27ae60;">Apply</button>
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
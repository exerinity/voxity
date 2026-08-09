document.getElementById('volc').addEventListener('click', debounce(() => {
    if (!elements.player.currentTime) return throw_error('No track playing!');
    const cur_vol = Math.round(elements.player.volume * 100);
    const modalPromise = msg(`<div style="display: flex; flex-direction: column; gap: 1rem; margin: 1rem 0;">
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

const max_spd = /firefox|fxios/i.test(navigator.userAgent) ? 8.0 : 14.0;

document.getElementById('speedc').addEventListener('click', debounce(() => {
    if (!elements.player.currentTime) return throw_error('No track playing!');
    const cur_spd = elements.speed.value;
    const modalPromise = msg(`<div style="display: flex; flex-direction: column; gap: 1rem; margin: 1rem 0;">
            <div>
                <div style="display: flex; gap: 0.5rem; align-items: center;">
                    <input id="spd_inp" type="number" min="0.1" max="${max_spd.toFixed(1)}" step="0.1" value="${cur_spd}"
                        style="flex: 1; padding: 0.5rem; border-radius: 6px; border: 1px solid #444; background: #2a2a2a; color: white;">
                    <button id="set_spd" 
                        style="padding: 10px 20px; background: #333333; color: white; border: none; border-radius: 4px; cursor: pointer; white-space: nowrap;">
                        Set
                    </button>
                </div>
                <small style="color: #888;" id="footer">current: ${cur_spd}x - min: 0.1x, max: ${max_spd.toFixed(1)}x</small>
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
                if (isNaN(value) || value < 0.1 || value > max_spd) {
                    throw_error(`Speed must be between 0.1 and ${max_spd.toFixed(1)}!`);
                    return;
                }
                elements.speed.value = value;
                elements.player.playbackRate = value;

                let icon = '<i class="fa-solid fa-gauge-high fa-flip-horizontal"></i>';
                if (value >= 1.5) icon = '<i class="fa-solid fa-gauge-high"></i>';
                else if (value >= 0.5) icon = '<i class="fa-solid fa-gauge"></i>';

                throw_error(`Speed set to: ${value}x ${icon}`, true);
                document.getElementById('footer').innerHTML = `current: ${value}x - min: 0.1x, max: ${max_spd.toFixed(1)}x`;
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

    const modalPromise = msg(`<div style="display: flex; flex-direction: column; gap: 1rem; margin: 1rem 0;">
            <div>
                <div style="display: flex; gap: 0.5rem; align-items: center;">
                    <input id="ind_inp" type="text" inputmode="decimal" placeholder="92, 1:32, 32%" value="${Math.floor(cur)}" 
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

        const parsePlaybackTimeInput = (value, duration) => {
            if (typeof value !== 'string') value = String(value);
            value = value.trim();
            if (!value) return null;

            let seconds = null;
            if (value.endsWith('%')) {
                const pct = parseFloat(value.slice(0, -1).trim());
                if (!Number.isFinite(pct)) return null;
                seconds = (duration * pct) / 100;
            } else if (value.includes(':')) {
                const parts = value.split(':').map((part) => part.trim());
                if (parts.length === 2 || parts.length === 3) {
                    const nums = parts.map((part) => parseFloat(part));
                    if (nums.every((num) => Number.isFinite(num) && num >= 0)) {
                        if (parts.length === 2) {
                            seconds = nums[0] * 60 + nums[1];
                        } else {
                            seconds = nums[0] * 3600 + nums[1] * 60 + nums[2];
                        }
                    }
                }
            } else {
                const num = parseFloat(value);
                if (!Number.isFinite(num)) return null;
                seconds = num;
            }

            if (seconds === null) return null;
            return Math.max(0, Math.min(duration, seconds));
        };

        if (input && btn) {
            input.focus();
            input.select();

            const set_ind = () => {
                const val = parsePlaybackTimeInput(input.value, dur);
                if (val === null || Number.isNaN(val) || val < 0 || val > dur) {
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
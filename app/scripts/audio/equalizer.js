const EQ_STORAGE_KEY = 'au_equalizer';

const EQ_PRESETS = {
    flat: { label: 'Flat', gains: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
    bass: { label: 'Bass boost', gains: [8, 7, 6, 4, 2, 0, 0, 0, 0, 0] },
    treble: { label: 'Treble boost', gains: [0, 0, 0, 0, 0, 0, 2, 4, 6, 8] },
    loudness: { label: 'Loudness', gains: [7, 6, 4, 2, 0, 0, 1, 3, 5, 6] },
};

let eqEnabled = true;
let eqGains = [...EQ_PRESETS.flat.gains];
let eqActivePreset = 'flat';

function loadEqState() {
    try {
        const raw = localStorage.getItem(EQ_STORAGE_KEY);
        if (!raw) return;
        const parsed = JSON.parse(raw);
        if (parsed && Array.isArray(parsed.gains) && parsed.gains.length === EQ_BANDS.length) {
            eqGains = parsed.gains.map((g) => Number(g) || 0);
        }
        if (parsed && typeof parsed.enabled === 'boolean') {
            eqEnabled = parsed.enabled;
        }
        if (parsed && typeof parsed.preset === 'string') {
            eqActivePreset = parsed.preset;
        }
    } catch { }
}

function persistEqState() {
    try {
        localStorage.setItem(EQ_STORAGE_KEY, JSON.stringify({
            gains: eqGains,
            enabled: eqEnabled,
            preset: eqActivePreset,
        }));
    } catch { }
}

function applyStoredEqualizer() {
    const filters = typeof getEqFilters === 'function' ? getEqFilters() : [];
    filters.forEach((filter, i) => {
        filter.gain.value = eqEnabled ? (eqGains[i] || 0) : 0;
    });
}

function matchEqPresetKey() {
    return Object.keys(EQ_PRESETS).find((key) => (
        EQ_PRESETS[key].gains.every((g, i) => g === (eqGains[i] || 0))
    )) || null;
}

function setEqGain(index, value) {
    eqGains[index] = value;
    eqActivePreset = matchEqPresetKey() || 'custom';
    applyStoredEqualizer();
    persistEqState();
}

function setEqEnabled(enabled) {
    eqEnabled = enabled;
    applyStoredEqualizer();
    persistEqState();
    modal_title_up(enabled
        ? 'Equalizer on'
        : 'Equalizer off');
}

function applyEqPreset(name) {
    const preset = EQ_PRESETS[name];
    if (!preset) return;
    eqGains = [...preset.gains];
    eqActivePreset = name;
    applyStoredEqualizer();
    persistEqState();
}

function formatEqFreq(freq) {
    return freq >= 1000 ? `${freq / 1000}k` : `${freq}`;
}

function formatEqGain(value) {
    const n = Number(value) || 0;
    return n > 0 ? `+${n}` : `${n}`;
}

function updateEqPresetHighlight(root) {
    const matched = matchEqPresetKey();
    root.querySelectorAll('[data-eq-preset]').forEach((btn) => {
        btn.classList.toggle('active', !!matched && btn.getAttribute('data-eq-preset') === matched);
    });
}

function updateEqDisabledState(root) {
    const grid = root.querySelector('#eq_band_grid');
    const presets = root.querySelector('#eq_preset_grid');
    [grid, presets].forEach((el) => el?.classList.toggle('eq-disabled', !eqEnabled));
    root.querySelectorAll('.eq-band-slider, [data-eq-preset], #eq_reset').forEach((el) => {
        el.disabled = !eqEnabled;
    });
}

async function openEqualizerModal() {
    const presetButtons = Object.entries(EQ_PRESETS).map(([key, preset]) => (
        `<button type="button" class="eq-preset-button" data-eq-preset="${key}">${preset.label}</button>`
    )).join('');

    const bandSliders = EQ_BANDS.map((freq, i) => {
        const gain = eqGains[i] || 0;
        return `
            <div class="eq-band">
                <span class="eq-band-value" id="eq_value_${i}">${formatEqGain(gain)}</span>
                <input type="range" class="eq-band-slider" data-band-index="${i}" min="-12" max="12" step="1" value="${gain}">
                <span class="eq-band-freq">${formatEqFreq(freq)}</span>
            </div>
        `;
    }).join('');

    const modal = await msg(`
        <div class="equalizer-modal">
            <label class="eq-toggle-label">
                <input type="checkbox" id="eq_enabled_toggle" ${eqEnabled ? 'checked' : ''}>
                Running
            </label>
            <div class="eq-preset-grid" id="eq_preset_grid">
                ${presetButtons}
            </div>
            <div class="eq-band-grid" id="eq_band_grid">
                ${bandSliders}
            </div>
            <button id="eq_reset" type="button" class="sleep-timer-cancel-btn">Flat all</button>
            <br><small style="color: #888;">You should lower the volume for bass boost</small>
        </div>
    `, 'Equalizer');

    setTimeout(() => {
        const root = modal?.overlay || document;
        updateEqPresetHighlight(root);
        updateEqDisabledState(root);

        root.querySelector('#eq_enabled_toggle')?.addEventListener('change', (e) => {
            setEqEnabled(e.target.checked);
            updateEqDisabledState(root);
        });

        root.querySelectorAll('[data-eq-preset]').forEach((btn) => {
            btn.addEventListener('click', () => {
                const key = btn.getAttribute('data-eq-preset');
                applyEqPreset(key);
                root.querySelectorAll('.eq-band-slider').forEach((slider) => {
                    const i = Number(slider.getAttribute('data-band-index'));
                    slider.value = eqGains[i];
                    const valEl = root.querySelector(`#eq_value_${i}`);
                    if (valEl) valEl.textContent = formatEqGain(eqGains[i]);
                });
                updateEqPresetHighlight(root);
                modal_title_up(`Equalizer preset: ${EQ_PRESETS[key].label}`);
            });
        });

        root.querySelectorAll('.eq-band-slider').forEach((slider) => {
            slider.addEventListener('input', () => {
                const i = Number(slider.getAttribute('data-band-index'));
                const value = Number(slider.value);
                setEqGain(i, value);
                const valEl = root.querySelector(`#eq_value_${i}`);
                if (valEl) valEl.textContent = formatEqGain(value);
                updateEqPresetHighlight(root);
            });
        });

        root.querySelector('#eq_reset')?.addEventListener('click', () => {
            applyEqPreset('flat');
            root.querySelectorAll('.eq-band-slider').forEach((slider) => {
                const i = Number(slider.getAttribute('data-band-index'));
                slider.value = 0;
                const valEl = root.querySelector(`#eq_value_${i}`);
                if (valEl) valEl.textContent = '0';
            });
            updateEqPresetHighlight(root);
            modal_title_up('Equalizer reset');
        });
    }, 0);
}

loadEqState();
applyStoredEqualizer();

const equalizerTrigger = document.getElementById('open_equalizer_modal');
if (equalizerTrigger) {
    equalizerTrigger.addEventListener('click', debounce(() => {
        openEqualizerModal();
    }));
}

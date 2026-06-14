window.addEventListener('DOMContentLoaded', () => {
    (function settingsModal() {
        const THEMES = [
            { 'adaptive': true, 'label': 'Adaptive (EXPERIMENTAL)' },
            { 'dim': true, 'label': 'Dim' },
            { 'lights-out': true, 'label': 'Lights out' },
            { 'purple': true, 'label': 'Purple' },
            { 'high-contrast': true, 'label': 'High contrast' },
            { 'red': true, 'label': 'Red' },
            { 'blue': true, 'label': 'Blue' },
            { 'green': true, 'label': 'Green' },
            { 'light': true, 'label': 'Light' },
            { 'synthwave': true, 'label': 'Synthwave' },
            { 'neon-purple': true, 'label': 'Neon purple' },
            { 'neon-blue': true, 'label': 'Neon blue' },
            { 'paradise': true, 'label': 'Paradise' },
        ];

        const VIZ_OPTIONS = [
            { v: 'spectrum', l: 'Spectrum' },
            { v: 'waveform', l: 'Waveform' },
            { v: 'circular', l: 'Circular' },
            { v: 'super', l: 'Superscope' },
            { v: 'bravia', l: 'Bravia' },
            { v: 'none', l: 'Off' },
        ];
        const DEFAULT_ROTATION_INTERVAL = 5;
        const isElectronEnv = isElectron();
        const PREFERENCE_TOGGLES = [
            {
                key: 'soundEffects',
                label: 'Enable sound effects',
                description: 'For error messages and finished notifications',
            },
            {
                key: 'preventExit',
                label: 'Prevent exit',
                description: 'If you try closing Voxity, the browser will confirm leaving (this does not occur at all if installed as a PWA)',
            },
            {
                key: 'titleRotation',
                label: 'Enable title rotation',
                description: 'Rotate the tab title with current song metadata',
            },
            {
                key: 'staticSongTitle',
                label: 'Show static song title',
                description: 'If rotation is disabled, show info statically',
            },
            {
                key: 'autoLyrics',
                label: 'Load lyrics automatically',
                description: 'Automatically query lyrics when a track starts',
            },
            {
                key: 'songNotifications',
                label: 'System song notifications',
                description: 'Send a notification when the track changes',
                requiresPermission: 'notification',
            },
            {
                key: 'wakeLock',
                label: 'Acquire screen wakelock',
                description: 'Prevent the display from sleeping while playing audio'
            },
            {
                key: 'autoAccentColor',
                label: 'Set accent from cover',
                description: 'Derive the accent color from the dominant color in the current artwork <a href="/settings/auto-accent" class="voxity-settings-configure-accent">(config)</a>',
            },
            {
                key: 'dynamicFavicon',
                label: 'Make favicon cover art',
                description: 'Replace the browser tab icon with the current artwork',
                disableIfElectron: true,
                disabledNote: 'You are running the Electron version of Voxity',
            },
        ];
        const SHUFFLE_ACTIONS = [
            {
                key: 'jumble',
                label: 'Jumble the queue',
                note: 'Immediately reorder every song randomly without enabling shuffle functionality',
            },
            {
                key: 'shuffle',
                label: 'Enable normal queue shuffling',
                note: 'Toggle shuffle so upcoming tracks play in a random order',
            },
        ];
        const LYRICS_SOURCES = [
            {
                key: 'lrclib',
                label: 'LRCLIB.net',
                note: 'Stable, more precise lookups, but crowd-sourced, so could be wrong for lesser known songs <a href="/settings/lrclib" class="voxity-settings-configure">(config)</a>',
            },
            {
                key: 'musixmatch',
                label: 'Musixmatch.com',
                note: 'Unstable, less precise lookups, but professional enterprise lyrics, so spot-on for popular songs, rough for others',
            },
        ];

        async function openLrclibConfigModal() {
            const hasSettingsApi = typeof window !== 'undefined' && typeof window.VoxitySettings !== 'undefined';
            const current = hasSettingsApi ? (window.VoxitySettings.get('lrclibMode') || 'strict') : 'strict';
            const modal = await msg(`
                <div class="voxity-settings-modal">
                    <section class="voxity-settings-section">
                        <h3>Searching</h3>
                        <div class="voxity-settings-lyrics-options">
                            <label class="voxity-settings-lyrics-option" ${hasSettingsApi ? '' : ' data-disabled="true"'}>
                                <input type="radio" name="lrclib_mode" value="strict" ${current === 'strict' ? 'checked' : ''} ${hasSettingsApi ? '' : 'disabled'}>
                                <div>
                                    <strong>Strict</strong>
                                    <p class="voxity-settings-small">Use the full signature (title, artist, album, duration) for precise matches</p>
                                </div>
                            </label>
                            <label class="voxity-settings-lyrics-option" ${hasSettingsApi ? '' : ' data-disabled="true"'}>
                                <input type="radio" name="lrclib_mode" value="lax" ${current === 'lax' ? 'checked' : ''} ${hasSettingsApi ? '' : 'disabled'}>
                                <div>
                                    <strong>Lax</strong>
                                    <p class="voxity-settings-small">Search only by title and artist and pick the best match</p>
                                </div>
                            </label>
                        </div>
                    </section>
                        <small><a href="/settings" class="voxity-settings-back">Back to settings</a></small>
                </div>
            `, 'LRCLIB settings');
            setTimeout(() => {
                const radios = Array.from(document.querySelectorAll('input[name="lrclib_mode"]'));
                radios.forEach(r => {
                    r.addEventListener('change', () => {
                        if (!hasSettingsApi) return;
                        try { window.VoxitySettings.set('lrclibMode', r.value); } catch { }
                        try { modal_title_up(`LRCLIB mode: ${r.value === 'lax' ? 'Lax' : 'Strict'}`); } catch { }
                    });
                });
                const backLink = document.querySelector('.voxity-settings-back');
                if (backLink) {
                    backLink.addEventListener('click', (e) => {
                        e.preventDefault();
                        try { modal.close(); } catch { }
                        try { openSettingsModal(); } catch { }
                    });
                }
            }, 0);
        }

        async function openAutoAccentConfigModal() {
            const accentApi = (typeof window !== 'undefined' && window.VoxityAccents) ? window.VoxityAccents.config : null;
            const hasApi = !!accentApi;
            const fields = hasApi ? accentApi.fields : [];
            const fieldsHtml = fields.map(field => {
                const value = accentApi.get(field.key);
                return `
                    <div class="voxity-settings-field">
                        <label for="accent_cfg_${field.key}">${field.label}</label>
                        <div class="voxity-settings-slider">
                            <input type="range" id="accent_cfg_${field.key}" min="${field.min}" max="${field.max}" step="${field.step}" value="${value}">
                            <input type="number" id="accent_cfg_${field.key}_number" min="${field.min}" max="${field.max}" step="${field.step}" value="${value}" class="voxity-settings-control voxity-settings-number">
                        </div>
                        ${field.description ? `<small class="voxity-settings-small">${field.description}</small>` : ''}
                    </div>`;
            }).join('');
            const modal = await msg(`
                <div class="voxity-settings-modal">
                    <section class="voxity-settings-section">
                        <p class="voxity-settings-note">Only change these if you know what you're doing.</p>
                        ${hasApi ? '' : '<p class="voxity-settings-note">Not allowed</p>'}
                        ${hasApi && accentApi.presets?.length ? `
                        <div class="voxity-settings-field">
                            <label for="accent_cfg_preset">Presets</label>
                            <select id="accent_cfg_preset" class="voxity-settings-control">
                                <option value="">Choose a preset...</option>
                                ${accentApi.presets.map(preset => `<option value="${preset.name}">${preset.name}</option>`).join('')}
                            </select>
                        </div>` : ''}
                        ${fieldsHtml}
                        <div style="margin-top:0.5rem;">
                            <button type="button" class="bu" id="accent_cfg_reset" style="background:var(--btn-bg);color:var(--fg);" ${hasApi ? '' : 'disabled'}>Reset to defaults</button>
                        </div>
                    </section>
                    <small><a href="/settings" class="voxity-settings-back">Back to settings</a></small>
                </div>
            `, 'Accent finder settings');
            setTimeout(() => {
                if (hasApi) {
                    const refreshInputs = () => {
                        fields.forEach(field => {
                            const slider = document.getElementById(`accent_cfg_${field.key}`);
                            const number = document.getElementById(`accent_cfg_${field.key}_number`);
                            const applied = accentApi.get(field.key);
                            if (slider) slider.value = applied;
                            if (number) number.value = applied;
                        });
                    };
                    fields.forEach(field => {
                        const slider = document.getElementById(`accent_cfg_${field.key}`);
                        const number = document.getElementById(`accent_cfg_${field.key}_number`);
                        if (!slider || !number) return;
                        const sync = (raw, announce = false) => {
                            let num = Number(raw);
                            if (!Number.isFinite(num)) num = accentApi.get(field.key);
                            num = Math.min(field.max, Math.max(field.min, num));
                            accentApi.set(field.key, num);
                            const applied = accentApi.get(field.key);
                            slider.value = applied;
                            number.value = applied;
                            if (announce) { try { modal_title_up(`${field.label}: ${applied}`); } catch { } }
                        };
                        slider.addEventListener('input', () => sync(slider.value, true));
                        number.addEventListener('change', () => sync(number.value, true));
                    });
                    const presetSelect = document.getElementById('accent_cfg_preset');
                    if (presetSelect) {
                        presetSelect.addEventListener('change', () => {
                            const name = presetSelect.value;
                            if (!name) return;
                            if (accentApi.applyPreset(name)) {
                                refreshInputs();
                                try { modal_title_up(`Preset: ${name}`); } catch { }
                            }
                        });
                    }
                    const resetBtn = document.getElementById('accent_cfg_reset');
                    if (resetBtn) {
                        resetBtn.addEventListener('click', () => {
                            accentApi.reset();
                            refreshInputs();
                            try { modal_title_up('Reset to defaults'); } catch { }
                        });
                    }
                }
                const backLink = document.querySelector('.voxity-settings-back');
                if (backLink) {
                    backLink.addEventListener('click', (e) => {
                        e.preventDefault();
                        try { modal.close(); } catch { }
                        try { openSettingsModal(); } catch { }
                    });
                }
            }, 0);
        }
        const key = 'au_theme';
        const ACCENT_COLOR_STORAGE_KEY = 'au_accent_color';
        const DEFAULT_ACCENT_COLOR = '#8000ff';
        const btn = document.getElementById('settings');
        let currentTheme = 'purple';

        const normalizeAccentColor = (value) => {
            if (typeof value !== 'string') return null;
            const trimmed = value.trim();
            if (!trimmed) return null;
            return /^#[0-9a-f]{3,8}$/i.test(trimmed) ? trimmed.toLowerCase() : null;
        };

        const getStoredAccentColor = () => {
            try {
                return normalizeAccentColor(localStorage.getItem(ACCENT_COLOR_STORAGE_KEY));
            } catch {
                return null;
            }
        };

        const getInlineAccentColor = () => normalizeAccentColor(document.documentElement.style.getPropertyValue('--lyric-color'));

        const getComputedAccentColor = () => {
            try {
                if (typeof window === 'undefined' || typeof window.getComputedStyle !== 'function') return null;
                return normalizeAccentColor(window.getComputedStyle(document.documentElement).getPropertyValue('--lyric-color'));
            } catch {
                return null;
            }
        };

        const resolveAccentColor = () => getStoredAccentColor() || getInlineAccentColor() || getComputedAccentColor() || DEFAULT_ACCENT_COLOR;

        const applyAccentColor = (value, { persist = false } = {}) => {
            const normalized = normalizeAccentColor(value);
            if (!normalized) return null;
            document.documentElement.style.setProperty('--lyric-color', normalized);
            try { viz_color = normalized; } catch { }
            if (persist) {
                try { localStorage.setItem(ACCENT_COLOR_STORAGE_KEY, normalized); } catch { }
            }
            return normalized;
        };

        const resetAccentColorToTheme = () => {
            try { document.documentElement.style.removeProperty('--lyric-color'); } catch { }
            try { localStorage.removeItem(ACCENT_COLOR_STORAGE_KEY); } catch { }
            let normalized = getComputedAccentColor();
            if (!normalized) {
                normalized = DEFAULT_ACCENT_COLOR;
            }
            try { viz_color = normalized; } catch { }
            try {
                const visualizer = document.getElementById('visualizer');
                if (visualizer) {
                    visualizer.style.removeProperty('background-color');
                }
            } catch { }
            return normalized;
        };

        const applyPreferredAccentColor = () => {
            const stored = getStoredAccentColor();
            if (stored) {
                return applyAccentColor(stored);
            }
            return resetAccentColorToTheme();
        };

        const AutoAccentController = (() => {
            let latestArtworkSrc = '';
            let currentRequestToken = 0;

            const isPreferenceEnabled = () => {
                if (typeof window === 'undefined' || typeof window.VoxitySettings === 'undefined') {
                    return false;
                }
                return !!window.VoxitySettings.isEnabled('autoAccentColor');
            };

            const loadImage = (src) => new Promise((resolve, reject) => {
                if (!src) {
                    reject(new Error('Missing artwork source'));
                    return;
                }
                try {
                    const image = new Image();
                    image.crossOrigin = 'anonymous';
                    image.onload = () => resolve(image);
                    image.onerror = reject;
                    image.src = src;
                } catch (err) {
                    reject(err);
                }
            });

            const applyFromSource = async (src, token) => {
                try {
                    const image = await loadImage(src);
                    if (token !== currentRequestToken) return;
                    const detected = getDominantAccent(image);
                    if (!detected) {
                        applyPreferredAccentColor();
                        return;
                    }
                    applyAccentColor(detected, { persist: false });
                } catch {
                    if (token === currentRequestToken) {
                        applyPreferredAccentColor();
                    }
                }
            };

            const queueApply = (src) => {
                currentRequestToken += 1;
                const token = currentRequestToken;
                applyFromSource(src, token);
            };

            const getLatestArtworkSrc = () => {
                if (latestArtworkSrc) return latestArtworkSrc;
                try {
                    if (typeof globalart !== 'undefined' && globalart) return globalart;
                } catch { }
                return '';
            };

            const getPalette = async ({ limit = 5, src = '' } = {}) => {
                const artworkSrc = src || getLatestArtworkSrc();
                if (!artworkSrc) return [];
                const image = await loadImage(artworkSrc);
                return getAccents(image, { limit });
            };

            const handleArtwork = (src) => {
                latestArtworkSrc = src || '';
                if (!src) {
                    applyPreferredAccentColor();
                    return;
                }
                if (!isPreferenceEnabled()) {
                    return;
                }
                queueApply(src);
            };

            const syncPreference = () => {
                if (!isPreferenceEnabled()) {
                    applyPreferredAccentColor();
                    return;
                }
                if (latestArtworkSrc) {
                    queueApply(latestArtworkSrc);
                    return;
                }
                applyPreferredAccentColor();
            };

            return {
                getLatestArtworkSrc,
                getPalette,
                handleArtwork,
                syncPreference,
            };
        })();

        if (typeof window !== 'undefined') {
            window.VoxityAutoAccent = AutoAccentController;
        }
        try {
            if (typeof globalart !== 'undefined' && globalart) {
                AutoAccentController.handleArtwork(globalart);
            }
        } catch { }

        document.addEventListener('voxity:settings-changed', (event) => {
            try {
                const detail = event?.detail || {};
                if (detail.key === 'autoAccentColor' || detail.key === '*') {
                    AutoAccentController.syncPreference();
                }
            } catch { }
        });

        const storedAccent = getStoredAccentColor();
        if (storedAccent) {
            applyAccentColor(storedAccent);
        }

        const getThemeName = (themeObj) => Object.keys(themeObj).find(key => key !== 'label') || '';
        const getThemeLabel = (themeName) => {
            const found = THEMES.find(themeObj => getThemeName(themeObj) === themeName);
            return found?.label || themeName.replace(/-/g, ' ');
        };

        async function openCoverAccentPaletteModal({ accentInput = null } = {}) {
            const hasTrack = (() => {
                try {
                    if (typeof cur_file !== 'undefined' && cur_file) return true;
                } catch { }
                try {
                    const player = document.getElementById('player');
                    return !!player?.src;
                } catch {
                    return false;
                }
            })();
            if (!hasTrack) {
                throw_error('No track playing!');
                return null;
            }
            const artworkSrc = AutoAccentController.getLatestArtworkSrc();
            if (!artworkSrc) {
                throw_error('This track has no cover');
                return null;
            }
            const paletteModal = await msg(`Reading...`, 'Pick accent from cover');
            try {
                const palette = await AutoAccentController.getPalette({ limit: 5, src: artworkSrc });
                if (!palette.length) {
                    paletteModal.setContent(`No colors are available for this track yet`);
                    return paletteModal;
                }
                paletteModal.setContent(`
                    <div class="voxity-cover-accent-modal">
                        <div class="voxity-cover-accent-grid">
                            ${palette.map(color => `
                                <button type="button" class="voxity-cover-accent-swatch" data-color="${color}" style="--swatch-color: ${color};" aria-label="Use ${color} as accent color">
                                    <span>${color}</span>
                                </button>
                            `).join('')}
                        </div>
                    </div>
                `);
                const swatches = Array.from(paletteModal.overlay.querySelectorAll('.voxity-cover-accent-swatch'));
                swatches.forEach(swatch => {
                    swatch.addEventListener('click', () => {
                        const applied = applyAccentColor(swatch.dataset.color, { persist: true });
                        if (!applied) return;
                        if (accentInput) {
                            accentInput.value = applied;
                        }
                        try { paletteModal.close(); } catch { }
                        setTimeout(() => {
                            try { modal_title_up(`Accent color set to ${applied}`); } catch { }
                        }, 260);
                    });
                });
                return paletteModal;
            } catch {
                paletteModal.setContent(`
                    Couldn't sample any colors from the cover
                `);
                return paletteModal;
            }
        }

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

        async function openSettingsModal({ focusViz = false } = {}) {
            const current = document.documentElement.getAttribute('data-theme') || currentTheme;
            const currentViz = (typeof window.VoxitySettings !== 'undefined' ? window.VoxitySettings.get('visualizer') : null)
                || document.getElementById('viz-mode')?.value
                || 'spectrum';
            const accentValue = resolveAccentColor();
            const hasSettingsApi = typeof window.VoxitySettings !== 'undefined';
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
            const vizBgOpacityValue = (function () {
                try {
                    const stored = parseInt(localStorage.getItem('au_viz_bg_opacity'));
                    if (!isNaN(stored) && stored >= 0 && stored <= 100) return stored;
                } catch (e) { }
                return 100;
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
            const rotationIntervalValue = (function () {
                if (!hasSettingsApi) return DEFAULT_ROTATION_INTERVAL;
                const stored = Number(window.VoxitySettings.get('titleRotationInterval'));
                if (!Number.isFinite(stored)) return DEFAULT_ROTATION_INTERVAL;
                return Math.min(240, Math.max(1, Math.round(stored)));
            })();
            const selectedLyricsSource = (function () {
                if (!hasSettingsApi) return 'lrclib';
                const stored = window.VoxitySettings.get('lyricsSource');
                return stored === 'musixmatch' ? 'musixmatch' : 'lrclib';
            })();
            const selectedShuffleAction = (function () {
                if (!hasSettingsApi) return 'shuffle';
                const stored = window.VoxitySettings.get('shuffleButtonAction');
                return stored === 'jumble' ? 'jumble' : 'shuffle';
            })();
            const supportsWakeLock = typeof navigator !== 'undefined' && 'wakeLock' in navigator;
            const modal = await msg(`
                <div class="voxity-settings-modal">
                    <section class="voxity-settings-section">
                        <h3>Appearance</h3>
                        <div class="voxity-settings-field">
                            <label for="theme_select">Theme</label>
                            <select id="theme_select" class="voxity-settings-control">
                                ${THEMES.map(t => {
                const themeName = getThemeName(t);
                if (!themeName) return '';
                const label = t.label;
                const selected = current === themeName ? 'selected' : '';
                return `<option value="${themeName}" ${selected}>${label}</option>`;
            }).join('')}
                            </select>
                        </div>
                        <div class="voxity-settings-field">
                            <label for="accent_color">Accent color</label>
                            <div class="voxity-settings-color-row">
                                <input id="accent_color" type="color" value="${accentValue}" class="voxity-settings-control voxity-settings-color">
                                <button type="button" id="accent_color_reset" class="voxity-settings-reset" title="Reset to the current theme default" aria-label="Reset accent color to default"><i class="fa-solid fa-arrow-rotate-left"></i></button>
                            </div>
                            <small><a href="/settings/accent-from-cover" id="accent_from_cover" class="voxity-settings-cover-link">Pick from cover...</a></small>
                        </div>
                    </section>
                    <section class="voxity-settings-section">
                        <h3>Audio feedback</h3>
                        <div class="voxity-settings-field">
                            <label for="vizmode_select">Visualizer mode</label>
                            <select id="vizmode_select" class="voxity-settings-control">
                                ${VIZ_OPTIONS.map(o => `<option value="${o.v}" ${o.v === currentViz ? 'selected' : ''}>${o.l}</option>`).join('')}
                            </select>
                        </div>
                        <div class="voxity-settings-field">
                            <label for="fps_slider">Visualizer FPS</label>
                            <div class="voxity-settings-slider">
                                <input id="fps_slider" type="range" min="1" max="300" value="${fpsValue}">
                                <input id="fps_number" type="number" min="1" max="300" value="${fpsValue}" class="voxity-settings-control voxity-settings-number">
                            </div>
                        </div>
                        <div class="voxity-settings-field">
                            <label for="vizbg_slider">Visualizer background opacity</label>
                            <div class="voxity-settings-slider">
                                <input id="vizbg_slider" type="range" min="0" max="100" value="${vizBgOpacityValue}">
                                <input id="vizbg_number" type="number" min="0" max="100" value="${vizBgOpacityValue}" class="voxity-settings-control voxity-settings-number">
                            </div>
                        </div>
                        <div class="voxity-settings-field">
                            <label for="lrc_slider">Lyrics amount</label>
                            <div class="voxity-settings-slider">
                                <input id="lrc_slider" type="range" min="1" max="48" value="${lrcValue}">
                                <input id="lrc_number" type="number" min="1" max="48" value="${lrcValue}" class="voxity-settings-control voxity-settings-number">
                            </div>
                        </div>
                        <div class="voxity-settings-field">
                            <label for="pref_titleRotationInterval">Tab title rotation speed</label>
                            <div class="voxity-settings-slider">
                                <input type="range" id="pref_titleRotationInterval" min="1" max="240" value="${rotationIntervalValue}" ${hasSettingsApi ? '' : 'disabled'}>
                                <input type="number" id="pref_titleRotationInterval_number" min="1" max="240" value="${rotationIntervalValue}" class="voxity-settings-control voxity-settings-number" ${hasSettingsApi ? '' : 'disabled'}>
                            </div>
                        </div>
                    </section>
                    <section class="voxity-settings-section">
                        <h3>Preferences</h3>
                        ${hasSettingsApi ? '' : '<p class="voxity-settings-note">Not allowed</p>'}
                        <div class="voxity-settings-toggles">
                            ${PREFERENCE_TOGGLES.map(toggle => {
                const checked = hasSettingsApi && window.VoxitySettings.isEnabled(toggle.key) ? 'checked' : '';
                const disabledBySettings = !hasSettingsApi;
                const disabledByElectron = toggle.disableIfElectron && isElectronEnv;
                const disabled = (disabledBySettings || disabledByElectron) ? 'disabled' : '';
                const supportMessages = [];
                if (toggle.key === 'wakeLock' && !supportsWakeLock) {
                    supportMessages.push('<p class="voxity-settings-small">Wake Lock API not supported in this browser</p>');
                }
                if (disabledByElectron && toggle.disabledNote) {
                    supportMessages.push(`<p class="voxity-settings-small">${toggle.disabledNote}</p>`);
                }
                const supportMessage = supportMessages.join('');
                const wrapperDisabledAttr = (disabledBySettings || disabledByElectron) ? ' data-disabled="true"' : '';
                const disabledTitleAttr = disabledByElectron && toggle.disabledNote ? ` title="${toggle.disabledNote}"` : '';
                return `<div class="voxity-settings-toggle"${wrapperDisabledAttr}${disabledTitleAttr}>
                                            <input type="checkbox" id="pref_${toggle.key}" ${checked} ${disabled}>
                                            <div>
                                                <label for="pref_${toggle.key}">${toggle.label}</label>
                                                <p>${toggle.description}</p>
                                                ${supportMessage}
                                            </div>
                                        </div>`;
            }).join('')}
                        </div>
                        <div class="voxity-settings-field">
                            <label>Lyrics source</label>
                            <div class="voxity-settings-lyrics-options">
                                ${LYRICS_SOURCES.map(source => {
                const checked = source.key === selectedLyricsSource ? 'checked' : '';
                const disabled = hasSettingsApi ? '' : 'disabled';
                return `<label class="voxity-settings-lyrics-option"${hasSettingsApi ? '' : ' data-disabled="true"'}>
                                                    <input type="radio" name="lyrics_source" value="${source.key}" data-label="${source.label}" ${checked} ${disabled}>
                                                    <div>
                                                        <strong>${source.label}</strong>
                                                        <p class="voxity-settings-small">${source.note}</p>
                                                    </div>
                                                </label>`;
            }).join('')}
                            </div>
                        </div>
                        <div class="voxity-settings-field">
                            <label>What should the shuffle button do?</label>
                            <div class="voxity-settings-lyrics-options">
                                ${SHUFFLE_ACTIONS.map(action => {
                const checked = action.key === selectedShuffleAction ? 'checked' : '';
                const disabled = hasSettingsApi ? '' : 'disabled';
                return `<label class="voxity-settings-lyrics-option"${hasSettingsApi ? '' : ' data-disabled="true"'}>
                                                    <input type="radio" name="shuffle_action" value="${action.key}" data-label="${action.label}" ${checked} ${disabled}>
                                                    <div>
                                                        <strong>${action.label}</strong>
                                                        <p class="voxity-settings-small">${action.note}</p>
                                                    </div>
                                                </label>`;
            }).join('')}
                            </div>
                        </div>
                    </section>
                    <small><a href="/i/reload_fa" onclick="event.preventDefault(); loadFA()">Icons are not showing...</a> - <a href="/i/welcome" onclick="event.preventDefault();closeTopModal(); welcome()">Show welcome modal</a> - <a href="/i/toys" onclick="event.preventDefault();closeTopModal(); openToysModal()">Toys</a><br><a href="/i/foundmedia" onclick="event.preventDefault();closeTopModal(); openImageAccentPickerModal()">Open image accent picker</a></small>
                </div>
            `, 'Voxity settings');

            setTimeout(() => {
                const select = document.getElementById('theme_select');
                const acin = document.getElementById('accent_color');
                const accentResetBtn = document.getElementById('accent_color_reset');
                const accentFromCoverLink = document.getElementById('accent_from_cover');
                const vizSelect = document.getElementById('vizmode_select');
                const hiddenViz = document.getElementById('viz-mode');
                const fpsSlider = document.getElementById('fps_slider');
                const fpsNumber = document.getElementById('fps_number');
                const vizBgSlider = document.getElementById('vizbg_slider');
                const vizBgNumber = document.getElementById('vizbg_number');
                const lrcSlider = document.getElementById('lrc_slider');
                const lrcNumber = document.getElementById('lrc_number');
                const rotationSlider = document.getElementById('pref_titleRotationInterval');
                const rotationNumber = document.getElementById('pref_titleRotationInterval_number');
                const settingsApi = typeof window.VoxitySettings !== 'undefined' ? window.VoxitySettings : null;
                const lyricsSourceInputs = Array.from(document.querySelectorAll('input[name="lyrics_source"]'));
                const shuffleActionInputs = Array.from(document.querySelectorAll('input[name="shuffle_action"]'));
                const configureLinks = Array.from(document.querySelectorAll('.voxity-settings-configure'));
                configureLinks.forEach(link => {
                    link.addEventListener('click', (e) => {
                        e.preventDefault();
                        try { closeTopModal(); } catch { }
                        try { openLrclibConfigModal(); } catch { }
                    });
                });

                const accentConfigLinks = Array.from(document.querySelectorAll('.voxity-settings-configure-accent'));
                accentConfigLinks.forEach(link => {
                    link.addEventListener('click', (e) => {
                        e.preventDefault();
                        try { closeTopModal(); } catch { }
                        try { openAutoAccentConfigModal(); } catch { }
                    });
                });

                const requestNotificationPermission = async () => {
                    if (typeof window === 'undefined' || typeof Notification === 'undefined') {
                        throw_error('This browser does not seem to support notifications', 2);
                        return false;
                    }
                    if (Notification.permission === 'granted') {
                        return true;
                    }
                    if (Notification.permission === 'denied') {
                        throw_error('You blocked notifications!!!11!11!!');
                        return false;
                    }
                    try {
                        const result = await Notification.requestPermission();
                        if (result !== 'granted') {
                            throw_error('You disallowed notifications!!!11!11!!', false);
                        }
                        return result === 'granted';
                    } catch {
                        throw_error('Something failed enabling notifications, why not try again?', 2);
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
                        if (acin) {
                            const nextAccent = resolveAccentColor();
                            if (nextAccent) {
                                acin.value = nextAccent;
                            }
                        }
                    });
                }

                if (acin) {
                    acin.addEventListener('input', () => {
                        const applied = applyAccentColor(acin.value, { persist: true });
                        if (applied) {
                            modal_title_up(`Accent color set to ${applied}`);
                        }
                    });
                }

                if (accentResetBtn) {
                    accentResetBtn.addEventListener('click', () => {
                        const resetValue = resetAccentColorToTheme();
                        if (resetValue && acin) {
                            acin.value = resetValue;
                        }
                        if (resetValue) {
                            modal_title_up(`Accent color reset to ${resetValue}`);
                        }
                    });
                }

                if (accentFromCoverLink) {
                    accentFromCoverLink.addEventListener('click', (e) => {
                        e.preventDefault();
                        openCoverAccentPaletteModal({ accentInput: acin });
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
                        try { window.VoxitySettings?.set('visualizer', vizSelect.value); } catch { }
                        modal_title_up(`Visualizer mode: ${vizSelect.options[vizSelect.selectedIndex]?.text || vizSelect.value}`, true);
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
                        try { modal_title_up(`Visualizer FPS: ${val}`); } catch { }
                    };

                    fpsSlider.addEventListener('input', () => syncFPS(fpsSlider.value));
                    fpsNumber.addEventListener('change', () => syncFPS(fpsNumber.value));
                }

                if (vizBgSlider && vizBgNumber) {
                    const syncVizBg = (v) => {
                        const num = parseInt(v, 10);
                        const val = (isNaN(num) ? 100 : Math.max(0, Math.min(100, num)));
                        try { vizBgSlider.value = val; } catch { }
                        try { vizBgNumber.value = val; } catch { }
                        try { document.documentElement.style.setProperty('--visualizer-bg-opacity', String(val / 100)); } catch { }
                        try { localStorage.setItem('au_viz_bg_opacity', String(val)); } catch { }
                        try { modal_title_up(`Visualizer background opacity: ${val}%`); } catch { }
                    };

                    vizBgSlider.addEventListener('input', () => syncVizBg(vizBgSlider.value));
                    vizBgNumber.addEventListener('change', () => syncVizBg(vizBgNumber.value));
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
                        try { modal_title_up(`Showing up to ${val} lines`); } catch { }
                    };

                    lrcSlider.addEventListener('input', () => syncLRC(lrcSlider.value));
                    lrcNumber.addEventListener('change', () => syncLRC(lrcNumber.value));
                }

                if (settingsApi) {
                    const normalizeLyricsSource = (value) => value === 'musixmatch' ? 'musixmatch' : 'lrclib';
                    const syncLyricsSourceInputs = (value) => {
                        const normalized = normalizeLyricsSource(value);
                        lyricsSourceInputs.forEach(input => {
                            input.checked = input.value === normalized;
                        });
                        return normalized;
                    };
                    const ensureWakeLockPreference = async (checked) => {
                        const controller = typeof window !== 'undefined' ? window.VoxityWakeLock : null;
                        if (!controller) {
                            if (checked) {
                                throw_error('Wake locks are not available right now', 2);
                                return false;
                            }
                            return true;
                        }
                        if (checked) {
                            if (!controller.supported()) {
                                throw_error('Wake locks are not supported in this browser!', 2);
                                return false;
                            }
                            return controller.enable();
                        }
                        await controller.disable();
                        return true;
                    };

                    if (lyricsSourceInputs.length) {
                        syncLyricsSourceInputs(settingsApi.get('lyricsSource'));
                        lyricsSourceInputs.forEach(input => {
                            input.addEventListener('change', () => {
                                if (!input.checked) return;
                                const normalized = syncLyricsSourceInputs(input.value);
                                settingsApi.set('lyricsSource', normalized);
                                try {
                                    const label = input.dataset.label || normalized;
                                    modal_title_up(`Lyrics source: ${label}`);
                                } catch { }
                            });
                        });
                    }

                    if (shuffleActionInputs.length) {
                        shuffleActionInputs.forEach(input => {
                            input.addEventListener('change', () => {
                                if (!input.checked) return;
                                const normalized = input.value === 'jumble' ? 'jumble' : 'shuffle';
                                settingsApi.set('shuffleButtonAction', normalized);
                                try {
                                    modal_title_up(`Shuffle mode: ${normalized}`);
                                } catch { }
                            });
                        });
                    }

                    PREFERENCE_TOGGLES.forEach(toggle => {
                        const input = document.getElementById(`pref_${toggle.key}`);
                        if (!input) return;
                        input.checked = settingsApi.isEnabled(toggle.key);
                        if (input.disabled) return;
                        input.addEventListener('change', async () => {
                            if (toggle.requiresPermission === 'notification' && input.checked) {
                                const granted = await requestNotificationPermission();
                                if (!granted) {
                                    input.checked = false;
                                    return;
                                }
                            }
                            if (toggle.key === 'wakeLock') {
                                const wakeLockAllowed = await ensureWakeLockPreference(input.checked);
                                if (!wakeLockAllowed) {
                                    input.checked = false;
                                    return;
                                }
                            }
                            settingsApi.set(toggle.key, input.checked);
                        });
                    });

                    if (rotationSlider && rotationNumber) {
                        const clampInterval = (value) => {
                            const num = Number(value);
                            if (!Number.isFinite(num)) return DEFAULT_ROTATION_INTERVAL;
                            return Math.min(240, Math.max(1, Math.round(num)));
                        };
                        const syncRotationInputs = (value, { announce = false } = {}) => {
                            const normalized = clampInterval(value);
                            rotationSlider.value = normalized;
                            rotationNumber.value = normalized;
                            if (announce) {
                                try {
                                    modal_title_up(`Title rotation speed: ${normalized}s`);
                                } catch { }
                            }
                            return normalized;
                        };
                        const persistRotationInterval = (value, { announce = false } = {}) => {
                            const normalized = syncRotationInputs(value, { announce });
                            settingsApi.set('titleRotationInterval', normalized);
                        };

                        syncRotationInputs(rotationSlider.value);
                        rotationSlider.addEventListener('input', () => {
                            syncRotationInputs(rotationSlider.value, { announce: true });
                        });
                        rotationSlider.addEventListener('change', () => {
                            persistRotationInterval(rotationSlider.value);
                        });
                        rotationNumber.addEventListener('change', () => {
                            persistRotationInterval(rotationNumber.value, { announce: true });
                        });
                    }
                }

                updateSleepTimerUi();
            }, 0);
        }
        try {
            if (typeof window !== 'undefined') {
                window.openSettingsModal = openSettingsModal;
            }
        } catch { }

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
            const bgOpacity = parseInt(localStorage.getItem('au_viz_bg_opacity'));
            if (!isNaN(bgOpacity)) {
                const clamped = Math.max(0, Math.min(100, bgOpacity));
                document.documentElement.style.setProperty('--visualizer-bg-opacity', String(clamped / 100));
            }
        } catch { }

        try {
            const la = parseInt(localStorage.getItem('au_lrc_amount'));
            if (!isNaN(la)) {
                const clamped = Math.max(1, Math.min(48, la));
                try { lrc_amount = clamped; } catch { }
            }
        } catch { }

        try {
            const savedViz = window.VoxitySettings?.get('visualizer');
            const hiddenViz = document.getElementById('viz-mode');
            if (savedViz && hiddenViz) {
                hiddenViz.value = savedViz;
                hiddenViz.dispatchEvent(new Event('change', { bubbles: true }));
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

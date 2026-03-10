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
            { 'neon-blue': true, 'label': 'Neon blue' },
            { 'paradise': true, 'label': 'Paradise' },
        ];

        const VIZ_OPTIONS = [
            { v: 'spectrum', l: 'Spectrum' },
            { v: 'waveform', l: 'Waveform' },
            { v: 'circular', l: 'Circular' },
            { v: 'none', l: 'Off' },
        ];
        const DEFAULT_ROTATION_INTERVAL = 5;
        const PREFERENCE_TOGGLES = [
            {
                key: 'soundEffects',
                label: 'Enable sound effects',
                description: 'For error messages and finished notifications',
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
                description: 'Derive the accent color from the dominant color in the current artwork',
            },
        ];
        const LYRICS_SOURCES = [
            {
                key: 'lrclib',
                label: 'LRCLIB.net',
                note: 'Stable, more precise lookups, but crowd-sourced, so could be wrong for lesser known songs',
            },
            {
                key: 'musixmatch',
                label: 'Musixmatch.com',
                note: 'Unstable, less precise lookups, but professional enterprise lyrics, so spot-on for popular songs, rough for others',
            },
        ];
        const key = 'au_theme';
        const ACCENT_COLOR_STORAGE_KEY = 'au_accent_color';
        const DEFAULT_ACCENT_COLOR = '#8000ff';
        const btn = document.getElementById('settings');
        let currentTheme = 'lights-out';

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
            try {
                const visualizer = document.getElementById('visualizer');
                if (visualizer) {
                    visualizer.style.backgroundColor = normalized;
                }
            } catch { }
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
            const CANVAS_SIZE = 128;
            const MAX_TRACKED_COLORS = 40;
            const MIN_DOMINANCE_GAP = 5;
            const RICH_PALETTE_THRESHOLD = 15;
            const MIN_COLOR_SATURATION = 0.2;
            const MIN_COLOR_LUMINANCE = 0.3;
            const MAX_COLOR_LUMINANCE = 0.92;
            let canvas = null;
            let ctx = null;
            let latestArtworkSrc = '';
            let currentRequestToken = 0;

            const ensureContext = () => {
                if (ctx) return ctx;
                try {
                    canvas = document.createElement('canvas');
                    canvas.width = CANVAS_SIZE;
                    canvas.height = CANVAS_SIZE;
                    ctx = canvas.getContext('2d', { willReadFrequently: true }) || canvas.getContext('2d');
                } catch {
                    canvas = null;
                    ctx = null;
                }
                return ctx;
            };

            const isPreferenceEnabled = () => {
                if (typeof window === 'undefined' || typeof window.VoxitySettings === 'undefined') {
                    return false;
                }
                return !!window.VoxitySettings.isEnabled('autoAccentColor');
            };

            const toHex = (value) => value.toString(16).padStart(2, '0');
            const clampByte = (value) => Math.max(0, Math.min(255, Math.round(value)));

            const lightenColor = (hex) => {
                if (typeof hex !== 'string') return null;
                const normalized = hex.trim().replace(/^#/, '');
                if (!/^[0-9a-f]{3,8}$/i.test(normalized)) return null;
                const expanded = normalized.length === 3
                    ? normalized.split('').map(ch => ch + ch).join('')
                    : normalized.slice(0, 6);
                const r = parseInt(expanded.slice(0, 2), 16);
                const g = parseInt(expanded.slice(2, 4), 16);
                const b = parseInt(expanded.slice(4, 6), 16);
                const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
                const MIN_LUMINANCE = 0.7;
                if (luminance >= MIN_LUMINANCE || luminance >= 0.99) {
                    return `#${expanded}`;
                }
                const factor = Math.min(1, (MIN_LUMINANCE - luminance) / (1 - luminance));
                const lightR = clampByte(r + ((255 - r) * factor));
                const lightG = clampByte(g + ((255 - g) * factor));
                const lightB = clampByte(b + ((255 - b) * factor));
                return `#${toHex(lightR)}${toHex(lightG)}${toHex(lightB)}`;
            };

            const getColorInfo = (bucket) => {
                if (!bucket || !bucket.count) return null;
                const avgR = Math.round(bucket.r / bucket.count);
                const avgG = Math.round(bucket.g / bucket.count);
                const avgB = Math.round(bucket.b / bucket.count);
                const rNorm = avgR / 255;
                const gNorm = avgG / 255;
                const bNorm = avgB / 255;
                const max = Math.max(rNorm, gNorm, bNorm);
                const min = Math.min(rNorm, gNorm, bNorm);
                const luminance = 0.2126 * rNorm + 0.7152 * gNorm + 0.0722 * bNorm;
                let saturation = 0;
                if (max !== min) {
                    const l = (max + min) / 2;
                    const delta = max - min;
                    if (l > 0.5) {
                        const denom = 2 - max - min;
                        saturation = denom === 0 ? 0 : delta / denom;
                    } else {
                        const denom = max + min;
                        saturation = denom === 0 ? 0 : delta / denom;
                    }
                }
                return {
                    bucket,
                    hex: `#${toHex(avgR)}${toHex(avgG)}${toHex(avgB)}`,
                    luminance,
                    saturation,
                };
            };

            const analyzeImageElement = (img) => {
                const context = ensureContext();
                if (!context || !canvas) return null;
                try {
                    context.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
                    context.drawImage(img, 0, 0, CANVAS_SIZE, CANVAS_SIZE);
                    const imageData = context.getImageData(0, 0, CANVAS_SIZE, CANVAS_SIZE);
                    const buckets = new Map();
                    const data = imageData.data;
                    for (let i = 0; i < data.length; i += 4) {
                        const alpha = data[i + 3];
                        if (alpha < 32) continue;
                        const r = data[i];
                        const g = data[i + 1];
                        const b = data[i + 2];
                        const key = `${r >> 4}-${g >> 4}-${b >> 4}`;
                        let bucket = buckets.get(key);
                        if (!bucket) {
                            bucket = { count: 0, r: 0, g: 0, b: 0 };
                            buckets.set(key, bucket);
                        }
                        bucket.count += 1;
                        bucket.r += r;
                        bucket.g += g;
                        bucket.b += b;
                    }
                    if (!buckets.size) return null;
                    const sortedBuckets = [...buckets.values()]
                        .sort((a, b) => b.count - a.count)
                        .slice(0, MAX_TRACKED_COLORS);
                    if (!sortedBuckets.length) return null;
                    const colorInfos = sortedBuckets
                        .map(getColorInfo)
                        .filter(Boolean);
                    if (!colorInfos.length) return null;
                    const hasRichPalette = colorInfos.length >= RICH_PALETTE_THRESHOLD;
                    if (hasRichPalette) {
                        const vibrant = colorInfos
                            .filter(info =>
                                info.saturation >= MIN_COLOR_SATURATION
                                && info.luminance >= MIN_COLOR_LUMINANCE
                                && info.luminance <= MAX_COLOR_LUMINANCE
                            )
                            .sort((a, b) => {
                                if (b.luminance !== a.luminance) return b.luminance - a.luminance;
                                return b.bucket.count - a.bucket.count;
                            });
                        if (vibrant.length) {
                            return vibrant[0].hex;
                        }
                    }
                    const primary = colorInfos[0];
                    if (!primary) return null;
                    const runnerUp = colorInfos[1];
                    if (runnerUp && (primary.bucket.count - runnerUp.bucket.count) < MIN_DOMINANCE_GAP) {
                        return null;
                    }
                    return primary.hex;
                } catch {
                    return null;
                }
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
                    const detected = analyzeImageElement(image);
                    if (!detected) {
                        applyPreferredAccentColor();
                        return;
                    }
                    const lightened = lightenColor(detected) || detected;
                    applyAccentColor(lightened, { persist: false });
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
            const currentViz = (document.getElementById('viz-mode')?.value) || 'spectrum';
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
                        </div>
                    </section>
                    <section class="voxity-settings-section">
                        <h3>Audio feedback</h3>
                        <div class="voxity-settings-field">
                            <label for="fps_slider">Visualizer FPS</label>
                            <div class="voxity-settings-slider">
                                <input id="fps_slider" type="range" min="1" max="300" value="${fpsValue}">
                                <input id="fps_number" type="number" min="1" max="300" value="${fpsValue}" class="voxity-settings-control voxity-settings-number">
                            </div>
                            <small class="voxity-settings-small">1-300 frames per second</small>
                        </div>
                        <div class="voxity-settings-field">
                            <label for="lrc_slider">Lyrics amount</label>
                            <div class="voxity-settings-slider">
                                <input id="lrc_slider" type="range" min="1" max="48" value="${lrcValue}">
                                <input id="lrc_number" type="number" min="1" max="48" value="${lrcValue}" class="voxity-settings-control voxity-settings-number">
                            </div>
                            <small class="voxity-settings-small">Number of lyric lines visible (1-48)</small>
                        </div>
                        <div class="voxity-settings-field">
                            <label for="pref_titleRotationInterval">Title rotation speed</label>
                            <div class="voxity-settings-slider">
                                <input type="range" id="pref_titleRotationInterval" min="1" max="240" value="${rotationIntervalValue}" ${hasSettingsApi ? '' : 'disabled'}>
                                <input type="number" id="pref_titleRotationInterval_number" min="1" max="240" value="${rotationIntervalValue}" class="voxity-settings-control voxity-settings-number" ${hasSettingsApi ? '' : 'disabled'}>
                            </div>
                            <small class="voxity-settings-small">Seconds between title changes (1-240)</small>
                        </div>
                        <div class="voxity-settings-field">
                            <label for="vizmode_select">Visualizer mode</label>
                            <select id="vizmode_select" class="voxity-settings-control">
                                ${VIZ_OPTIONS.map(o => `<option value="${o.v}" ${o.v === currentViz ? 'selected' : ''}>${o.l}</option>`).join('')}
                            </select>
                            <small class="voxity-settings-small">Tip: click the visualizer to reopen this panel</small>
                        </div>
                    </section>
                    <section class="voxity-settings-section">
                        <h3>Preferences</h3>
                        ${hasSettingsApi ? '' : '<p class="voxity-settings-note">Not allowed</p>'}
                        <div class="voxity-settings-toggles">
                            ${PREFERENCE_TOGGLES.map(toggle => {
                const checked = hasSettingsApi && window.VoxitySettings.isEnabled(toggle.key) ? 'checked' : '';
                const disabled = hasSettingsApi ? '' : 'disabled';
                const supportMessage = toggle.key === 'wakeLock' && !supportsWakeLock
                    ? '<p class="voxity-settings-small">Wake Lock API not supported in this browser</p>'
                    : '';
                return `<div class="voxity-settings-toggle"${hasSettingsApi ? '' : ' data-disabled="true"'}>
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
                    </section>
                    <small><a href="/i/reload_fa" onclick="event.preventDefault(); loadFA()">I do not see any icons</a> - <a href="/i/welcome" onclick="event.preventDefault();closeTopModal(); welcome()">Show welcome modal</a></small>
                </div>
            `, 'Voxity settings');
            window.VoxityRouter?.setModalRoute(modal, '/settings');

            setTimeout(() => {
                const select = document.getElementById('theme_select');
                const acin = document.getElementById('accent_color');
                const accentResetBtn = document.getElementById('accent_color_reset');
                const vizSelect = document.getElementById('vizmode_select');
                const hiddenViz = document.getElementById('viz-mode');
                const fpsSlider = document.getElementById('fps_slider');
                const fpsNumber = document.getElementById('fps_number');
                const lrcSlider = document.getElementById('lrc_slider');
                const lrcNumber = document.getElementById('lrc_number');
                const rotationSlider = document.getElementById('pref_titleRotationInterval');
                const rotationNumber = document.getElementById('pref_titleRotationInterval_number');
                const settingsApi = typeof window.VoxitySettings !== 'undefined' ? window.VoxitySettings : null;
                const lyricsSourceInputs = Array.from(document.querySelectorAll('input[name="lyrics_source"]'));

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

                if (vizSelect) {
                    if (focusViz || !select) {
                        vizSelect.focus();
                    }
                    const applyChange = () => {
                        if (!hiddenViz) return;
                        hiddenViz.value = vizSelect.value;
                        hiddenViz.dispatchEvent(new Event('change', { bubbles: true }));
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
                                throw_error('Wake locks are not available right now');
                                return false;
                            }
                            return true;
                        }
                        if (checked) {
                            if (!controller.supported()) {
                                throw_error('Wake locks are not supported in this browser yet');
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

                    PREFERENCE_TOGGLES.forEach(toggle => {
                        const input = document.getElementById(`pref_${toggle.key}`);
                        if (!input) return;
                        input.checked = settingsApi.isEnabled(toggle.key);
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
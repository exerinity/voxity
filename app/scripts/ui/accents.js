(function () {
    'use strict';

    let CANVAS_SIZE = 128;
    let MAX_TRACKED_COLORS = 96;
    let MIN_DOMINANCE_GAP = 5;
    let RICH_PALETTE_THRESHOLD = 15;
    let MIN_COLOR_SATURATION = 0.2;
    let MIN_COLOR_LUMINANCE = 0.3;
    let MAX_COLOR_LUMINANCE = 0.92;
    let PALETTE_DISTANCE_THRESHOLD = 74;
    let PALETTE_HUE_DISTANCE_THRESHOLD = 24;

    let canvas = null;
    let ctx = null;

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

    const normalizeHex = (value) => {
        if (typeof value !== 'string') return null;
        const trimmed = value.trim();
        if (!trimmed) return null;
        return /^#[0-9a-f]{3,8}$/i.test(trimmed) ? trimmed.toLowerCase() : null;
    };

    const toHex = (value) => value.toString(16).padStart(2, '0');
    const clampByte = (value) => Math.max(0, Math.min(255, Math.round(value)));

    const hexToRgb = (hex) => {
        const normalized = normalizeHex(hex);
        if (!normalized) return null;
        const expanded = normalized.length === 4
            ? normalized.slice(1).split('').map(ch => ch + ch).join('')
            : normalized.slice(1, 7);
        return {
            r: parseInt(expanded.slice(0, 2), 16),
            g: parseInt(expanded.slice(2, 4), 16),
            b: parseInt(expanded.slice(4, 6), 16),
        };
    };

    const getColorDistance = (a, b) => {
        const first = hexToRgb(a);
        const second = hexToRgb(b);
        if (!first || !second) return Infinity;
        return Math.sqrt(
            ((first.r - second.r) ** 2)
            + ((first.g - second.g) ** 2)
            + ((first.b - second.b) ** 2)
        );
    };

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
        let hue = 0;
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
            if (max === rNorm) {
                hue = ((gNorm - bNorm) / delta) % 6;
            } else if (max === gNorm) {
                hue = ((bNorm - rNorm) / delta) + 2;
            } else {
                hue = ((rNorm - gNorm) / delta) + 4;
            }
            hue = Math.round(hue * 60);
            if (hue < 0) hue += 360;
        }
        return {
            bucket,
            hex: `#${toHex(avgR)}${toHex(avgG)}${toHex(avgB)}`,
            hue,
            luminance,
            saturation,
        };
    };

    const getColorInfosFromImageElement = (img) => {
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
            return colorInfos.length ? colorInfos : null;
        } catch {
            return null;
        }
    };

    const sortVibrantColors = (colorInfos) => colorInfos
        .filter(info =>
            info.saturation >= MIN_COLOR_SATURATION
            && info.luminance >= MIN_COLOR_LUMINANCE
            && info.luminance <= MAX_COLOR_LUMINANCE
        )
        .sort((a, b) => {
            if (b.luminance !== a.luminance) return b.luminance - a.luminance;
            return b.bucket.count - a.bucket.count;
        });

    const getHueDistance = (a, b) => {
        const diff = Math.abs((a?.hue || 0) - (b?.hue || 0));
        return Math.min(diff, 360 - diff);
    };

    const getPaletteScore = (info, maxCount) => {
        const dominance = maxCount ? info.bucket.count / maxCount : 0;
        const luminanceBalance = 1 - Math.abs(info.luminance - 0.62);
        return (info.saturation * 2.4) + (luminanceBalance * 0.9) + (dominance * 0.65);
    };

    const chooseAccentColor = (colorInfos) => {
        if (!colorInfos?.length) return null;
        const hasRichPalette = colorInfos.length >= RICH_PALETTE_THRESHOLD;
        if (hasRichPalette) {
            const vibrant = sortVibrantColors(colorInfos);
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
    };

    const choosePaletteColors = (colorInfos, limit = 5) => {
        if (!colorInfos?.length) return [];
        const maxCount = Math.max(...colorInfos.map(info => info.bucket.count));
        const candidates = [...colorInfos]
            .filter(info =>
                info.saturation >= 0.08
                && info.luminance >= 0.12
                && info.luminance <= 0.96
            )
            .sort((a, b) => getPaletteScore(b, maxCount) - getPaletteScore(a, maxCount));
        const fallbackCandidates = [...colorInfos]
            .sort((a, b) => getPaletteScore(b, maxCount) - getPaletteScore(a, maxCount));
        const selected = [];
        const selectedInfos = [];
        const addColor = (info, { enforceRgb = true, enforceHue = true } = {}) => {
            const normalized = normalizeHex(info?.hex);
            if (!normalized || selected.includes(normalized)) return false;
            if (enforceRgb && selected.some(existing => getColorDistance(existing, normalized) < PALETTE_DISTANCE_THRESHOLD)) {
                return false;
            }
            if (enforceHue && selectedInfos.some(existing => getHueDistance(existing, info) < PALETTE_HUE_DISTANCE_THRESHOLD)) {
                return false;
            }
            selected.push(normalized);
            selectedInfos.push(info);
            return selected.length >= limit;
        };
        for (const info of candidates) {
            if (addColor(info, { enforceRgb: true, enforceHue: true })) break;
        }
        if (selected.length < limit) {
            for (const info of candidates) {
                if (addColor(info, { enforceRgb: true, enforceHue: false })) break;
            }
        }
        if (selected.length < limit) {
            for (const info of fallbackCandidates) {
                if (addColor(info, { enforceRgb: false, enforceHue: false })) break;
            }
        }
        return selected.slice(0, limit);
    };

    function getAccents(image, { limit = 5 } = {}) {
        const colorInfos = getColorInfosFromImageElement(image);
        const seen = new Set();
        return choosePaletteColors(colorInfos, limit)
            .map(hex => lightenColor(hex) || hex)
            .map(normalizeHex)
            .filter(color => {
                if (!color || seen.has(color)) return false;
                seen.add(color);
                return true;
            });
    }

    function getDominantAccent(image) {
        const colorInfos = getColorInfosFromImageElement(image);
        const detected = chooseAccentColor(colorInfos);
        if (!detected) return null;
        return lightenColor(detected) || detected;
    }

    const DEFAULTS = {
        CANVAS_SIZE: 128,
        MAX_TRACKED_COLORS: 96,
        MIN_DOMINANCE_GAP: 5,
        RICH_PALETTE_THRESHOLD: 15,
        MIN_COLOR_SATURATION: 0.2,
        MIN_COLOR_LUMINANCE: 0.3,
        MAX_COLOR_LUMINANCE: 0.92,
        PALETTE_DISTANCE_THRESHOLD: 74,
        PALETTE_HUE_DISTANCE_THRESHOLD: 24,
    };

    const accessors = {
        CANVAS_SIZE: { get: () => CANVAS_SIZE, set: (v) => { CANVAS_SIZE = v; canvas = null; ctx = null; } },
        MAX_TRACKED_COLORS: { get: () => MAX_TRACKED_COLORS, set: (v) => { MAX_TRACKED_COLORS = v; } },
        MIN_DOMINANCE_GAP: { get: () => MIN_DOMINANCE_GAP, set: (v) => { MIN_DOMINANCE_GAP = v; } },
        RICH_PALETTE_THRESHOLD: { get: () => RICH_PALETTE_THRESHOLD, set: (v) => { RICH_PALETTE_THRESHOLD = v; } },
        MIN_COLOR_SATURATION: { get: () => MIN_COLOR_SATURATION, set: (v) => { MIN_COLOR_SATURATION = v; } },
        MIN_COLOR_LUMINANCE: { get: () => MIN_COLOR_LUMINANCE, set: (v) => { MIN_COLOR_LUMINANCE = v; } },
        MAX_COLOR_LUMINANCE: { get: () => MAX_COLOR_LUMINANCE, set: (v) => { MAX_COLOR_LUMINANCE = v; } },
        PALETTE_DISTANCE_THRESHOLD: { get: () => PALETTE_DISTANCE_THRESHOLD, set: (v) => { PALETTE_DISTANCE_THRESHOLD = v; } },
        PALETTE_HUE_DISTANCE_THRESHOLD: { get: () => PALETTE_HUE_DISTANCE_THRESHOLD, set: (v) => { PALETTE_HUE_DISTANCE_THRESHOLD = v; } },
    };

    const CONFIG_FIELDS = [
        { key: 'CANVAS_SIZE', label: 'Canvas size', description: 'Sampling resolution (px), higher is slower but more accurate', min: 16, max: 512, step: 1 },
        { key: 'MAX_TRACKED_COLORS', label: 'Max tracked colors', description: 'How many color buckets to keep when sampling', min: 1, max: 256, step: 1 },
        { key: 'MIN_DOMINANCE_GAP', label: 'Min dominance gap', description: 'Required lead of the top color over the runner-up', min: 0, max: 200, step: 1 },
        { key: 'RICH_PALETTE_THRESHOLD', label: 'Rich palette threshold', description: 'Distinct colors before vibrant picking kicks in', min: 1, max: 96, step: 1 },
        { key: 'MIN_COLOR_SATURATION', label: 'Min saturation', description: 'Minimum saturation for a vibrant accent (0-1)', min: 0, max: 1, step: 0.01 },
        { key: 'MIN_COLOR_LUMINANCE', label: 'Min luminance', description: 'Darkest a vibrant accent may be (0-1)', min: 0, max: 1, step: 0.01 },
        { key: 'MAX_COLOR_LUMINANCE', label: 'Max luminance', description: 'Brightest a vibrant accent may be (0-1)', min: 0, max: 1, step: 0.01 },
        { key: 'PALETTE_DISTANCE_THRESHOLD', label: 'Palette RGB distance', description: 'Min RGB distance between palette swatches', min: 0, max: 442, step: 1 },
        { key: 'PALETTE_HUE_DISTANCE_THRESHOLD', label: 'Palette hue distance', description: 'Min hue separation between palette swatches (deg)', min: 0, max: 180, step: 1 },
    ];

    const STORAGE_KEY = 'au_accent_config';

    const getAllConfig = () => Object.fromEntries(
        Object.keys(accessors).map(key => [key, accessors[key].get()])
    );

    const persistConfig = () => {
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(getAllConfig())); } catch { }
    };

    const setConfig = (key, value) => {
        if (!accessors[key]) return false;
        const num = Number(value);
        if (!Number.isFinite(num)) return false;
        accessors[key].set(num);
        persistConfig();
        return true;
    };

    const resetConfig = () => {
        Object.keys(DEFAULTS).forEach(key => accessors[key].set(DEFAULTS[key]));
        persistConfig();
    };

    const PRESETS = [
        {
            name: 'Fastest',
            values: { CANVAS_SIZE: 48, MAX_TRACKED_COLORS: 24, MIN_DOMINANCE_GAP: 5, RICH_PALETTE_THRESHOLD: 12, MIN_COLOR_SATURATION: 0.2, MIN_COLOR_LUMINANCE: 0.3, MAX_COLOR_LUMINANCE: 0.92, PALETTE_DISTANCE_THRESHOLD: 74, PALETTE_HUE_DISTANCE_THRESHOLD: 24 },
        },
        {
            name: 'Most accurate',
            values: { CANVAS_SIZE: 256, MAX_TRACKED_COLORS: 192, MIN_DOMINANCE_GAP: 3, RICH_PALETTE_THRESHOLD: 20, MIN_COLOR_SATURATION: 0.18, MIN_COLOR_LUMINANCE: 0.28, MAX_COLOR_LUMINANCE: 0.94, PALETTE_DISTANCE_THRESHOLD: 60, PALETTE_HUE_DISTANCE_THRESHOLD: 20 },
        },
        {
            name: 'Brightest',
            values: { CANVAS_SIZE: 128, MAX_TRACKED_COLORS: 96, MIN_DOMINANCE_GAP: 5, RICH_PALETTE_THRESHOLD: 15, MIN_COLOR_SATURATION: 0.15, MIN_COLOR_LUMINANCE: 0.55, MAX_COLOR_LUMINANCE: 1, PALETTE_DISTANCE_THRESHOLD: 74, PALETTE_HUE_DISTANCE_THRESHOLD: 24 },
        },
        {
            name: 'Darkest',
            values: { CANVAS_SIZE: 128, MAX_TRACKED_COLORS: 96, MIN_DOMINANCE_GAP: 5, RICH_PALETTE_THRESHOLD: 15, MIN_COLOR_SATURATION: 0.15, MIN_COLOR_LUMINANCE: 0.05, MAX_COLOR_LUMINANCE: 0.5, PALETTE_DISTANCE_THRESHOLD: 74, PALETTE_HUE_DISTANCE_THRESHOLD: 24 },
        },
    ];

    const applyPreset = (name) => {
        const preset = PRESETS.find(p => p.name === name);
        if (!preset) return false;
        Object.keys(preset.values).forEach(key => {
            if (accessors[key]) accessors[key].set(preset.values[key]);
        });
        persistConfig();
        return true;
    };

    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
            const parsed = JSON.parse(raw);
            Object.keys(accessors).forEach(key => {
                const num = Number(parsed?.[key]);
                if (Number.isFinite(num)) accessors[key].set(num);
            });
        }
    } catch { }

    const config = {
        fields: CONFIG_FIELDS,
        defaults: { ...DEFAULTS },
        presets: PRESETS,
        get: (key) => accessors[key] ? accessors[key].get() : undefined,
        getAll: getAllConfig,
        set: setConfig,
        reset: resetConfig,
        applyPreset,
    };

    if (typeof window !== 'undefined') {
        window.VoxityAccents = { getAccents, getDominantAccent, config };
        window.getAccents = getAccents;
        window.getDominantAccent = getDominantAccent;
    }
})();

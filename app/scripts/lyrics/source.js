const LYRICS_SOURCE_KEYS = Object.freeze({
    LRCLIB: 'lrclib',
    MUSIXMATCH: 'musixmatch',
});
const DEFAULT_LYRICS_SOURCE = LYRICS_SOURCE_KEYS.LRCLIB;
const MUSIXMATCH_PROXY_BASE = 'https://lyrics.api.voxity.exerinity.com';

function getPreferredLyricsSource() {
    try {
        if (typeof window === 'undefined' || typeof window.VoxitySettings === 'undefined') {
            return DEFAULT_LYRICS_SOURCE;
        }
        const raw = window.VoxitySettings.get('lyricsSource');
        if (typeof raw === 'string' && raw.toLowerCase() === LYRICS_SOURCE_KEYS.MUSIXMATCH) {
            return LYRICS_SOURCE_KEYS.MUSIXMATCH;
        }
        return DEFAULT_LYRICS_SOURCE;
    } catch {
        return DEFAULT_LYRICS_SOURCE;
    }
}

function getLyricsSourceLabel(sourceKey) {
    return sourceKey === LYRICS_SOURCE_KEYS.MUSIXMATCH ? 'Musixmatch' : 'LRCLIB';
}

function shouldAutoSearchLyrics() {
    return typeof window.VoxitySettings === 'undefined' || window.VoxitySettings.isEnabled('autoLyrics');
}

function buildLyricsRequestKey(file, duration) {
    return [
        file?.name || '',
        file?.size || 0,
        file?.lastModified || 0,
        metadata.title || '',
        metadata.artist || '',
        metadata.album || '',
        duration || 0,
    ].join('|');
}

const LYRICS_TRACK_SETTLE_DELAY = 900;
const LYRICS_TRACK_STAND_DOWN_MAX_DELAY = 5000;
const LYRICS_TRACK_SKIP_BURST_WINDOW = 3000;
let lyricsTrackSettleTimer = null;
let lyricsTrackChangeToken = 0;
let lyricsTrackSettledToken = 0;
let pendingAutoLyricsRequest = null;
let currentLyricsTrackFile = null;
let lyricsTrackChangeTimes = [];
let lyricsRapidSkipStreak = 0;

function abortActiveLyricsRequest() {
    if (!lyricsAbortController) return;
    try {
        lyricsAbortController.abort();
    } catch { }
    lyricsAbortController = null;
    isLyricsLoading = false;
}

function isLyricsTrackSettled() {
    return lyricsTrackChangeToken === lyricsTrackSettledToken;
}

function getAdaptiveLyricsSettleDelay() {
    const now = Date.now();
    const previousChangeTime = lyricsTrackChangeTimes[lyricsTrackChangeTimes.length - 1] || 0;
    const interval = previousChangeTime ? now - previousChangeTime : Infinity;
    if (interval < LYRICS_TRACK_SETTLE_DELAY) {
        lyricsRapidSkipStreak += 1;
    } else if (interval > LYRICS_TRACK_SKIP_BURST_WINDOW) {
        lyricsRapidSkipStreak = 0;
    } else {
        lyricsRapidSkipStreak = Math.max(0, lyricsRapidSkipStreak - 1);
    }
    lyricsTrackChangeTimes.push(now);
    lyricsTrackChangeTimes = lyricsTrackChangeTimes.filter(changeTime => now - changeTime <= LYRICS_TRACK_SKIP_BURST_WINDOW);
    const burstCount = Math.max(0, lyricsTrackChangeTimes.length - 1);
    const speedPenalty = Number.isFinite(interval)
        ? Math.max(0, LYRICS_TRACK_SETTLE_DELAY - interval)
        : 0;
    return Math.min(
        LYRICS_TRACK_STAND_DOWN_MAX_DELAY,
        LYRICS_TRACK_SETTLE_DELAY
        + (lyricsRapidSkipStreak * 650)
        + (burstCount * 250)
        + Math.round(speedPenalty * 0.75)
    );
}

function markLyricsTrackChanged(file) {
    currentLyricsTrackFile = file || null;
    pendingAutoLyricsRequest = null;
    lyricsTrackChangeToken += 1;
    abortActiveLyricsRequest();
    clearTimeout(lyricsTrackSettleTimer);
    lyricsTrackSettleTimer = null;
    if (!currentLyricsTrackFile) {
        lyricsRapidSkipStreak = 0;
        lyricsTrackChangeTimes = [];
        lyricsTrackSettledToken = lyricsTrackChangeToken;
        return;
    }
    const token = lyricsTrackChangeToken;
    const settleDelay = getAdaptiveLyricsSettleDelay();
    lyricsTrackSettleTimer = setTimeout(() => {
        if (token !== lyricsTrackChangeToken) return;
        lyricsTrackSettledToken = token;
        lyricsTrackSettleTimer = null;
        if (pendingAutoLyricsRequest) {
            const pendingOptions = pendingAutoLyricsRequest;
            pendingAutoLyricsRequest = null;
            maybeExecuteAutoLyrics({ ...pendingOptions, ignoreSettle: true });
        }
    }, settleDelay);
}

document.addEventListener('voxity:track-changed', (event) => {
    markLyricsTrackChanged(event?.detail?.file || null);
});

function maybeExecuteAutoLyrics({ force = false, ignoreSettle = false } = {}) {
    if (!lastLyricsRequest) return;
    if (!force && !shouldAutoSearchLyrics()) return;
    if (lastLyricsRequest.file && currentLyricsTrackFile && lastLyricsRequest.file !== currentLyricsTrackFile) return;
    if (!ignoreSettle && !isLyricsTrackSettled()) {
        pendingAutoLyricsRequest = { force };
        return;
    }
    const { key, duration } = lastLyricsRequest;
    if (!force && activeLyricsKey === key) return;
    activeLyricsKey = key;
    pendingAutoLyricsRequest = null;
    get_lyrics(metadata.title, metadata.artist, metadata.album, duration, { requestKey: key });
}

function pickBestMusixmatchResult(results, { duration, trackName, artistName }) {
    if (!Array.isArray(results)) return null;
    const normalizedTitle = (trackName || '').trim().toLowerCase();
    const normalizedArtist = (artistName || '').trim().toLowerCase();
    let best = null;
    let bestScore = -Infinity;
    for (const candidate of results) {
        if (!candidate || typeof candidate !== 'object' || !candidate.lookup_id || !candidate.type) continue;
        let score = 0;
        if (candidate.type === 'Synced') {
            score += 3;
        }
        const candidateTitle = typeof candidate.title === 'string' ? candidate.title.trim().toLowerCase() : '';
        if (normalizedTitle && candidateTitle === normalizedTitle) {
            score += 2;
        }
        const candidateArtist = typeof candidate.artist === 'string' ? candidate.artist.trim().toLowerCase() : '';
        if (normalizedArtist && candidateArtist === normalizedArtist) {
            score += 1;
        }
        const candidateDuration = Number(candidate.duration_sec);
        if (Number.isFinite(candidateDuration) && Number.isFinite(duration)) {
            const diff = Math.abs(candidateDuration - duration);
            if (diff <= 2) score += 3;
            else if (diff <= 5) score += 2;
            else if (diff <= 10) score += 1;
        }
        if (score > bestScore) {
            bestScore = score;
            best = candidate;
        }
    }
    return best || results[0] || null;
}

async function fetchLyricsFromLrclib({ trackName, artistName, albumName, duration, signal }) {
    const mode = (typeof window === 'undefined' || typeof window.VoxitySettings === 'undefined') ? 'strict' : (window.VoxitySettings.get('lrclibMode') || 'strict');
    const normalizedDuration = Number.isFinite(duration) && duration > 0 ? Math.round(duration) : 0;

    if (mode === 'lax') {
        const searchParams = new URLSearchParams({
            track_name: trackName || '',
            artist_name: artistName || '',
        });
        const searchResponse = await fetch(`https://lrclib.net/api/search?${searchParams.toString()}`, { signal });
        const searchResults = await searchResponse.json();
        if (!searchResponse.ok || !Array.isArray(searchResults) || searchResults.length === 0) {
            return { kind: 'none' };
        }
        const selected = searchResults[0];
        if (!selected) return { kind: 'none' };
        if (selected.instrumental) return { kind: 'instrumental' };
        if (typeof selected.syncedLyrics === 'string' && selected.syncedLyrics.trim()) {
            return { kind: 'synced', lyrics: selected.syncedLyrics };
        }
        if (typeof selected.plainLyrics === 'string' && selected.plainLyrics.trim()) {
            return { kind: 'plain', lyrics: selected.plainLyrics };
        }
        if (selected.id) {
            try {
                const lookupResponse = await fetch(`https://lrclib.net/api/get/${encodeURIComponent(selected.id)}`, { signal });
                const lookupData = await lookupResponse.json();
                if (lookupResponse.ok) {
                    if (lookupData.instrumental) return { kind: 'instrumental' };
                    if (typeof lookupData.syncedLyrics === 'string' && lookupData.syncedLyrics.trim()) return { kind: 'synced', lyrics: lookupData.syncedLyrics };
                    if (typeof lookupData.plainLyrics === 'string' && lookupData.plainLyrics.trim()) return { kind: 'plain', lyrics: lookupData.plainLyrics };
                }
            } catch (err) {
                null;
            }
        }
        return { kind: 'none' };
    }

    const response = await fetch(
        `https://lrclib.net/api/get?artist_name=${encodeURIComponent(artistName || '')}&track_name=${encodeURIComponent(trackName || '')}&album_name=${encodeURIComponent(albumName || '')}&duration=${normalizedDuration}`,
        { signal }
    );
    const data = await response.json();
    if (!response.ok) {
        return { kind: 'none' };
    }
    if (data.instrumental) {
        return { kind: 'instrumental' };
    }
    const syncedLyrics = typeof data.syncedLyrics === 'string' ? data.syncedLyrics : '';
    if (syncedLyrics.trim()) {
        return { kind: 'synced', lyrics: data.syncedLyrics };
    }
    const plainLyrics = typeof data.plainLyrics === 'string' ? data.plainLyrics : '';
    if (plainLyrics.trim()) {
        return { kind: 'plain', lyrics: data.plainLyrics };
    }
    return { kind: 'none' };
}

async function fetchLyricsFromMusixmatch({ trackName, artistName, albumName, duration, signal }) {
    const searchParams = new URLSearchParams({
        artist: artistName || '',
        album: albumName || '',
        title: trackName || '',
    });
    const searchResponse = await fetch(`${MUSIXMATCH_PROXY_BASE}/search?${searchParams.toString()}`, { signal });
    const searchResults = await searchResponse.json();
    if (!searchResponse.ok || !Array.isArray(searchResults) || searchResults.length === 0) {
        return { kind: 'none' };
    }
    const normalizedDuration = Number.isFinite(duration) && duration > 0 ? Math.round(duration) : null;
    const selected = pickBestMusixmatchResult(searchResults, {
        duration: normalizedDuration,
        trackName,
        artistName,
    }) || searchResults[0];
    if (!selected || !selected.lookup_id || !selected.type) {
        return { kind: 'none' };
    }
    const lookupParams = new URLSearchParams({
        lookup_id: selected.lookup_id,
        type: selected.type,
    });
    const lookupResponse = await fetch(`${MUSIXMATCH_PROXY_BASE}/lookup?${lookupParams.toString()}`, { signal });
    const lookupData = await lookupResponse.json();
    if (!lookupResponse.ok || typeof lookupData?.lyrics !== 'string') {
        return { kind: 'none' };
    }
    if (!lookupData.lyrics.trim()) {
        return { kind: 'none' };
    }
    const kind = selected.type === 'Synced' ? 'synced' : 'plain';
    return { kind, lyrics: lookupData.lyrics };
}

let lyricsAbortController = null;

async function get_lyrics(trackName, artistName, albumName, duration, options = {}) {
    if (!navigator.onLine) {
        stat_up(`<i class="fa-solid fa-plane-slash"></i> Skipping lyrics search, offline`);
        skipLyricsUpdate = true;
        lrc_con.innerHTML = '';
        return;
    }
    const start = Date.now();
    if (lyricsAbortController) {
        try {
            lyricsAbortController.abort();
        } catch { }
    }

    const requestKey = options?.requestKey || null;
    const requestTrackToken = lyricsTrackChangeToken;
    const controller = new AbortController();
    lyricsAbortController = controller;
    const { signal } = controller;
    const isCurrentLyricsRequest = () => {
        if (signal.aborted) return false;
        if (lyricsAbortController !== controller) return false;
        if (requestTrackToken !== lyricsTrackChangeToken) return false;
        if (requestKey && lastLyricsRequest?.key !== requestKey) return false;
        return true;
    };
    const finishLyricsRequest = () => {
        if (lyricsAbortController !== controller) return;
        lyricsAbortController = null;
        isLyricsLoading = false;
    };

    skipLyricsUpdate = false;
    isLyricsLoading = true;
    lrc_wipe();
    const sourceKey = getPreferredLyricsSource();
    const sourceLabel = getLyricsSourceLabel(sourceKey);

    lrc_con.innerHTML = `
  <div style="display:flex;align-items:center;gap:8px;">
    <div class="spinner"></div>
    <span>Searching ${sourceLabel || "for lyrics"} for ${trackName || "unknown track"} by ${artistName || "unknown artist"}...</span>
    </div>`;
    try {
        const fetcher = sourceKey === LYRICS_SOURCE_KEYS.MUSIXMATCH ? fetchLyricsFromMusixmatch : fetchLyricsFromLrclib;
        const result = await fetcher({ trackName, artistName, albumName, duration, signal });
        if (!isCurrentLyricsRequest()) return;
        if (result && result.kind === 'instrumental') {
            skipLyricsUpdate = true;
            stat_up(`<i class="fa-solid fa-microphone-lines-slash"></i> This song is an instrumental (${sourceLabel}, ${Date.now() - start}ms)`);
            lrc_con.innerHTML = 'This song is an instrumental';
            const instrumentalLine = lrc_parse('Instrumental')[0];
            lrc_data = instrumentalLine ? [instrumentalLine] : [];
            finishLyricsRequest();
            return lrc_data;
        }
        if (result && result.kind === 'synced' && typeof result.lyrics === 'string') {
            lrc_data = lrc_parse(result.lyrics);
            stat_up(`<i class="fa-solid fa-check"></i> Found lyrics for <strong>${metadata.title}</strong> by <strong>${metadata.artist}</strong> via ${sourceLabel} in ${Date.now() - start}ms`);
            finishLyricsRequest();
            update_lyrics();
            return;
        }
        if (result && result.kind === 'plain' && typeof result.lyrics === 'string') {
            lrc_data = result.lyrics.split('\n').map(line => ({ time: 0, text: line }));
            finishLyricsRequest();
            update_lyrics();
            stat_up(`<i class="fa-solid fa-minus"></i> Found unsynced lyrics for <strong>${metadata.title}</strong> by <strong>${metadata.artist}</strong> via ${sourceLabel} in ${Date.now() - start}ms`);
            return;
        }
        stat_up(`<i class="fa-solid fa-xmark"></i> No lyrics found via ${sourceLabel} (${Date.now() - start}ms)`);
        lrc_con.innerHTML = '';
        lrc_data = [];
        finishLyricsRequest();
    } catch (e) {
        if (signal.aborted || !isCurrentLyricsRequest()) {
            finishLyricsRequest();
            return;
        } else {
            stat_up(`<i class="fa-solid fa-xmark"></i> Error loading lyrics, check the toast notification`);
            throw_error(`${e}`);
        }
        lrc_con.innerHTML = '';
        lrc_data = [];
        finishLyricsRequest();
    }
}

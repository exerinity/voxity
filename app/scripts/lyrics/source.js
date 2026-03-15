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

function maybeExecuteAutoLyrics({ force = false } = {}) {
    if (!lastLyricsRequest) return;
    if (!force && !shouldAutoSearchLyrics()) return;
    const { key, duration } = lastLyricsRequest;
    if (!force && activeLyricsKey === key) return;
    activeLyricsKey = key;
    get_lyrics(metadata.title, metadata.artist, metadata.album, duration);
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
    const normalizedDuration = Number.isFinite(duration) && duration > 0 ? Math.round(duration) : 0;
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

async function get_lyrics(trackName, artistName, albumName, duration) {
    const start = Date.now();
    if (lyricsAbortController) {
        lyricsAbortController.abort();
    }

    lyricsAbortController = new AbortController();
    const { signal } = lyricsAbortController;

    skipLyricsUpdate = false;
    isLyricsLoading = true;
    lrc_wipe();
    const sourceKey = getPreferredLyricsSource();
    const sourceLabel = getLyricsSourceLabel(sourceKey);

    lrc_con.innerHTML = `
  <div style="display:flex;align-items:center;gap:8px;">
    <div class="spinner"></div>
    <span>Searching ${sourceLabel}...</span>
  </div>`;
    try {
        const fetcher = sourceKey === LYRICS_SOURCE_KEYS.MUSIXMATCH ? fetchLyricsFromMusixmatch : fetchLyricsFromLrclib;
        const result = await fetcher({ trackName, artistName, albumName, duration, signal });
        if (result && result.kind === 'instrumental') {
            skipLyricsUpdate = true;
            isLyricsLoading = false;
            stat_up(`<i class="fa-solid fa-microphone-lines-slash"></i> This song is an instrumental (${sourceLabel}, ${Date.now() - start}ms)`);
            lrc_con.innerHTML = 'This song is an instrumental';
            const instrumentalLine = lrc_parse('Instrumental')[0];
            lrc_data = instrumentalLine ? [instrumentalLine] : [];
            return lrc_data;
        }
        if (result && result.kind === 'synced' && typeof result.lyrics === 'string') {
            lrc_data = lrc_parse(result.lyrics);
            stat_up(`<i class="fa-solid fa-check"></i> Found lyrics for <strong>${metadata.title}</strong> by <strong>${metadata.artist}</strong> via ${sourceLabel} in ${Date.now() - start}ms`);
            isLyricsLoading = false;
            update_lyrics();
            return;
        }
        if (result && result.kind === 'plain' && typeof result.lyrics === 'string') {
            lrc_data = result.lyrics.split('\n').map(line => ({ time: 0, text: line }));
            isLyricsLoading = false;
            update_lyrics();
            stat_up(`<i class="fa-solid fa-minus"></i> Found unsynced lyrics for <strong>${metadata.title}</strong> by <strong>${metadata.artist}</strong> via ${sourceLabel} in ${Date.now() - start}ms`);
            return;
        }
        stat_up(`<i class="fa-solid fa-xmark"></i> No lyrics found via ${sourceLabel} (${Date.now() - start}ms)`);
        lrc_con.innerHTML = '';
        lrc_data = [];
        isLyricsLoading = false;
    } catch (e) {
        if (signal.aborted) {
            null;
        } else {
            stat_up(`<i class="fa-solid fa-xmark"></i> Error loading lyrics`);
            throw_error(`Lyrics could not load:<br>${e}<br>You are likely offline.`);
        }
        lrc_con.innerHTML = '';
        lrc_data = [];
        isLyricsLoading = false;
    }
}
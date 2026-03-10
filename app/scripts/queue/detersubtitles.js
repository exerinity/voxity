const AUDIO_EXTENSIONS = new Set([
    'mp3',
    'aac',
    'm4a',
    'wav',
    'ogg',
    'opus',
    'flac',
    'webm',

    // video is cool too
    'mp4',
    'm4v',
    'webm',
    'ogv'
]);

const LYRIC_EXTENSIONS = new Set(['lrc', 'srt', 'vtt']);

function getFileExtension(name) {
    if (!name || typeof name !== 'string') return '';
    const parts = name.split('.');
    if (parts.length < 2) return '';
    return parts.pop().toLowerCase();
}

function isLyricsFile(file) {
    if (!file) return false;
    const ext = getFileExtension(file.name);
    return LYRIC_EXTENSIONS.has(ext);
}

function isAudioFile(file) {
    if (!file) return false;
    if (file.type && file.type.startsWith('audio/')) return true;
    const ext = getFileExtension(file.name);
    return AUDIO_EXTENSIONS.has(ext);
}

function quf(fileList, options = {}) {
    const opts = options && typeof options === 'object' ? options : {};
    const { ignoreInvalid = false } = opts;
    const files = Array.from(fileList).filter(Boolean);
    if (files.length === 0) {
        if (!ignoreInvalid) {
            throw_error('No files selected');
        }
        return;
    }
    if (!ignoreInvalid && files.length === 1 && isLyricsFile(files[0])) {
        const name = files[0].name || '';
        const lower = name.toLowerCase();
        function padTwo(n) { return String(n).padStart(2, '0'); }
        function secondsFromHms(hms) {
            const v = hms.replace(',', '.').trim();
            const parts = v.split(':').map(Number);
            if (parts.length === 3) {
                return parts[0] * 3600 + parts[1] * 60 + parts[2];
            } else if (parts.length === 2) {
                return parts[0] * 60 + parts[1];
            }
            return parseFloat(v) || 0;
        }
        function formatLrcTimestamp(secs) {
            const mm = Math.floor(secs / 60);
            const ssFloat = secs % 60;
            const ss = ssFloat.toFixed(2);
            return `${padTwo(mm)}:${ss.padStart(5, '0')}`;
        }
        function srt_to_lrc(srt) {
            const blocks = srt.split(/\r?\n\r?\n/).map(b => b.trim()).filter(Boolean);
            const out = [];
            for (const block of blocks) {
                const timeMatch = block.match(/(\d{1,2}:\d{2}:\d{2}[,\.]\d{1,3})\s*-->\s*(\d{1,2}:\d{2}:\d{2}[,\.]\d{1,3})/);
                if (!timeMatch) continue;
                const start = timeMatch[1];
                const text = block.split(/\r?\n/).slice(1).join(' ').replace(/<[^>]+>/g, '').trim();
                if (!text) continue;
                const secs = secondsFromHms(start);
                out.push(`[${formatLrcTimestamp(secs)}]${text}`);
            }
            return out.join('\n');
        }
        function vtt_to_lrc(vtt) {
            const content = vtt.replace(/^WEBVTT[\s\S]*?\n\n/, '');
            const blocks = content.split(/\r?\n\r?\n/).map(b => b.trim()).filter(Boolean);
            const out = [];
            for (const block of blocks) {
                const timeMatch = block.match(/(\d{1,2}:)?\d{1,2}:\d{2}\.\d{3}\s*-->\s*(\d{1,2}:)?\d{1,2}:\d{2}\.\d{3}/);
                const tsLine = (block.split(/\r?\n/).find(l => /-->/.test(l)) || '').trim();
                if (!tsLine) continue;
                const startMatch = tsLine.match(/(\d{1,2}:)?\d{1,2}:\d{2}[\.,]\d{1,3}/);
                if (!startMatch) continue;
                const start = startMatch[0];
                const text = block.split(/\r?\n/).filter(l => !/-->/.test(l)).slice(1).join(' ').replace(/<[^>]+>/g, '').trim() || block.split(/\r?\n/).filter(l => !/-->/.test(l)).join(' ').replace(/<[^>]+>/g, '').trim();
                if (!text) continue;
                const secs = secondsFromHms(start);
                out.push(`[${formatLrcTimestamp(secs)}]${text}`);
            }
            return out.join('\n');
        }

        const reader = new FileReader();
        reader.onload = function (e) {
            const text = e.target.result || '';
            const ext = lower.split('.').pop();
            try {
                if (ext === 'lrc') {
                    if (typeof lrc_parse === 'function') {
                        lrc_data = lrc_parse(text);
                    } else if (typeof parse_lyrics === 'function') {
                        lrc_data = parse_lyrics(text);
                    } else {
                        throw new Error('LRC parser is missing');
                    }
                } else if (ext === 'srt') {
                    if (typeof lrc_parse !== 'function') throw new Error('LRC parser is missing');
                    const lrcText = srt_to_lrc(text);
                    lrc_data = lrc_parse(lrcText);
                } else if (ext === 'vtt') {
                    if (typeof lrc_parse !== 'function') throw new Error('LRC parser is missing');
                    const lrcText = vtt_to_lrc(text);
                    lrc_data = lrc_parse(lrcText);
                }
            } catch (err) {
                throw_error('Parse failed: ' + (err && err.message ? err.message : err), false);
                return;
            }

            if (!elements.player || !elements.player.src) {
                throw_error('Nothing playing');
                return;
            }

            try { skipLyricsUpdate = false; update_lyrics(); } catch { null }
            throw_error('Added lyrics', true);
        };
        reader.readAsText(files[0]);
        return;
    }

    const audioFiles = files.filter(isAudioFile);
    const hasInvalidFiles = files.length !== audioFiles.length;
    if (!ignoreInvalid && hasInvalidFiles) {
        throw_error('Some invalid files were added');
    }
    if (audioFiles.length === 0) {
        if (!ignoreInvalid) {
            throw_error('Not supported');
        }
        return;
    }

    const isemp = queue.length === 0;
    for (const f of audioFiles) {
        const item = { id: ++queueIdCounter, file: f, displayName: f.name };
        queue.push(item);
        onQueueItemAdded(item);
        try {
            jsmediatags.read(f, {
                onSuccess: (tag) => {
                    const t = tag?.tags || {};
                    item.meta = {
                        title: t.title || '',
                        artist: t.artist || '',
                        album: t.album || '',
                    };
                    rqueue();
                },
                onError: () => { null }
            });
        } catch { null }
    }
    rqueue();
    if (isemp && queue.length > 0) {
        pindex(0);
    }
}
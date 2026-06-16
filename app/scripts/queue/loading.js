function processNextDurationLoad() {
    if (durationLoadInProgress) return;
    const nextItem = durationLoadQueue.shift();
    if (!nextItem) {
        if (durationLoadUnsupportedCount > 0) {
            if (durationLoadUnsupportedFiles.length > 0) {
                const list = durationLoadUnsupportedFiles
                    .map(n => `${n}`)
                    .join('<br>');

                if (durationLoadUnsupportedCount < 10) {
                    msg(
                        `${durationLoadUnsupportedCount} songs failed to begin playing, so they were omitted from the queue.
                <br><br>
                <strong>Unplayable files:</strong><br>
                ${list}`
                    );
                } else {
                    msg(
                        `${durationLoadUnsupportedCount} songs failed to begin playing, so they were omitted from the queue.
                <br><br>
                <details>
                    <summary><strong>Unplayable files</strong></summary>
                    <div style="margin-top: 8px;">
                        ${list}
                    </div>
                </details>`
                    );
                }
            } else {
                msg(
                    `${durationLoadUnsupportedCount} songs failed to begin playing, so they were omitted from the queue.`
                );
            }

            durationLoadUnsupportedCount = 0;
            durationLoadUnsupportedFiles = [];
        }
        return;
    }
    durationLoadInProgress = true;
    const generation = durationLoadGeneration;
    const audio = ensureDurationAudioElement();
    let objectUrl = null;
    let playbackTimer = null;

    function cleanup() {
        delete nextItem._durationLoading;
        delete nextItem._pendingDurationEl;
        if (playbackTimer !== null) {
            clearTimeout(playbackTimer);
            playbackTimer = null;
        }
        if (generation === durationLoadGeneration) {
            durationLoadInProgress = false;
        }
        audio.removeEventListener('loadedmetadata', handleMetadata);
        audio.removeEventListener('error', handleError);
        if (objectUrl) {
            try { URL.revokeObjectURL(objectUrl); } catch { null }
            objectUrl = null;
        }
        try {
            audio.pause();
            audio.removeAttribute('src');
            audio.load();
        } catch { null }
        if (generation === durationLoadGeneration) {
            setTimeout(processNextDurationLoad, durationLoadDelay);
        }
    }

    function handleLoaded(durationValue) {
        if (generation !== durationLoadGeneration) {
            cleanup();
            return;
        }
        const idx = findIndexById(nextItem.id);
        const pos = idx !== -1 ? idx + 1 : (queue.length ? queue.length : 1);
        const total = queue.length || 1;
        stat_up(`<i class="fa-solid fa-people-carry-box"></i> Processing: <strong>${nextItem.displayName || nextItem.file.name}</strong> (${pos} of ${total})...`);
        calqueue();

        if (!Number.isFinite(durationValue) || durationValue <= 0) {
            if (idx === currentIndex) {
                nextItem.duration = 0;
            } else if (idx !== -1) {
                queue.splice(idx, 1);
                onQueueItemRemoved(nextItem);
                durationLoadUnsupportedCount++;
                try { durationLoadUnsupportedFiles.push(nextItem.displayName || nextItem.file.name); } catch { null }
                stat_up(`<i class="fa-solid fa-circle-exclamation"></i> Ignoring broken file: ${nextItem.displayName || nextItem.file.name}`);
            }
            rqueue();
            cleanup();
            return;
        }

        nextItem.duration = durationValue;
        const targetEl = nextItem._pendingDurationEl;
        const textValue = form_time_short(durationValue);
        if (targetEl && targetEl.isConnected) {
            targetEl.textContent = textValue;
        } else {
            rqueue();
        }
        cleanup();
    }

    function handleError() {
        if (generation !== durationLoadGeneration) {
            cleanup();
            return;
        }
        const idx = findIndexById(nextItem.id);
        if (idx !== -1 && idx !== currentIndex) {
            queue.splice(idx, 1);
            onQueueItemRemoved(nextItem);
            durationLoadUnsupportedCount++;
            try { durationLoadUnsupportedFiles.push(nextItem.displayName || nextItem.file.name); } catch { null }
            stat_up(`<i class="fa-solid fa-circle-exclamation"></i> Ignoring broken file: ${nextItem.displayName || nextItem.file.name}`);
        } else if (idx === currentIndex) {
            nextItem.duration = 0;
        }
        rqueue();
        cleanup();
    }

    function handleMetadata() {
        if (generation !== durationLoadGeneration) {
            cleanup();
            return;
        }
        const durationValue = Number.isFinite(audio.duration) ? audio.duration : NaN;
        audio.muted = true;
        audio.play().then(() => {
            if (generation !== durationLoadGeneration) {
                cleanup();
                return;
            }
            playbackTimer = setTimeout(() => {
                playbackTimer = null;
                handleLoaded(durationValue);
            }, 75);
        }).catch(() => {
            handleError();
        });
    }

    audio.addEventListener('loadedmetadata', handleMetadata, { once: true });
    audio.addEventListener('error', handleError, { once: true });
    try {
        objectUrl = URL.createObjectURL(nextItem.file);
        audio.src = objectUrl;
        audio.muted = true;
        audio.load();
    } catch {
        handleError();
    }
}
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
                        `${durationLoadUnsupportedCount} songs failed to load a duration, so they were marked as unplayable and omitted from the queue.
                <br><br>
                <strong>Unplayable files:</strong><br>
                ${list}`
                    );
                } else {
                    msg(
                        `${durationLoadUnsupportedCount} songs failed to load a duration, so they were marked as unplayable and omitted from the queue.
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
                    `${durationLoadUnsupportedCount} songs failed to load a duration, so they were marked as unplayable and omitted from the queue.`
                );
            }

            durationLoadUnsupportedCount = 0;
            durationLoadUnsupportedFiles = [];
        }
        return;
    }
    durationLoadInProgress = true;
    const audio = ensureDurationAudioElement();
    let objectUrl = null;

    function cleanup() {
        delete nextItem._durationLoading;
        delete nextItem._pendingDurationEl;
        durationLoadInProgress = false;
        audio.removeEventListener('loadedmetadata', handleLoaded);
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
        setTimeout(processNextDurationLoad, durationLoadDelay);
    }

    function handleLoaded() {
        const idx = findIndexById(nextItem.id);
        const pos = idx !== -1 ? idx + 1 : (queue.length ? queue.length : 1);
        const total = queue.length || 1;
        stat_up(`<i class="fa-solid fa-people-carry-box"></i> Processing: <strong>${nextItem.displayName || nextItem.file.name}</strong> (${pos} of ${total})...`);
        calqueue();

        const durationValue = Number.isFinite(audio.duration) ? audio.duration : NaN;

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

    audio.addEventListener('loadedmetadata', handleLoaded, { once: true });
    audio.addEventListener('error', handleError, { once: true });
    try {
        objectUrl = URL.createObjectURL(nextItem.file);
        audio.src = objectUrl;
        audio.load();
    } catch {
        handleError();
    }
}
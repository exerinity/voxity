let dragSrcIndex = null;

function handleDragStart(e) {
    dragSrcIndex = parseInt(this.dataset.index, 10);
    this.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
}

function handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
}

function handleDragEnter() {
    this.classList.add('drag-over');
}

function handleDragLeave() {
    this.classList.remove('drag-over');
}

function handleDrop(e) {
    e.stopPropagation();
    const dragTargetIndex = parseInt(this.dataset.index, 10);
    if (dragSrcIndex !== dragTargetIndex) {
        const [movedItem] = queue.splice(dragSrcIndex, 1);
        queue.splice(dragTargetIndex, 0, movedItem);

        if (currentIndex === dragSrcIndex) {
            currentIndex = dragTargetIndex;
        } else if (currentIndex > dragSrcIndex && currentIndex <= dragTargetIndex) {
            currentIndex -= 1;
        } else if (currentIndex < dragSrcIndex && currentIndex >= dragTargetIndex) {
            currentIndex += 1;
        }

        rqueue();
    }
    return false;
}

function handleDragEnd() {
    const items = elements.queueList.querySelectorAll('.queue-item');
    items.forEach((item) => {
        item.classList.remove('dragging', 'drag-over');
    });
}

async function handleEntry(entry, options = {}) {
    if (!entry) return;
    const opts = options && typeof options === 'object' ? options : {};
    const { fromDirectory = false } = opts;

    if (entry.isFile) {
        await new Promise(resolve => {
            entry.file(file => {
                quf([file], { ignoreInvalid: fromDirectory });
                resolve();
            });
        });

    } else if (entry.isDirectory) {
        const reader = entry.createReader();

        async function readBatch() {
            return new Promise(resolve => {
                reader.readEntries(async entries => {
                    if (entries.length === 0) return resolve();

                    for (const e of entries) {
                        await handleEntry(e, { fromDirectory: true });
                    }

                    resolve(await readBatch());
                });
            });
        }

        await readBatch();
    }
}
document.getElementById('status').addEventListener('click', debounce(() => {
    if (!metadata.title && !metadata.artist) {
        const modalPromise = msg(about_content, "About Voxity");
        window.VoxityRouter?.setModalRoute(modalPromise, '/about');
        return modalPromise;
    }
    const name = metadata.title + ' by ' + metadata.artist;
    navigator.clipboard.writeText(name).then(() => {
        throw_error(`Copied song to clipboard`, true);
    }).catch(err => {
        throw_error('Failed to copy - is Voxity allowed to access your clipboard?');
    });
}));

document.getElementById('np2').addEventListener('click', debounce(() => {
    if (!metadata.title) {
        return throw_error('No title to copy!');
    }
    navigator.clipboard.writeText(metadata.title).then(() => {
        throw_error('Copied title to clipboard', true);
    }).catch(err => {
        throw_error('Failed to copy - is Voxity allowed to access your clipboard?');
    });
}));

document.getElementById('artist').addEventListener('click', debounce(() => {
    if (!metadata.artist) {
        return throw_error('No artist to copy!');
    }
    navigator.clipboard.writeText(metadata.artist).then(() => {
        throw_error('Copied artist to clipboard', true);
    }).catch(err => {
        throw_error('Failed to copy - is Voxity allowed to access your clipboard?');
    });
}));

document.getElementById('album').addEventListener('click', debounce(() => {
    if (!metadata.album) {
        return throw_error('No album to copy!');
    }
    navigator.clipboard.writeText(metadata.album).then(() => {
        throw_error('Copied album to clipboard', true);
    }).catch(err => {
        throw_error('Failed to copy - is Voxity allowed to access your clipboard?');
    });
}));
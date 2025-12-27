var uptodate = null;

// If ?noinstall is present, do NOT install the service worker
const noInstall = new URLSearchParams(location.search).has('noinstall');

if ('serviceWorker' in navigator && !noInstall) {
  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js');

      uptodate = true;

      if (registration.waiting) {
        if (typeof throw_error === 'function') {
          throw_error('A new version is ready to install, <a href="#" onclick="window.location.href=window.location.href.split(\'?\')[0]+\'?cachebuster=\'+Date.now();return false;">please refresh the app to finish</a>', true);
        }
        uptodate = false;
      }

      registration.addEventListener('updatefound', () => {
        const nw = registration.installing;
        if (!nw) {
          uptodate = true;
          return;
        }

        nw.addEventListener('statechange', () => {
          stat_up('<i class="fa-solid fa-download fa-fade"></i> The Service Worker is updating...');
          if (nw.state === 'installed') {
            if (navigator.serviceWorker.controller) {
              if (typeof throw_error === 'function') {
                stat_up('<i class="fa-solid fa-download"></i> The Service Worker was updated');
                /*msg(
                  'There is a new version of Voxity available! ' +
                  'Please <a href="#" onclick="window.location.href=window.location.href.split(\'?\')[0]+\'?cachebuster=\'+Date.now();return false;">refresh the page</a> to update - or to ensure it <i>actually</i> updates, click that hyperlink.<br>' +
                  '<small>Or, if you don\'t want to, just close this box, I won\'t force you...</small>',
                  'Voxity update'
                );*/
                throw_error('A new version is ready to install, <a href="#" onclick="window.location.href=window.location.href.split(\'?\')[0]+\'?cachebuster=\'+Date.now();return false;">please refresh the app to finish</a>', true);
              }
              uptodate = false;
            } else {
              if (typeof throw_error === 'function') {
                stat_up('<i class="fa-solid fa-check"></i> Service Worker finished updating');
                throw_error('Ready to work offline', true);
              }
              uptodate = true;
            }
          }
        });
      });
    } catch (error) {
      console.error('SW registration failed:', error);
      if (typeof throw_error === 'function') {
        stat_up('<i class="fa-solid fa-triangle-exclamation"></i> Service Worker registration failed');
        throw_error("Service worker failed to start: Voxity won't work offline");
      }
    }
  });
} else if (noInstall) {
  console.log("The Service Worker will not install");
}
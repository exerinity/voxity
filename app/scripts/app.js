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
          throw_error('New version available - refresh to update', true);
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
          if (nw.state === 'installed') {
            if (navigator.serviceWorker.controller) {
              if (typeof throw_error === 'function') {
                msg(
                  '<h1>New update</h1>There is a new version of Voxity available! ' +
                  'Please <a href="#" onclick="window.location.href=window.location.href.split(\'?\')[0]+\'?cachebuster=\'+Date.now();return false;">refresh the page</a> to update - or to ensure it <i>actually</i> updates, click that hyperlink.<br>' +
                  '<small>Or, if you don\'t want to, just close this box, I won\'t force you...</small>',
                  'Voxity update'
                );
              }
              uptodate = false;
            } else {
              if (typeof throw_error === 'function') {
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
        throw_error("Service worker failed to start: Voxity won't work offline");
      }
    }
  });
} else if (noInstall) {
  null
}
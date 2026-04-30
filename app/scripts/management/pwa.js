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
        stat_up('<i class="fa-solid fa-download fa-fade"></i> Starting service worker...', 7500);
        if (!nw) {
          uptodate = true;
          return;
        }

        nw.addEventListener('statechange', () => {
          stat_up('<i class="fa-solid fa-download fa-fade"></i> The service worker is updating...', 7500);
          if (nw.state === 'installed') {
            if (navigator.serviceWorker.controller) {
              if (typeof throw_error === 'function') {
                stat_up('<i class="fa-solid fa-download"></i> The service worker was updated', 10000);
                msg(
                  'There is a new version of Voxity available! ' +
                  'Please <a href="#" onclick="window.location.href=window.location.href.split(\'?\')[0]+\'?cachebuster=\'+Date.now();return false;">refresh the app</a> to update - or to ensure it <i>actually</i> updates, click that hyperlink.<br>' +
                  '<hr><a href="/i/release_notes" onclick="event.preventDefault(); relnote()">View release notes</a><br>' +
                  '<small>Or, if you don\'t want to, just close this box, I won\'t force you...</small>'
                );
              }
              uptodate = false;
            } else {
              if (typeof throw_error === 'function') {
                stat_up('<i class="fa-solid fa-check"></i> Service worker finished updating');
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
        stat_up('<i class="fa-solid fa-triangle-exclamation"></i> Service worker registration failed');
        throw_error("Service worker failed to start: Voxity won't work offline");
      }
    }
  });
} else if (noInstall) {
  console.log("The service worker will not install");
  setTimeout( function () { stat_up('<i class="fa-solid fa-road-circle-xmark fa-fade"></i> The service worker will not install', 7500); }, 2500);
}
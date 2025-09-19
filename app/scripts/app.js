if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js');

      if (registration.waiting && typeof throw_error === 'function') {
        throw_error('New version available - refresh to update', true);
      }

      registration.addEventListener('updatefound', () => {
        const nw = registration.installing;
        if (!nw) return;

        nw.addEventListener('statechange', () => {
          if (nw.state === 'installed') {
            if (navigator.serviceWorker.controller) {
              typeof throw_error === 'function'
                ? msg('<h1>New update</h1>There is a new version of Audion available! Please refresh the page to update - or to ensure it <i>actually</i> updates, do a hard refresh by pressing Ctrl + F5 (or Cmd + Shift + R on Mac).<br><small>Or, if you don\'t want to, just close this box...</small>', 'Audion update')
                : console.log('New version available - refresh to update');
            } else {
              throw_error('Ready to work offline', true);
            }
          }
        });
      });
    } catch (error) {
      console.error('SW registration failed:', error);
      throw_error("Service worker failed to start");
    }
  });
}
const CACHE_NAME = 'voxity95';
const sc = '/app/scripts/';
const cs = '/app/stylesheets/';
const ms = '/app/media/';
const fonts = '/app/fonts/';
const webfonts = '/app/webfonts/';

const FILES_TO_CACHE = [
  '/',
  '/entry',
  '/install',
  '/releases',
  '/cover',
  '/favicon.ico',
  '/manifest.json',
  '/sw.js',

  // media
  ms+'welcome.ogg',
  ms+'error.ogg',
  ms+'message.ogg',
  ms+'done.ogg',
  ms+'time.ogg',

  // stylesheets
  cs+'controls.css',
  cs+'fontawesome.css',
  cs+'miscellaneous.css',
  cs+'structure.css',
  cs+'styles.css',
  cs+'tandem.css',
  cs+'themes.css',

  // scripts - library
  sc+'library/jsmediatags.js',

  // scripts - management
  sc+'management/elementmap.js',
  sc+'management/hotkeys.js',
  sc+'management/initialize.js',
  sc+'management/notifications.js',
  sc+'management/play.js',
  sc+'management/pwa.js',
  sc+'management/settings.js',
  sc+'management/sleeptimer.js',
  sc+'management/tabtitle.js',
  sc+'management/wakelock.js',

  // scripts - audio
  sc+'audio/analyzer.js',
  sc+'audio/event.js',
  sc+'audio/visualizer.js',

  // scripts - queue
  sc+'queue/detersubtitles.js',
  sc+'queue/drag.js',
  sc+'queue/handler.js',
  sc+'queue/loading.js',
  sc+'queue/render.js',
  sc+'queue/shuffle.js',
  sc+'queue/statuses.js',
  sc+'queue/utilities.js',

  // scripts - lyrics
  sc+'lyrics/engine.js',
  sc+'lyrics/metadata.js',
  sc+'lyrics/pastelyrics.js',
  sc+'lyrics/searchlyrics.js',
  sc+'lyrics/source.js',

  // scripts - ui
  sc+'ui/accents.js',
  sc+'ui/clicktocopy.js',
  sc+'ui/controls.js',
  sc+'ui/error.js',
  sc+'ui/hello.js',
  sc+'ui/inputmodal.js',
  sc+'ui/modal.js',
  sc+'ui/preferences.js',
  sc+'ui/status.js',
  sc+'ui/textscroller.js',

  // scripts - misc
  sc+'miscellaneous/formathelp.js',
  sc+'miscellaneous/mediasession.js',
  sc+'miscellaneous/pwachecker.js',
  sc+'miscellaneous/releasenotes.js',
  sc+'miscellaneous/router.js',
  sc+'miscellaneous/statictext.js',

  // fonts
  fonts+'inter/Inter.subset.woff2',
  fonts+'inter/Inter-Italic.subset.woff2',
  fonts+'googlesansflex/GoogleSansFlex.subset.woff2',

  // webfonts
  webfonts+'fa-brands-400.woff2',
  webfonts+'fa-regular-400.woff2',
  webfonts+'fa-solid-900.woff2',
  webfonts+'fa-v4compatibility.woff2',

  // release notes src
  '/app/relnote/scripts/control.js',
  '/app/relnote/stylesheets/control.css',
];

self.addEventListener('install', event => {
  console.log('Installing...');
  event.waitUntil((async () => {
    try {
      const cache = await caches.open(CACHE_NAME);
      const results = await Promise.allSettled(
        FILES_TO_CACHE.map(url =>
          fetch(url, { cache: 'reload' })
            .then(res => ({ url, res }))
        )
      );

      let okCount = 0;
      results.forEach(r => {
        if (r.status === 'fulfilled' && r.value.res && r.value.res.ok) {
          okCount++;
          cache.put(r.value.url, r.value.res.clone()).catch(err =>
            console.warn('Cache put failed for', r.value.url, err)
          );
        } else {
          const url = r.status === 'fulfilled' ? r.value.url : '(unknown)';
          const status = r.status === 'fulfilled' && r.value.res ? r.value.res.status : r.reason;
          console.warn('Skipping precache for', url, '->', status);
        }
      });

      console.log(`Precache complete: ${okCount}/${FILES_TO_CACHE.length} cached`);
    } catch (err) {
      console.error('Failed to pre-cache:', err);
    }
  })());
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) return caches.delete(key);
          return Promise.resolve();
        })
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('message', event => {
  if (!event.data) return;
  if (event.data.action === 'skipWaiting') {
    self.skipWaiting();
  }
});

function same(request) {
  return new URL(request.url).origin === self.location.origin;
}

self.addEventListener('fetch', event => {
  const req = event.request;

  if (req.method !== 'GET') return;
  if (!same(req)) return;

  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then(netres => {
          const copy = netres.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(req, copy));
          return netres;
        })
        .catch(() =>
          caches.match(req).then(cached => cached || caches.match('/index.html'))
        )
    );
    return;
  }

  event.respondWith(
    caches.match(req).then(cares => {
      const netfet = fetch(req)
        .then(netres => {
          if (netres && netres.status === 200) {
            caches.open(CACHE_NAME).then(cache =>
              cache.put(req, netres.clone())
            );
          }
          return netres;
        })
        .catch(() => undefined);

      return cares || netfet;
    })
  );
});
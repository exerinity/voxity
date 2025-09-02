const CACHE_NAME = 'audion40';
const FILES_TO_CACHE = [
  '/',                // root
  '/index.html',
  '/entry.html',
  '/404.html',
  '/favicon.ico',
  '/LICENSE',
  '/README.md',
  '/manifest.json',
  '/sw.js',
  '/_redirects',

  // stylesheets
  '/app/stylesheets/styles.css',
  '/app/stylesheets/fontawesome.css',

  // scripts
  '/app/scripts/main.js',
  '/app/scripts/app.js',
  '/app/scripts/audio.js',
  '/app/scripts/buttons.js',
  '/app/scripts/error.js',
  '/app/scripts/hotkeys.js',
  '/app/scripts/jsmediatags.min.js',
  '/app/scripts/lyrics.js',
  '/app/scripts/message.js',
  '/app/scripts/title.js',
  '/app/scripts/visualizer.js',

  // fonts
  '/app/fonts/inter/Inter-Italic-VariableFont_opsz,wght.ttf',
  '/app/fonts/inter/Inter-VariableFont_opsz,wght.ttf',

  // webfonts
  '/app/webfonts/fa-brands-400.woff2',
  '/app/webfonts/fa-regular-400.woff2',
  '/app/webfonts/fa-solid-900.woff2',
  '/app/webfonts/fa-v4compatibility.woff2'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(FILES_TO_CACHE))
      .catch(err => console.error('Failed to pre-cache:', err))
  );
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

const CACHE_NAME = 'voxity84b';
const sc = '/app/scripts/';
const cs = '/app/stylesheets/';
const ms = '/app/media/';
const FILES_TO_CACHE = [
  '/', // root
  '/entry',
  '/i/how_pwa',
  '/i/release_notes',
  '/i/imageview',
  '/favicon.ico',
  '/favicona.png',
  '/manifest.json',
  '/sw.js',

  // media 
  ms+'/welcome.ogg',
  ms+'/error.ogg',
  ms+'/message.ogg',
  ms+'/done.ogg',

  // stylesheets
  cs+'controls.css',
  cs+'fontawesome.css',
  cs+'miscellaneous.css',
  cs+'structure.css',
  cs+'styles.css',
  cs+'tandem.css',
  cs+'themes.css',

  // scripts
  sc+'main.js',
  sc+'app.js',
  sc+'audio.js',
  sc+'buttons.js',
  sc+'error.js',
  sc+'hotkeys.js',
  sc+'jsmediatags.js',
  sc+'lyrics.js',
  sc+'message.js',
  sc+'title.js',
  sc+'visualizer.js',
  sc+'api.js',
  sc+'twemoji.js',
  sc+'text.js',
  sc+'settings.js',

  // fonts
  '/app/fonts/inter/Inter-Italic-VariableFont_opsz,wght.ttf',
  '/app/fonts/inter/Inter-VariableFont_opsz,wght.ttf',

  // webfonts
  '/app/webfonts/fa-brands-400.woff2',
  '/app/webfonts/fa-regular-400.woff2',
  '/app/webfonts/fa-solid-900.woff2',
  '/app/webfonts/fa-v4compatibility.woff2'
];
console.log('Service worker initializing...');

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

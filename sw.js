// Cache-first service worker so the app opens instantly (and offline) in the gym.
const CACHE = '648-workout-v2';
const ASSETS = ['.', 'index.html', 'css/style.css', 'js/exercises.js', 'js/anims.js', 'js/program.js', 'js/cardio.js', 'js/app.js', 'manifest.webmanifest', 'icon.svg', 'apple-touch-icon.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Network-first everywhere so app updates always land; cache is the offline fallback.
self.addEventListener('fetch', (e) => {
  e.respondWith(
    fetch(e.request).then(res => {
      if (res.ok && e.request.url.startsWith(self.location.origin)) {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, copy));
      }
      return res;
    }).catch(() =>
      caches.match(e.request).then(r => r || (e.request.mode === 'navigate' ? caches.match('index.html') : undefined))
    )
  );
});

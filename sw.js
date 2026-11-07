// Keeps the app's own files on the device so it opens without a connection.
// Change VERSION on every release so devices pick up the new files.
const VERSION = 'crew-monitor-22';
const FILES = [
  './', './index.html', './style.css', './config.js', './lib.js', './api.js', './reports.js', './app.js',
  './manifest.webmanifest', './icons/icon-192.png', './icons/icon-512.png',
  './vendor/jspdf.umd.min.js', './vendor/jspdf.plugin.autotable.min.js',
];
const KEEP = [VERSION, 'crew-last-data'];

self.addEventListener('install', (event) => {
  // Straight from the server, so a new version can't pick up old files from the browser's cache.
  event.waitUntil(
    caches.open(VERSION)
      .then((cache) => cache.addAll(FILES.map((file) => new Request(file, { cache: 'reload' }))))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((names) => Promise.all(names.filter((n) => !KEEP.includes(n)).map((n) => caches.delete(n))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  // Sheet data always goes to the server, and only this app's own files are cached.
  if (event.request.method !== 'GET' || url.origin !== self.location.origin) return;
  event.respondWith(
    caches.match(event.request, { ignoreSearch: true }).then((hit) => hit || fetch(event.request)),
  );
});

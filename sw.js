'use strict';

const PREFIX = 'jf-agenda:' + self.registration.scope + ':';
const CACHE = PREFIX + 'v02';
const ASSETS = ['./index.html', './manifest.webmanifest', './icon.svg'];
const ENTRY = new URL('./index.html', self.registration.scope).href;

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await cache.addAll(ASSETS.map(url => new Request(new URL(url, self.registration.scope), {cache: 'reload'})));
    await self.skipWaiting();
  })());
});
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key.startsWith(PREFIX) && key !== CACHE).map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});
self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const scope = new URL(self.registration.scope);
  const url = new URL(request.url);
  if (url.origin !== scope.origin || !url.pathname.startsWith(scope.pathname)) return;
  const relative = url.pathname.slice(scope.pathname.length);
  const entry = request.mode === 'navigate' && (relative === '' || relative === 'index.html');
  if (!entry && !ASSETS.includes('./' + relative)) return;
  event.respondWith((async () => {
    try {
      return await fetch(request);
    } catch {
      const cache = await caches.open(CACHE);
      return await cache.match(entry ? ENTRY : new URL(relative, scope).href) || Response.error();
    }
  })());
});

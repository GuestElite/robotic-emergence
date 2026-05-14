// Service Worker minimal pour Robotic Emergence (PWA installable).
// Stratégie :
// - Sprites/audio/icones : cache-first long terme (assets immuables).
// - HTML/JS/CSS : network-first avec fallback cache (le code change souvent).
// - Le reste passe direct au réseau.
//
// Bump CACHE_VERSION quand on veut purger les anciens caches.
const CACHE_VERSION = "re-v4";
const ASSET_CACHE = `${CACHE_VERSION}-assets`;
const APP_CACHE = `${CACHE_VERSION}-app`;

// Pré-cache minimal au install (boot offline du shell).
const PRECACHE_URLS = [
  "/prototype/",
  "/prototype/style.css",
  "/manifest.json",
];

self.addEventListener("install", (evt) => {
  evt.waitUntil(
    caches.open(APP_CACHE).then((cache) => cache.addAll(PRECACHE_URLS).catch(() => {}))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (evt) => {
  evt.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => !k.startsWith(CACHE_VERSION)).map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

function isAsset(url) {
  return /\.(png|jpg|jpeg|webp|svg|woff2?|mp3|wav|ogg|ico)$/i.test(url.pathname)
    || url.pathname.startsWith("/icons/")
    || url.pathname.startsWith("/08-art-direction/");
}

function isAppShell(url) {
  return url.pathname.endsWith(".html")
    || url.pathname.endsWith(".js")
    || url.pathname.endsWith(".css")
    || url.pathname === "/"
    || /\/$/.test(url.pathname);
}

self.addEventListener("fetch", (evt) => {
  const req = evt.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  // Skip cross-origin (Supabase, fonts CDN, etc.)
  if (url.origin !== location.origin) return;
  // Skip API/auth realtime (jamais cacher)
  if (url.pathname.startsWith("/api/") || url.pathname.includes("supabase")) return;

  if (isAsset(url)) {
    // Cache-first. Skip range requests (audio/video seek → 206) — Cache API ne supporte que 200.
    if (req.headers.get("range")) return;
    evt.respondWith(
      caches.match(req).then((cached) => {
        if (cached) return cached;
        return fetch(req).then((res) => {
          if (res.ok && res.status === 200) {
            const clone = res.clone();
            caches.open(ASSET_CACHE).then((c) => c.put(req, clone)).catch(() => {});
          }
          return res;
        });
      })
    );
    return;
  }

  if (isAppShell(url)) {
    // Network-first avec fallback cache
    evt.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok && res.status === 200) {
            const clone = res.clone();
            caches.open(APP_CACHE).then((c) => c.put(req, clone)).catch(() => {});
          }
          return res;
        })
        .catch(() => caches.match(req).then((c) => c || caches.match("/prototype/")))
    );
    return;
  }
});

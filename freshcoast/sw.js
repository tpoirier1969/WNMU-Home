const CACHE_PREFIX = "fresh-coast-viewer-";
const CACHE_NAME = CACHE_PREFIX + "20260929-16";
const NETWORK_TIMEOUT_MS = 2500;

const CORE_ASSETS = [
  "./",
  "./index.html",
  "./live.html",
  "./styles.css?v=20260929-12",
  "./data.js?v=20260928-8",
  "./app.js?v=20260929-16",
  "./manifest.webmanifest",
  "../icon-192.png",
  "../icon-512.png"
];

self.addEventListener("install", event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(CORE_ASSETS);
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(
      keys
        .filter(key => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME)
        .map(key => caches.delete(key))
    );
    await self.clients.claim();
  })());
});

async function fetchWithTimeout(request) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), NETWORK_TIMEOUT_MS);
  try {
    return await fetch(request, { signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function networkFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const response = await fetchWithTimeout(request);
    if (response && (response.ok || response.type === "opaque")) {
      await cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    const cached = await cache.match(request, { ignoreSearch: true });
    if (cached) return cached;

    if (request.mode === "navigate") {
      const url = new URL(request.url);
      const fallback = url.pathname.endsWith("/live.html") ? "./live.html" : "./index.html";
      const shell = await cache.match(fallback);
      if (shell) return shell;
    }

    throw error;
  }
}

self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  const isFreshCoastAsset = url.origin === self.location.origin;
  if (request.mode === "navigate" || isFreshCoastAsset) {
    event.respondWith(networkFirst(request));
  }
});

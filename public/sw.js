const CACHE_VERSION = "meine-app-cache-v1";
const CACHE_ALLOWLIST = [CACHE_VERSION];
const PRECACHE_URLS = ["/", "/offline"];
const NETWORK_ONLY_HOSTS = ["supabase.co"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_VERSION)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => !CACHE_ALLOWLIST.includes(key))
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") {
    return;
  }

  const { hostname, origin, pathname } = new URL(event.request.url);

  if (NETWORK_ONLY_HOSTS.some((host) => hostname.includes(host))) {
    return;
  }

  if (origin !== self.location.origin) {
    event.respondWith(fetch(event.request));
    return;
  }

  if (pathname.startsWith("/_next/") || pathname.includes("/api/")) {
    event.respondWith(networkFirst(event.request));
    return;
  }

  if (event.request.mode === "navigate") {
    event.respondWith(pageStrategy(event.request));
    return;
  }

  event.respondWith(staticAssetStrategy(event.request));
});

const pageStrategy = async (request) => {
  try {
    const networkResponse = await fetch(request);
    const cache = await caches.open(CACHE_VERSION);
    cache.put(request, networkResponse.clone());
    return networkResponse;
  } catch (error) {
    const cached = await caches.match(request);
    if (cached) {
      return cached;
    }

    const offlineFallback = await caches.match("/offline");
    if (offlineFallback) {
      return offlineFallback;
    }

    throw error;
  }
};

const staticAssetStrategy = async (request) => {
  const cache = await caches.open(CACHE_VERSION);
  const cached = await cache.match(request);

  if (cached) {
    return cached;
  }

  const networkResponse = await fetch(request);
  if (
    networkResponse &&
    networkResponse.status === 200 &&
    networkResponse.type === "basic"
  ) {
    cache.put(request, networkResponse.clone());
  }

  return networkResponse;
};

const networkFirst = async (request) => {
  const cache = await caches.open(CACHE_VERSION);
  try {
    const response = await fetch(request);
    if (
      response &&
      response.status === 200 &&
      response.type === "basic" &&
      request.url.startsWith(self.location.origin)
    ) {
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    const cached = await cache.match(request);
    if (cached) {
      return cached;
    }
    throw error;
  }
};

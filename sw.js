// ═══════════════════════════════════════════════════════════════
// NEUTRALIZAM — sw.js (Service Worker)
// Caching strategija: Cache-first za statiku, Network-first za Firebase
// ═══════════════════════════════════════════════════════════════

const CACHE_NAME = "neutralizam-v2";
const CACHE_OFFLINE = "neutralizam-offline-v2";

// Statični resursi za predučitavanje (install faza)
const PRECACHE_URLS = [
  "/",
  "/index.html",
  "/style.css",
  "/script.js",
  "/manifest.json",
  "/offline.html",
  "/assets/logo.png",
  "/privatnost.html",
  "/uvjeti.html",
  "/impressum.html"
];

// ── Install ──────────────────────────────────────────────────
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      // Pokušaj predučitati sve; ako nešto ne uspije, nastavi dalje
      return Promise.allSettled(
        PRECACHE_URLS.map(url =>
          cache.add(url).catch(err => {
            console.warn("[SW] Nije moguće predučitati:", url, err);
          })
        )
      );
    }).then(() => self.skipWaiting())
  );
});

// ── Activate ─────────────────────────────────────────────────
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => k !== CACHE_NAME && k !== CACHE_OFFLINE)
          .map(k => {
            console.log("[SW] Brišem stari cache:", k);
            return caches.delete(k);
          })
      )
    ).then(() => self.clients.claim())
  );
});

// ── Fetch ─────────────────────────────────────────────────────
self.addEventListener("fetch", event => {
  const { request } = event;
  const url = new URL(request.url);

  // Preskoči ne-GET zahtjeve
  if (request.method !== "GET") return;

  // Preskoči Firebase, Google Fonts, CDN zahtjeve — uvijek mreža
  if (
    url.hostname.includes("googleapis.com") ||
    url.hostname.includes("gstatic.com") ||
    url.hostname.includes("firebaseapp.com") ||
    url.hostname.includes("firebaseio.com") ||
    url.hostname.includes("cloudfunctions.net") ||
    url.hostname.includes("firebase.com") ||
    url.hostname.includes("google.com") ||
    url.protocol === "chrome-extension:"
  ) {
    return;
  }

  // HTML stranice — Network-first, fallback na cache, pa offline.html
  if (request.headers.get("accept")?.includes("text/html")) {
    event.respondWith(
      fetch(request)
        .then(response => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(request);
          if (cached) return cached;
          const offlinePage = await caches.match("/offline.html");
          return offlinePage || new Response("Offline", { status: 503 });
        })
    );
    return;
  }

  // CSS, JS, slike — Cache-first, ažuriraj u pozadini
  event.respondWith(
    caches.match(request).then(cached => {
      const networkFetch = fetch(request)
        .then(response => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => null);

      return cached || networkFetch;
    })
  );
});
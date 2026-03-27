// ═══════════════════════════════════════════════════════════════
// NEUTRALIZAM — sw.js  v1.2
// Stale-while-revalidate za statiku · Network-only za Firebase
// Offline fallback page · Push notifications (pripremljeno)
// ═══════════════════════════════════════════════════════════════

const CACHE_VER    = "neutralizam-v1.2";
const FONTS_CACHE  = "neutralizam-fonts-v1";
const OFFLINE_URL  = "/offline.html";

// ── Resursi koji se odmah kešuju pri instalaciji ────────────────
const PRECACHE = [
  "/",
  "/index.html",
  "/style.css",
  "/script.js",
  "/manifest.json",
  "/offline.html",
  "/assets/logo.png"
];

// ── Domene koje UVIJEK idu na mrežu ────────────────────────────
const NETWORK_ONLY = [
  "firestore.googleapis.com",
  "firebase.googleapis.com",
  "identitytoolkit.googleapis.com",
  "securetoken.googleapis.com",
  "www.gstatic.com"         // Firebase SDK CDN
];

// ────────────────────────────────────────────────────────────────
// INSTALL
// ────────────────────────────────────────────────────────────────
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_VER)
      .then(cache => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting())
      .catch(err => console.warn("[SW] Precache failed:", err))
  );
});

// ────────────────────────────────────────────────────────────────
// ACTIVATE — čišćenje starih cacheva
// ────────────────────────────────────────────────────────────────
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => k !== CACHE_VER && k !== FONTS_CACHE)
          .map(k => {
            console.log("[SW] Deleting old cache:", k);
            return caches.delete(k);
          })
      )
    ).then(() => self.clients.claim())
  );
});

// ────────────────────────────────────────────────────────────────
// FETCH — tri strategije ovisno o izvoru
// ────────────────────────────────────────────────────────────────
self.addEventListener("fetch", event => {
  const { request } = event;
  const url = new URL(request.url);

  // 1) Preskoči non-GET
  if (request.method !== "GET") return;

  // 2) Network-only za Firebase APIs
  if (NETWORK_ONLY.some(h => url.hostname.includes(h))) return;

  // 3) Cache-first za Google Fonts (dugo žive)
  if (
    url.hostname === "fonts.googleapis.com" ||
    url.hostname === "fonts.gstatic.com"
  ) {
    event.respondWith(
      caches.open(FONTS_CACHE).then(async cache => {
        const cached = await cache.match(request);
        if (cached) return cached;
        try {
          const res = await fetch(request);
          if (res.ok) cache.put(request, res.clone());
          return res;
        } catch {
          return new Response("", { status: 408 });
        }
      })
    );
    return;
  }

  // 4) Stale-while-revalidate za sve ostalo (statika iste domene)
  event.respondWith(
    caches.open(CACHE_VER).then(async cache => {
      const cached = await cache.match(request);

      const networkFetch = fetch(request)
        .then(res => {
          if (
            res.ok &&
            res.type === "basic" &&
            url.origin === self.location.origin
          ) {
            cache.put(request, res.clone());
          }
          return res;
        })
        .catch(() => null);

      // Vrati cache odmah, osvježi u pozadini
      if (cached) {
        event.waitUntil(networkFetch);
        return cached;
      }

      // Nema cachea — čekaj mrežu
      const fresh = await networkFetch;
      if (fresh) return fresh;

      // Offline fallback za HTML navigacije
      if (request.headers.get("accept")?.includes("text/html")) {
        return caches.match(OFFLINE_URL);
      }

      return new Response("Offline", { status: 503, statusText: "Service Unavailable" });
    })
  );
});

// ────────────────────────────────────────────────────────────────
// MESSAGE — ručni skip waiting (za "Update available" toast)
// ────────────────────────────────────────────────────────────────
self.addEventListener("message", event => {
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
});

// ────────────────────────────────────────────────────────────────
// PUSH NOTIFICATIONS (pripremljeno)
// ────────────────────────────────────────────────────────────────
self.addEventListener("push", event => {
  if (!event.data) return;
  let data;
  try { data = event.data.json(); } catch { data = { title: "Neutralizam", body: event.data.text() }; }
  event.waitUntil(
    self.registration.showNotification(data.title ?? "Neutralizam", {
      body:  data.body  ?? "",
      icon:  "/assets/logo.png",
      badge: "/assets/logo.png",
      tag:   "neutralizam-push",
      renotify: true,
      data: { url: data.url ?? "/" }
    })
  );
});

self.addEventListener("notificationclick", event => {
  event.notification.close();
  const target = event.notification.data?.url ?? "/";
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true })
      .then(ws => {
        const existing = ws.find(w => w.url === target);
        return existing ? existing.focus() : clients.openWindow(target);
      })
  );
});

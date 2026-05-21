const CACHE_NAME = "coo-v1";
const PRECACHE = ["/", "/schedule", "/offline"];

// ── Install: precache shell pages ─────────────────────────────────────────
self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((c) => c.addAll(PRECACHE).catch(() => {}))
  );
  self.skipWaiting();
});

// ── Activate: prune old caches ────────────────────────────────────────────
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
      )
  );
  self.clients.claim();
});

// ── Fetch: network-first, fall back to cache ──────────────────────────────
self.addEventListener("fetch", (e) => {
  // Only handle GET requests for same-origin navigation
  if (e.request.method !== "GET") return;
  const url = new URL(e.request.url);
  if (url.origin !== self.location.origin) return;

  // For navigation requests, try network → cache → offline page
  if (e.request.mode === "navigate") {
    e.respondWith(
      fetch(e.request).catch(() =>
        caches.match(e.request).then((r) => r || caches.match("/offline"))
      )
    );
    return;
  }

  // For other same-origin requests: network-first
  e.respondWith(fetch(e.request).catch(() => caches.match(e.request)));
});

// ── Push: show notification ───────────────────────────────────────────────
self.addEventListener("push", (e) => {
  if (!e.data) return;

  let payload;
  try {
    payload = e.data.json();
  } catch {
    payload = { title: "COO", body: e.data.text(), url: "/schedule" };
  }

  const { title = "COO", body = "", url = "/schedule", icon, badge } = payload;

  const options = {
    body,
    icon: icon || "/icons/icon-192.png",
    badge: badge || "/icons/icon-192.png",
    data: { url },
    vibrate: [200, 100, 200],
    requireInteraction: false,
    tag: url, // collapse same-url notifications
    renotify: true,
  };

  e.waitUntil(self.registration.showNotification(title, options));
});

// ── Notification click: focus / open the relevant page ────────────────────
self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const target = e.notification.data?.url || "/schedule";

  e.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clients) => {
        const existing = clients.find(
          (c) => new URL(c.url).pathname === new URL(target, self.location.origin).pathname
        );
        if (existing) return existing.focus();
        return self.clients.openWindow(target);
      })
  );
});

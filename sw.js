self.addEventListener("install", e => {
  self.skipWaiting();
  e.waitUntil(
    caches.open("console").then(cache => cache.addAll(["/", "index.html"]))
  );
});

self.addEventListener("activate", e => {
  self.clients.claim();
});

self.addEventListener("push", e => {
  const data = e.data ? e.data.json() : { title: "Console Chat", body: "New message" };

  self.registration.showNotification(data.title, {
    body: data.body,
    icon: "/icon.png",
    badge: "/icon.png",
    vibrate: [100, 50, 100]
  });
});

self.addEventListener("notificationclick", e => {
  e.notification.close();
  e.waitUntil(
    clients.matchAll({ type: "window" }).then(clientList => {
      for (const client of clientList) {
        if (client.url === "/" && "focus" in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow("/");
    })
  );
});

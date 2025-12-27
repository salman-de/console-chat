self.addEventListener("install", e => {
  e.waitUntil(
    caches.open("console").then(cache => cache.add("index.html"))
  );
});

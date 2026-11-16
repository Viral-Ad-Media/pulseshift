const CACHE = "pulseshift-static-v1";
self.addEventListener("install", (event) =>
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      const response = await fetch("/", { cache: "reload" });
      if (!response.ok) throw new Error("Offline shell unavailable");
      const html = await response.clone().text();
      const assets = [
        ...html.matchAll(/(?:src|href)="(\/assets\/[^"?#]+)"/g),
      ].map((m) => m[1]);
      await cache.put("/", response);
      await cache.addAll(assets);
      self.skipWaiting();
    })(),
  ),
);
self.addEventListener("activate", (event) =>
  event.waitUntil(
    (async () => {
      for (const key of await caches.keys())
        if (key.startsWith("pulseshift-static-") && key !== CACHE)
          await caches.delete(key);
      await self.clients.claim();
    })(),
  ),
);
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  const shell =
    event.request.mode === "navigate" &&
    (url.pathname === "/" || url.pathname === "/index.html");
  const asset = url.pathname.startsWith("/assets/");
  if (
    event.request.method !== "GET" ||
    url.origin !== self.location.origin ||
    (!asset && !shell)
  )
    return;
  event.respondWith(
    (async () => {
      try {
        const response = await fetch(event.request);
        if (
          response.ok &&
          (asset ||
            (shell &&
              (response.headers.get("content-type") || "").includes(
                "text/html",
              )))
        ) {
          const cache = await caches.open(CACHE);
          await cache.put(shell ? "/" : event.request, response.clone());
        }
        return response;
      } catch {
        return (
          (await caches.match(shell ? "/" : event.request)) || Response.error()
        );
      }
    })(),
  );
});

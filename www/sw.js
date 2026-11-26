/* 몽글 대장간 — 오프라인 캐시 서비스 워커 */
const CACHE_NAME = "abyss-forge-v3-1-0";
const ASSETS = [
  "./",
  "./index.html",
  "./css/style.css",
  "./js/data.js",
  "./js/sprites.js",
  "./js/core.js",
  "./js/vfx.js",
  "./js/ui.js",
  "./manifest.json",
  "./assets/arena-bg.jpg",
  "./assets/forge-bg.jpg",
  "./assets/hero.png",
  "./assets/boss-demon.png",
  "./assets/boss-dragon.png",
  "./assets/boss-knight.png",
  "./assets/monster-fiend.png",
  "./assets/monster-undead.png",
  "./assets/sword-mythic.png",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-maskable-512.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(ASSETS).catch(() => {}))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);

  // 외부(폰트) 요청은 네트워크 우선
  if (url.origin !== self.location.origin) {
    event.respondWith(
      fetch(event.request).then((res) => {
        const copy = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy)).catch(() => {});
        return res;
      }).catch(() => caches.match(event.request))
    );
    return;
  }

  // 앱 셸: 캐시 우선 + 백그라운드 갱신
  event.respondWith(
    caches.match(event.request).then((cached) => {
      const network = fetch(event.request).then((res) => {
        if (res && res.status === 200) {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy)).catch(() => {});
        }
        return res;
      }).catch(() => cached);
      return cached || network;
    })
  );
});

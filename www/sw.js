/* 심연의 대장간 v5.2 — 오프라인 캐시 (연출·UI A안) */
const CACHE_NAME = "abyss-forge-v5.2-staging";
const ASSETS = [
  "./",
  "./index.html",
  "./css/style.css",
  "./js/data.js",
  "./js/audio.js",
  "./js/engine.js",
  "./js/ui.js",
  "./manifest.json",
  "./assets/forge-bg.jpg",
  "./assets/arena-bg.jpg",
  "./assets/hero.png",
  "./assets/boss-demon.png",
  "./assets/boss-dragon.png",
  "./assets/boss-knight.png",
  "./assets/monster-fiend.png",
  "./assets/monster-undead.png",
  "./assets/sword-mythic.png",
  "./assets/items/armor_epic.webp",
  "./assets/items/armor_legend.webp",
  "./assets/items/armor_myth.webp",
  "./assets/items/armor_normal.webp",
  "./assets/items/armor_rare.webp",
  "./assets/items/armor_uncommon.webp",
  "./assets/items/chest-ornate.webp",
  "./assets/items/helm_epic.webp",
  "./assets/items/helm_legend.webp",
  "./assets/items/helm_myth.webp",
  "./assets/items/helm_normal.webp",
  "./assets/items/helm_rare.webp",
  "./assets/items/helm_uncommon.webp",
  "./assets/items/ring_epic.webp",
  "./assets/items/ring_legend.webp",
  "./assets/items/ring_myth.webp",
  "./assets/items/ring_normal.webp",
  "./assets/items/ring_rare.webp",
  "./assets/items/ring_uncommon.webp",
  "./assets/items/weapon_epic.webp",
  "./assets/items/weapon_legend.webp",
  "./assets/items/weapon_myth.webp",
  "./assets/items/weapon_normal.webp",
  "./assets/items/weapon_rare.webp",
  "./assets/items/weapon_uncommon.webp",
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

function putInCache(req, res) {
  if (!res || res.status !== 200) return res;
  const copy = res.clone();
  caches.open(CACHE_NAME).then((cache) => cache.put(req, copy)).catch(() => {});
  return res;
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // 외부(폰트 등): 네트워크 우선
  if (url.origin !== self.location.origin) {
    event.respondWith(fetch(req).then((res) => putInCache(req, res)).catch(() => caches.match(req)));
    return;
  }

  const isDoc = req.mode === "navigate" || (req.headers.get("accept") || "").includes("text/html");
  const isCode = /\.(?:js|css|json|webmanifest)$/.test(url.pathname) || url.pathname.endsWith("/");

  // 문서와 코드는 네트워크 우선 — 새 버전이 바로 반영된다
  if (isDoc || isCode) {
    event.respondWith(
      fetch(req, { cache: isCode ? "reload" : "default" }).then((res) => putInCache(req, res)).catch(() =>
        caches.match(req).then((cached) => cached || (isDoc ? caches.match("./index.html") : undefined))
      )
    );
    return;
  }

  // 이미지·아이콘은 캐시 우선
  event.respondWith(
    caches.match(req).then((cached) =>
      cached || fetch(req).then((res) => putInCache(req, res)).catch(() => cached)
    )
  );
});

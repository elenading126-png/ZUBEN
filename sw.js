// ZUBEN PWA service worker v2 —— 升级：缓存版本v2；HTML/JS走网络优先不再死等旧缓存；所有fetch加超时
const CACHE = "zuben-pwa-v2";
const ASSETS = [
  "./",
  "index.html",
  "manifest.json",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "icons/icon-180.png"
];

self.addEventListener("install", function (e) {
  // skipWaiting 让新版 SW 立即接管，不用等所有 tab 关闭
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE).then(function (c) { return c.addAll(ASSETS); })
  );
});

self.addEventListener("activate", function (e) {
  // 清理 v1 老缓存，强制客户端立即接管
  e.waitUntil(
    caches.keys().then(function (ks) {
      return Promise.all(ks.filter(function (k) { return k !== CACHE; }).map(function (k) {
        return caches.delete(k);
      }));
    }).then(function () { return self.clients.claim(); })
  );
});

// 网络优先 fetch，10 秒超时；超时回退缓存；外部请求(api.github.com)直接透传
async function networkFirst(req, timeoutMs) {
  var ctl;
  try {
    ctl = new AbortController();
    var t = setTimeout(function () { ctl.abort(); }, timeoutMs || 10000);
    var r = await fetch(req, { signal: ctl.signal });
    clearTimeout(t);
    // 只缓存同源且成功的响应
    if (r.ok && new URL(req.url).origin === location.origin) {
      var cp = r.clone();
      caches.open(CACHE).then(function (c) { c.put(req, cp); });
    }
    return r;
  } catch (e) {
    var cached = await caches.match(req);
    if (cached) return cached;
    throw e;
  }
}

self.addEventListener("fetch", function (e) {
  var req = e.request;
  if (req.method !== "GET") return;
  var url = new URL(req.url);
  // 放行 api.github.com 等外部请求（GitHub API 不缓存，给浏览器直走）
  if (url.origin !== location.origin) return;
  // HTML/导航请求：网络优先，10s 超时（避免国内拉 github.io 慢导致永久卡）
  if (req.mode === "navigate" || req.destination === "document") {
    e.respondWith(networkFirst(req, 10000));
    return;
  }
  // 其他静态资源：网络优先短超时
  e.respondWith(networkFirst(req, 6000));
});

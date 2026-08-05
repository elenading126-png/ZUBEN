// 一次性注销脚本：让浏览器里旧的 Service Worker 自动卸载，
// 从此页面不再被缓存拦截，每次都从服务器拉取最新代码。
// 页面本身已不再注册任何 Service Worker，本文件仅用于清理历史残留。
self.addEventListener('install', function(){ self.skipWaiting(); });
self.addEventListener('activate', function(e){ e.waitUntil(self.registration.unregister()); });

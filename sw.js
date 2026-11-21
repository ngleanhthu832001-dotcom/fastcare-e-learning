/* FASTCARE E-learning — Service Worker (PWA).
   Mục đích: cho phép cài app + tải nhanh. KHÔNG cache dữ liệu Supabase
   (đăng nhập, tiến trình, điểm số luôn lấy mới từ mạng).
   - Trang điều hướng (index.html): network-first (luôn lấy bản mới nhất khi
     có mạng, chỉ dùng cache khi mất mạng) — tránh kẹt bản cũ sau mỗi lần đẩy web.
   - File tĩnh (JS, ảnh, icon): cache-first, tải mới rồi ghi đè cache.
   - Mọi request tới supabase.co và request không phải GET: chỉ đi mạng.
   Đổi CACHE khi muốn ép toàn bộ máy cập nhật vỏ app. */
var CACHE = 'fastcare-elearning-v41';
var CORE = [
  './',
  './index.html',
  './app.js',
  './scenes.js',
  './devimgs.js',
  './manifest.json',
  './assets/fastie-logo.png',
  './assets/fastie-celebrate.webp',
  './assets/icon-192.png',
  './assets/icon-512.png'
];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (c) { return c.addAll(CORE); })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k !== CACHE; })
        .map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);
  // Dữ liệu Supabase + tài nguyên ngoài: không cache, chỉ đi mạng.
  if (url.hostname.indexOf('supabase.co') !== -1 || url.origin !== self.location.origin) return;

  // Trang điều hướng: ưu tiên mạng, rớt mạng thì dùng cache.
  if (req.mode === 'navigate' || req.destination === 'document') {
    e.respondWith(
      fetch(req).then(function (res) {
        var copy = res.clone();
        caches.open(CACHE).then(function (c) { c.put(req, copy); });
        return res;
      }).catch(function () { return caches.match('./index.html'); })
    );
    return;
  }

  // File tĩnh: ưu tiên cache, chưa có thì tải rồi ghi vào cache.
  e.respondWith(
    caches.match(req).then(function (cached) {
      if (cached) return cached;
      return fetch(req).then(function (res) {
        if (res && res.ok) {
          var copy = res.clone();
          caches.open(CACHE).then(function (c) { c.put(req, copy); });
        }
        return res;
      });
    })
  );
});

/* Thông báo đẩy (web push) — hiện lên màn hình khóa khi có bài mới / sắp hết hạn.
   Payload do sender gửi: {title, body, url, tag}. */
self.addEventListener('push', function (e) {
  var data = {};
  try { data = e.data ? e.data.json() : {}; } catch (err) {}
  var title = data.title || 'FASTCARE E-learning';
  var icon = self.registration.scope + 'assets/icon-192.png';
  var url = data.url || self.registration.scope;
  var options = {
    body: data.body || '',
    icon: icon,
    badge: icon,
    tag: data.tag || 'fastcare-elearning',
    data: { url: url }
  };
  e.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', function (e) {
  e.notification.close();
  var url = (e.notification.data && e.notification.data.url) || self.registration.scope;
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (list) {
      for (var i = 0; i < list.length; i++) {
        if (list[i].url.indexOf(url) !== -1) return list[i].focus();
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});

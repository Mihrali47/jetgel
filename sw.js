// Jetgel service worker: uygulamanın telefona yüklenebilmesi, hızlı açılması ve bildirimler için.
// Kendi dosyalarımız için önce ağ, ağ yoksa önbellek. Dış servisler (harita, rota, veritabanı) hiç önbelleğe alınmaz.
const CACHE = 'jetgel-v9';
const SHELL = [
  './', 'index.html', 'musteri.html', 'isletme.html', 'kurye.html', 'yonetim.html', 'simulasyon.html',
  'app/app.css', 'app/core.js', 'app/config.js',
  'vendor/leaflet/leaflet.js', 'vendor/leaflet/leaflet.css', 'vendor/supabase/supabase.js',
  'ikonlar/ikon-192.png', 'ikonlar/ikon-512.png'
];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).catch(() => {}));
  self.skipWaiting();
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if(req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  e.respondWith(
    fetch(req).then(res => { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {}); return res; })
      .catch(() => caches.match(req).then(r => r || caches.match('index.html')))
  );
});
self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({type:'window', includeUncontrolled:true}).then(list => {
    for(const c of list){ if('focus' in c) return c.focus(); }
    return self.clients.openWindow('./');
  }));
});

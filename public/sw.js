// Service worker: permite instalar el sitio como app y ver sin conexión las páginas ya visitadas.
const VERSION = 'mct-v1';
const ESTATICO = `${VERSION}-estatico`;
const PAGINAS = `${VERSION}-paginas`;
const MEDIOS = `${VERSION}-medios`;
const MAX_MEDIOS = 180;
const PRECARGA = ['/', '/sin-conexion/', '/rutas-de-trekking/', '/mapa/', '/marca/logo-mono.svg', '/iconos/icono-192.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(PAGINAS).then((c) => c.addAll(PRECARGA)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

async function recortar(nombre, max) {
  const c = await caches.open(nombre);
  const ks = await c.keys();
  for (let i = 0; i < ks.length - max; i++) await c.delete(ks[i]);
}

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return; // mapas, clima y fuentes externas van directo a la red
  if (url.pathname.startsWith('/admin')) return;

  // Páginas: primero la red; si no hay conexión, la copia guardada o la página "sin conexión"
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req).then((r) => { const copia = r.clone(); caches.open(PAGINAS).then((c) => c.put(req, copia)); return r; })
        .catch(async () => (await caches.match(req)) || (await caches.match('/sin-conexion/')))
    );
    return;
  }

  // Archivos con huella (CSS/JS) y marca: caché primero
  if (url.pathname.startsWith('/_astro/') || url.pathname.startsWith('/marca/') || url.pathname.startsWith('/iconos/')) {
    e.respondWith(caches.match(req).then((g) => g || fetch(req).then((r) => { const copia = r.clone(); caches.open(ESTATICO).then((c) => c.put(req, copia)); return r; })));
    return;
  }

  // Fotos, tracks y datos: se sirve lo guardado y se actualiza en segundo plano
  if (url.pathname.startsWith('/media/') || url.pathname.endsWith('.json')) {
    e.respondWith(caches.open(MEDIOS).then(async (c) => {
      const guardada = await c.match(req);
      const red = fetch(req).then((r) => { if (r.ok) { c.put(req, r.clone()); recortar(MEDIOS, MAX_MEDIOS); } return r; }).catch(() => guardada);
      return guardada || red;
    }));
  }
});

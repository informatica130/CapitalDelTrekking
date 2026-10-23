import type { APIRoute } from 'astro';
import { rutas, actividades, alojamientos, operadores, servicios, noticias, url } from '../scripts/datos';

const fijas = ['/', '/explora-melipeuco/', '/que-hacer/', '/que-visitar/', '/rutas-de-trekking/', '/operadores-turisticos/',
  '/planifica-donde-dormir/', '/guias-turisticos/', '/complementarios/', '/gastronomia/', '/mapa/', '/noticias/', '/contactanos/'];

export const GET: APIRoute = ({ site }) => {
  const rutasUrl = [
    ...fijas,
    ...rutas.map((r) => url.ruta(r.slug)),
    ...actividades.map((a) => url.actividad(a.slug)),
    ...alojamientos.map((n) => url.alojamiento(n.slug)),
    ...operadores.map((n) => url.operador(n.slug)),
    ...servicios.map((n) => url.servicio(n.slug)),
    ...noticias.map((n) => url.noticia(n.slug)),
  ];
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${rutasUrl
    .map((p) => `  <url><loc>${new URL(p, site).href}</loc></url>`).join('\n')}\n</urlset>\n`;
  return new Response(xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
};

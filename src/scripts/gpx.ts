// Lectura de archivos GPX y cálculo de distancia/desnivel.
export interface Punto { lat: number; lng: number; ele: number | null; dist: number }

const R = 6371000;
const rad = (g: number) => (g * Math.PI) / 180;
export function distancia(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const dLat = rad(b.lat - a.lat), dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export async function leerGpx(url: string): Promise<Punto[][]> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`No se pudo cargar ${url}`);
  const xml = new DOMParser().parseFromString(await res.text(), 'application/xml');
  const segmentos: Punto[][] = [];
  const grupos = [...xml.getElementsByTagName('trkseg'), ...xml.getElementsByTagName('rte')];
  const fuentes = grupos.length ? grupos : [xml.documentElement];
  for (const g of fuentes) {
    const nodos = [...g.getElementsByTagName('trkpt'), ...g.getElementsByTagName('rtept')];
    const pts: Punto[] = [];
    let acumulado = 0;
    for (const n of nodos) {
      const lat = parseFloat(n.getAttribute('lat') ?? ''), lng = parseFloat(n.getAttribute('lon') ?? '');
      if (Number.isNaN(lat) || Number.isNaN(lng)) continue;
      const e = n.getElementsByTagName('ele')[0];
      const ele = e ? parseFloat(e.textContent ?? '') : null;
      if (pts.length) acumulado += distancia(pts[pts.length - 1], { lat, lng });
      pts.push({ lat, lng, ele: ele !== null && !Number.isNaN(ele) ? ele : null, dist: acumulado });
    }
    if (pts.length > 1) segmentos.push(pts);
  }
  return segmentos;
}

export function resumen(pts: Punto[]) {
  let sube = 0, baja = 0, min = Infinity, max = -Infinity;
  let prev: number | null = null;
  for (const p of pts) {
    if (p.ele === null) continue;
    min = Math.min(min, p.ele); max = Math.max(max, p.ele);
    if (prev !== null) { const d = p.ele - prev; if (d > 0) sube += d; else baja -= d; }
    prev = p.ele;
  }
  return { km: (pts.at(-1)?.dist ?? 0) / 1000, sube, baja, min: min === Infinity ? null : min, max: max === -Infinity ? null : max };
}

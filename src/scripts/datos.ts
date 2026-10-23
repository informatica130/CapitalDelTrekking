// Acceso centralizado a los contenidos del sitio.
// Cada elemento vive en su propio archivo JSON dentro de src/content/<colección>/ (editable desde /admin).
import { marked } from 'marked';
import inicioJson from '../data/inicio.json';
import tamanos from '../data/imagenes.json';
import mapaJson from '../data/mapa.json';

export interface Campo { k: string; v: string }
export interface Grupo { titulo: string; campos: Campo[] }
export interface Base {
  slug: string; titulo: string; subtitulo: string; resumen: Campo[]; cuerpo: string; html: string; extracto: string;
  imagen: string; galeria: string[]; grupos: Grupo[]; coords: [number, number] | null; mapa_embed: string;
  operadores: string[]; relacionados: string[]; publicado: boolean; destacado: boolean;
}
export interface Ruta extends Base {
  interes: string; tipo_recorrido: string[]; gpx: string; dificultad: string; extension: string; duracion: string; condicion: string;
}
export interface Actividad extends Base { categoria: 'actividad' | 'atractivo'; tipo: string }
export interface Negocio extends Base { redes: Record<string, string>; logo: string; servicios: string[]; clase?: string; tipo?: string; seccion?: string }
export interface Guia { slug: string; nombre: string; especialidad: string; foto: string; direccion?: string; certificaciones?: string; telefono?: string; whatsapp?: string; email?: string; instagram?: string; facebook?: string; web?: string }
export interface Noticia { slug: string; titulo: string; fecha: string; imagen: string; categoria: string; cuerpo: string; html: string; extracto: string; publicado?: boolean }

marked.setOptions({ gfm: true, breaks: false });

const textoPlano = (md: string) =>
  md.replace(/!\[[^\]]*\]\([^)]*\)/g, '').replace(/\[([^\]]*)\]\([^)]*\)/g, '$1').replace(/[#*_>`~|-]+/g, ' ').replace(/\s+/g, ' ').trim();
const recortar = (t: string, n = 170) => (t.length <= n ? t : t.slice(0, n).replace(/\s+\S*$/, '') + '…');

function cargar<T>(modulos: Record<string, unknown>): T[] {
  return Object.values(modulos).map((m) => {
    const it = ((m as { default?: unknown }).default ?? m) as Record<string, unknown>;
    const cuerpo = String(it.cuerpo ?? '');
    return {
      subtitulo: '', resumen: [], galeria: [], grupos: [], coords: null, mapa_embed: '', operadores: [], relacionados: [],
      imagen: '', publicado: true, destacado: false, redes: {}, servicios: [], logo: '', tipo_recorrido: [],
      ...it,
      cuerpo,
      html: marked.parse(cuerpo, { async: false }) as string,
      extracto: (it.extracto as string) || recortar(textoPlano(cuerpo)),
    } as T;
  });
}

const visibles = <T extends { publicado?: boolean }>(l: T[]) => l.filter((x) => x.publicado !== false);
const porTitulo = <T extends { titulo: string }>(l: T[]) => l.sort((a, b) => a.titulo.localeCompare(b.titulo, 'es'));

export const rutas = porTitulo(visibles(cargar<Ruta>(import.meta.glob('../content/rutas/*.json', { eager: true }))));
export const actividades = porTitulo(visibles(cargar<Actividad>(import.meta.glob('../content/actividades/*.json', { eager: true }))));
export const alojamientos = porTitulo(visibles(cargar<Negocio>(import.meta.glob('../content/alojamientos/*.json', { eager: true }))));
export const operadores = porTitulo(visibles(cargar<Negocio>(import.meta.glob('../content/operadores/*.json', { eager: true }))));
export const servicios = porTitulo(visibles(cargar<Negocio>(import.meta.glob('../content/servicios/*.json', { eager: true }))));
export const noticias = visibles(cargar<Noticia>(import.meta.glob('../content/noticias/*.json', { eager: true })))
  .sort((a, b) => b.fecha.localeCompare(a.fecha));
export const guias = Object.values(import.meta.glob('../content/guias/*.json', { eager: true }))
  .map((m) => ((m as { default?: unknown }).default ?? m) as Guia)
  .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));

export const inicio = inicioJson as {
  slides: string[]; rutas_destacadas: string[]; imperdibles: string[];
  titular?: string; bajada?: string; video?: string;
};
export const puntosMapa = (mapaJson as { puntos: { gpx: string; lat: number; lng: number; name: string }[] }).puntos;

/* ---------- Fotos ---------- */
const TAM = tamanos as Record<string, [number, number]>;
/** Ancho y alto reales de una imagen local. */
export const dims = (src?: string) => (src && TAM[decodeURI(src)]) || null;
/** La foto de mayor resolución entre la principal y la galería (prefiere horizontales), para portadas a pantalla completa. */
export function mejorFoto(it: { imagen?: string; galeria?: string[] }): string {
  const fotos = [it.imagen, ...(it.galeria ?? [])].filter(Boolean) as string[];
  const ancho = (f: string) => dims(f)?.[0] ?? 0;
  const orden = fotos.slice().sort((a, b) => ancho(b) - ancho(a));
  const horizontal = orden.find((f) => { const d = dims(f); return d && d[0] >= d[1] && d[0] >= ancho(orden[0]) * 0.8; });
  return horizontal ?? orden[0] ?? '';
}

export const NIVELES = ['Familiares', 'Trekkeros', 'Expertos'] as const;
export const NIVEL_TEXTO: Record<string, string> = {
  Familiares: 'Senderos cortos y amables para disfrutar en familia.',
  Trekkeros: 'Rutas de media y larga distancia para quienes ya caminan.',
  Expertos: 'Travesías y cumbres para montañistas con experiencia.',
};
export const NIVEL_COLOR: Record<string, string> = { Familiares: '#2F7D4A', Trekkeros: '#1F6FA8', Expertos: '#D23B4A' };

export const url = {
  ruta: (s: string) => `/ruta-de-trekking/${s}/`,
  actividad: (s: string) => `/actividad-atractivo/${s}/`,
  alojamiento: (s: string) => `/donde-dormir/${s}/`,
  operador: (s: string) => `/operador-turistico/${s}/`,
  servicio: (s: string) => `/servicio-restaurante/${s}/`,
  noticia: (s: string) => `/${s}/`,
};

const indice = <T extends { slug: string }>(lista: T[]) => new Map(lista.map((x) => [x.slug, x]));
export const porSlug = {
  rutas: indice(rutas), actividades: indice(actividades), alojamientos: indice(alojamientos),
  operadores: indice(operadores), servicios: indice(servicios),
};

/** Busca un elemento vinculado (ruta o actividad) por slug. */
export function vinculado(slug: string): { titulo: string; url: string; imagen: string; extracto: string } | null {
  const r = porSlug.rutas.get(slug);
  if (r) return { titulo: r.titulo, url: url.ruta(slug), imagen: r.imagen, extracto: r.extracto };
  const a = porSlug.actividades.get(slug);
  if (a) return { titulo: a.titulo, url: url.actividad(slug), imagen: a.imagen, extracto: a.extracto };
  return null;
}

/** Operadores que ofrecen una ruta o actividad. */
export const operadoresDe = (slugs: string[]) => slugs.map((s) => porSlug.operadores.get(s)).filter(Boolean) as Negocio[];

/** Rutas y actividades que ofrece un operador. */
export function ofertaDe(operador: string) {
  return {
    rutas: rutas.filter((r) => r.operadores.includes(operador)),
    actividades: actividades.filter((a) => a.operadores.includes(operador)),
  };
}

export const unicos = (vals: string[]) => [...new Set(vals.flatMap((v) => (v ?? '').split(',').map((x) => x.trim())).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'es'));
export const valorCampo = (campos: Campo[], k: string) => campos.find((c) => c.k === k)?.v ?? '';
export const nivelMide = (d: string) => Math.max(0, Math.min(5, parseInt(d, 10) || 0));

/** Índice liviano para el buscador global y "Mi viaje". */
export function indiceBusqueda() {
  return [
    ...rutas.map((r) => ({ t: r.titulo, u: url.ruta(r.slug), c: 'Ruta', i: r.imagen, x: [r.interes, r.extension, r.duracion].filter(Boolean).join(' · '), z: 0 })),
    ...actividades.map((a) => ({ t: a.titulo, u: url.actividad(a.slug), c: a.categoria === 'actividad' ? 'Actividad' : 'Atractivo', i: a.imagen, x: a.tipo, z: a.categoria === 'actividad' ? 2 : 3 })),
    ...alojamientos.map((n) => ({ t: n.titulo, u: url.alojamiento(n.slug), c: 'Alojamiento', i: n.imagen, x: n.clase ?? '', z: 7 })),
    ...operadores.map((n) => ({ t: n.titulo, u: url.operador(n.slug), c: 'Operador', i: n.imagen, x: '', z: 6 })),
    ...servicios.map((n) => ({ t: n.titulo, u: url.servicio(n.slug), c: n.seccion === 'gastronomia' ? 'Gastronomía' : 'Servicio', i: n.imagen, x: n.tipo ?? '', z: n.seccion === 'gastronomia' ? 4 : 6 })),
    ...guias.map((g) => ({ t: g.nombre, u: `/guias-turisticos/#${g.slug}`, c: 'Guía', i: g.foto, x: g.especialidad, z: 5 })),
    ...noticias.map((n) => ({ t: n.titulo, u: url.noticia(n.slug), c: 'Noticia', i: n.imagen, x: n.fecha, z: 1 })),
  ];
}

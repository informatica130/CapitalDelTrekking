// Acceso centralizado a los contenidos del sitio (archivos JSON en src/data).
import rutasJson from '../data/rutas.json';
import actividadesJson from '../data/actividades.json';
import alojamientosJson from '../data/alojamientos.json';
import operadoresJson from '../data/operadores.json';
import serviciosJson from '../data/servicios.json';
import guiasJson from '../data/guias.json';
import noticiasJson from '../data/noticias.json';
import inicioJson from '../data/inicio.json';
import mapaJson from '../data/mapa.json';

export interface Campo { k: string; v: string }
export interface Grupo { titulo: string; campos: Campo[] }
export interface Base {
  slug: string; titulo: string; subtitulo: string; resumen: Campo[]; cuerpo: string; extracto: string;
  imagen: string; galeria: string[]; grupos: Grupo[]; coords: [number, number] | null; mapa_embed: string;
  operadores: string[]; relacionados: string[];
}
export interface Ruta extends Base {
  interes: string; tipo_recorrido: string[]; gpx: string; dificultad: string; extension: string; duracion: string; condicion: string;
}
export interface Actividad extends Base { categoria: 'actividad' | 'atractivo'; tipo: string }
export interface Negocio extends Base { redes: Record<string, string>; logo: string; servicios: string[]; clase?: string; tipo?: string; seccion?: string }
export interface Guia { slug: string; nombre: string; especialidad: string; foto: string; direccion?: string; certificaciones?: string; telefono?: string; whatsapp?: string; email?: string; instagram?: string; facebook?: string; web?: string }
export interface Noticia { slug: string; titulo: string; fecha: string; imagen: string; categoria: string; extracto: string; cuerpo: string }

export const rutas = rutasJson as unknown as Ruta[];
export const actividades = actividadesJson as unknown as Actividad[];
export const alojamientos = alojamientosJson as unknown as Negocio[];
export const operadores = operadoresJson as unknown as Negocio[];
export const servicios = serviciosJson as unknown as Negocio[];
export const guias = guiasJson as unknown as Guia[];
export const noticias = (noticiasJson as unknown as Noticia[]).slice().sort((a, b) => b.fecha.localeCompare(a.fecha));
export const inicio = inicioJson as { slides: string[]; rutas_destacadas: string[]; imperdibles: string[] };
export const puntosMapa = mapaJson as { gpx: string; lat: number; lng: number; name: string }[];

export const NIVELES = ['Familiares', 'Trekkeros', 'Expertos'] as const;
export const NIVEL_TEXTO: Record<string, string> = {
  Familiares: 'Senderos cortos y amables para disfrutar en familia.',
  Trekkeros: 'Rutas de media y larga distancia para quienes ya caminan.',
  Expertos: 'Travesías y cumbres para montañistas con experiencia.',
};

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

/** Operadores que ofrecen una ruta o actividad (vínculo inverso). */
export const operadoresDe = (slugs: string[]) => slugs.map((s) => porSlug.operadores.get(s)).filter(Boolean) as Negocio[];

/** Rutas y actividades que ofrece un operador. */
export function ofertaDe(operador: string) {
  return {
    rutas: rutas.filter((r) => r.operadores.includes(operador)),
    actividades: actividades.filter((a) => a.operadores.includes(operador)),
  };
}

export const unicos = (vals: string[]) => [...new Set(vals.flatMap((v) => v.split(',').map((x) => x.trim())).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'es'));
export const valorCampo = (campos: Campo[], k: string) => campos.find((c) => c.k === k)?.v ?? '';
export const nivelMide = (d: string) => Math.max(0, Math.min(5, parseInt(d, 10) || 0));

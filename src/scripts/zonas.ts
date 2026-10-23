// Identidad por zona: cada sección del sitio toma una letra del logo (su símbolo y su color).
export interface Zona { letra: number; nombre: string; color: string; claro: string; oscuro: string; simbolo: string }

export const PALETA = [
  { nombre: 'Montaña', color: '#1F6FA8', claro: '#DCEBF6', oscuro: '#0F3A5A', simbolo: 'montaña y río' },
  { nombre: 'Rostro', color: '#E2683C', claro: '#FBE5DA', oscuro: '#7A2E12', simbolo: 'rostro' },
  { nombre: 'Cascada', color: '#16A0A8', claro: '#D5F1F2', oscuro: '#0A5155', simbolo: 'cascada' },
  { nombre: 'Araucaria', color: '#2F7D4A', claro: '#DDEFE2', oscuro: '#163D23', simbolo: 'araucaria' },
  { nombre: 'Corazón', color: '#D23B4A', claro: '#F8DCDF', oscuro: '#6E1520', simbolo: 'corazón' },
  { nombre: 'Persona', color: '#E9A92B', claro: '#FBEFD3', oscuro: '#6E4B07', simbolo: 'persona' },
  { nombre: 'Animales', color: '#8A5A3B', claro: '#EFE2D8', oscuro: '#432816', simbolo: 'animales' },
  { nombre: 'Estrellas', color: '#3E3E9A', claro: '#E0E0F3', oscuro: '#1D1D4F', simbolo: 'estrellas' },
  { nombre: 'Kultrun', color: '#7A3E91', claro: '#EDE0F2', oscuro: '#3A1748', simbolo: 'kultrun' },
] as const;

const z = (letra: number): Zona => ({ letra, ...PALETA[letra] });

export const ZONAS: Record<string, Zona> = {
  inicio: z(0),
  rutas: z(0),
  noticias: z(1),
  contacto: z(1),
  'que-hacer': z(2),
  'que-visitar': z(3),
  gastronomia: z(4),
  guias: z(5),
  operadores: z(6),
  complementarios: z(6),
  alojamientos: z(7),
  explora: z(8),
  mapa: z(8),
  'mi-viaje': z(4),
};

export const estiloZona = (zona: Zona) =>
  `--z:${zona.color};--z-claro:${zona.claro};--z-oscuro:${zona.oscuro}`;

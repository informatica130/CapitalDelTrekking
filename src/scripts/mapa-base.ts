import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

export const CENTRO_MELIPEUCO: [number, number] = [-38.8522, -71.6932];

export function crearMapa(el: HTMLElement, centro: [number, number] = CENTRO_MELIPEUCO, zoom = 11) {
  const mapa = L.map(el, { scrollWheelZoom: false }).setView(centro, zoom);
  const calles = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19, attribution: '&copy; OpenStreetMap',
  });
  const topo = L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
    maxZoom: 17, attribution: '&copy; OpenStreetMap, SRTM | OpenTopoMap',
  });
  const satelite = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    maxZoom: 19, attribution: 'Imágenes &copy; Esri',
  });
  satelite.addTo(mapa);
  L.control.layers({ 'Satélite': satelite, 'Topográfico': topo, 'Calles': calles }).addTo(mapa);
  L.control.scale({ imperial: false }).addTo(mapa);
  mapa.on('click', () => mapa.scrollWheelZoom.enable());
  mapa.on('mouseout', () => mapa.scrollWheelZoom.disable());
  return mapa;
}

export const pin = (color = '#f3b229', tam = 18) => L.divIcon({
  className: '', iconSize: [tam, tam], iconAnchor: [tam / 2, tam / 2],
  html: `<div class="pin-ruta" style="width:${tam}px;height:${tam}px;background:${color}"></div>`,
});

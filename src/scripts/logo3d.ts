// Logo 3D de Melipeuco: las 9 letras-símbolo extruidas en volumen con Three.js.
// - Entrada: las letras vuelan desde la profundidad, una a una.
// - Reposo: flotan en ola; el conjunto se inclina hacia el cursor (o el giroscopio).
// - Hover: la letra gira sobre su eje y avanza; clic: abre su zona del sitio.
// - Scroll: las letras se dispersan en el espacio.
import * as THREE from 'three';
import { SVGLoader } from 'three/examples/jsm/loaders/SVGLoader.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

interface Partes { letras: { fondo: string; simbolo: string; caja: number[] }[]; lema: string[] }
interface Opciones { colores: string[]; enlaces?: string[]; lema?: boolean; dispersar?: boolean; alSeleccionar?: (i: number) => void; referencia?: HTMLElement }

const facil = {
  salidaExpo: (t: number) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t)),
  salidaAtras: (t: number) => { const c = 1.5; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); },
};
const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));

function formas(d: string) {
  const svg = new SVGLoader().parse(`<svg xmlns="http://www.w3.org/2000/svg"><path d="${d}"/></svg>`);
  return svg.paths.flatMap((p) => SVGLoader.createShapes(p));
}

export function soportaWebGL() {
  try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; }
}

export function crearLogo3D(contenedor: HTMLElement, partes: Partes, op: Opciones) {
  const reducir = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  // Tono neutro: conserva la saturación de la paleta del logo
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1;
  contenedor.append(renderer.domElement);

  const escena = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  escena.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

  const camara = new THREE.PerspectiveCamera(28, 1, 10, 6000);
  escena.add(new THREE.AmbientLight(0xffffff, 0.45));
  const sol = new THREE.DirectionalLight(0xfff1dc, 1.9); sol.position.set(-400, 600, 900); escena.add(sol);
  const contra = new THREE.DirectionalLight(0x9cc8ff, 1.1); contra.position.set(500, -200, -600); escena.add(contra);

  // Raíz con el eje Y invertido (las coordenadas SVG crecen hacia abajo)
  const raiz = new THREE.Group(); escena.add(raiz);
  const logo = new THREE.Group(); logo.scale.set(1, -1, 1); raiz.add(logo);

  const PROF = 34;
  const extruir = { depth: PROF, bevelEnabled: true, bevelThickness: 5, bevelSize: 3.2, bevelSegments: 4, curveSegments: 18 };
  const crema = new THREE.MeshStandardMaterial({ color: 0xfff8ec, roughness: 0.35, metalness: 0.05, envMapIntensity: 0.7 });

  type Letra = { g: THREE.Group; base: THREE.Vector3; ent: { z: number; rx: number; ry: number; rz: number }; giro: number; giroObj: number; hover: number; disp: THREE.Vector3; rot: THREE.Vector3 };
  const letras: Letra[] = [];
  const caja = new THREE.Box3();

  partes.letras.forEach((l, i) => {
    const [x, y, w, h] = l.caja;
    const cx = x + w / 2, cy = y + h / 2;
    const g = new THREE.Group();
    const color = new THREE.Color(op.colores[i] ?? '#888888');
    const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.38, metalness: 0.02, envMapIntensity: 0.55 });
    const geoF = new THREE.ExtrudeGeometry(formas(l.fondo), extruir);
    geoF.translate(-cx, -cy, -PROF / 2);
    const fondo = new THREE.Mesh(geoF, mat);
    // El símbolo sobresale en relieve sobre la cara frontal (la que mira a la cámara, en +z)
    const geoS = new THREE.ExtrudeGeometry(formas(l.simbolo), { depth: 7, bevelEnabled: true, bevelThickness: 1.4, bevelSize: 0.6, bevelSegments: 2, curveSegments: 10 });
    geoS.translate(-cx, -cy, PROF / 2 + 3);
    const simbolo = new THREE.Mesh(geoS, crema);
    // El mismo símbolo en la cara trasera (espejado) para que el giro se vea completo
    const geoB = geoS.clone(); geoB.scale(-1, 1, -1);
    g.add(fondo, simbolo, new THREE.Mesh(geoB, crema));
    g.position.set(cx, cy, 0);
    g.userData.i = i;
    logo.add(g);
    const azar = (a: number) => (Math.random() * 2 - 1) * a;
    letras.push({
      g, base: g.position.clone(),
      ent: { z: 1600 + azar(400), rx: azar(1.6), ry: azar(2.4), rz: azar(0.8) },
      giro: 0, giroObj: 0, hover: 0,
      disp: new THREE.Vector3(azar(260) + (i - 4) * 210, azar(160) + 60, 120 + Math.random() * 380),
      rot: new THREE.Vector3(azar(2), azar(3), azar(1.2)),
    });
  });

  // Lema "CAPITAL DEL TREKKING" en relieve bajo
  let lema: THREE.Mesh | null = null;
  if (op.lema !== false) {
    const geo = new THREE.ExtrudeGeometry(partes.lema.flatMap(formas), { depth: 6, bevelEnabled: true, bevelThickness: 1, bevelSize: .5, bevelSegments: 1, curveSegments: 8 });
    geo.translate(0, 0, -3);
    lema = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: .5, envMapIntensity: .6 }));
    logo.add(lema);
  }

  caja.setFromObject(logo);
  const centro = caja.getCenter(new THREE.Vector3());
  logo.position.set(-centro.x, -centro.y, 0);
  const ancho = caja.max.x - caja.min.x;
  const alto = caja.max.y - caja.min.y;

  // La cámara se ubica para que el logo calce con el elemento de referencia (o llene el contenedor)
  const vfov = () => THREE.MathUtils.degToRad(camara.fov);
  let mundoPorPx = 1;
  const ajustar = () => {
    const w = contenedor.clientWidth || 1, h = contenedor.clientHeight || 1;
    renderer.setSize(w, h, false);
    camara.aspect = w / h;
    const t = Math.tan(vfov() / 2);
    const ref = op.referencia?.getBoundingClientRect();
    const objetivoPx = ref && ref.width > 0 ? ref.width : w / 1.08;
    // Ancho visible en el plano del logo = ancho * w / objetivoPx
    const anchoVisible = (ancho * w) / objetivoPx;
    const d = anchoVisible / (2 * t * camara.aspect);
    const dAlto = (alto * 1.2) / (2 * t);
    camara.position.set(0, 0, ref ? d : Math.max(d, dAlto));
    mundoPorPx = (2 * camara.position.z * t) / h;
    camara.lookAt(0, 0, 0);
    camara.updateProjectionMatrix();
  };
  // Desplaza el logo para seguir al elemento de referencia dentro del contenedor
  const alinear = () => {
    if (!op.referencia) return;
    const c = contenedor.getBoundingClientRect(), r = op.referencia.getBoundingClientRect();
    const dx = r.left + r.width / 2 - (c.left + c.width / 2);
    const dy = r.top + r.height / 2 - (c.top + c.height / 2);
    raiz.position.set(dx * mundoPorPx, -dy * mundoPorPx, 0);
  };
  ajustar();
  new ResizeObserver(ajustar).observe(contenedor);

  // Interacción
  const puntero = new THREE.Vector2(0, 0), objetivo = new THREE.Vector2(0, 0);
  const rayo = new THREE.Raycaster();
  let sobre = -1;
  const mover = (e: PointerEvent) => {
    objetivo.set((e.clientX / innerWidth) * 2 - 1, (e.clientY / innerHeight) * 2 - 1);
    const r = renderer.domElement.getBoundingClientRect();
    puntero.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    rayo.setFromCamera(puntero, camara);
    const hit = rayo.intersectObjects(letras.map((l) => l.g), true)[0];
    let i = -1;
    if (hit) { let o: THREE.Object3D | null = hit.object; while (o && o.userData.i === undefined) o = o.parent; i = o?.userData.i ?? -1; }
    if (i !== sobre) {
      if (i >= 0) letras[i].giroObj += Math.PI * 2;
      sobre = i;
      contenedor.closest('.portada')?.classList.toggle('sobre-letra', i >= 0 && !!op.enlaces?.[i]);
    }
  };
  addEventListener('pointermove', mover, { passive: true });
  // El lienzo no captura el puntero (para no tapar los botones): el clic se evalúa a nivel de documento
  document.addEventListener('click', (e) => {
    if (sobre < 0 || (e.target as HTMLElement).closest('a, button, input, select, textarea')) return;
    op.alSeleccionar?.(sobre);
    const u = op.enlaces?.[sobre]; if (u) location.href = u;
  });
  // Giroscopio en móviles
  addEventListener('deviceorientation', (e) => {
    if (e.gamma == null || e.beta == null) return;
    objetivo.set(clamp(e.gamma / 30, -1, 1), clamp((e.beta - 45) / 30, -1, 1));
  });

  let visible = true, activo = true;
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(contenedor);
  document.addEventListener('visibilitychange', () => { activo = !document.hidden; });

  const t0 = performance.now();
  const ENTRADA = reducir ? 0 : 1700, RETRASO = 90;
  const rotActual = new THREE.Vector2();
  const bucle = () => {
    requestAnimationFrame(bucle);
    if (!visible || !activo) return;
    const t = (performance.now() - t0);
    const seg = t / 1000;
    const k = op.dispersar ? clamp(scrollY / (innerHeight * 0.9)) : 0;
    const ke = k * k * (3 - 2 * k);

    rotActual.lerp(objetivo, 0.06);
    raiz.rotation.y = rotActual.x * 0.32 + (reducir ? 0 : Math.sin(seg * 0.35) * 0.05);
    raiz.rotation.x = rotActual.y * 0.2;

    letras.forEach((l, i) => {
      const p = ENTRADA ? clamp((t - 200 - i * RETRASO) / ENTRADA) : 1;
      const e = facil.salidaAtras(p), ex = facil.salidaExpo(p);
      const ola = reducir ? 0 : Math.sin(seg * 1.4 + i * 0.7) * 7;
      l.giro += (l.giroObj - l.giro) * 0.07;
      l.hover += ((sobre === i ? 1 : 0) - l.hover) * 0.12;
      // Entrada desde la profundidad (-z); el hover acerca la letra a la cámara (+z)
      const zEnt = (1 - ex) * -l.ent.z;
      l.g.position.set(
        l.base.x + l.disp.x * ke,
        l.base.y + ola + l.disp.y * ke - l.hover * 10,
        zEnt + l.hover * 70 + l.disp.z * ke * 0.8,
      );
      l.g.rotation.set(
        (1 - e) * l.ent.rx + l.rot.x * ke + Math.sin(seg * 0.9 + i) * 0.04,
        (1 - e) * l.ent.ry + l.giro + l.rot.y * ke + Math.sin(seg * 0.7 + i * 1.3) * 0.12,
        (1 - e) * l.ent.rz + l.rot.z * ke,
      );
      const s = 0.25 + 0.75 * e + l.hover * 0.06;
      l.g.scale.setScalar(s);
    });
    if (lema) {
      const p = ENTRADA ? clamp((t - 1100) / 1200) : 1;
      (lema.material as THREE.MeshStandardMaterial).opacity = p;
      (lema.material as THREE.MeshStandardMaterial).transparent = p < 1;
      lema.position.z = (1 - facil.salidaExpo(p)) * 300 - ke * 400;
    }
    contenedor.style.opacity = String(1 - clamp((k - .18) / .42));
    alinear();
    renderer.render(escena, camara);
  };
  bucle();
  contenedor.classList.add('logo3d--listo');
  return { renderer };
}

// Logo 3D de Melipeuco: las 9 letras-símbolo extruidas en volumen con Three.js.
// - Entrada: las letras vuelan desde la profundidad, una a una.
// - Reposo: flotan en ola; el conjunto se inclina hacia el cursor (o el giroscopio).
// - Hover: la letra gira sobre su eje y avanza; clic: abre su zona del sitio.
// - Scroll: las letras se dispersan en el espacio.
// Rendimiento: geometría construida de a una letra por cuadro y compartida entre instancias,
// render pausado fuera de pantalla, resolución adaptativa y recuperación si se pierde el contexto WebGL.
import * as THREE from 'three';
import { SVGLoader } from 'three/examples/jsm/loaders/SVGLoader.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

interface Partes { letras: { fondo: string; simbolo: string; caja: number[] }[]; lema: string[] }
interface Opciones { colores: string[]; enlaces?: string[]; lema?: boolean; dispersar?: boolean; referencia?: HTMLElement; arrancar?: Promise<void> }

const facil = {
  salidaExpo: (t: number) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t)),
  salidaAtras: (t: number) => { const c = 1.4; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); },
};
const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const cuadro = () => new Promise<void>((r) => requestAnimationFrame(() => r()));

function formas(d: string) {
  const svg = new SVGLoader().parse(`<svg xmlns="http://www.w3.org/2000/svg"><path d="${d}"/></svg>`);
  return svg.paths.flatMap((p) => SVGLoader.createShapes(p));
}

/** ¿Conviene usar el logo 3D en este dispositivo? */
export function debeUsar3D() {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return false;
  const nav = navigator as Navigator & { deviceMemory?: number; connection?: { saveData?: boolean } };
  if (nav.connection?.saveData) return false;
  if (nav.deviceMemory !== undefined && nav.deviceMemory < 4) return false;
  try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; }
}
export const soportaWebGL = debeUsar3D;

// ---------- Geometría compartida (se construye una sola vez por página) ----------
const PROF = 34;
type GeoLetra = { fondo: THREE.BufferGeometry; simbolo: THREE.BufferGeometry; cx: number; cy: number };
let cacheLetras: Promise<GeoLetra[]> | null = null;
let cacheLema: THREE.BufferGeometry | null = null;

function geometrias(partes: Partes): Promise<GeoLetra[]> {
  if (cacheLetras) return cacheLetras;
  cacheLetras = (async () => {
    const res: GeoLetra[] = [];
    for (const l of partes.letras) {
      const [x, y, w, h] = l.caja;
      const cx = x + w / 2, cy = y + h / 2;
      const fondo = new THREE.ExtrudeGeometry(formas(l.fondo), { depth: PROF, bevelEnabled: true, bevelThickness: 5, bevelSize: 3.2, bevelSegments: 3, curveSegments: 12 });
      fondo.translate(-cx, -cy, -PROF / 2);
      const simbolo = new THREE.ExtrudeGeometry(formas(l.simbolo), { depth: 7, bevelEnabled: true, bevelThickness: 1.2, bevelSize: 0.5, bevelSegments: 1, curveSegments: 6 });
      simbolo.translate(-cx, -cy, PROF / 2 + 3);
      res.push({ fondo, simbolo, cx, cy });
      await cuadro(); // una letra por cuadro: la página nunca se congela
    }
    return res;
  })();
  return cacheLetras;
}

export async function crearLogo3D(contenedor: HTMLElement, partes: Partes, op: Opciones) {
  const reducir = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const geos = await geometrias(partes);

  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  } catch { return null; }
  let dpr = Math.min(devicePixelRatio || 1, 1.75);
  renderer.setPixelRatio(dpr);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping; // conserva la saturación de la paleta del logo
  contenedor.append(renderer.domElement);

  const escena = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  const entorno = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  escena.environment = entorno;
  pmrem.dispose();

  const camara = new THREE.PerspectiveCamera(28, 1, 10, 6000);
  escena.add(new THREE.AmbientLight(0xffffff, 0.45));
  const sol = new THREE.DirectionalLight(0xfff1dc, 1.9); sol.position.set(-400, 600, 900); escena.add(sol);
  const contra = new THREE.DirectionalLight(0x9cc8ff, 1.1); contra.position.set(500, -200, -600); escena.add(contra);

  // Raíz con el eje Y invertido (las coordenadas SVG crecen hacia abajo)
  const raiz = new THREE.Group(); escena.add(raiz);
  const logo = new THREE.Group(); logo.scale.set(1, -1, 1); raiz.add(logo);
  const crema = new THREE.MeshStandardMaterial({ color: 0xfff8ec, roughness: 0.35, metalness: 0.05, envMapIntensity: 0.7 });

  type Letra = { g: THREE.Group; fondo: THREE.Mesh; mat: THREE.MeshStandardMaterial; base: THREE.Vector3; ent: { z: number; x: number; y: number; rx: number; ry: number; rz: number }; giro: number; giroObj: number; hover: number; disp: THREE.Vector3; rot: THREE.Vector3 };
  const azar = (a: number) => (Math.random() * 2 - 1) * a;
  const materiales: THREE.Material[] = [crema];
  const letras: Letra[] = geos.map((geo, i) => {
    const mat = new THREE.MeshStandardMaterial({ color: new THREE.Color(op.colores[i] ?? '#888888'), roughness: 0.38, metalness: 0.02, envMapIntensity: 0.55 });
    materiales.push(mat);
    const g = new THREE.Group();
    const fondo = new THREE.Mesh(geo.fondo, mat);
    // Las estrellas (letra 7) tienen su propio material para poder brillar
    const matSimbolo = i === 7 ? new THREE.MeshStandardMaterial({ color: 0xfff8ec, roughness: 0.3, emissive: 0xffe7a0, emissiveIntensity: 0, envMapIntensity: 0.7 }) : crema;
    if (matSimbolo !== crema) materiales.push(matSimbolo);
    const simbolo = new THREE.Mesh(geo.simbolo, matSimbolo);
    // El mismo símbolo en la cara trasera (espejado), reutilizando la geometría
    const trasero = new THREE.Mesh(geo.simbolo, matSimbolo); trasero.scale.set(-1, 1, -1);
    g.add(fondo, simbolo, trasero);
    g.position.set(geo.cx, geo.cy, 0);
    g.userData.i = i; fondo.userData.i = i;
    logo.add(g);
    return {
      g, fondo, mat: matSimbolo, base: g.position.clone(),
      ent: { z: 1600 + azar(400), x: (i - 4) * 260 + azar(160), y: -420 + azar(220), rx: azar(1.6), ry: azar(2.4), rz: azar(0.8) },
      giro: 0, giroObj: 0, hover: 0,
      disp: new THREE.Vector3(azar(260) + (i - 4) * 210, azar(160) + 60, 120 + Math.random() * 380),
      rot: new THREE.Vector3(azar(2), azar(3), azar(1.2)),
    };
  });

  // Lema "CAPITAL DEL TREKKING" en relieve bajo
  let lema: THREE.Mesh | null = null;
  if (op.lema !== false) {
    if (!cacheLema) {
      cacheLema = new THREE.ExtrudeGeometry(partes.lema.flatMap(formas), { depth: 6, bevelEnabled: true, bevelThickness: 1, bevelSize: .5, bevelSegments: 1, curveSegments: 6 });
      cacheLema.translate(0, 0, -3);
    }
    const matLema = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: .5, envMapIntensity: .6, transparent: true });
    materiales.push(matLema);
    lema = new THREE.Mesh(cacheLema, matLema);
    logo.add(lema);
  }

  const caja = new THREE.Box3().setFromObject(logo);
  const centro = caja.getCenter(new THREE.Vector3());
  logo.position.set(-centro.x, -centro.y, 0);
  const ancho = caja.max.x - caja.min.x;
  const alto = caja.max.y - caja.min.y;

  // ---------- Cámara: el logo calza con el elemento de referencia ----------
  let mundoPorPx = 1;
  const t = Math.tan(THREE.MathUtils.degToRad(camara.fov) / 2);
  let rc = contenedor.getBoundingClientRect();
  const ajustar = () => {
    rc = contenedor.getBoundingClientRect();
    const w = Math.max(1, contenedor.clientWidth), h = Math.max(1, contenedor.clientHeight);
    renderer.setSize(w, h, false);
    camara.aspect = w / h;
    const ref = op.referencia?.getBoundingClientRect();
    const objetivoPx = ref && ref.width > 0 ? ref.width : w / 1.08;
    // En pantallas angostas se deja margen para el balanceo de las letras; la cara frontal (z máx.) es la que calza
    const holgura = w < 600 ? 0.93 : 1;
    const d = ((ancho * w) / (objetivoPx * holgura)) / (2 * t * camara.aspect) + caja.max.z;
    camara.position.set(0, 0, ref ? d : Math.max(d, (alto * 1.2) / (2 * t)));
    mundoPorPx = (2 * camara.position.z * t) / h;
    camara.updateProjectionMatrix();
  };
  // Desplaza el logo para seguir al elemento de referencia dentro del contenedor
  const alinear = () => {
    if (!op.referencia) return;
    rc = contenedor.getBoundingClientRect();
    const r = op.referencia.getBoundingClientRect();
    raiz.position.set((r.left + r.width / 2 - (rc.left + rc.width / 2)) * mundoPorPx, -(r.top + r.height / 2 - (rc.top + rc.height / 2)) * mundoPorPx, 0);
  };
  ajustar();
  const ro = new ResizeObserver(ajustar); ro.observe(contenedor);

  // ---------- Interacción (procesada una vez por cuadro) ----------
  const objetivo = new THREE.Vector2(), puntero = new THREE.Vector2(), rayo = new THREE.Raycaster();
  const fondos = letras.map((l) => l.fondo);
  let sobre = -1, px = -1, py = -1, movido = false;
  const portada = contenedor.closest('.portada');
  const alMover = (e: PointerEvent) => { px = e.clientX; py = e.clientY; movido = true; objetivo.set((px / innerWidth) * 2 - 1, (py / innerHeight) * 2 - 1); };
  const procesarPuntero = () => {
    if (!movido) return;
    movido = false;
    let i = -1;
    if (px >= rc.left && px <= rc.right && py >= rc.top && py <= rc.bottom) {
      puntero.set(((px - rc.left) / rc.width) * 2 - 1, -((py - rc.top) / rc.height) * 2 + 1);
      rayo.setFromCamera(puntero, camara);
      const hit = rayo.intersectObjects(fondos, false)[0];
      i = hit ? (hit.object.userData.i as number) : -1;
    }
    if (i !== sobre) {
      if (i >= 0) letras[i].giroObj += Math.PI * 2;
      sobre = i;
      portada?.classList.toggle('sobre-letra', i >= 0 && !!op.enlaces?.[i]);
      contenedor.closest('.pie__logo')?.classList.toggle('sobre-letra', i >= 0 && !!op.enlaces?.[i]);
    }
  };
  const alClic = (e: MouseEvent) => {
    // El lienzo no captura el puntero (para no tapar los botones): el clic se evalúa a nivel de documento
    if (sobre < 0 || (e.target as HTMLElement).closest('a, button, input, select, textarea')) return;
    const u = op.enlaces?.[sobre]; if (u) location.href = u;
  };
  const alOrientar = (e: DeviceOrientationEvent) => {
    if (e.gamma == null || e.beta == null) return;
    objetivo.set(clamp(e.gamma / 30, -1, 1), clamp((e.beta - 45) / 30, -1, 1));
  };
  addEventListener('pointermove', alMover, { passive: true });
  document.addEventListener('click', alClic);
  addEventListener('deviceorientation', alOrientar);

  // ---------- Bucle de animación ----------
  let visible = true, vivo = true, idRaf = 0;
  let t0 = performance.now();
  const ENTRADA = reducir ? 0 : 1700, RETRASO = 90;
  const rotActual = new THREE.Vector2();
  let ultimo = performance.now(), acumulado = 0, cuadros = 0;

  const bucle = () => {
    idRaf = 0;
    if (!vivo || !visible || document.hidden) return;
    idRaf = requestAnimationFrame(bucle);
    const ahora = performance.now();
    // Resolución adaptativa: si el dispositivo no alcanza ~40 fps, baja la densidad de píxeles
    acumulado += ahora - ultimo; ultimo = ahora; cuadros++;
    if (cuadros === 45) {
      if (acumulado / cuadros > 25 && dpr > 1) { dpr = Math.max(1, dpr - 0.35); renderer.setPixelRatio(dpr); ajustar(); }
      acumulado = 0; cuadros = 0;
    }
    const ms = ahora - t0, seg = ms / 1000;
    const k = op.dispersar ? clamp(scrollY / (innerHeight * 0.9)) : 0;
    const ke = k * k * (3 - 2 * k);

    procesarPuntero();
    rotActual.lerp(objetivo, 0.06);
    raiz.rotation.y = rotActual.x * 0.32 + (reducir ? 0 : Math.sin(seg * 0.35) * 0.05);
    raiz.rotation.x = rotActual.y * 0.2;

    letras.forEach((l, i) => {
      const p = ENTRADA ? clamp((ms - 150 - i * RETRASO) / ENTRADA) : 1;
      const e = facil.salidaAtras(p), ex = facil.salidaExpo(p);
      // Aterrizaje: leve achatamiento justo al llegar
      const aterriza = p > 0.62 && p < 1 ? Math.sin(((p - 0.62) / 0.38) * Math.PI) : 0;
      l.giro += (l.giroObj - l.giro) * 0.08;
      l.hover += ((sobre === i ? 1 : 0) - l.hover) * 0.12;
      // Personalidad: cada letra se mueve según lo que representa (solo cuando ya llegó)
      let dy = 0, rx = 0, ry = Math.sin(seg * 0.7 + i * 1.3) * 0.08, rz = 0, esc = 1;
      if (!reducir && p >= 1) {
        const ciclo = (periodo: number, desfase = 0) => ((seg + desfase) % periodo) / periodo;
        switch (i) {
          case 0: dy = Math.sin(seg * 0.8) * 10; esc = 1 + Math.sin(seg * 0.8) * 0.012; break;                       // montaña: respira
          case 1: { const c = ciclo(5); rx = c < 0.08 ? Math.sin((c / 0.08) * Math.PI) * 0.35 : 0; dy = Math.sin(seg * 1.3) * 4; break; } // rostro: asiente
          case 2: rz = Math.sin(seg * 3.1) * 0.035; dy = Math.sin(seg * 2.2) * 3; break;                            // cascada: ondula
          case 3: rz = Math.sin(seg * 1.1) * 0.09; break;                                                            // araucaria: se mece
          case 4: { const c = ciclo(1.4); esc = 1 + (c < 0.12 ? Math.sin((c / 0.12) * Math.PI) * 0.12 : c > 0.2 && c < 0.3 ? Math.sin(((c - 0.2) / 0.1) * Math.PI) * 0.07 : 0); break; } // corazón: late
          case 5: { const c = ciclo(2.6, 0.5); dy = c < 0.22 ? -Math.sin((c / 0.22) * Math.PI) * 26 : 0; break; }    // persona: salta
          case 6: { const c = ciclo(3.2, 1); rx = c < 0.1 ? Math.sin((c / 0.1) * Math.PI * 2) * 0.28 : 0; break; }  // animales: picotean
          case 7: ry += Math.sin(seg * 0.5) * 0.25; l.mat.emissiveIntensity = 0.35 + Math.sin(seg * 3.3) * 0.25 + Math.sin(seg * 7.1) * 0.1; break; // estrellas: brillan
          case 8: rz = seg * 0.35; break;                                                                            // kultrun: gira como tambor
        }
      }
      l.g.position.set(
        l.base.x + (1 - ex) * l.ent.x + l.disp.x * ke,
        l.base.y + (1 - ex) * l.ent.y + dy + l.disp.y * ke - l.hover * 12,
        (1 - ex) * -l.ent.z + l.hover * 80 + l.disp.z * ke * 0.8,
      );
      l.g.rotation.set(
        (1 - e) * l.ent.rx + l.rot.x * ke + rx,
        (1 - e) * l.ent.ry + l.giro + l.rot.y * ke + ry,
        (1 - e) * l.ent.rz + l.rot.z * ke + rz,
      );
      const s0 = (0.25 + 0.75 * e + l.hover * 0.07) * esc;
      l.g.scale.set(s0 * (1 + aterriza * 0.06), s0 * (1 - aterriza * 0.1), s0);
    });
    if (lema) {
      const p = ENTRADA ? clamp((ms - 1100) / 1200) : 1;
      (lema.material as THREE.MeshStandardMaterial).opacity = p;
      lema.position.z = (1 - facil.salidaExpo(p)) * 300 - ke * 400;
    }
    if (op.dispersar) contenedor.style.opacity = String(1 - clamp((k - .18) / .42));
    alinear();
    renderer.render(escena, camara);
  };
  const reanudar = () => { if (!idRaf && vivo && visible && !document.hidden) { ultimo = performance.now(); idRaf = requestAnimationFrame(bucle); } };
  const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; reanudar(); });
  io.observe(contenedor);
  const alVisibilidad = () => reanudar();
  document.addEventListener('visibilitychange', alVisibilidad);

  // ---------- Limpieza y recuperación ----------
  const destruir = () => {
    if (!vivo) return;
    vivo = false;
    cancelAnimationFrame(idRaf);
    io.disconnect(); ro.disconnect();
    removeEventListener('pointermove', alMover);
    document.removeEventListener('click', alClic);
    removeEventListener('deviceorientation', alOrientar);
    document.removeEventListener('visibilitychange', alVisibilidad);
    materiales.forEach((m) => m.dispose());
    entorno.dispose();
    renderer.dispose();
    renderer.domElement.remove();
    contenedor.classList.remove('logo3d--listo');
    portada?.classList.remove('con-3d', 'sobre-letra');
  };
  // Si el navegador pierde el contexto gráfico (poca memoria, cambio de GPU), vuelve el logo SVG
  renderer.domElement.addEventListener('webglcontextlost', (e) => { e.preventDefault(); destruir(); }, { once: true });
  addEventListener('pagehide', destruir, { once: true });

  // Compila los shaders antes del primer cuadro (en paralelo si el navegador lo permite) para evitar tirones
  try { await renderer.compileAsync(escena, camara); } catch { /* compila en el primer render */ }
  if (!vivo) return null;
  await (op.arrancar ?? Promise.resolve());
  if (!vivo) return null;
  t0 = performance.now();
  contenedor.classList.add('logo3d--listo');
  portada?.classList.add('con-3d');
  reanudar();
  return { destruir };
}

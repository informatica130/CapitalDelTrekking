// Pantalla de carga (primera visita) y transición entre páginas, con GSAP.
import { gsap } from 'gsap';
import { DrawSVGPlugin } from 'gsap/DrawSVGPlugin';
import { darVida } from './logo-vivo';
import { PALETA } from './zonas';

gsap.registerPlugin(DrawSVGPlugin);
const reducir = matchMedia('(prefers-reduced-motion: reduce)').matches;

const avisarFin = () => {
  (window as unknown as { __precargaFin?: boolean }).__precargaFin = true;
  document.dispatchEvent(new Event('precarga:fin'));
};

/* ---------- Pantalla de carga ---------- */
export function pantallaDeCarga() {
  const el = document.querySelector<HTMLElement>('.carga');
  if (!el || document.documentElement.classList.contains('sin-precarga')) { el?.remove(); avisarFin(); return; }
  const logo = el.querySelector<SVGSVGElement>('.logo-svg');
  const linea = el.querySelector<SVGPathElement>('.carga__linea');
  const num = el.querySelector<HTMLElement>('.carga__num');
  const vivo = logo ? darVida(logo, { entrada: true, retardo: 0.15 }) : null;

  // Avance: llega al 85% mientras carga y completa cuando la página terminó (mínimo 1,9 s)
  const avance = { p: 0 };
  const pintar = () => {
    if (linea) gsap.set(linea, { drawSVG: `0% ${avance.p * 100}%` });
    if (num) num.textContent = String(Math.round(avance.p * 100)).padStart(3, '0');
  };
  const t1 = gsap.to(avance, { p: 0.85, duration: 1.9, ease: 'power2.out', onUpdate: pintar });
  const cargada = new Promise<void>((ok) => (document.readyState === 'complete' ? ok() : addEventListener('load', () => ok(), { once: true })));
  const minimo = new Promise<void>((ok) => setTimeout(ok, 1900));
  let terminado = false;
  const salir = () => {
    if (terminado) return; terminado = true;
    t1.kill();
    const letras = logo ? [...logo.querySelectorAll('.logo-letra')] : [];
    gsap.timeline({ onComplete: () => { el.remove(); } })
      .to(avance, { p: 1, duration: 0.35, ease: 'power2.inOut', onUpdate: pintar })
      .add(() => vivo?.pausar())
      .to(letras, { y: -70, opacity: 0, rotation: (i) => (i % 2 ? 8 : -8), duration: 0.5, ease: 'power3.in', stagger: { each: 0.035, from: 'center' } }, '+=0.05')
      .to('.carga__pie, .carga__cordillera, .carga .logo-lema', { opacity: 0, y: -20, duration: 0.35, ease: 'power2.in' }, '<')
      // El telón sube con un borde de cordillera
      .to(el, { '--subida': '125%', duration: 1.05, ease: 'power3.inOut', onStart: () => setTimeout(avisarFin, 250) }, '-=0.15');
    try { sessionStorage.setItem('mct-visto', '1'); } catch { /* sin almacenamiento */ }
  };
  Promise.all([cargada, minimo]).then(salir);
  setTimeout(salir, 6000); // seguridad: nunca bloquea más de 6 s
}

/* ---------- Transición entre páginas ---------- */
const ZONAS_URL: [RegExp, number][] = [
  [/^\/(rutas-de-trekking|ruta-de-trekking)/, 0], [/^\/(noticias|entrada-|contactanos)/, 1], [/^\/que-hacer/, 2],
  [/^\/(que-visitar|actividad-atractivo)/, 3], [/^\/(gastronomia|servicio-restaurante|mi-viaje)/, 4], [/^\/guias/, 5],
  [/^\/(operador|complementarios)/, 6], [/^\/(planifica-donde-dormir|donde-dormir)/, 7], [/^\/(explora|mapa)/, 8],
];
const zonaDe = (ruta: string) => (ruta === '/' ? -1 : ZONAS_URL.find(([r]) => r.test(ruta))?.[1] ?? 0);
const NOMBRES = ['Rutas de trekking', 'Noticias', 'Qué hacer', 'Qué visitar', 'Gastronomía', 'Guías turísticos', 'Operadores', 'Dónde dormir', 'Explora Melipeuco'];

export function transiciones() {
  const capa = document.querySelector<HTMLElement>('.transicion');
  if (!capa || reducir) { capa?.remove(); document.documentElement.classList.remove('entrando'); return; }
  const capas = [...capa.querySelectorAll<HTMLElement>('.transicion__capa')];
  const info = capa.querySelector<HTMLElement>('.transicion__info')!;
  const nombre = capa.querySelector<HTMLElement>('.transicion__nombre')!;
  const linea = capa.querySelector<SVGPathElement>('.transicion__linea path');
  const emblemas = [...capa.querySelectorAll<SVGElement>('.transicion__emblema .emblema')];
  const abajo = () => innerHeight * 1.2;
  const arriba = () => -innerHeight * 1.2;

  // Prepara colores (zona, zona oscura, tinta), emblema y nombre letra a letra
  const preparar = (z: number) => {
    const p = PALETA[Math.max(0, z)];
    const tonos = [p.color, p.oscuro, '#121417'];
    capas.forEach((c, k) => c.style.setProperty('--c', tonos[k] ?? '#121417'));
    capa.style.setProperty('--zt', p.color);
    emblemas.forEach((e, k) => { e.style.display = k === Math.max(0, z) ? 'block' : 'none'; });
    const texto = z < 0 ? 'Inicio' : NOMBRES[z];
    nombre.replaceChildren(...[...texto].map((ch) => { const s = document.createElement('span'); s.textContent = ch; return s; }));
    return nombre.children;
  };

  // Llegada: la cordillera sigue subiendo y destapa la página
  if (document.documentElement.classList.contains('entrando')) {
    let z = 0; try { z = Number(sessionStorage.getItem('mct-trans') ?? 0); sessionStorage.removeItem('mct-trans'); } catch { /* */ }
    const letras = preparar(z);
    gsap.set(capas, { y: 0 });
    gsap.set(info, { opacity: 1 });
    if (linea) gsap.set(linea, { drawSVG: '0% 100%' });
    document.documentElement.classList.remove('entrando');
    document.documentElement.classList.add('saliendo');
    gsap.timeline({ delay: 0.08, onComplete: () => { document.documentElement.classList.remove('saliendo'); gsap.set(capas, { y: abajo() }); } })
      .to(letras, { yPercent: -60, opacity: 0, duration: 0.3, ease: 'power2.in', stagger: 0.012 })
      .to('.transicion__emblema', { y: -30, scale: 0.8, opacity: 0, duration: 0.35, ease: 'power2.in' }, 0)
      .to(linea, { drawSVG: '100% 100%', duration: 0.35, ease: 'power2.in' }, 0)
      .to([...capas].reverse(), { y: arriba, duration: 0.85, ease: 'power3.inOut', stagger: 0.09 }, 0.15)
      .set(info, { opacity: 0 })
      .set('.transicion__emblema', { clearProps: 'all' });
  } else {
    gsap.set(capas, { y: abajo });
  }

  let saliendo = false;
  document.addEventListener('click', (e) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const a = (e.target as HTMLElement).closest<HTMLAnchorElement>('a[href]');
    if (!a || a.target === '_blank' || a.hasAttribute('download') || a.dataset.sinTransicion !== undefined) return;
    const url = new URL(a.href, location.href);
    if (url.origin !== location.origin || url.pathname.startsWith('/admin') || /\.(xml|json|gpx|pdf|webp|jpe?g|png)$/i.test(url.pathname)) return;
    if (url.pathname === location.pathname && url.search === location.search) return; // anclas en la misma página
    e.preventDefault();
    if (saliendo) return; saliendo = true;
    const z = zonaDe(url.pathname);
    const letras = preparar(z);
    try { sessionStorage.setItem('mct-trans', String(z)); } catch { /* */ }
    document.documentElement.classList.add('saliendo');
    gsap.set(capas, { y: abajo });
    gsap.set(info, { opacity: 1 });
    gsap.timeline({ onComplete: () => { location.href = url.href; } })
      .to(capas, { y: 0, duration: 0.75, ease: 'power3.inOut', stagger: 0.09 })
      .fromTo('.transicion__emblema', { y: 40, scale: 0.6, rotation: -14, opacity: 0 }, { y: 0, scale: 1, rotation: 0, opacity: 1, duration: 0.5, ease: 'back.out(1.8)' }, '-=0.3')
      .fromTo(letras, { yPercent: 80, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 0.35, ease: 'power3.out', stagger: 0.015 }, '<0.05')
      .fromTo(linea, { drawSVG: '0% 0%' }, { drawSVG: '0% 100%', duration: 0.4, ease: 'power2.out' }, '<');
    // Seguridad: si la navegación no ocurre, se retira la capa
    setTimeout(() => { if (document.visibilityState === 'visible' && saliendo) restaurar(); }, 4000);
  });

  const restaurar = () => {
    saliendo = false;
    document.documentElement.classList.remove('saliendo', 'entrando');
    gsap.set(capas, { y: abajo() }); gsap.set(info, { opacity: 0 });
  };
  // Al volver con el botón "atrás" (página restaurada desde caché) la capa no debe quedar puesta
  addEventListener('pageshow', (e) => { if ((e as PageTransitionEvent).persisted) restaurar(); });
}

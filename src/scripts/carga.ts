// Pantalla de carga (primera visita) y transición entre páginas, con GSAP.
import { gsap } from 'gsap';
import { DrawSVGPlugin } from 'gsap/DrawSVGPlugin';
import { darVida } from './logo-vivo';

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
const zonaDe = (ruta: string) => ZONAS_URL.find(([r]) => r.test(ruta))?.[1] ?? 0;

export function transiciones() {
  const capa = document.querySelector<HTMLElement>('.transicion');
  if (!capa || reducir) { capa?.remove(); return; }
  const barras = [...capa.querySelectorAll<HTMLElement>('.transicion__barras i')];
  const emblemas = [...capa.querySelectorAll<SVGElement>('.transicion__emblema .emblema')];
  const mostrarEmblema = (z: number) => emblemas.forEach((e, k) => { e.style.display = k === z ? 'block' : 'none'; });

  // Entrada: si venimos de otra página del sitio, la capa empieza cubriendo y se retira
  const desdeSitio = document.documentElement.classList.contains('entrando');
  if (desdeSitio) {
    let z = 0; try { z = Number(sessionStorage.getItem('mct-trans') ?? 0); sessionStorage.removeItem('mct-trans'); } catch { /* */ }
    mostrarEmblema(z);
    gsap.set(barras, { scaleY: 1, transformOrigin: '50% 0%' });
    gsap.timeline({ delay: 0.05, onComplete: () => document.documentElement.classList.remove('entrando') })
      .to('.transicion__emblema', { scale: 0.6, opacity: 0, duration: 0.35, ease: 'power2.in' })
      .to(barras, { scaleY: 0, duration: 0.6, ease: 'power3.inOut', stagger: { each: 0.035, from: 'edges' } }, '-=0.1');
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
    mostrarEmblema(z);
    try { sessionStorage.setItem('mct-trans', String(z)); } catch { /* */ }
    document.documentElement.classList.add('saliendo');
    gsap.set(barras, { scaleY: 0, transformOrigin: '50% 100%' });
    gsap.timeline({ onComplete: () => { location.href = url.href; } })
      .to(barras, { scaleY: 1, duration: 0.5, ease: 'power3.inOut', stagger: { each: 0.035, from: 'center' } })
      .fromTo('.transicion__emblema', { scale: 0.5, opacity: 0, rotation: -20 }, { scale: 1, opacity: 1, rotation: 0, duration: 0.4, ease: 'back.out(2)' }, '-=0.2');
    // Seguridad: si la navegación no ocurre, se retira la capa
    setTimeout(() => { if (document.visibilityState === 'visible' && saliendo) restaurar(); }, 4000);
  });

  const restaurar = () => {
    saliendo = false;
    document.documentElement.classList.remove('saliendo', 'entrando');
    gsap.set(barras, { scaleY: 0 }); gsap.set('.transicion__emblema', { opacity: 0 });
  };
  // Al volver con el botón "atrás" (página restaurada desde caché) la capa no debe quedar puesta
  addEventListener('pageshow', (e) => { if ((e as PageTransitionEvent).persisted) restaurar(); });
}

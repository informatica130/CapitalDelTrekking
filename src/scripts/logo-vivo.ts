// Logo vivo: cada letra-símbolo se anima según lo que representa (GSAP).
//  0 Montaña y río  → el río se dibuja de izquierda a derecha y luego fluye
//  1 Rostro         → abre los ojos, sonríe y parpadea de vez en cuando
//  2 Cascada        → las gotas caen sin parar
//  3 Araucaria      → crece desde el suelo y se mece con el viento
//  4 Corazón        → late (doble pulso)
//  5 Persona        → aparece de un salto y camina
//  6 Animales       → el gallo picotea y el caballo asiente
//  7 Estrellas      → la luna se dibuja y las estrellas titilan una a una
//  8 Kultrun        → gira como un tambor y emite ondas
import { gsap } from 'gsap';

const reducir = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const NS = 'http://www.w3.org/2000/svg';
let idClip = 0;

type Pieza = SVGPathElement & { dataset: DOMStringMap };
const num = (el: Element, k: string) => parseFloat((el as HTMLElement).dataset[k] ?? '0');

/** Recorte rectangular animable sobre un grupo (para "dibujar" desde un borde). */
function recorte(svg: SVGSVGElement, objetivo: SVGGraphicsElement, caja: number[]) {
  const [x, y, w, h] = caja;
  let defs = svg.querySelector('defs');
  if (!defs) { defs = document.createElementNS(NS, 'defs'); svg.prepend(defs); }
  const cp = document.createElementNS(NS, 'clipPath');
  cp.id = `lv-clip-${++idClip}`;
  cp.setAttribute('clipPathUnits', 'userSpaceOnUse');
  const r = document.createElementNS(NS, 'rect');
  r.setAttribute('x', String(x - 6)); r.setAttribute('y', String(y - 6));
  r.setAttribute('width', String(w + 12)); r.setAttribute('height', String(h + 12));
  cp.append(r); defs.append(cp);
  objetivo.setAttribute('clip-path', `url(#${cp.id})`);
  return { rect: r, x: x - 6, y: y - 6, w: w + 12, h: h + 12 };
}

/** Anillo que se expande desde el centro del kultrun. */
function onda(g: SVGGElement, cx: number, cy: number, r: number, color: string) {
  const c = document.createElementNS(NS, 'circle');
  c.setAttribute('cx', String(cx)); c.setAttribute('cy', String(cy)); c.setAttribute('r', String(r));
  c.setAttribute('fill', 'none'); c.setAttribute('stroke', color); c.setAttribute('stroke-width', '3');
  c.setAttribute('class', 'logo-onda'); c.style.opacity = '0';
  g.prepend(c);
  return c;
}

export interface LogoVivo { entrada: gsap.core.Timeline; reposo: gsap.core.Timeline[]; gesto: (i: number) => void; pausar: () => void; reanudar: () => void }

export function darVida(svg: SVGSVGElement, opciones: { entrada?: boolean; retardo?: number } = {}): LogoVivo | null {
  if (svg.dataset.vivoListo) return null;
  svg.dataset.vivoListo = '1';
  const conEntrada = opciones.entrada ?? svg.dataset.logoVivo === 'entrada';
  const letras = [...svg.querySelectorAll<SVGGElement>('.logo-letra')];
  const lema = svg.querySelector<SVGGElement>('.logo-lema');
  const reposo: gsap.core.Timeline[] = [];
  const gestos: Record<number, () => void> = {};

  if (reducir()) { svg.classList.add('logo-svg--quieto'); return null; }

  const entrada = gsap.timeline({ paused: true, delay: opciones.retardo ?? 0, defaults: { ease: 'expo.out' } });
  // 1) Las letras caen y aterrizan con un pequeño rebote (achatamiento al tocar el suelo)
  entrada.from(letras, {
    y: -140, rotation: (i) => (i % 2 ? 14 : -14), scale: 0.4, opacity: 0, transformOrigin: '50% 100%',
    duration: 1.1, ease: 'back.out(1.8)', stagger: { each: 0.075, from: 'start' },
  }, 0);
  entrada.to(letras, { keyframes: [{ scaleY: 0.86, scaleX: 1.08, duration: 0.12 }, { scaleY: 1, scaleX: 1, duration: 0.35, ease: 'elastic.out(1, 0.5)' }], transformOrigin: '50% 100%', stagger: 0.075 }, 0.55);
  if (lema) entrada.from(lema.querySelectorAll('.logo-lema__letra'), { y: 18, opacity: 0, duration: 0.7, stagger: 0.025, ease: 'power3.out' }, 1.1);

  letras.forEach((g, i) => {
    const caja = (g.dataset.caja ?? '0 0 0 0').split(' ').map(Number);
    const [x, y, w, h] = caja;
    const cx = x + w / 2, cy = y + h / 2;
    const simbolo = g.querySelector<SVGGElement>('.logo-simbolo')!;
    const piezas = [...g.querySelectorAll<Pieza>('.logo-pieza')];
    const t0 = 0.9 + i * 0.075; // momento en que la letra ya aterrizó
    const tl = gsap.timeline({ repeat: -1, paused: true });
    reposo.push(tl);

    switch (i) {
      case 0: { // Montaña y río: el río se dibuja y luego fluye
        const rc = recorte(svg, simbolo, caja);
        entrada.fromTo(rc.rect, { attr: { width: 0 } }, { attr: { width: rc.w }, duration: 1.1, ease: 'power2.inOut' }, t0);
        tl.to(simbolo, { x: 4, skewX: -6, duration: 1.6, ease: 'sine.inOut', yoyo: true, repeat: 1, transformOrigin: '50% 50%' })
          .to(g, { y: -3, duration: 1.6, ease: 'sine.inOut', yoyo: true, repeat: 1 }, 0);
        gestos[0] = () => gsap.fromTo(simbolo, { x: -10 }, { x: 0, duration: 0.9, ease: 'elastic.out(1, 0.4)' });
        break;
      }
      case 1: { // Rostro: ojos (piezas pequeñas) y sonrisa (la más ancha)
        const sonrisa = piezas.reduce((a, b) => (num(b, 'w') > num(a, 'w') ? b : a), piezas[0]);
        const ojos = piezas.filter((p) => p !== sonrisa);
        entrada.from(ojos, { scaleY: 0, transformOrigin: '50% 50%', duration: 0.4, ease: 'back.out(3)', stagger: 0.08 }, t0 + 0.2)
          .from(sonrisa, { scaleX: 0, transformOrigin: '50% 50%', duration: 0.6, ease: 'back.out(2)' }, t0 + 0.35);
        tl.to(ojos, { scaleY: 0.1, transformOrigin: '50% 50%', duration: 0.09, yoyo: true, repeat: 1 }, 3.2)
          .to(ojos, { scaleY: 0.1, transformOrigin: '50% 50%', duration: 0.08, yoyo: true, repeat: 1 }, 3.6)
          .to(sonrisa, { scaleX: 1.12, scaleY: 1.15, transformOrigin: '50% 30%', duration: 0.6, yoyo: true, repeat: 1, ease: 'sine.inOut' }, 1.2)
          .to({}, { duration: 1.2 });
        gestos[1] = () => { gsap.to(ojos, { scaleY: 0.1, transformOrigin: '50% 50%', duration: 0.08, yoyo: true, repeat: 3 }); gsap.fromTo(sonrisa, { scale: 1 }, { scale: 1.25, transformOrigin: '50% 30%', duration: 0.25, yoyo: true, repeat: 1 }); };
        break;
      }
      case 2: { // Cascada: el chorro (pieza alta) se dibuja de arriba abajo y las gotas caen
        const chorro = piezas.reduce((a, b) => (num(b, 'h') > num(a, 'h') ? b : a), piezas[0]);
        const gotas = piezas.filter((p) => p !== chorro);
        const rc = recorte(svg, simbolo, caja);
        entrada.fromTo(rc.rect, { attr: { height: 0 } }, { attr: { height: rc.h }, duration: 1, ease: 'power2.in' }, t0);
        gotas.forEach((gota, k) => {
          tl.fromTo(gota, { y: -10, opacity: 0 }, { y: 14, opacity: 1, duration: 0.9, ease: 'power1.in', keyframes: { opacity: [0, 1, 1, 0] } }, k * 0.22);
        });
        tl.to({}, { duration: 0.4 });
        gestos[2] = () => gsap.fromTo(gotas, { y: -14, opacity: 0 }, { y: 22, opacity: 1, duration: 0.6, stagger: 0.05, ease: 'power2.in', onComplete: () => gsap.set(gotas, { y: 0, opacity: 1 }) });
        break;
      }
      case 3: { // Araucaria: crece desde el suelo y se mece
        const rc = recorte(svg, simbolo, caja);
        entrada.fromTo(rc.rect, { attr: { y: rc.y + rc.h, height: 0 } }, { attr: { y: rc.y, height: rc.h }, duration: 1.3, ease: 'power3.out' }, t0);
        tl.to(simbolo, { rotation: 4, transformOrigin: '50% 100%', duration: 2.2, ease: 'sine.inOut' })
          .to(simbolo, { rotation: -3, transformOrigin: '50% 100%', duration: 2.4, ease: 'sine.inOut' })
          .to(simbolo, { rotation: 0, transformOrigin: '50% 100%', duration: 1.6, ease: 'sine.inOut' });
        gestos[3] = () => gsap.fromTo(simbolo, { rotation: -10 }, { rotation: 0, transformOrigin: '50% 100%', duration: 1.4, ease: 'elastic.out(1.2, 0.25)' });
        break;
      }
      case 4: { // Corazón: nace con un latido y late en reposo
        entrada.from(simbolo, { scale: 0, transformOrigin: '50% 50%', duration: 0.9, ease: 'elastic.out(1, 0.4)' }, t0 + 0.1);
        tl.to(simbolo, { keyframes: [{ scale: 1.2, duration: 0.12 }, { scale: 1, duration: 0.14 }, { scale: 1.12, duration: 0.1 }, { scale: 1, duration: 0.35 }], transformOrigin: '50% 55%', ease: 'power1.inOut' })
          .to(g, { keyframes: [{ scale: 1.03, duration: 0.12 }, { scale: 1, duration: 0.3 }], transformOrigin: '50% 100%' }, 0)
          .to({}, { duration: 0.9 });
        gestos[4] = () => gsap.to(simbolo, { keyframes: [{ scale: 1.35, duration: 0.1 }, { scale: 1, duration: 0.12 }, { scale: 1.25, duration: 0.1 }, { scale: 1, duration: 0.3 }], transformOrigin: '50% 55%', repeat: 1 });
        break;
      }
      case 5: { // Persona: aparece de un salto y camina (bamboleo)
        entrada.from(simbolo, { y: 30, opacity: 0, duration: 0.7, ease: 'back.out(2.5)' }, t0 + 0.15);
        tl.to(simbolo, { y: -3, rotation: 2.5, transformOrigin: '50% 100%', duration: 0.42, ease: 'sine.inOut' })
          .to(simbolo, { y: 0, rotation: -2.5, transformOrigin: '50% 100%', duration: 0.42, ease: 'sine.inOut' })
          .to(simbolo, { y: -3, rotation: 2.5, transformOrigin: '50% 100%', duration: 0.42, ease: 'sine.inOut' })
          .to(simbolo, { y: 0, rotation: 0, transformOrigin: '50% 100%', duration: 0.42, ease: 'sine.inOut' })
          .to({}, { duration: 1.4 });
        gestos[5] = () => gsap.timeline().to(simbolo, { y: -22, duration: 0.25, ease: 'power2.out' }).to(simbolo, { y: 0, duration: 0.5, ease: 'bounce.out' });
        break;
      }
      case 6: { // Animales: a la izquierda el gallo, a la derecha el caballo
        const izq = piezas.filter((p) => num(p, 'cx') < cx);
        const der = piezas.filter((p) => num(p, 'cx') >= cx);
        entrada.from(piezas, { scale: 0, transformOrigin: '50% 50%', duration: 0.5, ease: 'back.out(3)', stagger: 0.04 }, t0 + 0.1);
        const gIzq = document.createElementNS(NS, 'g'), gDer = document.createElementNS(NS, 'g');
        izq.forEach((p) => gIzq.append(p)); der.forEach((p) => gDer.append(p));
        simbolo.append(gIzq, gDer);
        tl.to(gIzq, { keyframes: [{ rotation: 10, duration: 0.12 }, { rotation: 0, duration: 0.18 }, { rotation: 10, duration: 0.12 }, { rotation: 0, duration: 0.25 }], transformOrigin: '30% 80%' }, 0.6)
          .to(gDer, { rotation: -5, transformOrigin: '70% 90%', duration: 0.7, ease: 'sine.inOut', yoyo: true, repeat: 1 }, 1.6)
          .to({}, { duration: 1.4 });
        gestos[6] = () => { gsap.to(gIzq, { keyframes: [{ rotation: 14, duration: 0.1 }, { rotation: 0, duration: 0.14 }], transformOrigin: '30% 80%', repeat: 2 }); gsap.to(gDer, { rotation: -8, transformOrigin: '70% 90%', duration: 0.3, yoyo: true, repeat: 1 }); };
        break;
      }
      case 7: { // Estrellas: la "C" (pieza mayor) se dibuja y las estrellas titilan
        const luna = piezas.reduce((a, b) => (num(b, 'w') * num(b, 'h') > num(a, 'w') * num(a, 'h') ? b : a), piezas[0]);
        const estrellas = piezas.filter((p) => p !== luna);
        const gLuna = document.createElementNS(NS, 'g'); gLuna.append(luna); simbolo.prepend(gLuna);
        const rc = recorte(svg, gLuna, caja);
        entrada.fromTo(rc.rect, { attr: { width: 0 } }, { attr: { width: rc.w }, duration: 0.9, ease: 'power2.inOut' }, t0)
          .from(estrellas, { scale: 0, rotation: 90, transformOrigin: '50% 50%', duration: 0.5, ease: 'back.out(4)', stagger: 0.12 }, t0 + 0.5);
        estrellas.forEach((e, k) => {
          tl.to(e, { keyframes: [{ opacity: 0.25, scale: 0.6, duration: 0.5 }, { opacity: 1, scale: 1.25, duration: 0.35 }, { scale: 1, duration: 0.3 }], transformOrigin: '50% 50%', ease: 'sine.inOut' }, k * 0.45);
        });
        gestos[7] = () => gsap.fromTo(estrellas, { scale: 0.4, opacity: 0.4 }, { scale: 1.6, opacity: 1, transformOrigin: '50% 50%', duration: 0.25, stagger: 0.05, yoyo: true, repeat: 1 });
        break;
      }
      case 8: { // Kultrun: entra girando y en reposo gira lento con ondas de sonido
        const ondas = [0, 1].map(() => onda(g, cx, cy, Math.min(w, h) * 0.42, '#FFF8EC'));
        entrada.from(simbolo, { rotation: -270, scale: 0, transformOrigin: '50% 50%', duration: 1.2, ease: 'back.out(1.4)' }, t0);
        tl.to(simbolo, { rotation: 360, transformOrigin: '50% 50%', duration: 14, ease: 'none' }, 0);
        ondas.forEach((o, k) => tl.fromTo(o, { attr: { r: Math.min(w, h) * 0.3 }, opacity: 0.55 }, { attr: { r: Math.min(w, h) * 0.75 }, opacity: 0, duration: 2.2, ease: 'power2.out' }, 1 + k * 1.1));
        gestos[8] = () => { gsap.to(simbolo, { rotation: '+=360', transformOrigin: '50% 50%', duration: 1.1, ease: 'power3.inOut' }); ondas.forEach((o, k) => gsap.fromTo(o, { attr: { r: Math.min(w, h) * 0.3 }, opacity: 0.8 }, { attr: { r: Math.min(w, h) * 0.95 }, opacity: 0, duration: 0.9, delay: k * 0.18, ease: 'power2.out' })); };
        break;
      }
    }
  });

  // Gesto especial al pasar el cursor o tocar una letra: salto + su animación propia
  letras.forEach((g, i) => {
    let ocupado = false;
    const gesto = () => {
      if (ocupado) return; ocupado = true;
      gsap.timeline({ onComplete: () => { ocupado = false; } })
        .to(g, { y: -16, rotation: i % 2 ? 5 : -5, duration: 0.28, ease: 'power2.out', transformOrigin: '50% 100%' })
        .to(g, { y: 0, rotation: 0, duration: 0.7, ease: 'elastic.out(1.1, 0.4)' });
      gestos[i]?.();
    };
    g.addEventListener('pointerenter', gesto);
    g.addEventListener('touchstart', gesto, { passive: true });
  });

  // Reposo: arranca al terminar la entrada; se pausa fuera de pantalla
  let visible = true, iniciado = false;
  const arrancarReposo = () => { iniciado = true; if (visible) reposo.forEach((t, k) => gsap.delayedCall(k * 0.25, () => t.play())); };
  entrada.eventCallback('onComplete', arrancarReposo);
  new IntersectionObserver(([e]) => {
    visible = e.isIntersecting;
    if (!iniciado) return;
    reposo.forEach((t) => (visible ? t.play() : t.pause()));
  }).observe(svg);

  svg.classList.add('logo-svg--listo');
  if (conEntrada) entrada.play(); else { entrada.progress(1); arrancarReposo(); }
  return {
    entrada, reposo,
    gesto: (i) => letras[i]?.dispatchEvent(new Event('pointerenter')),
    pausar: () => reposo.forEach((t) => t.pause()),
    reanudar: () => reposo.forEach((t) => t.play()),
  };
}

/** Activa todos los logos vivos de la página (los que no esperan una señal). */
export function activarLogosVivos() {
  document.querySelectorAll<SVGSVGElement>('svg[data-logo-vivo]:not([data-espera])').forEach((svg) => {
    // Los logos con entrada esperan a ser visibles para empezar
    if (svg.dataset.logoVivo === 'entrada') {
      const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { io.disconnect(); darVida(svg); } }, { threshold: 0.35 });
      io.observe(svg);
    } else darVida(svg, { entrada: false });
  });
}

// Efectos de scroll y profundidad.
// Rendimiento: las posiciones de los elementos se miden una vez (y al cambiar el tamaño de la página);
// en cada cuadro solo se calcula a partir de scrollY y se escriben transformaciones, sin leer el layout.
import Lenis from 'lenis';
const reducir = matchMedia('(prefers-reduced-motion: reduce)').matches;
const tactil = matchMedia('(hover: none)').matches;
const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));

export let lenis: Lenis | null = null;

/** Separa un título en palabras que suben una a una al entrar en pantalla. */
function partirTitulos() {
  document.querySelectorAll<HTMLElement>('.cabeza h2, [data-partir]').forEach((el) => {
    if (el.classList.contains('partir')) return;
    let p = 0;
    const recorrer = (nodo: Node) => {
      [...nodo.childNodes].forEach((n) => {
        if (n.nodeType === 3) {
          const frag = document.createDocumentFragment();
          (n.textContent ?? '').split(/(\s+)/).forEach((t) => {
            if (!t) return;
            if (/^\s+$/.test(t)) { frag.append(document.createTextNode(' ')); return; }
            const w = document.createElement('span'); w.className = 'w';
            const sp = document.createElement('span'); sp.textContent = t; sp.style.setProperty('--p', String(p++));
            w.append(sp); frag.append(w);
          });
          n.replaceWith(frag);
        } else if (n.nodeType === 1) recorrer(n);
      });
    };
    recorrer(el);
    el.classList.add('partir');
  });
}

/** Botones que siguen levemente al cursor. */
function magneticos() {
  if (tactil || reducir) return;
  document.querySelectorAll<HTMLElement>('.acciones .btn, .fav--grande').forEach((b) => {
    let r: DOMRect | null = null;
    b.addEventListener('pointerenter', () => { r = b.getBoundingClientRect(); });
    b.addEventListener('pointermove', (e) => {
      if (!r) return;
      b.style.translate = `${(e.clientX - r.left - r.width / 2) * .2}px ${(e.clientY - r.top - r.height / 2) * .28}px`;
    });
    b.addEventListener('pointerleave', () => { b.style.translate = ''; r = null; });
  });
}

interface Medida { el: HTMLElement; top: number; alto: number; v: number }

type Rgb = [number, number, number];
const rgb = (hex = '#000000'): Rgb => { const n = parseInt(hex.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const mezclar = (a: Rgb, b: Rgb, f: number) => `rgb(${a.map((v, i) => Math.round(v + (b[i] - v) * f)).join(' ')})`;
const suave = (x: number) => x * x * (3 - 2 * x);

// Filas deslizables: flechas, arrastre con el mouse y barra de avance (el scroll vertical queda libre)
function deslizables() {
  document.querySelectorAll<HTMLElement>('[data-deslizable]').forEach((sec) => {
    const fila = sec.querySelector<HTMLElement>('.horizontal__fila');
    if (!fila) return;
    const barra = sec.querySelector<HTMLElement>('.horizontal__barra i');
    const flechas = [...sec.querySelectorAll<HTMLButtonElement>('[data-mover]')];
    const paso = () => (fila.querySelector<HTMLElement>('.foto-card')?.offsetWidth ?? 300) + 26;
    const pintar = () => {
      const max = fila.scrollWidth - fila.clientWidth;
      const p = max > 0 ? fila.scrollLeft / max : 1;
      if (barra) barra.style.transform = `scaleX(${(0.1 + p * 0.9).toFixed(3)})`;
      flechas.forEach((b) => { b.disabled = b.dataset.mover === '-1' ? fila.scrollLeft < 4 : fila.scrollLeft > max - 4; });
    };
    flechas.forEach((b) => b.addEventListener('click', () => fila.scrollBy({ left: Number(b.dataset.mover) * paso() * 2, behavior: 'smooth' })));
    fila.addEventListener('scroll', pintar, { passive: true });
    addEventListener('resize', pintar);
    pintar();
    // Arrastre con el mouse (en táctil el desplazamiento es nativo)
    let x0 = 0, s0 = 0, movido = false, activo = false;
    fila.addEventListener('pointerdown', (e) => {
      if (e.pointerType !== 'mouse' || e.button !== 0) return;
      activo = true; movido = false; x0 = e.clientX; s0 = fila.scrollLeft;
    });
    addEventListener('pointermove', (e) => {
      if (!activo) return;
      const dx = e.clientX - x0;
      if (!movido && Math.abs(dx) > 6) { movido = true; fila.classList.add('arrastrando'); }
      if (movido) fila.scrollLeft = s0 - dx;
    });
    addEventListener('pointerup', () => {
      if (!activo) return; activo = false;
      if (movido) {
        // Termina en la tarjeta más cercana
        const p = paso(); const destino = Math.round(fila.scrollLeft / p) * p;
        fila.classList.remove('arrastrando');
        fila.scrollTo({ left: destino, behavior: 'smooth' });
      }
    });
    fila.addEventListener('click', (e) => { if (movido) { e.preventDefault(); e.stopPropagation(); movido = false; } }, true);
    fila.addEventListener('dragstart', (e) => e.preventDefault());
  });
}

export function iniciarEfectos() {
  deslizables();
  partirTitulos();
  magneticos();

  if (!reducir) {
    lenis = new Lenis({ duration: 1.1, easing: (t) => 1 - Math.pow(1 - t, 4), smoothWheel: true, wheelMultiplier: 1 });
    const raf = (t: number) => { lenis!.raf(t); requestAnimationFrame(raf); };
    requestAnimationFrame(raf);
    document.querySelectorAll<HTMLAnchorElement>('a[href^="#"]').forEach((a) => a.addEventListener('click', (e) => {
      const id = a.getAttribute('href')!; if (id.length < 2) return;
      const destino = document.querySelector<HTMLElement>(id); if (!destino) return;
      e.preventDefault(); lenis!.scrollTo(destino, { offset: -10 });
    }));
    // Detiene el scroll suave mientras hay un menú, buscador o visor abierto
    new MutationObserver(() => { document.body.classList.contains('bloqueo') ? lenis?.stop() : lenis?.start(); })
      .observe(document.body, { attributes: true, attributeFilter: ['class'] });
  }

  const progreso = document.querySelector<HTMLElement>('.progreso');
  const header = document.querySelector<HTMLElement>('.header');
  const arriba = document.querySelector<HTMLElement>('.arriba');
  const portada = document.querySelector<HTMLElement>('[data-portada]');
  const capas = portada ? [...portada.querySelectorAll<HTMLElement>('[data-capa]')] : [];
  const contPortada = portada?.querySelector<HTMLElement>('.portada__contenido') ?? null;
  const textosPortada = contPortada ? [...contPortada.querySelectorAll<HTMLElement>('.portada__bajada, .acciones')] : [];

  // ---------- Medidas en caché ----------
  let altoDoc = 1, altoVentana = innerHeight, anchoVentana = innerWidth;
  let parallax: Medida[] = [];
  type Desarme = {
    el: HTMLElement; top: number; alto: number; ancho: number;
    letras: { el: HTMLElement; dx: number; color: Rgb; oscuro: Rgb }[];
    fondo: HTMLElement | null; titulo: HTMLElement | null; avance: HTMLElement | null;
    infos: HTMLElement[]; gigantes: HTMLElement[]; activa: number;
  };
  let desarmes: Desarme[] = [];

  const medir = () => {
    const y = scrollY;
    altoVentana = innerHeight; anchoVentana = innerWidth;
    altoDoc = Math.max(1, document.documentElement.scrollHeight - altoVentana);
    parallax = [...document.querySelectorAll<HTMLElement>('[data-parallax]')].map((el) => {
      const prev = el.style.transform; el.style.transform = '';
      const r = el.getBoundingClientRect();
      el.style.transform = prev;
      return { el, top: r.top + y, alto: r.height, v: parseFloat(el.dataset.parallax || '0.2') };
    });
    desarmes = anchoVentana <= 760 ? [] : [...document.querySelectorAll<HTMLElement>('[data-desarme]')].map((d) => {
      const r = d.getBoundingClientRect();
      const cont = d.querySelector<HTMLElement>('.zonas__letras');
      const ancho = cont?.getBoundingClientRect().width ?? anchoVentana;
      const ls = [...d.querySelectorAll<HTMLElement>('.zonas__letra')];
      const n = ls.length;
      return {
        el: d, top: r.top + y, alto: r.height, ancho,
        // Desplazamiento (px) desde su lugar en el logo hasta su lugar en la fila separada
        letras: ls.map((l, i) => {
          const desde = parseFloat(l.dataset.x || '0'), w = parseFloat(l.dataset.w || '0');
          const hasta = (i + 0.5) / n * 100 - w / 2;
          return { el: l, dx: ((hasta - desde) / 100) * ancho, color: rgb(l.dataset.color), oscuro: rgb(l.dataset.oscuro) };
        }),
        fondo: d.querySelector<HTMLElement>('.zonas__fondo'), titulo: d.querySelector<HTMLElement>('.zonas__titulo'),
        avance: d.querySelector<HTMLElement>('.zonas__avance'),
        infos: [...d.querySelectorAll<HTMLElement>('.zonas__info')], gigantes: [...d.querySelectorAll<HTMLElement>('.zonas__gigante .emblema')], activa: -1,
      };
    });
  };

  // ---------- Cuadro: solo cálculos con scrollY + escrituras ----------
  let ultimoY = scrollY, giroY = scrollY, oculto = false, pendiente = false;
  const cuadro = () => {
    pendiente = false;
    const y = scrollY;
    const p = clamp(y / altoDoc);
    if (progreso) progreso.style.transform = `scaleX(${p})`;
    if (arriba) { arriba.classList.toggle('visible', y > 700); arriba.style.setProperty('--p', p.toFixed(3)); }
    if (header) {
      header.classList.toggle('solido', y > 30);
      // Histéresis: se oculta tras bajar 140 px seguidos y vuelve al subir 10 px; nunca con un menú abierto
      const dir = Math.sign(y - ultimoY);
      if (dir !== 0 && Math.sign(y - giroY) !== dir) giroY = ultimoY;
      const menuAbierto = document.body.classList.contains('bloqueo') || !!header.querySelector('.nav li.abierto, .nav li:hover');
      if (!oculto && y > 420 && y - giroY > 140 && !menuAbierto) oculto = true;
      if (oculto && (giroY - y > 10 || y < 420 || menuAbierto)) oculto = false;
      header.classList.toggle('oculto', oculto);
    }
    ultimoY = y;
    if (reducir) return;

    for (const m of parallax) {
      const top = m.top - y;
      if (top + m.alto < -300 || top > altoVentana + 300) continue;
      m.el.style.transform = `translate3d(0, ${(-(top + m.alto / 2 - altoVentana / 2) * m.v).toFixed(1)}px, 0)`;
    }

    if (portada && y < altoVentana * 1.2) {
      const k = clamp(y / altoVentana);
      for (const c of capas) c.style.transform = `translate3d(0, ${(y * parseFloat(c.dataset.capa || '0')).toFixed(1)}px, 0)`;
      if (contPortada) {
        // Con el logo 3D activo solo se desvanecen los textos: las letras se dispersan por su cuenta
        const tres = portada.classList.contains('con-3d');
        contPortada.style.transform = `translate3d(0, ${y * (tres ? 0.15 : 0.35)}px, 0) scale(${tres ? 1 : 1 - k * 0.12})`;
        if (tres) for (const t of textosPortada) { t.style.opacity = String(1 - k * 2); t.style.transform = `translate3d(0, ${k * 60}px, 0)`; }
        else contPortada.style.opacity = String(1 - k * 1.4);
      }
    }

    for (const d of desarmes) {
      const k = clamp((y - d.top) / (d.alto - altoVentana));
      // 1) El logo se separa en sus nueve letras
      const e = 1 - Math.pow(1 - clamp(k / 0.16), 3);
      // 2) Recorrido: una letra (y su color) a la vez
      const tinte = suave(clamp((k - 0.13) / 0.08));
      const w = 0.5 + clamp((k - 0.2) / 0.74) * 8;
      const t = clamp(w - 0.5, 0, 8), i0 = Math.floor(t), f = suave(t - i0), i1 = Math.min(8, i0 + 1);
      const n = d.letras.length;
      const a0 = d.letras[i0], a1 = d.letras[i1];
      if (d.fondo) {
        d.fondo.style.opacity = tinte.toFixed(3);
        d.fondo.style.setProperty('--fc', mezclar(a0.color, a1.color, f));
        d.fondo.style.setProperty('--fz', mezclar(a0.oscuro, a1.oscuro, f));
      }
      d.el.classList.toggle('zonas--color', tinte > 0.5);
      if (d.titulo) { d.titulo.style.opacity = String(1 - clamp((k - 0.08) / 0.08)); d.titulo.style.transform = `translate3d(0, ${(-clamp((k - 0.06) / 0.12) * 60).toFixed(1)}px, 0)`; }
      if (d.avance) { d.avance.style.opacity = tinte.toFixed(2); (d.avance.firstElementChild as HTMLElement).style.transform = `scaleX(${((w + 0.5) / 9).toFixed(3)})`; }
      const activa = tinte > 0.5 ? Math.min(8, Math.floor(w)) : -1;
      d.letras.forEach((l, i) => {
        const arco = Math.sin(e * Math.PI) * (i % 2 ? -26 : 26);
        const giro = Math.sin(e * Math.PI) * (i - n / 2) * 2;
        const cerca = tinte * clamp(1 - Math.abs(w - (i + 0.5)) * 1.1);
        const alza = cerca * -34, escala = 1 - e * 0.32 + cerca * 0.3;
        l.el.style.transform = `translate3d(${(l.dx * e).toFixed(1)}px, ${(arco + alza).toFixed(1)}px, 0) scale(${escala.toFixed(3)}) rotate(${giro.toFixed(2)}deg)`;
        l.el.style.opacity = (1 - tinte * 0.55 + cerca * 0.55).toFixed(3);
        l.el.style.setProperty('--etq', String(clamp((k - 0.12) / 0.08) * (tinte > 0.5 ? cerca : 1)));
      });
      d.infos.forEach((el, i) => {
        const dist = w - (i + 0.5);
        const v = tinte * clamp(1 - Math.abs(dist) * 1.6);
        el.style.opacity = v.toFixed(3);
        el.style.transform = `translate3d(0, ${(-dist * 70).toFixed(1)}px, 0) scale(${(0.94 + v * 0.06).toFixed(3)})`;
        const g = d.gigantes[i];
        if (g) { g.style.opacity = (v * 0.09).toFixed(3); g.style.transform = `rotate(${(dist * -25).toFixed(1)}deg) scale(${(0.8 + v * 0.2).toFixed(3)})`; }
      });
      if (activa !== d.activa) {
        d.infos.forEach((el, i) => { el.classList.toggle('activa', i === activa); el.querySelector('a')?.setAttribute('tabindex', i === activa ? '0' : '-1'); });
        d.activa = activa;
      }
    }

  };
  const pedir = () => { if (!pendiente) { pendiente = true; requestAnimationFrame(cuadro); } };

  medir();
  cuadro();
  if (lenis) lenis.on('scroll', pedir); else addEventListener('scroll', pedir, { passive: true });
  let tRes = 0;
  const remedir = () => { clearTimeout(tRes); tRes = window.setTimeout(() => { medir(); cuadro(); }, 120); };
  addEventListener('resize', remedir);
  addEventListener('load', remedir);
  // Si cambia la altura del documento (imágenes que cargan, mapas, filtros), se vuelve a medir
  new ResizeObserver(remedir).observe(document.body);

  // Apariciones
  const io = new IntersectionObserver((es) => es.forEach((e) => {
    if (e.isIntersecting) { e.target.classList.add('visible'); io.unobserve(e.target); }
  }), { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
  document.querySelectorAll('.revelar, .revelar--cortina, .partir').forEach((el) => io.observe(el));

  // Contadores
  const ioc = new IntersectionObserver((es) => es.forEach((e) => {
    if (!e.isIntersecting) return;
    const el = e.target as HTMLElement; ioc.unobserve(el);
    const fin = Number(el.dataset.contar); const suf = el.dataset.sufijo ?? '';
    if (reducir) { el.textContent = fin + suf; return; }
    const t0 = performance.now();
    const paso = (t: number) => {
      const q = clamp((t - t0) / 1800);
      el.textContent = Math.round(fin * (1 - Math.pow(1 - q, 4))).toLocaleString('es-CL') + suf;
      if (q < 1) requestAnimationFrame(paso);
    };
    requestAnimationFrame(paso);
  }), { threshold: 0.6 });
  document.querySelectorAll('[data-contar]').forEach((el) => ioc.observe(el));

  // Inclinación 3D en tarjetas (el rectángulo se mide al entrar, no en cada movimiento)
  if (!reducir && !tactil) {
    document.querySelectorAll<HTMLElement>('[data-tilt]').forEach((el) => {
      const fuerza = parseFloat(el.dataset.tilt || '6');
      let r: DOMRect | null = null, raf = 0, ex = 0, ey = 0;
      el.addEventListener('pointerenter', () => { r = el.getBoundingClientRect(); });
      el.addEventListener('pointermove', (ev) => {
        ex = ev.clientX; ey = ev.clientY;
        if (raf || !r) return;
        raf = requestAnimationFrame(() => {
          raf = 0; if (!r) return;
          const x = (ex - r.left) / r.width, y = (ey - r.top) / r.height;
          el.style.transform = `perspective(900px) rotateX(${(0.5 - y) * fuerza}deg) rotateY(${(x - 0.5) * fuerza}deg) translateY(-6px)`;
          el.style.setProperty('--mx', `${x * 100}%`); el.style.setProperty('--my', `${y * 100}%`);
        });
      });
      el.addEventListener('pointerleave', () => { r = null; el.style.transform = ''; });
    });
  }

  // Puntos de posición en los carruseles deslizables (celulares)
  if (matchMedia('(max-width: 760px)').matches) {
    document.querySelectorAll<HTMLElement>('.carrusel-movil, .galeria').forEach((c) => {
      const hijos = [...c.children] as HTMLElement[];
      if (hijos.length < 2) return;
      const puntos = document.createElement('div'); puntos.className = 'puntos-carrusel'; puntos.setAttribute('aria-hidden', 'true');
      puntos.innerHTML = hijos.map((_, i) => `<i class="${i ? '' : 'on'}"></i>`).join('');
      c.after(puntos);
      const ps = [...puntos.children];
      let raf = 0;
      c.addEventListener('scroll', () => {
        if (raf) return;
        raf = requestAnimationFrame(() => {
          raf = 0;
          const paso = hijos[1].offsetLeft - hijos[0].offsetLeft || 1;
          const i = Math.min(hijos.length - 1, Math.round(c.scrollLeft / paso));
          ps.forEach((p, k) => p.classList.toggle('on', k === i));
        });
      }, { passive: true });
    });
  }

  arriba?.addEventListener('click', () => (lenis ? lenis.scrollTo(0, { duration: 1.6 }) : scrollTo({ top: 0, behavior: reducir ? 'auto' : 'smooth' })));
}

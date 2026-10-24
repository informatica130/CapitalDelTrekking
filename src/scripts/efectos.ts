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

/** Precarga de la primera visita: logo + contador, luego las franjas de colores suben como telón. */
function precarga() {
  const el = document.querySelector<HTMLElement>('.precarga');
  const fin = () => {
    (window as unknown as { __precargaFin?: boolean }).__precargaFin = true;
    document.dispatchEvent(new Event('precarga:fin'));
  };
  if (!el || document.documentElement.classList.contains('sin-precarga')) { el?.remove(); fin(); return; }
  const cuenta = el.querySelector<HTMLElement>('.precarga__cuenta');
  const barra = el.querySelector<HTMLElement>('.precarga__barra b');
  const t0 = performance.now(), dur = 2000;
  const paso = (t: number) => {
    const k = clamp((t - t0) / dur), e = 1 - Math.pow(1 - k, 3);
    if (cuenta) cuenta.textContent = String(Math.round(e * 100)).padStart(3, '0');
    if (barra) barra.style.transform = `scaleX(${e})`;
    if (k < 1) { requestAnimationFrame(paso); return; }
    el.classList.add('fuera');
    setTimeout(() => { el.classList.add('fuera2'); fin(); }, 600);
    setTimeout(() => el.remove(), 1900);
    try { sessionStorage.setItem('mct-visto', '1'); } catch { /* sin almacenamiento */ }
  };
  requestAnimationFrame(paso);
  // Seguridad: si algo falla, la precarga nunca bloquea la página más de 6 s
  setTimeout(() => { if (el.isConnected) { el.remove(); fin(); } }, 6000);
}

interface Medida { el: HTMLElement; top: number; alto: number; v: number }

export function iniciarEfectos() {
  precarga();
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
  let desarmes: { el: HTMLElement; top: number; alto: number; ancho: number; letras: { el: HTMLElement; dx: number }[] }[] = [];
  let horizontales: { el: HTMLElement; fila: HTMLElement; barra: HTMLElement | null; top: number; alto: number; extra: number }[] = [];

  const medir = () => {
    const y = scrollY;
    altoVentana = innerHeight; anchoVentana = innerWidth;
    // Altura de las secciones horizontales según el largo de su fila (antes de medir el resto)
    document.querySelectorAll<HTMLElement>('[data-horizontal]').forEach((h) => {
      const fila = h.querySelector<HTMLElement>('.horizontal__fila');
      if (!fila || anchoVentana <= 760) { h.style.height = ''; return; }
      fila.style.transform = '';
      const extra = Math.max(0, fila.scrollWidth - anchoVentana);
      h.style.height = `${altoVentana + extra}px`;
      h.dataset.extra = String(extra);
    });
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
          return { el: l, dx: ((hasta - desde) / 100) * ancho };
        }),
      };
    });
    horizontales = [...document.querySelectorAll<HTMLElement>('[data-horizontal]')].flatMap((h) => {
      const fila = h.querySelector<HTMLElement>('.horizontal__fila');
      const extra = parseFloat(h.dataset.extra || '0');
      if (!fila || !extra || anchoVentana <= 760) return [];
      const r = h.getBoundingClientRect();
      return [{ el: h, fila, barra: h.querySelector<HTMLElement>('.horizontal__barra i'), top: r.top + y, alto: r.height, extra }];
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
      const e = 1 - Math.pow(1 - clamp((k - 0.05) / 0.6), 3);
      const n = d.letras.length;
      const etq = String(clamp((k - 0.55) / 0.25));
      d.letras.forEach((l, i) => {
        const arco = Math.sin(e * Math.PI) * (i % 2 ? -26 : 26);
        const giro = Math.sin(e * Math.PI) * (i - n / 2) * 2;
        l.el.style.transform = `translate3d(${(l.dx * e).toFixed(1)}px, ${arco.toFixed(1)}px, 0) scale(${1 - e * 0.3}) rotate(${giro.toFixed(2)}deg)`;
        l.el.style.setProperty('--etq', etq);
      });
    }

    for (const h of horizontales) {
      const k = clamp((y - h.top) / (h.alto - altoVentana));
      h.fila.style.transform = `translate3d(${(-k * h.extra).toFixed(1)}px, 0, 0)`;
      if (h.barra) h.barra.style.transform = `scaleX(${k})`;
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

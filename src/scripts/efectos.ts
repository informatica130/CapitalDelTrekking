// Efectos de scroll y profundidad. Un solo bucle requestAnimationFrame para todo.
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
  document.querySelectorAll<HTMLElement>('.btn, .btn-icono, .fav--grande').forEach((b) => {
    b.addEventListener('pointermove', (e) => {
      const r = b.getBoundingClientRect();
      b.style.translate = `${(e.clientX - r.left - r.width / 2) * .22}px ${(e.clientY - r.top - r.height / 2) * .3}px`;
    });
    b.addEventListener('pointerleave', () => { b.style.translate = ''; });
  });
}

/** Precarga de la primera visita: logo + contador, luego las franjas de colores suben como telón. */
function precarga() {
  const el = document.querySelector<HTMLElement>('.precarga');
  if (!el || document.documentElement.classList.contains('sin-precarga')) { el?.remove(); return; }
  const cuenta = el.querySelector<HTMLElement>('.precarga__cuenta');
  const barra = el.querySelector<HTMLElement>('.precarga__barra b');
  const t0 = performance.now(), dur = 2400;
  const paso = (t: number) => {
    const k = clamp((t - t0) / dur), e = 1 - Math.pow(1 - k, 3);
    if (cuenta) cuenta.textContent = String(Math.round(e * 100)).padStart(3, '0');
    if (barra) barra.style.transform = `scaleX(${e})`;
    if (k < 1) { requestAnimationFrame(paso); return; }
    el.classList.add('fuera');
    setTimeout(() => {
      el.classList.add('fuera2');
      // Avisa a la portada que puede empezar la entrada del logo 3D
      (window as unknown as { __precargaFin?: boolean }).__precargaFin = true;
      document.dispatchEvent(new Event('precarga:fin'));
    }, 650);
    setTimeout(() => el.remove(), 2000);
    try { sessionStorage.setItem('mct-visto', '1'); } catch { /* sin almacenamiento */ }
  };
  requestAnimationFrame(paso);
}

export function iniciarEfectos() {
  precarga();
  partirTitulos();
  magneticos();
  if (!reducir) {
    lenis = new Lenis({ duration: 1.2, easing: (t) => 1 - Math.pow(1 - t, 4), smoothWheel: true });
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
  const parallax = [...document.querySelectorAll<HTMLElement>('[data-parallax]')];
  const desarmes = [...document.querySelectorAll<HTMLElement>('[data-desarme]')];
  const horizontales = [...document.querySelectorAll<HTMLElement>('[data-horizontal]')];
  const portada = document.querySelector<HTMLElement>('[data-portada]');
  let ultimoY = window.scrollY;
  let pendiente = false;

  // Altura de las secciones horizontales según el largo de su fila
  const medirHorizontales = () => horizontales.forEach((h) => {
    const fila = h.querySelector<HTMLElement>('.horizontal__fila');
    if (!fila || innerWidth <= 760) { h.style.height = ''; return; }
    const extra = Math.max(0, fila.scrollWidth - innerWidth);
    h.style.height = `${innerHeight + extra}px`;
    h.dataset.extra = String(extra);
  });

  const cuadro = () => {
    pendiente = false;
    const y = window.scrollY;
    const alto = document.documentElement.scrollHeight - innerHeight;
    const p = alto > 0 ? y / alto : 0;
    if (progreso) progreso.style.transform = `scaleX(${p})`;
    if (arriba) { arriba.classList.toggle('visible', y > 600); arriba.style.setProperty('--p', p.toFixed(3)); }
    if (header) {
      header.classList.toggle('solido', y > 40);
      const menuAbierto = document.body.classList.contains('bloqueo');
      header.classList.toggle('oculto', !menuAbierto && y > 500 && y > ultimoY + 4);
      if (y < ultimoY - 4) header.classList.remove('oculto');
    }
    ultimoY = y;
    if (reducir) return;

    for (const el of parallax) {
      const r = el.getBoundingClientRect();
      if (r.bottom < -200 || r.top > innerHeight + 200) continue;
      const v = parseFloat(el.dataset.parallax || '0.2');
      const centro = r.top + r.height / 2 - innerHeight / 2;
      el.style.transform = `translate3d(0, ${(-centro * v).toFixed(1)}px, 0)`;
    }

    if (portada) {
      const k = clamp(y / innerHeight);
      portada.querySelectorAll<HTMLElement>('[data-capa]').forEach((c) => {
        const v = parseFloat(c.dataset.capa || '0');
        c.style.transform = `translate3d(0, ${(y * v).toFixed(1)}px, 0)`;
      });
      const cont = portada.querySelector<HTMLElement>('.portada__contenido');
      if (cont) {
        // Con el logo 3D activo solo se desvanecen los textos: las letras se dispersan por su cuenta
        const tres = portada.querySelector('.logo3d--listo');
        cont.style.transform = `translate3d(0, ${y * (tres ? 0.15 : 0.35)}px, 0) scale(${tres ? 1 : 1 - k * 0.12})`;
        if (tres) cont.querySelectorAll<HTMLElement>('.portada__bajada, .acciones').forEach((t) => { t.style.opacity = String(1 - k * 2); t.style.transform = `translate3d(0, ${k * 60}px, 0)`; });
        else cont.style.opacity = String(1 - k * 1.4);
      }
    }

    for (const d of desarmes) {
      if (innerWidth <= 760) break;
      const r = d.getBoundingClientRect();
      const k = clamp(-r.top / (r.height - innerHeight));
      const letras = d.querySelectorAll<HTMLElement>('.zonas__letra');
      const n = letras.length;
      letras.forEach((l, i) => {
        // De logo compacto (k=0) a letras separadas y alineadas (k=1), con un arco vertical
        const desde = parseFloat(l.dataset.x || '0');
        const hasta = (i + 0.5) / n * 100 - parseFloat(l.dataset.w || '0') / 2;
        const e = 1 - Math.pow(1 - clamp((k - 0.05) / 0.6), 3);
        const x = desde + (hasta - desde) * e;
        const arco = Math.sin(e * Math.PI) * (i % 2 ? -26 : 26);
        const escala = 1 - e * 0.3;
        const giro = Math.sin(e * Math.PI) * (i - n / 2) * 2;
        l.style.left = `${x}%`;
        l.style.transform = `translate3d(0, ${arco}px, 0) scale(${escala}) rotate(${giro}deg)`;
        l.style.setProperty('--etq', String(clamp((k - 0.55) / 0.25)));
      });
    }

    for (const h of horizontales) {
      const fila = h.querySelector<HTMLElement>('.horizontal__fila');
      const barra = h.querySelector<HTMLElement>('.horizontal__barra i');
      const extra = parseFloat(h.dataset.extra || '0');
      if (!fila || !extra) continue;
      const r = h.getBoundingClientRect();
      const k = clamp(-r.top / (r.height - innerHeight));
      fila.style.transform = `translate3d(${-k * extra}px, 0, 0)`;
      if (barra) barra.style.transform = `scaleX(${k})`;
    }
  };
  const pedir = () => { if (!pendiente) { pendiente = true; requestAnimationFrame(cuadro); } };
  medirHorizontales();
  if (lenis) lenis.on('scroll', pedir); else addEventListener('scroll', pedir, { passive: true });
  addEventListener('resize', () => { medirHorizontales(); pedir(); });
  addEventListener('load', () => { medirHorizontales(); pedir(); });
  cuadro();

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

  // Inclinación 3D en tarjetas
  if (!reducir && !tactil) {
    document.querySelectorAll<HTMLElement>('[data-tilt]').forEach((el) => {
      const fuerza = parseFloat(el.dataset.tilt || '6');
      el.addEventListener('pointermove', (ev) => {
        const r = el.getBoundingClientRect();
        const x = (ev.clientX - r.left) / r.width, y = (ev.clientY - r.top) / r.height;
        el.style.transform = `perspective(900px) rotateX(${(0.5 - y) * fuerza}deg) rotateY(${(x - 0.5) * fuerza}deg) translateY(-6px)`;
        el.style.setProperty('--mx', `${x * 100}%`); el.style.setProperty('--my', `${y * 100}%`);
      });
      el.addEventListener('pointerleave', () => { el.style.transform = ''; });
    });
  }

  arriba?.addEventListener('click', () => (lenis ? lenis.scrollTo(0, { duration: 1.8 }) : scrollTo({ top: 0, behavior: reducir ? 'auto' : 'smooth' })));
}

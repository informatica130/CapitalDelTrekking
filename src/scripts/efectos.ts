// Efectos de scroll y profundidad. Un solo bucle requestAnimationFrame para todo.
const reducir = matchMedia('(prefers-reduced-motion: reduce)').matches;
const tactil = matchMedia('(hover: none)').matches;
const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));

export function iniciarEfectos() {
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
      if (cont) { cont.style.opacity = String(1 - k * 1.4); cont.style.transform = `translate3d(0, ${y * 0.35}px, 0) scale(${1 - k * 0.12})`; }
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
  addEventListener('scroll', pedir, { passive: true });
  addEventListener('resize', () => { medirHorizontales(); pedir(); });
  addEventListener('load', () => { medirHorizontales(); pedir(); });
  cuadro();

  // Apariciones
  const io = new IntersectionObserver((es) => es.forEach((e) => {
    if (e.isIntersecting) { e.target.classList.add('visible'); io.unobserve(e.target); }
  }), { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
  document.querySelectorAll('.revelar, .revelar--cortina').forEach((el) => io.observe(el));

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

  arriba?.addEventListener('click', () => scrollTo({ top: 0, behavior: reducir ? 'auto' : 'smooth' }));
}

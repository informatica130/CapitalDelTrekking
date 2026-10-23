// Funciones del sitio: buscador global, "Mi viaje" (favoritos), tema claro/oscuro, compartir y menú móvil.
type Item = { t: string; u: string; c: string; i: string; x: string; z: number };
const CLAVE_VIAJE = 'mct-mi-viaje';
const CLAVE_TEMA = 'mct-tema';

const leer = <T>(k: string, d: T): T => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) as T : d; } catch { return d; } };
const guardar = (k: string, v: unknown) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* almacenamiento no disponible */ } };

let indice: Item[] | null = null;
export async function cargarIndice(): Promise<Item[]> {
  if (indice) return indice;
  try { indice = await (await fetch('/buscar.json')).json() as Item[]; } catch { indice = []; }
  return indice;
}

export function aviso(texto: string) {
  let el = document.querySelector<HTMLElement>('.aviso');
  if (!el) { el = document.createElement('div'); el.className = 'aviso'; el.setAttribute('role', 'status'); document.body.append(el); }
  el.innerHTML = `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 20s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.2a4.3 4.3 0 0 1 7.5 2.6C19.5 15.4 12 20 12 20z"/></svg>${texto}`;
  el.classList.add('visible');
  clearTimeout(Number(el.dataset.t));
  el.dataset.t = String(window.setTimeout(() => el!.classList.remove('visible'), 2600));
}

/* ---------- Mi viaje ---------- */
export const viaje = {
  lista: (): string[] => leer<string[]>(CLAVE_VIAJE, []),
  tiene: (u: string) => viaje.lista().includes(u),
  alternar(u: string) {
    const l = viaje.lista();
    const i = l.indexOf(u);
    if (i >= 0) l.splice(i, 1); else l.push(u);
    guardar(CLAVE_VIAJE, l);
    pintarFavoritos();
    document.dispatchEvent(new CustomEvent('viaje:cambio'));
    return i < 0;
  },
  vaciar() { guardar(CLAVE_VIAJE, []); pintarFavoritos(); document.dispatchEvent(new CustomEvent('viaje:cambio')); },
};

function pintarFavoritos() {
  const l = viaje.lista();
  document.querySelectorAll<HTMLElement>('[data-fav]').forEach((b) => {
    const on = l.includes(b.dataset.fav!);
    b.setAttribute('aria-pressed', String(on));
    b.setAttribute('aria-label', on ? 'Quitar de Mi viaje' : 'Guardar en Mi viaje');
    const t = b.querySelector('[data-fav-txt]'); if (t) t.textContent = on ? 'Guardado en Mi viaje' : 'Guardar en Mi viaje';
  });
  document.querySelectorAll<HTMLElement>('.contador-viaje').forEach((c) => { c.textContent = String(l.length); c.classList.toggle('con', l.length > 0); });
}

function iniciarFavoritos() {
  pintarFavoritos();
  document.addEventListener('click', (e) => {
    const b = (e.target as HTMLElement).closest<HTMLElement>('[data-fav]');
    if (!b) return;
    e.preventDefault(); e.stopPropagation();
    const agregado = viaje.alternar(b.dataset.fav!);
    aviso(agregado ? 'Agregado a Mi viaje' : 'Quitado de Mi viaje');
  });
}

/* ---------- Tema ---------- */
function iniciarTema() {
  const raiz = document.documentElement;
  document.querySelectorAll<HTMLButtonElement>('[data-tema-btn]').forEach((b) => b.addEventListener('click', () => {
    const oscuroAhora = raiz.dataset.tema ? raiz.dataset.tema === 'oscuro' : matchMedia('(prefers-color-scheme: dark)').matches;
    const nuevo = oscuroAhora ? 'claro' : 'oscuro';
    raiz.dataset.tema = nuevo; guardar(CLAVE_TEMA, nuevo);
  }));
}

/* ---------- Compartir ---------- */
function iniciarCompartir() {
  document.querySelectorAll<HTMLButtonElement>('[data-compartir]').forEach((b) => b.addEventListener('click', async () => {
    const datos = { title: document.title, url: location.href };
    if (navigator.share) { try { await navigator.share(datos); return; } catch { return; } }
    try { await navigator.clipboard.writeText(location.href); aviso('Enlace copiado'); } catch { prompt('Copia el enlace:', location.href); }
  }));
  document.querySelectorAll<HTMLButtonElement>('[data-imprimir]').forEach((b) => b.addEventListener('click', () => print()));
}

/* ---------- Menú móvil y submenús ---------- */
function iniciarMenu() {
  const menu = document.getElementById('menuMovil');
  const abrir = (si: boolean) => {
    menu?.classList.toggle('abierto', si);
    document.body.classList.toggle('bloqueo', si);
    document.querySelectorAll('[data-menu-abrir]').forEach((b) => b.setAttribute('aria-expanded', String(si)));
    if (si) menu?.querySelector<HTMLElement>('a, button')?.focus();
  };
  document.querySelectorAll('[data-menu-abrir]').forEach((b) => b.addEventListener('click', () => abrir(true)));
  document.querySelectorAll('[data-menu-cerrar]').forEach((b) => b.addEventListener('click', () => abrir(false)));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && menu?.classList.contains('abierto')) abrir(false); });
  document.querySelectorAll<HTMLButtonElement>('.nav .sub-toggle').forEach((b) => b.addEventListener('click', () => {
    const li = b.parentElement!; const si = !li.classList.contains('abierto');
    document.querySelectorAll('.nav li.abierto').forEach((x) => x.classList.remove('abierto'));
    li.classList.toggle('abierto', si); b.setAttribute('aria-expanded', String(si));
  }));
  document.addEventListener('click', (e) => { if (!(e.target as HTMLElement).closest('.nav')) document.querySelectorAll('.nav li.abierto').forEach((x) => x.classList.remove('abierto')); });
}

/* ---------- Buscador global ---------- */
const sinTildes = (t: string) => t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const escapar = (t: string) => t.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));
function resaltar(texto: string, q: string) {
  if (!q) return escapar(texto);
  const i = sinTildes(texto).indexOf(q);
  if (i < 0) return escapar(texto);
  return escapar(texto.slice(0, i)) + '<mark>' + escapar(texto.slice(i, i + q.length)) + '</mark>' + escapar(texto.slice(i + q.length));
}

function iniciarBuscador() {
  const caja = document.getElementById('buscador');
  if (!caja) return;
  const input = caja.querySelector<HTMLInputElement>('input')!;
  const res = caja.querySelector<HTMLElement>('.buscador__res')!;
  const emblemas = JSON.parse(caja.dataset.emblemas || '[]') as string[];
  let activo = 0;
  let previo: HTMLElement | null = null;

  const pintar = async () => {
    const datos = await cargarIndice();
    const q = sinTildes(input.value.trim());
    const palabras = q.split(/\s+/).filter(Boolean);
    const lista = (palabras.length
      ? datos.map((d) => {
          const h = sinTildes(`${d.t} ${d.c} ${d.x}`);
          if (!palabras.every((p) => h.includes(p))) return null;
          const s = sinTildes(d.t).startsWith(palabras[0]) ? 0 : sinTildes(d.t).includes(palabras[0]) ? 1 : 2;
          return { d, s };
        }).filter(Boolean).sort((a, b) => a!.s - b!.s).map((x) => x!.d)
      : datos.filter((d) => d.c === 'Ruta').slice(0, 6)).slice(0, 40);
    activo = 0;
    res.innerHTML = lista.length
      ? (palabras.length ? '' : '<p style="margin:8px 12px;font-size:.8rem;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--suave)">Rutas sugeridas</p>') +
        lista.map((d, i) => `<a href="${d.u}" class="${i === 0 ? 'activo' : ''}" style="--c:var(--z)">
          <span class="mini">${d.i ? `<img src="${d.i}" alt="" loading="lazy">` : emblemas[d.z] ?? ''}</span>
          <span><b>${resaltar(d.t, palabras[0] ?? '')}</b><small>${escapar(d.c)}${d.x ? ' · ' + escapar(d.x) : ''}</small></span>
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M13 6l6 6-6 6"/></svg></a>`).join('')
      : `<div class="buscador__vacio">No encontramos resultados para «${escapar(input.value)}».</div>`;
  };
  const abrir = () => {
    previo = document.activeElement as HTMLElement;
    caja.hidden = false; requestAnimationFrame(() => caja.classList.add('abierto'));
    document.body.classList.add('bloqueo'); input.value = ''; pintar(); setTimeout(() => input.focus(), 50);
  };
  const cerrar = () => { caja.classList.remove('abierto'); document.body.classList.remove('bloqueo'); setTimeout(() => { caja.hidden = true; }, 300); previo?.focus(); };
  const mover = (d: number) => {
    const as = [...res.querySelectorAll<HTMLAnchorElement>('a')]; if (!as.length) return;
    as[activo]?.classList.remove('activo'); activo = (activo + d + as.length) % as.length;
    as[activo].classList.add('activo'); as[activo].scrollIntoView({ block: 'nearest' });
  };
  document.querySelectorAll('[data-buscar-abrir]').forEach((b) => b.addEventListener('click', abrir));
  caja.addEventListener('click', (e) => { if (e.target === caja) cerrar(); });
  input.addEventListener('input', pintar);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); mover(1); }
    if (e.key === 'ArrowUp') { e.preventDefault(); mover(-1); }
    if (e.key === 'Enter') { const a = res.querySelectorAll<HTMLAnchorElement>('a')[activo]; if (a) location.href = a.href; }
  });
  document.addEventListener('keydown', (e) => {
    const escribiendo = /input|textarea|select/i.test((e.target as HTMLElement).tagName);
    if ((e.key === 'k' && (e.metaKey || e.ctrlKey)) || (e.key === '/' && !escribiendo)) { e.preventDefault(); caja.classList.contains('abierto') ? cerrar() : abrir(); }
    if (e.key === 'Escape' && caja.classList.contains('abierto')) cerrar();
  });
}

export function iniciarApp() {
  iniciarFavoritos();
  iniciarTema();
  iniciarCompartir();
  iniciarMenu();
  iniciarBuscador();
}

"""Convierte los datos extraídos en archivos JSON limpios para el sitio Astro."""
import json, os, re, sys, glob, html as H, urllib.parse
SCR, SITE = sys.argv[1], sys.argv[2]
EXT = f'{SCR}/ext'; MEDIA = f'{SITE}/public/media'; DATA = f'{SITE}/src/data'
os.makedirs(DATA, exist_ok=True)
assets = json.load(open(f'{EXT}/_assets.json'))
interes = json.load(open(f'{EXT}/_interes.json'))

def base_of(u):
    if not u: return ''
    if u.startswith('//'): u = 'https:' + u
    m = re.match(r'(.*?)(?:-\d+x\d+)?(\.\w+)$', u)
    return m.group(1) + m.group(2) if m else u

missing = set()
def local(u):
    """Ruta pública local de una imagen/archivo del sitio original ('' si no existe)."""
    if not u or 'melipeucocapitaldeltrekking.cl' not in u: return ''
    if '/themes/' in u: return ''          # imagen por defecto del tema antiguo
    b = base_of(u)
    rel = urllib.parse.unquote(urllib.parse.urlparse(b).path.lstrip('/')).replace('wp-content/uploads/', '')
    if os.path.exists(f'{MEDIA}/{rel}'): return f'/media/{rel}'
    missing.add(u); return ''

def text_of(htm):
    t = re.sub(r'<[^>]+>', ' ', htm or ''); t = H.unescape(re.sub(r'\s+', ' ', t)).strip()
    return t

def excerpt(htm, n=170):
    t = text_of(htm)
    return t if len(t) <= n else t[:n].rsplit(' ', 1)[0] + '…'

def clean_body(htm):
    htm = re.sub(r'\s(class|style|id|data-[\w-]+)="[^"]*"', '', htm or '')
    htm = re.sub(r'<p>\s*(&nbsp;)?\s*</p>', '', htm)
    def img(m):
        src = local(m.group(1)); return f'<img src="{src}" alt="" loading="lazy">' if src else ''
    htm = re.sub(r'<img[^>]*src="([^"]+)"[^>]*>', img, htm)
    htm = htm.replace('https://melipeucocapitaldeltrekking.cl', '')
    return htm.strip()

def groups(g):
    out = []
    for titulo, campos in g.items():
        cs = [{'k': k, 'v': v} for k, v in campos.items() if v and v.strip(' /') and v.strip() not in ('KM',)]
        if cs: out.append({'titulo': titulo, 'campos': cs})
    return out

def gal(item):
    seen, out = set(), []
    for u in item.get('galeria', []):
        l = local(u)
        if l and l not in seen: seen.add(l); out.append(l)
    return out

def common(it):
    g = gal(it)
    img = local(it.get('imagen')) or (g[0] if g else '')
    return {'slug': it['slug'], 'titulo': it['title'], 'subtitulo': it.get('subtitulo', ''),
            'resumen': [{'k': k, 'v': v} for k, v in it.get('resumen', {}).items() if v],
            'cuerpo': clean_body(it.get('body')), 'extracto': excerpt(it.get('body')),
            'imagen': img, 'galeria': g, 'grupos': groups(it.get('grupos', {})),
            'coords': it.get('coords'), 'mapa_embed': it.get('mapa_embed', ''),
            'operadores': it.get('operadores', []), 'relacionados': it.get('relacionados', [])}

def redes(lst):
    r = {}
    for u in lst:
        for k in ('whatsapp|wa.me', 'facebook', 'instagram', 'tiktok', 'youtube'):
            if re.search(k, u): r[k.split('|')[0]] = u; break
        else: r.setdefault('web', u)
    return r

def tax(it, prefix):
    return [c[len(prefix):] for c in it.get('taxonomias', []) if c.startswith(prefix)]

def listing_slugs(name, kind):
    out = []
    for f in sorted(glob.glob(f'{SCR}/dl/listings/{name}*.html')):
        for s in re.findall(rf'href="https://melipeucocapitaldeltrekking\.cl/{kind}/([^"/]+)/?"', open(f, errors='ignore').read()):
            if s not in out: out.append(s)
    return out

L = lambda n: json.load(open(f'{EXT}/{n}.json'))
by_title = lambda d: sorted(d, key=lambda x: x['titulo'].lower())

KMZ = sorted(os.listdir(f'{MEDIA}/kmz')) if os.path.isdir(f'{MEDIA}/kmz') else []
def gpx_local(gp):
    """Track GPX local: el mismo archivo, o el de /kmz/ con el mismo número de ruta."""
    if not gp: return ''
    nombre = gp.split('/')[-1]
    if nombre in KMZ: return '/media/kmz/' + nombre
    l = local(gp)
    if l: return l
    num = re.match(r'(\d+)\.', nombre)
    for k in KMZ:
        if num and re.match(rf'0*{int(num.group(1))}\.', k): missing.discard(gp); return '/media/kmz/' + k
    return ''

# Rutas
rutas = []
for it in L('rutas'):
    r = common(it)
    r['interes'] = (interes.get(it['slug']) or [''])[0]
    r['tipo_recorrido'] = [t.replace('-', ' ') for t in tax(it, 'tipo-de-recorrido-')]
    gp = it.get('gpx', '')
    r['gpx'] = gpx_local(gp)
    rs = dict((x['k'], x['v']) for x in r['resumen'])
    r['dificultad'] = rs.get('Dificultad (escala MIDE)', '')
    r['extension'] = rs.get('Extensión (ida y vuelta)', '')
    r['duracion'] = rs.get('Duración', '')
    r['condicion'] = rs.get('Condición', '')
    rutas.append(r)

# Actividades y atractivos
actividades = []
for it in L('actividades'):
    a = common(it)
    a['categoria'] = 'actividad' if 'atractivo-actividad-actividad' in it['taxonomias'] else 'atractivo'
    a['tipo'] = (a['resumen'][0]['v'] if a['resumen'] else '')
    actividades.append(a)

def negocio(it):
    n = common(it); n['redes'] = redes(it.get('redes', []))
    n['logo'] = local(it.get('logo')); n['servicios'] = [s for s in it.get('servicios_iconos', []) if s]
    return n

alojamientos = [dict(negocio(it), clase=(dict((x['k'], x['v']) for x in negocio(it)['resumen']).get('Clase de alojamiento', ''))) for it in L('alojamientos')]
operadores = [negocio(it) for it in L('operadores')]
gastro = set(listing_slugs('gastronomia', 'servicio-restaurante'))
servicios = []
for it in L('servicios'):
    s = negocio(it)
    s['tipo'] = dict((x['k'], x['v']) for x in s['resumen']).get('Tipo de servicio', '')
    s['seccion'] = 'gastronomia' if it['slug'] in gastro else 'complementarios'
    servicios.append(s)

guias = json.load(open(f'{EXT}/guias.json'))
for g in guias:
    g['foto'] = local(g.get('foto'))
    g['slug'] = re.sub(r'[^a-z0-9]+', '-', H.unescape(g['nombre']).lower().translate(str.maketrans('áéíóúñü', 'aeiounu'))).strip('-')

mapa = json.load(open(f'{EXT}/_mapa.json'))
for m in mapa: m['gpx'] = '/media/kmz/' + m['gpx']

home = open(f'{SCR}/dl/pages/index.html', errors='ignore').read()
def ordered(kind):
    out = []
    for s in re.findall(rf'href="https://melipeucocapitaldeltrekking\.cl/{kind}/([^"/]+)/?"', home):
        if s not in out: out.append(s)
    return out
slides = []
for u in re.findall(r'//melipeucocapitaldeltrekking\.cl/wp-content/uploads/slider/cache/[^"\s]+\.jpg', home):
    l = local('https:' + u)
    if l and l not in slides: slides.append(l)
inicio = {'slides': slides, 'rutas_destacadas': ordered('ruta-de-trekking'),
          'imperdibles': ordered('actividad-atractivo')}

def dump(name, obj): json.dump(obj, open(f'{DATA}/{name}.json', 'w'), ensure_ascii=False, indent=1)
dump('rutas', by_title(rutas)); dump('actividades', by_title(actividades))
dump('alojamientos', by_title(alojamientos)); dump('operadores', by_title(operadores))
dump('servicios', by_title(servicios)); dump('guias', sorted(guias, key=lambda g: g['nombre']))
dump('mapa', mapa); dump('inicio', inicio)
print({k: len(v) for k, v in dict(rutas=rutas, actividades=actividades, alojamientos=alojamientos,
       operadores=operadores, servicios=servicios, guias=guias).items()}, 'imagenes faltantes:', len(missing))
for m in sorted(missing)[:15]: print('  falta', m)

# Noticias (entradas del blog)
noticias = []
for f in sorted(glob.glob(f'{SCR}/dl/pages/entrada-*.html')):
    s = open(f, errors='ignore').read()
    from bs4 import BeautifulSoup
    b = BeautifulSoup(s, 'html.parser')
    ec = b.select_one('.entry-content')
    h = ec.find(['h1', 'h2']) if ec else None
    titulo = H.unescape(re.search(r'<title>([^<]+?)(?: &#8211;| –)', s).group(1)).strip()
    if h: h.decompose()
    slug = os.path.basename(f)[:-5]
    # El sitio original no publica la fecha; se usa el mes de carga de su imagen y un orden estable.
    img_home = {'entrada-de-prueba-1': 'https://melipeucocapitaldeltrekking.cl/wp-content/uploads/2025/01/sendero-truful-3.webp',
                'entrada-de-prueba-2': 'https://melipeucocapitaldeltrekking.cl/wp-content/uploads/2025/01/ski-randonee-en-batea-mahuida-galeria-3.webp',
                'entrada-de-prueba-3': 'https://melipeucocapitaldeltrekking.cl/wp-content/uploads/slider2/04.webp'}.get(slug, '')
    fecha = '2025-01-%02d' % (10 + int(re.sub(r'\D', '', slug) or 0))
    body = ''.join(str(c) for c in ec.children) if ec else ''
    noticias.append({'slug': slug, 'titulo': titulo, 'fecha': fecha,
                     'imagen': local(img_home), 'categoria': 'Noticias',
                     'extracto': excerpt(body, 200), 'cuerpo': clean_body(body)})
dump('noticias', noticias)
print('noticias', [(n['slug'], n['fecha'], n['imagen']) for n in noticias])

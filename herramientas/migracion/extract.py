import re, sys, os, json, html as H
from bs4 import BeautifulSoup
PAGES, OUT = sys.argv[1], sys.argv[2]
TYPES = {'ruta-de-trekking':'rutas','actividad-atractivo':'actividades','donde-dormir':'alojamientos',
         'operador-turistico':'operadores','servicio-restaurante':'servicios'}
def txt(e): return re.sub(r'\s+',' ',e.get_text(' ',strip=True)).strip() if e else ''
def clean_fields(el):
    out={}
    for sp in el.find_all('span'):
        b=sp.find('b')
        if not b: continue
        k=txt(b).rstrip(':').strip(); b.extract(); v=txt(sp)
        out[k]=v
    return out
data={v:[] for v in TYPES.values()}; images=set(); gpx=set()
for fn in sorted(os.listdir(PAGES)):
    pre,_,slug=fn[:-5].partition('__')
    if pre not in TYPES or not slug or '__' in slug: continue
    s=open(os.path.join(PAGES,fn),errors='ignore').read()
    b=BeautifulSoup(s,'html.parser')
    art=b.find('article'); classes=art.get('class',[]) if art else []
    item={'slug':slug,'title':txt(b.select_one('.heromain h1'))}
    sd=b.select_one('.superhero-data')
    if sd:
        item['resumen']={}
        for bb in sd.find_all('b'):
            k=txt(bb).rstrip(':'); v=''
            for sib in bb.next_siblings:
                if getattr(sib,'name',None)=='b': break
                v+=sib.get_text() if hasattr(sib,'get_text') else str(sib)
            item['resumen'][k]=re.sub(r'\s+',' ',v).strip(' /')
    h2=b.select_one('.titulo-central h2'); item['subtitulo']=txt(h2)
    ec=b.select_one('.entry-content')
    item['body']=''.join(str(c) for c in ec.children).strip() if ec else ''
    item['grupos']={}
    for mb in b.select('.meta-bloque-azul'):
        item['grupos'][txt(mb.find('h3'))]=clean_fields(mb)
    item['galeria']=[a['href'] for a in b.select('#ruta-gal a[href]')]
    # featured image: og:image
    og=b.find('meta',property='og:image'); item['imagen']=og['content'] if og else (item['galeria'][0] if item['galeria'] else '')
    item['redes']=[a['href'] for a in b.select('.nuestrasredes-central a[href]')]
    m=re.search(r"https?://[^\"' ]+\.gpx",s); item['gpx']=m.group(0) if m else ''
    m=re.search(r"center:\s*\[([-\d.]+),\s*([-\d.]+)\]",s)
    if m: item['coords']=[float(m.group(1)),float(m.group(2))]
    m=re.search(r'maps/place\?q=([-\d.]+),\s*([-\d.]+)',s)
    if m: item['coords']=[float(m.group(1)),float(m.group(2))]
    ifr=b.select_one('.google-embed iframe'); item['mapa_embed']=ifr['src'] if ifr else ''
    ub=b.select_one('.text-center.py-3'); 
    item['servicios_iconos']=[txt(x) for x in b.select('.servicio-nombre')]
    item['operadores']=[a['href'].rstrip('/').split('/')[-1] for a in b.select('a.operador-link[href]')]
    item['relacionados']=sorted({a['href'].rstrip('/').split('/')[-1] for a in b.select('.ct-x-gris a[href*="/ruta-de-trekking/"], .ct-x-gris a[href*="/actividad-atractivo/"]')})
    item['taxonomias']=[c for c in classes if re.match(r'(tipo|clase|formas|atractivo|vincular|interes|ruta)-',c)]
    item['logo']=''
    lg=b.select_one('.ellogotipo img') or b.select_one('.ellogotipo')
    if lg is not None:
        st=lg.get('src') or re.search(r"url\(['\"]?([^)'\"]+)",lg.get('style','') or '') 
        item['logo']=st if isinstance(st,str) else (st.group(1) if st else '')
    for u in item['galeria']+[item['imagen'],item['logo']]:
        if u: images.add(u)
    for im in (ec.find_all('img') if ec else []): images.add(im.get('src'))
    if item['gpx']: gpx.add(item['gpx'])
    data[TYPES[pre]].append(item)
os.makedirs(OUT,exist_ok=True)
for k,v in data.items(): json.dump(v,open(f'{OUT}/{k}.json','w'),ensure_ascii=False,indent=1)
open(f'{OUT}/_images.txt','w').write('\n'.join(sorted(images)))
open(f'{OUT}/_gpx.txt','w').write('\n'.join(sorted(gpx)))
print({k:len(v) for k,v in data.items()}, len(images), len(gpx))

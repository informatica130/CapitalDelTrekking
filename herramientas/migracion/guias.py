import re,sys,json,glob
from bs4 import BeautifulSoup
out=[];seen=set()
for f in sorted(glob.glob(sys.argv[1]+'/guias-turisticos*.html')):
    b=BeautifulSoup(open(f,errors='ignore').read(),'html.parser')
    for p in b.select('.persona'):
        g={'nombre':p.find('h2').get_text(strip=True)}
        if g['nombre'] in seen: continue
        seen.add(g['nombre'])
        e=p.select_one('.persona-esp'); g['especialidad']=e.get_text(strip=True) if e else ''
        im=p.select_one('.persona-img'); m=re.search(r'url\(([^)]+)\)',im.get('style','')) if im else None
        g['foto']=m.group(1).strip('\'" ') if m else ''
        for mm in p.select('.persona-meta'):
            k=mm.find('strong').get_text(strip=True).rstrip(': ').lower(); mm.find('strong').extract()
            g[{'dirección':'direccion','certificaciones':'certificaciones'}.get(k,k)]=mm.get_text(' ',strip=True)
        for a in p.select('.persona-icons a[href]'):
            h=a['href']
            if h.startswith('tel:'): g['telefono']=h[4:]
            elif 'wa.me' in h: g['whatsapp']=h
            elif h.startswith('mailto:'): g['email']=h[7:]
            elif 'instagram' in h: g['instagram']=h
            elif 'facebook' in h: g['facebook']=h
            else: g.setdefault('web',h)
        out.append(g)
json.dump(out,open(sys.argv[2],'w'),ensure_ascii=False,indent=1); print(len(out),'guias')

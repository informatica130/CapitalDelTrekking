import re,os,sys,glob,json,html
PAGES=sys.argv[1]
urls=set()
for f in glob.glob(PAGES+'/*.html'):
    s=html.unescape(open(f,errors='ignore').read())
    for u in re.findall(r'(?:https?:)?//melipeucocapitaldeltrekking\.cl/(?:wp-content/uploads|kmz)/[^\s"\'()<>,]+',s):
        if u.startswith('//'): u='https:'+u
        urls.add(u.rstrip('\\'))
# group by base (remove -WxH and -scaled)
groups={}
for u in urls:
    if not re.search(r'\.(jpe?g|png|webp|svg|gif|gpx|kml|kmz|pdf|mp4)$',u,re.I): continue
    m=re.match(r'(.*?)(?:-(\d+)x(\d+))?(\.\w+)$',u)
    base=m.group(1)+m.group(4)
    w=int(m.group(2)) if m.group(2) else 99999
    groups.setdefault(base,[]).append((w,u))
choice={}
for base,lst in groups.items():
    lst.sort()
    # prefer largest variant <=2048, else original
    pick=[u for w,u in lst if w<=2048 and w!=99999]
    orig=[u for w,u in lst if w==99999]
    choice[base]={'all':[u for _,u in lst],'pick':(pick[-1] if pick and max(w for w,_ in lst if w!=99999)>=1024 else (orig[0] if orig else lst[-1][1]))}
json.dump(choice,open(sys.argv[2],'w'),indent=1)
print(len(urls),'urls',len(choice),'unique assets')

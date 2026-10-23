import re, os, sys, time, subprocess, hashlib, urllib.parse
OUT=sys.argv[1]; os.makedirs(OUT+'/pages',exist_ok=True)
BASE='https://melipeucocapitaldeltrekking.cl'
skip=re.compile(r'(wp-json|xmlrpc|/feed/|wp-content|wp-includes|wp-admin|\?|\.(css|js|png|jpe?g|webp|svg|gif|woff2?|ico|pdf|xml)$)')
queue=['/']; seen=set()
def fetch(url,dest):
    for i in range(5):
        r=subprocess.run(['curl','-sS','-L','--compressed','-A','Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/124 Safari/537.36','-o',dest,'-w','%{http_code}',url],capture_output=True,text=True)
        if r.stdout=='200': return True
        time.sleep(2*(i+1))
    print('FAIL',url,r.stdout,r.stderr.strip()); return False
while queue:
    p=queue.pop(0)
    if p in seen: continue
    seen.add(p)
    name=(p.strip('/').replace('/','__') or 'index')+'.html'
    dest=f'{OUT}/pages/{name}'
    if not os.path.exists(dest) and not fetch(BASE+p,dest): continue
    html=open(dest,errors='ignore').read()
    print('OK',p,len(html),flush=True)
    for h in re.findall(r'href="(?:https?:)?//melipeucocapitaldeltrekking\.cl(/[^"#]*)"',html):
        h=h.replace('&amp;','&')
        if skip.search(h): continue
        if not h.endswith('/'): h+='/'
        if h not in seen: queue.append(h)
    time.sleep(1)

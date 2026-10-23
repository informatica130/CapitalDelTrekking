import json,os,sys,subprocess,time,urllib.parse
A=json.load(open(sys.argv[1])); OUT=sys.argv[2]
ok=fail=0
for base,info in sorted(A.items()):
    rel=urllib.parse.urlparse(base).path.lstrip('/')
    rel=rel.replace('wp-content/uploads/','')
    dest=os.path.join(OUT,urllib.parse.unquote(rel))
    if os.path.exists(dest) and os.path.getsize(dest)>200: ok+=1; continue
    os.makedirs(os.path.dirname(dest),exist_ok=True)
    cands=[info['pick']]+[u for u in reversed(info['all']) if u!=info['pick']]
    done=False
    for u in cands:
        for i in range(4):
            r=subprocess.run(['curl','-sS','-L','-A','Mozilla/5.0 Chrome/124','-o',dest,'-w','%{http_code}',u],capture_output=True,text=True)
            if r.stdout=='200' and os.path.getsize(dest)>200: done=True; break
            if r.stdout in('404','403'): break
            time.sleep(2*(i+1))
        if done: break
    if done: ok+=1
    else:
        fail+=1; print('FAIL',base,flush=True)
        if os.path.exists(dest): os.remove(dest)
    time.sleep(0.3)
print('DONE ok',ok,'fail',fail,flush=True)

#!/usr/bin/env python3
"""Run every suite: node unit tests, then each tools/tests/test_*.py. Usage: python3 tools/run_tests.py [--only name]"""
import sys,os,re,glob,time,socket,subprocess,argparse
TOOLS=os.path.dirname(os.path.abspath(__file__));ROOT=os.path.dirname(TOOLS)
def free_port():
    s=socket.socket();s.bind(('127.0.0.1',0));p=s.getsockname()[1];s.close();return p
def run(cmd,env=None,timeout=900):
    t=time.time()
    try:
        r=subprocess.run(cmd,cwd=ROOT,env=env,capture_output=True,text=True,timeout=timeout);out=r.stdout+r.stderr;rc=r.returncode
    except subprocess.TimeoutExpired as e:
        out=(e.stdout or b'').decode() if isinstance(e.stdout,bytes) else (e.stdout or '');rc=124
    return rc,out,time.time()-t
def main():
    ap=argparse.ArgumentParser();ap.add_argument('--only',help='suite name, e.g. unit, core, parse, fixes');ap.add_argument('-v',action='store_true',help='print full output of every suite')
    a=ap.parse_args()
    suites=[('unit',None)]+[(os.path.basename(f)[5:-3],f) for f in sorted(glob.glob(os.path.join(TOOLS,'tests','test_*.py')))]
    if a.only: suites=[s for s in suites if s[0]==a.only]
    if not suites: print('no such suite');return 2
    mport=free_port();mock=None
    if any(s[1] for s in suites):
        mock=subprocess.Popen(['node',os.path.join(TOOLS,'mock','server.mjs')],cwd=ROOT,env={**os.environ,'MPORT':str(mport)},stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
        for _ in range(100):
            try: socket.create_connection(('127.0.0.1',mport),timeout=0.3).close();break
            except OSError: time.sleep(0.2)
    rows=[];fail=False
    try:
        for name,f in suites:
            print(f'--- {name} ...',flush=True)
            if f is None:
                rc,out,dt=run(['node','--test']+sorted(glob.glob(os.path.join(TOOLS,'unit','*.test.mjs'))))
                g=lambda k:int((re.search(r'^# '+k+r' (\d+)',out,re.M) or [0,0])[1])
                p,fl=g('pass'),g('fail')
            else:
                env={**os.environ,'APP_PORT':str(free_port()),'MOCK_PORT':str(mport)}
                rc,out,dt=run([sys.executable,f],env)
                m=re.search(r'^(\d+) of (\d+) passed',out,re.M)
                p,fl=(int(m[1]),int(m[2])-int(m[1])) if m else (0,1)
            if rc!=0 or fl: fl=max(fl,1)
            if rc!=0 or fl or a.v:
                print('\n'.join(l for l in out.splitlines() if a.v or l.startswith(('FAIL','FAILED','not ok','Traceback'))or 'Error' in l)[-3000:])
            rows.append((name,p,fl,dt,rc))
            if fl: fail=True
    finally:
        if mock: mock.terminate()
    print(f'\n{"suite":<10}{"passed":>8}{"failed":>8}{"seconds":>9}')
    for n,p,fl,dt,rc in rows: print(f'{n:<10}{p:>8}{fl:>8}{dt:>9.1f}')
    return 1 if fail else 0
sys.exit(main())

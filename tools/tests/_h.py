"""Shared helpers for the Playwright suites. Importing this starts the static server for ./app."""
import sys,json,os,http.server,threading,functools,urllib.request
from playwright.async_api import async_playwright
_HERE=os.path.dirname(os.path.abspath(__file__))
TOOLS=os.path.dirname(_HERE);ROOT=os.path.join(os.path.dirname(TOOLS),'app')
APP_PORT=int(os.environ.get('APP_PORT',8766));MOCK_PORT=int(os.environ.get('MOCK_PORT',8790))
BASE=f'http://localhost:{APP_PORT}/';MOCK=f'http://127.0.0.1:{MOCK_PORT}'
http.server.SimpleHTTPRequestHandler.log_message=lambda *a:None
_srv=http.server.ThreadingHTTPServer(('127.0.0.1',APP_PORT),functools.partial(http.server.SimpleHTTPRequestHandler,directory=ROOT))
threading.Thread(target=_srv.serve_forever,daemon=True).start()
seed=json.load(open(os.path.join(TOOLS,'source-export.json')))
R=[]
def ok(name,cond,detail=''):
    R.append((name,bool(cond),detail));print(('PASS ' if cond else 'FAIL ')+name+((' — '+str(detail)) if detail and not cond else ''),flush=True)
def mock(path,body):
    req=urllib.request.Request(MOCK+path,data=json.dumps(body).encode(),headers={'Content-Type':'application/json'})
    opener=urllib.request.build_opener(urllib.request.ProxyHandler({}))
    return json.loads(opener.open(req).read() or 'null')
async def fresh(b,**kw):
    c=await b.new_context(viewport={'width':390,'height':844},timezone_id='Asia/Kolkata',**kw)
    p=await c.new_page();p.errs=[]
    p.on('pageerror',lambda e:p.errs.append(str(e)))
    await p.goto(BASE);await p.wait_for_function("window.LD&&LD.ready&&typeof remSheet==='function'");await p.wait_for_timeout(500)
    return c,p
_pw=None
async def launch():
    global _pw
    _pw=await async_playwright().start()
    return await _pw.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox'])
async def close():
    global _pw
    if _pw: await _pw.stop();_pw=None
def finish():
    bad=[r for r in R if not r[1]]
    print(f'\n{len(R)-len(bad)} of {len(R)} passed')
    for r in bad: print('FAILED:',r[0],r[2])
    sys.exit(1 if bad else 0)

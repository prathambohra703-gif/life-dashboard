import sys,json,asyncio,http.server,threading,functools,os
from playwright.async_api import async_playwright
root,outp,views=sys.argv[1],sys.argv[2],sys.argv[3].split(',')
port=int(os.environ.get('PORT','8765'))
h=functools.partial(http.server.SimpleHTTPRequestHandler,directory=root)
http.server.SimpleHTTPRequestHandler.log_message=lambda *a:None
srv=http.server.ThreadingHTTPServer(('127.0.0.1',port),h);threading.Thread(target=srv.serve_forever,daemon=True).start()
seed=json.load(open('./tools/source-export.json'))
page_name=os.environ.get('PAGE','index.html')
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox'])
        for w,hh in ((390,844),(1366,800)):
            c=await b.new_context(viewport={'width':w,'height':hh},device_scale_factor=1,timezone_id='Asia/Kolkata')
            pg=await c.new_page()
            errs=[]
            pg.on('pageerror',lambda e:errs.append(str(e)))
            pg.on('console',lambda m:errs.append('console:'+m.text) if m.type=='error' else None)
            await pg.goto(f'http://127.0.0.1:{port}/{page_name}')
            if os.environ.get('SEED_OLD'):
                ls={'cfg':seed['cfg'],'days':seed['days'],'entries':seed['entries'],'todos':seed['todos'],'acad':seed['academics'],'dirty':{},'pics':[]}
                await pg.evaluate("v=>localStorage.setItem('lifeDash.v1',v)",json.dumps(ls)); await pg.reload()
            elif os.environ.get('SEED_NEW'):
                await pg.wait_for_function("window.LD&&LD.ready",timeout=10000)
                await pg.evaluate("s=>LD.importPayload(s)",seed); await pg.wait_for_timeout(600)
            await pg.wait_for_timeout(1200)
            for v in views:
                await pg.evaluate("v=>{state.view=v;render()}",v)
                await pg.wait_for_timeout(700)
                await pg.screenshot(path=f'{outp}/{v}-{w}.png',full_page=bool(os.environ.get('FULL')))
            print(w,'errors:',errs[:8])
            await c.close()
        await b.close()
asyncio.run(main())

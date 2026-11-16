"""Checks app/setup.html: no console errors, Copy buttons, key generation, schedule script. Usage: python3 tools/setup_check.py [shot_dir]"""
import sys,os,functools,http.server,threading
from playwright.sync_api import sync_playwright
shots=sys.argv[1] if len(sys.argv)>1 else None
h=functools.partial(http.server.SimpleHTTPRequestHandler,directory='app')
http.server.SimpleHTTPRequestHandler.log_message=lambda *a:None
srv=http.server.ThreadingHTTPServer(('127.0.0.1',8791),h);threading.Thread(target=srv.serve_forever,daemon=True).start()
STUB="window.__clip=[];navigator.clipboard.writeText=async t=>{window.__clip.push(t)};"
bad=[]
with sync_playwright() as p:
    b=p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox'])
    for w,hh in((390,844),(1366,900)):
        pg=b.new_page(viewport={'width':w,'height':hh});errs=[]
        pg.on('console',lambda m:errs.append(m.text) if m.type=='error' else None);pg.on('pageerror',lambda e:errs.append(str(e)))
        pg.add_init_script(STUB);pg.goto('http://127.0.0.1:8791/setup.html');pg.wait_for_timeout(500)
        for i in range(pg.locator('[data-copy]').count()):
            pg.locator('[data-copy]').nth(i).click();pg.wait_for_timeout(200)
            t=pg.evaluate('__clip[__clip.length-1]||""')
            if len(t)<200:bad.append('copy %d short'%i)
        # function copy is current
        cur=open('app/cloud/3-remind-function.ts').read()
        pg.locator('[data-copy="cloud/3-remind-function.ts"]').click();pg.wait_for_timeout(200)
        if pg.evaluate('__clip[__clip.length-1]')!=cur:bad.append('function copy not current')
        pg.click('#gen');vals=[pg.inner_text(i).strip() for i in('#kpub','#kpriv','#ksec')]
        if not all(len(v)>20 for v in vals):bad.append('keys '+str(vals))
        pg.fill('#purl','https://abc.supabase.co/');pg.fill('#pkey','sb_publishable_TEST');pg.click('#cron');pg.wait_for_timeout(200)
        s=pg.evaluate('__clip[__clip.length-1]')
        if 'https://abc.supabase.co/functions/v1/remind' not in s or 'sb_publishable_TEST' not in s or vals[2] not in s:bad.append('schedule')
        if pg.evaluate('document.documentElement.scrollWidth>innerWidth'):bad.append('h-scroll %d'%w)
        small=pg.evaluate("[...document.querySelectorAll('button,.chips a')].filter(e=>e.offsetHeight&&e.offsetHeight<44).length")
        if small:bad.append('small targets %d'%small)
        pg.click('[data-done="0"]');pg.reload();
        if not pg.is_checked('[data-done="0"]'):bad.append('progress not remembered')
        if errs:bad.append('console %s'%errs)
        if shots:
            pg.evaluate('scrollTo(0,0)');pg.goto('http://127.0.0.1:8791/setup.html#p4');pg.wait_for_timeout(300);pg.screenshot(path=os.path.join(shots,'setup-%d.png'%w))
    b.close()
print('FAIL '+str(bad) if bad else 'OK')
sys.exit(1 if bad else 0)

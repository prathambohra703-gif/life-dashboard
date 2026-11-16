"""Contrast check for hero text. Renders Today, Money and Study at 390 px, hides the text, screenshots what is
behind it, and compares the computed text colour with the lightest background pixel under each text box.
Needs >= 4.5 for body text and >= 3 for 24 px+ text. Also checks a secHero() injected at the top of each view,
at default imagery strength (.5) and the strongest setting (1).  Usage: python3 tools/contrast.py [app_dir]"""
import sys,json,asyncio,http.server,threading,functools,io,os
from playwright.async_api import async_playwright
from PIL import Image
import numpy as np
ROOT=sys.argv[1] if len(sys.argv)>1 else './app';PORT=8771
http.server.SimpleHTTPRequestHandler.log_message=lambda *a:None
srv=http.server.ThreadingHTTPServer(('127.0.0.1',PORT),functools.partial(http.server.SimpleHTTPRequestHandler,directory=ROOT));threading.Thread(target=srv.serve_forever,daemon=True).start()
seed=json.load(open('./tools/source-export.json'))
SEL=".sec-hero__eyebrow,.sec-hero__title,.sec-hero__num,.sec-hero__sub,.sec-hero__chips .pill,.sec-hero__chips .chip,.heroC .lbl,.heroC .hello,.heroC .pill,.heroC .chip,.card.hero .lbl,.card.hero h2,.card.hero .big"
COLLECT="""(sel)=>{const out=[];document.querySelectorAll(sel).forEach((el,i)=>{const r=el.getBoundingClientRect();if(r.width<4||r.height<4)return;const cs=getComputedStyle(el);
 if(cs.visibility==='hidden'||cs.display==='none'||!(el.textContent||'').trim())return;
 let cov=false;for(const [fx,fy] of [[.1,.1],[.9,.1],[.1,.9],[.9,.9],[.5,.5]]){const t=document.elementFromPoint(r.x+r.width*fx,r.y+r.height*fy);if(!t||!(el===t||el.contains(t)||t.contains(el)))cov=true}if(cov)return;el.setAttribute('data-cx',i);const fs=parseFloat(cs.fontSize),fw=parseInt(cs.fontWeight)||400;
 out.push({i,t:(el.textContent||'').trim().slice(0,24),color:cs.color,fs,big:fs>=24||(fs>=18.66&&fw>=700),x:r.x,y:r.y,w:r.width,h:r.height})});return out}"""
HIDE="*{text-shadow:none!important}[data-cx]{color:transparent!important;-webkit-text-fill-color:transparent!important}[data-cx] *{color:transparent!important;-webkit-text-fill-color:transparent!important}"
def lum(c):
    c=np.asarray(c,dtype=float)/255;c=np.where(c<=.03928,c/12.92,((c+.055)/1.055)**2.4);return .2126*c[...,0]+.7152*c[...,1]+.0722*c[...,2]
def parse(s):
    v=[float(x) for x in s[s.index('(')+1:-1].replace('/',',').split(',')[:3]];return v
def ratio(a,b):
    hi,lo=max(a,b),min(a,b);return (hi+.05)/(lo+.05)
async def measure(p,label,fails):
    items=await p.evaluate(COLLECT,SEL)
    await p.add_style_tag(content=HIDE);await p.evaluate("()=>{window.__hs=document.head.lastElementChild}");await p.wait_for_timeout(150)
    png=await p.screenshot();im=Image.open(io.BytesIO(png)).convert('RGB');W,H=im.size
    await p.evaluate("()=>{window.__hs.remove();document.querySelectorAll('[data-cx]').forEach(e=>e.removeAttribute('data-cx'))}")
    n=0
    for it in items:
        x0,y0=max(0,int(it['x'])),max(0,int(it['y']));x1,y1=min(W,int(it['x']+it['w'])),min(H,int(it['y']+it['h']))
        if x1-x0<2 or y1-y0<2 or it['y']+it['h']>H+1:continue  # off-screen text is not sampled
        px=np.asarray(im.crop((x0,y0,x1,y1)))
        tl=lum(parse(it['color']));bl=lum(px.reshape(-1,3));
        # worst case: the pixel that is closest in luminance to the text (95th percentile for light text, 5th for dark)
        worst=np.percentile(bl,95) if tl>.4 else np.percentile(bl,5)
        r=ratio(tl,worst);need=3 if it['big'] else 4.5;ok=r>=need;n+=1
        if not ok:fails.append((label,it['t'],round(r,2),need))
        print(f"  {'ok  ' if ok else 'FAIL'} {r:5.2f} (need {need}) {it['fs']:.0f}px {it['t']!r}")
    return n
async def main():
    fails=[];total=0
    async with async_playwright() as pw:
        b=await pw.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox'])
        for strength in (.5,1):
            for v in ('today','money','study'):
                c=await b.new_context(viewport={'width':390,'height':844},timezone_id='Asia/Kolkata');p=await c.new_page()
                await p.goto(f'http://127.0.0.1:{PORT}/');await p.wait_for_function("window.LD&&LD.ready&&typeof remSheet==='function'")
                await p.evaluate("s=>LD.importPayload(s)",seed);await p.wait_for_timeout(500)
                if not await p.evaluate("typeof secHero==='function'"):
                    await p.add_style_tag(url=f'http://127.0.0.1:{PORT}/ui/design.css');await p.add_script_tag(url=f'http://127.0.0.1:{PORT}/ui/common.js')
                await p.evaluate("v=>{state.view=v;render();window.scrollTo(0,0)}",v);await p.wait_for_timeout(500)
                await p.evaluate("o=>document.documentElement.style.setProperty('--wallop',o)",strength);await p.wait_for_timeout(400)
                print(f'{v} 390 wallop={strength} (existing hero)');total+=await measure(p,f'{v}@{strength}',fails)
                await p.evaluate("()=>{const a=document.querySelector('#app');a.insertAdjacentHTML('afterbegin',secHero({scene:'coast',eyebrow:'Section · today',title:'Section title',number:'1,240',unit:'units',sub:'One supporting sentence about the number above.',chips:[{text:'12 days left',tone:'acc'},'3 bills due','<button class=\"chip\">Review ›</button>']}));window.scrollTo(0,0)}");await p.wait_for_timeout(300)
                print(f'{v} 390 wallop={strength} (secHero)');total+=await measure(p,f'{v}@{strength} secHero',fails)
                await c.close()
        await b.close()
    print(f'\nchecked {total} text boxes; failures: {len(fails)}')
    for f in fails:print('  FAIL',f)
    sys.exit(1 if fails or not total else 0)
asyncio.run(main())

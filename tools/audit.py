import json,asyncio,sys
exec(open('./tools/test.py').read().split("R=[]")[0].replace("PORT=8766","PORT=8768"))
JS="""()=>{const out=[];document.querySelectorAll('button,a[href],select,input:not([type=hidden]),summary,label.btn,label.chip').forEach(el=>{const r=el.getBoundingClientRect();if(!r.width||!r.height)return;const cs=getComputedStyle(el);if(cs.visibility==='hidden'||cs.display==='none')return;if(el.type==='range'||el.type==='checkbox'||el.type==='radio')return;if(r.height<43.5||r.width<43.5)out.push((el.dataset.act||el.dataset.x||el.dataset.change||el.tagName)+'|'+(el.className||'').toString().slice(0,30)+'|'+Math.round(r.width)+'x'+Math.round(r.height)+'|'+(el.textContent||'').trim().slice(0,18))});return out}"""
async def main():
  async with async_playwright() as pw:
    b=await pw.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox'])
    c=await b.new_context(viewport={'width':390,'height':844},timezone_id='Asia/Kolkata',has_touch=True,is_mobile=True);p=await c.new_page()
    await p.goto(BASE);await p.wait_for_function("window.LD&&LD.ready&&typeof remSheet==='function'");await p.evaluate("s=>LD.importPayload(s)",seed);await p.wait_for_timeout(600)
    tot=0
    for v in ['today','train','fuel','money','poker','study','life','progress']:
        await p.evaluate("v=>{state.det.alltoday=true;state.view=v==='poker'?'money':v;state.mm=v==='poker'?'poker':'spend';render()}",v);await p.wait_for_timeout(400)
        small=await p.evaluate(JS);tot+=len(small)
        kinds={}
        for s in small: k='|'.join(s.split('|')[:3]);kinds[k]=kinds.get(k,0)+1
        print(v,len(small),sorted(kinds.items(),key=lambda x:-x[1])[:14])
    for sh in ['settingsSheet()','remSheet()','appearanceSheet()','semSheet()','dataSheet()','qaSheet()','cloudSheet()']:
        await p.evaluate(sh);await p.wait_for_timeout(250);small=await p.evaluate(JS.replace("document.querySelectorAll('","document.querySelector('#layer').querySelectorAll('"));tot+=len(small);print(sh,len(small),small[:8]);await p.evaluate("closeSheet()")
    w=await p.evaluate("document.documentElement.scrollWidth");print('TOTAL small',tot,'scrollWidth',w)
    await b.close()
asyncio.run(main())

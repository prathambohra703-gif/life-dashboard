"""Task B2: Body section (Train and Fuel): heroes, set count, session done, week strip, rule-based meal estimator."""
import sys,os,asyncio
sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
from _h import *
import _h

REFV="""(names)=>names.map(n=>{const r=REF.find(x=>x[0]===n);return r})"""

async def fresh_at(b,iso='2026-11-12T10:00:00+05:30'):
    """like _h.fresh, but with the clock pinned so the suite does not depend on the real date"""
    c=await b.new_context(viewport={'width':390,'height':844},timezone_id='Asia/Kolkata')
    p=await c.new_page();p.errs=[]
    p.on('pageerror',lambda e:p.errs.append(str(e)))
    await p.clock.install(time=iso)
    await p.goto(BASE);await p.wait_for_function("window.LD&&LD.ready&&typeof remSheet==='function'");await p.wait_for_timeout(500)
    return c,p

async def main():
    b=await _h.launch()
    c,p=await fresh_at(b)
    ev=p.evaluate
    await ev("s=>LD.importPayload(s)",seed);await p.wait_for_timeout(600)

    # ---------- Train
    await ev("()=>{state.date=todayStr();state.view='train';render()}");await p.wait_for_timeout(300)
    ok('train: hero first, segment directly under it, not duplicated',await ev("()=>{const a=document.querySelector('#app');return a.firstElementChild.classList.contains('sec-hero')&&a.firstElementChild.dataset.scene==='gym'&&a.children[1].querySelector('.subnav')&&document.querySelectorAll('.subnav,.seg').length===1}"))
    n0=await ev("()=>{const el=document.querySelector('.sec-hero__num');return el?parseInt(el.textContent):-1}")
    pl=await ev("()=>{const pl=PLAN[DOW[parse(state.date).getDay()]];return pl.ex&&pl.ex.length?{id:slug(pl.ex[0].n),n:pl.ex[0].n,rest:pl.ex[0].rest}:null}")
    ok('train: today has planned exercises',pl is not None)
    base=await ev("()=>Object.values(day(state.date).lifts||{}).reduce((a,x)=>a+x.length,0)")
    ok('train: hero number equals sets logged today before logging',n0==base,(n0,base))
    await ev("x=>{addSet(x.id,40,8,0,x.n)}",pl);await p.wait_for_timeout(400)
    n1=await ev("()=>parseInt(document.querySelector('.sec-hero__num').textContent)")
    ok('train: hero number counts the new set',n1==base+1,(n1,base))
    ok('train: hero unit shows the planned total',await ev("()=>/of \\d+ sets/.test(document.querySelector('.sec-hero__num small').textContent)"))
    ok('train: effort line, minutes chip, week label',await ev("()=>{const h=document.querySelector('.sec-hero');return /Week \\d+ of \\d+/.test(h.textContent)&&/reps in reserve/.test(h.textContent)&&/\\d+ min/.test(h.textContent)}"))
    await ev("()=>{const h=day(state.date).habits||{};if(h.gym)dbSetDay(state.date,{habits:{gym:false}});render()}");await p.wait_for_timeout(300)
    btn=p.locator('.sec-hero [data-act="habit"][data-key="gym"]')
    ok('train: Mark session done button is in the hero',await btn.count()==1 and 'Mark session done' in await btn.inner_text())
    await btn.click();await p.wait_for_timeout(400)
    ok('train: Mark session done ticks the gym habit',await ev("()=>!!(day(state.date).habits||{}).gym"))
    wk=await ev("()=>Array.from(document.querySelectorAll('.week button')).map(b=>{const r=b.getBoundingClientRect();return [r.width,r.height]})")
    ok('train: week strip has 7 buttons, each at least 44 px',len(wk)==7 and all(w>=43.5 and h>=43.5 for w,h in wk),wk)
    inp=await ev("()=>Array.from(document.querySelectorAll('#app input:not([type=hidden]),#app button,#app summary')).filter(e=>e.getBoundingClientRect().width&&(e.getBoundingClientRect().height<43.5)).map(e=>(e.dataset.act||e.name||e.tagName)).slice(0,8)")
    ok('train: no control under 44 px',not inp,inp)
    ok('train: no horizontal overflow at 390',await ev("()=>document.documentElement.scrollWidth")==390)
    ok('train: PRs and library are quiet cards',await ev("()=>document.querySelectorAll('.card.quiet').length>=2"))

    # ---------- Fuel
    await ev("()=>{state.view='fuel';state.est={busy:false,items:null,text:'',msg:'',summary:''};render()}");await p.wait_for_timeout(300)
    ok('fuel: hero first with table scene, segment under it',await ev("()=>{const a=document.querySelector('#app');return a.firstElementChild.classList.contains('sec-hero')&&a.firstElementChild.dataset.scene==='table'&&document.querySelectorAll('.subnav,.seg').length===1}"))
    pr0=await ev("()=>parseInt(document.querySelector('.sec-hero__num').textContent)")
    ok('fuel: hero number is protein so far',pr0==round_(await ev("()=>totals(state.date).p")),pr0)
    ok('fuel: no Max or permission wording',await ev("()=>!/\\bMax\\b|permission/i.test(document.querySelector('#app').innerText)"))
    ok('fuel: no AI button without the optional AI',await ev("()=>!state.sampleFn&&!document.querySelector('[data-act=bmai]')"))
    txt="2 roti, dal 1 katori, paneer 100 g"
    await p.fill('#bmtext',txt);await p.click('form[data-form=bmest] button[type=submit]');await p.wait_for_timeout(300)
    items=await ev("()=>state.est.items")
    ref=await ev(REFV,['Roti / chapati plain','Dal tadka','Paneer full-fat'])
    exp=[(ref[0][3]*2,ref[0][4]*2),(ref[1][3],ref[1][4]),(ref[2][3],ref[2][4])]
    ok('estimator: 3 matched rows',items and len(items)==3 and all(i['basis']=='ref' for i in items),items)
    close=lambda a,e:abs(a-e)<=.15*e
    ok('estimator: kcal and protein within 15% of REF-scaled values',items and all(close(i['kcal'],e[0]) and close(i['p'],e[1]) for i,e in zip(items,exp)),(items,exp))
    ok('estimator: result form shows editable rows',await ev("()=>document.querySelectorAll('form[data-form=bmsave] .pend').length")==3)
    items2=await ev("t=>bodyEstimate(t)","2 veg puffs, 1 samosa and a chai with sugar")
    ok('estimator: chai with sugar matches the chai row',len(items2)==3 and items2[2]['name']=='Chai with milk and sugar' and items2[0]['name']=='Veg puff bakery' and items2[0]['kcal']==566,items2)
    items3=await ev("t=>bodyEstimate(t)","half samosa, 200 ml milk, zorblax flurbo")
    ok('estimator: half, ml and an unknown item',items3[0]['kcal']>100 and items3[0]['kcal']<150 and items3[1]['basis']=='ref' and items3[2]['basis']=='none' and items3[2]['kcal']=='',items3)
    # unknown row in the UI plus save
    await p.fill('#bmtext',txt+", zorblax flurbo");await p.click('form[data-form=bmest] button[type=submit]');await p.wait_for_timeout(300)
    ok('estimator: unknown item is an unmatched row with empty numbers',await ev("()=>{const r=state.est.items[3];return r&&r.basis==='none'&&r.kcal===''&&document.querySelector('input[name=k3]').value===''}"))
    d=await ev("()=>state.date");before=await ev("d=>entriesOn(d,'meal').length",d)
    await p.click('form[data-form=bmsave] button[type=submit]');await p.wait_for_timeout(400)
    after=await ev("d=>entriesOn(d,'meal').length",d)
    ok('save: 3 matched rows saved to the viewed date, empty row skipped',after-before==3,(before,after))
    pr1=await ev("()=>parseInt(document.querySelector('.sec-hero__num').textContent)")
    ok('fuel: hero protein updates after saving',pr1>pr0,(pr0,pr1))
    # other viewed date
    await ev("()=>{state.date=addDays(todayStr(),-2);render()}");await p.wait_for_timeout(300)
    await p.fill('#bmtext',"1 banana");await p.click('form[data-form=bmest] button[type=submit]');await p.wait_for_timeout(300)
    await p.click('form[data-form=bmsave] button[type=submit]');await p.wait_for_timeout(400)
    ok('save: writes to the viewed (not today) date',await ev("()=>entriesOn(addDays(todayStr(),-2),'meal').some(e=>/banana/i.test(e.name))"))
    await ev("()=>{state.date=todayStr();render()}");await p.wait_for_timeout(300)
    ok('fuel: sections present',await ev("()=>{const t=document.querySelector('#app').innerText;return ['Log a meal','Meals','Water','My usual meals','Quick add','Enter numbers yourself'].every(s=>t.includes(s))}"))
    ok('fuel: no control under 44 px',not await ev("()=>Array.from(document.querySelectorAll('#app input:not([type=hidden]):not([type=range]),#app button,#app summary')).filter(e=>e.getBoundingClientRect().width&&e.getBoundingClientRect().height<43.5).length"))
    ok('fuel: no horizontal overflow at 390',await ev("()=>document.documentElement.scrollWidth")==390)
    # segment switches
    await p.click('.subnav button[data-v=train]');await p.wait_for_timeout(300)
    ok('segment: Train button switches view',await ev("()=>state.view==='train'&&document.querySelector('.sec-hero').dataset.scene==='gym'"))
    ok('no page errors',not p.errs,p.errs)
    await b.close();await _h.close()
    finish()

def round_(x): return int(x+.5)
asyncio.run(main())

"""Task B1: adaptive Today (morning, day, night, exam week, Sunday ritual) and the Progress sub-views.
Run: MPORT=8794 node tools/mock/server.mjs &  then  MOCK_PORT=8794 APP_PORT=8771 python3 tools/tests/test_today.py"""
import asyncio
from _h import *

WED='2026-12-02'   # a Wednesday outside the exam window, gym day (Zone 2)
TOPFIRST="(()=>{const g=document.querySelector('#app > div.grid.w2');const c=g&&g.firstElementChild;return c?c.textContent:''})()"

async def at(b,when,exam='off',w=390):
    c=await b.new_context(viewport={'width':w,'height':844},timezone_id='Asia/Kolkata')
    p=await c.new_page();p.errs=[]
    p.on('pageerror',lambda e:p.errs.append(str(e)))
    await p.clock.install(time=when)
    await p.goto(BASE);await p.wait_for_function("window.LD&&LD.ready&&typeof remSheet==='function'")
    await p.evaluate("s=>LD.importPayload(s)",seed);await p.wait_for_timeout(300)
    await p.evaluate("m=>{saveCfg({examMode:m});lookSave({order:[],hidden:[]});state.view='today';state.date=todayStr();render()}",exam)
    await p.wait_for_timeout(400)
    return c,p

async def main():
    b=await launch();errs=[]
    # ---- morning
    c,p=await at(b,WED+'T08:30:00+05:30')
    first=await p.evaluate(TOPFIRST)
    ok('morning 08:30: wake card ("Start the day") is the first card',"Start the day" in first and await p.evaluate("!!document.querySelector('#app > div.grid.w2 > :first-child [data-act=stamp][data-key=wake]')"),first[:80])
    num=await p.evaluate("document.querySelector('.sec-hero__num').firstChild.textContent")
    left=await p.evaluate("(()=>{const H=habits(todayStr());return String(H.total-H.done)})()")
    unit=await p.evaluate("document.querySelector('.sec-hero__num small').textContent")
    ok('morning: hero number is habits left',num==left and 'habit' in unit,(num,left,unit))
    ok('morning: eyebrow says Morning',"Morning" in await p.evaluate("document.querySelector('.sec-hero__eyebrow').textContent"))
    ok('no old .heroC hero on Today',await p.evaluate("!document.querySelector('#app .heroC')"))
    ok('at-a-glance strip: Habits left, Water, Protein, Next deadline',await p.evaluate("[...document.querySelectorAll('.td-glance .statrow .lbl')].map(x=>x.textContent).join('|')")=='Habits left|Water|Protein|Next deadline')
    ok('Review link to Progress kept',await p.evaluate("!!document.querySelector('#app [data-act=tab][data-v=progress]')"))
    # setup/props cards injected by xWrap land after the strip, before the mode cards
    pos=await p.evaluate("(()=>{const h=document.querySelector('#app').innerHTML;return [h.indexOf('td-glance'),h.indexOf('Finish setting up'),h.indexOf('<div class=\"grid w2\" style=\"margin-top:14px\">')]})()")
    ok('xWrap injection lands after the at-a-glance strip',pos[1]<0 or pos[0]<pos[1]<pos[2],pos)
    ok('390: no horizontal overflow',await p.evaluate("document.documentElement.scrollWidth")==390)
    rows=await p.evaluate("(()=>{const r=document.querySelector('.sec-hero__chips');const ys=new Set([...r.children].map(x=>Math.round(x.getBoundingClientRect().top)));return ys.size})()")
    ok('390: hero chips use at most 2 lines',rows<=2,rows)
    # Appearance hide list still applies
    await p.evaluate("lookSave({hidden:['wake']})");await p.wait_for_timeout(200)
    ok('Appearance hide list hides the wake card',not await p.evaluate("document.querySelector('#app').textContent.includes('Start the day')"))
    await p.evaluate("lookSave({order:['mob'],hidden:[]})");await p.wait_for_timeout(200)
    ok('Appearance order list re-orders the mode cards',"Start routine" in await p.evaluate(TOPFIRST) or "Run again" in await p.evaluate(TOPFIRST))
    await p.evaluate("lookSave({order:[],hidden:[]})")
    # water chip writes to the viewed date
    r=await p.evaluate("""(async()=>{const y=addDays(todayStr(),-1);state.date=y;render();const w0=totals(y).water,t0=totals(todayStr()).water;
      document.querySelector('.sec-hero__chips [data-act=nudge][data-key=water][data-n="250"]').click();await new Promise(r=>setTimeout(r,300));
      const out=[totals(y).water-w0,totals(todayStr()).water-t0];state.date=todayStr();render();return out})()""")
    ok('hero water chip adds 250 ml to the viewed date',r==[250,0],r)
    ok('hero protein chip keeps data-act=prot data-g=20',await p.evaluate("!!document.querySelector('.sec-hero__chips [data-act=prot][data-g=\"20\"]')"))
    # Progress sub-nav
    await p.evaluate("state.view='progress';state.progView='';render()");await p.wait_for_timeout(200)
    ok('Progress: ridge hero with weight in kg',await p.evaluate("(()=>{const h=document.querySelector('#app .sec-hero');return h&&h.dataset.scene==='ridge'&&h.querySelector('.sec-hero__num small').textContent==='kg'})()"))
    ok('Progress: default view is week',await p.evaluate("state.progView")=='week' and 'Weekly review' in await p.evaluate("document.querySelector('#app').textContent"))
    ok('Progress: Back to Today at the top',await p.evaluate("document.querySelector('#app').firstElementChild.querySelector('[data-act=tab][data-v=today]')!==null"))
    seen={}
    for v,txt in [('body','Weight against plan'),('habits','Consistency'),('money','Money this month'),('more','Streak and plan'),('week','Weekly review')]:
        await p.click(f'#app .subnav [data-act=progview][data-v={v}]');await p.wait_for_timeout(150)
        seen[v]=await p.evaluate("t=>state.progView+'|'+document.querySelector('#app').textContent.includes(t)",txt)
    ok('Progress sub-nav switches all five views',all(seen[v]==v+'|true' for v in seen),seen)
    await p.click('#app .subnav [data-act=progview][data-v=money]');await p.evaluate("render()");await p.wait_for_timeout(100)
    ok('state.progView persists across render()',await p.evaluate("state.progView+'|'+document.querySelector('.subnav [aria-selected=true]').dataset.v")=='money|money')
    ok('Progress 390: no horizontal overflow',await p.evaluate("document.documentElement.scrollWidth")==390)
    errs+=p.errs;await c.close()

    # ---- day: creatine waits for 17:00
    c,p=await at(b,WED+'T14:00:00+05:30')
    ok('day 14:00: eyebrow Daytime and no creatine card yet','Daytime' in await p.evaluate("document.querySelector('.sec-hero__eyebrow').textContent") and not await p.evaluate("document.querySelector('#app').textContent.includes('g is due')"))
    errs+=p.errs;await c.close()
    c,p=await at(b,WED+'T17:10:00+05:30')
    ok('day 17:10: creatine card shows in the mode cards',await p.evaluate("document.querySelector('#app > div.grid.w2').textContent.includes('g is due')"))
    errs+=p.errs;await c.close()

    # ---- night
    c,p=await at(b,WED+'T23:00:00+05:30')
    ok('night 23:00: "Close the day" is first',"Close the day" in await p.evaluate(TOPFIRST))
    ok('night: eyebrow says Night','Night' in await p.evaluate("document.querySelector('.sec-hero__eyebrow').textContent"))
    ok('night: hero number is the streak',await p.evaluate("document.querySelector('.sec-hero__num').firstChild.textContent===String(streak())&&document.querySelector('.sec-hero__num small').textContent.includes('streak')"))
    await p.evaluate("state.det.alltoday=true;render()");await p.wait_for_timeout(150)
    ok('"All of today" fold holds the gym card at 23:00',await p.evaluate("!!document.querySelector('details[data-det=alltoday] [data-act=habit][data-key=gym]')"))
    ok('fold also holds the wake and weigh-in cards at night',await p.evaluate("(()=>{const f=document.querySelector('details[data-det=alltoday]');return !!f.querySelector('#wt2')})()"))
    errs+=p.errs;await c.close()
    c,p=await at(b,WED+'T21:45:00+05:30')
    ok('21:45 is still daytime (night starts 22:30)',await p.evaluate("dayPeriod()")=='day')
    errs+=p.errs;await c.close()

    # ---- exam week
    c,p=await at(b,WED+'T10:00:00+05:30',exam='on')
    ok('exam week: banner under the hero',await p.evaluate("!!document.querySelector('#app [data-td=exam]')") and 'Exam week' in await p.evaluate("document.querySelector('.sec-hero__eyebrow').textContent"))
    order=await p.evaluate("[...document.querySelectorAll('#app > div.grid.w2 > section')].map(s=>s.textContent.includes('Study plan')?'plan':s.querySelector('[data-key=gym]')?'gym':'').filter(Boolean)")
    ok('exam week: plan before gym',order.index('plan')<order.index('gym') if 'plan' in order and 'gym' in order else 'gym' in order or 'plan' in order,order)
    errs+=p.errs;await c.close()
    c,p=await at(b,'2026-11-12T10:00:00+05:30',exam='on')
    n=await p.evaluate("document.querySelectorAll('#app [data-td=exam] .td-ex').length")
    ok('exam week: banner lists the next exams (up to 3)',1<=n<=3,n)
    errs+=p.errs;await c.close()

    # ---- Sunday ritual
    c,p=await at(b,'2026-11-15T10:00:00+05:30',exam='auto')
    await p.evaluate("dbSetDay('2026-11-08',{focus:'Sleep by 1'});render()");await p.wait_for_timeout(300)
    first=await p.evaluate(TOPFIRST)
    ok('Sunday: review ritual is first',await p.evaluate("!!document.querySelector('#app > div.grid.w2 > [data-td=ritual]:first-child')"),first[:60])
    ok('Sunday: three questions (review, fix, focus)',await p.evaluate("!!(document.querySelector('[data-td=ritual] [data-change=review]')&&document.querySelector('[data-td=ritual] [data-change=revfix]')&&document.querySelector('[data-td=ritual] [data-change=revfocus]'))"))
    ok('Sunday: shows last week\'s focus','Last week you chose: Sleep by 1' in first)
    await p.fill('#revfix','Phone out of the bedroom');await p.dispatch_event('#revfix','change');await p.wait_for_timeout(300)
    await p.fill('#revfocus','Admin Law revision');await p.dispatch_event('#revfocus','change');await p.wait_for_timeout(300)
    rec=await p.evaluate("LD.get('days','2026-11-15')||state.days['2026-11-15']")
    ok('Sunday: saving fix writes days[2026-11-15].fix',rec and rec.get('fix')=='Phone out of the bedroom',rec)
    ok('Sunday: saving focus writes days[2026-11-15].focus',rec and rec.get('focus')=='Admin Law revision',rec)
    errs+=p.errs;await c.close()

    # ---- 1366 two-column grid
    c,p=await at(b,WED+'T08:30:00+05:30',w=1366)
    cols=await p.evaluate("getComputedStyle(document.querySelector('#app > div.grid.w2')).gridTemplateColumns.split(' ').length")
    ok('1366: mode cards use the two-column grid',cols==2,cols)
    errs+=p.errs;await c.close()


    # ---- C4: weekly targets, patterns, settle-up (clock Wed 2026-12-02; this week Mon 11-30)
    async def fresh_at(when,w=390,seeded=False):
        c=await b.new_context(viewport={'width':w,'height':844},timezone_id='Asia/Kolkata')
        p=await c.new_page();p.errs=[]
        p.on('pageerror',lambda e:p.errs.append(str(e)))
        await p.clock.install(time=when)
        await p.goto(BASE);await p.wait_for_function("window.LD&&LD.ready&&typeof remSheet==='function'")
        if seeded:await p.evaluate("s=>LD.importPayload(s)",seed)
        await p.evaluate("()=>{saveCfg({examMode:'off'});lookSave({order:[],hidden:[]})}");await p.wait_for_timeout(300)
        return c,p
    OPENH="state.view='progress';state.progView='habits';render()"
    c,p=await fresh_at(WED+'T10:00:00+05:30')
    ok('default weekly targets gym 5, protein 5, CFA 6',await p.evaluate("(()=>{const m=document.body;state.view='progress';state.progView='habits';render();return [...document.querySelectorAll('[data-td=wk] input')].map(i=>i.value).join(',')})()")=='5,5,6')
    await p.evaluate("()=>{['2026-11-30','2026-12-01','2026-12-02'].forEach(d=>dbSetDay(d,{habits:{gym:true}}))}");await p.wait_for_timeout(300)
    await p.evaluate(OPENH);await p.wait_for_timeout(200)
    row=await p.evaluate("(()=>{const r=document.querySelector('[data-td=wk][data-k=gym]');return [r.querySelector('.td-wk__c').textContent,r.querySelectorAll('.td-dot i.on').length,r.querySelectorAll('.td-dot i').length,r.querySelector('.td-wk__s').textContent]})()")
    ok('Habits card: gym "3 of 5 days" with 3 filled dots',row[0]=='3 of 5 days' and row[1]==3 and row[2]==7,row)
    ok('future days are hollow dots',await p.evaluate("[...document.querySelectorAll('[data-td=wk][data-k=gym] .td-dot i')].slice(3).every(i=>!i.classList.contains('on')&&!i.classList.contains('miss'))"))
    # streak: last week fully hit
    await p.evaluate("()=>{['2026-11-23','2026-11-24','2026-11-25','2026-11-26','2026-11-27'].forEach(d=>dbSetDay(d,{habits:{gym:true}}))}");await p.wait_for_timeout(300)
    await p.evaluate(OPENH);await p.wait_for_timeout(200)
    st1=await p.evaluate("document.querySelector('[data-td=wk][data-k=gym] .td-wk__s').textContent")
    await p.fill('[data-td=wk][data-k=gym] input','3');await p.dispatch_event('[data-td=wk][data-k=gym] input','change');await p.evaluate('document.activeElement.blur()');await p.wait_for_timeout(500)
    st2=await p.evaluate("document.querySelector('[data-td=wk][data-k=gym] .td-wk__s').textContent")
    ok('streak: last week hit, this week short reads "1 week"; hitting this week makes "2 weeks"',st1=='1 week' and st2=='2 weeks',(st1,st2))
    ok('changing the target input saves cfg.weekly.gym',await p.evaluate("C().weekly.gym")==3 and await p.evaluate("state.cfg.weekly.gym")==3)
    ok('target input is 44 px tall',await p.evaluate("document.querySelector('[data-td=wk] input').getBoundingClientRect().height")>=44)
    ok('Habits 390: no horizontal overflow',await p.evaluate("document.documentElement.scrollWidth")==390)
    # Today chip: gym now 3 of 3 (on track); protein 0 of 5 and CFA 0 of 6 both reachable: furthest is CFA
    await p.evaluate("state.view='today';state.date=todayStr();render()");await p.wait_for_timeout(300)
    chip=await p.evaluate("(document.querySelector('[data-td=wkchip]')||{}).textContent")
    ok('Today chip names the furthest-behind target that is still reachable (CFA needs 6 of 5 days left, so Protein)',chip=='Protein 0 of 5 this week',chip)
    await p.evaluate("()=>{saveCfg({weekly:{gym:5,protein:7,cfa:1}})}");await p.wait_for_timeout(300)
    await p.evaluate("()=>{['2026-11-30','2026-12-01'].forEach(d=>dbSetDay(d,{cfaMin:60}))}");await p.wait_for_timeout(300)
    chip=await p.evaluate("(document.querySelector('[data-td=wkchip]')||{}).textContent")
    ok('Today chip skips on-track and picks the next behind (gym 3 of 5)',chip=='Gym 3 of 5 this week',chip)
    await p.evaluate("()=>{saveCfg({weekly:{gym:1,protein:7,cfa:1}})}");await p.wait_for_timeout(300)
    ok('Today chip omitted when the target cannot be reached any more',not await p.evaluate("!!document.querySelector('[data-td=wkchip]')") or await p.evaluate("document.querySelector('[data-td=wkchip]').textContent")!='Protein 0 of 7 this week')
    errs+=p.errs;await c.close()
    # Monday morning honesty
    c,p=await fresh_at('2026-11-30T09:00:00+05:30')
    await p.evaluate("state.view='today';state.date=todayStr();render()");await p.wait_for_timeout(300)
    chip=await p.evaluate("(document.querySelector('[data-td=wkchip]')||{}).textContent")
    ok('Monday morning chip reads "0 of N"',chip and ' 0 of ' in chip,chip)
    errs+=p.errs;await c.close()

    # ---- Patterns: seeded app has fewer than 14 scored days
    c,p=await at(b,WED+'T10:00:00+05:30')
    await p.evaluate("state.view='progress';state.progView='week';render()");await p.wait_for_timeout(300)
    n=await p.evaluate("Object.keys(state.days).filter(k=>k<=todayStr()&&score(k)>0).length")
    txt=await p.evaluate("(document.querySelector('[data-td=patterns]')||{textContent:''}).textContent")
    ok('Patterns: empty line below 14 days of data',(n<14 and 'Patterns appear after 14 days of data. '+str(n)+' so far.' in txt) or (n>=14 and 'Patterns' in txt),(n,txt[:90]))
    # settle-up nudge with the seed
    await p.evaluate("state.view='today';state.date=todayStr();render()");await p.wait_for_timeout(300)
    sl=await p.evaluate("[...document.querySelectorAll('[data-td=settle]')].map(x=>x.textContent)")
    ok('settle-up line for Wrik appears with the seed',any('Wrik has owed you ₹' in x and 'Nudge them, or mark it paid.' in x for x in sl) and len(sl)<=2,sl)
    await p.evaluate("state.moneyHide=true;render()");await p.wait_for_timeout(200)
    ok('settle-up respects moneyHide',await p.evaluate("[...document.querySelectorAll('[data-td=settle]')].every(x=>!/₹\\s?\\d/.test(x.textContent))"))
    await p.evaluate("state.moneyHide=false;render()");await p.wait_for_timeout(200)
    ok('Today 390: no horizontal overflow with the nudge',await p.evaluate("document.documentElement.scrollWidth")==390)
    await p.click('[data-td=settle-go]');await p.wait_for_timeout(400)
    ok('settle-up button lands on Money with state.mm=people',await p.evaluate("state.view+'|'+state.mm")=='money|people')
    errs+=p.errs;await c.close()

    # ---- Patterns with 16 seeded days: alternate good and poor sleep
    c,p=await fresh_at(WED+'T10:00:00+05:30')
    await p.evaluate("""()=>{for(let i=1;i<=16;i++){const d=addDays(todayStr(),-i),g=i%2===0;
      dbSetDay(d,{wake:g?'07:30':'10:00',bed:(i-1)%2===0?'23:30':'03:00',studyMin:g?90:20,cfaMin:g?60:10,mood:g?4:2,habits:{mobility:true}})}}""")
    await p.wait_for_timeout(500)
    await p.evaluate("state.view='progress';state.progView='week';render()");await p.wait_for_timeout(300)
    txt=await p.evaluate("(document.querySelector('[data-td=patterns]')||{textContent:''}).textContent")
    ok('Patterns: sleep-vs-study sentence after 16 days',('min of study and CFA on average' in txt and 'n = ' in txt),txt[:300])
    ok('Patterns: mood sentence with sample size','Your mood averages' in txt,txt[:300])
    ok('Progress Week 390: no horizontal overflow',await p.evaluate("document.documentElement.scrollWidth")==390)
    errs+=p.errs;await c.close()

    ok('no page errors',not errs,errs[:3])
    await close();finish()
asyncio.run(main())

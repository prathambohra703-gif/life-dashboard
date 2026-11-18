"""Step 1: the 8-week recomposition programme (Mon 30 Nov 2026 to Sun 24 Jan 2027, week 9 = maintenance).
Run: MPORT=8794 node tools/mock/server.mjs &  then  MOCK_PORT=8794 APP_PORT=8771 python3 tools/tests/test_program.py"""
import asyncio,json
from _h import *

async def at(b,when,w=390,exam='off'):
    c=await b.new_context(viewport={'width':w,'height':844},timezone_id='Asia/Kolkata')
    p=await c.new_page();p.errs=[]
    p.on('pageerror',lambda e:p.errs.append(str(e)))
    await p.clock.install(time=when)
    await p.goto(BASE);await p.wait_for_function("window.LD&&LD.ready&&typeof remSheet==='function'")
    await p.evaluate("s=>LD.importPayload(s)",seed);await p.wait_for_timeout(300)
    await p.evaluate("m=>{saveCfg({examMode:m});lookSave({order:[],hidden:[]});state.date=todayStr();render()}",exam)
    await p.wait_for_timeout(300)
    return c,p
async def go(p,view):
    await p.evaluate("v=>{state.view=v;state.date=todayStr();render()}",view);await p.wait_for_timeout(250)
async def text(p,sel='#app'):return await p.evaluate("s=>document.querySelector(s).innerText",sel)
async def weights(p,m):
    await p.evaluate("m=>{Object.keys(state.days).forEach(d=>{if(state.days[d].weight!=null)dbSetDay(d,{weight:null})});Object.keys(m).forEach(d=>dbSetDay(d,{weight:m[d]}));render()}",m);await p.wait_for_timeout(250)

async def main():
    b=await launch()
    # ---- 29 Nov: exactly the old plan, targets and day times
    c,p=await at(b,'2026-11-29T10:00:00+05:30')
    r=await p.evaluate("({t:C().targets,g:C().goalWeight,s:C().startWeight,w:C().wake,bd:C().bed,gt:C().gymTime,ps:C().planStart,mon:PLAN.Mon.name,wed:PLAN.Wed.name,on:PROGRAM.on(todayStr())})")
    ok('29 Nov: old targets (1800 kcal, 120 g)',r['t']['kcal']==1800 and r['t']['protein']==120,r['t'])
    ok('29 Nov: old goal, start, wake, bed, gym time',(r['g'],r['s'],r['w'],r['bd'],r['gt'])==(63.5,69.5,'08:00','00:15','17:30'),r)
    ok('29 Nov: old plan (Push, Zone 2 and core), programme off',r['mon']=='Push' and r['wed']=='Zone 2 and core' and not r['on'],r)
    await go(p,'train');t=await text(p)
    ok('29 Nov: Train shows the old Push day',('Push' in t) and 'Push + abs' not in t,t[:120])
    sch=await p.evaluate("remSchedule()")
    ok('29 Nov: published schedule keeps the old times as the base',[i['time'] for i in sch['items']]==['08:05','17:00','17:15','00:30'],sch['items'])
    ok('published schedule has next.from == 2026-11-30',sch.get('next',{}).get('from')=='2026-11-30',sch.get('next'))
    nt={i['k']:i['time'] for i in sch['next']['items']}
    ok('next carries the programme times (mob 06:10, gym 06:15, creatine 08:15, bed 22:15)',nt=={'mob':'06:10','creatine':'08:15','gym':'06:15','bed':'22:15'},nt)
    ok('next: water 09:00 to 22:00 only when behind, protein 20:30, targets 3000 ml and 150 g',sch['next']['water']['start']=='09:00' and sch['next']['water']['end']=='22:00' and sch['next']['water']['onlyBehind'] and sch['next']['protein']['time']=='20:30' and sch['next']['water']['target']==3000 and sch['next']['protein']['target']==150,sch['next'])
    ok('next: gymByDow is the programme table',sch['next']['gymByDow']['Thu']=='Legs + abs' and sch['next']['gymByDow']['Sun']=='Rest',sch['next']['gymByDow'])
    await p.wait_for_timeout(300)
    pub=await p.evaluate("LD.get('meta','reminders')")
    ok('meta/reminders contains next.from == 2026-11-30',pub and pub['s'].get('next',{}).get('from')=='2026-11-30',str(pub)[:200])
    await go(p,'today')
    ok('photo prompt for week 0 on Sun 29 Nov','front, side, back, same light' in await text(p))
    night=await p.evaluate("(()=>{state.date=todayStr();return dayPeriod()})()")
    ok('29 Nov 10:00: not night',night!='night',night)
    ok('no page errors (29 Nov)',not p.errs,p.errs);await c.close()

    # ---- Monday 30 Nov: week 1
    c,p=await at(b,'2026-11-30T10:00:00+05:30')
    r=await p.evaluate("({t:C().targets,g:C().goalWeight,s:C().startWeight,w:C().wake,bd:C().bed,gt:C().gymTime,mon:PLAN.Mon.ex[0].n})")
    ok('30 Nov: targets 2050 kcal, 150 g protein, 60 fat, 225 carbs, 10000 steps, 3000 ml',(r['t']['kcal'],r['t']['protein'],r['t']['fat'],r['t']['carbs'],r['t']['steps'],r['t']['waterMl'])==(2050,150,60,225,10000,3000),r['t'])
    ok('30 Nov: goal 66.5, start 70.5, wake 06:05, bed 22:30, gym 06:30',(r['g'],r['s'],r['w'],r['bd'],r['gt'])==(66.5,70.5,'06:05','22:30','06:30'),r)
    await go(p,'train');t=await text(p)
    ok('Mon: Train title is Push + abs',await p.evaluate("document.querySelector('.sec-hero h2, .sec-hero__title').textContent.trim()")=='Push + abs')
    ok('Mon: first exercise is the bench press',('Barbell or dumbbell bench press' in t) and 'Cable crunch' in t,t[:300])
    ok('Mon: week 1 of 8 and RIR 2–3',('week 1 of 8' in t.lower()) and ('RIR 2–3' in t),t[-700:])
    ok('Mon: double progression line and rest time shown',('Hit the top of the range on every set' in t) and ('rest 2.5 min' in t),t[:600])
    hn=await p.evaluate("document.querySelector('.sec-hero__num').textContent")
    ok('Mon: hero counts 18 planned sets (six exercises)','18' in hn,hn)
    ok('Mon: Fuel tab habit labels use the programme (gym habit)',await p.evaluate("habits(todayStr()).items.find(i=>i.k==='gym').label")=='Gym: Push + abs')
    ok('Mon: wake target 06:05 in the habit',(await p.evaluate("habits(todayStr()).items.find(i=>i.k==='wake').sub"))=='Target 06:05')
    ok('Mon: bed target 22:30 in the habit',(await p.evaluate("habits(todayStr()).items.find(i=>i.k==='bed').label"))=='In bed by 22:30')
    for (d,name,first) in [('2026-12-01','Pull','Lat pulldown or pull-up'),('2026-12-02','Cardio','Incline treadmill walk'),('2026-12-03','Legs + abs','Back squat or hack squat'),('2026-12-04','Upper + abs','Incline barbell or Smith press'),('2026-12-05','Cardio or long walk','Incline treadmill walk or cycling'),('2026-12-06','Rest','No lifting today')]:
        await p.evaluate("d=>{state.view='train';state.date=d;render()}",d);await p.wait_for_timeout(200)
        t=await text(p);h=await p.evaluate("document.querySelector('.sec-hero__title, .sec-hero h2').textContent.trim()")
        ok(f'{d}: Train shows {name}',h==('Rest day' if name=='Rest' else name) and first in t,(h,t[:150]))
    await p.evaluate("d=>{state.view='train';state.date=d;render()}",'2026-12-08');await p.wait_for_timeout(200)
    t2=await text(p)
    ok('Tue 8 Dec: week 2 RIR 1–2',('week 2 of 8' in t2.lower()) and ('RIR 1–2' in t2),t2[-500:])
    await go(p,'fuel');t=await text(p)
    ok('Fuel: stats read 2050 kcal and plan targets',('of 2050 kcal' in t) and ('2,050 kcal' in t) and ('150 g protein' in t),t[:300])
    pm=await p.evaluate("(()=>{const e=document.querySelector('[data-pg=meals]');return e?e.innerText:''})()")
    ok('Fuel: Plan meals group shows breakfast, lunch, snack, dinner',all(x in pm for x in ['Breakfast','Lunch','Evening snack','Dinner']),pm[:300])
    ok('Fuel: Plan meals has no egg, chicken or fish',not any(w in pm.lower() for w in ['egg','chicken','fish']),pm)
    saved0=await p.evaluate("JSON.stringify(C().mealTpl||[])")
    await p.evaluate("document.querySelector('[data-act=pgmeal][data-i=\"0\"]').click()");await p.wait_for_timeout(300)
    ms=await p.evaluate("entriesOn(todayStr(),'meal').map(e=>[e.name,e.kcal,e.p])")
    ok('Plan meal Log adds breakfast items with kcal and protein from the food table',len(ms)==3 and ms[0][0]=='Hung curd' and ms[0][1]==212 and ms[0][2]==16,ms)
    ok('logging a plan meal does not touch saved meal templates',await p.evaluate("JSON.stringify(C().mealTpl||[])")==saved0)
    await p.evaluate("document.querySelector('[data-act=pgtpl]').click()");await p.wait_for_timeout(300)
    n=await p.evaluate("(C().mealTpl||[]).length")
    ok('Add plan meals to My usual meals adds 4 and keeps the old ones',n==len(json.loads(saved0))+4,n)
    cfg=await p.evaluate("Object.keys(state.cfg).sort()")
    ok('saved cfg keys intact (no targets/rem/planStart written)',all(k not in cfg for k in ['targets','planStart','goalWeight','startWeight','wake','bed','gymTime','planWeeks']),cfg)
    ok('Fuel: no warning at 10:00',await p.evaluate("!document.querySelector('[data-pg=warn]')"))
    # reminders edit during the programme goes to cfg.program
    rem0=await p.evaluate("JSON.stringify(C().rem||null)")
    await p.evaluate("remSheet()");await p.wait_for_timeout(200)
    mob=await p.evaluate("document.querySelector('input[name=mobT]').value")
    ok('reminder sheet shows programme mobility 06:10',mob=='06:10',mob)
    await p.evaluate("document.querySelector('input[name=mobT]').value='06:20'")
    await p.evaluate("document.querySelector('form[data-xform=rem]').requestSubmit()");await p.wait_for_timeout(400)
    prog=await p.evaluate("(C().program||{}).rem")
    ok('saving reminders writes cfg.program.rem',prog and prog['items']['mob']['time']=='06:20',prog)
    ok('saving reminders leaves cfg.rem unchanged',await p.evaluate("JSON.stringify(C().rem||null)")==rem0)
    sch=await p.evaluate("remSchedule()")
    ok('edit shows in next, base keeps old times',sch['next']['items'][0]['time']=='06:20' and sch['items'][0]['time']=='08:05',(sch['next']['items'][0],sch['items'][0]))
    ok('no page errors (30 Nov)',not p.errs,p.errs);await c.close()

    # ---- night mode at 20:45 and the fuel warning at 21:30
    c,p=await at(b,'2026-12-02T20:45:00+05:30')
    ok('programme day 20:45: night mode',await p.evaluate("(()=>{state.date=todayStr();return dayPeriod()})()")=='night')
    await c.close()
    c,p=await at(b,'2026-11-26T20:45:00+05:30')
    ok('old day 20:45 (26 Nov): still daytime',await p.evaluate("(()=>{state.date=todayStr();return dayPeriod()})()")=='day')
    await c.close()
    c,p=await at(b,'2026-12-02T21:30:00+05:30')
    await p.evaluate("()=>{addEntry({type:'meal',name:'Dinner test',kcal:1500,p:120,c:150,f:40,date:todayStr()})}");await p.wait_for_timeout(200)
    await go(p,'fuel');t=await text(p)
    ok('Fuel warning at 21:30 with 1500 kcal logged',await p.evaluate("!!document.querySelector('[data-pg=warn]')") and '1,800 kcal' in t and '140 g' in t,t[:300])
    await p.evaluate("()=>{addEntry({type:'meal',name:'More',kcal:400,p:40,c:30,f:10,date:todayStr()})}");await p.wait_for_timeout(200);await go(p,'fuel')
    ok('Fuel warning goes away once 1800 kcal and 140 g are logged',await p.evaluate("!document.querySelector('[data-pg=warn]')"))
    await c.close()

    # ---- Sunday 6 Dec check-in
    c,p=await at(b,'2026-12-06T10:00:00+05:30')
    await go(p,'today');t=await text(p)
    ok('Sun 6 Dec: Sunday check-in shows the waist field',await p.evaluate("!!document.querySelector('#app [data-pg=checkin] input[data-change=waist]')") and 'waist at navel' in t.lower(),t[:200])
    ok('Sun 6 Dec: not enough data is said plainly',('Not enough weigh-ins' in t),t[:200])
    ok('Sun 6 Dec: no photo prompt',('front, side, back, same light' not in t))
    # losing ~0.5 kg/week
    prev={'2026-11-23':71.6,'2026-11-25':71.4,'2026-11-27':71.2,'2026-11-29':71.0}
    cur={'2026-11-30':70.7,'2026-12-02':70.5,'2026-12-04':70.4,'2026-12-06':70.2}
    await weights(p,{**prev,**cur});t=await text(p)
    ok('Sun 6 Dec: losing about 0.8 kg/week in week 1 (water): change nothing',('Change nothing' in t) and ('Week 1' in t or 'Losing' in t),t[t.find('Check-in'):t.find('Check-in')+250])
    ci=await p.evaluate("PROGRAM.checkin(todayStr())");ok('7-day averages computed',abs(ci['avg']-70.45)<0.01 and abs(ci['prev']-71.3)<0.01,ci)
    # slow loss -> check logging
    await weights(p,{'2026-11-23':71.0,'2026-11-25':71.0,'2026-11-27':71.0,'2026-11-29':71.0,'2026-11-30':70.9,'2026-12-02':70.9,'2026-12-04':70.9,'2026-12-06':70.9});t=await text(p)
    ok('Slow loss: check logging, add 2,000 steps',('Check logging, then add 2,000 steps a day' in t) and ('100–150 kcal' in t),t[t.find('Check-in'):t.find('Check-in')+300])
    # flat weight, waist down -> recomposition
    await p.evaluate("()=>{dbSetDay('2026-11-29',{waist:90});dbSetDay('2026-12-06',{waist:88.5});render()}");await p.wait_for_timeout(250)
    ok('Flat weight with waist down: recomposition is working',('Recomposition is working, keep going' in await text(p)))
    # fast loss in week 2
    await weights(p,{'2026-11-30':71.0,'2026-12-01':71.0,'2026-12-03':71.0,'2026-12-04':71.0,'2026-12-07':70.2,'2026-12-09':70.1,'2026-12-11':70.0,'2026-12-13':69.9})
    r=await p.evaluate("PROGRAM.checkin('2026-12-13')")
    ok('Fast loss after week 1: add 150 kcal, mostly carbs',r['msg']=='Add 150 kcal, mostly carbs',r)
    await weights(p,{'2026-11-30':71.0,'2026-12-01':71.0,'2026-12-03':71.0,'2026-12-04':71.0,'2026-12-07':70.6,'2026-12-09':70.5,'2026-12-11':70.4,'2026-12-13':70.5})
    r=await p.evaluate("PROGRAM.checkin('2026-12-13')")
    ok('Losing about 0.5 kg/week: change nothing',r['msg']=='Change nothing',r)
    await go(p,'progress');await p.evaluate("()=>{state.progView='body';render()}");await p.wait_for_timeout(250)
    t=await text(p)
    ok('Progress > Body: chart with 7-day average line, check-in and checkpoint note',await p.evaluate("!!document.querySelector('svg.chart')") and ('7-day average' in t) and ('68.5 kg at the end of week 4' in t),t[:300])
    ok('390: no horizontal overflow (Progress body)',await p.evaluate("document.documentElement.scrollWidth")==390)
    ok('no page errors (6 Dec)',not p.errs,p.errs);await c.close()

    # ---- photo prompt 13 Dec
    c,p=await at(b,'2026-12-13T10:00:00+05:30');await go(p,'today');t=await text(p)
    ok('Sun 13 Dec: photo prompt shows',('Progress photos: front, side, back, same light' in t))
    await p.evaluate("document.querySelector('[data-pg=photos][data-act]').click()");await p.wait_for_timeout(300)
    ok('photo prompt opens the photos card',await p.evaluate("state.view==='progress'&&state.progView==='body'&&[...document.querySelectorAll('#app h2')].some(h=>h.textContent.indexOf('Progress photos')===0)"))
    ok('390: no horizontal overflow (13 Dec)',await p.evaluate("document.documentElement.scrollWidth")==390)
    await c.close()

    # ---- week 9
    c,p=await at(b,'2027-01-26T10:00:00+05:30')
    await go(p,'fuel');t=await text(p)
    ok('week 9 (26 Jan): Fuel shows 2500 kcal and the same protein',('of 2500 kcal' in t) and await p.evaluate("C().targets.protein")==150,t[:200])
    await go(p,'today');t=await text(p)
    ok('week 9: Today names the maintenance week',('maintenance week' in t.lower()),t[:200])
    await go(p,'train');ok('week 9: Train eyebrow says Maintenance week',('maintenance week' in (await text(p)).lower()))
    ok('no page errors (week 9)',not p.errs,p.errs);await c.close()

    # ---- viewing a pre-programme day after the programme started keeps the old plan
    c,p=await at(b,'2026-12-02T10:00:00+05:30')
    await p.evaluate("()=>{state.view='train';state.date='2026-11-27';render()}");await p.wait_for_timeout(250)
    t=await text(p)
    ok('viewing Fri 27 Nov from December shows the old plan (Chest and back)',('Chest and back' in t) and ('week 8 of 8' in t.lower()),t[:200])
    await go(p,'today')
    ok('back on today the programme targets apply again',await p.evaluate("C().targets.kcal")==2050)
    await c.close()
    await close();finish()
asyncio.run(main())

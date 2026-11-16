import sys,os,json,asyncio
sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
from _h import *
import _h
async def main():
    b=await _h.launch()
    # ---------- 1 import + verification
    c,p=await fresh(b)
    rep=await p.evaluate("s=>LD.importPayload(s)",seed);await p.wait_for_timeout(500)
    ok('import: verified, no mismatches',rep['ok'] and not rep['mismatch'],rep['mismatch'][:3])
    want={'entries':165,'days':9,'todos':12,'academics':7,'config':1}
    cn=await p.evaluate("LD.counts()")
    ok('import: record counts match source per type',all(cn.get(k)==v for k,v in want.items()),cn)
    types=await p.evaluate("(()=>{const o={};state.entries.forEach(e=>{const k=e.type+(e.kind?':'+e.kind:'');o[k]=(o[k]||0)+1});return o})()")
    ok('import: entry types match (62 water, 41 expenses, 34 meals, 20 owe…)',types=={'water':62,'txn:expense':41,'meal':34,'owe':20,'repay':3,'debt':2,'txn:transfer':1,'paid':1,'adjust':1},types)
    rep2=await p.evaluate("s=>LD.importPayload(s)",seed)
    ok('import twice: nothing duplicated or overwritten',sum(rep2['added'].values())==0 and (await p.evaluate("LD.counts().entries"))==165)
    # ---------- 2 plain-text logging with confirmation
    today=await p.evaluate("todayStr()")
    async def log(txt):
        await p.evaluate("t=>sendChat(t)",txt);await p.wait_for_timeout(150)
    await log('water 500')
    pend=await p.evaluate("state.chat.pending.length")
    w0=await p.evaluate("totals(todayStr()).water")
    ok('log: entry waits for confirmation before saving',pend==1 and w0==0,(pend,w0))
    await p.evaluate("commitPending(0)");await p.wait_for_timeout(200)
    ok('log: "water 500" saved as a daily total, not a new entry',(await p.evaluate("totals(todayStr()).water"))==500 and (await p.evaluate("state.entries.length"))==165 and (await p.evaluate("LD.get('days',todayStr()).water"))==500)
    await log('paid 340 for lunch from KM, split with Arjun')
    pe=await p.evaluate("state.chat.pending[0]")
    ok('log: expense parsed with account and split',pe and pe['type']=='expense' and pe['amount']==340 and pe['account']=='km' and pe.get('split'),pe)
    await p.evaluate("commitPending(0)");await p.wait_for_timeout(200)
    ex=await p.evaluate("state.entries.filter(e=>e.date===todayStr()&&e.type==='txn')");ow=await p.evaluate("state.entries.filter(e=>e.date===todayStr()&&e.type==='owe')")
    ok('log: expense saved with Arjun owing his share',len(ex)==1 and ex[0]['amount']==340 and len(ow)==1 and ow[0]['person']=='Arjun' and ow[0]['amount']==170,(ex,ow))
    await log('cfa 45');await p.evaluate("commitPending(0)");await log('weight 68.9');await p.evaluate("commitPending(0)");await p.wait_for_timeout(200)
    dd=await p.evaluate("LD.get('days',todayStr())")
    ok('log: "cfa 45" and "weight 68.9" saved',dd.get('cfaMin')==45 and dd.get('weight')==68.9,dd)
    await log('water 99999');r=await p.evaluate("commitPending(0)")
    ok('validate: out-of-range entry is refused',r is False and (await p.evaluate("totals(todayStr()).water"))==500)
    await p.evaluate("state.chat.pending=[];state.chat.open=false;renderDock()")
    # ---------- 3 edit, delete, undo
    eid=ex[0]['id']
    await p.evaluate("id=>updateEntry(id,{amount:360})",eid);await p.wait_for_timeout(200)
    ok('edit: change is stored',(await p.evaluate("id=>LD.get('entries',id).amount",eid))==360)
    await p.evaluate("state.view='money';render()");await p.wait_for_timeout(300)
    n0=await p.evaluate("state.entries.length")
    await p.evaluate("id=>{const b=document.createElement('button');b.dataset.act='entdel';b.dataset.id=id;document.body.appendChild(b);b.click();b.remove()}",eid);await p.wait_for_timeout(200)
    n1=await p.evaluate("state.entries.length");gone=await p.evaluate("id=>LD.get('entries',id)",eid)
    ok('delete: expense and its split removed (soft delete)',n1==n0-2 and gone is None,(n0,n1))
    await p.click('#toast [data-act=undo]');await p.wait_for_timeout(300)
    ok('undo: delete restored',(await p.evaluate("state.entries.length"))==n0 and (await p.evaluate("id=>LD.get('entries',id)",eid)) is not None)
    await p.evaluate("addEntry({type:'water',ml:250,date:todayStr()});toast('Added 250 ml of water')");await p.wait_for_timeout(150)
    await p.click('#toast [data-act=toastundo]');await p.wait_for_timeout(200)
    ok('undo: quick water add reversed',(await p.evaluate("totals(todayStr()).water"))==500)
    # ---------- 4 forms log to the date being viewed
    await p.evaluate("state.view='today';state.date=addDays(todayStr(),-1);render()");await p.wait_for_timeout(200)
    await p.click('[data-act=nudge][data-key=water]');await p.wait_for_timeout(200)
    ok('viewed date: logging goes to the date on screen',(await p.evaluate("totals(addDays(todayStr(),-1)).water"))==250 and (await p.evaluate("totals(todayStr()).water"))==500)
    await p.evaluate("state.date=todayStr();render()")
    # ---------- 5 backup and restore
    exp=await p.evaluate("LD.exportAll()")
    c2,p2=await fresh(b)
    rr=await p2.evaluate("s=>LD.importPayload(s)",exp);await p2.wait_for_timeout(300)
    same=json.loads(await p2.evaluate("JSON.stringify(LD.exportAll().records)"))
    strip=lambda r:{c:{i:v for i,v in d.items() if not (c=='meta' and i=='reminders')} for c,d in r.items()}  # the reminder schedule is rebuilt per device
    ok('backup/restore: export imported on a clean device matches exactly',rr['ok'] and strip(same)==strip(exp['records']))
    await c2.close()
    # ---------- 6 offline: reload with no network, data still there, logging works
    await p.wait_for_function("navigator.serviceWorker.controller||navigator.serviceWorker.ready.then(()=>true)");await p.reload();await p.wait_for_function("window.LD&&LD.ready");await p.wait_for_timeout(800)
    await c.set_offline(True)
    try:
        await p.reload();await p.wait_for_function("window.LD&&LD.ready&&state.entries.length>0",timeout=8000);loaded=True
    except Exception as e: loaded=False
    ok('offline: app opens with no network and shows saved data',loaded and (await p.evaluate("state.entries.length"))==n0)
    if loaded:
        await p.evaluate("addEntry({type:'water',ml:250,date:todayStr()})");await p.wait_for_timeout(300);await p.reload();await p.wait_for_function("window.LD&&LD.ready&&state.entries.length>0");await p.wait_for_timeout(300)
        ok('offline: a change made offline survives a restart',(await p.evaluate("totals(todayStr()).water"))==750)
    await c.set_offline(False)
    ok('no page errors in session 1',not p.errs,p.errs[:3])
    # ---------- 7 sync between two sessions (local stand-in for the cloud, same SQL)
    async def signin(pg): return await pg.evaluate("u=>LD.signIn(u,'pk','test@example.com','pw')",MOCK)
    st=await signin(p);await p.wait_for_timeout(1500);await p.evaluate("LD.sync()");await p.wait_for_timeout(1500)
    stA=await p.evaluate("LD.status()")
    ok('sync A: everything uploaded, status says Synced',stA['mode']=='synced' and stA['pending']==0,stA)
    cB,pB=await fresh(b)
    await signin(pB);await pB.wait_for_timeout(1500)
    cA=await p.evaluate("LD.counts()");cBn=await pB.evaluate("LD.counts()")
    ok('sync B: second device receives the same records',all(cA[k]==cBn.get(k) for k in ['entries','days','todos','academics','config']),(cA,cBn))
    ok('sync B: screen shows the data',(await pB.evaluate("state.entries.length"))==(await p.evaluate("state.entries.length")))
    # concurrent edits to the same day on two devices: different fields must both survive
    await p.evaluate("dbSetDay(todayStr(),{mood:4})");await pB.evaluate("dbSetDay(todayStr(),{steps:8123})")
    await p.wait_for_timeout(2500);await pB.wait_for_timeout(500)
    for pg in (p,pB,p,pB): await pg.evaluate("LD.sync()");await pg.wait_for_timeout(700)
    dA=await p.evaluate("LD.get('days',todayStr())");dB=await pB.evaluate("LD.get('days',todayStr())")
    ok('sync: two devices editing the same day both keep their changes',dA.get('mood')==4 and dA.get('steps')==8123 and dB.get('mood')==4 and dB.get('steps')==8123 and dB.get('water')==750,(dA,dB))
    # delete on A reaches B
    tid=await p.evaluate("state.todos[0].id");await p.evaluate("id=>delTodo(id)",tid);await p.wait_for_timeout(2200)
    await pB.evaluate("LD.sync()");await pB.wait_for_timeout(900)
    ok('sync: a delete on one device reaches the other',(await pB.evaluate("id=>state.todos.some(t=>t.id===id)",tid)) is False)
    # cloud unreachable: outbox holds, status is honest, then drains
    mock('/__down',{'down':True})
    await p.evaluate("dbSetDay(todayStr(),{steps:9000})");await p.wait_for_timeout(2600)
    sD=await p.evaluate("LD.status()")
    ok('outbox: change waits when the cloud is unreachable, status shows it',sD['pending']>=1 and sD['mode'] in('pending','error') and 'waiting' in (await p.inner_text('#sync')),(sD,await p.inner_text('#sync')))
    mock('/__down',{'down':False});await p.evaluate("LD.sync()");await p.wait_for_timeout(1500)
    sU=await p.evaluate("LD.status()")
    await pB.evaluate("LD.sync()");await pB.wait_for_timeout(900)
    ok('outbox: drains when the cloud returns, other device gets it',sU['pending']==0 and (await pB.evaluate("LD.get('days',todayStr()).steps"))==9000,sU)
    ok('no page errors in session 2',not pB.errs,pB.errs[:3])
    await cB.close();await c.close()
    # ---------- 8 the 4 AM day boundary
    async def at(iso,expr):
        cx=await b.new_context(viewport={'width':390,'height':844},timezone_id='Asia/Kolkata');pg=await cx.new_page()
        await pg.clock.install(time=iso);await pg.goto(BASE);await pg.wait_for_function("window.LD&&LD.ready");await pg.wait_for_timeout(300)
        v=await pg.evaluate(expr);await cx.close();return v
    ok('4 AM: 2:30 AM on the 12th still counts as the 11th',(await at('2026-11-12T02:30:00+05:30',"todayStr()"))=='2026-11-11')
    ok('4 AM: 4:05 AM on the 12th is the 12th',(await at('2026-11-12T04:05:00+05:30',"todayStr()"))=='2026-11-12')
    v=await at('2026-11-12T01:10:00+05:30',"(async()=>{state.det.alltoday=true;render();const b=[...document.querySelectorAll('[data-act=stamp][data-key=bed]')][0];b.click();await new Promise(r=>setTimeout(r,200));return {d11:LD.get('days','2026-11-11'),d12:LD.get('days','2026-11-12')}})()")
    ok('4 AM: "In bed now" at 1:10 AM stamps the night of the 11th',v['d11'] and v['d11'].get('bed')=='01:10' and not (v['d12'] or {}).get('bed'),v)
    # ---------- 9 reminders: shown through the service worker at the right time
    cx=await b.new_context(viewport={'width':390,'height':844},timezone_id='Asia/Kolkata',permissions=['notifications']);pg=await cx.new_page()
    await pg.clock.install(time='2026-11-11T17:00:30+05:30');await pg.goto(BASE);await pg.wait_for_function("window.LD&&LD.ready");await pg.evaluate("navigator.serviceWorker.ready.then(()=>1)")
    await pg.wait_for_timeout(600)
    try:
        await pg.evaluate("remTick()");await pg.wait_for_timeout(500)
        ns=await pg.evaluate("navigator.serviceWorker.getRegistration().then(r=>r.getNotifications()).then(l=>l.map(n=>n.title))")
    except Exception as e: ns=['ERR '+str(e)]
    ok('reminders: creatine notification appears at 5:00 PM',any('Creatine' in x for x in ns),ns)
    await pg.evaluate("setHabit('creatine',true)");await pg.evaluate("localStorage.removeItem('ld.rem.sent')");await pg.wait_for_timeout(200)
    d=await pg.evaluate("RemCore.due(remSchedule(),{...RemCore.nowIn('Asia/Kolkata'),win:2},remDay).map(x=>x.key)")
    ok('reminders: skipped once the habit is ticked',not any(k.startswith('creatine') for k in d),d)
    await cx.close()
    await b.close();await _h.close()
asyncio.run(main())
finish()

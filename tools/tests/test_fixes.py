"""Task A1 fixes: layers in the build, recurring offline, poker settlements, exam mode, stamps on the viewed date,
one CFA date, proposals at startup, deload week, CFA minutes, focus timer per course, follow-ups, private habits,
undo for edits and unticks, wording and dead code."""
import sys,os,json,asyncio,re,urllib.request
sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
from _h import *
import _h

async def fresh_at(b,iso='2026-11-12T10:00:00+05:30'):
    """like _h.fresh, but with the clock pinned so the suite does not depend on the real date"""
    c=await b.new_context(viewport={'width':390,'height':844},timezone_id='Asia/Kolkata')
    p=await c.new_page();p.errs=[]
    p.on('pageerror',lambda e:p.errs.append(str(e)))
    await p.clock.install(time=iso)
    await p.goto(BASE);await p.wait_for_function("window.LD&&LD.ready&&typeof remSheet==='function'");await p.wait_for_timeout(500)
    return c,p

def get(path):
    op=urllib.request.build_opener(urllib.request.ProxyHandler({}))
    return op.open(BASE+path).read().decode()

async def main():
    b=await _h.launch()
    c,p=await fresh_at(b)
    ev=p.evaluate

    # ---------- 1 layer files in the page and the service worker
    html=get('index.html');sw=get('sw.js')
    have=[f for f in ['common','wall','today','body','money','study','career'] if os.path.exists(os.path.join(_h.ROOT,'ui',f+'.js'))]
    ok('build: every existing layer file is included after extra.js, in order',
       all(f'<script src="ui/{f}.js"></script>' in html for f in have) and html.index('extra.js')<min([html.index(f'ui/{f}.js') for f in have] or [10**9]),have)
    ok('build: missing layer files are not referenced',all(f'ui/{f}.js' not in html for f in ['common','wall','today','body','money','study','career'] if f not in have))
    css=os.path.exists(os.path.join(_h.ROOT,'ui','design.css'))
    ok('build: design.css linked after theme.css only when present',(('href="theme.css">\n<link rel="stylesheet" href="ui/design.css">' in html) if css else 'design.css' not in html))
    ok('sw: layers in the optional list, cached one by one, version bumped',all(f'ui/{f}.js' in sw for f in have) and 'addAll' not in sw and "const V='ld-v1'" not in sw)
    cached=await ev("(async()=>{const r=await navigator.serviceWorker.ready;await new Promise(r=>setTimeout(r,800));const ks=await caches.keys();const c=await caches.open(ks[ks.length-1]);return (await c.keys()).map(r=>new URL(r.url).pathname)})()")
    ok('sw: installs and caches the shell and layers despite tolerance mode',any(x.endswith('/index.html') for x in cached) and all(any(x.endswith('ui/'+f+'.js') for x in cached) for f in have),cached[:6])

    # ---------- 2 recurring posts in local-only mode
    ok('recurring: store provides db at boot (state.db set)',await ev("!!state.db"))
    await ev("saveCfg({recurring:[{id:'rtest',name:'Rent',amount:500,category:'Bills',account:C().accounts[0].id,day:1,from:addDays(todayStr(),-62).slice(0,7),paused:false,kind:'expense'}]})")
    ok('recurring: runRecurring no longer waits for state.db',not re.search(r'state\.db',await ev("runRecurring.toString()")))
    await ev("runRecurring()");await p.wait_for_timeout(200)
    r1=await ev("state.entries.filter(e=>e.rec==='rtest').map(e=>e.date).sort()")
    await ev("runRecurring()");await p.wait_for_timeout(200)
    r2=await ev("state.entries.filter(e=>e.rec==='rtest').length")
    stored=await ev("LD.list('entries').filter(e=>e.rec==='rtest').length")
    ok('recurring: posts each month since "from" in local-only mode',len(r1)==3 and r1[-1][:7]==(await ev("todayStr().slice(0,7)")),r1)
    ok('recurring: a second run adds no duplicates and entries are stored',r2==3 and stored==3,(r2,stored))

    # ---------- 3 poker "I paid" settlement is an expense with a category
    acc=await ev("C().accounts.find(a=>a.kind!=='credit').id")
    b0=await ev("id=>accountBal(C().accounts.find(a=>a.id===id)).b",acc)
    await ev("setGroupBal('Ravi',-500);pkPaidSheet('Ravi')");await p.wait_for_timeout(200)
    await p.select_option('#layer form[data-form=pkpaid] select[name=account]',acc)
    await p.click('#layer form[data-form=pkpaid] button[type=submit]');await p.wait_for_timeout(300)
    b1=await ev("id=>accountBal(C().accounts.find(a=>a.id===id)).b",acc)
    pe=await ev("state.entries.filter(e=>e.type==='txn'&&/Poker settlement to Ravi/.test(e.note||''))")
    ok('poker: paying a group balance lowers the account by the amount',abs((b0-b1)-500)<0.01,(b0,b1))
    ok('poker: settlement is an expense in "Poker and gambling"',len(pe)==1 and pe[0]['kind']=='expense' and pe[0]['category']=='Poker and gambling',pe)
    ok('poker: settlement counts in month spend',await ev("monthSpend(todayStr().slice(0,7)).by['Poker and gambling']===500"))
    ok('poker: group balance entry still written (pkbal unchanged)',await ev("pkGroup().every(x=>x.p!=='Ravi'||Math.abs(x.v)<.01)"))

    # ---------- 4 exam mode closes the Poker view
    await ev("state.view='money';state.mm='poker';saveCfg({examMode:'on'});render()");await p.wait_for_timeout(200)
    ok('exam mode: Poker view falls back to Spending',await ev("state.mm==='spend'&&document.body.dataset.view!=='poker'&&!!document.querySelector('#app')&&/Exam mode is on/.test(document.querySelector('#app').innerText)"))
    await ev("saveCfg({examMode:'off'});state.view='today';render()")

    # ---------- 5 stamps write to the viewed date
    await ev("state.date=addDays(todayStr(),-1);state.det.alltoday=true;render()");await p.wait_for_timeout(200)
    await p.click('[data-act=stamp][data-key=wake] >> nth=0');await p.wait_for_timeout(200)
    st=await ev("({y:LD.get('days',addDays(todayStr(),-1)),t:LD.get('days',todayStr())})")
    ok('stamp: "I\'m up" while viewing yesterday lands on yesterday',(st['y'] or {}).get('wake') and not (st['t'] or {}).get('wake'),st)
    await ev("state.date=todayStr();render()")

    # ---------- 6 one CFA date
    ok('cfa: one date and hours goal by default',await ev("C().cfaDate==='2027-08-15'&&C().cfaHours===300"))
    sv0=await ev("state.studyView||null")
    cfa_js="(()=>{const s=[...document.querySelectorAll('#app .statrow .stat-t')].find(x=>/To the exam/i.test(x.textContent));const pc=[...document.querySelectorAll('#app section.card')].find(x=>/CFA pace/.test(x.querySelector('h2')?x.querySelector('h2').innerText:''));return {stat:s?s.textContent:'',pace:pc?pc.querySelector('h2').innerText:''}})()"
    await ev("state.view='study';state.studyView='cfa';render()");await p.wait_for_timeout(200)
    t1=await ev(cfa_js);lab=await ev("dlabel('2027-08-15')")
    ok('cfa: CFA tab statRow and pace card both use 15 Aug 2027',lab in t1['stat'] and ('days to '+lab) in t1['pace'],(lab,t1))
    await ev("saveCfg({cfaDate:'2027-08-21'});state.studyView='cfa';render()");await p.wait_for_timeout(200)
    t2=await ev(cfa_js);lab2=await ev("dlabel('2027-08-21')")
    ok('cfa: changing the date moves the statRow and the pace card together',lab2 in t2['stat'] and ('days to '+lab2) in t2['pace'] and lab not in t2['stat'],(lab2,t2))
    await ev("v=>{saveCfg({cfaDate:'2027-08-15'});state.studyView=v||undefined;render()}",sv0)

    # ---------- 7 deload week 4, CFA last 7 days from days.cfaMin
    ok('train: deload card in week 4, not week 8',await ev("/Deload week/.test(trainNotes(addDays(C().planStart,21)))&&!/Deload week/.test(trainNotes(addDays(C().planStart,49)))"))
    await ev("dbSetDay(todayStr(),{cfaMin:40});dbSetDay(addDays(todayStr(),-3),{cfaMin:20})")
    ok('cfa: "Last 7 days" counts logged CFA minutes',await ev("/Last 7 days: <b class=\"mono\">60 min/.test(cfaSystem())"))

    # ---------- 8 focus timer per course
    course=await ev("Object.keys(COURSES)[0]")
    await ev("state.view='study';render()");await p.wait_for_timeout(150)
    ok('focus: course picker offered with "Other academics" default',await ev("!!document.querySelector('select[data-xchange=fcourse]')&&document.querySelector('select[data-xchange=fcourse]').value===''"))
    await p.select_option('select[data-xchange=fcourse]',course);await p.wait_for_timeout(150)
    s0=await ev("+day(todayStr()).studyMin||0")
    await p.click('[data-act=focusgo][data-m="25"]');await ev("state.focus.start-=30*60000")
    await p.click('[data-act=focusstop]');await p.wait_for_timeout(200)
    dd=await ev("LD.get('days',todayStr())")
    ok('focus: a course session adds to studyMin and courseMin[course]',dd.get('studyMin')==s0+30 and (dd.get('courseMin') or {}).get(course)==30,dd)
    await p.select_option('select[data-xchange=fcourse]','');await p.click('[data-act=focusgo][data-m="50"]');await ev("state.focus.start-=10*60000")
    await p.click('[data-act=focusstop]');await p.wait_for_timeout(200)
    dd=await ev("LD.get('days',todayStr())")
    ok('focus: default logs to other academics only',dd.get('studyMin')==s0+40 and dd['courseMin'][course]==30,dd)

    # ---------- 9 follow-ups in Coming up
    await ev("saveCfg({L_pipe:[{id:'tp',firm:'Test Firm LLP',role:'Summer role',stage:'Applied',next:addDays(todayStr(),1),note:''}]})")
    ok('coming up: pipeline follow-up due tomorrow is listed',await ev("/Follow up with Test Firm LLP/.test(comingCard())"))
    ok('coming up: the same follow-up still reaches reminders',await ev("remSchedule().deadlines.list.some(x=>x.id==='fu-tp')"))

    # ---------- 10 private habits
    await ev("state.privacy=false;saveCfg({hprivate:{gym:true,mobility:true}});setHabit('mobility',true);dbSetDay(todayStr(),{habits:{gym:true}});render()");await p.wait_for_timeout(1500)
    ym=await ev("todayStr().slice(0,7)")
    ok('privacy off: report and export still name the habit (control)',('Gym' in await ev("y=>monthMd(y)",ym)) and ('Morning mobility' in await ev("JSON.stringify(exportPayload())")))
    await ev("state.privacy=true")
    md=await ev("y=>monthMd(y)",ym)
    ok('privacy: month report shows "Private habit", not the name',not re.search(r'gym',md,re.I) and 'Private habit' in md,md[:300])
    ex=await ev("exportPayload()");js=json.dumps(ex,ensure_ascii=False)
    tday=await ev("todayStr()")
    ok('privacy: export has no private habit label but keeps the habit data','Morning mobility' not in js and ex['records']['days'][tday]['habits'].get('mobility') is True and ex['records']['meta'].get('reminders'))
    await ev("state.privacy=false")

    # ---------- 11 undo for edits and unticks
    eid=await ev("addEntry({type:'txn',kind:'expense',amount:120,category:'Food',account:C().accounts[0].id,note:'undo test',date:todayStr()})")
    await p.wait_for_timeout(1700)
    await ev("id=>updateEntry(id,{amount:999})",eid);await p.wait_for_timeout(150)
    ok('edit: change stored',(await ev("id=>LD.get('entries',id).amount",eid))==999)
    await p.click('#toast [data-act=toastundo]');await p.wait_for_timeout(250)
    ok('edit: Undo restores the old amount',(await ev("id=>LD.get('entries',id).amount",eid))==120 and (await ev("id=>state.entries.find(e=>e.id===id).amount",eid))==120)
    await ev("state.date=todayStr();state.view='today';setHabit('creatine',true)");await p.wait_for_timeout(1700)
    await ev("setHabit('creatine',false)");await p.wait_for_timeout(150)
    ok('untick: habit cleared',not (await ev("!!(day(todayStr()).habits||{}).creatine")))
    await p.click('#toast [data-act=toastundo]');await p.wait_for_timeout(250)
    ok('untick: Undo ticks it again',await ev("!!LD.get('days',todayStr()).habits.creatine"))

    # ---------- 12 wording and dead code
    await ev("state.view='fuel';render()");await p.wait_for_timeout(200)
    fuel=await ev("document.body.innerText")
    ok('wording: Fuel shows no "Max"',not re.search(r'\bMax\b',fuel) and 'Estimate' in fuel,[l for l in fuel.splitlines() if 'Max' in l][:3])
    ok('wording: no "Max" in user-facing strings of the page',not re.search(r"Max(?!\w)|Max['’]s|Max is|with Max",html.replace('imgMax','')))
    ok('dead code: quotes, theme switch and legs routine removed',await ev("typeof QUOTES==='undefined'&&typeof setTheme==='undefined'&&!MOB.legs&&document.documentElement.dataset.theme==='dark'"))
    ok('page: no errors so far',not p.errs,p.errs[:3])
    await c.close()

    # ---------- 7 proposals already in storage show at startup
    c,p=await fresh_at(b)
    await p.evaluate("LD.write('proposals','ptest',{at:Date.now(),items:[{kind:'todo',title:'Email the moot court team'}]})");await p.wait_for_timeout(400)
    await p.reload();await p.wait_for_function("window.LD&&LD.ready&&typeof remSheet==='function'");await p.wait_for_timeout(600)
    card=await p.evaluate("(()=>{const s=[...document.querySelectorAll('section')].find(x=>/Nightly review/.test(x.innerText));return s?s.innerText:''})()")
    ok('proposals: stored suggestions show after reload with Approve and Dismiss','Email the moot court team' in card and 'Approve' in card and 'Dismiss' in card,card[:200])
    ok('page: no errors after reload',not p.errs,p.errs[:3])
    await c.close()
    await c5(b)
    await b.close();await _h.close()

SMALL="""(sel)=>{const root=document.querySelector(sel);if(!root)return ['no '+sel];const out=[];root.querySelectorAll('button,a[href],select,input:not([type=hidden]),summary,label.btn,label.chip').forEach(el=>{const r=el.getBoundingClientRect();if(!r.width||!r.height)return;const cs=getComputedStyle(el);if(cs.visibility==='hidden'||cs.display==='none')return;if(el.type==='range'||el.type==='checkbox'||el.type==='radio')return;if(r.height<43.5||r.width<43.5)out.push((el.dataset.act||el.dataset.x||el.dataset.xl||el.tagName)+' '+Math.round(r.width)+'x'+Math.round(r.height)+' '+(el.textContent||'').trim().slice(0,18))});if(document.documentElement.scrollWidth>innerWidth)out.push('page scrolls sideways');return out}"""
async def ready(p):
    await p.wait_for_function("window.LD&&LD.ready&&typeof remSheet==='function'");await p.wait_for_timeout(700)

async def c5(b):
    """Task C5: grouped settings, PIN lock, Shortcuts deep links, allowance by default, publishable key, reminders written once."""
    c,p=await fresh_at(b);ev=p.evaluate
    p.on('dialog',lambda d:asyncio.ensure_future(d.accept()))
    rep=await ev("s=>LD.importPayload(s)",seed);await p.wait_for_timeout(900)
    ok('c5 seed imported',rep['ok'],rep['mismatch'][:3])
    ok('allowance: not added in the session that imports (waits for the next start)',await ev("!(C().recurring||[]).some(r=>r.kind==='income')"))
    await p.reload();await ready(p);await p.wait_for_timeout(600)

    # ---------- allowance recurring income, once
    rec=await ev("(C().recurring||[]).filter(r=>r.kind==='income')")
    ok('allowance: one recurring income "Allowance" ₹25,000 on day 1 to KM, from the next 1st',len(rec)==1 and rec[0]['name']=='Allowance' and rec[0]['amount']==25000 and rec[0]['day']==1 and rec[0]['account']=='km' and rec[0]['from']=='2026-12',rec)
    posted=await ev("id=>state.entries.filter(e=>e.rec===id).map(e=>e.date)",rec[0]['id'] if rec else '')
    ok('allowance: nothing posted into the month already under way',posted==[],posted)
    nxt=await ev("(()=>{const r=(C().recurring||[]).find(x=>x.kind==='income');return r.from+'-0'+r.day})()")
    ok('allowance: runRecurring posts it on 1 Dec',nxt=='2026-12-01')
    await p.reload();await ready(p);await p.wait_for_timeout(600)
    n=await ev("(C().recurring||[]).filter(r=>r.kind==='income').length");np=await ev("id=>state.entries.filter(e=>e.rec===id).length",rec[0]['id'] if rec else '')
    ok('allowance: not duplicated after reload',n==1 and np==len(posted),(n,np))
    await ev("LD.kvSet('allowSeed',undefined)");await p.reload();await ready(p);await p.wait_for_timeout(600)
    ok('allowance: not added again when an income item already exists',await ev("(C().recurring||[]).filter(r=>r.kind==='income').length")==1)
    await ev("state.view='money';state.mm='manage';render()");await p.wait_for_timeout(200)
    ok('allowance: shows in the Recurring card',await ev("/Allowance · income/.test(recurCard(C()))"))
    await ev("state.view='today';render()")

    # ---------- settings menu in six groups; old buttons still work
    await p.click('[data-act=settings]');await p.wait_for_timeout(200)
    heads=await ev("[...document.querySelectorAll('#layer .xgrp .xgh')].map(h=>h.textContent)")
    ok('settings: seven group headings (Agents added in step 2)',heads==['Account','Reminders','Agents','Appearance','Data','Semester','Privacy'],heads)
    has=await ev("['[data-x=cloud]','[data-x=calfeed]','[data-x=rem]','[data-act=lookopen]','[data-act=hues]','[data-change=fx]','[data-act=data]','[data-x=install]','[data-x=shortcuts]','[data-x=sem]','[data-change=exammode]','[data-change=mhide]','[data-change=privacy]','[data-x=pinset]','[data-act=widgets]','[data-act=gotolife]'].filter(s=>!document.querySelector('#layer '+s))")
    ok('settings: every old control is still there, plus Shortcuts and Set a PIN',not has,has)
    sm=await ev(SMALL,'#layer');ok('settings: no control under 44 px at 390',not sm,sm)
    for sel,title in [('[data-x=cloud]','Cloud sync'),('[data-x=calfeed]','Calendar feed'),('[data-x=rem]','Reminders'),('[data-act=data]','Data and backup'),('[data-x=install]','Install on this device'),('[data-x=sem]','Semester setup'),('[data-x=shortcuts]','Shortcuts and Siri'),('[data-x=pinset]','Set a PIN'),('[data-act=lookopen]',None),('[data-act=hues]',None)]:
        await ev("settingsSheet()");await p.wait_for_timeout(120);await p.click('#layer '+sel);await p.wait_for_timeout(200)
        h=await ev("(document.querySelector('#layer h2')||{}).textContent||''")
        ok('settings: '+sel+' opens its sheet',(h.startswith(title) if title else (h and h!='Menu and settings')),h)
    await ev("closeSheet()")

    # ---------- publishable key label
    await ev("cloudSheet()");t=await ev("document.querySelector('#layer').textContent")
    ok('cloud sheet: "Publishable key" label and sb_publishable_ helper','Publishable key' in t and 'sb_publishable_' in t and 'anon' not in t,t[:200])
    sh=get('setup.html');ok('setup guide Part 3 names the "Publishable key"','<b>Publishable key</b>' in sh and 'Public (anon)' not in sh)
    await ev("closeSheet()")

    # ---------- shortcuts sheet
    await ev("shortcutsSheet()");await p.wait_for_timeout(150)
    urls=await ev("[...document.querySelectorAll('#layer .xsc input')].map(i=>i.value)")
    base=await ev("location.origin+location.pathname")
    ok('shortcuts: three ready links built from this address',urls==[base+'#log=water%20500',base+'#tick=creatine',base+'#tick=mobility'],urls)
    tx=await ev("document.querySelector('#layer').innerText")
    ok('shortcuts: exact iPhone steps',all(x in tx for x in ['Shortcuts','Add Action','Open URLs','Paste','Log water','Add to Home Screen','Hey Siri, Log water']))
    sm=await ev(SMALL,'#layer');ok('shortcuts sheet: no control under 44 px',not sm,sm)
    await ev("closeSheet()")

    # ---------- #log deep link on load: one pending card, nothing saved until confirmed
    w0=await ev("totals(todayStr()).water");n0=await ev("LD.list('entries').length")
    await p.goto('about:blank');await p.goto(BASE+'#log=water%20500');await ready(p);await p.wait_for_timeout(800)
    pend=await ev("state.chat.pending.map(x=>({type:x.type,ml:x.ml,date:x.date}))")
    ok('#log: opens the quick log with exactly one water 500 card',await ev("state.chat.open")and len(pend)==1 and pend[0]['type']=='water' and pend[0]['ml']==500,pend)
    ok('#log: nothing saved before the tap, and the link is cleared from the address',(await ev("totals(todayStr()).water"))==w0 and (await ev("LD.list('entries').length"))==n0 and 'log=' not in await ev("location.href"))
    await p.click('#dock [data-act=pendok]');await p.wait_for_timeout(300)
    ok('#log: one tap saves 500 ml on the viewed date',(await ev("totals(state.date).water"))==w0+500 and await ev("state.date===todayStr()"),(w0,await ev("totals(state.date).water")))
    await ev("state.chat.open=false;renderDock()")

    # ---------- #tick deep link via hashchange
    await ev("dbSetDay(todayStr(),{habits:{creatine:false}})");await p.wait_for_timeout(200)
    await ev("location.hash='tick=creatine'");await p.wait_for_timeout(400)
    card=await ev("(document.querySelector('#dock .pend')||{}).innerText||''")
    ok('#tick: confirmation card "Tick Creatine…?" and not ticked yet',card.startswith('Tick ') and 'reatine' in card and '?' in card and not await ev("!!(day(todayStr()).habits||{}).creatine"),card)
    await p.click('#dock [data-act=pendok]');await p.wait_for_timeout(300)
    ok('#tick: Save ticks the habit',await ev("!!LD.get('days',todayStr()).habits.creatine"))
    await ev("state.chat.open=false;renderDock()")

    # ---------- PIN lock
    await ev("settingsSheet()");await p.click('#layer [data-x=pinset]');await p.wait_for_timeout(150)
    sm=await ev(SMALL,'#layer');ok('PIN sheet: no control under 44 px',not sm,sm)
    ok('PIN sheet: says it stays on this device and never syncs',await ev("/never syncs/.test(document.querySelector('#layer').innerText)"))
    await p.fill('#layer [name=p1]','7391');await p.fill('#layer [name=p2]','7390');await p.click('#layer [type=submit]');await p.wait_for_timeout(250)
    ok('PIN: two different entries are refused',await ev("!LD.kvGet('pin')&&/do not match/.test(document.querySelector('#layer').innerText)"))
    await p.fill('#layer [name=p1]','7391');await p.fill('#layer [name=p2]','7391');await p.click('#layer [type=submit]');await p.wait_for_timeout(300)
    kp=await ev("LD.kvGet('pin')")
    ok('PIN: kv holds a salted SHA-256 hash, not the PIN',kp and sorted(kp)==['hash','n','salt'] and len(kp['hash'])==64 and '7391' not in json.dumps(kp),kp)
    exj=await ev("JSON.stringify(LD.exportAll())+JSON.stringify(state.cfg)")
    ok('PIN: not in cfg and not in LD.exportAll()',kp and kp['hash'] not in exj and kp['salt'] not in exj and '"pin"' not in exj)
    await p.reload();await ready(p)
    ok('lock: shown after reload, page behind is blurred and inert',await ev("!document.querySelector('#xlock').hidden&&document.documentElement.classList.contains('xlocked')&&document.querySelector('#root').inert&&getComputedStyle(document.querySelector('#root')).filter.includes('blur')"))
    sm=await ev(SMALL,'#xlock');ok('lock: keys and the Forgot link are at least 44 px',not sm,sm)
    async def keys(s):
        for d in s: await p.click(f'#xlock [data-xl=k][data-d="{d}"]');await p.wait_for_timeout(60)
        await p.wait_for_timeout(250)
    await keys('1111')
    ok('lock: wrong PIN stays locked and clears',await ev("XL.on&&XL.buf===''&&/Wrong PIN/.test(document.querySelector('#xlock').innerText)"))
    for _ in range(4): await keys('0000')
    ok('lock: 5 wrong in a row means a 30 s wait with the keys off',await ev("XL.on&&/Wait \\d+ s/.test(document.querySelector('#xlock').innerText)&&document.querySelector('#xlock [data-xl=k]').disabled"))
    await ev("localStorage.removeItem('ld.pinWait');lockDraw()")
    await keys('7391')
    ok('lock: right PIN unlocks',await ev("!XL.on&&document.querySelector('#xlock').hidden&&!document.documentElement.classList.contains('xlocked')&&!document.querySelector('#root').inert"))
    await ev("Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});document.dispatchEvent(new Event('visibilitychange'))")
    await ev("XL.hidAt-=30000;Object.defineProperty(document,'hidden',{configurable:true,get:()=>false});document.dispatchEvent(new Event('visibilitychange'))")
    ok('lock: back after 30 s stays open',await ev("!XL.on"))
    await ev("Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});document.dispatchEvent(new Event('visibilitychange'))")
    await ev("XL.hidAt-=61000;Object.defineProperty(document,'hidden',{configurable:true,get:()=>false});document.dispatchEvent(new Event('visibilitychange'))")
    ok('lock: back after more than 60 s locks again',await ev("XL.on"))
    ok('lock: reminders keep ticking while locked (remTick still runs)',await ev("(async()=>{try{await remTick();return true}catch(e){return false}})()"))
    await keys('7391')
    await ev("settingsSheet()");ok('settings: with a PIN, offers Change and Remove',await ev("!!document.querySelector('#layer [data-x=pinchange]')&&!!document.querySelector('#layer [data-x=pinremove]')"))
    await p.click('#layer [data-x=pinremove]');await p.wait_for_timeout(120)
    await p.fill('#layer [name=cur]','7391');await p.click('#layer [type=submit]');await p.wait_for_timeout(250)
    ok('PIN: Remove PIN turns the lock off for this device',await ev("!LD.kvGet('pin')&&!localStorage.getItem('ld.pinOn')"))
    ok('c5 page: no errors',not p.errs,p.errs[:3])
    await c.close()

    # ---------- meta/reminders written once, not rewritten after a sync round-trip
    c,p=await fresh_at(b);ev=p.evaluate
    await ev("s=>LD.importPayload(s)",seed);await p.wait_for_timeout(600)
    await ev("u=>LD.signIn(u,'pk','test@example.com','pw')",MOCK)
    for _ in range(4):
        await ev("render()");await p.wait_for_timeout(300);await ev("LD.sync()");await p.wait_for_timeout(400)
    a0=await ev("(LD.get('meta','reminders')||{}).at")
    await p.reload();await ready(p)
    for _ in range(2):
        await ev("render()");await p.wait_for_timeout(300);await ev("LD.sync()");await p.wait_for_timeout(500)
    a1=await ev("(LD.get('meta','reminders')||{}).at");st=await ev("LD.status()")
    ok('reminders: meta/reminders is not rewritten after a restart and two syncs with no change',a0 and a0==a1 and st['pending']==0,(a0,a1,st))
    ok('reminders: remPublish compares with sorted keys',('calSig(cur.s)' in await ev("remPublish.toString()")))
    await ev("LD.signOut()")
    await c.close()

asyncio.run(main())
finish()

"""Step 8: Wispr logger. Auto records are applied once, with Undo; money waits for approval; questions wait; manual records behave as before."""
import sys,os,json,asyncio
sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
from _h import *
import _h

async def fresh_at(b,iso='2026-11-30T10:00:00+05:30',w=390,h=844):
    c=await b.new_context(viewport={'width':w,'height':h},timezone_id='Asia/Kolkata')
    p=await c.new_page();p.errs=[]
    p.on('pageerror',lambda e:p.errs.append(str(e)))
    await p.clock.install(time=iso)
    await p.goto(BASE);await p.wait_for_function("window.LD&&LD.ready&&typeof remSheet==='function'");await p.wait_for_timeout(600)
    return c,p

ITEMS="""(()=>{const c=Object.keys(COURSES)[0],T='2026-11-30';
return [
 {src:'n1#0',kind:'water',ml:500,date:T},
 {src:'n1#1',kind:'meal',name:'Paneer wrap',kcal:420,p:24,c:40,f:16,date:T},
 {src:'n1#2',kind:'sets',exercise:'bench press',sets:[{w:40,r:8},{w:40,r:8},{w:40,r:7}],date:T},
 {src:'n1#3',kind:'cardio',min:20,date:T},
 {src:'n1#4',kind:'habit',key:'creatine',done:true,date:T},
 {src:'n1#5',kind:'weight',kg:68.4,date:T},
 {src:'n1#6',kind:'steps',n:8200,date:T},
 {src:'n1#7',kind:'waist',cm:80,date:T},
 {src:'n1#8',kind:'wake',time:'06:10',date:T},
 {src:'n1#9',kind:'bed',time:'23:30',date:T},
 {src:'n1#10',kind:'mood',v:4,date:T},
 {src:'n1#11',kind:'sleepQ',v:3,date:T},
 {src:'n1#12',kind:'study',min:45,course:COURSES[c],date:T},
 {src:'n1#13',kind:'cfa',min:30,date:T},
 {src:'n1#14',kind:'expense',amount:600,account:'km',category:'Food',note:'dinner',split:[{person:'Wrik',amount:200},{person:'Dia',amount:200}],date:T},
 {src:'n1#15',kind:'income',amount:1000,account:'fc',note:'tutoring',date:T},
 {src:'n1#16',kind:'repay',person:'Dia',amount:100,account:'km',date:T},
 {src:'n1#17',kind:'paid',person:'Wrik',amount:50,account:'cash',date:T},
 {src:'n1#18',kind:'poker',buyin:1000,cashout:1800,hours:3,note:'home game',date:T},
 {src:'n1#19',kind:'todo',title:'email the JSA HR',due:'2026-12-03',date:T},
 {src:'n1#20',kind:'deadline',title:'Moot memo draft',date:'2026-12-10',course:COURSES[c],k:'Submission'},
 {src:'n1#21',kind:'note',text:'Felt strong today',date:T},
 {src:'n1#22',kind:'contact',name:'Manraj sir',note:'Texted',date:T},
 {src:'n1#23',kind:'intern',firm:'JSA',matter:'Loan facility',work:'Reviewed the term sheet',learned:'Cross-default',date:T},
 {src:'n1#24',kind:'expense',amount:600,note:'paid 600 dinner',date:T},
 {src:'n1#25',kind:'ask',question:'Was the 6 PM session at the gym?',options:[{label:'Gym',item:{kind:'habit',key:'gym',done:true,date:T}},{label:'Skip',item:null}],date:T},
 {src:'n1#26',kind:'contact',name:'Zed Nobody',date:T},
 {src:'n1#27',kind:'sets',exercise:'zzz curl',sets:[{w:10,r:12}],date:T}
]})()"""
SETUP="""(()=>{saveCfg({L_contacts:[{id:'cm',name:'Manraj Sir',firm:'JSA',last:'2026-10-01',note:''}]});
dbSetDay('2026-11-30',{wake:'07:00',weight:70,habits:{creatine:false}});return 1})()"""
SNAP="""(()=>{const T='2026-11-30',d=day(T),en=state.entries;
return {water:totals(T).water,meals:en.filter(e=>e.type==='meal'&&e.date===T).length,sets:((d.lifts||{})['barbell-or-dumbbell-bench-press']||[]).length,
cardio:d.cardioMin||0,creatine:!!(d.habits||{}).creatine,weight:d.weight,steps:d.steps,waist:d.waist,wake:d.wake,bed:d.bed,mood:d.mood,sleepQ:d.sleepQ,
study:d.studyMin||0,cm:JSON.stringify(d.courseMin||{}),cfa:d.cfaMin||0,note:d.note||'',
txn:en.filter(e=>e.type==='txn'&&e.amount===600).length,owe:en.filter(e=>e.type==='owe').length,inc:en.filter(e=>e.kind==='income'&&e.amount===1000).length,
repay:en.filter(e=>e.type==='repay').length,paid:en.filter(e=>e.type==='paid').length,poker:en.filter(e=>e.type==='poker').length,
todo:state.todos.filter(t=>t.title==='email the JSA HR'&&t.due==='2026-12-03').length,dl:Object.values(state.acad).filter(a=>a.t==='Moot memo draft').length,
last:(C().L_contacts||[])[0].last,intern:(C().L_intern||[]).filter(r=>r.matter==='Loan facility').length,all:en.length,gym:!!(d.habits||{}).gym}})()"""

async def main():
    b=await _h.launch()
    c,p=await fresh_at(b);ev=p.evaluate
    await ev(SETUP)
    before=await ev(SNAP)
    items=await ev(ITEMS)
    await ev("it=>LD.write('proposals','2026-11-30-1400',{at:Date.now(),date:'2026-11-30',auto:true,run:'14:00',items:it})",items)
    await p.wait_for_timeout(1200)
    s=await ev(SNAP)
    ok('water total +500',s['water']-before['water']==500,s)
    ok('meal saved',s['meals']==1,s)
    ok('sets in the programme bench-press lift',s['sets']==3 and await ev("day('2026-11-30').lifts['barbell-or-dumbbell-bench-press'].every(x=>x.src==='n1_2'&&x.w===40)"),s)
    ok('cardio, habit, weight, steps, waist',s['cardio']==20 and s['creatine'] and s['weight']==68.4 and s['steps']==8200 and s['waist']==80,s)
    ok('wake, bed, mood, sleep quality',s['wake']=='06:10' and s['bed']=='23:30' and s['mood']==4 and s['sleepQ']==3,s)
    ok('study minutes on the day and the course; CFA minutes',s['study']==45 and '45' in s['cm'] and s['cfa']==30,s)
    ok('todo with due, deadline, note',s['todo']==1 and s['dl']==1 and 'Felt strong' in s['note'],s)
    ok('contact last updated; intern row added',s['last']=='2026-11-30' and s['intern']==1,s)
    ok('money with auto:true is NOT applied (expense, income, repay, paid, poker)',s['txn']==0 and s['owe']==0 and s['inc']==0 and s['repay']==0 and s['paid']==0 and s['poker']==0,s)
    ok('a lift or cardio item also marks that day\'s Train session done',s['gym']==True)
    ok('questions did not save anything else (ask, new contact, unknown exercise)',len(await ev("C().L_contacts"))==1)
    reg=await ev("Object.keys(LD.get('meta','wispr-applied')||{}).length")
    ok('register has the 19 applied srcs (money is not in it)',reg==19,reg)
    strip=await ev("(document.querySelector('#wispr')||{}).innerText||''")
    need=['From Wispr · 19 logged','Keep all','Water 500 ml','Bench press 40 kg × 8, 8, 7','Creatine ticked','Texted Manraj sir','Todo: Email the JSA HR, due Thu']
    ok('strip: compact lines, Keep all',all(x in strip for x in need) and 'Added from Wispr' not in strip,[x for x in need if x not in strip])
    ok('strip: a ✓ and an Undo on every line',await ev("document.querySelectorAll('#wispr .wi-li [data-x=wok]').length")==19 and await ev("document.querySelectorAll('#wispr .wi-li [data-x=wundo]').length")==19)
    ok('strip sits above the Nightly review position (first child on Today)',await ev("(()=>{const w=document.querySelector('#wispr');return !!w&&!!w.previousElementSibling&&!w.previousElementSibling.matches('#props')})()"))
    q=(await ev("(document.querySelector('#wispr-q')||{}).innerText||''")).replace('\n',' ')
    ok('To confirm card: money with Approve, Edit, Dismiss',all(x in q for x in ['To confirm','Dinner ₹600, Wrik and Dia owe ₹200 each','Income ₹1,000','Dia paid you ₹100','You paid Wrik ₹50','Poker','Approve','Edit','Dismiss']),q)
    ok('invalid expense is a question, with Edit','Couldn’t save' in q and 'which account?' in q,q)
    ok('ask shown with its buttons','Was the 6 PM session at the gym?' in q and 'Gym' in q)
    ok('9 items to confirm',(await ev("document.querySelector('#wispr-q small').textContent")).startswith('9 items'),await ev("document.querySelector('#wispr-q small').textContent"))
    ok('manual card absent for auto records',await ev("!document.querySelector('#props')"))
    # approve: applied exactly once, then gone
    await p.click('#wispr-q .wi-q:has-text("Tutoring") [data-x=wapprove]');await p.wait_for_timeout(500)
    ok('Approve applies the income once',(await ev(SNAP))['inc']==1)
    ok('approved item disappears at once and is recorded (ok) in the register, not in the strip',await ev("!/Tutoring/.test(document.querySelector('#wispr-q').innerText)&&!/Tutoring/.test(document.querySelector('#wispr').innerText)&&Object.values(LD.get('meta','wispr-applied')).some(r=>r.ok&&r.approved&&r.it.kind==='income')"))
    # exactly once: second device = empty local state, rerun; duplicate record with a new id
    snap1=await ev(SNAP)
    await ev("(()=>{const l=LD.list('proposals');XS.props=[];wlRun();XS.props=l;wlRun()})()")
    await ev("it=>LD.write('proposals','2026-11-30-1401',{at:Date.now(),date:'2026-11-30',auto:true,run:'14:00',items:it})",items)
    await p.wait_for_timeout(800);await ev("wlRun()")
    ok('same record again and a duplicate record with another id add nothing',await ev(SNAP)==snap1,await ev(SNAP))
    ok('duplicate src is one question, not two',await ev("wlQuestions().length")==8)
    # dismiss
    await p.click('#wispr-q .wi-q:has-text("Poker") [data-x=wskip]');await p.wait_for_timeout(400)
    ok('Dismiss removes it without applying and records skipped',(await ev(SNAP))['poker']==0 and await ev("!/Poker/.test(document.querySelector('#wispr-q').innerText)&&Object.values(LD.get('meta','wispr-applied')).some(r=>r.skipped)"))
    # edit a money item: amount and split change before applying
    await p.click('#wispr-q .wi-q:has-text("Wrik and Dia") [data-x=wedit]');await p.wait_for_timeout(300)
    ok('Edit sheet has amount, account, category, note and split rows',await ev("['amount','account','category','note','sp0n','sp0a','sp1n','sp1a'].every(n=>!!document.querySelector('#layer [name='+n+']'))"))
    await p.fill('#layer input[name=amount]','900');await p.fill('#layer input[name=sp0a]','300');await p.fill('#layer input[name=sp1a]','300')
    await p.click('#layer button[type=submit]');await p.wait_for_timeout(500)
    ok('Edit changes the amount and split before applying, once',await ev("(()=>{const e=state.entries.filter(x=>x.type==='txn'&&x.amount===900);return e.length===1&&e[0].mine===300&&e[0].account==='km'&&state.entries.filter(x=>x.type==='owe'&&x.src===e[0].id&&x.amount===300).length===2&&!state.entries.some(x=>x.type==='txn'&&x.amount===600)})()"))
    ok('edited item is gone from To confirm',await ev("!/Wrik and Dia/.test(document.querySelector('#wispr-q').innerText)&&!/Wrik and Dia/.test((document.querySelector('#wispr')||{innerText:''}).innerText)"))
    # undo reverses
    await p.click('#wispr .wi-li:has-text("Bench press") [data-x=wundo]');await p.wait_for_timeout(500)
    ok('Undo reverses the sets',(await ev(SNAP))['sets']==0)
    await p.click('#wispr .wi-li:has-text("Cardio") [data-x=wundo]');await p.wait_for_timeout(500)
    ok('Undo cardio reverses minutes and the Train tick',(await ev(SNAP))['cardio']==0 and (await ev(SNAP))['gym']==False)
    # confirm one; persisted
    await p.click('#wispr .wi-li:has-text("Water") [data-x=wok]');await p.wait_for_timeout(400)
    ok('tick hides that line, keeps the data, stores ok in the register',await ev("!/Water 500/.test(document.querySelector('#wispr').innerText)&&(await_ok=Object.values(LD.get('meta','wispr-applied')).some(r=>r.ok&&r.it.kind==='water'))")and (await ev(SNAP))['water']-before['water']==500)
    await p.reload();await p.wait_for_function("window.LD&&LD.ready&&typeof remSheet==='function'");await p.wait_for_timeout(3800)
    ok('after a reload the ticked line stays hidden and undone items are not re-applied',await ev("!/Water 500/.test((document.querySelector('#wispr')||{innerText:''}).innerText)")and (await ev(SNAP))['sets']==0 and (await ev(SNAP))['cardio']==0)
    for _ in range(30):
        if not await p.query_selector('#wispr .wi-li [data-x=wundo]'):break
        await p.click('#wispr .wi-li [data-x=wundo]');await p.wait_for_timeout(250)
    s=await ev(SNAP)
    ok('undoing the rest reverts entries and day fields (the ticked water stays)',s['water']-before['water']==500 and s['meals']==0 and s['wake']=='07:00' and s['weight']==70 and s['creatine']==False and s['study']==0 and s['cfa']==0 and s['steps'] is None and 'Felt' not in s['note'] and s['todo']==0 and s['dl']==0 and s['last']=='2026-10-01' and s['intern']==0 and s['gym']==False,s)
    ok('strip is absent when nothing is unconfirmed',await ev("!document.querySelector('#wispr')"))
    # invalid expense: Edit, pick the account; applies and goes away
    await p.click('#wispr-q .wi-q:has-text("which account") [data-x=wedit]');await p.wait_for_timeout(300)
    ok('Edit opens the sheet with a reason',await ev("!!document.querySelector('#layer select[name=account]')&&/which account/.test(document.querySelector('#layer').textContent)"))
    await p.select_option('#layer select[name=account]','km');await p.click('#layer button[type=submit]');await p.wait_for_timeout(500)
    ok('edited expense saved once with the chosen account',await ev("state.entries.filter(e=>e.type==='txn'&&e.amount===600&&e.account==='km').length")==1)
    # ask with a non-money option: applied, shown in the strip
    await p.click('#wispr-q [data-x=wopt][data-o="0"]:has-text("Gym")');await p.wait_for_timeout(500)
    ok('ask option applies its item and shows in the strip',(await ev(SNAP))['gym']==True and 'Gym: workout done' in await ev("document.querySelector('#wispr').innerText"))
    t=await ev("document.querySelector('#wispr-q').innerText")
    ok('unknown exercise and unknown contact are questions','Which exercise is "zzz curl"?' in t and 'Add Zed Nobody as a contact?' in t,t)
    await p.click('#wispr-q [data-x=wopt]:has-text("Add")');await p.wait_for_timeout(500)
    ok('Add creates the contact with last = the day',await ev("(C().L_contacts||[]).some(x=>x.name==='Zed Nobody'&&x.last==='2026-11-30')"))
    await p.click('#wispr-q .wi-q:has-text("zzz curl") [data-x=wopt]:has-text("Skip")');await p.wait_for_timeout(400)
    ok('Skip resolves a question for good; only the two money items remain',await ev("wlQuestions().length")==2)
    # money hide
    await ev("state.moneyHide=true;render()");await p.wait_for_timeout(300)
    mt=await ev("document.querySelector('#wispr-q').innerText")
    ok('money hidden on the card','₹ ••••' in mt and '₹100' not in mt)
    await ev("state.moneyHide=false;render()")
    # a money ask: tapping an option is the approval
    await ev("LD.write('proposals','2026-11-30-1500',{at:Date.now(),date:'2026-11-30',auto:true,items:[{src:'m1#0',kind:'ask',question:'Was dinner shared?',options:[{label:'Alone 400',item:{kind:'expense',amount:400,account:'cash',category:'Food',note:'dinner solo',date:'2026-11-30'}},{label:'Skip',item:null}]}]})");await p.wait_for_timeout(900)
    ok('a money ask is not applied by itself',await ev("!state.entries.some(e=>e.amount===400)&&/Was dinner shared/.test(document.querySelector('#wispr-q').innerText)"))
    await p.click('#wispr-q [data-x=wopt]:has-text("Alone 400")');await p.wait_for_timeout(500)
    ok('tapping the money option approves it: applied once and gone',await ev("state.entries.filter(e=>e.amount===400&&e.type==='txn').length")==1 and await ev("!/Was dinner shared/.test((document.querySelector('#wispr-q')||{innerText:''}).innerText)"))
    # manual records behave as before
    await ev("LD.write('proposals','p9',{at:Date.now(),items:[{kind:'todo',title:'Manual one'}]})");await p.wait_for_timeout(500)
    ok('auto:false record shows in Nightly review and is not applied',await ev("!!document.querySelector('#props [data-x=propok]')&&!state.todos.some(t=>t.title==='Manual one')"))
    await p.click('#props [data-x=propok]');await p.wait_for_timeout(400)
    ok('manual approve still applies and the item disappears',await ev("state.todos.some(t=>t.title==='Manual one')&&!document.querySelector('#props')"))
    await ev("LD.write('proposals','p10',{at:Date.now(),items:[{kind:'todo',title:'Manual two'}]})");await p.wait_for_timeout(500)
    await p.click('#props [data-x=propno]');await p.wait_for_timeout(400)
    ok('manual dismiss removes it without applying',await ev("!state.todos.some(t=>t.title==='Manual two')&&!document.querySelector('#props')"))
    # the Drive inbox script passes only date and items: auto marked on items must still auto-apply
    await ev("LD.write('proposals','2026-11-30-9zz',{at:Date.now(),date:'2026-11-30',items:[{kind:'todo',title:'Item-level auto todo',auto:true,src:'drive#1',date:'2026-11-30'}]})");await p.wait_for_timeout(800)
    ok('record with auto only on its items is applied without a tap',await ev("state.todos.some(t=>t.title==='Item-level auto todo')&&!document.querySelector('#props [data-x=propok]')"))
    # agent status
    await ev("settingsSheet()");await p.click('[data-x=agents]');await p.wait_for_timeout(300)
    row=await ev("document.querySelector('[data-agent=nightly]').textContent")
    ok('agent row is Wispr logger with "N saved, M need you"',row.startswith('Wispr logger') and 'saved,' in row and 'need you' in row,row)
    ok('no page errors, no overflow at 390',not p.errs and await ev("document.documentElement.scrollWidth")==390,p.errs)
    await c.close()

    # ---- second scenario: habits, gym, strip behaviour ----
    c,p=await fresh_at(b);ev=p.evaluate
    await ev("dbSetDay('2026-11-30',{habits:{creatine:false,gym:false}});dbSetDay('2026-11-29',{habits:{}})")
    T="2026-11-30"
    await ev("it=>LD.write('proposals','2026-11-30-1400',{at:Date.now(),date:'2026-11-30',auto:true,items:it})",[
      {'src':'h#0','kind':'habit','key':'creatine','done':True,'date':T},
      {'src':'h#1','kind':'habit','key':'Creatine 5 g','done':True,'date':'2026-11-29'},
      {'src':'h#2','kind':'habit','key':'no alcohol','done':True,'date':T},
      {'src':'h#3','kind':'habit','key':'zzz','done':True,'date':T},
      {'src':'h#4','kind':'habit','key':'gym','done':True,'date':T},
      {'src':'h#5','kind':'water','ml':500,'date':T}])
    await p.wait_for_timeout(1200)
    ok('habit key creatine ticks the creatine habit (Creatine 5 g)',await ev("!!day('2026-11-30').habits.creatine&&habits('2026-11-30').items.find(i=>i.k==='creatine').done"))
    ok('habit matched by name ("Creatine 5 g") ticks it on its own day',await ev("!!day('2026-11-29').habits.creatine"))
    ok('habit matched by label ("no alcohol") ticks alcohol',await ev("!!day('2026-11-30').habits.alcohol"))
    ok('an unknown habit becomes a question, not dropped',await ev("/Which habit is \"zzz\"/.test(document.querySelector('#wispr-q').innerText)&&!Object.values(day('2026-11-30').habits).some(v=>v&&false)"))
    ok('habit gym done:true marks the session done in Train',await ev("!!day('2026-11-30').habits.gym"))
    await ev("state.view='train';state.date='2026-11-30';render()");await p.wait_for_timeout(400)
    ok('Train shows Session marked done',await ev("/Session marked done/.test(document.body.innerText)"))
    await ev("state.view='today';render()");await p.wait_for_timeout(300)
    st=await ev("document.querySelector('#wispr').innerText")
    ok('strip lines: Creatine ticked · 29 Nov, Gym: workout done, Water 500 ml',all(x in st for x in ['Creatine ticked · 29 Nov','Gym: workout done','Water 500 ml','From Wispr · 5 logged']),st)
    await p.click('#wispr .wi-li:has-text("Gym: workout done") [data-x=wundo]');await p.wait_for_timeout(500)
    ok('Undo of gym clears the Train session',await ev("!day('2026-11-30').habits.gym"))
    await ev("state.view='train';render()");await p.wait_for_timeout(400)
    ok('Train is back to Mark session done',await ev("/Mark session done/.test(document.body.innerText)"))
    await ev("state.view='today';render()");await p.wait_for_timeout(300)
    await p.click('#wispr .wi-li:has-text("Water") [data-x=wok]');await p.wait_for_timeout(400)
    ok('a tick hides one line (3 left)',await ev("/From Wispr · 3 logged/.test(document.querySelector('#wispr').innerText)"))
    # auto-confirm after 3 days
    await ev("(()=>{const r=LD.get('meta','wispr-applied'),k=Object.keys(r).find(x=>r[x].it&&r[x].it.key==='alcohol');LD.write('meta','wispr-applied',{...r,[k]:{...r[k],at:Date.now()-4*864e5}});scheduleRender()})()");await p.wait_for_timeout(500)
    ok('an item older than 3 days is auto-confirmed (2 left)',await ev("/From Wispr · 2 logged/.test(document.querySelector('#wispr').innerText)"))
    await p.click('#wispr [data-x=wokall]');await p.wait_for_timeout(500)
    ok('Keep all hides the strip, data stays',await ev("!document.querySelector('#wispr')&&!!day('2026-11-30').habits.creatine&&Object.values(LD.get('meta','wispr-applied')).filter(r=>r.ok).length>=3"))
    await p.reload();await p.wait_for_function("window.LD&&LD.ready&&typeof remSheet==='function'");await p.wait_for_timeout(3800)
    ok('strip stays hidden after a reload; the unknown habit still waits',await ev("!document.querySelector('#wispr')&&!!document.querySelector('#wispr-q')&&!day('2026-11-30').habits.gym"))
    await p.click('#wispr-q [data-x=wopt]:has-text("Mobility")');await p.wait_for_timeout(500)
    ok('picking a habit for the question ticks it',await ev("!!day('2026-11-30').habits.mobility"))
    await ev("state.view='today';render()");await p.wait_for_timeout(300)
    await p.screenshot(path='screenshots/wispr2-strip.png') if False else None
    ok('no page errors (habits scenario)',not p.errs,p.errs)
    await c.close()

    # ---- screenshots at 390: strip + money to confirm ----
    c,p=await fresh_at(b);ev=p.evaluate
    await ev(SETUP);items=await ev(ITEMS)
    await ev("it=>LD.write('proposals','2026-11-30-1400',{at:Date.now(),date:'2026-11-30',auto:true,items:it.slice(0,6).concat(it.slice(14,16),it.slice(18,19))})",items);await p.wait_for_timeout(1500)
    os.makedirs('screenshots',exist_ok=True)
    await p.evaluate("window.scrollTo(0,0)")
    await p.screenshot(path='screenshots/wispr2-today.png')
    await p.evaluate("document.querySelector('#wispr').scrollIntoView()");await p.wait_for_timeout(200)
    await p.screenshot(path='screenshots/wispr2-strip.png')
    await p.evaluate("document.querySelector('#wispr-q').scrollIntoView()");await p.wait_for_timeout(200)
    await p.screenshot(path='screenshots/wispr2-confirm.png')
    await p.click('#wispr-q .wi-q [data-x=wedit]');await p.wait_for_timeout(400)
    await p.screenshot(path='screenshots/wispr2-edit.png')
    await c.close()

    # a device that lost the register (or never synced it): idempotent writes still add nothing
    c,p=await fresh_at(b);ev=p.evaluate
    await ev(SETUP);items=await ev(ITEMS)
    await ev("it=>LD.write('proposals','2026-11-30-1400',{at:Date.now(),date:'2026-11-30',auto:true,items:it})",items);await p.wait_for_timeout(1200)
    snap1=await ev(SNAP)
    await ev("LD.remove('meta','wispr-applied')");await p.wait_for_timeout(200);await ev("wlRun()");await p.wait_for_timeout(300)
    ok('register lost: re-applying adds nothing (ids from src, sets and day increments keyed by src)',await ev(SNAP)==snap1,await ev(SNAP))
    ok('no page errors (second device)',not p.errs,p.errs)
    await c.close()
    await b.close();await _h.close()
    finish()
asyncio.run(main())

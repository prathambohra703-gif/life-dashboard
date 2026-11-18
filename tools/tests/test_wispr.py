"""Step 8: Wispr logger. Auto records are applied once, with Undo; questions wait; manual records behave as before."""
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
    ok('expense parent with two owe children',s['txn']==1 and s['owe']==2 and await ev("(()=>{const p=state.entries.find(e=>e.type==='txn'&&e.amount===600);return p.account==='km'&&p.mine===200&&state.entries.filter(e=>e.type==='owe'&&e.src===p.id).map(e=>e.person).sort().join()==='Dia,Wrik'&&/^w_/.test(p.id)})()"),s)
    ok('income, repay, paid, poker',s['inc']==1 and s['repay']==1 and s['paid']==1 and s['poker']==1,s)
    ok('todo with due, deadline, note',s['todo']==1 and s['dl']==1 and 'Felt strong' in s['note'],s)
    ok('contact last updated; intern row added',s['last']=='2026-11-30' and s['intern']==1,s)
    ok('questions did not save anything (invalid expense, ask, new contact, unknown exercise)',s['gym']==False and s['txn']==1 and len(await ev("C().L_contacts"))==1)
    reg=await ev("Object.keys(LD.get('meta','wispr-applied')||{}).length")
    ok('register has the 24 applied srcs',reg==24,reg)
    card=await ev("(document.querySelector('#wispr')||{}).textContent||''")
    cardU=card
    ok('card: Added from Wispr, Saved, Needs you, Undo all',all(x in card for x in ['Added from Wispr','Saved','Needs you','Undo all','Water 500 ml','Bench press 40 kg × 8, 8, 7','Dinner ₹600, Wrik and Dia owe ₹200 each','Texted Manraj sir','Todo: Email the JSA HR, due Thu']),[x for x in ['Added from Wispr','Saved','Needs you','Undo all','Water 500 ml','Bench press 40 kg × 8, 8, 7','Dinner ₹600, Wrik and Dia owe ₹200 each','Texted Manraj sir','Todo: Email the JSA HR, due Thu'] if x not in card])
    ok('card sits above the Nightly review position (first child on Today)',await ev("(()=>{const w=document.querySelector('#wispr');return !!w&&!!w.previousElementSibling&&!w.previousElementSibling.matches('#props')})()"))
    ok('invalid expense is a question, with Edit',"Couldn’t save: ‘Paid 600 dinner ₹600’" in card.replace('\n',' ') or ('Couldn’t save' in card and 'which account?' in card),card[-500:])
    ok('ask shown with its buttons','Was the 6 PM session at the gym?' in card and 'Gym' in card)
    ok('4 questions and 24 saved in the heading',await ev("document.querySelector('#wispr small').textContent")=='24 saved · 4 need you',await ev("document.querySelector('#wispr small').textContent"))
    ok('manual card absent for auto records',await ev("!document.querySelector('#props')"))
    # exactly once: second device = empty local state, rerun; second record with a new id; wiped register
    snap1=await ev(SNAP)
    await ev("(()=>{const l=LD.list('proposals');XS.props=[];wlRun();XS.props=l;wlRun()})()")
    await ev("it=>LD.write('proposals','2026-11-30-1401',{at:Date.now(),date:'2026-11-30',auto:true,run:'14:00',items:it})",items)
    await p.wait_for_timeout(800);await ev("wlRun()")
    ok('same record again and a duplicate record with another id add nothing',await ev(SNAP)==snap1,await ev(SNAP))
    ok('duplicate src is one question, not two',await ev("wlQuestions().length")==4)
    # undo the expense
    await p.click('#wispr .wi-li:has-text("Dinner") [data-x=wundo]');await p.wait_for_timeout(500)
    s=await ev(SNAP)
    ok('undo expense removes parent and children',s['txn']==0 and s['owe']==0 and s['all']==snap1['all']-3,s)
    ok('undone expense is not re-applied',(await ev("wlRun(),1")) and (await ev(SNAP))['txn']==0)
    await p.click('#wispr [data-x=wundoall]');await p.wait_for_timeout(600)
    s=await ev(SNAP)
    ok('undo all reverts entries',s['all']==before['all'] and s['water']==before['water'] and s['poker']==0 and s['inc']==0 and s['meals']==0,s)
    ok('undo all reverts sets and restores previous day fields',s['sets']==0 and s['wake']=='07:00' and s['weight']==70 and s['creatine']==False and s['cardio']==0 and s['study']==0 and s['cfa']==0 and s['steps'] is None and 'Felt' not in s['note'],s)
    ok('undo all reverts todo, deadline, contact, intern',s['todo']==0 and s['dl']==0 and s['last']=='2026-10-01' and s['intern']==0,s)
    ok('card now shows only the questions',await ev("document.querySelector('#wispr small').textContent")=='0 saved · 4 need you')
    await p.reload();await p.wait_for_function("window.LD&&LD.ready&&typeof remSheet==='function'");await p.wait_for_timeout(3800)
    ok('a reload does not re-apply undone items',await ev(SNAP)==s,await ev(SNAP))
    # invalid expense: Edit, pick the account
    await p.click('#wispr [data-x=wedit]');await p.wait_for_timeout(300)
    ok('Edit opens the existing-style sheet with a reason',await ev("!!document.querySelector('#layer select[name=account]')&&/which account/.test(document.querySelector('#layer').textContent)"))
    await p.select_option('#layer select[name=account]','km');await p.click('#layer button[type=submit]');await p.wait_for_timeout(500)
    ok('edited expense saved once with the chosen account',await ev("state.entries.filter(e=>e.type==='txn'&&e.amount===600&&e.account==='km').length")==1)
    # ask: tap the option
    await p.click('#wispr [data-x=wopt][data-o="0"]:has-text("Gym")');await p.wait_for_timeout(500)
    ok('ask option applies its item',(await ev(SNAP))['gym']==True)
    # unknown exercise question offers today\'s exercises; adding a contact
    t=await ev("document.querySelector('#wispr').innerText")
    ok('unknown exercise and unknown contact are questions','Which exercise is "zzz curl"?' in t and 'Add Zed Nobody as a contact?' in t,t)
    await p.click('#wispr [data-x=wopt]:has-text("Add")');await p.wait_for_timeout(500)
    ok('Add creates the contact with last = the day',await ev("(C().L_contacts||[]).some(x=>x.name==='Zed Nobody'&&x.last==='2026-11-30')"))
    await p.click('#wispr .wi-q:has-text("zzz curl") [data-x=wopt]:has-text("Skip")');await p.wait_for_timeout(400)
    ok('Skip resolves a question for good',await ev("wlQuestions().length")==0)
    # money hide
    await ev("state.moneyHide=true;render()");await p.wait_for_timeout(300)
    ok('money hidden on the card','₹ ••••' in await ev("document.querySelector('#wispr').innerText") and '₹600' not in await ev("document.querySelector('#wispr').innerText"))
    await ev("state.moneyHide=false;render()")
    # manual records behave as before
    await ev("LD.write('proposals','p9',{at:Date.now(),items:[{kind:'todo',title:'Manual one'}]})");await p.wait_for_timeout(500)
    ok('auto:false record shows in Nightly review and is not applied',await ev("!!document.querySelector('#props [data-x=propok]')&&!state.todos.some(t=>t.title==='Manual one')"))
    await p.click('#props [data-x=propok]');await p.wait_for_timeout(400)
    ok('manual approve still applies',await ev("state.todos.some(t=>t.title==='Manual one')"))
    # the Drive inbox script passes only date and items: auto marked on items must still auto-apply
    await ev("LD.write('proposals','2026-11-30-9zz',{at:Date.now(),date:'2026-11-30',items:[{kind:'todo',title:'Item-level auto todo',auto:true,src:'drive#1',date:'2026-11-30'}]})");await p.wait_for_timeout(800)
    ok('record with auto only on its items is applied without a tap',await ev("state.todos.some(t=>t.title==='Item-level auto todo')&&!document.querySelector('#props [data-x=propok]')"))
    # agent status
    await ev("settingsSheet()");await p.click('[data-x=agents]');await p.wait_for_timeout(300)
    row=await ev("document.querySelector('[data-agent=nightly]').textContent")
    ok('agent row is Wispr logger with "N saved, M need you"',row.startswith('Wispr logger') and 'saved,' in row and 'need you' in row,row)
    ok('no page errors, no overflow at 390',not p.errs and await ev("document.documentElement.scrollWidth")==390,p.errs)
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

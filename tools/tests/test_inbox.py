"""Step 2: suggestion inbox (edit, approve all, dismiss all, topic and case kinds), agent status panel, continue-the-cut card."""
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

SEED="""(()=>{const c=Object.keys(COURSES)[0];
LD.write('proposals','p1',{at:Date.now()-3600e3,items:[
 {kind:'todo',title:'Email Prof. Rao',pri:'high',q:'q1',why:'asked in class'},
 {kind:'deadline',title:'Moot memo draft',date:'2026-12-10',k:'Submission',course:COURSES[c],why:'on the calendar'},
 {kind:'log',cmd:'spent 120 on lunch',why:'receipt'},
 {kind:'note',text:'Call the library about the reserve copy',why:'said aloud'},
 {kind:'topic',course:COURSES[c],t:'Winding up grounds',why:'lecture 4'},
 {kind:'case',course:COURSES[c],name:'Salomon v Salomon',point:'Separate legal personality',topic:'Winding up grounds',why:'lecture 4'}]});return c})()"""
OPEN="(()=>{const o=[];LD.list('proposals').forEach(p=>(p.items||[]).forEach(i=>{if(!i.status)o.push(i.kind)}));return o})()"
STAT="LD.list('proposals').flatMap(p=>p.items.map(i=>i.status||'open'))"

async def main():
    b=await _h.launch()
    c,p=await fresh_at(b);ev=p.evaluate
    cid=await ev(SEED);await p.wait_for_timeout(500)
    ok('card shows 6 suggestions with labels',await ev("document.querySelector('#props small').textContent.startsWith('6 suggestions')") and 'Add a topic' in await ev("document.querySelector('#props').textContent") and 'Add a case' in await ev("document.querySelector('#props').textContent"))
    ok('Approve all and Dismiss all are on the card',await ev("!!document.querySelector('[data-x=propall]')&&!!document.querySelector('[data-x=propnoall]')"))
    # edit a todo
    await p.click('#props [data-x=propedit][data-i="0"]');await p.wait_for_timeout(200)
    ok('edit sheet prefilled',await ev("document.querySelector('#layer input[name=title]').value")=='Email Prof. Rao')
    await p.fill('#layer input[name=title]','Email Prof. Rao about the viva');await p.click('#layer button[type=submit]');await p.wait_for_timeout(400)
    ok('edited todo saved with edited title',await ev("state.todos.some(t=>t.title==='Email Prof. Rao about the viva')"))
    ok('proposal keeps approved + edited:true',await ev("(()=>{const i=LD.get('proposals','p1').items[0];return i.status==='approved'&&i.edited===true&&i.title==='Email Prof. Rao about the viva'})()"))
    # approve all
    ntodo0=await ev("state.todos.length")
    await p.click('[data-x=propall]');await p.wait_for_timeout(500)
    r=await ev("({todos:state.todos.length,acad:Object.values(state.acad).filter(a=>a.t==='Moot memo draft').length,note:(day(state.date).note||'').includes('reserve copy'),topics:(C().revise||{})['"+cid+"']&&C().revise['"+cid+"'].topics.map(t=>t.t),cases:((C().revise||{})['"+cid+"']||{}).cases,pend:state.chat.pending.length,logsaved:state.entries.some(e=>/lunch/i.test(e.name||e.note||''))})")
    ok('approve all: deadline and note',r['acad']==1 and r['note'],r)
    ok('approve all: topic and linked case',r['topics']==['Winding up grounds'] and len(r['cases'])==1 and r['cases'][0]['name']=='Salomon v Salomon' and bool(r['cases'][0].get('topicId')),r)
    ok('approve all: log is a pending card, not saved',r['pend']==1 and not r['logsaved'],r)
    ok('all items approved',await ev(STAT)==['approved']*6,await ev(STAT))
    ok('card gone after approval',await ev("!document.querySelector('#props')"))
    # undo
    await p.click('#toast [data-act=toastundo]');await p.wait_for_timeout(500)
    r=await ev("({acad:Object.values(state.acad).filter(a=>a.t==='Moot memo draft').length,note:(day(state.date).note||'').includes('reserve copy'),rv:((C().revise||{})['"+cid+"']||{}),pend:state.chat.pending.length,viva:state.todos.some(t=>t.title==='Email Prof. Rao about the viva')})")
    ok('undo removes deadline, note, topic, case, pending log',r['acad']==0 and not r['note'] and not (r['rv'].get('topics') or []) and not (r['rv'].get('cases') or []) and r['pend']==0,r)
    ok('undo: items open again (the edited one stays approved)',await ev(STAT)==['approved']+['open']*5,await ev(STAT))
    # dismiss all
    await p.wait_for_timeout(300)
    await p.click('[data-x=propnoall]');await p.wait_for_timeout(400)
    ok('dismiss all marks the rest dismissed',await ev(STAT)==['approved']+['dismissed']*5,await ev(STAT))
    # unmatched course opens edit
    await ev("LD.write('proposals','p2',{at:Date.now(),items:[{kind:'topic',course:'Astro-physics',t:'Black holes'}]})");await p.wait_for_timeout(400)
    await p.click('#props [data-x=propok]');await p.wait_for_timeout(300)
    ok('unmatched course opens the Edit sheet',await ev("!!document.querySelector('#layer select[name=course]')&&/match that course/.test(document.querySelector('#layer').textContent)"))
    ok('nothing was added yet',await ev("!JSON.stringify(C().revise||{}).includes('Black holes')"))
    await ev("document.querySelector('#layer select[name=course]').value='"+cid+"'")
    await p.click('#layer button[type=submit]');await p.wait_for_timeout(400)
    ok('picked course then topic added',await ev("JSON.stringify(C().revise['"+cid+"'].topics).includes('Black holes')"))
    # validation
    await ev("LD.write('proposals','p3',{at:Date.now(),items:[{kind:'deadline',title:'Bad',date:'2026-13-45'},{kind:'todo',title:'  '},{kind:'zap',text:'x'}]})");await p.wait_for_timeout(400)
    msgs=[]
    for k in range(3):
        await p.click(f'#props [data-x=propok][data-id=p3][data-i="{k}"]');await p.wait_for_timeout(150);msgs.append(await ev("document.querySelector('#toast').textContent"))
    ok('bad date, empty title, unknown kind refused',msgs[0].startswith('That deadline needs')and msgs[1].startswith('That suggestion has no title') and msgs[2].startswith('Unknown'),msgs)
    ok('refused items stay open',await ev("LD.get('proposals','p3').items.every(i=>!i.status)"))
    # edited log goes to dock pending
    await ev("LD.write('proposals','p4',{at:Date.now(),items:[{kind:'log',cmd:'spent 50 on tea'}]})");await p.wait_for_timeout(400)
    await p.click('#props [data-x=propedit][data-id=p4]');await p.fill('#layer textarea[name=cmd]','spent 80 on tea');await p.click('#layer button[type=submit]');await p.wait_for_timeout(400)
    ok('edited log lands in the dock as pending, unsaved',await ev("state.chat.pending.length===1&&!state.entries.some(e=>/tea/i.test(JSON.stringify(e)))"))
    ok('no page errors, no overflow at 390',not p.errs and await ev("document.documentElement.scrollWidth")==390,p.errs)
    await c.close()

    # ---------- agent status
    c,p=await fresh_at(b);ev=p.evaluate
    now=await ev("Date.now()")
    await ev("settingsSheet()");await p.click('[data-x=agents]');await p.wait_for_timeout(300)
    row=lambda k:"(()=>{const r=document.querySelector('[data-agent="+k+"]');return r?r.textContent:''})()"
    order=await ev("[...document.querySelectorAll('.ag-li b')].map(x=>x.textContent)")
    ok('agents listed in order',order==['Wispr logger','Morning paper','Daily backup','Calendar feed','Health check','Sunday review prep','Month-end report','CFA coach','Journal scout','Semester Scribe','Outlook check'],order)
    ok('health: Never run with no record',(await ev(row('health'))).endswith('Never run'))
    ok('no dot with no problems',await ev("!document.querySelector('[data-act=settings]').classList.contains('agdot')"))
    await ev("LD.write('meta','agent-health',{at:Date.now(),ok:true,summary:'All good',detail:'Sync fine.'})");await p.wait_for_timeout(300)
    await ev("agentSheet()")
    t=await ev(row('health'));ok('health: Worked with summary',t.endswith('Worked') and 'All good' in t,t)
    await p.click('[data-agent=health] .ag-row');await p.wait_for_timeout(150)
    ok('tap shows detail',await ev("document.querySelector('[data-agent=health] .ag-detail').textContent")=='Sync fine.')
    ok('gear has no dot when all worked',await ev("!document.querySelector('[data-act=settings]').classList.contains('agdot')"))
    await ev("XS.agentOpen='';LD.write('meta','agent-health',{at:Date.now(),ok:false,summary:'Backup missing'})");await p.wait_for_timeout(400)
    await ev("agentSheet()")
    t=await ev(row('health'));ok('health ok:false is Problem',t.endswith('Problem'),t)
    ok('gear dot shows on Problem',await ev("document.querySelector('[data-act=settings]').classList.contains('agdot')"))
    await ev("LD.write('meta','agent-health',{at:Date.now(),ok:true,summary:'fine'});LD.write('meta','agent-scribe',{at:Date.now()-40*3600e3,ok:true,summary:'old'})");await p.wait_for_timeout(400)
    await ev("agentSheet()")
    ok('daily agent 40 h ago is Problem',(await ev(row('scribe'))).endswith('Problem'))
    ok('gear dot on for stale agent',await ev("document.querySelector('[data-act=settings]').classList.contains('agdot')"))
    await ev("LD.write('meta','agent-scribe',{at:Date.now()-2*3600e3,ok:true,summary:'fine'});LD.write('meta','backup',{at:Date.now()-3*3600e3,file:'b.json',records:812})");await p.wait_for_timeout(400)
    await ev("agentSheet()")
    t=await ev(row('backup'));ok('backup shows file, records, 3 h ago, Worked',all(x in t for x in ['b.json','812','3 h ago','Worked']),t)
    ok('gear dot clears',await ev("!document.querySelector('[data-act=settings]').classList.contains('agdot')"))
    ok('agent sheet fits at 390',await ev("document.documentElement.scrollWidth")==390 and await ev("document.querySelector('#layer .card').scrollWidth<=document.querySelector('#layer .card').clientWidth+1"))
    ok('Settings has an Agents group',await ev("(settingsSheet(),/Agents/.test(document.querySelector('#layer').textContent))"))
    ok('no page errors',not p.errs,p.errs)
    await c.close()

    # ---------- continue the cut
    tg=lambda: "document.querySelector('#cutcard')"
    c,p=await fresh_at(b,'2027-01-31T10:00:00+05:30');ev=p.evaluate
    ok('cut card hidden on 2027-01-31',await ev("!"+tg()))
    await c.close()
    for btn,want,kc in [('cutcont','cut',2050),('cutmaint','maint',2500)]:
        c,p=await fresh_at(b,'2027-02-01T10:00:00+05:30');ev=p.evaluate
        ok('cut card shows on 2027-02-01',await ev("!!"+tg()) and 'Continue at 2,050 kcal' in await ev(tg()+".textContent") and 'Stay at maintenance' in await ev(tg()+".textContent"))
        ok('until chosen: 2,050',await ev("C().targets.kcal")==2050,await ev("C().targets.kcal"))
        await p.click(f'#cutcard [data-x={btn}]');await p.wait_for_timeout(500)
        ok(f'{btn} saves cfg.program.after',await ev("C().program.after")==want)
        ok(f'{btn}: kcal target {kc}, protein 150',await ev("[C().targets.kcal,C().targets.protein]")==[kc,150],await ev("C().targets"))
        ok(f'{btn}: card gone',await ev("!"+tg()))
        ok('no page errors',not p.errs,p.errs)
        await c.close()
    await b.close();await _h.close();finish()
asyncio.run(main())

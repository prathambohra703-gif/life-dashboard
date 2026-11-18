"""Step 5: Study > Notes (cloud notes, safe Markdown reader), `course` suggestions, semester rollover wizard."""
import sys,os,json,asyncio
sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
from _h import *
import _h

async def fresh_at(b,iso='2027-02-10T10:00:00+05:30',w=390,h=844):
    c=await b.new_context(viewport={'width':w,'height':h},timezone_id='Asia/Kolkata')
    p=await c.new_page();p.errs=[];p.dialogs=[]
    p.on('pageerror',lambda e:p.errs.append(str(e)))
    async def dlg(d):
        p.dialogs.append(d.message);await d.dismiss()
    p.on('dialog',dlg)
    await p.clock.install(time=iso)
    await p.goto(BASE);await p.wait_for_function("window.LD&&LD.ready&&typeof remSheet==='function'");await p.wait_for_timeout(600)
    return c,p

LEG='<span style="color:#3b82f6">blue</span>'
LEC="""# Sample takeover triggers

## 1 Trigger

Plain text with <span style="color:#22a35a">**green law text**</span> and *italic* and a [[1 Sample Takeover module]] link.

| Source | Colour |
|---|---|
| Recording | <span style="color:#3b82f6">blue words</span> |
| A very long cell that should scroll inside the table and never push the page sideways at all | 123456789012345678901234567890 |

| A | B | C | D | E | F |
|---|---|---|---|---|---|
| 1 | 2 | 3 | 4 | 5 | 6 |

- item one
- item two
  - nested

> quoted

`inline code` and a wikilink to [[Missing note]].

<script>window.__pwn=1</script>
<img src=x onerror="window.__pwn=2">
<span style="color:red;background:url(x)">bad span</span>

Needle-in-body-zebra is here.
"""
MOD="# Sample module\n\n## 1 Scope\n\nThe module text.\n"
SEED="""(()=>{const c=Object.keys(COURSES)[0],s=cshort(c);
LD.write('notes',s+'|Lectures/2027-02-03 Sample takeover triggers.md',{course:s,path:'Lectures/2027-02-03 Sample takeover triggers.md',title:'Sample takeover triggers',kind:'lecture',md:%s,updatedAt:1});
LD.write('notes',s+'|Lectures/2027-02-01 Sample intro.md',{course:s,path:'Lectures/2027-02-01 Sample intro.md',title:'Sample intro',kind:'lecture',md:'# Sample intro\\n\\nHello.',updatedAt:1});
LD.write('notes',s+'|Modules/1 Sample Takeover module.md',{course:s,path:'Modules/1 Sample Takeover module.md',title:'Sample Takeover module',kind:'module',md:%s,updatedAt:1});
return c})()""" % (json.dumps(LEC),json.dumps(MOD))

async def main():
    b=await _h.launch()
    c,p=await fresh_at(b);ev=p.evaluate
    cid=await ev(SEED);await p.wait_for_timeout(300)
    await ev("state.view='study';state.studyView='notes';render()");await p.wait_for_timeout(400)
    ok('subnav: six tabs ending in Notes',await ev("[...document.querySelectorAll('.subnav button')].map(b=>b.textContent).join()==='Plan,Exams,CFA,Tasks,Revise,Notes'"))
    ok('notes: course chip selected for the course with notes',await ev("document.querySelector('[data-act=ntcourse][aria-pressed=true]')!==null"))
    t=await ev("document.getElementById('app').innerText")
    ok('notes: Latest lectures lists both, newest first',('Latest lectures' in t) and t.index('Sample takeover triggers')<t.index('Sample intro'),t[:400])
    ok('notes: Modules section lists the module',await ev("/Modules/.test(document.getElementById('app').innerText)&&/Sample Takeover module/.test(document.getElementById('app').innerText)"))
    await ev("(()=>{const x=document.querySelector('.nt-row');x.click()})()");await p.wait_for_timeout(300)
    ok('reader: opens with back button, title and path text',await ev("!!document.getElementById('nt-back')&&document.querySelector('#nt-reader h2').textContent==='Sample takeover triggers'&&/Lectures\\/2027-02-03/.test(document.querySelector('.nt-path').textContent)"))
    ok('reader: legend present and collapsed',await ev("(()=>{const d=document.querySelector('.nt-leg');return !!d&&!d.open})()"))
    ok('reader: headings and table rendered',await ev("!!document.querySelector('.nt-md h3')&&!document.querySelector('.nt-md h2')&&document.querySelectorAll('.nt-md table th').length===8&&document.querySelectorAll('.nt-md table').length===2"))
    ok('reader: green span keeps its colour',await ev("(()=>{const s=[...document.querySelectorAll('.nt-md span')].find(x=>/green law/.test(x.textContent));return !!s&&getComputedStyle(s).color==='rgb(34, 163, 90)'&&/^green law text/.test(s.textContent)&&!!s.querySelector('strong')})()"))
    ok('reader: blue span in table cell is rgb(59,130,246)',await ev("(()=>{const s=[...document.querySelectorAll('.nt-md td span')][0];return !!s&&getComputedStyle(s).color==='rgb(59, 130, 246)'})()"))
    ok('reader: script and img are text, nothing created, nothing fired',await ev("!document.querySelector('.nt-md script')&&!document.querySelector('.nt-md img')&&window.__pwn===undefined&&/<script>window\\.__pwn=1<\\/script>/.test(document.querySelector('.nt-md').textContent)&&/<img src=x onerror=/.test(document.querySelector('.nt-md').textContent)") and not p.dialogs)
    ok('reader: unsafe span is escaped as text',await ev("(()=>{const m=document.querySelector('.nt-md');return /<span style=\"color:red;background:url\\(x\\)\">/.test(m.textContent)&&![...m.querySelectorAll('span')].some(s=>/red|url/.test(s.getAttribute('style')||''))})()"))
    ok('reader: only whitelisted tags in the rendered note',await ev("[...document.querySelectorAll('.nt-md *')].every(e=>['P','H2','H3','H4','H5','H6','SPAN','STRONG','EM','A','UL','OL','LI','TABLE','THEAD','TBODY','TR','TH','TD','DIV','CODE','PRE','BLOCKQUOTE','BR','HR','S'].includes(e.tagName))"))
    ok('reader: missing wikilink is plain text, existing one is a link',await ev("(()=>{const m=document.querySelector('.nt-md');return !![...m.querySelectorAll('a.nt-wl')].find(a=>/Sample Takeover module/.test(a.textContent))&&/Missing note/.test(m.textContent)&&![...m.querySelectorAll('a')].some(a=>/Missing/.test(a.textContent))})()"))
    ok('reader: no horizontal overflow at 390 px',await ev("document.documentElement.scrollWidth<=window.innerWidth&&document.body.scrollWidth<=window.innerWidth"))
    ok('reader: wide table scrolls inside its own box',await ev("(()=>{const w=document.querySelectorAll('.nt-tw')[1];return w.scrollWidth>w.clientWidth&&getComputedStyle(w).overflowX==='auto'})()"))
    await p.click('a.nt-wl');await p.wait_for_timeout(300)
    ok('wikilink opens the module note',await ev("document.querySelector('#nt-reader h2').textContent==='Sample Takeover module'"))
    await p.click('#nt-back');await p.wait_for_timeout(300)
    ok('back returns to the list',await ev("!!document.getElementById('nt-q')&&!document.getElementById('nt-reader')"))
    await p.fill('#nt-q','zebra');await p.wait_for_timeout(300)
    ok('search finds a word in the body',await ev("(()=>{const r=[...document.querySelectorAll('#nt-body .nt-row')];return r.length===1&&/Sample takeover triggers/.test(r[0].textContent)})()"))
    await p.fill('#nt-q','');await p.wait_for_timeout(200)
    ok('search cleared shows sections again',await ev("/Latest lectures/.test(document.getElementById('nt-body').textContent)"))
    # unsorted + part join
    await ev("LD.write('notes','Elsewhere|Revision/Sample loose.md',{course:'Elsewhere',path:'Revision/Sample loose.md',title:'Sample loose',kind:'revision',md:'part one ',updatedAt:1});LD.write('notes','Elsewhere|Revision/Sample loose.md|part 2',{course:'Elsewhere',path:'Revision/Sample loose.md',kind:'revision',md:'and part two',part:2,updatedAt:1})");await p.wait_for_timeout(500)
    await ev("document.activeElement.blur();render()");await p.wait_for_timeout(200)
    await p.click('[data-act=ntcourse][data-v=_uns]');await p.wait_for_timeout(300)
    await p.click('#nt-body .nt-row');await p.wait_for_timeout(300)
    ok('unsorted chip; split parts are joined in order',await ev("document.querySelector('.nt-md').textContent.trim()==='part one and part two'"))
    await ev("state.nOpen=null;render()")
    # course suggestion
    await ev("LD.write('proposals','pc',{at:Date.now(),items:[{kind:'course',name:'Sample Securities Regulation II',short:'SecReg II',why:'folder'}]});LD.write('proposals','pc2',{at:Date.now(),items:[{kind:'course',name:'sample securities regulation ii',short:'x'}]})");await p.wait_for_timeout(400)
    n0=await ev("semNow().courses.length")
    await ev("propApply('pc',0)");await p.wait_for_timeout(300)
    ok('course suggestion adds the course with its short name',await ev("semNow().courses.length")==n0+1 and await ev("semNow().courses.some(c=>c.name==='Sample Securities Regulation II'&&c.short==='SecReg II')"))
    await ev("propApply('pc2',0)");await p.wait_for_timeout(300)
    ok('an identical course (any case) is not added twice, and is marked approved',await ev("semNow().courses.length")==n0+1 and await ev("LD.get('proposals','pc2').items[0].status")=='approved')
    ok('label reads Add a course',await ev("propLabel({kind:'course'})")=='Add a course')
    await ev("LD.write('proposals','pe',{at:Date.now(),items:[{kind:'course',name:'Sample Edit Course',short:'SEC'}]})");await p.wait_for_timeout(300)
    await ev("propEditSheet('pe',0)");await p.wait_for_timeout(200)
    ok('edit sheet has name and short name',await ev("document.querySelector('#layer input[name=name]').value==='Sample Edit Course'&&document.querySelector('#layer input[name=short]').value==='SEC'"))
    await p.fill('#layer input[name=short]','SEC2');await p.click('#layer button[type=submit]');await p.wait_for_timeout(300)
    ok('edited course saved with edited short name',await ev("semNow().courses.some(c=>c.name==='Sample Edit Course'&&c.short==='SEC2')"))
    await c.close()
    # wizard
    c,p=await fresh_at(b);ev=p.evaluate
    await ev("state.view='study';state.studyView='exams';render()");await p.wait_for_timeout(300)
    await ev("LD.write('proposals','setup-1',{at:Date.now(),items:[{kind:'course',name:'Sample Course A',short:'SCA'},{kind:'deadline',title:'SCA: Sample exam',date:'2027-04-20',k:'Exam',course:'Sample Course A'},{kind:'todo',title:'Unrelated todo'}]})");await p.wait_for_timeout(300)
    oldname=await ev("semNow().name");oldn=await ev("semNow().courses.length")
    await p.click('#st-semwiz');await p.wait_for_timeout(300)
    ok('wizard step 1: prefilled name and archive explanation',await ev("document.querySelector('#layer input[name=name]').value==='Semester 8 · Spring 2027'&&/archives/.test(document.getElementById('layer').textContent)&&/Step 1 of 3/.test(document.getElementById('layer').textContent)"))
    await p.click('#layer button[type=submit]');await p.wait_for_timeout(500)
    arch=await ev("(C().semArchive||[]).map(a=>({n:a.name,c:a.courses.length}))")
    ok('wizard archives the current semester with its courses (nothing deleted)',len(arch)==1 and arch[0]['n']==oldname and arch[0]['c']==oldn and await ev("semNow().name")=='Semester 8 · Spring 2027' and await ev("semNow().courses.length")==0,arch)
    ok('wizard step 2 shows the setup items, not the unrelated todo',await ev("(()=>{const t=document.getElementById('wiz-list').textContent;return /Step 2 of 3/.test(document.getElementById('layer').textContent)&&/Sample Course A/.test(t)&&/Sample exam/.test(t)&&!/Unrelated/.test(t)&&!!document.getElementById('wiz-all')})()"))
    await ev("window.__order=[];const _sa=setAcad;setAcad=function(id,o){window.__order.push('deadline:'+COURSES[o.c]);return _sa.apply(this,arguments)};0")
    await p.click('#wiz-all');await p.wait_for_timeout(500)
    ok('Approve all applies the course, then its deadline in that order',await ev("semNow().courses.some(c=>c.name==='Sample Course A')&&JSON.stringify(window.__order)===JSON.stringify(['deadline:Sample Course A'])&&acadList().some(a=>a.t==='SCA: Sample exam'&&a.d==='2027-04-20')"),await ev("JSON.stringify(window.__order)"))
    ok('only setup items were approved; the todo stays open',await ev("(()=>{const i=LD.get('proposals','setup-1').items;return i[0].status==='approved'&&i[1].status==='approved'&&!i[2].status})()"))
    await ev("(()=>{const b=document.querySelector('#toast [data-act=undo],#toast button');window.__ub=!!b})()")
    clicked=await ev("(()=>{const b=[...document.querySelectorAll('button')].find(x=>/^undo$/i.test(x.textContent.trim()));if(b){b.click();return true}return false})()");await p.wait_for_timeout(500)
    ok('Undo reverses the wizard Approve all',clicked and await ev("!semNow().courses.some(c=>c.name==='Sample Course A')&&!acadList().some(a=>a.t==='SCA: Sample exam')&&LD.get('proposals','setup-1').items.every(i=>!i.status)"),clicked)
    await p.click('#wiz-all');await p.wait_for_timeout(400)
    await ev("document.querySelector('[data-x=wizstep][data-v=\"3\"]')?document.querySelector('[data-x=wizstep][data-v=\"3\"]').click():wizSheet(3)");await p.wait_for_timeout(300)
    s=await ev("document.getElementById('wiz-sum').textContent")
    ok('wizard step 3 summary: courses, assessments, next exam',all(x in s for x in ['Courses (1)','Sample Course A','Assessments by date (1)','SCA: Sample exam','Next exam']),s[:300])
    await p.click('[data-x=wizdone]');await p.wait_for_timeout(200)
    ok('Done closes the sheet',await ev("!document.querySelector('#layer h2')"))
    await c.close()
    # no proposals: plain guidance
    c,p=await fresh_at(b);ev=p.evaluate
    await ev("state.view='study';state.studyView='exams';render()");await p.wait_for_timeout(300)
    await p.click('#st-semwiz');await p.wait_for_timeout(200);await p.click('#layer button[type=submit]');await p.wait_for_timeout(400)
    ok('step 2 without proposals says to run semester setup on the Mac and offers the add form',await ev("/Run semester setup on your Mac/.test(document.getElementById('wiz-none').textContent)&&!!document.querySelector('#layer form[data-xform=semcadd]')"))
    await p.fill('#layer form[data-xform=semcadd] input[name=name]','Sample Hand Course');await p.click('#layer form[data-xform=semcadd] button');await p.wait_for_timeout(400)
    ok('hand-added course stays in the wizard',await ev("semNow().courses.some(c=>c.name==='Sample Hand Course')&&/Step 2 of 3/.test(document.getElementById('layer').textContent)"))
    await c.close()
    # no overflow on desktop notes tab; page errors
    c,p=await fresh_at(b,w=1366,h=800);ev=p.evaluate
    await ev(SEED);await ev("state.view='study';state.studyView='notes';render()");await p.wait_for_timeout(400)
    ok('desktop notes tab: no horizontal overflow',await ev("document.documentElement.scrollWidth<=window.innerWidth"))
    ok('no page errors, no dialogs',not p.errs and not p.dialogs,(p.errs,p.dialogs))
    await c.close();await b.close();await _h.close()
asyncio.run(main())
finish()

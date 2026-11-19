"""Semester workflow: confirmation before archiving, restore/undo, per-semester marks, Exams shows every course."""
import sys,os,asyncio
sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
from _h import *

async def fresh_at(b,iso='2027-02-10T10:00:00+05:30',w=390,h=844):
    c=await b.new_context(viewport={'width':w,'height':h},timezone_id='Asia/Kolkata')
    p=await c.new_page();p.errs=[]
    p.on('pageerror',lambda e:p.errs.append(str(e)))
    await p.clock.install(time=iso)
    await p.goto(BASE);await p.wait_for_function("window.LD&&LD.ready&&typeof remSheet==='function'");await p.wait_for_timeout(600)
    return c,p

SETUP="""(()=>{saveCfg({sem:{name:'Sample Sem B',courses:[{id:'ca',name:'Sample Course A',short:'SCA'},{id:'cb',name:'Sample Course B',short:'SCB'}],items:[{id:'ca-1',c:'ca',t:'SCA midterm',d:'2027-03-20',k:'Exam'}],miles:[{d:'2027-04-01',t:'Classes end'}],createdAt:'2027-01-01'},
 L_marks:[{id:'m1',course:'Sample Course A',name:'Quiz 1',got:8,of:10,date:'2027-02-01'},{id:'m2',course:'Old Course Z',name:'Old viva',got:7,of:10,date:'2026-10-01'}],
 revise:{ca:{topics:[{id:'t1',t:'Topic one',done:false,conf:0}],cases:[],notes:[]}}});applySemester();render()})()"""

async def main():
    b=await launch()
    c,p=await fresh_at(b);ev=p.evaluate
    await ev(SETUP);await ev("state.view='study';state.studyView='exams';render()");await p.wait_for_timeout(400)
    # Exams: every course, including the one without assessments; marks split
    t=await ev("document.getElementById('st-courses').textContent")
    ok('Exams lists every current course',all(x in t for x in ['Sample Course A','Sample Course B']),t)
    ok('course without assessments says so and has Add',await ev("(()=>{const r=document.querySelector('#st-courses [data-course=cb]');return /No assessments yet/.test(r.textContent)&&!!r.querySelector('[data-x=semadd]')})()"))
    ok('course with an assessment has no Add button',await ev("!document.querySelector('#st-courses [data-course=ca] [data-x=semadd]')"))
    ok('marks of non-current courses sit under collapsed Earlier semesters (1)',await ev("(()=>{const d=document.getElementById('st-marks-old');return !!d&&!d.open&&/Earlier semesters \\(1\\)/.test(d.textContent)&&/Old viva/.test(d.textContent)&&!/Old viva/.test(document.querySelector('#st-marks > .list').textContent)})()"))
    ok('current marks show up front',await ev("/Quiz 1/.test(document.querySelector('#st-marks > .list').textContent)"))
    await p.click('#st-courses [data-x=semadd]');await p.wait_for_timeout(300)
    ok('Add opens Semester setup add-assessment preselected to that course',await ev("/Semester setup/.test(document.querySelector('#layer h2').textContent)&&document.querySelector('#semiadd-form select[name=c]').value==='cb'"))
    ok('buttons are labelled Add course and Save name',await ev("/Save name/.test(document.querySelector('[data-xform=semname]').textContent)&&/Add course/.test(document.querySelector('[data-xform=semcadd]').textContent)"))
    # start new semester: confirmation first, nothing archived
    await p.fill('[data-xform=semask] input[name=name]','Sample Sem C');await p.click('[data-xform=semask] button');await p.wait_for_timeout(300)
    txt=await ev("document.getElementById('semconf-text').textContent")
    ok('confirmation states exact counts',txt.startswith('Archive Sample Sem B with its 2 courses, 1 assessment and 2 marks? Your new semester starts empty.'),txt)
    ok('nothing archived before the second tap',await ev("(C().semArchive||[]).length===0&&semNow().name==='Sample Sem B'"))
    ok('plain button reads Archive and start',await ev("/Archive and start/.test(document.querySelector('#layer form[data-xform=semnew] button[type=submit]').textContent)"))
    ok('no today-warning for an older semester that has assessments',await ev("!document.getElementById('semconf-warn')"))
    await p.click('#layer button[data-x=semcancel]');await p.wait_for_timeout(200)
    ok('Cancel archives nothing',await ev("(C().semArchive||[]).length===0&&/Semester setup/.test(document.querySelector('#layer h2').textContent)"))
    await p.click('[data-xform=semask] button');await p.wait_for_timeout(100)
    await p.fill('[data-xform=semask] input[name=name]','Sample Sem C');await p.click('[data-xform=semask] button');await p.wait_for_timeout(300)
    await p.click('#layer form[data-xform=semnew] button[type=submit]');await p.wait_for_timeout(500)
    ok('confirm archives courses, items, marks and revise; current is empty',await ev("(()=>{const a=C().semArchive;return a.length===1&&a[0].name==='Sample Sem B'&&a[0].courses.length===2&&a[0].items.length===1&&a[0].marks.length===2&&a[0].revise.ca.topics.length===1&&semNow().name==='Sample Sem C'&&semNow().courses.length===0&&C().L_marks.length===0&&C().revise.ca.topics.length===0})()"))
    ok('Past semesters lists the archive entry',await ev("/Sample Sem B/.test(document.getElementById('sem-past').textContent)"))
    ok('Undo toast is shown',await ev("!!document.querySelector('#toast [data-act=toastundo]')"))
    await ev("document.querySelector('#toast [data-act=toastundo]').click()");await p.wait_for_timeout(500)
    ok('Undo restores exactly',await ev("(()=>{const s=semNow();return s.name==='Sample Sem B'&&s.courses.length===2&&s.items.length===1&&C().semArchive.length===0&&C().L_marks.length===2&&C().revise.ca.topics.length===1})()"))
    # start again, then Restore from Past semesters
    await ev("saveCfg({sem:{name:'Sample Sem C',courses:[],items:[],miles:[]}});saveCfg({semArchive:[{...semNow(),name:'Sample Sem B',courses:[{id:'ca',name:'Sample Course A',short:'SCA'}],items:[],marks:[{id:'m1',course:'Sample Course A',name:'Quiz 1',got:8,of:10,date:'2027-02-01'}],archivedAt:'2027-02-01'}],L_marks:[],revise:{}});applySemester();render()")
    await ev("semSheet()");await p.wait_for_timeout(200)
    await p.click('#sem-past [data-x=semrestore]');await p.wait_for_timeout(500)
    ok('Restore swaps back with marks, and does not archive an empty semester',await ev("semNow().name==='Sample Sem B'&&C().L_marks.length===1&&(C().semArchive||[]).length===0"))
    await ev("saveCfg({semArchive:[{name:'Sample Sem A',courses:[{id:'x',name:'X',short:'X'}],items:[],miles:[],marks:[{id:'mm',course:'X',name:'Old',got:1,of:2,date:'2026-01-01'}],archivedAt:'2026-12-01'}]});semSheet()");await p.wait_for_timeout(200)
    await p.click('#sem-past [data-x=semrestore]');await p.wait_for_timeout(500)
    ok('Restore archives the current non-empty semester and brings back the chosen one',await ev("(()=>{const a=C().semArchive;return semNow().name==='Sample Sem A'&&a.length===1&&a[0].name==='Sample Sem B'&&a[0].marks.length===1&&C().L_marks[0].id==='mm'})()"))
    await ev("document.querySelector('#toast [data-act=toastundo]').click()");await p.wait_for_timeout(400)
    ok('Undo after Restore swaps back',await ev("semNow().name==='Sample Sem B'&&C().semArchive[0].name==='Sample Sem A'"))
    await c.close()
    # today warning
    c,p=await fresh_at(b);ev=p.evaluate
    await ev("saveCfg({sem:{name:'Sample Sem N',courses:[{id:'ca',name:'Sample Course A',short:'SCA'}],items:[],miles:[]}});applySemester();render();semSheet()");await p.wait_for_timeout(200)
    await p.fill('[data-xform=semask] input[name=name]','Next');await p.click('[data-xform=semask] button');await p.wait_for_timeout(300)
    ok('warning appears for courses with no assessments',await ev("/You set up this semester today\\. To add courses, use Add course above/.test((document.getElementById('semconf-warn')||{}).textContent||'')"))
    await c.close()
    c,p=await fresh_at(b);ev=p.evaluate
    await ev("saveCfg({sem:{name:'Sample Sem T',courses:[],items:[],miles:[],createdAt:todayStr()}});applySemester();render();semSheet()");await p.wait_for_timeout(200)
    await p.fill('[data-xform=semask] input[name=name]','Next');await p.click('[data-xform=semask] button');await p.wait_for_timeout(300)
    ok('warning appears for a semester created today',await ev("!!document.getElementById('semconf-warn')"))
    ok('no page errors',not p.errs,p.errs)
    await c.close();await b.close();await close();finish()
asyncio.run(main())

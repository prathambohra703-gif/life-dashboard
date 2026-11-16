"""Task C1: calendar feed end to end against the local stand-in (real SQL, real CalCore), and renewal reminders that roll forward."""
import sys,os,asyncio,urllib.request,urllib.error
sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
from _h import *
import _h

def feed(token):
    op=urllib.request.build_opener(urllib.request.ProxyHandler({}))
    try:
        r=op.open(MOCK+'/functions/v1/remind?cal='+token);return r.status,r.headers.get('Content-Type',''),r.read().decode()
    except urllib.error.HTTPError as e: return e.code,e.headers.get('Content-Type',''),e.read().decode()

async def main():
    b=await _h.launch()
    c,p=await fresh(b)
    ev=p.evaluate
    logs=[];p.on('console',lambda m:logs.append(m.text))
    p.on('dialog',lambda d:asyncio.ensure_future(d.accept()))

    # ---------- menu entry, and the sheet before the cloud is connected
    ok('menu: has a "Calendar feed" button',await ev("xMenu().includes('data-x=\"calfeed\">Calendar feed</button>')"))
    await ev("sheet(xMenu())");await p.click('#layer [data-x=calfeed]');await p.wait_for_timeout(200)
    ok('calendar sheet: says "Connect the cloud first" when not signed in',await ev("/Connect the cloud first/.test(document.querySelector('#layer').innerText)"))
    ok('calendar: nothing published without a link',await ev("!LD.get('meta','calendar')||!!C().calToken"))

    # ---------- pipeline rows take optional internship dates
    ok('pipeline form: optional start and end date fields',await ev("['start','end'].every(n=>LM.pipe.f.some(f=>f[0]===n&&f[2]==='date'))"))

    # ---------- renewal reminders use the next occurrence (task 2)
    t=await ev("todayStr()")
    nxt=await ev("addDays(todayStr(),20)")
    last=str(int(nxt[:4])-1)+nxt[4:]
    await ev("d=>saveCfg({L_renew:[...LL('renew').filter(r=>r.id!=='rnwtest'),{id:'rnwtest',name:'Bar Council fee',date:d,amount:1500,note:''}]})",last)
    await p.wait_for_timeout(200)
    dl=await ev("remSchedule().deadlines.list.filter(x=>x.id==='renew-rnwtest')")
    ok('reminders: a renewal dated last year is scheduled on its next occurrence',len(dl)==1 and dl[0]['d']==nxt,(last,dl))
    far=str(int(t[:4])-1)+(await ev("addDays(todayStr(),90)"))[4:]
    await ev("d=>saveCfg({L_renew:[...LL('renew'),{id:'rnwfar',name:'Far renewal',date:d}]})",far)
    ok('reminders: a renewal whose next occurrence is past 60 days is not scheduled',await ev("!remSchedule().deadlines.list.some(x=>x.id==='renew-rnwfar')"))

    # ---------- sign in, add a custom deadline, an internship start and a birthday
    st=await ev("u=>LD.signIn(u,'pk','test@example.com','pw')",MOCK)
    ok('cloud: signed in to the local stand-in',st['mode'] in ('synced','pending'),st)
    due=await ev("addDays(todayStr(),10)")
    await ev("d=>{setAcad('cC1test',{custom:true,c:Object.keys(COURSES)[0],t:'Cloud test essay, part 1',date:d,k:'Task'})}",due)
    start=await ev("addDays(todayStr(),30)")
    await ev("d=>saveCfg({L_pipe:[...LL('pipe').filter(r=>r.id!=='c1firm'),{id:'c1firm',firm:'Test Chambers',role:'Winter internship',stage:'Offer',next:'',start:d,end:'',note:''}]})",start)
    await ev("saveCfg({L_contacts:[...LL('contacts').filter(r=>r.id!=='c1pal'),{id:'c1pal',name:'Asha',firm:'',birthday:'03-14',note:''}]})")
    await p.wait_for_timeout(300);await ev("LD.sync()");await p.wait_for_timeout(300);await ev("LD.sync()")

    # ---------- open the sheet: link is made once, shown with steps
    await ev("sheet(xMenu())");await p.click('#layer [data-x=calfeed]');await p.wait_for_timeout(300)
    if not await ev("!!C().calToken"):
        await ev("LD.sync()");await p.wait_for_timeout(800);await ev("calSheet()");await p.wait_for_timeout(300)
    tok=await ev("C().calToken||''")
    ok('calendar: a 24-character base64url link token is stored in config',len(tok)==24 and all(ch.isalnum() or ch in '-_' for ch in tok),len(tok))
    txt=await ev("document.querySelector('#layer').innerText")
    url=await ev("(document.querySelector('#calurl')||{}).value||''")
    ok('calendar sheet: shows the subscribe link',url==MOCK+'/functions/v1/remind?cal='+tok,url)
    ok('calendar sheet: iPhone and Google Calendar steps, Copy and Reset',all(x in txt for x in ['Add Subscribed Calendar','Other calendars','From URL','Copy link','Reset link']))
    await ev("LD.sync()");await p.wait_for_timeout(300)
    meta=await ev("LD.get('meta','calendar')")
    ok('calendar: meta/calendar published with the token and items',meta and meta.get('token')==tok and any(i['id']=='acad-cC1test' for i in meta.get('items',[])),meta and meta.get('token')==tok)
    dbg=await ev("(()=>{calPublish();const c1=LD.get('meta','calendar'),a=c1.at;const i1=JSON.stringify(c1.items),i2=JSON.stringify(calItems());calLast='';calPublish();return [LD.get('meta','calendar').at===a,c1.token===C().calToken,i1===i2,i1.length,i2.length]})()")
    ok('calendar: publishing is skipped when nothing changed',dbg[0],dbg)

    # ---------- fetch the feed from the stand-in
    code,ctype,ics=feed(tok)
    ok('feed: 200 with text/calendar',code==200 and ctype.startswith('text/calendar'),(code,ctype))
    flat=ics.replace('\r\n ','')
    ok('feed: calendar wrapper and name',flat.startswith('BEGIN:VCALENDAR\r\n') and 'X-WR-CALNAME:Life Dashboard' in flat and flat.endswith('END:VCALENDAR\r\n'))
    ok('feed: contains the custom deadline, escaped, on its date',('SUMMARY:Cloud test essay\\, part 1' in flat) and ('DTSTART;VALUE=DATE:'+due.replace('-','')) in flat,flat[:400])
    ok('feed: renewal rolled forward to next year',('SUMMARY:Bar Council fee renews' in flat) and ('DTSTART;VALUE=DATE:'+nxt.replace('-','')) in flat)
    ok('feed: internship start from an explicit date',('Internship starts: Test Chambers' in flat) and ('DTSTART;VALUE=DATE:'+start.replace('-','')) in flat)
    ok('feed: contact birthday as a yearly date',"SUMMARY:Asha’s birthday" in flat)
    ok('feed: every line within 75 octets',all(len(l.encode())<=75 for l in ics.split('\r\n')))

    # ---------- reset the link: the old one stops working
    await ev("calSheet()");await p.wait_for_timeout(200)
    await p.click('#layer [data-x=calreset]');await p.wait_for_timeout(300)
    tok2=await ev("C().calToken")
    await ev("LD.sync()");await p.wait_for_timeout(300);await ev("LD.sync()")
    ok('reset: a new token is made and published',tok2 and tok2!=tok and (await ev("LD.get('meta','calendar').token"))==tok2)
    ok('reset: old link now 404',feed(tok)[0]==404)
    ok('reset: new link works',feed(tok2)[0]==200 and 'Cloud test essay' in feed(tok2)[2])
    ok('feed: unknown or malformed token 404',feed('x'*24)[0]==404 and feed('short')[0]==404)
    ok('token never written to the console',not any(tok in l or tok2 in l for l in logs))
    ok('no page errors',not p.errs,p.errs)

    # tidy the shared test account
    await ev("saveCfg({L_renew:LL('renew').filter(r=>!/^rnw/.test(r.id)),L_pipe:LL('pipe').filter(r=>r.id!=='c1firm'),L_contacts:LL('contacts').filter(r=>r.id!=='c1pal')});delete state.acad.cC1test;LD.remove('academics','cC1test')")
    await ev("LD.sync()");await p.wait_for_timeout(300)
    await c.close();await b.close();await _h.close()
    finish()
asyncio.run(main())

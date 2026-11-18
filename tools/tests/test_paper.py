"""Morning paper: Today card, full-screen newspaper, inbox section, close, print CSS, 390 px fit."""
import sys,os,json,asyncio,re
sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
from _h import *
import _h

PAPER={'date':'2026-11-20','at':1795100000000,'lead':1,
 'quote':{'text':'Discipline is choosing what you want most over what you want now.','by':'Test Author'},
 'markets':[{'name':'Nifty 50','value':'24,350.10','chg':'+0.42%','asof':'19 Nov close'},{'name':'USD/INR','value':'83.20','chg':'-0.05%','asof':'19 Nov close'}],
 'calendar':[{'time':'10:00','title':'Moot court practice'},{'time':'All day','title':'Library day'}],
 'news':[{'sec':'Law & regulation','head':'SEBI tightens F&O rules <b>','gist':'Gist one.','src':'Livemint','url':'https://example.com/a','when':'19 Nov'},
  {'sec':'Law & regulation','head':'RBI issues lending norms','gist':'Lead gist here.','src':'Hindu','url':'https://example.com/b','when':'19 Nov'},
  {'sec':'Finance','head':'Banks post strong results','gist':'Gist three.','src':'ET','url':'https://example.com/c','when':'19 Nov'},
  {'sec':'AI','head':'New model released','gist':'Gist four.','src':'Verge','url':'https://example.com/d','when':'19 Nov'},
  {'sec':'Trading','head':'Options volumes hit record','gist':'Gist five.','src':'Mint','url':'https://example.com/e','when':'19 Nov'}]}
OLD={**PAPER,'date':'2026-11-17','news':[{'sec':'AI','head':'Older headline','gist':'g','src':'X','url':'https://example.com/o','when':'17 Nov'}],'lead':0}

async def main():
    b=await _h.launch()
    c,p=await fresh(b);ev=p.evaluate
    await ev("state.view='today';render()");await p.wait_for_timeout(300)
    t=await ev("todayStr()")
    txt=await ev("document.querySelector('[data-pp=card]').textContent")
    ok('card with no paper: first paper message, no button',('Your first paper arrives at 5:45 AM' in txt) and await ev("!document.querySelector('[data-pp=card] button')"),txt)
    ok('card sits below the glance strip',await ev("(()=>{const g=document.querySelector('.td-glance'),c=document.querySelector('[data-pp=card]');return !!(g&&c&&(g.compareDocumentPosition(c)&4))})()"))
    await ev("LD.write('meta','paper-2026-11-17',%s)"%json.dumps(OLD));await p.wait_for_timeout(400)
    await ev("render()")
    txt=await ev("document.querySelector('[data-pp=card]').textContent")
    ok('card with only an older paper: not ready + Open latest',('not ready yet' in txt) and ('Open latest' in txt),txt)
    await p.click('[data-pp=card] [data-pp=open]');await p.wait_for_timeout(200)
    ok('Open latest shows the older paper',await ev("document.getElementById('paper').textContent.includes('Older headline')"))
    await p.keyboard.press('Escape');await p.wait_for_timeout(100)
    ok('Escape closes the paper',await ev("!document.getElementById('paper')"))
    # inbox + todos + data for yesterday
    y=await ev("addDays(todayStr(),-1)")
    P=dict(PAPER);P['date']=t
    await ev("LD.write('meta','paper-'+todayStr(),%s)"%json.dumps(P))
    await ev("""(()=>{const y=addDays(todayStr(),-1);dbSetDay(y,{steps:8123,cfaMin:75,studyMin:40,weight:70.2});
      addEntry({type:'meal',name:'Dal',kcal:600,p:35,c:60,f:10,date:y});
      setTodo({id:'t1',title:'Draft moot memo',pri:'high',done:false});
      LD.write('proposals','outlook-2026-11-18',{at:Date.now()-5000,items:[{kind:'todo',title:'Reply to registrar',why:'Registrar, 9:02 PM',status:'approved'},{kind:'deadline',title:'Form due',date:'2026-12-01',why:'Admin, 8:00 PM'},{kind:'todo',title:'Skip this',why:'Spam, 7:00 PM',status:'dismissed'}]});
      LD.write('proposals','p-other',{at:Date.now(),items:[{kind:'todo',title:'Not outlook'}]})})()""")
    await p.wait_for_timeout(500);await ev("render()")
    txt=await ev("document.querySelector('[data-pp=card]').textContent")
    ok('card shows lead headline (news[lead]) and Open',('RBI issues lending norms' in txt) and ('Read today’s paper' in txt) and 'Morning paper' in txt and 'The Daily Brief' in txt,txt)
    ok('card shows date label',await ev("document.querySelector('[data-pp=card]').textContent.includes(dlabel(todayStr()))"))
    ok('card is not the not-ready text',('not ready' not in txt))
    await p.click('[data-pp=card] [data-pp=open]');await p.wait_for_timeout(300)
    pt=await ev("document.getElementById('paper').textContent")
    ok('open: masthead and quote',('The Daily Brief' in pt) and ('Discipline is choosing' in pt) and ('Test Author' in pt))
    ok('open: every news head',all(h in pt for h in ['SEBI tightens F&O rules <b>','RBI issues lending norms','Banks post strong results','New model released','Options volumes hit record']))
    ok('news text is escaped (no injected tag)',await ev("!document.querySelector('#paper a.pp-a b')"))
    ok('sections grouped in order',await ev("[...document.querySelectorAll('#paper .pp-sec h3')].map(x=>x.textContent).join('|')")=='Law & regulation|Finance|AI|Trading')
    ok('lead is large and not duplicated in a section',await ev("document.querySelector('#paper .pp-lead h2').textContent")=='RBI issues lending norms' and await ev("document.querySelectorAll('#paper .pp-sec .pp-hd').length")==4)
    ok('headline links open in a new tab',await ev("[...document.querySelectorAll('#paper a.pp-a')].every(a=>a.target==='_blank'&&a.rel==='noopener'&&a.href.startsWith('https://example.com/'))"))
    ok('markets and calendar shown',all(x in pt for x in ['Nifty 50','24,350.10','USD/INR','Moot court practice','10:00','All day','Library day']))
    ok('yesterday at a glance: data and no fake zeros',all(x in pt for x in ['Yesterday at a glance','8,123','75 min','40 min','70.2 kg','600 kcal','35 g of']) and 'Spend' not in pt and 'Water' not in pt)
    ok('to do lists the open todo',('Draft moot memo' in pt) and ('To do' in pt))
    ok('inbox lists outlook items with states and source',all(x in pt for x in ['Reply to registrar','Registrar, 9:02 PM','Added','Form due','Pending','Skip this','Dismissed']) and 'Not outlook' not in pt)
    ed=await ev("document.querySelector('[data-pp=edition]').textContent")
    ok('edition line: vol, number, long date, reading time',ed.startswith('Vol. I · No. 2 · ') and ' · 2 min read' in ed and await ev("document.querySelector('[data-pp=edition]').textContent.includes(['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][parse(todayStr()).getDay()]+', ')"),ed)
    ok('index lists sections with counts',await ev("[...document.querySelectorAll('#paper .pp-index a')].map(a=>a.textContent).join('|')")=='Law & regulation2|Finance1|AI1|Trading1')
    await ev("document.querySelector('#paper .pp-index a[data-t=pp-s-trd]').click()");await p.wait_for_timeout(900)
    ok('index link scrolls to the section',await ev("(()=>{const e=document.getElementById('paper'),s=document.getElementById('pp-s-trd');return e.scrollTop>0&&Math.abs(s.getBoundingClientRect().top-64)<120})()"))
    await ev("document.getElementById('paper').scrollTop=0")
    ok('inbox states are pills',await ev("[...document.querySelectorAll('#paper [data-pp=inbox] .pp-pill')].map(x=>x.textContent).join('|')")=='Added|Pending|Dismissed')
    ok('markets: tiles with arrows',await ev("document.querySelectorAll('#paper [data-pp=markets] > div').length")==2 and await ev("document.querySelector('#paper [data-pp=markets] .up').textContent.includes('▲')") and await ev("document.querySelector('#paper [data-pp=markets] .dn').textContent.includes('▼')"))
    ok('todo has circle bullets',await ev("document.querySelectorAll('#paper [data-pp=todo] .pp-dot').length")>=1)
    ok('no horizontal overflow at 390',await ev("document.documentElement.scrollWidth")==390 and await ev("(()=>{const e=document.getElementById('paper');return e.scrollWidth<=e.clientWidth})()"))
    ok('paper covers the app (fixed, above the sheet layer)',await ev("(()=>{const e=document.getElementById('paper'),r=e.getBoundingClientRect();return getComputedStyle(e).position==='fixed'&&r.width==innerWidth&&r.height==innerHeight&&+getComputedStyle(e).zIndex>100})()"))
    ok('buttons are 44 px tall',await ev("[...document.querySelectorAll('#paper button')].every(b=>b.getBoundingClientRect().height>=43.5)"))
    ok('print rules: hide the app, A4 page, buttons hidden',await ev("""(()=>{const css=[...document.getElementById('pp-css').sheet.cssRules].map(r=>r.cssText).join('\\n');
      const pr=css.slice(css.indexOf('@media print'));return /@page[^{]*\\{[^}]*size: a4/.test(css)&&/body > :not\\(#paper\\)[^}]*display: none/.test(pr)&&/\\.pp-bar[^}]*display: none/.test(pr)})()"""))
    m0=await ev("document.getElementById('paper').classList.contains('pp-night')")
    await p.click('#paper [data-pp=mode]');await p.wait_for_timeout(100)
    ok('mode toggle flips and stores the choice',await ev("document.getElementById('paper').classList.contains('pp-night')")!=m0 and await ev("localStorage.getItem('pp-mode')")==('day' if m0 else 'night'))
    await p.click('#paper [data-pp=close]');await ev("document.querySelector('[data-pp=card] [data-pp=open]').click()");await p.wait_for_timeout(200)
    ok('chosen mode persists on reopen',await ev("document.getElementById('paper').classList.contains('pp-night')")!=m0)
    await p.click('#paper [data-pp=close]');await p.wait_for_timeout(100)
    ok('Close button closes the paper',await ev("!document.getElementById('paper')"))
    await ev("document.querySelector('[data-pp=card] [data-pp=open]').click()");await p.wait_for_timeout(150)
    await p.keyboard.press('Escape');await p.wait_for_timeout(100)
    ok('Escape closes the reopened paper',await ev("!document.getElementById('paper')"))
    ok('page does not scroll sideways after close, no errors',await ev("document.documentElement.scrollWidth")==390 and not p.errs,p.errs)
    await c.close()
    # laptop width: 3 columns
    c=await b.new_context(viewport={'width':1366,'height':900},timezone_id='Asia/Kolkata');p=await c.new_page();ev=p.evaluate
    await p.goto(BASE);await p.wait_for_function("window.LD&&LD.ready&&typeof remSheet==='function'");await p.wait_for_timeout(500)
    await ev("LD.write('meta','paper-'+todayStr(),%s)"%json.dumps(PAPER));await p.wait_for_timeout(300);await ev("state.view='today';render();openPaperTest=0")
    await ev("document.querySelector('[data-pp=card] [data-pp=open]').click()");await p.wait_for_timeout(300)
    ok('laptop: news in 3 columns',await ev("getComputedStyle(document.querySelector('#paper .pp-secs')).columnCount")=='3')
    await p.emulate_media(media='print');pdf=await p.pdf(prefer_css_page_size=True)
    ok('print: still one A4 page (full edition)',len(re.findall(rb'/Type\s*/Page[^s]',pdf))==1)
    await c.close()

    # ---------- Sunday edition ----------
    SUN={**PAPER,'weekly':{'range':'16–22 Nov',
      'review':[{'sec':'Law & regulation','head':'SEBI board overhauls <i>disclosure</i>','why':'Why one: it changes listing duties.','src':'Mint','url':'https://example.com/w1','when':'18 Nov'},
                {'sec':'Finance','head':'RBI holds rates','why':'Why two: watch the December print.','src':'Hindu','url':'https://example.com/w2','when':'19 Nov'},
                {'sec':'AI','head':'Model ships','why':'Why three.','src':'Verge','url':'https://example.com/w3','when':'20 Nov'}],
      'ahead':[{'date':'@D3','what':'RBI MPC decision','why':'Rate path in focus.'},{'date':'@D1','what':'CPI release','why':'Inflation print.'},{'date':'@PAST','what':'Old event','why':'Already gone.'}],
      'markets':[{'name':'Nifty 50','value':'24,900.00','chg':'+1.2%','asof':'21 Nov close (week)'},{'name':'Gold (MCX, 10 g)','value':'1,20,000','chg':'-0.8%','asof':'21 Nov close (week)'}]}}
    async def put_sun(pg,rec_):
        txt=json.dumps(rec_)
        await pg.evaluate("(s)=>{const r=JSON.parse(s),t=todayStr();const f=(n)=>addDays(t,n);const m={'@D1':f(1),'@D3':f(3),'@PAST':f(-2)};r.weekly.ahead&&r.weekly.ahead.forEach(a=>{if(m[a.date])a.date=m[a.date]});r.date=t;LD.write('meta','paper-'+t,r)}",txt)
        await pg.wait_for_timeout(300)
    c,p=await fresh(b);ev=p.evaluate
    await ev("""(()=>{const t=todayStr();for(let i=1;i<=14;i++){const d=addDays(t,-i);
      dbSetDay(d,{weight:i<=7?70.0:70.6,cfaMin:i<=7?60:0,studyMin:i<=7?30:0,habits:i<=7?{gym:i%2===1,mobility:true}:{}});
      if(i<=7)addEntry({type:'meal',name:'Dal'+i,kcal:600,p:i<=4?200:10,c:60,f:10,date:d})}
      addEntry({type:'txn',kind:'expense',amount:500,mine:300,cat:'Food',date:addDays(t,-2),name:'Lunch'});
      addEntry({type:'txn',kind:'expense',amount:100,mine:100,cat:'Food',date:addDays(t,-20),name:'Old'})})()""")
    await put_sun(p,SUN);await ev("state.view='today';render()")
    txt=await ev("document.querySelector('[data-pp=card]').textContent")
    ok('sunday: Today card says The Sunday Brief',('The Sunday Brief' in txt) and 'The Daily Brief' not in txt,txt)
    await p.click('[data-pp=card] [data-pp=open]');await p.wait_for_timeout(300)
    ok('sunday: masthead and week range',await ev("document.querySelector('#paper .pp-mast h1').textContent")=='The Sunday Brief' and 'Week of 16–22 Nov' in await ev("document.querySelector('[data-pp=edition]').textContent"))
    ok('sunday: accent class and dialog label',await ev("document.querySelector('#paper .pp-sheet').classList.contains('pp-sun')") and await ev("document.getElementById('paper').getAttribute('aria-label')")=='The Sunday Brief')
    ok('review: items with section kicker, headline link, why, src',await ev("[...document.querySelectorAll('#paper [data-pp=review] .pp-rv')].map(a=>a.querySelector('.pp-kick').textContent+'|'+a.querySelector('.pp-hd a').getAttribute('href')+'|'+a.querySelector('.pp-gist').textContent+'|'+a.querySelector('.pp-src').textContent).join('#')")=='Law & regulation|https://example.com/w1|Why one: it changes listing duties.|Mint · 18 Nov#Finance|https://example.com/w2|Why two: watch the December print.|Hindu · 19 Nov#AI|https://example.com/w3|Why three.|Verge · 20 Nov')
    ok('review: escaped, links open in new tab',await ev("!document.querySelector('#paper [data-pp=review] i')") and await ev("[...document.querySelectorAll('#paper [data-pp=review] a')].every(a=>a.target==='_blank'&&a.rel==='noopener')"))
    ok('review: kicker uses the section colour',await ev("(()=>{const k=document.querySelectorAll('#paper [data-pp=review] .pp-kick');return getComputedStyle(k[0]).color!==getComputedStyle(k[1]).color})()"))
    ok('review sits before the daily news; daily titled Today\'s news',await ev("(()=>{const a=document.querySelector('[data-pp=review]'),b=document.querySelector('#paper .pp-lead'),h=document.querySelector('[data-pp=dailyhd]');return !!(a.compareDocumentPosition(b)&4)&&h.textContent==='Today’s news'&&!!(a.compareDocumentPosition(h)&4)})()"))
    ok('ahead: sorted, past skipped, days until',await ev("[...document.querySelectorAll('#paper [data-pp=ahead] li')].map(l=>l.querySelector('b').textContent+'|'+l.querySelector('small').textContent).join('#')")=='CPI release|tomorrow#RBI MPC decision|in 3 days')
    ok('ahead: dated like Tue 25 Nov',await ev("(()=>{const x=parse(addDays(todayStr(),3));return document.querySelectorAll('#paper [data-pp=ahead] time')[1].firstChild.textContent===dlabel(addDays(todayStr(),3))})()"))
    ok('markets: weekly strip with Week label replaces daily',await ev("document.querySelector('[data-pp=mklabel]').textContent.includes('Week')") and await ev("document.querySelectorAll('#paper [data-pp=markets]').length")==1 and '24,900.00' in await ev("document.getElementById('paper').textContent") and '24,350.10' not in await ev("document.getElementById('paper').textContent"))
    ok('index includes week in review and week ahead',await ev("[...document.querySelectorAll('#paper .pp-index a')].slice(0,2).map(a=>a.textContent).join('|')")=='Week in review3|Week ahead2')
    await ev("document.querySelector('#paper .pp-index a[data-t=pp-ahead]').click()");await p.wait_for_timeout(900)
    ok('index link scrolls to the week ahead',await ev("document.getElementById('paper').scrollTop>0"))
    await ev("document.getElementById('paper').scrollTop=0")
    yw=await ev("(document.querySelector('[data-pp=yweek]')||{}).textContent||''")
    dim=await ev("(()=>{const e=parse(addDays(todayStr(),-1));return new Date(e.getFullYear(),e.getMonth()+1,0).getDate()})()")
    bud=await ev("inr(Math.round(+C().limit*7/%d))"%dim)
    ok('your week: heading and metrics from seeded data',all(x in yw for x in ['Your week','Gym sessions','of 5','Protein target met','4 of 7 days','Habits, average','CFA','7 h','Study','3.5 h','Spend (your share)','₹300 of '+bud,'Weight, 7-day avg','70.0 kg','Change on week before','−0.6 kg']),yw)
    ok('your week sits in the side panel, first',await ev("document.querySelector('#paper .pp-side section').dataset.pp")=='yweek')
    await p.click('#paper [data-pp=close]')
    # weekly markets empty -> daily fallback
    S2=json.loads(json.dumps(SUN));S2['weekly']['markets']=[]
    await put_sun(p,S2);await ev("render()");await ev("document.querySelector('[data-pp=card] [data-pp=open]').click()");await p.wait_for_timeout(200)
    ok('markets fall back to daily when weekly is empty',await ev("!document.querySelector('[data-pp=mklabel]')") and '24,350.10' in await ev("document.getElementById('paper').textContent"))
    await p.click('#paper [data-pp=close]')
    # no fake content: weekly with nothing in it renders no week sections
    S3=json.loads(json.dumps(SUN));S3['weekly']={'range':'16–22 Nov'}
    await put_sun(p,S3);await ev("render()");await ev("document.querySelector('[data-pp=card] [data-pp=open]').click()");await p.wait_for_timeout(200)
    ok('sunday with no review/ahead: no empty sections',await ev("!document.querySelector('[data-pp=review]')&&!document.querySelector('[data-pp=ahead]')&&!!document.querySelector('[data-pp=dailyhd]')&&document.querySelector('#paper .pp-mast h1').textContent==='The Sunday Brief'"))
    await p.click('#paper [data-pp=close]')
    await c.close()
    # empty app data: Your week omitted entirely
    c,p=await fresh(b);ev=p.evaluate
    await put_sun(p,SUN);await ev("state.view='today';render()");await ev("document.querySelector('[data-pp=card] [data-pp=open]').click()");await p.wait_for_timeout(200)
    ok('your week omitted when there is no data',await ev("!document.querySelector('[data-pp=yweek]')"))
    await c.close()
    # weekday paper unchanged
    c,p=await fresh(b);ev=p.evaluate
    await ev("LD.write('meta','paper-'+todayStr(),%s)"%json.dumps(PAPER));await p.wait_for_timeout(300);await ev("state.view='today';render()")
    ok('weekday: card and masthead stay The Daily Brief',('The Daily Brief' in await ev("document.querySelector('[data-pp=card]').textContent")) and 'Sunday' not in await ev("document.querySelector('[data-pp=card] .pp-cm').textContent"))
    await ev("document.querySelector('[data-pp=card] [data-pp=open]').click()");await p.wait_for_timeout(200)
    ok('weekday: no week sections, Your week, week label',await ev("document.querySelector('#paper .pp-mast h1').textContent")=='The Daily Brief' and await ev("!document.querySelector('[data-pp=review],[data-pp=ahead],[data-pp=yweek],[data-pp=mklabel],[data-pp=dailyhd]')") and await ev("!document.querySelector('#paper .pp-sun')"))
    await p.emulate_media(media='print');pdf=await p.pdf(prefer_css_page_size=True)
    ok('weekday print: one A4 page',len(re.findall(rb'/Type\s*/Page[^s]',pdf))==1)
    await c.close()
    # Sunday print
    c=await b.new_context(viewport={'width':1366,'height':900},timezone_id='Asia/Kolkata');p=await c.new_page();ev=p.evaluate
    await p.goto(BASE);await p.wait_for_function("window.LD&&LD.ready&&typeof remSheet==='function'");await p.wait_for_timeout(500)
    await put_sun(p,SUN);await ev("state.view='today';render()");await ev("document.querySelector('[data-pp=card] [data-pp=open]').click()");await p.wait_for_timeout(300)
    await p.emulate_media(media='print');pdf=await p.pdf(prefer_css_page_size=True)
    n=len(re.findall(rb'/Type\s*/Page[^s]',pdf))
    ok('sunday print: two A4 pages at most',1<n<=2,n)
    await c.close()
    # automatic night edition by clock
    for hh,want in ((6,True),(12,False),(21,True)):
        c=await b.new_context(viewport={'width':390,'height':844},timezone_id='Asia/Kolkata');p=await c.new_page();ev=p.evaluate
        await p.clock.install(time='2026-11-19T%02d:30:00+05:30'%hh)
        await p.goto(BASE);await p.wait_for_function("window.LD&&LD.ready&&typeof remSheet==='function'");await p.wait_for_timeout(400)
        await ev("LD.write('meta','paper-'+todayStr(),%s)"%json.dumps(PAPER));await p.wait_for_timeout(300);await ev("state.view='today';render()")
        await ev("document.querySelector('[data-pp=card] [data-pp=open]').click()");await p.wait_for_timeout(200)
        ok('auto mode at %02d:30 night=%s'%(hh,want),await ev("document.getElementById('paper').classList.contains('pp-night')")==want)
        await c.close()
    await _h.close();_h.finish()
asyncio.run(main())

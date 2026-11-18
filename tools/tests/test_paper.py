"""Morning paper: Today card, full-screen newspaper, inbox section, close, print CSS, 390 px fit."""
import sys,os,json,asyncio
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
    ok('card shows lead headline (news[lead]) and Open',('RBI issues lending norms' in txt) and ('Open' in txt) and 'Morning paper' in txt,txt)
    ok('card shows date label',await ev("document.querySelector('[data-pp=card]').textContent.includes(dlabel(todayStr()))"))
    ok('card is not the not-ready text',('not ready' not in txt))
    await p.click('[data-pp=card] [data-pp=open]');await p.wait_for_timeout(300)
    pt=await ev("document.getElementById('paper').textContent")
    ok('open: masthead and quote',('The Daily Brief' in pt) and ('Discipline is choosing' in pt) and ('Test Author' in pt))
    ok('open: every news head',all(h in pt for h in ['SEBI tightens F&O rules <b>','RBI issues lending norms','Banks post strong results','New model released','Options volumes hit record']))
    ok('news text is escaped (no injected tag)',await ev("!document.querySelector('#paper a b')"))
    ok('sections grouped in order',await ev("[...document.querySelectorAll('#paper .pp-sec h3')].map(x=>x.textContent).join('|')")=='Law & regulation|Finance|AI|Trading')
    ok('lead is large and not duplicated in a section',await ev("document.querySelector('#paper .pp-lead h2').textContent")=='RBI issues lending norms' and await ev("document.querySelectorAll('#paper .pp-sec .pp-hd').length")==4)
    ok('headline links open in a new tab',await ev("[...document.querySelectorAll('#paper a.pp-a')].every(a=>a.target==='_blank'&&a.rel==='noopener'&&a.href.startsWith('https://example.com/'))"))
    ok('markets and calendar shown',all(x in pt for x in ['Nifty 50','24,350.10','USD/INR','Moot court practice','10:00','All day','Library day']))
    ok('yesterday at a glance: data and no fake zeros',all(x in pt for x in ['Yesterday at a glance','8,123','75 min','40 min','70.2 kg','600 kcal','35 g of']) and 'Spend' not in pt and 'Water' not in pt)
    ok('to do lists the open todo',('Draft moot memo' in pt) and ('To do' in pt))
    ok('inbox lists outlook items with states and source',all(x in pt for x in ['Reply to registrar','Registrar, 9:02 PM','Added','Form due','Pending','Skip this','Dismissed']) and 'Not outlook' not in pt)
    ok('no horizontal overflow at 390',await ev("document.documentElement.scrollWidth")==390 and await ev("(()=>{const e=document.getElementById('paper');return e.scrollWidth<=e.clientWidth})()"))
    ok('paper covers the app (fixed, above the sheet layer)',await ev("(()=>{const e=document.getElementById('paper'),r=e.getBoundingClientRect();return getComputedStyle(e).position==='fixed'&&r.width==innerWidth&&r.height==innerHeight&&+getComputedStyle(e).zIndex>100})()"))
    ok('buttons are 44 px tall',await ev("[...document.querySelectorAll('#paper button')].every(b=>b.getBoundingClientRect().height>=43.5)"))
    ok('print rules: hide the app, A4 page, buttons hidden',await ev("""(()=>{const css=[...document.getElementById('pp-css').sheet.cssRules].map(r=>r.cssText).join('\\n');
      const pr=css.slice(css.indexOf('@media print'));return /@page[^{]*\\{[^}]*size: a4/.test(css)&&/body > :not\\(#paper\\)[^}]*display: none/.test(pr)&&/\\.pp-bar[^}]*display: none/.test(pr)})()"""))
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
    await c.close()
    await _h.close();_h.finish()
asyncio.run(main())

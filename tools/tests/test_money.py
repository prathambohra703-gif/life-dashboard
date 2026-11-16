import sys,os,json,asyncio,re
sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
from _h import *
import _h
SHOTS=os.environ.get('SHOTS','')
async def fresh_at(b,iso='2026-11-12T10:00:00+05:30'):
    """like _h.fresh, but with the clock pinned so the suite does not depend on the real date"""
    c=await b.new_context(viewport={'width':390,'height':844},timezone_id='Asia/Kolkata')
    p=await c.new_page();p.errs=[]
    p.on('pageerror',lambda e:p.errs.append(str(e)))
    await p.clock.install(time=iso)
    await p.goto(BASE);await p.wait_for_function("window.LD&&LD.ready&&typeof remSheet==='function'");await p.wait_for_timeout(500)
    return c,p

async def main():
    b=await _h.launch()
    c,p=await fresh_at(b)
    rep=await p.evaluate("s=>LD.importPayload(s)",seed);await p.wait_for_timeout(500)
    ok('seed imported',rep['ok'])
    await p.evaluate("state.view='money';state.mm='spend';render()");await p.wait_for_timeout(200)
    async def go(v):
        await p.click(f'.subnav [data-v="{v}"]');await p.wait_for_timeout(150)
    # ---- hero
    hero=await p.inner_text('.sec-hero__num');want=await p.evaluate("inr(safeSpend().leftToday)")
    ok('hero number equals inr(safeSpend().leftToday)',hero.replace('today','').strip()==want,(hero,want))
    ok('hero title and unit',await p.evaluate("document.querySelector('.sec-hero__title').textContent")=='Safe to spend' and 'today' in hero)
    sub=await p.inner_text('.sec-hero__sub')
    ok('hero sub: spent of limit, days left, pace',re.search(r'of ₹20,000 spent · \d+ days? left',sub) is not None,sub)
    ok('sub-nav has 5 tabs incl. Poker',await p.evaluate("[...document.querySelectorAll('.subnav button')].map(b=>b.textContent).join('|')")=='Overview|Spending|People|Poker|Manage')
    ok('overview: stat row with 4 tiles and add-expense card',await p.evaluate("document.querySelectorAll('.statrow .stat-t').length")==4 and await p.evaluate("!!document.querySelector('[data-act=expnew]')"))
    # ---- add current-month data: expenses on three days
    await p.evaluate("""()=>{const t=todayStr(),y=t.slice(0,7);
      addEntry({type:'txn',kind:'expense',amount:300,category:'Food',account:'cash',note:'Lunch '.repeat(30),date:y+'-01'});
      addEntry({type:'txn',kind:'expense',amount:150,category:'Food',account:'cash',note:'Chai',date:y+'-01'});
      addEntry({type:'txn',kind:'expense',amount:500,category:'Transport',account:'cash',note:'Cab',date:y+'-05'});
      addEntry({type:'txn',kind:'expense',amount:80,category:'Food',account:'cash',note:'Snack',date:t});render()}""");await p.wait_for_timeout(200)
    hero2=await p.inner_text('.sec-hero__num');want2=await p.evaluate("inr(safeSpend().leftToday)")
    ok('hero tracks new spend',hero2.replace('today','').strip()==want2,(hero2,want2))
    # ---- spending
    await go('list')
    days=await p.evaluate("[...document.querySelectorAll('.mm-day')].map(d=>({day:d.dataset.day,tot:+d.dataset.total,txt:d.textContent}))")
    ok('spending: grouped by day, newest first',len(days)>=3 and [d['day'] for d in days]==sorted([d['day'] for d in days],reverse=True),days[:4])
    ym=await p.evaluate("todayStr().slice(0,7)");mt=await p.evaluate("monthSpend(todayStr().slice(0,7)).total")
    s=sum(d['tot'] for d in days if d['day'].startswith(ym))
    ok('spending: day totals add up to the month total',abs(s-mt)<0.01 and mt>0,(s,mt))
    ok('spending: day heading shows a label and total',all(re.search(r'\d',d['txt']) for d in days if d['tot']>0))
    ok('spending: long notes wrap instead of truncating',await p.evaluate("(()=>{const b=[...document.querySelectorAll('.mm-list .m b')].find(x=>x.textContent.startsWith('Lunch'));return b&&getComputedStyle(b).textOverflow!=='ellipsis'&&b.scrollWidth<=b.clientWidth+1})()"))
    # show more: add 50 entries
    await p.evaluate("()=>{for(let i=0;i<50;i++)addEntry({type:'txn',kind:'expense',amount:10,category:'Food',account:'cash',note:'bulk'+i,date:todayStr()});render()}");await p.wait_for_timeout(200)
    n1=await p.evaluate("document.querySelectorAll('.mm-list .li').length")
    ok('spending: loads 40 first',n1==40,n1)
    await p.click('[data-act=mmore]');await p.wait_for_timeout(150)
    n2=await p.evaluate("document.querySelectorAll('.mm-list .li').length")
    ok('spending: Show more loads more',n2>n1,(n1,n2))
    ok('spending: row edit and delete buttons',await p.evaluate("!!document.querySelector('.mm-list [data-act=entedit]')&&!!document.querySelector('.mm-list [data-act=entdel]')"))
    # ---- people
    await go('people')
    txt=await p.inner_text('#app')
    net=await p.evaluate("inr2(owedList(true).find(o=>o.p==='Wrik').v)")
    row=await p.evaluate("(()=>{const r=[...document.querySelectorAll('.li')].find(l=>l.querySelector('[data-act=pperson]')&&/Wrik/.test(l.textContent));return r?r.textContent:''})()")
    ok('people: Wrik listed with net from owedList()',net in row,(net,row))
    stale=await p.evaluate("staleFriends().map(o=>({p:o.p,age:o.age}))")
    ok('people: stale nudge for everyone over 14 days',len(stale)>0 and all(f"No payment from {o['p']} in {o['age']} days" in txt for o in stale),stale)
    ok('people: owed to you / you owe, IOU form, settle buttons',await p.evaluate("!!document.querySelector('form[data-form=iou]')&&!!document.querySelector('[data-act=settle]')")and 'owed to you' in txt.lower() and 'you owe' in txt.lower())
    # ---- poker
    await go('poker')
    ok('poker: empty drawdown card before sessions','Log a session to see how far' in await p.inner_text('#app'))
    for cash in (1000,100):   # +500 then -800 (buy in 500 -> 1000, buy in 900 -> 100)
        bi=500 if cash==1000 else 900
        await p.evaluate("([bi,co])=>addEntry({type:'poker',buyin:bi,cashout:co,date:todayStr(),hours:2,note:'test'})",[bi,cash])
    await p.evaluate("render()");await p.wait_for_timeout(200)
    ok('poker: drawdown svg present',await p.evaluate("!!document.querySelector('svg[aria-label^=\"Drawdown\"] path')"))
    lab=await p.evaluate("document.querySelector('.dd-max').textContent");v=await p.evaluate("+document.querySelector('.dd-max').dataset.v")
    ok('poker: biggest drawdown labelled 800',v==800 and '800' in lab,(v,lab))
    ok('poker: matches existing analytics',await p.evaluate("[...document.querySelectorAll('.card')].some(c=>/Biggest drawdown/.test(c.textContent)&&c.textContent.includes(inr(800))&&c.querySelector('.lbl'))"))
    ok('poker: plan, tables, log form, sessions present',await p.evaluate("['Plan and calculator','Tables','Log a session','Sessions'].every(h=>[...document.querySelectorAll('.card h2')].some(x=>x.textContent.startsWith(h)))"))
    # ---- manage
    await go('manage')
    ok('manage: 4 accounts',await p.evaluate("document.querySelectorAll('.mtile').length")==4)
    hs=await p.evaluate("[...document.querySelectorAll('.card h2')].map(x=>x.textContent)")
    ok('manage: budgets, recurring, renewals, net worth',all(any(h.startswith(k) for h in hs) for k in ['Category budgets','Recurring','Annual renewals','Net worth']),hs)
    ok('manage: allowance button present',await p.evaluate("!!document.querySelector('[data-act=recallow]')"))
    await p.click('[data-act=lnew][data-l=renew]');await p.wait_for_timeout(200)
    await p.fill('form[data-form=lrec] input[name=name]','Domain');await p.fill('form[data-form=lrec] input[name=date]','2027-03-01');await p.fill('form[data-form=lrec] input[name=amount]','900')
    await p.click('form[data-form=lrec] button[type=submit]');await p.wait_for_timeout(300)
    ok('manage: renewal add flow works from here','Domain' in await p.inner_text('#app') and await p.evaluate("state.mm")=='manage')
    await p.click('[data-act=lnew][data-l=nw]');await p.wait_for_timeout(200)
    await p.fill('form[data-form=lrec] input[name=assets]','100000');await p.fill('form[data-form=lrec] input[name=debts]','5000')
    await p.click('form[data-form=lrec] button[type=submit]');await p.wait_for_timeout(300)
    ok('manage: net worth snapshot flow works from here',await p.evaluate("inr(95000)") in await p.inner_text('#app'))
    # ---- allowance recurring income row
    await p.click('[data-act=recallow]');await p.wait_for_timeout(300)
    ok('manage: allowance shows as recurring income row','Allowance · income' in await p.inner_text('#app'))
    # ---- hide amounts
    await go('spend')
    await p.click('[data-act=mhidet]');await p.wait_for_timeout(150)
    ok('hide amounts masks the hero',(await p.inner_text('.sec-hero__num')).startswith('₹ ••••') and '₹ ••••' in await p.inner_text('.sec-hero__sub'))
    ok('hide amounts masks stat row',not re.search(r'₹\d',await p.inner_text('.statrow')))
    await p.click('[data-act=mhidet]');await p.wait_for_timeout(150)
    ok('show amounts again',not (await p.inner_text('.sec-hero__num')).startswith('₹ ••'))
    # ---- over the limit
    await p.evaluate("addEntry({type:'txn',kind:'expense',amount:30000,category:'Other',account:'cash',note:'big',date:todayStr()});render()");await p.wait_for_timeout(200)
    ok('over the limit: title and overspend number',await p.evaluate("document.querySelector('.sec-hero__title').textContent")=='Over the limit' and await p.evaluate("document.querySelector('.sec-hero__chips .pill.bad')!==null"))
    # ---- old values still work
    await p.evaluate("state.mm='poker';render()");await p.wait_for_timeout(150)
    ok('state.mm=poker still opens Poker',await p.evaluate("document.querySelector('.subnav [aria-selected=true]').textContent")=='Poker')
    # ---- widths
    for v in ('spend','list','people','poker','manage'):
        await p.evaluate("v=>{state.mm=v;render()}",v);await p.wait_for_timeout(150)
        sw=await p.evaluate("document.documentElement.scrollWidth")
        ok(f'390px: no horizontal scroll on {v}',sw<=390,sw)
    # ---- exam mode
    await p.evaluate("state.mm='spend';saveCfg({examMode:'on'});render()");await p.wait_for_timeout(300)
    ok('exam mode: Poker tab hidden, notice shown',await p.evaluate("![...document.querySelectorAll('.subnav button')].some(b=>b.textContent==='Poker')") and 'Exam mode is on' in await p.inner_text('#app'))
    ok('no page errors',not p.errs,p.errs[:3])
    if SHOTS:
        await p.evaluate("saveCfg({examMode:'off'})")
    await c.close();await b.close();await _h.close();finish()
asyncio.run(main())

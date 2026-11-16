/* ---------- Money section: hero, sub-nav (Overview, Spending, People, Poker, Manage) ----------
   Composes the existing card builders (vSpendRaw, vPoker, lifeNw, lifeRenew, safeSpend, owedList, staleFriends,
   forecastLine, pokerStats, bankrollSvg ...). No balance, split, settle-up, recurring or poker maths is redone here. */
(function(){
  if(typeof vMoney!=='function'||typeof vPoker!=='function'||typeof vSpendRaw!=='function'||typeof secHero!=='function'||typeof subNav!=='function')return;
  const OLD_POKER=vPoker,OLD_SPEND=vSpendRaw;
  const TABS=[['spend','Overview'],['list','Spending'],['people','People'],['poker','Poker'],['manage','Manage']];
  const KEYS=TABS.map(t=>t[0]);
  const PAGE=40;

  try{
    const st=document.createElement('style');st.id='money-css';
    st.textContent=
      '.mm-list .li .m{min-width:0;flex:1}'+
      '.mm-list .li .m b,.mm-list .li .m span{display:block;white-space:normal;overflow-wrap:anywhere}'+
      '.mm-day{display:flex;justify-content:space-between;align-items:baseline;gap:12px;margin:20px 0 0;padding-bottom:6px;border-bottom:1px solid var(--hair2)}'+
      '.mm-day:first-of-type{margin-top:4px}'+
      '.mm-day b{font:600 11px var(--font-body);letter-spacing:.16em;text-transform:uppercase;color:var(--mute)}'+
      '.mm-day span{font-size:13px;color:var(--mute)}'+
      '.mm-quiet{display:flex;justify-content:flex-end;margin-top:var(--s3)}'+
      '.mm-notice{font-size:12px;margin:var(--s3) 0 0;color:var(--faint)}'+
      '#app .card svg{max-width:100%}';
    document.head.appendChild(st);
  }catch(e){}

  /* ---- helpers ---- */
  const mmNow=()=>KEYS.includes(state.mm)?state.mm:'spend';
  const stripHero=h=>h.replace(/class="card hero"/g,'class="card"');
  const listClass=h=>h.replace(/<div class="list">/g,'<div class="list mm-list">');
  /* every section.card inside an HTML string, as ready HTML, in order */
  function cardsOf(html){
    const t=document.createElement('template');t.innerHTML=html;
    return Array.from(t.content.querySelectorAll('section.card')).map(s=>stripHero(s.outerHTML));
  }
  const grid=cards=>'<div class="grid w2">'+listClass(cards.filter(Boolean).join(''))+'</div>';
  const monthName=()=>{const d=parse(todayStr());return d.toLocaleString('en-US',{month:'long'})};

  /* "on pace for ₹y" read from the existing forecast line so the number is the same one shown elsewhere */
  function paceText(cfg,ms){
    try{
      const h=forecastLine(cfg,ms);if(!h)return '';
      const t=document.createElement('div');t.innerHTML=h;
      const m=t.textContent.replace(/\s+/g,' ').match(/On pace for\s*(.*?) by month end/);
      return m?m[1]:'';
    }catch(e){return ''}
  }
  const owedTotals=()=>{
    const all=owedList(true).filter(o=>Math.abs(o.v)>=0.01);
    return {all,get:sum(all.filter(o=>o.v>0),o=>o.v),give:sum(all.filter(o=>o.v<0),o=>-o.v)};
  };

  /* ---- hero ---- */
  function heroHtml(cfg,ms){
    const s=safeSpend(),over=s.leftToday<0,pace=paceText(cfg,ms);
    const chips=[];
    if(over)chips.push({text:s.pool<=0?'Over this month’s limit':'Over today by '+inr(-s.leftToday),tone:'bad'});
    owedList().filter(o=>o.v>0.01).slice(0,2).forEach(o=>chips.push({text:o.p+' owes '+inr(o.v),tone:'acc'}));
    const sub=inr(ms.total)+' of '+inr(cfg.limit)+' spent · '+s.dl+' day'+(s.dl===1?'':'s')+' left'+(pace?' · on pace for '+pace:'');
    return secHero({scene:'arch',eyebrow:'Money · '+monthName(),title:over?'Over the limit':'Safe to spend',
      number:over?inr(-s.leftToday):inr(s.leftToday),unit:over?'over':'today',sub,chips});
  }
  function navHtml(cur){
    const exam=examOn(todayStr())&&cur!=='poker';
    const items=exam?TABS.filter(t=>t[0]!=='poker'):TABS;
    return subNav(items,cur,'mm')+
      (exam?'<p class="mm-notice">Exam mode is on, so Poker is hidden. Turn it off from the menu to bring it back.</p>':'')+
      '<div class="mm-quiet"><button class="btn sm ghost" data-act="mhidet">'+(state.moneyHide?'Show amounts':'Hide amounts')+'</button></div>';
  }

  /* ---- Overview ---- */
  function overview(cfg,ms,P){
    const s=safeSpend(),left=cfg.limit-ms.total,pct=ms.total/cfg.limit,ot=owedTotals();
    const D=parse(todayStr()),dim=new Date(D.getFullYear(),D.getMonth()+1,0).getDate(),dleft=dim-D.getDate()+1;
    const rows=statRow([
      {label:'Spent',value:inr(ms.total),sub:'my share this month'},
      {label:left>=0?'Left':'Over',value:inr(Math.abs(left)),sub:'of '+inr(cfg.limit),tone:left<0?'bad':pct>.8?'warn':''},
      {label:'Per day',value:inr(left>0?left/dleft:0),sub:left>0?'for '+dleft+' day'+(dleft===1?'':'s'):'over the limit'},
      {label:'Owed to you',value:inr(ot.get),sub:ot.get>0?'across '+ot.all.filter(o=>o.v>0).length+' people':'nobody',tone:ot.get>0?'good':''}
    ]);
    const tone=pct>1?'bad':pct>.8?'warn':'';
    const tick=clamp((D.getDate()/dim)*100,0,100).toFixed(1);
    const month='<section class="card"><h2>Spend against the limit<small>'+esc(monthName())+'</small></h2>'+
      '<div class="pace"><div class="bar thick '+tone+'"><i style="width:'+clamp(pct*100,0,100)+'%"></i></div><b class="tick" title="Where an even pace would be today" style="left:'+tick+'%"></b></div>'+
      '<div class="row sp" style="margin-top:8px;font-size:12px"><span class="muted">'+inr(ms.total)+' of '+inr(cfg.limit)+'</span><span class="muted mono">'+Math.round(pct*100)+'%</span></div>'+
      forecastLine(cfg,ms)+
      (s.up>0?'<p class="muted" style="font-size:12px;margin:10px 0 0">'+inr(s.up)+' is set aside for recurring bills still to post.</p>':'')+
      '<div class="row" style="margin-top:12px"><button class="btn sm" data-act="budgets">Edit limit and budgets</button></div></section>';
    return rows+grid([month,P.by['Add expense'],P.by['Where it goes'],P.by['Last 14 days']]);
  }

  /* ---- Spending ---- */
  function spending(cfg){
    const rq=(state.rq||'').trim().toLowerCase(),anm=id=>(cfg.accounts.find(a=>a.id===id)||{}).name||'';
    const all=state.entries.filter(e=>e.type==='txn'||e.type==='adjust'||e.type==='repay'||e.type==='paid')
      .filter(e=>!rq||[e.note,e.category,e.person,e.payer,anm(e.account),e.amount].join(' ').toLowerCase().includes(rq))
      .sort((a,b)=>a.date<b.date?1:a.date>b.date?-1:(b.ts||0)-(a.ts||0));
    const lim=Math.max(PAGE,state.mmShown||PAGE),shown=all.slice(0,lim);
    const dayTotal=d=>sum(state.entries.filter(e=>e.type==='txn'&&e.kind==='expense'&&e.date===d),mineOf);
    const del='<button class="x" data-act="entdel" data-id="';
    const row=e=>{
      if(e.type==='paid')return '<div class="li"><div class="m"><b>You paid '+esc(e.person)+'</b><span>'+esc(anm(e.account)||'No account')+'</span></div><span class="mono">−'+inr2(e.amount)+'</span>'+del+e.id+'" aria-label="Delete">×</button></div>';
      if(e.type==='repay')return '<div class="li"><div class="m"><b>Paid back by '+esc(e.person)+'</b><span>'+esc(anm(e.account)||'No account')+'</span></div><span class="mono" style="color:var(--good)">+'+inr2(e.amount)+'</span>'+del+e.id+'" aria-label="Delete">×</button></div>';
      if(e.type==='adjust')return '<div class="li"><div class="m"><b>Balance check-in</b><span>'+esc(anm(e.account))+'</span></div><span class="mono muted">'+(e.amount>=0?'+':'')+inr2(e.amount)+'</span><button class="btn sm ghost" data-act="entedit" data-id="'+e.id+'">Edit</button>'+del+e.id+'" aria-label="Delete">×</button></div>';
      return '<div class="li"><div class="m"><b>'+esc(e.note||e.category||'Entry')+'</b><span>'+esc(e.category||'')+' · '+esc(e.payer?'Paid by '+e.payer:anm(e.account))+(e.kind==='transfer'&&e.to?' to '+esc(anm(e.to)):'')+(e.split?' · your share '+inr2(e.mine):'')+'</span></div><span class="mono" style="color:'+(e.kind==='income'?'var(--good)':'var(--fg)')+'">'+(e.kind==='income'?'+':e.kind==='transfer'?'':'−')+inr2(e.amount)+'</span><button class="btn sm ghost" data-act="entedit" data-id="'+e.id+'">Edit</button>'+del+e.id+'" aria-label="Delete">×</button></div>';
    };
    let body='',cur=null,buf='';
    const flush=()=>{if(cur!==null){const tot=dayTotal(cur);body+='<div class="mm-day" data-day="'+cur+'" data-total="'+r2(tot)+'"><b>'+esc(dlabel(cur))+'</b><span class="mono">'+(tot>0?inr(tot)+' spent':'')+'</span></div><div class="list mm-list">'+buf+'</div>'}buf=''};
    shown.forEach(e=>{if(e.date!==cur){flush();cur=e.date}buf+=row(e)});flush();
    const more=all.length-shown.length;
    return '<section class="card"><h2>Spending<small>'+all.length+(rq?' found':' entries')+'</small></h2>'+
      '<input type="search" data-change="rq" value="'+esc(state.rq||'')+'" placeholder="Search note, category, person or account" aria-label="Search transactions" style="margin-bottom:6px;width:100%;box-sizing:border-box">'+
      (shown.length?body:emptyState(rq?'Nothing matches that search.':'Your entries will appear here.'))+
      (more>0?'<div class="row" style="margin-top:16px;justify-content:center"><button class="btn" data-act="mmore">Show '+Math.min(PAGE,more)+' more<span class="faint" style="margin-left:8px">'+more+' left</span></button></div>':'')+'</section>';
  }

  /* ---- People ---- */
  function people(cfg,P){
    const SF=staleFriends();
    const nudge=SF.length?'<section class="card"><h2>Time for a nudge<small>'+SF.length+' waiting</small></h2><div class="list mm-list">'+SF.map(o=>
      '<div class="li"><div class="m"><b>No payment from '+esc(o.p)+' in '+o.age+' days</b><span>'+esc(o.p)+' owes you '+inr2(o.v)+'</span></div><button class="btn sm" data-act="settle" data-p="'+esc(o.p)+'">Got paid back</button></div>').join('')+'</div></section>':'';
    return grid([nudge,P.by['People']]);
  }

  /* ---- Poker: drawdown chart (running peak minus running result, from pkSessions) ---- */
  function drawdownCard(ss){
    const head='<section class="card"><h2>Drawdown<small>how far below your best</small></h2>';
    if(!ss.length)return head+emptyState('Log a session to see how far you sit below your peak.')+'</section>';
    let cum=0,peak=0,max=0,mi=0;const dd=[0];
    ss.forEach((e,i)=>{cum+=(+e.cashout||0)-(+e.buyin||0);peak=Math.max(peak,cum);const d=peak-cum;dd.push(d);if(d>max){max=d;mi=i+1}});
    const n=dd.length,W=300,H=120,top=16,bot=100,L=8,R=292;
    const X=i=>n>1?L+i*(R-L)/(n-1):(L+R)/2,Y=v=>top+v/(max||1)*(bot-top);
    const pts=dd.map((v,i)=>X(i).toFixed(1)+','+Y(v).toFixed(1));
    const area='M'+X(0).toFixed(1)+','+top+' L'+pts.join(' L')+' L'+X(n-1).toFixed(1)+','+top+' Z';
    let lab='';
    if(max>0){
      const x=X(mi),y=Y(max),right=x>W/2;
      lab='<circle cx="'+x.toFixed(1)+'" cy="'+y.toFixed(1)+'" r="3.4" style="fill:var(--bad)"/>'+
        '<text class="dd-max" data-v="'+r2(max)+'" x="'+(right?x-7:x+7).toFixed(1)+'" y="'+Math.min(y+3,H-4).toFixed(1)+'" text-anchor="'+(right?'end':'start')+'" font-size="9" style="fill:var(--bad)">Biggest drawdown −'+inr(max)+'</text>';
    }
    const now=dd[n-1];
    return head+'<svg viewBox="0 0 '+W+' '+H+'" style="width:100%;height:auto" role="img" aria-label="Drawdown from peak over sessions">'+
      '<line x1="'+L+'" x2="'+R+'" y1="'+top+'" y2="'+top+'" stroke="var(--line2)"/>'+
      '<text x="'+L+'" y="10" font-size="8" style="fill:var(--faint)">Peak</text>'+
      '<path d="'+area+'" style="fill:var(--warn);opacity:.28"/><polyline fill="none" stroke="var(--warn)" stroke-width="2" stroke-linejoin="round" points="'+pts.join(' ')+'"/>'+lab+'</svg>'+
      '<p class="dd-cap muted" style="font-size:12px;margin:6px 0 0">'+(max>0?'Biggest drawdown '+inr(max)+'. ':'You have never been below your peak. ')+(now>0?'Right now you are '+inr(now)+' below your best.':'You are at your best now.')+'</p></section>';
  }

  function poker(){
    const ss=pkSessions(),P=secParts(OLD_POKER()),b=P.by;
    const alerts=P.order.filter(k=>k.charAt(0)==='#').map(k=>stripHero(b[k])).join('');
    const cash=P.hero?stripHero(P.hero):'';
    const top=alerts+cash;
    return (top?'<div class="grid w2">'+top+'</div>':'')+
      grid([b['Bankroll curve'],drawdownCard(ss),b['Poker analytics'],b['Each session'],b['Where the money stands'],
        b['Plan and calculator'],b['Progress'],b['Tables'],b['Other people, no table'],b['Log a session'],b['Sessions']].map(h=>h&&stripHero(h)));
  }

  /* ---- Manage ---- */
  function manage(P){
    return grid([P.by['Accounts'],P.by['Category budgets'],P.by['Recurring']].concat(cardsOf(lifeRenew()),cardsOf(lifeNw())));
  }

  function build(){
    const cfg=C(),ms=monthSpend(todayStr().slice(0,7)),cur=mmNow();
    let body;
    if(cur==='poker')body=poker();
    else if(cur==='list')body=grid([spending(cfg)]);
    else{
      const P=secParts(OLD_SPEND());
      body=cur==='people'?people(cfg,P):cur==='manage'?manage(P):overview(cfg,ms,P);
    }
    return heroHtml(cfg,ms)+navHtml(cur)+body;
  }
  vMoney=function(){return build()};

  /* "Show more" in Spending; everything else is handled by the existing click delegation */
  document.addEventListener('click',function(ev){
    const t=ev.target.closest&&ev.target.closest('[data-act="mmore"]');
    if(!t)return;
    state.mmShown=(state.mmShown||PAGE)+PAGE;render();
  });
  /* leaving the Spending tab or searching starts the list from the first page again */
  document.addEventListener('click',function(ev){
    const t=ev.target.closest&&ev.target.closest('[data-act="mm"]');
    if(t)state.mmShown=PAGE;
  },true);
})();

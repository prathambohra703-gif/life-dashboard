/* ---------- Morning paper ----------
   Today card + full-screen newspaper (docs/PAPER.md). Reads meta/paper-YYYY-MM-DD written by the morning agent,
   adds live app data. No top-level names; CSS lives here like today.js. */
(function(){
  if(typeof vToday!=='function'||!window.LD)return;
  const SECS=['Law & regulation','Finance','AI','Trading'];
  const stat={approved:'Added',dismissed:'Dismissed'};
  const papers=()=>LD.list('meta').filter(m=>/^paper-\d{4}-\d{2}-\d{2}$/.test(m.id)).sort((a,b)=>a.id<b.id?1:-1);
  const rec=id=>LD.get('meta',id);
  const dl=d=>dlabel(d);
  const fullDate=d=>dlabel(d)+' '+parse(d).getFullYear();

  try{
    if(!document.getElementById('pp-css')){
      const st=document.createElement('style');st.id='pp-css';
      st.textContent=
/* morning paper */
'.pp-card .pp-h{font:600 var(--t-h2)/1.2 var(--font-display);margin:var(--s2) 0}'+
'.pp-card p{margin:0 0 var(--s3);color:var(--mute);font-size:14px}.pp-card .row{gap:var(--s2)}'+
'#paper{position:fixed;inset:0;z-index:300;overflow:auto;background:#d9d3c4;color:#1c1a16;-webkit-overflow-scrolling:touch;--pp-ink:#1c1a16;--pp-mute:#5b564b;--pp-rule:#1c1a16}'+
'#paper *{box-sizing:border-box}'+
'.pp-bar{position:sticky;top:0;z-index:2;display:flex;gap:8px;justify-content:flex-end;padding:8px 16px;background:#d9d3c4;border-bottom:1px solid rgba(28,26,22,.25)}'+
'.pp-bar button{min-height:44px;padding:0 18px;border:1px solid #1c1a16;border-radius:99px;background:transparent;color:#1c1a16;font:600 14px var(--font-body);cursor:pointer}'+
'.pp-bar button.pri{background:#1c1a16;color:#f4efe2}'+
'.pp-sheet{max-width:1180px;margin:16px auto;padding:20px 16px 28px;background:#f4efe2;color:var(--pp-ink);font:15px/1.45 Georgia,"Times New Roman",serif;box-shadow:0 1px 14px rgba(0,0,0,.25)}'+
'@media (min-width:860px){.pp-sheet{padding:28px 36px 36px}}'+
'.pp-mast{text-align:center;border-bottom:3px double var(--pp-rule);padding-bottom:10px;margin-bottom:12px}'+
'.pp-mast h1{font:700 clamp(34px,8vw,64px)/1 var(--font-display);margin:0;letter-spacing:.01em;color:var(--pp-ink)}'+
'.pp-date{margin-top:8px;font:600 11px var(--font-body);letter-spacing:.16em;text-transform:uppercase;color:var(--pp-mute)}'+
'.pp-quote{margin:10px auto 0;max-width:62ch;font:italic 16px/1.4 var(--font-display);color:var(--pp-ink)}.pp-quote b{font:600 11px var(--font-body);font-style:normal;letter-spacing:.12em;text-transform:uppercase;color:var(--pp-mute);display:block;margin-top:4px}'+
'.pp-lbl{font:700 11px var(--font-body);letter-spacing:.16em;text-transform:uppercase;color:var(--pp-mute);margin:0 0 6px;font-variant:small-caps;text-transform:none;letter-spacing:.12em;font-size:13px}'+
'.pp-lead{padding:6px 0 14px;border-bottom:1px solid var(--pp-rule);margin-bottom:12px}'+
'.pp-lead h2{font:700 clamp(26px,5vw,42px)/1.1 var(--font-display);margin:0 0 8px;color:var(--pp-ink)}.pp-lead p{margin:0 0 6px;font-size:16px}'+
'.pp-src{font:12px var(--font-body);color:var(--pp-mute)}'+
'#paper a.pp-a{color:var(--pp-ink);text-decoration:none;display:block;padding:4px 0}#paper a.pp-a:hover,#paper a.pp-a:focus-visible{text-decoration:underline}'+
'.pp-secs{column-count:1;column-gap:24px}'+
'@media (min-width:700px){.pp-secs{column-count:2;column-rule:1px solid var(--pp-rule)}}'+
'@media (min-width:1100px){.pp-secs{column-count:3}}'+
'.pp-sec{break-inside:avoid;margin:0 0 14px}.pp-sec h3{font:700 12px var(--font-body);font-variant:small-caps;letter-spacing:.14em;margin:0 0 4px;padding-bottom:3px;border-bottom:1px solid var(--pp-rule);color:var(--pp-ink)}'+
'.pp-it{padding:6px 0;border-bottom:1px dotted rgba(28,26,22,.35)}.pp-it:last-child{border-bottom:0}'+
'.pp-it .pp-hd{font:700 17px/1.2 var(--font-display)}.pp-it .pp-gist{margin:2px 0;font-size:14px}'+
'.pp-mk{display:flex;flex-wrap:wrap;gap:6px 22px;padding:8px 0;margin:6px 0 12px;border-top:1px solid var(--pp-rule);border-bottom:1px solid var(--pp-rule)}'+
'.pp-mk div{font:13px var(--font-body);min-width:0}.pp-mk b{font:600 18px var(--font-display);margin-right:6px}.pp-mk span{color:var(--pp-mute);font-size:11px;display:block}'+
'.pp-g4{display:grid;grid-template-columns:1fr;gap:12px 24px}'+
'@media (min-width:700px){.pp-g4{grid-template-columns:1fr 1fr}}@media (min-width:1100px){.pp-g4{grid-template-columns:repeat(4,1fr)}}'+
'.pp-g4>section{min-width:0}.pp-g4 h3{font:700 12px var(--font-body);font-variant:small-caps;letter-spacing:.14em;margin:0 0 6px;padding-bottom:3px;border-bottom:1px solid var(--pp-rule)}'+
'.pp-row{display:flex;justify-content:space-between;gap:10px;padding:3px 0;font:13px/1.35 var(--font-body);border-bottom:1px dotted rgba(28,26,22,.3)}.pp-row:last-child{border-bottom:0}.pp-row span:first-child{min-width:0;overflow-wrap:anywhere}.pp-row b{font-weight:600;white-space:nowrap}'+
'.pp-none{font:13px var(--font-body);color:var(--pp-mute);margin:0}'+
'.pp-cal{margin-top:4px}'+
'html.pp-lock,html.pp-lock body{overflow:hidden}'+
'@page{size:A4;margin:10mm}'+
'@media print{'+
 'html,body{background:#fff!important;height:auto!important;overflow:visible!important}'+
 'body>*:not(#paper){display:none!important}'+
 '#paper{position:static!important;inset:auto;overflow:visible;background:#fff;display:block}'+
 '.pp-bar{display:none!important}'+
 '.pp-sheet{max-width:none;width:100%;margin:0;padding:0;box-shadow:none;background:#fff;font-size:8pt;line-height:1.28;max-height:276mm;overflow:hidden;break-inside:avoid}'+
 '.pp-mast{padding-bottom:4px;margin-bottom:6px}.pp-mast h1{font-size:30pt}.pp-date{margin-top:3px;font-size:7pt}.pp-quote{font-size:9pt;margin-top:4px}.pp-quote b{font-size:6.5pt}'+
 '.pp-lead{padding:2px 0 6px;margin-bottom:6px}.pp-lead h2{font-size:19pt;margin-bottom:3px}.pp-lead p{font-size:9pt;margin-bottom:2px;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}'+
 '.pp-secs{column-count:2;column-gap:12px;column-rule:.5pt solid #000}.pp-sec{margin-bottom:6px}.pp-sec h3{font-size:7.5pt}'+
 '.pp-it{padding:3px 0}.pp-it .pp-hd{font-size:9.5pt}.pp-it .pp-gist{font-size:7.5pt;margin:1px 0;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}.pp-src{font-size:6.5pt}'+
 '.pp-mk{padding:3px 0;margin:3px 0 6px;gap:3px 14px}.pp-mk div{font-size:7.5pt}.pp-mk b{font-size:10pt}.pp-mk span{font-size:6.5pt}'+
 '.pp-g4{grid-template-columns:repeat(4,1fr);gap:6px 12px}.pp-g4 h3{font-size:7pt;margin-bottom:3px}.pp-row{font-size:7.5pt;padding:1.5px 0}.pp-none{font-size:7.5pt}'+
 '.pp-g4 .pp-x{display:none}'+
 '#paper a.pp-a{padding:0;color:#000;text-decoration:none}'+
 '#paper a[href]:after{content:none!important}'+
'}';
      document.head.appendChild(st);
    }
  }catch(e){}

  /* ---------- Today card ---------- */
  function card(){
    const t=todayStr(),cur=rec('paper-'+t),old=papers().filter(m=>m.id!=='paper-'+t)[0];
    let head,sub='',btn='';
    if(cur){
      const n=cur.news||[],l=n[cur.lead||0]||n[0];
      head=l&&l.head?esc(l.head):'';
      btn='<button class="btn pri" data-pp="open" data-d="'+t+'">Open</button>';
      sub='Morning paper · '+dl(t);
    }else{
      sub='Morning paper · '+dl(t);
      if(old){head='Today’s paper is not ready yet';btn='<button class="btn" data-pp="open" data-d="'+old.id.slice(6)+'">Open latest</button>'}
      else head='Your first paper arrives at 5:45 AM';
    }
    return '<section class="card quiet pp-card" data-pp="card"><div class="lbl">'+esc(sub)+'</div><div class="pp-h">'+head+'</div>'+(btn?'<div class="row">'+btn+'</div>':'')+'</section>';
  }
  const _v=vToday;
  vToday=function(){
    const h=_v.apply(this,arguments);
    let c='';try{c='<div class="grid" style="margin-top:14px">'+card()+'</div>'}catch(e){return h}
    const g=h.indexOf('class="td-glance"'),k=g<0?-1:h.indexOf('<div class="grid',g);
    return k<0?h+c:h.slice(0,k)+c+h.slice(k);
  };

  /* ---------- live data for the paper ---------- */
  const row=(a,b)=>'<div class="pp-row"><span>'+esc(a)+'</span><b>'+esc(b)+'</b></div>';
  const none=t=>'<p class="pp-none">'+esc(t)+'</p>';
  function yesterday(t){
    const y=addDays(t,-1),dd=state.days[y]||{},tot=totals(y),T=C().targets,R=[];
    const any=state.days[y]||state.entries.some(e=>e.date===y);
    if(!any)return none('Nothing logged yesterday.');
    const H=habits(y);if(H.done>0||dd.habits)R.push(row('Habits',H.done+' of '+H.total));
    if(tot.water>0)R.push(row('Water',(tot.water/1000).toFixed(1)+' L of '+(T.waterMl/1000)+' L'));
    if(tot.nM>0){R.push(row('Protein',Math.round(tot.p)+' g of '+T.protein+' g'));R.push(row('Calories',Math.round(tot.kcal)+' kcal'))}
    if(+dd.steps>0)R.push(row('Steps',Number(dd.steps).toLocaleString('en-IN')));
    let s=0,n=0;for(let i=0;i<7;i++){const w=day(addDays(y,-i)).weight;if(w!=null&&w!==''&&!isNaN(+w)){s+=+w;n++}}
    if(n)R.push(row('Weight, 7-day avg',(s/n).toFixed(1)+' kg'));
    if(+dd.cfaMin>0)R.push(row('CFA',dd.cfaMin+' min'));
    if(+dd.studyMin>0)R.push(row('Study',dd.studyMin+' min'));
    const ex=state.entries.filter(e=>e.type==='txn'&&e.kind==='expense'&&e.date===y);
    if(ex.length){const dim=new Date(parse(y).getFullYear(),parse(y).getMonth()+1,0).getDate(),lim=+C().limit;R.push(row('Spend (your share)',inr(sum(ex,mineOf))+(lim>0?' of '+inr(Math.round(lim/dim)):'')))}
    return R.length?R.join(''):none('Nothing logged yesterday.');
  }
  function todo(t){
    const pr={high:0,med:1,low:2},open=state.todos.filter(x=>!x.done).sort((a,b)=>(pr[a.pri||'med']-pr[b.pri||'med'])).slice(0,6);
    const dues=acadList().filter(a=>a.d&&!a.done&&diff(a.d,t)>=0&&diff(a.d,t)<=7).sort((a,b)=>a.d<b.d?-1:1).slice(0,5);
    let h='';
    h+=open.length?open.map(x=>row((x.pri==='high'?'! ':'')+(x.title||''),x.due?dl(x.due):'')).join(''):none('No open to-dos.');
    h+='<div class="pp-lbl" style="margin-top:8px">Deadlines</div>';
    h+=dues.length?dues.map(a=>{const n=diff(a.d,t);return row(a.t,n===0?'today':n===1?'1 day':n+' days')}).join(''):none('None in the next 7 days.');
    return h;
  }
  function inbox(){
    const ps=LD.list('proposals').filter(p=>/^outlook-/.test(p.id)).sort((a,b)=>(+b.at||0)-(+a.at||0)||(a.id<b.id?1:-1)).slice(0,2),L=[];
    ps.forEach(p=>(p.items||[]).forEach(it=>L.push(it)));
    if(!L.length)return none('Nothing from your inbox.');
    return L.slice(0,10).map((it,i)=>'<div class="pp-row'+(i>=5?' pp-x':'')+'"><span>'+esc(propText(it))+(it.why?'<br><span class="pp-src">'+esc(it.why)+'</span>':'')+'</span><b>'+(stat[it.status]||'Pending')+'</b></div>').join('');
  }
  function plan(t){
    if(!(window.PROGRAM&&PROGRAM.on(t)))return '';
    const r=PROGRAM.withDate(t,()=>{const p=PLAN[DOW[parse(t).getDay()]],T=C().targets;return {name:PROGRAM.label(t,p),k:T.kcal,p:T.protein}});
    return '<section><h3>Today’s plan</h3>'+row('Session',r.name)+row('Calories',r.k+' kcal')+row('Protein',r.p+' g')+'</section>';
  }

  /* ---------- the newspaper ---------- */
  function sheet(d){
    const r=rec('paper-'+d)||{},news=Array.isArray(r.news)?r.news:[],li=news[r.lead||0]?(r.lead||0):0,lead=news[li],t=todayStr();
    const lnk=(x,c)=>'<a class="pp-a '+c+'" href="'+esc(x.url||'#')+'" target="_blank" rel="noopener">'+esc(x.head)+'</a>';
    const meta=x=>'<div class="pp-src">'+esc([x.src,x.when].filter(Boolean).join(' · '))+'</div>';
    const rest=news.filter((x,i)=>i!==li);
    const names=SECS.concat(rest.map(x=>x.sec).filter(s=>s&&!SECS.includes(s)).filter((s,i,a)=>a.indexOf(s)===i));
    const secs=names.map(s=>{const L=rest.filter(x=>x.sec===s);return L.length?'<section class="pp-sec" data-sec="'+esc(s)+'"><h3>'+esc(s)+'</h3>'+L.map(x=>'<article class="pp-it"><div class="pp-hd">'+lnk(x,'')+'</div>'+(x.gist?'<p class="pp-gist">'+esc(x.gist)+'</p>':'')+meta(x)+'</article>').join('')+'</section>':''}).join('');
    const q=r.quote&&r.quote.text?'<div class="pp-quote">“'+esc(r.quote.text)+'”'+(r.quote.by?'<b>'+esc(r.quote.by)+'</b>':'')+'</div>':'';
    const mk=(r.markets||[]).length?'<div class="pp-mk" data-pp="markets">'+r.markets.map(m=>'<div><b>'+esc(m.value)+'</b>'+esc(m.name)+' '+esc(m.chg||'')+'<span>'+esc(m.asof||'')+'</span></div>').join('')+'</div>':'';
    const cal=(r.calendar||[]).length?r.calendar.map(e=>row(e.title,e.time)).join(''):none('Nothing on the calendar today.');
    return '<div class="pp-bar"><button data-pp="print">Save as PDF</button><button class="pri" data-pp="close">Close</button></div>'+
      '<div class="pp-sheet" role="document"><header class="pp-mast"><h1>The Daily Brief</h1><div class="pp-date">'+esc(fullDate(d))+'</div>'+q+'</header>'+
      (lead?'<section class="pp-lead" data-pp="lead"><div class="pp-lbl">Lead story'+(lead.sec?' · '+esc(lead.sec):'')+'</div><h2>'+lnk(lead,'')+'</h2>'+(lead.gist?'<p>'+esc(lead.gist)+'</p>':'')+meta(lead)+'</section>':'')+
      '<div class="pp-secs">'+secs+'</div>'+mk+
      '<div class="pp-g4"><section data-pp="cal"><h3>Today’s calendar</h3><div class="pp-cal">'+cal+'</div></section>'+
      '<section><h3>Yesterday at a glance</h3>'+yesterday(d===t?t:d)+'</section>'+
      '<section><h3>To do</h3>'+todo(t)+'</section>'+
      '<section data-pp="inbox"><h3>From your inbox</h3>'+inbox()+'</section>'+plan(t)+'</div></div>';
  }
  function close(){
    const el=document.getElementById('paper');if(!el)return;
    el.remove();document.documentElement.classList.remove('pp-lock');
    try{const f=window.__ppPrev;window.__ppPrev=null;if(f&&f.isConnected)f.focus({preventScroll:true})}catch(e){}
  }
  function open(d){
    if(!rec('paper-'+d))return;
    close();window.__ppPrev=document.activeElement;
    const el=document.createElement('div');el.id='paper';el.setAttribute('role','dialog');el.setAttribute('aria-modal','true');el.setAttribute('aria-label','The Daily Brief');
    el.innerHTML=sheet(d);document.body.appendChild(el);document.documentElement.classList.add('pp-lock');
    el.scrollTop=0;const b=el.querySelector('[data-pp=close]');try{b&&b.focus({preventScroll:true})}catch(e){}
  }
  document.addEventListener('click',ev=>{
    const b=ev.target.closest&&ev.target.closest('[data-pp]');if(!b)return;
    const a=b.dataset.pp;
    if(a==='open')open(b.dataset.d);else if(a==='close')close();else if(a==='print')window.print();
  });
  document.addEventListener('keydown',ev=>{
    if(ev.key==='Escape'&&document.getElementById('paper')){close();ev.preventDefault();ev.stopImmediatePropagation()}
  },true);
})();

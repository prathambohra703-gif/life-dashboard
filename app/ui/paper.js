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

  const CSS=[
/* Today card */
'.pp-card{--pk:#9db39a}',
'.pp-card .pp-cm{font:700 22px/1 var(--font-display);letter-spacing:.01em;padding-bottom:8px;margin-bottom:10px;border-bottom:3px double var(--hair2)}',
'.pp-card .lbl{font-variant:small-caps;letter-spacing:.12em;text-transform:none;font-size:13px}',
'.pp-card .pp-k{font:700 12px var(--font-body);font-variant:small-caps;letter-spacing:.14em;margin:12px 0 0;color:var(--pk)}',
'.pp-card .pp-h{font:600 clamp(22px,5.6vw,26px)/1.18 var(--font-display);margin:6px 0 var(--s3)}',
'.pp-card p{margin:0 0 var(--s3);color:var(--mute);font-size:14px}.pp-card .row{gap:var(--s2)}',
/* paper shell and palettes */
'#paper{position:fixed;inset:0;z-index:300;overflow:auto;overflow-x:hidden;-webkit-overflow-scrolling:touch;background:var(--pp-bg);color:var(--pp-ink);scroll-behavior:auto}',
'#paper,#paper.pp-day{--pp-bg:#ece5d3;--pp-sheet:#f7f2e8;--pp-ink:#1b1915;--pp-mute:#5c5547;--pp-rule:#1b1915;--pp-hair:rgba(27,25,21,.16);--c-law:#7a1f2e;--c-fin:#1d3a6b;--c-ai:#0d6665;--c-trd:#2a5d2c;--c-def:#5c5547;--pp-up:#1b6a39;--pp-down:#a32323;--pp-pill:rgba(27,25,21,.07);--pp-shadow:0 1px 18px rgba(60,45,20,.22)}',
'#paper.pp-night{--pp-bg:#100f0d;--pp-sheet:#1c1a16;--pp-ink:#efe9dc;--pp-mute:#b3ab9b;--pp-rule:#efe9dc;--pp-hair:rgba(239,233,220,.17);--c-law:#f0909e;--c-fin:#97b8f0;--c-ai:#5fcfc6;--c-trd:#91d28d;--c-def:#b3ab9b;--pp-up:#6fd194;--pp-down:#ff8f86;--pp-pill:rgba(239,233,220,.09);--pp-shadow:0 1px 18px rgba(0,0,0,.5)}',
'#paper *{box-sizing:border-box}',
'.pp-bar{position:sticky;top:0;z-index:5;display:flex;gap:8px;align-items:center;justify-content:flex-end;padding:6px 16px;background:var(--pp-bg);border-bottom:1px solid var(--pp-hair);backdrop-filter:blur(6px)}',
'.pp-bar .pp-bt{margin-right:auto;font:600 12px var(--font-body);font-variant:small-caps;letter-spacing:.14em;color:var(--pp-mute);display:none}',
'@media (min-width:700px){.pp-bar .pp-bt{display:block}}',
'.pp-bar button{min-height:44px;min-width:44px;padding:0 16px;border:1px solid var(--pp-ink);border-radius:99px;background:transparent;color:var(--pp-ink);font:600 14px var(--font-body);cursor:pointer}',
'.pp-bar button.pri{background:var(--pp-ink);color:var(--pp-sheet)}',
'.pp-bar button:focus-visible,#paper a:focus-visible{outline:2px solid var(--c-fin);outline-offset:2px}',
'.pp-night .pp-bar button:focus-visible,.pp-night a:focus-visible{outline-color:var(--c-law)}',
'#paper h1,#paper h2,#paper .pp-hd{font-variant-numeric:lining-nums}.pp-sheet{max-width:1280px;margin:16px auto 40px;padding:22px 18px 32px;background:var(--pp-sheet);color:var(--pp-ink);font:17px/1.55 Georgia,"Times New Roman",serif;box-shadow:var(--pp-shadow)}',
'@media (max-width:429px){.pp-sheet{margin:0 0 24px;box-shadow:none}}',
'@media (min-width:860px){.pp-sheet{padding:36px 48px 52px}}',
/* masthead */
'.pp-mast{text-align:center;padding:14px 0 12px;border-top:1px solid var(--pp-rule);border-bottom:1px solid var(--pp-rule);position:relative;margin-bottom:6px}',
'.pp-mast:before,.pp-mast:after{content:"";position:absolute;left:0;right:0;height:1px;background:var(--pp-rule)}.pp-mast:before{top:3px}.pp-mast:after{bottom:3px}',
'.pp-mast h1{font:700 clamp(40px,11vw,84px)/1 var(--font-display);margin:6px 0 0;letter-spacing:.005em;color:var(--pp-ink)}',
'.pp-ed{margin:12px 8px 6px;font:600 12px/1.6 var(--font-body);font-variant:all-small-caps;letter-spacing:.14em;color:var(--pp-mute)}',
'@media (min-width:700px){.pp-ed{font-size:14px}}',
/* quote */
'.pp-quote{position:relative;margin:26px auto 22px;max-width:60ch;text-align:center;padding:0 8px}',
'.pp-quote:before{content:"\\201C";display:block;font:700 72px/.6 var(--font-display);color:var(--c-law);height:34px}',
'.pp-quote q{quotes:none;display:block;font:italic 400 clamp(21px,5.4vw,28px)/1.35 var(--font-display);color:var(--pp-ink)}',
'.pp-quote b{display:block;margin-top:12px;font:600 12px var(--font-body);font-style:normal;font-variant:all-small-caps;letter-spacing:.16em;color:var(--pp-mute)}',
'.pp-quote b:before{content:"";display:block;width:32px;height:1px;background:var(--pp-mute);margin:0 auto 10px}',
/* index */
'.pp-index{margin:0 0 20px;padding:10px 0 4px;border-top:1px solid var(--pp-hair);border-bottom:1px solid var(--pp-hair)}',
'.pp-index h2{font:700 12px var(--font-body);font-variant:all-small-caps;letter-spacing:.16em;color:var(--pp-mute);margin:0 0 2px}',
'.pp-index ul{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:1fr}',
'@media (min-width:700px){.pp-index ul{grid-template-columns:repeat(4,1fr);gap:0 24px}}',
'#paper a.pp-jump{display:flex;align-items:center;gap:10px;min-height:44px;padding:0;color:var(--pp-ink);text-decoration:none;font:600 15px var(--font-body)}',
'a.pp-jump i{width:10px;height:10px;border-radius:50%;background:var(--c);flex:none}',
'a.pp-jump span{margin-left:auto;font-variant-numeric:tabular-nums;color:var(--pp-mute);font-weight:500}',
'#paper a.pp-jump:hover b,#paper a.pp-jump:focus-visible b{text-decoration:underline;text-decoration-color:var(--c);text-underline-offset:4px;text-decoration-thickness:2px}',
'a.pp-jump b{font-weight:600}',
/* ticker */
'.pp-mk{display:flex;gap:10px;margin:0 0 24px;padding:2px 0 6px;overflow-x:auto;scrollbar-width:thin}',
'.pp-mk>div{flex:1 0 148px;border:1px solid var(--pp-hair);border-top:3px solid var(--pp-rule);padding:10px 12px;font:13px/1.3 var(--font-body);min-width:0}',
'.pp-mk .nm{display:block;font:600 12px var(--font-body);font-variant:all-small-caps;letter-spacing:.12em;color:var(--pp-mute)}',
'.pp-mk b{display:block;font:600 26px/1.15 var(--font-display);font-variant-numeric:tabular-nums lining-nums;margin:2px 0 0;color:var(--pp-ink)}',
'.pp-mk .ch{display:block;font:600 13px var(--font-body);font-variant-numeric:tabular-nums;color:var(--pp-mute)}.pp-mk .up{color:var(--pp-up)}.pp-mk .dn{color:var(--pp-down)}',
'.pp-mk .as{display:block;font:11px var(--font-body);color:var(--pp-mute);margin-top:2px}',
'.pp-mk.pp-empty{display:block;border:1px dashed var(--pp-hair);padding:10px 12px}',
/* layout */
'.pp-body{display:block}',
'@media (min-width:1100px){.pp-body{display:grid;grid-template-columns:minmax(0,1fr) 300px;gap:0 44px;align-items:start}.pp-side{border-left:1px solid var(--pp-hair);padding-left:36px}}',
/* lead */
'.pp-lead{--c:var(--c-def);padding:4px 0 24px;border-bottom:1px solid var(--pp-rule);margin-bottom:26px}',
'.pp-kick{display:flex;align-items:center;gap:10px;font:700 12px var(--font-body);font-variant:all-small-caps;letter-spacing:.16em;color:var(--c);margin:0 0 12px}',
'.pp-kick:before{content:"";width:28px;height:3px;background:var(--c);flex:none}',
'.pp-lead h2{font:700 clamp(30px,8vw,44px)/1.08 var(--font-display);margin:0 0 14px;letter-spacing:-.005em;color:var(--pp-ink)}',
'.pp-lead .pp-gist{font-size:19px;line-height:1.6;margin:0 0 12px;max-width:66ch}',
'.pp-lead .pp-gist:first-letter{float:left;font:700 3.5em/.78 var(--font-display);padding:.1em .1em 0 0;color:var(--c)}',
'.pp-foot{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap}',
'.pp-src{font:13px/1.4 var(--font-body);color:var(--pp-mute)}',
'#paper a.pp-a{color:var(--pp-ink);text-decoration:none}#paper a.pp-a:hover,#paper a.pp-a:focus-visible{text-decoration:underline;text-decoration-thickness:1px;text-underline-offset:3px}',
'#paper a.pp-rd{display:inline-flex;align-items:center;min-height:44px;padding:0 2px;font:700 14px var(--font-body);color:var(--c);letter-spacing:.02em}',
'#paper a.pp-rd:hover{text-decoration:underline}',
'.pp-lead a.pp-rd{border-bottom:2px solid var(--c);min-height:44px;padding:0}',
/* sections / stories */
'.pp-secs{column-count:1;column-gap:40px}',
'@media (min-width:700px){.pp-secs{column-count:2}}',
'@media (min-width:1100px){.pp-secs{column-count:3;column-rule:1px solid var(--pp-hair)}}',
'.pp-sec{--c:var(--c-def);margin:0 0 8px}',
'.pp-sec h3{break-after:avoid;font:700 13px var(--font-body);font-variant:all-small-caps;letter-spacing:.16em;margin:0 0 4px;padding:0;color:var(--c)}','.pp-sec,.pp-lead{scroll-margin-top:64px}',
'.pp-sec h3:before{content:"";display:block;width:28px;height:3px;background:var(--c);margin-bottom:10px}',
'.pp-it{break-inside:avoid;padding:14px 0 6px;border-bottom:1px solid var(--pp-hair);margin:0 0 6px}',
'.pp-sec .pp-it:last-child{border-bottom:0}',
'.pp-it .pp-hd{font:600 21px/1.2 var(--font-display);margin:0 0 6px}',
'.pp-it .pp-gist{margin:0 0 4px;font-size:17px;line-height:1.55;max-width:66ch}',
'.pp-it .pp-foot{gap:8px}',
'.pp-sec+.pp-sec{padding-top:12px}',
/* side panel */
'.pp-side{margin-top:16px;font-family:var(--font-body)}',
'@media (min-width:1100px){.pp-side{margin-top:0}}',
'.pp-side>section{margin:0 0 28px;min-width:0}',
'.pp-side h3{font:700 13px var(--font-body);font-variant:all-small-caps;letter-spacing:.16em;margin:0 0 8px;padding-bottom:8px;border-bottom:1px solid var(--pp-rule);color:var(--pp-ink)}',
'.pp-row{display:flex;justify-content:space-between;align-items:baseline;gap:14px;padding:8px 0;font:15px/1.4 var(--font-body);border-bottom:1px solid var(--pp-hair)}.pp-row:last-child{border-bottom:0}',
'.pp-row>span:first-child{min-width:0;overflow-wrap:anywhere}.pp-row>b{font-weight:600;white-space:nowrap;font-variant-numeric:tabular-nums lining-nums;text-align:right}',
'.pp-row .pp-src{display:block;font-size:12.5px}',
'.pp-dot>span:first-child{padding-left:22px;position:relative}.pp-dot>span:first-child:before{content:"";position:absolute;left:2px;top:.42em;width:11px;height:11px;border:1.5px solid var(--pp-mute);border-radius:50%}',
'.pp-dot.hi>span:first-child:before{border-color:var(--c-law);background:var(--c-law)}',
'.pp-pill{display:inline-block;font:600 11px/1 var(--font-body);font-variant:all-small-caps;letter-spacing:.1em;padding:5px 9px 4px;border-radius:99px;background:var(--pp-pill);color:var(--pp-mute)}',
'.pp-pill.pending{background:rgba(176,112,0,.16);color:#8a5200}.pp-pill.added{background:rgba(27,106,57,.14);color:var(--pp-up)}.pp-pill.dismissed{background:var(--pp-pill);color:var(--pp-mute)}',
'.pp-night .pp-pill.pending{background:rgba(240,180,80,.18);color:#f2c277}.pp-night .pp-pill.added{background:rgba(111,209,148,.16)}',
'.pp-sub{font:700 11px var(--font-body);font-variant:all-small-caps;letter-spacing:.16em;color:var(--pp-mute);margin:14px 0 0}',
'.pp-none{font:14px/1.5 var(--font-body);color:var(--pp-mute);margin:0;padding:6px 0}',
'.pp-empty-sec{font:italic 15px/1.5 var(--font-body);color:var(--pp-mute);padding:6px 0}',
/* motion */
'@keyframes ppin{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}',
'@media (prefers-reduced-motion:no-preference){.pp-sheet>*{animation:ppin .6s cubic-bezier(.2,.7,.2,1) both}.pp-sheet>*:nth-child(2){animation-delay:.05s}.pp-sheet>*:nth-child(3){animation-delay:.1s}.pp-sheet>*:nth-child(4){animation-delay:.15s}.pp-sheet>*:nth-child(5){animation-delay:.2s}.pp-sheet>*:nth-child(6){animation-delay:.25s}#paper{animation:ppfade .25s ease both}@keyframes ppfade{from{opacity:0}to{opacity:1}}}',
'html.pp-lock,html.pp-lock body{overflow:hidden}',
'@page{size:A4;margin:10mm}',
'@media print{',
 'html,body{background:#fff!important;height:auto!important;overflow:visible!important}',
 'body>*:not(#paper){display:none!important}',
 '#paper,#paper.pp-night{--pp-bg:#fff;--pp-sheet:#fff;--pp-ink:#1b1915;--pp-mute:#4d473b;--pp-rule:#1b1915;--pp-hair:rgba(27,25,21,.3);--c-law:#7a1f2e;--c-fin:#1d3a6b;--c-ai:#0d6665;--c-trd:#2a5d2c;--c-def:#4d473b;--pp-up:#1b6a39;--pp-down:#a32323;--pp-pill:rgba(27,25,21,.07)}',
 '#paper{position:static!important;inset:auto;overflow:visible;display:block;animation:none!important}',
 '.pp-sheet,.pp-sheet>*{animation:none!important}',
 '.pp-bar,.pp-index,.pp-rd{display:none!important}',
 '.pp-sheet{max-width:none;width:100%;margin:0;padding:0;box-shadow:none;background:#fff;font-size:8pt;line-height:1.28;max-height:276mm;overflow:hidden;break-inside:avoid}',
 '.pp-mast{padding:4px 0 3px;margin-bottom:4px}.pp-mast h1{font-size:30pt;margin-top:3px}.pp-ed{font-size:7pt;margin:3px 0 0}',
 '.pp-quote{margin:5px auto 5px;max-width:none}.pp-quote:before{display:none}.pp-quote q{font-size:9pt;line-height:1.3}.pp-quote b{font-size:6.5pt;margin-top:2px}.pp-quote b:before{display:none}',
 '.pp-mk{margin:0 0 5px;padding:0;gap:6px;overflow:visible}.pp-mk>div{flex:1;padding:3px 6px;border-top-width:2px}.pp-mk .nm{font-size:6.5pt}.pp-mk b{font-size:11pt}.pp-mk .ch{font-size:7pt}.pp-mk .as{font-size:6pt;margin:0}',
 '.pp-body{display:block}.pp-lead{padding:0 0 5px;margin-bottom:6px}.pp-kick{font-size:6.5pt;margin-bottom:3px}.pp-lead h2{font-size:19pt;margin-bottom:3px}',
 '.pp-lead .pp-gist{font-size:9pt;line-height:1.3;margin-bottom:2px;max-width:none;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}.pp-lead .pp-gist:first-letter{font-size:3em}',
 '.pp-secs{column-count:2;column-gap:12px;column-rule:.5pt solid #999}.pp-sec{margin-bottom:3px}.pp-sec+.pp-sec{padding-top:3px}.pp-sec h3{font-size:7pt}.pp-sec h3:before{height:2px;margin-bottom:3px}',
 '.pp-it{padding:3px 0 2px;margin:0}.pp-it .pp-hd{font-size:9.5pt;margin-bottom:1px}.pp-it .pp-gist{font-size:7.5pt;margin:0;max-width:none;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}.pp-src{font-size:6.5pt}',
 '.pp-side{margin-top:6px;border:0;padding:0;border-top:1px solid #000;padding-top:4px;display:grid;grid-template-columns:repeat(auto-fit,minmax(30mm,1fr));gap:0 12px}.pp-side>section{margin:0}',
 '.pp-side h3{font-size:7pt;margin-bottom:2px;padding-bottom:2px}.pp-row{font-size:7.5pt;padding:1.5px 0;gap:6px}.pp-row .pp-src{font-size:6.5pt}.pp-none{font-size:7.5pt;padding:2px 0}.pp-sub{margin-top:4px;font-size:6.5pt}',
 '.pp-dot>span:first-child{padding-left:12px}.pp-dot>span:first-child:before{width:6px;height:6px;top:.5em}.pp-pill{font-size:6pt;padding:2px 5px 1px}',
 '.pp-side .pp-x{display:none}',
 '#paper a.pp-a{padding:0;color:#000;text-decoration:none}',
 '#paper a[href]:after{content:none!important}',
'}'].join('');
  try{
    if(!document.getElementById('pp-css')){
      const st=document.createElement('style');st.id='pp-css';st.textContent=CSS;document.head.appendChild(st);
    }
  }catch(e){}

  /* ---------- Today card ---------- */
  const SEC_NIGHT={'Law & regulation':'#f0909e','Finance':'#97b8f0','AI':'#5fcfc6','Trading':'#91d28d'};
  function card(){
    const t=todayStr(),cur=rec('paper-'+t),old=papers().filter(m=>m.id!=='paper-'+t)[0];
    let head,sub='',btn='',kick='';
    sub='Morning paper · '+dl(t);
    if(cur){
      const n=cur.news||[],l=n[cur.lead||0]||n[0];
      head=l&&l.head?esc(l.head):'';
      if(l&&l.sec)kick='<div class="pp-k" style="color:'+(SEC_NIGHT[l.sec]||'var(--accent)')+'">'+esc(l.sec)+'</div>';
      btn='<button class="btn pri" data-pp="open" data-d="'+t+'">Read today’s paper</button>';
    }else{
      if(old){head='Today’s paper is not ready yet';btn='<button class="btn" data-pp="open" data-d="'+old.id.slice(6)+'">Open latest</button>'}
      else head='Your first paper arrives at 5:45 AM';
    }
    return '<section class="card quiet pp-card" data-pp="card"><div class="pp-cm">The Daily Brief</div><div class="lbl">'+esc(sub)+'</div>'+kick+'<div class="pp-h">'+head+'</div>'+(btn?'<div class="row">'+btn+'</div>':'')+'</section>';
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
    h+=open.length?open.map(x=>'<div class="pp-row pp-dot'+(x.pri==='high'?' hi':'')+'"><span>'+esc(x.title||'')+'</span><b>'+esc(x.due?dl(x.due):'')+'</b></div>').join(''):none('No open to-dos.');
    h+='<div class="pp-sub">Deadlines</div>';
    h+=dues.length?dues.map(a=>{const n=diff(a.d,t);return row(a.t,n===0?'today':n===1?'1 day':n+' days')}).join(''):none('None in the next 7 days.');
    return h;
  }
  function inbox(){
    const ps=LD.list('proposals').filter(p=>/^outlook-/.test(p.id)).sort((a,b)=>(+b.at||0)-(+a.at||0)||(a.id<b.id?1:-1)).slice(0,2),L=[];
    ps.forEach(p=>(p.items||[]).forEach(it=>L.push(it)));
    if(!L.length)return none('Nothing from your inbox.');
    return L.slice(0,10).map((it,i)=>{const s=stat[it.status]||'Pending';return '<div class="pp-row'+(i>=5?' pp-x':'')+'"><span>'+esc(propText(it))+(it.why?'<span class="pp-src">'+esc(it.why)+'</span>':'')+'</span><b><span class="pp-pill '+s.toLowerCase()+'">'+s+'</span></b></div>'}).join('');
  }
  function plan(t){
    if(!(window.PROGRAM&&PROGRAM.on(t)))return '';
    const r=PROGRAM.withDate(t,()=>{const p=PLAN[DOW[parse(t).getDay()]],T=C().targets;return {name:PROGRAM.label(t,p),k:T.kcal,p:T.protein}});
    return '<section data-pp="plan"><h3>Today’s plan</h3>'+row('Session',r.name)+row('Calories',r.k+' kcal')+row('Protein',r.p+' g')+'</section>';
  }

  /* ---------- the newspaper ---------- */
  const MON=['January','February','March','April','May','June','July','August','September','October','November','December'];
  const WD=['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const longDate=d=>{const x=parse(d);return WD[x.getDay()]+', '+x.getDate()+' '+MON[x.getMonth()]+' '+x.getFullYear()};
  const SC={'Law & regulation':'law','Finance':'fin','AI':'ai','Trading':'trd'};
  const cv=s=>'--c:var(--c-'+(SC[s]||'def')+')';
  const slug=s=>'pp-s-'+(SC[s]||String(s).toLowerCase().replace(/[^a-z0-9]+/g,'-'));
  function mode(){
    try{const m=localStorage.getItem('pp-mode');if(m==='day'||m==='night')return m}catch(e){}
    const h=new Date().getHours();return(h<7||h>=20)?'night':'day';
  }
  function sheet(d){
    const r=rec('paper-'+d)||{},news=Array.isArray(r.news)?r.news:[],li=news[r.lead||0]?(r.lead||0):0,lead=news[li],t=todayStr();
    const href=x=>esc(x.url||'#');
    const lnk=x=>'<a class="pp-a" href="'+href(x)+'" target="_blank" rel="noopener">'+esc(x.head)+'</a>';
    const rd=x=>'<a class="pp-a pp-rd" href="'+href(x)+'" target="_blank" rel="noopener" aria-label="Read the story: '+esc(x.head)+'">Read the story →</a>';
    const rds=x=>'<a class="pp-a pp-rd" href="'+href(x)+'" target="_blank" rel="noopener" aria-label="Read: '+esc(x.head)+'">Read →</a>';
    const meta=x=>'<span class="pp-src">'+esc([x.src,x.when].filter(Boolean).join(' · '))+'</span>';
    const rest=news.filter((x,i)=>i!==li);
    const names=SECS.concat(news.map(x=>x.sec).filter(s=>s&&!SECS.includes(s)).filter((s,i,a)=>a.indexOf(s)===i));
    const secs=names.map(s=>{const L=rest.filter(x=>x.sec===s);return L.length?'<section class="pp-sec" id="'+slug(s)+'" data-sec="'+esc(s)+'" style="'+cv(s)+'"><h3>'+esc(s)+'</h3>'+L.map(x=>'<article class="pp-it"><div class="pp-hd">'+lnk(x)+'</div>'+(x.gist?'<p class="pp-gist">'+esc(x.gist)+'</p>':'')+'<div class="pp-foot">'+meta(x)+rds(x)+'</div></article>').join('')+'</section>':''}).join('');
    const idx=names.map(s=>{const n=news.filter(x=>x.sec===s).length;if(!n)return '';const has=rest.some(x=>x.sec===s);return '<li><a class="pp-jump" href="#" data-pp="jump" data-t="'+(has?slug(s):'pp-lead')+'" style="'+cv(s)+'"><i></i><b>'+esc(s)+'</b><span>'+n+'</span></a></li>'}).join('');
    const words=news.reduce((n,x)=>n+((x.head||'')+' '+(x.gist||'')).split(/\s+/).filter(Boolean).length,0),mins=Math.max(2,Math.ceil(words/220));
    const ed=Math.max(1,papers().filter(m=>m.id<='paper-'+d).length);
    const q=r.quote&&r.quote.text?'<figure class="pp-quote" style="margin-left:auto;margin-right:auto"><q>'+esc(r.quote.text)+'</q>'+(r.quote.by?'<b>'+esc(r.quote.by)+'</b>':'')+'</figure>':'';
    const mk=Array.isArray(r.markets)?(r.markets.length?'<div class="pp-mk" data-pp="markets" role="list">'+r.markets.map(m=>{const c=String(m.chg||'').trim(),dn=/^[-−–]/.test(c),up=/^\+/.test(c);return '<div role="listitem"><span class="nm">'+esc(m.name)+'</span><b>'+esc(m.value)+'</b><span class="ch '+(dn?'dn':up?'up':'')+'">'+(dn?'▼ ':up?'▲ ':'')+esc(c.replace(/^[-+−–]\s*/,dn?'−':'+'))+'</span><span class="as">'+esc(m.asof||'')+'</span></div>'}).join('')+'</div>':'<div class="pp-mk pp-empty" data-pp="markets"><p class="pp-none" style="padding:0">Market figures could not be confirmed this morning.</p></div>'):'';
    const cal=(r.calendar||[]).length?r.calendar.map(e=>row(e.title,e.time)).join(''):none('Nothing on the calendar today.');
    const m=mode();
    return '<div class="pp-bar"><span class="pp-bt">The Daily Brief</span><button data-pp="mode" aria-label="Switch reading mode">'+(m==='night'?'Day':'Night')+'</button><button data-pp="print">Save as PDF</button><button class="pri" data-pp="close">Close</button></div>'+
      '<div class="pp-sheet" role="document"><header class="pp-mast"><h1>The Daily Brief</h1><div class="pp-ed" data-pp="edition">Vol. I · No. '+ed+' · '+esc(longDate(d))+' · '+mins+' min read</div></header>'+
      mk+q+
      (idx?'<nav class="pp-index" data-pp="index" aria-label="In this edition"><h2>In this edition</h2><ul>'+idx+'</ul></nav>':'')+
      '<div class="pp-body"><main class="pp-main">'+
      (lead?'<section class="pp-lead" id="pp-lead" data-pp="lead" style="'+cv(lead.sec)+'"><div class="pp-kick">Lead story'+(lead.sec?' · '+esc(lead.sec):'')+'</div><h2>'+lnk(lead)+'</h2>'+(lead.gist?'<p class="pp-gist">'+esc(lead.gist)+'</p>':'')+'<div class="pp-foot">'+meta(lead)+rd(lead)+'</div></section>':'')+
      '<div class="pp-secs">'+secs+'</div></main>'+
      '<aside class="pp-side" aria-label="Your day"><section data-pp="cal"><h3>Today’s calendar</h3><div class="pp-cal">'+cal+'</div></section>'+plan(t)+
      '<section data-pp="yday"><h3>Yesterday at a glance</h3>'+yesterday(d===t?t:d)+'</section>'+
      '<section data-pp="todo"><h3>To do</h3>'+todo(t)+'</section>'+
      '<section data-pp="inbox"><h3>From your inbox</h3>'+inbox()+'</section></aside></div></div>';
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
    el.className='pp-'+mode();el.innerHTML=sheet(d);document.body.appendChild(el);document.documentElement.classList.add('pp-lock');
    el.scrollTop=0;const b=el.querySelector('[data-pp=close]');try{b&&b.focus({preventScroll:true})}catch(e){}
  }
  document.addEventListener('click',ev=>{
    const b=ev.target.closest&&ev.target.closest('[data-pp]');if(!b)return;
    const a=b.dataset.pp;
    if(a==='open')open(b.dataset.d);
    else if(a==='close')close();
    else if(a==='print')window.print();
    else if(a==='mode'){
      const el=document.getElementById('paper');if(!el)return;
      const n=el.classList.contains('pp-night')?'day':'night';
      el.classList.remove('pp-day','pp-night');el.classList.add('pp-'+n);b.textContent=n==='night'?'Day':'Night';
      try{localStorage.setItem('pp-mode',n)}catch(e){}
    }else if(a==='jump'){
      ev.preventDefault();const el=document.getElementById(b.dataset.t);
      if(el){let rm=false;try{rm=matchMedia('(prefers-reduced-motion:reduce)').matches}catch(e){}el.scrollIntoView({behavior:rm?'auto':'smooth',block:'start'})}
    }
  });
  document.addEventListener('keydown',ev=>{
    if(ev.key==='Escape'&&document.getElementById('paper')){close();ev.preventDefault();ev.stopImmediatePropagation()}
  },true);
})();

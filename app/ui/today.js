/* ---------- Today and Progress (design layer B1) ----------
   Overrides vToday, vProgress and dayPeriod by reassignment. Composes the existing card functions;
   keeps the reg card registry and LOOK.order / LOOK.hidden semantics. No top-level names. */
(function(){
  if(typeof vToday!=='function'||typeof secHero!=='function')return;

  /* small layout rules for the pieces this layer adds (tokens from design.css) */
  try{
    if(!document.getElementById('td-css')){
      const st=document.createElement('style');st.id='td-css';
      st.textContent=
        '.td-hero .sec-hero__eyebrow{color:var(--fg);opacity:.92}'+
        '.td-hero .sec-hero__chips button.pill{padding:0 14px;max-width:100%}'+
        '.td-hero .sec-hero__chips button.pill span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}'+
        '.td-exam{margin-top:var(--s4);padding:var(--s3) var(--s4)!important}'+
        '.td-exam__row{display:flex;flex-wrap:wrap;gap:var(--s2) var(--s5);margin-top:var(--s2)}'+
        '.td-ex{display:flex;align-items:baseline;gap:var(--s2);min-width:0;font-size:13px}'+
        '.td-ex b{font:500 22px/1 var(--font-display);color:var(--accent2)}'+
        '.td-ex span{color:var(--mute);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:22ch}'+
        '.td-exam p{margin:var(--s2) 0 0;font-size:12px}'+
        '.td-streak{margin-top:var(--s3);gap:var(--s1) var(--s2);align-items:center}'+
        '.td-streak a{color:var(--accent);text-decoration:none;font-weight:600;font-size:14px;margin-left:auto}'+
        '.td-glance{margin-top:var(--s4)}'+
        '.td-ritual{grid-column:1/-1}'+
        '.td-ritual .td-last{margin:0 0 var(--s3);font-size:14px;color:var(--accent2)}'+
        '.td-ritual .td-q{display:grid;gap:var(--s3);margin-top:var(--s3)}'+
        '@media (min-width:860px){.td-ritual .td-q{grid-template-columns:1fr 1fr}}'+
        '.td-wk{display:grid;gap:var(--s2);padding:var(--s3) 0;border-top:1px solid var(--line)}.td-wk:first-of-type{border-top:0}'+
        '.td-wk__h{display:flex;justify-content:space-between;align-items:baseline;gap:var(--s3)}.td-wk__h b{font-size:15px}.td-wk__h span{font-size:13px;color:var(--accent2)}'+
        '.td-wk__dots{display:flex;gap:8px;align-items:flex-start;flex-wrap:wrap}.td-dot{display:flex;flex-direction:column;align-items:center;gap:3px;font-size:10px;color:var(--mute)}'+
        '.td-dot i{width:14px;height:14px;border-radius:50%;border:1.5px solid var(--line2);box-sizing:border-box}.td-dot i.on{background:var(--accent);border-color:var(--accent)}.td-dot i.miss{background:var(--line2)}'+
        '.td-wk__f{display:flex;align-items:center;justify-content:space-between;gap:var(--s3);font-size:13px;color:var(--mute)}'+
        '.td-wk__f input{width:72px;min-height:44px;text-align:center}'+
        '.td-pat p{margin:0 0 var(--s2);font-size:14px}'+
        '.td-settle{align-items:center;gap:var(--s3)}.td-settle .btn{min-height:44px;flex:none}'+
        '.td-back{margin-top:var(--s3)}#app:has(>.td-back:first-child){padding-top:var(--s2)!important}';
      document.head.appendChild(st);
    }
  }catch(e){}

  /* night now starts at 22:30 (was 21:30); the rest is unchanged */
  dayPeriod=function(){
    if(state.date!==todayStr())return 'day';
    const n=new Date(),h=n.getHours()+n.getMinutes()/60,hh=h<DAYEND?h+24:h;
    return hh>=22.5?'night':hh<11?'morning':'day';
  };

  const PERL={morning:'Morning',day:'Daytime',night:'Night'};
  const short=(s,n)=>{s=String(s||'');return s.length>n?s.slice(0,n-1).trimEnd()+'…':s};
  const inDays=n=>n===0?'today':n===1?'tomorrow':'in '+n+' days';
  const L1=v=>(v/1000).toFixed(1).replace(/\.0$/,'');
  /* same selection as examCard: undone Exam, Test or Submission from the viewed date on */
  const examsFrom=d=>acadList().filter(a=>a.d&&!a.done&&(a.k==='Exam'||a.k==='Test'||a.k==='Submission')&&diff(a.d,d)>=0).sort((a,b)=>a.d<b.d?-1:1);
  /* LOOK.order sorts, LOOK.hidden removes (same rules as the old vToday) */
  const lookSort=a=>{
    const r=a.filter(k=>!LOOK.hidden.includes(k));if(!LOOK.order.length)return r;
    const lk=k=>{const o=LOOK.order.indexOf(k);return o<0?999:o};
    return r.map((k,i)=>[k,i]).sort((x,y)=>(lk(x[0])-lk(y[0]))||(x[1]-y[1])).map(x=>x[0]);
  };
  /* render a card function for another date without touching its logic */
  const onDate=(d,fn)=>{const s=state.date;state.date=d;try{return fn()}finally{state.date=s}};


  /* ---------- weekly targets (Monday to Sunday weeks) ---------- */
  const WK_DEF={gym:5,protein:5,cfa:6};
  const WK_LBL={gym:'Gym',protein:'Protein',cfa:'CFA'};
  const WK_ORD=['gym','protein','cfa'];
  const WKD=['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
  const weeklyCfg=()=>{const w=C().weekly||{},o={};WK_ORD.forEach(k=>{const n=Math.round(+w[k]);o[k]=n>=1&&n<=7?n:WK_DEF[k]});return o};
  const mondayOf=d=>addDays(d,-((parse(d).getDay()+6)%7));
  const metOn=(k,d)=>{
    if(k==='gym')return !!((day(d).habits||{}).gym);
    const T=C().targets;
    if(k==='protein')return totals(d).p>=T.protein;
    const need=examOn(d)?Math.min(T.cfaMin,30):T.cfaMin;
    return (day(d).cfaMin||0)>=need;
  };
  function weeklyStreaks(){
    const t=todayStr(),W=weeklyCfg(),mon=mondayOf(t),keys=Object.keys(state.days).sort(),first=keys[0]?mondayOf(keys[0]):mon;
    return WK_ORD.map(k=>{
      const days=[];for(let i=0;i<7;i++){const d=addDays(mon,i);days.push({d,met:d<=t&&metOn(k,d),future:d>t})}
      const count=days.filter(x=>x.met).length,hit=count>=W[k];
      let streak=hit?1:0,m=addDays(mon,-7),g=0;
      while(m>=first&&g++<520){
        let c=0;for(let i=0;i<7;i++)if(metOn(k,addDays(m,i)))c++;
        if(c>=W[k]){streak++;m=addDays(m,-7)}else break;
      }
      const left=days.filter(x=>x.d>=t).length-(days.find(x=>x.d===t&&x.met)?1:0);
      return {k,label:WK_LBL[k],target:W[k],days,count,hit,streak,need:Math.max(0,W[k]-count),left};
    });
  }
  const weekWord=n=>n+(n===1?' week':' weeks');
  function weeklyCard(){
    const rows=weeklyStreaks().map(r=>
      '<div class="td-wk" data-td="wk" data-k="'+r.k+'"><div class="td-wk__h"><b>'+r.label+'</b><span class="td-wk__s">'+weekWord(r.streak)+'</span></div>'+
      '<div class="td-wk__dots" role="img" aria-label="'+r.label+': '+r.count+' of '+r.target+' days this week">'+r.days.map((x,i)=>'<span class="td-dot"><i class="'+(x.met?'on':x.future?'':'miss')+'"></i>'+WKD[i][0]+'</span>').join('')+
      '<span class="mono td-wk__c" style="margin-left:auto;align-self:center;font-size:14px">'+r.count+' of '+r.target+' days</span></div>'+
      '<label class="td-wk__f"><span>Target, days a week</span><input type="number" min="1" max="7" step="1" inputmode="numeric" data-change="wkt" data-k="'+r.k+'" value="'+r.target+'" aria-label="'+r.label+' target days per week"></label></div>').join('');
    return '<section class="card" data-td="weekly"><h2>Weekly targets<small>Monday to Sunday</small></h2>'+rows+
      '<p class="faint" style="font-size:12px;margin:6px 0 0">The streak counts full weeks that hit the target, plus this week once it does.</p></section>';
  }
  /* the one target furthest behind that can still be reached this week */
  function weeklyChip(){
    const c=weeklyStreaks().filter(r=>r.need>0&&r.need<=r.left).sort((a,b)=>b.need-a.need)[0];
    return c?'<span class="pill warn" data-td="wkchip">'+c.label+' '+c.count+' of '+c.target+' this week</span>':'';
  }

  /* ---------- patterns (Progress > Week) ---------- */
  function patternsCard(){
    const keys=Object.keys(state.days).filter(k=>k<=todayStr()&&score(k)>0);
    if(keys.length<14)return '<section class="card flat" data-td="patterns"><div class="empty">Patterns appear after 14 days of data. '+keys.length+' so far.</div></section>';
    const t=todayStr(),rows=[];
    for(let i=1;i<=75;i++){const d=addDays(t,-i),s=sleepInfo(d);if(!s)continue;rows.push({s:s.score,m:(day(d).studyMin||0)+(day(d).cfaMin||0)})}
    const good=rows.filter(r=>r.s>=75),poor=rows.filter(r=>r.s<60),avg=l=>l.reduce((a,r)=>a+r.m,0)/l.length;
    const L=[];
    if(good.length>=3&&poor.length>=3)L.push('After nights with a sleep score of 75 or more you log '+Math.round(avg(good))+' min of study and CFA on average, against '+Math.round(avg(poor))+' after poor nights (n = '+good.length+' and '+poor.length+' nights).');
    const e=sleepEffect();
    if(e.ok&&e.good.m!=null&&e.poor.m!=null)L.push('Your mood averages '+e.good.m.toFixed(1)+' of 5 after nights scoring 75 or more, against '+e.poor.m.toFixed(1)+' after poor nights (n = '+e.good.n+' and '+e.poor.n+' nights).');
    /* gym against next-day score is already in the Insights card */
    return '<section class="card td-pat" data-td="patterns"><h2>Patterns<small>'+keys.length+' days of data</small></h2>'+
      (L.length?L.map(x=>'<p>'+esc(x)+'</p>').join(''):'<div class="empty">No clear pattern yet. Sleep patterns need three good and three poor nights.</div>')+'</section>';
  }

  /* ---------- settle-up lines in the Nudges card ---------- */
  function settleLines(){
    if(state.date!==todayStr())return '';
    return staleFriends().slice(0,2).map(o=>'<div class="li td-settle" data-td="settle"><div class="m"><b>Settle up</b><span style="white-space:normal">'+esc(o.p)+' has owed you '+inr(o.v)+' for '+o.age+' days. Nudge them, or mark it paid.</span></div>'+
      '<button class="btn sm" data-act="tab" data-v="money" data-td="settle-go">Open People</button></div>').join('');
  }
  function nudgesPlus(){
    const html=nudges(),extra=settleLines();
    if(!extra)return html;
    if(!html)return '<section class="card" style="margin-top:14px;border-color:color-mix(in srgb,var(--warn) 45%,var(--line))"><h2>Nudges<small>right now</small></h2><div class="list">'+extra+'</div></section>';
    return html.replace(/<\/div><\/section>$/,extra+'</div></section>');
  }

  function examBanner(d){
    const ups=examsFrom(d).slice(0,3);
    return '<section class="card quiet td-exam" data-td="exam"><div class="lbl">Exam week</div>'+
      (ups.length?'<div class="td-exam__row">'+ups.map(a=>{const n=diff(a.d,d);return '<div class="td-ex"><b class="mono">'+(n===0?'Today':n+' d')+'</b><span>'+cdot(a.c)+esc(cshort(a.c))+' · '+esc(a.k)+'</span></div>'}).join('')+'</div>':'')+
      '<p class="faint">CFA eases to 30 min, the gym is optional and the streak bar drops to 60%.</p></section>';
  }

  function ritualCard(d){
    const dd=day(d),prev=day(addDays(d,-7)).focus;
    let w=weekCard().replace(/^<section class="card">/,'').replace(/<\/section>$/,'')
      .replace('<h2>Weekly review','<h2>Sunday review')
      .replace('<span>Your reflection</span>','<span>What worked this week?</span>')
      .replace('placeholder="What worked this week? One thing to change next week."','placeholder="The habit, routine or choice that paid off"');
    return '<section class="card td-ritual" data-td="ritual">'+
      (prev?'<p class="td-last">Last week you chose: <b>'+esc(prev)+'</b></p>':'')+w+
      '<div class="td-q"><label class="fld"><span>One thing to change</span><input type="text" id="revfix" data-change="revfix" maxlength="160" value="'+esc(dd.fix||'')+'" placeholder="Small and specific"></label>'+
      '<label class="fld"><span>Next week’s single focus</span><input type="text" id="revfocus" data-change="revfocus" maxlength="160" value="'+esc(dd.focus||'')+'" placeholder="One thing, said plainly"></label></div></section>';
  }

  vToday=function(){
    const d=state.date,cfg=C(),T=cfg.targets,H=habits(d),dd=day(d),tot=totals(d),t=todayStr();
    const wk=weekIndex(d),plan=PLAN[DOW[parse(d).getDay()]];
    const planTxt=wk<1?('Plan starts '+dlabel(cfg.planStart)):(wk>cfg.planWeeks?'Plan complete':('Week '+wk+' · '+plan.name));
    const nx=acadList().filter(a=>a.d&&!a.done&&diff(a.d,t)>=0).sort((a,b)=>a.d<b.d?-1:1)[0];
    const per=dayPeriod(),ex=examOn(d),sun=parse(d).getDay()===0,ritual=sun&&d===t;
    const ne=ex?examsFrom(d)[0]:null,si=streakInfo(),run=si.run,left=H.total-H.done;

    /* ---- hero ---- */
    const mode=ex&&ritual?'Exam week · Sunday review':ex?'Exam week':sun?'Sunday review':PERL[per];
    let number,unit;
    if(ne){const n=diff(ne.d,d);number=n===0?'Today':String(n);unit=(n===0?'':n===1?'day to ':'days to ')+cshort(ne.c)}
    else if(per==='night'){number=String(run);unit=run===1?'day streak':'day streak'}
    else{number=String(left);unit=left===1?'habit left':'habits left'}
    let sub;
    if(ne)sub='Next exam: '+cshort(ne.c)+' '+ne.k.toLowerCase()+' '+inDays(diff(ne.d,d))+'.';
    else if(nx)sub='Next deadline: '+short(nx.t,48)+', '+(diff(nx.d,t)===0?'due today':'due '+inDays(diff(nx.d,t)))+'.';
    else{const b=planFor(d);sub=b.length?'Plan today: '+b.map(x=>cshort(x.c)+' '+x.min+' min').join(', ')+'.':planTxt+'.'}
    const chips=[
      '<button class="pill'+(tot.water>=T.waterMl?' good':'')+'" data-act="nudge" data-key="water" data-n="250" aria-label="Add 250 ml of water"><span>Water '+L1(tot.water)+'/'+L1(T.waterMl)+' L · +250</span></button>',
      '<button class="pill'+(tot.p>=T.protein?' good':'')+'" data-act="prot" data-g="20" aria-label="Add 20 g protein"><span>Protein '+Math.round(tot.p)+'/'+T.protein+' g · +20</span></button>'
    ];
    if(nx){const n=diff(nx.d,t);chips.push('<button class="pill warn" data-act="tab" data-v="study" aria-label="Next deadline: '+esc(nx.t)+'"><span>'+esc(short(nx.t,16))+' · '+(n===0?'today':n+' d')+'</span></button>')}
    const hero=secHero({scene:'coast',eyebrow:dlabel(d)+' · '+mode,title:greet()+', Pratham',number,unit,sub,chips}).replace('<section class="sec-hero"','<section class="sec-hero td-hero"');

    /* ---- at-a-glance strip ---- */
    const nn=nx?diff(nx.d,t):null;
    const glance=statRow([
      {label:'Habits left',value:String(left),sub:H.done+' of '+H.total+' done',tone:left?'':'good'},
      {label:'Water',value:L1(tot.water)+' L',sub:'of '+L1(T.waterMl)+' L',tone:tot.water>=T.waterMl?'good':''},
      {label:'Protein',value:Math.round(tot.p)+' g',sub:'of '+T.protein+' g',tone:tot.p>=T.protein?'good':''},
      {label:'Next deadline',value:nx?(nn===0?'Today':nn+' d'):'–',sub:nx?short(nx.t,28):'Nothing due',tone:nx&&nn<=1?'warn':''}
    ]);
    const streakLine='<div class="row wrap td-streak"><span class="pill acc">'+esc(planTxt)+'</span><span class="pill">'+run+' day streak'+(si.best>run?' · best '+si.best:'')+'</span>'+
      (d===t?weeklyChip():'')+(si.tok?'<span class="pill acc" title="A missed day is covered automatically. You earn one for every 7 good days, up to 2.">'+si.tok+' freeze'+(si.tok>1?'s':'')+'</span>':'')+
      ([3,7,14,30].includes(run)?'<span class="pill good">★ '+run+'-day streak milestone</span>':'')+
      (H.score>=barOf(d)&&H.score<1?'<span class="pill good">Streak safe</span>':'')+
      '<a href="#" data-act="tab" data-v="progress">Review ›</a></div>';

    /* ---- card registry (same keys as LOOK_CARDS) ---- */
    const reg={
      wake:()=>wakeCard(d),plan:()=>per==='night'?onDate(addDays(d,1),planToday):planToday(),mob:()=>mobBlock(d),rate:()=>rateCard(),weigh:()=>weighCard(d),gym:()=>gymCard(d),
      next:()=>nextCard(),creatine:()=>creatineCard(d),close:()=>closeCard(d),week:()=>ritual?ritualCard(d):weekCard(),
      top3:()=>top3Card(),trackers:()=>trackersCard(d),habits:()=>habitsCard(d,H),body:()=>bodyCard(d),coming:()=>comingCard(),note:()=>noteCard(dd),life:()=>lifeTile()
    };
    let top=per==='morning'?(ex?['plan','wake','mob','rate','weigh','gym']:['wake','plan','mob','rate','weigh','gym'])
      :per==='night'?['close','rate','plan']:['plan','next','gym','creatine'];
    if(sun)top.unshift('week');
    const strip3=per!=='night';           // Top 3 leads the strip by day; at night it waits in the fold
    const ALL=['top3','trackers','habits','rate','body','mob','plan','coming','life','note','week','wake','weigh','gym','next','creatine','close'];
    const rest=ALL.filter(k=>!top.includes(k)&&!(strip3&&k==='top3'));
    const html=a=>lookSort(a).map(k=>reg[k]()).filter(Boolean).join('');
    const top3Html=strip3&&!LOOK.hidden.includes('top3')?top3Card():'';

    return hero+dateNav()+(ex?examBanner(d):'')+
      '<div class="td-glance">'+glance+streakLine+'</div>'+
      (top3Html?'<div class="grid">'+top3Html+'</div>':'')+
      '<div class="grid w2" style="margin-top:14px">'+html(top)+'</div>'+
      '<div style="margin-top:14px">'+nudgesPlus()+'</div>'+
      '<details class="fold" data-det="alltoday" style="margin-top:14px"'+(state.det.alltoday?' open':'')+'><summary>All of today</summary><div class="foldbody"><div class="grid w2" style="margin-top:0;padding:0 14px 14px">'+html(rest)+'</div></div></details>';
  };

  /* ---------- Progress ---------- */
  const PV=[['week','Week'],['body','Body'],['habits','Habits'],['money','Money'],['more','More']];
  vProgress=function(){
    const cfg=C(),t=todayStr(),lw=lastWeight();
    const cur=lw?lw.w:cfg.startWeight,lost=cfg.startWeight-cur,togo=cur-cfg.goalWeight;
    const pv=PV.some(x=>x[0]===state.progView)?state.progView:(state.progView='week');
    const hero=secHero({scene:'ridge',eyebrow:'Progress · '+dlabel(t),title:'Weight',number:String(cur),unit:'kg',
      sub:(togo<=0?'Goal of '+cfg.goalWeight+' kg reached':togo.toFixed(1)+' kg to go')+', started at '+cfg.startWeight+' kg'+(lw?'':'. Weigh in each morning')+'.',
      chips:lost>0?[{text:lost.toFixed(1)+' kg down',tone:'good'}]:[]});
    let body='';
    if(pv==='week')body='<div class="grid">'+weekCard()+insightsCard()+patternsCard()+'</div>';
    else if(pv==='body'){
      const wd=state.date,wc=day(wd).waist;
      body='<div class="grid w2"><section class="card"><h2>Weight against plan</h2>'+chart()+'<p class="faint" style="font-size:12px;margin:10px 0 0">The dashed line is the pace to '+cfg.goalWeight+' kg.</p></section>'+
        '<section class="card"><h2>Weekly check-in<small>'+dlabel(wd)+'</small></h2><div class="fgrid"><label class="fld"><span>Waist at navel (cm)</span><input type="number" step="0.1" inputmode="decimal" id="waist" value="'+(wc??'')+'" data-change="waist"></label></div><p class="muted" style="font-size:12px;margin:10px 0 0">Measure once a week, same time and conditions. Take photos on weeks 0, 2, 4, 6 and 8.</p></section>'+
        bmiCard()+sleepCard()+'</div><div class="grid">'+picsCard()+'</div>';
    }else if(pv==='habits'){
      const last7=[];for(let i=6;i>=0;i--)last7.push(addDays(t,-i));
      const lg7=last7.filter(d=>habits(d).done>0),wkpct=lg7.length?sum(lg7,d=>score(d))/lg7.length:0;
      const gymWk=last7.filter(d=>(day(d).habits||{}).gym).length;
      const bars=last7.map(d=>{const s=score(d);return '<div style="display:flex;flex-direction:column;align-items:center;gap:6px;flex:1;min-width:0"><div style="height:90px;width:100%;display:flex;align-items:flex-end;justify-content:center"><div style="width:70%;max-width:34px;height:'+Math.max(4,s*100)+'%;border-radius:8px 8px 3px 3px;background:'+(s>=.7?'var(--accent)':'var(--line2)')+'"></div></div><span class="mono faint" style="font-size:11px">'+DOW[parse(d).getDay()]+'</span></div>'}).join('');
      body='<div class="grid"><section class="card"><h2>Consistency</h2>'+statRow([{label:'Streak',value:streak()+' d'},{label:'7-day score',value:Math.round(wkpct*100)+'%'},{label:'Gym this week',value:String(gymWk)}])+
        '<div class="row" style="gap:6px;margin-top:16px;align-items:flex-end">'+bars+'</div><p class="faint" style="font-size:12px;margin:10px 0 0">A day counts toward the streak at 70% or higher.</p></section></div>'+'<div class="grid">'+weeklyCard()+'</div>'+heatCard()+'<div class="grid">'+moodCard()+'</div>';
    }else if(pv==='money'){
      const ms=monthSpend(t.slice(0,7));
      body='<div class="grid"><section class="card"><h2>Money this month</h2><div class="row sp"><span class="mono mid">'+inr(ms.total)+'</span><span class="muted" style="font-size:13px">of '+inr(cfg.limit)+'</span></div><div class="bar '+(ms.total>cfg.limit?'bad':'')+'" style="margin-top:10px"><i style="width:'+clamp(ms.total/cfg.limit*100,0,100)+'%"></i></div></section>'+monthCard()+'</div>';
    }else{
      const si=streakInfo(),wk=weekIndex(t),plan=PLAN[DOW[parse(t).getDay()]];
      const planTxt=wk<1?('Starts '+dlabel(cfg.planStart)):(wk>cfg.planWeeks?'Complete':('Week '+wk+' of '+cfg.planWeeks+' · '+plan.name));
      body='<div class="grid"><section class="card quiet"><h2>Streak and plan</h2>'+statRow([{label:'Streak',value:si.run+' d'},{label:'Best',value:si.best+' d'},{label:'Freezes',value:String(si.tok),sub:si.used?si.used+' used':'none used'}])+
        '<p class="muted" style="font-size:13px;margin:12px 0 0">8-week plan: '+esc(planTxt)+'. A freeze covers one missed day automatically; you earn one for every 7 good days, up to 2.</p></section></div>';
    }
    return '<div class="row td-back"><button class="btn sm ghost" data-act="tab" data-v="today">‹ Back to Today</button></div>'+hero+subNav(PV,pv,'progview')+body;
  };

  /* own delegation: Progress sub-nav and the Sunday questions */
  document.addEventListener('click',ev=>{
    const b=ev.target.closest&&ev.target.closest('[data-act="progview"]');if(!b)return;
    state.progView=b.dataset.v;render();
  });
  /* settle-up button: pick Money > People before the shared tab handler navigates */
  document.addEventListener('click',ev=>{
    if(ev.target.closest&&ev.target.closest('[data-td="settle-go"]'))state.mm='people';
  },true);
  document.addEventListener('change',ev=>{
    const w=ev.target.closest&&ev.target.closest('[data-change="wkt"]');
    if(w){
      const n=Math.round(+w.value),k=w.dataset.k;
      if(WK_ORD.includes(k)&&n>=1&&n<=7)saveCfg({weekly:{...weeklyCfg(),[k]:n}});else scheduleRender();
      return;
    }
  });
  document.addEventListener('change',ev=>{
    const el=ev.target.closest&&ev.target.closest('[data-change="revfix"],[data-change="revfocus"]');if(!el)return;
    const v=String(el.value||'').trim().slice(0,160);
    /* nothing else on screen shows these; skip the re-render, which would replace the field being tabbed into */
    const sr=scheduleRender;scheduleRender=function(){};
    try{dbSetDay(todayStr(),el.dataset.change==='revfix'?{fix:v}:{focus:v})}finally{scheduleRender=sr}
  });
})();

/* The 8-week recomposition programme (Mon 30 Nov 2026 to Sun 24 Jan 2027, week 9 = maintenance).
   Date-driven: while a date is on or after PROGRAM.start, the programme's plan, targets, day times and reminder times apply.
   Before that, nothing changes. Saved cfg keys are never touched: the programme swaps the built-in defaults (DEFAULT_CFG, PLAN)
   in place for the date being shown and puts them back afterwards. Optional overrides live at cfg.program.
   Loads right after common.js, before today.js and body.js, which call window.PROGRAM. */
(function(){
  'use strict';
  if(typeof DEFAULT_CFG==='undefined'||typeof PLAN==='undefined'||typeof render!=='function'||typeof habits!=='function')return;

  const START='2026-11-30',WEEKS=8,MAINT=9;
  const X2=(n,s,r,rest,iso)=>({n,s,r,rest,rir:'',p:false,iso:!!iso});
  const BIG=150,SMALL=75;   // rest in seconds: 2.5 min on compound lifts, 75 s on isolation moves
  const PROG_PLAN={
    Mon:{name:'Push + abs',min:55,ex:[X2('Barbell or dumbbell bench press',3,'6–8',BIG),X2('Incline dumbbell press',3,'8–10',BIG),X2('Seated dumbbell shoulder press',3,'8–10',BIG),X2('Cable lateral raise',3,'12–15',SMALL,1),X2('Triceps rope pushdown',3,'10–12',SMALL,1),X2('Cable crunch',3,'10–15',SMALL,1)]},
    Tue:{name:'Pull',min:55,ex:[X2('Lat pulldown or pull-up',3,'6–10',BIG),X2('Chest-supported row',3,'8–10',BIG),X2('Seated cable row',2,'10–12',BIG),X2('Face pull',3,'12–15',SMALL,1),X2('Incline dumbbell curl',3,'10–12',SMALL,1),X2('Hammer curl',2,'10–12',SMALL,1)]},
    Wed:{name:'Cardio',min:35,cardio:'Incline treadmill walk, 30–40 minutes at 10–12% incline and 5–5.5 km/h. Easy enough to talk in short sentences.',ex:[]},
    Thu:{name:'Legs + abs',min:55,ex:[X2('Back squat or hack squat',3,'6–8',BIG),X2('Romanian deadlift',3,'8–10',BIG),X2('Leg press',3,'10–12',BIG),X2('Lying or seated leg curl',3,'10–12',SMALL,1),X2('Standing calf raise',3,'10–15',SMALL,1),X2('Hanging leg raise',3,'10–15',SMALL,1)]},
    Fri:{name:'Upper + abs',min:60,ex:[X2('Incline barbell or Smith press',3,'6–8',BIG),X2('Pull-up or pulldown (different grip from Tuesday)',3,'8–10',BIG),X2('One-arm dumbbell row',3,'8–10',BIG),X2('Machine chest fly',2,'12–15',SMALL,1),X2('Dumbbell lateral raise',3,'12–15',SMALL,1),X2('Curl + overhead triceps extension superset',2,'12 each',SMALL,1),X2('Pallof press (each side)',3,'10–12',SMALL,1)]},
    Sat:{name:'Cardio or long walk',min:40,cardio:'Incline treadmill walk or cycling for 30–40 minutes, or one long walk. Keep it easy so your legs stay fresh for lifting.',ex:[]},
    Sun:{name:'Rest',min:0,cardio:'Full rest. Walk, stretch, hit your steps.',ex:[]}
  };
  const PROG_CFG={startWeight:70.5,goalWeight:66.5,planStart:START,planWeeks:WEEKS,wake:'06:05',bed:'22:30',gymTime:'06:30'};
  const PROG_T={kcal:2050,protein:150,fat:60,carbs:225,steps:10000,waterMl:3000};
  const MAINT_T={kcal:2500,carbs:340};
  const CHECK=[['2026-12-27',68.5],[addD(START,55),66.5]];   // checkpoints for the target line: end of week 4 and end of week 8
  const NIGHT_FROM=20.5;
  /* reminder times during the programme; deadlines keep the owner's times */
  const REM={items:{mob:{time:'06:10'},gym:{time:'06:15'},creatine:{time:'08:15'},bed:{time:'22:15'}},water:{start:'09:00',end:'22:00',every:120,onlyBehind:true},protein:{time:'20:30'}};

  function addD(ymd,n){const d=new Date(ymd+'T00:00:00Z');d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10)}
  const on=d=>!!d&&String(d)>=START;
  const week=d=>Math.floor((Date.parse(d+'T00:00:00Z')-Date.parse(START+'T00:00:00Z'))/864e5/7)+1;
  const rir=w=>w===1?'2–3':'1–2';

  /* ---------- swapping the defaults for the date being shown ---------- */
  const ORIG={plan:{},cfg:{},targets:Object.assign({},DEFAULT_CFG.targets)};
  Object.keys(PROG_PLAN).forEach(k=>{ORIG.plan[k]=PLAN[k]});
  Object.keys(PROG_CFG).forEach(k=>{ORIG.cfg[k]=DEFAULT_CFG[k]});
  let cur={on:false,maint:false,ov:''};
  const ovOf=()=>{try{return (state&&state.cfg&&state.cfg.program)||{}}catch(e){return {}}};
  function put(o,m){
    const ov=ovOf(),key=o+':'+m+':'+JSON.stringify([ov.targets,ov.wake,ov.bed,ov.gymTime]);
    if(key===cur.key)return;
    cur={on:o,maint:m,key};
    if(o){
      Object.keys(PROG_PLAN).forEach(k=>{PLAN[k]=PROG_PLAN[k]});
      Object.keys(PROG_CFG).forEach(k=>{DEFAULT_CFG[k]=PROG_CFG[k]});
      ['wake','bed','gymTime'].forEach(k=>{if(/^\d{2}:\d{2}$/.test(ov[k]||''))DEFAULT_CFG[k]=ov[k]});
      Object.assign(DEFAULT_CFG.targets,ORIG.targets,PROG_T,m?MAINT_T:{},ov.targets||{});
    }else{
      Object.keys(ORIG.plan).forEach(k=>{PLAN[k]=ORIG.plan[k]});
      Object.keys(ORIG.cfg).forEach(k=>{DEFAULT_CFG[k]=ORIG.cfg[k]});
      Object.assign(DEFAULT_CFG.targets,ORIG.targets);
    }
  }
  const setFor=d=>put(on(d),on(d)&&week(d)===MAINT);
  function withDate(d,fn){const p=cur;setFor(d);try{return fn()}finally{put(p.on,p.maint)}}
  function withMode(o,fn){const p=cur;put(!!o,false);try{return fn()}finally{put(p.on,p.maint)}}

  /* ---------- the rest of the app asks for the date-correct plan, targets and times ---------- */
  const _habits=habits;
  habits=function(d){
    return withDate(d,()=>{
      const H=_habits(d);
      if(on(d)){H.items.forEach(i=>{if(i.k==='creatine')i.sub='With breakfast, about 08:15'})}
      return H;
    });
  };
  if(typeof weekIndex==='function'){const _wi=weekIndex;weekIndex=function(d){return withDate(d,()=>_wi(d))}}
  const _render=render;
  render=function(){
    try{const v=state.view;setFor((v==='today'||v==='train'||v==='fuel')&&state.date?state.date:todayStr())}catch(e){}
    return _render.apply(this,arguments);
  };
  setFor(todayStr());

  /* ---------- labels and text ---------- */
  function label(d,plan){
    const w=week(d);
    return w===MAINT?'Maintenance week · '+plan.name:'Week '+w+' · '+plan.name;
  }
  function effort(w){
    if(w===MAINT)return 'Maintenance week: eat about 2,500 kcal, keep protein and training the same. Stop with 1–2 reps in reserve.';
    if(w===1)return 'Week 1: learn your working weights. Stop with 2–3 reps in reserve on working sets.';
    return 'Stop with 1–2 reps in reserve on working sets. Take the last set of isolation moves to failure.';
  }
  const DP='Hit the top of the range on every set: add the smallest weight step next session.';

  /* ---------- Train: the programme's exercise list (body.js lays it out) ---------- */
  const _vTrain=vTrain;
  function trainHtml(){
    const d=state.date,dowN=parse(d).getDay(),key=DOW[dowN],plan=PLAN[key],dd=day(d),w=week(d),ri=rir(w);
    const start=addDays(d,-((dowN+6)%7));
    const weekDays=[1,2,3,4,5,6,0].map((n,i)=>{const dt=addDays(start,i);const k=DOW[n];return '<button data-act="day-set" data-d="'+dt+'" class="'+(dt===todayStr()?'today ':'')+(dt===d?'sel ':'')+(withDate(dt,()=>PLAN[k].name)==='Rest'?'rest':'')+'"><span>'+k+'</span><b>'+(score(dt)>=barOf(dt)?'✓':parse(dt).getDate())+'</b><span>'+esc(withDate(dt,()=>PLAN[k].name).split(' ')[0])+'</span></button>'});
    const rows=plan.ex.map(e=>{const id=slug(e.n);return {e,id,sets:(dd.lifts||{})[id]||[],ns:e.s,last:topSet(id)}});
    const firstOpen=rows.findIndex(r=>r.sets.length<r.ns);
    const fmtRest=e=>e.rest>=60?(e.rest/60).toFixed(e.rest%60?1:0)+' min':e.rest+' s';
    const exs=rows.map((r,i)=>{
      const {e,id,sets,ns,last}=r;
      const open=state.exOpen[id]===true||(state.exOpen[id]!==false&&i===firstOpen);
      const done=sets.length>=ns;
      if(!open){
        return '<button class="exrow'+(done?' done':'')+'" data-act="exopen" data-id="'+id+'" data-v="1" aria-expanded="false" aria-label="'+esc(e.n)+', '+sets.length+' of '+ns+' sets. Open"><span class="exn">'+(done?'✓ ':'')+esc(e.n)+'</span><span class="slots">'+Array.from({length:ns},(_,j)=>sets[j]?'<i class="on">'+sets[j].w+'×'+sets[j].r+'</i>':'<i>–</i>').join('')+'</span></button>';
      }
      const pre=sets.length?sets[sets.length-1]:(last?last.t:null);
      return '<div class="ex"><div class="row sp wrap"><div style="min-width:0"><b style="font-weight:600">'+esc(e.n)+'</b><div class="muted" style="font-size:12px;margin-top:2px">'+ns+' × '+esc(e.r)+' · rest '+fmtRest(e)+' · RIR '+ri+(e.iso?' · last set to failure':'')+(last?' · last best '+last.t.w+' × '+last.t.r+' · <b style="color:var(--accent)">'+esc(beatHint(e,last.t))+'</b>':'')+'</div><div class="muted" style="font-size:12px;margin-top:2px">'+DP+'</div></div><div class="row"><span class="mono muted" style="font-size:12px">'+sets.length+'/'+ns+'</span><button class="btn sm ghost" data-act="exopen" data-id="'+id+'" data-v="0" aria-label="Collapse '+esc(e.n)+'">Hide</button></div></div>'+cueBlock(id)+
        '<div class="sets">'+sets.map((st,j)=>'<span class="setchip">'+st.w+' kg × '+st.r+'<button data-act="setdel" data-id="'+id+'" data-i="'+j+'" aria-label="Remove set">×</button></span>').join('')+'</div>'+
        '<form class="row wrap" style="margin-top:8px" data-form="set" data-id="'+id+'" data-rest="'+e.rest+'" data-name="'+esc(e.n)+'"><input type="number" step="0.5" inputmode="decimal" name="w" placeholder="kg" value="'+(pre?pre.w:'')+'" style="max-width:92px" aria-label="Weight in kg"><input type="number" inputmode="numeric" name="r" placeholder="reps" value="'+(pre?pre.r:'')+'" style="max-width:92px" aria-label="Reps"><button class="btn sm pri" type="submit">Add set</button>'+(pre?'<button class="btn sm" type="button" data-act="setsame" data-id="'+id+'" data-w="'+pre.w+'" data-r="'+pre.r+'" data-rest="'+e.rest+'" data-name="'+esc(e.n)+'">Same again</button>':'')+'</form></div>';
    }).join('');
    const rs=state.rest,restBar=rs?'<div class="restbar" role="timer" aria-live="off"><svg viewBox="0 0 40 40" width="40" height="40"><circle cx="20" cy="20" r="16" fill="none" stroke="var(--line2)" stroke-width="4"/><circle id="restpg" cx="20" cy="20" r="16" fill="none" stroke="var(--accent)" stroke-width="4" stroke-linecap="round" transform="rotate(-90 20 20)" stroke-dasharray="100.5" stroke-dashoffset="'+(100.5*(1-Math.max(0,(rs.end-Date.now())/1000)/rs.total)).toFixed(1)+'"/></svg><div style="flex:1;min-width:0"><div class="lbl">Rest'+(rs.n?' · '+esc(rs.n):'')+'</div><div class="mono mid" id="restleft">'+fmtT(Math.max(0,Math.ceil((rs.end-Date.now())/1000)))+'</div></div><button class="btn sm" data-act="restadd">+30 s</button><button class="btn sm" data-act="restskip">Skip</button></div>':'';
    const st=stallList(d);
    const stalled=st.length?'<section class="card" style="margin-top:14px;border-color:var(--warn)"><h2>Stalled for 3 sessions<small>'+st.map(esc).join(', ')+'</small></h2><p class="muted" style="margin:6px 0 0;font-size:13px">Try one more rep before adding weight, drop 10% and build back, or check sleep and protein this week.</p></section>':'';
    const cardio=(plan.cardio&&plan.name!=='Rest')?'<section class="card"><h2>Cardio log</h2><div class="fgrid"><label class="fld"><span>Minutes</span><input type="number" inputmode="numeric" id="cm" value="'+(dd.cardioMin??'')+'" data-change="cardio" placeholder="35"></label></div></section>':'';
    return dateNav()+restBar+stalled+'<div class="card" style="margin-top:14px"><div class="week">'+weekDays.join('')+'</div></div>'+
      '<div class="grid w2"><div class="col"><section class="card"><h2>Exercises<small>the active lift is open, tap any to expand</small></h2>'+(exs||'<div class="empty">No lifting today. Hit your steps and recover.</div>')+'</section>'+cardio+'</div></div>';
  }
  vTrain=function(){return on(state.date)?withDate(state.date,trainHtml):_vTrain()};

  /* ---------- Fuel: vegetarian plan meals (plan swaps: soya chunks or low-fat paneer for meat, Greek yogurt or hung curd for eggs) ---------- */
  const MEALS=[
    {id:'breakfast',name:'Breakfast (post-gym)',items:[['Hung curd',2,'200 g'],['Brown bread slice',2,'2 slices'],['Banana',1,'1 medium']]},
    {id:'lunch',name:'Lunch',items:[['Soya chunks dry',1,'50 g dry'],['Roti / chapati plain',2,'2 rotis'],['Dal tadka',1,'1 katori'],['Mixed veg sabzi',1,'1 katori']]},
    {id:'snack',name:'Evening snack',items:[['Whey protein scoop',1,'1 scoop in water'],['Apple',1,'1 medium'],['Peanuts roasted',2/3,'20 g']]},
    {id:'dinner',name:'Dinner',items:[['Soya chunks dry',1,'50 g dry'],['Steamed rice cooked',1,'150 g cooked'],['Mixed veg sabzi',1,'1 katori'],['Hung curd',1.5,'150 g']]}
  ];
  const r1=v=>Math.round(v*10)/10;
  function mealItems(m){
    return m.items.map(([nm,k,portion])=>{const r=refBy(nm);return r?{name:r[0],portion,kcal:Math.round(r[3]*k),p:r1(r[4]*k),c:r1(r[5]*k),f:r1(r[6]*k)}:null}).filter(Boolean);
  }
  const mealSum=m=>{const it=mealItems(m);return {k:sum(it,i=>i.kcal),p:r1(sum(it,i=>i.p))}};
  function mealsCard(d){
    const all=MEALS.reduce((a,m)=>{const s=mealSum(m);return {k:a.k+s.k,p:a.p+s.p}},{k:0,p:0});
    const have=new Set((C().mealTpl||[]).map(t=>t.id));
    const added=MEALS.every(m=>have.has('plan-'+m.id));
    return '<section class="card" data-pg="meals"><h2>Plan meals<small>vegetarian</small></h2>'+
      '<p class="muted" style="font-size:13px;margin:0 0 var(--s3)">Vegetarian swaps from the plan: soya chunks, low-fat paneer, Greek yogurt and hung curd. Targets: 2,050 kcal · 150 g protein · 60 g fat · 225 g carbs · 10,000 steps · 3 L water. The plan day below is about '+Math.round(all.k).toLocaleString('en-IN')+' kcal and '+Math.round(all.p)+' g protein; a second whey scoop or 100 g more hung curd closes the gap to 150 g.</p>'+
      '<div class="list">'+MEALS.map((m,i)=>{const s=mealSum(m);return '<div class="li" style="align-items:flex-start"><div class="m"><b>'+esc(m.name)+'</b><span style="white-space:normal;display:block">'+m.items.map(x=>esc(x[0]+' ('+x[2]+')')).join(', ')+'</span><span style="display:block">'+s.k+' kcal · P '+Math.round(s.p)+'</span></div><button class="btn sm" data-act="pgmeal" data-i="'+i+'" aria-label="Log '+esc(m.name)+' to '+esc(dlabel(d))+'">Log</button></div>'}).join('')+'</div>'+
      '<div class="row" style="margin-top:var(--s3)"><button class="btn sm ghost" data-act="pgtpl"'+(added?' disabled':'')+'>'+(added?'Already in My usual meals':'Add plan meals to My usual meals')+'</button></div></section>';
  }
  function fuelWarn(d){
    if(!on(d)||d!==todayStr())return '';
    const n=new Date(),h=n.getHours()+n.getMinutes()/60,hh=h<DAYEND?h+24:h;
    if(hh<21)return '';
    const tot=totals(d),low=[];
    if(tot.kcal<1800)low.push('calories ('+Math.round(tot.kcal)+' of at least 1,800 kcal)');
    if(tot.p<140)low.push('protein ('+Math.round(tot.p)+' of at least 140 g)');
    if(!low.length)return '';
    return '<section class="card" data-pg="warn" role="alert" style="margin-top:14px;border-color:var(--warn)"><h2>Below the floor<small>after 21:00</small></h2><p style="margin:6px 0 0;font-size:14px">Low on '+low.join(' and ')+'. The plan says never go below 1,800 kcal or 140 g protein: a whey scoop and a bowl of hung curd close most of a gap.</p></section>';
  }
  document.addEventListener('click',ev=>{
    const t=ev.target.closest&&ev.target.closest('[data-act="pgmeal"],[data-act="pgtpl"]');if(!t)return;
    ev.preventDefault();ev.stopPropagation();
    if(t.dataset.act==='pgmeal'){
      const m=MEALS[+t.dataset.i],d=state.date;if(!m)return;
      mealItems(m).forEach(i=>addEntry({type:'meal',name:i.name,portion:i.portion,kcal:i.kcal,p:i.p,c:i.c,f:i.f,date:d}));
      toast('Logged '+m.name);return;
    }
    const L=(C().mealTpl||[]).slice(),have=new Set(L.map(x=>x.id));
    MEALS.forEach(m=>{if(!have.has('plan-'+m.id))L.push({id:'plan-'+m.id,name:'Plan: '+m.name,items:mealItems(m).map(i=>({name:i.name,portion:i.portion,kcal:i.kcal,p:i.p,c:i.c,f:i.f}))})});
    saveCfg({mealTpl:L});toast('Added to My usual meals',{noUndo:true});
  },true);

  /* ---------- Sunday check-in: waist, 7-day average weight, one adjustment ---------- */
  const wOf=d=>{const w=day(d).weight;return w==null||w===''?null:+w};
  function weekAvg(end){let s=0,n=0;for(let i=0;i<7;i++){const w=wOf(addDays(end,-i));if(w!=null&&!isNaN(w)){s+=w;n++}}return {avg:n?s/n:null,n}}
  function priorWaist(d){for(let i=1;i<=14;i++){const w=day(addDays(d,-i)).waist;if(w!=null&&w!=='')return +w}return null}
  function checkin(d){
    const A=weekAvg(d),B=weekAvg(addDays(d,-7)),w=week(d),waist=day(d).waist,wp=priorWaist(d);
    const out={avg:A.avg,n:A.n,prev:B.avg,pn:B.n,waist:waist==null||waist===''?null:+waist,msg:'',rate:null};
    if(A.n<2||B.n<2){out.msg='Not enough weigh-ins for a trend yet. I need at least 2 mornings in each of the last two weeks (this week '+A.n+', last week '+B.n+').';return out}
    const rate=B.avg-A.avg;out.rate=rate;
    const down=out.waist!=null&&wp!=null&&out.waist<wp;
    if(rate>0.8)out.msg=w<=1?'Change nothing. Week 1 drops are mostly water and glycogen.':'Add 150 kcal, mostly carbs';
    else if(rate<0.25&&rate>-0.25&&down)out.msg='Recomposition is working, keep going';
    else if(rate<0.25)out.msg='Check logging, then add 2,000 steps a day; still stuck next week: cut 100–150 kcal';
    else out.msg='Change nothing';
    return out;
  }
  function checkinHtml(d,opt){
    const c=checkin(d),wc=day(d).waist;
    const rate=c.rate==null?'':(c.rate>=0?'Losing ':'Gaining ')+Math.abs(c.rate).toFixed(2)+' kg/week over the last two weekly averages.';
    return '<div class="pg-ci" data-pg="checkin"><div class="fgrid"><label class="fld"><span>Waist at navel (cm)</span><input type="number" step="0.1" inputmode="decimal" id="waist" value="'+(wc??'')+'" data-change="waist"></label>'+
      '<div class="stat"><span class="lbl">7-day average weight</span><span class="mid mono">'+(c.avg==null?'–':c.avg.toFixed(1)+' kg')+'</span><span class="faint" style="font-size:12px">'+c.n+' weigh-in'+(c.n===1?'':'s')+(c.prev!=null?'; last week '+c.prev.toFixed(1)+' kg':'')+'</span></div></div>'+
      '<p class="pg-adj" style="margin:var(--s3) 0 0;font-size:14px"><span class="lbl">'+(c.rate==null?'Trend':'This week')+'</span><br><b>'+esc(c.msg)+'</b></p>'+(rate?'<p class="faint" style="font-size:12px;margin:4px 0 0">'+rate+'</p>':'')+
      '<p class="faint" style="font-size:12px;margin:var(--s2) 0 0">Measure waist once a week, same time and conditions. Judge progress by the 7-day average and the waist, not a single morning.</p></div>';
  }

  /* ---------- progress photos: week 0 and the Sundays ending weeks 2, 4, 6 and 8 ---------- */
  const PHOTO_DAYS=['2026-11-29',addD(START,13),addD(START,27),addD(START,41),addD(START,55)];
  const photoDue=d=>PHOTO_DAYS.includes(d);
  function photoCard(d){
    if(!photoDue(d))return '';
    const w=d<START?'week 0':'end of week '+week(d);
    return '<section class="card" data-pg="photos"><div class="row sp wrap"><div><div class="lbl">Photos · '+w+'</div><div style="font-weight:600;margin-top:4px">Progress photos: front, side, back, same light</div></div><button class="btn sm pri" data-act="tab" data-v="progress" data-pg="photos">Open photos</button></div></section>';
  }
  document.addEventListener('click',ev=>{if(ev.target.closest&&ev.target.closest('[data-pg="photos"][data-act]'))state.progView='body'},true);

  /* ---------- weight chart: 7-day average against the checkpoint line ---------- */
  function chartHtml(){
    const cfg=C(),t0=START,t1=addD(START,WEEKS*7-1),span=diff(t1,t0);
    const raw=Object.keys(state.days).filter(k=>wOf(k)!=null).sort();
    const avgs=raw.filter(k=>k>=t0).map(k=>({d:k,w:weekAvg(k).avg}));
    const pts=raw.filter(k=>k>=t0).map(k=>({d:k,w:wOf(k)}));
    const W=640,H=230,L=40,R=14,Tp=14,B=28;
    const lo=Math.floor(Math.min(cfg.goalWeight-1,...pts.map(p=>p.w),...avgs.map(p=>p.w)));
    const hi=Math.ceil(Math.max(cfg.startWeight+.5,...pts.map(p=>p.w)));
    const x=d=>L+(clamp(diff(d,t0),0,span)/span)*(W-L-R),y=v=>Tp+(1-(v-lo)/(hi-lo))*(H-Tp-B);
    let g='';for(let v=lo;v<=hi;v+=1)g+='<line x1="'+L+'" x2="'+(W-R)+'" y1="'+y(v)+'" y2="'+y(v)+'" stroke="var(--line)" stroke-width="1"/><text x="'+(L-8)+'" y="'+(y(v)+4)+'" text-anchor="end">'+v+'</text>';
    for(let i=0;i<WEEKS;i+=2)g+='<text x="'+x(addD(t0,i*7))+'" y="'+(H-8)+'" text-anchor="middle">W'+(i+1)+'</text>';
    const line=[[t0,cfg.startWeight]].concat(CHECK);
    const target='<path d="'+line.map((p,i)=>(i?'L':'M')+x(p[0]).toFixed(1)+' '+y(p[1]).toFixed(1)).join(' ')+'" fill="none" stroke="var(--faint)" stroke-width="1.5" stroke-dasharray="5 5"/>'+
      CHECK.map(p=>'<circle cx="'+x(p[0]).toFixed(1)+'" cy="'+y(p[1]).toFixed(1)+'" r="3" fill="var(--bg)" stroke="var(--faint)" stroke-width="1.5"/><text x="'+x(p[0]).toFixed(1)+'" y="'+(y(p[1])-9)+'" text-anchor="'+(p[0]===t1?'end':'middle')+'" style="fill:var(--faint)">'+p[1]+'</text>').join('');
    const goal='<line x1="'+L+'" x2="'+(W-R)+'" y1="'+y(cfg.goalWeight)+'" y2="'+y(cfg.goalWeight)+'" stroke="var(--good)" stroke-width="1" stroke-dasharray="2 4"/><text x="'+(L+4)+'" y="'+(y(cfg.goalWeight)+14)+'" style="fill:var(--good)">goal '+cfg.goalWeight+'</text>';
    let data='';
    if(pts.length)data+=pts.map(p=>'<circle cx="'+x(p.d).toFixed(1)+'" cy="'+y(p.w).toFixed(1)+'" r="2.5" fill="var(--faint)" opacity=".7"/>').join('');
    if(avgs.length){
      data+='<path d="'+avgs.map((p,i)=>(i?'L':'M')+x(p.d).toFixed(1)+' '+y(p.w).toFixed(1)).join(' ')+'" fill="none" stroke="var(--accent)" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>';
      const lp=avgs[avgs.length-1];
      data+='<circle cx="'+x(lp.d).toFixed(1)+'" cy="'+y(lp.w).toFixed(1)+'" r="5" fill="var(--accent)" stroke="var(--bg)" stroke-width="2"/><text x="'+clamp(x(lp.d),L+20,W-R-20)+'" y="'+(y(lp.w)-10)+'" text-anchor="middle" style="fill:var(--accent)">'+lp.w.toFixed(1)+'</text>';
    }
    return '<svg class="chart" viewBox="0 0 '+W+' '+H+'" role="img" aria-label="7-day average weight against the plan checkpoints">'+g+target+goal+data+'</svg>';
  }
  const _chart=chart;
  chart=function(){return on(todayStr())?withDate(todayStr(),chartHtml):_chart()};

  /* ---------- nudges that follow the programme's times ---------- */
  const _nudges=nudges;
  nudges=function(mNow){
    const d=todayStr();if(state.date!==d||!on(d))return _nudges(mNow);
    const now=new Date(),m=mNow!=null?mNow:now.getHours()*60+now.getMinutes()+(now.getHours()<DAYEND?1440:0);
    return withDate(d,()=>{
      const cfg=C(),T=cfg.targets,tot=totals(d),dd=day(d),h=dd.habits||{},plan=PLAN[DOW[parse(d).getDay()]],L=[];
      if(m>=15*60&&tot.water<1500)L.push(['Water is behind','You are at '+(tot.water/1000).toFixed(1)+' L. Get to 1.5 L by 3 PM and 3 L by night.']);
      if(m>=8*60+30&&!h.creatine)L.push(['Creatine','Take your '+T.creatineG+' g with breakfast, then tick it.']);
      if(plan.name!=='Rest'&&!h.gym&&m>=tmin(cfg.gymTime)-30&&m<22*60)L.push(['Gym time',plan.name+', about '+plan.min+' min. Log your sets as you go.']);
      if(m>=20*60+30&&tot.p<T.protein)L.push(['Protein is short',Math.round(tot.p)+' of '+T.protein+' g. A whey scoop or 200 g of hung curd closes a lot of the gap.']);
      if(m>=22*60&&!dd.bed)L.push(['Wind down','Lights out is '+cfg.bed+'. Log it once you are in bed.']);
      if(!L.length)return '';
      return '<section class="card" style="margin-top:14px;border-color:color-mix(in srgb,var(--warn) 45%,var(--line))"><h2>Nudges<small>right now</small></h2><div class="list">'+L.map(x=>'<div class="li"><div class="m"><b>'+esc(x[0])+'</b><span style="white-space:normal">'+esc(x[1])+'</span></div></div>').join('')+'</div></section>';
    });
  };

  window.PROGRAM={start:START,weeks:WEEKS,maintWeek:MAINT,on,week,rir,label,effort,doubleProgression:DP,nightFrom:NIGHT_FROM,
    withDate,withMode,setFor,checkin,checkinHtml,photoDue,photoCard,mealsCard,fuelWarn,meals:MEALS,mealItems,chartHtml,
    remDefaults:REM,plan:PROG_PLAN};
})();

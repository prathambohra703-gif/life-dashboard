/* Body section: Train and Fuel. Hero, segment, then standard and quiet cards. See DESIGN.md.
   Train composes the existing card markup from the old vTrain (sets, rest timer, notes, PRs, library).
   Fuel adds a rule-based meal estimator (works offline) next to the optional AI path. */
(function(){
  if(typeof vTrain!=='function'||typeof vFuel!=='function'||typeof secHero!=='function')return;
  const oldTrain=vTrain,oldWrap=(typeof xWrap==='function')?xWrap:null;

  /* ---------- shared ---------- */
  function seg(v){return '<div data-body-seg="1">'+subNav([['train','Train'],['fuel','Fuel']],v,'tab')+'</div>'}
  function part(root,sel,h2){
    const list=root.querySelectorAll(sel);
    for(const el of list){const h=el.querySelector('h2');if(h&&h.textContent.trim().indexOf(h2)===0)return el}
    return null;
  }
  const quiet=h=>String(h||'').replace('<section class="card">','<section class="card quiet">');

  /* ---------- Exercise library: a sheet, not an inline list ---------- */
  function libCard2(){
    return '<section class="card"><h2>Exercise library<small>'+CUE_LIST.length+' lifts with form cues</small></h2><button class="btn sm" data-act="bodylib">Browse the library</button></section>';
  }
  function libSheet(){
    sheet('<h2>Exercise library</h2><p class="muted" style="font-size:13px;margin:0 0 var(--s3)">'+CUE_LIST.length+' lifts. Tap a lift for its form cues.</p><div class="list bd-lib">'+CUE_LIST.map(r=>{
      const id=slug(r[0]),c=CUES[id];
      return '<div class="li" style="display:block"><button class="bd-libbtn" data-act="bodycue" data-id="'+esc(id)+'" aria-expanded="false"><b>'+esc(r[0])+'</b><span class="muted">'+esc(r[1])+'</span></button>'+
        (c?'<div class="cue" data-cue="'+esc(id)+'" hidden><ol>'+c.c.map(x=>'<li>'+esc(x)+'</li>').join('')+'</ol><p><b>Avoid:</b> '+esc(c.x)+'</p></div>':'')+'</div>';
    }).join('')+'</div><div class="row" style="margin-top:var(--s3)"><button class="btn" data-act="sheetclose">Close</button></div>');
  }
  document.addEventListener('click',ev=>{
    const t=ev.target.closest&&ev.target.closest('[data-act="bodylib"],[data-act="bodycue"]');if(!t)return;
    ev.preventDefault();ev.stopPropagation();
    if(t.dataset.act==='bodylib'){libSheet();return}
    const box=document.querySelector('#layer [data-cue="'+t.dataset.id+'"]');if(!box)return;
    const open=box.hidden;box.hidden=!open;t.setAttribute('aria-expanded',String(open));
  },true);

  /* ---------- Train ---------- */
  function newTrain(){
    const d=state.date,cfg=C(),wk=clamp(weekIndex(d),1,cfg.planWeeks),dowN=parse(d).getDay(),plan=PLAN[DOW[dowN]],dd=day(d);
    const t=document.createElement('template');t.innerHTML=oldTrain();
    const root=t.content,html=el=>el?el.outerHTML:'';
    const rest=plan.name==='Rest';
    let planned=0;(plan.ex||[]).forEach(e=>{planned+=wk===4?Math.max(1,Math.round(e.s*.6)):(wk>=5&&wk<=7&&e.p?e.s+1:e.s)});
    let logged=0;Object.values(dd.lifts||{}).forEach(a=>{logged+=(a||[]).length});
    const rir=RIR[wk-1],gymDone=!!(dd.habits||{}).gym;
    let sub;
    if(rest)sub='No lifting today. Hit your steps and recover.';
    else if(!(plan.ex||[]).length)sub=plan.cardio||'Cardio day.';
    else sub='Stop with '+rir+' reps in reserve on working sets.'+(wk===4?' Deload week: fewer sets, keep the weights.':'')+(wk>=5&&wk<=7?' Priority lifts get one extra set.':'')+(wk===8?' Test week: set rep records, then take final measurements.':'');
    const chips=[{text:rest?'Rest':plan.min+' min',tone:'acc'}];
    if(d!==todayStr())chips.push(dlabel(d));
    if(gymDone&&!rest)chips.push({text:'Session done',tone:'good'});
    const hero=secHero({scene:'gym',eyebrow:'Train · Week '+wk+' of '+cfg.planWeeks,title:rest?'Rest day':plan.name,
      number:(!rest&&planned>0)?String(logged):'',unit:(!rest&&planned>0)?'of '+planned+' sets':'',sub:sub,chips:chips,
      actions:rest?[]:['<button class="btn '+(gymDone?'':'pri')+'" data-act="habit" data-key="gym">'+(gymDone?'Session marked done':'Mark session done')+'</button>']});
    /* deload card is a plain card here: the hero above is the only hero */
    const notes=Array.from(root.querySelectorAll('section.card')).filter(s=>{const h=s.querySelector('h2');return h&&/^(Deload week|Stalled for)/.test(h.textContent.trim())})
      .map(s=>html(s).replace('class="card hero"','class="card"')).join('');
    const week=html(root.querySelector('.week'));
    const restBar=html(root.querySelector('.restbar'));
    const ex=html(part(root,'section.card','Exercises'));
    let cardio=html(part(root,'section.card','Cardio log'));
    if(cardio&&plan.cardio)cardio=cardio.replace('</h2>','</h2><p style="margin:0 0 12px;font-size:14px">'+esc(plan.cardio)+'</p>');
    return hero+seg('train')+dateNav()+notes+'<div class="card" style="margin-top:14px">'+week+'</div>'+restBar+
      '<div class="grid w2"><div class="col">'+ex+cardio+'</div><div class="col">'+quiet(prCard())+quiet(libCard2())+'</div></div>';
  }

  /* ---------- rule-based meal estimator ---------- */
  const STOP=new Set(['with','and','of','the','a','an','in','plain','no','to','on','some','my','x']);
  const UNITS=new Set(['katori','bowl','cup','glass','plate','piece','pc','slice','scoop','serving','tbsp','tsp','spoon','portion','pack','can','roll','large','small','medium','big','full','half']);
  const NUMW={a:1,an:1,one:1,two:2,three:3,four:4,five:5,six:6,seven:7,eight:8,nine:9,ten:10,half:.5,quarter:.25,couple:2};
  const DEFAULTS={dal:'Dal tadka',rice:'Steamed rice cooked',curd:'Curd full-fat',dahi:'Curd full-fat',paneer:'Paneer full-fat',milk:'Milk toned 3%',tea:'Chai with milk and sugar',chai:'Chai with milk and sugar',coffee:'Cappuccino',dosa:'Dosa plain',sabzi:'',whey:'Whey protein scoop'};
  const sing=w=>{
    if(w.length>4&&/ies$/.test(w))return w.slice(0,-3)+'y';
    if(w.length>4&&/(ses|xes|ches|shes)$/.test(w))return w.slice(0,-2);
    if(w.length>3&&/s$/.test(w)&&!/ss$/.test(w))return w.slice(0,-1);
    return w;
  };
  const toks=(s,keepUnits)=>String(s).toLowerCase().replace(/[^a-z\s]/g,' ').split(/\s+/).filter(Boolean).map(sing).filter(w=>!STOP.has(w)&&(keepUnits||!UNITS.has(w)));
  let CAND=null;
  function cands(){
    if(CAND)return CAND;
    CAND=[];
    REF.forEach((r,i)=>{
      [[r[0],true]].concat(String(r[1]||'').split(',').map(a=>[a.trim(),false])).forEach(([nm,isName])=>{
        if(!nm)return;
        const full=new Set(toks(nm,true)),core=new Set(toks(nm,false));
        if(full.size)CAND.push({i,isName,full,core,str:nm.toLowerCase()});
      });
    });
    return CAND;
  }
  function bestRef(seg){
    const out={};
    [true,false].forEach(keep=>{
      if(out.row)return;
      const S=new Set(toks(seg,keep));if(!S.size)return;
      let best=null;
      cands().forEach(c=>{
        const C=keep?c.full:c.core;if(!C.size)return;
        let inter=0;S.forEach(w=>{if(C.has(w))inter++});
        const sAll=inter===S.size,cAll=inter===C.size;
        if(!sAll&&!cAll)return;
        const sc=inter*10-(C.size-inter)*3-(S.size-inter)*3+(sAll&&cAll?30:0)+(c.isName?1:0);
        if(!best||sc>best.sc||(sc===best.sc&&c.i<best.c.i))best={c,sc};
      });
      const key=[...S].join(' '),ov=DEFAULTS[key];
      if(ov&&(!best||best.sc<40)){const r=REF.findIndex(x=>x[0]===ov);if(r>=0)best={c:{i:r},sc:99}}
      if(best)out.row=REF[best.c.i];
    });
    return out.row||null;
  }
  function refAmount(row){const m=String(row[2]).match(/(\d+(?:\.\d+)?)\s*(g|ml)\b/i);return m?+m[1]:0}
  function numTok(w){
    if(/^\d+\/\d+$/.test(w)){const p=w.split('/');return +p[0]/+p[1]}
    if(/^\d+(\.\d+)?$/.test(w))return +w;
    return NUMW[w]!=null?NUMW[w]:null;
  }
  /* "2 roti" / "roti x2" / "paneer 100 g" / "dal 1 katori" / "half a samosa" -> {text, n, grams} */
  function parseSeg(raw){
    let s=' '+String(raw).toLowerCase().replace(/[()]/g,' ').replace(/(\d)\s*[x×](?=\s|$)/g,'$1 ').replace(/(^|\s)[x×]\s*(\d)/g,'$1$2')+' ',grams=null,n=null;
    s=s.replace(/(\d+(?:\.\d+)?)\s*(kg|gms?|grams?|g|ml|millilit(?:re|er)s?|litres?|liters?|l)(?![a-z])/,(m,v,u)=>{v=+v;if(/^(kg|l|lit)/.test(u))v*=1000;grams=v;return ' '});
    const re=/(?:^|\s)(\d+\/\d+|\d+(?:\.\d+)?|half|quarter|an?|one|two|three|four|five|six|seven|eight|nine|ten|couple)(?=\s|$)/;
    let m=s.match(re);
    if(m){
      /* "a" and "an" only count as one when they open the item */
      if((m[1]==='a'||m[1]==='an')&&s.trim().indexOf(m[1]+' ')!==0)m=null;
    }
    if(m){n=numTok(m[1]);s=s.replace(m[0],' ');
      /* "half a samosa": drop the filler article after half or quarter */
      if(n!=null&&n<1)s=s.replace(/(^|\s)(a|an|of)(?=\s)/,' ');
    }
    return {text:s.replace(/\s+/g,' ').trim(),n:n,grams:grams};
  }
  const tidy=s=>s.charAt(0).toUpperCase()+s.slice(1);
  const rnd=(v,k)=>Math.round(v*k)/k;
  function estimateRule(text){
    const prot=String(text||'').replace(/\n/g,', ');
    let src=prot;
    cands().forEach(c=>{if(/ and /.test(c.str)&&src.toLowerCase().indexOf(c.str)>=0){src=src.replace(new RegExp(c.str.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),'ig'),c.str.replace(/ and /g,' _and_ '))}});
    const parts=src.split(/\s*(?:,|;|\+|&|\band\b)\s*/i).map(x=>x.replace(/_and_/g,'and').trim()).filter(Boolean);
    return parts.map(p=>{
      const q=parseSeg(p),row=q.text?bestRef(q.text):null;
      if(!row)return {name:tidy(p.replace(/\s+/g,' ')),qty:'',kcal:'',p:'',c:'',f:'',basis:'none',note:'Not in the food table. Fill in what you know.'};
      const amt=refAmount(row);let k=1,qty,note='';
      if(q.grams!=null&&amt>0){k=q.grams/amt;qty=Math.round(q.grams)+' g (table portion: '+row[2]+')'}
      else if(q.grams!=null){k=1;qty=row[2];note='Table portion has no weight, so 1 portion is shown. Adjust the numbers.'}
      else if(q.n!=null){k=q.n;qty=(q.n===1?'':rnd(q.n,100)+' × ')+row[2]}
      else{qty=row[2];note='No quantity given, so 1 portion is shown.'}
      return {name:row[0],qty:qty,kcal:Math.round(row[3]*k),p:rnd(row[4]*k,10),c:rnd(row[5]*k,10),f:rnd(row[6]*k,10),basis:'ref',note:note};
    });
  }
  window.bodyEstimate=estimateRule;   // read-only helper, handy for checks

  /* ---------- Fuel ---------- */
  const sig=v=>v===''||v==null?'':v;
  function mealCard(){
    const e=state.est,ai=!!state.sampleFn;
    let o='<section class="card"><h2>Log a meal<small>check each line, then save</small></h2>';
    o+='<form class="stack" data-form="bmest"><label class="fld"><span>What did you eat, with quantities</span><textarea id="bmtext" name="text" placeholder="2 veg puffs, 1 samosa and a chai with sugar" style="min-height:76px"'+(e.busy?' disabled':'')+'>'+esc(e.text||'')+'</textarea></label>'+(ai?photoUi():'')+
      '<div class="row wrap"><button class="btn pri" type="submit"'+(e.busy?' disabled':'')+'>Estimate</button>'+(ai?'<button class="btn" type="button" data-act="bmai"'+(e.busy?' disabled':'')+'>'+(e.busy?'Estimating…':'Estimate with AI')+'</button>':'')+(e.items?'<button class="btn ghost" type="button" data-act="estclear">Clear</button>':'')+'</div></form>';
    if(e.msg){const m=/permission|declined|granted/i.test(e.msg)?'The AI estimate is not available right now. Use Estimate, or enter numbers yourself below.':e.msg;o+='<p style="color:var(--warn);font-size:13px;margin:12px 0 0">'+esc(m)+'</p>'}
    if(e.items){
      const num=x=>+x||0,tot=e.items.reduce((a,i)=>({k:a.k+num(i.kcal),p:a.p+num(i.p),c:a.c+num(i.c),f:a.f+num(i.f)}),{k:0,p:0,c:0,f:0});
      const miss=e.items.filter(i=>i.basis==='none').length;
      o+='<div class="sep"></div><div class="row sp wrap"><span class="lbl">Estimate</span><span class="mono" style="font-size:13px">'+Math.round(tot.k)+' kcal · P '+Math.round(tot.p)+' · C '+Math.round(tot.c)+' · F '+Math.round(tot.f)+'</span></div>'+
        (e.summary?'<p class="muted" style="font-size:13px;margin:8px 0 0">'+esc(e.summary)+'</p>':'')+
        '<form data-form="bmsave" class="stack" style="margin-top:12px">'+e.items.map((i,n)=>{
          const unk=i.basis==='none';
          return '<div class="pend"><div class="row sp">'+(unk?'<input type="text" name="n'+n+'" value="'+esc(i.name)+'" aria-label="Item name" style="flex:1;min-width:0">':'<b>'+esc(i.name)+'</b><input type="hidden" name="n'+n+'" value="'+esc(i.name)+'">')+'<span class="pill'+(i.basis==='ref'?' good':unk?' warn':'')+'">'+(i.basis==='ref'?'from table':unk?'fill in':'estimated')+'</span></div>'+
            ((i.qty||i.note)?'<span class="muted" style="font-size:12px">'+esc(i.qty)+(i.qty&&i.note?' · ':'')+esc(i.note||'')+'</span>':'')+'<input type="hidden" name="q'+n+'" value="'+esc(i.qty)+'">'+
            '<div class="fgrid" style="grid-template-columns:repeat(4,1fr)"><label class="fld"><span>kcal</span><input type="number" name="k'+n+'" value="'+sig(i.kcal)+'" inputmode="numeric"></label><label class="fld"><span>P g</span><input type="number" step="0.1" name="p'+n+'" value="'+sig(i.p)+'" inputmode="decimal"></label><label class="fld"><span>C g</span><input type="number" step="0.1" name="c'+n+'" value="'+sig(i.c)+'" inputmode="decimal"></label><label class="fld"><span>F g</span><input type="number" step="0.1" name="f'+n+'" value="'+sig(i.f)+'" inputmode="decimal"></label></div></div>';
        }).join('')+
        '<div class="row"><button class="btn pri" type="submit">Save to '+esc(dlabel(state.date))+'</button><span class="muted" style="font-size:12px">Edit any number first if you know better.'+(miss?' Lines left empty are not saved.':'')+'</span></div></form>';
    }
    return o+'</section>';
  }
  function newFuel(){
    const d=state.date,T=C().targets,tot=totals(d),meals=entriesOn(d,'meal').sort((a,b)=>a.ts-b.ts);
    const wk=[];for(let i=0;i<7;i++)wk.push(totals(addDays(todayStr(),-i)).p);
    const pd=wk.filter(x=>x>0),pav=pd.length?Math.round(sum(pd,x=>x)/pd.length):null;
    const left=T.kcal-tot.kcal,isT=d===todayStr();
    const chips=[{text:'Water '+(tot.water/1000).toFixed(2)+' of '+(T.waterMl/1000)+' L',tone:tot.water>=T.waterMl?'good':''}];
    if(pav!=null)chips.push({text:'7-day protein average '+pav+' g',tone:pav>=T.protein?'good':'warn'});
    const hero=secHero({scene:'table',eyebrow:'Fuel · '+dlabel(d),title:isT?'Protein so far':'Protein that day',number:String(Math.round(tot.p)),unit:'of '+T.protein+' g',
      sub:(left>=0?Math.round(left)+' kcal left '+(isT?'today':'that day')+'.':Math.round(-left)+' kcal over '+(isT?'today':'that day')+'.')+' Spread protein over four meals of 30 to 40 g.',chips:chips});
    const mac=(label,v,t,nm,kn)=>{const un=nm>0&&kn===0,pt=nm>0&&kn>0&&kn<nm;return {label:label,value:un?'not logged':(pt?'at least ':'')+Math.round(v),sub:'of '+t+(label==='Calories'?' kcal':' g')}};
    const stats=statRow([{label:'Calories',value:String(Math.round(tot.kcal)),sub:'of '+T.kcal+' kcal'},mac('Carbs',tot.c,T.carbs,tot.nM,tot.cK),mac('Fat',tot.f,T.fat,tot.nM,tot.fK)]);
    const mealsCard='<section class="card"><h2>Meals<small>'+meals.length+' logged</small></h2>'+(meals.length?'<div class="list">'+meals.map(mealRow).join('')+'</div>':emptyState('Nothing logged for '+dlabel(d)+' yet. Describe a meal above and tap Estimate.'))+'</section>';
    const water='<section class="card"><h2>Water<small>'+(tot.water/1000).toFixed(2)+' of '+(T.waterMl/1000)+' L</small></h2>'+slideTile({icon:IC2.water,label:'Today',key:'water',val:Math.max(0,tot.water),min:0,max:5000,step:50,fmt:v=>v.toLocaleString('en-IN')+' ml',target:T.waterMl,targetTxt:(T.waterMl/1000)+' L goal',btns:[-50,50,250]})+'</section>';
    const quick='<section class="card"><h2>Quick add<small>reference portions</small></h2>'+foodChips()+'</section>';
    const manual='<section class="card quiet"><details><summary style="cursor:pointer;font-weight:600">Enter numbers yourself</summary><form class="stack" data-form="meal" style="margin-top:12px"><label class="fld"><span>Name</span><input type="text" name="name" placeholder="Paneer bhurji" required></label><div class="fgrid"><label class="fld"><span>kcal</span><input type="number" name="kcal" inputmode="numeric" required></label><label class="fld"><span>Protein g</span><input type="number" name="p" inputmode="decimal"></label><label class="fld"><span>Carbs g</span><input type="number" name="c" inputmode="decimal"></label><label class="fld"><span>Fat g</span><input type="number" name="f" inputmode="decimal"></label></div><div><button class="btn pri" type="submit">Add meal</button></div></form></details></section>';
    return hero+seg('fuel')+dateNav()+stats+'<div class="grid w2"><div class="col">'+mealCard()+mealsCard+'</div><div class="col">'+water+quiet(tplCard())+quick+manual+'</div></div>';
  }

  /* ---------- events (own data-form / data-act names; the base handlers ignore them) ---------- */
  document.addEventListener('submit',ev=>{
    const f=ev.target.closest&&ev.target.closest('[data-form="bmest"],[data-form="bmsave"]');if(!f)return;
    ev.preventDefault();
    const fd=new FormData(f),d=state.date;
    if(f.dataset.form==='bmest'){
      const text=String(fd.get('text')||'').trim();
      state.est={busy:false,items:null,text:text,msg:'',summary:''};
      if(!text){state.est.msg='Type what you ate first.';render();return}
      const items=estimateRule(text);
      state.est.items=items;
      const hit=items.filter(i=>i.basis==='ref').length;
      state.est.summary=hit?hit+' of '+items.length+' matched the food table.':'Nothing matched the food table, so fill the numbers in yourself.';
      render();return;
    }
    const its=state.est.items||[];let saved=0;
    its.forEach((it,n)=>{
      const raw=k=>String(fd.get(k+n)||'').trim();
      if(!raw('k')&&!raw('p')&&!raw('c')&&!raw('f'))return;
      const e={type:'meal',name:raw('n')||it.name,portion:raw('q'),kcal:+raw('k')||0,p:+raw('p')||0,date:d};
      if(it.basis!=='none'||raw('c'))e.c=+raw('c')||0;
      if(it.basis!=='none'||raw('f'))e.f=+raw('f')||0;
      addEntry(e);saved++;
    });
    if(!saved){state.est.msg='Fill in at least one number before saving.';render();return}
    clearPhotos();state.est={busy:false,items:null,text:'',msg:'',summary:''};toast(saved===1?'Meal saved':saved+' items saved');render();
  },true);
  document.addEventListener('click',ev=>{
    const t=ev.target.closest&&ev.target.closest('[data-act="bmai"]');if(!t)return;
    ev.preventDefault();ev.stopPropagation();
    const ta=document.getElementById('bmtext');estimateMeal(ta?ta.value:String(state.est.text||''));
  },true);
  document.addEventListener('input',ev=>{const t=ev.target;if(t&&t.id==='bmtext')state.est.text=t.value});

  /* the remove-set cross on a logged set gets a 44 px hit area without growing the chip */
  try{const st=document.createElement('style');st.textContent='.setchip{align-items:center}.setchip button[data-act="setdel"]{min-width:44px;min-height:44px;margin:-14px -10px -14px 0}.exrow,.ex{min-width:0}.bd-libbtn{display:flex;flex-direction:column;align-items:flex-start;gap:2px;width:100%;min-height:44px;padding:var(--s2) 0;background:none;border:0;color:var(--fg);font:inherit;text-align:left;cursor:pointer}.bd-libbtn .muted{font-size:12px}.bd-lib .cue{margin:0 0 var(--s2)}';document.head.appendChild(st)}catch(e){}

  /* ---------- install ---------- */
  vTrain=function(){return newTrain()};
  vFuel=function(){return newFuel()};
  if(oldWrap)xWrap=function(v,html){
    if((v==='train'||v==='fuel')&&String(html).indexOf('data-body-seg')>=0){state.bodyView=v;return html}
    return oldWrap(v,html);
  };
})();

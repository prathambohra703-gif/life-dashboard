/* Study section: hero, sub-nav (Plan | Exams | CFA | Tasks | Revise), planned vs actual. Composes the existing cards; no maths is re-implemented here. */
(function(){
  if(typeof vStudy!=='function'||typeof secHero!=='function')return;
  var VIEWS=[['plan','Plan'],['exams','Exams'],['cfa','CFA'],['tasks','Tasks'],['revise','Revise']];
  var DOW=['S','M','T','W','T','F','S'];

  var css=document.createElement('style');css.id='study-css';
  css.textContent=
    '.st-pva{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:6px;align-items:end;height:132px;margin:var(--s3) 0 var(--s2)}'+
    '.st-pva .pd{display:flex;flex-direction:column;align-items:center;justify-content:flex-end;height:100%;min-width:0}'+
    '.st-pva .pb2{display:flex;align-items:flex-end;gap:3px;height:100px;width:100%;justify-content:center}'+
    '.st-pva .pb2 i{display:block;width:34%;max-width:16px;border-radius:4px 4px 0 0;min-height:2px}'+
    '.st-pva .pl{background:var(--hair2)}.st-pva .ac{background:var(--accent)}.st-pva .ac.over{background:var(--emerald)}'+
    '.st-pva .dl{font-size:11px;color:var(--mute);margin-top:6px}.st-pva .pd.today .dl{color:var(--fg);font-weight:700}'+
    '.st-key{display:flex;gap:var(--s4);font-size:12px;color:var(--mute);flex-wrap:wrap}'+
    '.st-key i{display:inline-block;width:10px;height:10px;border-radius:3px;margin-right:6px;vertical-align:-1px}'+
    '.st-disc{margin-top:var(--s4)}.st-more>summary{list-style:none;display:inline-flex;align-items:center}.st-more>summary::-webkit-details-marker{display:none}'+
    '.st-disc>summary{list-style:none;cursor:pointer;display:flex;align-items:center;justify-content:space-between;min-height:44px;padding:0 var(--s4);border:1px solid var(--hair);border-radius:var(--r1);color:var(--fg);font-weight:600}'+
    '.st-disc>summary::-webkit-details-marker{display:none}.st-disc>summary:after{content:"+";font-size:20px;color:var(--mute)}.st-disc[open]>summary:after{content:"\\2212"}'+
    '.st-disc[open]>summary{margin-bottom:var(--s4)}'+
    '.st-stack{display:flex;flex-direction:column;gap:var(--s4)}@media(min-width:860px){.st-stack{gap:var(--s5)}}'+
    '.st-tasks{display:flex;flex-direction:column;gap:var(--s4);margin-top:var(--s4)}.st-tasks .st-todo{order:-1}'+
    '@media(min-width:860px){.st-tasks{display:grid;grid-template-columns:3fr 2fr;gap:var(--s5);align-items:start;margin-top:var(--s5)}.st-tasks .st-todo{order:0}}'+
    '@media(max-width:600px){.matrix{grid-template-columns:1fr!important}}'+
    '.st-pad{margin-top:var(--s4)}@media(min-width:860px){.st-pad{margin-top:var(--s5)}}'+
    '.st-pad>.card{margin-top:0}.st-stack>.card{margin:0}';
  css.textContent+=
    '.rv-grid{display:flex;flex-direction:column;gap:var(--s4)}@media(min-width:860px){.rv-grid{display:grid;grid-template-columns:1fr 1fr;gap:var(--s5);align-items:start}.st-stack>.rv-grid>.card{margin:0}}'+
    '.rv-dot{width:44px;height:44px;flex:none;display:inline-flex;align-items:center;justify-content:center;border:0;background:transparent;padding:0}'+
    '.rv-dot i{display:block;width:18px;height:18px;border-radius:50%;border:2px solid var(--mute);box-sizing:border-box}'+
    '.rv-dot i.c1{background:var(--bad);border-color:var(--bad)}.rv-dot i.c2{background:var(--warn);border-color:var(--warn)}.rv-dot i.c3{background:var(--good);border-color:var(--good)}'+
    '.rv-li .x,.rv-li .rv-tog{min-width:44px;min-height:44px}.rv-li .m{overflow-wrap:anywhere}'+
    '.rv-name{background:transparent;border:0;padding:0;text-align:left;font:inherit;font-weight:600;color:var(--fg);min-height:44px;width:100%;overflow-wrap:anywhere}'+
    '.rv-pt{display:block;font-size:14px;color:var(--mute);margin:0 0 8px;overflow-wrap:anywhere}'+
    '.rv-add{display:flex;flex-direction:column;gap:var(--s2);margin-top:var(--s3)}.rv-add input,.rv-add select,.rv-add .btn{min-height:44px;width:100%;box-sizing:border-box}'+
    '@media(min-width:860px){.rv-add.one{flex-direction:row}.rv-add.one .btn{width:auto}}'+
    '.rv-q{text-align:center;padding:var(--s4) 0}.rv-q h3{margin:0 0 var(--s3);font-size:22px;overflow-wrap:anywhere}.rv-q .btn{min-height:44px}'+
    '.rv-q .row{justify-content:center;gap:var(--s3);margin-top:var(--s4)}';
  document.head.appendChild(css);

  function t0(){return todayStr()}
  function sumMin(arr){return arr.reduce(function(s,x){return s+(+x.min||0)},0)}
  function actualOf(d){
    var dd=day(d)||{},cm=0,o=dd.courseMin||{};
    Object.keys(o).forEach(function(k){cm+=+o[k]||0});
    /* focus sessions log to studyMin and courseMin together, so take the larger rather than double count */
    return Math.max(+dd.studyMin||0,cm)+(+dd.cfaMin||0);
  }
  function semName(){
    try{var s=(typeof semNow==='function'?semNow():C().sem)||C().sem;if(s&&s.name)return s.name}catch(e){}
    return 'This semester';
  }
  function cfaDate(){return (C().cfaDate)||'2027-08-15'}
  function nextItem(){
    var t=t0(),L=acadList().filter(function(a){return a.d&&!a.done&&diff(a.d,t)>=0}).sort(function(a,b){return a.d<b.d?-1:a.d>b.d?1:0});
    return L[0]||null;
  }

  function hero(){
    var t=t0(),a=nextItem(),n=a?diff(a.d,t):null;
    var planned=sumMin(planFor(t)),done=actualOf(t);
    var chips=[];
    if(a){chips.push(cshort(a.c));chips.push(a.k)}
    var cd=diff(cfaDate(),t);
    chips.push('CFA: '+(cd>0?cd+' days to exam':cd===0?'exam today':'exam passed'));
    var sub='Planned today: '+planned+' min · done '+done+' min';
    if(state.studyView==='revise'){var rc=rvCourse(),rt=rvData(rc).topics;sub=rt.filter(function(x){return x.done}).length+' of '+rt.length+' topics revised for '+(COURSES[rc]||rc)}
    return secHero({scene:'study',eyebrow:'Study · '+semName(),
      title:a?a.t:'No deadlines set',
      number:a?(n===0?'Today':String(n)):'',unit:a&&n>0?(n===1?'day':'days'):'',
      sub:sub,chips:chips});
  }

  function courseChips(){
    var f=state.course||'all';
    return '<div class="chips" style="margin-top:var(--s4)" role="group" aria-label="Course"><button class="chip" aria-pressed="'+(f==='all')+'" data-act="course" data-v="all">All courses</button>'+
      Object.keys(COURSES).map(function(k){return '<button class="chip" aria-pressed="'+(f===k)+'" data-act="course" data-v="'+esc(k)+'">'+esc(COURSES[k])+'</button>'}).join('')+'</div>';
  }

  /* Planned vs actual: the plan only exists for today (planFor applies today's plan to any date), so past days show what was logged and only today carries a planned bar. */
  function pva(){
    var t=t0(),days=[],i;for(i=6;i>=0;i--)days.push(addDays(t,-i));
    var rows=days.map(function(d){return {d:d,p:d>=t?sumMin(planFor(d)):0,a:actualOf(d)}});
    var mx=Math.max.apply(null,rows.map(function(r){return Math.max(r.p,r.a)}).concat([30]));
    var ta=rows.reduce(function(s,r){return s+r.a},0),pt=rows[rows.length-1].p;
    var verdict=ta+' min logged this week · '+(pt?pt+' min planned today':'nothing planned today');
    var bars=rows.map(function(r){
      var dow=DOW[parse(r.d).getDay()];
      return '<div class="pd'+(r.d===t?' today':'')+'" data-d="'+r.d+'" data-planned="'+r.p+'" data-actual="'+r.a+'" role="img" aria-label="'+esc(dlabel(r.d))+': '+(r.d>=t?'planned '+r.p+' min, ':'')+'done '+r.a+' min">'+
        '<div class="pb2">'+(r.d>=t?'<i class="pl" style="height:'+Math.round(r.p/mx*100)+'%"></i>':'')+'<i class="ac'+(r.p>0&&r.a>=r.p?' over':'')+'" style="height:'+Math.round(r.a/mx*100)+'%"></i></div><span class="dl">'+dow+'</span></div>';
    }).join('');
    return '<section class="card" id="st-pva"><h2>Planned vs actual<small>last 7 days · '+ta+' min logged</small></h2>'+
      '<div class="st-pva">'+bars+'</div>'+
      '<div class="st-key"><span><i style="background:var(--hair2)"></i>Planned (today)</span><span><i style="background:var(--accent)"></i>Done (study + CFA)</span></div>'+
      '<p style="margin:var(--s3) 0 0;font-size:14px" class="muted">'+esc(verdict)+'</p></section>';
  }

  function plainHero(h){return h.replace(' class="card hero" style="margin-top:14px"',' class="card"')}

  function viewPlan(){
    var top='';try{top=plainHero(planTop())}catch(e){}
    var pc='';try{pc=planCard()}catch(e){}
    var cap=top||'<section class="card"><h2>Study plan<small>today and tomorrow</small></h2>'+emptyState('No plan yet. Add a deadline on the Exams tab and the planner fills in.')+'</section>';
    return courseChips()+'<div class="st-stack st-pad">'+cap+pva()+focusCard()+
      (pc?'<details class="st-disc" id="st-60"'+(state.studyPlanOpen?' open':'')+'><summary>Next 60 days</summary>'+pc+'</details>':'')+'</div>';
  }

  function deadlines(){
    var all=acadList(),f=state.course||'all',t=t0();
    var list=all.filter(function(a){return f==='all'||a.c===f});
    var dated=list.filter(function(a){return a.d}).sort(function(a,b){return a.d<b.d?-1:1}),undated=list.filter(function(a){return !a.d});
    var row=function(a){var n=a.d?diff(a.d,t):null,cls=a.done?'done':n==null?'':n<0?'':n<=1?'now':n<=4?'soon':'';
      return '<div class="li"><button class="x" style="font-size:18px;color:'+(a.done?'var(--good)':'var(--mute)')+'" data-act="acaddone" data-id="'+esc(a.id)+'" aria-label="Toggle done">'+(a.done?'●':'○')+'</button><div class="m"><b style="'+(a.done?'text-decoration:line-through;color:var(--faint)':'')+'">'+esc(a.t)+'</b><span>'+cdot(a.c)+esc(COURSES[a.c]||'')+' · '+esc(a.k)+(a.d?' · '+dlabel(a.d):' · date to be confirmed')+(a.tbc?' · confirm date':'')+'</span></div>'+
        (a.tbc||!a.d?(state.dateEdit===a.id?'<input type="date" style="width:132px" value="'+esc(a.d||'')+'" data-change="acaddate" data-id="'+esc(a.id)+'" aria-label="Set date">':'<button class="btn sm ghost" data-act="dateedit" data-id="'+esc(a.id)+'">'+(a.d?'Tentative':'Date TBC')+' · Set</button>'):'')+
        '<span class="days '+cls+'">'+(a.done?'Done':n==null?'TBC':n<0?'Past':n===0?'Today':n+' d')+'</span>'+(a.custom?'<button class="x" data-act="acaddel" data-id="'+esc(a.id)+'" aria-label="Delete">×</button>':'')+'</div>'};
    var ahead=dated.filter(function(a){return !a.done&&diff(a.d,t)>=0}).length;
    var live=function(a){return !a.done&&(!a.d||diff(a.d,t)>=0)},up=dated.filter(live).concat(undated.filter(live)),gone=dated.concat(undated).filter(function(a){return !live(a)});
    var body=up.map(row).join('');
    return '<section class="card" id="st-deadlines"><h2>Deadlines and exams<small>'+ahead+' ahead</small></h2>'+(body?'<div class="list">'+body+'</div>':emptyState(gone.length?'Nothing ahead for this course.':'No deadlines for this course.'))+
      (gone.length?'<details class="st-more" style="margin-top:var(--s3)"><summary class="btn ghost sm">Past and done ('+gone.length+')</summary><div class="list" style="margin-top:var(--s2)">'+gone.map(row).join('')+'</div></details>':'')+'</section>'+
      '<section class="card"><h2>Add a deadline</h2><form class="stack" data-form="acad"><div class="fgrid"><label class="fld"><span>Course</span><select name="c">'+Object.keys(COURSES).map(function(k){return '<option value="'+esc(k)+'">'+esc(COURSES[k])+'</option>'}).join('')+'</select></label><label class="fld"><span>Date</span><input type="date" name="date"></label></div><label class="fld"><span>What is due</span><input type="text" name="t" required placeholder="Reading, draft, quiz"></label><div><button class="btn pri" type="submit">Add deadline</button></div></form></section>';
  }
  function markers(){
    var t=t0(),m=MILESTONES.filter(function(x){return diff(x.d,t)>=-1}).slice(0,5);
    return '<section class="card quiet" id="st-markers"><h2>Semester markers</h2>'+(m.length?'<div class="list">'+m.map(function(x){return '<div class="li"><div class="m"><b>'+esc(x.t)+'</b><span>'+dlabel(x.d)+'</span></div><span class="days">'+(diff(x.d,t)<=0?'Now':diff(x.d,t)+' d')+'</span></div>'}).join('')+'</div>':emptyState('No upcoming markers.'))+
      '<div class="row" style="margin-top:var(--s3)"><button class="btn" data-x="sem" id="st-semsetup">Semester setup</button></div></section>';
  }
  function viewExams(){
    var ex='';try{ex=examPlanCard()}catch(e){}
    var mk='';try{mk=marksCard()}catch(e){}
    return courseChips()+'<div class="st-stack st-pad">'+ex+deadlines()+markers()+mk+'</div>';
  }

  function viewCfa(){
    var t=t0(),cd=diff(cfaDate(),t),tg=(C().targets||{}).cfaMin;
    var wk=0,i;for(i=0;i<7;i++)wk+=+(day(addDays(t,-i)).cfaMin)||0;
    var row=statRow([
      {label:'To the exam',value:cd>0?(Math.round(cd/30.4*10)/10)+' months':cd===0?'Today':'Passed',sub:dlabel(cfaDate()),tone:'acc'},
      {label:'Days left',value:String(Math.max(0,cd))},
      {label:'Daily target',value:(tg||60)+' min',sub:'last 7 days: '+wk+' min'}
    ]);
    return row+'<div class="st-stack st-pad">'+cfaSystem()+'</div>';
  }

  function viewTasks(){
    var P={high:0,med:1,low:2},byPri=function(a,b){return P[a.pri||'med']-P[b.pri||'med']};
    var open=state.todos.filter(function(x){return !x.done}).sort(byPri),done=state.todos.filter(function(x){return x.done}).sort(byPri);
    var todo='<section class="card st-todo"><h2>To-do<small>'+open.length+' open</small></h2><form class="row" data-form="todo" style="margin-bottom:8px"><input type="text" name="title" placeholder="Add a task" required aria-label="Task"><select name="q" style="width:136px;flex:none" aria-label="Matrix box"><option value="q1">Do now</option><option value="q2" selected>Schedule</option><option value="q3">Delegate</option><option value="q4">Later</option></select><button class="btn pri" type="submit">Add</button></form>'+
      (open.length?'<div class="list">'+open.map(todoRow).join('')+'</div>':emptyState(done.length?'Everything is done. Add the next task above.':'No tasks yet. Add one above.'))+
      (done.length?'<details class="st-more" id="st-done" style="margin-top:var(--s3)"'+(state.studyDoneOpen?' open':'')+'><summary class="btn ghost sm">Done ('+done.length+')</summary><div class="list" style="margin-top:var(--s2)">'+done.map(todoRow).join('')+'</div></details>':'')+'</section>';
    return '<div class="st-tasks">'+matrixCard()+todo+'</div>';
  }
  /* the Eisenhower matrix, with a done toggle on deadline items too (the old card only had it on to-dos) */
  matrixCard=function(){
    var t=todayStr(),open=state.todos.filter(function(x){return !x.done});
    var ac=acadList().filter(function(a){return a.d&&!a.done&&diff(a.d,t)>=0&&diff(a.d,t)<=14}).sort(function(a,b){return a.d<b.d?-1:1});
    var cell=function(c){
      var q=c[0],n=c[1],sub=c[2];
      var mine=open.filter(function(x){return todoQ(x)===q}).map(function(x){return '<div class="mx"><button class="x" data-act="tododone" data-id="'+x.id+'" aria-label="Mark done">○</button><span>'+esc(x.title)+'</span><button class="x" data-act="todoq" data-id="'+x.id+'" aria-label="Move to the next box" title="Move">↻</button><button class="x" data-act="tododel" data-id="'+x.id+'" aria-label="Delete">×</button></div>'});
      var auto=(q==='q1'?ac.filter(function(a){return diff(a.d,t)<=3}):q==='q2'?ac.filter(function(a){return diff(a.d,t)>3}):[]).map(function(a){var k=diff(a.d,t);
        return '<div class="mx auto"><button class="x" data-act="acaddone" data-id="'+esc(a.id)+'" aria-label="Mark done">○</button><span>'+esc(a.t)+'</span><em>'+esc((COURSES[a.c]||'').split(' ')[0])+' · '+(k===0?'today':k+' d')+'</em></div>'});
      return '<div class="quad '+q+'"><div class="qh"><b>'+n+'</b><span>'+sub+'</span></div>'+(mine.concat(auto).join('')||'<div class="faint" style="font-size:12px">Nothing here</div>')+'</div>';
    };
    return '<section class="card"><h2>Priority matrix<small>Eisenhower</small></h2><div class="matrix">'+QUAD.map(cell).join('')+'</div><p class="faint" style="font-size:12px;margin:10px 0 0">Deadlines due within 3 days sit in Do now, the next two weeks in Schedule. Tap ↻ to move a task to the next box.</p></section>';
  };

  /* ===== Revise: open-book exam prep per course (cfg.revise) ===== */
  var CONF=['Not rated','Shaky','OK','Solid'];
  function rvData(c){var r=(C().revise||{})[c]||{};return {topics:r.topics||[],cases:r.cases||[],notes:r.notes||[]}}
  function rvNextExam(c){
    var t=t0(),L=acadList().filter(function(a){return !a.done&&a.d&&diff(a.d,t)>=0&&(a.k==='Exam'||a.k==='Test')&&(!c||a.c===c)}).sort(function(a,b){return a.d<b.d?-1:a.d>b.d?1:0});
    return L[0]||null;
  }
  function rvCourse(){
    var k=state.rvCourse;if(k&&COURSES[k])return k;
    var a=rvNextExam();return a&&COURSES[a.c]?a.c:Object.keys(COURSES)[0];
  }
  function rvSave(c,fn){
    var all=JSON.parse(JSON.stringify(C().revise||{})),cur=all[c]||{};
    cur={topics:cur.topics||[],cases:cur.cases||[],notes:cur.notes||[]};fn(cur);all[c]=cur;
    saveCfg({revise:all});render();
  }
  function rvDelUndo(c,kind,id){
    var d=rvData(c),arr=d[kind],i=arr.findIndex(function(x){return x.id===id});if(i<0)return;
    var item=JSON.parse(JSON.stringify(arr[i]));
    rvSave(c,function(cur){cur[kind]=cur[kind].filter(function(x){return x.id!==id})});
    toast('Removed',{undo:function(){rvSave(c,function(cur){cur[kind].splice(Math.min(i,cur[kind].length),0,item)})}});
  }
  function rvPace(c,d){
    var a=rvNextExam(c);if(!a)return '';
    var left=d.topics.filter(function(x){return !x.done}).length,n=diff(a.d,t0());
    if(!d.topics.length)return '';
    if(!left)return 'Every topic is revised. Use Quiz me to keep the cases fresh.';
    var per=n>0?left/n:left;
    return (Math.round(per*10)/10)+' topic'+(per===1?'':'s')+' a day to finish by '+dlabel(a.d)+' ('+(n>0?n+' day'+(n===1?'':'s'):'today')+')';
  }
  function rvChips(c){
    return '<div class="chips" style="margin-top:var(--s4)" role="group" aria-label="Revise course">'+Object.keys(COURSES).map(function(k){
      return '<button class="chip" style="min-height:44px" aria-pressed="'+(k===c)+'" data-act="rvcourse" data-v="'+esc(k)+'">'+esc(cshort(k))+'</button>'}).join('')+'</div>';
  }
  function rvTopics(c,d){
    var done=d.topics.filter(function(x){return x.done}).length,shaky=d.topics.filter(function(x){return x.conf===1}).length,pace=rvPace(c,d);
    var rows=d.topics.map(function(x){
      var cf=+x.conf||0;
      return '<div class="li rv-li"><button class="rv-dot" data-act="rvconf" data-id="'+esc(x.id)+'" aria-label="Confidence: '+CONF[cf]+'. Tap to change"><i class="c'+cf+'"></i></button>'+
        '<div class="m"><b style="font-weight:500;'+(x.done?'text-decoration:line-through;color:var(--faint)':'')+'">'+esc(x.t)+'</b><span>'+CONF[cf]+'</span></div>'+
        '<button class="x rv-tog" style="font-size:18px;color:'+(x.done?'var(--good)':'var(--mute)')+'" data-act="rvdone" data-id="'+esc(x.id)+'" aria-label="Toggle revised">'+(x.done?'●':'○')+'</button>'+
        '<button class="x" data-act="rvdel" data-k="topics" data-id="'+esc(x.id)+'" aria-label="Remove topic">×</button></div>'}).join('');
    return '<section class="card" id="rv-topics"><h2>Topics to revise<small id="rv-sum">'+done+' of '+d.topics.length+' revised · '+shaky+' shaky</small></h2>'+
      (pace?'<p id="rv-pace" style="margin:0 0 var(--s3);font-size:14px">'+esc(pace)+'</p>':'')+
      (d.topics.length?'<div class="bar"><i style="width:'+(done/d.topics.length*100)+'%"></i></div><div class="list">'+rows+'</div>':emptyState('No topics yet. Add the syllabus headings you need to revise.'))+
      '<form class="rv-add one" data-form="rvtopic"><input type="text" name="t" required placeholder="Add a topic, press Enter" aria-label="New topic" autocomplete="off"><button class="btn pri" type="submit">Add</button></form></section>';
  }
  function rvCases(c,d){
    var open=state.rvOpen||{};
    var rows=d.cases.map(function(x){
      var tp=x.topicId&&d.topics.filter(function(t){return t.id===x.topicId})[0],isOpen=!!open[x.id];
      return '<div class="li rv-li" style="align-items:flex-start"><div class="m"><button class="rv-name" data-act="rvreveal" data-id="'+esc(x.id)+'" aria-expanded="'+isOpen+'">'+esc(x.name)+'</button>'+
        (isOpen?'<span class="rv-pt">'+esc(x.point||'No point written yet.')+'</span>':'')+(tp?'<span class="muted" style="font-size:12px">'+esc(tp.t)+'</span>':'')+'</div>'+
        '<button class="x" data-act="rvdel" data-k="cases" data-id="'+esc(x.id)+'" aria-label="Remove case">×</button></div>'}).join('');
    return '<section class="card" id="rv-cases"><h2>Cases to remember<small>'+d.cases.length+' · tap a name to test yourself</small></h2>'+
      (d.cases.length?'<div class="list">'+rows+'</div><div style="margin-top:var(--s3)"><button class="btn pri" style="min-height:44px" data-act="rvquiz">Quiz me</button></div>':emptyState('No cases yet. Add the cases you must be able to cite.'))+
      '<form class="rv-add" data-form="rvcase"><input type="text" name="name" required placeholder="Case name" aria-label="Case name" autocomplete="off"><input type="text" name="point" placeholder="Holding or point, one line" aria-label="Holding" autocomplete="off">'+
      (d.topics.length?'<select name="topicId" aria-label="Linked topic"><option value="">No linked topic</option>'+d.topics.map(function(t){return '<option value="'+esc(t.id)+'">'+esc(t.t)+'</option>'}).join('')+'</select>':'')+
      '<button class="btn pri" type="submit">Add case</button></form></section>';
  }
  function rvNotes(c,d){
    var rows=d.notes.map(function(x){
      var ref=x.ref||'',link=/^https?:\/\//i.test(ref)?'<a href="'+esc(ref)+'" target="_blank" rel="noopener noreferrer" style="overflow-wrap:anywhere">'+esc(ref)+'</a>':esc(ref);
      return '<div class="li rv-li"><div class="m"><b style="font-weight:500">'+esc(x.title)+'</b><span style="overflow-wrap:anywhere">'+link+'</span></div><button class="x" data-act="rvdel" data-k="notes" data-id="'+esc(x.id)+'" aria-label="Remove note">×</button></div>'}).join('');
    return '<section class="card" id="rv-notes"><h2>Note index<small>where things are</small></h2>'+
      (d.notes.length?'<div class="list">'+rows+'</div>':emptyState('No index entries yet. Note where each topic lives in your open-book material.'))+
      '<form class="rv-add" data-form="rvnote"><input type="text" name="title" required placeholder="Title, e.g. Judicial review" aria-label="Title" autocomplete="off"><input type="text" name="ref" placeholder="Page, tab, file or link" aria-label="Reference" autocomplete="off"><button class="btn pri" type="submit">Add to index</button></form></section>';
  }
  function rvQuizView(c,d){
    var q=state.rvQuiz,left=q.q.length,total=q.total;
    if(!left)return '<section class="card" id="rv-quiz"><div class="rv-q"><h3>All '+total+' case'+(total===1?'':'s')+' recalled</h3><div class="row"><button class="btn pri" data-act="rvquit">Back to revision</button></div></div></section>';
    var x=d.cases.filter(function(k){return k.id===q.q[0]})[0];
    if(!x){q.q.shift();return rvQuizView(c,d)}
    return '<section class="card" id="rv-quiz"><h2>Quiz me<small>'+(total-left+1)+' of '+total+' · '+left+' to go</small></h2><div class="rv-q"><h3>'+esc(x.name)+'</h3>'+
      (q.show?'<p class="rv-pt" style="font-size:16px;color:var(--fg)">'+esc(x.point||'No point written yet.')+'</p><div class="row"><button class="btn" data-act="rvagain">Again</button><button class="btn pri" data-act="rvgot">Got it</button></div>':
        '<div class="row"><button class="btn pri" data-act="rvshow">Show the point</button></div>')+
      '<div class="row"><button class="btn ghost sm" data-act="rvquit">Stop</button></div></div></section>';
  }
  function viewRevise(){
    var c=rvCourse(),d=rvData(c);
    var body=state.rvQuiz&&state.rvQuiz.c===c?rvQuizView(c,d):rvTopics(c,d)+'<div class="rv-grid">'+rvCases(c,d)+rvNotes(c,d)+'</div>';
    return rvChips(c)+'<div class="st-stack st-pad" id="rv-body">'+body+'</div>';
  }

  vStudy=function(){
    var v=state.studyView;if(!VIEWS.some(function(x){return x[0]===v}))v='plan';
    var body={plan:viewPlan,exams:viewExams,cfa:viewCfa,tasks:viewTasks,revise:viewRevise}[v]();
    return hero()+subNav(VIEWS,v,'studyview')+body;
  };

  try{var sv=localStorage.getItem('ld_studyview');if(sv&&VIEWS.some(function(x){return x[0]===sv}))state.studyView=sv}catch(e){}
  document.addEventListener('click',function(e){
    var b=e.target.closest&&e.target.closest('[data-act="studyview"]');if(!b)return;
    state.studyView=b.dataset.v;try{localStorage.setItem('ld_studyview',state.studyView)}catch(x){}
    render();
  });
  document.addEventListener('toggle',function(e){
    var d=e.target;if(d&&d.id==='st-60')state.studyPlanOpen=d.open;if(d&&d.id==='st-done')state.studyDoneOpen=d.open;
  },true);

  function rvFocus(sel){setTimeout(function(){var el=document.querySelector(sel);if(el)el.focus()},30)}
  document.addEventListener('click',function(e){
    var b=e.target.closest&&e.target.closest('[data-act^="rv"]');if(!b)return;
    var a=b.dataset.act,c=rvCourse(),id=b.dataset.id,q=state.rvQuiz;
    if(a==='rvcourse'){state.rvCourse=b.dataset.v;state.rvQuiz=null;render()}
    else if(a==='rvconf')rvSave(c,function(cur){cur.topics.forEach(function(x){if(x.id===id)x.conf=((+x.conf||0)+1)%4})});
    else if(a==='rvdone')rvSave(c,function(cur){cur.topics.forEach(function(x){if(x.id===id)x.done=!x.done})});
    else if(a==='rvdel')rvDelUndo(c,b.dataset.k,id);
    else if(a==='rvreveal'){state.rvOpen=state.rvOpen||{};state.rvOpen[id]=!state.rvOpen[id];render()}
    else if(a==='rvquiz'){var ids=rvData(c).cases.map(function(x){return x.id});if(ids.length){state.rvQuiz={c:c,q:ids,total:ids.length,show:false};render()}}
    else if(a==='rvshow'&&q){q.show=true;render()}
    else if(a==='rvquit'){state.rvQuiz=null;render()}
    else if((a==='rvgot'||a==='rvagain')&&q){
      var cur=q.q.shift(),cs=rvData(c).cases.filter(function(x){return x.id===cur})[0];
      if(a==='rvagain')q.q.push(cur);
      q.show=false;
      if(cs&&cs.topicId)rvSave(c,function(r){r.topics.forEach(function(x){if(x.id===cs.topicId)x.conf=a==='rvgot'?Math.max(+x.conf||0,2):1})});
      else render();
    }
  });
  document.addEventListener('submit',function(e){
    var f=e.target.closest&&e.target.closest('[data-form^="rv"]');if(!f)return;
    e.preventDefault();var k=f.dataset.form,fd=new FormData(f),v=function(n){return String(fd.get(n)||'').trim()},c=rvCourse();
    if(k==='rvtopic'){var t=v('t');if(!t)return;rvSave(c,function(r){r.topics.push({id:uid(),t:t.slice(0,160),done:false,conf:0})});rvFocus('form[data-form=rvtopic] input[name=t]')}
    else if(k==='rvcase'){var n=v('name');if(!n)return;rvSave(c,function(r){var o={id:uid(),name:n.slice(0,160),point:v('point').slice(0,300)};if(v('topicId'))o.topicId=v('topicId');r.cases.push(o)});rvFocus('form[data-form=rvcase] input[name=name]')}
    else if(k==='rvnote'){var ti=v('title');if(!ti)return;rvSave(c,function(r){r.notes.push({id:uid(),title:ti.slice(0,160),ref:v('ref').slice(0,500)})});rvFocus('form[data-form=rvnote] input[name=title]')}
  });
  /* a new semester archives cfg.sem; carry the revision data into that archive entry and start the new term clean */
  document.addEventListener('submit',function(e){
    var f=e.target.closest&&e.target.closest('[data-xform="semnew"]');if(!f)return;
    var n0=(C().semArchive||[]).length;
    setTimeout(function(){
      var rv=C().revise,arch=C().semArchive||[];
      if(!rv||!Object.keys(rv).length||arch.length<=n0)return;
      var a=arch.slice();a[a.length-1]=Object.assign({},a[a.length-1],{revise:rv});
      var blank={};Object.keys(rv).forEach(function(k){blank[k]={topics:[],cases:[],notes:[]}});
      saveCfg({semArchive:a,revise:blank});
    },120);
  },true);
})();

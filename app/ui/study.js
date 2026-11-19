/* Study section: hero, sub-nav (Plan | Exams | CFA | Tasks | Revise), planned vs actual. Composes the existing cards; no maths is re-implemented here. */
(function(){
  if(typeof vStudy!=='function'||typeof secHero!=='function')return;
  var VIEWS=[['plan','Plan'],['exams','Exams'],['cfa','CFA'],['tasks','Tasks'],['revise','Revise'],['notes','Notes']];
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
    '.nt-q{width:100%;box-sizing:border-box;min-height:44px}'+
    '.nt-row{display:flex;flex-direction:column;align-items:flex-start;gap:2px;width:100%;min-height:44px;padding:10px 0;border:0;border-bottom:1px solid var(--hair);background:transparent;color:var(--fg);text-align:left;font:inherit;overflow-wrap:anywhere}'+
    '.nt-row b{font-weight:600}.nt-row span,.nt-row em{font-size:13px;color:var(--mute);font-style:normal}'+
    '.nt-path{margin:var(--s2) 0 var(--s3);font-size:13px;color:var(--mute);overflow-wrap:anywhere}.nt-path span{color:var(--fg)}'+
    '.nt-legrow{display:flex;flex-direction:column;gap:6px;font-size:13px;color:var(--mute)}.nt-legrow i{display:inline-block;width:12px;height:12px;border-radius:3px;margin-right:8px;vertical-align:-1px}'+
    '.nt-md{min-width:0;max-width:100%;overflow-wrap:anywhere;line-height:1.55}.nt-md p{margin:0 0 var(--s3)}.nt-md h2,.nt-md h3,.nt-md h4,.nt-md h5,.nt-md h6{margin:var(--s4) 0 var(--s2);font-family:var(--font-display);line-height:1.2}'+
    '.nt-md h2{font-size:24px}.nt-md h3{font-size:20px}.nt-md h4,.nt-md h5,.nt-md h6{font-size:17px}'+
    '.nt-md ul,.nt-md ol{margin:0 0 var(--s3);padding-left:22px}.nt-md blockquote{margin:0 0 var(--s3);padding:0 0 0 var(--s3);border-left:2px solid var(--hair2);color:var(--mute)}'+
    '.nt-md code{font-size:13px;background:var(--tint);padding:1px 5px;border-radius:5px}.nt-md pre{overflow-x:auto;max-width:100%;background:var(--tint);padding:var(--s3);border-radius:10px;margin:0 0 var(--s3)}.nt-md pre code{background:none;padding:0}'+
    '.nt-tw{overflow-x:auto;max-width:100%;margin:0 0 var(--s3);-webkit-overflow-scrolling:touch}.nt-tw table{border-collapse:collapse;font-size:14px;min-width:100%}.nt-tw th,.nt-tw td{border:1px solid var(--hair);padding:6px 10px;text-align:left;vertical-align:top;min-width:90px}.nt-tw th{background:var(--tint)}'+
    '.nt-md a{color:var(--accent2)}.nt-md a.nt-wl{text-decoration:underline;text-underline-offset:3px}.nt-md hr{border:0;border-top:1px solid var(--hair);margin:var(--s4) 0}'+
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
    if(state.studyView==='notes'){var nm=nMine();sub=nm.length+' note'+(nm.length===1?'':'s')+' in this course, read-only. The Scribe sends them after saving on your Mac.'}
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
      '<div class="row" style="margin-top:var(--s3)"><button class="btn" data-x="sem" id="st-semsetup">Semester setup</button><button class="btn" data-x="semwiz" id="st-semwiz">Start new semester</button></div></section>';
  }
  /* every current course, including ones with no assessments yet */
  function coursesCard(){
    var ids=Object.keys(COURSES),all=acadList(),t=t0();
    if(!ids.length)return '<section class="card" id="st-courses"><h2>Courses</h2>'+emptyState('No courses yet.')+'<div class="row" style="margin-top:var(--s3)"><button class="btn sm pri" data-x="sem">Add course</button></div></section>';
    return '<section class="card" id="st-courses"><h2>Courses<small>'+ids.length+' this semester</small></h2><div class="list">'+ids.map(function(id){
      var l=all.filter(function(a){return a.c===id}),nx=l.filter(function(a){return a.d&&!a.done&&diff(a.d,t)>=0}).sort(function(a,b){return a.d<b.d?-1:1})[0];
      var sub=!l.length?'No assessments yet':l.length+' assessment'+(l.length===1?'':'s')+(nx?' · next '+dlabel(nx.d):'');
      return '<div class="li" data-course="'+esc(id)+'"><div class="m"><b>'+esc(COURSES[id])+'</b><span>'+esc(sub)+'</span></div>'+(l.length?'':'<button class="btn sm" data-x="semadd" data-id="'+esc(id)+'" aria-label="Add an assessment for '+esc(COURSES[id])+'">Add</button>')+'</div>';
    }).join('')+'</div></section>';
  }
  /* marks: current courses up front, earlier semesters collapsed and never deleted */
  function marksCard2(){
    var all=LL('marks').slice().sort(function(a,b){return a.date<b.date?1:-1}),pc=function(m){return Math.round(m.got/m.of*100)};
    var cur={};Object.keys(COURSES).forEach(function(id){cur[COURSES[id]]=1;cur[cshort(id)]=1});
    var M=all.filter(function(m){return cur[m.course]}),E=all.filter(function(m){return !cur[m.course]});
    var by={};M.forEach(function(m){(by[m.course]=by[m.course]||[]).push(pc(m))});
    var row=function(m){return lrow('marks',m,m.name,esc(m.course)+' · '+dlabel(m.date),'<span class="mono">'+m.got+' / '+m.of+' · '+pc(m)+'%</span>')};
    return '<section class="card" id="st-marks"><h2>Marks<small>'+(M.length?'average '+Math.round(sum(M,pc)/M.length)+'%':'none yet')+'</small></h2>'+
      (M.length?'<div class="chips" style="margin-bottom:8px">'+Object.keys(by).map(function(c){return '<span class="pill">'+esc(cshort(Object.keys(COURSES).find(function(k){return COURSES[k]===c||cshort(k)===c})||c))+' '+Math.round(sum(by[c],function(x){return x})/by[c].length)+'%</span>'}).join('')+'</div><div class="list">'+M.slice(0,6).map(row).join('')+'</div>':'<div class="empty">'+(E.length?'No marks yet for this semester.':'Log your marks as they come back to see how each course is going.')+'</div>')+
      addBtn('marks')+
      (E.length?'<details class="st-more" id="st-marks-old" style="margin-top:var(--s3)"><summary class="btn ghost sm">Earlier semesters ('+E.length+')</summary><div class="list" style="margin-top:var(--s2)">'+E.map(row).join('')+'</div></details>':'')+'</section>';
  }
  function viewExams(){
    var ex='';try{ex=examPlanCard()}catch(e){}
    var mk='';try{mk=marksCard2()}catch(e){}
    var cc='';try{cc=coursesCard()}catch(e){}
    return courseChips()+'<div class="st-stack st-pad">'+ex+deadlines()+cc+markers()+mk+'</div>';
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

  /* ===== Notes: the Scribe's notes, read-only, with a small safe Markdown renderer ===== */
  var NLEG=[['Lecture slides','','plain text'],['Lecture recording','#3b82f6'],['Law text: Acts, cases, readings','#22a35a'],['Your handwritten notes','#a56bf0'],['Peer notes','#e8891a'],['Added by Claude','#7a808a']];
  var NKIND=[['lecture','Lectures/'],['module','Modules/'],['week','Weeks/'],['revision','Revision/'],['practice','Practice/'],['todo','To do']];
  var nz=function(s){return String(s==null?'':s).toLowerCase().replace(/[^a-z0-9]/g,'')};
  function nCourseOf(name){
    var n=nz(name);if(!n)return '';var ids=Object.keys(COURSES),i,k,c;
    for(i=0;i<ids.length;i++){k=ids[i];if(nz(k)===n||nz(COURSES[k])===n||nz(cshort(k))===n)return k}
    for(i=0;i<ids.length;i++){k=ids[i];c=[nz(COURSES[k]),nz(cshort(k))];if(c.some(function(x){return x.length>=4&&n.length>=4&&(x.indexOf(n)===0||n.indexOf(x)===0)}))return k}
    return '';
  }
  function nBase(path){var b=String(path).split('/').pop();return b.replace(/\.md$/i,'')}
  function nAll(){
    var L=[];try{L=LD.list('notes')}catch(e){}
    var by={};
    L.forEach(function(r){
      if(!r||!r.path||typeof r.md!=='string')return;
      var k=String(r.course||'')+'|'+r.path,g=by[k]||(by[k]={key:k,course:String(r.course||''),path:String(r.path),title:'',kind:'',updatedAt:0,parts:[]});
      g.parts.push({p:+r.part||1,md:r.md});g.updatedAt=Math.max(g.updatedAt,+r.updatedAt||0);if(r.title)g.title=String(r.title);if(r.kind)g.kind=String(r.kind);
    });
    return Object.keys(by).map(function(k){
      var g=by[k];g.parts.sort(function(a,b){return a.p-b.p});g.md=g.parts.map(function(x){return x.md}).join('');
      g.cid=nCourseOf(g.course);g.base=nBase(g.path);
      var m=/^(\d{4}-\d{2}-\d{2})\s+(.*)$/.exec(g.base);g.date=m?m[1]:'';
      if(!g.title)g.title=m?m[2]:g.base;
      if(!NKIND.some(function(x){return x[0]===g.kind})){var p=g.path;g.kind=/^lectures\//i.test(p)?'lecture':/^modules\//i.test(p)?'module':/^weeks\//i.test(p)?'week':/^revision\//i.test(p)?'revision':/^practice\//i.test(p)?'practice':/^to do/i.test(g.base)?'todo':'module'}
      return g;
    });
  }
  function nNum(g){var m=/^(\d+)/.exec(g.base);return m?+m[1]:9999}
  function nSort(a,b){return nNum(a)-nNum(b)||(a.base<b.base?-1:a.base>b.base?1:0)}

  /* ---- Markdown to safe HTML. Every character of text goes through esc(); the only tags ever produced are the ones named here. ---- */
  function mdInline(s,ctx){
    s=String(s).replace(/[\u0001\u0002]/g,'');
    var ph=[],depth=0,hold=function(h){ph.push(h);return '\u0001'+(ph.length-1)+'\u0002'};
    s=s.replace(/`([^`\n]+)`/g,function(_,c){return hold('<code>'+esc(c)+'</code>')});
    s=s.replace(/<span style="color:\s*(#(?:[0-9a-fA-F]{6}|[0-9a-fA-F]{3}))\s*;?">|<\/span>|<br\s*\/?>/gi,function(m,hex){
      if(hex){depth++;return hold('<span style="color:'+hex.toLowerCase()+'">')}
      if(/^<br/i.test(m))return hold('<br>');
      if(depth>0){depth--;return hold('</span>')}
      return m;
    });
    s=s.replace(/\[\[([^\[\]\n]+)\]\]/g,function(_,w){
      var al=w.split('|'),tg=al[0].split('#')[0].trim(),label=(al[1]||al[0].replace('#',' › ')).trim(),k=ctx&&ctx.links&&ctx.links[nz(tg)];
      return hold(k?'<a href="#" class="nt-wl" data-act="ntlink" data-k="'+esc(k)+'">'+esc(label)+'</a>':esc(label));
    });
    s=s.replace(/\[([^\[\]\n]+)\]\(([^()\s]+)(?:\s+"[^"]*")?\)/g,function(_,t,u){
      var inner=mdInline(t,ctx);
      return hold(/^(https?:\/\/|mailto:)/i.test(u)?'<a href="'+esc(u)+'" target="_blank" rel="noopener noreferrer">'+inner+'</a>':inner);
    });
    s=s.replace(/ {2,}\n/g,function(){return hold('<br>')}).replace(/\n/g,' ');
    s=esc(s);
    s=s.replace(/\*\*(?=\S)([\s\S]*?\S)\*\*/g,'<strong>$1</strong>').replace(/(^|[^\w])__(?=\S)([\s\S]*?\S)__(?!\w)/g,'$1<strong>$2</strong>');
    s=s.replace(/~~(?=\S)([\s\S]*?\S)~~/g,'<s>$1</s>');
    s=s.replace(/(^|[^\w*])\*(?=[^\s*])([^*]*?[^\s*])\*(?!\*)/g,'$1<em>$2</em>').replace(/(^|[^\w])_(?=[^\s_])([^_]*?[^\s_])_(?!\w)/g,'$1<em>$2</em>');
    for(;depth>0;depth--)s+='</span>';
    return s.replace(/\u0001(\d+)\u0002/g,function(_,n){return ph[+n]});
  }
  var RE_LI=/^(\s*)([-*+]|\d{1,9}[.)])\s+(.*)$/,RE_HR=/^\s{0,3}([-*_])(\s*\1){2,}\s*$/,RE_SEP=/^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/;
  function mdCells(l){l=l.trim().replace(/^\|/,'').replace(/\|$/,'');return l.split(/(?<!\\)\|/).map(function(c){return c.replace(/\\\|/g,'|').trim()})}
  function isBlockStart(l,nx){return /^\s*(`{3,}|~{3,})/.test(l)||/^#{1,6}\s/.test(l)||RE_HR.test(l)||/^\s*>/.test(l)||RE_LI.test(l)||(l.indexOf('|')>=0&&nx!=null&&RE_SEP.test(nx))}
  function mdList(items,ctx){
    var base=items[0].ind,ord=items[0].ord,out='<'+(ord?'ol'+(items[0].num>1?' start="'+items[0].num+'"':''):'ul')+'>',i=0;
    while(i<items.length){
      var it=items[i],kids=[];i++;
      while(i<items.length&&items[i].ind>base){kids.push(items[i]);i++}
      var tx=it.tx,tk=/^\[([ xX])\]\s+(.*)$/.exec(tx);if(tk)tx=(tk[1]===' '?'☐ ':'☑ ')+tk[2];
      out+='<li>'+mdInline(tx,ctx)+(kids.length?mdList(kids,ctx):'')+'</li>';
    }
    return out+'</'+(ord?'ol':'ul')+'>';
  }
  function mdBlocks(lines,ctx){
    var out=[],i=0,m;
    while(i<lines.length){
      var ln=lines[i];
      if(/^\s*$/.test(ln)){i++;continue}
      if((m=/^\s*(`{3,}|~{3,})/.exec(ln))){
        var f=m[1].charAt(0),buf=[];i++;
        while(i<lines.length&&!(new RegExp('^\\s*'+(f==='`'?'`':'~')+'{3,}\\s*$')).test(lines[i])){buf.push(lines[i]);i++}
        i++;out.push('<pre><code>'+esc(buf.join('\n'))+'</code></pre>');continue;
      }
      if((m=/^(#{1,6})\s+(.*?)\s*#*\s*$/.exec(ln))){var lv=Math.min(m[1].length+1,6);out.push('<h'+lv+' class="nt-h">'+mdInline(m[2],ctx)+'</h'+lv+'>');i++;continue}
      if(RE_HR.test(ln)){out.push('<hr>');i++;continue}
      if(/^\s*>/.test(ln)){var q=[];while(i<lines.length&&/^\s*>/.test(lines[i])){q.push(lines[i].replace(/^\s*>\s?/,''));i++}out.push('<blockquote>'+mdBlocks(q,ctx)+'</blockquote>');continue}
      if(ln.indexOf('|')>=0&&i+1<lines.length&&RE_SEP.test(lines[i+1])){
        var head=mdCells(ln),al=mdCells(lines[i+1]).map(function(c){return /^:-+:$/.test(c)?'center':/-:$/.test(c)?'right':''}),rows=[];i+=2;
        while(i<lines.length&&lines[i].indexOf('|')>=0&&!/^\s*$/.test(lines[i])){rows.push(mdCells(lines[i]));i++}
        var cell=function(tag,c,k){return '<'+tag+(al[k]?' style="text-align:'+al[k]+'"':'')+'>'+mdInline(c,ctx)+'</'+tag+'>'};
        out.push('<div class="nt-tw"><table><thead><tr>'+head.map(function(c,k){return cell('th',c,k)}).join('')+'</tr></thead><tbody>'+rows.map(function(r){return '<tr>'+head.map(function(_,k){return cell('td',r[k]||'',k)}).join('')+'</tr>'}).join('')+'</tbody></table></div>');
        continue;
      }
      if((m=RE_LI.exec(ln))){
        var items=[];
        while(i<lines.length){
          var mm=RE_LI.exec(lines[i]);
          if(mm&&!RE_HR.test(lines[i])){items.push({ind:mm[1].replace(/\t/g,'    ').length,ord:/\d/.test(mm[2].charAt(0)),num:parseInt(mm[2],10)||1,tx:mm[3]});i++}
          else if(items.length&&/^\s+\S/.test(lines[i])&&!isBlockStart(lines[i])){items[items.length-1].tx+=' '+lines[i].trim();i++}
          else break;
        }
        out.push(mdList(items,ctx));continue;
      }
      var para=[ln];i++;
      while(i<lines.length&&!/^\s*$/.test(lines[i])&&!isBlockStart(lines[i],lines[i+1]))para.push(lines[i++]);
      out.push('<p>'+mdInline(para.join('\n'),ctx)+'</p>');
    }
    return out.join('');
  }
  function mdRender(md,ctx){
    md=String(md||'').replace(/\r\n?/g,'\n').replace(/^﻿/,'');
    md=md.replace(/^---\n[\s\S]*?\n---\n/,'').replace(/<!--[\s\S]*?-->/g,'');
    return mdBlocks(md.split('\n'),ctx);
  }
  window.mdRender=mdRender;

  function nCourse(all){
    var cs=Object.keys(COURSES),uns=all.some(function(g){return !g.cid}),k=state.nCourse;
    if(k==='_uns'&&uns)return k;
    if(k&&COURSES[k])return k;
    for(var i=0;i<cs.length;i++){if(all.some(function(g){return g.cid===cs[i]}))return cs[i]}
    return cs[0]||(uns?'_uns':'');
  }
  function nRow(g){
    return '<button type="button" class="nt-row" data-act="ntopen" data-k="'+esc(g.key)+'"><b>'+esc(g.title)+'</b>'+(g.date?'<span>'+esc(dlabel(g.date))+'</span>':'')+'</button>';
  }
  function nSection(title,list,extra){
    if(!list.length)return '';
    return '<section class="card"><h2>'+esc(title)+'<small>'+list.length+'</small></h2><div class="list">'+list.map(nRow).join('')+'</div>'+(extra||'')+'</section>';
  }
  function nSnippet(md,q){
    var t=String(md).replace(/<[^>]*>/g,'').replace(/[#*_`>|]/g,' ').replace(/\s+/g,' '),i=t.toLowerCase().indexOf(q);
    if(i<0)return '';var a=Math.max(0,i-30);return (a?'…':'')+t.slice(a,i+q.length+60);
  }
  function nBody(mine,q){
    q=String(q||'').trim().toLowerCase();
    if(q){
      var hits=mine.filter(function(g){return g.title.toLowerCase().indexOf(q)>=0||g.md.toLowerCase().indexOf(q)>=0}).sort(function(a,b){return (b.date||'').localeCompare(a.date||'')||nSort(a,b)});
      return '<section class="card"><h2>Search results<small>'+hits.length+'</small></h2>'+(hits.length?'<div class="list">'+hits.map(function(g){
        var sn=g.title.toLowerCase().indexOf(q)>=0?'':nSnippet(g.md,q);
        return '<button type="button" class="nt-row" data-act="ntopen" data-k="'+esc(g.key)+'"><b>'+esc(g.title)+'</b><span>'+esc(g.path)+'</span>'+(sn?'<em>'+esc(sn)+'</em>':'')+'</button>'}).join('')+'</div>':emptyState('Nothing matches “'+esc(q)+'”.'))+'</section>';
    }
    var lec=mine.filter(function(g){return g.kind==='lecture'}).sort(function(a,b){return (b.date||'').localeCompare(a.date||'')||(b.base<a.base?-1:1)});
    var rest=lec.slice(5),html=nSection('Latest lectures',lec.slice(0,5),rest.length?'<details class="st-more" style="margin-top:var(--s3)"><summary class="btn ghost sm">Earlier lectures ('+rest.length+')</summary><div class="list" style="margin-top:var(--s2)">'+rest.map(nRow).join('')+'</div></details>':'');
    html+=nSection('Modules',mine.filter(function(g){return g.kind==='module'}).sort(nSort));
    html+=nSection('Weeks',mine.filter(function(g){return g.kind==='week'}).sort(nSort));
    html+=nSection('Revision',mine.filter(function(g){return g.kind==='revision'}).sort(nSort));
    html+=nSection('Practice',mine.filter(function(g){return g.kind==='practice'}).sort(nSort));
    html+=nSection('To do',mine.filter(function(g){return g.kind==='todo'}).sort(nSort));
    return html||'<section class="card">'+emptyState('No notes for this course yet. The Scribe sends each note here after saving it on your Mac.')+'</section>';
  }
  function nLegend(){
    return '<details class="st-disc nt-leg"><summary>Colour legend</summary><div class="nt-legrow">'+NLEG.map(function(x){
      return '<span><i style="background:'+(x[1]||'var(--fg)')+'"></i>'+esc(x[0])+'</span>'}).join('')+'</div></details>';
  }
  function nReader(all,k){
    var g=all.filter(function(x){return x.key===k})[0];
    if(!g)return null;
    var links={};all.filter(function(x){return g.cid?x.cid===g.cid:x.course===g.course}).forEach(function(x){links[nz(x.base)]=x.key;links[nz(x.title)]=links[nz(x.title)]||x.key});
    return '<div class="st-stack st-pad"><section class="card" id="nt-reader"><button type="button" class="btn ghost sm" data-act="ntback" id="nt-back">‹ Back to notes</button>'+
      '<h2 style="margin-top:var(--s3)">'+esc(g.title)+'</h2><p class="nt-path">Find it in Finder: <span>'+esc(g.course?g.course+' › ':'')+esc(g.path)+'</span></p>'+nLegend()+
      '<div class="nt-md">'+mdRender(g.md.replace(/^((?:---\n[\s\S]*?\n---\n)?(?:\s*<!--[\s\S]*?-->)*\s*)#[ \t]+([^\n]*)\n/,function(m,pre,h){return nz(h)===nz(g.title)?pre:m}),{links:links})+'</div></section></div>';
  }
  function viewNotes(){
    var all=nAll();
    if(state.nOpen){var r=nReader(all,state.nOpen);if(r)return r;state.nOpen=null}
    var c=nCourse(all),cs=Object.keys(COURSES),uns=all.some(function(g){return !g.cid});
    var chips='<div class="chips" style="margin-top:var(--s4)" role="group" aria-label="Notes course">'+cs.map(function(k){
      return '<button class="chip" aria-pressed="'+(k===c)+'" data-act="ntcourse" data-v="'+esc(k)+'">'+esc(cshort(k))+'</button>'}).join('')+(uns?'<button class="chip" aria-pressed="'+(c==='_uns')+'" data-act="ntcourse" data-v="_uns">Unsorted</button>':'')+'</div>';
    var mine=all.filter(function(g){return c==='_uns'?!g.cid:g.cid===c});
    return chips+'<div class="st-stack st-pad"><input type="search" id="nt-q" class="nt-q" placeholder="Search these notes" aria-label="Search notes" autocomplete="off" value="'+esc(state.nQ||'')+'"><div class="st-stack" id="nt-body">'+nBody(mine,state.nQ)+'</div></div>';
  }
  function nMine(){var all=nAll(),c=nCourse(all);return all.filter(function(g){return c==='_uns'?!g.cid:g.cid===c})}
  document.addEventListener('click',function(e){
    var b=e.target.closest&&e.target.closest('[data-act^="nt"]');if(!b)return;
    var a=b.dataset.act;
    if(a==='ntcourse'){e.preventDefault();state.nCourse=b.dataset.v;state.nQ='';render()}
    else if(a==='ntopen'||a==='ntlink'){e.preventDefault();state.nOpen=b.dataset.k;render();window.scrollTo(0,0)}
    else if(a==='ntback'){state.nOpen=null;render()}
  });
  document.addEventListener('input',function(e){
    var i=e.target;if(!i||i.id!=='nt-q')return;
    state.nQ=i.value;var bd=document.getElementById('nt-body');if(bd)bd.innerHTML=nBody(nMine(),state.nQ);
  });
  LD.opened.then(function(){LD.onCol('notes',function(){
    if(state.view!=='study'||state.studyView!=='notes')return;
    var a=document.activeElement;if(a&&a.id==='nt-q')return;
    if(typeof scheduleRender==='function')scheduleRender();
  })});

  vStudy=function(){
    var v=state.studyView;if(!VIEWS.some(function(x){return x[0]===v}))v='plan';
    var body={plan:viewPlan,exams:viewExams,cfa:viewCfa,tasks:viewTasks,revise:viewRevise,notes:viewNotes}[v]();
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
  /* the semnew handler in extra.js archives courses, assessments, marks and revision data in one write */
})();

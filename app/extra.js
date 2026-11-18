/* Everything the installable app adds on top of the original dashboard logic:
   five-section navigation, honest sync status, cloud sign-in, verified import, semester setup,
   CFA question bank and pace, nightly-review inbox, reminders, appearance extras, install help. */
'use strict';
const XS={props:[],heroImg:{},remT:null};
const xq=(s,r)=>(r||document).querySelector(s);

/* ---------- navigation: Today, Body, Money, Study, Career ---------- */
TABS.splice(0,TABS.length,['today','Today'],['body','Body'],['money','Money'],['study','Study'],['life','Career']);
IC.body=IC.train;
IC.life='<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2M3 13h18"/>';
const tabOf=v=>(v==='train'||v==='fuel')?'body':v==='poker'?'money':v==='progress'||v==='widget'?'today':v;
renderTabs=function(){
  const cur=tabOf(state.view);
  $('#tabs').innerHTML='<div class="mark" aria-hidden="true">'+CREST+'</div>'+TABS.map(([k,l])=>'<button role="tab" data-act="tab" data-v="'+k+'" aria-selected="'+(cur===k)+'"><svg viewBox="0 0 24 24">'+IC[k]+'</svg>'+l+'</button>').join('');
};
function xWrap(v,html){
  if(v==='train'||v==='fuel'){
    state.bodyView=v;
    return '<div class="seg" role="group" aria-label="Body section">'+[['train','Train'],['fuel','Fuel']].map(([k,l])=>'<button data-act="tab" data-v="'+k+'" aria-pressed="'+(v===k)+'">'+l+'</button>').join('')+'</div>'+html;
  }
  if(v==='today'){const p=wisprCard()+propsCard()+cutCard()+setupCard();if(p){const mark='<div class="grid w2" style="margin-top:14px">';const i=html.indexOf(mark);return i<0?p+html:html.slice(0,i)+p+html.slice(i)}}
  return html;
}

/* ---------- sync status, told honestly ---------- */
setSync=function(s){
  if(s)state.sync=s;const el=$('#sync');if(!el||!window.LD)return;
  const st=LD.status(),n=st.pending;
  const m={local:['On this device only','warn'],synced:['Synced','good'],pending:[n+' waiting to sync','warn'],syncing:['Syncing','acc'],
    offline:['Offline'+(n?' · '+n+' saved here':''),'warn'],error:['Sync problem · tap','bad']}[LD.failed?'error':st.mode];
  el.className='pill '+m[1];el.innerHTML='<i class="dot"></i><span>'+m[0]+'</span>';el.style.cursor='pointer';
  el.setAttribute('role','button');el.setAttribute('aria-label','Sync status: '+m[0]+'. Open cloud settings');
};
unsynced=function(){return window.LD?LD.status().pending:0};
LD.onStatus(()=>setSync());
$('#sync').addEventListener('click',()=>cloudSheet());

function cloudSheet(msg){
  const st=LD.status(),c=LD.cloud()||{};
  const last=st.last?new Date(st.last).toLocaleString('en-IN'):'not yet';
  if(st.mode==='local'){
    sheet('<h2>Cloud sync</h2><p class="muted" style="font-size:13px">Right now everything is saved on this device only. Connect your own cloud database to sync phone and laptop. The four values come from the setup guide.</p>'+(msg?'<p style="color:var(--bad);font-size:13px">'+esc(msg)+'</p>':'')+
     '<form data-xform="cloud" class="stack"><label class="fld"><span>Project URL</span><input type="text" name="url" placeholder="https://xxxx.supabase.co" autocomplete="off" required value="'+esc(c.url||'')+'"></label>'+
     '<label class="fld"><span>Publishable key</span><input type="text" name="key" autocomplete="off" required value="'+esc(c.key||'')+'"></label>'+
     '<label class="fld"><span>Email</span><input type="text" name="email" inputmode="email" autocomplete="username" required value="'+esc(c.email||'')+'"></label>'+
     '<label class="fld"><span>Password</span><input type="password" name="password" autocomplete="current-password" required></label>'+
     '<p class="faint" style="font-size:12px;margin:0">The publishable key starts with sb_publishable_ and is safe to keep on a device. Your password is used once to sign in and is not stored.</p>'+
     '<div class="row"><button class="btn pri" type="submit">Connect and sync</button><button class="btn" type="button" data-act="sheetclose">Close</button></div></form>');
    return;
  }
  sheet('<h2>Cloud sync</h2><div class="stack"><p class="muted" style="font-size:13px;margin:0">Signed in as <b>'+esc(st.email)+'</b>. '+(st.pending?'<b style="color:var(--warn)">'+st.pending+' change'+(st.pending===1?'':'s')+' waiting to sync.</b>':'Everything is synced.')+' Last sync: '+esc(last)+'.</p>'+
    (st.err?'<p style="color:var(--bad);font-size:13px;margin:0">'+esc(st.err)+'</p>':'')+
    '<button class="btn pri" data-x="syncnow">Sync now</button><button class="btn" data-x="resync">Download everything again</button>'+
    '<label class="chip" style="align-self:flex-start"><input type="checkbox" data-xchange="aion"'+(LD.kvGet('aiOn')?' checked':'')+'>Use Claude for free-text logging and meal estimates (needs the optional AI function and key)</label>'+
    '<button class="btn" data-x="signout">Sign out on this device</button><button class="btn" data-act="sheetclose">Close</button></div>');
}

/* ---------- data: export, verified import, backup ---------- */
exportPayload=function(){return LD.exportAll()};
doImport=async function(file){
  let j;try{j=JSON.parse(await file.text())}catch(e){toast('That file is not a dashboard backup');return}
  let rep;try{rep=LD.importPayload(j)}catch(e){toast(String(e.message||e));return}
  const cols=Object.keys(rep.source).filter(c=>rep.source[c]);
  const rows=cols.map(c=>'<tr><td>'+esc(c)+'</td><td class="mono">'+rep.source[c]+'</td><td class="mono">'+rep.added[c]+'</td><td class="mono">'+rep.skipped[c]+'</td><td class="mono">'+(rep.after[c]||0)+'</td></tr>').join('');
  sheet('<h2>Import '+(rep.ok?'verified':'needs a look')+'</h2><p class="muted" style="font-size:13px">'+(rep.ok?'Every record in the file is now in the app. Records you already had were left untouched.':'<b style="color:var(--bad)">Some records did not match the file. Nothing was deleted. Send this list to Claude before relying on the import:</b><br>'+esc(rep.mismatch.slice(0,12).join(', ')))+'</p>'+
    '<table class="xt"><thead><tr><th>Type</th><th>In file</th><th>Added</th><th>Already here</th><th>Now in app</th></tr></thead><tbody>'+rows+'</tbody></table><div class="row" style="margin-top:14px"><button class="btn pri" data-act="sheetclose">Done</button></div>');
};
dataSheet=function(){
  const st=LD.status(),lb=state.lastBackup?new Date(state.lastBackup).toLocaleString('en-IN'):'never from this device';
  const bk=state.meta&&state.meta.backup,de=C().dayEnd,cn=LD.counts();
  const drive=bk&&bk.at?'Last Google Drive backup: '+esc(new Date(bk.at).toLocaleString('en-IN'))+(bk.file?' ('+esc(bk.file)+')':'')+'.':'No Google Drive backup has been confirmed yet. Once the cloud is connected, a daily copy is saved to Drive and recorded here.';
  sheet('<h2>Data and backup</h2><p class="muted" style="font-size:13px">'+(st.mode==='local'?'Saved on this device only. Connect the cloud to sync and back up.':st.pending?'<b style="color:var(--warn)">'+st.pending+' change'+(st.pending===1?'':'s')+' waiting to sync.</b>':'Everything is synced.')+' '+drive+' Last export: '+esc(lb)+'.</p>'+
   '<p class="faint" style="font-size:12px">On this device: '+['entries','days','todos','academics','photos'].map(c=>(cn[c]||0)+' '+c).join(' · ')+'</p>'+
   '<label class="fld" style="margin-bottom:12px"><span>Your day ends at</span><select data-change="dayend">'+[0,1,2,3,4,5,6].map(h=>'<option value="'+h+'"'+(h===de?' selected':'')+'>'+(h===0?'Midnight':h+':00 AM')+'</option>').join('')+'</select></label><p class="faint" style="font-size:12px;margin:-6px 0 12px">Anything logged before this hour counts toward the previous day, so a 1 AM bedtime stays on the right night.</p>'+
   '<div class="stack"><button class="btn pri" data-act="dljson">Export everything as a file</button><button class="btn" data-act="cpjson">Copy as text</button><label class="fld"><span>Import a backup file (old or new format)</span><input type="file" id="imp" accept="application/json,.json" data-change="import"></label><button class="btn" data-x="cloud">Cloud sync</button><button class="btn" data-act="sheetclose">Close</button></div>');
};

/* ---------- semester: courses, assessments and markers editable in the app ---------- */
const DEF_SEM={name:'Semester 7 · Monsoon 2026',courses:Object.keys(COURSES).map(id=>({id,name:COURSES[id],short:cshort(id)})),items:ACAD.map(a=>({...a})),miles:MILESTONES.map(m=>({...m}))};
const SEM_COL=['#9db39a','#c9a86a','#8fb3c4','#c98a8f','#a39b8b','#b7a0c9','#d0685e','#7fb894'];
const XSHORT={};window.XSHORT=XSHORT;let semSig='';
const semNow=()=>C().sem||DEF_SEM;
function applySemester(){
  const sm=semNow(),sig=JSON.stringify(sm);if(sig===semSig)return;semSig=sig;
  Object.keys(COURSES).forEach(k=>delete COURSES[k]);Object.keys(XSHORT).forEach(k=>delete XSHORT[k]);
  (sm.courses||[]).forEach((c,i)=>{COURSES[c.id]=c.name;if(c.short)XSHORT[c.id]=c.short;if(!COURSE_COL[c.id])COURSE_COL[c.id]=SEM_COL[i%SEM_COL.length]});
  ACAD.splice(0,ACAD.length,...(sm.items||[]).map(a=>({...a})));
  MILESTONES.splice(0,MILESTONES.length,...(sm.miles||[]).map(m=>({...m})));
  LM.marks.f[1][3]=Object.values(COURSES).length?Object.values(COURSES):['General'];
}
const _render=render;render=function(){try{applySemester()}catch(e){console.error(e)}try{if(state.mm==='poker'&&examOn(todayStr()))state.mm='spend'}catch(e){}_render();try{remPublish()}catch(e){}try{calPublish()}catch(e){}try{allowSeed()}catch(e){}try{agentDot()}catch(e){}};
const KINDS=['Exam','Test','Submission','Presentation','Interviews','Task'];
function semSheet(){
  XS.wiz=null;
  const sm=semNow(),cs=sm.courses||[],its=(sm.items||[]).slice().sort((a,b)=>(a.d||'9999')<(b.d||'9999')?-1:1);
  const mile=k=>((sm.miles||[]).find(m=>k.test(m.t))||{}).d||'';
  sheet('<h2>Semester setup</h2><div class="stack">'+
   '<form data-xform="semname" class="row"><input type="text" name="name" value="'+esc(sm.name||'')+'" aria-label="Semester name"><button class="btn sm" type="submit">Rename</button></form>'+
   '<div><div class="lbl" style="margin-bottom:6px">Courses</div>'+(cs.length?cs.map(c=>'<div class="lookrow"><b>'+esc(c.name)+(c.short&&c.short!==c.name?' <span class="faint">· '+esc(c.short)+'</span>':'')+'</b><button class="btn sm ghost" data-x="semcdel" data-id="'+esc(c.id)+'" aria-label="Remove '+esc(c.name)+'">Remove</button></div>').join(''):'<div class="empty">No courses yet. Add this semester’s courses below.</div>')+
   '<form data-xform="semcadd" class="row wrap" style="margin-top:8px"><input type="text" name="name" placeholder="Course name" required style="flex:2;min-width:160px"><input type="text" name="short" placeholder="Short name" style="flex:1;min-width:100px"><button class="btn sm pri" type="submit">Add course</button></form></div>'+
   '<div><div class="lbl" style="margin-bottom:6px">Assessments and exams</div>'+(its.length?'<div class="list">'+its.map(a=>'<div class="li"><div class="m"><b>'+esc(a.t)+'</b><span>'+esc(COURSES[a.c]||'')+' · '+esc(a.k)+' · '+(a.d?dlabel(a.d):'date to be set')+'</span></div><button class="x" data-x="semidel" data-id="'+esc(a.id)+'" aria-label="Remove '+esc(a.t)+'">×</button></div>').join('')+'</div>':'<div class="empty">None yet.</div>')+
   (cs.length?'<form data-xform="semiadd" class="fgrid" style="margin-top:8px"><label class="fld"><span>Course</span><select name="c">'+cs.map(c=>'<option value="'+esc(c.id)+'">'+esc(c.short||c.name)+'</option>').join('')+'</select></label><label class="fld"><span>Title</span><input type="text" name="t" required></label><label class="fld"><span>Date</span><input type="date" name="d"></label><label class="fld"><span>Kind</span><select name="k">'+KINDS.map(k=>'<option>'+k+'</option>').join('')+'</select></label><button class="btn sm pri" type="submit" style="align-self:end">Add</button></form>':'')+'</div>'+
   '<form data-xform="semmiles" class="fgrid"><label class="fld"><span>Classes end</span><input type="date" name="ce" value="'+mile(/classes end/i)+'"></label><label class="fld"><span>Exams begin</span><input type="date" name="eb" value="'+mile(/exams begin/i)+'"></label><label class="fld"><span>Exams end</span><input type="date" name="ee" value="'+mile(/exams end/i)+'"></label><button class="btn sm" type="submit" style="align-self:end">Save dates</button></form>'+
   '<div class="sep" style="margin:4px 0"></div><p class="faint" style="font-size:12px;margin:0">Starting a new semester keeps this one in an archive, with your marks and history, and gives you an empty course list to fill in.</p>'+
   '<form data-xform="semnew" class="row wrap"><input type="text" name="name" placeholder="New semester name, e.g. Semester 8 · Spring 2027" required style="flex:1;min-width:200px"><button class="btn sm" type="submit">Start new semester</button></form>'+
   '<button class="btn pri" data-act="sheetclose">Done</button></div>');
}
const semPut=sm=>{saveCfg({sem:sm});applySemester();render()};
const semSave=sm=>{semPut(sm);XS.wiz?wizSheet(XS.wiz):semSheet()};

/* ---------- CFA: question bank, pace to exam day, short review queue ---------- */
LM.qb={t:'Log questions',f:[['date','Date','date'],['topic','Topic','sel',CFA_T.map(x=>x[0])],['done','Questions done','num'],['right','Correct','num']]};
const _cfaSystem=cfaSystem;
cfaSystem=function(){
  const cfg=C(),t=todayStr(),exam=cfg.cfaDate,goalH=+cfg.cfaHours||300;
  const Q=LL('qb'),T=cfg.cfaT||{};
  const mins=sum(Object.keys(state.days),k=>+state.days[k].cfaMin||0),left=Math.max(0,diff(exam,t));
  const need=left?Math.max(0,Math.round((goalH*60-mins)/left)):0;
  const wk=[];for(let i=0;i<7;i++)wk.push(+day(addDays(t,-i)).cfaMin||0);const avg7=Math.round(sum(wk,x=>x)/7);
  const by={};Q.forEach(q=>{const b=by[q.topic]=by[q.topic]||{d:0,r:0,last:''};b.d+=+q.done||0;b.r+=+q.right||0;if((q.date||'')>b.last)b.last=q.date||''});
  const totD=sum(Object.values(by),b=>b.d),totR=sum(Object.values(by),b=>b.r);
  const acc=b=>b&&b.d?Math.round(b.r/b.d*100):null;
  const queue=CFA_T.map(([n,w])=>{const b=by[n],a=acc(b),s=T[n]||0;if(!s&&!b)return null;
    const stale=b&&b.last?diff(t,b.last):30;return {n,a,score:(a==null?40:100-a)*w/10+Math.min(30,stale)}}).filter(Boolean).sort((x,y)=>y.score-x.score).slice(0,3);
  /* pace line: straight line to the goal against what is logged */
  const start=Object.keys(state.days).filter(k=>+state.days[k].cfaMin>0).sort()[0]||t,span=Math.max(1,diff(exam,start)),W=320,H=70;
  const px=d=>Math.round(clamp(diff(d,start)/span,0,1)*W),py=m=>Math.round(H-clamp(m/(goalH*60),0,1)*(H-6))-2;
  const svg='<svg class="chart" viewBox="0 0 '+W+' '+(H+4)+'" role="img" aria-label="CFA hours logged against the pace needed"><line x1="0" y1="'+py(0)+'" x2="'+W+'" y2="'+py(goalH*60)+'" stroke="var(--line2)" stroke-width="1.5" stroke-dasharray="4 4"/><line x1="0" y1="'+py(0)+'" x2="'+px(t)+'" y2="'+py(mins)+'" stroke="var(--accent)" stroke-width="2.5" stroke-linecap="round"/><circle cx="'+px(t)+'" cy="'+py(mins)+'" r="3.5" fill="var(--accent)"/></svg>';
  const extra='<section class="card"><h2>CFA pace<small>'+left+' days to '+dlabel(exam)+((state.cfg||{}).cfaDate?'':' · set your exact date')+'</small></h2>'+
    '<div class="row sp wrap" style="gap:14px"><div class="stat"><span class="lbl">Logged</span><span class="mid mono">'+(mins/60).toFixed(1)+' h</span><span class="faint" style="font-size:12px">of '+goalH+' h goal</span></div><div class="stat"><span class="lbl">Needed</span><span class="mid mono">'+need+' min</span><span class="faint" style="font-size:12px">a day from now</span></div><div class="stat"><span class="lbl">Last 7 days</span><span class="mid mono" style="color:var(--'+(avg7>=need?'good':'warn')+')">'+avg7+' min</span><span class="faint" style="font-size:12px">a day on average</span></div></div>'+
    '<div style="margin-top:12px">'+svg+'<p class="faint" style="font-size:12px;margin:6px 0 0">Dashed line: steady pace to '+goalH+' hours. Solid line: what you have logged.</p></div>'+
    '<form data-xform="cfaset" class="row wrap" style="margin-top:10px"><label class="fld" style="flex:1;min-width:130px"><span>Exam date</span><input type="date" name="date" value="'+esc(exam)+'"></label><label class="fld" style="flex:1;min-width:110px"><span>Hours goal</span><input type="number" name="hours" min="50" max="1000" value="'+goalH+'"></label><button class="btn sm" type="submit" style="align-self:end">Save</button></form></section>'+
    '<section class="card"><h2>Question bank<small>'+(totD?totD+' done · '+Math.round(totR/totD*100)+'% correct':'none logged yet')+'</small></h2>'+
    (totD?'<div class="bars">'+CFA_T.filter(([n])=>by[n]&&by[n].d).map(([n])=>{const a=acc(by[n]);return '<div class="b"><span class="n">'+n+'</span><div class="bar '+(a<60?'bad':a<70?'warn':'good')+'"><i style="width:'+a+'%"></i></div><span class="mono" style="font-size:12px">'+a+'% · '+by[n].d+'</span></div>'}).join('')+'</div>':'<div class="empty">Log each practice set by topic to see where your accuracy is weakest.</div>')+
    (queue.length?'<div class="sep"></div><div class="lbl" style="margin-bottom:6px">Review today</div><div class="list">'+queue.map(q=>'<div class="li"><div class="m"><b>'+q.n+'</b><span>'+(q.a==null?'no questions logged yet':q.a+'% correct so far')+'</span></div></div>').join('')+'</div>':'')+
    addBtn('qb')+'</section>';
  return _cfaSystem()+extra;
};

/* a Wispr-logger record: auto at the top level, or on its items (the Drive inbox script passes only date and items) */
function wlIsAuto(p){return !!p&&(p.auto===true||(Array.isArray(p.items)&&p.items.some(i=>i&&i.auto===true)))}
/* ---------- nightly review inbox: proposals wait here until approved ---------- */
LD.opened.then(()=>{LD.onCol('proposals',s=>{XS.props=s.docs.map(d=>({id:d.id,...d.data()}));scheduleRender();setTimeout(agentDot,0)});LD.onCol('meta',()=>setTimeout(agentDot,0))});
function propLabel(it){return ({todo:'Add a task',deadline:'Add a deadline',log:'Log an entry',note:'Add to the daily note',topic:'Add a topic',case:'Add a case',course:'Add a course'})[it.kind]||'Suggestion'}
function propText(it){return it.kind==='case'?(it.name||'')+(it.point?' — '+it.point:''):(it.text||it.title||it.cmd||it.t||it.name||'')}
function propsCard(){
  const open=[];XS.props.forEach(p=>{if(wlIsAuto(p))return;(p.items||[]).forEach((it,i)=>{if(!it.status)open.push({p,it,i})})});
  if(!open.length)return '';
  const bulk=open.length>1?'<div class="pr-bulk"><button class="btn sm pri" data-x="propall">Approve all</button><button class="btn sm ghost" data-x="propnoall">Dismiss all</button></div>':'';
  return '<section class="card hero" style="margin-top:14px" id="props"><h2>Nightly review<small>'+open.length+' suggestion'+(open.length===1?'':'s')+' · nothing is applied until you approve</small></h2>'+bulk+'<div class="list">'+open.map(({p,it,i})=>{const a='data-id="'+esc(p.id)+'" data-i="'+i+'"';return '<div class="li pr-li"><div class="m"><b>'+esc(propText(it))+'</b><span>'+esc(propLabel(it))+(it.why?' · '+esc(it.why):'')+'</span></div><div class="pr-acts"><button class="btn sm pri" data-x="propok" '+a+'>Approve</button><button class="btn sm" data-x="propedit" '+a+'>Edit</button><button class="btn sm ghost" data-x="propno" '+a+'>Dismiss</button></div></div>'}).join('')+'</div></section>';
}
/* write status changes for several items of one proposal at once: patches = {index: patchObject | null (reset to open)} */
function propPatch(id,patches){
  const p=XS.props.find(x=>x.id===id);if(!p)return;
  const items=p.items.map((it,k)=>{if(!(k in patches))return it;const pt=patches[k];if(pt===null){const c={...it};delete c.status;delete c.edited;return c}return {...it,...pt}});
  const {id:_,...doc}=p;p.items=items;LD.write('proposals',id,{...doc,items});
}
function propSet(id,i,status){propPatch(id,{[i]:{status}})}
function propCourse(v){
  v=String(v==null?'':v).trim().toLowerCase();if(!v)return '';
  const ids=Object.keys(COURSES);
  return ids.find(k=>k.toLowerCase()===v)||ids.find(k=>String(COURSES[k]).toLowerCase()===v)||ids.find(k=>XSHORT[k]&&String(XSHORT[k]).toLowerCase()===v)||ids.find(k=>String(COURSES[k]).toLowerCase().includes(v)||(v.length>3&&v.includes(String(COURSES[k]).toLowerCase())))||'';
}
function validYmd(s){if(!/^\d{4}-\d{2}-\d{2}$/.test(s||''))return false;const d=new Date(s+'T00:00:00Z');return !isNaN(d)&&d.toISOString().slice(0,10)===s}
function reviseSave(c,fn){
  const all=JSON.parse(JSON.stringify(C().revise||{})),cur=all[c]||{};
  const r={topics:cur.topics||[],cases:cur.cases||[],notes:cur.notes||[]};fn(r);all[c]=r;saveCfg({revise:all});
}
/* apply one item. Returns {ok:true,undo:fn} or {ok:false,msg,edit:true?}. Never touches the proposal record. */
function propDo(it){
  const k=it.kind;
  if(k==='todo'){
    const ti=String(it.title||'').trim();if(!ti)return {msg:'That suggestion has no title'};
    const id=uid();setTodo({id,title:ti,pri:['high','med','low'].includes(it.pri)?it.pri:'med',q:['q1','q2','q3','q4'].includes(it.q)?it.q:'q2',done:false});
    return {ok:true,undo:()=>delTodo(id)};
  }
  if(k==='deadline'){
    const ti=String(it.title||'').trim();if(!ti||!validYmd(it.date))return {msg:'That deadline needs a title and a date'};
    const id='c'+uid(),c=propCourse(it.course)||Object.keys(COURSES)[0];
    setAcad(id,{custom:true,c,t:ti,date:it.date,k:KINDS.includes(it.k)?it.k:'Task'});
    return {ok:true,undo:()=>delAcad(id)};
  }
  if(k==='note'){
    const tx=String(it.text||'').trim();if(!tx)return {msg:'That note is empty'};
    const d=state.date,old=day(d).note||'';dbSetDay(d,{note:old?old+'\n'+tx:tx});
    return {ok:true,undo:()=>dbSetDay(d,{note:old})};
  }
  if(k==='log'){
    const lp=localParse(String(it.cmd||''));if(!lp)return {msg:'I could not read that entry. Log it by hand.'};
    const es=lp.entries.map(e=>({...e,date:e.date||state.date}));es.forEach(e=>state.chat.pending.push(e));state.chat.open=true;renderDock();
    return {ok:true,undo:()=>{state.chat.pending=state.chat.pending.filter(e=>!es.includes(e));renderDock()}};
  }
  if(k==='course'){
    const n=String(it.name||'').trim().slice(0,160);if(!n)return {msg:'That course has no name'};
    const sm=semNow(),cs=sm.courses||[];
    if(cs.some(c=>String(c.name).trim().toLowerCase()===n.toLowerCase()))return {ok:true,dup:true,undo:()=>{}};
    let id=slug(n).slice(0,12)||'c';while(cs.some(c=>c.id===id))id+='x';
    semPut({...sm,courses:[...cs,{id,name:n,short:String(it.short||'').trim().slice(0,40)||n}]});
    return {ok:true,undo:()=>{const s2=semNow();semPut({...s2,courses:(s2.courses||[]).filter(c=>c.id!==id),items:(s2.items||[]).filter(i=>i.c!==id)})}};
  }
  if(k==='topic'||k==='case'){
    const c=propCourse(it.course);
    if(!c)return {msg:'I could not match that course. Pick it in the Edit sheet.',edit:true};
    if(k==='topic'){
      const t=String(it.t||it.title||'').trim().slice(0,160);if(!t)return {msg:'That topic has no title'};
      const id=uid();reviseSave(c,r=>{r.topics.push({id,t,done:false,conf:0})});
      return {ok:true,undo:()=>reviseSave(c,r=>{r.topics=r.topics.filter(x=>x.id!==id)})};
    }
    const n=String(it.name||'').trim().slice(0,160);if(!n)return {msg:'That case has no name'};
    const id=uid(),want=String(it.topic||'').trim().toLowerCase(),tp=want?(((C().revise||{})[c]||{}).topics||[]).find(x=>String(x.t).toLowerCase()===want):null;
    reviseSave(c,r=>{const o={id,name:n,point:String(it.point||'').slice(0,300)};if(tp)o.topicId=tp.id;r.cases.push(o)});
    return {ok:true,undo:()=>reviseSave(c,r=>{r.cases=r.cases.filter(x=>x.id!==id)})};
  }
  return {msg:'Unknown suggestion type'};
}
function propApply(id,i){
  const p=XS.props.find(x=>x.id===id),it=p&&p.items[i];if(!it||it.status)return;
  const r=propDo(it);
  if(!r.ok){if(r.edit){propEditSheet(id,i,r.msg);return}return toast(r.msg)}
  propPatch(id,{[i]:{status:'approved'}});toast('Approved',{noUndo:true});
}
function propOpen(){const o=[];XS.props.forEach(p=>{if(wlIsAuto(p))return;(p.items||[]).forEach((it,i)=>{if(!it.status)o.push({id:p.id,i,it})})});return o}
function propGroup(list,fnPatch){const by={};list.forEach(x=>{(by[x.id]=by[x.id]||{})[x.i]=fnPatch(x)});Object.keys(by).forEach(id=>propPatch(id,by[id]))}
function propAll(){
  const open=propOpen(),done=[],undos=[];let bad=0;
  open.forEach(x=>{const r=propDo(x.it);if(r.ok){done.push(x);undos.push(r.undo)}else bad++});
  if(!done.length)return toast(bad?'Nothing could be approved. Open Edit on each one.':'Nothing to approve');
  propGroup(done,()=>({status:'approved'}));
  toast('Approved '+done.length+(bad?'. '+bad+' need a look.':''),{undo:()=>{undos.slice().reverse().forEach(f=>{try{f()}catch(e){}});propGroup(done,()=>null)}});
}
function propNoAll(){const open=propOpen();if(!open.length)return;propGroup(open,()=>({status:'dismissed'}));toast('Dismissed '+open.length,{undo:()=>propGroup(open,()=>null)})}
function propEditSheet(id,i,msg){
  const p=XS.props.find(x=>x.id===id),it=p&&p.items[i];if(!it)return;
  const f=(l,n,v,ex)=>'<label class="fld"><span>'+l+'</span><input type="text" name="'+n+'" value="'+esc(v||'')+'" autocomplete="off"'+(ex||'')+'></label>';
  const sel=(l,n,opts,cur)=>'<label class="fld"><span>'+l+'</span><select name="'+n+'">'+opts.map(([v,t])=>'<option value="'+esc(v)+'"'+(v===cur?' selected':'')+'>'+esc(t)+'</option>').join('')+'</select></label>';
  const cs=Object.keys(COURSES).map(k=>[k,COURSES[k]]),cm=propCourse(it.course);
  let body='';
  if(it.kind==='todo')body=f('Title','title',it.title)+sel('Priority','pri',[['high','High'],['med','Medium'],['low','Low']],['high','med','low'].includes(it.pri)?it.pri:'med')+sel('Box','q',QUAD.map(z=>[z[0],z[0].toUpperCase()+' · '+z[1]]),it.q||'q2');
  else if(it.kind==='deadline')body=f('Title','title',it.title)+'<label class="fld"><span>Date</span><input type="date" name="date" value="'+esc(validYmd(it.date)?it.date:'')+'"></label>'+sel('Kind','k',KINDS.map(x=>[x,x]),KINDS.includes(it.k)?it.k:'Task')+sel('Course','course',cs,cm||(cs[0]||[''])[0]);
  else if(it.kind==='log')body='<label class="fld"><span>Entry to log</span><textarea name="cmd" rows="3">'+esc(it.cmd||'')+'</textarea></label><p class="xnote">It goes to the quick-log box for you to confirm.</p>';
  else if(it.kind==='note')body='<label class="fld"><span>Note</span><textarea name="text" rows="4">'+esc(it.text||'')+'</textarea></label>';
  else if(it.kind==='course')body=f('Course name','name',it.name)+f('Short name','short',it.short);
  else if(it.kind==='topic')body=sel('Course','course',[['','Choose a course']].concat(cs),cm)+f('Topic','t',it.t||it.title);
  else if(it.kind==='case')body=sel('Course','course',[['','Choose a course']].concat(cs),cm)+f('Case name','name',it.name)+f('Holding, one line','point',it.point)+f('Linked topic (optional)','topic',it.topic);
  else return toast('Unknown suggestion type');
  sheet('<h2>Edit suggestion<small>'+esc(propLabel(it))+'</small></h2>'+(msg?'<p class="xnote" role="status">'+esc(msg)+'</p>':'')+'<form data-xform="propedit" class="stack"><input type="hidden" name="id" value="'+esc(id)+'"><input type="hidden" name="i" value="'+i+'">'+body+'<div class="row"><button class="btn pri" type="submit">Save and approve</button><button class="btn" type="button" data-act="sheetclose">Cancel</button></div></form>');
}
function propEditSave(fd){
  const id=String(fd.get('id')),i=+fd.get('i'),p=XS.props.find(x=>x.id===id),it=p&&p.items[i];if(!it||it.status){closeSheet();return}
  const ed={...it};['title','pri','q','date','k','course','cmd','text','t','name','point','topic','short'].forEach(n=>{if(fd.has(n))ed[n]=String(fd.get(n)).trim()});
  const r=propDo(ed);
  if(!r.ok){toast(r.msg);return}
  propPatch(id,{[i]:{...ed,status:'approved',edited:true}});closeSheet();toast('Approved',{noUndo:true});
}

/* ---------- semester rollover wizard (Study > Exams > Start new semester) ---------- */
const WIZ_NAME='Semester 8 · Spring 2027';
const wizItems=()=>{const o=propOpen();return o.filter(x=>x.it.kind==='course').concat(o.filter(x=>x.it.kind==='deadline'))};
function wizSheet(step){
  step=step||XS.wiz||1;XS.wiz=step;
  const sm=semNow(),dots='<p class="faint" style="margin:0 0 var(--s3);font-size:12px" id="wiz-step">Step '+step+' of 3</p>';
  let body='';
  if(step===1){
    body='<p class="xnote" style="margin:0">Starting a new semester archives <b>'+esc(sm.name||'this semester')+'</b> with its marks and history. Nothing is deleted, and the new semester starts with an empty course list.</p>'+
      '<form data-xform="semnew" data-wiz="1" class="stack"><label class="fld"><span>New semester name</span><input type="text" name="name" value="'+esc(WIZ_NAME)+'" required autocomplete="off"></label><div class="row"><button class="btn pri" type="submit">Archive and continue</button><button class="btn" type="button" data-x="wizdone">Cancel</button></div></form>';
  }else if(step===2){
    const L=wizItems(),cs=sm.courses||[];
    body='<h3 style="margin:0;font-size:17px">Waiting for the Scribe’s setup</h3>';
    if(L.length){
      body+='<div class="list" id="wiz-list">'+L.map(x=>'<div class="li"><div class="m"><b>'+esc(propText(x.it))+'</b><span>'+esc(propLabel(x.it))+(x.it.kind==='deadline'&&x.it.date?' · '+esc(x.it.date):'')+'</span></div></div>').join('')+'</div>'+
        '<div class="row"><button class="btn pri" data-x="wizall" id="wiz-all">Approve all</button><button class="btn" data-x="wizstep" data-v="3">Skip, see summary</button></div><p class="faint" style="font-size:12px;margin:0">Courses are added first, then the deadlines.</p>';
    }else{
      body+='<p class="xnote" style="margin:0" id="wiz-none">No setup suggestions have arrived yet. Run semester setup on your Mac. It sends the courses and deadlines here, and they will appear in this step. Or add the courses by hand now.</p>';
    }
    body+='<div><div class="lbl" style="margin-bottom:6px">Courses in '+esc(sm.name||'this semester')+'</div>'+(cs.length?cs.map(c=>'<div class="lookrow"><b>'+esc(c.name)+'</b></div>').join(''):'<div class="empty">No courses yet.</div>')+
      '<form data-xform="semcadd" class="row wrap" style="margin-top:8px"><input type="text" name="name" placeholder="Course name" required style="flex:2;min-width:160px"><input type="text" name="short" placeholder="Short name" style="flex:1;min-width:100px"><button class="btn sm pri" type="submit">Add course</button></form></div>'+
      (L.length?'':'<div class="row"><button class="btn pri" data-x="wizstep" data-v="3">Continue</button></div>');
  }else{
    const t=todayStr(),cs=sm.courses||[],as=acadList().filter(a=>a.d).sort((a,b)=>a.d<b.d?-1:1),nx=as.find(a=>!a.done&&diff(a.d,t)>=0&&(a.k==='Exam'||a.k==='Test'));
    body='<div id="wiz-sum"><div class="lbl" style="margin-bottom:6px">Courses ('+cs.length+')</div>'+(cs.length?cs.map(c=>'<div class="lookrow"><b>'+esc(c.name)+'</b></div>').join(''):'<div class="empty">None yet. Add them in Semester setup.</div>')+
      '<div class="lbl" style="margin:var(--s3) 0 6px">Assessments by date ('+as.length+')</div>'+(as.length?'<div class="list">'+as.map(a=>'<div class="li"><div class="m"><b>'+esc(a.t)+'</b><span>'+esc(COURSES[a.c]||'')+' · '+esc(a.k)+' · '+dlabel(a.d)+'</span></div></div>').join('')+'</div>':'<div class="empty">None yet.</div>')+
      '<div class="lbl" style="margin:var(--s3) 0 6px">Next exam</div>'+(nx?'<div class="li"><div class="m"><b>'+esc(nx.t)+'</b><span>'+dlabel(nx.d)+' · in '+diff(nx.d,t)+' day'+(diff(nx.d,t)===1?'':'s')+'</span></div></div>':'<div class="empty">No exam date set yet.</div>')+'</div>'+
      '<div class="row"><button class="btn pri" data-x="wizdone">Done</button><button class="btn" data-x="wizstep" data-v="2">Back</button></div>';
  }
  sheet('<h2>Start new semester</h2>'+dots+'<div class="stack">'+body+'</div>');
}
function wizAll(){
  const list=wizItems(),done=[],undos=[];let bad=0;
  list.forEach(x=>{const r=propDo(x.it);if(r.ok){done.push(x);undos.push(r.undo)}else bad++});
  if(!done.length)return toast(bad?'Nothing could be approved. Fix the items from the Nightly review card.':'Nothing to approve');
  propGroup(done,()=>({status:'approved'}));
  toast('Approved '+done.length+(bad?'. '+bad+' need a look.':''),{undo:()=>{undos.slice().reverse().forEach(f=>{try{f()}catch(e){}});propGroup(done,()=>null);if(XS.wiz)wizSheet(XS.wiz)}});
  wizSheet(2);
}
/* ---------- agent status ---------- */
const AGENTS=[
  {key:'nightly',name:'Wispr logger',what:'Reads your Wispr notes twice a day, saves the clear items and leaves questions on Today. Runs about 2 PM and 12:30 AM.',hrs:36},
  {key:'backup',name:'Daily backup',what:'Saves a copy of all your records. Runs about 4:30 AM.',hrs:36},
  {key:'calendar',name:'Calendar feed',what:'Publishes your dates to the calendar link when they change.',hrs:0},
  {key:'health',name:'Health check',what:'Checks sync, backups and the other agents.',hrs:36,meta:'agent-health'},
  {key:'sunday',name:'Sunday review prep',what:'Prepares your weekly review.',hrs:240,meta:'agent-sunday'},
  {key:'monthend',name:'Month-end report',what:'Writes the month-end summary.',hrs:840,meta:'agent-monthend'},
  {key:'cfa',name:'CFA coach',what:'Plans and checks your CFA study.',hrs:240,meta:'agent-cfa'},
  {key:'journal',name:'Journal scout',what:'Looks for journal and writing opportunities.',hrs:840,meta:'agent-journal'},
  {key:'scribe',name:'Semester Scribe',what:'Turns lectures into notes and Revise items. Runs at 9:30 PM.',hrs:36,meta:'agent-scribe'}
];
function agentRows(now){
  now=now||Date.now();
  return AGENTS.map(a=>{
    let at=0,ok=true,summary='',detail='';
    if(a.key==='nightly'){const NR=XS.props.filter(p=>wlIsAuto(p)||/^\d{4}-\d{2}-\d{2}/.test(p.id||''));const t=Math.max(0,...NR.map(p=>+p.at||0));at=t;
      if(t){const reg=wlReg();let sv=0,nd=0;NR.filter(p=>+p.at===t).forEach(p=>(p.items||[]).forEach((it,i)=>{
        if(wlIsAuto(p)){const r=it&&reg[wlKey(wlSrc(p,it,i))];if(r&&!r.skipped)sv++;else if(!r)nd++}else if(!it.status)nd++}));
        summary=sv+' saved, '+nd+' need you'}}
    else if(a.key==='backup'){const m=LD.get('meta','backup');if(m){at=+m.at||0;summary=[m.file,m.records!=null?m.records+' records':''].filter(Boolean).join(' · ');detail=summary}}
    else if(a.key==='calendar'){const m=LD.get('meta','calendar');if(m){at=+m.at||0;summary='Feed published'}}
    else{const m=LD.get('meta',a.meta);if(m){at=+m.at||0;ok=m.ok!==false;summary=String(m.summary||'');detail=String(m.detail||'')}}
    let st='none';
    if(at)st=ok&&(!a.hrs||now-at<=a.hrs*36e5)?'ok':'bad';
    return {...a,at,ok,summary,detail,st};
  });
}
function agoText(at,now){
  now=now||Date.now();const m=Math.floor((now-at)/6e4);if(m<1)return 'just now';if(m<60)return m+' min ago';
  const dk=t=>new Date(t).toLocaleDateString('en-CA',{timeZone:'Asia/Kolkata'}),tm=new Date(at).toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit',timeZone:'Asia/Kolkata'});
  if(dk(at)===dk(now))return Math.floor(m/60)+' h ago';
  if(dk(at)===dk(now-864e5))return 'yesterday '+tm;
  return new Date(at).toLocaleDateString('en-GB',{day:'numeric',month:'short',timeZone:'Asia/Kolkata'})+', '+tm;
}
function agentProblem(){try{return agentRows().some(r=>r.st==='bad')}catch(e){return false}}
function agentDot(){const b=xq('[data-act=settings]');if(!b)return;const on=agentProblem();b.classList.toggle('agdot',on);b.setAttribute('aria-label',on?'Menu and settings. An agent has a problem.':'Menu and settings')}
function agentSheet(){
  const now=Date.now(),open=XS.agentOpen||'';
  sheet('<h2>Agent status<small>what ran, and whether it worked</small></h2><div class="list ag-list">'+agentRows(now).map(r=>{
    const lab=({ok:'Worked',bad:'Problem',none:'Never run'})[r.st];
    return '<div class="li ag-li" data-agent="'+r.key+'"><button class="ag-row" data-x="agentrow" data-k="'+r.key+'" aria-expanded="'+(open===r.key)+'"><span class="m"><b>'+esc(r.name)+'</b><span>'+esc(r.what)+'</span>'+(r.summary?'<span class="ag-sum">'+esc(r.summary)+'</span>':'')+'<span class="ag-when">'+(r.at?esc(agoText(r.at,now)):'No run recorded')+'</span></span><span class="ag-pill '+r.st+'">'+lab+'</span></button>'+(open===r.key?'<div class="ag-detail">'+esc(r.detail||(r.at?'No more detail was recorded.':'This agent has not written a status yet.'))+'</div>':'')+'</div>'}).join('')+'</div><div class="row"><button class="btn" data-act="sheetclose">Close</button></div>');
}
/* ---------- recomposition: what happens after programme week 9 ---------- */
function cutCard(){
  if(todayStr()<'2027-02-01'||(C().program||{}).after)return '';
  return '<section class="card" id="cutcard" style="margin-top:14px"><h2>Recomposition: continue the cut?<small>The 8 weeks and the maintenance week are done</small></h2><p class="xnote" style="margin:0 0 var(--s3)">Until you choose, targets stay at 2,050 kcal.</p><div class="row wrap"><button class="btn pri" data-x="cutcont">Continue at 2,050 kcal</button><button class="btn" data-x="cutmaint">Stay at maintenance</button></div></section>';
}

/* ---------- career follow-ups and renewals: used by reminders and the Coming up card ---------- */
function xNextOcc(d,t){let y=+d.slice(0,4),o=d,g=0;while(o<t&&g++<60){y++;o=y+d.slice(4)}return o}
/* internships: optional start and end dates on a pipeline row (feed the calendar) */
if(!LM.pipe.f.some(f=>f[0]==='start')){const ni=LM.pipe.f.findIndex(f=>f[0]==='note');LM.pipe.f.splice(ni<0?LM.pipe.f.length:ni,0,['start','Internship starts','date'],['end','Internship ends','date'])}
function xFollowups(t,from,to){
  const out=[],inW=d=>{const n=diff(d,t);return n>=from&&n<=to};
  /* a renewal's stored date may be last year's: use its next occurrence, like renewSoon */
  (C().L_renew||[]).forEach(x=>{if(!x.date)return;const d=xNextOcc(x.date,t);if(inW(d))out.push({id:'renew-'+x.id,d,t:x.name+' renews',c:x.amount?inr(+x.amount):''})});
  (C().L_pipe||[]).forEach(x=>{if(x.next&&x.stage!=='Closed'&&inW(x.next))out.push({id:'fu-'+x.id,d:x.next,t:'Follow up with '+x.firm,c:x.role||''})});
  return out;
}
const _comingCard=comingCard;
comingCard=function(){
  const t=todayStr(),fu=xFollowups(t,-30,30).sort((a,b)=>a.d<b.d?-1:1).slice(0,5);
  const ct=LL('contacts').filter(r=>r.name&&(!r.last||diff(t,r.last)>45)).slice(0,3);
  const html=_comingCard();if(!fu.length&&!ct.length)return html;
  const row=x=>{const n=diff(x.d,t);return '<div class="li"><div class="m"><b>'+esc(x.t)+'</b><span>'+(x.c?esc(x.c)+' · ':'')+dlabel(x.d)+'</span></div><span class="days'+(n<=1?' now':n<=4?' soon':'')+'">'+(n<0?'Overdue':n===0?'Today':n+' d')+'</span></div>'};
  const add='<div class="sep"></div><div class="lbl" style="margin-bottom:6px">Follow-ups</div><div class="list">'+fu.map(row).join('')+
    ct.map(r=>'<div class="li"><div class="m"><b>Get back to '+esc(r.name)+'</b><span>'+(r.last?'last in touch '+dlabel(r.last):'not in touch yet')+'</span></div><button class="btn sm ghost" data-act="ltouch" data-id="'+esc(r.id)+'">Done</button></div>').join('')+'</div>';
  const i=html.lastIndexOf('</section>');return html.slice(0,i)+add+html.slice(i);
};

/* ---------- focus timer: log to a course or to other academics ---------- */
focusCard=function(){
  const f=state.focus;
  if(f){const left=Math.max(0,Math.ceil((f.end-Date.now())/1000));return '<section class="card hero"><div class="lbl">Focus session'+(f.course&&COURSES[f.course]?' · '+esc(COURSES[f.course]):'')+'</div><div class="big mono" id="focusclock" style="margin:8px 0">'+pad(Math.floor(left/60))+':'+pad(left%60)+'</div><div class="row"><button class="btn" data-act="focusstop">Stop and log time so far</button></div></section>'}
  if(state.focusCourse&&!COURSES[state.focusCourse])state.focusCourse='';
  const cur=state.focusCourse||'';
  return '<section class="card"><h2>Focus timer<small>logs to '+esc(cur?COURSES[cur]:'other academics')+'</small></h2>'+
   '<label class="fld"><span>Log the time to</span><select data-xchange="fcourse"><option value="">Other academics</option>'+Object.keys(COURSES).map(k=>'<option value="'+esc(k)+'"'+(k===cur?' selected':'')+'>'+esc(COURSES[k])+'</option>').join('')+'</select></label>'+
   '<div class="row" style="margin-top:10px"><button class="btn pri" data-act="focusgo" data-m="25">25 min</button><button class="btn" data-act="focusgo" data-m="50">50 min</button></div></section>';
};
focusEnd=function(manual){
  const f=state.focus;if(!f)return;clearInterval(state.focusT);state.focus=null;
  const mins=manual?Math.floor((Date.now()-f.start)/60000):f.min;
  if(mins>0){
    const d=f.date||todayStr(),dd=day(d),c=f.course||'',patch={studyMin:(+dd.studyMin||0)+mins};
    if(c)patch.courseMin={[c]:(+((dd.courseMin||{})[c])||0)+mins};
    dbSetDay(d,patch);toast(mins+' min logged to '+(c?(COURSES[c]||c):'study'));
  }else toast('Stopped, under a minute so nothing logged');
  if(!manual){try{navigator.vibrate&&navigator.vibrate([200,100,200])}catch(e){}}
  render();
};

/* ---------- private habits stay private in the month report and the export ---------- */
const HSHORT={wake:'Wake',mobility:'Mobility',creatine:'Creatine',gym:'Gym',cfa:'CFA',study:'Other academics',water:'Water',protein:'Protein',alcohol:'No alcohol',clean:'No porn or masturbation',bed:'In bed by'};
function privLabels(short){
  if(!state.privacy)return [];
  const items=habits(todayStr()).items,L=[];
  Object.keys(privMap()).filter(masked).forEach(k=>{const it=items.find(i=>i.k===k);if(it&&it.label)L.push(it.label);if(short&&HSHORT[k])L.push(HSHORT[k])});
  return [...new Set(L)].sort((a,b)=>b.length-a.length);
}
const privMask=(s,L)=>L.reduce((o,l)=>o.replace(new RegExp('(?<![A-Za-z])'+l.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'(?![A-Za-z])','gi'),'Private habit'),String(s));
const _monthMd=monthMd;
monthMd=function(ym){const L=privLabels(true);return L.length?privMask(_monthMd(ym),L):_monthMd(ym)};
exportPayload=function(){
  const out=LD.exportAll(),L=privLabels(false);
  /* the data stays whole (habit keys are data); only text the app generated, such as the reminder schedule, is masked */
  if(L.length&&out.records&&out.records.meta){
    const walk=v=>typeof v==='string'?privMask(v,L):Array.isArray(v)?v.map(walk):v&&typeof v==='object'?Object.fromEntries(Object.entries(v).map(([k,x])=>[k,walk(x)])):v;
    const r=out.records.meta.reminders;
    if(r&&r.s&&Array.isArray(r.s.items))r.s.items=r.s.items.map(it=>it.habit&&masked(it.habit)?{...it,title:'Private habit',body:''}:it);
    out.records.meta=walk(out.records.meta);
  }
  return out;
};

/* ---------- undo for edits and habit unticks, same toast as adds ---------- */
XS.edits=[];XS.editAt=0;
const _updateEntry=updateEntry;
updateEntry=function(id,patch){
  const e=state.entries.find(x=>x.id===id);
  if(e&&!XS.undoing){
    const prev={};Object.keys(patch||{}).forEach(k=>{prev[k]=e[k]});
    if(Date.now()-XS.editAt>1500)XS.edits=[];XS.edits.push({id,prev});XS.editAt=Date.now();
    setTimeout(()=>{if(XS.edits.length&&Date.now()-XS.editAt<1500)toast('Updated')},0);
  }
  return _updateEntry(id,patch);
};
function undoEdits(list){XS.undoing=true;try{list.slice().reverse().forEach(x=>_updateEntry(x.id,x.prev))}finally{XS.undoing=false}}
const _toast=toast;
toast=function(t,opt){
  opt=opt||{};
  if(!opt.undo&&!opt.noUndo&&XS.edits.length&&Date.now()-XS.editAt<1500){
    const ed=XS.edits.slice(),ids=(_added.length&&Date.now()-_addedAt<1500)?_added.slice():[];
    opt={...opt,undo:()=>{undoEdits(ed);ids.forEach(id=>{if(state.entries.some(e=>e.id===id))delEntry(id)})}};
  }
  XS.edits=[];return _toast(t,opt);
};
const _setHabit=setHabit;
setHabit=function(key,val){
  const d=state.date,was=!!(day(d).habits||{})[key];
  _setHabit(key,val);
  if(was&&!val)toast('Unticked',{undo:()=>dbSetDay(d,{habits:{[key]:true}})});
};

/* ---------- first-run card: where things stand until the cloud is connected ---------- */
function setupCard(){
  if(LD.kvGet('setupHide'))return '';
  const st=LD.status(),standalone=matchMedia('(display-mode: standalone)').matches||navigator.standalone;
  const steps=[];
  if(!Object.keys(state.days).length&&!state.entries.length)steps.push(['Import your data','Menu → Data and backup → Import a backup file']);
  if(!standalone)steps.push(['Install the app','Menu → Install on this device']);
  if(st.mode==='local')steps.push(['Connect cloud sync','Tap the status pill at the top']);
  if(!steps.length)return '';
  return '<section class="card flat" style="margin-top:14px"><h2>Finish setting up<small><button class="btn sm ghost" data-x="setuphide">Hide</button></small></h2><div class="list">'+steps.map(s=>'<div class="li"><div class="m"><b>'+s[0]+'</b><span>'+s[1]+'</span></div></div>').join('')+'</div></section>';
}

/* ---------- reminders ---------- */
const REM_DEF={on:true,items:{mob:{on:true,time:'08:05'},creatine:{on:true,time:'17:00'},gym:{on:true,time:'17:15'},bed:{on:true,time:'00:30'}},
  water:{on:true,start:'10:00',end:'00:00',every:120,onlyBehind:true},protein:{on:true,time:'21:30'},deadlines:{on:true,eve:'20:00',morn:'09:00'}};
/* prog=true gives the 8-week programme's reminder times (own edits live at cfg.program.rem, never cfg.rem); omitted = whichever applies today */
const remProg=()=>!!(window.PROGRAM&&PROGRAM.on(todayStr()));
function remCfg(prog){
  const r=C().rem||{},b={...REM_DEF,...r,items:{...REM_DEF.items,...(r.items||{})},water:{...REM_DEF.water,...(r.water||{})},protein:{...REM_DEF.protein,...(r.protein||{})},deadlines:{...REM_DEF.deadlines,...(r.deadlines||{})}};
  if(prog==null)prog=remProg();
  if(!prog||!window.PROGRAM)return b;
  const o=PROGRAM.remDefaults,q=(C().program||{}).rem||{},it={};
  Object.keys(b.items).forEach(k=>{it[k]={...b.items[k],...((o.items||{})[k]||{}),...((q.items||{})[k]||{})}});
  return {...b,on:q.on!=null?q.on:b.on,items:it,water:{...b.water,...o.water,...(q.water||{})},protein:{...b.protein,...o.protein,...(q.protein||{})},deadlines:{...b.deadlines,...(q.deadlines||{})}};
}
/* the published schedule carries both: the current one, and next={from} for the programme, so the phone switches on 30 Nov even if the app is not opened */
function remSchedule(){
  if(!window.PROGRAM)return remBuild(false);
  const s=remBuild(false),n=remBuild(true);
  s.next={from:PROGRAM.start,on:n.on,items:n.items,water:n.water,protein:n.protein,deadlines:n.deadlines,gymByDow:n.gymByDow};
  return s;
}
function remBuild(prog){return window.PROGRAM?PROGRAM.withMode(prog,()=>remBuild1(prog)):remBuild1(false)}
function remBuild1(prog){
  const r=remCfg(prog),cfg=C(),T=cfg.targets,t=RemCore.nowIn('Asia/Kolkata').ymd;
  const gymByDow={};DOW.forEach(k=>gymByDow[k]=PLAN[k].name);
  const dl=acadList().filter(a=>a.d&&!a.done&&diff(a.d,t)>=0&&diff(a.d,t)<=60).map(a=>({id:a.id,d:a.d,t:a.t,c:COURSES[a.c]||''}));
  xFollowups(t,0,60).forEach(x=>dl.push({id:x.id,d:x.d,t:x.t,c:x.c}));
  return {on:!!r.on,tz:'Asia/Kolkata',dayEnd:cfg.dayEnd,gymByDow,
    items:[{k:'mob',title:'Morning mobility',body:'2.5 to 5 minutes, right after waking.',habit:'mobility',...r.items.mob},
      {k:'creatine',title:'Creatine '+T.creatineG+' g',body:'Take it now, then tick it.',habit:'creatine',...r.items.creatine},
      {k:'gym',title:'Gym',body:'About an hour. Log your sets as you go.',habit:'gym',...r.items.gym},
      {k:'bed',title:'Bedtime',body:'In bed by '+cfg.bed+'. Tap “In bed now” as you go.',...r.items.bed}],
    water:{...r.water,target:T.waterMl},protein:{...r.protein,target:T.protein},deadlines:{...r.deadlines,list:dl}};
}
let remLast='';
function remPublish(){
  if(!LD.ready||!state.seen.config)return;
  const s=remSchedule(),sig=JSON.stringify(s);if(sig===remLast)return;remLast=sig;
  /* the cloud stores JSON with its keys reordered, so compare in a fixed key order (as calPublish does) */
  const cur=LD.get('meta','reminders');if(cur&&calSig(cur.s)===calSig(s))return;
  LD.write('meta','reminders',{s,at:Date.now()});
}
const remDay=d=>{const dd=day(d),tt=totals(d);return {water:tt.water,protein:tt.p,habits:dd.habits||{}}};
async function remTick(){
  if(!('Notification' in window)||Notification.permission!=='granted'||document.hidden)return;
  const s=remSchedule(),due=RemCore.due(s,{...RemCore.nowIn(s.tz),win:2},remDay);if(!due.length)return;
  let sent={};try{sent=JSON.parse(localStorage.getItem('ld.rem.sent')||'{}')}catch(e){}
  const reg=await navigator.serviceWorker.getRegistration();
  for(const n of due){if(sent[n.key])continue;sent[n.key]=Date.now();
    try{if(reg)await reg.showNotification(n.title,{body:n.body,tag:n.tag,icon:'icons/icon-192.png',badge:'icons/badge.png'});else new Notification(n.title,{body:n.body,tag:n.tag})}catch(e){}}
  const cut=Date.now()-3*864e5;Object.keys(sent).forEach(k=>{if(sent[k]<cut)delete sent[k]});
  try{localStorage.setItem('ld.rem.sent',JSON.stringify(sent))}catch(e){}
}
setInterval(remTick,45000);
const b64u=s=>{const p='='.repeat((4-s.length%4)%4),b=atob((s+p).replace(/-/g,'+').replace(/_/g,'/'));return Uint8Array.from(b,c=>c.charCodeAt(0))};
async function pushEnable(){
  if(!('Notification' in window)||!('serviceWorker' in navigator))return 'This browser cannot show notifications. On iPhone, install the app to the home screen first, then try again from the installed app.';
  const perm=await Notification.requestPermission();if(perm!=='granted')return 'Notifications are blocked for this app. Allow them in your device settings and try again.';
  const reg=await navigator.serviceWorker.ready;
  const c=LD.cloud();if(!c||!c.refresh)return 'ok-local';
  if(!('PushManager' in window))return 'ok-local';
  try{
    const r=await fetch(c.url.replace(/\/+$/,'')+'/functions/v1/remind',{headers:{apikey:c.key}});
    const j=await r.json();if(!j.publicKey)throw new Error('The reminder function is not set up yet');
    const sub=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:b64u(j.publicKey)});
    const sj=sub.toJSON();
    await LD.api('/rest/v1/rpc/save_push_sub',{endpoint:sj.endpoint,p256dh:sj.keys.p256dh,auth:sj.keys.auth,label:navigator.userAgent.slice(0,80)});
    LD.kvSet('pushOn',true);return 'ok-push';
  }catch(e){return 'Notifications are allowed, but push could not be registered: '+String(e.message||e)}
}
function remSheet(msg){
  const r=remCfg(),prog=remProg(),perm=('Notification' in window)?Notification.permission:'unsupported',push=!!LD.kvGet('pushOn');
  const tm=(n,v,l)=>'<label class="fld"><span>'+l+'</span><input type="time" name="'+n+'" value="'+esc(v)+'"></label>';
  const ck=(n,v,l)=>'<label class="chip"><input type="checkbox" name="'+n+'"'+(v?' checked':'')+'>'+l+'</label>';
  const state1=perm==='granted'?(push?'Push is on for this device: reminders arrive even when the app is closed.':'Allowed on this device. Reminders show while the app is open; connect the cloud and tap the button again for push when it is closed.'):perm==='denied'?'Blocked in your device settings.':perm==='unsupported'?'Not available in this browser. On iPhone, install the app to the home screen first.':'Not turned on yet for this device.';
  sheet('<h2>Reminders</h2><p class="muted" style="font-size:13px">'+state1+'</p>'+(prog?'<p class="faint" style="font-size:12px;margin:0 0 8px">These are your programme times. Your earlier reminder times are kept.</p>':'')+(msg?'<p style="font-size:13px;color:var(--warn)">'+esc(msg)+'</p>':'')+
   '<div class="row wrap" style="margin-bottom:12px"><button class="btn pri" data-x="pushon">'+(perm==='granted'?'Refresh this device':'Turn on for this device')+'</button><button class="btn" data-x="pushtest">Send a test</button></div>'+
   '<form data-xform="rem" class="stack">'+ck('on',r.on,'Reminders on')+
   '<div class="fgrid">'+ck('mob',r.items.mob.on,'Mobility')+tm('mobT',r.items.mob.time,'Mobility at')+ck('creatine',r.items.creatine.on,'Creatine')+tm('creatineT',r.items.creatine.time,'Creatine at')+ck('gym',r.items.gym.on,'Gym')+tm('gymT',r.items.gym.time,'Gym at')+ck('protein',r.protein.on,'Protein check')+tm('proteinT',r.protein.time,'Protein check at')+ck('bed',r.items.bed.on,'Bedtime')+tm('bedT',r.items.bed.time,'Bedtime at')+'</div>'+
   '<div class="fgrid">'+ck('water',r.water.on,'Water')+tm('waterS',r.water.start,'Water from')+tm('waterE',r.water.end,'Water until')+'<label class="fld"><span>Every (minutes)</span><input type="number" name="waterEv" min="30" max="360" step="15" value="'+r.water.every+'"></label>'+ck('waterB',r.water.onlyBehind,'Only when behind pace')+'</div>'+
   '<div class="fgrid">'+ck('dl',r.deadlines.on,'Deadlines, renewals and follow-ups')+tm('dlE',r.deadlines.eve,'Evening before at')+tm('dlM',r.deadlines.morn,'On the day at')+'</div>'+
   '<p class="faint" style="font-size:12px;margin:0">Habit reminders are skipped once the habit is ticked. Gym reminders skip rest days.</p>'+
   '<div class="row"><button class="btn pri" type="submit">Save</button><button class="btn" type="button" data-act="sheetclose">Close</button></div></form>');
}

/* ---------- appearance extras: imagery strength, accent, your own photos, motion mix ---------- */
LOOK_DEF.motion='mix';LOOK_DEF.strength=2;LOOK_DEF.accent='sage';
if(!localStorage.getItem(LOOK_KEY))LOOK={...LOOK_DEF,order:[],hidden:[]};
const ACCENTS={sage:['#9db39a','#b9cab6','157,179,154','#0f1410'],champagne:['#c9a86a','#dcc28a','201,168,106','#17120a'],brass:['#b08d57','#c7a674','176,141,87','#15100a'],emerald:['#6fae8a','#8fc4a5','111,174,138','#0b1410'],stone:['#b3ab9b','#cdc6b8','179,171,155','#141311']};
const WALLOP=()=>[.34,.5,.68,.84,1][clamp((+LOOK.strength||2),1,5)-1];
function lookApply(){
  const a=ACCENTS[LOOK.accent]||ACCENTS.sage,r=document.documentElement.style;
  r.setProperty('--accent',a[0]);r.setProperty('--accent2',a[1]);r.setProperty('--accent-rgb',a[2]);r.setProperty('--accent-ink',a[3]);r.setProperty('--glow','rgba('+a[2]+',.12)');
  r.setProperty('--wallop',WALLOP());
}
const SECS=[['coast','Today'],['gym','Train'],['table','Fuel'],['arch','Money'],['study','Study'],['ridge','Career and Progress']];
function lookExtra(){
  return '<div><div class="lbl" style="margin-bottom:6px">Imagery strength</div><input type="range" min="1" max="5" step="1" value="'+(+LOOK.strength||2)+'" data-xchange="strength" aria-label="Imagery strength" style="width:100%"><div class="row sp faint" style="font-size:12px"><span>Subtle</span><span>Bold</span></div></div>'+
   '<div><div class="lbl" style="margin-bottom:6px">Accent</div><div class="chips">'+Object.keys(ACCENTS).map(k=>'<button class="chip" data-x="accent" data-v="'+k+'" aria-pressed="'+((LOOK.accent||'sage')===k)+'"><i class="cdot" style="background:'+ACCENTS[k][0]+'"></i>'+k.charAt(0).toUpperCase()+k.slice(1)+'</button>').join('')+'</div></div>'+
   '<div><div class="lbl" style="margin-bottom:6px">Your own photos</div><p class="faint" style="font-size:12px;margin:0 0 8px">Replace any section’s painted scene with a photo of yours. Photos stay on this device.</p>'+SECS.map(([k,l])=>'<div class="lookrow"><b>'+l+(XS.heroImg[k]?' <span class="faint">· your photo</span>':'')+'</b>'+(XS.heroImg[k]?'<button class="btn sm ghost" data-x="herodel" data-k="'+k+'">Use painted scene</button>':'')+'<label class="btn sm" for="hero-'+k+'">Choose photo</label><input type="file" id="hero-'+k+'" accept="image/*" data-xchange="hero" data-k="'+k+'" style="display:none"></div>').join('')+'</div>';
}
const _wallPrep=wallPrep;
wallPrep=function(name){
  const im=XS.heroImg[name];
  if(im&&im.complete&&im.naturalWidth){
    const c=mkc(SW,SH),g=c.getContext('2d'),s=Math.max(SW/im.naturalWidth,SH/im.naturalHeight),w=im.naturalWidth*s,h=im.naturalHeight*s;
    g.drawImage(im,(SW-w)/2,(SH-h)/2,w,h);g.fillStyle='rgba(12,12,13,.28)';g.fillRect(0,0,SW,SH);
    return {base:c,dyn:null,data:null,paint:null};
  }
  return _wallPrep(name);
};
function heroLoad(){
  SECS.forEach(([k])=>{const u=LD.kvGet('hero:'+k);if(!u){delete XS.heroImg[k];return}const im=new Image();im.onload=()=>{WALL.name='';try{wallApply()}catch(e){}};im.src=u;XS.heroImg[k]=im});
}
async function heroSet(k,file){
  try{
    const bm=await createImageBitmap(file,{imageOrientation:'from-image'}),sc=Math.min(1,1600/Math.max(bm.width,bm.height));
    const cv=mkc(Math.round(bm.width*sc),Math.round(bm.height*sc));cv.getContext('2d').drawImage(bm,0,0,cv.width,cv.height);
    LD.kvSet('hero:'+k,cv.toDataURL('image/jpeg',.82));heroLoad();appearanceSheet();toast('Photo set',{noUndo:true});
  }catch(e){toast('Could not read that image')}
}

/* ---------- install help and service worker ---------- */
let deferredInstall=null;
addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredInstall=e});
function installSheet(){
  const ios=/iphone|ipad|ipod/i.test(navigator.userAgent),standalone=matchMedia('(display-mode: standalone)').matches||navigator.standalone;
  sheet('<h2>Install on this device</h2>'+(standalone?'<p class="muted">The app is installed and running from your home screen.</p>':
   ios?'<ol class="xol"><li>Open this page in <b>Safari</b>.</li><li>Tap the <b>Share</b> button at the bottom.</li><li>Choose <b>Add to Home Screen</b>, then <b>Add</b>.</li><li>Open the app from the new icon, then turn on reminders from the menu.</li></ol>':
   '<ol class="xol"><li>In Chrome or Edge, click the <b>install icon</b> at the right of the address bar, or use the button below.</li><li>Confirm <b>Install</b>. The app opens in its own window.</li></ol>'+(deferredInstall?'<button class="btn pri" data-x="doinstall">Install now</button>':''))+
   '<div class="row" style="margin-top:14px"><button class="btn" data-act="sheetclose">Close</button></div>');
}
if('serviceWorker' in navigator&&location.protocol!=='file:'){
  navigator.serviceWorker.register('sw.js').catch(e=>console.warn('Service worker not registered',e));
  let had=!!navigator.serviceWorker.controller;
  navigator.serviceWorker.addEventListener('controllerchange',()=>{if(had)toast('Updated to the latest version. Reopen the app to use it.',{noUndo:true});had=true});
}

/* ---------- calendar feed: a private link Apple or Google Calendar subscribes to ---------- */
const calYmd=d=>/^\d{4}-\d{2}-\d{2}$/.test(d||'');
function calItems(){
  const out=[],add=(id,d,t,x,cat,more)=>{if(calYmd(d)&&t)out.push({id,d,t:String(t),...(x?{x:String(x)}:{}),cat,...(more||{})})};
  acadList().forEach(a=>add('acad-'+a.id,a.d,a.t,[COURSES[a.c],a.k].filter(Boolean).join(' · '),'Study',a.done?{done:true}:null));
  MILESTONES.forEach(m=>add('mile-'+m.d+'-'+slug(m.t||'').slice(0,24),m.d,m.t,'Semester','Semester'));
  LL('pipe').forEach(r=>{
    if(r.next&&r.stage!=='Closed')add('fu-'+r.id,r.next,'Follow up with '+r.firm,r.role,'Career');
    add('intern-start-'+r.id,r.start,'Internship starts: '+r.firm,r.role,'Career');
    add('intern-end-'+r.id,r.end,'Internship ends: '+r.firm,r.role,'Career');
  });
  LL('pubs').forEach(r=>add('pub-'+r.id,r.due,'Due: '+r.title,[r.venue,r.stage].filter(Boolean).join(' · '),'Writing',r.stage==='Published'?{done:true}:null));
  LL('renew').forEach(r=>add('renew-'+r.id,r.date,r.name+' renews',[r.amount?'₹'+Math.round(+r.amount).toLocaleString('en-IN'):'',r.note].filter(Boolean).join(' · '),'Renewals',{every:'year'}));
  LL('contacts').forEach(r=>{const b=String(r.birthday||'').trim();if(r.name&&/^\d{2}-\d{2}$/.test(b))add('bday-'+r.id,todayStr().slice(0,4)+'-'+b,r.name+'’s birthday',r.firm,'People',{every:'year'})});
  return out.sort((a,b)=>a.d<b.d?-1:a.d>b.d?1:a.id<b.id?-1:1);
}
const calNewToken=()=>{const b=crypto.getRandomValues(new Uint8Array(18));return btoa(String.fromCharCode(...b)).replace(/\+/g,'-').replace(/\//g,'_')};
let calLast='';
const calSig=v=>JSON.stringify(v,(k,x)=>x&&typeof x==='object'&&!Array.isArray(x)?Object.keys(x).sort().reduce((o,j)=>(o[j]=x[j],o),{}):x);
function calPublish(){
  if(!LD.ready||!state.seen.config)return;
  const token=C().calToken;if(!token)return;
  const items=calItems(),sig=token+JSON.stringify(items);if(sig===calLast)return;calLast=sig;
  /* the cloud stores JSON with its keys reordered, so compare in a fixed key order */
  const cur=LD.get('meta','calendar');if(cur&&cur.token===token&&calSig(cur.items)===calSig(items))return;
  LD.write('meta','calendar',{token,items,at:Date.now()});
}
const calUrl=()=>{const c=LD.cloud();return c&&c.url&&C().calToken?c.url.replace(/\/+$/,'')+'/functions/v1/remind?cal='+C().calToken:''};
function calSheet(msg){
  const st=LD.status(),on=st.mode!=='local';
  const intro='<p class="muted" style="font-size:13px">Your deadlines, exams, follow-ups, internship dates, renewals and birthdays appear in your phone’s calendar app and update by themselves. The link is private: anyone who has it can see these dates, so share it with no one.</p>';
  if(!on){sheet('<h2>Calendar feed</h2>'+intro+'<p style="font-size:13px;color:var(--warn)">Connect the cloud first: Menu &gt; Cloud sync.</p><div class="row"><button class="btn pri" data-x="cloud">Cloud sync</button><button class="btn" data-act="sheetclose">Close</button></div>');return}
  /* the link is made once, only after a full sync, so a second device never replaces it before it has seen it */
  if(!C().calToken){
    if(st.mode!=='synced'||!st.last){sheet('<h2>Calendar feed</h2>'+intro+'<p style="font-size:13px;color:var(--warn)">Syncing first. Open this again in a moment.</p><button class="btn" data-act="sheetclose">Close</button>');LD.sync();return}
    saveCfg({calToken:calNewToken()});calPublish();
  }
  const url=calUrl();
  sheet('<h2>Calendar feed</h2>'+intro+(msg?'<p style="font-size:13px;color:var(--good)">'+esc(msg)+'</p>':'')+
   '<label class="fld"><span>Your private calendar link</span><input type="text" readonly id="calurl" value="'+esc(url)+'" aria-label="Calendar link"></label>'+
   '<div class="row wrap" style="margin:10px 0 14px"><button class="btn pri" data-x="calcopy">Copy link</button><button class="btn" data-x="calreset">Reset link</button></div>'+
   '<div class="lbl" style="margin-bottom:6px">iPhone</div><ol class="xol"><li>Tap <b>Copy link</b> above.</li><li>Open <b>Settings → Calendar → Accounts → Add Account → Other → Add Subscribed Calendar</b>.</li><li>Paste the link in <b>Server</b>, tap <b>Next</b>, then <b>Save</b>.</li></ol>'+
   '<div class="lbl" style="margin:10px 0 6px">Google Calendar (on a computer)</div><ol class="xol"><li>Tap <b>Copy link</b> above.</li><li>In Google Calendar, next to <b>Other calendars</b> click <b>+</b>, then <b>From URL</b>.</li><li>Paste the link and click <b>Add calendar</b>.</li></ol>'+
   '<p class="faint" style="font-size:12px">Calendar apps check for changes every few hours. <b>Reset link</b> makes a new link and stops the old one working; you then subscribe again with the new link.</p>'+
   '<button class="btn" data-act="sheetclose">Close</button>');
}

/* ---------- menu additions ---------- */
function xMenu(){
  return '<button class="btn" data-x="rem">Reminders</button><button class="btn" data-x="cloud">Cloud sync</button><button class="btn" data-x="sem">Semester setup</button><button class="btn" data-x="calfeed">Calendar feed</button><button class="btn" data-x="install">Install on this device</button>';
}

/* ---------- events ---------- */
document.addEventListener('click',async ev=>{
  const t=ev.target.closest('[data-x]');if(!t)return;const a=t.dataset.x;
  if(a==='cloud'){cloudSheet();return}
  if(a==='rem'){remSheet();return}
  if(a==='sem'){semSheet();return}
  if(a==='semwiz'){XS.wiz=1;wizSheet(1);return}
  if(a==='wizall'){wizAll();return}
  if(a==='wizstep'){wizSheet(+t.dataset.v);return}
  if(a==='wizdone'){XS.wiz=null;closeSheet();return}
  if(a==='install'){installSheet();return}
  if(a==='calfeed'){calSheet();return}
  if(a==='calcopy'){const u=calUrl();try{await navigator.clipboard.writeText(u);toast('Link copied',{noUndo:true})}catch(e){const i=xq('#calurl');if(i){i.select();document.execCommand&&document.execCommand('copy')}toast('Link selected. Copy it from the box.',{noUndo:true})}return}
  if(a==='calreset'){if(!confirm('Make a new link? The old one stops working and you subscribe again with the new one.'))return;saveCfg({calToken:calNewToken()});calPublish();calSheet('New link made. The old one no longer works.');return}
  if(a==='doinstall'){if(deferredInstall){deferredInstall.prompt();deferredInstall=null}closeSheet();return}
  if(a==='syncnow'){await LD.sync();cloudSheet();return}
  if(a==='resync'){LD.kvSet('cursor',0);await LD.sync();cloudSheet();toast('Downloaded again',{noUndo:true});return}
  if(a==='signout'){LD.signOut();cloudSheet();return}
  if(a==='setuphide'){LD.kvSet('setupHide',1);render();return}
  if(a==='propok'){propApply(t.dataset.id,+t.dataset.i);return}
  if(a==='propedit'){propEditSheet(t.dataset.id,+t.dataset.i);return}
  if(a==='propall'){propAll();return}
  if(a==='propnoall'){propNoAll();return}
  if(a==='agents'){XS.agentOpen='';agentSheet();return}
  if(a==='agentrow'){XS.agentOpen=XS.agentOpen===t.dataset.k?'':t.dataset.k;agentSheet();return}
  if(a==='cutcont'||a==='cutmaint'){saveCfg({program:{...(C().program||{}),after:a==='cutcont'?'cut':'maint'}});toast(a==='cutcont'?'Staying at 2,050 kcal':'Targets set to maintenance, 2,500 kcal',{noUndo:true});return}
  if(a==='propno'){propSet(t.dataset.id,+t.dataset.i,'dismissed');return}
  if(a==='accent'){lookSave({accent:t.dataset.v});lookApply();appearanceSheet();return}
  if(a==='herodel'){LD.kvSet('hero:'+t.dataset.k,undefined);heroLoad();WALL.name='';wallApply();appearanceSheet();return}
  if(a==='pushon'){const r=await pushEnable();remSheet(r==='ok-push'||r==='ok-local'?'':r);if(r.startsWith('ok'))toast(r==='ok-push'?'Push is on for this device':'Notifications allowed on this device',{noUndo:true});return}
  if(a==='pushtest'){
    if(!('Notification' in window)||Notification.permission!=='granted'){remSheet('Turn reminders on for this device first.');return}
    const reg=await navigator.serviceWorker.getRegistration();
    try{if(reg)await reg.showNotification('Test reminder',{body:'Reminders are working on this device.',tag:'ld-test',icon:'icons/icon-192.png'});else new Notification('Test reminder',{body:'Reminders are working on this device.'});toast('Test sent',{noUndo:true})}catch(e){remSheet('The test could not be shown: '+e.message)}
    return}
  if(a==='semcdel'){const sm=semNow();semSave({...sm,courses:sm.courses.filter(c=>c.id!==t.dataset.id),items:(sm.items||[]).filter(i=>i.c!==t.dataset.id)});return}
  if(a==='semidel'){const sm=semNow();semSave({...sm,items:(sm.items||[]).filter(i=>i.id!==t.dataset.id)});return}
});
document.addEventListener('change',ev=>{
  const t=ev.target.closest('[data-xchange]');if(!t)return;const k=t.dataset.xchange;
  if(k==='strength'){lookSave({strength:+t.value});lookApply();WALL.name='';wallApply();return}
  if(k==='hero'){const f=t.files&&t.files[0];if(f)heroSet(t.dataset.k,f);return}
  if(k==='fcourse'){state.focusCourse=t.value;render();return}
  if(k==='aion'){LD.kvSet('aiOn',t.checked?1:undefined);toast('Reopen the app to apply',{noUndo:true});return}
});
document.addEventListener('submit',async ev=>{
  const f=ev.target.closest('[data-xform]');if(!f)return;ev.preventDefault();
  const k=f.dataset.xform,fd=new FormData(f),v=n=>String(fd.get(n)||'').trim();
  if(k==='cloud'){
    const b=xq('button[type=submit]',f);b.disabled=true;b.textContent='Connecting…';
    try{await LD.signIn(v('url'),v('key'),v('email'),String(fd.get('password')||''));cloudSheet();toast('Connected',{noUndo:true})}catch(e){cloudSheet('Could not connect: '+String(e.message||e))}
    return}
  if(k==='propedit'){propEditSave(fd);return}
  if(k==='wedit'){wlEditSave(fd);return}
  if(k==='cfaset'){const d=v('date'),h=+v('hours');if(!/^\d{4}-\d{2}-\d{2}$/.test(d)||!(h>=50&&h<=1000))return toast('Enter a valid date and an hours goal between 50 and 1000');saveCfg({cfaDate:d,cfaHours:h});toast('Saved',{noUndo:true});return}
  const sm=semNow();
  if(k==='semname'){if(v('name'))semSave({...sm,name:v('name')});return}
  if(k==='semcadd'){const name=v('name');if(!name)return;let id=slug(name).slice(0,12)||'c';while(sm.courses.some(c=>c.id===id))id+='x';semSave({...sm,courses:[...sm.courses,{id,name,short:v('short')||name}]});return}
  if(k==='semiadd'){const t=v('t');if(!t)return;const d=v('d');semSave({...sm,items:[...(sm.items||[]),{id:v('c')+'-'+uid(),c:v('c'),t,d:d||null,k:v('k'),...(d?{}:{tbc:true})}]});return}
  if(k==='semmiles'){const keep=(sm.miles||[]).filter(m=>!/classes end|exams begin|exams end/i.test(m.t)),add=[];if(v('ce'))add.push({d:v('ce'),t:'Classes end'});if(v('eb'))add.push({d:v('eb'),t:'End-semester exams begin'});if(v('ee'))add.push({d:v('ee'),t:'End-semester exams end'});semSave({...sm,miles:[...keep,...add].sort((a,b)=>a.d<b.d?-1:1)});return}
  if(k==='semnew'){const name=v('name');if(!name)return;if(f.dataset.wiz)XS.wiz=2;const arch=(C().semArchive||[]).concat([{...sm,archivedAt:todayStr()}]);saveCfg({semArchive:arch});semSave({name,courses:[],items:[],miles:[]});toast('New semester started. The old one is archived.',{noUndo:true});return}
  if(k==='rem'){
    const on=n=>fd.get(n)==='on',tm=(n,d)=>/^\d{2}:\d{2}$/.test(v(n))?v(n):d,prog=remProg(),r=remCfg(prog);
    const ev2=clamp(+v('waterEv')||120,30,360);
    const remPatch=x=>prog?{program:{...(C().program||{}),rem:x}}:{rem:x};
    saveCfg(remPatch({on:on('on'),items:{mob:{on:on('mob'),time:tm('mobT',r.items.mob.time)},creatine:{on:on('creatine'),time:tm('creatineT',r.items.creatine.time)},gym:{on:on('gym'),time:tm('gymT',r.items.gym.time)},bed:{on:on('bed'),time:tm('bedT',r.items.bed.time)}},
      water:{on:on('water'),start:tm('waterS',r.water.start),end:tm('waterE',r.water.end),every:ev2,onlyBehind:on('waterB')},protein:{on:on('protein'),time:tm('proteinT',r.protein.time)},deadlines:{on:on('dl'),eve:tm('dlE',r.deadlines.eve),morn:tm('dlM',r.deadlines.morn)}}));
    closeSheet();toast('Reminders saved',{noUndo:true});return}
});

LD.opened.then(()=>{heroLoad();lookApply();setSync()});
lookApply();

/* ---------- plain-text logging without AI: splits, who owes what, account phrases ---------- */
const _localParse=localParse;
localParse=function(q){
  let t=String(q||'').trim(),m;
  if(m=t.match(/^(\d+(?:\.\d+)?)\s*(ml|l|litres?|liters?)\s*(?:of\s+)?water$/i))t='water '+m[1]+' '+m[2];
  const r=_localParse(t);if(!r)return r;
  const cfg=C(),esc2=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  const alts=[];cfg.accounts.forEach(a=>{alts.push(esc2(a.name.toLowerCase()),esc2(a.name.toLowerCase().replace(/\s+bank$/,'')),esc2(a.id))});alts.push('cc','credit card','cash');
  const acctRe=new RegExp('[,;]?\\s*\\b(?:from|via|using|by|through|in|on)\\s+(?:my\\s+)?(?:'+alts.sort((a,b)=>b.length-a.length).join('|')+')(?:\\s+(?:bank|account|card))?\\b','ig');
  r.entries.forEach(e=>{
    if(e.type!=='expense'&&e.type!=='income')return;
    let note=String(e.note||'');
    if(e.type==='expense'){
      const sp=note.match(/[,;]?\s*\b(?:and\s+)?split(?:\s+(?:it|this|equally|evenly))*\s+(?:with|between|among)\s+(.+)$/i);
      if(sp){
        const names=splitNames(sp[1].replace(/\b(?:me|myself)\b/ig,'')).filter(Boolean);
        if(names.length){const each=r2(e.amount/(names.length+1));e.split=names.map(n=>({person:n,amount:each}));r.reply='Expense '+inr2(e.amount)+', split '+(names.length+1)+' ways. '+names.join(', ')+(names.length>1?' each owe ':' owes ')+inr2(each)+'.'}
        note=note.slice(0,sp.index);
      }else{
        const owes=[];note=note.replace(/[,;]?\s*\b(?:and\s+)?([A-Za-z]+)\s+owes?\s+(?:me\s+)?(?:rs\.?|₹)?\s*(\d+(?:\.\d+)?)/ig,(x,p,a)=>{owes.push({person:p.charAt(0).toUpperCase()+p.slice(1),amount:+a});return ''});
        if(owes.length&&sum(owes,x=>x.amount)<=e.amount){e.split=owes;r.reply='Expense '+inr2(e.amount)+'. '+owes.map(o=>o.person+' owes '+inr2(o.amount)).join(', ')+'.'}
      }
    }
    note=note.replace(acctRe,'').replace(/\s{2,}/g,' ').replace(/^[\s,;]+|[\s,;]+$/g,'');
    e.note=note;
    if(e.type==='expense')e.category=guessCat(note,cfg.categories);
  });
  return r;
};

/* ---------- settings menu, grouped ---------- */
(function(){
  const st=document.createElement('style');
  st.textContent=
    '.xgrp{padding:var(--s3) var(--s4) var(--s4);margin:0}.xgrp .xgh{font:600 12px/1.3 var(--font-body);letter-spacing:.14em;text-transform:uppercase;color:var(--mute);margin:0 0 var(--s3)}'+
    '.xgrp .stack{gap:var(--s2)}.xgrp .btn,.xgrp select{min-height:44px;width:100%}.xgrp .chip{align-self:flex-start}.xgrp .xnote{font-size:12px;color:var(--faint);margin:0}'+
    '#layer input[type=password]{min-height:44px;box-sizing:border-box}'+
    '.xsc{display:flex;gap:var(--s2);align-items:stretch}.xsc input{flex:1;min-width:0;min-height:44px;font-size:13px}.xsc .btn{min-height:44px;flex:none}'+
    'html.xlocked body>*:not(#xlock){filter:blur(22px);pointer-events:none;user-select:none}'+
    '#xlock{position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;background:rgba(8,9,9,.94);-webkit-backdrop-filter:blur(24px);backdrop-filter:blur(24px);color:var(--fg);padding:24px 16px calc(24px + env(safe-area-inset-bottom));overflow:auto}'+
    '#xlock[hidden]{display:none}#xlock .xl-in{width:100%;max-width:320px;display:flex;flex-direction:column;align-items:center;text-align:center;gap:14px}'+
    '#xlock .crest{width:56px;height:56px;color:var(--accent)}#xlock h2{font:500 28px/1.15 var(--font-display);margin:4px 0 0}'+
    '#xlock .xl-dots{display:flex;gap:14px;height:20px;align-items:center}#xlock .xl-dots i{width:13px;height:13px;border-radius:50%;border:1.5px solid var(--mute)}#xlock .xl-dots i.on{background:var(--fg);border-color:var(--fg)}'+
    '#xlock .xl-msg{min-height:20px;font-size:13px;color:var(--mute);margin:0}#xlock .xl-msg.bad{color:var(--bad)}'+
    '#xlock .xl-pad{display:grid;grid-template-columns:repeat(3,72px);gap:14px 22px;margin-top:6px}'+
    '#xlock .xl-pad button{width:72px;height:72px;border-radius:50%;border:1px solid var(--hair2);background:rgba(255,255,255,.05);color:var(--fg);font:500 28px/1 var(--font-display);cursor:pointer}'+
    '#xlock .xl-pad button:active{background:rgba(255,255,255,.14)}#xlock .xl-pad button:disabled{opacity:.35}#xlock .xl-pad button.xl-del{font:500 15px/1 var(--font-body);border-color:transparent;background:none}'+
    '#xlock .xl-pad .xl-gap{visibility:hidden}'+
    '#xlock .xl-forgot{min-height:44px;background:none;border:0;color:var(--mute);font:500 13px/1.3 var(--font-body);text-decoration:underline;text-underline-offset:3px;padding:10px 12px;cursor:pointer;margin-top:6px}'+
    '#xlock.shake .xl-dots{animation:xlshake .42s}@keyframes xlshake{0%,100%{transform:none}20%{transform:translateX(-10px)}40%{transform:translateX(9px)}60%{transform:translateX(-6px)}80%{transform:translateX(4px)}}'+
    '@media (prefers-reduced-motion:reduce){#xlock.shake .xl-dots{animation:none}}';
  document.head.appendChild(st);
})();
settingsSheet=function(){
  const cfg=C(),pin=!!LD.kvGet('pin');
  const g=(h,body,note)=>'<section class="card quiet xgrp" aria-label="'+h+'"><h3 class="xgh">'+h+'</h3><div class="stack">'+body+(note?'<p class="xnote">'+note+'</p>':'')+'</div></section>';
  const ck=(k,on,l)=>'<label class="chip"><input type="checkbox" data-change="'+k+'"'+(on?' checked':'')+'>'+l+'</label>';
  sheet('<h2>Menu and settings</h2><div class="stack">'+
   '<button class="btn" data-act="widgets">Open widget view</button><button class="btn" data-act="gotolife">Career, goals, net worth and more</button>'+
   g('Account','<button class="btn" data-x="cloud">Cloud sync</button><button class="btn" data-x="calfeed">Calendar feed</button>')+
   g('Reminders','<button class="btn" data-x="rem">Reminders</button>')+
   g('Agents','<button class="btn" data-x="agents">Agent status'+(agentProblem()?' · a problem to look at':'')+'</button>')+
   g('Appearance','<button class="btn" data-act="lookopen">Appearance: scene, motion, Today cards</button><button class="btn" data-act="hues">Tab colours</button>'+ck('fx',cfg.fx!==false,'Celebrations and haptics'))+
   g('Data','<button class="btn" data-act="data">Data and backup</button><button class="btn" data-x="shortcuts">Shortcuts and Siri</button><button class="btn" data-x="install">Install on this device</button>')+
   g('Semester','<button class="btn" data-x="sem">Semester setup</button><label class="fld"><span>Exam mode</span><select data-change="exammode">'+[['auto','Automatic, near an exam'],['on','Always on'],['off','Off']].map(([k,l])=>'<option value="'+k+'"'+((cfg.examMode||'auto')===k?' selected':'')+'>'+l+'</option>').join('')+'</select></label>')+
   g('Privacy',ck('mhide',state.moneyHide,'Hide money amounts')+ck('privacy',state.privacy,'Hide private habit names on screen')+
     (pin?'<button class="btn" data-x="pinchange">Change PIN</button><button class="btn" data-x="pinremove">Remove PIN</button>':'<button class="btn" data-x="pinset">Set a PIN</button>'),
     (pin?'PIN lock is on for this device.':'PIN lock is off.')+' The PIN stays on this device only: it never syncs and is not in exports.')+
   '<button class="btn" data-act="sheetclose">Close</button></div>');
};

/* ---------- PIN lock: a salted hash per device, never in cfg, never synced or exported ---------- */
const PIN_FLAG='ld.pinOn',PIN_FAIL='ld.pinFail',PIN_WAIT='ld.pinWait';
const lsGet=k=>{try{return localStorage.getItem(k)}catch(e){return null}},lsSet=(k,v)=>{try{v==null?localStorage.removeItem(k):localStorage.setItem(k,String(v))}catch(e){}};
const hex=b=>Array.from(new Uint8Array(b),x=>x.toString(16).padStart(2,'0')).join('');
async function pinHash(salt,pin){return hex(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(salt+':'+pin)))}
async function pinCheck(pin){const p=LD.kvGet('pin');return !!(p&&p.salt&&p.hash&&(await pinHash(p.salt,String(pin)))===p.hash)}
async function pinStore(pin){
  if(!(window.crypto&&crypto.subtle))throw new Error('This browser cannot keep a PIN safely here. Open the app from its https address.');
  const salt=hex(crypto.getRandomValues(new Uint8Array(16)));
  LD.kvSet('pin',{salt,hash:await pinHash(salt,pin),n:pin.length});lsSet(PIN_FLAG,pin.length);
}
const XL={on:false,buf:'',n:4,hidAt:0,busy:false,t:null};
function lockDraw(msg,bad){
  let el=xq('#xlock');
  if(!el){el=document.createElement('div');el.id='xlock';el.setAttribute('role','dialog');el.setAttribute('aria-modal','true');el.setAttribute('aria-label','Life Dashboard is locked');document.body.appendChild(el)}
  const wait=+lsGet(PIN_WAIT)||0,left=Math.ceil((wait-Date.now())/1000),blocked=left>0;
  const k=d=>'<button type="button" data-xl="k" data-d="'+d+'"'+(blocked?' disabled':'')+' aria-label="'+d+'">'+d+'</button>';
  el.innerHTML='<div class="xl-in">'+CREST+'<h2>Enter your PIN</h2>'+
    '<div class="xl-dots" aria-label="'+XL.buf.length+' of '+XL.n+' digits entered">'+Array.from({length:XL.n},(_,i)=>'<i class="'+(i<XL.buf.length?'on':'')+'"></i>').join('')+'</div>'+
    '<p class="xl-msg'+(bad||blocked?' bad':'')+'" role="status">'+esc(blocked?'Too many tries. Wait '+left+' s.':msg||'')+'</p>'+
    '<div class="xl-pad">'+[1,2,3,4,5,6,7,8,9].map(k).join('')+'<button type="button" class="xl-gap" tabindex="-1" aria-hidden="true"></button>'+k(0)+'<button type="button" class="xl-del" data-xl="del"'+(blocked?' disabled':'')+' aria-label="Delete">Delete</button></div>'+
    '<button type="button" class="xl-forgot" data-xl="forgot">Forgot: sign out and clear this device</button></div>';
  el.hidden=false;
  clearTimeout(XL.t);if(blocked)XL.t=setTimeout(()=>{if(XL.on)lockDraw()},1000);
}
function lockShow(){
  if(XL.on)return;XL.on=true;XL.buf='';XL.n=+((LD.kvGet('pin')||{}).n||lsGet(PIN_FLAG))||4;
  document.documentElement.classList.add('xlocked');
  [...document.body.children].forEach(e=>{if(e.id!=='xlock'&&e.tagName!=='SCRIPT')e.inert=true});
  lockDraw();
  try{const b=xq('#xlock [data-xl=k]');b&&b.focus({preventScroll:true})}catch(e){}
}
function lockHide(){
  XL.on=false;XL.buf='';clearTimeout(XL.t);document.documentElement.classList.remove('xlocked');
  [...document.body.children].forEach(e=>{e.inert=false});
  const el=xq('#xlock');if(el){el.hidden=true;el.innerHTML=''}
}
async function lockKey(d){
  if(!XL.on||XL.busy||(+lsGet(PIN_WAIT)||0)>Date.now())return;
  if(d==='del'){XL.buf=XL.buf.slice(0,-1);lockDraw();return}
  if(XL.buf.length>=XL.n)return;
  XL.buf+=d;lockDraw();if(XL.buf.length<XL.n)return;
  XL.busy=true;let good=false;try{good=await pinCheck(XL.buf)}catch(e){}XL.busy=false;
  if(good){lsSet(PIN_FAIL,null);lsSet(PIN_WAIT,null);lockHide();return}
  const n=(+lsGet(PIN_FAIL)||0)+1;XL.buf='';
  if(n>=5){lsSet(PIN_FAIL,null);lsSet(PIN_WAIT,Date.now()+30000);lockDraw()}
  else{lsSet(PIN_FAIL,n);lockDraw('Wrong PIN. '+(5-n)+' tr'+(5-n===1?'y':'ies')+' before a 30 second wait.',true)}
  const el=xq('#xlock');if(el){el.classList.remove('shake');void el.offsetWidth;el.classList.add('shake')}
  try{navigator.vibrate&&navigator.vibrate(80)}catch(e){}
}
async function xWipe(){
  /* local data only: the cloud copy is untouched and comes back after signing in again */
  try{localStorage.clear()}catch(e){}
  await new Promise(res=>{let r;try{r=indexedDB.open('life-dashboard')}catch(e){return res()}
    r.onsuccess=()=>{const d=r.result;try{const t=d.transaction(['recs','kv'],'readwrite');t.objectStore('recs').clear();t.objectStore('kv').clear();t.oncomplete=t.onerror=t.onabort=()=>{d.close();res()}}catch(e){d.close();res()}};
    r.onerror=()=>res()});
  location.replace(location.pathname);
}
document.addEventListener('click',ev=>{
  const t=ev.target.closest('#xlock [data-xl]');if(!t)return;const a=t.dataset.xl;
  if(a==='k')lockKey(t.dataset.d);
  else if(a==='del')lockKey('del');
  else if(a==='forgot'){
    if(!confirm('Sign out and clear this device?\n\nThis removes every record, setting and the PIN stored on this device only. Anything already synced stays in your cloud and comes back when you sign in again. Changes not yet synced, and data on a device that never connected the cloud, are lost.'))return;
    xWipe();
  }
});
document.addEventListener('keydown',ev=>{
  if(!XL.on)return;
  if(/^[0-9]$/.test(ev.key)){lockKey(ev.key);ev.preventDefault();ev.stopPropagation()}
  else if(ev.key==='Backspace'){lockKey('del');ev.preventDefault();ev.stopPropagation()}
  else if(ev.key==='Escape'){ev.preventDefault();ev.stopPropagation()}
},true);
document.addEventListener('visibilitychange',()=>{
  if(document.hidden){XL.hidAt=Date.now();return}
  if(LD.kvGet('pin')&&XL.hidAt&&Date.now()-XL.hidAt>60000)lockShow();
  XL.hidAt=0;
});
/* lock before anything paints when this device has a PIN; confirmed once storage has opened */
if(lsGet(PIN_FLAG))lockShow();
LD.opened.then(()=>{if(LD.kvGet('pin'))lockShow();else{lsSet(PIN_FLAG,null);if(XL.on)lockHide()}});

function pinSheet(mode,msg){
  const has=!!LD.kvGet('pin');if(mode!=='set'&&!has)mode='set';
  const f=(n,l,ac)=>'<label class="fld"><span>'+l+'</span><input type="password" name="'+n+'" inputmode="numeric" pattern="[0-9]*" minlength="4" maxlength="6" autocomplete="'+(ac||'off')+'" required></label>';
  const ttl={set:'Set a PIN',change:'Change PIN',remove:'Remove PIN'}[mode];
  sheet('<h2>'+ttl+'</h2><p class="muted" style="font-size:13px">'+(mode==='remove'?'Enter your current PIN to turn the lock off on this device.':'4 to 6 digits. The app locks when you open it and when you come back after more than a minute away.')+
   ' The PIN is kept on this device only, as a salted hash: it never syncs and is not in exports, so set one on each device.</p>'+
   (msg?'<p style="font-size:13px;color:var(--bad)" role="alert">'+esc(msg)+'</p>':'')+
   '<form data-xform="pin" data-mode="'+mode+'" class="stack">'+(mode!=='set'?f('cur','Current PIN','current-password'):'')+(mode!=='remove'?f('p1','New PIN','new-password')+f('p2','New PIN again','new-password'):'')+
   '<div class="row"><button class="btn pri" type="submit">'+(mode==='remove'?'Remove PIN':'Save PIN')+'</button><button class="btn" type="button" data-act="sheetclose">Cancel</button></div></form>');
}
document.addEventListener('submit',async ev=>{
  const f=ev.target.closest('form[data-xform=pin]');if(!f)return;ev.preventDefault();ev.stopImmediatePropagation();
  const fd=new FormData(f),v=n=>String(fd.get(n)||'').trim(),mode=f.dataset.mode;
  if(mode!=='set'&&!(await pinCheck(v('cur'))))return pinSheet(mode,'That is not your current PIN.');
  if(mode==='remove'){LD.kvSet('pin',undefined);lsSet(PIN_FLAG,null);closeSheet();toast('PIN removed from this device',{noUndo:true});return}
  if(!/^\d{4,6}$/.test(v('p1')))return pinSheet(mode,'Use 4 to 6 digits.');
  if(v('p1')!==v('p2'))return pinSheet(mode,'The two PINs do not match. Try again.');
  try{await pinStore(v('p1'))}catch(e){return pinSheet(mode,String(e.message||e))}
  closeSheet();toast(mode==='set'?'PIN set for this device':'PIN changed',{noUndo:true});
},true);

/* ---------- Siri Shortcuts: #log=<text> and #tick=<habit> open a card to confirm, never save on their own ---------- */
const _pendHtml=pendHtml;
pendHtml=function(p,i,cfg){
  if(p.type!=='tick')return _pendHtml(p,i,cfg);
  const dt=/^\d{4}-\d{2}-\d{2}$/.test(String(p.date||''))?p.date:state.date;
  return '<div class="pend"><b>Tick '+esc(p.label)+'?</b><span class="faint" style="font-size:12px">on '+esc(dlabel(dt))+'</span><div class="row"><button class="btn pri sm" data-act="pendok" data-i="'+i+'">Save</button><button class="btn sm" data-act="penddel" data-i="'+i+'">Discard</button></div></div>';
};
const _commitPending=commitPending;
commitPending=function(i,quiet){
  const p=state.chat.pending[i];
  if(!p||p.type!=='tick')return _commitPending(i,quiet);
  const keep=state.date;state.date=p.date||keep;try{setHabit(p.key,true)}finally{state.date=keep}
  state.chat.pending.splice(i,1);renderDock();if(!quiet)toast(p.label+' ticked for '+dlabel(p.date||keep));return true;
};
function xHabitLabel(k){
  const it=habits(state.date).items.find(x=>x.k===k);if(!it)return '';
  return masked(k)?'Private habit':(typeof hlabel==='function'?hlabel(it):it.label)||k;
}
function xDeep(){
  const h=new URLSearchParams(location.hash.replace(/^#/,'')),q=new URLSearchParams(location.search);
  const log=h.get('log')!=null?h.get('log'):q.get('log'),tick=h.get('tick')!=null?h.get('tick'):q.get('tick');
  if(log==null&&tick==null)return;
  ['log','tick'].forEach(k=>q.delete(k));
  try{history.replaceState(null,'',location.pathname+(q.toString()?'?'+q:''))}catch(e){}
  const c=state.chat;c.open=true;
  if(log&&log.trim())sendChat(log.trim().slice(0,200));
  if(tick){
    const k=String(tick).trim(),label=xHabitLabel(k);
    if(!label)c.msgs.push({r:'a',t:'That shortcut names a habit I do not know: '+k+'.'});
    else if(!c.pending.some(p=>p.type==='tick'&&p.key===k)){c.msgs.push({r:'a',t:'From your shortcut. Tap Save to confirm.'});c.pending.push({type:'tick',key:k,label,date:state.date})}
  }
  renderDock();
}
addEventListener('hashchange',()=>{try{xDeep()}catch(e){console.error(e)}});
LD.opened.then(()=>{let n=0;const go=()=>{if(!state.db&&n++<30)return setTimeout(go,100);try{xDeep()}catch(e){console.error(e)}};go()});
const SC=[['Log water','log=water%20500','Adds a 500 ml water card'],['Creatine done','tick=creatine','Ticks creatine for today'],['Mobility done','tick=mobility','Ticks morning mobility for today']];
function shortcutsSheet(){
  const base=location.origin+location.pathname;
  sheet('<h2>Shortcuts and Siri</h2><p class="muted" style="font-size:13px">Each link opens the app with a card ready. Nothing is saved until you tap <b>Save</b>.</p><div class="stack">'+
   SC.map(([n,h,d],i)=>'<div><div class="lbl" style="margin-bottom:6px">'+n+' <span class="faint">· '+d+'</span></div><div class="xsc"><input type="text" readonly id="sc'+i+'" value="'+esc(base+'#'+h)+'" aria-label="'+n+' link"><button class="btn" data-x="sccopy" data-i="'+i+'">Copy</button></div></div>').join('')+
   '<div class="lbl" style="margin-top:6px">On iPhone</div><ol class="xol"><li>Tap <b>Copy</b> next to a link above.</li><li>Open the <b>Shortcuts</b> app and tap <b>+</b>.</li><li>Tap <b>Add Action</b>, search <b>Open URLs</b> and choose it.</li><li>Tap the URL field and <b>Paste</b>.</li><li>Tap the name at the top and call it <b>Log water</b> (or the name above).</li><li>Tap the share button and choose <b>Add to Home Screen</b>, or just say <b>“Hey Siri, Log water”</b>.</li></ol>'+
   '<button class="btn" data-act="sheetclose">Close</button></div>');
}
document.addEventListener('click',async ev=>{
  const t=ev.target.closest('[data-x]');if(!t)return;const a=t.dataset.x;
  if(a==='pinset'){pinSheet('set');return}
  if(a==='pinchange'){pinSheet('change');return}
  if(a==='pinremove'){pinSheet('remove');return}
  if(a==='shortcuts'){shortcutsSheet();return}
  if(a==='sccopy'){const i=xq('#sc'+t.dataset.i);if(!i)return;try{await navigator.clipboard.writeText(i.value);toast('Link copied',{noUndo:true})}catch(e){i.select();try{document.execCommand('copy')}catch(e2){}toast('Link selected. Copy it from the box.',{noUndo:true})}return}
});

/* ---------- monthly allowance as recurring income, once per device, never duplicated ---------- */
function allowSeed(){
  if(XS.allowDone||LD.kvGet('allowSeed')||!LD.ready||!state.seen.config||!state.seen.entries)return;
  /* checked once per app start, after the first sync when the cloud is on, so a fresh device never overwrites the cloud list.
     With no real config yet (a fresh device, or one about to import a backup) it waits for the next start. */
  const main=LD.get('config','main'),st=LD.status();
  if(st.mode!=='local'&&!st.last)return;
  XS.allowDone=true;
  if(!main||!Object.keys(main).length)return;
  LD.kvSet('allowSeed',Date.now());
  const cfg=C(),list=cfg.recurring||[];if(list.some(r=>r.kind==='income'))return;
  const ac=cfg.accounts.find(x=>x.id==='km')||cfg.accounts[0];if(!ac)return;
  /* starts at the next 1st (as the "Add monthly allowance" button does): nothing is posted into a month already under way,
     where he may have logged this month's allowance by hand */
  const it={id:uid(),name:'Allowance',amount:25000,category:'Income',account:ac.id,day:1,from:recFrom(1),paused:false,kind:'income'};
  setTimeout(()=>{saveCfg({recurring:[...(C().recurring||[]),it]});runRecurring()},0);
}
LD.onStatus(()=>{try{allowSeed()}catch(e){}});

/* ---------- Wispr logger: a cloud agent writes one proposals record per run with auto:true. Clear items are saved here
   without a tap, each with Undo; unclear items wait as questions. Every item carries a src fingerprint, and the app applies
   each src exactly once: a shared register (meta/wispr-applied) plus idempotent writes (ids derived from src). ---------- */
const wlKey=s=>String(s).replace(/[^A-Za-z0-9_-]/g,'_').slice(0,100);
function wlHash(s){let a=0x811c9dc5,b=0x9747b28c;for(let i=0;i<s.length;i++){const c=s.charCodeAt(i);a^=c;a=Math.imul(a,16777619);b=Math.imul(b^c,0x5bd1e995);b^=b>>>13}return (a>>>0).toString(36)+(b>>>0).toString(36)}
const wlId=s=>'w_'+wlHash(String(s));
const wlReg=()=>LD.get('meta','wispr-applied')||{};
function wlRegPut(patch){LD.write('meta','wispr-applied',{...wlReg(),...patch})}
const wlUp=s=>{s=String(s==null?'':s).trim();return s.charAt(0).toUpperCase()+s.slice(1)};
const wlNum=v=>{const x=typeof v==='number'?v:parseFloat(v);return isFinite(x)?x:NaN};
const wlTime=v=>/^([01]\d|2[0-3]):[0-5]\d$/.test(String(v||''));
const wlDate=(it,p)=>validYmd(it&&it.date)?it.date:(p&&validYmd(p.date)?p.date:'');
const wlSrc=(p,it,i)=>String((it&&it.src)||(p.id+'#'+i));
function wlAcct(v){
  v=String(v==null?'':v).trim().toLowerCase();if(!v)return '';
  const A=C().accounts;
  const a=A.find(x=>x.id.toLowerCase()===v)||A.find(x=>String(x.name).toLowerCase()===v)||A.find(x=>String(x.name).toLowerCase().replace(/\s+bank$/,'')===v);
  return a?a.id:'';
}
function wlDue(d){const n=diff(d,todayStr());return n>=0&&n<7?DOW[parse(d).getDay()]:parse(d).getDate()+' '+MON[parse(d).getMonth()]}
function wlShares(arr){
  const out=[];
  (arr||[]).forEach(x=>{if(!(x&&x.person&&+x.amount>0))return;const ns=splitNames(x.person);if(!ns.length)return;const each=r2(+x.amount/ns.length);ns.forEach((n,i)=>out.push({person:n,amount:i===0?r2(+x.amount-each*(ns.length-1)):each}))});
  return out;
}
/* exercise names: today's plan first, then the library, then every day of the plan */
const WL_STOP=new Set(['or','and','the','a','with','on']);
const wlTok=s=>String(s).toLowerCase().replace(/dumbbells?/g,'db').replace(/barbells?/g,'bb').replace(/[^a-z0-9]+/g,' ').trim().split(' ').filter(t=>t&&!WL_STOP.has(t)).map(t=>t.replace(/s$/,''));
function wlExLists(date){
  let pl=null;const key=DOW[parse(date).getDay()];
  try{pl=(window.PROGRAM&&PROGRAM.withDate)?PROGRAM.withDate(date,()=>PLAN[key]):PLAN[key]}catch(e){pl=PLAN[key]}
  const names=o=>((o&&o.ex)||[]).map(e=>e.n);
  const all=[];try{Object.values(PLAN).forEach(o=>all.push(...names(o)));if(window.PROGRAM&&PROGRAM.plan)Object.values(PROGRAM.plan).forEach(o=>all.push(...names(o)))}catch(e){}
  return [names(pl),CUE_LIST.map(r=>r[0]),[...new Set(all)]];
}
function wlMatchEx(q,date){
  const qt=wlTok(q);if(!qt.length)return {name:''};
  const lists=wlExLists(date);
  for(const L of lists){
    let best=null,bs=0;
    L.forEach(n=>{const ct=wlTok(n);let s=0;
      if(qt.every(t=>ct.includes(t)))s=qt.length/ct.length;
      else if(ct.length>=2&&ct.every(t=>qt.includes(t)))s=.5*ct.length/qt.length;
      if(s>bs){bs=s;best=n}});
    if(best)return {name:best};
  }
  return {name:'',today:lists[0]};
}
const wlSetsOk=a=>Array.isArray(a)&&a.length&&a.every(s=>s&&wlNum(s.w)>=0&&wlNum(s.r)>=1&&wlNum(s.r)<=200);
/* the units a plan touches, kept so Undo restores exactly what was changed */
const wlCx=()=>({refs:[],dprev:[],sets:[],cprev:null});
function wlPrevOf(cur,patch){const o={};for(const k in patch){const v=patch[k];if(v&&typeof v==='object'&&!Array.isArray(v))o[k]=wlPrevOf((cur&&cur[k])||{},v);else o[k]=cur&&cur[k]!==undefined?cur[k]:null}return o}
function wlDay(cx,d,patch){cx.dprev.push({d,p:wlPrevOf(day(d),patch)});dbSetDay(d,patch)}
function wlInc(cx,sk,d,patch,once){
  if((day(d).wx||{})[sk])return;
  const full={...patch,wx:{[sk]:1}};wlDay(cx,d,full);
}
function wlEnt(cx,id,doc){cx.refs.push({col:'entries',id});if(state.entries.some(e=>e.id===id))return;state.entries.push({id,...doc,ts:Date.now()});wSet('entries',id)}
function wlListPut(cx,l,row){
  cx.refs.push({col:'L_'+l,id:row.id});
  const list=LL(l).slice(),i=list.findIndex(x=>x.id===row.id);
  if(i>=0)list[i]=row;else list.push(row);LSAVE(l,list);
}
function wlHabitKeys(d){try{return habits(d).items.filter(i=>!i.type).map(i=>i.k)}catch(e){return ['mobility','creatine','gym','alcohol','clean']}}
/* validate an item and return {err} | {ask:{question,options}} | {do(cx)} */
function wlPlan(it,src,date){
  const k=it.kind,sk=wlKey(src),id=wlId(src),cfg=C(),E=m=>({err:m}),D=fn=>({do:fn});
  const nd=()=>{if(!validYmd(date))return 'which day is this for?';const g=diff(date,todayStr());if(g>1)return 'that date is in the future';if(g<-400)return 'that date is too old';return ''};
  const dset=(field,v,okv,msg)=>{const e=nd();if(e)return E(e);if(!okv(v))return E(msg);return D(cx=>wlDay(cx,date,{[field]:v}))};
  const dinc=(field,v,msg)=>{const e=nd();if(e)return E(e);if(!(v>=1&&v<=1440))return E(msg);return D(cx=>wlInc(cx,sk,date,{[field]:(+day(date)[field]||0)+v}))};
  if(k==='water'){const e=nd(),ml=wlNum(it.ml);if(e)return E(e);if(!(ml>=20&&ml<=6000))return E('how many ml?');return D(cx=>wlEnt(cx,id,{type:'water',ml:Math.round(ml),date}))}
  if(k==='meal'){
    const e=nd(),nm=String(it.name||'').trim().slice(0,120),kc=wlNum(it.kcal);if(e)return E(e);
    if(!nm)return E('what was the meal?');if(!(kc>=0&&kc<=6000))return E('how many kcal?');
    const doc={type:'meal',name:nm,kcal:Math.round(kc),p:wlNum(it.p)>=0?wlNum(it.p):0,date};
    if(wlNum(it.c)>=0)doc.c=wlNum(it.c);if(wlNum(it.f)>=0)doc.f=wlNum(it.f);if(it.portion)doc.portion=String(it.portion).slice(0,80);
    return D(cx=>wlEnt(cx,id,doc));
  }
  if(k==='sets'){
    const e=nd(),q=String(it.exercise||'').trim();if(e)return E(e);
    if(!q)return E('which exercise?');if(!wlSetsOk(it.sets))return E('what were the sets (weight and reps)?');
    const sets=it.sets.map(s=>({w:wlNum(s.w),r:Math.round(wlNum(s.r))}));
    let name=q;
    if(!it.exact){
      const m=wlMatchEx(q,date);
      if(!m.name){
        const opts=(m.today||[]).slice(0,4).map(n=>({label:n,item:{kind:'sets',exercise:n,sets:it.sets,date}}));
        opts.push({label:'New: '+q,item:{kind:'sets',exercise:q,sets:it.sets,date,exact:true}});opts.push({label:'Skip',item:null});
        return {ask:{question:'Which exercise is "'+q+'"?',options:opts}};
      }
      name=m.name;
    }
    const lid=slug(name);if(!lid)return E('which exercise?');
    return D(cx=>{
      const arr=((day(date).lifts||{})[lid]||[]).slice();
      if(!arr.some(x=>x&&x.src===sk))dbSetDay(date,{lifts:{[lid]:arr.concat(sets.map(s=>({w:s.w,r:s.r,src:sk})))}});
      cx.sets.push({d:date,slug:lid,s:sk});
    });
  }
  if(k==='cardio')return dinc('cardioMin',wlNum(it.min),'how many minutes of cardio?');
  if(k==='cfa')return dinc('cfaMin',wlNum(it.min),'how many minutes of CFA?');
  if(k==='study'){
    const e=nd(),m=wlNum(it.min);if(e)return E(e);if(!(m>=1&&m<=1440))return E('how many minutes of study?');
    let c='';if(String(it.course||'').trim()){c=propCourse(it.course);if(!c)return E('which course is "'+it.course+'"?')}
    return D(cx=>{const dd=day(date),patch={studyMin:(+dd.studyMin||0)+m};if(c)patch.courseMin={[c]:(+(dd.courseMin||{})[c]||0)+m};wlInc(cx,sk,date,patch)});
  }
  if(k==='habit'){
    const e=nd(),key=String(it.key||'').trim().toLowerCase();if(e)return E(e);
    if(!wlHabitKeys(date).includes(key))return E('which habit is "'+(it.key||'')+'"?');
    return D(cx=>wlDay(cx,date,{habits:{[key]:it.done!==false&&it.done!=='false'}}));
  }
  if(k==='weight')return dset('weight',wlNum(it.kg),v=>v>=30&&v<=250,'what was the weight in kg?');
  if(k==='steps')return dset('steps',Math.round(wlNum(it.n)),v=>v>=0&&v<=100000,'how many steps?');
  if(k==='waist')return dset('waist',wlNum(it.cm),v=>v>=40&&v<=200,'what was the waist in cm?');
  if(k==='wake'||k==='bed')return dset(k,String(it.time||''),wlTime,'what time (HH:MM)?');
  if(k==='mood'||k==='sleepQ')return dset(k,Math.round(wlNum(it.v)),v=>v>=1&&v<=5,'what rating, 1 to 5?');
  if(k==='expense'||k==='income'){
    const e=nd(),amt=wlNum(it.amount);if(e)return E(e);
    if(!(amt>0&&amt<1e8))return E('what amount?');
    const acct=wlAcct(it.account),paidBy=k==='expense'?String(it.paidBy||'').trim():'';
    if(!paidBy&&!acct)return E(String(it.account||'').trim()?'which account? "'+it.account+'" is not one of yours':'which account?');
    const note=String(it.note||'').trim().slice(0,160);
    if(k==='income')return D(cx=>wlEnt(cx,id,{type:'txn',kind:'income',amount:amt,category:'Income',account:acct,src:'Other',note,date}));
    const cats=cfg.categories,cat=cats.find(c=>String(c).toLowerCase()===String(it.category||'').toLowerCase())||guessCat(note,cats);
    if(paidBy){
      const mine=wlNum(it.mine)>=0?Math.min(amt,r2(wlNum(it.mine))):amt;
      return D(cx=>{wlEnt(cx,id,{type:'txn',kind:'expense',amount:amt,mine,payer:paidBy,account:'',category:cat,note,date,split:true});if(mine>0)wlEnt(cx,wlId(src+'#c0'),{type:'debt',person:paidBy,amount:mine,note,date,src:id})});
    }
    const sh=wlShares(it.split),owed=sum(sh,x=>x.amount);
    if(owed>amt+0.005)return E('the shares add up to more than the bill');
    return D(cx=>{
      wlEnt(cx,id,{type:'txn',kind:'expense',amount:amt,category:cat,account:acct,note,date,...(sh.length?{mine:r2(amt-owed),split:true}:{})});
      sh.forEach((x,i)=>wlEnt(cx,wlId(src+'#c'+i),{type:'owe',person:x.person,amount:x.amount,note,date,src:id}));
    });
  }
  if(k==='repay'||k==='paid'){
    const e=nd(),amt=wlNum(it.amount),pn=String(it.person||'').trim();if(e)return E(e);
    if(!pn)return E('who?');if(!(amt>0&&amt<1e8))return E('what amount?');
    const acct=wlAcct(it.account);if(String(it.account||'').trim()&&!acct)return E('which account? "'+it.account+'" is not one of yours');
    return D(cx=>wlEnt(cx,id,{type:k,person:pn,amount:amt,account:acct,date}));
  }
  if(k==='poker'){
    const e=nd(),bi=wlNum(it.buyin),co=wlNum(it.cashout);if(e)return E(e);
    if(!(bi>=0)||!(co>=0))return E('what were the buy-in and cash-out?');
    return D(cx=>wlEnt(cx,id,{type:'poker',date,buyin:bi,cashout:co,note:String(it.note||'').slice(0,160),hours:wlNum(it.hours)>0?wlNum(it.hours):null}));
  }
  if(k==='todo'){
    const ti=String(it.title||'').trim().slice(0,200);if(!ti)return E('what is the task?');
    const q=['q1','q2','q3','q4'].includes(it.q)?it.q:'q2',pri=['high','med','low'].includes(it.pri)?it.pri:'med',due=validYmd(it.due)?it.due:'';
    return D(cx=>{cx.refs.push({col:'todos',id});if(state.todos.some(t=>t.id===id))return;setTodo({id,title:ti,pri,q,done:false,...(due?{due}:{})})});
  }
  if(k==='deadline'){
    const ti=String(it.title||'').trim();if(!ti)return E('what is the deadline called?');if(!validYmd(it.date))return E('what is the date?');
    const c=propCourse(it.course)||Object.keys(COURSES)[0];
    return D(cx=>{cx.refs.push({col:'academics',id});if(state.acad[id])return;setAcad(id,{custom:true,c,t:ti,date:it.date,k:KINDS.includes(it.k)?it.k:'Task'})});
  }
  if(k==='note'){
    const e=nd(),tx=String(it.text||'').trim();if(e)return E(e);if(!tx)return E('the note is empty');
    return D(cx=>{const old=day(date).note||'';wlInc(cx,sk,date,{note:old?old+'\n'+tx:tx})});
  }
  if(k==='contact'){
    const e=nd(),nm=String(it.name||'').trim();if(e)return E(e);if(!nm)return E('who?');
    const list=LL('contacts'),low=nm.toLowerCase();
    if(it.add)return D(cx=>wlListPut(cx,'contacts',{id,name:nm,firm:'',last:date,note:String(it.note||'')}));
    let ex=list.find(x=>String(x.name||'').trim().toLowerCase()===low);
    if(!ex){const part=list.filter(x=>{const n=String(x.name||'').trim().toLowerCase();return n.length>=3&&(n.includes(low)||low.includes(n))});if(part.length===1)ex=part[0]}
    if(!ex)return {ask:{question:'Add '+nm+' as a contact?',options:[{label:'Add',item:{kind:'contact',name:nm,note:it.note,date,add:true}},{label:'Skip',item:null}]}};
    return D(cx=>{cx.cprev={id:ex.id,last:ex.last||''};if(!ex.last||ex.last<date)LSAVE('contacts',LL('contacts').map(x=>x.id===ex.id?{...x,last:date}:x))});
  }
  if(k==='intern'){
    const e=nd(),w=String(it.work||'').trim();if(e)return E(e);if(!w)return E('what did you do?');
    return D(cx=>wlListPut(cx,'intern',{id,date,firm:String(it.firm||'').trim()||'Other',matter:String(it.matter||'').trim(),work:w,learned:String(it.learned||'').trim(),with:String(it.with||'').trim(),skill:String(it.skill||'').trim()||'Other'}));
  }
  return E('unknown item type "'+(k||'')+'"');
}
function wlApplyOne(it,src,date){
  if(!it||typeof it!=='object')return {err:'empty item'};
  const pl=wlPlan(it,src,date);if(!pl.do)return pl;
  const cx=wlCx();pl.do(cx);
  return {ok:true,rec:{at:Date.now(),d:date,it,refs:cx.refs,dprev:cx.dprev,sets:cx.sets,cprev:cx.cprev}};
}
function wlReady(){
  if(!window.LD||!LD.ready||!state.db)return false;
  if(!['entries','days','config','todos','academics'].every(n=>state.seen[n]))return false;
  const st=LD.status();return st.mode==='local'||st.last>0;
}
const wlAuto=()=>XS.props.filter(p=>wlIsAuto(p));
function wlRun(){
  if(XS.wlBusy||!wlAuto().length||!wlReady())return;XS.wlBusy=true;
  try{wlRunNow()}finally{XS.wlBusy=false}
}
function wlRunNow(){
  const reg=wlReg(),patch={};let n=0;
  wlAuto().forEach(p=>(p.items||[]).forEach((it,i)=>{
    if(!it||it.kind==='ask')return;
    const src=wlSrc(p,it,i),k=wlKey(src);if(reg[k]||patch[k])return;
    const r=wlApplyOne(it,src,wlDate(it,p));if(r.ok){patch[k]=r.rec;n++}
  }));
  if(n){wlRegPut(patch);scheduleRender()}
}
setInterval(()=>{try{wlRun()}catch(e){console.error(e)}},3000);
LD.opened.then(()=>{LD.onCol('proposals',()=>setTimeout(()=>{try{wlRun()}catch(e){console.error(e)}},50));LD.onCol('meta',()=>setTimeout(()=>{try{wlRun();scheduleRender()}catch(e){console.error(e)}},50));LD.onStatus(()=>{try{wlRun()}catch(e){}})});
const wlRecent=p=>{const t=+p.at||Date.parse((p.date||'')+'T12:00:00+05:30')||Date.now();return Date.now()-t<48*36e5};
/* what still waits on him */
function wlQuestions(){
  const out=[],reg=wlReg(),seen=new Set();
  wlAuto().forEach(p=>{if(!wlRecent(p))return;(p.items||[]).forEach((it,i)=>{
    if(!it)return;const src=wlSrc(p,it,i),k=wlKey(src);if(reg[k]||seen.has(k))return;seen.add(k);
    const date=wlDate(it,p);
    if(it.kind==='ask'){out.push({k,src,date,it,ask:{question:String(it.question||'Which one?'),options:Array.isArray(it.options)?it.options:[]}});return}
    const pl=wlPlan(it,src,date);
    if(pl.err)out.push({k,src,date,it,bad:pl.err});else if(pl.ask)out.push({k,src,date,it,ask:pl.ask});
  })});
  return out;
}
function wlSaved(){
  const reg=wlReg(),now=Date.now();
  return Object.keys(reg).map(k=>({k,rec:reg[k]})).filter(x=>x.rec&&x.rec.it&&!x.rec.undone&&!x.rec.skipped&&now-(+x.rec.at||0)<48*36e5).sort((a,b)=>(+a.rec.at||0)-(+b.rec.at||0));
}
function wlSetsText(a){
  const g=[];(a||[]).forEach(s=>{const w=wlNum(s.w),l=g[g.length-1];if(l&&l.w===w)l.r.push(s.r);else g.push({w,r:[s.r]})});
  return g.map(x=>(x.w>0?x.w+' kg × ':'')+x.r.join(', ')).join(', ');
}
function wlLabel(it){
  const k=it.kind,n=v=>wlNum(v);
  if(k==='water')return 'Water '+n(it.ml)+' ml';
  if(k==='meal')return wlUp(it.name)+' · '+Math.round(n(it.kcal)||0)+' kcal';
  if(k==='sets')return wlUp(it.exercise)+' '+wlSetsText(it.sets);
  if(k==='cardio')return 'Cardio '+n(it.min)+' min';
  if(k==='habit')return wlUp(it.key)+(it.done===false||it.done==='false'?' not done':' done');
  if(k==='weight')return 'Weight '+n(it.kg)+' kg';
  if(k==='steps')return 'Steps '+(n(it.n)||0).toLocaleString('en-IN');
  if(k==='waist')return 'Waist '+n(it.cm)+' cm';
  if(k==='wake')return 'Woke at '+it.time;
  if(k==='bed')return 'In bed at '+it.time;
  if(k==='mood')return 'Mood '+n(it.v)+' of 5';
  if(k==='sleepQ')return 'Sleep quality '+n(it.v)+' of 5';
  if(k==='study')return 'Study '+n(it.min)+' min'+(it.course?' · '+it.course:'');
  if(k==='cfa')return 'CFA '+n(it.min)+' min';
  if(k==='expense'){
    const amt=n(it.amount)||0,sh=wlShares(it.split);let s=wlUp(it.note)||'Expense';s+=' '+inr(amt);
    if(it.paidBy)return s+', paid by '+wlUp(it.paidBy)+', you owe '+inr(wlNum(it.mine)>=0?wlNum(it.mine):amt);
    if(sh.length){
      if(sh.every(x=>x.amount===sh[0].amount))s+=', '+sh.map(x=>x.person).join(' and ')+(sh.length>1?' owe ':' owes ')+inr(sh[0].amount)+(sh.length>1?' each':'');
      else s+=', '+sh.map(x=>x.person+' owes '+inr(x.amount)).join(', ');
    }
    return s;
  }
  if(k==='income')return 'Income '+inr(n(it.amount)||0)+(it.note?' · '+it.note:'');
  if(k==='repay')return wlUp(it.person)+' paid you '+inr(n(it.amount)||0);
  if(k==='paid')return 'You paid '+wlUp(it.person)+' '+inr(n(it.amount)||0);
  if(k==='poker')return 'Poker · in '+inr(n(it.buyin)||0)+', out '+inr(n(it.cashout)||0);
  if(k==='todo')return 'Todo: '+wlUp(it.title)+(validYmd(it.due)?', due '+wlDue(it.due):'');
  if(k==='deadline')return 'Deadline: '+wlUp(it.title)+(validYmd(it.date)?', '+dlabel(it.date):'');
  if(k==='note')return 'Note: '+String(it.text||'').slice(0,60);
  if(k==='contact')return it.add?'Added contact '+it.name:(it.note?wlUp(it.note):'Spoke to')+' '+it.name;
  if(k==='intern')return 'Intern log: '+(it.matter||it.work);
  return String(it.kind||'Item');
}
const WL_KIND={water:'Water',meal:'Meal',sets:'Lift',cardio:'Cardio',habit:'Habit',weight:'Weight',steps:'Steps',waist:'Waist',wake:'Sleep',bed:'Sleep',mood:'Mood',sleepQ:'Sleep',study:'Study',cfa:'CFA',expense:'Spending',income:'Income',repay:'People',paid:'People',poker:'Poker',todo:'Task',deadline:'Deadline',note:'Note',contact:'Career',intern:'Career'};
function wisprCard(){
  const sv=wlSaved(),qs=wlQuestions();
  if(!sv.length&&!qs.length)return '';
  const t=todayStr(),hide=!!XS.wHide;
  const head='<h2>Added from Wispr<small>'+sv.length+' saved'+(qs.length?' · '+qs.length+' need you':'')+'</small></h2>';
  const tog='<button class="btn sm ghost wi-tog" data-x="wtog" aria-expanded="'+!hide+'">'+(hide?'Show':'Hide')+'</button>';
  let body='';
  if(!hide){
    if(sv.length){
      body+='<div class="lbl wi-lbl">Saved</div><div class="list">'+sv.slice(0,40).map(({k,rec})=>'<div class="li wi-li"><div class="m"><b>'+esc(wlLabel(rec.it))+'</b>'+(rec.d&&rec.d!==t?'<span>'+esc((WL_KIND[rec.it.kind]||'')+' · '+dlabel(rec.d))+'</span>':'')+'</div><button class="btn sm ghost" data-x="wundo" data-k="'+esc(k)+'" aria-label="Undo '+esc(wlLabel(rec.it))+'">Undo</button></div>').join('')+'</div>';
      if(sv.length>1)body+='<div class="pr-bulk"><button class="btn sm" data-x="wundoall">Undo all</button></div>';
    }
    if(qs.length){
      body+='<div class="lbl wi-lbl">Needs you</div><div class="list">'+qs.map(q=>{
        if(q.bad)return '<div class="li pr-li wi-q"><div class="m"><b>Couldn’t save: ‘'+esc(wlLabel(q.it))+'’</b><span>'+esc(q.bad)+'</span></div><div class="pr-acts"><button class="btn sm pri" data-x="wedit" data-k="'+esc(q.k)+'">Edit</button><button class="btn sm ghost" data-x="wskip" data-k="'+esc(q.k)+'">Dismiss</button></div></div>';
        return '<div class="li pr-li wi-q"><div class="m"><b>'+esc(q.ask.question)+'</b></div><div class="pr-acts">'+q.ask.options.map((o,j)=>'<button class="btn sm'+(o&&o.item?'':' ghost')+'" data-x="wopt" data-k="'+esc(q.k)+'" data-o="'+j+'">'+esc(o&&o.label||'Option')+'</button>').join('')+'</div></div>';
      }).join('')+'</div>';
    }
  }
  return '<section class="card hero wi" style="margin-top:14px" id="wispr"><div class="wi-head">'+head+tog+'</div>'+body+'</section>';
}
function wlUndoRec(k,rec){
  (rec.refs||[]).forEach(r=>{
    if(r.col==='entries'){if(state.entries.some(e=>e.id===r.id))delEntry(r.id);else wDel('entries',r.id)}
    else if(r.col==='todos')delTodo(r.id);
    else if(r.col==='academics')delAcad(r.id);
    else if(/^L_/.test(r.col)){const l=r.col.slice(2);LSAVE(l,LL(l).filter(x=>x.id!==r.id))}
  });
  (rec.sets||[]).forEach(s=>{const arr=((day(s.d).lifts||{})[s.slug]||[]).filter(x=>!(x&&x.src===s.s));dbSetDay(s.d,{lifts:{[s.slug]:arr}})});
  (rec.dprev||[]).slice().reverse().forEach(x=>dbSetDay(x.d,x.p));
  if(rec.cprev)LSAVE('contacts',LL('contacts').map(x=>x.id===rec.cprev.id?{...x,last:rec.cprev.last}:x));
}
function wlUndo(keys){
  const reg=wlReg(),patch={};let n=0;
  keys.forEach(k=>{const rec=reg[k];if(!rec||rec.undone)return;try{wlUndoRec(k,rec)}catch(e){console.error(e)}patch[k]={...rec,undone:true,uat:Date.now()};n++});
  if(n)wlRegPut(patch);scheduleRender();return n;
}
const WL_F={water:[['ml','Millilitres','n']],meal:[['name','Name','t'],['kcal','kcal','n'],['p','Protein g','n'],['c','Carbs g','n'],['f','Fat g','n']],sets:[['exercise','Exercise','t']],cardio:[['min','Minutes','n']],habit:[['key','Habit','h']],weight:[['kg','kg','n']],steps:[['n','Steps','n']],waist:[['cm','cm','n']],wake:[['time','Time, HH:MM','t']],bed:[['time','Time, HH:MM','t']],mood:[['v','1 to 5','n']],sleepQ:[['v','1 to 5','n']],study:[['min','Minutes','n'],['course','Course','k']],cfa:[['min','Minutes','n']],expense:[['amount','Amount','n'],['account','Paid from','a'],['category','Category','c'],['note','What for','t']],income:[['amount','Amount','n'],['account','Into','a'],['note','Note','t']],repay:[['person','Who paid you','t'],['amount','Amount','n'],['account','Landed in','a']],paid:[['person','Who you paid','t'],['amount','Amount','n'],['account','Paid from','a']],poker:[['buyin','Bought in','n'],['cashout','Cashed out','n'],['hours','Hours','n'],['note','Note','t']],todo:[['title','Title','t'],['due','Due','d']],deadline:[['title','Title','t'],['date','Date','d'],['course','Course','k']],note:[['text','Note','t']],contact:[['name','Name','t'],['note','Note','t']],intern:[['matter','Matter','t'],['work','What you did','t'],['firm','Firm','t']]};
function wlEditSheet(k,msg){
  const q=wlQuestions().find(x=>x.k===k);if(!q||!q.bad)return;
  const it=(XS.wEd&&XS.wEd[k])||q.it,cfg=C(),fl=WL_F[it.kind];if(!fl)return toast('That item cannot be edited here');
  const sel=(n,l,opts,cur)=>'<label class="fld"><span>'+l+'</span><select name="'+n+'">'+opts.map(([v,t])=>'<option value="'+esc(v)+'"'+(String(v)===String(cur)?' selected':'')+'>'+esc(t)+'</option>').join('')+'</select></label>';
  const f=([n,l,ty])=>{
    const v=it[n]==null?'':it[n];
    if(ty==='a')return sel(n,l,[['','Choose an account']].concat(cfg.accounts.map(a=>[a.id,a.name])),wlAcct(v)||'');
    if(ty==='c')return sel(n,l,cfg.categories.map(c=>[c,c]),cfg.categories.includes(v)?v:'');
    if(ty==='k')return sel(n,l,[['','No course']].concat(Object.keys(COURSES).map(c=>[c,COURSES[c]])),propCourse(v)||'');
    if(ty==='h')return sel(n,l,wlHabitKeys(q.date||todayStr()).map(x=>[x,wlUp(x)]),String(v).toLowerCase());
    return '<label class="fld"><span>'+l+'</span><input type="'+(ty==='n'?'number':ty==='d'?'date':'text')+'" name="'+n+'" value="'+esc(v)+'"'+(ty==='n'?' step="any" inputmode="decimal"':'')+' autocomplete="off"></label>';
  };
  const hasDay=!['todo','deadline'].includes(it.kind);
  sheet('<h2>Edit<small>'+esc(WL_KIND[it.kind]||'Item')+'</small></h2><p class="xnote" role="status">'+esc(msg||('Couldn’t save: '+q.bad))+'</p><form data-xform="wedit" class="stack"><input type="hidden" name="k" value="'+esc(k)+'">'+WL_F[it.kind].map(f).join('')+(hasDay?'<label class="fld"><span>Day</span><input type="date" name="date" value="'+esc(validYmd(it.date)?it.date:(q.date||''))+'"></label>':'')+'<div class="row"><button class="btn pri" type="submit">Save</button><button class="btn" type="button" data-act="sheetclose">Cancel</button></div></form>');
}
function wlEditSave(fd){
  const k=String(fd.get('k')),q=wlQuestions().find(x=>x.k===k);if(!q){closeSheet();return}
  const ed={...q.it};
  (WL_F[ed.kind]||[]).forEach(([n,l,ty])=>{if(!fd.has(n))return;const v=String(fd.get(n)).trim();ed[n]=ty==='n'?(v===''?'':parseFloat(v)):v});
  if(fd.has('date')&&String(fd.get('date')))ed.date=String(fd.get('date'));
  const date=ed.kind==='deadline'||ed.kind==='todo'?q.date:wlDate(ed,{date:q.date});
  const r=wlApplyOne(ed,q.src,date);
  if(!r.ok){(XS.wEd=XS.wEd||{})[k]=ed;wlEditSheet(k,r.err?'Still can’t save: '+r.err:'That needs an answer first');return}
  if(XS.wEd)delete XS.wEd[k];
  wlRegPut({[wlKey(q.src)]:{...r.rec,edited:true}});closeSheet();scheduleRender();toast('Saved',{noUndo:true});
}
function wlOption(k,j){
  const q=wlQuestions().find(x=>x.k===k);if(!q||!q.ask)return;
  const o=q.ask.options[j];if(!o)return;
  const key=wlKey(q.src);
  if(!o.item){wlRegPut({[key]:{at:Date.now(),skipped:true,chosen:o.label||''}});scheduleRender();return}
  const r=wlApplyOne(o.item,q.src,wlDate(o.item,{date:q.date}));
  if(!r.ok){toast(r.err?'Couldn’t save: '+r.err:'That needs an answer first',{noUndo:true});return}
  wlRegPut({[key]:{...r.rec,chosen:o.label||''}});scheduleRender();toast('Saved',{noUndo:true});
}
document.addEventListener('click',ev=>{
  const t=ev.target.closest('[data-x]');if(!t)return;const a=t.dataset.x,k=t.dataset.k;
  if(a==='wtog'){XS.wHide=!XS.wHide;scheduleRender();return}
  if(a==='wundo'){if(wlUndo([k]))toast('Undone',{noUndo:true});return}
  if(a==='wundoall'){const n=wlUndo(wlSaved().map(x=>x.k));if(n)toast('Undid '+n,{noUndo:true});return}
  if(a==='wedit'){wlEditSheet(k);return}
  if(a==='wskip'){wlRegPut({[wlKey((wlQuestions().find(x=>x.k===k)||{}).src||k)]:{at:Date.now(),skipped:true}});scheduleRender();return}
  if(a==='wopt'){wlOption(k,+t.dataset.o);return}
});

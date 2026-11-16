/* Career section layer: hero, sub-nav (Pipeline | People | Writing | Goals | Log), metric-tied goals, internship work log. See DESIGN.md. */
(function(){
  var VIEWS=[['pipe','Pipeline'],['people','People'],['writing','Writing'],['goals','Goals'],['intern','Log']];
  var KINDS=['Mentor','Friend','Recruiter','Family'];
  var METRICS=['none','cfaHours','gymSessions','studyMin','spend','weight','pubs'];
  var METRIC_LABEL={none:'None (update by hand)',cfaHours:'CFA hours',gymSessions:'Gym sessions',studyMin:'Study minutes',spend:'Spend',weight:'Weight',pubs:'Published pieces'};
  var MONTHS={jan:1,feb:2,mar:3,apr:4,may:5,jun:6,jul:7,aug:8,sep:9,oct:10,nov:11,dec:12};
  var MON=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  var CAP=3,STALE=45;

  /* ---- forms: extra fields on contacts and goals (existing records without them keep working) ---- */
  if(!LM.contacts.f.some(function(f){return f[0]==='kind'})){
    var ni=LM.contacts.f.findIndex(function(f){return f[0]==='note'});if(ni<0)ni=LM.contacts.f.length;
    LM.contacts.f.splice(ni,0,['kind','Kind','sel',['Other'].concat(KINDS)],['birthday','Birthday (MM-DD)','text']);
  }
  if(!LM.goals.f.some(function(f){return f[0]==='metric'})){
    var gi=LM.goals.f.findIndex(function(f){return f[0]==='note'});if(gi<0)gi=LM.goals.f.length;
    LM.goals.f.splice(gi,0,['metric','Tied to a logged metric','sel',METRICS],['target','Metric target','num']);
  }

  var SKILLS=['Drafting','Research','Due diligence','Court','Client call','Negotiation','Other'];
  if(!LM.intern)LM.intern={t:'Add an entry',f:[['date','Date','date'],['firm','Firm','sel',['Other']],['matter','Matter or client (keep it generic)','text'],['work','What you did','text'],['learned','What you learned','text'],['with','Worked with','text'],['skill','Skill','sel',SKILLS]]};

  /* ---- style (owned here, tokens from design.css) ---- */
  function addStyle(){
    if(document.getElementById('career-css'))return;
    var s=document.createElement('style');s.id='career-css';
    s.textContent=
      '.cr-cols{display:grid;grid-template-columns:1fr;gap:var(--s4);margin-top:var(--s2)}'+
      '.cr-col{min-width:0}.cr-col h3{margin:0 0 var(--s2);font:600 11px var(--font-body);letter-spacing:.16em;text-transform:uppercase;color:var(--mute);display:flex;justify-content:space-between}'+
      '.cr-card{display:flex;flex-direction:column;gap:var(--s1);padding:var(--s3);margin-bottom:var(--s2);border-radius:var(--r1);background:var(--tint);min-width:0}'+
      '.cr-card .plink{min-height:44px;display:flex;flex-direction:column;justify-content:center;min-width:0}'+
      '.cr-card b{font-weight:600;overflow-wrap:anywhere}.cr-card span.sub{color:var(--mute);font-size:13px;overflow-wrap:anywhere}'+
      '.cr-card .acts{display:flex;gap:var(--s1);align-items:center;flex-wrap:wrap}'+
      '@media (min-width:860px){.cr-cols{grid-template-columns:repeat(5,minmax(0,1fr));gap:var(--s3)}.cr-col.empty-m{display:block}}'+
      '@media (max-width:859px){.cr-col.empty-m{display:none}}'+
      '.cr-pair{display:grid;grid-template-columns:1fr;gap:var(--s4)}'+
      '@media (min-width:860px){.cr-pair{grid-template-columns:1fr 1fr;gap:var(--s5);align-items:start}}'+
      '.cr-pair>.grid,.cr-pair>div{margin:0;min-width:0}'+
      '.cr-note{margin:var(--s2) 0 0;font-size:13px;color:var(--mute)}'+
      '.cr-kinds{display:flex;flex-wrap:wrap;margin-top:var(--s2)}'+
      ''+
      '.in-wk{margin:var(--s4) 0 var(--s1);font:600 11px var(--font-body);letter-spacing:.16em;text-transform:uppercase;color:var(--mute)}'+
      '.in-l{display:block;overflow-wrap:anywhere}.in-l.mute{color:var(--mute);font-size:13px}'+
      '.in-bars{display:grid;gap:var(--s1);margin:var(--s2) 0}.in-bar{display:grid;grid-template-columns:96px 1fr 28px;gap:var(--s2);align-items:center;font-size:13px}'+
      '.in-bar .bar{margin:0}.in-bar .mono{text-align:right}'+
      '.in-ppl{display:flex;flex-wrap:wrap;gap:var(--s1);margin-top:var(--s2)}'+
      '.in-cv{margin:var(--s2) 0;padding-left:18px;display:grid;gap:var(--s2)}.in-cv li{overflow-wrap:anywhere}'+
      '.in-cv-h{margin:var(--s3) 0 0;font-weight:600}';
    document.head.appendChild(s);
  }
  addStyle();

  /* ---- helpers ---- */
  function esc2(s){return esc(s)}
  function inner(html){return String(html).replace(/^<div class="grid w2">/,'').replace(/<\/div>$/,'')}
  function getView(){
    var v=state.lifeView;
    if(!v){try{v=localStorage.getItem('ld.lifeView')}catch(e){}}
    return VIEWS.some(function(x){return x[0]===v})?v:'pipe';
  }
  function setView(v){
    state.lifeView=v;try{localStorage.setItem('ld.lifeView',v)}catch(e){}
  }
  function parseStart(role){
    var m=/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+(20\d\d)\b/i.exec(role||'');
    return m?{y:+m[2],m:MONTHS[m[1].toLowerCase()]}:null;
  }
  function startLabel(s){return MON[s.m-1]+' '+s.y}
  function startIso(s){return s.y+'-'+('0'+s.m).slice(-2)+'-01'}
  function isOpen(r){return r.stage!=='Closed'}

  /* ---- hero ---- */
  function heroHtml(){
    var t=todayStr(),P=LL('pipe'),open=P.filter(isOpen);
    var overdue=open.filter(function(r){return r.next&&diff(r.next,t)<0}).length;
    var stale=LL('contacts').filter(function(r){return !r.last||diff(t,r.last)>STALE}).length;
    var offers=P.filter(function(r){return r.stage==='Offer'});
    var cands=[];
    open.forEach(function(r){if(r.next)cands.push({d:r.next,title:r.firm,detail:(diff(r.next,t)<0?'Follow-up overdue since ':'Follow up by ')+dlabel(r.next),over:diff(r.next,t)<0})});
    offers.forEach(function(r){var s=parseStart(r.role);if(s&&startIso(s)>=t)cands.push({d:startIso(s),title:r.firm,detail:'Internship, '+startLabel(s),offer:r.firm})});
    LL('pubs').forEach(function(r){if(r.due&&r.stage!=='Published')cands.push({d:r.due,title:r.title,detail:'Writing due '+dlabel(r.due),over:diff(r.due,t)<0})});
    cands.sort(function(a,b){return a.d<b.d?-1:a.d>b.d?1:0});
    /* the title is the name alone (it must stay on two lines at 390); the date and detail go in the sub */
    var top=cands[0],title=top?top.title:'Pipeline';
    var parts=offers.filter(function(r){return !top||top.offer!==r.firm}).map(function(r){var s=parseStart(r.role);return r.firm+(s?' '+startLabel(s):'')});
    var sub=top&&top.detail?top.detail+(parts.length?' · Also: '+parts.join(' · '):''):parts.length?'Offers: '+parts.join(' · '):'';
    var cur=currentIntern();if(cur)sub=cur.firm+': '+cur.n+(cur.n===1?' entry':' entries')+' this week';
    var chips=[];
    if(overdue)chips.push({text:overdue+' overdue follow-up'+(overdue>1?'s':''),tone:'bad'});
    if(stale)chips.push({text:stale+' contact'+(stale>1?'s':'')+' not touched in '+STALE+' d',tone:'warn'});
    return secHero({scene:'ridge',eyebrow:'Career · Banking & Finance',title:title,number:String(open.length),unit:'open',sub:sub,chips:chips});
  }

  /* ---- pipeline ---- */
  function pipeView(){
    var P=LL('pipe'),t=todayStr(),st=STAGES.pipe;
    var cols=st.map(function(s){
      var rows=P.filter(function(r){return (st.indexOf(r.stage)<0?st[0]:r.stage)===s});
      var cards=rows.map(function(r){
        return '<div class="cr-card"><div class="m plink" role="button" tabindex="0" data-act="ledit" data-l="pipe" data-id="'+esc(r.id)+'"><b>'+esc2(r.firm)+'</b><span class="sub">'+esc2(r.role||'')+(r.note?' · '+esc2(r.note):'')+'</span></div>'+
          ((fuRow(r)||stepBtn('pipe',r))?'<div class="acts">'+fuRow(r)+stepBtn('pipe',r)+'</div>':'')+'</div>';
      }).join('');
      return '<div class="cr-col'+(rows.length?'':' empty-m')+'" data-stage="'+s+'"><h3><span>'+s+'</span><span>'+rows.length+'</span></h3>'+(cards||'')+'</div>';
    }).join('');
    var due=P.filter(function(r){return isOpen(r)&&r.next&&diff(r.next,t)<=7}).length;
    return '<section class="card"><h2>Pipeline<small>'+P.filter(isOpen).length+' open'+(due?' · '+due+' follow-up'+(due>1?'s':'')+' due':'')+'</small></h2>'+
      (P.length?'<div class="cr-cols">'+cols+'</div>':emptyState('Add the firms you are targeting and a follow-up date for each.'))+
      addBtn('pipe','Add firm')+'</section>';
  }

  /* ---- people ---- */
  function peopleView(){
    var t=todayStr(),all=LL('contacts'),kind=state.lifeKind||'';
    var rows=all.filter(function(r){return !kind||r.kind===kind}).sort(function(a,b){return (a.last||'')<(b.last||'')?-1:(a.last||'')>(b.last||'')?1:0});
    var mm=t.slice(5,7);
    var bd=all.filter(function(r){return r.birthday&&r.birthday.slice(0,2)===mm}).sort(function(a,b){return a.birthday<b.birthday?-1:1});
    var chips='<div class="cr-kinds" role="group" aria-label="Filter by kind"><button class="chip" data-act="lkind" data-v="" aria-pressed="'+(!kind)+'">All</button>'+
      KINDS.map(function(k){return '<button class="chip" data-act="lkind" data-v="'+k+'" aria-pressed="'+(kind===k)+'">'+k+'</button>'}).join('')+'</div>';
    var list=rows.length?'<div class="list">'+rows.map(function(r){
      var n=r.last?diff(t,r.last):null;
      return lrow('contacts',r,r.name,esc2(r.firm||'')+(r.kind&&r.kind!=='Other'?(r.firm?' · ':'')+esc2(r.kind):'')+(r.note?' · '+esc2(r.note):''),
        '<div style="text-align:right"><span class="pill '+(n==null||n>STALE?'warn':'')+'">'+(n==null?'never':n===0?'today':n+' d ago')+'</span><div><button class="btn sm ghost" style="margin-top:4px" data-act="ltouch" data-id="'+esc(r.id)+'">Touched today</button></div></div>');
    }).join('')+'</div>':emptyState(all.length?'Nobody tagged '+kind+' yet.':'Add people to keep in touch with. Anyone you have not spoken to for '+STALE+' days is flagged.');
    var bdCard='<section class="card quiet" id="cr-bd"><h2>Birthdays this month</h2>'+(bd.length?'<div class="list">'+bd.map(function(r){
      var d=+r.birthday.slice(3,5);return '<div class="li"><div class="m"><b>'+esc2(r.name)+'</b><span>'+d+' '+MON[+mm-1]+'</span></div></div>';
    }).join('')+'</div>':'<p class="cr-note">None this month. Add a birthday (MM-DD) to a contact to see it here.</p>')+'</section>';
    return '<div class="grid w2"><section class="card"><h2>People<small>last touch</small></h2>'+chips+list+addBtn('contacts','Add contact')+'</section>'+bdCard+'</div>';
  }

  /* ---- writing ---- */
  function writingView(){
    return '<div class="cr-pair">'+inner(lifePubs())+inner(lifeBooks())+'</div>';
  }

  /* ---- goals ---- */
  function qRange(q){
    var y=+q.slice(0,4),n=+q.slice(6),m1=(n-1)*3+1,m2=m1+2;
    var p=function(m){return ('0'+m).slice(-2)};
    return {a:y+'-'+p(m1)+'-01',b:y+'-'+p(m2)+'-31'};
  }
  function inQ(k,r){return k>=r.a&&k<=r.b}
  /* returns {pct, text} for a metric goal, or null for a manual one */
  function goalCalc(g){
    var m=g.metric;if(!m||m==='none'||!(+g.target>0))return null;
    var T=+g.target,r=qRange(g.q||qOf(todayStr())),days=state.days||{},keys=Object.keys(days).filter(function(k){return inQ(k,r)}).sort();
    var v,txt;
    if(m==='cfaHours'){v=keys.reduce(function(s,k){return s+(+days[k].cfaMin||0)},0)/60;txt=(Math.round(v*10)/10)+' of '+T+' h'}
    else if(m==='gymSessions'){v=keys.filter(function(k){return days[k].habits&&days[k].habits.gym}).length;txt=v+' of '+T+' sessions'}
    else if(m==='studyMin'){v=keys.reduce(function(s,k){return s+(+days[k].studyMin||0)},0);txt=v+' of '+T+' min'}
    else if(m==='spend'){v=monthSpend(todayStr().slice(0,7)).total;txt=inr(v)+' of '+inr(T)+' this month'}
    else if(m==='weight'){
      var all=Object.keys(days).filter(function(k){return days[k].weight!=null}).sort();
      if(!all.length)return {pct:0,text:'No weight logged yet · target '+T+' kg'};
      v=+days[all[all.length-1]].weight;
      var inq=all.filter(function(k){return inQ(k,r)}),st=inq.length?+days[inq[0]].weight:v;
      var pc=st===T?(v===T?100:0):clamp(Math.round((st-v)/(st-T)*100),0,100);
      return {pct:pc,text:v+' kg now, target '+T+' kg'};
    }
    else if(m==='pubs'){v=LL('pubs').filter(function(p){return p.stage==='Submitted'||p.stage==='Published'}).length;txt=v+' of '+T+' submitted or published'}
    else return null;
    return {pct:clamp(Math.round(v/T*100),0,100),text:txt};
  }
  function goalPct(g){var c=goalCalc(g);return c?c.pct:(+g.pct||0)}
  function goalsView(){
    var t=todayStr(),cq=qOf(t),G=LL('goals').slice().sort(function(a,b){return (a.q===cq?0:1)-(b.q===cq?0:1)||(a.q<b.q?-1:a.q>b.q?1:0)});
    var cur=G.filter(function(g){return g.q===cq}),avg=cur.length?Math.round(sum(cur,goalPct)/cur.length):0;
    var lastDay=new Date(+cq.slice(0,4),+cq.slice(6)*3,0),left=Math.round((lastDay-parse(t))/864e5);
    var review=left<=14&&cur.length?'<section class="card"><h2>Quarterly review<small>'+cq+' ends in '+left+' d</small></h2><p style="margin:6px 0 0">'+cur.filter(function(g){return goalPct(g)>=100}).length+' of '+cur.length+' goals done, average '+avg+'%. Close, carry over, or drop each one before the quarter ends.</p></section>':'';
    var full=cur.length>=CAP;
    var rows=G.map(function(g){
      var c=goalCalc(g),p=goalPct(g);
      return lrow('goals',g,g.title,esc2(g.q)+(c?' · '+esc2(c.text):'')+(g.note?' · '+esc2(g.note):''),
        '<div style="min-width:120px;text-align:right"><span class="mono">'+p+'%</span><div class="bar '+(p>=100&&g.metric!=='spend'?'good':'')+'" style="margin:6px 0"><i style="width:'+p+'%"></i></div>'+(c?'':'<button class="btn sm ghost" data-act="gplus" data-id="'+esc(g.id)+'">+10%</button>')+'</div>');
    }).join('');
    var add=full?'<div class="row" style="margin-top:12px"><button class="btn sm" disabled aria-disabled="true">Add goal</button></div><p class="cr-note" id="cr-goalcap">'+CAP+' goals is the limit for '+cq+'. Finish or remove one to add another.</p>':addBtn('goals','Add goal');
    return '<div class="grid w2">'+review+'<section class="card"><h2>Goals<small>'+cq+' average '+avg+'%</small></h2>'+(G.length?'<div class="list">'+rows+'</div>':emptyState('Set up to three goals for the quarter. Tie one to a logged metric and it tracks itself.'))+add+'</section></div>';
  }

  /* ---- internship log ---- */
  function internRows(){return LL('intern').slice().sort(function(a,b){return (a.date||'')<(b.date||'')?1:(a.date||'')>(b.date||'')?-1:0})}
  function internFirms(){
    return LL('pipe').filter(function(r){return r.stage==='Offer'||r.stage==='Closed'}).map(function(r){return r.firm}).filter(function(f,i,a){return f&&a.indexOf(f)===i}).concat(['Other']);
  }
  function weekStart(d){var x=parse(d),k=(x.getDay()+6)%7;x.setDate(x.getDate()-k);return fmt(x)}
  function names(rows){
    var seen={},out=[];
    rows.forEach(function(r){String(r['with']||'').split(/[,;&]|\band\b/i).forEach(function(n){n=n.trim();var k=n.toLowerCase();if(n&&!seen[k]){seen[k]=1;out.push(n)}})});
    return out;
  }
  function matterCount(rows){
    var seen={},n=0;rows.forEach(function(r){var m=(r.matter||'').trim().toLowerCase();if(!m)n++;else if(!seen[m]){seen[m]=1;n++}});return n;
  }
  /* the internship running now: a pipeline row whose start/end span today, else the firm with log entries in the last 14 days */
  function currentIntern(){
    var t=todayStr(),P=LL('pipe').filter(function(r){return r.start&&r.end&&r.start<=t&&t<=r.end});
    var firm=P.length?P[0].firm:'';
    var rows=LL('intern'),ws=weekStart(t);
    if(!firm){
      var rec=rows.filter(function(r){return r.date&&r.date<=t&&diff(t,r.date)<=14}).sort(function(a,b){return a.date<b.date?1:-1});
      if(!rec.length)return null;firm=rec[0].firm;
    }
    return {firm:firm,n:rows.filter(function(r){return r.firm===firm&&r.date>=ws&&r.date<=t}).length};
  }
  function internView(){
    var all=internRows(),firm=state.internFirm||'';
    if(firm&&!all.some(function(r){return r.firm===firm}))firm=state.internFirm='';
    var rows=all.filter(function(r){return !firm||r.firm===firm});
    var firms=all.map(function(r){return r.firm}).filter(function(f,i,a){return f&&a.indexOf(f)===i});
    var chips=firms.length>1?'<div class="cr-kinds" role="group" aria-label="Filter by firm"><button class="chip" data-act="infirm" data-v="" aria-pressed="'+(!firm)+'">All</button>'+firms.map(function(f){return '<button class="chip" data-act="infirm" data-v="'+esc(f)+'" aria-pressed="'+(firm===f)+'">'+esc2(f)+'</button>'}).join('')+'</div>':'';
    var summary='';
    if(rows.length){
      var by={};rows.forEach(function(r){var k=r.skill||'Other';by[k]=(by[k]||0)+1});
      var keys=Object.keys(by).sort(function(a,b){return by[b]-by[a]||(a<b?-1:1)}),mx=by[keys[0]];
      var ppl=names(rows);
      summary='<section class="card" id="in-sum"><h2>Summary<small>'+(firm?esc2(firm):'all firms')+'</small></h2>'+
        '<p class="cr-note" style="margin-top:0">'+rows.length+(rows.length===1?' entry':' entries')+' across '+matterCount(rows)+(matterCount(rows)===1?' matter':' matters')+'</p>'+
        '<div class="in-bars">'+keys.map(function(k){return '<div class="in-bar" data-skill="'+esc(k)+'"><span>'+esc2(k)+'</span><div class="bar"><i style="width:'+Math.round(by[k]/mx*100)+'%"></i></div><span class="mono">'+by[k]+'</span></div>'}).join('')+'</div>'+
        (ppl.length?'<div class="cr-note">Worked with</div><div class="in-ppl" id="in-ppl">'+ppl.map(function(n){return '<button class="chip" data-act="inperson" data-n="'+esc(n)+'">'+esc2(n)+'</button>'}).join('')+'</div>':'')+
        '<div class="row" style="margin-top:12px"><button class="btn sm" data-act="incv">CV lines</button></div></section>';
    }
    var list='',wk='';
    rows.forEach(function(r){
      var w=r.date?weekStart(r.date):'';
      if(w!==wk){wk=w;list+='<div class="in-wk">'+(w?'Week of '+esc(dlabel(w)):'No date')+'</div>'}
      var sub='<span class="in-l">'+esc2(r.work||'')+'</span>'+(r.learned?'<span class="in-l mute">Learned: '+esc2(r.learned)+'</span>':'')+(r['with']?'<span class="in-l mute">With '+esc2(r['with'])+'</span>':'');
      list+='<div class="list">'+lrow('intern',r,(r.date?dlabel(r.date):'')+(r.matter?' · '+r.matter:'')+(firm?'':(r.firm?' · '+r.firm:'')),sub,'<span class="pill">'+esc2(r.skill||'Other')+'</span>')+'</div>';
    });
    var body='<section class="card"><h2>Work log<small>feeds your CV</small></h2>'+chips+
      (rows.length?list:emptyState('Add a line after each task: the matter (kept generic), what you did, what you learned. It turns into CV bullets later.'))+addBtn('intern','Add entry')+'</section>';
    return '<div class="grid w2">'+summary+body+'</div>';
  }
  var VERB={'Drafting':'drafted','Research':'researched','Due diligence':'worked on due diligence','Court':'attended court','Client call':'joined client calls','Negotiation':'supported negotiations','Other':'handled other tasks'};
  function clip(x,n){x=String(x||'').trim().replace(/[.;\s]+$/,'');return x.length>n?x.slice(0,n-1).replace(/\s+\S*$/,'')+'...':x}
  function uniq(a){return a.filter(function(x,i){return x&&a.indexOf(x)===i})}
  function cvLines(){
    var rows=LL('intern'),firms=uniq(rows.map(function(r){return r.firm})),out=[];
    firms.forEach(function(f){
      var R=rows.filter(function(r){return r.firm===f}).sort(function(a,b){return a.date<b.date?-1:1}),by={};
      R.forEach(function(r){var k=r.skill||'Other';(by[k]=by[k]||[]).push(r)});
      var keys=Object.keys(by).sort(function(a,b){return by[b].length-by[a].length||(a<b?-1:1)});
      var mc=matterCount(R),ppl=names(R),b=[];
      var main=keys.slice(0,2).map(function(k){return k.toLowerCase()}).join(' and ');
      b.push('Worked on '+mc+(mc===1?' matter':' matters')+' at '+f+' across '+R.length+(R.length===1?' logged task':' logged tasks')+', mainly '+main+(ppl.length?'; worked with '+ppl.length+(ppl.length===1?' person':' people'):'')+'.');
      keys.slice(0,3).forEach(function(k){
        var g=by[k],w=uniq(g.map(function(r){return clip(r.work,70)})).slice(0,2);
        b.push(k+' ('+g.length+(g.length===1?' task':' tasks')+', '+matterCount(g)+(matterCount(g)===1?' matter':' matters')+')'+(w.length?': '+w.join('; '):'')+'.');
      });
      var L=uniq(R.map(function(r){return clip(r.learned,70)})).slice(0,3);
      if(L.length)b.push('Learned: '+L.join('; ')+'.');
      if(ppl.length&&b.length<6)b.push('Worked with '+ppl.slice(0,5).join(', ')+'.');
      out.push({firm:f,range:R[0].date+(R[R.length-1].date!==R[0].date?' to '+R[R.length-1].date:''),b:b.slice(0,6)});
    });
    return out;
  }
  function cvText(c){return c.map(function(x){return x.firm+'\n'+x.b.map(function(l){return '- '+l}).join('\n')}).join('\n\n')}
  function cvSheet(){
    var c=cvLines();
    if(!c.length){toast('Add a log entry first');return}
    var scope=state.internFirm?c.filter(function(x){return x.firm===state.internFirm}):c;
    state.cvText=cvText(scope);
    sheet('<h2>CV lines</h2><p class="cr-note" style="margin-top:0">Draft assembled from your log. Edit the wording before it goes on a CV.</p>'+
      scope.map(function(x){return '<div class="in-cv-h">'+esc2(x.firm)+'<span class="cr-note"> · '+esc(x.range)+'</span></div><ul class="in-cv">'+x.b.map(function(l){return '<li>'+esc2(l)+'</li>'}).join('')+'</ul>'}).join('')+
      '<div class="row"><button class="btn pri" data-act="incopy">Copy</button><button class="btn" data-act="sheetclose">Close</button></div>');
  }
  function copyText(txt){
    var ok=function(){toast('Copied')},fail=function(){toast('Copy was blocked by the browser')};
    try{navigator.clipboard.writeText(txt).then(ok,function(){legacy()})}catch(e){legacy()}
    function legacy(){try{var ta=document.createElement('textarea');ta.value=txt;document.body.appendChild(ta);ta.select();document.execCommand('copy');ta.remove();ok()}catch(e2){fail()}}
  }

  /* ---- section ---- */
  window.vLife=function(){
    addStyle();
    var v=getView();
    setTimeout(function(){var b=document.querySelector('.subnav [aria-selected=true]');try{b&&b.scrollIntoView({inline:'center',block:'nearest'})}catch(e){}},0);
    var body=v==='people'?peopleView():v==='writing'?writingView():v==='goals'?goalsView():v==='intern'?internView():pipeView();
    return heroHtml()+subNav(VIEWS,v,'lifeview')+(v==='people'||v==='goals'||v==='intern'?body:'<div class="grid">'+body+'</div>');
  };

  /* ---- validation on save: birthday format, goal cap ---- */
  var origSheet=window.lsheet;
  window.lsheet=function(k,id){
    if(k==='goals'){
      origSheet(k,id);
      /* the stored values stay cfaHours, gymSessions ...; only the visible text changes */
      document.querySelectorAll('form[data-form=lrec][data-l=goals] select[name=metric] option').forEach(function(o){var v=o.value;o.value=v;if(METRIC_LABEL[v])o.textContent=METRIC_LABEL[v]});
      return;
    }
    if(k!=='intern')return origSheet(k,id);
    var opts=internFirms(),cur=(LL('intern').find(function(x){return x.id===id})||{}).firm;
    if(cur&&opts.indexOf(cur)<0)opts.unshift(cur);
    LM.intern.f[1][3]=opts;
    origSheet(k,id);
    if(!id){
      var f=document.querySelector('form[data-form=lrec][data-l=intern]');if(!f)return;
      f.elements.date.value=state.date||todayStr();
      var c=currentIntern(),pick=state.internFirm||(c&&c.firm)||'';
      if(pick&&opts.indexOf(pick)>=0)f.elements.firm.value=pick;
    }
  };
  var origSave=window.lsave;
  window.lsave=function(k,f,id){
    var fd=new FormData(f);
    if(k==='contacts'){
      var b=String(fd.get('birthday')||'').trim();
      if(b&&!/^(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(b)){toast('Birthday must look like 03-27 (month-day)');return false}
    }
    if(k==='intern'&&!String(fd.get('work')||'').trim()){toast('Say briefly what you did');return false}
    if(k==='goals'){
      var q=String(fd.get('q')||''),n=LL('goals').filter(function(g){return g.q===q&&g.id!==id}).length;
      if(q&&n>=CAP){toast(CAP+' goals is the limit for '+q);return false}
      var mt=String(fd.get('metric')||'none'),tg=parseFloat(fd.get('target'));
      if(mt!=='none'&&!(tg>0)){toast('Set a target above 0 for the metric');return false}
    }
    return origSave(k,f,id);
  };

  /* ---- clicks ---- */
  document.addEventListener('click',function(ev){
    var t=ev.target.closest&&ev.target.closest('[data-act]');if(!t)return;
    var a=t.dataset.act;
    if(a==='lifeview'){setView(t.dataset.v);render();return}
    if(a==='ls'){var m={career:'pipe',goals:'goals',pubs:'writing',books:'writing'}[t.dataset.v];if(m){setView(m);render()}return}
    if(a==='infirm'){state.internFirm=t.dataset.v||'';render();return}
    if(a==='incv'){cvSheet();return}
    if(a==='incopy'){copyText(state.cvText||'');return}
    if(a==='inperson'){
      var n=t.dataset.n,ex=LL('contacts').find(function(c){return String(c.name||'').toLowerCase()===n.toLowerCase()});
      if(ex){lsheet('contacts',ex.id);return}
      lsheet('contacts','');var nf=document.querySelector('form[data-form=lrec][data-l=contacts]');
      if(nf){nf.elements.name.value=n;var row=LL('intern').find(function(r){return names([r]).indexOf(n)>=0});if(row&&nf.elements.firm&&row.firm!=='Other')nf.elements.firm.value=row.firm}
      return;
    }
    if(a==='lkind'){state.lifeKind=t.dataset.v||'';render();return}
    if(a==='lnew'&&t.dataset.l==='goals'){
      var cq=qOf(todayStr());
      if(LL('goals').filter(function(g){return g.q===cq}).length>=CAP){ev.stopImmediatePropagation();toast(CAP+' goals is the limit for '+cq)}
    }
  },true);
})();

"""Builds app/index.html from the original dashboard page: same feature logic, new platform layer and design."""
import re,sys
s=open('./tools/old.html',encoding='utf8').read()
def rep(old,new,count=1):
    global s
    n=s.count(old)
    assert n==count,f'expected {count} of {old[:70]!r}, found {n}'
    s=s.replace(old,new)
def rex(pat,new,count=1,flags=0):
    global s
    s,n=re.subn(pat,new,s,flags=flags)
    assert n==count,f'expected {count} of /{pat[:70]}/, found {n}'

EMBLEM='<svg class="crest" viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-linecap="round" role="img" aria-label="Life Dashboard"><circle cx="24" cy="24" r="21.5" stroke-width="1.4"/><path d="M15.500 27.500a8.500 8.500 0 0 1 17 0" stroke-width="1.5"/><path d="M7 27.500h34" stroke-width="1.5"/><path d="M16.500 33h15" stroke-width="1.1" opacity=".7"/><path d="M20.500 38h7" stroke-width="1.1" opacity=".45"/></svg>'

# ---- document head: installable, offline fonts, new stylesheet
i=s.index('<title>Life Dashboard</title>');j=s.index('<style>',i)
head='''<title>Life Dashboard</title>
<meta name="theme-color" content="#0b0c0c">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="Dashboard">
<link rel="manifest" href="manifest.webmanifest">
<link rel="icon" href="icons/icon-192.png">
<link rel="apple-touch-icon" href="icons/apple-touch-icon.png">
'''
s=s[:i]+head+s[j:]
# the artifact wrapper's first lines
s=s.replace('<!doctype html><html><head><meta charset=utf8>','<!doctype html><html lang="en"><head><meta charset="utf-8">',1)
k=s.index('<script>')
css_end=s.rindex('</style>',0,k)
css=s[:css_end]
css=css.replace('rgba(201,168,106,','rgba(var(--accent-rgb),')
s=css+s[css_end:]
rep('</head><body>','')
rep('</style>\n\n<canvas id="wall"','</style>\n<link rel="stylesheet" href="theme.css">\n</head><body>\n<canvas id="wall"')
rep('<script>\n','<script src="store.js"></script>\n<script src="reminders-core.js"></script>\n<script>\n') if s.count('<script>\n')==1 else rep('<script>','<script src="store.js"></script>\n<script src="reminders-core.js"></script>\n<script>')
rep('boot();\n</script>','</script>\n<script src="extra.js"></script>\n<script>boot();</script>')

# ---- emblem
rex(r"const CREST='<svg class=\"crest\".*?</svg>';",lambda m:"const CREST='"+EMBLEM+"';",flags=re.S)
rep('>Quick add</button>','>Log</button>')
rep('aria-label="Quick add"','aria-label="Log something"')

# ---- navigation: Body holds Train and Fuel; Career is the old Career and life
rep("state.view=t.dataset.v;if(state.view==='poker')","state.view=t.dataset.v;if(state.view==='body')state.view=state.bodyView||'train';if(state.view==='poker')")
rep("$('#app').innerHTML=({life:vLife,widget:vWidget,today:vToday,train:vTrain,fuel:vFuel,money:vMoney,poker:vPoker,study:vStudy,progress:vProgress})[v]();","$('#app').innerHTML=xWrap(v,({life:vLife,widget:vWidget,today:vToday,train:vTrain,fuel:vFuel,money:vMoney,poker:vPoker,study:vStudy,progress:vProgress})[v]());")
rep("const names={life:'Career and life',","const names={life:'Career',")
rep("""'<div class="row" style="margin-top:14px"><button class="btn sm ghost" data-act="tab" data-v="today">‹ Back to Today</button></div><div class="chips" role="group" aria-label="Section" style="margin-top:12px">'+LSEC""","""'<div class="chips" role="group" aria-label="Section" style="margin-top:14px">'+LSEC""")

# ---- water is one running total per day (old per-sip entries stay and still count)
rep("water:sum(entriesOn(d,'water'),e=>+e.ml||0)};","water:Math.max(0,sum(entriesOn(d,'water'),e=>+e.ml||0)+(+day(d).water||0))};")
rep("""function addEntry(e){
  const id=uid();""","""function addEntry(e){
  if(e.type==='water'){
    const legacy=sum(entriesOn(e.date,'water'),x=>+x.ml||0),cur=+day(e.date).water||0,next=Math.max(-legacy,cur+(+e.ml||0)),delta=next-cur;
    if(!delta)return null;
    dbSetDay(e.date,{water:next});
    const wid='water:'+e.date+':'+delta;if(Date.now()-_addedAt>1500)_added=[];_added.push(wid);_addedAt=Date.now();
    return wid;
  }
  const id=uid();""")
rep("""function delEntry(id){
""","""function delEntry(id){
  if(String(id).indexOf('water:')===0){const p=String(id).split(':');dbSetDay(p[1],{water:(+day(p[1]).water||0)-(+p[2])});return}
""")
rep("fn=()=>{ids.forEach(id=>{if(state.entries.some(e=>e.id===id))delEntry(id)})}","fn=()=>{ids.forEach(id=>{if(String(id).indexOf('water:')===0||state.entries.some(e=>e.id===id))delEntry(id)})}")
rep("if(ml<0){const w=entriesOn(d,'water').sort((x,y)=>y.ts-x.ts)[0];if(w)delEntry(w.id)}else addEntry({type:'water',ml,date:d});return}","addEntry({type:'water',ml,date:d});return}")

# ---- Today at a glance: deadline, habits left, water and protein
rep("""+chipBtn('Study '+mins+' / '+T.studyMin+' min · +15','nudge','data-key="studyMin" data-n="15" aria-label="Add 15 minutes of study"',mins>=T.studyMin)+chipBtn('Safe to spend '+inr(Math.max(0,safeSpend().leftToday)),'tab','data-v="money" aria-label="Open money"',safeSpend().leftToday>0)+'</div></div>""","""+'</div></div>""")
rep("ring(H.score,'var(--accent)',Math.round(H.score*100)+'%',H.done+' of '+H.total,96)","ring(H.score,'var(--accent)',Math.round(H.score*100)+'%',(H.total-H.done)?(H.total-H.done)+' habits left':'all done',96)")

# ---- wallpaper: strength, live on Today only, own photos
rep("const live=LOOK.motion==='live'&&!reduce&&!document.hidden;","const live=(LOOK.motion==='live'||(LOOK.motion==='mix'&&state.view==='today'))&&!reduce&&!document.hidden;")
rep("WALL.scene=wallPrep(name);cv.style.opacity=1;","WALL.scene=wallPrep(name);cv.style.opacity=WALLOP();")
rep("[['live','Live'],['still','Still'],['off','Off']]","[['mix','Live on Today'],['live','Live everywhere'],['still','Still'],['off','Off']]")
rep("""   '<button class="btn pri" data-act="sheetclose">Done</button></div>');
}

function foodChips(){""","""   lookExtra()+'<button class="btn pri" data-act="sheetclose">Done</button></div>');
}

function foodChips(){""")
rep("#wall{object-fit:cover;object-position:50% 55%;opacity:1;","#wall{object-fit:cover;object-position:50% 55%;opacity:var(--wallop);")

# ---- photos come from the local store instead of the artifact's blob path
n=s.count('src="/_blob/\'+esc(')
assert n>=1
s=re.sub(r'src="/_blob/\'\+esc\(([\w.]+)\)\+\'"',r'''src="'+LD.assets.url(\1)+'"''',s)
assert '/_blob/' not in s, 'blob path left'

# ---- menu: reminders, cloud, semester, install
rep("""'<button class="btn" data-act="data">Data and backup</button>'+""","""'<button class="btn" data-act="data">Data and backup</button>'+xMenu()+""")
rep("const cshort=c=>(COURSES[c]||c)","const cshort=c=>(window.XSHORT&&XSHORT[c])||(COURSES[c]||c)")

# ---- career facts as starting rows (shown until the list is edited)
rex(r"const LSEED=\{pipe:\[.*?\]\};","const LSEED={pipe:[{id:'lks',firm:'Lakshmikumaran & Sridharan',role:'Commercial Litigation internship, Dec 2026 to Jan 2027',stage:'Offer',next:'',note:'Secured'},{id:'jsa',firm:'JSA',role:'Banking & Finance internship, June 2027',stage:'Offer',next:'',note:'Secured'},{id:'cam',firm:'Cyril Amarchand Mangaldas',role:'Internship application',stage:'Applied',next:'',note:'In progress'},{id:'sam',firm:'Shardul Amarchand Mangaldas',role:'Internship application',stage:'Applied',next:'',note:'In progress'}]};",flags=re.S)

# ---- no personal balances in the public code: his real accounts arrive through the import
rep("opening:849.66","opening:null")
rep("opening:52152.97","opening:null")

# ---- wording that referred to the Claude artifact
s=s.replace("Without Claude I can read short commands","I can read short commands")

# ---- fixes (task A1)
# recurring items post in local-only mode too (the old guard waited for the artifact database)
rep("function runRecurring(){\n  if(!state.db)return;\n","function runRecurring(){\n")
# poker "I paid" settlements are an outflow with a category, not a transfer to nowhere
rep("{type:'txn',kind:'transfer',amount:a,category:'Transfer',account:acc,note:'Poker: paid at '+nm,date:d}","{type:'txn',kind:'expense',amount:a,category:'Poker and gambling',account:acc,note:'Poker settlement to '+nm,date:d}")
rep("{type:'txn',kind:'transfer',amount:amt,category:'Transfer',account:acc,note:'Poker: paid '+p,date:d}","{type:'txn',kind:'expense',amount:amt,category:'Poker and gambling',account:acc,note:'Poker settlement to '+p,date:d}")
# stamps ("I'm up", "In bed now") go to the date on screen, like every other form
rep("const td=todayStr(),prev=day(td)[t.dataset.key]||null;","const td=d,prev=day(td)[t.dataset.key]||null;")
# focus timer remembers the date on screen and the chosen course (extra.js logs it)
rep("state.focus={start:Date.now(),end:Date.now()+m*60000,min:m};","state.focus={start:Date.now(),end:Date.now()+m*60000,min:m,date:state.date,course:state.focusCourse||''};")
# one CFA exam date and hours goal, editable in Study
rep("const DEFAULT_CFG={","const DEFAULT_CFG={cfaDate:'2027-08-15',cfaHours:300,")
rep("const cfaDays=diff('2027-08-15',t);","const cfaDate=C().cfaDate,cfaDays=diff(cfaDate,t);")
rep("Exam in August 2027. Daily target","Exam on '+dlabel(cfaDate)+'. Daily target")
# old CFA card read a 'cfa' entry type that is never stored; minutes live on days.cfaMin
rep("const wk=sum(state.entries.filter(e=>e.type==='cfa'&&e.date>=addDays(t,-6)&&e.date<=t),e=>+e.min||0);","let wk=0;for(let i=0;i<7;i++)wk+=+day(addDays(t,-i)).cfaMin||0;")
# the plan's deload is week 4
rep("if(wk>=c.planWeeks&&wk<=c.planWeeks+0)o+=","if(wk===4)o+=")
# wording: no assistant persona in what he sees
rep("/* Max's reference table:","/* Reference table:")
rep("return 'You are Max, a certified","return 'You are a certified")
rep("Photos hide oil and sugar, so Max leans high.","Photos hide oil and sugar, so estimates can run high.")
rep("<h2>Log a meal<small>Max works out every item</small></h2>","<h2>Log a meal<small>Estimated per item</small></h2>")
rep("Estimates need the page’s Claude permission, which is not available right now. You can still enter numbers yourself below.","Type what you ate and tap Estimate, or add a food below.")
rep("(e.busy?'Max is calculating…':'Calculate with Max')","(e.busy?'Estimating…':'Estimate')")
rep('<span class="lbl">Max’s estimate</span>','<span class="lbl">Estimate</span>')
rep("<h2>Quick add<small>Max’s reference portions</small></h2>","<h2>Quick add<small>Reference portions</small></h2>")
rep("Describe a meal above and Max will calculate it.","Describe a meal above and the app will estimate it.")
rep("'Max could not read the photo. Try another one, or type what you ate.'","'Could not read the photo. Try another one, or type what you ate.'")
rep("'Max could not work that out. Add quantities and try again, or enter numbers yourself.'","'Could not work that out. Add quantities and try again, or enter numbers yourself.'")
# dead code: daily quotes, the light/auto theme, an unused mobility routine
rex(r"const QUOTES=\[.*?\];\n","",flags=re.S)
rep("  const qq=QUOTES[(diff(d,'2026-01-01')%QUOTES.length+QUOTES.length)%QUOTES.length];\n","")
rex(r"function applyTheme\(mode\)\{.*?\n(?=function settingsSheet\(\))","function loadTheme(){document.documentElement.dataset.theme='dark'}\n",flags=re.S)
rep("  const m=state.themeMode||'dark',cfg=C();","  const cfg=C();")
rep("  if(a==='themeset'){setTheme(t.dataset.v);settingsSheet();return}\n","")
rep("themeMode:'dark',","")
rex(r"\n legs:\{n:'Legs wake-up',s:\[.*?\]\]\},","")
for dead in ('QUOTES','applyTheme','setTheme','themeset','lifeDash.theme','themeMode','Legs wake-up'):
    assert dead not in s, 'dead code left: '+dead

# ---- design layers: included only when the file exists at build time
import os,hashlib
LAYERS=[f'ui/{n}.js' for n in ('common','program','wall','today','body','money','study','career')]
have=[f for f in LAYERS if os.path.exists('./app/'+f)]
rep('<script src="extra.js"></script>\n','<script src="extra.js"></script>\n'+''.join(f'<script src="{f}"></script>\n' for f in have))
css=['ui/design.css'] if os.path.exists('./app/ui/design.css') else []
if css: rep('<link rel="stylesheet" href="theme.css">\n','<link rel="stylesheet" href="theme.css">\n<link rel="stylesheet" href="ui/design.css">\n')
imgs=sorted('img/'+f for f in os.listdir('./app/img') if not f.startswith('.') and os.path.isfile('./app/img/'+f)) if os.path.isdir('./app/img') else []

open('./app/index.html','w',encoding='utf8').write(s)

# ---- service worker: optional files list and a cache version that changes with every build
sw=open('./app/sw.js',encoding='utf8').read()
h=hashlib.sha1(s.encode())
for f in ['extra.js','store.js','reminders-core.js','theme.css']+have+css: h.update(open('./app/'+f,'rb').read())
sw,n1=re.subn(r"^const V='[^']*';$","const V='ld-v2-"+h.hexdigest()[:8]+"';",sw,flags=re.M)
sw,n2=re.subn(r"^const OPT=\[.*\];$","const OPT="+repr(have+css+imgs).replace(' ','')+";",sw,flags=re.M)
assert n1==1 and n2==1,'sw.js markers missing'
open('./app/sw.js','w',encoding='utf8').write(sw)

# ---- collision check: top-level names in every layer file must not exist in the page script or another layer
TOP=r'^(?:const|let|var|async function|function)\s+([A-Za-z_$][\w$]*)'
bad=[];seen={}
for f in ['extra.js']+have:
    src=open('./app/'+f,encoding='utf8').read()
    names=set(re.findall(TOP,src,flags=re.M))
    bad+=[f+':'+n for n in names if re.search(r'(?:^|[;\n{}\s])(?:const|let|var|function|async function)\s+'+re.escape(n)+r'\b',s)]
    bad+=[f+':'+n+' (also in '+seen[n]+')' for n in names if n in seen]
    for n in names: seen.setdefault(n,f)
print('built',len(s),'bytes; layers:',have+css,'; name collisions:',bad)

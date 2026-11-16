/* Local-first store.
   Every record lives in IndexedDB on this device first. Each field carries its own
   timestamp, deletes are soft, and unsent changes wait in an outbox (dirty=1) until the
   cloud confirms them. Merging is per field, newest wins, on both client and server. */
(function(){
'use strict';
const SEP='\t',DEL='$del';
const isObj=v=>v&&typeof v==='object'&&!Array.isArray(v);
const J=v=>JSON.stringify(v);
const clone=v=>v===undefined?undefined:JSON.parse(JSON.stringify(v));

function flat(data){
  const o={};
  for(const k in data){const v=data[k];if(v===undefined)continue;
    if(isObj(v)&&Object.keys(v).length){for(const j in v){if(v[j]!==undefined)o[k+SEP+j]=v[j]}}
    else o[k]=v}
  return o;
}
function unflat(fl,ft){
  const o={},keys=Object.keys(fl).filter(k=>k!==DEL);
  const tops=keys.filter(k=>!k.includes(SEP)),subs=keys.filter(k=>k.includes(SEP));
  tops.forEach(k=>{o[k]=fl[k]});
  subs.forEach(k=>{const i=k.indexOf(SEP),p=k.slice(0,i),c=k.slice(i+1);
    if(p in fl&&(ft[p]||0)>(ft[k]||0))return;
    if(!isObj(o[p]))o[p]={};o[p][c]=fl[k]});
  return o;
}
/* stamp what changed between the stored flat map and new data */
function stamp(rec,data,now){
  const nf=flat(data),of=rec.flat;
  for(const k in nf){if(!(k in of)||J(of[k])!==J(nf[k])){of[k]=nf[k];rec.ft[k]=now}}
  for(const k in of){if(k===DEL)continue;if(!(k in nf)){delete of[k];rec.ft[k]=now}}
  /* a parent that became an object must not shadow its children */
  for(const k in nf){const i=k.indexOf(SEP);if(i>0){const p=k.slice(0,i);if(p in of){delete of[p];rec.ft[p]=Math.min(rec.ft[p]||0,now-1)}}}
}
/* field-level merge: for each path the newer timestamp wins; ties keep the incoming (server) side */
function merge(local,remote){
  const flatM={...local.flat},ft={...local.ft};
  for(const k in remote.ft){
    if((remote.ft[k]||0)>=(ft[k]||0)){ft[k]=remote.ft[k];if(k in remote.flat)flatM[k]=remote.flat[k];else delete flatM[k]}
  }
  for(const k in remote.flat){if(!(k in ft)&&!(k in flatM)){flatM[k]=remote.flat[k]}}
  return {flat:flatM,ft};
}
const same=(a,b)=>J(a.flat)===J(b.flat)&&J(a.ft)===J(b.ft);

let idb=null;const mem={};const subs={};const kv={};
const KEY=(c,i)=>c+SEP+i;
function open(){
  return new Promise((res,rej)=>{
    const r=indexedDB.open('life-dashboard',1);
    r.onupgradeneeded=()=>{const d=r.result;d.createObjectStore('recs',{keyPath:'k'});d.createObjectStore('kv')};
    r.onsuccess=()=>{idb=r.result;res()};r.onerror=()=>rej(r.error);
  });
}
const tx=(s,m)=>idb.transaction(s,m).objectStore(s);
const pr=r=>new Promise((res,rej)=>{r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)});
async function loadAll(){
  const all=await pr(tx('recs','readonly').getAll());
  all.forEach(r=>{(mem[r.col]=mem[r.col]||{})[r.id]=r});
  const keys=await pr(tx('kv','readonly').getAllKeys()),vals=await pr(tx('kv','readonly').getAll());
  keys.forEach((k,i)=>kv[k]=vals[i]);
}
function put(rec){rec.k=KEY(rec.col,rec.id);(mem[rec.col]=mem[rec.col]||{})[rec.id]=rec;try{tx('recs','readwrite').put(rec)}catch(e){console.error('store put',e)}}
function kvSet(k,v){kv[k]=v;try{if(v===undefined)tx('kv','readwrite').delete(k);else tx('kv','readwrite').put(v,k)}catch(e){}}
const alive=r=>r&&!r.flat[DEL];
const dataOf=r=>unflat(r.flat,r.ft);

/* ---------- Firestore-shaped facade the app code talks to ---------- */
const pendingNotify=new Set();let notifyT=null;
function notify(col){pendingNotify.add(col);if(notifyT)return;notifyT=setTimeout(()=>{notifyT=null;const cs=[...pendingNotify];pendingNotify.clear();cs.forEach(c=>(subs[c]||[]).forEach(fn=>{try{fn(snap(c))}catch(e){console.error(e)}}))},0)}
function snap(col){
  const docs=Object.values(mem[col]||{}).filter(alive).map(r=>({id:r.id,data:()=>dataOf(r)}));
  return {docs,empty:!docs.length,metadata:{fromCache:false}};
}
function getRec(col,id){return (mem[col]||{})[id]}
function write(col,id,data,opts){
  const now=Date.now();let rec=getRec(col,id);
  if(!rec)rec={col,id,flat:{},ft:{},seq:0};
  if(rec.flat[DEL]){delete rec.flat[DEL];rec.ft[DEL]=now}
  stamp(rec,data,now);rec.dirty=1;rec.u=now;put(rec);
  if(!(opts&&opts.silent))notify(col);poke();
}
function remove(col,id){
  const rec=getRec(col,id);if(!rec||rec.flat[DEL])return;
  const now=Date.now();rec.flat[DEL]=true;rec.ft[DEL]=now;rec.dirty=1;rec.u=now;put(rec);notify(col);poke();
}
const db={
  collection:name=>({onSnapshot:(cb,err)=>{(subs[name]=subs[name]||[]).push(cb);setTimeout(()=>{try{cb(snap(name))}catch(e){err&&err(e)}},0);return()=>{subs[name]=subs[name].filter(f=>f!==cb)}}}),
  doc:path=>{const i=path.indexOf('/'),col=path.slice(0,i),id=path.slice(i+1);return {
    get:async()=>{const r=getRec(col,id);const ok=alive(r);return {exists:!!ok,data:()=>ok?dataOf(r):undefined}},
    set:async d=>{write(col,id,clone(d))},
    update:async p=>{const r=getRec(col,id);write(col,id,{...(alive(r)?dataOf(r):{}),...clone(p)})},
    delete:async()=>{remove(col,id)}
  }}
};

/* ---------- photos and other binary data, kept as records so they sync and export ---------- */
const b64=blob=>new Promise((res,rej)=>{const f=new FileReader();f.onload=()=>res(String(f.result));f.onerror=rej;f.readAsDataURL(blob)});
const assets={
  upload:async blob=>{const id='a'+Date.now().toString(36)+Math.random().toString(36).slice(2,7);write('assets',id,{url:await b64(blob),type:blob.type||'image/jpeg',ts:Date.now()});return {id}},
  delete:async id=>{remove('assets',id)},
  url:id=>{const r=getRec('assets',id);return alive(r)?r.flat.url:''}
};
const downloads={save:async({filename,data})=>{
  const blob=data instanceof Blob?data:new Blob([data],{type:/\.json$/.test(filename)?'application/json':'text/plain'});
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=filename;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),4000);
}};

/* ---------- cloud sync (Supabase REST, no SDK) ---------- */
const S={state:'local',err:'',last:0,busy:false};
const cloud=()=>kv.cloud||null;
const pendingCount=()=>{let n=0;for(const c in mem)for(const i in mem[c])if(mem[c][i].dirty)n++;return n};
function status(){
  const n=pendingCount(),c=cloud();
  let mode;
  if(!c||!c.refresh)mode='local';
  else if(S.state==='error')mode='error';
  else if(!navigator.onLine)mode='offline';
  else if(S.busy)mode='syncing';
  else mode=n?'pending':'synced';
  return {mode,pending:n,last:S.last,err:S.err,email:c&&c.email||''};
}
const stListeners=[];const emit=()=>stListeners.forEach(f=>{try{f(status())}catch(e){}});
async function api(path,body,token){
  const c=cloud();
  const r=await fetch(c.url.replace(/\/+$/,'')+path,{method:'POST',headers:{'Content-Type':'application/json',apikey:c.key,...(token?{Authorization:'Bearer '+token}:{})},body:J(body||{})});
  const t=await r.text();let j=null;try{j=t?JSON.parse(t):null}catch(e){}
  if(!r.ok){const e=new Error((j&&(j.msg||j.message||j.error_description||j.error))||('HTTP '+r.status));e.status=r.status;throw e}
  return j;
}
async function token(){
  const c=cloud();if(!c||!c.refresh)throw new Error('Not signed in');
  if(c.access&&c.exp>Date.now()+60000)return c.access;
  const j=await api('/auth/v1/token?grant_type=refresh_token',{refresh_token:c.refresh});
  kvSet('cloud',{...c,access:j.access_token,refresh:j.refresh_token,exp:Date.now()+(j.expires_in||3600)*1000});
  return j.access_token;
}
async function signIn(url,key,email,password){
  if(!/^https?:\/\//.test(url||''))throw new Error('The project URL should start with https://');
  kvSet('cloud',{url:url.trim(),key:key.trim(),email:email.trim()});
  try{
    const j=await api('/auth/v1/token?grant_type=password',{email:email.trim(),password});
    kvSet('cloud',{url:url.trim(),key:key.trim(),email:email.trim(),access:j.access_token,refresh:j.refresh_token,exp:Date.now()+(j.expires_in||3600)*1000});
  }catch(e){kvSet('cloud',undefined);throw e}
  S.state='ok';S.err='';emit();await sync();return status();
}
function signOut(){kvSet('cloud',undefined);kvSet('cursor',0);for(const c in mem)for(const i in mem[c]){const r=mem[c][i];r.dirty=1;r.seq=0;put(r)}S.state='local';emit()}
function applyRemote(row){
  const cur=getRec(row.col,row.id),remote={flat:row.flat||{},ft:row.ft||{}};
  if(!cur){put({col:row.col,id:row.id,flat:remote.flat,ft:remote.ft,seq:row.seq,dirty:0,u:0});return true}
  const m=merge(cur,remote),changed=!same(m,cur);
  const stillDirty=cur.dirty&&!same(m,remote)?1:0;
  put({...cur,flat:m.flat,ft:m.ft,seq:row.seq,dirty:stillDirty});
  return changed;
}
let again=false;
async function sync(){
  const c=cloud();if(!c||!c.refresh||!navigator.onLine){emit();return}
  if(S.busy){again=true;return}
  S.busy=true;emit();
  try{
    const tk=await token();const touched=new Set();
    /* 1. pull everything newer than our cursor */
    for(;;){
      const rows=await api('/rest/v1/rpc/pull_records',{since:kv.cursor||0,lim:500},tk);
      if(!rows||!rows.length)break;
      let mx=kv.cursor||0;rows.forEach(r=>{if(applyRemote(r))touched.add(r.col);if(+r.seq>mx)mx=+r.seq});
      kvSet('cursor',mx);if(rows.length<500)break;
    }
    /* 2. push the outbox in batches; the server merges per field and returns the result */
    for(;;){
      const out=[];for(const cc in mem)for(const i in mem[cc]){const r=mem[cc][i];if(r.dirty&&out.length<40)out.push(r)}
      if(!out.length)break;
      const sent=out.map(r=>({col:r.col,id:r.id,flat:r.flat,ft:r.ft,u:r.u}));
      const back=await api('/rest/v1/rpc/push_records',{recs:sent.map(({u,...x})=>x)},tk);
      (back||[]).forEach(row=>{
        const cur=getRec(row.col,row.id),was=sent.find(x=>x.col===row.col&&x.id===row.id);
        if(!cur)return;
        if(was&&cur.u===was.u){const before=J(cur.flat);put({...cur,flat:row.flat,ft:row.ft,seq:row.seq,dirty:0});if(before!==J(row.flat))touched.add(row.col)}
        else{const m=merge(cur,{flat:row.flat,ft:row.ft});put({...cur,flat:m.flat,ft:m.ft,seq:row.seq,dirty:1})}
      });
      if(!back||back.length<sent.length)throw new Error('The server did not confirm every change');
    }
    S.state='ok';S.err='';S.last=Date.now();kvSet('lastSync',S.last);
    touched.forEach(notify);
  }catch(e){S.state=(e&&(e.status===400||e.status===401||e.status===403))?'error':'ok';S.err=String(e&&e.message||e);if(!(e&&e.status))S.err='Could not reach the cloud. Changes are safe on this device.'}
  S.busy=false;emit();
  if(again){again=false;setTimeout(sync,200)}
}
let pokeT=null;function poke(){emit();clearTimeout(pokeT);pokeT=setTimeout(sync,1200)}
addEventListener('online',()=>sync());addEventListener('offline',emit);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)sync()});
setInterval(()=>{if(!document.hidden)sync()},30000);

/* ---------- import, export, verification ---------- */
function exportAll(){
  const out={app:'life-dashboard',version:2,exportedAt:new Date().toISOString(),records:{}};
  for(const c in mem){out.records[c]={};for(const i in mem[c]){const r=mem[c][i];if(alive(r))out.records[c][i]=dataOf(r)}}
  const g=c=>out.records[c]||{};
  /* version-1 shape too, so old and new backups stay interchangeable */
  out.cfg=g('config').main||{};out.days=g('days');out.entries=Object.keys(g('entries')).map(id=>({id,...g('entries')[id]}));
  out.todos=Object.keys(g('todos')).map(id=>({id,...g('todos')[id]}));out.academics=g('academics');
  out.photos=Object.keys(g('photos')).map(id=>({id,...g('photos')[id]}));
  return out;
}
function counts(){const o={};for(const c in mem)o[c]=Object.values(mem[c]).filter(alive).length;return o}
/* Import never overwrites: a record that already exists here is left alone unless replace is set (restore). */
function importPayload(j,opt){
  opt=opt||{};
  if(!j||j.app!=='life-dashboard')throw new Error('That file is not a dashboard backup');
  const src={};
  if(j.records){for(const c in j.records)src[c]={...j.records[c]}}
  else{
    src.config=j.cfg&&Object.keys(j.cfg).length?{main:j.cfg}:{};src.days=j.days||{};
    src.entries={};(j.entries||[]).forEach(e=>{const {id,...d}=e;src.entries[id]=d});
    src.todos={};(j.todos||[]).forEach(e=>{const {id,...d}=e;src.todos[id]=d});
    src.academics=j.academics||{};src.photos={};(j.photos||[]).forEach(e=>{const {id,...d}=e;src.photos[id]=d});
  }
  const rep={added:{},skipped:{},source:{},after:{},mismatch:[]};
  for(const c in src){
    rep.source[c]=Object.keys(src[c]).length;rep.added[c]=0;rep.skipped[c]=0;
    for(const id in src[c]){
      const cur=getRec(c,id);
      if(alive(cur)&&!opt.replace){rep.skipped[c]++;continue}
      write(c,id,clone(src[c][id]),{silent:true});rep.added[c]++;
    }
    notify(c);
  }
  /* verify: every source record must now exist, and match field for field when we wrote it */
  for(const c in src)for(const id in src[c]){
    const r=getRec(c,id);
    if(!alive(r)){rep.mismatch.push(c+'/'+id+' missing');continue}
    if(!(rep.skipped[c]&&!opt.replace)&&J(sortKeys(dataOf(r)))!==J(sortKeys(src[c][id])))rep.mismatch.push(c+'/'+id+' differs');
  }
  rep.after=counts();rep.ok=!rep.mismatch.length;
  return rep;
}
function sortKeys(v){if(Array.isArray(v))return v.map(sortKeys);if(isObj(v)){const o={};Object.keys(v).sort().forEach(k=>{const x=sortKeys(v[k]);if(!(isObj(x)&&!Object.keys(x).length))o[k]=x});return o}return v}

/* ---------- optional AI helper: only active when the cloud has an "ai" function with a key ---------- */
function makeSample(){
  const c=cloud();if(!c||!c.refresh||!kv.aiOn)return null;
  const toB64=async b=>(await b64(b)).split(',')[1];
  return {
    json:async(prompt,opts)=>{
      const images=[];for(const b of ((opts&&opts.images)||[]))images.push({type:b.type||'image/jpeg',data:await toB64(b)});
      const j=await api('/functions/v1/ai',{prompt,images,tier:(opts&&opts.modelTier)||'default'},await token());
      return j.result;
    },
    limits:async()=>({images:{maxCount:4}})
  };
}

const LD={ready:false,db,assets,downloads,status,sync,signIn,signOut,exportAll,importPayload,counts,
  onStatus:f=>{stListeners.push(f)},kvGet:k=>kv[k],kvSet,_merge:merge,_flat:flat,_unflat:unflat,
  api:async(path,body)=>api(path,body,await token()),cloud,
  write:(c,i,d)=>write(c,i,clone(d)),remove,get:(c,i)=>{const r=getRec(c,i);return alive(r)?dataOf(r):null},
  list:c=>Object.values(mem[c]||{}).filter(alive).map(r=>({id:r.id,...dataOf(r)})),
  onCol:(c,f)=>db.collection(c).onSnapshot(f)};
window.LD=LD;
LD.opened=open().then(loadAll).then(()=>{S.last=kv.lastSync||0;LD.ready=true;sync()}).catch(e=>{console.error('Storage failed to open',e);LD.failed=true});
window.claude={use:async name=>{
  await LD.opened;
  if(LD.failed)return null;
  return ({db,assets,downloads,sample:makeSample()})[name]||null;
}};
})();

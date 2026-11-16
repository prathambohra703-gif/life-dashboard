/* Decides which reminders are due. Pure logic, shared by the app (while open) and the cloud function (push). */
(function(g){
'use strict';
const tmin=t=>{const m=/^(\d{1,2}):(\d{2})$/.exec(t||'');return m?+m[1]*60+ +m[2]:null};
const addDays=(ymd,n)=>{const d=new Date(ymd+'T00:00:00Z');d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10)};
const DOW=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const L=v=>(v/1000).toFixed(v%1000===0?0:1)+' L';
/* sched: the "reminders" document the app publishes.
   ctx: {ymd, min} = calendar date and minutes past midnight in the user's time zone; win = look-back window in minutes.
   dayOf(date) -> {water, protein, habits} for a logical date. */
function due(sched,ctx,dayOf){
  const out=[];if(!sched||!sched.on)return out;
  const win=ctx.win||5,de=(sched.dayEnd==null?4:sched.dayEnd)*60;
  const late=ctx.min<de,ld=late?addDays(ctx.ymd,-1):ctx.ymd,lm=late?ctx.min+1440:ctx.min;
  const hit=t=>{let m=tmin(t);if(m==null)return false;if(m<de)m+=1440;return m<=lm&&m>lm-win};
  const day=dayOf(ld)||{},hab=day.habits||{};
  (sched.items||[]).forEach(it=>{
    if(!it.on||!hit(it.time))return;
    if(it.habit&&hab[it.habit])return;
    let title=it.title,body=it.body||'';
    if(it.k==='gym'){const name=(sched.gymByDow||{})[DOW[new Date(ld+'T00:00:00Z').getUTCDay()]];if(!name||name==='Rest')return;title='Gym: '+name}
    out.push({key:it.k+':'+ld,title,body,tag:'ld-'+it.k});
  });
  const w=sched.water;
  if(w&&w.on){
    const s=tmin(w.start),e0=tmin(w.end),ev=Math.max(30,+w.every||120);
    if(s!=null&&e0!=null){
      const e=e0<=s?e0+1440:e0,have=+day.water||0;
      for(let slot=s;slot<=e;slot+=ev){
        if(!(slot<=lm&&slot>lm-win))continue;
        const expected=Math.round(w.target*Math.min(1,(slot-(s-ev))/(e-(s-ev))));
        if(have>=w.target)continue;
        if(w.onlyBehind&&have>=expected-200)continue;
        const gap=Math.max(0,expected-have);
        out.push({key:'water:'+ld+':'+slot,title:'Water',body:L(have)+' of '+L(w.target)+' so far.'+(gap>=200?' About '+Math.round(gap/50)*50+' ml behind pace.':''),tag:'ld-water'});
      }
    }
  }
  const p=sched.protein;
  if(p&&p.on&&hit(p.time)){const have=Math.round(+day.protein||0);if(have<p.target)out.push({key:'protein:'+ld,title:'Protein check',body:have+' of '+p.target+' g so far. '+(p.target-have)+' g to go.',tag:'ld-protein'})}
  const d=sched.deadlines;
  if(d&&d.on){
    const at=(t)=>{const m=tmin(t);return m!=null&&m<=ctx.min&&m>ctx.min-win};
    (d.list||[]).forEach(x=>{
      if(at(d.eve)&&addDays(ctx.ymd,1)===x.d)out.push({key:'dl-eve:'+x.id,title:'Tomorrow: '+x.t,body:x.c||'',tag:'ld-dl-'+x.id});
      if(at(d.morn)&&ctx.ymd===x.d)out.push({key:'dl-day:'+x.id,title:'Today: '+x.t,body:x.c||'',tag:'ld-dl-'+x.id});
    });
  }
  return out;
}
/* calendar date and minute in a time zone */
function nowIn(tz,date){
  const p={};new Intl.DateTimeFormat('en-GB',{timeZone:tz,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false}).formatToParts(date||new Date()).forEach(x=>p[x.type]=x.value);
  return {ymd:p.year+'-'+p.month+'-'+p.day,min:(+p.hour%24)*60+ +p.minute};
}
g.RemCore={due,nowIn,addDays,tmin};
})(typeof globalThis!=='undefined'?globalThis:this);

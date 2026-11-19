// @ts-nocheck
// SUPABASE SETTING: turn "Verify JWT" OFF for this function (Edge Functions > remind > Details). Publishable keys are not JWTs;
// the function checks the x-app-secret header itself for everything that reads or writes data.
// The GET endpoints (the push public key, and the calendar feed at ?cal=<secret link token>) are intentionally public.
// Life Dashboard: push reminders. Supabase > Edge Functions > new function named "remind". Paste this whole file.
// Secrets it needs (Edge Functions > Secrets): VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, APP_SECRET.
// It does four jobs: hands the app its push key, serves the calendar feed, sends due reminders every 5 minutes, and lets the Drive backup script read and write.
// The two marked regions below are copies of app/reminders-core.js and app/cal-core.js. Do not edit them here:
// edit those files, then run `python3 tools/synccore.py` to copy them in again.
import webpush from "npm:web-push@3.6.7";
import { createClient } from "npm:@supabase/supabase-js@2";

// deno-lint-ignore-file
// BEGIN reminders-core.js
const RemCore = (() => {
const tmin=t=>{const m=/^(\d{1,2}):(\d{2})$/.exec(t||'');return m?+m[1]*60+ +m[2]:null};
const addDays=(ymd,n)=>{const d=new Date(ymd+'T00:00:00Z');d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10)};
const DOW=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const L=v=>(v/1000).toFixed(v%1000===0?0:1)+' L';
/* sched: the "reminders" document the app publishes.
   ctx: {ymd, min} = calendar date and minutes past midnight in the user's time zone; win = look-back window in minutes.
   dayOf(date) -> {water, protein, habits} for a logical date. */
function due(sched0,ctx,dayOf){
  const out=[];if(!sched0)return out;
  const win=ctx.win||5,de=(sched0.dayEnd==null?4:sched0.dayEnd)*60;
  const late=ctx.min<de,ld=late?addDays(ctx.ymd,-1):ctx.ymd,lm=late?ctx.min+1440:ctx.min;
  /* optional sched.next={from:'YYYY-MM-DD',items,water,protein,deadlines,gymByDow,on}: from that logical date on, its settings replace the base ones */
  const nx=sched0.next,sched=(nx&&nx.from&&ld>=nx.from)?{...sched0,on:nx.on==null?sched0.on:nx.on,items:nx.items||sched0.items,water:nx.water||sched0.water,protein:nx.protein||sched0.protein,deadlines:nx.deadlines||sched0.deadlines,gymByDow:nx.gymByDow||sched0.gymByDow,next:null}:sched0;
  if(!sched.on)return out;
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
return {due,nowIn,addDays,tmin};
})();
// END reminders-core.js
// BEGIN cal-core.js
const CalCore = (() => {
const pad=n=>String(n).padStart(2,'0');
const isYmd=s=>{if(!/^\d{4}-\d{2}-\d{2}$/.test(s||''))return false;const d=new Date(s+'T00:00:00Z');return !isNaN(d)&&d.toISOString().slice(0,10)===s};
const addDays=(ymd,n)=>{const d=new Date(ymd+'T00:00:00Z');d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10)};
/* 29 Feb in a non-leap year falls on 28 Feb */
const fixLeap=s=>isYmd(s)?s:(/-02-29$/.test(s)?s.slice(0,4)+'-02-28':s);
/* same roll-forward as the app's nextOcc: add whole years until the date is today or later */
function nextOcc(d,today){
  const md=d.slice(4);let y=+d.slice(0,4),o=fixLeap(d),guard=0;
  if(y<+today.slice(0,4)-1){y=+today.slice(0,4)-1;o=fixLeap(y+md)}
  while(o<today&&guard++<60){y++;o=fixLeap(y+md)}
  return o;
}
function todayIn(tz,date){
  const p={};new Intl.DateTimeFormat('en-GB',{timeZone:tz,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(date||new Date()).forEach(x=>p[x.type]=x.value);
  return p.year+'-'+p.month+'-'+p.day;
}
/* TEXT escaping (RFC 5545 3.3.11) */
const esc=s=>String(s==null?'':s).replace(/\\/g,'\\\\').replace(/;/g,'\\;').replace(/,/g,'\\,').replace(/\r\n|\r|\n/g,'\\n');
/* fold lines longer than 75 octets; never split a UTF-8 character */
function fold(line){
  const enc=s=>unescape(encodeURIComponent(s)).length;
  if(enc(line)<=75)return line;
  const out=[];let cur='',n=0,lim=75;
  for(const ch of line){const b=enc(ch);if(n+b>lim){out.push(cur);cur=' ';n=1;lim=75}cur+=ch;n+=b}
  out.push(cur);return out.join('\r\n');
}
const utcStamp=ms=>{const d=new Date(ms);return d.getUTCFullYear()+pad(d.getUTCMonth()+1)+pad(d.getUTCDate())+'T'+pad(d.getUTCHours())+pad(d.getUTCMinutes())+pad(d.getUTCSeconds())+'Z'};
const dateVal=ymd=>ymd.replace(/-/g,'');
const uidOf=id=>String(id).replace(/[^A-Za-z0-9._-]/g,'_')+'@life-dashboard';
/* opts: {today, tz, stamp(ms), back(days of past events kept, default 180), alarm(default true), name} */
function build(items,opts){
  opts=opts||{};
  const tz=opts.tz||'Asia/Kolkata',today=opts.today||todayIn(tz),back=opts.back==null?180:opts.back;
  const from=addDays(today,-back),stamp=utcStamp(opts.stamp||Date.now()),alarm=opts.alarm!==false;
  const L=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Life Dashboard//Calendar feed 1.0//EN','CALSCALE:GREGORIAN','METHOD:PUBLISH',
    'X-WR-CALNAME:'+esc(opts.name||'Life Dashboard'),'X-WR-TIMEZONE:'+tz,'REFRESH-INTERVAL;VALUE=DURATION:PT1H','X-PUBLISHED-TTL:PT1H'];
  const seen=new Set();
  (items||[]).forEach(it=>{
    if(!it||!it.id||!it.t||!isYmd(fixLeap(String(it.d||''))))return;
    const d=it.every==='year'?nextOcc(String(it.d),today):fixLeap(String(it.d));
    if(d<from||seen.has(it.id))return;seen.add(it.id);
    L.push('BEGIN:VEVENT','UID:'+uidOf(it.id),'DTSTAMP:'+stamp,'DTSTART;VALUE=DATE:'+dateVal(d),'DTEND;VALUE=DATE:'+dateVal(addDays(d,1)),
      'SUMMARY:'+esc(it.t+(it.done?' (done)':'')));
    if(it.x)L.push('DESCRIPTION:'+esc(it.x));
    if(it.cat)L.push('CATEGORIES:'+esc(it.cat));
    L.push('TRANSP:TRANSPARENT');
    /* all-day events start at local midnight, so -PT4H is 20:00 the evening before */
    if(alarm&&!it.done&&d>=today)L.push('BEGIN:VALARM','ACTION:DISPLAY','DESCRIPTION:'+esc(it.t),'TRIGGER:-PT4H','END:VALARM');
    L.push('END:VEVENT');
  });
  L.push('END:VCALENDAR');
  return L.map(fold).join('\r\n')+'\r\n';
}
return {build,nextOcc,esc,fold,todayIn,isYmd};
})();
// END cal-core.js

const SEP = "\t";
function unflat(fl: Record<string, unknown>) {
  const o: Record<string, any> = {};
  for (const k of Object.keys(fl)) {
    if (k === "$del") continue;
    const i = k.indexOf(SEP);
    if (i < 0) { if (!(k in o)) o[k] = fl[k]; continue; }
    const p = k.slice(0, i), c = k.slice(i + 1);
    if (typeof o[p] !== "object" || o[p] === null || Array.isArray(o[p])) o[p] = {};
    o[p][c] = fl[k];
  }
  return o;
}
const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-app-secret" };
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });

const service = () => createClient(Deno.env.get("SUPABASE_URL")!, (Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_SECRET_KEY"))!);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const pub = Deno.env.get("VAPID_PUBLIC_KEY") ?? "", priv = Deno.env.get("VAPID_PRIVATE_KEY") ?? "";
  if (req.method === "GET") {
    // Calendar feed: anyone holding the secret link gets that one person's read-only feed
    const cal = new URL(req.url).searchParams.get("cal");
    if (cal !== null) {
      const notFound = new Response("Calendar not found. Copy the link again from the app: Menu > Calendar feed.", { status: 404, headers: { ...cors, "Content-Type": "text/plain; charset=utf-8" } });
      if (!/^[A-Za-z0-9_-]{20,64}$/.test(cal)) return notFound;
      const { data, error } = await service().rpc("service_calendar", { p_token: cal });
      if (error || !data) return notFound;
      const doc = unflat(data);
      const ics = CalCore.build(Array.isArray(doc.items) ? doc.items : [], { tz: "Asia/Kolkata", stamp: Number(doc.at) || Date.now() });
      return new Response(ics, { headers: { ...cors, "Content-Type": "text/calendar; charset=utf-8", "Cache-Control": "max-age=900" } });
    }
    return json({ publicKey: pub });
  }
  const secret = Deno.env.get("APP_SECRET") ?? "";
  if (!secret || req.headers.get("x-app-secret") !== secret) return json({ error: "forbidden" }, 403);
  const sb = service();
  let body: any = {};
  try { body = await req.json(); } catch { body = {}; }

  // Drive backup script: read everything, or write one small record (backup stamp, nightly suggestions)
  if (body.action === "export") {
    const { data, error } = await sb.rpc("service_export", { p_email: body.email });
    return error ? json({ error: error.message }, 400) : json(data);
  }
  if (body.action === "put") {
    if (!["meta", "proposals", "notes"].includes(body.col)) return json({ error: "only meta, proposals and notes can be written this way" }, 400);
    const { error } = await sb.rpc("service_put", { p_email: body.email, p_col: body.col, p_id: body.id, p_data: body.data });
    return error ? json({ error: error.message }, 400) : json({ ok: true });
  }

  // otherwise: the 5-minute reminder tick
  if (!pub || !priv) return json({ error: "VAPID keys are not set" }, 500);
  webpush.setVapidDetails("mailto:" + (Deno.env.get("CONTACT_EMAIL") ?? "owner@example.com"), pub, priv);

  const { data: subs } = await sb.from("push_subs").select("*");
  const byUser: Record<string, any[]> = {};
  (subs ?? []).forEach((s) => (byUser[s.user_id] = byUser[s.user_id] ?? []).push(s));
  let sent = 0;
  for (const uid of Object.keys(byUser)) {
    // health alert: one push a day when the database health check (public.ld_health, 7:07 AM) found problems
    const { data: h } = await sb.from("records").select("flat").eq("user_id", uid).eq("col", "meta").eq("id", "agent-health").maybeSingle();
    if (h && h.flat && h.flat.ok === false && Date.now() - Number(h.flat.at) < 6 * 3600e3) {
      const { error } = await sb.from("push_log").insert({ user_id: uid, key: "health-" + new Date(Number(h.flat.at)).toISOString().slice(0, 10) });
      if (!error) for (const s of byUser[uid]) {
        try { await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, JSON.stringify({ title: "Dashboard needs a look", body: String(h.flat.summary || "A background job has a problem."), tag: "health" })); sent++; } catch (_e) { /* reminders loop below cleans dead subscriptions */ }
      }
    }
    const { data: m } = await sb.from("records").select("flat").eq("user_id", uid).eq("col", "meta").eq("id", "reminders").maybeSingle();
    const sched = m ? unflat(m.flat).s : null;
    if (!sched || !sched.on) continue;
    const now = RemCore.nowIn(sched.tz || "Asia/Kolkata");
    const cache: Record<string, any> = {};
    // day data is loaded ahead for the two dates the logic can ask about
    for (const d of [now.ymd, RemCore.addDays(now.ymd, -1)]) {
      const { data: dr } = await sb.from("records").select("flat").eq("user_id", uid).eq("col", "days").eq("id", d).maybeSingle();
      const day = dr ? unflat(dr.flat) : {};
      const { data: meals } = await sb.from("records").select("flat").eq("user_id", uid).eq("col", "entries").eq("flat->>date", d).eq("flat->>type", "meal");
      const protein = (meals ?? []).filter((x) => !x.flat["$del"]).reduce((a, x) => a + (Number(x.flat.p) || 0), 0);
      cache[d] = { water: Number(day.water) || 0, protein, habits: day.habits || {} };
    }
    const due = RemCore.due(sched, { ...now, win: 5 }, (d: string) => cache[d]);
    for (const n of due) {
      const { error } = await sb.from("push_log").insert({ user_id: uid, key: n.key });
      if (error) continue; // already sent
      for (const s of byUser[uid]) {
        try {
          await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, JSON.stringify({ title: n.title, body: n.body, tag: n.tag }));
          sent++;
        } catch (e) {
          const code = (e as any)?.statusCode;
          if (code === 404 || code === 410) await sb.from("push_subs").delete().eq("endpoint", s.endpoint);
        }
      }
    }
  }
  await sb.from("push_log").delete().lt("sent_at", new Date(Date.now() - 7 * 864e5).toISOString());
  return json({ ok: true, sent });
});

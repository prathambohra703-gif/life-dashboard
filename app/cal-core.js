/* Builds the read-only calendar feed (ICS, RFC 5545). Pure logic, shared by the cloud function and the local stand-in.
   items: [{id, d:'YYYY-MM-DD', t:title, x?:description, cat?:category, done?:true, every?:'year'}]
   'every:year' items (renewals, birthdays) are rolled to their next occurrence on or after today, like renewSoon/nextOcc. */
(function(g){
'use strict';
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
g.CalCore={build,nextOcc,esc,fold,todayIn,isYmd};
})(typeof globalThis!=='undefined'?globalThis:this);

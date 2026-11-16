import test from 'node:test';import assert from 'node:assert/strict';
import fs from 'node:fs';import vm from 'node:vm';
const ctx={};vm.createContext(ctx);
vm.runInContext(fs.readFileSync(new URL('../../app/cal-core.js',import.meta.url),'utf8'),ctx);
const C=ctx.CalCore;
const opts={today:'2026-11-12',stamp:Date.UTC(2026,10,12,6,30,0)};
const unfold=s=>s.replace(/\r\n /g,'');
const events=s=>unfold(s).split('BEGIN:VEVENT').slice(1).map(e=>e.split('END:VEVENT')[0]);

test('calendar wrapper: PRODID, name, CRLF line ends, version',()=>{
  const s=C.build([],opts);
  assert.match(s,/^BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:/);
  assert.match(s,/\r\nX-WR-CALNAME:Life Dashboard\r\n/);
  assert.ok(s.endsWith('END:VCALENDAR\r\n'));
  assert.ok(!/[^\r]\n/.test(s),'every line ends in CRLF');
});
test('escaping of backslash, semicolon, comma and newlines',()=>{
  assert.equal(C.esc('a\\b;c,d\ne'),'a\\\\b\\;c\\,d\\ne');
  const s=C.build([{id:'x',d:'2026-11-20',t:'Moot; round, 1',x:'line1\nline2'}],opts);
  assert.match(s,/SUMMARY:Moot\\; round\\, 1\r\n/);
  assert.match(s,/DESCRIPTION:line1\\nline2\r\n/);
});
test('folding: no line over 75 octets, multibyte characters intact, unfolds back',()=>{
  const long='Renewal ₹ '.repeat(20);
  const s=C.build([{id:'f',d:'2026-12-01',t:long}],opts);
  for(const l of s.split('\r\n'))assert.ok(Buffer.byteLength(l,'utf8')<=75,l);
  assert.ok(unfold(s).includes('SUMMARY:'+long.replace(/,/g,'\\,')));
  assert.ok(!s.includes('�'));
  assert.equal(C.fold('short'),'short');
});
test('all-day format: DATE start and next-day end, alarm the evening before',()=>{
  const [e]=events(C.build([{id:'a1',d:'2026-12-31',t:'Essay',cat:'Study'}],opts));
  assert.match(e,/DTSTART;VALUE=DATE:20261231\r\n/);
  assert.match(e,/DTEND;VALUE=DATE:20270101\r\n/);
  assert.match(e,/CATEGORIES:Study/);
  assert.match(e,/TRIGGER:-PT4H/);
  assert.match(e,/DTSTAMP:20261112T063000Z/);
});
test('UID is stable from the id and safe',()=>{
  const a=C.build([{id:'acad-x 1/2',d:'2026-11-20',t:'A'}],opts),b=C.build([{id:'acad-x 1/2',d:'2026-11-25',t:'B'}],{...opts,stamp:1});
  const uid=s=>/UID:(.*)\r\n/.exec(s)[1];
  assert.equal(uid(a),uid(b));assert.equal(uid(a),'acad-x_1_2@life-dashboard');
});
test('roll-forward: yearly items move to the next occurrence, others stay',()=>{
  assert.equal(C.nextOcc('2025-03-10','2026-11-12'),'2027-03-10');
  assert.equal(C.nextOcc('2025-12-01','2026-11-12'),'2026-12-01');
  assert.equal(C.nextOcc('2026-11-12','2026-11-12'),'2026-11-12');
  assert.equal(C.nextOcc('2027-05-05','2026-11-12'),'2027-05-05');
  assert.equal(C.nextOcc('1990-11-11','2026-11-12'),'2027-11-11');
  assert.equal(C.nextOcc('2024-02-29','2026-11-12'),'2027-02-28');
  const s=C.build([{id:'r',d:'2025-01-15',t:'Insurance renews',every:'year'},{id:'old',d:'2025-01-15',t:'Old one-off'}],opts);
  assert.match(s,/DTSTART;VALUE=DATE:20270115/);
  assert.ok(!s.includes('Old one-off'),'one-off events older than the window are left out');
});
test('done items marked, no alarm; invalid or undated items skipped; duplicate ids once',()=>{
  const s=C.build([{id:'d',d:'2026-11-20',t:'Quiz',done:true},{id:'n',d:'',t:'No date'},{id:'bad',d:'2026-13-40',t:'Bad'},{id:'d',d:'2026-11-21',t:'Dup'}],opts);
  const ev=events(s);
  assert.equal(ev.length,1);assert.match(ev[0],/SUMMARY:Quiz \(done\)/);assert.ok(!/VALARM/.test(ev[0]));
});

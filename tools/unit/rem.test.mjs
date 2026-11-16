import test from 'node:test';import assert from 'node:assert/strict';
const EQ=(a,b)=>assert.deepStrictEqual(JSON.parse(JSON.stringify(a)),JSON.parse(JSON.stringify(b)));
import fs from 'node:fs';import vm from 'node:vm';
const ctx={};vm.createContext(ctx);
vm.runInContext(fs.readFileSync(new URL('../../app/reminders-core.js',import.meta.url),'utf8'),ctx);
const R=ctx.RemCore;
const base=()=>({on:true,dayEnd:4,gymByDow:{Sun:'Rest',Mon:'Push',Tue:'Pull',Wed:'Legs',Thu:'Rest',Fri:'Push',Sat:'Pull'},
  items:[{k:'creatine',on:true,time:'17:00',title:'Creatine 5 g',body:'x',habit:'creatine'},
         {k:'gym',on:true,time:'18:00',title:'Gym',habit:'gym'},
         {k:'bed',on:true,time:'00:30',title:'Bedtime'}]});
const keys=(s,ymd,min,day={},win=2)=>R.due(s,{ymd,min,win},()=>day).map(x=>x.key);
test('creatine due at 17:00, skipped when habit ticked, outside window not due',()=>{
  EQ(keys(base(),'2026-11-11',17*60+1),['creatine:2026-11-11']);
  EQ(keys(base(),'2026-11-11',17*60+1,{habits:{creatine:true}}),[]);
  EQ(keys(base(),'2026-11-11',17*60+10),[]);
  EQ(keys(base(),'2026-11-11',16*60+59),[]);
});
test('gym skipped on Rest day, titled on Monday',()=>{
  const sun=R.due(base(),{ymd:'2026-11-15',min:18*60,win:2},()=>({}));
  assert.equal(sun.length,0);
  const mon=R.due(base(),{ymd:'2026-11-16',min:18*60,win:2},()=>({}));
  assert.equal(mon.length,1);assert.equal(mon[0].title,'Gym: Push');
});
test('bedtime 00:30 lands on previous logical day',()=>{
  const d=R.due(base(),{ymd:'2026-11-12',min:31,win:2},()=>({}));
  EQ(d.map(x=>x.key),['bed:2026-11-11']);
});
test('items off or master off produce nothing',()=>{
  EQ(R.due({...base(),on:false},{ymd:'2026-11-11',min:17*60,win:2},()=>({})),[]);
  EQ(R.due(null,{ymd:'2026-11-11',min:0},()=>({})),[]);
});
const water=(o={})=>({on:true,dayEnd:4,items:[],water:{on:true,start:'09:00',end:'21:00',every:120,target:3000,onlyBehind:true,...o}});
test('water: sent when behind, not when ahead of pace, never after target',()=>{
  const at=11*60; // slot 11:00, expected = 3000*(660-420)/(1260-420)=857
  assert.equal(keys(water(),'2026-11-11',at,{water:0}).length,1);
  assert.equal(keys(water(),'2026-11-11',at,{water:2000}).length,0);
  assert.equal(keys(water(),'2026-11-11',at,{water:3000}).length,0);
  assert.equal(keys(water({onlyBehind:false}),'2026-11-11',at,{water:2000}).length,1);
  assert.equal(keys(water({onlyBehind:false}),'2026-11-11',at,{water:3000}).length,0);
});
test('water message mentions pace gap',()=>{
  const d=R.due(water(),{ymd:'2026-11-11',min:660,win:2},()=>({water:0}));
  assert.match(d[0].body,/behind pace/);assert.equal(d[0].key,'water:2026-11-11:660');
});
test('protein check only when below target',()=>{
  const s={on:true,dayEnd:4,items:[],protein:{on:true,time:'20:00',target:140}};
  EQ(keys(s,'2026-11-11',20*60,{protein:100}),['protein:2026-11-11']);
  EQ(keys(s,'2026-11-11',20*60,{protein:140}),[]);
  EQ(keys(s,'2026-11-11',20*60,{protein:150}),[]);
});
test('deadline eve and morning keys',()=>{
  const s={on:true,dayEnd:4,items:[],deadlines:{on:true,eve:'20:00',morn:'08:00',list:[{id:'a1',d:'2026-11-12',t:'Essay',c:'ECON'}]}};
  const eve=R.due(s,{ymd:'2026-11-11',min:20*60,win:2},()=>({}));
  EQ(eve.map(x=>x.key),['dl-eve:a1']);assert.equal(eve[0].title,'Tomorrow: Essay');
  const morn=R.due(s,{ymd:'2026-11-12',min:8*60+1,win:2},()=>({}));
  EQ(morn.map(x=>x.key),['dl-day:a1']);assert.equal(morn[0].title,'Today: Essay');
  EQ(R.due(s,{ymd:'2026-11-10',min:20*60,win:2},()=>({})),[]);
});
test('nowIn returns sane shape',()=>{
  const n=R.nowIn('Asia/Kolkata');
  assert.match(n.ymd,/^\d{4}-\d{2}-\d{2}$/);assert.ok(Number.isInteger(n.min)&&n.min>=0&&n.min<1440);
  const f=R.nowIn('Asia/Kolkata',new Date('2026-11-11T20:00:00Z'));
  EQ(f,{ymd:'2026-11-12',min:90});
});

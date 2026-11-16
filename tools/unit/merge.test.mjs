import test from 'node:test';import assert from 'node:assert/strict';
const EQ=(a,b)=>assert.deepStrictEqual(JSON.parse(JSON.stringify(a)),JSON.parse(JSON.stringify(b)));
import fs from 'node:fs';import vm from 'node:vm';
const window={};
const ctx={window,indexedDB:{open:()=>({})},document:{addEventListener(){},createElement(){return {}},body:{}},
  navigator:{onLine:true},addEventListener(){},setInterval(){return 0},setTimeout(){return 0},console,URL,Date,JSON};
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(new URL('../../app/store.js',import.meta.url),'utf8'),ctx);
const LD=window.LD;const {_merge:merge,_flat:flat,_unflat:unflat}=LD;
const SEP='\t';
test('store.js loads and exposes helpers',()=>{assert.equal(typeof merge,'function');assert.equal(typeof flat,'function');assert.equal(typeof unflat,'function')});
test('newer field wins per field',()=>{
  const a={flat:{x:1,y:1},ft:{x:10,y:20}},b={flat:{x:2,y:2},ft:{x:20,y:10}};
  const m=merge(a,b);EQ(m.flat,{x:2,y:1});EQ(m.ft,{x:20,y:20});
});
test('tie keeps the incoming side',()=>{
  const m=merge({flat:{x:'local'},ft:{x:5}},{flat:{x:'remote'},ft:{x:5}});assert.equal(m.flat.x,'remote');
});
test('field new only on remote is added; local-only kept',()=>{
  const m=merge({flat:{a:1},ft:{a:1}},{flat:{b:2},ft:{b:1}});EQ(m.flat,{a:1,b:2});
});
test('deleted field (missing in flat, present in ft) is removed',()=>{
  const m=merge({flat:{x:1,y:1},ft:{x:1,y:1}},{flat:{y:1},ft:{x:9,y:1}});
  assert.ok(!('x' in m.flat));assert.equal(m.ft.x,9);assert.equal(m.flat.y,1);
});
test('older remote delete does not remove newer local value',()=>{
  const m=merge({flat:{x:1},ft:{x:50}},{flat:{},ft:{x:9}});assert.equal(m.flat.x,1);
});
test('nested keys merge independently',()=>{
  const k=(p,c)=>p+SEP+c;
  const a={flat:{[k('h','a')]:true,[k('h','b')]:false},ft:{[k('h','a')]:10,[k('h','b')]:30}};
  const b={flat:{[k('h','a')]:false,[k('h','b')]:true},ft:{[k('h','a')]:20,[k('h','b')]:5}};
  const m=merge(a,b);
  assert.equal(m.flat[k('h','a')],false);assert.equal(m.flat[k('h','b')],false);
  EQ(JSON.parse(JSON.stringify(unflat(m.flat,m.ft))),{h:{a:false,b:false}});
});
test('flat/unflat round trip, empty object and arrays stay whole',()=>{
  const d={a:1,o:{p:1,q:{r:2}},arr:[1,2],e:{},u:undefined};
  const f=flat(d);
  assert.equal(f['o'+SEP+'p'],1);EQ(f['o'+SEP+'q'],{r:2});EQ(f.arr,[1,2]);EQ(f.e,{});assert.ok(!('u' in f));
  EQ(JSON.parse(JSON.stringify(unflat(f,{}))),{a:1,o:{p:1,q:{r:2}},arr:[1,2],e:{}});
});
test('$del flag is ignored by unflat and survives flat',()=>{
  EQ(JSON.parse(JSON.stringify(unflat({a:1,'$del':true},{}))),{a:1});
  assert.equal(flat({'$del':true,a:1})['$del'],true);
  const m=merge({flat:{a:1},ft:{a:1}},{flat:{a:1,'$del':true},ft:{a:1,'$del':7}});
  assert.equal(m.flat['$del'],true);
});
test('parent scalar newer than children hides stale children',()=>{
  const k='p'+SEP+'c';
  EQ(JSON.parse(JSON.stringify(unflat({p:5,[k]:1},{p:10,[k]:2}))),{p:5});
});

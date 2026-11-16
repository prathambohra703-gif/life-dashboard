import sys,os,asyncio
sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
from _h import *
import _h
async def main():
    b=await _h.launch();c,p=await fresh(b)
    async def parse(t):
        return await p.evaluate("t=>{state.chat.pending=[];const r=localParse(t);return {r,pend:state.chat.pending.length}}",t)
    async def one(t):
        x=await parse(t);return (x['r']['entries'][0] if x['r'] and x['r']['entries'] else None)
    e=await one('paid 340 for lunch from KM, split with Arjun')
    ok('parse: lunch from KM split with Arjun',e and e['type']=='expense' and e['amount']==340 and e['account']=='km' and len(e['split'])==1 and e['split'][0]['person']=='Arjun' and e['split'][0]['amount']==170,e)
    e=await one('water 500');ok('parse: "water 500" is 500 ml',e and e['type']=='water' and e['ml']==500,e)
    e=await one('500 ml water');ok('parse: "500 ml water" is 500 ml',e and e['type']=='water' and e['ml']==500,e)
    e=await one('cfa 45');ok('parse: "cfa 45" is 45 min',e and e['type']=='cfa' and e['min']==45,e)
    e=await one('weight 68.9');ok('parse: "weight 68.9" is 68.9 kg',e and e['type']=='weight' and e['kg']==68.9,e)
    e=await one('spent ₹120 on uber cc');ok('parse: uber on cc',e and e['type']=='expense' and e['amount']==120 and e['account']=='cc',e)
    e=await one('got 25000 allowance in KM Bank');ok('parse: allowance in KM Bank is income to km',e and e['type']=='income' and e['amount']==25000 and e['account']=='km',e)
    e=await one('paid 600 dinner, Wrik owes 200')
    ok('parse: dinner with Wrik owing 200',e and e['type']=='expense' and e['amount']==600 and e['split'][0]['person']=='Wrik' and e['split'][0]['amount']==200,e)
    x=await parse('blah blah nothing')
    ok('parse: unknown text returns null and creates no pending entry',x['r'] is None and x['pend']==0,x)
    ok('parse: no page errors',not p.errs,p.errs[:3])
    await c.close();await b.close();await _h.close()
asyncio.run(main())
finish()

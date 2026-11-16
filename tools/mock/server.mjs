// Local stand-in for Supabase: real Postgres (pglite) running the real 1-database.sql, behind the same URLs the app calls.
import {PGlite} from '@electric-sql/pglite';
import http from 'node:http';import fs from 'node:fs';import vm from 'node:vm';
/* the real feed builder, the same file the cloud function inlines */
vm.runInThisContext(fs.readFileSync(new URL('../../app/cal-core.js',import.meta.url),'utf8'));const CalCore=globalThis.CalCore;
const pg=new PGlite();
await pg.exec(`create schema auth; create table auth.users(id uuid primary key, email text);
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('app.uid',true),'')::uuid $$;
create role authenticated; create role anon; create role service_role;`);
await pg.exec(fs.readFileSync(new URL('../../app/cloud/1-database.sql',import.meta.url),'utf8'));
const USERS={'test@example.com':{pw:'pw',id:'11111111-1111-1111-1111-111111111111'}};
for(const u of Object.values(USERS))await pg.query('insert into auth.users values($1,$2)',[u.id,'test@example.com']);
let down=false;
const send=(res,code,obj)=>{res.writeHead(code,{'Content-Type':'application/json','Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'*'});res.end(JSON.stringify(obj))};
let chain=Promise.resolve();
http.createServer((req,res)=>{
  if(req.method==='OPTIONS')return send(res,200,{});
  let b='';req.on('data',d=>b+=d);req.on('end',()=>{chain=chain.then(async()=>{
    try{
      const u=new URL(req.url,'http://x');const body=b?JSON.parse(b):{};
      if(u.pathname==='/__down'){down=body.down;return send(res,200,{down})}
      if(u.pathname==='/__dump'){const r=await pg.query('select col,id,flat,ft,seq from records order by seq');return send(res,200,r.rows)}
      if(down){res.destroy();return}
      if(u.pathname==='/functions/v1/remind'&&req.method==='GET'){
        const cal=u.searchParams.get('cal');
        if(cal===null)return send(res,200,{publicKey:''});
        const r=/^[A-Za-z0-9_-]{20,64}$/.test(cal)?await pg.query('select service_calendar($1) as f',[cal]):{rows:[]};
        const f=r.rows[0]&&r.rows[0].f;
        if(!f){res.writeHead(404,{'Content-Type':'text/plain; charset=utf-8','Access-Control-Allow-Origin':'*'});return res.end('Calendar not found.')}
        res.writeHead(200,{'Content-Type':'text/calendar; charset=utf-8','Cache-Control':'max-age=900','Access-Control-Allow-Origin':'*'});
        return res.end(CalCore.build(Array.isArray(f.items)?f.items:[],{tz:'Asia/Kolkata',stamp:Number(f.at)||Date.now()}));
      }
      if(u.pathname==='/auth/v1/token'){
        if(u.searchParams.get('grant_type')==='password'){const x=USERS[body.email];if(!x||x.pw!==body.password)return send(res,400,{error_description:'Invalid login credentials'});return send(res,200,{access_token:'tok:'+x.id,refresh_token:'ref:'+x.id,expires_in:3600})}
        const id=String(body.refresh_token||'').slice(4);return send(res,200,{access_token:'tok:'+id,refresh_token:'ref:'+id,expires_in:3600});
      }
      const m=u.pathname.match(/^\/rest\/v1\/rpc\/(\w+)$/);
      if(m){
        const tok=(req.headers.authorization||'').replace('Bearer ','');if(!tok.startsWith('tok:'))return send(res,401,{message:'JWT invalid'});
        await pg.query(`select set_config('app.uid',$1,false)`,[tok.slice(4)]);
        let r;
        if(m[1]==='push_records')r=await pg.query('select * from push_records($1::jsonb)',[JSON.stringify(body.recs)]);
        else if(m[1]==='pull_records')r=await pg.query('select * from pull_records($1,$2)',[body.since||0,body.lim||500]);
        else if(m[1]==='save_push_sub'){await pg.query('select save_push_sub($1,$2,$3,$4)',[body.endpoint,body.p256dh,body.auth,body.label||null]);return send(res,200,null)}
        else return send(res,404,{message:'no such function'});
        return send(res,200,r.rows.map(x=>({...x,seq:Number(x.seq)})));
      }
      send(res,404,{message:'not found'});
    }catch(e){send(res,500,{message:String(e.message||e)})}
  })});
}).listen(+process.env.MPORT||8790,()=>console.log('mock up'));

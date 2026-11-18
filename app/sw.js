/* Service worker: makes the app open offline and shows push reminders. */
/* V and OPT are rewritten by tools/build.py on every build */
const V='ld-v2-bf0a1e72';
const SHELL=['./','index.html','store.js','reminders-core.js','extra.js','theme.css','manifest.webmanifest','icons/icon-192.png','icons/icon-512.png','icons/apple-touch-icon.png','icons/badge.png','fonts/cormorant-500.woff2','fonts/cormorant-600.woff2','fonts/figtree-var.woff2'];
/* design layers and images, included when the build found them */
const OPT=['ui/common.js','ui/program.js','ui/wall.js','ui/today.js','ui/paper.js','ui/body.js','ui/money.js','ui/study.js','ui/career.js','ui/design.css','img/arch-1600.webp','img/arch-800.webp','img/arch-thumb.jpg','img/coast-1600.webp','img/coast-800.webp','img/coast-thumb.jpg','img/gym-1600.webp','img/gym-800.webp','img/gym-thumb.jpg','img/ridge-1600.webp','img/ridge-800.webp','img/ridge-thumb.jpg','img/study-1600.webp','img/study-800.webp','img/study-thumb.jpg','img/table-1600.webp','img/table-800.webp','img/table-thumb.jpg'];
/* cache each file on its own: one missing file must not stop the app installing */
const grab=(c,u)=>fetch(u,{cache:'reload'}).then(r=>r.ok?c.put(u,r):null).catch(()=>null);
self.addEventListener('install',e=>{e.waitUntil(caches.open(V).then(c=>Promise.all(SHELL.concat(OPT).map(u=>grab(c,u)))).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==V).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{
  const u=new URL(e.request.url);
  if(e.request.method!=='GET'||u.origin!==location.origin)return;
  /* network first so updates arrive, cache when offline */
  e.respondWith(fetch(e.request,{cache:'no-cache'}).then(r=>{if(r.ok){const cp=r.clone();caches.open(V).then(c=>c.put(e.request,cp))}return r}).catch(()=>caches.match(e.request,{ignoreSearch:true}).then(r=>r||caches.match('index.html'))));
});
self.addEventListener('push',e=>{
  let d={};try{d=e.data?e.data.json():{}}catch(x){d={title:'Life Dashboard',body:e.data?e.data.text():''}}
  e.waitUntil(self.registration.showNotification(d.title||'Life Dashboard',{body:d.body||'',tag:d.tag||'ld',icon:'icons/icon-192.png',badge:'icons/badge.png',data:{url:d.url||'./'}}));
});
self.addEventListener('notificationclick',e=>{
  e.notification.close();
  e.waitUntil(self.clients.matchAll({type:'window',includeUncontrolled:true}).then(cs=>{for(const c of cs){if('focus' in c)return c.focus()}return self.clients.openWindow((e.notification.data&&e.notification.data.url)||'./')}));
});

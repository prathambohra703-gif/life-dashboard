/* ---------- photo wallpapers: replaces the painted scenes with the img/ photos ----------
   Chains the previous wallPrep (extra.js: user photos, then painted scenes). Drives the existing
   wallLoop/wallFrame; reduced motion, hidden tab, Live/Still/Off and --wallop are untouched. */
(function(){
  if(typeof wallPrep!=='function'||typeof WALL==='undefined')return;
  const prevPrep=wallPrep,PHOTOS=['coast','gym','table','arch','study','ridge'];
  const ST={};   // name -> {thumb,full,failed,tier,scene}
  const dpr=Math.min(window.devicePixelRatio||1,3);
  const TIER=(innerWidth*dpr>1100&&Math.min(innerWidth,innerHeight)*dpr>600)||innerWidth*dpr>1400?1600:800;
  const SEED={coast:3,gym:5,table:7,arch:11,study:13,ridge:17};
  const MOTE={coast:['255,200,150',.34],gym:['255,225,200',.16],table:['255,210,160',.2],arch:['240,225,200',.14],study:['255,214,150',.22],ridge:['255,215,180',.18]};
  const FOG_Y=SH*.285-125;

  function load(src,cb,err){const im=new Image();im.onload=()=>cb(im);im.onerror=err;im.src=src;return im}
  function st(n){
    let s=ST[n];if(s)return s;
    s=ST[n]={thumb:null,full:null,failed:false,tier:0,scene:null};
    const bad=()=>{if(!s.failed){s.failed=true;s.scene=null;refresh(n)}};
    load('img/'+n+'-thumb.jpg',im=>{s.thumb=im;if(!s.full)refresh(n)},bad);
    load('img/'+n+'-'+TIER+'.webp',im=>{s.full=im;refresh(n);idle()},bad);
    return s;
  }
  function refresh(n){
    // swap the live scene in place (no fade) when the image for the shown wallpaper arrives or fails
    if(WALL.name!==n||!WALL.g)return;
    try{WALL.scene=wallPrep(n);if(!WALL.raf)wallFrame(26)}catch(e){}
  }
  let idled=0;
  function idle(){ // after the first photo, quietly fetch the rest so tab changes are instant
    if(idled++)return;
    const go=()=>PHOTOS.forEach(st);(window.requestIdleCallback||setTimeout)(go,{timeout:4000});
  }
  function baseFrom(s){
    const c=mkc(SW,SH),g=c.getContext('2d'),im=s.full||s.thumb;
    g.fillStyle='#0c0c0d';g.fillRect(0,0,SW,SH);
    if(!s.full){g.imageSmoothingEnabled=true;g.imageSmoothingQuality='high'}
    const k=Math.max(SW/im.naturalWidth,SH/im.naturalHeight),w=im.naturalWidth*k,h=im.naturalHeight*k;
    g.drawImage(im,(SW-w)/2,(SH-h)/2,w,h);
    if(typeof vig==='function')vig(g,SW,SH,.42);
    if(s.full&&typeof grain==='function')grain(g,SW,SH,41,1400,.025);
    return c;
  }
  function dynFor(n){
    const m=MOTE[n],d={mote:motes(SEED[n]*7,n==='coast'?24:12,0,SH*.12,SW,SH*.72)};
    if(n==='coast')d.fog=fogTex(SEED[n],'205,190,180',.035,.085);
    return {d,fn(g,t,dd,W,H){
      if(dd.fog){ // soft fog band drifting over the horizon (tileable texture, ~3 px/s)
        const sx=(t*3)%W;g.drawImage(dd.fog,sx,0,W,190,0,FOG_Y,W,190);
        const ph=(t%40)/9; // light sweep: ~9 s pass every 40 s
        if(ph<1){const x=-260+ph*(W+520),a=.07*Math.sin(Math.PI*ph),gr=g.createLinearGradient(x-220,0,x+220,0);
          gr.addColorStop(0,'rgba(255,196,140,0)');gr.addColorStop(.5,'rgba(255,196,140,'+a.toFixed(3)+')');gr.addColorStop(1,'rgba(255,196,140,0)');
          g.fillStyle=gr;g.fillRect(x-220,0,440,H)}
      }
      drawMotes(g,t,dd.mote,m[0],m[1]);
    }};
  }
  wallPrep=function(name){
    const u=typeof XS!=='undefined'&&XS.heroImg&&XS.heroImg[name];
    if(u&&u.complete&&u.naturalWidth)return prevPrep(name);   // the user's own photo wins
    if(!PHOTOS.includes(name))return prevPrep(name);          // e.g. 'city' stays painted
    const s=st(name);
    if(s.failed)return prevPrep(name);                         // photo missing: old painted scene
    const tier=s.full?2:s.thumb?1:0;
    if(s.scene&&s.tier===tier)return s.scene;
    let sc;
    if(!tier){const c=mkc(SW,SH),g=c.getContext('2d');g.fillStyle='#0c0c0d';g.fillRect(0,0,SW,SH);sc={base:c,dyn:null,data:null,paint:null}}
    else{const dy=dynFor(name);sc={base:baseFrom(s),dyn:s.full?dy.fn:null,data:dy.d,paint:null}}
    s.tier=tier;return s.scene=sc;
  };
  // start fetching the visible scene's photos now (thumbs are ~400 B)
  try{PHOTOS.forEach(n=>{const s=st(n)})}catch(e){}
})();

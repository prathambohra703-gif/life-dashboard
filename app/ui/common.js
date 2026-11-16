/* Shared UI components. Plain functions returning HTML strings; nothing runs on load. See DESIGN.md. */
(function(){
  function ui_esc(s){
    if(typeof window.esc==='function')return window.esc(s);
    return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]});
  }
  /* a string that starts with "<" is treated as ready HTML, anything else is escaped text */
  function ui_html(x){return typeof x==='string'&&x.charAt(0)==='<'?x:null}
  function ui_list(x){return x==null||x===''?[]:Array.isArray(x)?x:[x]}
  var SCENES=['coast','gym','table','arch','study','ridge'];

  /* chips: array of HTML strings, text strings, or {text, tone:'acc'|'good'|'warn'|'bad'} */
  function ui_chip(c){
    if(c&&typeof c==='object')return '<span class="pill'+(c.tone?' '+ui_esc(c.tone):'')+'">'+ui_esc(c.text)+'</span>';
    return ui_html(c)||'<span class="pill">'+ui_esc(c)+'</span>';
  }

  window.secHero=function(o){
    o=o||{};
    var scene=SCENES.indexOf(o.scene)>=0?o.scene:'coast';
    var chips=ui_list(o.chips).map(ui_chip).join('');
    var acts=ui_list(o.actions).map(function(a){return ui_html(a)||ui_esc(a)}).join('');
    var num=(o.number!=null&&o.number!=='')?'<div class="sec-hero__num mono">'+ui_esc(o.number)+(o.unit?'<small>'+ui_esc(o.unit)+'</small>':'')+'</div>':'';
    return '<section class="sec-hero" data-scene="'+scene+'"><div class="sec-hero__shade" aria-hidden="true"></div><div class="sec-hero__in">'+
      (o.eyebrow?'<div class="sec-hero__eyebrow">'+ui_esc(o.eyebrow)+'</div>':'')+
      (o.title?'<h2 class="sec-hero__title">'+ui_esc(o.title)+'</h2>':'')+num+
      (o.sub?'<p class="sec-hero__sub">'+ui_esc(o.sub)+'</p>':'')+
      (chips?'<div class="sec-hero__chips">'+chips+'</div>':'')+
      (acts?'<div class="sec-hero__act">'+acts+'</div>':'')+
      '</div></section>';
  };

  /* items: [{key,label}] or [[key,label]]; buttons carry data-act="<act>" data-v="<key>" */
  window.subNav=function(items,current,act){
    return '<nav class="subnav" role="tablist">'+ui_list(items).map(function(it){
      var k=Array.isArray(it)?it[0]:it.key,l=Array.isArray(it)?it[1]:it.label,on=k===current;
      return '<button type="button" role="tab" data-act="'+ui_esc(act)+'" data-v="'+ui_esc(k)+'" aria-selected="'+on+'">'+ui_esc(l)+'</button>';
    }).join('')+'</nav>';
  };

  /* rows: [{label, value, sub, tone}] tone: acc|good|warn|bad */
  window.statRow=function(rows){
    var rr=ui_list(rows);
    return '<div class="statrow'+(rr.length===3?' n3':'')+'">'+rr.map(function(r){
      return '<div class="stat-t'+(r.tone?' '+ui_esc(r.tone):'')+'"><span class="lbl">'+ui_esc(r.label)+'</span><span class="stat-t__v mono">'+ui_esc(r.value)+'</span>'+(r.sub?'<span class="stat-t__s">'+ui_esc(r.sub)+'</span>':'')+'</div>';
    }).join('')+'</div>';
  };

  /* actionHtml is ready HTML (for example a .btn), not escaped */
  window.emptyState=function(text,actionHtml){
    return '<div class="emptys"><p>'+ui_esc(text)+'</p>'+(actionHtml||'')+'</div>';
  };
})();

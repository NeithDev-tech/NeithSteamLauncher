(function(){
  'use strict';
  if(window.__NEITH_UNIFIED_V6__) return; window.__NEITH_UNIFIED_V6__=true;
  var legacyHeader=document.querySelector('body > .topbar, body > header.topbar');
  var legacyAuth=legacyHeader&&legacyHeader.querySelector('.nav-auth-button');
  var depth=(location.pathname.replace(/\/+/g,'/').split('/').filter(Boolean).length>0)?'../':'./';
  // Local preview often serves /section/ as expected. Absolute-ish relative URLs keep GitHub/Netlify compatibility.
  var home=depth+'index.html';
  var DOWNLOAD_URL='https://github.com/NeithDev-tech/NeithSteamLauncher/releases/download/v1.0.1/NeithSetup.exe';
  var GITHUB_URL='https://github.com/NeithDev-tech/NeithSteamLauncher/releases/tag/v1.0.1';
  var header=document.createElement('header'); header.id='neith-v4-header';
  header.innerHTML='<div class="n4-shell n4-nav">'+
    '<a class="n4-brand n4-brand-master" href="'+home+'"><img src="'+depth+'img/neith-master-logo-premium-transparent.webp" alt="Neith Steam Launcher PRO"></a>'+
    '<nav class="n4-links" aria-label="Main">'+
      '<a class="n4-section-link" href="'+home+'#vac-live">CS2 VAC LIVE</a><a class="n4-section-link" href="'+home+'#hour-boost">HOUR BOOST</a><a class="n4-section-link" href="'+home+'#steam-accounts">STEAM ACCOUNTS</a><a class="n4-section-link" href="'+home+'#free-games">FREE GAMES</a><a class="n4-section-link" href="'+home+'#premium">PREMIUM</a><a class="n4-section-link" href="'+home+'#download">DOWNLOAD FREE</a>'+
      '<a class="n4-mobile-owner-link n4-mobile-admin-link" href="'+depth+'admin/" hidden>ADMIN</a><a class="n4-mobile-owner-link n4-mobile-premium-link" href="'+depth+'premium/" hidden>PREMIUM</a>'+
      '<button class="n4-mobile-auth" type="button">NEITH ID / ACCOUNT</button><a class="n4-mobile-download" href="'+DOWNLOAD_URL+'" data-neith-download="1" data-neith-download-source="mobile-menu">DOWNLOAD NEITH FREE</a>'+
    '</nav>'+
    '<div class="n4-actions"><button class="n4-btn n4-menu-toggle" type="button" aria-label="Menu">☰</button><a class="n4-owner-link n4-admin-link" href="'+depth+'admin/" hidden>ADMIN</a><a class="n4-owner-link n4-premium-link" href="'+depth+'premium/" hidden>PREMIUM</a><button class="n4-btn n4-auth" type="button"><span class="n4-auth-led"></span><span class="n4-auth-label">SIGN IN</span></button><a class="n4-btn primary" href="'+DOWNLOAD_URL+'" data-neith-download="1" data-neith-download-source="global-header">DOWNLOAD FREE</a></div>'+
  '</div>';
  document.body.insertBefore(header,document.body.firstChild);

  // V49: keep the visible header mounted when navigating inside HOME.
  // Clicking the Neith logo while already on HOME scrolls to the top without a page reload.
  function isHomeDocument(){
    var path=(location.pathname||'/').replace(/\/+$/,'');
    return path==='' || path==='/' || /\/index\.html$/i.test(path);
  }
  function scrollHomeTarget(hash){
    var target=hash?document.querySelector(hash):null;
    var top=target?Math.max(0,target.getBoundingClientRect().top+window.scrollY-(header.getBoundingClientRect().height||0)-12):0;
    window.scrollTo({top:top,behavior:'smooth'});
    if(hash){
      try{history.replaceState(history.state,'',hash);}catch(_){}
    }else{
      try{history.replaceState(history.state,'',location.pathname+location.search);}catch(_){}
    }
  }
  var liveBrand=header.querySelector('.n4-brand-master');
  if(liveBrand){
    liveBrand.addEventListener('click',function(e){
      if(!isHomeDocument()) return;
      e.preventDefault();
      closeMobileMenu();
      scrollHomeTarget('');
    });
  }
  header.querySelectorAll('.n4-links a').forEach(function(link){
    link.addEventListener('click',function(e){
      if(!isHomeDocument()) return;
      var u; try{u=new URL(link.href,location.href);}catch(_){return;}
      if(u.origin!==location.origin) return;
      var current=(location.pathname||'/').replace(/\/+$/,'');
      var target=(u.pathname||'/').replace(/\/+$/,'');
      var currentHome=current===''||current==='/'||/\/index\.html$/i.test(current);
      var targetHome=target===''||target==='/'||/\/index\.html$/i.test(target);
      if(!currentHome||!targetHome) return;
      e.preventDefault();
      closeMobileMenu();
      scrollHomeTarget(u.hash||'');
    });
  });

  // V89: scroll-aware HOME navigation. Reuses the existing header only; no polling/timers.
  function initHomeScrollSpy(){
    if(!isHomeDocument()) return;
    var links={};
    header.querySelectorAll('.n4-section-link').forEach(function(a){
      var u; try{u=new URL(a.href,location.href);}catch(_){return;}
      if(u.hash) links[u.hash.slice(1)]=a;
    });
    var groups=[
      {id:'neith-id',key:'neith-id'},
      {id:'power',key:'power'},
      {id:'hourboost-advanced',key:'power'},
      {id:'why-neith',key:'why-neith'},
      {id:'plans',key:'premium'},
      {id:'premium',key:'premium'},
      {id:'support',key:'download'},
      {id:'download',key:'download'}
    ].map(function(item){item.el=document.getElementById(item.id);return item;}).filter(function(item){return !!item.el;});
    var active='';
    function setActive(key){
      if(active===key) return;
      active=key||'';
      Object.keys(links).forEach(function(k){
        var on=k===active;
        links[k].classList.toggle('is-active',on);
        if(on) links[k].setAttribute('aria-current','location');
        else links[k].removeAttribute('aria-current');
      });
    }
    var ticking=false;
    function update(){
      ticking=false;
      var headerH=Math.ceil(header.getBoundingClientRect().height||0);
      var probe=window.scrollY+headerH+Math.min(180,Math.max(72,window.innerHeight*.24));
      var chosen='';
      for(var i=0;i<groups.length;i++){
        var top=groups[i].el.getBoundingClientRect().top+window.scrollY;
        if(top<=probe) chosen=groups[i].key; else break;
      }
      // Before the first mapped section, keep the menu neutral rather than highlighting a false section.
      setActive(chosen);
    }
    function requestUpdate(){if(ticking)return;ticking=true;requestAnimationFrame(update);}
    window.addEventListener('scroll',requestUpdate,{passive:true});
    window.addEventListener('resize',requestUpdate,{passive:true});
    window.addEventListener('hashchange',requestUpdate);
    header.querySelectorAll('.n4-section-link').forEach(function(a){a.addEventListener('click',function(){var h=(new URL(a.href,location.href)).hash.slice(1);if(h)setActive(h);});});
    requestUpdate();
  }
  initHomeScrollSpy();
  // V48: the visible Neith header is fixed. Keep document offset synced to its real height.
  function syncFixedHeaderHeight(){
    try{
      var h=Math.ceil(header.getBoundingClientRect().height||0);
      if(h>0) document.documentElement.style.setProperty('--neith-v4-fixed-header-height',h+'px');
    }catch(_){}
  }
  syncFixedHeaderHeight();
  if('ResizeObserver' in window){
    var headerSizeObserver=new ResizeObserver(syncFixedHeaderHeight);
    headerSizeObserver.observe(header);
  }
  window.addEventListener('resize',syncFixedHeaderHeight,{passive:true});
  requestAnimationFrame(syncFixedHeaderHeight);
  if(legacyHeader) legacyHeader.setAttribute('aria-hidden','true');
  var nav=header.querySelector('.n4-nav'), menuToggle=header.querySelector('.n4-menu-toggle');
  var mobileBackdrop=document.createElement('button');
  mobileBackdrop.type='button'; mobileBackdrop.className='n4-mobile-backdrop'; mobileBackdrop.setAttribute('aria-label','Close menu'); mobileBackdrop.hidden=true;
  document.body.insertBefore(mobileBackdrop,header.nextSibling);
  function setMobileMenu(open){
    open=!!open && window.matchMedia('(max-width:980px)').matches;
    nav.classList.toggle('open',open);
    menuToggle.setAttribute('aria-expanded',open?'true':'false');
    menuToggle.setAttribute('aria-label',open?'Close menu':'Open menu');
    mobileBackdrop.hidden=!open;
    document.documentElement.classList.toggle('n4-mobile-menu-open',open);
    document.body.classList.toggle('n4-mobile-menu-open',open);
    requestAnimationFrame(syncFixedHeaderHeight);
  }
  function closeMobileMenu(){setMobileMenu(false)}
  menuToggle.setAttribute('aria-expanded','false');
  menuToggle.addEventListener('click',function(){setMobileMenu(!nav.classList.contains('open'))});
  mobileBackdrop.addEventListener('click',closeMobileMenu);
  document.addEventListener('keydown',function(e){if(e.key==='Escape')closeMobileMenu()});
  window.addEventListener('resize',function(){if(window.innerWidth>980)closeMobileMenu()},{passive:true});
  nav.querySelectorAll('.n4-links a').forEach(function(a){a.addEventListener('click',closeMobileMenu)});
  var auth=header.querySelector('.n4-auth'), label=header.querySelector('.n4-auth-label');
  function sync(){ if(legacyAuth){var t=legacyAuth.querySelector('[data-auth-nav-label]')||legacyAuth; var s=(t.textContent||'').trim(); if(s){ label.textContent=(/INICIAR\s*SESI[ÓO]N/i.test(s)?'SIGN IN':s); return; }} label.textContent='SIGN IN'; }
  sync(); if(legacyAuth){new MutationObserver(sync).observe(legacyAuth,{subtree:true,childList:true,characterData:true,attributes:true});}
  auth.addEventListener('click',function(e){e.preventDefault(); if(window.NeithAuth&&typeof window.NeithAuth.handleHeaderTrigger==='function') return window.NeithAuth.handleHeaderTrigger(auth); if(window.NeithAuth&&typeof window.NeithAuth.open==='function') return window.NeithAuth.open('login'); if(legacyAuth) legacyAuth.click(); else location.href=depth+'mi-cuenta/';});
  var mobileAuth=header.querySelector('.n4-mobile-auth');
  if(mobileAuth) mobileAuth.addEventListener('click',function(e){e.preventDefault();closeMobileMenu();auth.click();});
  document.addEventListener('neith:authchange',sync);
  var ownerCheckSeq=0, ownerConfirmed=false;
  async function syncOwnerTools(){
    var adminLinks=[...header.querySelectorAll('.n4-admin-link,.n4-mobile-admin-link')], premiumLinks=[...header.querySelectorAll('.n4-premium-link,.n4-mobile-premium-link')];
    if(!adminLinks.length||!premiumLinks.length)return;
    var setOwnerLinks=function(show){adminLinks.forEach(function(x){x.hidden=!show});premiumLinks.forEach(function(x){x.hidden=!show})};
    var seq=++ownerCheckSeq;
    try{
      var a=window.NeithAuth;
      if(!a?.session?.user||!a?.client){
        ownerConfirmed=false; setOwnerLinks(false); return;
      }
      var r=await a.client.rpc('neith_is_owner');
      if(seq!==ownerCheckSeq)return;
      if(!r?.error && r?.data===true){
        ownerConfirmed=true; setOwnerLinks(true); return;
      }
      ownerConfirmed=false; setOwnerLinks(false);
    }catch(_){
      if(!ownerConfirmed)setOwnerLinks(false);
    }
  }
  function queueOwnerSync(){setTimeout(syncOwnerTools,120);setTimeout(syncOwnerTools,900)}
  queueOwnerSync();
  window.addEventListener('neith:authchange',queueOwnerSync);

  var oldFoot=document.querySelector('body > footer,.footer'); if(oldFoot) oldFoot.setAttribute('aria-hidden','true');
  var footer=document.createElement('footer'); footer.id='neith-v4-footer'; footer.innerHTML='<div class="n12-footer"><div class="n12-footer-main"><section class="n12-brand"><a class="n12-logo" href="'+home+'"><img src="'+depth+'img/neith-master-logo-premium-transparent.webp" alt="Neith Steam Launcher PRO"></a><p>VAC Live, Hour Boost, Steam accounts, free games, achievements and PC tools — unified in one premium Windows launcher.</p><div class="n12-status"><span><i></i>SYSTEM ONLINE</span><span data-unique-visitors hidden>V: <b data-unique-visitors-value>—</b></span></div></section><section class="n12-nav"><div><b>PRODUCT</b><a href="'+home+'#vac-live">VAC LIVE</a><a href="'+home+'#hour-boost">Hour Boost</a><a href="'+home+'#steam-accounts">Steam Accounts</a><a href="'+home+'#free-games">Free Games</a><a href="'+home+'#premium">Premium</a><a href="'+DOWNLOAD_URL+'" data-neith-download="1" data-neith-download-source="global-footer">Download</a></div><div><b>SUPPORT</b><a class="home228-contact" href="#neith-contact" data-neith-contact-open>Contact by email</a><a href="'+depth+'faq/">FAQ</a><a class="n12-auth-only" href="'+depth+'mi-cuenta/" hidden>My account</a></div></section><section class="n12-community"><div class="n12-community-head"><span>NEITH COMMUNITY</span><strong>Stay connected with Neith.</strong><p>Get support, release updates and talk with other users in the official Discord server.</p></div><a class="n12-discord" href="https://discord.gg/Dgkc6wv79F" data-neith-community="discord" data-neith-community-source="global-footer" target="_blank" rel="noopener"><span class="n12-discord-icon"><svg viewBox="0 0 256 199" aria-hidden="true"><path fill="currentColor" d="M216.856 16.597A208.502 208.502 0 0 0 164.041 0a161.06 161.06 0 0 0-6.404 13.328 193.57 193.57 0 0 0-58.505 0A160.41 160.41 0 0 0 92.728 0 207.809 207.809 0 0 0 39.872 16.638C6.818 66.146-2.184 114.595 2.321 162.348a210.95 210.95 0 0 0 64.183 32.149 158.46 158.46 0 0 0 13.824-22.256 136.413 136.413 0 0 1-21.846-10.632 103.38 103.38 0 0 0 5.489-4.169 149.325 149.325 0 0 0 128.06 0 133.02 133.02 0 0 0 5.489 4.169 136.7 136.7 0 0 1-21.887 10.652 157.04 157.04 0 0 0 13.824 22.236 210.88 210.88 0 0 0 64.183-32.129c5.29-55.684-9.04-103.695-36.39-145.77ZM85.474 132.105c-12.496 0-22.804-11.474-22.804-25.534 0-14.06 10.022-25.534 22.804-25.534 12.823 0 23.09 11.515 22.804 25.534 0 14.06-10.022 25.534-22.804 25.534Zm85.051 0c-12.496 0-22.804-11.474-22.804-25.534 0-14.06 10.022-25.534 22.804-25.534 12.823 0 23.09 11.515 22.804 25.534 0 14.06-9.981 25.534-22.804 25.534Z"/></svg></span><span class="n12-discord-copy"><b>OFFICIAL DISCORD</b><strong>Join the Neith community</strong><small>Support · updates · feedback</small></span><span class="n12-discord-cta">JOIN DISCORD <b>↗</b></span></a></section></div><div class="n12-footer-bottom"><span>© 2026 NEITH STEAM LAUNCHER PRO</span><span>INDEPENDENT PROJECT · NOT AFFILIATED WITH VALVE</span></div></div>'; document.body.appendChild(footer);
  function syncAuthOnly(){
    var signedIn=!!window.NeithAuth?.session?.user;
    document.documentElement.classList.toggle('neith-authenticated',signedIn);
    footer.querySelectorAll('.n12-auth-only').forEach(function(el){el.hidden=!signedIn;});
    document.querySelectorAll('[data-neith-contact-open]').forEach(function(el){el.hidden=false;});
  }
  syncAuthOnly();
  window.addEventListener('neith:authchange',syncAuthOnly);
  setTimeout(syncAuthOnly,250); setTimeout(syncAuthOnly,1200);
  if(!document.querySelector('script[data-neith-visitor-counter]')){var vc=document.createElement('script');vc.defer=true;vc.dataset.neithVisitorCounter='1';vc.src=depth+'js/visitor-counter-r192.js?v=20261024-v6';document.body.appendChild(vc);}
  if(!document.querySelector('script[data-neith-image-lightbox]')){var lb=document.createElement('script');lb.defer=true;lb.dataset.neithImageLightbox='1';lb.src=depth+'js/neith-image-lightbox-v15.js?v=20261025-v53';document.body.appendChild(lb);}
})();

/* V29 global analytics bootstrap */
(()=>{try{const current=document.currentScript?.src;if(!current)return;const base=new URL('./',current);for(const f of ['neith-site-analytics-v29.js','neith-owner-analytics-v29.js']){if(document.querySelector(`script[data-neith-v29="${f}"]`))continue;const s=document.createElement('script');s.src=new URL(f+'?v=20261026-v83-tracking',base).href;s.defer=true;s.dataset.neithV29=f;document.head.appendChild(s)}}catch{}})();

(function(){
  'use strict';
  if(window.__NEITH_UNIFIED_V6__) return; window.__NEITH_UNIFIED_V6__=true;
  var legacyHeader=document.querySelector('body > .topbar, body > header.topbar');
  var legacyAuth=legacyHeader&&legacyHeader.querySelector('.nav-auth-button');
  var depth=(location.pathname.replace(/\/+/g,'/').split('/').filter(Boolean).length>0)?'../':'./';
  // Local preview often serves /section/ as expected. Absolute-ish relative URLs keep GitHub/Netlify compatibility.
  var home=depth+'index.html';
  var header=document.createElement('header'); header.id='neith-v4-header';
  header.innerHTML='<div class="n4-shell n4-nav">'+
    '<a class="n4-brand n4-brand-master" href="'+home+'"><img src="'+depth+'img/neith-master-logo-premium-transparent.webp" alt="Neith Steam Launcher PRO"></a>'+
    '<nav class="n4-links" aria-label="Main">'+
      '<a href="'+home+'#neith-id">NEITH ID</a><a href="'+home+'#power">FEATURES</a><a href="'+home+'#compare">WHY NEITH</a><a href="'+home+'#premium">PREMIUM</a><a href="'+home+'#download">DOWNLOAD</a>'+
    '</nav>'+
    '<div class="n4-actions"><button class="n4-btn n4-menu-toggle" type="button" aria-label="Menu">☰</button><a class="n4-owner-link n4-admin-link" href="'+depth+'admin/" hidden>ADMIN</a><a class="n4-owner-link n4-premium-link" href="'+depth+'premium/" hidden>PREMIUM</a><button class="n4-btn n4-auth" type="button"><span class="n4-auth-led"></span><span class="n4-auth-label">SIGN IN</span></button><a class="n4-btn primary" href="'+depth+'descargar">DOWNLOAD FREE</a></div>'+
  '</div>';
  document.body.insertBefore(header,document.body.firstChild);
  if(legacyHeader) legacyHeader.setAttribute('aria-hidden','true');
  var nav=header.querySelector('.n4-nav'); header.querySelector('.n4-menu-toggle').addEventListener('click',function(){nav.classList.toggle('open')});
  var auth=header.querySelector('.n4-auth'), label=header.querySelector('.n4-auth-label');
  function sync(){ if(legacyAuth){var t=legacyAuth.querySelector('[data-auth-nav-label]')||legacyAuth; var s=(t.textContent||'').trim(); if(s){ label.textContent=(/INICIAR\s*SESI[ÓO]N/i.test(s)?'SIGN IN':s); return; }} label.textContent='SIGN IN'; }
  sync(); if(legacyAuth){new MutationObserver(sync).observe(legacyAuth,{subtree:true,childList:true,characterData:true,attributes:true});}
  auth.addEventListener('click',function(e){e.preventDefault(); if(window.NeithAuth&&typeof window.NeithAuth.handleHeaderTrigger==='function') return window.NeithAuth.handleHeaderTrigger(auth); if(window.NeithAuth&&typeof window.NeithAuth.open==='function') return window.NeithAuth.open('login'); if(legacyAuth) legacyAuth.click(); else location.href=home+'#neith-id';});
  document.addEventListener('neith:authchange',sync);
  var ownerCheckSeq=0, ownerConfirmed=false;
  async function syncOwnerTools(){
    var adminLink=header.querySelector('.n4-admin-link'), premiumLink=header.querySelector('.n4-premium-link');
    if(!adminLink||!premiumLink)return;
    var seq=++ownerCheckSeq;
    try{
      var a=window.NeithAuth;
      if(!a?.session?.user||!a?.client){
        ownerConfirmed=false; adminLink.hidden=true; premiumLink.hidden=true; return;
      }
      var r=await a.client.rpc('neith_is_owner');
      if(seq!==ownerCheckSeq)return;
      if(!r?.error && r?.data===true){
        ownerConfirmed=true; adminLink.hidden=false; premiumLink.hidden=false; return;
      }
      ownerConfirmed=false; adminLink.hidden=true; premiumLink.hidden=true;
    }catch(_){
      if(!ownerConfirmed){adminLink.hidden=true; premiumLink.hidden=true;}
    }
  }
  function queueOwnerSync(){setTimeout(syncOwnerTools,120);setTimeout(syncOwnerTools,900)}
  queueOwnerSync();
  window.addEventListener('neith:authchange',queueOwnerSync);

  var oldFoot=document.querySelector('body > footer,.footer'); if(oldFoot) oldFoot.setAttribute('aria-hidden','true');
  var footer=document.createElement('footer'); footer.id='neith-v4-footer'; footer.innerHTML='<div class="n12-footer"><div class="n12-footer-main"><section class="n12-brand"><a class="n12-logo" href="'+home+'"><img src="'+depth+'img/neith-master-logo-premium-transparent.webp" alt="Neith Steam Launcher PRO"></a><p>VAC Live, Hour Boost, Steam accounts, free games, achievements and PC tools — unified in one premium Windows launcher.</p><div class="n12-status"><span><i></i>SYSTEM ONLINE</span><span data-unique-visitors hidden>V: <b data-unique-visitors-value>—</b></span></div></section><section class="n12-nav"><div><b>PRODUCT</b><a href="'+home+'#neith-id">Neith ID</a><a href="'+home+'#power">Features</a><a href="'+home+'#premium">Premium</a><a href="'+depth+'descargar">Download</a></div><div><b>SUPPORT</b><a class="home228-contact n12-auth-only" href="#neith-contact" data-neith-contact-open hidden>Contact by email</a><a href="'+depth+'faq/">FAQ</a><a class="n12-auth-only" href="'+depth+'mi-cuenta/" hidden>My account</a></div></section><section class="n12-community"><div class="n12-community-head"><span>NEITH COMMUNITY</span><strong>Stay connected with Neith.</strong><p>Get support, release updates and talk with other users in the official Discord server.</p></div><a class="n12-discord" href="https://discord.gg/Dgkc6wv79F" target="_blank" rel="noopener"><span class="n12-discord-icon"><svg viewBox="0 0 256 199" aria-hidden="true"><path fill="currentColor" d="M216.856 16.597A208.502 208.502 0 0 0 164.041 0a161.06 161.06 0 0 0-6.404 13.328 193.57 193.57 0 0 0-58.505 0A160.41 160.41 0 0 0 92.728 0 207.809 207.809 0 0 0 39.872 16.638C6.818 66.146-2.184 114.595 2.321 162.348a210.95 210.95 0 0 0 64.183 32.149 158.46 158.46 0 0 0 13.824-22.256 136.413 136.413 0 0 1-21.846-10.632 103.38 103.38 0 0 0 5.489-4.169 149.325 149.325 0 0 0 128.06 0 133.02 133.02 0 0 0 5.489 4.169 136.7 136.7 0 0 1-21.887 10.652 157.04 157.04 0 0 0 13.824 22.236 210.88 210.88 0 0 0 64.183-32.129c5.29-55.684-9.04-103.695-36.39-145.77ZM85.474 132.105c-12.496 0-22.804-11.474-22.804-25.534 0-14.06 10.022-25.534 22.804-25.534 12.823 0 23.09 11.515 22.804 25.534 0 14.06-10.022 25.534-22.804 25.534Zm85.051 0c-12.496 0-22.804-11.474-22.804-25.534 0-14.06 10.022-25.534 22.804-25.534 12.823 0 23.09 11.515 22.804 25.534 0 14.06-9.981 25.534-22.804 25.534Z"/></svg></span><span class="n12-discord-copy"><b>OFFICIAL DISCORD</b><strong>Join the Neith community</strong><small>Support · updates · feedback</small></span><span class="n12-discord-cta">JOIN DISCORD <b>↗</b></span></a></section></div><div class="n12-footer-bottom"><span>© 2026 NEITH STEAM LAUNCHER PRO</span><span>INDEPENDENT PROJECT · NOT AFFILIATED WITH VALVE</span></div></div>'; document.body.appendChild(footer);
  function syncAuthOnly(){
    var signedIn=!!window.NeithAuth?.session?.user;
    document.documentElement.classList.toggle('neith-authenticated',signedIn);
    footer.querySelectorAll('.n12-auth-only').forEach(function(el){el.hidden=!signedIn;});
    document.querySelectorAll('[data-neith-contact-open]').forEach(function(el){el.hidden=!signedIn;});
  }
  syncAuthOnly();
  window.addEventListener('neith:authchange',syncAuthOnly);
  setTimeout(syncAuthOnly,250); setTimeout(syncAuthOnly,1200);
  document.addEventListener('click',function(e){
    var contact=e.target.closest?.('[data-neith-contact-open]');
    if(!contact) return;
    if(window.NeithAuth?.session?.user) return;
    e.preventDefault(); e.stopImmediatePropagation();
    if(window.NeithAuth?.open) window.NeithAuth.open('login');
  },true);
  if(!document.querySelector('script[data-neith-visitor-counter]')){var vc=document.createElement('script');vc.defer=true;vc.dataset.neithVisitorCounter='1';vc.src=depth+'js/visitor-counter-r192.js?v=20261024-v6';document.body.appendChild(vc);}
  if(!document.querySelector('script[data-neith-image-lightbox]')){var lb=document.createElement('script');lb.defer=true;lb.dataset.neithImageLightbox='1';lb.src=depth+'js/neith-image-lightbox-v15.js?v=20261024-v15';document.body.appendChild(lb);}
})();

/* V29 global analytics bootstrap */
(()=>{try{const current=document.currentScript?.src;if(!current)return;const base=new URL('./',current);for(const f of ['neith-site-analytics-v29.js','neith-owner-analytics-v29.js']){if(document.querySelector(`script[data-neith-v29="${f}"]`))continue;const s=document.createElement('script');s.src=new URL(f,base).href;s.defer=true;s.dataset.neithV29=f;document.head.appendChild(s)}}catch{}})();

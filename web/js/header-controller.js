(() => {
  'use strict';
  const isSigned = btn => Boolean(window.NeithAuth?.session?.user) || btn.classList.contains('signed-in') || !/^(INICIAR SESIÓN|SIGN IN)$/i.test((btn.querySelector('[data-auth-nav-label]')?.textContent || '').trim());

  function fallbackToggle(btn){
    const menu=document.getElementById('neith-account-menu');
    if(!menu)return false;
    const open=!menu.classList.contains('open');
    menu.classList.toggle('open',open); menu.setAttribute('aria-hidden',open?'false':'true'); btn.setAttribute('aria-expanded',open?'true':'false');
    if(open){
      const r=btn.getBoundingClientRect(); const width=Math.min(360,Math.max(300,innerWidth-24));
      menu.style.width=`${width}px`; menu.style.left=`${Math.min(innerWidth-width-12,Math.max(12,r.right-width))}px`; menu.style.top=`${r.bottom+12}px`;
    }
    return true;
  }

  // Window capture runs before document/element handlers. The account control can never
  // fall through to an old anchor/dashboard navigation.
  window.addEventListener('click', e => {
    const btn=e.target.closest?.('[data-auth-nav]');
    if(!btn)return;
    e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation();
    btn.removeAttribute('href');
    if(isSigned(btn)){
      if(window.NeithAuth?.toggleAccountMenu) window.NeithAuth.toggleAccountMenu(btn); else fallbackToggle(btn);
    }else{
      window.NeithAuth?.open?.('login');
    }
    return false;
  }, true);

  // Remove any navigation semantics repeatedly, including headers rebuilt later.
  const sanitize=()=>document.querySelectorAll('[data-auth-nav]').forEach(btn=>{btn.removeAttribute('href');btn.removeAttribute('onclick');if(btn.tagName==='BUTTON')btn.type='button';});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',sanitize,{once:true});else sanitize();
  new MutationObserver(sanitize).observe(document.documentElement,{subtree:true,childList:true});
})();

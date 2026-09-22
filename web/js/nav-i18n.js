(() => {
  'use strict';
  const KEY='neith_language';
  const map={
    es:{'Logros':'Logros','Juegos Gratis':'Juegos Gratis','Cuentas':'Cuentas','INICIAR SESIÓN':'INICIAR SESIÓN','DESCARGAR LAUNCHER':'DESCARGAR LAUNCHER'},
    en:{'Logros':'Achievements','Juegos Gratis':'Free Games','Cuentas':'Accounts','INICIAR SESIÓN':'SIGN IN','DESCARGAR LAUNCHER':'DOWNLOAD LAUNCHER'}
  };
  const base=[...document.querySelectorAll('.topbar .navlinks>a, .topbar [data-auth-nav-label], .topbar .nav-download')];
  base.forEach(el=>{ if(!el.dataset.navEs) el.dataset.navEs=el.textContent.trim(); });
  const apply=(lang)=>{
    if(!['es','en'].includes(lang)) lang='es';
    base.forEach(el=>{const es=el.dataset.navEs; el.textContent=(map[lang]&&map[lang][es])||es;});
    document.querySelectorAll('.lang-flag').forEach(btn=>{const active=btn.dataset.lang===lang;btn.classList.toggle('is-active',active);btn.setAttribute('aria-pressed',active?'true':'false');});
    document.documentElement.lang=lang;
  };
  document.addEventListener('click',e=>{const btn=e.target.closest('.lang-flag[data-lang]');if(!btn)return;localStorage.setItem(KEY,btn.dataset.lang);apply(btn.dataset.lang);});
  document.addEventListener('DOMContentLoaded',()=>{const saved=localStorage.getItem(KEY);const browser=(navigator.language||'').toLowerCase().startsWith('en')?'en':'es';apply(['es','en'].includes(saved)?saved:browser);});
})();

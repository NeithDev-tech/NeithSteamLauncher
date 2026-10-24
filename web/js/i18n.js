(() => {
  'use strict';
  try { localStorage.setItem('neith_language','en'); localStorage.setItem('neith_language_user_choice_r204','en'); } catch {}
  document.documentElement.lang = 'en';
  const MAP = new Map(Object.entries({
    'MI PANEL':'MY DASHBOARD','Ir al panel':'Open dashboard','MI CUENTA':'MY ACCOUNT','Gestionar cuenta':'Manage account',
    'SEGURIDAD':'SECURITY','Seguridad':'Security','CERRAR SESIÓN':'SIGN OUT','Cuenta Neith':'NEITH ACCOUNT','ACTIVO':'ACTIVE',
    'SIN CADUCIDAD':'NO EXPIRY','PREMIUM PERMANENTE':'PERMANENT PREMIUM','COMPROBANDO…':'CHECKING…','SINCRONIZANDO':'SYNCING',
    'USUARIOS NEITH':'NEITH USERS','Usuario':'User','NÚCLEO SEGURO':'SECURE CORE','Correo':'Email','Contraseña':'Password',
    'BÚSQUEDA GLOBAL':'GLOBAL SEARCH','CARGANDO':'LOADING','GUARDAR':'SAVE','CANCELAR':'CANCEL','ELIMINAR':'DELETE'
  }));
  const tr = value => { const raw=String(value??''); const s=raw.trim(); return MAP.has(s) ? raw.replace(s,MAP.get(s)) : raw; };
  function applyNode(node){
    if(!node) return;
    if(node.nodeType===Node.TEXT_NODE){ const p=node.parentElement; if(!p||/^(SCRIPT|STYLE|NOSCRIPT|TEMPLATE)$/.test(p.tagName)) return; const v=tr(node.nodeValue); if(v!==node.nodeValue) node.nodeValue=v; return; }
    if(node.nodeType!==Node.ELEMENT_NODE) return;
    const el=node;
    ['aria-label','title','placeholder'].forEach(a=>{if(el.hasAttribute?.(a)){const old=el.getAttribute(a),v=tr(old);if(v!==old)el.setAttribute(a,v);}});
    el.childNodes.forEach(applyNode);
  }
  function apply(root=document.body){ applyNode(root); }
  window.NeithI18n={get language(){return 'en';},setLanguage:async()=>apply(),apply,ready:()=>Promise.resolve(),t:v=>tr(v).trim()};
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',()=>apply(),{once:true}); else apply();
  new MutationObserver(records=>{for(const r of records) for(const n of r.addedNodes) applyNode(n);}).observe(document.documentElement,{subtree:true,childList:true});
})();

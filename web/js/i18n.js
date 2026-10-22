(() => {
  'use strict';
  const STORAGE_KEY = 'neith_language';
  const USER_CHOICE_KEY = 'neith_language_user_choice_r204';
  const ATTRS = ['title','aria-label','placeholder','alt','content','value','data-caption','data-text','data-account-level','data-account-role','data-account-status','data-search','data-label','data-title','data-description'];
  const textSource = new WeakMap();
  const attrSource = new WeakMap();
  let applying = false;
  let ES_TO_EN = null;
  let EN_TO_ES = null;
  let dictionaryPromise = null;

  const scriptUrl = document.currentScript?.src || location.href;
  const DICTIONARY_URL = new URL('./i18n-en.json?v=20261022-r259-vac-live-stable', scriptUrl).href;

  const queryLang = (() => {
    try {
      const v = new URL(location.href).searchParams.get('lang');
      return v === 'en' || v === 'es' ? v : null;
    } catch { return null; }
  })();
  let savedChoice = null;
  try { savedChoice = localStorage.getItem(USER_CHOICE_KEY); } catch {}
  let lang = queryLang || (savedChoice === 'en' || savedChoice === 'es' ? savedChoice : null) || 'en';
  if (lang !== 'es') lang = 'en';

  function ensureDictionary() {
    if (ES_TO_EN && EN_TO_ES) return Promise.resolve(ES_TO_EN);
    if (dictionaryPromise) return dictionaryPromise;
    dictionaryPromise = fetch(DICTIONARY_URL, {cache:'no-store'})
      .then(r => {
        if (!r.ok) throw new Error(`i18n dictionary HTTP ${r.status}`);
        return r.json();
      })
      .then(data => {
        ES_TO_EN = data || {};
        const RESERVED_LABELS = new Set(['VAC LIVE']);
        EN_TO_ES = Object.fromEntries(
          Object.entries(ES_TO_EN)
            .filter(([es,en]) => !RESERVED_LABELS.has(String(en).trim().toUpperCase()))
            .map(([es,en]) => [en,es])
        );
        return ES_TO_EN;
      })
      .catch(error => {
        dictionaryPromise = null;
        console.warn('[NEITH I18N] Diccionario inglés no disponible:', error?.message || error);
        throw error;
      });
    return dictionaryPromise;
  }

  function keepWS(raw, value) {
    raw = String(raw ?? '');
    const l = raw.match(/^\s*/)?.[0] || '';
    const r = raw.match(/\s*$/)?.[0] || '';
    return l + value + r;
  }
  function toSpanish(raw) {
    const str=String(raw??''); const t=str.trim(); if(!t) return str;
    if (t.toUpperCase() === 'VAC LIVE') return keepWS(str, 'VAC LIVE');
    if (EN_TO_ES?.[t] != null) return keepWS(str, EN_TO_ES[t]);
    let m=t.match(/^(\d[\d,.]*)\s+hrs$/i); if(m) return keepWS(str, `${m[1]} h`);
    m=t.match(/^(\d+) FREE GAMES DETECTED$/i); if(m) return keepWS(str, `${m[1]} JUEGOS GRATIS DETECTADOS`);
    m=t.match(/^Level\s+(\d+)\s+·\s+Online$/i); if(m) return keepWS(str, `Nivel ${m[1]} · En línea`);
    m=t.match(/^(.*?) avatar$/i); if(m&&m[1]) return keepWS(str, `Avatar de ${m[1]}`);
    return str;
  }
  function toEnglish(raw) {
    const str=String(raw??''); const t=str.trim(); if(!t) return str;
    if (t.toUpperCase() === 'VAC LIVE') return keepWS(str, 'VAC LIVE');
    if (ES_TO_EN?.[t] != null) return keepWS(str, ES_TO_EN[t]);
    let m=t.match(/^(\d[\d,.]*)\s+h$/i); if(m) return keepWS(str, `${m[1]} hrs`);
    m=t.match(/^(\d+) JUEGOS GRATIS DETECTADOS$/i); if(m) return keepWS(str, `${m[1]} FREE GAMES DETECTED`);
    m=t.match(/^Nivel\s+(\d+)\s+·\s+En línea$/i); if(m) return keepWS(str, `Level ${m[1]} · Online`);
    m=t.match(/^Avatar de\s+(.+)$/i); if(m) return keepWS(str, `${m[1]} avatar`);
    return str;
  }
  function render(raw, target=lang) {
    const source = toSpanish(raw);
    return target === 'en' ? toEnglish(source) : source;
  }
  function sourceText(node) {
    if (!textSource.has(node)) textSource.set(node, toSpanish(node.nodeValue || ''));
    return textSource.get(node);
  }
  function sourceAttr(el, a) {
    let m=attrSource.get(el); if(!m){m=new Map();attrSource.set(el,m);}
    if(!m.has(a)) m.set(a,toSpanish(el.getAttribute(a)||''));
    return m.get(a);
  }
  function textNode(node) {
    const next=render(sourceText(node));
    if(node.nodeValue!==next) node.nodeValue=next;
  }
  function tree(root) {
    if(!root) return;
    if(root.nodeType===Node.TEXT_NODE){textNode(root);return;}
    const w=document.createTreeWalker(root,NodeFilter.SHOW_TEXT,{acceptNode(n){const p=n.parentElement;return (!p||['SCRIPT','STYLE','NOSCRIPT','TEMPLATE'].includes(p.tagName))?NodeFilter.FILTER_REJECT:NodeFilter.FILTER_ACCEPT;}});
    const nodes=[]; while(w.nextNode()) nodes.push(w.currentNode); nodes.forEach(textNode);
  }
  function attrs(root) {
    const scope=root?.nodeType===Node.ELEMENT_NODE?root:document;
    const sel=ATTRS.map(a=>`[${a}]`).join(','); const els=[];
    if(scope.matches?.(sel)) els.push(scope);
    scope.querySelectorAll?.(sel).forEach(e=>els.push(e));
    els.forEach(el=>ATTRS.forEach(a=>{
      if(!el.hasAttribute(a))return;
      const next=render(sourceAttr(el,a));
      if(el.getAttribute(a)!==next)el.setAttribute(a,next);
    }));
  }
  function images(){
    document.querySelectorAll('[data-img-es][data-img-en]').forEach(el=>{
      const src=lang==='en'?el.dataset.imgEn:el.dataset.imgEs;if(src)el.setAttribute('src',src);
      const ss=lang==='en'?el.dataset.srcsetEn:el.dataset.srcsetEs;if(ss)el.setAttribute('srcset',ss);
    });
  }
  function buttons(){
    document.querySelectorAll('.lang-flag[data-lang]').forEach(b=>{
      const on=b.dataset.lang===lang;
      b.classList.toggle('is-active',on);
      b.setAttribute('aria-pressed',String(on));
    });
  }
  function apply(root=document.body){
    if(!root)return;
    applying=true;
    try{
      tree(root);attrs(root);
      if(root===document.body){
        tree(document.head);attrs(document.head);attrs(document.documentElement);
        images();buttons();document.documentElement.lang=lang;
      }
    }finally{applying=false;}
  }

  async function setLanguage(next,persist=true){
    next=next==='en'?'en':'es';
    if(next==='en') {
      try { await ensureDictionary(); } catch { return; }
    }
    lang=next;
    if(persist){ try { localStorage.setItem(USER_CHOICE_KEY,lang); localStorage.setItem(STORAGE_KEY,lang); } catch {} }
    apply();
    window.dispatchEvent(new CustomEvent('neith:languagechange',{detail:{language:lang}}));
    requestAnimationFrame(() => apply());
  }

  window.NeithI18n={
    get language(){return lang;},
    setLanguage,
    apply,
    ready(){return lang==='en'?ensureDictionary():Promise.resolve();},
    t(v,l=lang){return String(render(v,l)).trim();}
  };

  window.addEventListener('click',e=>{
    const b=e.target.closest?.('.lang-flag[data-lang]');
    if(!b)return;
    e.preventDefault();e.stopPropagation();
    setLanguage(b.dataset.lang,true);
  },true);

  async function boot(){
    document.documentElement.lang=lang;
    images();buttons();
    if(lang==='en'){
      try { await ensureDictionary(); apply(); }
      catch { lang='en'; document.documentElement.lang='en'; buttons(); }
    }

    let queued=[]; let frame=0;
    const flush=()=>{
      frame=0;
      if(applying||!queued.length){queued.length=0;return;}
      if(lang!=='en'){queued.length=0;return;}
      const ms=queued.splice(0); applying=true;
      try{
        for(const m of ms){
          if(m.type==='childList')m.addedNodes.forEach(n=>{
            if(n.nodeType===Node.TEXT_NODE){textSource.delete(n);textNode(n);}
            else if(n.nodeType===Node.ELEMENT_NODE){tree(n);attrs(n);}
          });
          else if(m.type==='characterData'){textSource.delete(m.target);textNode(m.target);}
          else if(m.type==='attributes'){
            const map=attrSource.get(m.target);map?.delete(m.attributeName);attrs(m.target);
          }
        }
      }finally{applying=false;}
    };
    const observer=new MutationObserver(ms=>{
      if(lang!=='en'||applying)return;
      queued.push(...ms);
      if(!frame)frame=requestAnimationFrame(flush);
    });
    observer.observe(document.body,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:ATTRS});
  }

  if(lang==='en') ensureDictionary().catch(()=>{});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})();

/* Neith V82 — realtime-safe visible-presence heartbeat.
   Stable visitor id + per-tab session. Authenticated users send JWT; guests use publishable key only. */
(() => {
  'use strict';
  const URL='https://nsqhfbyxqcmdthvptuzp.supabase.co';
  const KEY='sb_publishable_bRJYGXCPI6M9I4o_egb5WA_n7ZIEASg';
  const VISITOR_KEY='neith_site_presence_visitor_v1';
  const ENABLED_KEY='neith_site_presence_enabled_v1';
  const HEARTBEAT_MS=5000;
  const TOKEN_TTL=15000;
  let busy=false, leaving=false, tokenCache='', tokenAt=0, timer=0;

  const uuid=()=>globalThis.crypto?.randomUUID?.() || 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g,c=>{const r=Math.random()*16|0,v=c==='x'?r:(r&3|8);return v.toString(16)});
  const sessionId=uuid();
  const visitorId=(()=>{try{let id=localStorage.getItem(VISITOR_KEY);if(!/^[0-9a-f-]{36}$/i.test(id||'')){id=uuid();localStorage.setItem(VISITOR_KEY,id)}return id}catch{return uuid()}})();
  const isEnabled=()=>{try{return localStorage.getItem(ENABLED_KEY)!=='0'}catch{return true}};

  const deepToken=v=>{if(!v||typeof v!=='object')return'';if(typeof v.access_token==='string'&&v.access_token)return v.access_token;for(const k of ['currentSession','session','data']){const x=deepToken(v[k]);if(x)return x}return''};
  const persistedToken=()=>{try{for(const k of Object.keys(localStorage)){if(!/^sb-.*-auth-token$/i.test(k))continue;try{const t=deepToken(JSON.parse(localStorage.getItem(k)||''));if(t)return t}catch{}}}catch{}return''};
  const getAccessToken=async(force=false)=>{
    if(!force&&tokenCache&&Date.now()-tokenAt<TOKEN_TTL)return tokenCache;
    let stored=persistedToken();
    if(typeof window.NeithLoadAuth==='function'){
      try{const auth=await window.NeithLoadAuth();const t=auth?.session?.access_token||(await auth?.client?.auth?.getSession?.())?.data?.session?.access_token||stored;stored=t||stored}catch{}
    }
    tokenCache=stored||''; tokenAt=Date.now(); return tokenCache;
  };
  const headers=(token)=>{
    const h={apikey:KEY,'Content-Type':'application/json'};
    if(token)h.Authorization=`Bearer ${token}`;
    return h;
  };
  const rpc=(name,body,token,keepalive=false)=>fetch(`${URL}/rest/v1/rpc/${name}`,{method:'POST',mode:'cors',cache:'no-store',credentials:'omit',keepalive,headers:headers(token),body:JSON.stringify(body)});
  const path=()=>`${location.pathname||'/'}${location.search||''}`.slice(0,180);

  const ping=async()=>{
    if(!isEnabled()||busy||leaving)return false;
    busy=true;
    try{
      let token=await getAccessToken();
      let r=await rpc('neith_presence_live_ping',{p_session_id:sessionId,p_visitor_id:visitorId,p_page_path:path()},token);
      if(!r.ok&&token){
        token=await getAccessToken(true);
        r=await rpc('neith_presence_live_ping',{p_session_id:sessionId,p_visitor_id:visitorId,p_page_path:path()},token);
      }
      if(!r.ok){
        // Anonymous fallback: publishable key stays in apikey only; never use it as a Bearer JWT.
        r=await rpc('neith_presence_live_ping',{p_session_id:sessionId,p_visitor_id:visitorId,p_page_path:path()},'');
      }
      if(r.ok)window.dispatchEvent(new CustomEvent('neith:presence-live-ping',{detail:{sessionId,visitorId,page:path()}}));
      else console.warn('[NEITH PRESENCE] heartbeat failed',r.status);
      return r.ok;
    }catch(err){console.warn('[NEITH PRESENCE] heartbeat error',err?.message||err);return false}finally{busy=false}
  };

  const leave=async()=>{
    if(leaving)return; leaving=true;
    try{const token=tokenCache||persistedToken()||''; await rpc('neith_presence_live_leave',{p_session_id:sessionId,p_visitor_id:visitorId},token,true)}catch{}
  };

  const setEnabled=async(enabled)=>{
    try{localStorage.setItem(ENABLED_KEY,enabled?'1':'0')}catch{}
    if(enabled){leaving=false; await ping()}else{await leave()}
    window.dispatchEvent(new CustomEvent('neith:presence-setting',{detail:{enabled:!!enabled}}));
    return !!enabled;
  };

  window.NeithSitePresence=Object.freeze({getAccessToken,getVisitorId:()=>visitorId,getSessionId:()=>sessionId,ping,setEnabled,isEnabled});

  const armTimer=()=>{clearInterval(timer);timer=setInterval(()=>{if(isEnabled()&&!leaving)ping()},HEARTBEAT_MS)};
  const resume=()=>{if(!isEnabled()||document.visibilityState==='hidden')return;leaving=false;armTimer();ping()};
  const start=()=>{
    resume();
    window.addEventListener('focus',resume,{passive:true});
    window.addEventListener('online',resume,{passive:true});
    window.addEventListener('pageshow',resume,{passive:true});
    document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'){resume()}else{clearInterval(timer);leave()}},{passive:true});
    window.addEventListener('pagehide',(e)=>{clearInterval(timer);if(e.persisted){leaving=false;return}leave()});
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();

/* Neith R220 — low-latency site presence.
   Stable browser id + ephemeral page session. No IP stored. */
(() => {
  'use strict';
  const URL='https://nsqhfbyxqcmdthvptuzp.supabase.co';
  const KEY='sb_publishable_bRJYGXCPI6M9I4o_egb5WA_n7ZIEASg';
  const VISITOR_KEY='neith_site_presence_visitor_v1';
  const HEARTBEAT_MS=12000;
  const TOKEN_TTL=20000;
  let busy=false, leaving=false, tokenCache='', tokenAt=0;

  const uuid=()=>globalThis.crypto?.randomUUID?.() || 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g,c=>{const r=Math.random()*16|0,v=c==='x'?r:(r&3|8);return v.toString(16)});
  const sessionId=uuid();
  const visitorId=(()=>{try{let id=localStorage.getItem(VISITOR_KEY);if(!/^[0-9a-f-]{36}$/i.test(id||'')){id=uuid();localStorage.setItem(VISITOR_KEY,id)}return id}catch{return uuid()}})();

  const deepToken=v=>{if(!v||typeof v!=='object')return'';if(typeof v.access_token==='string'&&v.access_token)return v.access_token;for(const k of ['currentSession','session','data']){const x=deepToken(v[k]);if(x)return x}return''};
  const persistedToken=()=>{try{for(const k of Object.keys(localStorage)){if(!/^sb-.*-auth-token$/i.test(k))continue;try{const t=deepToken(JSON.parse(localStorage.getItem(k)||''));if(t)return t}catch{}}}catch{}return''};
  const getAccessToken=async(force=false)=>{
    if(!force&&tokenCache&&Date.now()-tokenAt<TOKEN_TTL)return tokenCache;
    const stored=persistedToken();
    tokenCache=stored||'';tokenAt=Date.now();
    if(stored&&typeof window.NeithLoadAuth==='function'){
      try{const auth=await window.NeithLoadAuth();const t=auth?.session?.access_token||(await auth?.client?.auth?.getSession?.())?.data?.session?.access_token||stored;tokenCache=t;tokenAt=Date.now()}catch{}
    }
    return tokenCache||KEY;
  };
  const headers=token=>({apikey:KEY,Authorization:`Bearer ${token||KEY}`,'Content-Type':'application/json'});
  const rpc=async(name,body,token,keepalive=false)=>fetch(`${URL}/rest/v1/rpc/${name}`,{method:'POST',mode:'cors',cache:'no-store',credentials:'omit',keepalive,headers:headers(token),body:JSON.stringify(body)});
  const path=()=>`${location.pathname||'/'}${location.search||''}`.slice(0,180);

  const ping=async()=>{
    if(busy||leaving||document.visibilityState==='hidden')return false;
    busy=true;
    try{
      let token=await getAccessToken();
      let r=await rpc('neith_presence_live_ping',{p_session_id:sessionId,p_visitor_id:visitorId,p_page_path:path()},token);
      if(!r.ok&&token!==KEY){token=await getAccessToken(true);r=await rpc('neith_presence_live_ping',{p_session_id:sessionId,p_visitor_id:visitorId,p_page_path:path()},token);if(!r.ok)r=await rpc('neith_presence_live_ping',{p_session_id:sessionId,p_visitor_id:visitorId,p_page_path:path()},KEY)}
      if(r.ok)window.dispatchEvent(new CustomEvent('neith:presence-live-ping'));
      return r.ok;
    }catch{return false}finally{busy=false}
  };

  const leave=()=>{
    if(leaving)return;leaving=true;
    const token=tokenCache||persistedToken()||KEY;
    rpc('neith_presence_live_leave',{p_session_id:sessionId,p_visitor_id:visitorId},token,true).catch(()=>{});
  };

  window.NeithSitePresence=Object.freeze({getAccessToken,getVisitorId:()=>visitorId,getSessionId:()=>sessionId,ping});
  const start=()=>{
    ping();
    const timer=setInterval(ping,HEARTBEAT_MS);
    window.addEventListener('focus',ping,{passive:true});
    document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')ping()},{passive:true});
    window.addEventListener('pagehide',()=>{clearInterval(timer);leave()},{once:true});
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();

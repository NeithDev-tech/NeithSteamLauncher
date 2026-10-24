/* Neith V29 — privacy-conscious site analytics.
   Tracks page views, browser sessions and launcher-download intent. No IP/UA collection. */
(() => {
  'use strict';
  const URL='https://nsqhfbyxqcmdthvptuzp.supabase.co';
  const KEY='sb_publishable_bRJYGXCPI6M9I4o_egb5WA_n7ZIEASg';
  const VISITOR_KEY='neith_unique_visitor_id_v1';
  const SESSION_KEY='neith_analytics_session_id_v1';
  const STARTED_KEY='neith_analytics_session_started_v1';
  const uuid=()=>globalThis.crypto?.randomUUID?.() || 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g,c=>{const r=Math.random()*16|0,v=c==='x'?r:(r&3|8);return v.toString(16)});
  const validUuid=v=>/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v||'');
  const getStored=(store,key)=>{try{return store.getItem(key)||''}catch{return''}};
  const setStored=(store,key,val)=>{try{store.setItem(key,val)}catch{}};
  const visitorId=(()=>{let id=getStored(localStorage,VISITOR_KEY);if(!validUuid(id)){id=uuid();setStored(localStorage,VISITOR_KEY,id)}return id})();
  const sessionId=(()=>{let id=getStored(sessionStorage,SESSION_KEY);if(!validUuid(id)){id=uuid();setStored(sessionStorage,SESSION_KEY,id)}return id})();
  const path=()=>`${location.pathname||'/'}${location.search||''}`.slice(0,220);

  const deepToken=v=>{if(!v||typeof v!=='object')return'';if(typeof v.access_token==='string'&&v.access_token)return v.access_token;for(const k of ['currentSession','session','data']){const t=deepToken(v[k]);if(t)return t}return''};
  const persistedToken=()=>{try{for(const k of Object.keys(localStorage)){if(!/^sb-.*-auth-token$/i.test(k))continue;try{const t=deepToken(JSON.parse(localStorage.getItem(k)||''));if(t)return t}catch{}}}catch{}return''};
  const getToken=async()=>{
    try{const t=await window.NeithSitePresence?.getAccessToken?.();if(t)return t}catch{}
    return persistedToken()||KEY;
  };
  const track=async(type,meta={},keepalive=false)=>{
    try{
      const token=await getToken();
      const r=await fetch(`${URL}/rest/v1/rpc/neith_track_site_event`,{
        method:'POST',mode:'cors',cache:'no-store',credentials:'omit',keepalive,
        headers:{apikey:KEY,Authorization:`Bearer ${token||KEY}`,'Content-Type':'application/json'},
        body:JSON.stringify({p_event_type:type,p_visitor_id:visitorId,p_session_id:sessionId,p_page_path:path(),p_metadata:meta||{}})
      });
      return r.ok;
    }catch{return false}
  };
  const isDownloadLink=a=>{
    try{const u=new URL(a.href,location.href);return u.pathname.replace(/\/+$/,'')==='/descargar'}catch{return false}
  };
  const start=()=>{
    track('page_view',{title:(document.title||'').slice(0,140)});
    if(getStored(sessionStorage,STARTED_KEY)!=='1'){
      setStored(sessionStorage,STARTED_KEY,'1');
      track('session_start',{entry_path:path()});
    }
    document.addEventListener('click',e=>{
      const a=e.target.closest?.('a[href]');
      if(!a||!isDownloadLink(a))return;
      track('launcher_download',{source:'download_link'},true);
    },{capture:true,passive:true});
  };
  window.NeithSiteAnalytics=Object.freeze({track,getVisitorId:()=>visitorId,getSessionId:()=>sessionId});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();

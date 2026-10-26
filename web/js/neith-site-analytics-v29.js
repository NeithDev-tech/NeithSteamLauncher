/* Neith V74 — privacy-conscious analytics.
   Raw IP is never stored or returned. Netlify provides a one-way site-scoped hash
   used only to deduplicate unique visits. */
(() => {
  'use strict';
  const URL='https://nsqhfbyxqcmdthvptuzp.supabase.co';
  const KEY='sb_publishable_bRJYGXCPI6M9I4o_egb5WA_n7ZIEASg';
  const VISITOR_KEY='neith_unique_visitor_id_v1';
  const SESSION_KEY='neith_analytics_session_id_v1';
  const STARTED_KEY='neith_analytics_session_started_v1';
  const NETWORK_KEY='neith_analytics_network_key_v1';
  const uuid=()=>globalThis.crypto?.randomUUID?.() || 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g,c=>{const r=Math.random()*16|0,v=c==='x'?r:(r&3|8);return v.toString(16)});
  const validUuid=v=>/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v||'');
  const getStored=(store,key)=>{try{return store.getItem(key)||''}catch{return''}};
  const setStored=(store,key,val)=>{try{store.setItem(key,val)}catch{}};
  const visitorId=(()=>{let id=getStored(localStorage,VISITOR_KEY);if(!validUuid(id)){id=uuid();setStored(localStorage,VISITOR_KEY,id)}return id})();
  const sessionId=(()=>{let id=getStored(sessionStorage,SESSION_KEY);if(!validUuid(id)){id=uuid();setStored(sessionStorage,SESSION_KEY,id)}return id})();
  const path=()=>`${location.pathname||'/'}${location.search||''}`.slice(0,220);
  const device=()=>/Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent||'') || matchMedia?.('(max-width: 760px)')?.matches ? 'mobile' : 'desktop';

  let identityPromise=null;
  const getNetworkKey=()=>{
    if(identityPromise)return identityPromise;
    const cached=getStored(sessionStorage,NETWORK_KEY);
    if(/^[a-f0-9]{24,64}$/i.test(cached)){identityPromise=Promise.resolve(cached);return identityPromise}
    identityPromise=(async()=>{try{const r=await fetch('/api/analytics-id',{cache:'no-store',credentials:'same-origin'});if(!r.ok)return'';const v=String((await r.json())?.visitorKey||'');if(/^[a-f0-9]{24,64}$/i.test(v)){setStored(sessionStorage,NETWORK_KEY,v);return v}}catch{}return''})();
    return identityPromise;
  };

  let geoPromise=null;
  const GEO_CACHE_KEY='neith_geo_country_v3';
  const readGeoCache=()=>{try{const raw=sessionStorage.getItem(GEO_CACHE_KEY);if(!raw)return null;const d=JSON.parse(raw);return d&&d.country_code?d:null}catch{return null}};
  const writeGeoCache=(d)=>{try{if(d?.country_code)sessionStorage.setItem(GEO_CACHE_KEY,JSON.stringify(d))}catch{}};
  const countryNameFromCode=(code)=>{const cc=String(code||'').slice(0,2).toUpperCase();if(!/^[A-Z]{2}$/.test(cc))return'';try{return new Intl.DisplayNames([navigator.language||'en'],{type:'region'}).of(cc)||cc}catch{return cc}};
  const cleanGeo=(d)=>{const rawCountry=String(d?.country_name||d?.countryName||d?.country||d?.country_name_en||'').trim();const cc=String(d?.countryCode||d?.country_code||d?.country_code2||d?.countryCodeAlpha2||((rawCountry.length===2)?rawCountry:'')||'').slice(0,2).toUpperCase();const country=(rawCountry.length>2?rawCountry:countryNameFromCode(cc)).slice(0,80);return {country,country_code:cc}};
  const browserGeoFallback=()=>{let code='';try{const langs=[navigator.language,...(navigator.languages||[])].filter(Boolean);for(const lang of langs){const m=String(lang).match(/[-_]([A-Za-z]{2})\b/);if(m){code=m[1].toUpperCase();break}}if(!code){const tz=Intl.DateTimeFormat().resolvedOptions().timeZone||'';if(tz==='Europe/Madrid'||tz==='Atlantic/Canary')code='ES'}}catch{}return code?{country:countryNameFromCode(code),country_code:code}:{country:'',country_code:''}};
  const fetchGeoJson=async(url)=>{const controller=new AbortController();const t=setTimeout(()=>controller.abort(),2800);try{const r=await fetch(url,{method:'GET',cache:'no-store',credentials:'omit',mode:'cors',signal:controller.signal});if(!r.ok)return null;const g=cleanGeo(await r.json());return g.country_code?g:null}catch{return null}finally{clearTimeout(t)}};
  const getGeo=()=>{if(geoPromise)return geoPromise;const cached=readGeoCache();if(cached){geoPromise=Promise.resolve(cached);return geoPromise}geoPromise=(async()=>{try{const r=await fetch('/api/geo',{method:'GET',cache:'no-store',credentials:'same-origin'});if(r.ok){const g=cleanGeo(await r.json());if(g.country_code){writeGeoCache(g);return g}}}catch{}for(const endpoint of ['https://ipwho.is/','https://ipapi.co/json/','https://api.country.is/']){const g=await fetchGeoJson(endpoint);if(g?.country_code){writeGeoCache(g);return g}}const fallback=browserGeoFallback();if(fallback.country_code){writeGeoCache(fallback);return fallback}return {country:'',country_code:''}})();return geoPromise};

  const deepToken=v=>{if(!v||typeof v!=='object')return'';if(typeof v.access_token==='string'&&v.access_token)return v.access_token;for(const k of ['currentSession','session','data']){const t=deepToken(v[k]);if(t)return t}return''};
  const persistedToken=()=>{try{for(const k of Object.keys(localStorage)){if(!/^sb-.*-auth-token$/i.test(k))continue;try{const t=deepToken(JSON.parse(localStorage.getItem(k)||''));if(t)return t}catch{}}}catch{}return''};
  const getToken=async()=>{try{const t=await window.NeithSitePresence?.getAccessToken?.();if(t)return t}catch{}return persistedToken()||''};
  const track=async(type,meta={},keepalive=false)=>{try{const [token,geo,networkKey]=await Promise.all([getToken(),getGeo(),getNetworkKey()]);const analyticsMeta={...(meta||{}),device:device()};if(geo?.country)analyticsMeta.country=geo.country;if(geo?.country_code)analyticsMeta.country_code=geo.country_code;if(networkKey)analyticsMeta.ip_hash=networkKey;const headers={apikey:KEY,'Content-Type':'application/json'};if(token)headers.Authorization=`Bearer ${token}`;const r=await fetch(`${URL}/rest/v1/rpc/neith_track_site_event`,{method:'POST',mode:'cors',cache:'no-store',credentials:'omit',keepalive,headers,body:JSON.stringify({p_event_type:type,p_visitor_id:visitorId,p_session_id:sessionId,p_page_path:path(),p_metadata:analyticsMeta})});if(r.ok){try{window.dispatchEvent(new CustomEvent('neith:analytics-updated',{detail:{type}}))}catch{}}return r.ok}catch{return false}};
  const isDownloadLink=a=>{try{const u=new URL(a.href,location.href);return u.pathname.replace(/\/+$/,'')==='/descargar'}catch{return false}};
  const communityTarget=a=>{try{const u=new URL(a.href,location.href),h=u.hostname.toLowerCase().replace(/^www\./,'');if(h==='discord.gg'||h.endsWith('.discord.gg')||h==='discord.com'||h.endsWith('.discord.com'))return'discord';if(h==='instagram.com'||h.endsWith('.instagram.com'))return'instagram';if(h==='facebook.com'||h.endsWith('.facebook.com'))return'facebook';if(h==='tiktok.com'||h.endsWith('.tiktok.com'))return'tiktok';if(h==='youtube.com'||h.endsWith('.youtube.com')||h==='youtu.be')return'youtube';return''}catch{return''}};
  const start=()=>{track('page_view',{title:(document.title||'').slice(0,140)});if(getStored(sessionStorage,STARTED_KEY)!=='1'){setStored(sessionStorage,STARTED_KEY,'1');track('session_start',{entry_path:path()})}document.addEventListener('click',e=>{const a=e.target.closest?.('a[href]');if(!a)return;if(isDownloadLink(a)){track('launcher_download',{source:'download_link'},true);return}const target=communityTarget(a);if(target)track('community_click',{target,href_host:(()=>{try{return new URL(a.href,location.href).hostname}catch{return''}})()},true)},{capture:true,passive:true})};
  window.NeithSiteAnalytics=Object.freeze({track,getVisitorId:()=>visitorId,getSessionId:()=>sessionId});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();

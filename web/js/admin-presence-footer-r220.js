/* Neith R220 — owner-only realtime operations footer. */
(() => {
  'use strict';
  const root=document.querySelector('[data-neith-admin-presence]'); if(!root)return;
  const URL='https://nsqhfbyxqcmdthvptuzp.supabase.co';
  const KEY='sb_publishable_bRJYGXCPI6M9I4o_egb5WA_n7ZIEASg';
  const q=s=>root.querySelector(s);
  const e={total:q('[data-presence-total]'),membersCount:q('[data-presence-members-count]'),guests:q('[data-presence-guests]'),sessions:q('[data-presence-sessions]'),premium:q('[data-presence-premium]'),five:q('[data-presence-five]'),members:q('[data-presence-members]'),pages:q('[data-presence-pages]'),topPage:q('[data-presence-top-page]'),registered:q('[data-presence-registered]'),registeredToday:q('[data-presence-registered-today]'),visitorsToday:q('[data-presence-visitors-today]'),shoutbox:q('[data-presence-shoutbox]'),bans:q('[data-presence-bans]'),newest:q('[data-presence-newest]'),newestAt:q('[data-presence-newest-at]'),updated:q('[data-presence-updated]'),latency:q('[data-presence-latency]'),state:q('[data-presence-state]')};
  let owner=false,busy=false,queued=false,lastStart=0,channel=null,safetyTimer=0;
  const esc=v=>String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  const fmtTime=iso=>{const d=new Date(iso||0);return Number.isNaN(d.getTime())?'—':d.toLocaleTimeString(document.documentElement.lang==='es'?'es-ES':'en-GB',{hour:'2-digit',minute:'2-digit',second:'2-digit'})};
  const fmtDate=iso=>{const d=new Date(iso||0);return Number.isNaN(d.getTime())?'—':d.toLocaleString(document.documentElement.lang==='es'?'es-ES':'en-GB',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'})};
  const nicePage=p=>{if(!p||p==='/')return 'HOME';const s=p.split('?')[0].replace(/^\/+|\/+$/g,'');return (s||'HOME').replace(/-/g,' ').toUpperCase()};
  const setState=(text,ok=true)=>{e.state.textContent=text;root.dataset.live=ok?'1':'0'};

  const getAuth=async()=>{try{if(typeof window.NeithLoadAuth==='function')return await window.NeithLoadAuth();if(window.NeithAuth?.client)return window.NeithAuth}catch{}return null};
  const getToken=async()=>{const t=await window.NeithSitePresence?.getAccessToken?.();return t&&t!==KEY?t:''};

  const render=d=>{
    e.total.textContent=Number(d.active_total||0).toLocaleString();
    e.membersCount.textContent=Number(d.active_members||0).toLocaleString();
    e.guests.textContent=Number(d.active_guests||0).toLocaleString();
    e.sessions.textContent=Number(d.active_sessions||0).toLocaleString();
    e.premium.textContent=Number(d.premium_online||0).toLocaleString();
    e.five.textContent=Number(d.active_last_5m||0).toLocaleString();
    e.registered.textContent=Number(d.registered_total||0).toLocaleString();
    e.registeredToday.textContent=Number(d.registered_today||0).toLocaleString();
    e.visitorsToday.textContent=Number(d.unique_visitors_today||0).toLocaleString();
    e.shoutbox.textContent=Number(d.shoutbox_messages_24h||0).toLocaleString();
    e.bans.textContent=Number(d.shoutbox_bans||0).toLocaleString();
    e.topPage.textContent=nicePage(d.top_page);
    e.newest.textContent=d.newest_member||'—';
    e.newestAt.textContent=fmtDate(d.newest_member_at);
    e.updated.textContent=fmtTime(d.refreshed_at);
    const members=Array.isArray(d.members)?d.members:[];
    e.members.innerHTML=members.length?members.map(m=>`<span class="neith-admin-presence-user"><i></i><b>${esc(m.name||'Member')}</b><em class="${m.plan==='premium'?'is-premium':''}">${esc((m.plan||'free').toUpperCase())}</em><small>${esc(nicePage(m.page))}</small></span>`).join(''):'<span class="neith-admin-presence-empty">No registered members online right now.</span>';
    const pages=Array.isArray(d.pages)?d.pages:[];
    e.pages.innerHTML=pages.length?pages.map(p=>`<div class="neith-admin-presence-page"><span>${esc(nicePage(p.path))}</span><b>${Number(p.visitors||0)}</b><small>${Number(p.members||0)} member${Number(p.members||0)===1?'':'s'}</small></div>`).join(''):'<span class="neith-admin-presence-empty">No active pages.</span>';
    root.hidden=false;root.setAttribute('aria-hidden','false');setState('REALTIME',true);
  };

  const refresh=async(reason='poll')=>{
    if(busy){queued=true;return} busy=true;queued=false;lastStart=performance.now();
    try{
      const token=await getToken();
      if(!token){owner=false;root.hidden=true;return}
      const started=performance.now();
      const r=await fetch(`${URL}/rest/v1/rpc/neith_owner_presence_snapshot_v2`,{method:'POST',mode:'cors',cache:'no-store',credentials:'omit',headers:{apikey:KEY,Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:'{}'});
      e.latency.textContent=`${Math.max(0,Math.round(performance.now()-started))} ms`;
      if(!r.ok){owner=false;root.hidden=true;root.setAttribute('aria-hidden','true');return}
      owner=true;render(await r.json());
      if(!channel)setupRealtime();
    }catch{if(owner)setState('RECONNECTING',false);else root.hidden=true}
    finally{busy=false;if(queued)setTimeout(()=>refresh('queued'),90)}
  };

  let debounceTimer=0;
  const queueRefresh=(delay=120)=>{clearTimeout(debounceTimer);debounceTimer=setTimeout(()=>refresh('realtime'),delay)};
  const setupRealtime=async()=>{
    if(channel)return;
    const auth=await getAuth();const client=auth?.client;if(!client?.channel)return;
    channel=client.channel('neith-owner-live-r220',{config:{broadcast:{self:false}}})
      .on('postgres_changes',{event:'INSERT',schema:'public',table:'neith_site_presence_live'},()=>queueRefresh(80))
      .on('postgres_changes',{event:'DELETE',schema:'public',table:'neith_site_presence_live'},()=>queueRefresh(80))
      .subscribe(status=>{if(status==='SUBSCRIBED')setState('REALTIME',true);else if(owner&&['CHANNEL_ERROR','TIMED_OUT','CLOSED'].includes(status))setState('SYNCING',false)});
  };

  const start=()=>{
    // Do not block the first snapshot on a heartbeat; run both in parallel.
    window.NeithSitePresence?.ping?.();refresh('startup');
    safetyTimer=setInterval(()=>{if(document.visibilityState==='visible')refresh('safety')},5000);
    window.addEventListener('focus',()=>refresh('focus'),{passive:true});
    document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')refresh('visible')},{passive:true});
    window.addEventListener('storage',()=>refresh('auth-storage'),{passive:true});
    window.addEventListener('neith:presence-live-ping',()=>{if(owner&&performance.now()-lastStart>1500)queueRefresh(100)},{passive:true});
    window.addEventListener('pagehide',()=>{clearInterval(safetyTimer);if(channel){getAuth().then(a=>a?.client?.removeChannel?.(channel)).catch(()=>{})}},{once:true});
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();

/* Neith V80 — OWNER-only Site Intelligence with realtime presence + live business metrics. */
(() => {
  'use strict';

  const esc = (v) => String(v ?? '').replace(/[&<>'"]/g, (c) => ({ '&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;' }[c]));
  const nf = (v) => Number(v || 0).toLocaleString('en-US');
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const clamp = (v,min,max) => Math.min(max,Math.max(min,Number(v)||0));
  const fmtTime = (v) => { const d=new Date(v||0); return Number.isNaN(d.getTime())?'—':d.toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'}); };
  const relative = (v) => {
    const t=new Date(v||0).getTime(); if(!t)return '—'; const s=Math.max(0,Math.floor((Date.now()-t)/1000));
    if(s<60)return 'just now'; if(s<3600)return `${Math.floor(s/60)} min ago`; if(s<86400)return `${Math.floor(s/3600)} h ago`; return `${Math.floor(s/86400)} d ago`;
  };
  const nicePage = (p) => { if(!p||p==='/')return '/home'; const clean=String(p).split('?')[0].replace(/\/+$/,''); return clean||'/home'; };
  const icon = (name, cls='') => `<i data-lucide="${esc(name)}" class="${cls}" aria-hidden="true"></i>`;
  const countryCodeToFlag = (code) => {
    const cc = String(code || '').trim().toUpperCase();
    if (!/^[A-Z]{2}$/.test(cc)) return { emoji:'🌐', svg:'' };
    const cps=[...cc].map(letter => 0x1F1E6 + letter.charCodeAt(0) - 65);
    const emoji=String.fromCodePoint(...cps);
    const svg=`https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/${cps.map(cp=>cp.toString(16)).join('-')}.svg`;
    return { emoji, svg };
  };
  const countryFlagMarkup = (code, country) => {
    const flag=countryCodeToFlag(code);
    if(!flag.svg) return `<span class="na74-flag-fallback" aria-hidden="true">${flag.emoji}</span>`;
    return `<img class="na74-flag-img" src="${flag.svg}" alt="${esc(country)} flag" loading="lazy" decoding="async" referrerpolicy="no-referrer" onerror="this.replaceWith(document.createTextNode('${flag.emoji}'))">`;
  };
  const isAdminName = (name) => String(name||'').trim().replace(/^@/,'').toLowerCase()==='neith';

  let auth=null, client=null, root=null, timer=0, busy=false, presenceChannel=null, realtimeDebounce=0;
  const trackingEnabled=()=>window.NeithSitePresence?.isEnabled?.()!==false;

  function loadDependencies(){
    if(!document.querySelector('script[data-neith-tailwind-v74]')){
      const s=document.createElement('script'); s.src='https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4'; s.defer=true; s.dataset.neithTailwindV74='1'; document.head.appendChild(s);
    }
    if(!document.querySelector('script[data-neith-lucide-v74]')){
      const s=document.createElement('script'); s.src='https://unpkg.com/lucide@0.468.0/dist/umd/lucide.min.js'; s.defer=true; s.dataset.neithLucideV74='1'; s.addEventListener('load',paintIcons,{once:true}); document.head.appendChild(s);
    }
  }
  function paintIcons(){ try{ window.lucide?.createIcons?.({attrs:{'stroke-width':1.7}}); }catch{} }
  function loadCss(){
    if(document.querySelector('link[data-neith-owner-analytics-v29]'))return;
    const here=document.currentScript?.src||Array.from(document.scripts).find((s)=>/neith-owner-analytics-v29\.js/.test(s.src))?.src;
    if(!here)return; const link=document.createElement('link'); link.rel='stylesheet'; link.dataset.neithOwnerAnalyticsV29='1';
    link.href=new URL('../css/neith-owner-analytics-v29.css?v=20261026-v80-realtime',here).href; document.head.appendChild(link);
  }

  function shell(){
    if(root)return root;
    root=document.createElement('section'); root.id='neith-owner-analytics-v29'; root.hidden=true; root.setAttribute('aria-hidden','true');
    root.innerHTML=`
      <div class="na74-shell w-full mx-auto">
        <header class="na74-header flex items-center justify-between gap-3">
          <div class="min-w-0">
            <div class="na74-eyebrow">OWNER ANALYTICS</div>
            <h2 class="truncate">NEITH SITE INTELLIGENCE</h2>
          </div>
          <div class="na74-actions flex items-center gap-2 shrink-0">
            <span class="na74-live inline-flex items-center gap-2"><span class="na74-live-dot"></span>LIVE</span>
            <button type="button" data-na74-track-admin class="na74-track-admin inline-flex items-center gap-2" aria-pressed="true">${icon('activity','na74-button-icon')}<span>ADMIN TRACK ON</span></button>
            <button type="button" data-na74-refresh class="inline-flex items-center gap-2" aria-label="Refresh analytics">${icon('refresh-cw','na74-button-icon')}<span>Refresh</span></button>
          </div>
        </header>

        <div class="na74-kpis grid grid-cols-2 lg:grid-cols-6 gap-3" data-na74-kpis></div>

        <div class="na74-lower grid gap-3">
          <section class="na74-panel min-w-0 flex flex-col">
            <div class="na74-panel-head flex items-center justify-between gap-2"><span class="inline-flex items-center gap-2">${icon('radio','na74-section-icon')}ACTIVE VISITORS</span><small data-na74-updated>—</small></div>
            <div class="na74-live-list" data-na74-live-list></div>
            <div class="na74-divider"></div>
            <div class="na74-subsection">
              <span class="na74-mini-title">LAST REGISTRATION</span>
              <div data-na74-last-registration></div>
            </div>
            <div class="na74-divider"></div>
            <div class="na74-subsection">
              <div class="flex items-center justify-between gap-2"><span class="na74-mini-title">DEVICE MIX</span><small data-na74-device-label>—</small></div>
              <div class="na74-device-track"><span data-na74-device-pc></span><span data-na74-device-mobile></span></div>
              <div class="na74-device-legend flex items-center justify-between"><span>${icon('monitor','na74-inline-icon')} PC <b data-na74-pc>0%</b></span><span>${icon('smartphone','na74-inline-icon')} Mobile <b data-na74-mobile>0%</b></span></div>
            </div>
          </section>

          <section class="na74-panel min-w-0 flex flex-col">
            <div class="na74-panel-head flex items-center justify-between gap-2"><span class="inline-flex items-center gap-2">${icon('globe-2','na74-section-icon')}TOP COUNTRIES</span><small>unique today</small></div>
            <div class="na74-country-list" data-na74-countries></div>
            <div class="na74-divider"></div>
            <div class="na74-subsection na74-pages-box">
              <div class="flex items-center justify-between gap-2"><span class="na74-mini-title">POPULAR PAGES</span><small>today</small></div>
              <div class="na74-pages" data-na74-pages></div>
            </div>
          </section>
        </div>
      </div>`;
    document.body.appendChild(root);
    root.querySelector('[data-na74-refresh]')?.addEventListener('click',()=>refresh(true));
    const trackBtn=root.querySelector('[data-na74-track-admin]');
    const paintTrack=()=>{const on=trackingEnabled();trackBtn?.setAttribute('aria-pressed',String(on));const label=trackBtn?.querySelector('span');if(label)label.textContent=on?'ADMIN TRACK ON':'ADMIN TRACK OFF';trackBtn?.classList.toggle('is-off',!on)};
    trackBtn?.addEventListener('click',async()=>{const next=!trackingEnabled();await window.NeithSitePresence?.setEnabled?.(next);paintTrack();setTimeout(()=>refresh(true),250)});
    window.addEventListener('neith:presence-setting',paintTrack,{passive:true});
    paintTrack();
    return root;
  }

  function sparkline(values){
    const arr=(Array.isArray(values)?values:[]).map(Number).filter(Number.isFinite).slice(-7); if(!arr.length)return '<span class="na74-spark-empty">—</span>';
    const max=Math.max(...arr,1), min=Math.min(...arr,0), range=Math.max(1,max-min);
    const pts=arr.map((v,i)=>`${(i/(Math.max(1,arr.length-1))*100).toFixed(1)},${(24-((v-min)/range)*20).toFixed(1)}`).join(' ');
    return `<svg class="na74-spark" viewBox="0 0 100 28" preserveAspectRatio="none" aria-hidden="true"><polyline points="${pts}" fill="none" vector-effect="non-scaling-stroke"/></svg>`;
  }

  function kpi(iconName,label,value,sub,extra=''){
    return `<article class="na74-kpi min-w-0"><div class="na74-kpi-top flex items-center justify-between gap-2"><span>${icon(iconName,'na74-kpi-icon')}${esc(label)}</span>${extra}</div><div class="na74-kpi-value">${esc(value)}</div><small>${esc(sub)}</small></article>`;
  }

  function avatarInitial(name){ return esc((String(name||'?').trim()[0]||'?').toUpperCase()); }

  function normalizeCountries(raw){
    const list=Array.isArray(raw)?raw:[];
    return list.map(x=>({country:String(x.country||x.name||'Unknown'),code:String(x.country_code||x.code||'').slice(0,2).toUpperCase(),unique:Number(x.unique_visitors??x.unique??x.visitors??0),visits:Number(x.visits??x.page_views??0)})).sort((a,b)=>b.unique-a.unique||b.visits-a.visits);
  }

  function render(data){
    shell();
    const live=data.live||{}, today=data.today||{}, conversion=data.conversion||{}, daily=Array.isArray(data.daily)?data.daily:[];
    const countries=normalizeCountries(data.countries_today||[]);
    const pages=(Array.isArray(data.top_pages_today)&&data.top_pages_today.length?data.top_pages_today:data.top_pages_7d)||[];
    const regs=Array.isArray(data.recent_registrations)?data.recent_registrations:[];
    const members=Array.isArray(live.members_list)?live.members_list:[];
    const guests=Array.isArray(live.guests_list)?live.guests_list:[];
    const liveRows=[...members.map(x=>({...x,type:'member'})),...guests.map(x=>({...x,type:'guest'}))].slice(0,6);
    const liveNow=Number(live.visitors||0), uniqueToday=Number(today.unique_visitors||0), regsToday=Number(today.registrations||0), downloads=Number(today.downloads||0);
    const conv=Number(conversion.download_today_pct||0);
    const uniqueSeries=daily.map(x=>Number(x.unique_visitors||0));

    root.querySelector('[data-na74-kpis]').innerHTML=[
      kpi('users','ONLINE',nf(liveNow),liveNow===1?'active now':'active now'),
      kpi('earth','UNIQUE TODAY',nf(uniqueToday),'deduplicated visitors',sparkline(uniqueSeries)),
      kpi('user-plus','REGISTRATIONS',nf(regsToday),'accounts created today'),
      kpi('download','LAUNCHER DOWNLOADS',nf(downloads),'download clicks',`<span class="na74-badge">${conv.toFixed(1)}%</span>`),
      kpi('crown','PREMIUM ACCOUNTS',nf(Number(data.business?.premium_accounts||0)),`${nf(Number(data.business?.real_accounts||0))} cuentas reales · PREMIUM vigente`),
      kpi('messages-square','COMMUNITY CLICKS',nf(Number(data.business?.community_clicks_today||0)),'clics a Discord/Redes hoy')
    ].join('');

    root.querySelector('[data-na74-updated]').textContent=`${fmtTime(data.generated_at||Date.now())}`;
    root.querySelector('[data-na74-live-list]').innerHTML=liveRows.length?liveRows.map((x)=>{
      const name=x.type==='guest'?(x.name||'Guest'):x.name||'Member';
      const admin=isAdminName(name);
      return `<div class="na74-person ${admin?'is-admin':''}"><span class="na74-avatar ${x.type==='guest'?'is-guest':''} ${admin?'is-admin':''}">${avatarInitial(name)}</span><span class="na74-person-main"><b class="${admin?'na74-admin-name':''}">${esc(name)}${admin?` <span class="na74-admin-badge">${icon('shield-check','na74-admin-icon')} ADMIN</span>`:''}</b><small>${esc(nicePage(x.page||x.page_path))}</small></span><span class="na74-status ${admin?'is-admin':''}"><i></i>${admin?'ADMIN':(x.type==='guest'?'Guest':esc(String(x.plan||'member').toUpperCase()))}</span></div>`;
    }).join(''):`<div class="na74-empty">${icon('moon','na74-empty-icon')} No active visitors right now</div>`;

    const last=regs[0];
    root.querySelector('[data-na74-last-registration]').innerHTML=last?`<div class="na74-last-user"><span class="na74-avatar">${avatarInitial(last.name)}</span><span><b>${esc(last.name||'Member')}</b><small>${esc(relative(last.created_at))}</small></span>${icon('user-check','na74-last-icon')}</div>`:`<div class="na74-empty compact">No registrations yet</div>`;

    const dev=data.devices_today||{}; const pc=Number(dev.desktop||0), mobile=Number(dev.mobile||0), total=pc+mobile; const pcPct=total?Math.round(pc*100/total):0, mobPct=total?100-pcPct:0;
    root.querySelector('[data-na74-pc]').textContent=`${pcPct}%`; root.querySelector('[data-na74-mobile]').textContent=`${mobPct}%`;
    root.querySelector('[data-na74-device-label]').textContent=`${nf(total)} visits`;
    root.querySelector('[data-na74-device-pc]').style.width=`${pcPct}%`; root.querySelector('[data-na74-device-mobile]').style.width=`${mobPct}%`;

    const maxCountry=Math.max(1,...countries.map(c=>c.unique));
    root.querySelector('[data-na74-countries]').innerHTML=countries.length?countries.slice(0,5).map(c=>{
      const code=c.code || (String(c.country || '').length === 2 ? c.country : '');
      return `<div class="na74-country"><span class="na74-country-bar" style="width:${clamp(c.unique/maxCountry*100,4,100)}%"></span><span class="na74-flag" role="img" aria-label="${esc(c.country)} flag">${countryFlagMarkup(code,c.country)}</span><b>${esc(c.country)}</b><strong>${nf(c.unique)}</strong></div>`;
    }).join(''):`<div class="na74-empty">Country data pending</div>`;

    root.querySelector('[data-na74-pages]').innerHTML=pages.length?pages.slice(0,3).map((x,i)=>`<span><b>${i+1}.</b> ${esc(nicePage(x.path))} <strong>${nf(x.page_views||x.unique_visitors||0)}</strong></span>`).join(''):`<span>No traffic yet</span>`;

    root.hidden=false; root.setAttribute('aria-hidden','false'); paintIcons();
  }

  async function ensureAuth(){
    for(let i=0;i<100;i+=1){try{auth=typeof window.NeithLoadAuth==='function'?await window.NeithLoadAuth():window.NeithAuth;if(auth?.client){client=auth.client;return true}}catch{}await wait(50)}return false;
  }

  const queueRealtimeRefresh=(delay=80)=>{
    clearTimeout(realtimeDebounce);
    realtimeDebounce=setTimeout(()=>refresh(),delay);
  };

  function setupPresenceRealtime(){
    if(presenceChannel||!client?.channel)return;
    presenceChannel=client
      .channel('neith-site-intelligence-presence-v80')
      .on('postgres_changes',{event:'INSERT',schema:'public',table:'neith_site_presence_live'},()=>queueRealtimeRefresh(60))
      .on('postgres_changes',{event:'UPDATE',schema:'public',table:'neith_site_presence_live'},()=>queueRealtimeRefresh(60))
      .on('postgres_changes',{event:'DELETE',schema:'public',table:'neith_site_presence_live'},()=>queueRealtimeRefresh(60))
      .subscribe();
  }

  async function refresh(){
    if(busy)return; busy=true; const btn=root?.querySelector('[data-na74-refresh]'); btn?.classList.add('is-loading');
    try{
      if(!client&&!(await ensureAuth()))return;
      const session=auth?.session||(await client.auth.getSession())?.data?.session;
      if(!session?.user){if(root)root.hidden=true;return}
      const {data:isOwner,error:ownerError}=await client.rpc('neith_is_owner');
      if(ownerError||isOwner!==true){if(root)root.hidden=true;return}
      shell();
      setupPresenceRealtime();
      const [snapshotResult,countriesResult,presenceResult,intelResult,presenceDetailsResult,businessResult]=await Promise.all([
        client.rpc('neith_owner_analytics_snapshot',{p_days:14}),
        client.rpc('neith_owner_country_stats_today'),
        client.rpc('neith_owner_presence_snapshot_v2'),
        client.rpc('neith_owner_site_intelligence_v74'),
        client.rpc('neith_owner_presence_details_v74'),
        client.rpc('neith_owner_live_business_metrics_v79')
      ]);
      if(snapshotResult.error)throw snapshotResult.error;
      const payload=snapshotResult.data||{}; payload.countries_today=countriesResult?.error?[]:(countriesResult?.data||[]);
      const intel=intelResult?.error?null:intelResult?.data;
      if(intel){payload.today={...(payload.today||{}),unique_visitors:Number(intel.unique_visitors_today||0)};payload.devices_today=intel.devices_today||{};payload.conversion={...(payload.conversion||{}),download_today_pct:Number(intel.download_conversion_pct||0)}}
      const business=businessResult?.error?null:businessResult?.data;
      if(business){payload.business=business;payload.today={...(payload.today||{}),registrations:Number(business.registrations_today||0)};const latest=business.latest_registration||{};payload.recent_registrations=latest?.name?[latest]:[]}
      const presence=presenceResult?.error?null:presenceResult?.data;
      const details=presenceDetailsResult?.error?null:presenceDetailsResult?.data;
      if(presence){payload.live={...(payload.live||{}),visitors:Number(presence.active_total||0),members:Number(presence.active_members||0),guests:Number(presence.active_guests||0),sessions:Number(presence.active_sessions||0),top_page:presence.top_page||payload.live?.top_page||'—',members_list:details?.members||presence.members||[],guests_list:details?.guests||[]}; if(!payload.recent_registrations?.length&&presence.newest_member&&presence.newest_member!=='—')payload.recent_registrations=[{name:presence.newest_member,created_at:presence.newest_member_at}]}
      render(payload);
    }catch(err){if(root){root.hidden=true;console.warn('[NEITH OWNER ANALYTICS]',err?.message||err)}}finally{busy=false;btn?.classList.remove('is-loading')}
  }

  async function start(){loadDependencies();loadCss();await refresh();timer=setInterval(()=>{if(document.visibilityState==='visible')refresh()},3000);window.addEventListener('focus',()=>refresh(),{passive:true});window.addEventListener('neith:analytics-updated',()=>setTimeout(()=>refresh(),120),{passive:true});window.addEventListener('neith:presence-live-ping',()=>setTimeout(()=>refresh(),80),{passive:true});document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')refresh()},{passive:true});window.addEventListener('pagehide',()=>{clearInterval(timer);clearTimeout(realtimeDebounce);if(presenceChannel&&client?.removeChannel)client.removeChannel(presenceChannel).catch?.(()=>{});presenceChannel=null},{once:true})}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();

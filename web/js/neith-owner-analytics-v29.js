/* Neith V29 — OWNER-only analytics console injected below the public footer. */
(() => {
  'use strict';
  const esc=v=>String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  const nf=v=>Number(v||0).toLocaleString('en-US');
  const pct=v=>v==null?'—':`${Number(v).toFixed(1)}%`;
  const nicePage=p=>{if(!p||p==='/')return 'HOME';return String(p).split('?')[0].replace(/^\/+|\/+$/g,'').replace(/-/g,' ').toUpperCase()||'HOME'};
  const fmtDate=v=>{const d=new Date(v||0);return Number.isNaN(d.getTime())?'—':d.toLocaleString('en-GB',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'})};
  const wait=ms=>new Promise(r=>setTimeout(r,ms));
  let auth=null,client=null,root=null,timer=0,busy=false;

  function loadCss(){
    if(document.querySelector('link[data-neith-owner-analytics-v29]'))return;
    const here=document.currentScript?.src||Array.from(document.scripts).find(s=>/neith-owner-analytics-v29\.js/.test(s.src))?.src;
    if(!here)return;
    const link=document.createElement('link');link.rel='stylesheet';link.dataset.neithOwnerAnalyticsV29='1';link.href=new URL('../css/neith-owner-analytics-v29.css',here).href;document.head.appendChild(link);
  }
  function shell(){
    if(root)return root;
    root=document.createElement('section');
    root.id='neith-owner-analytics-v29';root.hidden=true;root.setAttribute('aria-hidden','true');
    root.innerHTML=`<div class="na29-wrap">
      <header class="na29-head"><div><span>OWNER ONLY · PRIVATE ANALYTICS</span><h2>NEITH SITE INTELLIGENCE</h2><p>Live traffic, visitors, registrations, downloads and conversion in one private console.</p></div><div class="na29-head-actions"><span class="na29-live"><i></i> LIVE DATA</span><button type="button" data-na29-refresh>REFRESH</button></div></header>
      <div class="na29-note" data-na29-note></div>
      <div class="na29-section-title"><span>RIGHT NOW</span><small data-na29-updated>—</small></div>
      <div class="na29-cards na29-cards-live" data-na29-live-cards></div>
      <div class="na29-section-title"><span>TODAY</span><small>Madrid time</small></div>
      <div class="na29-cards" data-na29-today></div>
      <div class="na29-split">
        <section class="na29-panel"><div class="na29-panel-head"><span>CONVERSION</span><small>Today / 7 days</small></div><div class="na29-conversion" data-na29-conversion></div></section>
        <section class="na29-panel"><div class="na29-panel-head"><span>ALL-TIME TOTALS</span><small>Stored data</small></div><div class="na29-totals" data-na29-totals></div></section>
      </div>
      <div class="na29-periods" data-na29-periods></div>
      <section class="na29-panel na29-daily"><div class="na29-panel-head"><span>LAST 14 DAYS</span><small>Daily performance</small></div><div class="na29-table-wrap"><table><thead><tr><th>DATE</th><th>VIEWS</th><th>UNIQUE</th><th>NEW</th><th>SESSIONS</th><th>SIGN-UPS</th><th>DOWNLOADS</th></tr></thead><tbody data-na29-daily></tbody></table></div></section>
      <div class="na29-grid3">
        <section class="na29-panel"><div class="na29-panel-head"><span>TOP PAGES · 7 DAYS</span><small>Views / unique</small></div><div class="na29-list" data-na29-pages></div></section>
        <section class="na29-panel"><div class="na29-panel-head"><span>RECENT REGISTRATIONS</span><small>Newest Neith IDs</small></div><div class="na29-list" data-na29-registrations></div></section>
        <section class="na29-panel"><div class="na29-panel-head"><span>RECENT DOWNLOADS</span><small>Launcher intent</small></div><div class="na29-list" data-na29-downloads></div></section>
      </div>
    </div>`;
    document.body.appendChild(root);
    root.querySelector('[data-na29-refresh]')?.addEventListener('click',()=>refresh(true));
    return root;
  }
  const card=(label,value,sub='')=>`<article class="na29-card"><small>${esc(label)}</small><b>${esc(value)}</b>${sub?`<span>${esc(sub)}</span>`:''}</article>`;
  function render(d){
    shell();
    const live=d.live||{},today=d.today||{},seven=d.seven_days||{},thirty=d.thirty_days||{},tot=d.totals||{},conv=d.conversion||{};
    root.querySelector('[data-na29-updated]').textContent=`Updated ${fmtDate(d.generated_at)}`;
    const tracking=d.tracking_since?`Page-view and download tracking active since ${fmtDate(d.tracking_since)}. Historic registered-user and unique-visitor totals are preserved.`:'Page-view and download tracking starts with this version. Historic registered-user and unique-visitor totals are preserved.';
    root.querySelector('[data-na29-note]').textContent=tracking;
    root.querySelector('[data-na29-live-cards]').innerHTML=[
      card('VISITORS ONLINE',nf(live.visitors),'unique browsers'),card('MEMBERS ONLINE',nf(live.members),'signed in'),card('GUESTS ONLINE',nf(live.guests),'not signed in'),card('LIVE SESSIONS',nf(live.sessions),'open pages'),card('HOTTEST PAGE',nicePage(live.top_page),'right now')
    ].join('');
    root.querySelector('[data-na29-today]').innerHTML=[
      card('PAGE VIEWS',nf(today.page_views),'all page loads'),card('VISITS / SESSIONS',nf(today.sessions),'new browser sessions'),card('UNIQUE VISITORS',nf(today.unique_visitors),'no repeats today'),card('NEW VISITORS',nf(today.new_visitors),'first time ever'),card('RETURNING',nf(today.returning_visitors),'seen before'),card('NEW ACCOUNTS',nf(today.registrations),'registrations today'),card('DOWNLOADS',nf(today.downloads),'launcher clicks')
    ].join('');
    root.querySelector('[data-na29-conversion]').innerHTML=`<div><small>DOWNLOAD CONVERSION</small><b>${pct(conv.download_today_pct)}</b><span>today</span><em>${pct(conv.download_7d_pct)} · 7d</em></div><div><small>SIGN-UP CONVERSION</small><b>${pct(conv.signup_today_pct)}</b><span>today</span><em>${pct(conv.signup_7d_pct)} · 7d</em></div>`;
    root.querySelector('[data-na29-totals]').innerHTML=`<div><small>UNIQUE VISITORS</small><b>${nf(tot.unique_visitors)}</b></div><div><small>REGISTERED USERS</small><b>${nf(tot.registered_users)}</b></div><div><small>DOWNLOADS TRACKED</small><b>${nf(tot.downloads)}</b></div><div><small>PAGE VIEWS TRACKED</small><b>${nf(tot.page_views)}</b></div>`;
    root.querySelector('[data-na29-periods]').innerHTML=[['7 DAYS',seven],['30 DAYS',thirty]].map(([title,x])=>`<section class="na29-panel na29-period"><div class="na29-panel-head"><span>${title}</span><small>Summary</small></div><div class="na29-period-grid">${card('VIEWS',nf(x.page_views))}${card('UNIQUE',nf(x.unique_visitors))}${card('NEW',nf(x.new_visitors))}${card('SESSIONS',nf(x.sessions))}${card('SIGN-UPS',nf(x.registrations))}${card('DOWNLOADS',nf(x.downloads))}</div></section>`).join('');
    const daily=Array.isArray(d.daily)?d.daily:[];
    root.querySelector('[data-na29-daily]').innerHTML=daily.map(x=>`<tr><td>${esc(String(x.date||'').slice(5))}</td><td>${nf(x.page_views)}</td><td>${nf(x.unique_visitors)}</td><td>${nf(x.new_visitors)}</td><td>${nf(x.sessions)}</td><td>${nf(x.registrations)}</td><td>${nf(x.downloads)}</td></tr>`).join('')||'<tr><td colspan="7">No daily data yet.</td></tr>';
    const pages=Array.isArray(d.top_pages_7d)?d.top_pages_7d:[];
    root.querySelector('[data-na29-pages]').innerHTML=pages.map((x,i)=>`<div class="na29-row"><i>${String(i+1).padStart(2,'0')}</i><span><b>${esc(nicePage(x.path))}</b><small>${nf(x.unique_visitors)} unique visitors</small></span><em>${nf(x.page_views)}</em></div>`).join('')||'<p class="na29-empty">No page-view data yet.</p>';
    const regs=Array.isArray(d.recent_registrations)?d.recent_registrations:[];
    root.querySelector('[data-na29-registrations]').innerHTML=regs.map(x=>`<div class="na29-row"><i>+</i><span><b>${esc(x.name||'Member')}</b><small>${esc(x.email||'')}</small></span><em>${esc(fmtDate(x.created_at))}</em></div>`).join('')||'<p class="na29-empty">No registrations yet.</p>';
    const downs=Array.isArray(d.recent_downloads)?d.recent_downloads:[];
    root.querySelector('[data-na29-downloads]').innerHTML=downs.map(x=>`<div class="na29-row"><i>↓</i><span><b>${esc(x.name||'Guest')}</b><small>${esc(x.email||nicePage(x.page))}</small></span><em>${esc(fmtDate(x.created_at))}</em></div>`).join('')||'<p class="na29-empty">No downloads tracked yet.</p>';
    root.hidden=false;root.setAttribute('aria-hidden','false');
  }
  async function ensureAuth(){
    for(let i=0;i<100;i++){
      try{auth=typeof window.NeithLoadAuth==='function'?await window.NeithLoadAuth():window.NeithAuth;if(auth?.client){client=auth.client;return true}}catch{}
      await wait(50);
    }
    return false;
  }
  async function refresh(force=false){
    if(busy)return;busy=true;
    try{
      if(!client&&!await ensureAuth())return;
      const s=auth?.session || (await client.auth.getSession())?.data?.session;
      if(!s?.user){if(root)root.hidden=true;return}
      const {data:isOwner,error:oe}=await client.rpc('neith_is_owner');
      if(oe||isOwner!==true){if(root)root.hidden=true;return}
      shell();
      const {data,error}=await client.rpc('neith_owner_analytics_snapshot',{p_days:14});
      if(error)throw error;
      render(data||{});
    }catch(err){if(root){root.hidden=true;console.warn('[NEITH OWNER ANALYTICS]',err?.message||err)}}
    finally{busy=false}
  }
  async function start(){
    loadCss();await refresh(true);
    timer=setInterval(()=>{if(document.visibilityState==='visible')refresh()},20000);
    window.addEventListener('focus',()=>refresh(),{passive:true});
    document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')refresh()},{passive:true});
    window.addEventListener('pagehide',()=>clearInterval(timer),{once:true});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();

(()=>{
  'use strict';
  const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
  let data=null, filter='all', channel=null, loading=false, lastLoad=0, fallbackTimer=null;
  const esc=v=>String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  const fmt=iso=>{if(!iso)return '—';try{return new Intl.DateTimeFormat('es-ES',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit'}).format(new Date(iso));}catch{return String(iso)}};
  const ago=iso=>{if(!iso)return '—';const s=Math.max(0,Math.floor((Date.now()-new Date(iso).getTime())/1000));if(s<60)return `hace ${s}s`;if(s<3600)return `hace ${Math.floor(s/60)} min`;if(s<86400)return `hace ${Math.floor(s/3600)} h`;return `hace ${Math.floor(s/86400)} d`;};
  const label=s=>({checkout_started:'CLICK / STARTED',paypal_opened:'PAYPAL OPENED',paid:'PAID',failed:'FAILED',cancelled:'CANCELLED',abandoned:'ABANDONED'}[s]||String(s||'').toUpperCase());
  async function client(){const c=window.NeithAuth?.client;if(!c?.rpc)throw new Error('Supabase is not available');return c;}
  async function load(force=false){
    if(loading)return;if(!force&&Date.now()-lastLoad<800)return;loading=true;
    const status=$('[data-purchase-status]');if(status)status.textContent='Actualizando…';
    try{const c=await client();const {data:d,error}=await c.rpc('neith_owner_purchase_attempts_snapshot',{p_limit:120});if(error)throw error;data=d||{};lastLoad=Date.now();render();if(status)status.textContent='LIVE · actualizado '+new Date().toLocaleTimeString('es-ES');}
    catch(err){console.error('Purchase attempts',err);if(status)status.textContent='Error: '+(err?.message||String(err));}
    finally{loading=false;}
  }
  function render(){const m=data?.metrics||{};const put=(sel,val)=>{const n=$(sel);if(n)n.textContent=val??0};put('[data-purchase-today]',m.today);put('[data-purchase-opened]',m.opened_today);put('[data-purchase-paid]',m.paid_today);put('[data-purchase-pending]',m.pending_now);put('[data-purchase-abandoned]',m.abandoned_24h);put('[data-purchase-conversion]',`${Number(m.conversion_today||0).toLocaleString('es-ES')}%`);
    const root=$('[data-purchase-list]');if(!root)return;const all=Array.isArray(data?.attempts)?data.attempts:[];const rows=filter==='all'?all:all.filter(x=>x.status===filter||(filter==='active'&&['checkout_started','paypal_opened'].includes(x.status)));
    if(!rows.length){root.innerHTML='<div class="neith-purchase-empty">There are no purchase attempts in this filter.</div>';return;}
    root.innerHTML=rows.map(x=>`<article class="neith-purchase-row"><div class="neith-purchase-user"><b>${esc(x.name||'Neith user')}</b><small>${esc(x.email||x.user_id||'—')}</small></div><div class="neith-purchase-plan">${x.plan==='annual'?'ANNUAL · 69,99 €':'MONTHLY · 7,99 €'}</div><span class="neith-purchase-badge ${esc(x.status)}">${esc(label(x.status))}</span><div class="neith-purchase-time"><b>${esc(fmt(x.started_at))}</b><small>${esc(ago(x.started_at))}</small></div><div class="neith-purchase-source" title="${esc(x.source_page||'')}">${esc(x.source_page||'—')}</div></article>`).join('');
    const info=$('[data-purchase-count]');if(info)info.textContent=`${rows.length} mostrados · ${all.length} cargados`;
    const refreshed=$('[data-purchase-refreshed]');if(refreshed)refreshed.textContent=data?.refreshed_at?`Servidor: ${fmt(data.refreshed_at)}`:'—';
  }
  async function ensureRealtime(){if(channel)return;try{const c=await client();channel=c.channel('neith-owner-purchase-attempts-r221').on('postgres_changes',{event:'*',schema:'public',table:'neith_purchase_attempts'},()=>load(true)).subscribe();}catch(err){console.warn('Purchase realtime',err);}}
  function boot(){ensureRealtime();load(true);if(!fallbackTimer)fallbackTimer=setInterval(()=>{if(!document.hidden&&$('[data-admin-panel="purchases"]')?.classList.contains('active'))load(true)},5000);}
  document.addEventListener('click',e=>{const tab=e.target.closest('[data-admin-tab="purchases"]');if(tab)setTimeout(boot,0);const f=e.target.closest('[data-purchase-filter]');if(f){filter=f.dataset.purchaseFilter||'all';$$('[data-purchase-filter]').forEach(b=>b.classList.toggle('active',b===f));render();}if(e.target.closest('[data-purchase-refresh]'))load(true);});
  window.addEventListener('neith:authchange',()=>{if($('[data-admin-panel="purchases"]')?.classList.contains('active'))boot();});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden&&$('[data-admin-panel="purchases"]')?.classList.contains('active'))load(true);});
})();

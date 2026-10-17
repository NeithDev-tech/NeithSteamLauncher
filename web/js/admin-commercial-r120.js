(() => {
  'use strict';
  function billingProviderLabel(raw, permanent=false){if(permanent)return 'NEITH';const v=String(raw||'none').toLowerCase();if(!v||v==='none'||v==='admin'||v==='key'||v.includes('lemon')||v==='stripe')return 'NEITH';if(v==='paypal')return 'PAYPAL';return v.toUpperCase();}
  const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
  const state={loaded:false,role:'',selected:null,detail:null,keys:[],lastKey:''};
  const client=()=>window.NeithAuth?.client||null;
  const notify=(text,type='info')=>{try{window.NeithAdminNotify?.(text,type)}catch{}};
  const esc=v=>String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  const fmt=v=>{if(!v)return '—';try{return new Intl.DateTimeFormat(document.documentElement.lang==='en'?'en-GB':'es-ES',{dateStyle:'medium',timeStyle:'short'}).format(new Date(v));}catch{return String(v)}};
  const roleCan=(...roles)=>roles.includes(state.role);
  async function rpc(name,args={}){const c=client();if(!c)throw new Error('Supabase no disponible');const {data,error}=await c.rpc(name,args);if(error)throw error;return data;}
  function status(text,type=''){const n=$('[data-commercial-status]');if(n){n.textContent=text||'';n.className=`neith-commercial-status ${type}`.trim();}if(type==='error'&&text)notify(String(text),'error');}
  function roleLabel(){const n=$('[data-commercial-role]');if(n)n.innerHTML=`<i></i>${esc((state.role||'READ ONLY').toUpperCase())} · MFA VERIFIED`;}
  function normalizeUsers(payload){if(Array.isArray(payload))return payload;if(Array.isArray(payload?.users))return payload.users;if(Array.isArray(payload?.items))return payload.items;return [];}

  async function ensureAccess(){
    const ctx=window.NeithAdminContext||await rpc('neith_admin_context');
    if(!ctx?.is_admin)throw new Error('Esta cuenta no tiene acceso al Control Plane comercial.');
    if(ctx?.mfa_required)throw new Error('Completa 2FA antes de usar PREMIUM & CLAVES.');
    state.role=String(ctx?.role||'support').toLowerCase(); roleLabel();
  }

  function renderSearch(rows=[]){const box=$('[data-commercial-results]');if(!box)return;if(!rows.length){box.innerHTML='<div class="neith-commercial-empty">Sin resultados.</div>';return;}box.innerHTML=rows.map(u=>{const id=u.user_id||u.id||'';const email=u.email||'—';const name=u.nickname||u.display_name||email;const plan=String(u.plan||'free').toUpperCase();return `<div class="neith-commercial-result"><button type="button" data-commercial-user="${esc(id)}"><b>${esc(name)}</b><small>${esc(email)} · ${esc(id)}</small></button><span class="neith-commercial-badge ${plan==='PREMIUM'?'':'warn'}">${esc(plan)}</span></div>`}).join('');}

  async function searchUsers(query){status('BUSCANDO…');const data=await rpc('neith_admin_search_users',{p_query:String(query||'').trim(),p_limit:30});const rows=normalizeUsers(data);renderSearch(rows);status(`${rows.length} resultado(s).`);}

  function renderDetail(){
    const root=$('[data-commercial-user-detail]'); if(!root)return;
    const u=state.detail?.user; if(!u){root.innerHTML='<div class="neith-commercial-empty">Selecciona una Cuenta Neith para gestionar PREMIUM y dispositivos.</div>';return;}
    const m=u.membership||{}, p=u.profile||{}, devices=Array.isArray(u.devices)?u.devices:[];
    const activeDevices=devices.filter(d=>!d.revoked_at).length;
    const plan=String(m.plan||'free').toUpperCase();
    root.innerHTML=`<header><div><small>CUENTA SELECCIONADA</small><h3>${esc(p.nickname||u.email||'Neith ID')}</h3><p>${esc(u.email||'—')} · ${esc(u.user_id||'')}</p></div><span class="neith-commercial-badge ${String(m.plan||'free')==='premium'?'':'warn'}">${esc(plan)}</span></header>
      <div class="neith-commercial-summary"><article><small>PLAN ACTUAL</small><strong>${esc(plan)}</strong></article><article><small>PREMIUM HASTA</small><strong>${m.premium_permanent?'PERMANENTE':esc(fmt(m.premium_until))}</strong></article><article><small>SUSCRIPCIÓN</small><strong>${esc(billingProviderLabel(m.billing_provider,Boolean(m.premium_permanent)))} · ${esc(String(m.billing_interval||'—').toUpperCase())}</strong></article><article><small>DISPOSITIVOS PREMIUM</small><strong>${activeDevices} ACTIVO(S)</strong></article></div>
      <div class="neith-commercial-actions neith-commercial-actions--premium">
        <label>UNIDAD<select data-commercial-add-unit><option value="day">DÍAS</option><option value="week">SEMANAS</option><option value="month" selected>MESES</option><option value="year">AÑOS</option></select></label>
        <label>CANTIDAD<input data-commercial-add-amount type="number" min="1" max="120" value="1"></label>
        <label class="wide">MOTIVO / NOTA<input data-commercial-reason maxlength="500" placeholder="Motivo administrativo"></label>
        <button type="button" data-commercial-add-premium ${roleCan('owner','admin')?'':'disabled'}>SUMAR TIEMPO PREMIUM</button>
        <button type="button" data-commercial-remove-all ${roleCan('owner')?'':'disabled'}>FORZAR FREE</button>
        <button type="button" data-commercial-reduce-premium ${roleCan('owner')?'':'disabled'}>RESTAR DÍAS</button>
        <button type="button" data-commercial-permanent="on" ${roleCan('owner')?'':'disabled'}>PREMIUM PERMANENTE</button>
        <button type="button" data-commercial-permanent="off" ${roleCan('owner')?'':'disabled'}>QUITAR PERMANENTE</button>
        <button type="button" class="wide" data-commercial-reset-replacements ${roleCan('owner')?'':'disabled'}>RESTABLECER SUSTITUCIONES DE PC</button>
      </div>
      <div class="neith-commercial-note">Puedes dar tiempo en días, semanas, meses o años; retirar tiempo; devolver la cuenta a FREE; activar PREMIUM permanente y revocar PCs vinculados, siempre con auditoría en Supabase.</div>
      <div class="neith-commercial-devices" data-commercial-devices>${devices.length?devices.map(d=>`<div class="neith-commercial-device"><div><b>${esc(d.installation_hint||'PC')}</b><small>Vinculado: ${esc(fmt(d.premium_bound_at))} · Último uso: ${esc(fmt(d.last_seen_at))}</small></div><div class="neith-device-actions"><button class="danger" type="button" data-commercial-revoke-device="${esc(d.id)}" ${roleCan('owner','admin')&& !d.revoked_at?'':'disabled'}>${d.revoked_at?'REVOCADO':'REVOCAR PC'}</button></div></div>`).join(''):'<div class="neith-commercial-empty">No hay PCs PREMIUM vinculados.</div>'}</div>`;
  }


  async function selectUser(id){status('CARGANDO CUENTA…');state.selected=String(id||'');state.detail=await rpc('neith_admin_user_detail',{p_user_id:state.selected});renderDetail();status('Cuenta cargada.','ok');}

  function renderKeys(){const box=$('[data-commercial-keys]');if(!box)return;if(!state.keys.length){box.innerHTML='<div class="neith-commercial-empty">No hay claves administrativas.</div>';return;}box.innerHTML=state.keys.map(k=>{const stateText=k.redeemed_at?'CANJEADA':k.revoked_at?'REVOCADA':'DISPONIBLE';const dur=k.grants_permanent?'PERMANENTE':k.grant_unit==='day'?`${k.grant_amount} DÍA(S)`:k.grant_unit==='month'?`${k.grant_amount} MES(ES)`:k.grant_unit==='year'?`${k.grant_amount} AÑO(S)`:k.duration_days?`${k.duration_days} DÍAS`:'—';return `<div class="neith-commercial-key"><div><b>${esc(dur)} · ${esc(stateText)}</b><small>${esc(k.note||'Sin nota')} · ${esc(fmt(k.created_at))}</small></div><div class="neith-key-actions"><button class="danger" type="button" data-commercial-revoke-key="${esc(k.id)}" ${!k.redeemed_at&&!k.revoked_at&&roleCan('owner','admin')?'':'disabled'}>REVOCAR</button><button class="danger" type="button" data-commercial-delete-key="${esc(k.id)}" ${!k.redeemed_at&&roleCan('owner','admin')?'':'disabled'}>ELIMINAR</button></div></div>`}).join('');}
  async function loadKeys(){const data=await rpc('neith_admin_keys_list',{p_limit:250});state.keys=Array.isArray(data?.keys)?data.keys:[];renderKeys();}

  function revealKey(raw){const box=$('[data-commercial-key-reveal]');if(!box)return;state.lastKey=String(raw||'');box.hidden=!state.lastKey;box.innerHTML=state.lastKey?`<small>CLAVE GENERADA · SE MUESTRA UNA VEZ</small><code>${esc(state.lastKey)}</code><button type="button" data-commercial-copy-key>COPIAR CLAVE</button>`:'';}

  async function generateKey(){const unit=$('[data-commercial-key-unit]')?.value||'m';const amount=Math.max(1,Math.min(120,Number($('[data-commercial-key-amount]')?.value||1)));const note=$('[data-commercial-key-note]')?.value?.trim()||'';let duration='1m';if(unit==='permanent')duration='permanent';else if(unit==='w')duration=`${amount*7}d`;else duration=`${amount}${unit}`;status('GENERANDO CLAVE PREMIUM…');const data=await rpc('neith_admin_generate_key',{p_duration:duration,p_note:note});const raw=String(data?.key||'');const id=String(data?.key_id||'');if(!raw||!id)throw new Error('Supabase no devolvió la clave administrativa completa.');revealKey(raw);await loadKeys();if(!state.keys.some(k=>String(k.id||'')===id))throw new Error('La clave se creó pero no pudo verificarse en el inventario.');status('Clave PREMIUM creada, verificada y registrada en Auditoría.','ok');notify('Clave PREMIUM creada correctamente · lista para canjear en Claves Neith','success');}

  async function refreshSelected(){if(state.selected)await selectUser(state.selected);}
  function reason(){return $('[data-commercial-reason]')?.value?.trim()||'';}
  async function userAction(action,extra={}){if(!state.selected)throw new Error('Selecciona primero una Cuenta Neith.');const r=reason();status('APLICANDO CAMBIO…');if(action==='add')await rpc('neith_admin_add_premium',{p_user_id:state.selected,p_unit:extra.unit,p_amount:extra.amount,p_reason:r});if(action==='reduce')await rpc('neith_admin_reduce_premium',{p_user_id:state.selected,p_days:extra.days,p_reason:r});if(action==='permanent')await rpc('neith_admin_set_permanent',{p_user_id:state.selected,p_enabled:extra.enabled,p_reason:r});if(action==='reset')await rpc('neith_admin_reset_replacements',{p_user_id:state.selected,p_reason:r});if(action==='device')await rpc('neith_admin_device_revoke',{p_user_id:state.selected,p_device_id:extra.device,p_reason:r});await refreshSelected();status('Cambio aplicado y auditado.','ok');const labels={add:'PREMIUM añadido correctamente',reduce:'Tiempo PREMIUM reducido',permanent:extra.enabled?'PREMIUM permanente concedido':'PREMIUM permanente retirado',reset:'Sustituciones de PC restablecidas',device:'PC PREMIUM revocado'};notify(labels[action]||'Cambio aplicado correctamente','success');}

  async function removeAllPremium(){
    if(!state.selected)throw new Error('Selecciona primero una Cuenta Neith.');
    status('RETIRANDO PREMIUM…');
    await rpc('neith_admin_force_free',{p_user_id:state.selected,p_reason:reason()||'Forzar FREE desde Web Admin Center'});
    await refreshSelected();
    status('Premium retirado. La cuenta vuelve a FREE.','ok');notify('Cuenta actualizada a FREE','success');
  }


  function actionDialog({title,copy='',label='MOTIVO / CONFIRMACIÓN',value='',type='text',confirmText='CONFIRMAR',danger=true}={}){
    return new Promise(resolve=>{
      let modal=$('[data-commercial-modal]');
      if(!modal){
        modal=document.createElement('div');modal.className='neith-commercial-modal';modal.dataset.commercialModal='';modal.hidden=true;
        modal.innerHTML=`<div class="neith-commercial-modal__backdrop" data-commercial-modal-cancel></div><section class="neith-commercial-modal__card" role="dialog" aria-modal="true"><button class="neith-commercial-modal__x" type="button" data-commercial-modal-cancel aria-label="Cerrar">×</button><small>NEITH COMMERCIAL CONTROL</small><h3 data-commercial-modal-title></h3><p data-commercial-modal-copy></p><label><span data-commercial-modal-label></span><input data-commercial-modal-input autocomplete="off"></label><div class="neith-commercial-modal__actions"><button type="button" data-commercial-modal-cancel>CANCELAR</button><button type="button" data-commercial-modal-confirm>CONFIRMAR</button></div></section>`;
        document.body.appendChild(modal);
      }
      const input=$('[data-commercial-modal-input]',modal),confirm=$('[data-commercial-modal-confirm]',modal);
      $('[data-commercial-modal-title]',modal).textContent=title||'CONFIRMAR ACCIÓN';
      $('[data-commercial-modal-copy]',modal).textContent=copy||'';
      $('[data-commercial-modal-label]',modal).textContent=label||'';
      input.type=type; input.value=value; input.min=type==='number'?'1':''; input.max=type==='number'?'36500':'';
      confirm.textContent=confirmText||'CONFIRMAR'; confirm.classList.toggle('danger',!!danger);
      modal.hidden=false; requestAnimationFrame(()=>modal.classList.add('open')); setTimeout(()=>input.focus(),60);
      let done=false;
      const close=result=>{if(done)return;done=true;modal.classList.remove('open');setTimeout(()=>{modal.hidden=true},150);cleanup();resolve(result)};
      const onCancel=e=>{if(e.target.closest('[data-commercial-modal-cancel]'))close(null)};
      const onConfirm=()=>close(input.value.trim());
      const onKey=e=>{if(e.key==='Escape')close(null);if(e.key==='Enter'){e.preventDefault();onConfirm();}};
      const cleanup=()=>{modal.removeEventListener('click',onCancel);confirm.removeEventListener('click',onConfirm);input.removeEventListener('keydown',onKey)};
      modal.addEventListener('click',onCancel);confirm.addEventListener('click',onConfirm);input.addEventListener('keydown',onKey);
    });
  }

  async function boot(){if(state.loaded)return;state.loaded=true;try{await ensureAccess();await loadKeys();renderDetail();status('Control comercial preparado.','ok');}catch(e){status(e?.message||String(e),'error');}}

  document.addEventListener('click',async e=>{
    const tab=e.target.closest('[data-admin-tab="commercial"]'); if(tab){setTimeout(()=>boot(),0);return;}
    const u=e.target.closest('[data-commercial-user]');if(u){try{await selectUser(u.dataset.commercialUser)}catch(err){status(err?.message||String(err),'error')}return;}
    if(e.target.closest('[data-commercial-generate-key]')){try{await generateKey()}catch(err){status(err?.message||String(err),'error')}return;}
    if(e.target.closest('[data-commercial-copy-key]')){if(state.lastKey){await navigator.clipboard?.writeText(state.lastKey);status('Clave copiada al portapapeles.','ok');notify('Clave PREMIUM copiada al portapapeles','success')}return;}
    const revokeKey=e.target.closest('[data-commercial-revoke-key]');if(revokeKey){const why=await actionDialog({title:'REVOCAR CLAVE',copy:'La clave dejará de poder canjearse. La operación quedará en auditoría.',label:'MOTIVO',confirmText:'REVOCAR CLAVE'});if(why===null)return;try{await rpc('neith_admin_revoke_key',{p_key_id:revokeKey.dataset.commercialRevokeKey,p_reason:why||'Revocada desde Web Admin Center R120'});await loadKeys();status('Clave revocada.','ok');notify('Clave revocada · ya no puede canjearse','success')}catch(err){status(err?.message||String(err),'error')}return;}
    const deleteKey=e.target.closest('[data-commercial-delete-key]');if(deleteKey){const why=await actionDialog({title:'ELIMINAR CLAVE',copy:'Solo se puede eliminar una clave no canjeada. Esta operación es definitiva.',label:'MOTIVO',confirmText:'ELIMINAR DEFINITIVAMENTE'});if(why===null)return;try{await rpc('neith_admin_delete_key',{p_key_id:deleteKey.dataset.commercialDeleteKey,p_reason:why||'Eliminada desde Web Admin Center R120'});await loadKeys();status('Clave eliminada.','ok');notify('Clave eliminada definitivamente','success')}catch(err){status(err?.message||String(err),'error')}return;}
    const add=e.target.closest('[data-commercial-add-premium]');if(add){try{let unit=$('[data-commercial-add-unit]')?.value||'month';let amount=Math.max(1,Math.min(120,Number($('[data-commercial-add-amount]')?.value||1)));if(unit==='week'){unit='day';amount=amount*7;}await userAction('add',{unit,amount})}catch(err){status(err?.message||String(err),'error')}return;}
    const removeAll=e.target.closest('[data-commercial-remove-all]');if(removeAll){const why=await actionDialog({title:'FORZAR CUENTA A FREE',copy:'Se retirará todo el tiempo PREMIUM actual y, si la cuenta es permanente, también se desactivará el estado permanente. Operación reservada a OWNER.',label:'MOTIVO',confirmText:'FORZAR FREE'});if(why===null)return;const field=$('[data-commercial-reason]');if(field&&why)field.value=why;try{await removeAllPremium()}catch(err){status(err?.message||String(err),'error')}return;}
    const reduce=e.target.closest('[data-commercial-reduce-premium]');if(reduce){const raw=await actionDialog({title:'REDUCIR PREMIUM',copy:'Esta acción resta tiempo adquirido y está reservada a OWNER.',label:'DÍAS A RETIRAR',value:'1',type:'number',confirmText:'RESTAR DÍAS'});if(raw===null)return;const days=Math.floor(Number(raw||0));if(days<1){status('Introduce un número de días válido.','error');return;}try{await userAction('reduce',{days})}catch(err){status(err?.message||String(err),'error')}return;}
    const perm=e.target.closest('[data-commercial-permanent]');if(perm){const enabled=perm.dataset.commercialPermanent==='on';const why=await actionDialog({title:enabled?'CONCEDER PREMIUM PERMANENTE':'QUITAR PREMIUM PERMANENTE',copy:enabled?'La cuenta pasará a PREMIUM permanente.':'La cuenta volverá al periodo temporal que conserve, o a FREE si no queda tiempo.',label:'MOTIVO',confirmText:enabled?'CONCEDER PERMANENTE':'QUITAR PERMANENTE'});if(why===null)return;const field=$('[data-commercial-reason]');if(field&&why)field.value=why;try{await userAction('permanent',{enabled})}catch(err){status(err?.message||String(err),'error')}return;}
    if(e.target.closest('[data-commercial-reset-replacements]')){const why=await actionDialog({title:'RESTABLECER SUSTITUCIONES',copy:'El contador de sustituciones de PC volverá a cero para esta cuenta.',label:'MOTIVO',confirmText:'RESTABLECER'});if(why===null)return;const field=$('[data-commercial-reason]');if(field&&why)field.value=why;try{await userAction('reset')}catch(err){status(err?.message||String(err),'error')}return;}
    const dev=e.target.closest('[data-commercial-revoke-device]');if(dev){const why=await actionDialog({title:'REVOCAR PC PREMIUM',copy:'Este equipo dejará de estar autorizado para usar el acceso PREMIUM vinculado.',label:'MOTIVO',confirmText:'REVOCAR PC'});if(why===null)return;const field=$('[data-commercial-reason]');if(field&&why)field.value=why;try{await userAction('device',{device:dev.dataset.commercialRevokeDevice})}catch(err){status(err?.message||String(err),'error')}return;}
  });
  document.addEventListener('submit',async e=>{const form=e.target.closest('[data-commercial-search]');if(!form)return;e.preventDefault();try{await searchUsers(form.elements.query.value)}catch(err){status(err?.message||String(err),'error')}});
})();

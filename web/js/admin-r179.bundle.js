/* NEITH ADMIN R179 BUNDLE — order-preserving stable sources. */

/* === SOURCE: admin.js === */
(() => {
  'use strict';
  const $ = (s, r=document) => r.querySelector(s);
  const $$ = (s, r=document) => [...r.querySelectorAll(s)];
  const gate = $('[data-admin-gate]');
  const denied = $('[data-admin-denied]');
  const consoleEl = $('[data-admin-console]');
  const state = {
    role:'user', data:null, users:[], usersPage:0, usersPageSize:20,
    usersTotal:0, usersQuery:'', usersLoaded:false, usersLoading:false,
    usersBackend:'unknown', usersSecurityReady:null, bootstrapReady:false, activeTab:'overview', currentUserId:null,
    audit:[], auditPage:0, auditPageSize:25, auditTotal:0, auditLoaded:false, auditLoading:false, auditBackend:'unknown',
    auditQuery:'', auditAction:'', auditTargetType:'', auditFrom:'', auditTo:'', auditSelected:new Set(),
    announcements:[], announcementsPage:0, announcementsPageSize:20, announcementsTotal:0, announcementsLoaded:false, announcementsLoading:false, announcementsBackend:'unknown', announcementsQuery:'', announcementsStatus:'', announcementsAudience:'', announcementsSeverity:'',
    flags:[], flagsPage:0, flagsPageSize:20, flagsTotal:0, flagsLoaded:false, flagsLoading:false, flagsBackend:'unknown', flagsQuery:'', flagsAudience:'', flagsEnabled:'', pendingFlagSave:null,
    lastChangedUserId:null, lastChangedAction:'', launcherBaseline:'', launcherBaselineObject:null, pendingLauncherSave:null, dashboard:null,
    consoleSettings:null, consoleSettingsLoaded:false, consoleSettingsBackend:'unknown', settingsAutoTimer:null, settingsBaseline:'', dashboardLoading:false, dashboardLastLoad:0
  };

  const escapeHtml = (v='') => String(v).replace(/[&<>'"]/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch]));
  const fmtDate = value => { if(!value) return '—'; try{return new Intl.DateTimeFormat(document.documentElement.lang==='en'?'en-GB':'es-ES',{dateStyle:'short',timeStyle:'short'}).format(new Date(value));}catch{return '—';} };
  const boolText = v => v ? 'ACTIVO' : 'OFF';
  const client = () => window.NeithAuth?.client || null;
  const lang = () => document.documentElement.lang === 'en' ? 'en' : 'es';
  const runIdle = fn => { if('requestIdleCallback' in window) requestIdleCallback(fn,{timeout:900}); else setTimeout(fn,80); };

  const USERS_COPY = {
    es:{eyebrow:'IDENTITY CONTROL',title:'USUARIOS NEITH',subtitle:'Carga automática de 20 identidades por página con estado autoritativo y seguridad protegida por OWNER / ADMIN.',secure:'DIRECTORIO SEGURO',search:'BUSCAR',clear:'LIMPIAR',directory:'DIRECTORIO',loading:'CARGANDO IDENTIDADES NEITH',loading_sub:'Consultando el directorio seguro…',prev:'‹ ANTERIOR',page:'PÁGINA',next:'SIGUIENTE ›',placeholder:'Buscar por correo o nombre de usuario',users:'usuarios',of:'DE',empty:'DIRECTORIO VACÍO',none:'Todavía no hay usuarios disponibles.',noMatches:'SIN COINCIDENCIAS',noMatchesSub:'No hay Neith IDs que coincidan con esta búsqueda.',loadError:'NO SE PUDO CARGAR EL DIRECTORIO',created:'REGISTRO',last:'ÚLTIMO ACCESO',status:'ESTADO',active:'ACTIVO',never:'SIN ACCESO',role:'ROL',plan:'PLAN',apply:'APLICAR',noName:'Sin nombre',security:'SEGURIDAD',suspend:'SUSPENDER',reactivate:'REACTIVAR',delete:'ELIMINAR',banned:'SUSPENDIDO',activeNow:'ACTIVO',self:'CUENTA MAESTRA',manage:'SECURITY VAULT',securityOk:'PROTECCIÓN ACTIVA',securityLocked:'CUENTA SUSPENDIDA',until:'HASTA',pending:'CAMBIOS PENDIENTES',saved:'ACCESO ACTUALIZADO',auditOk:'Registrado en Auditoría'},
    en:{eyebrow:'IDENTITY CONTROL',title:'NEITH USERS',subtitle:'Automatic loading of 20 identities per page with authoritative state and security protected by OWNER / ADMIN.',secure:'SECURE DIRECTORY',search:'SEARCH',clear:'CLEAR',directory:'DIRECTORY',loading:'LOADING NEITH IDENTITIES',loading_sub:'Querying the secure directory…',prev:'‹ PREVIOUS',page:'PAGE',next:'NEXT ›',placeholder:'Search by email or username',users:'users',of:'OF',empty:'EMPTY DIRECTORY',none:'There are no users available yet.',noMatches:'NO MATCHES',noMatchesSub:'No Neith IDs match this search.',loadError:'DIRECTORY COULD NOT BE LOADED',created:'CREATED',last:'LAST SIGN-IN',status:'STATUS',active:'ACTIVE',never:'NO SIGN-IN',role:'ROLE',plan:'PLAN',apply:'APPLY',noName:'No name',security:'SECURITY',suspend:'SUSPEND',reactivate:'REACTIVATE',delete:'DELETE',banned:'SUSPENDED',activeNow:'ACTIVE',self:'MASTER ACCOUNT',manage:'SECURITY VAULT',securityOk:'PROTECTION ACTIVE',securityLocked:'ACCOUNT SUSPENDED',until:'UNTIL',pending:'PENDING CHANGES',saved:'ACCESS UPDATED',auditOk:'Logged in Audit'}
  };
  const ucopy = key => {
    if(key==='subtitle'){
      return lang()==='en'
        ? `${state.usersPageSize} identities per page, authoritative plan state and account security protected by OWNER / ADMIN.`
        : `${state.usersPageSize} identidades por página, estado autoritativo del plan y seguridad protegida por OWNER / ADMIN.`;
    }
    return USERS_COPY[lang()][key] || USERS_COPY.es[key] || key;
  };

  function applyUsersLanguage(){
    $$('[data-users-copy]').forEach(el=>{ const value=ucopy(el.dataset.usersCopy); if(value) el.textContent=value; });
    const input=$('[data-users-placeholder]'); if(input) input.placeholder=ucopy('placeholder');
    renderUsersMeta();
  }

  function setDenied(message, options={}){
    gate.hidden = true; consoleEl.hidden = true; denied.hidden = false;
    const el = $('[data-admin-denied-message]'); if(el) el.textContent = message;
    const mfaButton=$('[data-admin-mfa-action]'); if(mfaButton)mfaButton.hidden=!options.mfa;
    const installLink=$('[data-admin-install-link]'); if(installLink)installLink.hidden=Boolean(options.mfa);
  }
  function setReady(){ gate.hidden=true; denied.hidden=true; consoleEl.hidden=false; }
  function msg(el, text, type=''){ if(!el)return; el.textContent=text; el.dataset.type=type; }
  function notify(text, type='info'){
    const root=$('[data-admin-toasts]'); if(!root)return;
    const toast=document.createElement('div'); toast.className=`admin32-toast ${type}`; toast.textContent=text; root.appendChild(toast);
    requestAnimationFrame(()=>toast.classList.add('show'));
    setTimeout(()=>{toast.classList.remove('show');setTimeout(()=>toast.remove(),220);},3200);
  }
  window.NeithAdminNotify=(text,type='info')=>notify(text,type);

  async function rpc(name, args={}){
    const c=client(); if(!c) throw new Error('Supabase no está disponible.');
    const {data,error}=await c.rpc(name,args); if(error) throw error; return data;
  }
  const isMissingRpc = (err, name='') => {
    const text=String(err?.message||err||'');
    return /schema cache|could not find the function|function .* does not exist|PGRST202|404/i.test(text) || (name && text.toLowerCase().includes(name.toLowerCase()) && /function/i.test(text));
  };


  async function detectUsersSecurityCapabilities(){
    try{
      const caps=await rpc('neith_admin_users_capabilities');
      state.usersSecurityReady=Boolean(caps?.security_ready);
      return state.usersSecurityReady;
    }catch(err){
      if(!isMissingRpc(err,'neith_admin_users_capabilities')) throw err;
      // Compatibilidad R4/R13: si el listado v3 existe, ese paquete instalaba
      // también los RPC de suspensión y borrado. No mostramos un falso aviso.
      state.usersSecurityReady=state.usersBackend==='paged-v3';
      return state.usersSecurityReady;
    }
  }

  function renderStats(){
    const stats=state.data?.stats||{}; $$('[data-stat]').forEach(el=>el.textContent=stats[el.dataset.stat] ?? '0');
    $('[data-admin-identity]').textContent = String(state.role||'ADMIN').toUpperCase();
  }
  function renderOverview(){
    const c=state.data?.launcher||{};
    const set=(sel,val)=>{const el=$(sel);if(el)el.textContent=val;};
    set('[data-overview-version]',c.stable_version||'—');
    set('[data-overview-channel]',String(c.release_channel||'—').toUpperCase());
    set('[data-overview-min]',c.minimum_version||'—');
    set('[data-overview-force]',boolText(c.force_update));
    set('[data-overview-maintenance]',boolText(c.maintenance_enabled));
  }
  function dashboardActionLabel(action=''){
    const map={'user_access.updated':'Acceso de usuario actualizado','user.suspended':'Usuario suspendido','user.reactivated':'Usuario reactivado','user.deleted':'Usuario eliminado','launcher_config.updated':'Configuración del launcher','feature_flag.saved':'Feature Flag actualizada','announcement.saved':'Aviso guardado','announcement.active_changed':'Estado de aviso cambiado','console_settings.updated':'Configuración del Admin Center'};
    return map[action]||String(action||'Evento administrativo').replace(/[._-]+/g,' ').toUpperCase();
  }
  function renderDashboard(data=state.dashboard){
    const d=data||{}, stats=d.stats||state.data?.stats||{}, c=d.launcher||state.data?.launcher||{};
    const set=(sel,val)=>{const el=$(sel);if(el)el.textContent=val;};
    const users=Number(stats.users_total||0),premium=Number(stats.premium_total||0);
    set('[data-dashboard-users]',users); set('[data-dashboard-premium]',premium); set('[data-dashboard-suspended]',stats.suspended_total??'—');
    set('[data-dashboard-notices]',stats.active_announcements??0); set('[data-dashboard-flags]',stats.feature_flags_enabled??0); set('[data-dashboard-events24]',stats.audit_24h??'—');
    set('[data-dashboard-premium-rate]',users?`${Math.round((premium/users)*100)}% del total`:'0% del total');
    set('[data-dashboard-version]',c.stable_version||'—'); set('[data-dashboard-version-card]',c.stable_version||'—'); set('[data-dashboard-minimum]',c.minimum_version||'—');
    set('[data-dashboard-channel]',String(c.release_channel||'—').toUpperCase()); set('[data-dashboard-channel-card]',String(c.release_channel||'—').toUpperCase());
    set('[data-dashboard-force]',c.force_update?'ACTIVO':'OFF'); set('[data-dashboard-maintenance]',c.maintenance_enabled?'ACTIVO':'OFF');
    const critical=Boolean(c.maintenance_enabled||c.force_update),health=$('[data-dashboard-health]'),copy=$('[data-dashboard-health-copy]'),policy=$('[data-dashboard-policy]');
    if(health)health.textContent=c.maintenance_enabled?'MANTENIMIENTO':(c.force_update?'UPDATE CRÍTICO':'OPERATIVO');
    if(copy)copy.textContent=c.maintenance_enabled?'El modo mantenimiento está activo para todos los clientes.':(c.force_update?'Hay una política de actualización obligatoria activa.':'Neith está disponible y sin políticas críticas activas.');
    if(policy){policy.classList.toggle('critical',critical);const s=policy.querySelector('span');if(s)s.textContent=c.maintenance_enabled?'MANTENIMIENTO ACTIVO':(c.force_update?'UPDATE OBLIGATORIO':'POLÍTICA NORMAL');}
    const root=$('[data-dashboard-activity]'); if(root){const rows=Array.isArray(d.recent_activity)?d.recent_activity:[];root.innerHTML=rows.length?rows.map(x=>`<div class="neith-dashboard-event"><i></i><div><b>${escapeHtml(dashboardActionLabel(x.action))}</b><small>${escapeHtml(x.actor_name||x.actor_email||'Sistema')}</small></div><time>${escapeHtml(fmtDate(x.created_at))}</time></div>`).join(''):'<div class="neith-dashboard-loading"><span>Sin actividad administrativa reciente.</span></div>';}
  }
  async function loadDashboard({force=false}={}){
    if(state.dashboardLoading)return state.dashboard;
    const now=Date.now();
    if(!force && state.dashboardLastLoad && now-state.dashboardLastLoad<5000)return state.dashboard;
    state.dashboardLoading=true;
    try{
      state.dashboard=await rpc('neith_admin_dashboard_summary');
      state.dashboardLastLoad=Date.now();
      renderDashboard();
      return state.dashboard;
    }
    catch(err){
      if(!isMissingRpc(err,'neith_admin_dashboard_summary'))console.warn('Dashboard R23:',err);
      if(!state.dashboard)renderDashboard();
      return state.dashboard;
    }
    finally{state.dashboardLoading=false;}
  }
  function launcherPayloadFromForm(){
    const f=$('[data-launcher-form]'); if(!f)return null;
    return {
      stable_version:f.elements.stable_version.value.trim(),
      minimum_version:f.elements.minimum_version.value.trim(),
      download_url:f.elements.download_url.value.trim(),
      release_channel:f.elements.release_channel.value,
      force_update:f.elements.force_update.checked,
      maintenance_enabled:f.elements.maintenance_enabled.checked,
      maintenance_title:f.elements.maintenance_title.value.trim(),
      maintenance_message:f.elements.maintenance_message.value.trim(),
      launcher_notice:f.elements.launcher_notice.value.trim()
    };
  }
  const launcherSignature = p => JSON.stringify(p||{});
  function renderLauncherMetrics(payload){
    const p=payload||{};
    const set=(sel,val)=>{const el=$(sel);if(el)el.textContent=val;};
    set('[data-launcher-metric-stable]',p.stable_version||'—');
    set('[data-launcher-metric-min]',p.minimum_version||'—');
    set('[data-launcher-metric-channel]',String(p.release_channel||'—').toUpperCase());
    set('[data-launcher-metric-policy]',p.maintenance_enabled?'MANTENIMIENTO':(p.force_update?'UPDATE FORZADO':'NORMAL'));
  }
  function syncLauncherPreview(){
    const p=launcherPayloadFromForm(); if(!p)return;
    const set=(sel,val)=>{const el=$(sel);if(el)el.textContent=val;};
    set('[data-launcher-preview-version]',p.stable_version||'—');
    set('[data-launcher-preview-channel]',String(p.release_channel||'stable').toUpperCase());
    set('[data-launcher-preview-min]',p.minimum_version||'—');
    set('[data-launcher-preview-force]',p.force_update?'ACTUALIZACIÓN OBLIGATORIA':'Actualización opcional');
    set('[data-launcher-preview-state]',p.maintenance_enabled?'MANTENIMIENTO':'ONLINE');
    set('[data-launcher-preview-maintenance]',p.maintenance_enabled?(p.maintenance_title||'Mantenimiento programado'):'Servicio disponible');
    set('[data-launcher-preview-notice]',p.launcher_notice||'Sin aviso global.');
    const canWrite=state.role==='superadmin';
    const dirty=canWrite&&launcherSignature(p)!==state.launcherBaseline;
    const dirtyEl=$('[data-launcher-dirty]'),save=$('[data-launcher-save]');
    if(dirtyEl){dirtyEl.textContent=!canWrite?'MODO LECTURA · OWNER':(dirty?'CAMBIOS PENDIENTES':'SIN CAMBIOS PENDIENTES');dirtyEl.classList.toggle('is-dirty',dirty);}
    if(save)save.disabled=!canWrite||!dirty;
  }
  function fillLauncher(){
    const c=state.data?.launcher||{}, f=$('[data-launcher-form]'); if(!f)return;
    ['stable_version','minimum_version','download_url','release_channel','maintenance_title','maintenance_message','launcher_notice'].forEach(k=>{ if(f.elements[k]) f.elements[k].value=c[k]??''; });
    f.elements.force_update.checked=Boolean(c.force_update); f.elements.maintenance_enabled.checked=Boolean(c.maintenance_enabled);
    state.launcherBaselineObject=launcherPayloadFromForm();
    state.launcherBaseline=launcherSignature(state.launcherBaselineObject);
    renderLauncherMetrics(state.launcherBaselineObject);
    const canWrite=state.role==='superadmin';
    $$('input,select,textarea',f).forEach(el=>{el.disabled=!canWrite;el.setAttribute('aria-disabled',String(!canWrite));});
    f.classList.toggle('is-readonly',!canWrite);
    syncLauncherPreview();
    msg($('[data-launcher-status]'),canWrite?'':'MODO LECTURA · solo OWNER puede publicar cambios.');
  }
  function validateLauncherPayload(p){
    const version=/^v?\d+(?:\.\d+){1,3}(?:[-+][0-9A-Za-z.-]+)?$/;
    if(!version.test(p.stable_version||'')) throw new Error('La versión estable no tiene un formato válido. Ejemplo: 1.0.629');
    if(!version.test(p.minimum_version||'')) throw new Error('La versión mínima no tiene un formato válido. Ejemplo: 1.0.500');
    let url; try{url=new URL(p.download_url);}catch{throw new Error('La URL de descarga no es válida.');}
    if(url.protocol!=='https:') throw new Error('La URL de descarga debe usar HTTPS.');
    if(p.maintenance_enabled && (!p.maintenance_title || !p.maintenance_message)) throw new Error('El mantenimiento necesita título y mensaje.');
  }
  function ensureLauncherModal(){
    let modal=$('[data-launcher-modal]'); if(modal)return modal;
    modal=document.createElement('div'); modal.className='neith-launcher-modal'; modal.dataset.launcherModal=''; modal.hidden=true;
    modal.innerHTML='<div class="neith-launcher-modal-backdrop" data-close-launcher-modal></div><section class="neith-launcher-modal-card" role="dialog" aria-modal="true"><small>NEITH RELEASE SECURITY</small><h3>CONFIRMAR CAMBIO CRÍTICO</h3><p data-launcher-modal-copy></p><div class="neith-launcher-modal-summary" data-launcher-modal-summary></div><div class="neith-launcher-modal-actions"><button class="cancel" type="button" data-close-launcher-modal>CANCELAR</button><button class="confirm" type="button" data-confirm-launcher-save>CONFIRMAR Y GUARDAR</button></div></section>';
    document.body.appendChild(modal); return modal;
  }
  function openLauncherModal(payload){
    const modal=ensureLauncherModal(),base=state.launcherBaselineObject||{};state.pendingLauncherSave=payload;
    const reasons=[];
    if(payload.force_update&&!base.force_update)reasons.push('Se activará ACTUALIZACIÓN OBLIGATORIA para los clientes.');
    if(payload.maintenance_enabled&&!base.maintenance_enabled)reasons.push('Se activará MODO MANTENIMIENTO global.');
    if(payload.minimum_version!==base.minimum_version)reasons.push(`Versión mínima: ${base.minimum_version||'—'} → ${payload.minimum_version}`);
    $('[data-launcher-modal-copy]',modal).textContent='Vas a publicar una configuración que puede cambiar el acceso o la actualización de los launchers conectados.';
    $('[data-launcher-modal-summary]',modal).innerHTML=(reasons.length?reasons:['Se publicarán los cambios de configuración.']).map(x=>`<span>${escapeHtml(x)}</span>`).join('');
    modal.hidden=false;
  }
  function closeLauncherModal(){const modal=$('[data-launcher-modal]');if(modal)modal.hidden=true;state.pendingLauncherSave=null;}
  async function saveLauncherPayload(payload){
    if(state.role!=='superadmin') throw new Error('Solo OWNER puede publicar la configuración del launcher.');
    const s=$('[data-launcher-status]'),save=$('[data-launcher-save]');if(save)save.disabled=true;msg(s,'GUARDANDO…');
    try{await rpc('neith_admin_save_launcher_config',{p_payload:payload});await loadBootstrap();switchTab('launcher');msg(s,'CONFIGURACIÓN PUBLICADA','ok');notify('Configuración del launcher actualizada','success');}
    catch(err){msg(s,err?.message||'No se pudo guardar','error');syncLauncherPreview();throw err;}
  }
  async function testLauncherPublicConfig(){
    try{const cfg=await rpc('neith_launcher_public_config');notify(`Endpoint OK · ${cfg?.stable_version||'sin versión'} · ${String(cfg?.release_channel||'stable').toUpperCase()}`,'success');}
    catch(err){notify(err?.message||'No se pudo consultar la configuración pública','error');}
  }
  const flagAudienceLabel = value => ({all:'TODOS',free:'FREE',premium:'PREMIUM',beta:'BETA',staff:'STAFF'}[String(value||'all')]||String(value||'all').toUpperCase());
  function renderFlagsMeta(){
    const total=Number(state.flagsTotal||0), page=Math.max(0,Number(state.flagsPage||0)), size=state.flagsPageSize, pages=Math.max(1,Math.ceil(total/size));
    const enabled=(state.flags||[]).filter(f=>Boolean(f.enabled)).length;
    const partial=(state.flags||[]).filter(f=>Number(f.rollout_percent)>0&&Number(f.rollout_percent)<100).length;
    const set=(sel,val)=>{const el=$(sel);if(el)el.textContent=val;};
    set('[data-flags-total]',String(total));set('[data-flags-enabled]',String(enabled));set('[data-flags-partial]',String(partial));set('[data-flags-page]',String(page+1));set('[data-flags-pages]',`DE ${pages}`);
    const pager=$('[data-flags-pagination]');if(pager)pager.hidden=total<=size;
    const prev=$('[data-flags-prev]'),next=$('[data-flags-next]');if(prev)prev.disabled=page<=0;if(next)next.disabled=(page+1)*size>=total;
  }
  function renderFlags(){
    const root=$('[data-flags-list]');if(!root)return;
    const flags=Array.isArray(state.flags)?state.flags:[];
    if(!flags.length){root.innerHTML=`<div class="neith-flags-empty"><b>${state.flagsQuery||state.flagsAudience||state.flagsEnabled!==''?'SIN COINCIDENCIAS':'SIN FEATURE FLAGS'}</b><small>${state.flagsQuery||state.flagsAudience||state.flagsEnabled!==''?'No hay flags que coincidan con los filtros actuales.':'Todavía no hay flags configuradas.'}</small></div>`;renderFlagsMeta();return;}
    root.innerHTML=flags.map(f=>{const rollout=Math.max(0,Math.min(100,Number(f.rollout_percent??100)));return `<article class="neith-flag-card ${f.enabled?'is-enabled':''}" data-flag-key="${escapeHtml(f.flag_key)}" data-original-enabled="${f.enabled?'true':'false'}" data-original-audience="${escapeHtml(f.audience||'all')}" data-original-rollout="${rollout}"><div class="neith-flag-main"><div class="neith-flag-identity"><div class="neith-flag-topline"><span class="neith-flag-key">${escapeHtml(f.flag_key)}</span><span class="neith-flag-state"><i></i>${f.enabled?'ACTIVA':'INACTIVA'}</span><span class="neith-flag-audience-badge">${flagAudienceLabel(f.audience)}</span></div><h3>${escapeHtml(f.label||f.flag_key)}</h3><p>${escapeHtml(f.description||'Sin descripción.')}</p></div><div class="neith-flag-control"><div class="neith-flag-control-grid"><label><span>AUDIENCIA</span><select data-flag-audience>${['all','free','premium','beta','staff'].map(v=>`<option value="${v}" ${f.audience===v?'selected':''}>${flagAudienceLabel(v)}</option>`).join('')}</select></label><label><span>ROLLOUT %</span><input data-flag-rollout type="number" min="0" max="100" value="${rollout}"></label></div><div class="neith-flag-rollout"><div class="neith-flag-rollout-head"><span>DESPLIEGUE PROGRESIVO</span><b data-flag-rollout-label>${rollout}%</b></div><div class="neith-flag-track"><i data-flag-rollout-bar style="--rollout:${rollout}%"></i></div></div><div class="neith-flag-actions"><label class="neith-flag-toggle"><input type="checkbox" data-flag-enabled ${f.enabled?'checked':''}><i></i><span>${f.enabled?'MÓDULO ACTIVO':'MÓDULO INACTIVO'}</span></label><span class="neith-flag-dirty" data-flag-dirty></span><button type="button" class="neith-flag-save" data-save-flag disabled>GUARDAR CAMBIOS</button></div></div></div></article>`}).join('');
    renderFlagsMeta();
  }
  function renderFlagsLoading(){const root=$('[data-flags-list]');if(root)root.innerHTML='<div class="neith-flags-loading"><i></i><b>CARGANDO FEATURE FLAGS</b><small>Consultando la matriz de despliegue…</small></div>';}
  async function loadFlags({page=state.flagsPage,force=false}={}){
    if(state.flagsLoading&&!force)return;state.flagsLoading=true;state.flagsPage=Math.max(0,Number(page||0));renderFlagsLoading();
    try{
      try{
        const data=await rpc('neith_admin_list_feature_flags',{p_query:state.flagsQuery||'',p_audience:state.flagsAudience||'',p_enabled:state.flagsEnabled===''?null:state.flagsEnabled==='true',p_limit:state.flagsPageSize,p_offset:state.flagsPage*state.flagsPageSize});
        state.flags=Array.isArray(data?.rows)?data.rows:[];state.flagsTotal=Number(data?.total||0);state.flagsBackend='paged-r19';
      }catch(err){
        if(!isMissingRpc(err,'neith_admin_list_feature_flags'))throw err;
        let rows=Array.isArray(state.data?.feature_flags)?state.data.feature_flags.slice():[];
        const q=state.flagsQuery.toLowerCase();if(q)rows=rows.filter(f=>`${f.flag_key||''} ${f.label||''} ${f.description||''}`.toLowerCase().includes(q));
        if(state.flagsAudience)rows=rows.filter(f=>f.audience===state.flagsAudience);if(state.flagsEnabled!=='')rows=rows.filter(f=>Boolean(f.enabled)===(state.flagsEnabled==='true'));
        state.flagsTotal=rows.length;state.flags=rows.slice(state.flagsPage*state.flagsPageSize,(state.flagsPage+1)*state.flagsPageSize);state.flagsBackend='bootstrap-fallback';
      }
      const maxPage=Math.max(0,Math.ceil(state.flagsTotal/state.flagsPageSize)-1);if(state.flagsPage>maxPage){state.flagsPage=maxPage;return loadFlags({page:maxPage,force:true});}
      state.flagsLoaded=true;renderFlags();
    }finally{state.flagsLoading=false;}
  }
  function flagCardPayload(card){const existing=(state.flags||[]).find(f=>f.flag_key===card.dataset.flagKey)||{};return {...existing,flag_key:card.dataset.flagKey,enabled:card.querySelector('[data-flag-enabled]').checked,audience:card.querySelector('[data-flag-audience]').value,rollout_percent:Number(card.querySelector('[data-flag-rollout]').value||0)};}
  function updateFlagDirty(card){
    if(!card)return;const enabled=card.querySelector('[data-flag-enabled]').checked,audience=card.querySelector('[data-flag-audience]').value,rollout=Math.max(0,Math.min(100,Number(card.querySelector('[data-flag-rollout]').value||0)));card.querySelector('[data-flag-rollout]').value=rollout;
    const dirty=String(enabled)!==card.dataset.originalEnabled||audience!==card.dataset.originalAudience||String(rollout)!==card.dataset.originalRollout;card.classList.toggle('has-changes',dirty);const b=card.querySelector('[data-save-flag]');if(b)b.disabled=!dirty;const d=card.querySelector('[data-flag-dirty]');if(d)d.textContent=dirty?'CAMBIOS PENDIENTES':'';const label=card.querySelector('[data-flag-rollout-label]');if(label)label.textContent=`${rollout}%`;const bar=card.querySelector('[data-flag-rollout-bar]');if(bar)bar.style.setProperty('--rollout',`${rollout}%`);const toggleText=card.querySelector('.neith-flag-toggle span');if(toggleText)toggleText.textContent=enabled?'MÓDULO ACTIVO':'MÓDULO INACTIVO';
  }
  function ensureFlagModal(){let modal=$('[data-flag-modal]');if(modal)return modal;modal=document.createElement('div');modal.className='neith-flag-modal';modal.dataset.flagModal='';modal.hidden=true;modal.innerHTML='<div class="neith-flag-modal-backdrop" data-close-flag-modal></div><section class="neith-flag-modal-card" role="dialog" aria-modal="true"><small>NEITH DEPLOYMENT SECURITY</small><h3 data-flag-modal-title>CONFIRMAR CAMBIO</h3><p data-flag-modal-copy></p><div class="neith-flag-modal-key" data-flag-modal-key></div><div class="neith-flag-modal-actions"><button class="cancel" type="button" data-close-flag-modal>CANCELAR</button><button class="confirm" type="button" data-confirm-flag-save>CONFIRMAR</button></div></section>';document.body.appendChild(modal);return modal;}
  function openFlagSaveModal(card,payload){const modal=ensureFlagModal(),turningOn=payload.enabled;state.pendingFlagSave={card,payload};modal.classList.toggle('is-disabling',!turningOn);$('[data-flag-modal-title]',modal).textContent=turningOn?'ACTIVAR FEATURE FLAG':'DESACTIVAR FEATURE FLAG';$('[data-flag-modal-copy]',modal).textContent=turningOn?'Esta función quedará disponible según su audiencia y porcentaje de rollout.':'Esta función dejará de estar disponible para su audiencia objetivo.';$('[data-flag-modal-key]',modal).textContent=payload.flag_key;modal.hidden=false;}
  function closeFlagModal(){const modal=$('[data-flag-modal]');if(modal)modal.hidden=true;state.pendingFlagSave=null;}
  async function saveFlag(card,payload){const button=card.querySelector('[data-save-flag]');if(button)button.disabled=true;try{await rpc('neith_admin_upsert_feature_flag',{p_payload:payload});await loadBootstrap();await loadFlags({page:state.flagsPage,force:true});switchTab('flags');notify('Feature flag actualizada','success');}catch(err){notify(err?.message||String(err),'error');updateFlagDirty(card);throw err;}}

  const noticeStatus = a => {
    const now=Date.now(), start=a?.starts_at?new Date(a.starts_at).getTime():0, end=a?.ends_at?new Date(a.ends_at).getTime():null;
    if(!a?.active) return 'paused';
    if(start && start>now) return 'scheduled';
    if(end && end<=now) return 'expired';
    return 'live';
  };
  const noticeStatusLabel = s => ({live:'EN VIVO',scheduled:'PROGRAMADO',paused:'PAUSADO',expired:'FINALIZADO'}[s]||String(s||'').toUpperCase());
  const noticeSeverityLabel = s => ({info:'INFO',success:'ÉXITO',warning:'ADVERTENCIA',critical:'CRÍTICO'}[s]||String(s||'INFO').toUpperCase());
  const noticeSurfaceLabel = s => ({all:'WEB + LAUNCHER',web:'SOLO WEB',launcher:'SOLO LAUNCHER'}[s]||'WEB + LAUNCHER');
  const noticePriorityLabel = p => ({1:'NORMAL',2:'ALTA',3:'URGENTE',4:'CRÍTICA'}[Number(p)||1]||'NORMAL');
  const toLocalInput = value => {
    if(!value)return '';
    const d=new Date(value); if(Number.isNaN(d.getTime()))return '';
    const pad=n=>String(n).padStart(2,'0');
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };
  const localToIso = value => value ? new Date(value).toISOString() : null;
  function renderAnnouncementsMeta(){
    const total=Number(state.announcementsTotal||0), page=Math.max(0,Number(state.announcementsPage||0)), size=state.announcementsPageSize, pages=Math.max(1,Math.ceil(total/size)), start=total?page*size+1:0, end=Math.min(total,(page+1)*size);
    const set=(sel,val)=>{const el=$(sel);if(el)el.textContent=val;};
    set('[data-notices-total]',String(total)); set('[data-notices-range]',total?`${start}–${end}`:'0'); set('[data-notices-page]',String(page+1)); set('[data-notices-pages]',String(pages)); set('[data-notices-page-bottom]',String(page+1)); set('[data-notices-pages-bottom]',`DE ${pages}`);
    const pager=$('[data-notices-pagination]'); if(pager)pager.hidden=state.announcementsBackend!=='paged'||total<=size;
    const prev=$('[data-notices-prev]'),next=$('[data-notices-next]'); if(prev)prev.disabled=page<=0; if(next)next.disabled=(page+1)*size>=total;
  }
  function renderAnnouncements(){
    const root=$('[data-announcements-list]'); if(!root)return;
    const list=state.announcements||[];
    if(!list.length){root.innerHTML='<div class="neith-notice-empty"><span>◇</span><b>SIN AVISOS</b><small>No hay comunicaciones que coincidan con los filtros actuales.</small></div>';renderAnnouncementsMeta();return;}
    root.innerHTML=list.map(a=>{
      const status=noticeStatus(a), priority=Number(a.priority||1), severity=String(a.severity||'info'), surface=a.surface||'all';
      return `<article class="neith-notice-card ${escapeHtml(severity)} status-${status}" data-announcement-id="${escapeHtml(a.id)}"><div class="neith-notice-card-rail"></div><div class="neith-notice-card-main"><div class="neith-notice-card-top"><div class="neith-notice-badges"><span class="status ${status}"><i></i>${noticeStatusLabel(status)}</span><span class="severity">${noticeSeverityLabel(severity)}</span><span class="priority p${priority}">P${priority} · ${noticePriorityLabel(priority)}</span></div><div class="neith-notice-card-actions"><button type="button" data-edit-announcement>EDITAR</button><button type="button" class="danger" data-delete-announcement>ELIMINAR</button><label class="neith-notice-toggle" title="Activar o pausar"><input type="checkbox" data-announcement-active data-id="${escapeHtml(a.id)}" ${a.active?'checked':''}><i></i></label></div></div><h3>${escapeHtml(a.title||'Aviso Neith')}</h3><p>${escapeHtml(a.body||'')}</p><div class="neith-notice-card-meta"><span><small>AUDIENCIA</small><b>${escapeHtml(String(a.audience||'all').toUpperCase())}</b></span><span><small>DESTINO</small><b>${escapeHtml(noticeSurfaceLabel(surface))}</b></span><span><small>INICIO</small><b>${fmtDate(a.starts_at)}</b></span><span><small>FIN</small><b>${a.ends_at?fmtDate(a.ends_at):'SIN FECHA'}</b></span></div></div></article>`;
    }).join('');
    renderAnnouncementsMeta();
  }
  function renderAnnouncementsLoading(){const root=$('[data-announcements-list]');if(root)root.innerHTML='<div class="neith-notice-loading"><i></i><b>CARGANDO CANAL DE AVISOS</b><small>Consultando Supabase…</small></div>';}
  async function loadAnnouncements({page=state.announcementsPage,force=false}={}){
    if(state.announcementsLoading&&!force)return;
    state.announcementsLoading=true; state.announcementsPage=Math.max(0,Number(page||0)); renderAnnouncementsLoading();
    try{
      try{
        const data=await rpc('neith_admin_list_announcements',{p_query:state.announcementsQuery||'',p_status:state.announcementsStatus||'',p_audience:state.announcementsAudience||'',p_severity:state.announcementsSeverity||'',p_limit:state.announcementsPageSize,p_offset:state.announcementsPage*state.announcementsPageSize});
        state.announcements=Array.isArray(data?.items)?data.items:[]; state.announcementsTotal=Number(data?.total||0); state.announcementsBackend='paged';
      }catch(err){
        if(!isMissingRpc(err,'neith_admin_list_announcements'))throw err;
        const fallback=Array.isArray(state.data?.announcements)?state.data.announcements:[];
        state.announcements=fallback; state.announcementsTotal=fallback.length; state.announcementsBackend='bootstrap';
      }
      state.announcementsLoaded=true; renderAnnouncements();
    }finally{state.announcementsLoading=false;}
  }
  function ensureAnnouncementDeleteModal(){
    let modal=$('[data-announcement-delete-modal]'); if(modal)return modal;
    modal=document.createElement('div'); modal.className='neith-announcement-delete-modal'; modal.dataset.announcementDeleteModal=''; modal.hidden=true;
    modal.innerHTML='<div class="neith-announcement-delete-backdrop" data-close-announcement-delete></div><section class="neith-announcement-delete-card" role="dialog" aria-modal="true"><button class="neith-announcement-delete-x" type="button" data-close-announcement-delete aria-label="Cerrar">×</button><small>NEITH BROADCAST SECURITY</small><h3>ELIMINAR AVISO</h3><p>Este aviso se eliminará del Admin Center y dejará de enviarse a nuevos clientes.</p><div class="neith-announcement-delete-target"><small>AVISO SELECCIONADO</small><b data-announcement-delete-title></b></div><div class="neith-announcement-delete-warning">Esta acción no se puede deshacer.</div><div class="neith-announcement-delete-actions"><button class="cancel" type="button" data-close-announcement-delete>CANCELAR</button><button class="confirm" type="button" data-confirm-announcement-delete>ELIMINAR DEFINITIVAMENTE</button></div></section>';
    document.body.appendChild(modal); return modal;
  }
  function openAnnouncementDelete(item){
    const modal=ensureAnnouncementDeleteModal(); state.pendingAnnouncementDelete=item||null;
    $('[data-announcement-delete-title]',modal).textContent=item?.title||'Aviso Neith'; modal.hidden=false; document.body.classList.add('neith-modal-open'); setTimeout(()=>modal.classList.add('open'),10);
  }
  function closeAnnouncementDelete(){
    const modal=$('[data-announcement-delete-modal]'); if(!modal)return; modal.classList.remove('open'); document.body.classList.remove('neith-modal-open'); state.pendingAnnouncementDelete=null; setTimeout(()=>{modal.hidden=true;},180);
  }
  async function confirmAnnouncementDelete(){
    const modal=$('[data-announcement-delete-modal]'), item=state.pendingAnnouncementDelete, button=modal&&$('[data-confirm-announcement-delete]',modal); if(!modal||!item||!button)return;
    button.disabled=true; button.textContent='ELIMINANDO…';
    try{
      await rpc('neith_admin_delete_announcement',{p_id:item.id}); closeAnnouncementDelete(); await loadBootstrap(); await loadAnnouncements({page:state.announcementsPage,force:true}); switchTab('notices'); notify('Aviso eliminado','success');
    }catch(err){button.disabled=false;button.textContent='ELIMINAR DEFINITIVAMENTE';notify(err?.message||'No se pudo eliminar el aviso','error');}
  }

  function syncAnnouncementPreview(){
    const f=$('[data-announcement-form]'), card=$('[data-announcement-preview]'); if(!f||!card)return;
    const severity=f.elements.severity.value||'info', priority=f.elements.priority.value||'1';
    card.className=`neith-notice-preview ${severity}`;
    const set=(sel,val)=>{const el=$(sel,card);if(el)el.textContent=val;};
    set('[data-preview-severity]',noticeSeverityLabel(severity)); set('[data-preview-priority]',`PRIORIDAD ${noticePriorityLabel(priority)}`); set('[data-preview-title]',f.elements.title.value.trim()||'Título del aviso'); set('[data-preview-body]',f.elements.body.value.trim()||'El mensaje aparecerá aquí mientras escribes.'); set('[data-preview-audience]',String(f.elements.audience.value||'all').toUpperCase()); set('[data-preview-surface]',noticeSurfaceLabel(f.elements.surface.value));
  }
  function openAnnouncementEditor(item=null){
    const f=$('[data-announcement-form]'); if(!f)return; f.reset();
    const a=item||{}; f.elements.id.value=a.id||''; f.elements.title.value=a.title||''; f.elements.body.value=a.body||''; f.elements.severity.value=a.severity||'info'; f.elements.priority.value=String(a.priority||1); f.elements.audience.value=a.audience||'all'; f.elements.surface.value=a.surface||'all'; f.elements.starts_at.value=toLocalInput(a.starts_at||new Date()); f.elements.ends_at.value=toLocalInput(a.ends_at); f.elements.active.checked=item?Boolean(a.active):true;
    const title=$('[data-announcement-editor-title]');if(title)title.textContent=item?'EDITAR AVISO':'NUEVO AVISO'; const submit=$('[data-announcement-submit]');if(submit)submit.textContent=item?'GUARDAR CAMBIOS':'PUBLICAR AVISO'; msg($('[data-announcement-status]'),''); syncAnnouncementPreview(); f.hidden=false; f.scrollIntoView({behavior:'smooth',block:'nearest'});
  }

  const AUDIT_ACTION_LABELS = {
    'user_access.updated':'ACCESO DE USUARIO','user.suspended':'USUARIO SUSPENDIDO','user.reactivated':'USUARIO REACTIVADO','user.deleted':'USUARIO ELIMINADO',
    'launcher_config.updated':'CONFIGURACIÓN LAUNCHER','feature_flag.saved':'FEATURE FLAG GUARDADA',
    'announcement.saved':'AVISO GUARDADO','announcement.active_changed':'ESTADO DE AVISO','announcement.deleted':'AVISO ELIMINADO','console_settings.updated':'CONFIGURACIÓN ADMIN'
  };
  const auditActionLabel = action => AUDIT_ACTION_LABELS[action] || String(action||'EVENTO').replaceAll('.',' · ').replaceAll('_',' ').toUpperCase();
  const auditKind = action => action==='user.deleted'?'destructive':((action==='user.suspended'||action==='user.reactivated')?'security':(/launcher|feature_flag|announcement/.test(action||'')?'config':'default'));
  const auditTargetLabel = type => ({user:'USUARIO',launcher:'LAUNCHER',feature_flag:'FEATURE FLAG',announcement:'AVISO',system:'SISTEMA'}[type]||String(type||'SISTEMA').toUpperCase());
  function renderAuditMeta(){
    const start=state.auditTotal?state.auditPage*state.auditPageSize+1:0;
    const end=state.auditTotal?Math.min(start+state.audit.length-1,state.auditTotal):0;
    const pages=Math.max(1,Math.ceil(state.auditTotal/state.auditPageSize));
    const total=$('[data-audit-total]'), range=$('[data-audit-range]');
    if(total) total.textContent=String(state.auditTotal);
    if(range) range.textContent=state.auditTotal?`${start}–${end}`:'0';
    $$('[data-audit-page]').forEach(el=>el.textContent=String(state.auditPage+1));
    $$('[data-audit-pages]').forEach(el=>el.textContent=String(pages));
    const bottomPage=$('[data-audit-page-bottom]'), bottomPages=$('[data-audit-pages-bottom]');
    if(bottomPage) bottomPage.textContent=String(state.auditPage+1);
    if(bottomPages) bottomPages.textContent=`DE ${pages}`;
    const prev=$('[data-audit-prev]'), next=$('[data-audit-next]'), pager=$('[data-audit-pagination]');
    if(prev) prev.disabled=state.auditPage<=0;
    if(next) next.disabled=(state.auditPage+1)>=pages || state.auditBackend!=='paged-r16';
    if(pager) pager.hidden=state.auditBackend!=='paged-r16' || state.auditTotal<=state.auditPageSize;
  }
  function syncAuditSelectionUi(){
    const canDelete=state.role==='superadmin';
    $$('[data-audit-superadmin]').forEach(el=>el.hidden=!canDelete);
    const currentIds=state.audit.map(a=>String(a.id));
    const selectedCurrent=currentIds.filter(id=>state.auditSelected.has(id));
    const all=canDelete&&currentIds.length>0&&selectedCurrent.length===currentIds.length;
    const some=canDelete&&selectedCurrent.length>0&&!all;
    const master=$('[data-audit-select-all]');
    if(master){master.checked=all;master.indeterminate=some;master.disabled=!canDelete||!currentIds.length;}
    const count=$('[data-audit-selected-count]');if(count)count.textContent=String(state.auditSelected.size);
    const del=$('[data-audit-delete-selected]');if(del)del.disabled=!canDelete||state.auditSelected.size===0;
  }
  function renderAudit(){
    const root=$('[data-audit-list]'); if(!root)return;
    renderAuditMeta();
    if(!state.audit.length){root.innerHTML='<div class="neith-audit-empty"><b>SIN EVENTOS</b><small>No hay acciones que coincidan con los filtros actuales.</small></div>';syncAuditSelectionUi();return;}
    const canDelete=state.role==='superadmin';
    root.innerHTML=state.audit.map(a=>{
      let payload='{}'; try{payload=JSON.stringify(a.payload||{},null,2);}catch{}
      const actorName=a.actor_name||'Sistema'; const actorEmail=a.actor_email||''; const id=String(a.id);
      const selected=state.auditSelected.has(id);
      return `<article class="neith-audit-event${selected?' is-selected':''}" data-kind="${auditKind(a.action)}" data-audit-id="${escapeHtml(id)}"><div class="neith-audit-main">${canDelete?`<label class="neith-audit-check" title="Seleccionar evento"><input type="checkbox" data-audit-select value="${escapeHtml(id)}" ${selected?'checked':''}><i></i></label>`:''}<div class="neith-audit-time"><span>${fmtDate(a.created_at)}</span><small>#${escapeHtml(a.id)}</small></div><div class="neith-audit-action"><small>ACCIÓN</small><b>${escapeHtml(auditActionLabel(a.action))}</b><span>${escapeHtml(a.action)}</span></div><div class="neith-audit-actor"><small>EJECUTADO POR</small><b>${escapeHtml(actorName)}</b><span>${escapeHtml(actorEmail||a.actor_id||'Sistema')}</span></div><div class="neith-audit-target"><small>${escapeHtml(auditTargetLabel(a.target_type))}</small><b>${escapeHtml(a.target_id||'GLOBAL')}</b><span>${escapeHtml(a.target_type||'system')}</span></div><div class="neith-audit-event-actions"><button class="neith-audit-toggle" type="button" data-audit-toggle>DETALLES</button>${canDelete?'<button class="neith-audit-delete-one" type="button" data-audit-delete-one>ELIMINAR</button>':''}</div></div><div class="neith-audit-details" hidden><pre class="neith-audit-payload">${escapeHtml(payload)}</pre></div></article>`;
    }).join('');
    syncAuditSelectionUi();
  }
  function renderAuditLoading(){const root=$('[data-audit-list]');if(root)root.innerHTML='<div class="neith-audit-loading"><i></i><b>CARGANDO TRAZA NEITH</b><small>Consultando el registro seguro…</small></div>';}
  const auditDateStart = value => value ? new Date(`${value}T00:00:00`).toISOString() : null;
  const auditDateEnd = value => {if(!value)return null;const d=new Date(`${value}T00:00:00`);d.setDate(d.getDate()+1);return d.toISOString();};
  async function loadAudit({page=state.auditPage,force=false}={}){
    if(state.auditLoading&&!force)return;
    state.auditLoading=true; state.auditPage=Math.max(0,Number(page||0)); renderAuditLoading();
    try{
      try{
        const data=await rpc('neith_admin_list_audit',{p_query:state.auditQuery||null,p_action:state.auditAction||null,p_target_type:state.auditTargetType||null,p_from:auditDateStart(state.auditFrom),p_to:auditDateEnd(state.auditTo),p_limit:state.auditPageSize,p_offset:state.auditPage*state.auditPageSize});
        state.audit=Array.isArray(data?.items)?data.items:[]; state.auditTotal=Number(data?.total||0); state.auditBackend='paged-r16';
      }catch(err){
        if(!isMissingRpc(err,'neith_admin_list_audit')) throw err;
        const fallback=Array.isArray(state.data?.audit)?state.data.audit:[];
        state.audit=fallback; state.auditTotal=fallback.length; state.auditPage=0; state.auditBackend='bootstrap-40';
      }
      const maxPage=Math.max(0,Math.ceil(state.auditTotal/state.auditPageSize)-1);
      if(state.auditBackend==='paged-r16'&&state.auditPage>maxPage){state.auditPage=maxPage;return await loadAudit({page:maxPage,force:true});}
      state.auditLoaded=true; renderAudit();
    }catch(err){const root=$('[data-audit-list]');if(root)root.innerHTML=`<div class="neith-audit-empty"><b>NO SE PUDO CARGAR LA AUDITORÍA</b><small>${escapeHtml(err?.message||String(err))}</small></div>`;throw err;}
    finally{state.auditLoading=false;}
  }

  async function deleteAuditRecords({ids=null,count=null,all=false}={}){
    if(state.role!=='superadmin') throw new Error('NEITH_SUPERADMIN_REQUIRED');
    const args={p_ids:Array.isArray(ids)&&ids.length?ids.map(v=>Number(v)):null,p_limit:count?Number(count):null,p_all:Boolean(all)};
    const result=await rpc('neith_admin_delete_audit',args);
    state.auditSelected.clear();
    await loadAudit({page:state.auditPage,force:true});
    try{await loadDashboard?.();}catch{}
    return Number(result?.deleted||0);
  }
  function ensureAuditDeleteModal(){
    let modal=$('[data-audit-delete-modal]');
    if(modal)return modal;
    modal=document.createElement('div');
    modal.className='neith-audit-delete-modal';
    modal.dataset.auditDeleteModal='';
    modal.hidden=true;
    modal.innerHTML=`<div class="neith-audit-delete-backdrop" data-audit-delete-cancel></div>
      <section class="neith-audit-delete-card" role="dialog" aria-modal="true" aria-labelledby="neith-audit-delete-title">
        <span class="neith-audit-delete-kicker"><i></i> NEITH AUDIT SECURITY</span>
        <button class="neith-audit-delete-x" type="button" data-audit-delete-cancel aria-label="Cerrar">×</button>
        <div class="neith-audit-delete-icon" aria-hidden="true"><span>!</span></div>
        <h3 id="neith-audit-delete-title" data-audit-delete-title>CONFIRMAR ELIMINACIÓN</h3>
        <p data-audit-delete-copy>Esta acción eliminará registros del historial administrativo.</p>
        <div class="neith-audit-delete-target">
          <small>OPERACIÓN DESTRUCTIVA</small>
          <b data-audit-delete-target>REGISTRO DE AUDITORÍA</b>
        </div>
        <div class="neith-audit-delete-warning"><i></i><span>Esta acción no se puede deshacer.</span></div>
        <div class="neith-audit-delete-actions">
          <button class="cancel" type="button" data-audit-delete-cancel>CANCELAR</button>
          <button class="confirm" type="button" data-audit-delete-confirm>ELIMINAR DEFINITIVAMENTE</button>
        </div>
      </section>`;
    document.body.appendChild(modal);
    return modal;
  }

  function confirmAuditDelete({title='CONFIRMAR ELIMINACIÓN',copy='',target='REGISTRO DE AUDITORÍA',confirmLabel='ELIMINAR DEFINITIVAMENTE'}={}){
    const modal=ensureAuditDeleteModal();
    $('[data-audit-delete-title]',modal).textContent=title;
    $('[data-audit-delete-copy]',modal).textContent=copy;
    $('[data-audit-delete-target]',modal).textContent=target;
    $('[data-audit-delete-confirm]',modal).textContent=confirmLabel;
    modal.hidden=false;
    document.body.classList.add('neith-modal-open');
    requestAnimationFrame(()=>modal.classList.add('open'));
    return new Promise(resolve=>{
      let settled=false;
      const finish=value=>{
        if(settled)return; settled=true;
        modal.classList.remove('open');
        document.body.classList.remove('neith-modal-open');
        cleanup();
        setTimeout(()=>{modal.hidden=true;},180);
        resolve(value);
      };
      const onClick=e=>{
        if(e.target.closest('[data-audit-delete-confirm]')) finish(true);
        else if(e.target.closest('[data-audit-delete-cancel]')) finish(false);
      };
      const onKey=e=>{if(e.key==='Escape')finish(false);};
      const cleanup=()=>{
        modal.removeEventListener('click',onClick);
        document.removeEventListener('keydown',onKey);
      };
      modal.addEventListener('click',onClick);
      document.addEventListener('keydown',onKey);
      setTimeout(()=>modal.querySelector('[data-audit-delete-confirm]')?.focus({preventScroll:true}),30);
    });
  }

  function renderUsersMeta(){
    const range=$('[data-users-range]'), total=$('[data-users-total]'), pager=$('[data-users-pagination]');
    const page=$('[data-users-page]'), pages=$('[data-users-pages]'), prev=$('[data-users-prev]'), next=$('[data-users-next]');
    const clear=$('[data-user-search-clear]');
    const start=state.usersTotal ? state.usersPage*state.usersPageSize+1 : 0;
    const end=state.usersTotal ? Math.min(start+state.users.length-1,state.usersTotal) : 0;
    if(range) range.textContent=state.usersTotal?`${start}–${end}`:'0';
    if(total) total.textContent=`${state.usersTotal} ${ucopy('users')}`;
    const totalPages=Math.max(1,Math.ceil(state.usersTotal/state.usersPageSize));
    if(page) page.textContent=String(state.usersPage+1);
    if(pages) pages.textContent=`${ucopy('of')} ${totalPages}`;
    if(prev) prev.disabled=state.usersPage<=0;
    if(next) next.disabled=!String(state.usersBackend).startsWith('paged-') || (state.usersPage+1)>=totalPages;
    if(pager) pager.hidden=!String(state.usersBackend).startsWith('paged-') || state.usersTotal<=state.usersPageSize;
    if(clear) clear.hidden=!state.usersQuery;
  }

  function renderUsers(){
    const root=$('[data-users-list]'); if(!root)return;
    renderUsersMeta();
    if(!state.users.length){
      root.innerHTML=`<div class="neith-users-empty"><span>◎</span><b>${ucopy(state.usersQuery?'noMatches':'empty')}</b><small>${ucopy(state.usersQuery?'noMatchesSub':'none')}</small></div>`;
      return;
    }
    root.innerHTML=state.users.map(u=>{
      const name=u.display_name||ucopy('noName');
      const email=u.email||'—';
      const initial=(u.display_name||u.email||'N').trim().charAt(0).toUpperCase()||'N';
      const plan=String(u.plan||'free').toLowerCase();
      const rawRole=String(u.role||'user').toLowerCase();
      const role=rawRole==='superadmin'?'owner':(rawRole==='staff'?'support':rawRole);
      const isSelf=String(u.user_id||'')===String(state.currentUserId||'');
      const banned=Boolean(u.banned_until && new Date(u.banned_until).getTime()>Date.now());
      const securityReady=state.usersSecurityReady===true;
      const modernRole=String(state.commercialRole||'').toLowerCase();
      const isOwner=modernRole==='owner'||state.role==='superadmin';
      const canSuspend=isOwner||modernRole==='admin'||state.role==='admin';
      const canDelete=isOwner;
      const canEditRole=isOwner&&!isSelf&&role!=='owner';
      const canEditPlan=isOwner;
      const suspendDisabled=!canSuspend||isSelf||!securityReady;
      const deleteDisabled=!canDelete||isSelf||!securityReady;
      const justChanged=String(state.lastChangedUserId||'')===String(u.user_id||'');
      const bannedUntil=banned&&u.banned_until?fmtDate(u.banned_until):'';
      const securitySummary=banned?`${ucopy('securityLocked')}${bannedUntil?` · ${ucopy('until')} ${escapeHtml(bannedUntil)}`:''}`:ucopy('securityOk');
      const roleOptions=role==='owner'
        ? '<option value="owner" selected>OWNER</option>'
        : ['user','support','admin'].map(v=>`<option value="${v}" ${role===v?'selected':''}>${v.toUpperCase()}</option>`).join('');
      const planCopy=plan==='premium'?'PREMIUM ACTIVO':'FREE';
      return `<article class="admin32-user ${banned?'is-banned':''} ${isSelf?'is-self':''} ${justChanged?'just-updated':''}" data-user-id="${escapeHtml(u.user_id)}" data-user-email="${escapeHtml(email)}" data-user-name="${escapeHtml(name)}">
        <div class="neith-user-main"><div class="neith-user-avatar">${escapeHtml(initial)}<i></i></div><div class="neith-user-id"><div class="neith-user-name-line"><b>${escapeHtml(name)}</b><span class="neith-user-plan-badge ${plan==='premium'?'premium':''}">${escapeHtml(planCopy)}</span>${isSelf?`<span class="neith-user-self-badge">${ucopy('self')}</span>`:''}</div><small>${escapeHtml(email)}</small><em>NEITH ID · ${escapeHtml(String(u.user_id||'').slice(0,8).toUpperCase())}</em></div></div>
        <div class="admin32-user-meta"><span>${ucopy('created')}<b>${fmtDate(u.created_at)}</b></span><span>${ucopy('last')}<b>${fmtDate(u.last_sign_in_at)}</b></span><span class="neith-status-cell ${banned?'banned':'active'}">${ucopy('status')}<b><i></i>${banned?ucopy('banned'):ucopy('activeNow')}</b>${bannedUntil?`<small>${ucopy('until')} ${escapeHtml(bannedUntil)}</small>`:''}</span></div>
        <div class="admin32-user-access neith-access-r13"><div class="neith-access-controls"><label class="neith-access-role"><span>${ucopy('role')}</span><select data-user-role data-original="${escapeHtml(role)}" ${canEditRole?'':'disabled'}>${roleOptions}</select></label><label class="neith-access-plan"><span>ACCIÓN DE PLAN</span><select data-user-plan-action ${canEditPlan?'':'disabled'}><option value="none">SIN CAMBIOS</option><option value="free">FORZAR FREE</option><option value="1m">+ 1 MES PREMIUM</option><option value="2m">+ 2 MESES PREMIUM</option><option value="3m">+ 3 MESES PREMIUM</option><option value="6m">+ 6 MESES PREMIUM</option><option value="12m">+ 12 MESES PREMIUM</option><option value="permanent">PREMIUM PERMANENTE</option></select></label><button class="neith-access-apply" type="button" data-save-user disabled><span>${ucopy('apply')}</span><i>›</i></button></div><div class="neith-access-foot"><span>CONTROL AUTORITATIVO</span><small data-access-state>${isOwner?'LISTO PARA CAMBIOS':'SOLO LECTURA'}</small></div></div>
        <div class="neith-user-security"><div class="neith-security-copy"><span class="neith-security-label">${ucopy('manage')}</span><small>${securitySummary}</small></div><div class="neith-security-actions"><button type="button" class="profile360" data-user-360>FICHA 360</button>${banned?`<button type="button" class="reactivate" data-user-unban ${suspendDisabled?'disabled':''}>${ucopy('reactivate')}</button>`:`<button type="button" class="suspend" data-user-ban ${suspendDisabled?'disabled':''}>${ucopy('suspend')}</button>`}<button type="button" class="delete" data-user-delete ${deleteDisabled?'disabled':''}>${ucopy('delete')}</button></div></div>
      </article>`;
    }).join('');
  }


  function renderUsersLoading(label=ucopy('loading')){
    const root=$('[data-users-list]'); if(!root)return;
    root.innerHTML=`<div class="neith-users-loading"><span></span><b>${escapeHtml(label)}</b><small>${escapeHtml(ucopy('loading_sub'))}</small></div>`;
  }

  async function loadUsersPagedRpc(name, backendTag){
    const result=await rpc(name,{p_query:state.usersQuery,p_limit:state.usersPageSize,p_offset:state.usersPage*state.usersPageSize})||{};
    if(!result || typeof result!=='object' || Array.isArray(result) || !Array.isArray(result.items)){
      const err=new Error(`${name} devolvió un formato no paginado.`);
      err.code='NEITH_USERS_RPC_SHAPE';
      throw err;
    }
    state.users=result.items;
    state.usersTotal=Number(result.total||0);
    state.usersBackend=backendTag;
  }
  async function loadUsersV33(){
    try{
      await loadUsersPagedRpc('neith_admin_list_users_v3','paged-v3');
      return;
    }catch(err){
      if(!isMissingRpc(err,'neith_admin_list_users_v3')) throw err;
    }
    await loadUsersPagedRpc('neith_admin_list_users','paged-v1');
  }
  async function loadUsersV32(){
    const legacy=await rpc('neith_admin_search_users',{p_query:state.usersQuery,p_limit:state.usersPageSize});
    state.users=Array.isArray(legacy)?legacy:(Array.isArray(legacy?.items)?legacy.items:[]);
    state.usersPage=0;
    const knownTotal=Number(state.data?.stats?.users_total ?? 0);
    state.usersTotal=state.usersQuery?state.users.length:(knownTotal||state.users.length);
    state.usersBackend='v32';
    if(!state.usersQuery && knownTotal>0 && state.users.length===0){
      const err=new Error('El RPC antiguo de Usuarios no está devolviendo registros. Ejecuta supabase/V32_USERS_PAGINATION.sql una sola vez en Supabase y pulsa ACTUALIZAR.');
      err.code='NEITH_USERS_MIGRATION_REQUIRED';
      throw err;
    }
  }
  async function loadUsers({page=state.usersPage,query=state.usersQuery,force=false}={}){
    if(state.usersLoading&&!force)return;
    state.usersLoading=true;
    state.usersPage=Math.max(0,Number(page||0));
    state.usersQuery=String(query||'').trim();
    renderUsersLoading(state.usersQuery?(lang()==='en'?'SEARCHING NEITH IDs':'BUSCANDO NEITH IDs'):ucopy('loading'));
    try{
      try{ await loadUsersV33(); }
      catch(err){
        if(!isMissingRpc(err,'neith_admin_list_users')) throw err;
        await loadUsersV32();
      }
      await detectUsersSecurityCapabilities();
      const maxPage=Math.max(0,Math.ceil(state.usersTotal/state.usersPageSize)-1);
      if(String(state.usersBackend).startsWith('paged-') && state.usersPage>maxPage){ state.usersPage=maxPage; await loadUsersV33(); }
      state.usersLoaded=true;
      renderUsers();
    }catch(err){
      const root=$('[data-users-list]'); if(root)root.innerHTML=`<div class="neith-users-empty error"><span>!</span><b>${ucopy('loadError')}</b><small>${escapeHtml(err?.message||String(err))}</small></div>`;
      renderUsersMeta();
      throw err;
    }finally{ state.usersLoading=false; }
  }


  const DEFAULT_CONSOLE_SETTINGS = Object.freeze({
    users_page_size:20,
    notices_page_size:20,
    flags_page_size:20,
    audit_page_size:25,
    dashboard_refresh_seconds:0
  });
  const cleanConsoleSettings = raw => {
    const x=raw&&typeof raw==='object'?raw:{};
    const pick=(value,allowed,fallback)=>allowed.includes(Number(value))?Number(value):fallback;
    return {
      users_page_size:pick(x.users_page_size,[10,20,30,50],20),
      notices_page_size:pick(x.notices_page_size,[10,20,30,50],20),
      flags_page_size:pick(x.flags_page_size,[10,20,30,50],20),
      audit_page_size:pick(x.audit_page_size,[25,50,100],25),
      dashboard_refresh_seconds:pick(x.dashboard_refresh_seconds,[0,30,60,120],0),
      updated_at:x.updated_at||null,
      updated_by:x.updated_by||null
    };
  };
  function setSettingsDiagnostic(key,status,title,copy){
    const el=$(`[data-settings-diag="${key}"]`); if(!el)return;
    el.classList.remove('ok','warn','error'); if(status)el.classList.add(status);
    const strong=el.querySelector('strong'),span=el.querySelector('span');
    if(strong)strong.textContent=title||'—'; if(span&&copy)span.textContent=copy;
  }
  function renderSettingsRuntime(cfg=state.consoleSettings){
    const x=cleanConsoleSettings(cfg||DEFAULT_CONSOLE_SETTINGS);
    const set=(key,value)=>{const el=$(`[data-settings-live="${key}"]`);if(el)el.textContent=value;};
    set('users',String(x.users_page_size));
    set('audit',String(x.audit_page_size));
    set('refresh',x.dashboard_refresh_seconds?`${x.dashboard_refresh_seconds}s`:'OFF');
    set('backend',state.consoleSettingsBackend==='rpc'?'RPC OK':'PENDIENTE');
    const last=$('[data-settings-last-save]');
    if(last)last.textContent=`ÚLTIMO CAMBIO · ${x.updated_at?fmtDate(x.updated_at):'SIN DATOS'}`;
  }
  function applySettingsPermissions(){
    const f=$('[data-settings-form]');if(!f)return;
    const editable=state.role==='superadmin'&&state.consoleSettingsBackend==='rpc';
    $$('select',f).forEach(el=>{el.disabled=!editable;el.setAttribute('aria-disabled',String(!editable));});
    const defaults=$('[data-settings-defaults]');if(defaults)defaults.disabled=!editable;
    f.classList.toggle('is-readonly',!editable);
    const bar=$('.neith-settings-savebar');if(bar)bar.classList.toggle('is-readonly',!editable);
  }
  function scheduleDashboardRefresh(){
    if(state.settingsAutoTimer){clearTimeout(state.settingsAutoTimer);state.settingsAutoTimer=null;}
    const seconds=Number(state.consoleSettings?.dashboard_refresh_seconds||0);
    if(!seconds||state.activeTab!=='overview'||document.hidden)return;
    state.settingsAutoTimer=setTimeout(async()=>{
      state.settingsAutoTimer=null;
      if(state.activeTab==='overview'&&!document.hidden){
        try{await loadDashboard({force:true});}catch{}
      }
      scheduleDashboardRefresh();
    },seconds*1000);
  }
  function applyConsoleSettings(raw){
    const cfg=cleanConsoleSettings(raw);
    state.consoleSettings=cfg;
    state.usersPageSize=cfg.users_page_size;
    state.announcementsPageSize=cfg.notices_page_size;
    state.flagsPageSize=cfg.flags_page_size;
    state.auditPageSize=cfg.audit_page_size;
    const np=$('[data-notices-page-size]');if(np)np.textContent=String(cfg.notices_page_size);
    const ap=$('[data-audit-page-size]');if(ap)ap.textContent=String(cfg.audit_page_size);
    scheduleDashboardRefresh();
    applyUsersLanguage();
    renderSettingsRuntime(cfg);
    return cfg;
  }
  function consoleSettingsPayloadFromForm(){
    const f=$('[data-settings-form]');
    return cleanConsoleSettings({
      users_page_size:f?.elements.users_page_size?.value,
      notices_page_size:f?.elements.notices_page_size?.value,
      flags_page_size:f?.elements.flags_page_size?.value,
      audit_page_size:f?.elements.audit_page_size?.value,
      dashboard_refresh_seconds:f?.elements.dashboard_refresh_seconds?.value
    });
  }
  function renderConsoleSettings(){
    const f=$('[data-settings-form]'); if(!f)return;
    const cfg=state.consoleSettings||cleanConsoleSettings(DEFAULT_CONSOLE_SETTINGS);
    ['users_page_size','notices_page_size','flags_page_size','audit_page_size','dashboard_refresh_seconds'].forEach(k=>{if(f.elements[k])f.elements[k].value=String(cfg[k]);});
    state.settingsBaseline=JSON.stringify(consoleSettingsPayloadFromForm());
    const role=$('[data-settings-role]'),copy=$('[data-settings-role-copy]');
    if(role)role.textContent=String(state.role||'admin').toUpperCase();
    if(copy)copy.textContent=state.role==='superadmin'?'Escritura global habilitada mediante RPC protegida.':'MODO LECTURA · solo OWNER puede modificar estos ajustes.';
    const save=$('[data-settings-save]');if(save)save.disabled=true;
    const st=$('[data-settings-state]');if(st)st.textContent=state.role==='superadmin'?'SIN CAMBIOS PENDIENTES':'MODO LECTURA';
    setSettingsDiagnostic('supabase',client()?'ok':'error',client()?'CONECTADO':'NO DISPONIBLE','Cliente Supabase de la sesión');
    setSettingsDiagnostic('settings',state.consoleSettingsBackend==='rpc'?'ok':'warn',state.consoleSettingsBackend==='rpc'?'OPERATIVO':'SQL PENDIENTE',state.consoleSettingsBackend==='rpc'?'Lectura/escritura protegida por RPC':'Ejecuta V32_ADMIN_SETTINGS_R29.sql');
    setSettingsDiagnostic('server','ok',state.data?.server_time?fmtDate(state.data.server_time):'—','Hora reportada por Supabase');
    renderSettingsRuntime(cfg);
    applySettingsPermissions();
    updateSettingsDirty();
  }
  function updateSettingsDirty(){
    const f=$('[data-settings-form]');if(!f)return;
    const canWrite=state.role==='superadmin'&&state.consoleSettingsBackend==='rpc';
    const dirty=canWrite&&JSON.stringify(consoleSettingsPayloadFromForm())!==state.settingsBaseline;
    const st=$('[data-settings-state]'),save=$('[data-settings-save]');
    if(st)st.textContent=!canWrite?'MODO LECTURA':(dirty?'CAMBIOS PENDIENTES':'SIN CAMBIOS PENDIENTES');
    if(save)save.disabled=!canWrite||!dirty;
    f.classList.toggle('has-pending-changes',dirty);
    renderSettingsRuntime(consoleSettingsPayloadFromForm());
  }
  async function loadConsoleSettings({silent=false}={}){
    try{
      const data=await rpc('neith_admin_get_console_settings');
      state.consoleSettingsBackend='rpc';
      applyConsoleSettings(data);
      state.consoleSettingsLoaded=true;
      renderConsoleSettings();
      if(!silent)notify('Configuración recargada','success');
      return state.consoleSettings;
    }catch(err){
      if(!isMissingRpc(err,'neith_admin_get_console_settings'))throw err;
      state.consoleSettingsBackend='missing-r29';
      applyConsoleSettings(DEFAULT_CONSOLE_SETTINGS);
      state.consoleSettingsLoaded=true;
      renderConsoleSettings();
      if(!silent)notify('Falta instalar V32_ADMIN_SETTINGS_R29.sql','error');
      return state.consoleSettings;
    }
  }
  async function saveConsoleSettings(){
    if(state.role!=='superadmin')throw new Error('Solo OWNER puede guardar Configuración.');
    if(state.consoleSettingsBackend!=='rpc')throw new Error('Ejecuta supabase/V32_ADMIN_SETTINGS_R29.sql antes de guardar.');
    const payload=consoleSettingsPayloadFromForm(),status=$('[data-settings-status]'),save=$('[data-settings-save]');
    if(save){save.disabled=true;save.textContent='GUARDANDO…';}
    msg(status,'PUBLICANDO CONFIGURACIÓN…');
    try{
      const result=await rpc('neith_admin_save_console_settings',{p_payload:payload});
      applyConsoleSettings(result||payload);
      state.usersLoaded=false;state.flagsLoaded=false;state.announcementsLoaded=false;state.auditLoaded=false;
      state.usersPage=0;state.flagsPage=0;state.announcementsPage=0;state.auditPage=0;
      renderConsoleSettings();
      msg(status,'Configuración actualizada','ok');
      notify('Configuración del Admin Center actualizada','success');
    }finally{
      if(save){save.textContent='GUARDAR CONFIGURACIÓN';updateSettingsDirty();}
    }
  }
  async function testConsoleConnections(){
    const button=$('[data-settings-test]');if(button){button.disabled=true;button.textContent='COMPROBANDO…';}
    setSettingsDiagnostic('supabase','warn','COMPROBANDO','Sesión autenticada');
    setSettingsDiagnostic('settings','warn','COMPROBANDO','RPC de preferencias');
    setSettingsDiagnostic('launcher','warn','COMPROBANDO','Endpoint público');
    setSettingsDiagnostic('server','warn','SINCRONIZANDO','Hora de Supabase');
    let failures=0;
    try{
      const c=client();
      const session=await c?.auth?.getSession?.();
      const authenticated=Boolean(session?.data?.session?.user);
      setSettingsDiagnostic('supabase',authenticated?'ok':'error',authenticated?'CONECTADO':'SIN SESIÓN',authenticated?'Sesión autenticada y cliente operativo':'No hay una sesión administrativa válida');
      if(!authenticated)failures++;
    }catch(err){failures++;setSettingsDiagnostic('supabase','error','ERROR',err?.message||'Sin respuesta');}
    try{
      const cfg=await rpc('neith_admin_get_console_settings');
      setSettingsDiagnostic('settings','ok','OPERATIVO',`RPC protegida · usuarios ${cfg?.users_page_size||20}/página`);
    }catch(err){failures++;setSettingsDiagnostic('settings','error','ERROR',err?.message||'Sin respuesta');}
    try{
      const cfg=await rpc('neith_launcher_public_config');
      setSettingsDiagnostic('launcher','ok','OPERATIVO',`${cfg?.stable_version||'—'} · ${String(cfg?.release_channel||'stable').toUpperCase()}`);
    }catch(err){failures++;setSettingsDiagnostic('launcher','error','ERROR',err?.message||'Sin respuesta');}
    try{
      const d=await rpc('neith_admin_dashboard_summary');
      const serverTime=d?.server_time||new Date().toISOString();
      setSettingsDiagnostic('server','ok',fmtDate(serverTime),'Sincronización completada');
    }catch(err){failures++;setSettingsDiagnostic('server','error','ERROR',err?.message||'Sin respuesta');}
    notify(failures?`Diagnóstico completado · ${failures} incidencia(s)`:'Diagnóstico completado · todos los sistemas operativos',failures?'error':'success');
    if(button){button.disabled=false;button.textContent='PROBAR CONEXIONES';}
  }

  async function loadBootstrap(){
    const data=await rpc('neith_admin_bootstrap'); state.data=data||{};
    const modernRole=String(state.commercialRole||data?.role||'').toLowerCase();
    state.role=modernRole==='owner'?'superadmin':(modernRole==='admin'?'admin':(modernRole==='support'?'support':String(data?.role||'user').toLowerCase()));
    renderStats(); renderOverview(); fillLauncher(); renderDashboard();
    if(!state.flagsLoaded){state.flags=Array.isArray(state.data?.feature_flags)?state.data.feature_flags:[];state.flagsTotal=state.flags.length;}
    if(!state.announcementsLoaded){state.announcements=Array.isArray(state.data?.announcements)?state.data.announcements:[];state.announcementsTotal=state.announcements.length;}
    state.bootstrapReady=true; setReady();
    if(!state.consoleSettingsLoaded) loadConsoleSettings({silent:true}).catch(err=>console.warn('Admin settings:',err));
    if(state.activeTab==='overview') runIdle(()=>{ if(state.activeTab==='overview'&&!document.hidden) loadDashboard().catch(()=>{}); });
  }

  function switchTab(tab){
    if(state.activeTab===tab && $('[data-admin-panel].active')?.dataset.adminPanel===tab)return;
    state.activeTab=tab;
    $$('[data-admin-tab]').forEach(b=>b.classList.toggle('active',b.dataset.adminTab===tab));
    $$('[data-admin-panel]').forEach(p=>{ const on=p.dataset.adminPanel===tab; p.classList.toggle('active',on); p.hidden=!on; });
    scheduleDashboardRefresh();
    if(tab==='overview' && state.bootstrapReady && (!state.dashboardLastLoad || Date.now()-state.dashboardLastLoad>10000)){
      runIdle(()=>{ if(state.activeTab==='overview'&&!document.hidden) loadDashboard().catch(()=>{}); });
    }
    if(tab==='users' && state.bootstrapReady && !state.usersLoaded && !state.usersLoading){
      loadUsers().catch(err=>notify(err?.message||String(err),'error'));
    }
    if(tab==='audit' && state.bootstrapReady && !state.auditLoaded && !state.auditLoading){
      loadAudit().catch(err=>notify(err?.message||String(err),'error'));
    }
    if(tab==='notices' && state.bootstrapReady && !state.announcementsLoaded && !state.announcementsLoading){
      loadAnnouncements().catch(err=>notify(err?.message||String(err),'error'));
    }
    if(tab==='flags' && state.bootstrapReady && !state.flagsLoaded && !state.flagsLoading){
      loadFlags().catch(err=>notify(err?.message||String(err),'error'));
    }
    if(tab==='settings' && state.bootstrapReady){
      if(!state.consoleSettingsLoaded)loadConsoleSettings().catch(err=>notify(err?.message||String(err),'error'));
      else renderConsoleSettings();
    }
  }

  function ensureMfaModal(){
    let modal=$('[data-admin-mfa-modal]'); if(modal)return modal;
    modal=document.createElement('div'); modal.className='neith-admin-mfa-modal'; modal.dataset.adminMfaModal=''; modal.hidden=true;
    modal.innerHTML=`<div class="neith-admin-mfa-backdrop" data-admin-mfa-close></div><section class="neith-admin-mfa-card" role="dialog" aria-modal="true" aria-labelledby="neithAdminMfaTitle"><button class="neith-admin-mfa-x" type="button" data-admin-mfa-close aria-label="Cerrar">×</button><div class="neith-admin-mfa-top"><span class="neith-admin-mfa-shield">✦</span><div><small>NEITH ADMIN SECURITY</small><b>OWNER / ADMIN · AAL2</b></div></div><h2 id="neithAdminMfaTitle" data-admin-mfa-title>VERIFICACIÓN 2FA</h2><p data-admin-mfa-copy>Introduce el código de tu aplicación autenticadora para elevar esta sesión a AAL2.</p><div class="neith-admin-mfa-enroll" data-admin-mfa-enroll hidden><img data-admin-mfa-qr alt="QR para configurar 2FA"><div><small>CLAVE MANUAL</small><code data-admin-mfa-secret></code></div></div><label class="neith-admin-mfa-code"><span>CÓDIGO DE 6 DÍGITOS</span><input inputmode="numeric" autocomplete="one-time-code" maxlength="6" pattern="[0-9]{6}" data-admin-mfa-code></label><div class="neith-admin-mfa-status" data-admin-mfa-status></div><div class="neith-admin-mfa-actions"><button type="button" class="ghost" data-admin-mfa-close>CANCELAR</button><button type="button" class="primary" data-admin-mfa-submit>VERIFICAR Y ENTRAR</button></div></section>`;
    document.body.appendChild(modal); return modal;
  }

  function closeMfaModal(){const modal=$('[data-admin-mfa-modal]');if(!modal)return;modal.classList.remove('open');setTimeout(()=>{modal.hidden=true},150);}

  function normalizeAdminQrSource(raw){
    const value=String(raw||'').trim();
    if(!value)return '';
    if(/^data:image\//i.test(value)||/^https?:\/\//i.test(value)||/^blob:/i.test(value))return value;
    if(/^<svg[\s>]/i.test(value))return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(value)}`;
    return '';
  }

  async function beginMfaFlow(){
    const c=client(); if(!c?.auth?.mfa){setDenied('La verificación 2FA no está disponible en esta sesión.');return;}
    const modal=ensureMfaModal(), status=$('[data-admin-mfa-status]',modal), input=$('[data-admin-mfa-code]',modal), submit=$('[data-admin-mfa-submit]',modal), enrollBox=$('[data-admin-mfa-enroll]',modal);
    modal.hidden=false; requestAnimationFrame(()=>modal.classList.add('open')); status.textContent='PREPARANDO VERIFICACIÓN SEGURA…'; status.dataset.type=''; input.value=''; submit.disabled=true; enrollBox.hidden=true; const staleQr=$('[data-admin-mfa-qr]',modal); if(staleQr){staleQr.removeAttribute('src');staleQr.hidden=true;staleQr.setAttribute('aria-hidden','true');} const staleSecret=$('[data-admin-mfa-secret]',modal); if(staleSecret)staleSecret.textContent='';
    try{
      const {data:aal,error:aalError}=await c.auth.mfa.getAuthenticatorAssuranceLevel(); if(aalError)throw aalError;
      if(aal?.currentLevel==='aal2'){location.reload();return;}
      const {data:list,error:listError}=await c.auth.mfa.listFactors(); if(listError)throw listError;
      let factor=[...(list?.totp||[]),...(list?.all||[])].find((f,i,a)=>f?.factor_type==='totp'&&f?.status==='verified'&&a.findIndex(x=>x?.id===f.id)===i) || null;
      modal.dataset.factorId='';
      if(!factor){
        const {data:enrolled,error:enrollError}=await c.auth.mfa.enroll({factorType:'totp',friendlyName:'Neith Web Admin'}); if(enrollError)throw enrollError;
        factor=enrolled; const qr=enrolled?.totp?.qr_code||''; const secret=enrolled?.totp?.secret||'';
        enrollBox.hidden=false; const qrEl=$('[data-admin-mfa-qr]',modal); const qrSrc=normalizeAdminQrSource(qr); if(qrEl){ if(qrSrc){ qrEl.src=qrSrc; qrEl.hidden=false; qrEl.removeAttribute('aria-hidden'); } else { qrEl.removeAttribute('src'); qrEl.hidden=true; qrEl.setAttribute('aria-hidden','true'); } } const secretEl=$('[data-admin-mfa-secret]',modal); if(secretEl)secretEl.textContent=secret||'—';
        $('[data-admin-mfa-title]',modal).textContent='ACTIVAR 2FA ADMIN';
        $('[data-admin-mfa-copy]',modal).textContent='Escanea el QR con tu aplicación autenticadora y escribe el código de 6 dígitos. Después entrarás directamente al Admin Center.';
      }else{
        enrollBox.hidden=true;
        $('[data-admin-mfa-title]',modal).textContent='VERIFICAR 2FA ADMIN';
        $('[data-admin-mfa-copy]',modal).textContent='Tu factor TOTP ya está configurado. Introduce el código actual de tu aplicación autenticadora para elevar esta sesión a AAL2.';
      }
      if(!factor?.id)throw new Error('No se pudo preparar el factor TOTP.');
      modal.dataset.factorId=factor.id; submit.disabled=false; status.textContent='FACTOR TOTP PREPARADO · SESIÓN AAL1'; status.dataset.type='ok'; setTimeout(()=>input.focus(),50);
    }catch(err){submit.disabled=true;status.textContent=err?.message||String(err);status.dataset.type='error';}
  }

  async function verifyMfaFlow(){
    const modal=$('[data-admin-mfa-modal]'), c=client(); if(!modal||!c?.auth?.mfa)return;
    const input=$('[data-admin-mfa-code]',modal),status=$('[data-admin-mfa-status]',modal),submit=$('[data-admin-mfa-submit]',modal),factorId=modal.dataset.factorId||'',code=String(input?.value||'').replace(/\D/g,'').slice(0,6);
    if(code.length!==6){status.textContent='Introduce los 6 dígitos del autenticador.';status.dataset.type='error';input?.focus();return;}
    submit.disabled=true;status.textContent='VERIFICANDO AAL2…';status.dataset.type='';
    try{
      const {data:challenge,error:challengeError}=await c.auth.mfa.challenge({factorId}); if(challengeError)throw challengeError;
      const challengeId=challenge?.id; if(!challengeId)throw new Error('No se pudo crear el desafío MFA.');
      const {error:verifyError}=await c.auth.mfa.verify({factorId,challengeId,code}); if(verifyError)throw verifyError;
      const {data:aal,error:aalError}=await c.auth.mfa.getAuthenticatorAssuranceLevel(); if(aalError)throw aalError;
      if(aal?.currentLevel!=='aal2')throw new Error('Supabase no elevó la sesión a AAL2.');
      status.textContent='2FA VERIFICADO · ABRIENDO ADMIN CENTER…';status.dataset.type='ok';setTimeout(()=>location.reload(),250);
    }catch(err){status.textContent=err?.message||'Código no válido.';status.dataset.type='error';submit.disabled=false;input?.select();}
  }

  async function init(){
    try{
      if(!client()) return setDenied('Supabase no está configurado en esta copia.');
      const {data:{session}}=await client().auth.getSession();
      if(!session?.user){ location.href='../?login=1'; return; }
      state.currentUserId=session.user.id;
      let context=null, legacyRole='user';
      const [contextResult,legacyRoleResult]=await Promise.allSettled([
        rpc('neith_admin_context'),
        rpc('neith_my_role')
      ]);
      if(contextResult.status==='fulfilled') context=contextResult.value;
      else console.warn('Admin context:',contextResult.reason?.message||contextResult.reason);
      if(legacyRoleResult.status==='fulfilled') legacyRole=legacyRoleResult.value;
      else {
        const message=String(legacyRoleResult.reason?.message||'');
        if(!context?.is_admin && /function|schema cache|neith_my_role/i.test(message)) return setDenied('El backend del Admin Center todavía no está instalado.');
      }
      window.NeithAdminContext=context||null;
      const modernAdmin=Boolean(context?.is_admin);
      const legacyAdmin=['admin','superadmin'].includes(String(legacyRole||'').toLowerCase());
      if(!modernAdmin&&!legacyAdmin) return setDenied('Tu Neith ID está autenticada, pero no tiene permisos ADMIN.');
      if(modernAdmin&&context?.mfa_required) return setDenied('ADMIN requiere verificación 2FA para esta sesión. Verifica tu autenticador aquí y entrarás directamente al panel.',{mfa:true});
      state.commercialRole=String(context?.role||'').toLowerCase();
      await loadBootstrap();
      applyUsersLanguage();
      if(state.activeTab==='users' && !state.usersLoaded && !state.usersLoading){
        await loadUsers();
      }
    }catch(err){ setDenied(`No se pudo validar el Admin Center: ${err?.message||err}`); }
  }


  function ensureUserActionModal(){
    let modal=$('[data-user-action-modal]'); if(modal)return modal;
    modal=document.createElement('div'); modal.className='neith-user-action-modal'; modal.dataset.userActionModal=''; modal.hidden=true;
    modal.innerHTML=`<div class="neith-user-action-backdrop" data-close-user-action></div><section class="neith-user-action-card" role="dialog" aria-modal="true" aria-labelledby="neithUserActionTitle"><button class="neith-user-action-x" type="button" data-close-user-action aria-label="Cerrar">×</button><div class="neith-user-action-top"><div class="neith-user-action-icon" data-user-action-icon>!</div><div><small>NEITH IDENTITY SECURITY</small><span class="neith-user-action-level">OWNER / MFA VERIFIED</span></div></div><h3 id="neithUserActionTitle" data-user-action-title></h3><p data-user-action-copy></p><div class="neith-user-action-target"><small>${lang()==='en'?'TARGET IDENTITY':'IDENTIDAD OBJETIVO'}</small><span data-user-action-name></span><b data-user-action-email></b></div><div data-user-ban-options hidden><label>TIEMPO DE SUSPENSIÓN<select data-user-ban-duration><option value="1d">1 DÍA</option><option value="7d">7 DÍAS</option><option value="30d">30 DÍAS</option><option value="permanent">PERMANENTE</option></select></label></div><div class="neith-delete-warning" data-user-delete-confirm hidden><p>${lang()==='en'?'Permanent deletion cannot be undone. Type the exact email to unlock the action.':'El borrado permanente no se puede deshacer. Escribe el correo exacto para desbloquear la acción.'}</p><label>ESCRIBE EL CORREO PARA CONFIRMAR<input data-user-delete-email autocomplete="off" spellcheck="false"></label></div><div class="neith-user-action-footer"><button type="button" class="cancel" data-close-user-action>CANCELAR</button><button type="button" class="confirm" data-confirm-user-action>CONFIRMAR</button></div></section>`;
    document.body.appendChild(modal); return modal;
  }
  function openUserAction(row, action){
    const modal=ensureUserActionModal(), email=row.dataset.userEmail||'', name=row.dataset.userName||email;
    modal.dataset.action=action; modal.dataset.userId=row.dataset.userId; modal.dataset.userEmail=email;
    $('[data-user-action-name]',modal).textContent=name; $('[data-user-action-email]',modal).textContent=email;
    const ban=$('[data-user-ban-options]',modal), del=$('[data-user-delete-confirm]',modal), input=$('[data-user-delete-email]',modal), confirm=$('[data-confirm-user-action]',modal);
    ban.hidden=action!=='ban'; del.hidden=action!=='delete'; if(input)input.value='';
    const es=lang()!=='en';
    const copy={ban:[es?'SUSPENDER CUENTA':'SUSPEND ACCOUNT',es?'Bloquea el acceso a Neith durante el periodo elegido. Podrás reactivar la cuenta desde este mismo panel.':'Blocks access to Neith for the selected period. You can reactivate it from this panel.'],unban:[es?'REACTIVAR CUENTA':'REACTIVATE ACCOUNT',es?'El usuario recuperará el acceso normal inmediatamente.':'The user will regain normal access immediately.'],delete:[es?'ELIMINAR CUENTA DEFINITIVAMENTE':'DELETE ACCOUNT PERMANENTLY',es?'Esta acción elimina la cuenta de autenticación y sus datos vinculados por cascada. No se puede deshacer.':'This removes the authentication account and linked cascading data. It cannot be undone.']}[action];
    $('[data-user-action-title]',modal).textContent=copy[0]; $('[data-user-action-copy]',modal).textContent=copy[1];
    modal.classList.toggle('danger',action==='delete'); confirm.disabled=action==='delete'; confirm.textContent=action==='delete'?(es?'ELIMINAR DEFINITIVAMENTE':'DELETE PERMANENTLY'):(action==='unban'?(es?'REACTIVAR':'REACTIVATE'):(es?'SUSPENDER':'SUSPEND'));
    modal.hidden=false; document.body.classList.add('neith-modal-open'); setTimeout(()=>modal.classList.add('open'),10);
  }
  function closeUserAction(){const modal=$('[data-user-action-modal]');if(!modal)return;modal.classList.remove('open');document.body.classList.remove('neith-modal-open');setTimeout(()=>{modal.hidden=true;},180);}
  async function confirmUserAction(){
    const modal=$('[data-user-action-modal]'); if(!modal||modal.hidden)return;
    const action=modal.dataset.action,id=modal.dataset.userId,email=modal.dataset.userEmail,button=$('[data-confirm-user-action]',modal); button.disabled=true;
    try{
      if(action==='ban'){
        const duration=$('[data-user-ban-duration]',modal).value;
        const days={ '1d':1,'7d':7,'30d':30 }[duration]||0;
        const until=days?new Date(Date.now()+days*86400000).toISOString():null;
        await rpc('neith_admin_set_suspension',{p_user_id:id,p_until:until,p_reason:`Web Admin · ${duration}`});
      }
      else if(action==='unban') await rpc('neith_admin_reactivate_user',{p_user_id:id,p_reason:'Web Admin · reactivación'});
      else if(action==='delete'){
        const typed=$('[data-user-delete-email]',modal).value.trim();
        if(typed.toLowerCase()!==String(email).toLowerCase()) throw new Error(lang()==='en'?'Type the exact email to confirm deletion.':'Escribe exactamente el correo del usuario para confirmar el borrado.');
        await rpc('neith_admin_delete_user',{p_user_id:id,p_confirmation:typed});
      }
      state.lastChangedUserId=action==='delete'?null:id; state.lastChangedAction=action; closeUserAction(); await loadBootstrap(); await loadUsers({page:state.usersPage,query:state.usersQuery,force:true}); switchTab('users');
      notify(action==='delete'?(lang()==='en'?'Account deleted · Logged in Audit':'Cuenta eliminada · Registrado en Auditoría'):(action==='unban'?(lang()==='en'?'Account reactivated · Logged in Audit':'Cuenta reactivada · Registrado en Auditoría'):(lang()==='en'?'Account suspended · Logged in Audit':'Cuenta suspendida · Registrado en Auditoría')),'success');
    }catch(err){notify(err?.message||String(err),'error');}finally{button.disabled=false;}
  }

  document.addEventListener('click', async e=>{
    const dashTab=e.target.closest('[data-dashboard-tab]'); if(dashTab){switchTab(dashTab.dataset.dashboardTab);return;}
    const tab=e.target.closest('[data-admin-tab]'); if(tab){switchTab(tab.dataset.adminTab);return;}
    const auditToggle=e.target.closest('[data-audit-toggle]'); if(auditToggle){const event=auditToggle.closest('.neith-audit-event'),details=event?.querySelector('.neith-audit-details');if(details){details.hidden=!details.hidden;auditToggle.textContent=details.hidden?'DETALLES':'OCULTAR';}return;}
    const auditDeleteOne=e.target.closest('[data-audit-delete-one]');if(auditDeleteOne){const row=auditDeleteOne.closest('[data-audit-id]'),id=row?.dataset.auditId;if(id&&await confirmAuditDelete({title:'ELIMINAR EVENTO',copy:'Se eliminará definitivamente este evento del historial administrativo.',target:`EVENTO #${id}`})){try{const n=await deleteAuditRecords({ids:[id]});notify(`${n} evento eliminado`,'success');}catch(err){notify(err?.message||String(err),'error');}}return;}
    if(e.target.closest('[data-audit-delete-selected]')){const ids=[...state.auditSelected];if(ids.length&&await confirmAuditDelete({title:'ELIMINAR SELECCIONADOS',copy:`Se eliminarán definitivamente ${ids.length} evento(s) seleccionados.`,target:`${ids.length} EVENTO(S) SELECCIONADO(S)`})){try{const n=await deleteAuditRecords({ids});notify(`${n} evento(s) eliminado(s)`,'success');}catch(err){notify(err?.message||String(err),'error');}}return;}
    if(e.target.closest('[data-audit-delete-count]')){const input=$('[data-audit-delete-count-input]'),count=Math.max(1,Math.min(500,Number(input?.value||0)));if(await confirmAuditDelete({title:'ELIMINAR EVENTOS ANTIGUOS',copy:`Se eliminarán definitivamente los ${count} eventos más antiguos de la auditoría.`,target:`${count} EVENTO(S) MÁS ANTIGUOS`})){try{const n=await deleteAuditRecords({count});notify(`${n} evento(s) antiguo(s) eliminado(s)`,'success');}catch(err){notify(err?.message||String(err),'error');}}return;}
    if(e.target.closest('[data-audit-prev]')){if(state.auditPage>0)loadAudit({page:state.auditPage-1,force:true}).catch(err=>notify(err?.message||String(err),'error'));return;}
    if(e.target.closest('[data-audit-next]')){if((state.auditPage+1)*state.auditPageSize<state.auditTotal)loadAudit({page:state.auditPage+1,force:true}).catch(err=>notify(err?.message||String(err),'error'));return;}
    if(e.target.closest('[data-audit-reset-filters]')){const f=$('[data-audit-filter-form]');if(f)f.reset();state.auditQuery='';state.auditAction='';state.auditTargetType='';state.auditFrom='';state.auditTo='';loadAudit({page:0,force:true}).catch(err=>notify(err?.message||String(err),'error'));return;}
    if(e.target.closest('[data-audit-clear]')){if(await confirmAuditDelete({title:'LIMPIAR TODA LA AUDITORÍA',copy:'Se eliminará TODO el registro de auditoría de forma permanente. Esta operación vaciará el historial administrativo completo.',target:'TODOS LOS EVENTOS DE AUDITORÍA',confirmLabel:'SÍ, LIMPIAR AUDITORÍA'})){try{const n=await deleteAuditRecords({all:true});notify(`Auditoría limpiada · ${n} evento(s) eliminado(s)`,'success');}catch(err){notify(err?.message||String(err),'error');}}return;}
    if(e.target.closest('[data-close-user-action]')){closeUserAction();return;}
    if(e.target.closest('[data-confirm-user-action]')){await confirmUserAction();return;}
    const banUser=e.target.closest('[data-user-ban]'); if(banUser){if(!['owner','admin'].includes(String(state.commercialRole||'').toLowerCase())&&!['superadmin','admin'].includes(state.role)){notify('Acción reservada a OWNER / ADMIN','error');return;}openUserAction(banUser.closest('[data-user-id]'),'ban');return;}
    const unbanUser=e.target.closest('[data-user-unban]'); if(unbanUser){if(!['owner','admin'].includes(String(state.commercialRole||'').toLowerCase())&&!['superadmin','admin'].includes(state.role)){notify('Acción reservada a OWNER / ADMIN','error');return;}openUserAction(unbanUser.closest('[data-user-id]'),'unban');return;}
    const deleteUser=e.target.closest('[data-user-delete]'); if(deleteUser){if(state.role!=='superadmin'){notify('Acción reservada a OWNER','error');return;}openUserAction(deleteUser.closest('[data-user-id]'),'delete');return;}
    if(e.target.closest('[data-users-prev]')){if(String(state.usersBackend).startsWith('paged-')&&state.usersPage>0)loadUsers({page:state.usersPage-1}).catch(err=>notify(err?.message||String(err),'error'));return;}
    if(e.target.closest('[data-users-next]')){if(String(state.usersBackend).startsWith('paged-')&&(state.usersPage+1)*state.usersPageSize<state.usersTotal)loadUsers({page:state.usersPage+1}).catch(err=>notify(err?.message||String(err),'error'));return;}
    if(e.target.closest('[data-user-search-clear]')){const form=$('[data-user-search]');if(form)form.elements.query.value='';loadUsers({page:0,query:'',force:true}).catch(err=>notify(err?.message||String(err),'error'));return;}
    if(e.target.closest('[data-admin-refresh]')){const refresh=e.target.closest('[data-admin-refresh]');if(refresh.disabled)return;refresh.disabled=true;refresh.classList.add('is-busy');const original=refresh.textContent;refresh.textContent='↻ ACTUALIZANDO…';try{await loadBootstrap();if(state.usersLoaded)await loadUsers({page:state.usersPage,query:state.usersQuery,force:true});if(state.auditLoaded)await loadAudit({page:state.auditPage,force:true});if(state.announcementsLoaded)await loadAnnouncements({page:state.announcementsPage,force:true});if(state.flagsLoaded)await loadFlags({page:state.flagsPage,force:true});notify('Admin Center actualizado','success');}catch(err){notify(err?.message||String(err),'error');}finally{refresh.disabled=false;refresh.classList.remove('is-busy');refresh.textContent=original;}return;}
    if(e.target.closest('[data-new-flag]')){const f=$('[data-flag-form]');f.reset();f.elements.rollout_percent.value='100';f.hidden=false;f.scrollIntoView({behavior:'smooth',block:'nearest'});return;}
    if(e.target.closest('[data-cancel-flag]')){const f=$('[data-flag-form]');if(f)f.hidden=true;return;}
    if(e.target.closest('[data-flags-prev]')){if(state.flagsPage>0)loadFlags({page:state.flagsPage-1,force:true}).catch(err=>notify(err?.message||String(err),'error'));return;}
    if(e.target.closest('[data-flags-next]')){if((state.flagsPage+1)*state.flagsPageSize<state.flagsTotal)loadFlags({page:state.flagsPage+1,force:true}).catch(err=>notify(err?.message||String(err),'error'));return;}
    if(e.target.closest('[data-flags-clear]')){const f=$('[data-flags-filter-form]');if(f)f.reset();state.flagsQuery='';state.flagsAudience='';state.flagsEnabled='';loadFlags({page:0,force:true}).catch(err=>notify(err?.message||String(err),'error'));return;}
    if(e.target.closest('[data-close-flag-modal]')){closeFlagModal();return;}
    if(e.target.closest('[data-confirm-flag-save]')){const pending=state.pendingFlagSave;if(!pending)return;const {card,payload}=pending;closeFlagModal();saveFlag(card,payload).catch(()=>{});return;}
    const saveFlagButton=e.target.closest('[data-save-flag]'); if(saveFlagButton){const card=saveFlagButton.closest('[data-flag-key]'),payload=flagCardPayload(card),enabledChanged=String(payload.enabled)!==card.dataset.originalEnabled;if(enabledChanged){openFlagSaveModal(card,payload);}else{saveFlag(card,payload).catch(()=>{});}return;}
    if(e.target.closest('[data-new-announcement]')){openAnnouncementEditor();return;}
    if(e.target.closest('[data-cancel-announcement]')){$('[data-announcement-form]').hidden=true;return;}
    const editAnnouncement=e.target.closest('[data-edit-announcement]'); if(editAnnouncement){const card=editAnnouncement.closest('[data-announcement-id]'),item=(state.announcements||[]).find(a=>String(a.id)===String(card?.dataset.announcementId));if(item)openAnnouncementEditor(item);return;}
    const deleteAnnouncement=e.target.closest('[data-delete-announcement]'); if(deleteAnnouncement){const card=deleteAnnouncement.closest('[data-announcement-id]'),item=(state.announcements||[]).find(a=>String(a.id)===String(card?.dataset.announcementId));if(item)openAnnouncementDelete(item);return;}
    if(e.target.closest('[data-close-announcement-delete]')){closeAnnouncementDelete();return;}
    if(e.target.closest('[data-confirm-announcement-delete]')){await confirmAnnouncementDelete();return;}
    if(e.target.closest('[data-notices-prev]')){if(state.announcementsPage>0)loadAnnouncements({page:state.announcementsPage-1,force:true}).catch(err=>notify(err?.message||String(err),'error'));return;}
    if(e.target.closest('[data-notices-next]')){if((state.announcementsPage+1)*state.announcementsPageSize<state.announcementsTotal)loadAnnouncements({page:state.announcementsPage+1,force:true}).catch(err=>notify(err?.message||String(err),'error'));return;}
    if(e.target.closest('[data-notices-clear]')){const f=$('[data-notices-filter-form]');if(f)f.reset();state.announcementsQuery='';state.announcementsStatus='';state.announcementsAudience='';state.announcementsSeverity='';loadAnnouncements({page:0,force:true}).catch(err=>notify(err?.message||String(err),'error'));return;}
    if(e.target.closest('[data-launcher-test]')){await testLauncherPublicConfig();return;}
    if(e.target.closest('[data-settings-test]')){await testConsoleConnections();return;}
    if(e.target.closest('[data-settings-reload]')){await loadConsoleSettings();return;}
    if(e.target.closest('[data-settings-defaults]')){
      if(state.role!=='superadmin'||state.consoleSettingsBackend!=='rpc'){notify('Configuración en modo lectura','error');return;}
      const f=$('[data-settings-form]');if(f){const d=DEFAULT_CONSOLE_SETTINGS;Object.keys(d).forEach(k=>{if(f.elements[k])f.elements[k].value=String(d[k]);});updateSettingsDirty();notify('Valores recomendados cargados · todavía no guardados','info');}
      return;
    }
    if(e.target.closest('[data-close-launcher-modal]')){closeLauncherModal();return;}
    if(e.target.closest('[data-confirm-launcher-save]')){const payload=state.pendingLauncherSave;if(!payload)return;closeLauncherModal();saveLauncherPayload(payload).catch(err=>notify(err?.message||String(err),'error'));return;}
    const toggle=e.target.closest('[data-announcement-active]'); if(toggle){
      const card=toggle.closest('[data-announcement-id]');
      const requested=!!toggle.checked;
      const item=(state.announcements||[]).find(a=>String(a.id)===String(toggle.dataset.id));
      toggle.disabled=true;
      card?.classList.add('is-state-saving');
      try{
        await rpc('neith_admin_set_announcement_active',{p_id:toggle.dataset.id,p_active:requested});
        if(item)item.active=requested;
        if(card){
          card.classList.remove('status-live','status-scheduled','status-paused','status-expired');
          const status=noticeStatus(item||{active:requested});
          card.classList.add(`status-${status}`);
          const badge=card.querySelector('.neith-notice-badges .status');
          if(badge){badge.className=`status ${status}`;badge.innerHTML=`<i></i>${noticeStatusLabel(status)}`;}
        }
        notify(requested?'Aviso republicado · nueva entrega':'Aviso pausado','success');
      }catch(err){
        toggle.checked=!requested;
        if(item)item.active=!requested;
        notify(err?.message||String(err),'error');
      }finally{
        toggle.disabled=false;
        card?.classList.remove('is-state-saving');
      }
      return;
    }
    const saveUser=e.target.closest('[data-save-user]'); if(saveUser){
      const row=saveUser.closest('[data-user-id]'); if(!row||saveUser.disabled)return;
      const id=row.dataset.userId, roleSel=row.querySelector('[data-user-role]'), planSel=row.querySelector('[data-user-plan-action]'), status=row.querySelector('[data-access-state]');
      const roleChanged=roleSel&&!roleSel.disabled&&roleSel.value!==roleSel.dataset.original;
      const planAction=planSel&&!planSel.disabled?planSel.value:'none';
      saveUser.disabled=true; saveUser.classList.add('is-saving'); if(status)status.textContent='APLICANDO CAMBIOS…';
      try{
        if(roleChanged) await rpc('neith_admin_set_user_role',{p_user_id:id,p_role:roleSel.value,p_reason:'Cambio desde Web Admin Center'});
        if(planAction==='free') await rpc('neith_admin_force_free',{p_user_id:id,p_reason:'Forzado a FREE desde Usuarios'});
        else if(planAction==='permanent') await rpc('neith_admin_set_permanent',{p_user_id:id,p_enabled:true,p_reason:'PREMIUM permanente desde Usuarios'});
        else if(/^\d+m$/.test(planAction)) await rpc('neith_admin_add_premium',{p_user_id:id,p_unit:'month',p_amount:Number(planAction.slice(0,-1)),p_reason:'Tiempo PREMIUM añadido desde Usuarios'});
        state.lastChangedUserId=id; state.lastChangedAction='access';
        await loadBootstrap(); await loadUsers({page:state.usersPage,query:state.usersQuery,force:true}); switchTab('users');
        notify('Usuario actualizado y registrado en Auditoría','success');
      }catch(err){ if(status)status.textContent='ERROR AL APLICAR'; notify(err?.message||String(err),'error'); }
      finally{saveUser.classList.remove('is-saving');}
      return;
    }
  });

  $('[data-flag-form]')?.addEventListener('submit',async e=>{e.preventDefault();const f=e.currentTarget,s=$('[data-flag-status]'),submit=f.querySelector('button[type="submit"]');if(submit?.disabled)return;const payload={flag_key:f.elements.flag_key.value.trim().toLowerCase(),label:f.elements.label.value.trim(),description:f.elements.description.value.trim(),enabled:f.elements.enabled.checked,audience:f.elements.audience.value,rollout_percent:Number(f.elements.rollout_percent.value||100)};if(submit)submit.disabled=true;msg(s,'CREANDO…');try{await rpc('neith_admin_upsert_feature_flag',{p_payload:payload});f.hidden=true;await loadBootstrap();await loadFlags({page:0,force:true});switchTab('flags');notify('Feature flag creada','success');}catch(err){msg(s,err?.message||'No se pudo crear','error');}finally{if(submit)submit.disabled=false;}});

  $('[data-flags-filter-form]')?.addEventListener('submit',async e=>{e.preventDefault();const f=e.currentTarget;state.flagsQuery=f.elements.query.value.trim();state.flagsAudience=f.elements.audience.value;state.flagsEnabled=f.elements.enabled.value;try{await loadFlags({page:0,force:true});}catch(err){notify(err?.message||'Error cargando feature flags','error');}});

  $('[data-launcher-form]')?.addEventListener('submit',async e=>{e.preventDefault();if(state.role!=='superadmin'){notify('Launcher en modo lectura · requiere OWNER','error');return;}const payload=launcherPayloadFromForm();try{validateLauncherPayload(payload);const base=state.launcherBaselineObject||{};const critical=(payload.force_update&&!base.force_update)||(payload.maintenance_enabled&&!base.maintenance_enabled)||(payload.minimum_version!==base.minimum_version);if(critical){openLauncherModal(payload);return;}await saveLauncherPayload(payload);}catch(err){msg($('[data-launcher-status]'),err?.message||'No se pudo guardar','error');notify(err?.message||String(err),'error');}});
  $('[data-launcher-form]')?.addEventListener('input',syncLauncherPreview);
  $('[data-launcher-form]')?.addEventListener('change',syncLauncherPreview);

  $('[data-settings-form]')?.addEventListener('submit',async e=>{e.preventDefault();try{await saveConsoleSettings();}catch(err){msg($('[data-settings-status]'),err?.message||'No se pudo guardar','error');notify(err?.message||String(err),'error');}});
  $('[data-settings-form]')?.addEventListener('change',updateSettingsDirty);
  $('[data-settings-form]')?.addEventListener('input',updateSettingsDirty);

  $('[data-announcement-form]')?.addEventListener('submit',async e=>{e.preventDefault();const f=e.currentTarget,s=$('[data-announcement-status]'),submit=f.querySelector('[data-announcement-submit]');if(submit?.disabled)return;const starts=localToIso(f.elements.starts_at.value),ends=localToIso(f.elements.ends_at.value);if(starts&&ends&&new Date(ends)<=new Date(starts)){msg(s,'La fecha de fin debe ser posterior al inicio.','error');return;}const payload={id:f.elements.id.value||null,title:f.elements.title.value.trim(),body:f.elements.body.value.trim(),severity:f.elements.severity.value,priority:Number(f.elements.priority.value||1),audience:f.elements.audience.value,surface:f.elements.surface.value,starts_at:starts,ends_at:ends,active:f.elements.active.checked};if(submit)submit.disabled=true;msg(s,'GUARDANDO…');try{await rpc('neith_admin_save_announcement',{p_payload:payload});f.hidden=true;await loadBootstrap();await loadAnnouncements({page:0,force:true});switchTab('notices');notify(payload.id?'Aviso actualizado':'Aviso publicado','success');}catch(err){msg(s,err?.message||'No se pudo guardar','error');}finally{if(submit)submit.disabled=false;}});

  $('[data-notices-filter-form]')?.addEventListener('submit',async e=>{e.preventDefault();const f=e.currentTarget;state.announcementsQuery=f.elements.query.value.trim();state.announcementsStatus=f.elements.status.value;state.announcementsAudience=f.elements.audience.value;state.announcementsSeverity=f.elements.severity.value;try{await loadAnnouncements({page:0,force:true});}catch(err){notify(err?.message||'Error cargando avisos','error');}});

  $('[data-announcement-form]')?.addEventListener('input',syncAnnouncementPreview);
  $('[data-announcement-form]')?.addEventListener('change',syncAnnouncementPreview);

  $('[data-audit-filter-form]')?.addEventListener('submit',async e=>{e.preventDefault();const f=e.currentTarget;state.auditQuery=f.elements.query.value.trim();state.auditAction=f.elements.action.value;state.auditTargetType=f.elements.target_type.value;state.auditFrom=f.elements.from.value;state.auditTo=f.elements.to.value;try{await loadAudit({page:0,force:true});}catch(err){notify(err?.message||'Error de auditoría','error');}});

  $('[data-user-search]')?.addEventListener('submit',async e=>{e.preventDefault();const q=e.currentTarget.elements.query.value.trim();try{await loadUsers({page:0,query:q,force:true});}catch(err){notify(err?.message||'Error de búsqueda','error');}});


  document.addEventListener('change',e=>{
    const master=e.target.closest('[data-audit-select-all]');
    if(master){state.audit.forEach(a=>{const id=String(a.id);if(master.checked)state.auditSelected.add(id);else state.auditSelected.delete(id);});renderAudit();return;}
    const item=e.target.closest('[data-audit-select]');
    if(item){const id=String(item.value);if(item.checked)state.auditSelected.add(id);else state.auditSelected.delete(id);item.closest('.neith-audit-event')?.classList.toggle('is-selected',item.checked);syncAuditSelectionUi();return;}
  });

  document.addEventListener('change',e=>{const input=e.target.closest('[data-flag-enabled],[data-flag-audience]');if(!input)return;updateFlagDirty(input.closest('[data-flag-key]'));});
  document.addEventListener('input',e=>{const input=e.target.closest('[data-flag-rollout]');if(!input)return;updateFlagDirty(input.closest('[data-flag-key]'));});

  document.addEventListener('change',e=>{
    const select=e.target.closest('[data-user-role],[data-user-plan-action]'); if(!select)return;
    const row=select.closest('[data-user-id]'); if(!row)return;
    const roleSel=row.querySelector('[data-user-role]'),planSel=row.querySelector('[data-user-plan-action]'),button=row.querySelector('[data-save-user]'),status=row.querySelector('[data-access-state]');
    const roleDirty=Boolean(roleSel&&!roleSel.disabled&&roleSel.value!==roleSel.dataset.original);
    const planDirty=Boolean(planSel&&!planSel.disabled&&planSel.value!=='none');
    const dirty=roleDirty||planDirty;
    row.classList.toggle('has-pending-access',dirty);
    if(button) button.disabled=!dirty;
    if(status) status.textContent=dirty?'CAMBIOS LISTOS PARA APLICAR':'LISTO PARA CAMBIOS';
  });
  document.addEventListener('input',e=>{
    const input=e.target.closest('[data-user-delete-email]'); if(!input)return;
    const modal=input.closest('[data-user-action-modal]'),button=modal?.querySelector('[data-confirm-user-action]'); if(!modal||!button)return;
    button.disabled=input.value.trim().toLowerCase()!==String(modal.dataset.userEmail||'').toLowerCase();
    input.classList.toggle('is-valid',!button.disabled);
  });

  document.addEventListener('click',e=>{if(e.target.closest('[data-admin-mfa-action]')){beginMfaFlow();return;}if(e.target.closest('[data-admin-mfa-close]')){closeMfaModal();return;}if(e.target.closest('[data-admin-mfa-submit]')){verifyMfaFlow();return;}});
  document.addEventListener('keydown',e=>{if(e.key==='Enter'&&e.target.closest('[data-admin-mfa-code]')){e.preventDefault();verifyMfaFlow();}if(e.key==='Escape')closeMfaModal();});
  document.addEventListener('keydown',e=>{if(e.key==='Escape')closeUserAction();});
  document.addEventListener('visibilitychange',()=>{ scheduleDashboardRefresh(); if(!document.hidden&&state.activeTab==='overview'&&state.bootstrapReady&&(!state.dashboardLastLoad||Date.now()-state.dashboardLastLoad>15000)) runIdle(()=>loadDashboard().catch(()=>{})); });
  window.addEventListener('neith:languagechange',()=>{renderStats();renderOverview();renderDashboard();if(state.flagsLoaded)renderFlags();if(state.announcementsLoaded)renderAnnouncements();if(state.auditLoaded)renderAudit();applyUsersLanguage();renderUsers();if(state.consoleSettingsLoaded)renderConsoleSettings();});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();


/* === SOURCE: admin-commercial-r120.js === */
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


/* === SOURCE: admin-insights-r129.js === */
(() => {
  'use strict';
  function billingProviderLabel(raw, permanent=false){if(permanent)return 'NEITH';const v=String(raw||'none').toLowerCase();if(!v||v==='none'||v==='admin'||v==='key'||v.includes('lemon')||v==='stripe')return 'NEITH';if(v==='paypal')return 'PAYPAL';return v.toUpperCase();}
  const $=(s,r=document)=>r.querySelector(s);
  const client=()=>window.NeithAuth?.client||null;
  const notify=(text,type='info')=>{try{window.NeithAdminNotify?.(text,type)}catch{}};
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const fmtDate=v=>{if(!v)return '—';try{return new Intl.DateTimeFormat('es-ES',{dateStyle:'medium',timeStyle:'short'}).format(new Date(v));}catch{return String(v)}};
  const money=(cents,currency='EUR')=>{try{return new Intl.NumberFormat('es-ES',{style:'currency',currency:currency||'EUR'}).format(Number(cents||0)/100)}catch{return `${Number(cents||0)/100} €`}};
  async function rpc(name,args={}){const c=client();if(!c)throw new Error('Supabase no disponible');const {data,error}=await c.rpc(name,args);if(error)throw error;return data;}
  function setText(sel,text,type=''){const el=$(sel);if(el){el.textContent=text||'';el.dataset.type=type;}if(type==='error'&&text)notify(String(text),'error');}
  function row(label,value,state=''){return `<div class="neith-insight-row ${state}"><span>${esc(label)}</span><b>${esc(value)}</b></div>`;}
  function pct(a,b){return b?Math.round((Number(a||0)/Number(b))*100):0;}
  let businessLoaded=false,healthLoaded=false;
  async function loadBusiness(force=false){
    if(businessLoaded&&!force)return;setText('[data-business-status]','SINCRONIZANDO MÉTRICAS…');
    const d=await rpc('neith_admin_business_snapshot');businessLoaded=true;
    const kpis=$('[data-business-kpis]');if(kpis){const conv=pct(d.premium_active,d.users_total);kpis.innerHTML=`<article><small>USUARIOS</small><strong>${d.users_total??0}</strong><span>+${d.users_7d??0} últimos 7 días</span></article><article><small>PREMIUM</small><strong>${d.premium_active??0}</strong><span>${d.premium_permanent??0} permanentes</span></article><article><small>CONVERSIÓN</small><strong>${conv}%</strong><span>${d.free_total??0} cuentas FREE</span></article><article><small>PRÓXIMOS 7 DÍAS</small><strong>${d.expiring_7d??0}</strong><span>${d.cancel_pending??0} cancelaciones pendientes</span></article>`;}
    const total=Math.max(1,Number(d.users_total||0));
    const memberships=$('[data-business-memberships]');if(memberships)memberships.innerHTML=[['PREMIUM ACTIVO',d.premium_active,'premium'],['FREE',d.free_total,'free'],['PERMANENTE',d.premium_permanent,'permanent'],['TEMPORAL',d.premium_timed,'timed']].map(([name,val,cls])=>`<div class="neith-mix-line"><div><span>${name}</span><b>${val||0}</b></div><i><em class="${cls}" style="--mix:${Math.min(100,pct(val,total))}%"></em></i></div>`).join('');
    const billing=$('[data-business-billing]');if(billing)billing.innerHTML=row('IMPORTE REGISTRADO',money(d.premium_recorded_amount_cents),'good')+row('VENTAS DE CLAVES REGALO',`${d.gift_sales||0} · ${money(d.gift_amount_cents)}`)+row('EVENTOS BILLING · 24 H',d.billing_events_24h||0)+row('CANCELACIONES PENDIENTES',d.cancel_pending||0,d.cancel_pending?'warn':'good');
    const ops=$('[data-business-ops]');if(ops)ops.innerHTML=row('CLAVES DISPONIBLES',d.keys_available||0)+row('CLAVES CANJEADAS',d.keys_redeemed||0)+row('DISPOSITIVOS PREMIUM',d.active_devices||0)+row('HOUR BOOST ACTIVOS',d.hourboost_live||0);
    const runtime=$('[data-business-runtime]');if(runtime){const l=d.launcher||{};runtime.innerHTML=row('VERSIÓN ESTABLE',l.stable_version||'—')+row('VERSIÓN MÍNIMA',l.minimum_version||'—')+row('CANAL',String(l.release_channel||'—').toUpperCase())+row('MANTENIMIENTO',l.maintenance_enabled?'ACTIVO':'DESACTIVADO',l.maintenance_enabled?'warn':'good');}
    setText('[data-business-status]',`ACTUALIZADO · ${fmtDate(d.generated_at)}`,'ok');
  }
  async function loadHealth(force=false){
    if(healthLoaded&&!force)return;setText('[data-health-status]','EJECUTANDO DIAGNÓSTICO…');
    const d=await rpc('neith_admin_system_health');healthLoaded=true;
    const overview=$('[data-health-overview]');if(overview){overview.innerHTML=`<article class="${d.consistency_ok?'ok':'warn'}"><span class="neith-health-orb"></span><div><small>ESTADO GENERAL</small><strong>${d.consistency_ok?'OPERATIVO':'REVISIÓN NECESARIA'}</strong><p>${d.consistency_ok?'Identidades, perfiles y membresías están sincronizados.':'Se han detectado inconsistencias de identidad o membresía.'}</p></div></article>`;}
    const checks=[
      ['AUTH USERS',d.auth_users, true],['PERFILES',d.profiles,d.missing_profiles===0],['MEMBRESÍAS',d.memberships,d.missing_memberships===0],['PERFILES FALTANTES',d.missing_profiles,d.missing_profiles===0],['MEMBRESÍAS FALTANTES',d.missing_memberships,d.missing_memberships===0],['DISPOSITIVOS ACTIVOS',d.active_devices,true],['HOUR BOOST EN VIVO',d.hourboost_live,true],['ÚLTIMO BILLING',fmtDate(d.last_billing_event),Boolean(d.last_billing_event)],['ÚLTIMA AUDITORÍA',fmtDate(d.last_admin_audit),Boolean(d.last_admin_audit)]
    ];
    const grid=$('[data-health-grid]');if(grid)grid.innerHTML=checks.map(([label,value,ok])=>`<article class="${ok?'ok':'warn'}"><small>${esc(label)}</small><strong>${esc(value)}</strong><span><i></i>${ok?'OK':'REVISAR'}</span></article>`).join('');
    setText('[data-health-status]',`DIAGNÓSTICO COMPLETADO · ${fmtDate(d.generated_at)}`,'ok');
  }
  function ensure360(){let modal=$('[data-user360-modal]');if(modal)return modal;modal=document.createElement('div');modal.className='neith-user360-modal';modal.dataset.user360Modal='';modal.hidden=true;modal.innerHTML=`<div class="neith-user360-backdrop" data-user360-close></div><section class="neith-user360-card" role="dialog" aria-modal="true"><button type="button" class="neith-user360-x" data-user360-close>×</button><div class="neith-user360-head"><div><small>NEITH ID // CUSTOMER 360</small><h2 data-user360-title>FICHA 360</h2><p data-user360-subtitle></p></div><span><i></i> DATOS AUTORITATIVOS</span></div><div class="neith-user360-body" data-user360-body><div class="neith-user360-loading">CARGANDO HISTORIAL…</div></div></section>`;document.body.appendChild(modal);return modal;}
  function timeline(items=[],type){if(!items.length)return '<div class="neith-user360-empty">Sin actividad registrada.</div>';return `<div class="neith-user360-timeline">${items.slice(0,12).map(x=>{const date=x.created_at||x.received_at||x.starts_at||x.first_seen_at;const title=type==='billing'?(x.event_type||'Billing event'):type==='period'?(x.period_kind||'Premium'):type==='device'?(x.revoked_at?'PC revocado':'PC vinculado'):(x.action||'Acción administrativa');return `<article><i></i><div><b>${esc(String(title).toUpperCase())}</b><span>${esc(fmtDate(date))}</span></div></article>`}).join('')}</div>`;}
  async function open360(row){const modal=ensure360();modal.hidden=false;requestAnimationFrame(()=>modal.classList.add('open'));const id=row.dataset.userId;const body=$('[data-user360-body]',modal);body.innerHTML='<div class="neith-user360-loading">CARGANDO HISTORIAL…</div>';try{const data=await rpc('neith_admin_user_360',{p_user_id:id});const u=data?.user||{},m=u.membership||{},p=u.profile||{}; $('[data-user360-title]',modal).textContent=p.nickname||row.dataset.userName||'Neith ID';$('[data-user360-subtitle]',modal).textContent=`${u.email||'—'} · ${String(u.user_id||'').toUpperCase()}`;body.innerHTML=`<div class="neith-user360-summary"><article><small>PLAN</small><strong>${m.premium_permanent?'PREMIUM PERMANENTE':String(m.plan||'free').toUpperCase()}</strong></article><article><small>PREMIUM HASTA</small><strong>${m.premium_permanent?'SIN CADUCIDAD':fmtDate(m.premium_until)}</strong></article><article><small>PROVEEDOR</small><strong>${billingProviderLabel(m.billing_provider||m.source,Boolean(m.premium_permanent))}</strong></article><article><small>DISPOSITIVOS</small><strong>${(u.devices||[]).filter(d=>!d.revoked_at).length} ACTIVOS</strong></article></div><div class="neith-user360-grid"><section><header><small>PREMIUM</small><h3>PERIODOS</h3></header>${timeline(u.periods,'period')}</section><section><header><small>BILLING</small><h3>EVENTOS</h3></header>${timeline(u.billing_events,'billing')}</section><section><header><small>DEVICES</small><h3>DISPOSITIVOS</h3></header>${timeline(u.devices,'device')}</section><section><header><small>ADMIN</small><h3>AUDITORÍA</h3></header>${timeline(u.audit,'audit')}</section></div>`;}catch(e){body.innerHTML=`<div class="neith-user360-empty error">${esc(e?.message||String(e))}</div>`;}}
  function close360(){const m=$('[data-user360-modal]');if(!m)return;m.classList.remove('open');setTimeout(()=>m.hidden=true,160);}
  document.addEventListener('click',e=>{const tab=e.target.closest('[data-admin-tab]');if(tab?.dataset.adminTab==='business')setTimeout(()=>loadBusiness().catch(err=>setText('[data-business-status]',err?.message||String(err),'error')),0);if(tab?.dataset.adminTab==='health')setTimeout(()=>loadHealth().catch(err=>setText('[data-health-status]',err?.message||String(err),'error')),0);if(e.target.closest('[data-health-refresh]'))loadHealth(true).catch(err=>setText('[data-health-status]',err?.message||String(err),'error'));const b=e.target.closest('[data-user-360]');if(b){const row=b.closest('[data-user-id]');if(row)open360(row);return;}if(e.target.closest('[data-user360-close]'))close360();});
  document.addEventListener('keydown',e=>{if(e.key==='Escape')close360();});
})();


/* === SOURCE: admin-operations-r130.js === */
(() => {
  'use strict';
  function billingProviderLabel(raw, permanent=false){if(permanent)return 'NEITH';const v=String(raw||'none').toLowerCase();if(!v||v==='none'||v==='admin'||v==='key'||v.includes('lemon')||v==='stripe')return 'NEITH';if(v==='paypal')return 'PAYPAL';return v.toUpperCase();}
  const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
  const client=()=>window.NeithAuth?.client||null;
  const notify=(text,type='info')=>{try{window.NeithAdminNotify?.(text,type)}catch{}};
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const fmt=v=>{if(!v)return '—';try{return new Intl.DateTimeFormat('es-ES',{dateStyle:'medium',timeStyle:'short'}).format(new Date(v));}catch{return String(v)}};
  const fmtDate=v=>{if(!v)return '';try{return new Date(v).toISOString().slice(0,10)}catch{return ''}};
  const money=(cents,currency='EUR')=>{try{return new Intl.NumberFormat('es-ES',{style:'currency',currency:currency||'EUR'}).format(Number(cents||0)/100)}catch{return `${Number(cents||0)/100} €`}};
  async function rpc(name,args={}){const c=client();if(!c)throw new Error('Supabase no disponible');const {data,error}=await c.rpc(name,args);if(error)throw error;return data;}
  const state={devices:null,deviceQuery:'',subscriptions:null,subFilter:'all',integrity:null,control:null};
  function status(sel,text,type=''){const el=$(sel);if(el){el.textContent=text||'';el.dataset.type=type;}if(type==='error'&&text)notify(String(text),'error');}
  function pill(text,cls=''){return `<span class="neith-status-pill ${cls}">${esc(text)}</span>`}
  function ensureModal(){let m=$('[data-ops-modal]');if(m)return m;m=document.createElement('div');m.className='neith-ops-modal';m.dataset.opsModal='';m.hidden=true;m.innerHTML=`<div class="neith-ops-modal-backdrop" data-ops-close></div><section class="neith-ops-modal-card" role="dialog" aria-modal="true"><button class="neith-ops-modal-x" data-ops-close type="button">×</button><small>NEITH SECURE OPERATION</small><h3 data-ops-title>CONFIRMAR</h3><p data-ops-copy></p><label data-ops-input-wrap><span data-ops-label></span><input data-ops-input></label><div class="neith-ops-modal-actions"><button type="button" data-ops-close>CANCELAR</button><button type="button" class="primary" data-ops-confirm>CONFIRMAR</button></div></section>`;document.body.appendChild(m);return m;}
  function ask({title='CONFIRMAR',copy='',label='MOTIVO',type='text',value='',placeholder='',confirm='CONFIRMAR',hideInput=false}={}){return new Promise(resolve=>{const m=ensureModal(),input=$('[data-ops-input]',m),wrap=$('[data-ops-input-wrap]',m),btn=$('[data-ops-confirm]',m);$('[data-ops-title]',m).textContent=title;$('[data-ops-copy]',m).textContent=copy;$('[data-ops-label]',m).textContent=label;wrap.hidden=hideInput;input.type=type;input.value=value;input.placeholder=placeholder;btn.textContent=confirm;m.hidden=false;requestAnimationFrame(()=>m.classList.add('open'));let done=false;const close=v=>{if(done)return;done=true;m.classList.remove('open');setTimeout(()=>m.hidden=true,160);cleanup();resolve(v)};const onClick=e=>{if(e.target.closest('[data-ops-close]'))close(null)};const onConfirm=()=>close(hideInput?'ok':input.value.trim());const onKey=e=>{if(e.key==='Escape')close(null);if(e.key==='Enter'){e.preventDefault();onConfirm()}};const cleanup=()=>{m.removeEventListener('click',onClick);btn.removeEventListener('click',onConfirm);input.removeEventListener('keydown',onKey)};m.addEventListener('click',onClick);btn.addEventListener('click',onConfirm);input.addEventListener('keydown',onKey);if(!hideInput)setTimeout(()=>input.focus(),70);});}

  async function loadDevices(force=false){if(state.devices&&!force)return renderDevices();status('[data-devices-status]','SINCRONIZANDO DISPOSITIVOS…');const d=await rpc('neith_admin_devices_snapshot',{p_query:state.deviceQuery,p_limit:150});state.devices=d;renderDevices();status('[data-devices-status]',`ACTUALIZADO · ${fmt(d.generated_at)}`,'ok');}
  function renderDevices(){const d=state.devices||{},root=$('[data-devices-list]'),kpis=$('[data-devices-kpis]');if(kpis)kpis.innerHTML=`<article><small>ACTIVOS</small><strong>${d.active||0}</strong><span>PCs autorizados</span></article><article><small>REVOCADOS</small><strong>${d.revoked||0}</strong><span>Histórico</span></article><article><small>HUÉRFANOS</small><strong>${d.orphans||0}</strong><span>Sin usuario Auth</span></article><article><small>RESULTADOS</small><strong>${(d.devices||[]).length}</strong><span>Directorio visible</span></article>`;if(!root)return;const rows=d.devices||[];if(!rows.length){root.innerHTML='<div class="neith-ops-empty">No hay dispositivos que coincidan con el filtro actual.</div>';return;}root.innerHTML=rows.map(x=>{const active=!x.revoked_at, premium=x.premium_permanent||(x.plan==='premium'&&x.premium_until&&new Date(x.premium_until)>new Date());return `<article class="neith-device-row" data-device-id="${esc(x.id)}" data-device-user="${esc(x.user_id)}"><div class="neith-device-id"><span class="neith-device-icon">PC</span><div><b>${esc(x.nickname||x.email||'Neith ID')}</b><small>${esc(x.email||'—')} · ${esc(x.installation_hint||'—')}</small></div></div><div class="neith-device-meta"><span>ESTADO<b>${active?'AUTORIZADO':'REVOCADO'}</b></span><span>PLAN<b>${premium?(x.premium_permanent?'PERMANENTE':'PREMIUM'):'FREE'}</b></span><span>ÚLTIMO USO<b>${esc(fmt(x.last_seen_at))}</b></span></div><div class="neith-device-actions">${pill(active?'ACTIVO':'REVOCADO',active?'':'revoked')}<button type="button" data-device-reset class="good">RESET SUSTITUCIONES</button><button type="button" data-device-revoke class="danger" ${active?'':'disabled'}>REVOCAR PC</button></div></article>`}).join('');}

  async function loadSubscriptions(force=false){if(state.subscriptions&&!force)return renderSubscriptions();status('[data-subscriptions-status]','SINCRONIZANDO SUSCRIPCIONES…');const d=await rpc('neith_admin_subscriptions_snapshot',{p_limit:200});state.subscriptions=d;renderSubscriptions();status('[data-subscriptions-status]',`ACTUALIZADO · ${fmt(d.generated_at)}`,'ok');}
  function visibleSubs(){const all=state.subscriptions?.subscriptions||[],now=Date.now(),week=7*864e5;switch(state.subFilter){case'renewal':return all.filter(x=>x.auto_renew||x.next_renewal_at);case'cancel':return all.filter(x=>x.cancel_at_period_end);case'permanent':return all.filter(x=>x.premium_permanent);case'expiring':return all.filter(x=>!x.premium_permanent&&x.premium_until&&new Date(x.premium_until).getTime()-now<=week);default:return all;}}
  function renderSubscriptions(){const root=$('[data-subscriptions-list]');if(!root)return;const rows=visibleSubs();$$('[data-sub-filter]').forEach(b=>b.classList.toggle('active',b.dataset.subFilter===state.subFilter));if(!rows.length){root.innerHTML='<div class="neith-ops-empty">No hay suscripciones en este filtro.</div>';return;}root.innerHTML=rows.map(x=>{const label=x.premium_permanent?'PREMIUM PERMANENTE':'PREMIUM';const next=x.premium_permanent?'SIN CADUCIDAD':fmt(x.next_renewal_at||x.current_period_end||x.premium_until);return `<article class="neith-sub-row" data-sub-user="${esc(x.user_id)}"><div class="neith-sub-identity"><div><b>${esc(x.nickname||x.email||'Neith ID')}</b>${pill(label,x.premium_permanent?'':'')}</div><small>${esc(x.email||'—')} · ${esc(billingProviderLabel(x.billing_provider||x.source,Boolean(x.premium_permanent)))}</small></div><div class="neith-sub-meta"><span>TIPO<b>${esc(String(x.billing_interval||'other').toUpperCase())}</b></span><span>PRÓXIMA FECHA<b>${esc(next)}</b></span><span>RENOVACIÓN<b>${x.auto_renew?'ACTIVA':'NO'}</b></span><span>PRÓXIMO COBRO<b>${x.next_renewal_amount_cents!=null?esc(money(x.next_renewal_amount_cents,x.billing_currency)):'NO APLICA'}</b></span></div><div class="neith-sub-actions"><button type="button" data-sub-date class="primary">FIJAR FECHA</button><button type="button" data-sub-add="1">+1 MES</button><button type="button" data-sub-add="3">+3 MESES</button><button type="button" data-sub-free>FORZAR FREE</button></div></article>`}).join('');}

  async function loadIntegrity(force=false){if(state.integrity&&!force)return renderIntegrity();status('[data-integrity-status]','EJECUTANDO ESCANEO DE INTEGRIDAD…');const d=await rpc('neith_admin_integrity_snapshot');state.integrity=d;renderIntegrity();status('[data-integrity-status]',`ESCANEO COMPLETADO · ${fmt(d.generated_at)}`,'ok');}
  function renderIntegrity(){const d=state.integrity||{},hero=$('[data-integrity-hero]'),kpis=$('[data-integrity-kpis]'),root=$('[data-integrity-list]');const total=(d.missing_profiles||0)+(d.missing_memberships||0)+(d.membership_mismatch||0)+(d.premium_devices_without_access||0)+(d.redeemed_keys_without_period||0);if(hero)hero.innerHTML=`<article class="${d.ok?'':'warn'}"><span class="neith-integrity-orb">${d.ok?'✓':'!'}</span><div><small>ESTADO DE INTEGRIDAD</small><strong>${d.ok?'SISTEMA CONSISTENTE':'INCIDENCIAS DETECTADAS'}</strong><p>${d.ok?'No se han detectado incoherencias en los controles principales.':'Revisa las incidencias siguientes. Las reparaciones automáticas se limitan a operaciones seguras.'}</p></div><div class="neith-integrity-score"><b>${total}</b><span>INCIDENCIAS</span></div></article>`;if(kpis)kpis.innerHTML=`<article><small>PERFILES AUSENTES</small><strong>${d.missing_profiles||0}</strong><span>Auth sin neith_profiles</span></article><article><small>MEMBERSHIPS AUSENTES</small><strong>${d.missing_memberships||0}</strong><span>Auth sin entitlement</span></article><article><small>PLAN INCOHERENTE</small><strong>${d.membership_mismatch||0}</strong><span>Plan / vigencia</span></article><article><small>PCs SIN ENTITLEMENT</small><strong>${d.premium_devices_without_access||0}</strong><span>Vínculos PREMIUM</span></article>`;if(!root)return;const issues=d.issues||[];if(!issues.length){root.innerHTML='<div class="neith-ops-empty">INTEGRITY CENTER no ha encontrado incidencias accionables.</div>';return;}root.innerHTML=issues.map(x=>`<article class="neith-integrity-row ${esc(x.severity||'medium')}" data-integrity-type="${esc(x.type)}" data-integrity-user="${esc(x.user_id||'')}" data-integrity-device="${esc(x.device_id||'')}"><i class="neith-integrity-severity"></i><div class="neith-integrity-copy"><b>${esc(x.label||x.type)}</b><small>${esc(x.email||x.user_id||'—')}</small></div><div class="neith-integrity-actions">${['missing_profile','missing_membership'].includes(x.type)?'<button class="good" type="button" data-integrity-repair>REPARAR IDENTIDAD</button>':''}${x.type==='premium_device_without_access'?'<button class="danger" type="button" data-integrity-revoke>REVOCAR PC</button>':''}<button type="button" data-integrity-users>ABRIR USUARIO</button></div></article>`).join('');}

  async function loadControl(force=false){if(state.control&&!force)return renderControl();status('[data-controlroom-status]','SINCRONIZANDO CONTROL ROOM…');const d=await rpc('neith_admin_control_room');state.control=d;renderControl();status('[data-controlroom-status]',`CONTROL ROOM ACTUALIZADO · ${fmt(d.generated_at)}`,'ok');}
  function ageState(v,mins=60){if(!v)return false;return Date.now()-new Date(v).getTime()<=mins*60000}
  function renderControl(){const d=state.control||{},l=d.launcher||{},hero=$('[data-controlroom-hero]'),grid=$('[data-controlroom-grid]');const healthy=d.identity_ok&&!l.maintenance_enabled;let score=0;score+=d.identity_ok?1:0;score+=l.stable_version?1:0;score+=d.last_admin_audit?1:0;score+=d.last_device_seen?1:0;score+=d.last_billing_event?1:0;const pct=Math.round(score/5*100);if(hero)hero.innerHTML=`<article class="${healthy?'':'warn'}"><span class="neith-control-orb">N</span><div><small>NEITH OPERATIONS STATUS</small><strong>${healthy?'CONTROL PLANE OPERATIVO':'CONTROL PLANE EN REVISIÓN'}</strong><p>Estado consolidado de los servicios y señales operativas disponibles en Supabase.</p></div><div class="neith-control-score"><b>${pct}%</b><span>SEÑALES OK</span></div></article>`;if(!grid)return;const cards=[['IDENTIDAD',d.identity_ok?'SINCRONIZADA':'REVISAR',`${d.auth_users||0} Auth · ${d.profiles||0} perfiles · ${d.memberships||0} memberships`,d.identity_ok],['LAUNCHER',l.stable_version||'—',`${String(l.release_channel||'—').toUpperCase()} · mínima ${l.minimum_version||'—'}`,!l.maintenance_enabled],['FACTURACIÓN',d.last_billing_event?'SEÑAL RECIBIDA':'SIN EVENTOS',fmt(d.last_billing_event),Boolean(d.last_billing_event)],['AUDITORÍA',d.last_admin_audit?'ACTIVA':'SIN TRAZA',fmt(d.last_admin_audit),Boolean(d.last_admin_audit)],['DISPOSITIVOS',`${d.active_devices||0} ACTIVOS`,`Último: ${fmt(d.last_device_seen)}`,Boolean(d.last_device_seen)],['HOUR BOOST',`${d.hourboost_live||0} EN VIVO`,'Presencia activa ahora',true],['MANTENIMIENTO',l.maintenance_enabled?'ACTIVO':'DESACTIVADO',l.maintenance_enabled?(l.maintenance_title||'Política de mantenimiento'):'Operación normal',!l.maintenance_enabled],['FORCE UPDATE',l.force_update?'ACTIVO':'DESACTIVADO',l.force_update?'Actualización obligatoria':'Política estándar',true]];grid.innerHTML=cards.map(([a,b,c,ok])=>`<article class="neith-control-card ${ok?'':'warn'}"><small>${esc(a)}</small><strong>${esc(b)}</strong><span><i></i>${esc(c)}</span></article>`).join('');}

  async function switchToUsersWith(query){const btn=$('[data-admin-tab="users"]');btn?.click();setTimeout(()=>{const input=$('[data-user-search] input[name="query"]');if(input){input.value=query||'';$('[data-user-search]')?.requestSubmit();}},80);}

  document.addEventListener('submit',e=>{const f=e.target.closest('[data-devices-search]');if(!f)return;e.preventDefault();state.deviceQuery=f.elements.query.value.trim();state.devices=null;loadDevices(true).catch(err=>status('[data-devices-status]',err?.message||String(err),'error'));});
  document.addEventListener('click',async e=>{
    const tab=e.target.closest('[data-admin-tab]');const name=tab?.dataset.adminTab;
    if(name==='devices')setTimeout(()=>loadDevices().catch(err=>status('[data-devices-status]',err?.message||String(err),'error')),0);
    if(name==='subscriptions')setTimeout(()=>loadSubscriptions().catch(err=>status('[data-subscriptions-status]',err?.message||String(err),'error')),0);
    if(name==='integrity')setTimeout(()=>loadIntegrity().catch(err=>status('[data-integrity-status]',err?.message||String(err),'error')),0);
    if(name==='controlroom')setTimeout(()=>loadControl().catch(err=>status('[data-controlroom-status]',err?.message||String(err),'error')),0);
    if(e.target.closest('[data-devices-refresh]')){state.devices=null;loadDevices(true).catch(err=>status('[data-devices-status]',err?.message||String(err),'error'));return;}
    if(e.target.closest('[data-devices-clear]')){const i=$('[data-devices-search] input');if(i)i.value='';state.deviceQuery='';state.devices=null;loadDevices(true).catch(err=>status('[data-devices-status]',err?.message||String(err),'error'));return;}
    const revoke=e.target.closest('[data-device-revoke]');if(revoke){const row=revoke.closest('[data-device-id]');const why=await ask({title:'REVOCAR PC',copy:'Este dispositivo perderá su autorización PREMIUM. La acción quedará auditada.',label:'MOTIVO',placeholder:'Motivo administrativo',confirm:'REVOCAR'});if(why===null)return;try{await rpc('neith_admin_device_revoke',{p_user_id:row.dataset.deviceUser,p_device_id:row.dataset.deviceId,p_reason:why||'Revocado desde Centro de Dispositivos'});state.devices=null;await loadDevices(true);notify('PC PREMIUM revocado correctamente','success')}catch(err){status('[data-devices-status]',err?.message||String(err),'error')}return;}
    const reset=e.target.closest('[data-device-reset]');if(reset){const row=reset.closest('[data-device-id]');const why=await ask({title:'RESET SUSTITUCIONES',copy:'El contador de sustituciones PREMIUM de esta cuenta volverá a cero.',label:'MOTIVO',placeholder:'Motivo administrativo',confirm:'RESTABLECER'});if(why===null)return;try{await rpc('neith_admin_reset_replacements',{p_user_id:row.dataset.deviceUser,p_reason:why||'Reset desde Centro de Dispositivos'});status('[data-devices-status]','Sustituciones restablecidas.','ok');notify('Sustituciones de PC restablecidas','success')}catch(err){status('[data-devices-status]',err?.message||String(err),'error')}return;}
    if(e.target.closest('[data-subscriptions-refresh]')){state.subscriptions=null;loadSubscriptions(true).catch(err=>status('[data-subscriptions-status]',err?.message||String(err),'error'));return;}
    const filter=e.target.closest('[data-sub-filter]');if(filter){state.subFilter=filter.dataset.subFilter;renderSubscriptions();return;}
    const setDate=e.target.closest('[data-sub-date]');if(setDate){const row=setDate.closest('[data-sub-user]');const raw=await ask({title:'FIJAR CADUCIDAD EXACTA',copy:'Establece la fecha exacta hasta la que esta cuenta tendrá PREMIUM. Esta acción desactiva el modo permanente.',label:'FECHA DE FINALIZACIÓN',type:'date',value:new Date(Date.now()+30*864e5).toISOString().slice(0,10),confirm:'APLICAR FECHA'});if(raw===null)return;try{await rpc('neith_admin_set_premium_until',{p_user_id:row.dataset.subUser,p_until:`${raw}T23:59:59+00:00`,p_reason:'Fecha exacta desde Suscripciones'});state.subscriptions=null;await loadSubscriptions(true);notify('Suscripción actualizada correctamente','success')}catch(err){status('[data-subscriptions-status]',err?.message||String(err),'error')}return;}
    const add=e.target.closest('[data-sub-add]');if(add){const row=add.closest('[data-sub-user]'),months=Number(add.dataset.subAdd||1);try{await rpc('neith_admin_add_premium',{p_user_id:row.dataset.subUser,p_unit:'month',p_amount:months,p_reason:`+${months} mes(es) desde Suscripciones`});state.subscriptions=null;await loadSubscriptions(true);notify('Suscripción actualizada correctamente','success')}catch(err){status('[data-subscriptions-status]',err?.message||String(err),'error')}return;}
    const free=e.target.closest('[data-sub-free]');if(free){const row=free.closest('[data-sub-user]');const ok=await ask({title:'FORZAR FREE',copy:'Retira el entitlement PREMIUM actual de esta cuenta. Esta operación queda auditada.',hideInput:true,confirm:'FORZAR FREE'});if(ok===null)return;try{await rpc('neith_admin_force_free',{p_user_id:row.dataset.subUser,p_reason:'Forzado a FREE desde Suscripciones'});state.subscriptions=null;await loadSubscriptions(true);notify('Suscripción actualizada correctamente','success')}catch(err){status('[data-subscriptions-status]',err?.message||String(err),'error')}return;}
    if(e.target.closest('[data-integrity-refresh]')){state.integrity=null;loadIntegrity(true).catch(err=>status('[data-integrity-status]',err?.message||String(err),'error'));return;}
    const repair=e.target.closest('[data-integrity-repair]');if(repair){const row=repair.closest('[data-integrity-user]');const ok=await ask({title:'REPARAR IDENTIDAD',copy:'Se crearán únicamente el perfil o membership que falten, conservando los datos existentes.',hideInput:true,confirm:'REPARAR'});if(ok===null)return;try{await rpc('neith_admin_repair_identity',{p_user_id:row.dataset.integrityUser,p_reason:'Reparación desde Integrity Center'});state.integrity=null;await loadIntegrity(true);notify('Integridad reparada y revalidada','success')}catch(err){status('[data-integrity-status]',err?.message||String(err),'error')}return;}
    const irev=e.target.closest('[data-integrity-revoke]');if(irev){const row=irev.closest('[data-integrity-user]');try{await rpc('neith_admin_device_revoke',{p_user_id:row.dataset.integrityUser,p_device_id:row.dataset.integrityDevice,p_reason:'Revocado por inconsistencia de entitlement'});state.integrity=null;await loadIntegrity(true);notify('Integridad reparada y revalidada','success')}catch(err){status('[data-integrity-status]',err?.message||String(err),'error')}return;}
    const iu=e.target.closest('[data-integrity-users]');if(iu){const row=iu.closest('[data-integrity-user]');switchToUsersWith(row?.dataset.integrityUser||'');return;}
    if(e.target.closest('[data-controlroom-refresh]')){state.control=null;loadControl(true).catch(err=>status('[data-controlroom-status]',err?.message||String(err),'error'));return;}
  });
})();


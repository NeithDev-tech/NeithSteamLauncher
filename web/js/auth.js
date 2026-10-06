(() => {
  'use strict';
  window.__NEITH_WEB_BUILD__ = 'V32';
  console.info('[NEITH WEB] Build V32 activo · admin roles seguros + auth fast path');
  const scriptUrl = document.currentScript?.src || '';
  const siteBase = (() => {
    try { return new URL('../', scriptUrl || window.location.href); }
    catch { return new URL('./', window.location.href); }
  })();
  const siteUrl = path => new URL(String(path || '').replace(/^\/+/, ''), siteBase).href;

  const RECOVERY_BRIDGE_KEY = 'neith_password_recovery_bridge';
  const RECOVERY_VERIFIED_KEY = 'neith_password_recovery_verified';
  const currentHref = String(window.location.href);
  const recoverySignal = /(?:[?#&](?:type|flow)=recovery(?:[&#]|$))/i.test(currentHref);
  if (recoverySignal) {
    try { sessionStorage.setItem(RECOVERY_BRIDGE_KEY, '1'); } catch {}
  }
  const onRecoveryPage = /\/(?:recuperar-password|reset-password)\/?$/i.test(window.location.pathname);
  function shouldBridgeRecovery() {
    if (onRecoveryPage) return false;
    try { return recoverySignal || sessionStorage.getItem(RECOVERY_BRIDGE_KEY) === '1'; } catch { return recoverySignal; }
  }
  function goToRecoveryPage() {
    if (!shouldBridgeRecovery()) return false;
    try {
      sessionStorage.removeItem(RECOVERY_BRIDGE_KEY);
      sessionStorage.setItem(RECOVERY_VERIFIED_KEY, '1');
    } catch {}
    window.location.replace(siteUrl('recuperar-password/'));
    return true;
  }

  const REMEMBER_EMAIL_KEY = 'neith_auth_remembered_email';
  const REMEMBER_PREF_KEY = 'neith_auth_remember_identity';
  const PROFILE_CACHE_KEY = 'neith_auth_profile_v30';
  const PROFILE_CACHE_TTL_MS = 5 * 60 * 1000;

  function readProfileCache(userId, allowStale = false) {
    if (!userId) return null;
    try {
      const raw = sessionStorage.getItem(PROFILE_CACHE_KEY) || sessionStorage.getItem('neith_auth_profile_v28');
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || parsed.userId !== userId || !parsed.profile) return null;
      const age = Date.now() - Number(parsed.savedAt || 0);
      if (!allowStale && age > PROFILE_CACHE_TTL_MS) return null;
      return { profile: parsed.profile, age };
    } catch { return null; }
  }

  function writeProfileCache(userId, profile) {
    if (!userId || !profile) return;
    try { sessionStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify({ userId, profile, savedAt: Date.now() })); } catch {}
  }

  function clearProfileCache() {
    try { sessionStorage.removeItem(PROFILE_CACHE_KEY); sessionStorage.removeItem('neith_auth_profile_v28'); } catch {}
  }

  const ADMIN_ROLE_CACHE_KEY = 'neith_admin_role_v32';
  const ADMIN_ROLE_CACHE_TTL_MS = 10 * 60 * 1000;
  function readAdminRoleCache(userId) {
    if (!userId) return null;
    try {
      const raw = sessionStorage.getItem(ADMIN_ROLE_CACHE_KEY);
      if (!raw) return null;
      const data = JSON.parse(raw);
      if (data?.userId !== userId || !data?.role) return null;
      if (Date.now() - Number(data.savedAt || 0) > ADMIN_ROLE_CACHE_TTL_MS) return null;
      return data.role;
    } catch { return null; }
  }
  function writeAdminRoleCache(userId, role) {
    if (!userId || !role) return;
    try { sessionStorage.setItem(ADMIN_ROLE_CACHE_KEY, JSON.stringify({ userId, role, savedAt: Date.now() })); } catch {}
  }
  function clearAdminRoleCache() { try { sessionStorage.removeItem(ADMIN_ROLE_CACHE_KEY); } catch {} }
  async function loadAdminRole({ force = false } = {}) {
    const userId = state.session?.user?.id;
    if (!state.client || !userId) return 'user';
    if (!force) { const cached = readAdminRoleCache(userId); if (cached) return cached; }
    try {
      const { data, error } = await state.client.rpc('neith_my_role');
      if (error) throw error;
      const role = String(data || 'user');
      writeAdminRoleCache(userId, role);
      return role;
    } catch {
      return 'user';
    }
  }
  async function syncAdminMenuLink() {
    const link = document.querySelector('[data-admin-menu-link]');
    if (!link || !state.session?.user) return;
    const role = await loadAdminRole();
    link.hidden = !['admin','superadmin'].includes(role);
    link.dataset.adminRole = role;
  }


  const cfg = window.NEITH_CONFIG || {};
  const oauthEnabled = cfg.oauthEnabled === true;
  const configured = Boolean(
    window.supabase &&
    cfg.supabaseUrl &&
    cfg.supabaseAnonKey &&
    !cfg.supabaseUrl.includes('YOUR_PROJECT') &&
    !cfg.supabaseAnonKey.includes('YOUR_SUPABASE_ANON_KEY')
  );

  // V30: public pages render the authenticated header from Supabase's persisted
  // browser session immediately. This cache is used only for first-paint UI;
  // the official Supabase client revalidates it shortly afterwards.
  function readPersistedSupabaseSession() {
    if (!cfg.supabaseUrl) return null;
    try {
      const projectRef = new URL(cfg.supabaseUrl).hostname.split('.')[0];
      const preferredKey = `sb-${projectRef}-auth-token`;
      const keys = [preferredKey, ...Object.keys(localStorage).filter(k => /^sb-.*-auth-token$/i.test(k) && k !== preferredKey)];
      for (const key of keys) {
        const raw = localStorage.getItem(key);
        if (!raw) continue;
        let parsed;
        try { parsed = JSON.parse(raw); } catch { continue; }
        const candidates = [parsed, parsed?.currentSession, parsed?.session, parsed?.data?.session];
        for (const candidate of candidates) {
          if (candidate?.access_token && candidate?.user?.id) return candidate;
        }
      }
    } catch {}
    return null;
  }

  const persistedSession = readPersistedSupabaseSession();
  const state = {
    client: configured ? window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
    }) : null,
    session: persistedSession,
    profile: null
  };
  let authSubscriptionBound = false;
  let bootstrapValidated = false;

  const escapeHtml = (value = '') => String(value).replace(/[&<>'"]/g, ch => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  })[ch]);

  function initials(user) {
    const name = user?.user_metadata?.display_name || user?.user_metadata?.full_name || user?.user_metadata?.name || user?.user_metadata?.preferred_username || user?.user_metadata?.user_name || user?.email || 'N';
    return name.trim().split(/\s+/).slice(0,2).map(x => x[0]?.toUpperCase() || '').join('') || 'N';
  }

  function displayName(user) {
    return user?.user_metadata?.display_name || user?.user_metadata?.full_name || user?.user_metadata?.name || user?.user_metadata?.preferred_username || user?.user_metadata?.user_name || user?.email?.split('@')[0] || 'Usuario';
  }

  function avatarUrl(user) {
    return user?.user_metadata?.avatar_url || user?.user_metadata?.picture || '';
  }

  function injectAuthUI(kind = 'both') {
    if (kind !== 'menu' && !document.getElementById('neith-auth-modal')) {
      document.body.insertAdjacentHTML('beforeend', `
        <div class="auth-modal auth-modal-v19 auth-modal-v20" id="neith-auth-modal" aria-hidden="true">
          <div class="auth-backdrop" data-auth-close></div>
          <section class="auth-shell auth-shell-v19 auth-shell-v20" role="dialog" aria-modal="true" aria-labelledby="auth-title">
            <span class="auth-corner auth-corner-a" aria-hidden="true"></span>
            <span class="auth-corner auth-corner-b" aria-hidden="true"></span>
            <div class="auth-scanline" aria-hidden="true"></div>
            <button class="auth-close" type="button" aria-label="Cerrar" data-auth-close><span class="auth-close-icon" aria-hidden="true">×</span></button>

            <header class="auth-v19-head">
              <div class="auth-v19-emblem" aria-hidden="true"><span>N</span><i></i></div>
              <div class="auth-v19-headcopy">
                <div class="auth-brandline"><span class="auth-led"></span> NEITH ID // SECURE ACCESS</div>
                <h2 id="auth-title">ACCESO NEITH</h2>
                <p class="auth-subtitle">Tu identidad Neith, protegida y sincronizada en un único acceso.</p>
              </div>
            </header>

            <div class="auth-v19-status" aria-hidden="true"><span><i></i>NÚCLEO SEGURO</span><b>256-BIT SESSION</b></div>

            <div class="auth-tabs" role="tablist">
              <button class="active" type="button" data-auth-tab="login">INICIAR SESIÓN</button>
              <button type="button" data-auth-tab="register">CREAR CUENTA</button>
            </div>

            <form class="auth-form auth-form-v19 auth-form-v20" data-auth-form="login" novalidate>
              <label class="auth-field">
                <span class="auth-field-title">CORREO ELECTRÓNICO</span>
                <div class="auth-input-shell"><span class="auth-field-icon" aria-hidden="true">@</span><input name="email" type="email" autocomplete="email" autocapitalize="none" spellcheck="false" required placeholder="tu@correo.com"></div>
              </label>
              <label class="auth-field">
                <span class="auth-field-title">CONTRASEÑA</span>
                <div class="auth-input-shell password-field"><span class="auth-field-icon auth-lock-icon" aria-hidden="true">◇</span><input name="password" type="password" autocomplete="current-password" required minlength="8" placeholder="••••••••"><button class="password-toggle" type="button" data-password-toggle aria-label="Mostrar contraseña" aria-pressed="false"><svg class="password-eye" viewBox="0 0 24 24" aria-hidden="true"><path class="eye-open" d="M2.4 12s3.4-6 9.6-6 9.6 6 9.6 6-3.4 6-9.6 6-9.6-6-9.6-6Z" fill="none" stroke="currentColor" stroke-width="1.8"/><circle class="eye-open" cx="12" cy="12" r="2.7" fill="none" stroke="currentColor" stroke-width="1.8"/><path class="eye-slash" d="M4 4l16 16" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/></svg></button></div>
              </label>

              <div class="auth-login-tools">
                <label class="auth-remember"><input type="checkbox" name="remember" value="1" data-auth-remember><span class="auth-check" aria-hidden="true"><i>✓</i></span><span>Recordar identificación</span></label>
                <button class="auth-forgot" type="button" data-auth-switch="recover">¿Olvidaste tu contraseña?</button>
              </div>
              <p class="auth-remember-note">Guardamos únicamente tu correo en este navegador. Nunca tu contraseña.</p>

              <button class="auth-submit auth-submit-v19" type="submit"><span>ENTRAR EN NEITH</span><em aria-hidden="true">→</em></button>
              <button class="auth-switch-link" type="button" data-auth-switch="register">¿No tienes cuenta? <strong>Crear Neith ID</strong></button>
            </form>

            <form class="auth-form auth-form-v19 auth-form-v20" data-auth-form="register" autocomplete="off" hidden novalidate>
              <label class="auth-field"><span class="auth-field-title">NOMBRE DE USUARIO</span><div class="auth-input-shell"><span class="auth-field-icon" aria-hidden="true">N</span><input name="display_name" type="text" autocomplete="nickname" required maxlength="40" placeholder="Tu nombre en Neith"></div></label>
              <label class="auth-field"><span class="auth-field-title">CORREO ELECTRÓNICO</span><div class="auth-input-shell"><span class="auth-field-icon" aria-hidden="true">@</span><input name="register_email" type="email" autocomplete="off" autocapitalize="none" spellcheck="false" data-lpignore="true" data-1p-ignore="true" required placeholder="tu@correo.com"></div></label>
              <label class="auth-field"><span class="auth-field-title">CONFIRMAR CORREO</span><div class="auth-input-shell"><span class="auth-field-icon" aria-hidden="true">✓</span><input name="register_email_confirm" type="email" autocomplete="off" autocapitalize="none" spellcheck="false" data-lpignore="true" data-1p-ignore="true" required placeholder="Repite tu correo"></div></label>
              <label class="auth-field"><span class="auth-field-title">CONTRASEÑA</span><div class="auth-input-shell password-field"><span class="auth-field-icon auth-lock-icon" aria-hidden="true">◇</span><input name="register_password" type="password" autocomplete="new-password" data-lpignore="true" required minlength="8" placeholder="Mínimo 8 caracteres"><button class="password-toggle" type="button" data-password-toggle aria-label="Mostrar contraseña" aria-pressed="false"><svg class="password-eye" viewBox="0 0 24 24" aria-hidden="true"><path class="eye-open" d="M2.4 12s3.4-6 9.6-6 9.6 6 9.6 6-3.4 6-9.6 6-9.6-6-9.6-6Z" fill="none" stroke="currentColor" stroke-width="1.8"/><circle class="eye-open" cx="12" cy="12" r="2.7" fill="none" stroke="currentColor" stroke-width="1.8"/><path class="eye-slash" d="M4 4l16 16" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/></svg></button></div></label>
              <p class="auth-register-target" data-register-target>La confirmación se enviará exactamente al correo indicado arriba.</p>
              <button class="auth-submit auth-submit-v19" type="submit"><span>CREAR CUENTA</span><em aria-hidden="true">→</em></button>
            </form>

            <form class="auth-form auth-form-v19 auth-form-v20" data-auth-form="recover" hidden novalidate>
              <div class="auth-recovery-copy"><strong>RECUPERAR ACCESO</strong><span>Te enviaremos un enlace seguro para crear una nueva contraseña.</span></div>
              <label class="auth-field"><span class="auth-field-title">CORREO ELECTRÓNICO</span><div class="auth-input-shell"><span class="auth-field-icon" aria-hidden="true">@</span><input name="email" type="email" autocomplete="email" required placeholder="tu@correo.com"></div></label>
              <button class="auth-submit auth-submit-v19" type="submit"><span>ENVIAR ENLACE DE RECUPERACIÓN</span><em aria-hidden="true">→</em></button>
              <button class="auth-switch-link" type="button" data-auth-switch="login">← Volver a iniciar sesión</button>
            </form>

            <div class="auth-separator" ${oauthEnabled ? '' : 'hidden'}><span>O CONTINÚA CON</span></div>
            <div class="auth-socials" ${oauthEnabled ? '' : 'hidden'}>
              <button type="button" class="social google" data-oauth="google"><span class="social-icon google-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path fill="#4285F4" d="M21.6 12.2c0-.7-.1-1.4-.2-2H12v3.8h5.4a4.6 4.6 0 0 1-2 3v2.5h3.3c1.9-1.8 2.9-4.4 2.9-7.3Z"/><path fill="#34A853" d="M12 22c2.7 0 5-.9 6.7-2.4l-3.3-2.5c-.9.6-2.1 1-3.4 1-2.6 0-4.8-1.8-5.6-4.2H3v2.6A10 10 0 0 0 12 22Z"/><path fill="#FBBC05" d="M6.4 13.9A6 6 0 0 1 6.1 12c0-.7.1-1.3.3-1.9V7.5H3A10 10 0 0 0 2 12c0 1.6.4 3.1 1 4.5l3.4-2.6Z"/><path fill="#EA4335" d="M12 5.9c1.5 0 2.8.5 3.8 1.5l2.9-2.8A9.7 9.7 0 0 0 3 7.5l3.4 2.6C7.2 7.7 9.4 5.9 12 5.9Z"/></svg></span><b>Continuar con Google</b></button>
              <button type="button" class="social discord" data-oauth="discord"><span class="social-icon discord-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path fill="currentColor" d="M19.7 5.3A18 18 0 0 0 15.3 4l-.5 1a16 16 0 0 0-5.6 0l-.5-1a18 18 0 0 0-4.4 1.3C1.5 9.5.7 13.6 1.1 17.6A18 18 0 0 0 6.5 20l1.3-1.8a12 12 0 0 1-2-.9l.5-.4c3.8 1.8 7.6 1.8 11.4 0l.5.4c-.6.4-1.3.7-2 .9l1.3 1.8a18 18 0 0 0 5.4-2.4c.5-4.6-.8-8.7-3.2-12.3ZM8.2 15.2c-1.1 0-2-1-2-2.2s.9-2.2 2-2.2 2.1 1 2 2.2c0 1.2-.9 2.2-2 2.2Zm7.6 0c-1.1 0-2-1-2-2.2s.9-2.2 2-2.2 2.1 1 2 2.2c0 1.2-.9 2.2-2 2.2Z"/></svg></span><b>Continuar con Discord</b></button>
            </div>
            <p class="auth-message" data-auth-message></p>
            <p class="auth-config-note" ${configured ? 'hidden' : ''}>Modo visual activo. Pega tu <strong>Project URL</strong> y tu <strong>anon/public key</strong> en <code>js/supabase-config.js</code>. Después activa Google y Discord en Supabase Authentication → Providers.</p>
            <footer class="auth-v19-footer"><span><i></i>NEITH AUTH ONLINE</span><b>SESSION ENCRYPTED</b></footer>
          </section>
        </div>
      `);
      hydrateRememberedIdentity();
    }

    if (kind !== 'modal' && !document.getElementById('neith-account-menu')) {
      document.body.insertAdjacentHTML('beforeend', `
        <section class="neith-account-menu" id="neith-account-menu" role="menu" aria-hidden="true" aria-label="Cuenta Neith">
          <div class="account-menu-glow" aria-hidden="true"></div>
          <div class="account-menu-profile">
            <div class="account-menu-avatar" data-account-menu-avatar>N</div>
            <div class="account-menu-identity">
              <strong data-account-menu-name>Usuario</strong>
              <span data-account-menu-email>—</span>
            </div>
            <span class="account-menu-plan" data-account-menu-plan>FREE</span>
          </div>
          <div class="account-menu-status"><i></i><span>Cuenta Neith</span><b data-account-menu-status>ACTIVO</b></div>
          <nav class="account-menu-links" aria-label="Cuenta Neith">
            <a href="${siteUrl('dashboard/')}" role="menuitem"><span class="account-menu-icon">◈</span><span><b>MI PANEL</b><small>Ir al panel</small></span><em>›</em></a>
            <a href="${siteUrl('mi-cuenta/')}" role="menuitem"><span class="account-menu-icon">◎</span><span><b>MI CUENTA</b><small>Gestionar cuenta</small></span><em>›</em></a>
            <a href="${siteUrl('licencia/')}" role="menuitem"><span class="account-menu-icon">◇</span><span><b>LICENCIA Y PLAN</b><small>Licencia y plan</small></span><em>›</em></a>
            <a href="${siteUrl('seguridad/')}" role="menuitem"><span class="account-menu-icon">⌾</span><span><b>SEGURIDAD</b><small>Seguridad</small></span><em>›</em></a>
            <a href="${siteUrl('admin/')}" role="menuitem" data-admin-menu-link hidden><span class="account-menu-icon">◆</span><span><b>ADMIN CENTER</b><small>Control de Neith</small></span><em>›</em></a>
          </nav>
          <button class="account-menu-logout" type="button" data-logout role="menuitem"><span>⏻</span><b>CERRAR SESIÓN</b></button>
        </section>
      `);
    }

    document.querySelectorAll('.nav').forEach(navShell => {
      const existing = [...navShell.querySelectorAll('[data-auth-nav]')];
      if (existing.length > 1) existing.slice(1).forEach(node => node.remove());
      if (existing.length) return;

      const actions = navShell.querySelector('.nav-actions');
      if (!actions) return;
      const download = actions.querySelector('.nav-download, a.btn.primary');
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'nav-auth-button nav-login-visible';
      button.dataset.authNav = '';
      button.setAttribute('aria-haspopup', 'dialog');
      button.setAttribute('aria-controls', 'neith-auth-modal');
      button.innerHTML = '<span class="nav-auth-led"></span><span data-auth-nav-label>INICIAR SESIÓN</span>';
      button.dataset.accountTrigger = 'true';
      if (download) actions.insertBefore(button, download); else actions.prepend(button);
    });

    // The account trigger is handled with delegated events in initAuth().
    // This makes it reliable even when the header is injected/rebuilt by another module.
  }

  let accountMenuAnchor = null;

  function positionAccountMenu() {
    const menu = document.getElementById('neith-account-menu');
    const anchor = accountMenuAnchor;
    if (!menu || !anchor || !menu.classList.contains('open')) return;
    const rect = anchor.getBoundingClientRect();
    const width = Math.min(360, Math.max(300, window.innerWidth - 24));
    menu.style.width = `${width}px`;
    const left = Math.min(window.innerWidth - width - 12, Math.max(12, rect.right - width));
    const menuHeight = menu.getBoundingClientRect().height || 390;
    const below = rect.bottom + 12;
    const above = Math.max(12, rect.top - menuHeight - 12);
    const top = below + menuHeight <= window.innerHeight - 12 ? below : above;
    menu.style.left = `${left}px`;
    menu.style.top = `${top}px`;
  }

  function closeAccountMenu() {
    const menu = document.getElementById('neith-account-menu');
    if (!menu) return;
    menu.classList.remove('open');
    menu.setAttribute('aria-hidden', 'true');
    document.querySelectorAll('[data-auth-nav]').forEach(btn => btn.setAttribute('aria-expanded', 'false'));
    accountMenuAnchor = null;
  }

  function openAccountMenu(anchor) {
    if (state.session?.user && !document.getElementById('neith-account-menu')) injectAuthUI('menu');
    const menu = document.getElementById('neith-account-menu');
    if (!menu || !state.session?.user) return;
    accountMenuAnchor = anchor;
    menu.classList.add('open');
    menu.setAttribute('aria-hidden', 'false');
    document.querySelectorAll('[data-auth-nav]').forEach(btn => btn.setAttribute('aria-expanded', btn === anchor ? 'true' : 'false'));
    positionAccountMenu();
    requestAnimationFrame(positionAccountMenu);
    syncAdminMenuLink().then(() => { positionAccountMenu(); requestAnimationFrame(positionAccountMenu); }).catch(() => {});
  }

  function toggleAccountMenu(anchor) {
    const menu = document.getElementById('neith-account-menu');
    if (menu?.classList.contains('open') && accountMenuAnchor === anchor) closeAccountMenu();
    else openAccountMenu(anchor);
  }

  function handleHeaderTrigger(anchor) {
    if (!anchor) return;
    anchor.removeAttribute('href');
    anchor.removeAttribute('onclick');
    if (state.session?.user) toggleAccountMenu(anchor);
    else openAuth('login');
  }


  function hydrateRememberedIdentity() {
    const form = document.querySelector('[data-auth-form="login"]');
    if (!form) return;
    const email = form.querySelector('input[name="email"]');
    const remember = form.querySelector('[data-auth-remember]');
    let saved = '';
    let pref = true;
    try {
      saved = localStorage.getItem(REMEMBER_EMAIL_KEY) || '';
      const rawPref = localStorage.getItem(REMEMBER_PREF_KEY);
      pref = rawPref === null ? true : rawPref === '1';
    } catch (_) {}
    if (remember) remember.checked = pref;
    if (email && saved && !email.value) email.value = saved;
  }

  function persistRememberedIdentity(email, enabled) {
    try {
      localStorage.setItem(REMEMBER_PREF_KEY, enabled ? '1' : '0');
      if (enabled && email) localStorage.setItem(REMEMBER_EMAIL_KEY, String(email).trim());
      else localStorage.removeItem(REMEMBER_EMAIL_KEY);
    } catch (_) {}
  }


  function normalizeEmail(value = '') {
    return String(value || '').trim().toLowerCase();
  }

  function prepareRegisterForm({ clear = false } = {}) {
    const form = document.querySelector('[data-auth-form="register"]');
    if (!form) return;
    form.setAttribute('autocomplete', 'off');
    const email = form.querySelector('input[name="register_email"]');
    const confirm = form.querySelector('input[name="register_email_confirm"]');
    const password = form.querySelector('input[name="register_password"]');
    [email, confirm, password].forEach(input => {
      if (!input) return;
      input.setAttribute('autocomplete', input === password ? 'new-password' : 'off');
      input.setAttribute('data-lpignore', 'true');
      input.setAttribute('data-1p-ignore', 'true');
    });
    if (clear) {
      if (email) email.value = '';
      if (confirm) confirm.value = '';
      if (password) password.value = '';
    }
  }

  function updateRegisterTarget() {
    const form = document.querySelector('[data-auth-form="register"]');
    const target = form?.querySelector('[data-register-target]');
    const email = normalizeEmail(form?.querySelector('input[name="register_email"]')?.value);
    if (!target) return;
    const base = window.NeithI18n?.t?.('La confirmación se enviará exactamente al correo indicado arriba.') || 'La confirmación se enviará exactamente al correo indicado arriba.';
    const withEmail = window.NeithI18n?.t?.('La confirmación se enviará a:') || 'La confirmación se enviará a:';
    target.textContent = email ? `${withEmail} ${email}` : base;
  }

  function openAuth(tab = 'login') {
    closeAccountMenu();
    injectAuthUI('modal');
    setTab(tab);
    if (tab === 'login') hydrateRememberedIdentity();
    const modal = document.getElementById('neith-auth-modal');
    modal?.classList.add('open');
    modal?.setAttribute('aria-hidden', 'false');
    document.documentElement.classList.add('auth-open');
    const shell = modal?.querySelector('.auth-shell');
    if (shell) {
      shell.classList.remove('auth-glitch');
      void shell.offsetWidth;
      shell.classList.add('auth-glitch');
      setTimeout(() => shell.classList.remove('auth-glitch'), 320);
    }
    setTimeout(() => modal?.querySelector('input')?.focus(), 80);
  }

  function closeAuth() {
    const modal = document.getElementById('neith-auth-modal');
    modal?.classList.remove('open');
    modal?.setAttribute('aria-hidden', 'true');
    document.documentElement.classList.remove('auth-open');
  }

  function setTab(tab) {
    document.querySelectorAll('[data-auth-tab]').forEach(btn => btn.classList.toggle('active', btn.dataset.authTab === tab));
    document.querySelectorAll('[data-auth-form]').forEach(form => form.hidden = form.dataset.authForm !== tab);
    const tabs = document.querySelector('.auth-tabs');
    if (tabs) tabs.hidden = tab === 'recover';
    const title = document.getElementById('auth-title');
    if (title) title.textContent = tab === 'recover' ? 'RECUPERAR CONTRASEÑA' : 'ACCESO NEITH';
    if (tab === 'login') hydrateRememberedIdentity();
    if (tab === 'register') { prepareRegisterForm({ clear: true }); updateRegisterTarget(); }
    setMessage('');
  }

  function setMessage(message, type = '') {
    const el = document.querySelector('[data-auth-message]');
    if (!el) return;
    el.textContent = message;
    el.dataset.type = type;
  }

  async function loadProfile({ force = false } = {}) {
    const userId = state.session?.user?.id;
    if (!state.client || !userId) return null;

    if (!force) {
      const cached = readProfileCache(userId);
      if (cached) {
        state.profile = cached.profile;
        return state.profile;
      }
    }

    const { data, error } = await state.client
      .from('profiles')
      .select('display_name,avatar_url,plan,subscription_status')
      .eq('id', userId)
      .maybeSingle();

    if (!error) {
      state.profile = data || null;
      if (data) writeProfileCache(userId, data);
    }
    return state.profile;
  }

  function scheduleProfileRevalidation() {
    const userId = state.session?.user?.id;
    if (!userId || !state.client) return;
    const cached = readProfileCache(userId, true);
    if (cached && cached.age <= PROFILE_CACHE_TTL_MS) return;

    const run = async () => {
      const before = JSON.stringify(state.profile || null);
      await loadProfile({ force: true });
      if (JSON.stringify(state.profile || null) !== before) syncUI();
    };
    if ('requestIdleCallback' in window) requestIdleCallback(() => run(), { timeout: 1200 });
    else setTimeout(run, 250);
  }

  function normalizeAuthTriggers() {
    document.querySelectorAll('[data-auth-nav]').forEach(trigger => {
      // Account access is a control, never a navigation link. Rebuild legacy anchors
      // as real buttons so no stale href/dashboard behavior can survive.
      if (trigger.tagName === 'BUTTON') {
        trigger.type = 'button';
        trigger.removeAttribute('href');
        trigger.removeAttribute('onclick');
        return;
      }
      const button = document.createElement('button');
      [...trigger.attributes].forEach(attr => {
        if (!['href', 'onclick', 'role', 'tabindex'].includes(attr.name)) button.setAttribute(attr.name, attr.value);
      });
      button.type = 'button';
      button.className = trigger.className;
      button.innerHTML = trigger.innerHTML;
      trigger.replaceWith(button);
    });
  }

  function syncUI() {
    const user = state.session?.user;
    document.querySelectorAll('[data-auth-nav]').forEach(btn => {
      btn.classList.toggle('signed-in', Boolean(user));
      if (!user) {
        const signature = 'guest';
        if (btn.dataset.authSignature !== signature) {
          btn.style.removeProperty('--avatar');
          btn.removeAttribute('data-account-trigger');
          btn.removeAttribute('data-initials');
          btn.classList.remove('nav-account-trigger');
          btn.innerHTML = '<span class="nav-auth-led" aria-hidden="true"></span><span data-auth-nav-label>INICIAR SESIÓN</span>';
          btn.dataset.authSignature = signature;
        }
        return;
      }
      const avatar = avatarUrl(user) || state.profile?.avatar_url || '';
      const name = state.profile?.display_name || displayName(user);
      const init = initials(user);
      const signature = `user:${user.id}:${name}:${avatar}:${init}`;
      btn.dataset.initials = init;
      btn.dataset.accountTrigger = 'true';
      btn.classList.add('nav-account-trigger');
      if (btn.dataset.authSignature !== signature) {
        const avatarMarkup = avatar
          ? `<img src="${escapeHtml(avatar)}" alt="Avatar de ${escapeHtml(name)}" decoding="async">`
          : `<span>${escapeHtml(init)}</span>`;
        btn.innerHTML = `<span class="nav-account-avatar" aria-hidden="true">${avatarMarkup}</span><span class="nav-account-name" data-auth-nav-label>${escapeHtml(name)}</span><span class="nav-account-divider" aria-hidden="true"></span><span class="nav-auth-chevron" aria-hidden="true"><svg viewBox="0 0 16 16" focusable="false"><path d="M3.2 5.8 8 10.2l4.8-4.4" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg></span>`;
        btn.dataset.authSignature = signature;
      }
    });

    document.querySelectorAll('[data-auth-nav]').forEach(btn => {
      btn.setAttribute('aria-haspopup', user ? 'menu' : 'dialog');
      btn.setAttribute('aria-expanded', 'false');
      btn.setAttribute('aria-controls', user ? 'neith-account-menu' : 'neith-auth-modal');
    });

    const accountMenu = document.getElementById('neith-account-menu');
    if (!user) closeAccountMenu();
    if (accountMenu) {
      const avatar = avatarUrl(user) || state.profile?.avatar_url || '';
      const menuAvatar = accountMenu.querySelector('[data-account-menu-avatar]');
      if (menuAvatar) {
        if (avatar) menuAvatar.innerHTML = `<img src="${escapeHtml(avatar)}" alt="Avatar de ${escapeHtml(displayName(user))}">`;
        else menuAvatar.textContent = user ? initials(user) : 'N';
      }
      const menuName = accountMenu.querySelector('[data-account-menu-name]');
      const menuEmail = accountMenu.querySelector('[data-account-menu-email]');
      if (menuName) menuName.textContent = user ? (state.profile?.display_name || displayName(user)) : 'Usuario';
      if (menuEmail) menuEmail.textContent = user?.email || '—';
    }

    const plan = (state.profile?.plan || 'free').toUpperCase();
    const subscription = state.profile?.subscription_status || (plan === 'PREMIUM' ? 'active' : 'free');
    const menuPlan = document.querySelector('[data-account-menu-plan]');
    const menuStatus = document.querySelector('[data-account-menu-status]');
    if (menuPlan) { menuPlan.textContent = plan; menuPlan.dataset.plan = plan.toLowerCase(); }
    if (menuStatus) menuStatus.textContent = subscription === 'active' ? 'ACTIVO' : (plan === 'PREMIUM' ? 'ACTIVO' : 'FREE');

    // Public product pages have no dashboard fields. Avoid 20+ document-wide
    // selector scans on every authenticated page load.
    if (!document.querySelector('[data-auth-required], [data-dashboard-name], [data-dashboard-email]')) return;

    document.querySelectorAll('[data-dashboard-name]').forEach(el => el.textContent = user ? (state.profile?.display_name || displayName(user)) : 'Usuario');
    document.querySelectorAll('[data-dashboard-email]').forEach(el => el.textContent = user?.email || '—');
    document.querySelectorAll('[data-dashboard-plan]').forEach(el => {
      el.textContent = plan === 'PREMIUM' ? 'USUARIO PREMIUM ACTIVADO' : 'USUARIO GRATIS';
      el.dataset.plan = plan.toLowerCase();
    });
    document.querySelectorAll('[data-dashboard-status]').forEach(el => el.textContent = subscription.toUpperCase());
    document.querySelectorAll('[data-dashboard-avatar]').forEach(el => {
      const avatar = avatarUrl(user) || state.profile?.avatar_url || '';
      if (avatar) el.innerHTML = `<img src="${escapeHtml(avatar)}" alt="Avatar de ${escapeHtml(displayName(user))}">`;
      else el.textContent = user ? initials(user) : 'N';
    });

    document.querySelectorAll('[data-dashboard-providers]').forEach(el => {
      const raw = user?.app_metadata?.providers || (user?.app_metadata?.provider ? [user.app_metadata.provider] : []);
      const providers = Array.from(new Set((raw || []).map(x => String(x).toLowerCase())));
      if (user?.email && !providers.includes('email')) providers.push('email');
      const label = { google: 'Google', discord: 'Discord', email: 'Email' };
      el.innerHTML = providers.map(provider => `<span class="dashboard-provider-chip ${escapeHtml(provider)}"><i></i>${escapeHtml(label[provider] || provider)}</span>`).join('');
    });

    document.querySelectorAll('[data-dashboard-license]').forEach(el => {
      el.textContent = plan === 'PREMIUM' ? 'VINCULADA' : 'NO ACTIVA';
    });


    // Dashboard V10: datos seguros derivados de la sesión actual. No expone secretos ni tokens.
    const providersRaw = user?.app_metadata?.providers || (user?.app_metadata?.provider ? [user.app_metadata.provider] : []);
    const providersSafe = Array.from(new Set((providersRaw || []).map(x => String(x).toLowerCase())));
    if (user?.email && !providersSafe.includes('email')) providersSafe.push('email');
    const providerLabel = { google: 'Google', discord: 'Discord', email: 'Email' };
    document.querySelectorAll('[data-dashboard-providers-large]').forEach(el => {
      el.innerHTML = providersSafe.map(provider => `<div class="dashboard-v10-provider ${escapeHtml(provider)}"><i></i><div><b>${escapeHtml(providerLabel[provider] || provider)}</b><span>Vinculado a tu Neith ID</span></div><em>ACTIVO</em></div>`).join('');
    });
    document.querySelectorAll('[data-dashboard-plan-orb]').forEach(el => el.textContent = plan === 'PREMIUM' ? 'PRO' : 'FREE');
    document.querySelectorAll('[data-dashboard-license-type]').forEach(el => el.textContent = plan === 'PREMIUM' ? 'PREMIUM' : 'FREE');
    document.querySelectorAll('[data-dashboard-license-state]').forEach(el => el.textContent = plan === 'PREMIUM' ? 'Licencia vinculada' : 'Sin licencia Premium');
    document.querySelectorAll('[data-dashboard-license-expiry]').forEach(el => el.textContent = plan === 'PREMIUM' ? 'Gestionada por Neith' : '—');
    document.querySelectorAll('[data-dashboard-license-key]').forEach(el => el.textContent = plan === 'PREMIUM' ? '•••• •••• ••••' : '— — — —');
    const shortId = user?.id ? `${String(user.id).slice(0,4).toUpperCase()}-${String(user.id).slice(-4).toUpperCase()}` : '••••••••';
    document.querySelectorAll('[data-dashboard-user-short]').forEach(el => el.textContent = shortId);
    const fmtDate = value => {
      if (!value) return '—';
      try { return new Intl.DateTimeFormat(document.documentElement.lang === 'en' ? 'en-GB' : 'es-ES', { day:'2-digit', month:'short', year:'numeric' }).format(new Date(value)); }
      catch { return '—'; }
    };
    document.querySelectorAll('[data-dashboard-last-signin]').forEach(el => el.textContent = fmtDate(user?.last_sign_in_at));
    document.querySelectorAll('[data-dashboard-created]').forEach(el => el.textContent = fmtDate(user?.created_at));
    const ua = navigator.userAgent || '';
    const browser = /Edg\//.test(ua) ? 'Microsoft Edge' : /Chrome\//.test(ua) ? 'Google Chrome' : /Firefox\//.test(ua) ? 'Mozilla Firefox' : /Safari\//.test(ua) ? 'Safari' : 'Navegador web';
    const platform = navigator.userAgentData?.platform || navigator.platform || 'Windows';
    document.querySelectorAll('[data-dashboard-browser]').forEach(el => el.textContent = browser);
    document.querySelectorAll('[data-dashboard-platform]').forEach(el => el.textContent = platform || '—');
    document.querySelectorAll('[data-dashboard-device]').forEach(el => el.textContent = /Windows/i.test(platform + ua) ? 'PC Windows actual' : 'Dispositivo actual');
  }

  async function requireDashboardSession() {
    const protectedPage = document.querySelector('[data-auth-required]');
    if (!protectedPage) return;
    if (!configured) {
      protectedPage.classList.add('auth-ready');
      document.querySelector('[data-dashboard-guard]')?.classList.add('show');
      return;
    }
    if (!state.session?.user) {
      const localPreview = ['localhost', '127.0.0.1'].includes(window.location.hostname);
      if (localPreview) {
        protectedPage.classList.add('auth-ready', 'auth-local-preview');
        const guard = document.querySelector('[data-dashboard-guard]');
        if (guard) {
          guard.classList.add('show');
          const kicker = guard.querySelector('.kicker');
          const title = guard.querySelector('h1');
          const copy = guard.querySelector('p');
          if (kicker) kicker.textContent = window.NeithI18n?.t?.('MODO PRUEBA LOCAL') || 'MODO PRUEBA LOCAL';
          if (title) title.textContent = window.NeithI18n?.t?.('VISTA PREVIA SIN SESIÓN LOCAL') || 'VISTA PREVIA SIN SESIÓN LOCAL';
          if (copy) copy.textContent = window.NeithI18n?.t?.('Esta ruta se mantiene visible para que puedas probar el diseño sin publicar la web. Inicia sesión aquí si quieres cargar tus datos reales.') || 'Esta ruta se mantiene visible para que puedas probar el diseño sin publicar la web. Inicia sesión aquí si quieres cargar tus datos reales.';
        }
        return;
      }
      window.location.replace(siteUrl('?login=1'));
      return;
    }
    protectedPage.classList.add('auth-ready');
  }

  function togglePassword(button) {
    const field = button.closest('.password-field');
    const input = field?.querySelector('input[type="password"], input[type="text"]');
    if (!input) return;
    const revealing = input.type === 'password';
    input.type = revealing ? 'text' : 'password';
    button.setAttribute('aria-pressed', String(revealing));
    button.setAttribute('aria-label', revealing ? (window.NeithI18n?.t('Ocultar contraseña') || 'Ocultar contraseña') : (window.NeithI18n?.t('Mostrar contraseña') || 'Mostrar contraseña'));
    button.classList.toggle('is-visible', revealing);
  }

  async function handleAuthForm(form) {
    if (!configured) {
      setMessage('Configura Supabase para activar el registro y el inicio de sesión reales.', 'warning');
      return;
    }
    const submit = form.querySelector('button[type="submit"]');
    submit.disabled = true;
    const original = submit.innerHTML;
    const connecting = window.NeithI18n?.t?.('CONECTANDO…') || 'CONECTANDO…';
    submit.innerHTML = `<span>${escapeHtml(connecting)}</span><em aria-hidden="true">…</em>`;
    setMessage('');
    try {
      const data = Object.fromEntries(new FormData(form));
      if (form.dataset.authForm === 'register') {
        const displayNameValue = String(form.querySelector('input[name="display_name"]')?.value || '').trim();
        const email = normalizeEmail(form.querySelector('input[name="register_email"]')?.value);
        const emailConfirm = normalizeEmail(form.querySelector('input[name="register_email_confirm"]')?.value);
        const password = String(form.querySelector('input[name="register_password"]')?.value || '');
        if (!displayNameValue) throw new Error(window.NeithI18n?.t?.('Introduce tu nombre de usuario.') || 'Introduce tu nombre de usuario.');
        if (!email || !email.includes('@')) throw new Error(window.NeithI18n?.t?.('Introduce un correo electrónico válido.') || 'Introduce un correo electrónico válido.');
        if (email !== emailConfirm) throw new Error(window.NeithI18n?.t?.('Los correos no coinciden. Revisa la dirección antes de crear la cuenta.') || 'Los correos no coinciden. Revisa la dirección antes de crear la cuenta.');
        if (password.length < 8) throw new Error(window.NeithI18n?.t?.('La contraseña debe tener al menos 8 caracteres.') || 'La contraseña debe tener al menos 8 caracteres.');

        console.info('[NEITH AUTH] Registro solicitado para:', email);
        const { data: signupData, error } = await state.client.auth.signUp({
          email,
          password,
          options: { data: { display_name: displayNameValue } }
        });
        if (error) throw error;
        const returnedEmail = normalizeEmail(signupData?.user?.email || email);
        if (returnedEmail && returnedEmail !== email) {
          console.error('[NEITH AUTH] Inconsistencia de correo en respuesta Supabase', { requested: email, returned: returnedEmail });
          throw new Error(window.NeithI18n?.t?.('Supabase devolvió un correo distinto al indicado. Registro detenido por seguridad.') || 'Supabase devolvió un correo distinto al indicado. Registro detenido por seguridad.');
        }
        form.reset();
        prepareRegisterForm({ clear: true });
        setMessage(`${window.NeithI18n?.t?.('Cuenta creada. Correo de confirmación solicitado para:') || 'Cuenta creada. Correo de confirmación solicitado para:'} ${email}`, 'success');
      } else if (form.dataset.authForm === 'recover') {
        const redirectTo = siteUrl('recuperar-password/');
        const { error } = await state.client.auth.resetPasswordForEmail(data.email, { redirectTo });
        if (error) throw error;
        form.reset();
        setMessage('Si existe una cuenta con ese correo, recibirás un enlace para crear una nueva contraseña.', 'success');
      } else {
        const remember = Boolean(form.querySelector('[data-auth-remember]')?.checked);
        const email = normalizeEmail(data.email);
        const { data: signInData, error } = await state.client.auth.signInWithPassword({ email, password: data.password });
        if (error) throw error;
        if (signInData?.session) {
          state.session = signInData.session;
          const cached = readProfileCache(state.session.user?.id, true);
          if (cached) state.profile = cached.profile;
          syncUI();
          window.dispatchEvent(new CustomEvent('neith:authchange', { detail: { session: state.session, event: 'SIGNED_IN' } }));
        }
        persistRememberedIdentity(email, remember);
        closeAuth();
      }
    } catch (error) {
      setMessage(error?.message || 'No se pudo completar la operación.', 'error');
    } finally {
      submit.disabled = false;
      submit.innerHTML = original;
    }
  }

  async function oauth(provider) {
    if (!configured) {
      setMessage('Configura Supabase antes de activar Google o Discord.', 'warning');
      return;
    }
    if (!oauthEnabled || !['google', 'discord'].includes(provider)) {
      setMessage('Este proveedor de acceso no está disponible.', 'warning');
      return;
    }

    const button = document.querySelector(`[data-oauth="${provider}"]`);
    const original = button?.innerHTML || '';
    if (button) {
      button.disabled = true;
      button.setAttribute('aria-busy', 'true');
    }
    setMessage(provider === 'google' ? 'Abriendo Google…' : 'Abriendo Discord…');

    try {
      const redirectTo = siteUrl('dashboard/');
      const options = { redirectTo };
      if (provider === 'discord') options.scopes = 'identify email';
      if (provider === 'google') options.scopes = 'openid email profile';
      const { error } = await state.client.auth.signInWithOAuth({ provider, options });
      if (error) throw error;
    } catch (error) {
      setMessage(error?.message || 'No se pudo iniciar el acceso social.', 'error');
      if (button) {
        button.disabled = false;
        button.removeAttribute('aria-busy');
        button.innerHTML = original;
      }
    }
  }

  async function logout() {
    if (!state.client) return;
    await state.client.auth.signOut({ scope: 'local' });
    state.session = null;
    state.profile = null;
    clearProfileCache();
    clearAdminRoleCache();
    syncUI();
    window.dispatchEvent(new CustomEvent('neith:authchange', { detail: { session: null } }));
    window.location.href = siteUrl('');
  }

  async function initAuth() {
    normalizeAuthTriggers();

    document.addEventListener('click', e => {
      const accountMenu = document.getElementById('neith-account-menu');
      if (accountMenu?.classList.contains('open') && !e.target.closest('#neith-account-menu')) closeAccountMenu();

      const menuLink = e.target.closest('#neith-account-menu a');
      if (menuLink) closeAccountMenu();

      const close = e.target.closest('[data-auth-close]');
      if (close) closeAuth();
      const tab = e.target.closest('[data-auth-tab]');
      if (tab) setTab(tab.dataset.authTab);
      const switcher = e.target.closest('[data-auth-switch]');
      if (switcher) setTab(switcher.dataset.authSwitch);
      const provider = e.target.closest('[data-oauth]');
      if (provider) oauth(provider.dataset.oauth);
      const passwordToggle = e.target.closest('[data-password-toggle]');
      if (passwordToggle) togglePassword(passwordToggle);
      if (e.target.closest('[data-logout]')) logout();
    }, true);

    document.addEventListener('input', e => {
      if (e.target.matches('[data-auth-form="register"] input[name="register_email"]')) updateRegisterTarget();
    });

    document.addEventListener('submit', e => {
      const form = e.target.closest('[data-auth-form]');
      if (!form) return;
      e.preventDefault();
      handleAuthForm(form);
    });

    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') { closeAccountMenu(); closeAuth(); }
    });

    window.addEventListener('resize', positionAccountMenu, { passive: true });
    window.addEventListener('scroll', positionAccountMenu, { passive: true });
    window.addEventListener('neith:languagechange', () => {
      if (state.session?.user) syncUI();
      updateRegisterTarget();
    });

    const url = new URL(window.location.href);
    if (url.searchParams.get('login') === '1') openAuth('login');
    if (url.searchParams.get('register') === '1') openAuth('register');

    if (configured) {
      const protectedPage = Boolean(document.querySelector('[data-auth-required]'));
      const bootUserId = state.session?.user?.id || null;

      // Critical first paint: no network/auth lock and no account-menu injection.
      // The menu is created lazily only when the user actually opens it.
      if (bootUserId) {
        const cached = readProfileCache(bootUserId, true);
        if (cached) state.profile = cached.profile;
      }
      syncUI();

      const bindAuthSubscription = () => {
        if (authSubscriptionBound || !state.client) return;
        authSubscriptionBound = true;
        state.client.auth.onAuthStateChange((authEvent, session) => {
          const previousUserId = state.session?.user?.id || null;
          const nextUserId = session?.user?.id || null;
          state.session = session;

          if ((authEvent === 'PASSWORD_RECOVERY' || (session?.user && shouldBridgeRecovery())) && goToRecoveryPage()) return;
          if (authEvent === 'INITIAL_SESSION' && bootstrapValidated && nextUserId === previousUserId) return;
          if (authEvent === 'TOKEN_REFRESHED' && nextUserId === previousUserId) return;

          if (!nextUserId) {
            state.profile = null;
            clearAdminRoleCache();
            clearProfileCache();
            syncUI();
            window.dispatchEvent(new CustomEvent('neith:authchange', { detail: { session: null, event: authEvent } }));
            requireDashboardSession();
            return;
          }

          if (nextUserId !== previousUserId) clearAdminRoleCache();
          const cached = readProfileCache(nextUserId, true);
          if (cached) state.profile = cached.profile;
          else if (nextUserId !== previousUserId) state.profile = null;

          syncUI();
          requireDashboardSession();
          window.dispatchEvent(new CustomEvent('neith:authchange', { detail: { session: state.session, event: authEvent } }));

          if (authEvent === 'SIGNED_IN' || authEvent === 'USER_UPDATED' || nextUserId !== previousUserId) {
            loadProfile({ force: true }).then(() => syncUI()).catch(() => {});
          } else {
            scheduleProfileRevalidation();
          }
        });
      };

      const validateBootstrapSession = async () => {
        bindAuthSubscription();
        const previousUserId = state.session?.user?.id || null;
        try {
          const { data } = await state.client.auth.getSession();
          state.session = data?.session || null;
          bootstrapValidated = true;
          const nextUserId = state.session?.user?.id || null;

          if (state.session?.user && shouldBridgeRecovery() && goToRecoveryPage()) return;

          if (nextUserId) {
            const cached = readProfileCache(nextUserId, true);
            if (cached) state.profile = cached.profile;
            else if (nextUserId !== previousUserId) state.profile = null;
          } else {
            state.profile = null;
            if (previousUserId) clearProfileCache();
          }

          if (nextUserId !== previousUserId || protectedPage) syncUI();
          await requireDashboardSession();
          window.dispatchEvent(new CustomEvent('neith:authchange', { detail: { session: state.session, event: 'BOOTSTRAP' } }));
          scheduleProfileRevalidation();
        } catch (error) {
          console.warn('[NEITH AUTH] Revalidacion de sesion aplazada:', error?.message || error);
          await requireDashboardSession();
        }
      };

      if (protectedPage || shouldBridgeRecovery()) {
        await validateBootstrapSession();
      } else {
        // Let first paint + first input win. Session validation is not on the
        // navigation critical path for public product pages.
        const schedule = window.requestIdleCallback
          ? cb => requestIdleCallback(cb, { timeout: 1400 })
          : cb => setTimeout(cb, 550);
        schedule(() => validateBootstrapSession());
      }
    } else {
      syncUI();
      await requireDashboardSession();
    }  }

  window.NeithAuth = {
    get configured() { return configured; },
    get client() { return state.client; },
    get session() { return state.session; },
    get profile() { return state.profile; },
    open: openAuth,
    close: closeAuth,
    openAccountMenu,
    closeAccountMenu,
    toggleAccountMenu,
    handleHeaderTrigger,
    syncUI,
    getAdminRole: loadAdminRole,
    refreshProfile: async () => { await loadProfile({ force: true }); syncUI(); return state.profile; }
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initAuth, { once: true });
  else initAuth();
})();

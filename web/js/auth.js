(() => {
  'use strict';

  // R190: one canonical Auth origin. Never create a Supabase client on the bare
  // domain because www/non-www have separate localStorage sessions and can
  // otherwise rotate the same account's refresh lifecycle independently.
  if (window.location.hostname.toLowerCase() === 'neithlauncher.com') {
    const canonical = new URL(window.location.href);
    canonical.hostname = 'www.neithlauncher.com';
    window.location.replace(canonical.href);
    return;
  }
  window.__NEITH_WEB_BUILD__ = 'V34';
  console.info('[NEITH WEB] Build V34 active · instant identity + Supabase authority');
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
  const REMEMBER_IDENTITY_KEY = 'neith_auth_remembered_identity';
  const REMEMBER_PREF_KEY = 'neith_auth_remember_identity';
  const PROFILE_CACHE_KEY = 'neith_auth_profile_v34_authoritative';
  const PROFILE_PERSISTENT_PREFIX = 'neith_identity_v34:';
  const PROFILE_CACHE_TTL_MS = 5 * 60 * 1000;

  // R273: immutable registration draft. Chromium/password managers may silently
  // rewrite credential fields during native form submission. Keep the values the
  // user actually typed in JS memory and never trust a last-millisecond autofill.
  const registerDrafts = new WeakMap();
  function getRegisterDraft(form) {
    if (!form) return null;
    let draft = registerDrafts.get(form);
    if (!draft) {
      draft = { displayName: '', email: '', emailConfirm: '', password: '' };
      registerDrafts.set(form, draft);
    }
    return draft;
  }
  function captureRegisterDraft(form, input = null) {
    const draft = getRegisterDraft(form);
    if (!draft) return null;
    const capture = (name, key, normalize = false) => {
      const el = input?.name === name ? input : form.querySelector(`input[name=\"${name}\"]`);
      if (!el) return;
      const value = normalize ? normalizeEmail(el.value) : String(el.value || '');
      draft[key] = value;
    };
    if (!input || input.name === 'display_name') capture('display_name', 'displayName');
    if (!input || input.name === 'register_email') capture('register_email', 'email', true);
    if (!input || input.name === 'register_email_confirm') capture('register_email_confirm', 'emailConfirm', true);
    if (!input || input.name === 'register_password') capture('register_password', 'password');
    return draft;
  }

  function parseProfileCache(raw, userId, allowStale = false) {
    if (!raw || !userId) return null;
    try {
      const parsed = JSON.parse(raw);
      if (!parsed || parsed.userId !== userId || !parsed.profile) return null;
      const age = Date.now() - Number(parsed.savedAt || 0);
      if (!allowStale && age > PROFILE_CACHE_TTL_MS) return null;
      return { profile: parsed.profile, age };
    } catch { return null; }
  }

  function readProfileCache(userId, allowStale = false) {
    if (!userId) return null;
    try {
      const sessionHit = parseProfileCache(sessionStorage.getItem(PROFILE_CACHE_KEY), userId, allowStale);
      if (sessionHit) return sessionHit;
      // Migración transparente desde R179/R180 para que la primera apertura de R181
      // también tenga identidad instantánea, sin esperar a red.
      for (const legacyKey of ['neith_auth_profile_v33_authoritative', 'neith_auth_profile_v30', 'neith_auth_profile_v28']) {
        const legacyHit = parseProfileCache(sessionStorage.getItem(legacyKey), userId, true);
        if (legacyHit) { writeProfileCache(userId, legacyHit.profile); return legacyHit; }
      }
    } catch {}
    try {
      return parseProfileCache(localStorage.getItem(PROFILE_PERSISTENT_PREFIX + userId), userId, true);
    } catch { return null; }
  }

  function writeProfileCache(userId, profile) {
    if (!userId || !profile) return;
    const payload = JSON.stringify({ userId, profile, savedAt: Date.now() });
    try { sessionStorage.setItem(PROFILE_CACHE_KEY, payload); } catch {}
    // Nombre/avatar no son credenciales. Mantenerlos por user_id permite el primer
    // frame correcto incluso tras logout -> login, mientras Supabase revalida.
    try { localStorage.setItem(PROFILE_PERSISTENT_PREFIX + userId, payload); } catch {}
  }

  function clearProfileCache({ purgePersistent = false, userId = null } = {}) {
    try {
      sessionStorage.removeItem(PROFILE_CACHE_KEY);
      sessionStorage.removeItem('neith_auth_profile_v33_authoritative');
      sessionStorage.removeItem('neith_auth_profile_v30');
      sessionStorage.removeItem('neith_auth_profile_v28');
    } catch {}
    if (purgePersistent && userId) { try { localStorage.removeItem(PROFILE_PERSISTENT_PREFIX + userId); } catch {} }
  }

  function immediateProfileFor(user) {
    if (!user?.id) return null;
    const cached = readProfileCache(user.id, true);
    if (cached?.profile) return cached.profile;
    const meta = user.user_metadata || {};
    return {
      display_name: meta.display_name || meta.full_name || meta.name || meta.preferred_username || meta.user_name || user.email?.split('@')[0] || 'User',
      avatar_url: meta.avatar_url || meta.picture || null,
      status: 'active',
      updated_at: null
    };
  }

  function hydrateImmediateIdentity(user) {
    if (!user?.id) { state.profile = null; return null; }
    state.profile = immediateProfileFor(user);
    return state.profile;
  }

  const ADMIN_ROLE_CACHE_KEY = 'neith_admin_role_v33_owner_only';
  const ADMIN_ROLE_CACHE_TTL_MS = 10 * 60 * 1000;
  function readAdminRoleCache(userId) {
    if (!userId) return null;
    try {
      const raw = sessionStorage.getItem(ADMIN_ROLE_CACHE_KEY);
      if (!raw) return null;
      const data = JSON.parse(raw);
      if (data?.userId !== userId || typeof data?.isOwner !== 'boolean') return null;
      if (Date.now() - Number(data.savedAt || 0) > ADMIN_ROLE_CACHE_TTL_MS) return null;
      return data.isOwner;
    } catch { return null; }
  }
  function writeAdminRoleCache(userId, isOwner) {
    if (!userId || typeof isOwner !== 'boolean') return;
    try { sessionStorage.setItem(ADMIN_ROLE_CACHE_KEY, JSON.stringify({ userId, isOwner, savedAt: Date.now() })); } catch {}
  }
  function clearAdminRoleCache() {
    try {
      sessionStorage.removeItem(ADMIN_ROLE_CACHE_KEY);
      sessionStorage.removeItem('neith_admin_role_v32');
    } catch {}
  }
  async function loadAdminRole({ force = false } = {}) {
    const userId = state.session?.user?.id;
    if (!state.client || !userId) return 'user';
    try {
      const { data, error } = await state.client.rpc('neith_my_role');
      if (error) throw error;
      return String(data || 'user');
    } catch {
      return 'user';
    }
  }
  async function loadOwnerAccess({ force = false } = {}) {
    const userId = state.session?.user?.id;
    if (!state.client || !userId) return false;
    if (!force) {
      const cached = readAdminRoleCache(userId);
      if (cached !== null) return cached;
    }
    try {
      const { data, error } = await state.client.rpc('neith_is_owner');
      if (error) throw error;
      const isOwner = data === true;
      writeAdminRoleCache(userId, isOwner);
      return isOwner;
    } catch {
      return false;
    }
  }
  async function syncAdminMenuLink() {
    const nav = document.querySelector('#neith-account-menu .account-menu-links');
    if (!nav) return;

    const removeOwnerLinks = () => {
      nav.querySelector('[data-premium-menu-link]')?.remove();
      nav.querySelector('[data-admin-menu-link]')?.remove();
    };

    if (!state.session?.user) {
      removeOwnerLinks();
      return;
    }

    const isOwner = await loadOwnerAccess();
    if (!isOwner) {
      removeOwnerLinks();
      return;
    }

    if (!nav.querySelector('[data-premium-menu-link]')) {
      nav.insertAdjacentHTML('beforeend', `<a href="${siteUrl('premium/')}" role="menuitem" data-premium-menu-link data-owner-only="true"><span class="account-menu-icon">★</span><span><b>PREMIUM CONTROL</b><small>Manage Neith Premium</small></span><em>›</em></a>`);
    }

    if (!nav.querySelector('[data-admin-menu-link]')) {
      nav.insertAdjacentHTML('beforeend', `<a href="${siteUrl('admin/')}" role="menuitem" data-admin-menu-link data-owner-only="true"><span class="account-menu-icon">◆</span><span><b>ADMIN CENTER</b><small>Neith control center</small></span><em>›</em></a>`);
    }
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
  const persistedProfile = readProfileCache(persistedSession?.user?.id, true);
  const state = {
    client: configured ? window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
    }) : null,
    session: persistedSession,
    profile: persistedProfile?.profile || null,
    membership: null,
    membershipPeriods: [],
    membershipServerTime: null,
    membershipLastSync: 0
  };
  let authSubscriptionBound = false;
  let bootstrapValidated = false;
  let accountStatePromise = null;

  const escapeHtml = (value = '') => String(value).replace(/[&<>'"]/g, ch => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  })[ch]);

  function initials(user) {
    const name = state.profile?.display_name || user?.user_metadata?.display_name || user?.user_metadata?.full_name || user?.user_metadata?.name || user?.user_metadata?.preferred_username || user?.user_metadata?.user_name || user?.email || 'N';
    return String(name).trim().split(/\s+/).slice(0,2).map(x => x[0]?.toUpperCase() || '').join('') || 'N';
  }

  function displayName(user) {
    return user?.user_metadata?.display_name || user?.user_metadata?.full_name || user?.user_metadata?.name || user?.user_metadata?.preferred_username || user?.user_metadata?.user_name || user?.email?.split('@')[0] || 'User';
  }

  function avatarUrl(user) {
    return user?.user_metadata?.avatar_url || user?.user_metadata?.picture || '';
  }

  function injectAuthUI(kind = 'both') {
    if (kind !== 'menu' && !document.getElementById('neith-auth-modal')) {
      if (!document.querySelector('link[data-neith-auth35]')) {
        const authCss = document.createElement('link');
        authCss.rel = 'stylesheet';
        authCss.href = siteUrl('css/neith-auth-v35.css?v=20261025-v35-auth-clean');
        authCss.dataset.neithAuth35 = '1';
        document.head.appendChild(authCss);
      }
      document.body.insertAdjacentHTML('beforeend', `
        <div class="neith-auth34-modal" id="neith-auth-modal" aria-hidden="true">
          <button class="neith-auth34-backdrop" type="button" tabindex="-1" aria-label="Close sign in" data-auth-close></button>
          <section class="neith-auth34-dialog" role="dialog" aria-modal="true" aria-labelledby="auth-title">
            <aside class="neith-auth34-brand">
              <div class="neith-auth34-logo"><img src="${siteUrl('img/neith-launcher-mark.png')}" alt="Neith"></div>
              <div class="neith-auth34-brand-copy">
                <span class="neith-auth34-kicker">NEITH ID · SECURE ACCESS</span>
                <h2 id="auth-title">WELCOME TO NEITH</h2>
                <p>Sign in to your Neith ID or create a free account to keep your profile, Premium status and launcher access connected.</p>
              </div>
              <div class="neith-auth34-trust" aria-hidden="true">
                <span><i></i> SECURE SESSION</span>
                <span>ENCRYPTED ACCESS</span>
              </div>
            </aside>

            <main class="neith-auth34-main">
              <button class="neith-auth34-close" type="button" aria-label="Close" data-auth-close>×</button>

              <div class="neith-auth34-tabs" role="tablist">
                <button class="active" type="button" data-auth-tab="login">SIGN IN</button>
                <button type="button" data-auth-tab="register">CREATE ACCOUNT</button>
              </div>

              <form class="neith-auth34-form" data-auth-form="login" novalidate>
                <label class="neith-auth34-field">
                  <span>EMAIL OR USERNAME</span>
                  <div class="neith-auth34-input"><b aria-hidden="true">@</b><input name="email" type="text" autocomplete="username" autocapitalize="none" spellcheck="false" required placeholder="your@email.com or username"></div>
                </label>
                <label class="neith-auth34-field">
                  <span>PASSWORD</span>
                  <div class="neith-auth34-input neith-auth34-password"><b aria-hidden="true">◇</b><input name="password" type="password" autocomplete="current-password" required minlength="8" placeholder="••••••••"><button class="neith-auth34-eye" type="button" data-password-toggle aria-label="Show password" aria-pressed="false">◉</button></div>
                </label>
                <div class="neith-auth34-tools">
                  <label class="neith-auth34-remember"><input type="checkbox" name="remember" value="1" data-auth-remember><span class="neith-auth34-check" aria-hidden="true">✓</span><span>Remember sign-in</span></label>
                  <button class="neith-auth34-link" type="button" data-auth-switch="recover">Forgot your password?</button>
                </div>
                <p class="neith-auth34-note">We only store your email or username in this browser. Never your password.</p>
                <button class="neith-auth34-submit" type="submit"><span>ENTER NEITH</span><em aria-hidden="true">→</em></button>
                <button class="neith-auth34-switch" type="button" data-auth-switch="register">New to Neith? <strong>Create a free Neith ID</strong></button>
              </form>

              <form class="neith-auth34-form" data-auth-form="register" autocomplete="off" hidden novalidate>
                <label class="neith-auth34-field"><span>USERNAME</span><div class="neith-auth34-input"><b aria-hidden="true">N</b><input name="display_name" type="text" autocomplete="nickname" required maxlength="20" placeholder="Your Neith username"></div></label>
                <label class="neith-auth34-field"><span>EMAIL ADDRESS</span><div class="neith-auth34-input"><b aria-hidden="true">@</b><input name="register_email" type="email" autocomplete="off" autocapitalize="none" spellcheck="false" data-lpignore="true" data-1p-ignore="true" required placeholder="your@email.com"></div></label>
                <label class="neith-auth34-field"><span>CONFIRM EMAIL</span><div class="neith-auth34-input"><b aria-hidden="true">✓</b><input name="register_email_confirm" type="email" autocomplete="off" autocapitalize="none" spellcheck="false" data-lpignore="true" data-1p-ignore="true" required placeholder="Repeat your email"></div></label>
                <label class="neith-auth34-field"><span>PASSWORD</span><div class="neith-auth34-input neith-auth34-password"><b aria-hidden="true">◇</b><input name="register_password" type="password" autocomplete="new-password" data-lpignore="true" required minlength="8" placeholder="Minimum 8 characters"><button class="neith-auth34-eye" type="button" data-password-toggle aria-label="Show password" aria-pressed="false">◉</button></div></label>
                <p class="neith-auth34-register-target" data-register-target>The confirmation email will be sent exactly to the address entered above.</p>
                <button class="neith-auth34-submit" type="submit"><span>CREATE ACCOUNT</span><em aria-hidden="true">→</em></button>
                <button class="neith-auth34-switch" type="button" data-auth-switch="login">Already have an account? <strong>Sign in</strong></button>
              </form>

              <form class="neith-auth34-form" data-auth-form="recover" hidden novalidate>
                <div class="neith-auth34-recovery"><strong>RECOVER YOUR ACCOUNT</strong><span>Enter your email address and we will send you a secure password reset link.</span></div>
                <label class="neith-auth34-field"><span>EMAIL ADDRESS</span><div class="neith-auth34-input"><b aria-hidden="true">@</b><input name="email" type="email" autocomplete="email" required placeholder="your@email.com"></div></label>
                <button class="neith-auth34-submit" type="submit"><span>SEND RECOVERY LINK</span><em aria-hidden="true">→</em></button>
                <button class="neith-auth34-switch" type="button" data-auth-switch="login">← Back to sign in</button>
              </form>

              <div class="neith-auth34-separator" ${oauthEnabled ? '' : 'hidden'}><span>OR CONTINUE WITH</span></div>
              <div class="neith-auth34-socials" ${oauthEnabled ? '' : 'hidden'}>
                <button type="button" class="neith-auth34-social neith-auth34-google" data-oauth="google"><span class="neith-auth34-social-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path fill="#4285F4" d="M21.6 12.2c0-.7-.1-1.4-.2-2H12v3.8h5.4a4.6 4.6 0 0 1-2 3v2.5h3.3c1.9-1.8 2.9-4.4 2.9-7.3Z"/><path fill="#34A853" d="M12 22c2.7 0 5-.9 6.7-2.4l-3.3-2.5c-.9.6-2.1 1-3.4 1-2.6 0-4.8-1.8-5.6-4.2H3v2.6A10 10 0 0 0 12 22Z"/><path fill="#FBBC05" d="M6.4 13.9A6 6 0 0 1 6.1 12c0-.7.1-1.3.3-1.9V7.5H3A10 10 0 0 0 2 12c0 1.6.4 3.1 1 4.5l3.4-2.6Z"/><path fill="#EA4335" d="M12 5.9c1.5 0 2.8.5 3.8 1.5l2.9-2.8A9.7 9.7 0 0 0 3 7.5l3.4 2.6C7.2 7.7 9.4 5.9 12 5.9Z"/></svg></span><b>Continue with Google</b></button>
                <button type="button" class="neith-auth34-social neith-auth34-discord" data-oauth="discord"><span class="neith-auth34-social-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path fill="currentColor" d="M19.7 5.3A18 18 0 0 0 15.3 4l-.5 1a16 16 0 0 0-5.6 0l-.5-1a18 18 0 0 0-4.4 1.3C1.5 9.5.7 13.6 1.1 17.6A18 18 0 0 0 6.5 20l1.3-1.8a12 12 0 0 1-2-.9l.5-.4c3.8 1.8 7.6 1.8 11.4 0l.5.4c-.6.4-1.3.7-2 .9l1.3 1.8a18 18 0 0 0 5.4-2.4c.5-4.6-.8-8.7-3.2-12.3ZM8.2 15.2c-1.1 0-2-1-2-2.2s.9-2.2 2-2.2 2.1 1 2 2.2c0 1.2-.9 2.2-2 2.2Zm7.6 0c-1.1 0-2-1-2-2.2s.9-2.2 2-2.2 2.1 1 2 2.2c0 1.2-.9 2.2-2 2.2Z"/></svg></span><b>Continue with Discord</b></button>
              </div>
              <p class="neith-auth34-message" data-auth-message></p>
              <p class="neith-auth34-config" ${configured ? 'hidden' : ''}>Visual mode is active. Configure Supabase in <code>js/supabase-config.js</code> to enable real authentication.</p>
            </main>
          </section>
        </div>
      `);
    }

    if (kind !== 'modal' && !document.getElementById('neith-account-menu')) {
      document.body.insertAdjacentHTML('beforeend', `
        <section class="neith-account-menu" id="neith-account-menu" role="menu" aria-hidden="true" aria-label="Neith Account">
          <div class="account-menu-glow" aria-hidden="true"></div>
          <div class="account-menu-profile">
            <div class="account-menu-avatar" data-account-menu-avatar>N</div>
            <div class="account-menu-identity">
              <strong data-account-menu-name>User</strong>
              <span data-account-menu-email>—</span>
            </div>
            <span class="account-menu-plan" data-account-menu-plan>FREE</span>
          </div>
          <div class="account-menu-status"><i></i><span>NEITH ACCOUNT</span><b data-account-menu-status>ACTIVE</b></div>
          <nav class="account-menu-links" aria-label="Neith Account">
            <a href="${siteUrl('dashboard/')}" role="menuitem"><span class="account-menu-icon">◈</span><span><b>MY DASHBOARD</b><small>Open dashboard</small></span><em>›</em></a>
            <a href="${siteUrl('mi-cuenta/')}" role="menuitem"><span class="account-menu-icon">◎</span><span><b>MY ACCOUNT</b><small>Manage account</small></span><em>›</em></a>
            <a href="${siteUrl('seguridad/')}" role="menuitem"><span class="account-menu-icon">⌾</span><span><b>SECURITY</b><small>Security settings</small></span><em>›</em></a>
          </nav>
          <button class="account-menu-logout" type="button" data-logout role="menuitem"><span>⏻</span><b>SIGN OUT</b></button>
        </section>
      `);
      if (state.session?.user) syncUI();
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
      button.innerHTML = '<span class="nav-auth-led"></span><span data-auth-nav-label>SIGN IN</span>';
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

    // V32: the account dropdown is positioned from the clicked visible Neith button.
    // Explicitly clear right/inset so no responsive stylesheet can push it to the viewport edge.
    const rect = anchor.getBoundingClientRect();
    const viewportW = Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0);
    const viewportH = Math.max(document.documentElement.clientHeight || 0, window.innerHeight || 0);
    const gutter = viewportW <= 560 ? 8 : 12;
    const width = Math.min(340, Math.max(280, viewportW - gutter * 2));

    menu.style.setProperty('position', 'fixed', 'important');
    menu.style.setProperty('width', `${width}px`, 'important');
    menu.style.setProperty('max-width', `${viewportW - gutter * 2}px`, 'important');
    menu.style.setProperty('right', 'auto', 'important');
    menu.style.setProperty('inset-inline-end', 'auto', 'important');
    menu.style.setProperty('inset-inline-start', 'auto', 'important');

    // Align the dropdown's right edge with the Neith button, like a normal account menu.
    let left = rect.right - width;
    left = Math.max(gutter, Math.min(left, viewportW - width - gutter));

    // If a stale/detached trigger produced an invalid rect, recover from the visible trigger.
    if (!Number.isFinite(left) || rect.width <= 0) {
      const visibleTrigger = [...document.querySelectorAll('[data-auth-nav]')].find(el => {
        const r = el.getBoundingClientRect();
        return r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < viewportH;
      });
      if (visibleTrigger) {
        const r = visibleTrigger.getBoundingClientRect();
        left = Math.max(gutter, Math.min(r.right - width, viewportW - width - gutter));
      } else {
        left = gutter;
      }
    }

    menu.style.setProperty('left', `${Math.round(left)}px`, 'important');

    // Measure after width/left are settled so vertical placement is stable.
    const menuHeight = Math.min(menu.scrollHeight || menu.getBoundingClientRect().height || 390, viewportH - gutter * 2);
    const below = rect.bottom + 8;
    const above = Math.max(gutter, rect.top - menuHeight - 8);
    const top = below + menuHeight <= viewportH - gutter ? below : above;
    menu.style.setProperty('top', `${Math.round(Math.max(gutter, top))}px`, 'important');
    menu.style.setProperty('bottom', 'auto', 'important');
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
    syncUI();
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
    const identity = form.querySelector('input[name="email"]');
    const remember = form.querySelector('[data-auth-remember]');
    let saved = '';
    let pref = true;
    try {
      saved = localStorage.getItem(REMEMBER_IDENTITY_KEY) || localStorage.getItem(REMEMBER_EMAIL_KEY) || '';
      const rawPref = localStorage.getItem(REMEMBER_PREF_KEY);
      pref = rawPref === null ? true : rawPref === '1';
    } catch (_) {}
    if (remember) remember.checked = pref;
    if (identity && saved && !identity.value) identity.value = saved;
  }

  function persistRememberedIdentity(identity, enabled) {
    try {
      localStorage.setItem(REMEMBER_PREF_KEY, enabled ? '1' : '0');
      if (enabled && identity) {
        localStorage.setItem(REMEMBER_IDENTITY_KEY, String(identity).trim());
        localStorage.removeItem(REMEMBER_EMAIL_KEY);
      } else {
        localStorage.removeItem(REMEMBER_IDENTITY_KEY);
        localStorage.removeItem(REMEMBER_EMAIL_KEY);
      }
    } catch (_) {}
  }

  function normalizeEmail(value = '') {
    return String(value || '').trim().toLowerCase();
  }

  function normalizeUsername(value = '') {
    return String(value || '').trim().toLowerCase();
  }

  async function invokeIdentityAuth(body) {
    const { data, error } = await state.client.functions.invoke('neith-auth-identity', { body });
    if (error) {
      const err = new Error(error?.message || 'identity_auth_failed');
      err.code = 'NEITH_IDENTITY_EDGE_ERROR';
      err.cause = error;
      throw err;
    }
    if (!data?.ok) throw new Error(data?.error || 'identity_auth_failed');
    return data;
  }

  function isValidEmail(value = '') {
    const email = normalizeEmail(value);
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
  }

  function friendlyAuthError(error) {
    const raw = String(error?.message || error || '').trim();
    const lower = raw.toLowerCase();
    if (error?.code === 'NEITH_IDENTITY_EDGE_ERROR' || lower.includes('edge function returned a non-2xx')) {
      return window.NeithI18n?.t?.('The identity service is temporarily busy. Please try again in a few seconds.') || 'The identity service is temporarily busy. Please try again in a few seconds.';
    }
    if (lower.includes('user already registered') || lower.includes('already been registered')) {
      return 'An account with that email address already exists.';
    }
    if (lower.includes('invalid email')) {
      return 'Enter a valid email address.';
    }
    return raw || (window.NeithI18n?.t?.('The operation could not be completed. Please try again.') || 'The operation could not be completed. Please try again.');
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
      registerDrafts.set(form, { displayName: '', email: '', emailConfirm: '', password: '' });
    } else {
      captureRegisterDraft(form);
    }
  }

  function updateRegisterTarget() {
    const form = document.querySelector('[data-auth-form="register"]');
    const target = form?.querySelector('[data-register-target]');
    const email = normalizeEmail(form?.querySelector('input[name="register_email"]')?.value);
    if (!target) return;
    const base = 'The confirmation email will be sent exactly to the address entered above.';
    const withEmail = 'The confirmation email will be sent to:';
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
    const shell = modal?.querySelector('.neith-auth34-dialog');
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
    const tabs = document.querySelector('.neith-auth34-tabs');
    if (tabs) tabs.hidden = tab === 'recover';
    const title = document.getElementById('auth-title');
    if (title) title.textContent = tab === 'recover' ? 'RECOVER ACCESS' : (tab === 'register' ? 'CREATE YOUR NEITH ID' : 'WELCOME TO NEITH');
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

  function applyAuthoritativeAccountState(data, userId) {
    const profile = data?.profile && typeof data.profile === 'object' ? data.profile : null;
    if (profile) {
      state.profile = {
        display_name: profile.display_name || profile.nickname || null,
        avatar_url: profile.avatar_url || null,
        status: profile.status || 'active',
        updated_at: profile.updated_at || null
      };
      writeProfileCache(userId, state.profile);
    }
    state.membership = data?.membership && typeof data.membership === 'object' ? data.membership : null;
    state.membershipPeriods = Array.isArray(data?.periods) ? data.periods : [];
    state.membershipServerTime = data?.server_time || null;
    state.membershipLastSync = Date.now();
    return data;
  }

  async function loadAccountState({ force = false } = {}) {
    const userId = state.session?.user?.id;
    if (!state.client || !userId) {
      state.membership = null; state.membershipPeriods = []; state.membershipServerTime = null;
      return null;
    }
    if (!force && state.membership && state.profile && Date.now() - Number(state.membershipLastSync || 0) < 15000) {
      return { profile: state.profile, membership: state.membership, periods: state.membershipPeriods, server_time: state.membershipServerTime };
    }
    if (accountStatePromise) return accountStatePromise;
    accountStatePromise = (async () => {
      const { data, error } = await state.client.rpc('neith_web_account_state');
      if (error) throw error;
      return applyAuthoritativeAccountState(data || {}, userId);
    })().finally(() => { accountStatePromise = null; });
    return accountStatePromise;
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
    await loadAccountState({ force });
    return state.profile;
  }

  async function loadMembership({ force = false } = {}) {
    const userId = state.session?.user?.id;
    if (!state.client || !userId) {
      state.membership = null; state.membershipPeriods = []; state.membershipServerTime = null;
      return null;
    }
    if (!force && state.membership && Date.now() - Number(state.membershipLastSync || 0) < 15000) return state.membership;
    await loadAccountState({ force });
    return state.membership;
  }

  async function refreshMembershipLive({ silent = true } = {}) {
    if (!state.session?.user || !state.client) return null;
    try {
      const before = JSON.stringify(state.membership || null);
      await loadMembership({ force: true });
      if (JSON.stringify(state.membership || null) !== before || document.querySelector('[data-dashboard-sync-time]')) syncUI();
      return state.membership;
    } catch (error) {
      if (!silent) console.warn('[NEITH MEMBERSHIP] No se pudo sincronizar:', error?.message || error);
      const badge = document.querySelector('[data-dashboard-sync-badge]');
      if (badge) badge.innerHTML = '<i></i> OFFLINE';
      return state.membership;
    }
  }

  function formatMembershipDate(value, { dateOnly = true } = {}) {
    if (!value) return '—';
    try {
      return new Intl.DateTimeFormat(document.documentElement.lang === 'en' ? 'en-GB' : 'es-ES', dateOnly
        ? { day:'2-digit', month:'2-digit', year:'numeric' }
        : { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' }).format(new Date(value));
    } catch { return '—'; }
  }

  function formatMoney(cents, currency = 'EUR') {
    if (cents === null || cents === undefined || Number.isNaN(Number(cents))) return '—';
    try { return new Intl.NumberFormat(document.documentElement.lang === 'en' ? 'en-GB' : 'es-ES', { style:'currency', currency:String(currency || 'EUR').toUpperCase() }).format(Number(cents)/100); }
    catch { return `${(Number(cents)/100).toFixed(2)} ${String(currency || 'EUR').toUpperCase()}`; }
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

  function currentBillingProviderLabel(membership, isPermanent=false) {
    if (isPermanent) return 'NEITH';
    const raw=String(membership?.billing_provider || membership?.active_period_provider || membership?.source || 'none').trim().toLowerCase();
    if (!raw || raw==='none' || raw==='admin' || raw==='key') return 'NEITH';
    if (raw==='paypal') return 'PAYPAL';
    if (raw.includes('lemon') || raw==='stripe') return 'NEITH';
    return raw.toUpperCase();
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
          btn.innerHTML = '<span class="nav-auth-led" aria-hidden="true"></span><span data-auth-nav-label>SIGN IN</span>';
          btn.dataset.authSignature = signature;
        }
        return;
      }
      const avatar = state.profile?.avatar_url || avatarUrl(user) || '';
      const name = state.profile?.display_name || displayName(user);
      const init = initials(user);
      const signature = `user:${user.id}:${name}:${avatar}:${init}`;
      btn.dataset.initials = init;
      btn.dataset.accountTrigger = 'true';
      btn.classList.add('nav-account-trigger');
      if (btn.dataset.authSignature !== signature) {
        const avatarMarkup = avatar
          ? `<img src="${escapeHtml(avatar)}" alt="Avatar for ${escapeHtml(name)}" decoding="async">`
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
      const avatar = state.profile?.avatar_url || avatarUrl(user) || '';
      const menuAvatar = accountMenu.querySelector('[data-account-menu-avatar]');
      if (menuAvatar) {
        if (avatar) menuAvatar.innerHTML = `<img src="${escapeHtml(avatar)}" alt="Avatar for ${escapeHtml(displayName(user))}">`;
        else menuAvatar.textContent = user ? initials(user) : 'N';
      }
      const menuName = accountMenu.querySelector('[data-account-menu-name]');
      const menuEmail = accountMenu.querySelector('[data-account-menu-email]');
      if (menuName) menuName.textContent = user ? (state.profile?.display_name || displayName(user)) : 'User';
      if (menuEmail) menuEmail.textContent = user?.email || '—';
    }

    const membership = state.membership && typeof state.membership === 'object' ? state.membership : null;
    const authoritativePlan = membership?.plan ? String(membership.plan).toLowerCase() : '';
    const fallbackPlan = state.profile?.plan ? String(state.profile.plan).toLowerCase() : '';
    const planKey = authoritativePlan || (user ? 'checking' : (fallbackPlan || 'free'));
    const isPremium = planKey === 'premium';
    const isPermanent = isPremium && Boolean(membership?.premium_permanent);
    const plan = planKey.toUpperCase();
    const planLabel = isPermanent ? 'PERMANENT PREMIUM' : (isPremium ? 'PREMIUM' : (planKey === 'checking' ? 'CHECKING…' : 'FREE'));
    const subscription = membership?.subscription_status || (planKey === 'checking' ? 'checking' : (state.profile?.subscription_status || (isPremium ? 'active' : 'free')));
    const menuPlan = document.querySelector('[data-account-menu-plan]');
    const menuStatus = document.querySelector('[data-account-menu-status]');
    if (menuPlan) { menuPlan.textContent = planLabel; menuPlan.dataset.plan = isPremium ? 'premium' : (planKey === 'checking' ? 'checking' : 'free'); }
    if (menuStatus) menuStatus.textContent = isPermanent ? 'NO EXPIRY' : (subscription === 'active' ? 'ACTIVE' : (planKey === 'checking' ? 'SYNCING' : String(subscription || 'FREE').toUpperCase()));

    // Public product pages have no dashboard fields. Avoid 20+ document-wide
    // selector scans on every authenticated page load.
    if (!document.querySelector('[data-auth-required], [data-dashboard-name], [data-dashboard-email]')) return;

    document.querySelectorAll('[data-dashboard-name]').forEach(el => el.textContent = user ? (state.profile?.display_name || displayName(user)) : 'User');
    document.querySelectorAll('[data-dashboard-email]').forEach(el => el.textContent = user?.email || '—');
    document.querySelectorAll('[data-dashboard-plan]').forEach(el => {
      el.textContent = isPermanent ? 'PERMANENT PREMIUM' : (isPremium ? 'PREMIUM USER ACTIVE' : (planKey === 'checking' ? 'SYNCING PLAN…' : 'FREE USER'));
      el.dataset.plan = isPremium ? 'premium' : (planKey === 'checking' ? 'checking' : 'free');
    });
    document.querySelectorAll('[data-dashboard-status]').forEach(el => el.textContent = planKey === 'checking' ? 'SYNCING' : (isPermanent ? 'PERMANENT PREMIUM' : String(subscription || (isPremium ? 'active' : 'free')).toUpperCase()));
    document.querySelectorAll('[data-dashboard-avatar]').forEach(el => {
      const avatar = state.profile?.avatar_url || avatarUrl(user) || '';
      if (avatar) el.innerHTML = `<img src="${escapeHtml(avatar)}" alt="Avatar for ${escapeHtml(displayName(user))}">`;
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
      el.textContent = planKey === 'checking' ? 'SYNCING' : (isPremium ? 'VINCULADA' : 'NO ACTIVA');
    });


    // Dashboard V10: datos seguros derivados de la sesión actual. No expone secretos ni tokens.
    const providersRaw = user?.app_metadata?.providers || (user?.app_metadata?.provider ? [user.app_metadata.provider] : []);
    const providersSafe = Array.from(new Set((providersRaw || []).map(x => String(x).toLowerCase())));
    if (user?.email && !providersSafe.includes('email')) providersSafe.push('email');
    const providerLabel = { google: 'Google', discord: 'Discord', email: 'Email' };
    document.querySelectorAll('[data-dashboard-providers-large]').forEach(el => {
      el.innerHTML = providersSafe.map(provider => `<div class="dashboard-v10-provider ${escapeHtml(provider)}"><i></i><div><b>${escapeHtml(providerLabel[provider] || provider)}</b><span>Vinculado a tu Neith ID</span></div><em>ACTIVO</em></div>`).join('');
    });
    document.querySelectorAll('[data-dashboard-plan-orb]').forEach(el => el.textContent = isPermanent ? '∞' : (isPremium ? 'PRO' : (planKey === 'checking' ? '…' : 'FREE')));
    document.querySelectorAll('[data-dashboard-license-type]').forEach(el => el.textContent = planLabel);
    document.querySelectorAll('[data-dashboard-license-state]').forEach(el => el.textContent = planKey === 'checking' ? 'Checking authoritative membership' : (isPermanent ? 'Permanent access active' : (isPremium ? 'Premium membership active' : 'FREE plan active')));
    document.querySelectorAll('[data-dashboard-license-expiry]').forEach(el => el.textContent = isPermanent ? 'NO EXPIRY' : (isPremium ? formatMembershipDate(membership?.premium_until || membership?.current_period_end) : '—'));
    document.querySelectorAll('[data-dashboard-license-key]').forEach(el => el.textContent = isPremium ? 'PROTEGIDA' : '—');
    const purchaseAt = membership?.latest_purchase_at || null;
    const periodStart = membership?.current_period_start || state.membershipPeriods?.[0]?.starts_at || null;
    const expiry = membership?.premium_until || membership?.current_period_end || null;
    const intervalMap = { monthly:'MONTHLY', annual:'ANNUAL', gift:'GIFT', admin:'ADMIN', permanent:'PERMANENT', other:'OTHER' };
    const provider = currentBillingProviderLabel(membership, isPermanent);
    const interval = isPermanent ? 'PERMANENT' : (intervalMap[String(membership?.billing_interval || membership?.active_period_kind || 'other').toLowerCase()] || String(membership?.billing_interval || '—').toUpperCase());
    const cancelAt = membership?.cancel_effective_at || (membership?.cancel_at_period_end ? expiry : null);
    document.querySelectorAll('[data-dashboard-purchase-date]').forEach(el => el.textContent = purchaseAt ? formatMembershipDate(purchaseAt, {dateOnly:false}) : (isPermanent ? 'PERMANENT ASSIGNMENT' : '—'));
    document.querySelectorAll('[data-dashboard-period-start]').forEach(el => el.textContent = isPermanent ? (membership?.first_premium_at ? formatMembershipDate(membership.first_premium_at) : 'PERMANENT') : formatMembershipDate(periodStart));
    document.querySelectorAll('[data-dashboard-renewal]').forEach(el => el.textContent = isPermanent ? 'NO APLICA' : (membership?.auto_renew ? 'AUTOMATIC · ACTIVE' : (isPremium ? 'DESACTIVADA' : 'NO APLICA')));
    document.querySelectorAll('[data-dashboard-subscription-state]').forEach(el => el.textContent = planKey === 'checking' ? 'SYNCING' : (isPermanent ? 'PERMANENT' : String(subscription || 'inactive').toUpperCase()));
    document.querySelectorAll('[data-dashboard-provider]').forEach(el => el.textContent = provider);
    document.querySelectorAll('[data-dashboard-billing-interval]').forEach(el => el.textContent = interval);
    document.querySelectorAll('[data-dashboard-cancel-state]').forEach(el => el.textContent = isPermanent ? 'NO APLICA' : (membership?.cancel_at_period_end ? `PROGRAMADA · ${formatMembershipDate(cancelAt)}` : (isPremium ? 'NO SOLICITADA' : '—')));
    document.querySelectorAll('[data-dashboard-next-renewal]').forEach(el => el.textContent = isPermanent ? 'NO APLICA' : (membership?.auto_renew ? formatMembershipDate(membership?.next_renewal_at, {dateOnly:false}) : '—'));
    document.querySelectorAll('[data-dashboard-next-amount]').forEach(el => el.textContent = isPermanent ? 'NO APLICA' : formatMoney(membership?.next_renewal_amount_cents, membership?.billing_currency));
    document.querySelectorAll('[data-dashboard-plan-copy]').forEach(el => el.textContent = planKey === 'checking' ? 'Checking your real Neith membership status…' : (isPermanent ? 'Your account has permanent PREMIUM. Access does not expire and no automatic renewal is required.' : (isPremium ? 'Your PREMIUM is active and synchronized with authoritative Neith Cloud membership.' : 'Your account is on FREE. If you get PREMIUM, this panel will update automatically.')));
    document.querySelectorAll('[data-dashboard-premium-access]').forEach(el => { el.classList.toggle('locked', !isPremium); el.classList.toggle('active', isPremium); });
    document.querySelectorAll('[data-dashboard-premium-access-label]').forEach(el => el.textContent = planKey === 'checking' ? 'CHECKING' : (isPremium ? 'ENABLED' : 'INACTIVE'));
    document.querySelectorAll('[data-dashboard-sync-badge]').forEach(el => { el.className='dash11-badge live'; el.innerHTML='<i></i> ' + (membership ? 'SINCRONIZADO' : 'SYNCING'); });
    document.querySelectorAll('[data-dashboard-sync-time]').forEach(el => el.textContent = state.membershipLastSync ? new Intl.DateTimeFormat(document.documentElement.lang==='en'?'en-GB':'es-ES',{hour:'2-digit',minute:'2-digit',second:'2-digit'}).format(new Date(state.membershipLastSync)) : 'EN VIVO');
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
    document.querySelectorAll('[data-dashboard-device]').forEach(el => el.textContent = /Windows/i.test(platform + ua) ? 'PC Windows actual' : 'Current device');
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
          if (title) title.textContent = window.NeithI18n?.t?.('LOCAL PREVIEW WITHOUT SESSION') || 'LOCAL PREVIEW WITHOUT SESSION';
          if (copy) copy.textContent = 'This route remains visible so you can preview the design locally. Sign in to load your real account data.';
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
    button.setAttribute('aria-label', revealing ? 'Hide password' : 'Show password');
    button.classList.toggle('is-visible', revealing);
  }

  async function handleAuthForm(form) {
    if (!configured) {
      setMessage('Configure Supabase to enable real sign-up and sign-in.', 'warning');
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
        // R273: use the in-memory draft captured from user input. Do not read the
        // credential fields again here: Chrome/password managers can mutate them
        // immediately before the submit event without changing what the user saw.
        const draft = getRegisterDraft(form) || captureRegisterDraft(form);
        const displayNameValue = String(draft?.displayName || form.querySelector('input[name="display_name"]')?.value || '').trim();
        const email = normalizeEmail(draft?.email || form.querySelector('input[name="register_email"]')?.value);
        const emailConfirm = normalizeEmail(draft?.emailConfirm || form.querySelector('input[name="register_email_confirm"]')?.value);
        const password = String(draft?.password || form.querySelector('input[name="register_password"]')?.value || '');
        if (!displayNameValue) throw new Error(window.NeithI18n?.t?.('Enter your username.') || 'Enter your username.');
        if (displayNameValue.length > 20) throw new Error(window.NeithI18n?.t?.('The username can have a maximum of 20 characters.') || 'The username can have a maximum of 20 characters.');
        // Validación local completa ANTES de cualquier llamada remota.
        if (!isValidEmail(email)) throw new Error('Enter a valid email address.');
        if (email !== emailConfirm) throw new Error(window.NeithI18n?.t?.('The email addresses do not match. Check them before creating the account.') || 'The email addresses do not match. Check them before creating the account.');
        if (password.length < 8) throw new Error('The password must be at least 8 characters long.');

        // El precheck del nick no puede tumbar el registro si la Edge Function está caída/no publicada.
        try {
          const usernameCheck = await invokeIdentityAuth({ action: 'check_username', username: displayNameValue });
          if (!usernameCheck.available) throw new Error(window.NeithI18n?.t?.('That username is already in use.') || 'That username is already in use.');
        } catch (usernameError) {
          if (usernameError?.code !== 'NEITH_IDENTITY_EDGE_ERROR') throw usernameError;
          console.warn('[NEITH AUTH] Precheck de username no disponible; continúa registro por email.', usernameError);
        }

        console.info('[NEITH AUTH] Registro solicitado para:', email);

        // R271: el alta se ejecuta con un cliente aislado, sin ninguna sesión
        // persistida del navegador. Así una cuenta anterior nunca puede
        // contaminar el email/identidad del nuevo registro.
        const signupClient = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey, {
          auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
        });
        const { data: signupData, error } = await signupClient.auth.signUp({
          email,
          password,
          options: {
            data: { display_name: displayNameValue, nickname: displayNameValue, login_username: displayNameValue },
            emailRedirectTo: siteUrl('mi-cuenta/')
          }
        });
        if (error) throw error;
        const returnedEmail = normalizeEmail(signupData?.user?.email || email);
        if (returnedEmail && returnedEmail !== email) {
          console.error('[NEITH AUTH] Inconsistencia de correo en respuesta Supabase', { requested: email, returned: returnedEmail });
          throw new Error('Supabase returned a different email address. Registration was stopped for security.');
        }
        let createdSession = signupData?.session || null;
        if (!createdSession) {
          // Compatibilidad por si en el futuro se activa confirmación obligatoria.
          const { data: signedData, error: signInError } = await signupClient.auth.signInWithPassword({ email, password });
          if (signInError) throw signInError;
          createdSession = signedData?.session || null;
        }
        if (!createdSession?.user) {
          throw new Error('The account was created, but automatic sign-in failed.');
        }

        // Solo después de confirmar que la nueva identidad es correcta, sustituimos
        // la sesión principal persistida por la sesión recién creada.
        const { data: adoptedData, error: adoptError } = await state.client.auth.setSession({
          access_token: createdSession.access_token,
          refresh_token: createdSession.refresh_token
        });
        if (adoptError) throw adoptError;
        createdSession = adoptedData?.session || createdSession;
        if (normalizeEmail(createdSession?.user?.email) !== email) {
          throw new Error('The created session does not match the requested email. The operation was stopped for security.');
        }

        state.session = createdSession;
        clearAdminRoleCache();
        state.membership = null; state.membershipPeriods = []; state.membershipServerTime = null; state.membershipLastSync = 0;
        hydrateImmediateIdentity(createdSession.user);
        syncUI();
        window.dispatchEvent(new CustomEvent('neith:authchange', { detail: { session: state.session, event: 'SIGNED_IN' } }));

        form.reset();
        prepareRegisterForm({ clear: true });
        closeAuth();
        try {
          const nextUrl = new URL(window.location.href);
          nextUrl.searchParams.delete('register');
          nextUrl.searchParams.delete('login');
          window.history.replaceState({}, '', `${nextUrl.pathname}${nextUrl.search}${nextUrl.hash}`);
        } catch {}

        // Completa perfil/plan FREE desde la autoridad remota sin retrasar el cierre del modal.
        loadAccountState({ force: true }).then(syncUI).catch(() => {});
      } else if (form.dataset.authForm === 'recover') {
        const redirectTo = siteUrl('recuperar-password/');
        const { error } = await state.client.auth.resetPasswordForEmail(data.email, { redirectTo });
        if (error) throw error;
        form.reset();
        setMessage('If an account exists for that email, you will receive a secure password reset link.', 'success');
      } else {
        const remember = Boolean(form.querySelector('[data-auth-remember]')?.checked);
        const identifier = String(data.email || '').trim();
        if (!identifier) throw new Error('Enter your email address or username.');
        let signInData = null;
        if (identifier.includes('@')) {
          const email = normalizeEmail(identifier);
          const result = await state.client.auth.signInWithPassword({ email, password: data.password });
          if (result.error) throw result.error;
          signInData = result.data;
        } else {
          try {
            const resolved = await invokeIdentityAuth({ action: 'login_username', username: identifier, password: data.password });
            const result = await state.client.auth.setSession({ access_token: resolved.access_token, refresh_token: resolved.refresh_token });
            if (result.error) throw result.error;
            signInData = result.data;
          } catch (_) {
            throw new Error(window.NeithI18n?.t?.('Email, username or password is incorrect.') || 'Email, username or password is incorrect.');
          }
        }
        if (signInData?.session) {
          state.session = signInData.session;
          hydrateImmediateIdentity(state.session.user);
          syncUI();
          window.dispatchEvent(new CustomEvent('neith:authchange', { detail: { session: state.session, event: 'SIGNED_IN' } }));
          // Autoridad online en segundo plano; no bloquea el cierre del modal ni el primer frame.
          loadAccountState({ force: true }).then(syncUI).catch(() => {});
        }
        persistRememberedIdentity(identifier, remember);
        closeAuth();
      }
    } catch (error) {
      setMessage(friendlyAuthError(error), 'error');
    } finally {
      submit.disabled = false;
      submit.innerHTML = original;
    }
  }

  async function oauth(provider) {
    if (!configured) {
      setMessage('Configure Supabase before enabling Google or Discord.', 'warning');
      return;
    }
    if (!oauthEnabled || !['google', 'discord'].includes(provider)) {
      setMessage('This sign-in provider is not available.', 'warning');
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
      if (provider === 'google') {
        options.scopes = 'openid email profile';
        // Always show Google's account chooser, even when a Google session already exists.
        // This prevents mobile browsers from silently reusing the last signed-in account.
        options.queryParams = { prompt: 'select_account' };
      }
      const { error } = await state.client.auth.signInWithOAuth({ provider, options });
      if (error) throw error;
    } catch (error) {
      setMessage(error?.message || 'Social sign-in could not be started.', 'error');
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
    state.membership = null; state.membershipPeriods = []; state.membershipServerTime = null; state.membershipLastSync = 0;
    clearProfileCache();
    clearAdminRoleCache();
    syncUI();
    window.dispatchEvent(new CustomEvent('neith:authchange', { detail: { session: null } }));
    window.location.href = siteUrl('');
  }

  async function initAuth() {
    normalizeAuthTriggers();

    // Nunca dejar el icono de imagen rota: si un avatar remoto falla, usar iniciales.
    document.addEventListener('error', e => {
      const img = e.target;
      if (!(img instanceof HTMLImageElement) || !img.closest('[data-auth-nav], #neith-account-menu, [data-dashboard-avatar]')) return;
      const user = state.session?.user;
      const fallback = user ? initials(user) : 'N';
      const host = img.parentElement;
      if (host) host.textContent = fallback;
    }, true);

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
      const registerInput = e.target.closest?.('[data-auth-form="register"] input');
      if (registerInput) {
        const registerForm = registerInput.closest('[data-auth-form="register"]');
        captureRegisterDraft(registerForm, registerInput);
        if (registerInput.name === 'register_email') updateRegisterTarget();
      }
    });

    // Capture one more immutable snapshot on pointer-down, before the browser's
    // native submit/autofill machinery has any chance to rewrite credentials.
    document.addEventListener('pointerdown', e => {
      const submitButton = e.target.closest?.('[data-auth-form="register"] button[type="submit"]');
      if (!submitButton) return;
      captureRegisterDraft(submitButton.closest('[data-auth-form="register"]'));
    }, true);

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
            state.membership = null; state.membershipPeriods = []; state.membershipServerTime = null; state.membershipLastSync = 0;
            clearAdminRoleCache();
            clearProfileCache();
            syncUI();
            window.dispatchEvent(new CustomEvent('neith:authchange', { detail: { session: null, event: authEvent } }));
            requireDashboardSession();
            return;
          }

          if (nextUserId !== previousUserId) { clearAdminRoleCache(); state.membership = null; state.membershipPeriods = []; state.membershipLastSync = 0; }
          hydrateImmediateIdentity(session.user);

          syncUI();
          requireDashboardSession();
          window.dispatchEvent(new CustomEvent('neith:authchange', { detail: { session: state.session, event: authEvent } }));

          if (authEvent === 'SIGNED_IN' || authEvent === 'USER_UPDATED' || nextUserId !== previousUserId) {
            Promise.allSettled([loadProfile({ force: true }), loadMembership({ force: true })]).then(() => syncUI());
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
            hydrateImmediateIdentity(state.session.user);
          } else {
            state.profile = null;
            if (previousUserId) clearProfileCache();
          }

          if (nextUserId !== previousUserId || protectedPage) syncUI();
          await requireDashboardSession();
          if (nextUserId) await Promise.allSettled([loadProfile({ force: true }), loadMembership({ force: true })]);
          syncUI();
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

  let membershipLiveTimer = 0;
  function ensureMembershipLiveRefresh() {
    if (membershipLiveTimer) return;
    membershipLiveTimer = window.setInterval(() => {
      if (!document.hidden && state.session?.user) refreshMembershipLive();
    }, 20000);
    document.addEventListener('visibilitychange', () => { if (!document.hidden && state.session?.user) refreshMembershipLive(); }, { passive:true });
    window.addEventListener('focus', () => { if (state.session?.user) refreshMembershipLive(); }, { passive:true });
  }
  ensureMembershipLiveRefresh();

  window.NeithAuth = {
    get configured() { return configured; },
    get client() { return state.client; },
    get session() { return state.session; },
    get profile() { return state.profile; },
    get membership() { return state.membership; },
    get membershipPeriods() { return state.membershipPeriods; },
    open: openAuth,
    close: closeAuth,
    openAccountMenu,
    closeAccountMenu,
    toggleAccountMenu,
    handleHeaderTrigger,
    syncUI,
    getAdminRole: loadAdminRole,
    refreshProfile: async () => { await Promise.allSettled([loadProfile({ force: true }), loadMembership({ force: true })]); syncUI(); return state.profile; },
    refreshMembership: async () => { await refreshMembershipLive({ silent:false }); return state.membership; }
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initAuth, { once: true });
  else initAuth();
})();

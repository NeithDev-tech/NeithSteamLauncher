(() => {
  'use strict';
  const scriptUrl = document.currentScript?.src || '';
  const siteBase = (() => {
    try { return new URL('../', scriptUrl || window.location.href); }
    catch { return new URL('./', window.location.href); }
  })();
  const siteUrl = path => new URL(String(path || '').replace(/^\/+/, ''), siteBase).href;


  const cfg = window.NEITH_CONFIG || {};
  const oauthEnabled = cfg.oauthEnabled === true;
  const configured = Boolean(
    window.supabase &&
    cfg.supabaseUrl &&
    cfg.supabaseAnonKey &&
    !cfg.supabaseUrl.includes('YOUR_PROJECT') &&
    !cfg.supabaseAnonKey.includes('YOUR_SUPABASE_ANON_KEY')
  );

  const state = {
    client: configured ? window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
    }) : null,
    session: null,
    profile: null
  };

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

  function injectAuthUI() {
    if (!document.getElementById('neith-auth-modal')) {
      document.body.insertAdjacentHTML('beforeend', `
        <div class="auth-modal" id="neith-auth-modal" aria-hidden="true">
          <div class="auth-backdrop" data-auth-close></div>
          <section class="auth-shell" role="dialog" aria-modal="true" aria-labelledby="auth-title">
            <button class="auth-close" type="button" aria-label="Cerrar" data-auth-close>×</button>
            <div class="auth-brandline"><span class="auth-led"></span> NEITH ID // SECURE ACCESS</div>
            <h2 id="auth-title">ACCESO NEITH</h2>
            <p class="auth-subtitle">Tu identidad, tus planes y tu launcher conectados en un único núcleo.</p>
            <div class="auth-tabs" role="tablist">
              <button class="active" type="button" data-auth-tab="login">INICIAR SESIÓN</button>
              <button type="button" data-auth-tab="register">REGISTRO</button>
            </div>
            <form class="auth-form" data-auth-form="login" novalidate>
              <label>Correo electrónico<input name="email" type="email" autocomplete="email" required placeholder="tu@correo.com"></label>
              <label>Contraseña<div class="password-field"><input name="password" type="password" autocomplete="current-password" required minlength="8" placeholder="••••••••"><button class="password-toggle" type="button" data-password-toggle aria-label="Mostrar contraseña" aria-pressed="false"><svg class="password-eye" viewBox="0 0 24 24" aria-hidden="true"><path class="eye-open" d="M2.4 12s3.4-6 9.6-6 9.6 6 9.6 6-3.4 6-9.6 6-9.6-6-9.6-6Z" fill="none" stroke="currentColor" stroke-width="1.8"/><circle class="eye-open" cx="12" cy="12" r="2.7" fill="none" stroke="currentColor" stroke-width="1.8"/><path class="eye-slash" d="M4 4l16 16" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/></svg></button></div></label>
              <button class="auth-forgot" type="button" data-auth-switch="recover">¿Olvidaste tu contraseña?</button>
              <button class="auth-submit" type="submit">ENTRAR EN NEITH</button>
              <button class="auth-switch-link" type="button" data-auth-switch="register">¿No tienes cuenta? <strong>Regístrate aquí</strong></button>
            </form>
            <form class="auth-form" data-auth-form="register" hidden novalidate>
              <label>Nombre de usuario<input name="display_name" type="text" autocomplete="nickname" required maxlength="40" placeholder="Tu nombre en Neith"></label>
              <label>Correo electrónico<input name="email" type="email" autocomplete="email" required placeholder="tu@correo.com"></label>
              <label>Contraseña<div class="password-field"><input name="password" type="password" autocomplete="new-password" required minlength="8" placeholder="Mínimo 8 caracteres"><button class="password-toggle" type="button" data-password-toggle aria-label="Mostrar contraseña" aria-pressed="false"><svg class="password-eye" viewBox="0 0 24 24" aria-hidden="true"><path class="eye-open" d="M2.4 12s3.4-6 9.6-6 9.6 6 9.6 6-3.4 6-9.6 6-9.6-6-9.6-6Z" fill="none" stroke="currentColor" stroke-width="1.8"/><circle class="eye-open" cx="12" cy="12" r="2.7" fill="none" stroke="currentColor" stroke-width="1.8"/><path class="eye-slash" d="M4 4l16 16" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/></svg></button></div></label>
              <button class="auth-submit" type="submit">CREAR CUENTA</button>
            </form>
            <form class="auth-form" data-auth-form="recover" hidden novalidate>
              <div class="auth-recovery-copy"><strong>RECUPERAR ACCESO</strong><span>Te enviaremos un enlace seguro para crear una nueva contraseña.</span></div>
              <label>Correo electrónico<input name="email" type="email" autocomplete="email" required placeholder="tu@correo.com"></label>
              <button class="auth-submit" type="submit">ENVIAR ENLACE DE RECUPERACIÓN</button>
              <button class="auth-switch-link" type="button" data-auth-switch="login">← Volver a iniciar sesión</button>
            </form>
            <div class="auth-separator" ${oauthEnabled ? '' : 'hidden'}><span>O CONTINÚA CON</span></div>
            <div class="auth-socials" ${oauthEnabled ? '' : 'hidden'}>
              <button type="button" class="social google" data-oauth="google"><span class="social-icon google-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path fill="#4285F4" d="M21.6 12.2c0-.7-.1-1.4-.2-2H12v3.8h5.4a4.6 4.6 0 0 1-2 3v2.5h3.3c1.9-1.8 2.9-4.4 2.9-7.3Z"/><path fill="#34A853" d="M12 22c2.7 0 5-.9 6.7-2.4l-3.3-2.5c-.9.6-2.1 1-3.4 1-2.6 0-4.8-1.8-5.6-4.2H3v2.6A10 10 0 0 0 12 22Z"/><path fill="#FBBC05" d="M6.4 13.9A6 6 0 0 1 6.1 12c0-.7.1-1.3.3-1.9V7.5H3A10 10 0 0 0 2 12c0 1.6.4 3.1 1 4.5l3.4-2.6Z"/><path fill="#EA4335" d="M12 5.9c1.5 0 2.8.5 3.8 1.5l2.9-2.8A9.7 9.7 0 0 0 3 7.5l3.4 2.6C7.2 7.7 9.4 5.9 12 5.9Z"/></svg></span><b>Continuar con Google</b></button>
              <button type="button" class="social discord" data-oauth="discord"><span class="social-icon discord-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path fill="currentColor" d="M19.7 5.3A18 18 0 0 0 15.3 4l-.5 1a16 16 0 0 0-5.6 0l-.5-1a18 18 0 0 0-4.4 1.3C1.5 9.5.7 13.6 1.1 17.6A18 18 0 0 0 6.5 20l1.3-1.8a12 12 0 0 1-2-.9l.5-.4c3.8 1.8 7.6 1.8 11.4 0l.5.4c-.6.4-1.3.7-2 .9l1.3 1.8a18 18 0 0 0 5.4-2.4c.5-4.6-.8-8.7-3.2-12.3ZM8.2 15.2c-1.1 0-2-1-2-2.2s.9-2.2 2-2.2 2.1 1 2 2.2c0 1.2-.9 2.2-2 2.2Zm7.6 0c-1.1 0-2-1-2-2.2s.9-2.2 2-2.2 2.1 1 2 2.2c0 1.2-.9 2.2-2 2.2Z"/></svg></span><b>Continuar con Discord</b></button>
            </div>
            <p class="auth-message" data-auth-message></p>
            <p class="auth-config-note" ${configured ? 'hidden' : ''}>Modo visual activo. Pega tu <strong>Project URL</strong> y tu <strong>anon/public key</strong> en <code>js/supabase-config.js</code>. Después activa Google y Discord en Supabase Authentication → Providers.</p>
          </section>
        </div>
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
      if (download) actions.insertBefore(button, download); else actions.prepend(button);
    });

    document.querySelectorAll('[data-auth-nav]').forEach(button => {
      if (button.dataset.authBound === '1') return;
      button.dataset.authBound = '1';
      button.addEventListener('click', () => {
        if (state.session?.user) window.location.href = '/dashboard/';
        else openAuth('login');
      });
    });
  }

  function openAuth(tab = 'login') {
    injectAuthUI();
    setTab(tab);
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
    setMessage('');
  }

  function setMessage(message, type = '') {
    const el = document.querySelector('[data-auth-message]');
    if (!el) return;
    el.textContent = message;
    el.dataset.type = type;
  }

  async function loadProfile() {
    if (!state.client || !state.session?.user) return null;
    const { data, error } = await state.client
      .from('profiles')
      .select('display_name,avatar_url,plan,subscription_status')
      .eq('id', state.session.user.id)
      .maybeSingle();
    if (!error) state.profile = data || null;
    return state.profile;
  }

  function syncUI() {
    const user = state.session?.user;
    document.querySelectorAll('[data-auth-nav]').forEach(btn => {
      const label = btn.querySelector('[data-auth-nav-label]');
      btn.classList.toggle('signed-in', Boolean(user));
      if (!user) {
        btn.style.removeProperty('--avatar');
        if (label) label.textContent = 'INICIAR SESIÓN';
        return;
      }
      const avatar = avatarUrl(user) || state.profile?.avatar_url || '';
      const name = state.profile?.display_name || displayName(user);
      if (label) label.textContent = name;
      if (avatar) btn.style.setProperty('--avatar', `url("${avatar.replace(/"/g, '%22')}")`);
      else btn.style.removeProperty('--avatar');
      btn.dataset.initials = initials(user);
    });

    const plan = (state.profile?.plan || 'free').toUpperCase();
    const subscription = state.profile?.subscription_status || (plan === 'PREMIUM' ? 'active' : 'free');
    document.querySelectorAll('[data-dashboard-name]').forEach(el => el.textContent = user ? (state.profile?.display_name || displayName(user)) : 'Usuario');
    document.querySelectorAll('[data-dashboard-email]').forEach(el => el.textContent = user?.email || '—');
    document.querySelectorAll('[data-dashboard-plan]').forEach(el => {
      el.textContent = plan === 'PREMIUM' ? 'USUARIO PREMIUM ACTIVADO' : 'USUARIO FREE';
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
      window.location.replace('/?login=1');
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
    button.setAttribute('aria-label', revealing ? 'Ocultar contraseña' : 'Mostrar contraseña');
    button.classList.toggle('is-visible', revealing);
  }

  async function handleAuthForm(form) {
    if (!configured) {
      setMessage('Configura Supabase para activar el registro y el inicio de sesión reales.', 'warning');
      return;
    }
    const submit = form.querySelector('button[type="submit"]');
    submit.disabled = true;
    const original = submit.textContent;
    submit.textContent = 'CONECTANDO…';
    setMessage('');
    try {
      const data = Object.fromEntries(new FormData(form));
      if (form.dataset.authForm === 'register') {
        const { error } = await state.client.auth.signUp({
          email: data.email,
          password: data.password,
          options: { data: { display_name: data.display_name } }
        });
        if (error) throw error;
        form.reset();
        setMessage('Cuenta creada. Revisa tu correo y confirma tu dirección antes de iniciar sesión.', 'success');
      } else if (form.dataset.authForm === 'recover') {
        const redirectTo = siteUrl('reset-password/');
        const { error } = await state.client.auth.resetPasswordForEmail(data.email, { redirectTo });
        if (error) throw error;
        form.reset();
        setMessage('Si existe una cuenta con ese correo, recibirás un enlace para crear una nueva contraseña.', 'success');
      } else {
        const { error } = await state.client.auth.signInWithPassword({ email: data.email, password: data.password });
        if (error) throw error;
        closeAuth();
      }
    } catch (error) {
      setMessage(error?.message || 'No se pudo completar la operación.', 'error');
    } finally {
      submit.disabled = false;
      submit.textContent = original;
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
    await state.client.auth.signOut();
    window.location.href = siteUrl('');
  }

  async function initAuth() {
    injectAuthUI();

    document.addEventListener('click', e => {
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
    });

    document.addEventListener('submit', e => {
      const form = e.target.closest('[data-auth-form]');
      if (!form) return;
      e.preventDefault();
      handleAuthForm(form);
    });

    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') closeAuth();
    });

    const url = new URL(window.location.href);
    if (url.searchParams.get('login') === '1') openAuth('login');
    if (url.searchParams.get('register') === '1') openAuth('register');

    if (configured) {
      const { data } = await state.client.auth.getSession();
      state.session = data.session;
      await loadProfile();
      syncUI();
      await requireDashboardSession();

      state.client.auth.onAuthStateChange(async (_event, session) => {
        state.session = session;
        state.profile = null;
        await loadProfile();
        syncUI();
        await requireDashboardSession();
      });
    } else {
      syncUI();
      await requireDashboardSession();
    }
  }

  window.NeithAuth = {
    get configured() { return configured; },
    get client() { return state.client; },
    get session() { return state.session; },
    get profile() { return state.profile; },
    open: openAuth,
    close: closeAuth,
    refreshProfile: async () => { await loadProfile(); syncUI(); return state.profile; }
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initAuth, { once: true });
  else initAuth();
})();

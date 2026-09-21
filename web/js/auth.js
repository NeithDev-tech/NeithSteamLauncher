(() => {
  'use strict';
  const scriptUrl = document.currentScript?.src || '';
  const siteBase = (() => {
    try { return new URL('../', scriptUrl || window.location.href); }
    catch { return new URL('./', window.location.href); }
  })();
  const siteUrl = path => new URL(String(path || '').replace(/^\/+/, ''), siteBase).href;


  const cfg = window.NEITH_CONFIG || {};
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
    const name = user?.user_metadata?.display_name || user?.user_metadata?.full_name || user?.email || 'N';
    return name.trim().split(/\s+/).slice(0,2).map(x => x[0]?.toUpperCase() || '').join('') || 'N';
  }

  function displayName(user) {
    return user?.user_metadata?.display_name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Usuario';
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
              <label>Contraseña<input name="password" type="password" autocomplete="current-password" required minlength="8" placeholder="••••••••"></label>
              <button class="auth-submit" type="submit">ENTRAR EN NEITH</button>
              <button class="auth-switch-link" type="button" data-auth-switch="register">¿No tienes cuenta? <strong>Regístrate aquí</strong></button>
            </form>
            <form class="auth-form" data-auth-form="register" hidden novalidate>
              <label>Nombre de usuario<input name="display_name" type="text" autocomplete="nickname" required maxlength="40" placeholder="Tu nombre en Neith"></label>
              <label>Correo electrónico<input name="email" type="email" autocomplete="email" required placeholder="tu@correo.com"></label>
              <label>Contraseña<input name="password" type="password" autocomplete="new-password" required minlength="8" placeholder="Mínimo 8 caracteres"></label>
              <button class="auth-submit" type="submit">CREAR CUENTA</button>
            </form>
            <div class="auth-separator"><span>O CONTINÚA CON</span></div>
            <div class="auth-socials">
              <button type="button" class="social google" data-oauth="google"><span class="social-icon google-icon" aria-hidden="true">G</span><b>Iniciar sesión con Google</b></button>
              <button type="button" class="social discord" data-oauth="discord"><span class="social-icon discord-icon" aria-hidden="true">◈</span><b>Iniciar sesión con Discord</b></button>
            </div>
            <p class="auth-message" data-auth-message></p>
            <p class="auth-config-note" ${configured ? 'hidden' : ''}>Modo de interfaz activo. Añade tus credenciales públicas de Supabase en <code>js/supabase-config.js</code> para activar el acceso real.</p>
          </section>
        </div>
      `);
    }

    document.querySelectorAll('.navlinks').forEach(nav => {
      if (nav.querySelector('[data-auth-nav]')) return;
      const download = [...nav.children].find(el => el.matches('a.btn.primary'));
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'nav-auth-button';
      button.dataset.authNav = '';
      button.innerHTML = '<span class="nav-auth-led"></span><span data-auth-nav-label>INICIAR SESIÓN</span>';
      if (download) nav.insertBefore(button, download); else nav.appendChild(button);
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
        setMessage('Cuenta creada. Revisa tu correo si la confirmación está activada.', 'success');
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
    const redirectTo = siteUrl('dashboard/');
    const { error } = await state.client.auth.signInWithOAuth({ provider, options: { redirectTo } });
    if (error) setMessage(error.message, 'error');
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

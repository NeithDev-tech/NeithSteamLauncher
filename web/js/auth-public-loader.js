(() => {
  'use strict';

  const current = document.currentScript;
  const scriptUrl = current?.src || new URL('./js/auth-public-loader.js', location.href).href;
  const jsBase = new URL('./', scriptUrl);
  const src = name => new URL(name, jsBase).href;

  // R231: Hour Boost uses a different FREE/PREMIUM section class.
  // Mark it before header-controller runs so it uses the same donation replacement
  // already working in Boost PC, Achievements, Free Games and Accounts.
  const hourBoostPlans = document.querySelector('.hb136-plans');
  if (hourBoostPlans) hourBoostPlans.classList.add('bp172-plans');

  const SUPABASE_CDN = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
  let loadPromise = null;

  function hasPersistedSession() {
    try {
      for (const key of Object.keys(localStorage)) {
        if (!/^sb-.*-auth-token$/i.test(key)) continue;
        const raw = localStorage.getItem(key);
        if (!raw) continue;
        let parsed;
        try { parsed = JSON.parse(raw); } catch { continue; }
        const candidates = [
          parsed,
          parsed?.currentSession,
          parsed?.session,
          parsed?.data?.session
        ];
        if (candidates.some(s => s?.access_token && s?.user?.id)) return true;
      }
    } catch {}
    return false;
  }

  function needsImmediateAuth() {
    const href = String(location.href);
    if (hasPersistedSession()) return true;
    if (/[?&](?:login|register)=1(?:&|$)/i.test(location.search)) return true;
    if (/(?:[?#&](?:type|flow)=recovery(?:[&#]|$))/i.test(href)) return true;
    return false;
  }

  function addScript(url) {
    return new Promise((resolve, reject) => {
      const existing = [...document.scripts].find(s => s.src === url);
      if (existing) {
        if (existing.dataset.neithLoaded === '1') return resolve();
        existing.addEventListener('load', resolve, {once:true});
        existing.addEventListener('error', reject, {once:true});
        return;
      }

      const s = document.createElement('script');
      s.src = url;
      s.async = true;
      s.dataset.neithAuthLazy = '1';
      s.addEventListener('load', () => {
        s.dataset.neithLoaded = '1';
        resolve();
      }, {once:true});
      s.addEventListener('error', reject, {once:true});
      document.head.appendChild(s);
    });
  }

  function setBusy(value) {
    document.querySelectorAll('[data-auth-nav]').forEach(el => {
      if (value) el.setAttribute('aria-busy', 'true');
      else el.removeAttribute('aria-busy');
    });
  }

  async function loadAuthStack() {
    if (window.NeithAuth && !window.NeithAuth.__lazyStub) return window.NeithAuth;
    if (loadPromise) return loadPromise;

    setBusy(true);

    loadPromise = (async () => {
      await addScript(SUPABASE_CDN);
      await addScript(src('supabase-config.js?v=20260922-oauth-v8'));
      await addScript(src('auth.js?v=20261017-r187-owner-only-admin-menu'));

      if (!window.NeithAuth || window.NeithAuth.__lazyStub) {
        throw new Error('Neith Auth no pudo inicializarse.');
      }
      return window.NeithAuth;
    })().finally(() => setBusy(false));

    return loadPromise;
  }

  const stub = {
    __lazyStub: true,
    configured: true,
    client: null,
    session: null,
    profile: null,

    async open(mode = 'login') {
      const auth = await loadAuthStack();
      return auth.open?.(mode);
    },
    async close() {
      const auth = await loadAuthStack();
      return auth.close?.();
    },
    async handleHeaderTrigger(trigger) {
      const auth = await loadAuthStack();
      return auth.handleHeaderTrigger?.(trigger);
    },
    async openAccountMenu(trigger) {
      const auth = await loadAuthStack();
      return auth.openAccountMenu?.(trigger);
    },
    async closeAccountMenu() {
      const auth = await loadAuthStack();
      return auth.closeAccountMenu?.();
    },
    async toggleAccountMenu(trigger) {
      const auth = await loadAuthStack();
      return auth.toggleAccountMenu?.(trigger);
    },
    async syncUI() {
      const auth = await loadAuthStack();
      return auth.syncUI?.();
    },
    async getAdminRole(options) {
      const auth = await loadAuthStack();
      return auth.getAdminRole?.(options);
    },
    async refreshProfile() {
      const auth = await loadAuthStack();
      return auth.refreshProfile?.();
    },
    load: loadAuthStack
  };

  window.NeithAuth = stub;
  window.NeithLoadAuth = loadAuthStack;

  if (needsImmediateAuth()) {
    loadAuthStack().catch(error => {
      console.warn('[NEITH AUTH] Carga diferida no disponible:', error?.message || error);
    });
  }
})();
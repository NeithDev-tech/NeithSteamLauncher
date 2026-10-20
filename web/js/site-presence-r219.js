/* Neith R219 — privacy-light live site presence heartbeat.
   Tracks one anonymous browser UUID or the current authenticated Neith user.
   No IP address is stored by this feature. */
(() => {
  'use strict';

  const SUPABASE_URL = 'https://nsqhfbyxqcmdthvptuzp.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_bRJYGXCPI6M9I4o_egb5WA_n7ZIEASg';
  const STORAGE_KEY = 'neith_site_presence_visitor_v1';
  const HEARTBEAT_MS = 30000;
  let busy = false;

  const uuid = () => {
    if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
    const b = new Uint8Array(16);
    globalThis.crypto?.getRandomValues?.(b);
    b[6] = (b[6] & 0x0f) | 0x40;
    b[8] = (b[8] & 0x3f) | 0x80;
    const h = [...b].map(x => x.toString(16).padStart(2, '0')).join('');
    return `${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20)}`;
  };

  const getVisitorId = () => {
    try {
      let id = localStorage.getItem(STORAGE_KEY);
      if (!/^[0-9a-f-]{36}$/i.test(id || '')) {
        id = uuid();
        localStorage.setItem(STORAGE_KEY, id);
      }
      return id;
    } catch {
      return uuid();
    }
  };

  const deepToken = value => {
    if (!value || typeof value !== 'object') return '';
    if (typeof value.access_token === 'string' && value.access_token) return value.access_token;
    for (const key of ['currentSession','session','data']) {
      const found = deepToken(value[key]);
      if (found) return found;
    }
    return '';
  };

  const persistedToken = () => {
    try {
      for (const key of Object.keys(localStorage)) {
        if (!/^sb-.*-auth-token$/i.test(key)) continue;
        const raw = localStorage.getItem(key);
        if (!raw) continue;
        try {
          const token = deepToken(JSON.parse(raw));
          if (token) return token;
        } catch {}
      }
    } catch {}
    return '';
  };

  const refreshedToken = async () => {
    const stored = persistedToken();
    if (!stored) return '';
    try {
      if (typeof window.NeithLoadAuth === 'function') {
        const auth = await window.NeithLoadAuth();
        const direct = auth?.session?.access_token || '';
        if (direct) return direct;
        const { data } = await auth?.client?.auth?.getSession?.() || {};
        return data?.session?.access_token || stored;
      }
    } catch {}
    return stored;
  };

  const getAccessToken = async () => (await refreshedToken()) || SUPABASE_KEY;

  const callPing = async token => {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/neith_presence_ping`, {
      method: 'POST',
      mode: 'cors',
      cache: 'no-store',
      credentials: 'omit',
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${token || SUPABASE_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        p_visitor_id: getVisitorId(),
        p_page_path: `${location.pathname || '/'}${location.search || ''}`.slice(0, 180)
      })
    });
    return response;
  };

  const ping = async () => {
    if (busy || document.visibilityState === 'hidden') return;
    busy = true;
    try {
      const token = await getAccessToken();
      let response = await callPing(token);
      if (!response.ok && token !== SUPABASE_KEY) {
        response = await callPing(SUPABASE_KEY);
      }
    } catch {
      // Presence is informational only and must never interfere with the site.
    } finally {
      busy = false;
    }
  };

  window.NeithSitePresence = Object.freeze({
    getAccessToken,
    getVisitorId,
    ping
  });

  const start = () => {
    ping();
    setInterval(ping, HEARTBEAT_MS);
    window.addEventListener('focus', ping, { passive: true });
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') ping();
    }, { passive: true });
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();

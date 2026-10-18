/* Neith R191 — anonymous unique visitor counter.
   One persistent browser UUID = one unique visitor. No IP address is stored. */
(() => {
  'use strict';

  const TARGET = document.querySelector('[data-unique-visitors]');
  if (!TARGET) return;

  const SUPABASE_URL = 'https://nsqhfbyxqcmdthvptuzp.supabase.co';
  const SUPABASE_ANON_KEY = 'sb_publishable_bRJYGXCPI6M9I4o_egb5WA_n7ZIEASg';
  const STORAGE_KEY = 'neith_unique_visitor_id_v1';

  const uuidV4 = () => {
    if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
    const bytes = new Uint8Array(16);
    globalThis.crypto?.getRandomValues?.(bytes);
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = [...bytes].map((value) => value.toString(16).padStart(2, '0')).join('');
    return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
  };

  const getVisitorId = () => {
    try {
      let id = localStorage.getItem(STORAGE_KEY);
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id || '')) {
        id = uuidV4();
        localStorage.setItem(STORAGE_KEY, id);
      }
      return id;
    } catch {
      return uuidV4();
    }
  };

  const paint = (total) => {
    if (!Number.isFinite(total) || total < 0) return;
    const value = Math.trunc(total).toLocaleString(document.documentElement.lang === 'en' ? 'en-US' : 'es-ES');
    const valueNode = TARGET.querySelector('[data-unique-visitors-value]');
    const labelNode = TARGET.querySelector('[data-unique-visitors-label]');
    if (valueNode) valueNode.textContent = value;
    if (labelNode) labelNode.textContent = document.documentElement.lang === 'en' ? 'VISITORS' : 'VISITANTES';
    TARGET.hidden = false;
  };

  const register = async () => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4500);
    try {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/register_site_visitor`, {
        method: 'POST',
        mode: 'cors',
        cache: 'no-store',
        credentials: 'omit',
        signal: controller.signal,
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ p_visitor_id: getVisitorId() })
      });
      if (!response.ok) return;
      const payload = await response.json();
      const total = typeof payload === 'number' ? payload : Number(payload);
      paint(total);
    } catch {
      // Counter is decorative; network failure must never affect the page.
    } finally {
      clearTimeout(timeout);
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', register, { once: true });
  } else {
    register();
  }
})();

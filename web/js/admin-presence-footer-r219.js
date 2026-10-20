/* Neith R219 — owner-only live site activity footer. */
(() => {
  'use strict';

  const root = document.querySelector('[data-neith-admin-presence]');
  if (!root) return;

  const SUPABASE_URL = 'https://nsqhfbyxqcmdthvptuzp.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_bRJYGXCPI6M9I4o_egb5WA_n7ZIEASg';
  const els = {
    total: root.querySelector('[data-presence-total]'),
    membersCount: root.querySelector('[data-presence-members-count]'),
    guests: root.querySelector('[data-presence-guests]'),
    members: root.querySelector('[data-presence-members]'),
    newest: root.querySelector('[data-presence-newest]'),
    updated: root.querySelector('[data-presence-updated]'),
    state: root.querySelector('[data-presence-state]')
  };

  let ownerConfirmed = false;
  let busy = false;

  const escapeHtml = value => String(value ?? '').replace(/[&<>'"]/g, ch => ({
    '&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'
  })[ch]);

  const getToken = async () => {
    try {
      if (window.NeithSitePresence?.getAccessToken) {
        const token = await window.NeithSitePresence.getAccessToken();
        if (token && token !== SUPABASE_KEY) return token;
      }
      if (typeof window.NeithLoadAuth === 'function') {
        const auth = await window.NeithLoadAuth();
        const direct = auth?.session?.access_token;
        if (direct) return direct;
        const { data } = await auth?.client?.auth?.getSession?.() || {};
        return data?.session?.access_token || '';
      }
    } catch {}
    return '';
  };

  const formatTime = iso => {
    if (!iso) return '—';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleTimeString(document.documentElement.lang === 'es' ? 'es-ES' : 'en-GB', { hour:'2-digit', minute:'2-digit', second:'2-digit' });
  };

  const render = data => {
    const total = Number(data?.active_total || 0);
    const membersCount = Number(data?.active_members || 0);
    const guests = Number(data?.active_guests || 0);
    const members = Array.isArray(data?.members) ? data.members : [];

    els.total.textContent = String(total);
    els.membersCount.textContent = String(membersCount);
    els.guests.textContent = String(guests);
    els.newest.textContent = data?.newest_member || '—';
    els.updated.textContent = formatTime(data?.refreshed_at);
    els.state.textContent = 'LIVE';

    if (members.length) {
      els.members.innerHTML = members.map(item => `<span class="neith-admin-presence-user"><i></i>${escapeHtml(item?.name || 'Member')}</span>`).join('');
    } else {
      els.members.innerHTML = '<span class="neith-admin-presence-empty">No registered members are active right now.</span>';
    }

    root.hidden = false;
    root.setAttribute('aria-hidden', 'false');
  };

  const refresh = async () => {
    if (busy) return;
    busy = true;
    try {
      await window.NeithSitePresence?.ping?.();
      const token = await getToken();
      if (!token) {
        if (!ownerConfirmed) root.hidden = true;
        return;
      }
      const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/neith_owner_presence_snapshot`, {
        method: 'POST',
        mode: 'cors',
        cache: 'no-store',
        credentials: 'omit',
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: '{}'
      });
      if (!response.ok) {
        ownerConfirmed = false;
        root.hidden = true;
        root.setAttribute('aria-hidden', 'true');
        return;
      }
      const payload = await response.json();
      ownerConfirmed = true;
      render(payload);
    } catch {
      if (ownerConfirmed) els.state.textContent = 'RECONNECTING';
      else root.hidden = true;
    } finally {
      busy = false;
    }
  };

  const start = () => {
    refresh();
    setInterval(refresh, 15000);
    window.addEventListener('focus', refresh, { passive: true });
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') refresh();
    }, { passive: true });
    window.addEventListener('storage', refresh, { passive: true });
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();

/* Neith V39 — OWNER-only compact analytics console. */
(() => {
  'use strict';

  const esc = (v) => String(v ?? '').replace(/[&<>'"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[c]));
  const nf = (v) => Number(v || 0).toLocaleString('en-US');
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const fmtDate = (v) => {
    const d = new Date(v || 0);
    return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  };
  const fmtTime = (v) => {
    const d = new Date(v || 0);
    return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString('en-GB', { hour: '2-digit', minute: '2-digit' });
  };
  const nicePage = (p) => {
    if (!p || p === '/') return 'HOME';
    return String(p).split('?')[0].replace(/^\/+|\/+$/g, '').replace(/-/g, ' ').toUpperCase() || 'HOME';
  };

  let auth = null, client = null, root = null, timer = 0, busy = false;

  function loadCss() {
    if (document.querySelector('link[data-neith-owner-analytics-v29]')) return;
    const here = document.currentScript?.src || Array.from(document.scripts).find((s) => /neith-owner-analytics-v29\.js/.test(s.src))?.src;
    if (!here) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.dataset.neithOwnerAnalyticsV29 = '1';
    link.href = new URL('../css/neith-owner-analytics-v29.css', here).href;
    document.head.appendChild(link);
  }

  function shell() {
    if (root) return root;
    root = document.createElement('section');
    root.id = 'neith-owner-analytics-v29';
    root.hidden = true;
    root.setAttribute('aria-hidden', 'true');
    root.innerHTML = `
      <div class="na29-wrap">
        <header class="na29-head">
          <div>
            <span>OWNER ONLY · COMPACT LIVE ANALYTICS</span>
            <h2>NEITH SITE INTELLIGENCE</h2>
            <p>Compact real-time control for live visitors, registrations, countries, top pages and launcher interest.</p>
          </div>
          <div class="na29-head-actions">
            <span class="na29-live"><i></i> LIVE</span>
            <button type="button" data-na29-refresh>REFRESH</button>
          </div>
        </header>

        <div class="na29-note" data-na29-note></div>
        <div class="na29-overview" data-na29-overview></div>

        <div class="na29-grid2">
          <section class="na29-panel">
            <div class="na29-panel-head"><span>LIVE SNAPSHOT</span><small data-na29-updated>—</small></div>
            <div class="na29-list na29-list-tight" data-na29-live-list></div>
          </section>

          <section class="na29-panel">
            <div class="na29-panel-head"><span>TOP COUNTRIES · TODAY</span><small>Visitors by location</small></div>
            <div class="na29-list na29-list-tight" data-na29-countries></div>
          </section>

          <section class="na29-panel">
            <div class="na29-panel-head"><span>NEW REGISTRATIONS</span><small>Latest users</small></div>
            <div class="na29-list" data-na29-registrations></div>
          </section>

          <section class="na29-panel">
            <div class="na29-panel-head"><span>POPULAR PAGES</span><small>Traffic focus</small></div>
            <div class="na29-list" data-na29-pages></div>
          </section>
        </div>
      </div>`;
    document.body.appendChild(root);
    root.querySelector('[data-na29-refresh]')?.addEventListener('click', () => refresh(true));
    return root;
  }

  const metric = (label, value, sub = '') => `
    <article class="na29-metric">
      <small>${esc(label)}</small>
      <b>${esc(value)}</b>
      ${sub ? `<span>${esc(sub)}</span>` : ''}
    </article>`;

  const row = (icon, title, subtitle, meta = '') => `
    <div class="na29-row">
      <i>${esc(icon)}</i>
      <span>
        <b>${esc(title)}</b>
        <small>${esc(subtitle || '')}</small>
      </span>
      <em>${esc(meta || '')}</em>
    </div>`;

  function normalizeCountryEntries(raw) {
    if (!raw) return [];
    const list = Array.isArray(raw)
      ? raw
      : Object.entries(raw).map(([country, value]) => {
          if (typeof value === 'number') return { country, visits: value };
          if (value && typeof value === 'object') return { country, ...value };
          return { country, visits: 0 };
        });

    return list.map((item) => {
      const country = item.country || item.country_name || item.name || item.label || item.code || item.country_code || 'Unknown';
      const countryCode = String(item.country_code || item.code || '').slice(0,2).toUpperCase();
      const visits = Number(item.visits ?? item.count ?? item.unique_visitors ?? item.page_views ?? item.sessions ?? 0);
      const unique = Number(item.unique_visitors ?? item.unique ?? item.visitors ?? item.users ?? visits ?? 0);
      return { country: String(country), countryCode, visits, unique };
    }).sort((a, b) => (b.visits - a.visits) || (b.unique - a.unique));
  }

  function registrationsToday(items) {
    const now = new Date();
    return (Array.isArray(items) ? items : []).filter((item) => {
      const d = new Date(item?.created_at || 0);
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
    });
  }

  function render(data) {
    shell();

    const live = data.live || {};
    const today = data.today || {};
    const totals = data.totals || {};
    const registrations = Array.isArray(data.recent_registrations) ? data.recent_registrations : [];
    const pages = Array.isArray(data.top_pages_7d) ? data.top_pages_7d : [];
    const countries = normalizeCountryEntries(
      data.countries_today || data.top_countries_today || data.top_countries || data.countries || data.country_breakdown || data.geo_countries || []
    );
    const todayRegs = registrationsToday(registrations);
    const updatedAt = data.generated_at || Date.now();
    const liveNow = Number(live.visitors || 0);

    root.querySelector('[data-na29-updated]').textContent = `Updated ${fmtDate(updatedAt)}`;
    root.querySelector('[data-na29-note]').textContent = data.tracking_since
      ? `Tracking active since ${fmtDate(data.tracking_since)} · live users, daily visits, total users and recent registrations update automatically.`
      : 'Live users, daily visits, total users and recent registrations update automatically.';

    root.querySelector('[data-na29-overview]').innerHTML = [
      metric('LIVE NOW', nf(liveNow), liveNow > 0 ? 'someone is on the site now' : 'no active visitors now'),
      metric('VISITS TODAY', nf(today.sessions || today.page_views), 'sessions / visits today'),
      metric('UNIQUE TODAY', nf(today.unique_visitors), 'different visitors today'),
      metric('COUNTRIES TODAY', nf(countries.length), countries[0] ? `top: ${countries[0].country}` : 'country data pending'),
      metric('NEW USERS TODAY', nf(today.registrations), todayRegs.length ? `${todayRegs.length} shown below` : 'latest sign-ups'),
      metric('TOTAL USERS', nf(totals.registered_users), 'registered users in total'),
      metric('DOWNLOADS TODAY', nf(today.downloads), 'launcher clicks today'),
      metric('HOT PAGE', nicePage(live.top_page), 'most active right now')
    ].join('');

    root.querySelector('[data-na29-live-list]').innerHTML = [
      row(liveNow > 0 ? 'ON' : 'OFF', liveNow > 0 ? 'WEBSITE ACTIVE' : 'NO LIVE TRAFFIC', `${nf(liveNow)} visitor(s) online right now`, fmtTime(updatedAt)),
      row('M', `MEMBERS ONLINE · ${nf(live.members)}`, 'signed-in users currently browsing', ''),
      row('G', `GUESTS ONLINE · ${nf(live.guests)}`, 'visitors without sign-in', ''),
      row('S', `OPEN SESSIONS · ${nf(live.sessions)}`, 'active page sessions', ''),
      row('P', `HOT PAGE · ${nicePage(live.top_page)}`, 'most active page right now', '')
    ].join('');

    root.querySelector('[data-na29-countries]').innerHTML = countries.length
      ? countries.slice(0, 6).map((c, idx) => {
          const flag = /^[A-Z]{2}$/.test(c.countryCode) ? String.fromCodePoint(...[...c.countryCode].map(ch => 127397 + ch.charCodeAt(0))) : String(idx + 1).padStart(2, '0');
          return row(flag, c.country.toUpperCase(), `${nf(c.unique)} unique · ${nf(c.visits)} visits`, '');
        }).join('')
      : '<p class="na29-empty">Country data is not available yet in the current analytics snapshot.</p>';

    root.querySelector('[data-na29-registrations]').innerHTML = registrations.length
      ? registrations.slice(0, 6).map((x) => row('+', x.name || 'Member', x.email || 'No email shown', fmtDate(x.created_at))).join('')
      : '<p class="na29-empty">No registrations detected yet.</p>';

    root.querySelector('[data-na29-pages]').innerHTML = pages.length
      ? pages.slice(0, 6).map((x, idx) => row(String(idx + 1).padStart(2, '0'), nicePage(x.path), `${nf(x.unique_visitors)} unique visitors`, `${nf(x.page_views)} views`)).join('')
      : '<p class="na29-empty">No page traffic data available yet.</p>';

    root.hidden = false;
    root.setAttribute('aria-hidden', 'false');
  }

  async function ensureAuth() {
    for (let i = 0; i < 100; i += 1) {
      try {
        auth = typeof window.NeithLoadAuth === 'function' ? await window.NeithLoadAuth() : window.NeithAuth;
        if (auth?.client) {
          client = auth.client;
          return true;
        }
      } catch {}
      await wait(50);
    }
    return false;
  }

  async function refresh() {
    if (busy) return;
    busy = true;
    try {
      if (!client && !(await ensureAuth())) return;
      const session = auth?.session || (await client.auth.getSession())?.data?.session;
      if (!session?.user) {
        if (root) root.hidden = true;
        return;
      }
      const { data: isOwner, error: ownerError } = await client.rpc('neith_is_owner');
      if (ownerError || isOwner !== true) {
        if (root) root.hidden = true;
        return;
      }
      shell();
      const [snapshotResult, countriesResult, presenceResult] = await Promise.all([
        client.rpc('neith_owner_analytics_snapshot', { p_days: 14 }),
        client.rpc('neith_owner_country_stats_today'),
        client.rpc('neith_owner_presence_snapshot_v2')
      ]);
      if (snapshotResult.error) throw snapshotResult.error;
      const payload = snapshotResult.data || {};
      payload.countries_today = countriesResult?.error ? [] : (countriesResult?.data || []);
      const presence = presenceResult?.error ? null : presenceResult?.data;
      if (presence) {
        payload.live = {
          ...(payload.live || {}),
          visitors: Number(presence.active_total || 0),
          members: Number(presence.active_members || 0),
          guests: Number(presence.active_guests || 0),
          sessions: Number(presence.active_sessions || 0),
          top_page: presence.top_page || payload.live?.top_page || '—'
        };
      }
      render(payload);
    } catch (err) {
      if (root) {
        root.hidden = true;
        console.warn('[NEITH OWNER ANALYTICS]', err?.message || err);
      }
    } finally {
      busy = false;
    }
  }

  async function start() {
    loadCss();
    await refresh();
    timer = setInterval(() => {
      if (document.visibilityState === 'visible') refresh();
    }, 4000);
    window.addEventListener('focus', () => refresh(), { passive: true });
    window.addEventListener('neith:analytics-updated', () => setTimeout(() => refresh(), 250), { passive: true });
    window.addEventListener('neith:presence-live-ping', () => setTimeout(() => refresh(), 120), { passive: true });
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') refresh();
    }, { passive: true });
    window.addEventListener('pagehide', () => clearInterval(timer), { once: true });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();

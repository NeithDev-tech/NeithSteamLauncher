(() => {
  'use strict';

  const ownerCache = new Map();

  function sanitize(root = document) {
    root.querySelectorAll?.('[data-auth-nav]').forEach(btn => {
      btn.removeAttribute('href');
      btn.removeAttribute('onclick');
      btn.removeAttribute('target');
      if (btn.tagName === 'BUTTON') btn.type = 'button';
    });
  }

  function ensurePremiumStyle() {
    if (document.getElementById('neith-premium-owner-shortcut-style')) return;
    const style = document.createElement('style');
    style.id = 'neith-premium-owner-shortcut-style';
    style.textContent = `.neith-owner-premium-shortcut{display:none;align-items:center;justify-content:center;min-height:38px;padding:0 15px;margin-left:8px;border:1px solid rgba(255,214,84,.38);border-radius:12px;background:linear-gradient(135deg,rgba(93,68,12,.88),rgba(49,36,8,.92));color:#ffe675!important;text-decoration:none!important;font:800 11px/1 Orbitron,Inter,sans-serif;letter-spacing:.055em;box-shadow:inset 0 1px 0 rgba(255,255,255,.04),0 8px 24px rgba(0,0,0,.18);transition:transform .15s ease,border-color .15s ease,box-shadow .15s ease}.neith-owner-premium-shortcut.ready{display:inline-flex}.neith-owner-premium-shortcut:hover{transform:translateY(-1px);border-color:rgba(255,222,106,.72);box-shadow:0 9px 25px rgba(201,147,31,.15)}@media(max-width:980px){.neith-owner-premium-shortcut{margin:7px 0 0;width:100%;min-height:42px}}`;
    document.head.appendChild(style);
  }

  function ensurePublicPurchaseHiddenStyle() {
    if (document.getElementById('neith-hide-public-premium-purchase')) return;
    const style = document.createElement('style');
    style.id = 'neith-hide-public-premium-purchase';
    style.textContent = `
      .neith-plan-dualprice,
      .home44-plan-action-premium,
      .premium147-price-grid,
      .premium147-plan-actions--premium,
      .premium147-store-state,
      .premium147-note,
      .premium147-cta-panel,
      .premium147-pills > span:nth-child(2) {
        display:none !important;
      }
    `;
    document.head.appendChild(style);
  }

  function premiumUrl() {
    const current = new URL(window.location.href);
    const root = `${current.origin}/`;
    return new URL('premium/', root).href;
  }

  function removePremiumShortcut() {
    document.querySelectorAll('[data-owner-premium-shortcut]').forEach(el => el.remove());
  }

  async function syncPremiumShortcut() {
    ensurePremiumStyle();
    const auth = window.NeithAuth;
    const userId = auth?.session?.user?.id;
    if (!auth?.client || !userId) { removePremiumShortcut(); return; }
    let isOwner = ownerCache.get(userId);
    if (typeof isOwner !== 'boolean') {
      try {
        const { data, error } = await auth.client.rpc('neith_is_owner');
        if (error) throw error;
        isOwner = data === true;
      } catch { isOwner = false; }
      ownerCache.set(userId, isOwner);
    }
    if (!isOwner) { removePremiumShortcut(); return; }
    const authBtn = document.querySelector('[data-auth-nav]');
    if (!authBtn) return;
    let link = document.querySelector('[data-owner-premium-shortcut]');
    if (!link) {
      link = document.createElement('a');
      link.dataset.ownerPremiumShortcut = '';
      link.className = 'neith-owner-premium-shortcut';
      link.textContent = 'PREMIUM';
      link.href = premiumUrl();
      authBtn.insertAdjacentElement('afterend', link);
    }
    requestAnimationFrame(() => link.classList.add('ready'));
  }

  // One delegated owner for the account/login control. auth.js owns session state.
  window.addEventListener('click', event => {
    const trigger = event.target.closest?.('[data-auth-nav]');
    if (!trigger) return;

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    sanitize(trigger.ownerDocument || document);

    const auth = window.NeithAuth;
    if (auth?.handleHeaderTrigger) auth.handleHeaderTrigger(trigger);
    else if (auth?.session?.user) auth.toggleAccountMenu?.(trigger);
    else auth?.open?.('login');
  }, true);

  function boot() {
    sanitize(document);
    ensurePremiumStyle();
    ensurePublicPurchaseHiddenStyle();
    syncPremiumShortcut();

    // Headers are static in Neith. Watching the whole document made every dynamic
    // card/list mutation pass through this controller. Observe only the header so
    // account-button replacements remain safe without taxing the rest of the page.
    const header = document.querySelector('.topbar');
    if (!header || !('MutationObserver' in window)) return;
    const observer = new MutationObserver(records => {
      let authChanged = false;
      for (const record of records) {
        for (const node of record.addedNodes) {
          if (node.nodeType !== Node.ELEMENT_NODE) continue;
          if (node.matches?.('[data-auth-nav]')) { sanitize(node.parentElement || header); authChanged = true; }
          else if (node.querySelector?.('[data-auth-nav]')) { sanitize(node); authChanged = true; }
        }
      }
      if (authChanged) syncPremiumShortcut();
    });
    observer.observe(header, { subtree: true, childList: true });
  }

  window.addEventListener('neith:authchange', event => {
    const userId = event?.detail?.session?.user?.id;
    if (!userId) ownerCache.clear();
    syncPremiumShortcut();
  });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();

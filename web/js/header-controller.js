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

  function keepVacLiveLabel() {
    document.querySelectorAll('.navlinks a[href*="vac-live"]').forEach(link => {
      if (link.textContent !== 'VAC LIVE') link.textContent = 'VAC LIVE';
    });
  }

  function removePublicPremiumPurchaseUi() {
    if (location.pathname.includes('/admin/') || location.pathname.includes('/premium/')) return;

    const selectors = [
      '[data-premium-checkout]',
      '.neith-plan-dualprice',
      '.home44-plan-action-premium',
      '.premium147-price-grid',
      '.premium147-plan-actions--premium',
      '.premium147-store-state',
      '.premium147-note',
      '.premium147-cta-panel'
    ];
    document.querySelectorAll(selectors.join(',')).forEach(el => el.remove());

    document.querySelectorAll('.premium147-pills span').forEach(el => {
      if (/paypal/i.test(el.textContent || '')) el.remove();
    });

    document.querySelectorAll('a,button').forEach(el => {
      if (el.matches('[data-owner-premium-shortcut]')) return;
      const plan = String(el.getAttribute('data-plan') || '').toLowerCase();
      const text = String(el.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase();
      if (plan === 'monthly' || plan === 'annual') { el.remove(); return; }
      if (text === 'view premium' || text === 'ver premium') { el.remove(); return; }
      if ((/€\s*(?:7[.,]99|69[.,]99)/i.test(text)) && /(month|year|mes|año|ano)/i.test(text)) el.remove();
    });
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
    keepVacLiveLabel();
    removePublicPremiumPurchaseUi();
    syncPremiumShortcut();

    const header = document.querySelector('.topbar');
    if (!header || !('MutationObserver' in window)) return;
    const observer = new MutationObserver(records => {
      let authChanged = false;
      for (const record of records) {
        if (record.type === 'characterData') continue;
        for (const node of record.addedNodes || []) {
          if (node.nodeType !== Node.ELEMENT_NODE) continue;
          if (node.matches?.('[data-auth-nav]')) { sanitize(node.parentElement || header); authChanged = true; }
          else if (node.querySelector?.('[data-auth-nav]')) { sanitize(node); authChanged = true; }
        }
      }
      keepVacLiveLabel();
      if (authChanged) syncPremiumShortcut();
    });
    observer.observe(header, { subtree: true, childList: true, characterData: true });
  }

  window.addEventListener('neith:authchange', event => {
    const userId = event?.detail?.session?.user?.id;
    if (!userId) ownerCache.clear();
    keepVacLiveLabel();
    removePublicPremiumPurchaseUi();
    syncPremiumShortcut();
  });

  window.addEventListener('neith:languagechange', () => {
    requestAnimationFrame(() => {
      keepVacLiveLabel();
      removePublicPremiumPurchaseUi();
    });
  });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();

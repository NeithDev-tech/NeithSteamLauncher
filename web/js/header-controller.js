(() => {
  'use strict';

  function sanitize(root = document) {
    root.querySelectorAll?.('[data-auth-nav]').forEach(btn => {
      btn.removeAttribute('href');
      btn.removeAttribute('onclick');
      btn.removeAttribute('target');
      if (btn.tagName === 'BUTTON') btn.type = 'button';
    });
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

    // Headers are static in Neith. Watching the whole document made every dynamic
    // card/list mutation pass through this controller. Observe only the header so
    // account-button replacements remain safe without taxing the rest of the page.
    const header = document.querySelector('.topbar');
    if (!header || !('MutationObserver' in window)) return;
    const observer = new MutationObserver(records => {
      for (const record of records) {
        for (const node of record.addedNodes) {
          if (node.nodeType !== Node.ELEMENT_NODE) continue;
          if (node.matches?.('[data-auth-nav]')) sanitize(node.parentElement || header);
          else if (node.querySelector?.('[data-auth-nav]')) sanitize(node);
        }
      }
    });
    observer.observe(header, { subtree: true, childList: true });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();

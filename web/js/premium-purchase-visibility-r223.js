(() => {
  'use strict';

  // R223: public purchase UI is intentionally disabled while the new PREMIUM
  // acquisition flow is being redesigned. Payment/backend infrastructure stays
  // untouched so existing memberships and admin tooling keep working.
  const removePublicPurchaseUi = () => {
    if (location.pathname.includes('/admin/') || location.pathname.includes('/premium/')) return;

    const remove = selector => document.querySelectorAll(selector).forEach(el => el.remove());

    remove('[data-premium-checkout]');
    remove('.premium147-price-grid');
    remove('.premium147-plan-actions--premium');
    remove('.premium147-store-state');
    remove('.premium147-note');
    remove('.premium147-cta-panel');

    document.querySelectorAll('.premium147-pills span').forEach(el => {
      const text = (el.textContent || '').trim().toLowerCase();
      if (text.includes('paypal')) el.remove();
    });

    // Remove any residual public CTA whose only purpose is a monthly/yearly buy.
    document.querySelectorAll('a,button').forEach(el => {
      if (el.matches('[data-owner-premium-shortcut]')) return;
      const text = (el.textContent || '').replace(/\s+/g,' ').trim().toLowerCase();
      const plan = (el.getAttribute('data-plan') || '').toLowerCase();
      if (plan === 'monthly' || plan === 'annual') { el.remove(); return; }
      if (/€\s*(?:1\.99|7\.99|69\.99)/i.test(text) && /(month|year|mes|año|ano)/i.test(text)) el.remove();
    });
  };

  const boot = () => {
    removePublicPurchaseUi();
    window.addEventListener('neith:languagechange', removePublicPurchaseUi);
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, {once:true});
  else boot();
})();

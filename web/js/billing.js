(() => {
  'use strict';

  document.addEventListener('click', e => {
    const button = e.target.closest('[data-premium-checkout]');
    if (!button) return;
    e.preventDefault();

    if (!window.NeithAuth?.session?.user) {
      window.NeithAuth?.open('login');
      return;
    }

    window.alert(window.NeithI18n?.t('Neith Premium todavía no está a la venta. El sistema de licencias se activará más adelante.') || 'Neith Premium todavía no está a la venta. El sistema de licencias se activará más adelante.');
  });
})();

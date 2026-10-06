(() => {
  'use strict';

  const COPY = 'La tienda LIVE de Neith está pendiente de activación. Tu plan y precios ya están definidos, pero la compra pública se habilitará cuando el procesador de pagos active la tienda.';

  document.addEventListener('click', e => {
    const button = e.target.closest('[data-premium-checkout]');
    if (!button) return;
    e.preventDefault();

    if (!window.NeithAuth?.session?.user) {
      window.NeithAuth?.open('login');
      return;
    }

    window.alert(window.NeithI18n?.t(COPY) || COPY);
  });
})();

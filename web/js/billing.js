(() => {
  'use strict';

  async function startCheckout(button) {
    if (!window.NeithAuth?.configured) {
      window.NeithAuth?.open('login');
      return;
    }
    const session = window.NeithAuth.session;
    if (!session?.access_token) {
      window.NeithAuth.open('login');
      return;
    }

    const old = button.textContent;
    button.disabled = true;
    button.textContent = 'PREPARANDO CHECKOUT…';
    try {
      const response = await fetch(new URL('api/create-checkout-session', window.location.origin + '/').href, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ source: window.location.pathname })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || 'Checkout no disponible todavía.');
      if (!payload.url) throw new Error('Stripe no devolvió una URL de checkout.');
      window.location.href = payload.url;
    } catch (error) {
      window.alert(error.message);
    } finally {
      button.disabled = false;
      button.textContent = old;
    }
  }

  document.addEventListener('click', e => {
    const button = e.target.closest('[data-premium-checkout]');
    if (!button) return;
    e.preventDefault();
    startCheckout(button);
  });
})();

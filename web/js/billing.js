(() => {
  'use strict';

  const DEFAULT_STATE = 'PayPal LIVE activo · pago seguro · renovación automática gestionable desde Neith.';
  const ERROR_PREFIX = 'No se pudo abrir PayPal';

  const stateNode = button => button.closest('.premium147-plan, .neith-plan-card')?.querySelector('.neith-store-state span') || document.querySelector('.premium147-store-state span') || null;
  const setState = (button, text, error=false) => {
    const node = stateNode(button);
    if (!node) return;
    node.textContent = text;
    node.closest('.neith-store-state')?.classList.toggle('is-error', !!error);
  };

  async function currentSession() {
    const client = window.NeithAuth?.client;
    if (!client?.auth?.getSession) return null;
    const {data, error} = await client.auth.getSession();
    if (error) throw error;
    return data?.session || null;
  }

  function safePayPalUrl(raw) {
    const u = new URL(String(raw || ''));
    const host = u.hostname.toLowerCase();
    if (u.protocol !== 'https:' || !(host === 'paypal.com' || host.endsWith('.paypal.com'))) {
      throw new Error('PayPal devolvió una dirección de pago no válida.');
    }
    return u.href;
  }

  async function openCheckout(button) {
    const kind = String(button.dataset.plan || '').toLowerCase();
    if (!['monthly','annual'].includes(kind)) throw new Error('Plan PREMIUM no válido.');

    const session = await currentSession();
    if (!session?.user || !session?.access_token) {
      window.NeithAuth?.open('login');
      return;
    }

    const cfg = window.NEITH_CONFIG || {};
    const base = String(cfg.supabaseUrl || '').replace(/\/+$/,'');
    const anon = String(cfg.supabaseAnonKey || '');
    if (!base.startsWith('https://') || !anon) throw new Error('Neith Billing no está disponible.');

    const response = await fetch(`${base}/functions/v1/paypal-checkout`, {
      method: 'POST',
      cache: 'no-store',
      credentials: 'omit',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
        'apikey': anon
      },
      body: JSON.stringify({kind})
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || data?.ok === false) {
      const raw = String(data?.error || data?.message || `HTTP ${response.status}`);
      if (/auto-renewing subscription is already active/i.test(raw)) {
        throw new Error('Ya tienes una suscripción con renovación automática activa. Cancela su renovación antes de contratar otro plan.');
      }
      if (/Permanent PREMIUM/i.test(raw)) {
        throw new Error('Tu cuenta ya tiene PREMIUM permanente y no necesita otra suscripción.');
      }
      throw new Error(raw);
    }
    return safePayPalUrl(data?.approval_url || data?.url);
  }

  document.addEventListener('click', async e => {
    const button = e.target.closest('[data-premium-checkout]');
    if (!button) return;
    e.preventDefault();
    if (button.disabled) return;

    const original = button.textContent;
    button.disabled = true;
    button.setAttribute('aria-busy','true');
    button.textContent = 'CONECTANDO CON PAYPAL…';
    setState(button, 'Creando checkout seguro en PayPal LIVE…');
    try {
      const approval = await openCheckout(button);
      if (!approval) {
        setState(button, DEFAULT_STATE);
        return;
      }
      setState(button, 'Redirigiendo a PayPal…');
      window.location.assign(approval);
    } catch (error) {
      const message = String(error?.message || error || 'Error desconocido');
      setState(button, `${ERROR_PREFIX}: ${message}`, true);
      window.setTimeout(() => setState(button, DEFAULT_STATE), 9000);
    } finally {
      button.disabled = false;
      button.removeAttribute('aria-busy');
      button.textContent = original;
    }
  });
})();

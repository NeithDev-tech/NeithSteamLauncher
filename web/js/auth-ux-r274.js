(() => {
  'use strict';

  if (window.__NEITH_AUTH_UX_R274__) return;
  window.__NEITH_AUTH_UX_R274__ = true;

  let pendingAction = '';
  let toastTimer = 0;

  function langIsEnglish() {
    return String(document.documentElement.lang || '').toLowerCase().startsWith('en');
  }

  function ensureStyles() {
    if (document.getElementById('neith-auth-ux-r274-style')) return;
    const style = document.createElement('style');
    style.id = 'neith-auth-ux-r274-style';
    style.textContent = `
      .neith-auth-toast-r274 {
        position: fixed;
        inset-block-start: clamp(1rem, 2.5vh, 2rem);
        inset-inline: 50% auto;
        transform: translateX(-50%) translateY(-140%);
        z-index: 2147483000;
        inline-size: min(92vw, 34rem);
        display: grid;
        grid-template-columns: auto minmax(0, 1fr);
        align-items: center;
        gap: .85rem;
        padding: clamp(.8rem, 1.4vw, 1rem) clamp(1rem, 2vw, 1.25rem);
        border: 1px solid rgba(80, 225, 255, .42);
        border-radius: 1rem;
        background: linear-gradient(135deg, rgba(3, 21, 35, .98), rgba(3, 13, 28, .98));
        box-shadow: 0 1rem 3rem rgba(0, 0, 0, .42), 0 0 2rem rgba(35, 211, 255, .12);
        color: #eefcff;
        opacity: 0;
        pointer-events: none;
        transition: transform .28s ease, opacity .28s ease;
        backdrop-filter: blur(14px);
      }
      .neith-auth-toast-r274.is-visible {
        transform: translateX(-50%) translateY(0);
        opacity: 1;
      }
      .neith-auth-toast-r274__icon {
        display: grid;
        place-items: center;
        inline-size: 2.4rem;
        aspect-ratio: 1;
        border-radius: 50%;
        background: rgba(69, 237, 170, .12);
        border: 1px solid rgba(69, 237, 170, .55);
        color: #64f0b1;
        font: 800 1rem/1 system-ui, sans-serif;
      }
      .neith-auth-toast-r274 strong,
      .neith-auth-toast-r274 span { display: block; }
      .neith-auth-toast-r274 strong {
        font: 800 clamp(.78rem, 1.4vw, .92rem)/1.2 'Orbitron', system-ui, sans-serif;
        letter-spacing: .06em;
      }
      .neith-auth-toast-r274 span {
        margin-block-start: .2rem;
        color: rgba(219, 246, 255, .72);
        font: 600 clamp(.75rem, 1.3vw, .86rem)/1.35 'Inter', system-ui, sans-serif;
      }
      @media (max-width: 42rem) {
        .neith-auth-toast-r274 { inline-size: calc(100vw - 1.5rem); }
      }
      @media (prefers-reduced-motion: reduce) {
        .neith-auth-toast-r274 { transition: none; }
      }
    `;
    document.head.appendChild(style);
  }

  function toast(title, detail) {
    ensureStyles();
    let el = document.getElementById('neith-auth-toast-r274');
    if (!el) {
      el = document.createElement('div');
      el.id = 'neith-auth-toast-r274';
      el.className = 'neith-auth-toast-r274';
      el.setAttribute('role', 'status');
      el.setAttribute('aria-live', 'polite');
      el.innerHTML = '<div class="neith-auth-toast-r274__icon">✓</div><div><strong></strong><span></span></div>';
      document.body.appendChild(el);
    }
    el.querySelector('strong').textContent = title;
    el.querySelector('span').textContent = detail;
    clearTimeout(toastTimer);
    requestAnimationFrame(() => el.classList.add('is-visible'));
    toastTimer = setTimeout(() => el.classList.remove('is-visible'), 3600);
  }

  function normalizeAuthMessage(node) {
    if (!(node instanceof HTMLElement) || !node.matches('[data-auth-message]')) return;
    const raw = String(node.textContent || '').trim().toLowerCase();
    if (!raw) return;
    if (raw.includes('request rate limit reached') || raw.includes('over_request_rate_limit') || raw.includes('rate limit')) {
      node.textContent = langIsEnglish()
        ? 'The session service is temporarily saturated. Please try again in a moment.'
        : 'El servicio de sesión está temporalmente saturado. Vuelve a intentarlo en un momento.';
      node.dataset.type = 'error';
    }
  }

  document.addEventListener('submit', event => {
    const form = event.target?.closest?.('[data-auth-form]');
    if (!form) return;
    pendingAction = form.dataset.authForm === 'register' ? 'register' : form.dataset.authForm === 'login' ? 'login' : '';
  }, true);

  window.addEventListener('neith:authchange', event => {
    if (event.detail?.event !== 'SIGNED_IN' || !event.detail?.session?.user || !pendingAction) return;
    const action = pendingAction;
    pendingAction = '';
    if (action === 'register') {
      toast(
        langIsEnglish() ? 'ACCOUNT CREATED' : 'CUENTA CREADA',
        langIsEnglish() ? 'Your Neith ID is ready and you are signed in.' : 'Tu Neith ID está listo y la sesión se ha iniciado correctamente.'
      );
    } else {
      toast(
        langIsEnglish() ? 'SIGNED IN' : 'SESIÓN INICIADA',
        langIsEnglish() ? 'Welcome back. Your Neith account is connected.' : 'Bienvenido de nuevo. Tu cuenta Neith está conectada correctamente.'
      );
    }
  });

  const observer = new MutationObserver(records => {
    for (const record of records) {
      const target = record.target instanceof HTMLElement ? record.target.closest?.('[data-auth-message]') : null;
      if (target) normalizeAuthMessage(target);
      for (const node of record.addedNodes || []) {
        if (!(node instanceof HTMLElement)) continue;
        if (node.matches?.('[data-auth-message]')) normalizeAuthMessage(node);
        node.querySelectorAll?.('[data-auth-message]').forEach(normalizeAuthMessage);
      }
    }
  });

  observer.observe(document.documentElement, { childList: true, subtree: true, characterData: true });
})();

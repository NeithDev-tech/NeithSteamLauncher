(() => {
  'use strict';

  const initStandardGallery = () => {
    const triggers = [...document.querySelectorAll('[data-hourboost-lightbox]')];
    const modal = document.querySelector('[data-hourboost-modal]');
    if (!triggers.length || !modal) return;

    const image = modal.querySelector('[data-hourboost-modal-image]');
    const caption = modal.querySelector('[data-hourboost-caption]');
    const prev = modal.querySelector('[data-hourboost-prev]');
    const next = modal.querySelector('[data-hourboost-next]');
    const closes = [...modal.querySelectorAll('[data-hourboost-close]')];
    if (!image) return;

    let index = 0;
    let lastFocus = null;

    const resolveSrc = (trigger) => {
      const direct = trigger?.dataset?.full;
      if (direct) return new URL(direct, document.baseURI).href;
      const img = trigger?.querySelector('img');
      return img?.currentSrc || img?.src || '';
    };

    const render = (animate = true) => {
      const trigger = triggers[index];
      if (!trigger) return;
      const src = resolveSrc(trigger);
      const text = trigger.dataset.caption || trigger.querySelector('img')?.alt || 'Captura real de Neith';
      image.classList.remove('is-zoomed');
      if (src) image.src = src;
      image.alt = text;
      if (caption) caption.textContent = text;
      if (animate && image.animate) {
        image.animate(
          [{opacity:.3, transform:'scale(.985)'},{opacity:1, transform:'scale(1)'}],
          {duration:220, easing:'cubic-bezier(.2,.8,.2,1)'}
        );
      }
    };

    const open = (idx) => {
      index = Math.max(0, Math.min(triggers.length - 1, idx));
      lastFocus = document.activeElement;
      render(false);
      modal.classList.add('is-open');
      modal.setAttribute('aria-hidden','false');
      document.body.classList.add('hourboost-lightbox-open');
      requestAnimationFrame(() => modal.querySelector('.hourboost-lightbox-close')?.focus({preventScroll:true}));
    };

    const close = () => {
      modal.classList.remove('is-open');
      modal.setAttribute('aria-hidden','true');
      document.body.classList.remove('hourboost-lightbox-open');
      image.classList.remove('is-zoomed');
      if (lastFocus && typeof lastFocus.focus === 'function') lastFocus.focus({preventScroll:true});
    };

    const move = (step) => {
      if (!modal.classList.contains('is-open')) return;
      index = (index + step + triggers.length) % triggers.length;
      render(true);
    };

    // Delegated capture listener: resilient to decorative child overlays and late UI changes.
    document.addEventListener('click', (event) => {
      const trigger = event.target.closest?.('[data-hourboost-lightbox]');
      if (!trigger) return;
      const idx = triggers.indexOf(trigger);
      if (idx < 0) return;
      event.preventDefault();
      open(idx);
    }, true);

    closes.forEach(el => el.addEventListener('click', (event) => {
      event.preventDefault();
      close();
    }));
    prev?.addEventListener('click', (event) => { event.preventDefault(); move(-1); });
    next?.addEventListener('click', (event) => { event.preventDefault(); move(1); });
    image.addEventListener('click', () => image.classList.toggle('is-zoomed'));

    document.addEventListener('keydown', (event) => {
      if (!modal.classList.contains('is-open')) return;
      if (event.key === 'Escape') close();
      else if (event.key === 'ArrowLeft') move(-1);
      else if (event.key === 'ArrowRight') move(1);
    });
  };

  const initAccountsGallery = () => {
    const triggers = [...document.querySelectorAll('[data-accounts-zoom]')];
    const modal = document.querySelector('[data-accounts-lightbox]');
    if (!triggers.length || !modal || modal.dataset.neithGalleryBound === '1') return;
    modal.dataset.neithGalleryBound = '1';

    const image = modal.querySelector('[data-accounts-lightbox-image]');
    const title = modal.querySelector('[data-accounts-lightbox-title]');
    const closeBtn = modal.querySelector('[data-accounts-lightbox-close]');
    if (!image || !title || !closeBtn) return;
    let lastFocus = null;

    const open = (trigger) => {
      lastFocus = document.activeElement;
      const src = trigger.dataset.zoomSrc ? new URL(trigger.dataset.zoomSrc, document.baseURI).href : '';
      if (src) image.src = src;
      image.alt = trigger.getAttribute('aria-label') || 'Captura ampliada de Neith';
      title.textContent = trigger.dataset.zoomTitle || 'CAPTURA REAL DEL LAUNCHER';
      modal.classList.add('is-open');
      modal.setAttribute('aria-hidden','false');
      document.body.classList.add('accounts-lightbox-open');
      requestAnimationFrame(() => closeBtn.focus({preventScroll:true}));
    };
    const close = () => {
      modal.classList.remove('is-open');
      modal.setAttribute('aria-hidden','true');
      document.body.classList.remove('accounts-lightbox-open');
      if (lastFocus && typeof lastFocus.focus === 'function') lastFocus.focus({preventScroll:true});
    };

    document.addEventListener('click', (event) => {
      const trigger = event.target.closest?.('[data-accounts-zoom]');
      if (!trigger) return;
      event.preventDefault();
      open(trigger);
    }, true);
    closeBtn.addEventListener('click', (event) => { event.preventDefault(); close(); });
    modal.addEventListener('click', (event) => { if (event.target === modal) close(); });
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && modal.classList.contains('is-open')) close();
    });
  };

  const init = () => {
    initStandardGallery();
    initAccountsGallery();
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, {once:true});
  else init();
})();

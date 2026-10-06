(() => {
  const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  // Premium launcher tilt: visual-only, tiny amplitude, desktop pointers only.
  const stage = document.querySelector('[data-home45-stage]');
  if (stage && !reduced && window.matchMedia?.('(pointer:fine)').matches) {
    let raf = 0;
    const reset = () => {
      stage.style.setProperty('--rx','0deg');
      stage.style.setProperty('--ry','0deg');
      stage.style.setProperty('--mx','50%');
      stage.style.setProperty('--my','50%');
    };
    stage.addEventListener('pointermove', (ev) => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const r = stage.getBoundingClientRect();
        const x = Math.max(0, Math.min(1, (ev.clientX - r.left) / Math.max(1, r.width)));
        const y = Math.max(0, Math.min(1, (ev.clientY - r.top) / Math.max(1, r.height)));
        const ry = (x - .5) * 2.8;
        const rx = (.5 - y) * 2.0;
        stage.style.setProperty('--rx', `${rx.toFixed(2)}deg`);
        stage.style.setProperty('--ry', `${ry.toFixed(2)}deg`);
        stage.style.setProperty('--mx', `${(x*100).toFixed(1)}%`);
        stage.style.setProperty('--my', `${(y*100).toFixed(1)}%`);
      });
    }, {passive:true});
    stage.addEventListener('pointerleave', reset, {passive:true});
  }

  // Cinematic Steam rail. Native horizontal scroll + autoplay + arrows.
  const viewport = document.querySelector('[data-home45-carousel]');
  const prev = document.querySelector('[data-home45-prev]');
  const next = document.querySelector('[data-home45-next]');
  if (!viewport) return;

  let timer = 0;
  let paused = false;
  let touching = false;
  const originals = 8;
  const cards = [...viewport.querySelectorAll('.home45-game')];
  const step = () => {
    const card = cards[0];
    if (!card) return 250;
    const gap = parseFloat(getComputedStyle(viewport.querySelector('.home45-games-track')).gap || 8);
    return card.getBoundingClientRect().width + gap;
  };
  const halfWidth = () => {
    const track = viewport.querySelector('.home45-games-track');
    if (!track || cards.length < originals * 2) return 0;
    return track.scrollWidth / 2;
  };
  const normalize = () => {
    const half = halfWidth();
    if (!half) return;
    if (viewport.scrollLeft >= half - 2) viewport.scrollLeft -= half;
    if (viewport.scrollLeft < 0) viewport.scrollLeft += half;
  };
  const move = (dir=1) => {
    normalize();
    viewport.scrollBy({left: step() * dir, behavior: reduced ? 'auto' : 'smooth'});
    window.setTimeout(normalize, reduced ? 0 : 520);
  };
  const stop = () => { if (timer) window.clearInterval(timer); timer = 0; };
  const start = () => {
    stop();
    if (reduced) return;
    timer = window.setInterval(() => { if (!paused && !touching && !document.hidden) move(1); }, 3000);
  };
  prev?.addEventListener('click', () => { move(-1); start(); });
  next?.addEventListener('click', () => { move(1); start(); });
  viewport.addEventListener('mouseenter', () => { paused = true; }, {passive:true});
  viewport.addEventListener('mouseleave', () => { paused = false; }, {passive:true});
  viewport.addEventListener('focusin', () => { paused = true; });
  viewport.addEventListener('focusout', () => { paused = false; });
  viewport.addEventListener('pointerdown', () => { touching = true; }, {passive:true});
  window.addEventListener('pointerup', () => { touching = false; }, {passive:true});
  viewport.addEventListener('scroll', () => {
    window.clearTimeout(viewport._neithNormalizeTimer);
    viewport._neithNormalizeTimer = window.setTimeout(normalize, 120);
  }, {passive:true});
  document.addEventListener('visibilitychange', () => { if (!document.hidden) start(); });
  start();
})();

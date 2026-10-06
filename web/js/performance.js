(() => {
  'use strict';

  const root = document.documentElement;
  root.classList.remove('neith-performance-v26', 'neith-performance-v27', 'neith-performance-v28', 'neith-navigating');
  root.classList.add('neith-performance-v30');

  const stats = {
    paintHeavyAnimationsPaused: 0,
    observedZones: 0,
    navigationMode: 'native-bfcache-safe'
  };
  window.NeithPerformance = Object.freeze({ version: 'V30', stats });

  /* Keep background work quiet when the tab is not visible. */
  const syncVisibility = () => root.classList.toggle('neith-page-hidden', document.hidden);
  document.addEventListener('visibilitychange', syncVisibility, { passive: true });
  syncVisibility();

  /* Only animate sections around the viewport. */
  const setupZones = () => {
    const zones = [...document.querySelectorAll('main > section, .section, footer.footer')];
    stats.observedZones = zones.length;
    if (!('IntersectionObserver' in window) || !zones.length) return;

    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) entry.target.classList.toggle('neith-zone-active', entry.isIntersecting);
    }, { rootMargin: '180px 0px 180px 0px', threshold: 0.01 });

    for (const zone of zones) {
      zone.dataset.neithPerfZone = '';
      observer.observe(zone);
    }
  };

  /* Infinite animations that alter filter/shadow/background continuously repaint.
     Freeze those; compositor-safe transform/opacity motion remains available. */
  const SAFE_ANIMATED_PROPS = new Set([
    'offset', 'computedOffset', 'easing', 'composite',
    'transform', 'opacity', 'translate', 'rotate', 'scale'
  ]);

  const pausePaintHeavyAnimations = () => {
    if (typeof document.getAnimations !== 'function') return;
    let paused = 0;
    for (const animation of document.getAnimations({ subtree: true })) {
      try {
        const effect = animation.effect;
        if (!effect?.getTiming || !effect?.getKeyframes) continue;
        if (effect.getTiming().iterations !== Infinity) continue;
        const keys = new Set();
        for (const frame of effect.getKeyframes()) {
          for (const key of Object.keys(frame)) keys.add(key);
        }
        if (![...keys].some(key => !SAFE_ANIMATED_PROPS.has(key))) continue;
        animation.currentTime = 0;
        animation.pause();
        paused++;
      } catch {}
    }
    stats.paintHeavyAnimationsPaused = paused;
  };

  /* V30 deliberately does NOT intercept links and does NOT register beforeunload.
     The browser can keep the old dark document visible until the new dark document
     paints, and is free to use BFCache. This removes the artificial blank-frame
     handoff used by V27/V28. */
  window.addEventListener('pageshow', event => {
    root.classList.remove('neith-navigating');
    if (event.persisted) root.classList.add('neith-restored-from-bfcache');
    requestAnimationFrame(() => root.classList.remove('neith-restored-from-bfcache'));
  }, { passive: true });

  const boot = () => {
    setupZones();
    requestAnimationFrame(() => {
      pausePaintHeavyAnimations();
      const idle = window.requestIdleCallback || (cb => setTimeout(cb, 240));
      idle(pausePaintHeavyAnimations, { timeout: 700 });
    });
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();


/* R62_VISUAL_PERFORMANCE
   R30 already owns visibility tracking via .neith-page-hidden.
   Keep only the idle image-decode helper here to avoid duplicate listeners. */
(() => {
  'use strict';

  const warmLazyImages = () => {
    const images = [...document.querySelectorAll('img[loading="lazy"]')];
    let i = 0;

    const fallbackDeadline = {timeRemaining:()=>8,didTimeout:true};

    const step = deadline => {
      while (i < images.length && (deadline.timeRemaining() > 3 || deadline.didTimeout)) {
        const img = images[i++];
        if (img.complete && img.decode) img.decode().catch(() => {});
      }

      if (i < images.length) {
        if ('requestIdleCallback' in window) {
          requestIdleCallback(step, {timeout:1200});
        } else {
          setTimeout(()=>step(fallbackDeadline),180);
        }
      }
    };

    if ('requestIdleCallback' in window) {
      requestIdleCallback(step, {timeout:1500});
    } else {
      setTimeout(()=>step(fallbackDeadline),220);
    }
  };

  if (document.readyState === 'complete') warmLazyImages();
  else window.addEventListener('load', warmLazyImages, {once:true, passive:true});
})();


/* R63_CRITICAL_PAINT_READY */
(() => {
  const markReady = () => document.documentElement.classList.add('neith-css-ready');
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', markReady, {once:true, passive:true});
  } else {
    markReady();
  }
})();

const menu=document.querySelector('.menu'),nav=document.querySelector('.navlinks');
menu?.addEventListener('click',()=>nav.classList.toggle('open'));
document.querySelectorAll('.navlinks a').forEach(a=>a.addEventListener('click',()=>nav?.classList.remove('open')));

const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add('on');io.unobserve(e.target)}}),{threshold:.12});
document.querySelectorAll('.reveal').forEach(x=>io.observe(x));
document.querySelectorAll('[data-year]').forEach(x=>x.textContent=new Date().getFullYear());

const topbar=document.querySelector('.topbar');
const syncTopbar=()=>topbar?.classList.toggle('scrolled',window.scrollY>18);
syncTopbar();
window.addEventListener('scroll',syncTopbar,{passive:true});

/* Visual-only screenshot treatment: no structure/text/routes changed. */
document.querySelectorAll('.product-shot,.shot').forEach(frame=>{
  if(!frame.querySelector(':scope > .screen-shine')){
    const shine=document.createElement('span');
    shine.className='screen-shine';
    shine.setAttribute('aria-hidden','true');
    frame.appendChild(shine);
  }
});

/* Feature cards: lightweight live RAM indicator while Boost PC is hovered. */
(()=>{
  const card=document.querySelector('#features .feature-boost');
  const value=card?.querySelector('[data-ram-value]');
  if(!card||!value)return;
  let timer=null;
  const tick=()=>{ value.textContent=`+${Math.floor(78+Math.random()*16)}%`; };
  card.addEventListener('mouseenter',()=>{tick();clearInterval(timer);timer=setInterval(tick,850);});
  card.addEventListener('mouseleave',()=>{clearInterval(timer);timer=null;value.textContent='+85%';});
})();


/* ===== NEITH AAA UI MICRO-INTERACTIONS ===== */
(() => {
  'use strict';
  const scriptUrl = document.currentScript?.src || '';
  let base;
  try { base = new URL('../', scriptUrl || window.location.href); }
  catch { base = new URL('./', window.location.href); }
  const asset = p => new URL(String(p).replace(/^\/+/, ''), base).href;

  const hoverSound = new Audio(asset('audio/ui-hover.wav'));
  const clickSound = new Audio(asset('audio/ui-click.wav'));
  hoverSound.preload = 'auto';
  clickSound.preload = 'auto';
  hoverSound.volume = 0.055;
  clickSound.volume = 0.09;

  let armed = false;
  let lastHover = 0;
  const arm = () => {
    armed = true;
    document.documentElement.classList.add('neith-audio-ready');
  };
  addEventListener('pointerdown', arm, {once:true, passive:true});
  addEventListener('keydown', arm, {once:true, passive:true});

  const play = (audio, force = false) => {
    if (!armed && !force) return;
    try {
      audio.pause();
      audio.currentTime = 0;
      const p = audio.play();
      if (p?.catch) p.catch(() => {});
    } catch {}
  };

  const interactiveSelector = [
    '.navlinks .btn.primary',
    '[data-auth-nav]',
    '.auth-socials button',
    '.auth-submit',
    '.auth-tabs button',
    '.auth-close'
  ].join(',');

  document.addEventListener('pointerover', e => {
    const target = e.target.closest?.(interactiveSelector);
    if (!target || target.contains(e.relatedTarget)) return;
    const now = performance.now();
    if (now - lastHover < 85) return;
    lastHover = now;
    play(hoverSound);
  }, {passive:true});

  document.addEventListener('click', e => {
    const target = e.target.closest?.(interactiveSelector);
    if (!target) return;
    arm();
    play(clickSound, true);
  });

  /* Scrollbar energy color follows page progress: cyan -> cyber purple. */
  let ticking = false;
  const mix = (a,b,t) => a.map((v,i) => Math.round(v + (b[i]-v)*t));
  const syncScrollEnergy = () => {
    ticking = false;
    const max = Math.max(1, document.documentElement.scrollHeight - innerHeight);
    const p = Math.max(0, Math.min(1, scrollY / max));
    const rgb = mix([0,240,255],[125,70,255],p);
    const hi  = mix([143,248,255],[193,159,255],p);
    const root = document.documentElement.style;
    root.setProperty('--scroll-thumb', `rgb(${rgb.join(',')})`);
    root.setProperty('--scroll-thumb-hi', `rgb(${hi.join(',')})`);
    root.setProperty('--scroll-thumb-glow', `rgba(${rgb.join(',')},.52)`);
  };
  const requestScrollSync = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(syncScrollEnergy);
  };
  syncScrollEnergy();
  addEventListener('scroll', requestScrollSync, {passive:true});
  addEventListener('resize', requestScrollSync, {passive:true});
})();


/* ===== FAQ holographic accordion ===== */
(() => {
  const root = document.querySelector('[data-faq]');
  if (!root) return;
  const items = [...root.querySelectorAll('.faq-item')];
  const close = item => {
    item.classList.remove('is-open');
    item.querySelector('.faq-question')?.setAttribute('aria-expanded','false');
  };
  const open = item => {
    item.classList.add('is-open');
    item.querySelector('.faq-question')?.setAttribute('aria-expanded','true');
  };
  items.forEach(item => {
    const button = item.querySelector('.faq-question');
    button?.addEventListener('click', () => {
      const wasOpen = item.classList.contains('is-open');
      items.forEach(close);
      if (!wasOpen) open(item);
    });
  });
})();


/* ===== Hour Boost live showcase counters ===== */
(() => {
  const panel = document.querySelector('.hourboost-live-screen');
  if (!panel) return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const counters = [...panel.querySelectorAll('[data-hour-counter]')];
  const runtime = panel.querySelector('[data-runtime]');
  let elapsed = 6 * 3600 + 42 * 60 + 18;
  counters.forEach((el, i) => {
    const base = Number(el.dataset.start || 0);
    el.dataset.current = String(base);
    if (reduced) return;
    setInterval(() => {
      const current = Number(el.dataset.current || base) + (0.1 + i * 0.03);
      el.dataset.current = current.toFixed(1);
      el.textContent = `${current.toFixed(1)} h`;
      el.animate([{opacity:.72},{opacity:1}],{duration:260,easing:'ease-out'});
    }, 2600 + i * 450);
  });
  if (runtime && !reduced) {
    setInterval(() => {
      elapsed += 1;
      const h = String(Math.floor(elapsed / 3600)).padStart(2,'0');
      const m = String(Math.floor((elapsed % 3600) / 60)).padStart(2,'0');
      const s = String(elapsed % 60).padStart(2,'0');
      runtime.textContent = `${h}:${m}:${s}`;
    }, 1000);
  }
})();

/* ===== Hour Boost Live Farm Monitor ===== */
(() => {
  const monitor = document.querySelector('.hourboost-monitor');
  if (!monitor) return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hours = monitor.querySelector('[data-farmed-hours]');
  const sessions = monitor.querySelector('[data-live-sessions]');
  if (hours) {
    let value = Number(hours.dataset.start || 14208);
    if (!reduced) {
      setInterval(() => {
        value += Math.floor(1 + Math.random() * 4);
        hours.textContent = `+${value.toLocaleString('en-US')} hrs`;
        hours.animate([{opacity:.72,transform:'translateY(1px)'},{opacity:1,transform:'translateY(0)'}],{duration:320,easing:'ease-out'});
      }, 3600);
    }
  }
  if (sessions && !reduced) {
    const states = ['24/7 ONLINE','24/7 ONLINE','24/7 ONLINE'];
    let i = 0;
    setInterval(() => {
      sessions.textContent = states[(++i) % states.length];
      sessions.animate([{filter:'brightness(.8)'},{filter:'brightness(1.2)'},{filter:'brightness(1)'}],{duration:420,easing:'ease-out'});
    }, 3200);
  }
})();

/* Hour Boost specification cards — pointer 3D tilt */
(()=>{
  const cards=[...document.querySelectorAll('[data-spec-tilt]')];
  if(!cards.length)return;
  const coarse=window.matchMedia('(pointer: coarse)');
  cards.forEach(card=>{
    card.addEventListener('pointermove',e=>{
      if(coarse.matches)return;
      const r=card.getBoundingClientRect();
      const x=(e.clientX-r.left)/r.width;
      const y=(e.clientY-r.top)/r.height;
      const ry=(x-.5)*7;
      const rx=(.5-y)*6;
      card.style.setProperty('--spec-rx',`${rx.toFixed(2)}deg`);
      card.style.setProperty('--spec-ry',`${ry.toFixed(2)}deg`);
      card.style.setProperty('--spec-mx',`${(x*100).toFixed(1)}%`);
      card.style.setProperty('--spec-my',`${(y*100).toFixed(1)}%`);
    },{passive:true});
    card.addEventListener('pointerleave',()=>{
      card.style.setProperty('--spec-rx','0deg');
      card.style.setProperty('--spec-ry','0deg');
      card.style.setProperty('--spec-mx','50%');
      card.style.setProperty('--spec-my','50%');
    });
  });
})();

/* ===== Dedicated FAQ / System Console ===== */
(() => {
  const page = document.querySelector('[data-faq-page]');
  if (!page) return;
  const search = page.querySelector('#faq-search');
  const categories = [...page.querySelectorAll('[data-faq-category]')];
  const items = [...page.querySelectorAll('.faq-item[data-category]')];
  const consoleEl = page.querySelector('.faq-page-console');
  const count = page.querySelector('[data-faq-count]');
  const title = page.querySelector('[data-faq-category-title]');
  const empty = page.querySelector('[data-faq-empty]');
  const labels = {core:'NÚCLEO', subscriptions:'SUSCRIPCIONES', config:'CONFIGURACIÓN'};
  let active = 'core';
  const normalize = value => (value || '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
  const apply = () => {
    const q = normalize(search?.value);
    let visible = 0;
    items.forEach(item => {
      const inCategory = q ? true : item.dataset.category === active;
      const haystack = normalize(`${item.dataset.search || ''} ${item.textContent || ''}`);
      const match = inCategory && (!q || haystack.includes(q));
      item.hidden = !match;
      if (match) visible++;
    });
    if (title) title.textContent = q ? 'BÚSQUEDA GLOBAL' : labels[active];
    if (count) count.textContent = `${visible} ${visible === 1 ? 'REGISTRO' : 'REGISTROS'}`;
    if (empty) empty.hidden = visible !== 0;
    consoleEl?.classList.remove('is-filtering');
    requestAnimationFrame(() => consoleEl?.classList.add('is-filtering'));
    const openVisible = items.find(item => !item.hidden && item.classList.contains('is-open'));
    if (!openVisible) {
      items.forEach(item => { item.classList.remove('is-open'); item.querySelector('.faq-question')?.setAttribute('aria-expanded','false'); });
      const first = items.find(item => !item.hidden);
      if (first) { first.classList.add('is-open'); first.querySelector('.faq-question')?.setAttribute('aria-expanded','true'); }
    }
  };
  categories.forEach(button => button.addEventListener('click', () => {
    active = button.dataset.faqCategory;
    categories.forEach(b => b.classList.toggle('is-active', b === button));
    if (search) search.value = '';
    apply();
  }));
  search?.addEventListener('input', apply);
  search?.addEventListener('keydown', e => {
    if (e.key === 'Escape') { search.value = ''; apply(); search.blur(); }
  });
  apply();
})();

/* BOOST PC premium interactive modules — scoped and lightweight */
(() => {
  const cards = [...document.querySelectorAll('[data-boostpc-tilt]')];
  const canTilt = window.matchMedia('(pointer:fine)').matches && !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (canTilt) {
    cards.forEach((card) => {
      card.addEventListener('pointermove', (event) => {
        const r = card.getBoundingClientRect();
        const x = (event.clientX - r.left) / r.width - 0.5;
        const y = (event.clientY - r.top) / r.height - 0.5;
        card.style.setProperty('--ry', `${(x * 8).toFixed(2)}deg`);
        card.style.setProperty('--rx', `${(-y * 7).toFixed(2)}deg`);
      }, { passive: true });
      card.addEventListener('pointerleave', () => {
        card.style.setProperty('--ry', '0deg');
        card.style.setProperty('--rx', '0deg');
      });
    });
  }

  const ram = document.querySelector('[data-ram-value]');
  const latency = document.querySelector('[data-latency-value]');
  if (!ram && !latency) return;
  let step = 0;
  const tick = () => {
    step = (step + 1) % 6;
    if (ram) ram.textContent = `+${[88,89,91,90,92,88][step]}% LIBRE`;
    if (latency) latency.textContent = `CERO RETRASO · ${['0.2','0.2','0.1','0.2','0.3','0.2'][step]}ms`;
  };
  window.setInterval(tick, 1800);
})();

/* ===== NEITH MASTER VISUAL FRAMEWORK — universal secondary-page interactions ===== */
(() => {
  const cards = [...document.querySelectorAll('[data-master-tilt]')];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(pointer:fine)').matches;
  if (fine && !reduced) {
    cards.forEach(card => {
      card.addEventListener('pointermove', e => {
        const r = card.getBoundingClientRect();
        const x = (e.clientX - r.left) / Math.max(1, r.width) - .5;
        const y = (e.clientY - r.top) / Math.max(1, r.height) - .5;
        card.style.setProperty('--ry', `${(x * 7).toFixed(2)}deg`);
        card.style.setProperty('--rx', `${(-y * 6).toFixed(2)}deg`);
      }, {passive:true});
      card.addEventListener('pointerleave', () => {
        card.style.setProperty('--ry','0deg');
        card.style.setProperty('--rx','0deg');
      });
    });
  }

  const counters = [...document.querySelectorAll('[data-master-counter]')];
  if (reduced || !counters.length) return;
  let n = 0;
  setInterval(() => {
    n++;
    counters.forEach(el => {
      switch (el.dataset.masterCounter) {
        case 'ram': el.textContent = `${[88,89,91,90,92][n%5]}%`; break;
        case 'latency': el.textContent = `${['0.2','0.1','0.2','0.3','0.2'][n%5]} ms`; break;
        case 'achievements': el.textContent = String(742 + (n%4)); break;
        case 'deals': el.textContent = String(6 + (n%3)).padStart(2,'0'); break;
        case 'accounts': el.textContent = String(5 + (n%2)).padStart(2,'0'); break;
      }
      el.animate([{opacity:.62,filter:'brightness(.9)'},{opacity:1,filter:'brightness(1.22)'},{filter:'brightness(1)'}],{duration:420,easing:'ease-out'});
    });
  }, 2100);
})();

/* Hero CTA ambient aura — visual only, no layout/reflow changes. */
(()=>{
  const hero=document.querySelector('.hero-native');
  const download=document.querySelector('.hero-native .hero-cta--primary');
  if(!hero||!download)return;
  const on=()=>hero.classList.add('is-download-hover');
  const off=()=>hero.classList.remove('is-download-hover');
  download.addEventListener('pointerenter',on,{passive:true});
  download.addEventListener('pointerleave',off,{passive:true});
  download.addEventListener('focus',on);
  download.addEventListener('blur',off);
})();


/* ===== Hour Boost premium capture lightbox ===== */
(() => {
  const triggers = [...document.querySelectorAll('[data-hourboost-lightbox]')];
  const modal = document.querySelector('[data-hourboost-modal]');
  if (!triggers.length || !modal) return;
  const image = modal.querySelector('[data-hourboost-modal-image]');
  const caption = modal.querySelector('[data-hourboost-caption]');
  const prev = modal.querySelector('[data-hourboost-prev]');
  const next = modal.querySelector('[data-hourboost-next]');
  const closes = [...modal.querySelectorAll('[data-hourboost-close]')];
  let index = 0;
  let lastFocus = null;

  const render = (animate = true) => {
    const trigger = triggers[index];
    if (!trigger || !image) return;
    const src = trigger.dataset.full;
    const text = trigger.dataset.caption || trigger.querySelector('img')?.alt || 'Captura Hour Boost';
    image.classList.remove('is-zoomed');
    if (animate) {
      image.animate([{opacity:.28,transform:'scale(.975)'},{opacity:1,transform:'scale(1)'}],{duration:260,easing:'cubic-bezier(.2,.8,.2,1)'});
    }
    image.src = src;
    image.alt = text;
    if (caption) caption.textContent = text;
  };

  const open = (idx) => {
    index = idx;
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
    image?.classList.remove('is-zoomed');
    lastFocus?.focus?.({preventScroll:true});
  };
  const move = (step) => {
    index = (index + step + triggers.length) % triggers.length;
    render(true);
  };

  triggers.forEach((trigger, idx) => trigger.addEventListener('click', () => open(idx)));
  closes.forEach(el => el.addEventListener('click', close));
  prev?.addEventListener('click', () => move(-1));
  next?.addEventListener('click', () => move(1));
  image?.addEventListener('click', () => image.classList.toggle('is-zoomed'));
  document.addEventListener('keydown', (event) => {
    if (!modal.classList.contains('is-open')) return;
    if (event.key === 'Escape') close();
    if (event.key === 'ArrowLeft') move(-1);
    if (event.key === 'ArrowRight') move(1);
  });
})();

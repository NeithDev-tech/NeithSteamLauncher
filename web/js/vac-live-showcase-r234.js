(() => {
  'use strict';

  const copy = {
    en: {
      eyebrow: 'LIVE ACCOUNT PREVIEWS',
      subtitle: 'Instantly view the live status of your CS2 accounts.',
      meta1: 'REAL ACCOUNTS',
      meta2: 'LIVE DATA',
      meta3: 'INSTANT VISUAL STATUS',
      preview: 'ACCOUNT PREVIEW',
      neith: 'VAC LIVE · ONLINE',
      donnie: 'CLEAN ACCOUNT',
      spider: 'VAC LIVE · OFFLINE',
      leesin: 'CLEAN ACCOUNT',
      foot: 'CLICK ANY ACCOUNT PREVIEW TO ENLARGE',
      close: 'Close preview',
      previous: 'Previous account preview',
      next: 'Next account preview',
      enlarge: 'Enlarge account preview'
    },
    es: {
      eyebrow: 'VISTAS EN DIRECTO DE CUENTAS',
      subtitle: 'Consulta al instante el estado en directo de tus cuentas de CS2.',
      meta1: 'CUENTAS REALES',
      meta2: 'DATOS EN DIRECTO',
      meta3: 'ESTADO VISUAL INSTANTÁNEO',
      preview: 'VISTA DE CUENTA',
      neith: 'VAC LIVE · ONLINE',
      donnie: 'CUENTA LIMPIA',
      spider: 'VAC LIVE · OFFLINE',
      leesin: 'CUENTA LIMPIA',
      foot: 'HAZ CLICK EN CUALQUIER CUENTA PARA AMPLIAR',
      close: 'Cerrar vista ampliada',
      previous: 'Vista anterior',
      next: 'Vista siguiente',
      enlarge: 'Ampliar vista de cuenta'
    }
  };

  const accounts = [
    {name:'Neith', image:'../img/vac-live-account-neith-r234.png', statusKey:'neith', state:'green'},
    {name:'Donnie', image:'../img/vac-live-account-donnie-r234.png', statusKey:'donnie', state:'green'},
    {name:'Spider', image:'../img/vac-live-account-spider-r234.png', statusKey:'spider', state:'red'},
    {name:'Lee Sin', image:'../img/vac-live-account-leesin-r234.png', statusKey:'leesin', state:'green'}
  ];

  const lang = () => document.documentElement.lang === 'es' ? 'es' : 'en';
  const text = key => copy[lang()][key] || copy.en[key] || key;

  function build() {
    if (document.querySelector('.vac232-showcase')) return;
    const oldIntro = document.querySelector('.vac173-intro');
    const anchor = document.querySelector('.vac173-how') || oldIntro?.nextElementSibling;
    if (!oldIntro || !anchor) return;

    const section = document.createElement('section');
    section.className = 'vac232-showcase';
    section.setAttribute('aria-labelledby','vac232-title');
    section.innerHTML = `
      <div class="vac232-gridfx" aria-hidden="true"></div>
      <div class="vac232-aurora" aria-hidden="true"></div>
      <div class="shell vac232-shell">
        <header class="vac232-head">
          <div class="vac232-eyebrow" data-vac232-copy="eyebrow"></div>
          <h1 id="vac232-title">VAC <span>LIVE</span></h1>
          <p data-vac232-copy="subtitle"></p>
          <div class="vac232-meta">
            <span data-vac232-copy="meta1"></span><i></i>
            <span data-vac232-copy="meta2"></span><i></i>
            <span data-vac232-copy="meta3"></span>
          </div>
        </header>
        <div class="vac232-stage">
          <button class="vac232-nav vac232-prev" type="button" data-vac232-prev aria-label="${text('previous')}">‹</button>
          <div class="vac232-track" data-vac232-track></div>
          <button class="vac232-nav vac232-next" type="button" data-vac232-next aria-label="${text('next')}">›</button>
          <div class="vac232-dots" data-vac232-dots aria-label="Account previews"></div>
        </div>
        <div class="vac232-foot"><span data-vac232-copy="foot"></span></div>
      </div>`;

    anchor.parentNode.insertBefore(section, anchor);
    renderCards(section);
    createLightbox();
    syncLanguage();
    bind(section);
  }

  function renderCards(section) {
    const track = section.querySelector('[data-vac232-track]');
    const dots = section.querySelector('[data-vac232-dots]');
    track.innerHTML = accounts.map((account,index) => `
      <article class="vac232-card" data-vac232-card="${index}">
        <div class="vac232-media">
          <img src="${account.image}" alt="${account.name} — VAC LIVE account preview" loading="${index === 0 ? 'eager' : 'lazy'}" decoding="async" draggable="false" data-vac232-open="${index}"/>
          <button class="vac232-expand" type="button" data-vac232-open="${index}" aria-label="${text('enlarge')}">⌕</button>
        </div>
        <div class="vac232-copy">
          <div><small><span data-vac232-copy="preview"></span> #${index+1}</small><strong>${account.name}</strong></div>
          <div class="vac232-state ${account.state === 'red' ? 'red' : ''}"><i></i><span data-vac232-status="${account.statusKey}"></span></div>
        </div>
      </article>`).join('');
    dots.innerHTML = accounts.map((_,index) => `<button type="button" class="vac232-dot ${index === 0 ? 'active' : ''}" data-vac232-dot="${index}" aria-label="Preview ${index+1}"></button>`).join('');
  }

  function createLightbox() {
    if (document.querySelector('.vac232-lightbox')) return;
    const lightbox = document.createElement('div');
    lightbox.className = 'vac232-lightbox';
    lightbox.hidden = true;
    lightbox.setAttribute('role','dialog');
    lightbox.setAttribute('aria-modal','true');
    lightbox.innerHTML = `
      <div class="vac232-lightbox-bg" data-vac232-close></div>
      <div class="vac232-lightbox-box">
        <button class="vac232-close" type="button" data-vac232-close aria-label="${text('close')}">×</button>
        <img alt="" data-vac232-lightbox-img/>
        <div class="vac232-lightbox-caption"><b data-vac232-lightbox-name></b><span data-vac232-lightbox-status></span></div>
      </div>`;
    document.body.appendChild(lightbox);
  }

  function syncLanguage() {
    const current = copy[lang()];
    document.querySelectorAll('[data-vac232-copy]').forEach(el => {
      const key = el.dataset.vac232Copy;
      if (current[key] != null) el.textContent = current[key];
    });
    document.querySelectorAll('[data-vac232-status]').forEach(el => {
      const key = el.dataset.vac232Status;
      if (current[key] != null) el.textContent = current[key];
    });
    const prev = document.querySelector('[data-vac232-prev]');
    const next = document.querySelector('[data-vac232-next]');
    if (prev) prev.setAttribute('aria-label',current.previous);
    if (next) next.setAttribute('aria-label',current.next);
    document.querySelectorAll('.vac232-expand').forEach(btn => btn.setAttribute('aria-label',current.enlarge));
    const close = document.querySelector('.vac232-close');
    if (close) close.setAttribute('aria-label',current.close);
  }

  function bind(section) {
    const track = section.querySelector('[data-vac232-track]');
    const cards = [...section.querySelectorAll('[data-vac232-card]')];
    const dots = [...section.querySelectorAll('[data-vac232-dot]')];

    const goto = index => {
      const card = cards[index];
      if (!card) return;
      track.scrollTo({left:card.offsetLeft-track.offsetLeft,behavior:'smooth'});
      setActive(index);
    };
    const setActive = index => dots.forEach((dot,i)=>dot.classList.toggle('active',i===index));
    const activeIndex = () => {
      const center = track.scrollLeft + track.clientWidth/2;
      let best = 0, dist = Infinity;
      cards.forEach((card,i)=>{
        const c = card.offsetLeft-track.offsetLeft+card.offsetWidth/2;
        const d = Math.abs(center-c);
        if (d < dist) { dist=d; best=i; }
      });
      return best;
    };

    section.querySelector('[data-vac232-prev]')?.addEventListener('click',()=>goto(Math.max(0,activeIndex()-1)));
    section.querySelector('[data-vac232-next]')?.addEventListener('click',()=>goto(Math.min(cards.length-1,activeIndex()+1)));
    dots.forEach((dot,i)=>dot.addEventListener('click',()=>goto(i)));

    let raf = 0;
    track.addEventListener('scroll',()=>{
      if (raf) return;
      raf=requestAnimationFrame(()=>{raf=0;setActive(activeIndex());});
    },{passive:true});

    section.addEventListener('click',event=>{
      const opener = event.target.closest('[data-vac232-open]');
      if (!opener) return;
      openLightbox(Number(opener.dataset.vac232Open));
    });

    document.addEventListener('click',event=>{
      if (event.target.closest('[data-vac232-close]')) closeLightbox();
    });
    document.addEventListener('keydown',event=>{
      if (event.key === 'Escape') closeLightbox();
      if (!document.querySelector('.vac232-lightbox:not([hidden])')) return;
      if (event.key === 'ArrowLeft') openLightbox(Math.max(0,currentLightboxIndex()-1));
      if (event.key === 'ArrowRight') openLightbox(Math.min(accounts.length-1,currentLightboxIndex()+1));
    });
  }

  function currentLightboxIndex() {
    const box = document.querySelector('.vac232-lightbox');
    return Number(box?.dataset.index || 0);
  }

  function openLightbox(index) {
    const account = accounts[index];
    const box = document.querySelector('.vac232-lightbox');
    if (!account || !box) return;
    box.dataset.index=String(index);
    box.querySelector('[data-vac232-lightbox-img]').src=account.image;
    box.querySelector('[data-vac232-lightbox-img]').alt=`${account.name} — VAC LIVE account preview`;
    box.querySelector('[data-vac232-lightbox-name]').textContent=account.name;
    box.querySelector('[data-vac232-lightbox-status]').textContent=text(account.statusKey);
    box.hidden=false;
    document.documentElement.style.overflow='hidden';
    box.querySelector('.vac232-close')?.focus({preventScroll:true});
  }

  function closeLightbox() {
    const box = document.querySelector('.vac232-lightbox');
    if (!box || box.hidden) return;
    box.hidden=true;
    document.documentElement.style.overflow='';
  }

  window.addEventListener('neith:languagechange',syncLanguage);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',build,{once:true});
  else build();
})();
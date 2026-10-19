(() => {
  'use strict';
  const root = document.querySelector('[data-home205-showcase]');
  if (!root) return;

  const slides = [
    {category:'accounts', label:'Accounts', src:'./img/showcase-accounts.jpg', title:'Accounts · Steam account control'},
    {category:'boostpc', label:'Boost PC', src:'./img/showcase-boostpc-01.jpg', title:'Boost PC · Optimization preview'},
    {category:'boostpc', label:'Boost PC', src:'./img/showcase-boostpc-02.jpg', title:'Boost PC · Optimization results'},
    {category:'hourboost', label:'Hour Boost', src:'./img/showcase-hourboost-01.jpg', title:'Hour Boost · Ready state'},
    {category:'hourboost', label:'Hour Boost', src:'./img/showcase-hourboost-02.jpg', title:'Hour Boost · Active session'},
    {category:'freegames', label:'Free Games', src:'./img/showcase-freegames.jpg', title:'Free Games · Live offers'},
    {category:'achievements', label:'Achievements', src:'./img/showcase-achievements-01.jpg', title:'Achievements · Game library'},
    {category:'achievements', label:'Achievements', src:'./img/showcase-achievements-02.jpg', title:'Achievements · Detailed unlock control'}
  ];

  let index = 0;
  let touchStartX = 0;
  const image = root.querySelector('[data-home205-image]');
  const title = root.querySelector('[data-home205-title]');
  const count = root.querySelector('[data-home205-count]');
  const dots = root.querySelector('[data-home205-dots]');
  const tabs = [...root.querySelectorAll('[data-home205-tab]')];
  const prev = root.querySelector('[data-home205-prev]');
  const next = root.querySelector('[data-home205-next]');
  const expand = root.querySelector('[data-home205-expand]');
  const lightbox = document.querySelector('[data-home205-lightbox]');
  const lbImage = lightbox?.querySelector('[data-home205-lightbox-image]');
  const lbTitle = lightbox?.querySelector('[data-home205-lightbox-title]');
  const lbCount = lightbox?.querySelector('[data-home205-lightbox-count]');

  function translated(value){
    return window.NeithI18n?.t ? window.NeithI18n.t(value) : value;
  }
  function buildDots(){
    if (!dots) return;
    dots.innerHTML = '';
    slides.forEach((_,i) => {
      const b = document.createElement('button');
      b.type='button';
      b.className='home205-showcase-dot';
      b.setAttribute('aria-label', `${translated('Screenshot')} ${i+1}`);
      b.addEventListener('click', () => setSlide(i));
      dots.appendChild(b);
    });
  }
  function syncTabs(){
    tabs.forEach(tab => {
      const active = tab.dataset.home205Tab === slides[index].category;
      tab.classList.toggle('is-active', active);
      tab.setAttribute('aria-selected', String(active));
    });
  }
  function syncLightbox(){
    if (!lightbox || !lightbox.classList.contains('is-open')) return;
    if (lbImage) { lbImage.src = slides[index].src; lbImage.alt = translated(slides[index].title); }
    if (lbTitle) lbTitle.textContent = translated(slides[index].title);
    if (lbCount) lbCount.textContent = `${String(index+1).padStart(2,'0')} / ${String(slides.length).padStart(2,'0')}`;
  }
  function render(){
    const s = slides[index];
    image.classList.add('is-changing');
    const pre = new Image();
    pre.onload = () => {
      image.src = s.src;
      image.alt = translated(s.title);
      requestAnimationFrame(() => image.classList.remove('is-changing'));
    };
    pre.src = s.src;
    title.textContent = translated(s.title);
    count.textContent = `${String(index+1).padStart(2,'0')} / ${String(slides.length).padStart(2,'0')}`;
    [...dots.children].forEach((d,i) => d.classList.toggle('is-active', i===index));
    syncTabs();
    syncLightbox();
  }
  function setSlide(i){ index = (i + slides.length) % slides.length; render(); }
  function step(delta){ setSlide(index + delta); }
  function open(){
    if(!lightbox) return;
    lightbox.classList.add('is-open');
    lightbox.setAttribute('aria-hidden','false');
    document.body.classList.add('home205-lightbox-lock');
    syncLightbox();
    lightbox.querySelector('[data-home205-close]')?.focus({preventScroll:true});
  }
  function close(){
    if(!lightbox) return;
    lightbox.classList.remove('is-open');
    lightbox.setAttribute('aria-hidden','true');
    document.body.classList.remove('home205-lightbox-lock');
  }

  buildDots();
  tabs.forEach(tab => tab.addEventListener('click', () => {
    const found = slides.findIndex(s => s.category === tab.dataset.home205Tab);
    if(found >= 0) setSlide(found);
  }));
  prev?.addEventListener('click', () => step(-1));
  next?.addEventListener('click', () => step(1));
  expand?.addEventListener('click', open);
  image?.addEventListener('click', open);
  image?.addEventListener('touchstart',e => {touchStartX = e.changedTouches[0]?.clientX || 0;},{passive:true});
  image?.addEventListener('touchend',e => {const dx=(e.changedTouches[0]?.clientX||0)-touchStartX;if(Math.abs(dx)>42)step(dx>0?-1:1);},{passive:true});
  lightbox?.querySelector('[data-home205-close]')?.addEventListener('click', close);
  lightbox?.querySelector('[data-home205-backdrop]')?.addEventListener('click', close);
  lightbox?.querySelector('[data-home205-lightbox-prev]')?.addEventListener('click', () => step(-1));
  lightbox?.querySelector('[data-home205-lightbox-next]')?.addEventListener('click', () => step(1));
  window.addEventListener('keydown', e => {
    if (!lightbox?.classList.contains('is-open')) return;
    if(e.key==='Escape') close();
    if(e.key==='ArrowLeft') step(-1);
    if(e.key==='ArrowRight') step(1);
  });
  window.addEventListener('neith:languagechange', render);
  render();
})();

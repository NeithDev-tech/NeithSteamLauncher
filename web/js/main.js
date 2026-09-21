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

/* Hero carousel: homepage only. */
(() => {
  const carousel=document.querySelector('[data-carousel]');
  if(!carousel) return;
  const slides=[...carousel.querySelectorAll('.hero-carousel__slide')];
  const prev=carousel.querySelector('.hero-carousel__arrow--prev');
  const next=carousel.querySelector('.hero-carousel__arrow--next');
  const dotsWrap=carousel.querySelector('.hero-carousel__dots');
  const label=carousel.querySelector('.hero-carousel__label');
  let index=0;
  let startX=null;
  const dots=slides.map((slide,i)=>{
    const dot=document.createElement('button');
    dot.type='button';
    dot.className='hero-carousel__dot'+(i===0?' is-active':'');
    dot.setAttribute('aria-label',`Ver captura ${slide.dataset.label||i+1}`);
    dot.setAttribute('role','tab');
    dot.setAttribute('aria-selected',i===0?'true':'false');
    dot.addEventListener('click',()=>show(i));
    dotsWrap?.appendChild(dot);
    return dot;
  });
  function show(nextIndex){
    index=(nextIndex+slides.length)%slides.length;
    slides.forEach((slide,i)=>slide.classList.toggle('is-active',i===index));
    dots.forEach((dot,i)=>{
      dot.classList.toggle('is-active',i===index);
      dot.setAttribute('aria-selected',i===index?'true':'false');
    });
    if(label) label.textContent=slides[index].dataset.label||'';
  }
  prev?.addEventListener('click',()=>show(index-1));
  next?.addEventListener('click',()=>show(index+1));
  carousel.addEventListener('keydown',e=>{
    if(e.key==='ArrowLeft'){e.preventDefault();show(index-1)}
    if(e.key==='ArrowRight'){e.preventDefault();show(index+1)}
  });
  carousel.setAttribute('tabindex','0');
  carousel.addEventListener('pointerdown',e=>{startX=e.clientX});
  carousel.addEventListener('pointerup',e=>{
    if(startX===null) return;
    const delta=e.clientX-startX;
    startX=null;
    if(Math.abs(delta)>45) show(index+(delta<0?1:-1));
  });
  show(0);
})();

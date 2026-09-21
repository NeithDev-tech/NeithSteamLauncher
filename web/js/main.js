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

/* Hero screenshot carousel — nav/hero only */
(()=>{
  const carousel=document.querySelector('.hero-carousel');
  if(!carousel)return;
  const slides=[...carousel.querySelectorAll('.hero-slide')];
  const dotsWrap=carousel.querySelector('.hero-dots');
  const prev=carousel.querySelector('.hero-arrow-prev');
  const next=carousel.querySelector('.hero-arrow-next');
  let index=0;
  let timer=null;
  slides.forEach((slide,i)=>{
    const dot=document.createElement('button');
    const img=slide.querySelector('img');
    const label=slide.dataset.label || img?.alt || `Captura ${i+1}`;
    dot.type='button';
    dot.className='hero-dot'+(i===0?' active':'')+(slide.dataset.promo==='true'?' promo-dot':'');
    dot.dataset.label=label;
    dot.setAttribute('aria-label',`Ver ${label}`);
    if(img?.getAttribute('src')) dot.style.setProperty('--thumb',`url("${img.getAttribute('src')}")`);
    dot.addEventListener('click',()=>show(i,true));
    dotsWrap.appendChild(dot);
  });
  const dots=[...dotsWrap.children];
  function show(i,user=false){
    index=(i+slides.length)%slides.length;
    slides.forEach((s,n)=>s.classList.toggle('active',n===index));
    dots.forEach((d,n)=>d.classList.toggle('active',n===index));
    if(user)restart();
  }
  function restart(){clearInterval(timer);timer=setInterval(()=>show(index+1),6500)}
  prev?.addEventListener('click',()=>show(index-1,true));
  next?.addEventListener('click',()=>show(index+1,true));
  carousel.addEventListener('mouseenter',()=>clearInterval(timer));
  carousel.addEventListener('mouseleave',restart);
  restart();
})();

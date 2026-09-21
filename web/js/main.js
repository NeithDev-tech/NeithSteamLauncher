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

/* Neith carousel premium card tilt — desktop pointer only */
document.querySelectorAll('.hero .neith-card-inner[data-tilt]').forEach(card=>{
  const maxTilt=4.2;
  card.addEventListener('pointermove',e=>{
    if(window.matchMedia('(pointer: coarse)').matches)return;
    const r=card.getBoundingClientRect();
    const x=(e.clientX-r.left)/r.width;
    const y=(e.clientY-r.top)/r.height;
    card.style.setProperty('--ry',`${((x-.5)*maxTilt*2).toFixed(2)}deg`);
    card.style.setProperty('--rx',`${((.5-y)*maxTilt*2).toFixed(2)}deg`);
    card.style.setProperty('--mx',`${(x*100).toFixed(1)}%`);
    card.style.setProperty('--my',`${(y*100).toFixed(1)}%`);
  });
  card.addEventListener('pointerleave',()=>{
    card.style.setProperty('--rx','0deg');card.style.setProperty('--ry','0deg');
    card.style.setProperty('--mx','50%');card.style.setProperty('--my','50%');
  });
});

/* Universal zero-clip card fitting safeguard.
   Only compacts a card when its live content is larger than the available frame. */
(()=>{
  const cards=[...document.querySelectorAll('.hero .neith-card-inner')];
  if(!cards.length)return;
  const fit=card=>{
    const content=card.querySelector('.neith-card-content');
    if(!content)return;
    card.classList.remove('fit-compact','fit-tight');
    requestAnimationFrame(()=>{
      const over=content.scrollHeight>card.clientHeight+1 || content.scrollWidth>card.clientWidth+1;
      if(over)card.classList.add('fit-compact');
      requestAnimationFrame(()=>{
        const over2=content.scrollHeight>card.clientHeight+1 || content.scrollWidth>card.clientWidth+1;
        if(over2)card.classList.add('fit-tight');
      });
    });
  };
  const ro=new ResizeObserver(entries=>entries.forEach(e=>fit(e.target)));
  cards.forEach(card=>{ro.observe(card);fit(card)});
  window.addEventListener('load',()=>cards.forEach(fit),{once:true});
})();


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

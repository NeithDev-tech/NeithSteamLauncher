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

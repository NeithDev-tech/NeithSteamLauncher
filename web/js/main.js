(() => {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const nav = document.querySelector('.site-nav');
  const toggle = document.querySelector('.nav-toggle');
  const links = document.querySelector('.nav-links');
  const onScroll = () => nav?.classList.toggle('scrolled', scrollY > 18);
  addEventListener('scroll', onScroll, {passive:true}); onScroll();
  toggle?.addEventListener('click',()=>links?.classList.toggle('open'));
  links?.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>links.classList.remove('open')));

  const io = new IntersectionObserver(entries => entries.forEach(e => {
    if(e.isIntersecting){ e.target.classList.add('visible'); io.unobserve(e.target); }
  }), {threshold:.12, rootMargin:'0px 0px -45px'});
  document.querySelectorAll('.reveal').forEach(el=>io.observe(el));

  document.querySelectorAll('.card').forEach(card=>{
    card.addEventListener('pointermove',e=>{
      const r=card.getBoundingClientRect();
      card.style.setProperty('--mx', `${e.clientX-r.left}px`);
      card.style.setProperty('--my', `${e.clientY-r.top}px`);
    }, {passive:true});
  });

  document.querySelectorAll('.faq-q').forEach(btn=>btn.addEventListener('click',()=>{
    const item=btn.closest('.faq-item'); const open=item.classList.toggle('open');
    btn.setAttribute('aria-expanded', open ? 'true':'false');
  }));

  const year=document.querySelector('[data-year]'); if(year) year.textContent=new Date().getFullYear();

  if(!reduced && matchMedia('(pointer:fine)').matches){
    const dot=document.querySelector('.cursor-dot'), ring=document.querySelector('.cursor-ring');
    let x=innerWidth/2,y=innerHeight/2,rx=x,ry=y;
    addEventListener('pointermove',e=>{x=e.clientX;y=e.clientY;dot&&(dot.style.transform=`translate(${x}px,${y}px) translate(-50%,-50%)`)} ,{passive:true});
    const loop=()=>{rx+=(x-rx)*.16;ry+=(y-ry)*.16;if(ring)ring.style.transform=`translate(${rx}px,${ry}px) translate(-50%,-50%)`;requestAnimationFrame(loop)};loop();
    document.querySelectorAll('a,button,.card').forEach(el=>{el.addEventListener('mouseenter',()=>document.body.classList.add('cursor-active'));el.addEventListener('mouseleave',()=>document.body.classList.remove('cursor-active'))});
  }

  const canvas=document.querySelector('#particles');
  if(canvas && !reduced){
    const ctx=canvas.getContext('2d'); let pts=[],w=0,h=0,dpr=1,raf=0;
    const init=()=>{const r=canvas.parentElement.getBoundingClientRect();w=r.width;h=r.height;dpr=Math.min(devicePixelRatio||1,1.6);canvas.width=w*dpr;canvas.height=h*dpr;canvas.style.width=w+'px';canvas.style.height=h+'px';ctx.setTransform(dpr,0,0,dpr,0,0);const n=innerWidth<700?28:56;pts=Array.from({length:n},()=>({x:Math.random()*w,y:Math.random()*h,vx:(Math.random()-.5)*.28,vy:(Math.random()-.5)*.22,r:Math.random()*1.7+.5,c:Math.random()>.72?'255,0,229':'0,240,255'}))};
    const draw=()=>{ctx.clearRect(0,0,w,h);for(const p of pts){p.x+=p.vx;p.y+=p.vy;if(p.x<-5)p.x=w+5;if(p.x>w+5)p.x=-5;if(p.y<-5)p.y=h+5;if(p.y>h+5)p.y=-5;ctx.beginPath();ctx.fillStyle=`rgba(${p.c},${.3+p.r*.18})`;ctx.shadowBlur=10;ctx.shadowColor=`rgba(${p.c},.65)`;ctx.arc(p.x,p.y,p.r,0,Math.PI*2);ctx.fill()}raf=requestAnimationFrame(draw)};
    init(); draw(); let t; addEventListener('resize',()=>{clearTimeout(t);t=setTimeout(init,120)},{passive:true});
    document.addEventListener('visibilitychange',()=>{if(document.hidden){cancelAnimationFrame(raf)}else{draw()}});
  }
})();

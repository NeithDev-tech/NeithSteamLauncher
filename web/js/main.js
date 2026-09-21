(() => {
  const nav = document.getElementById('site-nav');
  const menuBtn = document.querySelector('.menu-toggle');
  const menu = document.querySelector('.nav-links');
  const year = document.getElementById('year');
  if (year) year.textContent = new Date().getFullYear();

  const onScroll = () => nav?.classList.toggle('scrolled', window.scrollY > 18);
  onScroll(); window.addEventListener('scroll', onScroll, { passive:true });

  menuBtn?.addEventListener('click', () => {
    const open = menu?.classList.toggle('open');
    menuBtn.setAttribute('aria-expanded', String(!!open));
  });
  menu?.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
    menu.classList.remove('open'); menuBtn?.setAttribute('aria-expanded','false');
  }));

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) { entry.target.classList.add('visible'); observer.unobserve(entry.target); }
    });
  }, { threshold:0.12, rootMargin:'0px 0px -6% 0px' });
  document.querySelectorAll('.reveal').forEach(el => observer.observe(el));

  const dot = document.querySelector('.cursor-dot');
  const ring = document.querySelector('.cursor-ring');
  if (dot && ring && matchMedia('(pointer:fine)').matches) {
    let mx = innerWidth/2, my = innerHeight/2, rx = mx, ry = my;
    addEventListener('mousemove', e => { mx=e.clientX; my=e.clientY; dot.style.transform=`translate(${mx}px,${my}px) translate(-50%,-50%)`; });
    const tick = () => { rx += (mx-rx)*.18; ry += (my-ry)*.18; ring.style.transform=`translate(${rx}px,${ry}px) translate(-50%,-50%)`; requestAnimationFrame(tick); }; tick();
    document.querySelectorAll('a,button,summary,.feature-card,.screenshot-shell,.mini-shot').forEach(el => {
      el.addEventListener('mouseenter',()=>document.body.classList.add('cursor-active'));
      el.addEventListener('mouseleave',()=>document.body.classList.remove('cursor-active'));
    });
  }

  document.querySelectorAll('.feature-card,.security-card,.route-panel').forEach(card => {
    card.addEventListener('pointermove', e => {
      const r = card.getBoundingClientRect();
      card.style.setProperty('--mx', `${e.clientX-r.left}px`);
      card.style.setProperty('--my', `${e.clientY-r.top}px`);
    });
  });

  const canvas = document.getElementById('particles');
  if (canvas && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const ctx = canvas.getContext('2d', { alpha:true });
    let w=0,h=0,dpr=1,pts=[];
    const make = () => {
      const host = canvas.parentElement;
      w = host.clientWidth; h = host.clientHeight; dpr = Math.min(devicePixelRatio || 1, 1.7);
      canvas.width = Math.round(w*dpr); canvas.height = Math.round(h*dpr); canvas.style.width=w+'px'; canvas.style.height=h+'px'; ctx.setTransform(dpr,0,0,dpr,0,0);
      const count = Math.min(70, Math.max(32, Math.round(w/24)));
      pts = Array.from({length:count},()=>({x:Math.random()*w,y:Math.random()*h,r:.7+Math.random()*1.6,vx:(Math.random()-.5)*.18,vy:-.05-Math.random()*.18,a:.2+Math.random()*.5,c:Math.random()>.82?'255,0,229':'0,240,255'}));
    };
    const draw = () => {
      ctx.clearRect(0,0,w,h);
      for (const p of pts) {
        p.x += p.vx; p.y += p.vy;
        if (p.y < -10) { p.y=h+10; p.x=Math.random()*w; }
        if (p.x < -10) p.x=w+10; if (p.x>w+10) p.x=-10;
        ctx.beginPath(); ctx.fillStyle=`rgba(${p.c},${p.a})`; ctx.shadowBlur=9; ctx.shadowColor=`rgba(${p.c},.55)`; ctx.arc(p.x,p.y,p.r,0,Math.PI*2); ctx.fill();
      }
      requestAnimationFrame(draw);
    };
    make(); draw(); addEventListener('resize', make, { passive:true });
  }
})();

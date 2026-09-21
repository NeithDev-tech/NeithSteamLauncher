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

/* === PREMIUM EXPANSION — additive only === */
(() => {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Theme toggle; does not alter routes or existing content.
  const navLinks = document.querySelector('.navlinks');
  if (navLinks && !navLinks.querySelector('.theme-toggle')) {
    const toggle = document.createElement('button');
    toggle.className = 'theme-toggle';
    toggle.type = 'button';
    toggle.setAttribute('aria-label', 'Cambiar modo oscuro o claro');
    const saved = localStorage.getItem('neith-theme');
    if (saved === 'light') document.body.classList.add('theme-light');
    const sync = () => { toggle.textContent = document.body.classList.contains('theme-light') ? '☾' : '☀'; };
    sync();
    toggle.addEventListener('click', () => {
      document.body.classList.toggle('theme-light');
      localStorage.setItem('neith-theme', document.body.classList.contains('theme-light') ? 'light' : 'dark');
      sync();
    });
    const primaryDownload = navLinks.querySelector('.btn.primary');
    navLinks.insertBefore(toggle, primaryDownload || null);
  }

  // Back to top.
  const backTop = document.createElement('button');
  backTop.className = 'back-top';
  backTop.type = 'button';
  backTop.setAttribute('aria-label', 'Volver arriba');
  backTop.textContent = '↑';
  document.body.appendChild(backTop);
  const syncBackTop = () => backTop.classList.toggle('show', window.scrollY > 650);
  syncBackTop();
  window.addEventListener('scroll', syncBackTop, { passive: true });
  backTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' }));

  // Neon cursor on pointer devices only.
  if (window.matchMedia('(pointer:fine)').matches && !reduceMotion) {
    const cursor = document.createElement('span');
    cursor.className = 'cursor-neon';
    cursor.setAttribute('aria-hidden', 'true');
    document.body.appendChild(cursor);
    window.addEventListener('pointermove', (e) => {
      cursor.style.left = `${e.clientX}px`;
      cursor.style.top = `${e.clientY}px`;
    }, { passive: true });
  }

  // Lightweight hero particles.
  const canvas = document.querySelector('.hero-particles');
  if (canvas && !reduceMotion) {
    const ctx = canvas.getContext('2d');
    let dots = [], w = 0, h = 0, dpr = 1, raf = 0;
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      w = Math.max(1, rect.width); h = Math.max(1, rect.height); dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.min(34, Math.max(16, Math.round(w / 45)));
      dots = Array.from({ length: count }, () => ({
        x: Math.random() * w, y: Math.random() * h, r: .7 + Math.random() * 1.5,
        vx: (Math.random() - .5) * .13, vy: -.05 - Math.random() * .13,
        a: .18 + Math.random() * .42, mag: Math.random() > .82
      }));
    };
    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      for (const p of dots) {
        p.x += p.vx; p.y += p.vy;
        if (p.y < -8) { p.y = h + 8; p.x = Math.random() * w; }
        if (p.x < -8) p.x = w + 8; if (p.x > w + 8) p.x = -8;
        ctx.beginPath();
        ctx.fillStyle = p.mag ? `rgba(255,0,229,${p.a * .55})` : `rgba(88,217,255,${p.a})`;
        ctx.shadowBlur = 10; ctx.shadowColor = p.mag ? '#FF00E5' : '#00F0FF';
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
      }
      raf = requestAnimationFrame(draw);
    };
    resize(); draw();
    window.addEventListener('resize', resize, { passive: true });
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) cancelAnimationFrame(raf); else draw();
    });
  }

  // Screenshot carousel.
  const carousel = document.querySelector('[data-carousel]');
  if (carousel) {
    const track = carousel.querySelector('.carousel-track');
    const slides = [...carousel.querySelectorAll('.carousel-slide')];
    const dots = carousel.querySelector('.carousel-dots');
    let index = 0;
    const render = () => {
      track.style.transform = `translateX(${-index * 100}%)`;
      slides.forEach((s, i) => s.classList.toggle('active', i === index));
      dots.querySelectorAll('button').forEach((d, i) => d.classList.toggle('active', i === index));
    };
    slides.forEach((_, i) => {
      const dot = document.createElement('button');
      dot.type = 'button'; dot.setAttribute('aria-label', `Ir a captura ${i + 1}`);
      dot.addEventListener('click', () => { index = i; render(); });
      dots.appendChild(dot);
    });
    carousel.querySelector('.prev')?.addEventListener('click', () => { index = (index - 1 + slides.length) % slides.length; render(); });
    carousel.querySelector('.next')?.addEventListener('click', () => { index = (index + 1) % slides.length; render(); });
    let startX = 0;
    carousel.addEventListener('touchstart', e => { startX = e.touches[0].clientX; }, { passive: true });
    carousel.addEventListener('touchend', e => {
      const dx = e.changedTouches[0].clientX - startX;
      if (Math.abs(dx) > 50) { index = dx < 0 ? (index + 1) % slides.length : (index - 1 + slides.length) % slides.length; render(); }
    }, { passive: true });
    render();
  }

  // Public release metadata from the official GitHub repo. Release bodies are not injected.
  const releaseList = document.querySelector('[data-releases-list]');
  const versionEl = document.querySelector('[data-current-version]');
  const dateEl = document.querySelector('[data-current-date]');
  const formatDate = (iso) => new Intl.DateTimeFormat('es-ES', { day:'2-digit', month:'short', year:'numeric' }).format(new Date(iso)).replace('.', '').toUpperCase();
  const formatSize = (bytes) => `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  fetch('https://api.github.com/repos/NeithDev-tech/NeithSteamLauncher/releases?per_page=100', { headers: { 'Accept': 'application/vnd.github+json' } })
    .then(r => r.ok ? r.json() : Promise.reject(new Error('release metadata unavailable')))
    .then(all => {
      const releases = all.filter(r => !r.draft && /^v?\d+\.\d+\.\d+$/i.test(r.tag_name));
      if (!releases.length) return;
      releases.sort((a,b) => new Date(b.published_at || b.created_at) - new Date(a.published_at || a.created_at));
      const latest = releases[0];
      if (versionEl) versionEl.textContent = `Versión ${latest.tag_name.replace(/^v/i,'')}`;
      if (dateEl) dateEl.textContent = new Intl.DateTimeFormat('es-ES', { day:'numeric', month:'long', year:'numeric' }).format(new Date(latest.published_at || latest.created_at));
      if (!releaseList) return;
      releaseList.innerHTML = '';
      releases.forEach(rel => {
        const installer = (rel.assets || []).find(a => /NeithSetup\.exe$/i.test(a.name));
        const fallbackAsset = (rel.assets || []).find(a => /\.exe$|\.zip$/i.test(a.name));
        const asset = installer || fallbackAsset;
        const card = document.createElement('article');
        card.className = 'download-card panel reveal on';
        const meta = document.createElement('div');
        const title = document.createElement('b'); title.textContent = rel.tag_name;
        const sub = document.createElement('span'); sub.textContent = `${formatDate(rel.published_at || rel.created_at)}${asset ? ` · ${formatSize(asset.size)}` : ''}`;
        meta.append(title, sub);
        const actions = document.createElement('div'); actions.className = 'download-actions';
        if (asset) {
          const dl = document.createElement('a'); dl.className = 'btn primary'; dl.href = asset.browser_download_url; dl.textContent = 'Descargar';
          actions.appendChild(dl);
        }
        const changelog = document.createElement('a'); changelog.className = 'btn ghost'; changelog.href = rel.html_url; changelog.target = '_blank'; changelog.rel = 'noreferrer'; changelog.textContent = 'Ver changelog';
        actions.appendChild(changelog);
        card.append(meta, actions); releaseList.appendChild(card);
      });
    })
    .catch(() => {});
})();

(() => {
  'use strict';

  function installDonationSection(){
    const old = document.querySelector('.home44-membership');
    if (!old || document.querySelector('.home226-donation')) return;

    if (!document.getElementById('home226-donation-style')) {
      const style = document.createElement('style');
      style.id = 'home226-donation-style';
      style.textContent = `
      .home226-donation{position:relative;overflow:hidden;padding:76px 0 82px;background:radial-gradient(circle at 80% 22%,rgba(77,80,255,.16),transparent 30%),radial-gradient(circle at 20% 80%,rgba(0,218,255,.09),transparent 28%),linear-gradient(180deg,#00101f 0%,#001522 52%,#000b15 100%);border-top:1px solid rgba(68,214,255,.10);border-bottom:1px solid rgba(68,214,255,.09)}
      .home226-donation:before{content:"";position:absolute;inset:0;pointer-events:none;background-image:linear-gradient(rgba(47,196,255,.028) 1px,transparent 1px),linear-gradient(90deg,rgba(47,196,255,.028) 1px,transparent 1px);background-size:46px 46px;mask-image:linear-gradient(to bottom,transparent 0,#000 18%,#000 82%,transparent 100%)}
      .home226-shell{position:relative;z-index:1}.home226-head{text-align:center;max-width:900px;margin:0 auto 30px}.home226-kicker{display:inline-flex;align-items:center;gap:9px;padding:7px 12px;border:1px solid rgba(64,227,255,.22);border-radius:999px;background:rgba(6,38,56,.7);color:#7eeaff;font:800 10px/1 Orbitron,Inter,sans-serif;letter-spacing:.13em}.home226-kicker i{width:7px;height:7px;border-radius:50%;background:#30f0a2;box-shadow:0 0 14px #30f0a2}.home226-head h2{margin:18px 0 10px;color:#f3fdff;font:900 clamp(28px,4.6vw,52px)/1.02 Orbitron,Inter,sans-serif;letter-spacing:.01em}.home226-head h2 span{display:block;background:linear-gradient(90deg,#54e5ff,#30d7ff 45%,#7168ff);-webkit-background-clip:text;background-clip:text;color:transparent}.home226-head p{margin:0 auto;max-width:760px;color:#8fb8c8;font:500 15px/1.65 Inter,sans-serif}
      .home226-grid{display:grid;grid-template-columns:minmax(0,1.18fr) minmax(320px,.82fr);gap:18px;align-items:stretch}.home226-main,.home226-pass{border:1px solid rgba(67,216,255,.19);border-radius:23px;background:linear-gradient(160deg,rgba(6,34,53,.96),rgba(1,18,30,.98));box-shadow:0 26px 80px rgba(0,0,0,.28),inset 0 1px 0 rgba(255,255,255,.025)}
      .home226-main{padding:22px}.home226-main-top{display:flex;align-items:flex-start;justify-content:space-between;gap:18px;margin-bottom:18px}.home226-main-top small{display:block;color:#60dfff;font:800 9px/1 Orbitron;letter-spacing:.13em}.home226-main-top h3{margin:7px 0 0;color:#f4fdff;font:800 22px/1.12 Orbitron,Inter,sans-serif}.home226-main-top p{margin:8px 0 0;color:#78a8bb;font:500 12px/1.55 Inter}.home226-fast{flex:0 0 auto;display:flex;align-items:center;gap:7px;padding:8px 10px;border:1px solid rgba(54,245,160,.25);border-radius:999px;background:rgba(54,245,160,.05);color:#54f2ab;font:800 9px/1 Orbitron}.home226-fast i{width:6px;height:6px;border-radius:50%;background:#46f0a4;box-shadow:0 0 10px #46f0a4}
      .home226-steps{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}.home226-step{position:relative;min-width:0;padding:14px;border:1px solid rgba(66,211,255,.13);border-radius:15px;background:linear-gradient(145deg,rgba(5,42,64,.75),rgba(2,25,40,.82))}.home226-step em{display:grid;place-items:center;width:28px;height:28px;margin-bottom:12px;border-radius:10px;background:linear-gradient(145deg,#166a92,#2d4cbe);color:#eaffff;font:900 10px/1 Orbitron;font-style:normal;box-shadow:0 8px 20px rgba(0,98,161,.20)}.home226-step b{display:block;color:#eefcff;font:800 11px/1.25 Orbitron}.home226-step span{display:block;margin-top:7px;color:#79a8ba;font:500 10px/1.45 Inter}.home226-step strong{color:#62e9ff}.home226-trust{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:12px}.home226-trust span{display:flex;align-items:center;justify-content:center;gap:7px;min-height:34px;border:1px solid rgba(56,203,255,.10);border-radius:10px;background:#031a29;color:#72a9bd;font:700 9px/1 Inter;text-align:center}.home226-trust i{width:6px;height:6px;border-radius:50%;background:#28e19a;box-shadow:0 0 10px rgba(40,225,154,.65)}
      .home226-pass{position:relative;padding:20px;overflow:hidden}.home226-pass:before{content:"";position:absolute;width:240px;height:240px;right:-96px;top:-98px;border:1px solid rgba(94,218,255,.11);border-radius:50%;box-shadow:0 0 0 36px rgba(45,130,255,.025),0 0 0 72px rgba(96,79,255,.018)}.home226-pass>*{position:relative;z-index:1}.home226-pass-top{display:flex;align-items:center;justify-content:space-between;gap:10px}.home226-pass-top span{color:#67e3ff;font:800 9px/1 Orbitron;letter-spacing:.12em}.home226-pass-top b{padding:6px 8px;border:1px solid rgba(255,213,82,.28);border-radius:999px;background:rgba(255,213,82,.07);color:#ffe27f;font:800 8px/1 Orbitron}.home226-price{margin:18px 0 14px;padding:16px;border:1px solid rgba(89,226,255,.17);border-radius:15px;background:linear-gradient(135deg,rgba(9,51,76,.82),rgba(11,31,53,.78))}.home226-price small,.home226-price strong,.home226-price span{display:block}.home226-price small{color:#7eaabd;font:800 8px/1 Orbitron;letter-spacing:.1em}.home226-price strong{margin-top:6px;color:#fff;font:900 42px/1 Orbitron}.home226-price span{margin-top:7px;color:#52efad;font:800 10px/1 Orbitron}.home226-perks{display:grid;gap:8px;margin:14px 0}.home226-perks span{display:flex;align-items:center;gap:8px;color:#c7e5ef;font:600 10px/1.3 Inter}.home226-perks i{width:7px;height:7px;transform:rotate(45deg);background:#35efaa;box-shadow:0 0 10px rgba(53,239,170,.45)}.home226-actions{display:grid;gap:8px;margin-top:16px}.home226-actions a{display:flex;align-items:center;justify-content:center;min-height:46px;border-radius:12px;text-decoration:none;font:900 10px/1 Orbitron;letter-spacing:.02em;transition:transform .15s ease,filter .15s ease,border-color .15s ease}.home226-actions a:hover{transform:translateY(-1px);filter:brightness(1.05)}.home226-donate{border:1px solid rgba(91,238,255,.42);background:linear-gradient(90deg,#49ddff,#2cd9e9 45%,#35e9b7);color:#00121b;box-shadow:0 12px 30px rgba(35,210,226,.15)}.home226-discord{border:1px solid rgba(120,106,255,.30);background:linear-gradient(135deg,rgba(77,72,170,.55),rgba(37,45,92,.62));color:#e8e7ff}.home226-contact{border:1px solid rgba(70,202,255,.16);background:#031d2d;color:#9ed4e6}.home226-note{margin:10px 0 0;color:#638fa1;font:500 9px/1.45 Inter;text-align:center}
      @media(max-width:920px){.home226-donation{padding:58px 0 64px}.home226-grid{grid-template-columns:1fr}.home226-pass{max-width:none}.home226-head{text-align:left;margin-bottom:22px}.home226-head p{margin-left:0}.home226-steps{grid-template-columns:1fr 1fr 1fr}}
      @media(max-width:640px){.home226-donation{padding:42px 0 48px}.home226-main,.home226-pass{border-radius:17px}.home226-main{padding:14px}.home226-main-top{display:block}.home226-fast{width:max-content;margin-top:10px}.home226-steps{grid-template-columns:1fr}.home226-step{padding:13px}.home226-trust{grid-template-columns:1fr}.home226-pass{padding:15px}.home226-price strong{font-size:36px}.home226-actions a{min-height:48px}.home226-head h2{font-size:28px}}
      `;
      document.head.appendChild(style);
    }

    old.outerHTML = `
    <section class="home226-donation" data-home226-donation>
      <div class="shell home226-shell">
        <div class="home226-head reveal">
          <div class="home226-kicker"><i></i><span data-l10n-es="APOYA NEITH · ACTIVA PREMIUM" data-l10n-en="SUPPORT NEITH · ACTIVATE PREMIUM">SUPPORT NEITH · ACTIVATE PREMIUM</span></div>
          <h2><span data-l10n-es="APOYA EL PROYECTO." data-l10n-en="SUPPORT THE PROJECT.">SUPPORT THE PROJECT.</span><span data-l10n-es="RECIBE 30 DÍAS PREMIUM." data-l10n-en="GET 30 DAYS PREMIUM.">GET 30 DAYS PREMIUM.</span></h2>
          <p data-l10n-es="Una contribución directa para seguir desarrollando Neith. Identifica tu cuenta correctamente y tu PREMIUM será activado manualmente en menos de 24 horas." data-l10n-en="A direct contribution that helps keep Neith moving forward. Identify your account correctly and your PREMIUM will be activated manually in less than 24 hours.">A direct contribution that helps keep Neith moving forward. Identify your account correctly and your PREMIUM will be activated manually in less than 24 hours.</p>
        </div>
        <div class="home226-grid reveal">
          <article class="home226-main">
            <div class="home226-main-top">
              <div><small data-l10n-es="ACTIVACIÓN PREMIUM" data-l10n-en="PREMIUM ACTIVATION">PREMIUM ACTIVATION</small><h3 data-l10n-es="3 PASOS. DIRECTO Y SENCILLO." data-l10n-en="3 STEPS. DIRECT AND SIMPLE.">3 STEPS. DIRECT AND SIMPLE.</h3><p data-l10n-es="Tu nombre de usuario de Neith es la referencia que utilizamos para activar correctamente tu cuenta." data-l10n-en="Your Neith username is the reference we use to activate the correct account.">Your Neith username is the reference we use to activate the correct account.</p></div>
              <span class="home226-fast"><i></i><span data-l10n-es="ACTIVACIÓN < 24H" data-l10n-en="ACTIVATION < 24H">ACTIVATION < 24H</span></span>
            </div>
            <div class="home226-steps">
              <div class="home226-step"><em>01</em><b data-l10n-es="REALIZA LA DONACIÓN" data-l10n-en="MAKE THE DONATION">MAKE THE DONATION</b><span data-l10n-es="Pulsa DONAR y realiza una contribución de 4,90 € mediante PayPal." data-l10n-en="Press DONATE and make a €4.90 contribution through PayPal.">Press DONATE and make a €4.90 contribution through PayPal.</span></div>
              <div class="home226-step"><em>02</em><b data-l10n-es="ESCRIBE TU USUARIO" data-l10n-en="ADD YOUR USERNAME">ADD YOUR USERNAME</b><span data-l10n-es="En las notas de PayPal escribe exactamente tu nombre de usuario de Neith. Es importante." data-l10n-en="In the PayPal note, write your exact Neith username. This is important.">In the PayPal note, write your exact Neith username. This is important.</span></div>
              <div class="home226-step"><em>03</em><b data-l10n-es="RECIBE PREMIUM" data-l10n-en="RECEIVE PREMIUM">RECEIVE PREMIUM</b><span data-l10n-es="Tu cuenta recibirá <strong>30 días PREMIUM</strong> y el launcher lo detectará automáticamente." data-l10n-en="Your account receives <strong>30 days PREMIUM</strong> and the launcher detects it automatically.">Your account receives <strong>30 days PREMIUM</strong> and the launcher detects it automatically.</span></div>
            </div>
            <div class="home226-trust"><span><i></i><b data-l10n-es="MISMA CUENTA NEITH" data-l10n-en="SAME NEITH ACCOUNT">SAME NEITH ACCOUNT</b></span><span><i></i><b data-l10n-es="ACTIVACIÓN VERIFICADA" data-l10n-en="VERIFIED ACTIVATION">VERIFIED ACTIVATION</b></span><span><i></i><b data-l10n-es="SOPORTE DIRECTO" data-l10n-en="DIRECT SUPPORT">DIRECT SUPPORT</b></span></div>
          </article>
          <aside class="home226-pass">
            <div class="home226-pass-top"><span>NEITH PREMIUM PASS</span><b>30 DAYS</b></div>
            <div class="home226-price"><small data-l10n-es="CONTRIBUCIÓN ÚNICA" data-l10n-en="ONE-TIME CONTRIBUTION">ONE-TIME CONTRIBUTION</small><strong>€4.90</strong><span data-l10n-es="30 DÍAS PREMIUM" data-l10n-en="30 DAYS PREMIUM">30 DAYS PREMIUM</span></div>
            <div class="home226-perks"><span><i></i><b data-l10n-es="Acceso a todas las funciones PREMIUM" data-l10n-en="Access to all PREMIUM features">Access to all PREMIUM features</b></span><span><i></i><b data-l10n-es="Activación ligada a tu Neith ID" data-l10n-en="Activation linked to your Neith ID">Activation linked to your Neith ID</b></span><span><i></i><b data-l10n-es="Detección automática en el launcher" data-l10n-en="Automatic detection in the launcher">Automatic detection in the launcher</b></span></div>
            <div class="home226-actions"><a class="home226-donate" href="https://www.paypal.com/paypalme/Lokodoco/4.90" target="_blank" rel="noopener"><span data-l10n-es="DONAR €4,90 · ACTIVAR PREMIUM" data-l10n-en="DONATE €4.90 · ACTIVATE PREMIUM">DONATE €4.90 · ACTIVATE PREMIUM</span></a><a class="home226-discord" href="https://discord.gg/Dgkc6wv79F" target="_blank" rel="noopener"><span data-l10n-es="UNIRME AL DISCORD" data-l10n-en="JOIN DISCORD">JOIN DISCORD</span></a><a class="home226-contact" href="mailto:xjacobo1987@gmail.com?subject=Neith%20Premium%20Donation%20Support"><span data-l10n-es="CONTACTAR CON NEITH" data-l10n-en="CONTACT NEITH">CONTACT NEITH</span></a></div>
            <p class="home226-note" data-l10n-es="IMPORTANTE: incluye tu usuario de Neith en la nota de PayPal para que podamos identificar tu cuenta." data-l10n-en="IMPORTANT: include your Neith username in the PayPal note so we can identify your account.">IMPORTANT: include your Neith username in the PayPal note so we can identify your account.</p>
          </aside>
        </div>
      </div>
    </section>`;

    function applyDonationLanguage(){
      const lang = window.NeithI18n?.language || document.documentElement.lang || 'en';
      document.querySelectorAll('[data-home226-donation] [data-l10n-es][data-l10n-en]').forEach(el => {
        const value = lang === 'es' ? el.dataset.l10nEs : el.dataset.l10nEn;
        if (el.tagName === 'SPAN' && /<strong>/i.test(value)) el.innerHTML = value;
        else el.textContent = value;
      });
    }
    applyDonationLanguage();
    window.addEventListener('neith:languagechange', applyDonationLanguage);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', installDonationSection, {once:true});
  else installDonationSection();

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

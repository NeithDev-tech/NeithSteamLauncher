(() => {
  'use strict';

  const ownerCache = new Map();

  function sanitize(root = document) {
    root.querySelectorAll?.('[data-auth-nav]').forEach(btn => {
      btn.removeAttribute('href');
      btn.removeAttribute('onclick');
      btn.removeAttribute('target');
      if (btn.tagName === 'BUTTON') btn.type = 'button';
    });
  }

  function ensurePremiumStyle() {
    if (document.getElementById('neith-premium-owner-shortcut-style')) return;
    const style = document.createElement('style');
    style.id = 'neith-premium-owner-shortcut-style';
    style.textContent = `.neith-owner-premium-shortcut{display:none;align-items:center;justify-content:center;min-height:38px;padding:0 clamp(10px,1vw,15px);margin:0;border:1px solid rgba(255,214,84,.38);border-radius:12px;background:linear-gradient(135deg,rgba(93,68,12,.88),rgba(49,36,8,.92));color:#ffe675!important;text-decoration:none!important;font:800 clamp(9px,.72vw,11px)/1 Orbitron,Inter,sans-serif;letter-spacing:.055em;white-space:nowrap;flex:0 0 auto;box-shadow:inset 0 1px 0 rgba(255,255,255,.04),0 8px 24px rgba(0,0,0,.18);transition:transform .15s ease,border-color .15s ease,box-shadow .15s ease}.neith-owner-premium-shortcut.ready{display:inline-flex}.neith-owner-premium-shortcut:hover{transform:translateY(-1px);border-color:rgba(255,222,106,.72);box-shadow:0 9px 25px rgba(201,147,31,.15)}@media(max-width:1180px){.neith-owner-premium-shortcut{min-height:36px;padding-inline:9px}}@media(max-width:1040px){.neith-owner-premium-shortcut{width:100%;min-height:42px}}`;
    document.head.appendChild(style);
  }

  function ensurePublicPurchaseHiddenStyle() {
    if (document.getElementById('neith-hide-public-premium-purchase')) return;
    const style = document.createElement('style');
    style.id = 'neith-hide-public-premium-purchase';
    style.textContent = `
      .neith-plan-dualprice,
      .home44-plan-action-premium,
      .premium147-price-grid,
      .premium147-plan-actions--premium,
      .premium147-store-state,
      .premium147-note,
      .premium147-cta-panel,
      .premium147-pills > span:nth-child(2) { display:none !important; }
    `;
    document.head.appendChild(style);
  }

  const donationCopy = {
    en: {
      kicker: 'NEITH PREMIUM // SUPPORT THE PROJECT',
      badge: '30 DAYS · FULL PREMIUM',
      titleA: 'SUPPORT NEITH.',
      titleB: 'UNLOCK 30 DAYS PREMIUM.',
      intro: 'A direct contribution to keep Neith growing. Donate €4.90, identify your Neith username in the PayPal note and your account will be activated in less than 24 hours.',
      pass: 'NEITH PREMIUM PASS',
      passSub: 'SUPPORT EDITION',
      priceSub: 'ONE-TIME DONATION',
      activation: 'MANUAL VERIFIED ACTIVATION',
      step1: 'DONATE €4.90',
      step1p: 'Open the official Neith PayPal donation link.',
      step2: 'ADD YOUR NEITH USERNAME',
      step2p: 'Write your exact Neith username in the donation note.',
      step3: 'PREMIUM ACTIVATED',
      step3p: 'We verify the donation and activate 30 full days in under 24 hours.',
      important: 'IMPORTANT',
      importantText: 'Your Neith username in the PayPal note is required so we know which account to activate.',
      donate: 'DONATE €4.90 · GET PREMIUM',
      discord: 'JOIN DISCORD',
      contact: 'CONTACT NEITH',
      feature1: '30 FULL DAYS OF PREMIUM',
      feature2: 'ALL PREMIUM FEATURES',
      feature3: 'NO AUTOMATIC RENEWAL',
      feature4: 'ACTIVATION < 24H',
      footA: 'ONE NEITH ID',
      footB: 'VERIFIED ACTIVATION',
      footC: 'NO SUBSCRIPTION',
      footD: 'DIRECT SUPPORT'
    },
    es: {
      kicker: 'NEITH PREMIUM // APOYA EL PROYECTO',
      badge: '30 DÍAS · PREMIUM COMPLETO',
      titleA: 'APOYA NEITH.',
      titleB: 'DESBLOQUEA 30 DÍAS PREMIUM.',
      intro: 'Una aportación directa para ayudar a que Neith siga creciendo. Dona 4,90 €, identifica tu usuario de Neith en la nota de PayPal y tu cuenta será activada en menos de 24 horas.',
      pass: 'NEITH PREMIUM PASS',
      passSub: 'SUPPORT EDITION',
      priceSub: 'DONACIÓN ÚNICA',
      activation: 'ACTIVACIÓN MANUAL VERIFICADA',
      step1: 'DONA 4,90 €',
      step1p: 'Abre el enlace oficial de donación PayPal de Neith.',
      step2: 'AÑADE TU USUARIO DE NEITH',
      step2p: 'Escribe tu nombre exacto de usuario Neith en la nota de la donación.',
      step3: 'PREMIUM ACTIVADO',
      step3p: 'Verificamos la donación y activamos 30 días completos en menos de 24 horas.',
      important: 'IMPORTANTE',
      importantText: 'Es obligatorio poner tu usuario de Neith en la nota de PayPal para saber qué cuenta debemos activar.',
      donate: 'DONAR 4,90 € · CONSEGUIR PREMIUM',
      discord: 'UNIRME A DISCORD',
      contact: 'CONTACTAR CON NEITH',
      feature1: '30 DÍAS COMPLETOS DE PREMIUM',
      feature2: 'TODAS LAS FUNCIONES PREMIUM',
      feature3: 'SIN RENOVACIÓN AUTOMÁTICA',
      feature4: 'ACTIVACIÓN < 24H',
      footA: 'UN NEITH ID',
      footB: 'ACTIVACIÓN VERIFICADA',
      footC: 'SIN SUSCRIPCIÓN',
      footD: 'APOYO DIRECTO'
    }
  };

  function donationLanguage() {
    return window.NeithI18n?.language === 'es' ? 'es' : 'en';
  }

  function ensureDonationStyle() {
    if (document.getElementById('neith-home-donation-r229-style')) return;
    const style = document.createElement('style');
    style.id = 'neith-home-donation-r229-style';
    style.textContent = `
      .home44-membership.home228-donation-mode{position:relative;overflow:hidden;padding:78px 0 82px!important;background:radial-gradient(circle at 13% 25%,rgba(0,222,255,.14),transparent 32%),radial-gradient(circle at 88% 12%,rgba(100,82,255,.18),transparent 34%),linear-gradient(180deg,#00101f 0%,#04192f 52%,#00101f 100%)!important;border-top:1px solid rgba(65,220,255,.18);border-bottom:1px solid rgba(65,220,255,.14)}
      .home44-membership.home228-donation-mode:before{content:"";position:absolute;inset:0;pointer-events:none;background-image:linear-gradient(rgba(58,207,255,.04) 1px,transparent 1px),linear-gradient(90deg,rgba(58,207,255,.04) 1px,transparent 1px);background-size:48px 48px;mask-image:linear-gradient(to bottom,transparent,black 15%,black 85%,transparent)}
      .home228-donation-mode .home44-membership-ambient{display:block!important;opacity:.45}
      .home228-donation-mode .home44-membership-shell{position:relative;z-index:2;max-width:1180px;margin:0 auto}
      .home228-donation-mode .home44-membership-head{display:block!important;opacity:1!important;transform:none!important;text-align:left;max-width:none;margin:0 0 26px}
      .home228-donation-mode .home44-membership-kicker{display:inline-flex;align-items:center;gap:9px;color:#54e8ff}
      .home228-donation-mode .home44-membership-kicker b{margin-left:8px;padding:6px 9px;border:1px solid rgba(58,244,169,.25);border-radius:999px;background:rgba(34,110,81,.12);color:#5bf2ae;font-size:9px}
      .home228-donation-mode .home44-membership-head h2{max-width:950px;margin:12px 0 10px;font:900 clamp(32px,4.6vw,62px)/.98 Orbitron,Inter,sans-serif;letter-spacing:-.035em;text-align:left;color:#f4fdff}
      .home228-donation-mode .home44-membership-head h2 span{display:block;background:linear-gradient(90deg,#50eaff,#27b1ff 55%,#8970ff);-webkit-background-clip:text;background-clip:text;color:transparent}
      .home228-donation-mode .home44-membership-head p{max-width:790px;margin:0;color:#93bac9;font:500 14px/1.65 Inter,sans-serif;text-align:left}
      .home228-donation-mode .home44-plan-grid{display:grid!important;grid-template-columns:1fr!important;gap:0!important;opacity:1!important;transform:none!important}
      .home228-donation-mode .home44-plan-free{display:none!important}
      .home228-donation-mode .home44-plan-premium{display:block!important;min-height:0!important;padding:0!important;overflow:visible!important;border:0!important;background:transparent!important;box-shadow:none!important}
      .home228-panel{display:grid;grid-template-columns:minmax(0,1.35fr) minmax(330px,.65fr);gap:18px}
      .home228-main,.home228-pass{position:relative;overflow:hidden;border:1px solid rgba(64,219,255,.23);border-radius:22px;background:linear-gradient(145deg,rgba(6,34,55,.96),rgba(2,18,31,.98));box-shadow:0 25px 70px rgba(0,0,0,.28),inset 0 1px 0 rgba(255,255,255,.035)}
      .home228-main{padding:23px}.home228-pass{padding:24px;background:radial-gradient(circle at 88% 0%,rgba(93,91,255,.22),transparent 38%),linear-gradient(155deg,#08243c,#041625 72%)}
      .home228-main:before,.home228-pass:before{content:"";position:absolute;inset:0;pointer-events:none;background:linear-gradient(115deg,rgba(70,227,255,.08),transparent 27%,transparent 72%,rgba(116,84,255,.08))}
      .home228-main-top{position:relative;display:flex;align-items:center;justify-content:space-between;gap:15px;padding-bottom:17px;border-bottom:1px solid rgba(67,213,255,.13)}
      .home228-brand{display:flex;align-items:center;gap:13px}.home228-orb{width:47px;height:47px;border-radius:50%;display:grid;place-items:center;background:radial-gradient(circle at 35% 30%,#7af7ff,#1aa7ea 48%,#5346df);box-shadow:0 0 30px rgba(56,191,255,.3);font:900 18px/1 Orbitron;color:#fff}
      .home228-brand small,.home228-brand strong{display:block}.home228-brand small{color:#76aabd;font:700 9px/1 Inter;letter-spacing:.15em}.home228-brand strong{margin-top:5px;font:900 17px/1 Orbitron;color:#effcff}
      .home228-verify{padding:8px 10px;border:1px solid rgba(59,244,169,.22);border-radius:9px;background:rgba(36,111,80,.1);color:#57efaa;font:800 8px/1 Orbitron;white-space:nowrap}
      .home228-steps{position:relative;display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-top:17px}.home228-step{min-height:140px;padding:15px;border:1px solid rgba(62,207,255,.14);border-radius:14px;background:linear-gradient(145deg,rgba(3,29,47,.9),rgba(1,18,31,.94))}.home228-step-num{display:flex;align-items:center;justify-content:space-between;margin-bottom:18px}.home228-step-num b{font:900 21px/1 Orbitron;color:#51dffc}.home228-step-num i{width:29px;height:1px;background:linear-gradient(90deg,#51dffc,transparent)}.home228-step strong{display:block;color:#ecfbff;font:800 10px/1.25 Orbitron}.home228-step p{margin:7px 0 0;color:#7fa8b9;font:500 11px/1.5 Inter}
      .home228-alert{position:relative;margin-top:10px;padding:12px 14px;border:1px solid rgba(255,207,72,.24);border-radius:11px;background:linear-gradient(90deg,rgba(121,82,13,.17),rgba(47,32,7,.09));color:#d9c989;font:600 11px/1.5 Inter}.home228-alert b{color:#ffe278;margin-right:7px}
      .home228-actions{position:relative;z-index:5;display:grid;grid-template-columns:1.5fr .8fr .8fr;gap:9px;margin-top:13px}.home228-actions a{position:relative;z-index:6;pointer-events:auto;min-height:48px;display:flex;align-items:center;justify-content:center;border-radius:11px;text-decoration:none!important;font:900 9px/1.15 Orbitron;letter-spacing:.04em;transition:transform .16s ease,box-shadow .16s ease}.home228-actions a:hover{transform:translateY(-2px)}.home228-donate{border:1px solid rgba(85,238,255,.58);background:linear-gradient(100deg,#42e7ff,#29b8ff 53%,#7161ff);color:#00131e!important;box-shadow:0 12px 30px rgba(40,180,255,.18)}.home228-discord{border:1px solid rgba(123,107,255,.36);background:linear-gradient(135deg,rgba(76,67,180,.58),rgba(48,44,118,.64));color:#eceaff!important}.home228-contact{border:1px solid rgba(67,216,255,.23);background:#06263b;color:#d5f3ff!important}
      .home228-pass-head{position:relative;display:flex;align-items:center;justify-content:space-between}.home228-pass-head small,.home228-pass-head strong{display:block}.home228-pass-head small{color:#76adbf;font:700 8px/1 Inter;letter-spacing:.16em}.home228-pass-head strong{margin-top:5px;font:900 13px/1 Orbitron;color:#effcff}.home228-chip{padding:7px 9px;border:1px solid rgba(255,215,82,.3);border-radius:8px;background:rgba(113,82,13,.18);color:#ffe474;font:800 8px/1 Orbitron}.home228-price{position:relative;margin:31px 0 7px;font:900 clamp(48px,6vw,72px)/.9 Orbitron;color:#f6fdff;letter-spacing:-.045em}.home228-price sup{font-size:.34em;color:#6ee7ff;vertical-align:top;margin-right:3px}.home228-price-sub{position:relative;color:#59ebb0;font:800 9px/1 Orbitron;letter-spacing:.09em}.home228-pass-list{position:relative;display:grid;gap:9px;margin-top:23px}.home228-pass-list span{display:flex;align-items:center;gap:9px;padding:9px 10px;border:1px solid rgba(67,215,255,.11);border-radius:9px;background:rgba(2,24,40,.75);color:#a9cbd8;font:600 10px/1.25 Inter}.home228-pass-list i{width:7px;height:7px;border-radius:50%;background:#44efac;box-shadow:0 0 11px rgba(68,239,172,.7)}
      .home228-notes{display:grid!important;grid-template-columns:repeat(4,1fr)!important;gap:9px!important;margin-top:13px!important;opacity:1!important;transform:none!important}.home228-notes span{display:block!important;padding:10px!important;border:1px solid rgba(61,207,244,.11)!important;border-radius:9px!important;background:rgba(3,24,39,.65)!important;color:#719fb0!important;text-align:center!important;font:700 8px/1.2 Orbitron!important}.home228-notes i{display:none!important}.home228-notes b{color:#58eab0}
      @media(max-width:920px){.home228-panel{grid-template-columns:1fr}.home228-pass{min-height:360px}.home228-donation-mode .home44-membership-head h2{font-size:clamp(30px,7vw,48px)}}
      @media(max-width:650px){.home44-membership.home228-donation-mode{padding:56px 0 60px!important}.home228-main,.home228-pass{padding:16px;border-radius:16px}.home228-main-top{align-items:flex-start}.home228-verify{display:none}.home228-steps{grid-template-columns:1fr}.home228-step{min-height:0}.home228-actions{grid-template-columns:1fr}.home228-actions a{min-height:50px}.home228-notes{grid-template-columns:1fr 1fr!important}.home228-donation-mode .home44-membership-head p{font-size:12px}.home228-donation-mode .home44-membership-kicker b{display:none}}
    `;
    document.head.appendChild(style);
  }

  function donationPanelMarkup() {
    return `
      <div class="home228-panel">
        <div class="home228-main">
          <div class="home228-main-top">
            <div class="home228-brand"><div class="home228-orb">N</div><div><small>NEITH PREMIUM</small><strong data-donation-key="activation"></strong></div></div>
            <div class="home228-verify">✓ PREMIUM · 30 DAYS</div>
          </div>
          <div class="home228-steps">
            <div class="home228-step"><div class="home228-step-num"><b>01</b><i></i></div><strong data-donation-key="step1"></strong><p data-donation-key="step1p"></p></div>
            <div class="home228-step"><div class="home228-step-num"><b>02</b><i></i></div><strong data-donation-key="step2"></strong><p data-donation-key="step2p"></p></div>
            <div class="home228-step"><div class="home228-step-num"><b>03</b><i></i></div><strong data-donation-key="step3"></strong><p data-donation-key="step3p"></p></div>
          </div>
          <div class="home228-alert"><b data-donation-key="important"></b><span data-donation-key="importantText"></span></div>
          <div class="home228-actions">
            <a class="home228-donate" href="https://www.paypal.com/paypalme/Lokodoco/4.90" target="_blank" rel="noopener"><span data-donation-key="donate"></span></a>
            <a class="home228-discord" href="https://discord.gg/Dgkc6wv79F" target="_blank" rel="noopener"><span data-donation-key="discord"></span></a>
            <a class="home228-contact" href="#neith-contact" data-neith-contact-open=""><span data-donation-key="contact"></span></a>
          </div>
        </div>
        <aside class="home228-pass">
          <div class="home228-pass-head"><div><small data-donation-key="passSub"></small><strong data-donation-key="pass"></strong></div><span class="home228-chip">SUPPORT</span></div>
          <div class="home228-price"><sup>€</sup>4.90</div>
          <div class="home228-price-sub" data-donation-key="priceSub"></div>
          <div class="home228-pass-list"><span><i></i><b data-donation-key="feature1"></b></span><span><i></i><b data-donation-key="feature2"></b></span><span><i></i><b data-donation-key="feature3"></b></span><span><i></i><b data-donation-key="feature4"></b></span></div>
        </aside>
      </div>`;
  }

  function donationShellMarkup() {
    return `
      <div aria-hidden="true" class="home44-membership-ambient"><i></i><i></i><i></i></div>
      <div class="shell home44-membership-shell">
        <div class="home44-membership-head">
          <div class="home44-membership-kicker"><i></i><span data-donation-key="kicker"></span><b data-donation-key="badge"></b></div>
          <h2><span data-donation-key="titleA"></span><span data-donation-key="titleB"></span></h2>
          <p data-donation-key="intro"></p>
        </div>
        <div class="home44-plan-grid">
          <article class="home44-plan home44-plan-premium">${donationPanelMarkup()}</article>
        </div>
        <div class="home44-membership-notes home228-notes">
          <span><b data-donation-key="footA"></b></span>
          <span><b data-donation-key="footB"></b></span>
          <span><b data-donation-key="footC"></b></span>
          <span><b data-donation-key="footD"></b></span>
        </div>
      </div>`;
  }

  function applyDonationLanguage() {
    const copy = donationCopy[donationLanguage()];
    document.querySelectorAll('.home228-donation-mode').forEach(root => {
      root.querySelectorAll('[data-donation-key]').forEach(el => {
        const value = copy[el.dataset.donationKey];
        if (value != null) el.textContent = value;
      });
    });
  }

  function installHomeDonation() {
    const section = document.querySelector('.home44-membership');
    if (!section || section.dataset.home228Ready === '1') return;
    const head = section.querySelector('.home44-membership-head');
    const kicker = section.querySelector('.home44-membership-kicker');
    const title = head?.querySelector('h2');
    const intro = head?.querySelector('p');
    const freeCard = section.querySelector('.home44-plan-free');
    const premiumCard = section.querySelector('.home44-plan-premium');
    const notes = section.querySelector('.home44-membership-notes');
    if (!head || !kicker || !title || !intro || !premiumCard || !notes) return;

    ensureDonationStyle();
    section.dataset.home228Ready = '1';
    section.classList.add('home228-donation-mode');
    freeCard?.remove();
    kicker.innerHTML = '<i></i><span data-donation-key="kicker"></span><b data-donation-key="badge"></b>';
    title.innerHTML = '<span data-donation-key="titleA"></span><span data-donation-key="titleB"></span>';
    intro.setAttribute('data-donation-key','intro');
    premiumCard.innerHTML = donationPanelMarkup();
    notes.classList.add('home228-notes');
    notes.innerHTML = '<span><b data-donation-key="footA"></b></span><span><b data-donation-key="footB"></b></span><span><b data-donation-key="footC"></b></span><span><b data-donation-key="footD"></b></span>';
  }

  function installFeatureDonations() {
    const selectors = ['.bp172-plans', '.logros178-plans', '.freegames144-plans', '.accounts145-plans'];
    let changed = false;
    selectors.forEach(selector => {
      const section = document.querySelector(selector);
      if (!section || section.dataset.home229Ready === '1') return;
      section.dataset.home229Ready = '1';
      section.classList.add('home44-membership', 'home228-donation-mode');
      section.removeAttribute('id');
      section.innerHTML = donationShellMarkup();
      changed = true;
    });
    if (changed) ensureDonationStyle();
  }


  function ensureSupportContact() {
    if (document.getElementById('neith-support-contact-r257-style')) return;
    const style = document.createElement('style');
    style.id = 'neith-support-contact-r257-style';
    style.textContent = `
      .neith-support-modal{position:fixed;inset:0;z-index:2147483000;display:grid;place-items:center;padding:clamp(16px,3vw,34px);opacity:0;visibility:hidden;pointer-events:none;transition:opacity .18s ease,visibility .18s ease}
      .neith-support-modal.is-open{opacity:1;visibility:visible;pointer-events:auto}
      .neith-support-backdrop{position:absolute;inset:0;background:rgba(0,7,15,.78);backdrop-filter:blur(10px)}
      .neith-support-dialog{position:relative;width:min(92vw,760px);max-height:88vh;overflow:auto;border:1px solid rgba(65,221,255,.34);border-radius:22px;background:linear-gradient(155deg,#06243a,#031421 72%);box-shadow:0 30px 100px rgba(0,0,0,.58),0 0 55px rgba(0,207,255,.12);padding:clamp(20px,3vw,30px)}
      .neith-support-top{display:flex;align-items:flex-start;justify-content:space-between;gap:18px;margin-bottom:20px}.neith-support-top small{display:block;color:#62e7ff;font:800 9px/1 Orbitron;letter-spacing:.15em}.neith-support-top h3{margin:7px 0 0;color:#f5fdff;font:900 clamp(18px,2.3vw,26px)/1.08 Orbitron}.neith-support-close{width:38px;height:38px;border:1px solid rgba(78,223,255,.25);border-radius:10px;background:#07273b;color:#d8f8ff;font-size:22px;cursor:pointer}
      .neith-support-account{display:flex;align-items:center;gap:12px;padding:12px 14px;margin-bottom:17px;border:1px solid rgba(62,213,255,.14);border-radius:12px;background:rgba(2,22,37,.72)}.neith-support-account i{width:9px;height:9px;border-radius:50%;background:#45efac;box-shadow:0 0 13px rgba(69,239,172,.75)}.neith-support-account span{color:#8db6c8;font:600 12px/1.3 Inter}.neith-support-account b{color:#eafaff}
      .neith-support-form{display:grid;gap:15px}.neith-support-field{display:grid;gap:8px}.neith-support-field label{color:#6ddff9;font:800 9px/1 Orbitron;letter-spacing:.1em}.neith-support-field input,.neith-support-field textarea{width:100%;box-sizing:border-box;border:1px solid rgba(59,202,241,.2);border-radius:12px;background:#021522;color:#ecfbff;font:500 14px/1.45 Inter;outline:none;padding:13px 14px}.neith-support-field textarea{min-height:170px;resize:vertical}.neith-support-field input:focus,.neith-support-field textarea:focus{border-color:rgba(72,231,255,.64);box-shadow:0 0 0 3px rgba(50,214,255,.07)}
      .neith-support-status{min-height:20px;color:#8db6c8;font:600 12px/1.4 Inter}.neith-support-status.ok{color:#57efad}.neith-support-status.error{color:#ff7f96}
      .neith-support-actions{display:flex;justify-content:flex-end;gap:10px}.neith-support-actions button{min-height:44px;padding:0 18px;border-radius:11px;font:900 9px/1 Orbitron;letter-spacing:.04em;cursor:pointer}.neith-support-cancel{border:1px solid rgba(68,211,248,.2);background:#06263b;color:#d5f3ff}.neith-support-send{border:1px solid rgba(85,238,255,.58);background:linear-gradient(100deg,#42e7ff,#29b8ff 53%,#7161ff);color:#00131e}.neith-support-send:disabled{opacity:.55;cursor:wait}
      body.neith-support-open{overflow:hidden}
      @media(max-width:620px){.neith-support-actions{flex-direction:column-reverse}.neith-support-actions button{width:100%}}
    `;
    document.head.appendChild(style);

    const modal = document.createElement('div');
    modal.className = 'neith-support-modal';
    modal.setAttribute('aria-hidden','true');
    modal.innerHTML = `<div class="neith-support-backdrop" data-support-close></div><section class="neith-support-dialog" role="dialog" aria-modal="true" aria-labelledby="neith-support-title"><div class="neith-support-top"><div><small>NEITH // DIRECT SUPPORT</small><h3 id="neith-support-title">CONTACT NEITH</h3></div><button class="neith-support-close" type="button" aria-label="Close" data-support-close>×</button></div><div class="neith-support-account"><i></i><span>NEITH ACCOUNT: <b data-support-user>CHECKING...</b></span></div><form class="neith-support-form" data-support-form><div class="neith-support-field"><label for="neith-support-subject">SUBJECT</label><input id="neith-support-subject" name="subject" maxlength="120" required placeholder="Neith Premium / Support"></div><div class="neith-support-field"><label for="neith-support-message">MESSAGE</label><textarea id="neith-support-message" name="message" maxlength="5000" required placeholder="Write your message..."></textarea></div><div class="neith-support-status" data-support-status></div><div class="neith-support-actions"><button class="neith-support-cancel" type="button" data-support-close>CANCEL</button><button class="neith-support-send" type="submit">SEND TO NEITH</button></div></form></section>`;
    document.body.appendChild(modal);

    const form = modal.querySelector('[data-support-form]');
    const status = modal.querySelector('[data-support-status]');
    const userLabel = modal.querySelector('[data-support-user]');
    const send = modal.querySelector('.neith-support-send');
    let lastTrigger = null;

    const paintLanguage = () => {
      const es = donationLanguage() === 'es';
      modal.querySelector('#neith-support-title').textContent = es ? 'CONTACTAR CON NEITH' : 'CONTACT NEITH';
      modal.querySelector('label[for="neith-support-subject"]').textContent = es ? 'ASUNTO' : 'SUBJECT';
      modal.querySelector('label[for="neith-support-message"]').textContent = es ? 'MENSAJE' : 'MESSAGE';
      modal.querySelector('.neith-support-cancel').textContent = es ? 'CANCELAR' : 'CANCEL';
      if (!send.disabled) send.textContent = es ? 'ENVIAR A NEITH' : 'SEND TO NEITH';
    };
    const open = async (trigger) => {
      lastTrigger = trigger || null;
      paintLanguage();
      status.textContent = '';
      status.className = 'neith-support-status';
      const auth = window.NeithAuth;
      const user = auth?.session?.user;
      userLabel.textContent = user?.email || auth?.profile?.display_name || (donationLanguage()==='es'?'INICIA SESIÓN PARA ENVIAR':'SIGN IN TO SEND');
      modal.classList.add('is-open'); modal.setAttribute('aria-hidden','false'); document.body.classList.add('neith-support-open');
      setTimeout(()=>form.elements.subject.focus(),30);
    };
    const close = () => { modal.classList.remove('is-open'); modal.setAttribute('aria-hidden','true'); document.body.classList.remove('neith-support-open'); lastTrigger?.focus?.({preventScroll:true}); };

    document.addEventListener('click', (event) => {
      const trigger = event.target.closest?.('.home228-contact[data-neith-contact-open]');
      if (!trigger) return;
      event.preventDefault(); event.stopPropagation();
      open(trigger);
    }, true);
    modal.addEventListener('click',e=>{if(e.target.closest('[data-support-close]')) close();});
    document.addEventListener('keydown',e=>{if(e.key==='Escape'&&modal.classList.contains('is-open')) close();});
    window.addEventListener('neith:languagechange',paintLanguage);

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const auth = window.NeithAuth;
      const subject = String(form.elements.subject.value || '').trim();
      const message = String(form.elements.message.value || '').trim();
      if (!auth?.client || !auth?.session?.user) {
        status.className='neith-support-status error';
        status.textContent = donationLanguage()==='es' ? 'Inicia sesión con tu cuenta Neith para enviar el mensaje.' : 'Sign in with your Neith account to send the message.';
        return;
      }
      if (subject.length < 3 || message.length < 3) return;
      send.disabled = true; send.textContent = donationLanguage()==='es' ? 'ENVIANDO...' : 'SENDING...';
      status.className='neith-support-status'; status.textContent='';
      try {
        const { data, error } = await auth.client.functions.invoke('neith-support-email',{ body:{subject,message} });
        if (error || !data?.ok) throw error || new Error(data?.error || 'delivery_failed');
        status.className='neith-support-status ok';
        status.textContent = donationLanguage()==='es' ? 'Mensaje enviado correctamente a Neith.' : 'Message sent successfully to Neith.';
        form.elements.message.value='';
      } catch (err) {
        console.error('neith_support_send_error',err);
        status.className='neith-support-status error';
        status.textContent = donationLanguage()==='es' ? 'No se pudo enviar el mensaje. Comprueba tu sesión e inténtalo de nuevo.' : 'The message could not be sent. Check your session and try again.';
      } finally {
        send.disabled=false; paintLanguage();
      }
    });
  }

  function premiumUrl() {
    const current = new URL(window.location.href);
    const root = `${current.origin}/`;
    return new URL('premium/', root).href;
  }

  function removePremiumShortcut() {
    document.querySelectorAll('[data-owner-premium-shortcut]').forEach(el => el.remove());
  }

  async function syncPremiumShortcut() {
    ensurePremiumStyle();
    const auth = window.NeithAuth;
    const userId = auth?.session?.user?.id;
    if (!auth?.client || !userId) { removePremiumShortcut(); return; }
    let isOwner = ownerCache.get(userId);
    if (typeof isOwner !== 'boolean') {
      try {
        const { data, error } = await auth.client.rpc('neith_is_owner');
        if (error) throw error;
        isOwner = data === true;
      } catch { isOwner = false; }
      ownerCache.set(userId, isOwner);
    }
    if (!isOwner) { removePremiumShortcut(); return; }
    const authBtn = document.querySelector('[data-auth-nav]');
    if (!authBtn) return;
    const nav = authBtn.closest('.nav');
    const actions = nav?.querySelector('.nav-actions');
    const download = actions?.querySelector('.nav-download, a.btn.primary');
    let link = document.querySelector('[data-owner-premium-shortcut]');
    if (!link) {
      link = document.createElement('a');
      link.dataset.ownerPremiumShortcut = '';
      link.className = 'neith-owner-premium-shortcut';
      link.textContent = 'PREMIUM';
      link.href = premiumUrl();
    }
    if (actions && link.parentElement !== actions) {
      if (download) actions.insertBefore(link, download);
      else actions.prepend(link);
    }
    requestAnimationFrame(() => link.classList.add('ready'));
  }

  window.addEventListener('click', event => {
    const trigger = event.target.closest?.('[data-auth-nav]');
    if (!trigger) return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    sanitize(trigger.ownerDocument || document);
    const auth = window.NeithAuth;
    if (auth?.handleHeaderTrigger) auth.handleHeaderTrigger(trigger);
    else if (auth?.session?.user) auth.toggleAccountMenu?.(trigger);
    else auth?.open?.('login');
  }, true);

  function boot() {
    sanitize(document);
    ensurePremiumStyle();
    ensurePublicPurchaseHiddenStyle();
    installHomeDonation();
    installFeatureDonations();
    ensureSupportContact();
    applyDonationLanguage();
    syncPremiumShortcut();

    const header = document.querySelector('.topbar');
    if (!header || !('MutationObserver' in window)) return;
    const observer = new MutationObserver(records => {
      let authChanged = false;
      for (const record of records) {
        for (const node of record.addedNodes) {
          if (node.nodeType !== Node.ELEMENT_NODE) continue;
          if (node.matches?.('[data-auth-nav]')) { sanitize(node.parentElement || header); authChanged = true; }
          else if (node.querySelector?.('[data-auth-nav]')) { sanitize(node); authChanged = true; }
        }
      }
      if (authChanged) syncPremiumShortcut();
    });
    observer.observe(header, { subtree: true, childList: true });
  }

  window.addEventListener('neith:authchange', event => {
    const userId = event?.detail?.session?.user?.id;
    if (!userId) ownerCache.clear();
    syncPremiumShortcut();
  });
  window.addEventListener('neith:languagechange', () => requestAnimationFrame(applyDonationLanguage));

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once:true });
  else boot();
})();

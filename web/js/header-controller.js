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
    style.textContent = `.neith-owner-premium-shortcut{display:none;align-items:center;justify-content:center;min-height:38px;padding:0 15px;margin-left:8px;border:1px solid rgba(255,214,84,.38);border-radius:12px;background:linear-gradient(135deg,rgba(93,68,12,.88),rgba(49,36,8,.92));color:#ffe675!important;text-decoration:none!important;font:800 11px/1 Orbitron,Inter,sans-serif;letter-spacing:.055em;box-shadow:inset 0 1px 0 rgba(255,255,255,.04),0 8px 24px rgba(0,0,0,.18);transition:transform .15s ease,border-color .15s ease,box-shadow .15s ease}.neith-owner-premium-shortcut.ready{display:inline-flex}.neith-owner-premium-shortcut:hover{transform:translateY(-1px);border-color:rgba(255,222,106,.72);box-shadow:0 9px 25px rgba(201,147,31,.15)}@media(max-width:980px){.neith-owner-premium-shortcut{margin:7px 0 0;width:100%;min-height:42px}}`;
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

  function donationLang(){ return window.NeithI18n?.language === 'es' ? 'es' : 'en'; }

  function renderDonationLanguage(root){
    if (!root) return;
    const lang = donationLang();
    root.querySelectorAll('[data-en][data-es]').forEach(el => {
      const value = el.getAttribute(`data-${lang}`);
      if (value != null) el.textContent = value;
    });
  }

  function installHomeDonation(){
    const old = document.querySelector('.home44-membership');
    if (!old || document.querySelector('.home227-donation')) return;

    if (!document.getElementById('home227-donation-style')) {
      const style = document.createElement('style');
      style.id = 'home227-donation-style';
      style.textContent = `
      .home227-donation{position:relative;overflow:hidden;padding:78px 0 82px;background:radial-gradient(circle at 12% 24%,rgba(0,222,255,.13),transparent 31%),radial-gradient(circle at 88% 18%,rgba(91,91,255,.17),transparent 34%),linear-gradient(180deg,#00101f 0%,#03182d 48%,#00101f 100%);border-top:1px solid rgba(70,225,255,.18);border-bottom:1px solid rgba(70,225,255,.16);color:#effcff}.home227-donation:before{content:"";position:absolute;inset:0;pointer-events:none;background-image:linear-gradient(rgba(75,211,255,.035) 1px,transparent 1px),linear-gradient(90deg,rgba(75,211,255,.035) 1px,transparent 1px);background-size:48px 48px;mask-image:linear-gradient(to bottom,transparent,black 20%,black 80%,transparent)}.home227-donation:after{content:"";position:absolute;width:560px;height:560px;right:-220px;top:-270px;border:1px solid rgba(70,226,255,.11);border-radius:50%;box-shadow:0 0 0 70px rgba(48,168,255,.025),0 0 0 140px rgba(83,77,255,.022)}.home227-wrap{position:relative;z-index:2;width:min(1180px,calc(100% - 38px));margin:0 auto}.home227-head{display:flex;align-items:flex-end;justify-content:space-between;gap:26px;margin-bottom:28px}.home227-kicker{display:inline-flex;align-items:center;gap:9px;color:#55e8ff;font:800 11px/1 Orbitron,Inter,sans-serif;letter-spacing:.16em}.home227-kicker i{width:28px;height:1px;background:linear-gradient(90deg,transparent,#55e8ff)}.home227-head h2{margin:10px 0 9px;font:900 clamp(30px,4.2vw,58px)/.98 Orbitron,Inter,sans-serif;letter-spacing:-.025em;color:#f4fdff}.home227-head h2 span{display:block;background:linear-gradient(90deg,#53eaff,#29a8ff 58%,#8472ff);-webkit-background-clip:text;background-clip:text;color:transparent}.home227-head p{margin:0;max-width:720px;color:#92b9c9;font:500 14px/1.6 Inter,sans-serif}.home227-live{flex:none;display:flex;align-items:center;gap:9px;padding:10px 13px;border:1px solid rgba(66,247,169,.24);border-radius:999px;background:rgba(24,104,78,.13);color:#59f7b2;font:800 9px/1 Orbitron,Inter,sans-serif;letter-spacing:.08em}.home227-live i{width:7px;height:7px;border-radius:50%;background:#43f2a4;box-shadow:0 0 14px #43f2a4}.home227-grid{display:grid;grid-template-columns:minmax(0,1.3fr) minmax(330px,.7fr);gap:18px}.home227-main,.home227-pass{position:relative;border:1px solid rgba(65,221,255,.22);border-radius:22px;background:linear-gradient(145deg,rgba(6,34,55,.94),rgba(2,19,33,.97));box-shadow:0 24px 70px rgba(0,0,0,.28),inset 0 1px 0 rgba(255,255,255,.03)}.home227-main{padding:23px}.home227-main:before{content:"";position:absolute;inset:0;border-radius:22px;pointer-events:none;background:linear-gradient(120deg,rgba(70,224,255,.08),transparent 25%,transparent 75%,rgba(112,87,255,.07))}.home227-topline{position:relative;display:flex;align-items:center;justify-content:space-between;gap:16px;padding-bottom:17px;border-bottom:1px solid rgba(73,211,255,.13)}.home227-price-lock{display:flex;align-items:center;gap:14px}.home227-orb{width:48px;height:48px;border-radius:50%;display:grid;place-items:center;background:radial-gradient(circle at 35% 30%,#74f6ff,#1c9be8 45%,#4b43da 100%);box-shadow:0 0 30px rgba(52,188,255,.3);font:900 18px/1 Orbitron}.home227-price-lock small,.home227-price-lock strong{display:block}.home227-price-lock small{color:#79aebf;font:700 9px/1 Inter;letter-spacing:.15em}.home227-price-lock strong{margin-top:5px;font:900 18px/1 Orbitron}.home227-verified{display:flex;align-items:center;gap:7px;padding:8px 10px;border:1px solid rgba(58,243,165,.2);border-radius:9px;color:#59efaa;background:rgba(40,112,84,.09);font:800 9px/1 Orbitron}.home227-steps{position:relative;display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-top:17px}.home227-step{min-height:132px;padding:15px;border:1px solid rgba(63,209,255,.13);border-radius:14px;background:linear-gradient(145deg,rgba(3,28,45,.88),rgba(1,19,33,.92))}.home227-step-num{display:flex;align-items:center;justify-content:space-between;margin-bottom:18px}.home227-step-num b{font:900 20px/1 Orbitron;color:#53defc}.home227-step-num i{width:30px;height:1px;background:linear-gradient(90deg,#53defc,transparent)}.home227-step strong{display:block;color:#ecfbff;font:800 11px/1.2 Orbitron}.home227-step p{margin:7px 0 0;color:#7fa9ba;font:500 11px/1.5 Inter}.home227-alert{position:relative;margin-top:10px;padding:12px 14px;border:1px solid rgba(255,206,67,.22);border-radius:11px;background:linear-gradient(90deg,rgba(120,82,14,.15),rgba(43,31,8,.08));color:#dccb85;font:600 11px/1.45 Inter}.home227-alert b{color:#ffe273}.home227-actions{position:relative;display:grid;grid-template-columns:1.5fr .8fr .8fr;gap:9px;margin-top:13px}.home227-actions a{min-height:47px;display:flex;align-items:center;justify-content:center;border-radius:11px;text-decoration:none!important;font:900 10px/1 Orbitron;letter-spacing:.04em;transition:transform .16s ease,box-shadow .16s ease,border-color .16s ease}.home227-actions a:hover{transform:translateY(-2px)}.home227-donate{border:1px solid rgba(80,240,255,.55);background:linear-gradient(100deg,#3be5ff,#2ab6ff 52%,#6d60ff);color:#00121d!important;box-shadow:0 12px 30px rgba(40,182,255,.18)}.home227-discord{border:1px solid rgba(119,103,255,.35);background:linear-gradient(135deg,rgba(75,67,173,.55),rgba(49,45,118,.6));color:#e6e4ff!important}.home227-contact{border:1px solid rgba(69,218,255,.22);background:#06263b;color:#cdefff!important}.home227-pass{overflow:hidden;padding:23px;background:radial-gradient(circle at 80% 8%,rgba(85,112,255,.18),transparent 34%),linear-gradient(160deg,#092137,#041625 72%)}.home227-pass:before{content:"";position:absolute;width:270px;height:270px;right:-92px;top:-105px;border:1px solid rgba(92,219,255,.17);border-radius:50%;box-shadow:0 0 0 38px rgba(58,156,255,.025),0 0 0 76px rgba(98,78,255,.025)}.home227-pass-top{position:relative;display:flex;align-items:center;justify-content:space-between}.home227-pass-brand small,.home227-pass-brand b{display:block}.home227-pass-brand small{color:#76b3c6;font:700 8px/1 Inter;letter-spacing:.16em}.home227-pass-brand b{margin-top:5px;font:900 13px/1 Orbitron}.home227-pass-chip{padding:7px 9px;border:1px solid rgba(255,213,79,.28);border-radius:8px;background:rgba(116,83,13,.17);color:#ffe476;font:800 8px/1 Orbitron}.home227-pass-price{position:relative;margin:31px 0 7px;font:900 clamp(44px,6vw,68px)/.9 Orbitron;color:#f7fdff;letter-spacing:-.04em}.home227-pass-price sup{font-size:.34em;color:#71e7ff;vertical-align:top;margin-right:3px}.home227-pass-sub{position:relative;color:#58eab0;font:800 10px/1 Orbitron;letter-spacing:.08em}.home227-pass-list{position:relative;display:grid;gap:9px;margin:24px 0 0}.home227-pass-list span{display:flex;align-items:center;gap:9px;padding:9px 10px;border:1px solid rgba(70,218,255,.10);border-radius:9px;background:rgba(3,25,42,.72);color:#a9cbd7;font:600 10px/1.2 Inter}.home227-pass-list i{width:7px;height:7px;border-radius:50%;background:#44efac;box-shadow:0 0 11px rgba(68,239,172,.7)}.home227-foot{position:relative;margin-top:15px;padding-top:13px;border-top:1px solid rgba(73,216,255,.12);display:flex;justify-content:space-between;gap:12px;color:#638fa0;font:700 8px/1.3 Inter;letter-spacing:.08em}.home227-foot b{color:#70dff7}.home227-trust{display:grid;grid-template-columns:repeat(4,1fr);gap:9px;margin-top:12px}.home227-trust span{padding:9px 10px;border:1px solid rgba(60,207,242,.10);border-radius:9px;background:rgba(4,25,40,.62);color:#6fa0b2;text-align:center;font:700 8px/1.2 Orbitron;letter-spacing:.04em}.home227-trust b{color:#58eab0}.home227-donation *{box-sizing:border-box}
      @media(max-width:900px){.home227-donation{padding:58px 0}.home227-head{align-items:flex-start}.home227-grid{grid-template-columns:1fr}.home227-pass{min-height:390px}.home227-trust{grid-template-columns:repeat(2,1fr)}}
      @media(max-width:640px){.home227-wrap{width:min(100% - 22px,1180px)}.home227-head{display:block}.home227-live{width:max-content;margin-top:13px}.home227-main,.home227-pass{padding:16px;border-radius:16px}.home227-topline{align-items:flex-start}.home227-verified{display:none}.home227-steps{grid-template-columns:1fr}.home227-step{min-height:auto}.home227-actions{grid-template-columns:1fr}.home227-actions a{min-height:50px}.home227-trust{grid-template-columns:1fr 1fr}.home227-pass{min-height:360px}}
      `;
      document.head.appendChild(style);
    }

    const section = document.createElement('section');
    section.className = 'home227-donation';
    section.setAttribute('aria-label','Neith donation premium');
    section.innerHTML = `
      <div class="home227-wrap">
        <div class="home227-head">
          <div>
            <div class="home227-kicker"><i></i><span data-en="NEITH // SUPPORT THE PROJECT" data-es="NEITH // APOYA EL PROYECTO">NEITH // SUPPORT THE PROJECT</span></div>
            <h2><span data-en="SUPPORT NEITH." data-es="APOYA NEITH.">SUPPORT NEITH.</span><span data-en="GET 30 DAYS PREMIUM." data-es="CONSIGUE 30 DÍAS PREMIUM.">GET 30 DAYS PREMIUM.</span></h2>
            <p data-en="Help Neith keep growing with a direct contribution. Identify your account in the PayPal note and we will activate 30 full days of PREMIUM on your Neith ID." data-es="Ayuda a que Neith siga creciendo con una aportación directa. Identifica tu cuenta en la nota de PayPal y activaremos 30 días completos de PREMIUM en tu Neith ID.">Help Neith keep growing with a direct contribution. Identify your account in the PayPal note and we will activate 30 full days of PREMIUM on your Neith ID.</p>
          </div>
          <div class="home227-live"><i></i><span data-en="MANUAL VERIFIED ACTIVATION" data-es="ACTIVACIÓN MANUAL VERIFICADA">MANUAL VERIFIED ACTIVATION</span></div>
        </div>
        <div class="home227-grid">
          <article class="home227-main">
            <div class="home227-topline">
              <div class="home227-price-lock"><div class="home227-orb">N</div><div><small data-en="NEITH PREMIUM · SUPPORT PASS" data-es="NEITH PREMIUM · SUPPORT PASS">NEITH PREMIUM · SUPPORT PASS</small><strong data-en="DONATE €4.90 · GET 30 DAYS" data-es="DONA €4,90 · CONSIGUE 30 DÍAS">DONATE €4.90 · GET 30 DAYS</strong></div></div>
              <div class="home227-verified">✓ <span data-en="VERIFIED FLOW" data-es="PROCESO VERIFICADO">VERIFIED FLOW</span></div>
            </div>
            <div class="home227-steps">
              <div class="home227-step"><div class="home227-step-num"><b>01</b><i></i></div><strong data-en="OPEN THE DONATION" data-es="ABRE LA DONACIÓN">OPEN THE DONATION</strong><p data-en="Tap the secure PayPal button and send the €4.90 contribution." data-es="Pulsa el botón seguro de PayPal y realiza la aportación de €4,90.">Tap the secure PayPal button and send the €4.90 contribution.</p></div>
              <div class="home227-step"><div class="home227-step-num"><b>02</b><i></i></div><strong data-en="WRITE YOUR NEITH USERNAME" data-es="ESCRIBE TU USUARIO NEITH">WRITE YOUR NEITH USERNAME</strong><p data-en="In the PayPal note, write your exact Neith username so we can identify your account." data-es="En la nota de PayPal escribe tu usuario exacto de Neith para poder identificar tu cuenta.">In the PayPal note, write your exact Neith username so we can identify your account.</p></div>
              <div class="home227-step"><div class="home227-step-num"><b>03</b><i></i></div><strong data-en="PREMIUM ACTIVATED" data-es="PREMIUM ACTIVADO">PREMIUM ACTIVATED</strong><p data-en="Your account will receive 30 PREMIUM days in less than 24 hours after verification." data-es="Tu cuenta recibirá 30 días PREMIUM en menos de 24 horas tras la verificación.">Your account will receive 30 PREMIUM days in less than 24 hours after verification.</p></div>
            </div>
            <div class="home227-alert"><b data-en="IMPORTANT:" data-es="IMPORTANTE:">IMPORTANT:</b> <span data-en="the Neith username in the PayPal note is required to identify the account correctly." data-es="el usuario de Neith en la nota de PayPal es obligatorio para identificar correctamente la cuenta.">the Neith username in the PayPal note is required to identify the account correctly.</span></div>
            <div class="home227-actions">
              <a class="home227-donate" href="https://www.paypal.com/paypalme/Lokodoco/4.90" target="_blank" rel="noopener"><span data-en="DONATE €4.90 · ACTIVATE PREMIUM" data-es="DONAR €4,90 · ACTIVAR PREMIUM">DONATE €4.90 · ACTIVATE PREMIUM</span></a>
              <a class="home227-discord" href="https://discord.gg/Dgkc6wv79F" target="_blank" rel="noopener"><span data-en="JOIN DISCORD" data-es="UNIRME A DISCORD">JOIN DISCORD</span></a>
              <a class="home227-contact" href="mailto:xjacobo1987@gmail.com?subject=Neith%20Premium%20Support"><span data-en="CONTACT NEITH" data-es="CONTACTAR CON NEITH">CONTACT NEITH</span></a>
            </div>
          </article>
          <aside class="home227-pass">
            <div class="home227-pass-top"><div class="home227-pass-brand"><small>NEITH // PREMIUM</small><b data-en="SUPPORT PASS" data-es="SUPPORT PASS">SUPPORT PASS</b></div><span class="home227-pass-chip">30 DAYS</span></div>
            <div class="home227-pass-price"><sup>€</sup>4.90</div>
            <div class="home227-pass-sub" data-en="30 FULL DAYS OF PREMIUM" data-es="30 DÍAS COMPLETOS DE PREMIUM">30 FULL DAYS OF PREMIUM</div>
            <div class="home227-pass-list">
              <span><i></i><b data-en="Full PREMIUM access" data-es="Acceso PREMIUM completo">Full PREMIUM access</b></span>
              <span><i></i><b data-en="Linked to your Neith ID" data-es="Vinculado a tu Neith ID">Linked to your Neith ID</b></span>
              <span><i></i><b data-en="Activation in less than 24h" data-es="Activación en menos de 24h">Activation in less than 24h</b></span>
              <span><i></i><b data-en="No automatic renewal" data-es="Sin renovación automática">No automatic renewal</b></span>
            </div>
            <div class="home227-foot"><span>NEITH PREMIUM ACCESS</span><b data-en="VERIFIED ACTIVATION" data-es="ACTIVACIÓN VERIFICADA">VERIFIED ACTIVATION</b></div>
          </aside>
        </div>
        <div class="home227-trust"><span><b>30 DAYS</b> · PREMIUM</span><span><b>&lt;24H</b> · ACTIVATION</span><span><b>NEITH ID</b> · LINKED</span><span><b>NO AUTO</b> · RENEWAL</span></div>
      </div>`;
    old.replaceWith(section);
    renderDonationLanguage(section);
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
    let link = document.querySelector('[data-owner-premium-shortcut]');
    if (!link) {
      link = document.createElement('a');
      link.dataset.ownerPremiumShortcut = '';
      link.className = 'neith-owner-premium-shortcut';
      link.textContent = 'PREMIUM';
      link.href = premiumUrl();
      authBtn.insertAdjacentElement('afterend', link);
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

  window.addEventListener('neith:languagechange', () => renderDonationLanguage(document.querySelector('.home227-donation')));

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once:true });
  else boot();
})();

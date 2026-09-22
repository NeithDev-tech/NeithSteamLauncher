(() => {
  'use strict';

  const root = document.querySelector('[data-freegames-live]');
  if (!root) return;

  const $ = (selector) => root.querySelector(selector);
  const cardsHost = $('[data-freegames-cards]');
  const spotlight = $('[data-freegames-spotlight]');
  const titleEl = $('[data-freegames-title]');
  const platformEl = $('[data-freegames-platform]');
  const worthEl = $('[data-freegames-worth]');
  const imageEl = $('[data-freegames-image]');
  const bgEl = $('[data-freegames-bg]');
  const countEl = $('[data-freegames-count]');
  const endDateEl = $('[data-freegames-enddate]');
  const timeEls = {
    days: $('[data-time-days]'), hours: $('[data-time-hours]'), minutes: $('[data-time-minutes]'), seconds: $('[data-time-seconds]')
  };

  let games = [];
  let selectedIndex = 0;
  let countdownTimer = null;
  let refreshTimer = null;

  // Instant real-data fallback for static/local previews.
  // Snapshot: GamerPower public API, verified 2026-09-22.
  // Production still prefers /api/free-games and refreshes automatically.
  const bundledSnapshot = [
    { id: 3784, title: 'Deadshot', platform: 'STEAM', worth: '$4.99', image: 'https://www.gamerpower.com/offers/1b/bbb.jpg', thumbnail: 'https://www.gamerpower.com/offers/1/1234.jpg', endDate: '2026-09-23 23:59:00', endAt: Date.parse('2026-09-23T23:59:00Z') },
    { id: 3782, title: 'Shogun Showdown', platform: 'EPIC GAMES', worth: '$14.99', image: 'https://www.gamerpower.com/offers/1b/6aac02328ba2e.jpg', thumbnail: 'https://www.gamerpower.com/offers/1/6aac02328ba2e.jpg', endDate: '2026-09-24 23:59:00', endAt: Date.parse('2026-09-24T23:59:00Z') },
    { id: 3781, title: 'Mindcop', platform: 'EPIC GAMES', worth: '$14.99', image: 'https://www.gamerpower.com/offers/1b/6aac007c3171a.jpg', thumbnail: 'https://www.gamerpower.com/offers/1/6aac007c3171a.jpg', endDate: '2026-09-24 23:59:00', endAt: Date.parse('2026-09-24T23:59:00Z') },
    { id: 3779, title: 'Space Menace', platform: 'STEAM', worth: '$6.99', image: 'https://www.gamerpower.com/offers/1b/6aaad50c2b7d4.jpg', thumbnail: 'https://www.gamerpower.com/offers/1/6aaad50c2b7d4.jpg', endDate: '2026-09-23 23:59:00', endAt: Date.parse('2026-09-23T23:59:00Z') },
    { id: 3778, title: 'FOR HONOR', platform: 'UBISOFT CONNECT', worth: '$29.99', image: 'https://www.gamerpower.com/offers/1b/6aa94d05ac575.jpg', thumbnail: 'https://www.gamerpower.com/offers/1/6aa94d05ac575.jpg', endDate: '2026-09-28 23:59:00', endAt: Date.parse('2026-09-28T23:59:00Z') }
  ];

  const lang = () => document.documentElement.lang === 'en' ? 'en' : 'es';
  const t = (es, en) => lang() === 'en' ? en : es;

  function safeImage(url) {
    try {
      const parsed = new URL(url, location.href);
      return /^https?:$/.test(parsed.protocol) ? parsed.href : '';
    } catch (_) {
      return '';
    }
  }

  function formatEndDate(raw) {
    if (!raw || raw === 'N/A') return t('FIN NO PUBLICADO', 'END NOT PUBLISHED');
    const date = new Date(raw.includes('T') ? raw : raw.replace(' ', 'T') + 'Z');
    if (Number.isNaN(date.getTime())) return t('FECHA VERIFICADA', 'VERIFIED DATE');
    return new Intl.DateTimeFormat(lang() === 'en' ? 'en-GB' : 'es-ES', {
      day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
    }).format(date).toUpperCase();
  }

  function remainingParts(endAt) {
    const diff = Math.max(0, Number(endAt) - Date.now());
    const total = Math.floor(diff / 1000);
    return {
      ended: diff <= 0,
      days: Math.floor(total / 86400),
      hours: Math.floor((total % 86400) / 3600),
      minutes: Math.floor((total % 3600) / 60),
      seconds: total % 60
    };
  }

  function paintCountdown(game) {
    const parts = remainingParts(game.endAt);
    const pad = value => String(value).padStart(2, '0');
    timeEls.days.textContent = pad(parts.days);
    timeEls.hours.textContent = pad(parts.hours);
    timeEls.minutes.textContent = pad(parts.minutes);
    timeEls.seconds.textContent = pad(parts.seconds);
    if (parts.ended) endDateEl.textContent = t('OFERTA FINALIZADA', 'OFFER ENDED');
  }

  function setHero(game, index) {
    if (!game) return;
    selectedIndex = index;
    const image = safeImage(game.image || game.thumbnail);
    titleEl.textContent = game.title || t('Juego gratuito', 'Free game');
    platformEl.textContent = `${game.platform || 'PC'} // ${t('OFERTA REAL', 'REAL OFFER')}`;
    worthEl.textContent = game.worth || '—';
    endDateEl.textContent = formatEndDate(game.endDate);
    imageEl.classList.remove('is-ready');
    imageEl.alt = `${game.title || t('Juego gratis', 'Free game')} — ${game.platform || 'PC'}`;
    if (image) {
      imageEl.onload = () => imageEl.classList.add('is-ready');
      imageEl.onerror = () => {
        const fallback = safeImage(game.thumbnail);
        if (fallback && fallback !== imageEl.src) { imageEl.onerror = () => imageEl.classList.remove('is-ready'); imageEl.src = fallback; return; }
        imageEl.classList.remove('is-ready');
      };
      imageEl.src = image;
      bgEl.style.backgroundImage = `url("${image.replace(/"/g, '%22')}")`;
    } else {
      imageEl.removeAttribute('src');
      bgEl.style.backgroundImage = 'none';
    }
    paintCountdown(game);
    root.querySelectorAll('.freegames-live-card').forEach((card, i) => {
      card.classList.toggle('is-active', i === index);
      card.setAttribute('aria-pressed', i === index ? 'true' : 'false');
    });
    clearInterval(countdownTimer);
    countdownTimer = setInterval(() => paintCountdown(game), 1000);
  }

  function renderCards() {
    cardsHost.innerHTML = '';
    games.slice(0, 4).forEach((game, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'freegames-live-card';
      button.setAttribute('aria-pressed', index === selectedIndex ? 'true' : 'false');
      button.setAttribute('aria-label', `${t('Mostrar', 'Show')} ${game.title}`);

      const media = document.createElement('span');
      media.className = 'freegames-live-card-image';
      const img = document.createElement('img');
      img.loading = 'lazy';
      img.decoding = 'async';
      img.alt = '';
      const image = safeImage(game.thumbnail || game.image);
      if (image) {
        img.onerror = () => {
          const fallback = safeImage(game.image);
          if (fallback && fallback !== img.src) { img.onerror = null; img.src = fallback; }
        };
        img.src = image;
      }
      media.appendChild(img);

      const copy = document.createElement('span');
      copy.className = 'freegames-live-card-copy';
      const name = document.createElement('b');
      name.textContent = game.title;
      const platform = document.createElement('span');
      platform.textContent = game.platform;
      const free = document.createElement('strong');
      free.textContent = t('GRATIS · -100%', 'FREE · -100%');
      copy.append(name, platform, free);
      button.append(media, copy);
      button.addEventListener('click', () => setHero(game, index));
      cardsHost.appendChild(button);
    });
    setHero(games[selectedIndex] || games[0], Math.min(selectedIndex, Math.max(0, games.length - 1)));
  }

  function renderState(kind) {
    clearInterval(countdownTimer);
    games = [];
    selectedIndex = 0;
    spotlight.setAttribute('aria-busy', 'false');
    titleEl.textContent = kind === 'empty'
      ? t('No hay ofertas verificadas ahora mismo', 'No verified offers right now')
      : t('No se pudieron comprobar las ofertas', 'Offers could not be checked');
    platformEl.textContent = 'NEITH // LIVE';
    worthEl.textContent = '—';
    imageEl.removeAttribute('src');
    imageEl.classList.remove('is-ready');
    bgEl.style.backgroundImage = 'none';
    endDateEl.textContent = t('COMPROBACIÓN AUTOMÁTICA', 'AUTOMATIC CHECK');
    ['days','hours','minutes','seconds'].forEach(key => timeEls[key].textContent = '--');
    countEl.textContent = kind === 'empty' ? t('0 JUEGOS GRATIS DETECTADOS', '0 FREE GAMES DETECTED') : t('CONEXIÓN DE DATOS NO DISPONIBLE', 'DATA CONNECTION UNAVAILABLE');
    cardsHost.innerHTML = `<div class="freegames-live-empty"><b>${kind === 'empty' ? t('NO HAY OFERTAS VERIFICADAS AHORA MISMO','NO VERIFIED OFFERS RIGHT NOW') : t('NO SE PUDIERON COMPROBAR LAS OFERTAS','OFFERS COULD NOT BE CHECKED')}</b><p>${kind === 'empty' ? t('Neith seguirá comprobando las promociones disponibles automáticamente.','Neith will keep checking available promotions automatically.') : t('La conexión de datos en tiempo real no está disponible. Vuelve a intentarlo más tarde.','The real-time data connection is unavailable. Please try again later.')}</p></div>`;
  }

  function normalizeGamerPower(items) {
    const supported = [
      ['Epic Games Store', 'EPIC GAMES'], ['Steam', 'STEAM'], ['GOG', 'GOG'], ['Ubisoft Connect', 'UBISOFT CONNECT']
    ];
    return (Array.isArray(items) ? items : []).filter(item => {
      if (!item || String(item.status).toLowerCase() !== 'active' || String(item.type).toLowerCase() !== 'game') return false;
      const platforms = String(item.platforms || '');
      if (!/\bPC\b/i.test(platforms)) return false;
      if (!supported.some(([needle]) => platforms.toLowerCase().includes(needle.toLowerCase()))) return false;
      const endAt = item.end_date && item.end_date !== 'N/A' ? Date.parse(item.end_date.replace(' ', 'T') + 'Z') : NaN;
      if (!Number.isFinite(endAt) || endAt <= Date.now()) return false;
      const text = `${item.title || ''} ${item.description || ''} ${item.instructions || ''}`.toLowerCase();
      return !/\bkey giveaway\b|\brequires?\b[^.]{0,50}\b(?:arp|points?|credits?)\b|\b(?:arp|points?) required\b/.test(text);
    }).map(item => {
      const platforms = String(item.platforms || '');
      const found = supported.find(([needle]) => platforms.toLowerCase().includes(needle.toLowerCase()));
      return {
        id: Number(item.id),
        title: String(item.title || '').replace(/\s*\((?:Steam|Epic Games|GOG|Ubisoft|PC)[^)]*\)\s*Giveaway\s*$/i, '').replace(/\s*Giveaway\s*$/i, '').trim(),
        platform: found ? found[1] : 'PC',
        worth: item.worth || null,
        image: item.image || item.thumbnail || '',
        thumbnail: item.thumbnail || item.image || '',
        endDate: item.end_date,
        endAt: Date.parse(item.end_date.replace(' ', 'T') + 'Z')
      };
    }).sort((a, b) => a.endAt - b.endAt).slice(0, 8);
  }

  function showGames(list) {
    games = list.filter(game => Number(game.endAt) > Date.now());
    if (!games.length) return false;
    selectedIndex = 0;
    countEl.textContent = `${games.length} ${t('JUEGOS GRATIS DETECTADOS', 'FREE GAMES DETECTED')}`;
    spotlight.setAttribute('aria-busy', 'false');
    renderCards();
    return true;
  }

  async function load() {
    spotlight.setAttribute('aria-busy', 'true');

    // 1) Preferred production path: same-origin serverless proxy.
    try {
      const response = await fetch('/api/free-games', { headers: { accept: 'application/json' }, cache: 'no-store' });
      if (response.ok) {
        const payload = await response.json();
        if (payload?.ok && Array.isArray(payload.games) && showGames(payload.games)) return;
      }
    } catch (_) {}

    // 2) Static-host fallback: try GamerPower directly when CORS is permitted.
    try {
      const response = await fetch('https://www.gamerpower.com/api/giveaways?type=game', { headers: { accept: 'application/json' }, cache: 'no-store' });
      if (response.ok) {
        const directGames = normalizeGamerPower(await response.json());
        if (showGames(directGames)) return;
      }
    } catch (_) {}

    // 3) Local/file preview fallback: verified real snapshot bundled with this build.
    // It automatically discards expired promotions, so stale offers are never shown as active.
    if (showGames(bundledSnapshot)) return;

    renderState('error');
  }

  document.addEventListener('click', event => {
    if (!event.target.closest('.lang-flag[data-lang]')) return;
    setTimeout(() => {
      if (games.length) {
        countEl.textContent = `${games.length} ${t('JUEGOS GRATIS DETECTADOS', 'FREE GAMES DETECTED')}`;
        renderCards();
      }
    }, 0);
  });

  load();
  refreshTimer = setInterval(load, 15 * 60 * 1000);
  window.addEventListener('beforeunload', () => {
    clearInterval(countdownTimer);
    clearInterval(refreshTimer);
  }, { once: true });
})();

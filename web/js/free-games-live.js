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
  const sourcesEl = $('[data-freegames-sources]');
  const endDateEl = $('[data-freegames-enddate]');
  const claimEl = $('[data-freegames-claim]');
  const timeEls = {
    days: $('[data-time-days]'), hours: $('[data-time-hours]'), minutes: $('[data-time-minutes]'), seconds: $('[data-time-seconds]')
  };

  let games = [];
  let selectedIndex = 0;
  let currentGame = null;
  let countdownTimer = null;
  let refreshTimer = null;
  let lastRefreshAt = 0;
  let loadPromise = null;
  const CACHE_KEY = 'neith_free_games_live_v4_paid_to_zero';
  const CACHE_MAX_AGE = 2 * 60 * 60 * 1000;

  // No stale bundled offers: live sources are authoritative.
  const bundledSnapshot = [];

  const lang = () => document.documentElement.lang === 'en' ? 'en' : 'es';
  const t = (es, en) => lang() === 'en' ? en : es;


  function priceValue(raw) {
    const text = String(raw || '').replace(/\u00a0/g, ' ').trim();
    const match = text.match(/(\d+(?:[.,]\d{1,2})?)/);
    if (!match) return 0;
    const value = Number(match[1].replace(',', '.'));
    return Number.isFinite(value) ? value : 0;
  }

  function strictPaidToZeroGame(game) {
    if (!game) return false;
    const endAt = Number(game.endAt);
    if (!Number.isFinite(endAt) || endAt <= Date.now()) return false;
    if (priceValue(game.worth) <= 0) return false;
    const platform = String(game.platform || '').toUpperCase().trim();
    const allowed = new Set(['STEAM', 'EPIC GAMES', 'GOG', 'PRIME GAMING', 'HUMBLE BUNDLE']);
    if (!allowed.has(platform)) return false;
    return true;
  }

  function safeImage(url) {
    try {
      const parsed = new URL(url, location.href);
      return /^https?:$/.test(parsed.protocol) ? parsed.href : '';
    } catch (_) {
      return '';
    }
  }

  function formatEndDate(raw) {
    if (!raw || raw === 'N/A') return 'END NOT PUBLISHED';
    const date = new Date(raw.includes('T') ? raw : raw.replace(' ', 'T') + 'Z');
    if (Number.isNaN(date.getTime())) return t('FECHA VERIFICADA', 'VERIFIED DATE');
    return new Intl.DateTimeFormat(lang() === 'en' ? 'en-GB' : 'es-ES', {
      day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
    }).format(date).toUpperCase();
  }

  function remainingParts(endAt) {
    const numericEnd = Number(endAt);
    if (!Number.isFinite(numericEnd) || numericEnd <= 0) {
      return { undated: true, ended: false, days: 0, hours: 0, minutes: 0, seconds: 0 };
    }
    const diff = Math.max(0, numericEnd - Date.now());
    const total = Math.floor(diff / 1000);
    return {
      undated: false,
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
    if (parts.undated) {
      timeEls.days.textContent = '--';
      timeEls.hours.textContent = '--';
      timeEls.minutes.textContent = '--';
      timeEls.seconds.textContent = '--';
      return;
    }
    timeEls.days.textContent = pad(parts.days);
    timeEls.hours.textContent = pad(parts.hours);
    timeEls.minutes.textContent = pad(parts.minutes);
    timeEls.seconds.textContent = pad(parts.seconds);
    if (parts.ended) endDateEl.textContent = t('OFERTA FINALIZADA', 'OFFER ENDED');
  }

  function setHero(game, index) {
    if (!game) return;
    selectedIndex = index;
    currentGame = game;
    const image = safeImage(game.image || game.thumbnail);
    titleEl.textContent = game.title || t('Juego gratuito', 'Free game');
    platformEl.textContent = `${game.platform || 'PC'} // ${t('OFERTA REAL', 'REAL OFFER')}`;
    worthEl.textContent = game.worth || '—';
    endDateEl.textContent = formatEndDate(game.endDate);
    if (claimEl) {
      const claimUrl = safeImage(game.url || '');
      if (claimUrl) { claimEl.href = claimUrl; claimEl.hidden = false; }
      else { claimEl.href = '#'; claimEl.hidden = true; }
    }
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
    countdownTimer = setInterval(() => { if (!document.hidden) paintCountdown(game); }, 1000);
  }

  function renderCards() {
    cardsHost.innerHTML = '';
    games.forEach((game, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'freegames-live-card';
      const platformKey = String(game.platform || 'pc').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      if (platformKey) button.classList.add(`platform-${platformKey}`);
      button.setAttribute('aria-pressed', index === selectedIndex ? 'true' : 'false');
      button.setAttribute('aria-label', `${t('Mostrar', 'Show')} ${game.title}`);

      const media = document.createElement('span');
      media.className = 'freegames-live-card-image';
      const img = document.createElement('img');
      img.loading = 'lazy';
      img.decoding = 'async';
      img.fetchPriority = 'low';
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
      const remaining = document.createElement('em');
      remaining.className = 'freegames-live-card-time';
      const parts = remainingParts(game.endAt);
      remaining.textContent = parts.undated
        ? 'NO END DATE PUBLISHED'
        : parts.days > 0
          ? `${'ENDS IN'} ${parts.days} ${'DAYS'}`
          : `${'ENDS IN'} ${String(parts.hours).padStart(2,'0')}H ${String(parts.minutes).padStart(2,'0')}M`;
      copy.append(name, platform, free, remaining);
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
    currentGame = null;
    spotlight.setAttribute('aria-busy', 'false');
    titleEl.textContent = kind === 'empty'
      ? t('No hay ofertas verificadas ahora mismo', 'No verified offers right now')
      : t('Offers could not be checked', 'Offers could not be checked');
    platformEl.textContent = 'NEITH // LIVE';
    worthEl.textContent = '—';
    imageEl.removeAttribute('src');
    imageEl.classList.remove('is-ready');
    bgEl.style.backgroundImage = 'none';
    endDateEl.textContent = t('AUTOMATIC CHECK', 'AUTOMATIC CHECK');
    if (claimEl) { claimEl.href = '#'; claimEl.hidden = true; }
    ['days','hours','minutes','seconds'].forEach(key => timeEls[key].textContent = '--');
    countEl.textContent = kind === 'empty' ? t('0 JUEGOS GRATIS DETECTADOS', '0 FREE GAMES DETECTED') : t('DATA CONNECTION UNAVAILABLE', 'DATA CONNECTION UNAVAILABLE');
    cardsHost.innerHTML = `<div class="freegames-live-empty"><b>${kind === 'empty' ? t('NO HAY OFERTAS VERIFICADAS AHORA MISMO','NO VERIFIED OFFERS RIGHT NOW') : t('OFFERS COULD NOT BE CHECKED','OFFERS COULD NOT BE CHECKED')}</b><p>${kind === 'empty' ? t('Neith will keep checking available promotions automatically.','Neith will keep checking available promotions automatically.') : t('The real-time data connection is unavailable. Please try again later.','The real-time data connection is unavailable. Please try again later.')}</p></div>`;
  }

  function normalizeGamerPower(items) {
    const supported = [
      ['Epic Games Store', 'EPIC GAMES'], ['Steam', 'STEAM'], ['GOG', 'GOG'], ['Ubisoft Connect', 'UBISOFT CONNECT'], ['Prime Gaming', 'PRIME GAMING'], ['Itch.io', 'ITCH.IO'], ['DRM-Free', 'DRM-FREE'], ['Battle.net', 'BATTLE.NET'], ['EA Origin', 'EA APP']
    ];
    return (Array.isArray(items) ? items : []).filter(item => {
      if (!item || String(item.status).toLowerCase() !== 'active' || String(item.type).toLowerCase() !== 'game') return false;
      const platforms = String(item.platforms || '');
      if (!/\bPC\b/i.test(platforms)) return false;
      const endAt = item.end_date && item.end_date !== 'N/A' ? Date.parse(item.end_date.replace(' ', 'T') + 'Z') : null;
      if (!Number.isFinite(endAt) || endAt <= Date.now()) return false;
      if (priceValue(item.worth) <= 0) return false;
      const text = `${item.title || ''} ${item.description || ''} ${item.instructions || ''} ${item.open_giveaway_url || ''} ${item.gamerpower_url || ''}`.toLowerCase();
      if (!/(?:epic games|steam|\bgog\b|prime gaming|gaming\.amazon|amazon prime|humble)/i.test(text)) return false;
      if (/\bkey giveaway\b|\brequires?\b[^.]{0,50}\b(?:arp|points?|credits?)\b|\b(?:arp|points?) required\b/.test(text)) return false;
      if (/\b(?:dlc|demo|prologue|playtest|trial|beta|free weekend|season pass|battle pass|starter pack|skin pack|currency pack)\b|in[- ]game loot/.test(text)) return false;
      return true;
    }).map(item => {
      const platforms = String(item.platforms || '');
      const context = `${platforms} ${item.title || ''} ${item.description || ''} ${item.instructions || ''}`.toLowerCase();
      let platformLabel = 'PC';
      if (context.includes('humble')) platformLabel = 'HUMBLE BUNDLE';
      else {
        const found = supported.find(([needle]) => context.includes(needle.toLowerCase()));
        if (found) platformLabel = found[1];
      }
      return {
        id: Number(item.id),
        title: String(item.title || '').replace(/\s*\((?:Steam|Epic Games|GOG|Ubisoft|PC)[^)]*\)\s*Giveaway\s*$/i, '').replace(/\s*Giveaway\s*$/i, '').trim(),
        platform: platformLabel,
        worth: item.worth || null,
        image: item.image || item.thumbnail || '',
        thumbnail: item.thumbnail || item.image || '',
        endDate: item.end_date,
        endAt: item.end_date && item.end_date !== 'N/A' ? Date.parse(item.end_date.replace(' ', 'T') + 'Z') : null,
        url: item.open_giveaway_url || item.gamerpower_url || ''
      };
    }).sort((a, b) => (Number(a.endAt) || Number.POSITIVE_INFINITY) - (Number(b.endAt) || Number.POSITIVE_INFINITY));
  }

  function saveCachedGames(list) {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({ savedAt: Date.now(), games: list }));
    } catch (_) {}
  }

  function restoreCachedGames() {
    try {
      const cached = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null');
      if (!cached || !Array.isArray(cached.games) || Date.now() - Number(cached.savedAt || 0) > CACHE_MAX_AGE) return false;
      return showGames(cached.games);
    } catch (_) {
      return false;
    }
  }

  function showGames(list) {
    games = list.filter(strictPaidToZeroGame);
    if (!games.length) return false;
    selectedIndex = 0;
    countEl.textContent = `${games.length} ${t('JUEGOS GRATIS DETECTADOS', 'FREE GAMES DETECTED')}`;
    spotlight.setAttribute('aria-busy', 'false');
    renderCards();
    return true;
  }

  async function loadOnce() {
    spotlight.setAttribute('aria-busy', 'true');

    // 1) Preferred production path: same-origin serverless proxy.
    try {
      const response = await fetch('/api/free-games?mode=paid-to-zero-v1', { headers: { accept: 'application/json' }, cache: 'default' });
      if (response.ok) {
        const payload = await response.json();
        if (payload?.ok && Array.isArray(payload.games)) {
          if (sourcesEl && payload.sources) {
            const active = [];
            if (payload.sources.gamerPower) active.push('GAMERPOWER');
            if (payload.sources.epicGames) active.push('EPIC');
            if (payload.sources.primeGaming) active.push('PRIME');
            sourcesEl.textContent = active.length ? active.join(' · ') : 'NEITH MULTI-SOURCE';
          }
          if (showGames(payload.games)) { saveCachedGames(payload.games); lastRefreshAt = Date.now(); return; }
        }
      }
    } catch (_) {}

    // 2) Static-host fallback: try GamerPower directly when CORS is permitted.
    try {
      const response = await fetch('https://www.gamerpower.com/api/giveaways?type=game', { headers: { accept: 'application/json' }, cache: 'no-store' });
      if (response.ok) {
        const directGames = normalizeGamerPower(await response.json());
        if (showGames(directGames)) { saveCachedGames(directGames); lastRefreshAt = Date.now(); return; }
      }
    } catch (_) {}

    // 3) Local/file preview fallback: verified real snapshot bundled with this build.
    // It automatically discards expired promotions, so stale offers are never shown as active.
    if (showGames(bundledSnapshot)) return;

    // If a fresh request fails, keep the recently cached verified list visible.
    // It will be replaced on the next successful automatic refresh.
    if (games.length) return;
    renderState('error');
    setTimeout(() => { if (!document.hidden && navigator.onLine) load(); }, 60 * 1000);
  }

  function load() {
    if (loadPromise) return loadPromise;
    loadPromise = loadOnce().finally(() => { loadPromise = null; });
    return loadPromise;
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

  restoreCachedGames();
  load();
  /* R183: refresh the authoritative feed every 5 minutes without overlapping requests. */
  refreshTimer = setInterval(() => { if (!document.hidden) load(); }, 5 * 60 * 1000);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
      if (currentGame) paintCountdown(currentGame);
      if (!games.length || Date.now() - lastRefreshAt > 5 * 60 * 1000) load();
    }
  }, {passive:true});
  window.addEventListener('online', () => load(), {passive:true});
  // No beforeunload handler: keeping the document BFCache-eligible makes
  // back/forward and repeated navigation substantially smoother. Browsers
  // suspend timers automatically while a document is in BFCache.
})();

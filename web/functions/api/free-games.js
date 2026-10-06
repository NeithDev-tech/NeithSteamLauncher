const json = (payload, status = 200, extraHeaders = {}) => new Response(JSON.stringify(payload), {
  status,
  headers: {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'public, max-age=300, s-maxage=900, stale-while-revalidate=1800',
    ...extraHeaders
  }
});

const SUPPORTED = [
  ['Epic Games Store', 'EPIC GAMES'],
  ['Steam', 'STEAM'],
  ['GOG', 'GOG'],
  ['Ubisoft Connect', 'UBISOFT CONNECT']
];
const PRIME_FEED = 'https://feed.eikowagenknecht.com/lootscraper_amazon_game.xml';
const PRIME_HTML = 'https://feed.eikowagenknecht.com/lootscraper_amazon_game.html';
const PRIME_CLAIMS = 'https://luna.amazon.com/claims/home?filter=Game&g=s';

function cleanTitle(title = '') {
  return String(title || '')
    .replace(/^\s*Amazon(?:\s+(?:Prime|Games?|Luna|Prime\s+Gaming))?\s*\([^)]*\)\s*-\s*/i, '')
    .replace(/\s*\((?:Steam|Epic Games(?: Store)?|GOG|Ubisoft|Prime Gaming|PC)[^)]*\)\s*(?:Key\s*)?Giveaway\s*$/i, '')
    .replace(/\s*Giveaway\s*$/i, '')
    .trim();
}

function detectPlatform(platforms = '') {
  const found = SUPPORTED.find(([needle]) => String(platforms).toLowerCase().includes(needle.toLowerCase()));
  return found ? found[1] : 'PC';
}

function parseEnd(value) {
  if (!value || value === 'N/A') return null;
  const text = String(value).trim();
  const normalized = text.includes('T') ? text : text.replace(' ', 'T') + 'Z';
  const ms = Date.parse(normalized);
  return Number.isFinite(ms) ? ms : null;
}

function isDirectStoreFreebie(item, now) {
  if (!item || String(item.status).toLowerCase() !== 'active') return false;
  if (String(item.type).toLowerCase() !== 'game') return false;
  const platforms = String(item.platforms || '');
  if (!/\bPC\b/i.test(platforms)) return false;
  if (!SUPPORTED.some(([needle]) => platforms.toLowerCase().includes(needle.toLowerCase()))) return false;
  const end = parseEnd(item.end_date);
  if (!end || end <= now) return false;
  const text = `${item.title || ''} ${item.description || ''} ${item.instructions || ''}`.toLowerCase();
  if (/\bkey giveaway\b|\brequires?\b[^.]{0,50}\b(?:arp|points?|credits?)\b|\b(?:arp|points?) required\b/.test(text)) return false;
  if (/\b(?:dlc|demo|prologue|playtest|trial|beta|free weekend|season pass|battle pass|starter pack|skin pack|currency pack)\b|in[- ]game loot/.test(text)) return false;
  const worth = parseFloat(String(item.worth || '').replace(/[^0-9.]/g, '')) || 0;
  if (worth <= 0) return false;
  return true;
}

function decodeEntities(value = '') {
  const named = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };
  return String(value || '')
    .replace(/&#(x?[0-9a-f]+);/gi, (_, code) => {
      const n = code[0].toLowerCase() === 'x' ? parseInt(code.slice(1), 16) : parseInt(code, 10);
      return Number.isFinite(n) ? String.fromCodePoint(n) : _;
    })
    .replace(/&([a-z]+);/gi, (m, name) => Object.prototype.hasOwnProperty.call(named, name.toLowerCase()) ? named[name.toLowerCase()] : m);
}

function stripTags(value = '') {
  return decodeEntities(String(value || '')
    .replace(/<!\[CDATA\[/gi, ' ')
    .replace(/\]\]>/g, ' ')
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim();
}

function tagText(block, names) {
  for (const name of names) {
    const rx = new RegExp(`<(?:(?:[\\w.-]+):)?${name}\\b[^>]*>([\\s\\S]*?)<\\/(?:(?:[\\w.-]+):)?${name}>`, 'i');
    const m = String(block || '').match(rx);
    if (m && stripTags(m[1])) return stripTags(m[1]);
  }
  return '';
}

function priceNumber(text = '') {
  const matches = [
    String(text).match(/recommended\s+price(?:\s*\([^)]*\))?\s*:\s*([0-9]+(?:[.,][0-9]{1,2})?)/i),
    String(text).match(/line-through[^>]*>[\s\S]{0,160}?([0-9]+(?:[.,][0-9]{1,2})?)\s*EUR/i),
    stripTags(text).match(/\b([0-9]+(?:[.,][0-9]{1,2})?)\s*EUR\b/i)
  ];
  for (const match of matches) {
    if (!match) continue;
    const value = Number(String(match[1]).replace(',', '.'));
    if (Number.isFinite(value) && value > 0) return value;
  }
  return 0;
}

function officialPrimeUrl(text = '') {
  const urls = decodeEntities(text).match(/https?:\/\/[^\s<>"']+/gi) || [];
  for (const raw of urls) {
    const candidate = raw.replace(/[).,;\]]+$/, '');
    const low = candidate.toLowerCase();
    if (low.includes('luna.amazon.') || low.includes('gaming.amazon.') || low.includes('amazon.com')) return candidate;
  }
  return PRIME_CLAIMS;
}

function firstImage(text = '') {
  const patterns = [
    /<img\b[^>]*\bsrc=["']([^"']+)["']/i,
    /<(?:media:)?thumbnail\b[^>]*\burl=["']([^"']+)["']/i,
    /<(?:media:)?content\b[^>]*\burl=["']([^"']+\.(?:png|jpe?g|webp)(?:\?[^"']*)?)["']/i,
    /<enclosure\b[^>]*\burl=["']([^"']+\.(?:png|jpe?g|webp)(?:\?[^"']*)?)["']/i
  ];
  for (const pattern of patterns) {
    const m = String(text || '').match(pattern);
    if (m) return decodeEntities(m[1]).trim();
  }
  return '';
}

function primeDates(text = '') {
  const clean = stripTags(text);
  const from = clean.match(/offer\s+valid\s+from:\s*(\d{4}-\d{2}-\d{2}(?:[T ]\d{1,2}:\d{2}(?::\d{2})?)?)/i);
  const to = clean.match(/offer\s+valid\s+to:\s*(\d{4}-\d{2}-\d{2}(?:[T ]\d{1,2}:\d{2}(?::\d{2})?)?)/i);
  const alt = clean.match(/(?:ends?|expires?|valid\s+until|available\s+until)\s*[:\-]?\s*(\d{4}-\d{2}-\d{2}(?:[T ][0-9:.+\-Z]+)?|\d{1,2}[./-]\d{1,2}[./-]\d{4})/i);
  return { start: from ? from[1] : '', end: to ? to[1] : (alt ? alt[1] : '') };
}

function parsePrimeAtom(raw = '') {
  const entries = String(raw || '').match(/<(?:item|entry)\b[\s\S]*?<\/(?:item|entry)>/gi) || [];
  const rows = [];
  for (const entry of entries.slice(0, 250)) {
    const title = cleanTitle(tagText(entry, ['title']));
    if (!title) continue;
    const semantic = stripTags(entry).toLowerCase();
    if (/in[- ]game loot|skin pack|currency pack/.test(semantic)) continue;
    const dates = primeDates(entry);
    const endAt = parseEnd(dates.end);
    if (!endAt) continue;
    const price = priceNumber(entry);
    rows.push({
      title,
      platform: 'PRIME GAMING',
      worth: price > 0 ? `${price.toFixed(2)} €` : null,
      price,
      image: firstImage(entry),
      thumbnail: firstImage(entry),
      endDate: dates.end,
      endAt,
      publishedDate: dates.start || null,
      url: officialPrimeUrl(entry),
      source: 'Prime Gaming Luna Feed'
    });
  }
  return rows;
}

function parsePrimeHtml(raw = '') {
  const text = String(raw || '');
  const starts = [...text.matchAll(/<h2\b/gi)].map(match => match.index);
  if (!starts.length) return [];
  starts.push(text.length);
  const rows = [];
  for (let i = 0; i < starts.length - 1; i += 1) {
    const segment = text.slice(starts[i], starts[i + 1]);
    const h2 = segment.match(/<h2\b[^>]*>([\s\S]*?)<\/h2>/i);
    if (!h2) continue;
    const spans = [...h2[1].matchAll(/<span\b[^>]*>([\s\S]*?)<\/span>/gi)].map(m => stripTags(m[1]));
    const title = cleanTitle(spans[0] || stripTags(h2[1]));
    if (!title) continue;
    const validity = spans.length > 1 ? spans[spans.length - 1] : stripTags(h2[1]);
    const vm = validity.match(/\bValid\s+from\s+(\d{4}-\d{2}-\d{2})(?:\s+to\s+(\d{4}-\d{2}-\d{2}))?/i);
    const dates = primeDates(segment);
    const start = vm ? vm[1] : dates.start;
    const end = vm && vm[2] ? vm[2] : dates.end;
    const endAt = parseEnd(end);
    if (!endAt) continue;
    const price = priceNumber(segment);
    rows.push({
      title,
      platform: 'PRIME GAMING',
      worth: price > 0 ? `${price.toFixed(2)} €` : null,
      price,
      image: firstImage(segment),
      thumbnail: firstImage(segment),
      endDate: end,
      endAt,
      publishedDate: start || null,
      url: officialPrimeUrl(segment),
      source: 'Prime Gaming Luna Feed'
    });
  }
  return rows;
}

function mergePrime(atomRows = [], htmlRows = [], now = Date.now()) {
  const merged = new Map();
  for (const row of [...atomRows, ...htmlRows]) {
    const key = cleanTitle(row.title).toLowerCase();
    if (!key) continue;
    const current = merged.get(key) || {};
    merged.set(key, {
      ...current,
      ...row,
      title: cleanTitle(row.title || current.title),
      image: row.image || current.image || '',
      thumbnail: row.thumbnail || current.thumbnail || row.image || current.image || '',
      url: row.url || current.url || PRIME_CLAIMS,
      worth: (Number(row.price) > 0 ? row.worth : null) || current.worth || null,
      price: Math.max(Number(current.price) || 0, Number(row.price) || 0),
      endDate: row.endDate || current.endDate,
      endAt: Number(row.endAt) || Number(current.endAt) || 0,
      publishedDate: row.publishedDate || current.publishedDate || null,
      platform: 'PRIME GAMING',
      source: 'Prime Gaming Luna Feed'
    });
  }
  return [...merged.values()].filter(row => {
    const titleBlob = String(row.title || '').toLowerCase();
    if (/\b(?:dlc|demo|prologue|playtest|trial|beta)\b|in[- ]game loot|skin pack|currency pack/.test(titleBlob)) return false;
    return Number(row.price) > 0 && Number(row.endAt) > now;
  }).map((row, index) => ({
    id: `prime-${index}-${row.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`,
    title: row.title,
    platform: 'PRIME GAMING',
    worth: row.worth || `${Number(row.price).toFixed(2)} €`,
    image: row.image || '',
    thumbnail: row.thumbnail || row.image || '',
    endDate: row.endDate,
    endAt: row.endAt,
    publishedDate: row.publishedDate,
    url: row.url || PRIME_CLAIMS,
    source: 'Prime Gaming Luna Feed'
  }));
}

async function fetchText(url, accept, timeoutMs = 9000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      headers: { accept, 'user-agent': 'NeithLauncherWeb/1.0 (+https://www.neithlauncher.com)' },
      signal: controller.signal,
      cf: { cacheTtl: 900, cacheEverything: true }
    });
    if (!response.ok) throw new Error(`http_${response.status}`);
    return await response.text();
  } finally {
    clearTimeout(timer);
  }
}

async function fetchGamerPower(now) {
  const response = await fetch('https://www.gamerpower.com/api/giveaways?type=game', {
    headers: { accept: 'application/json', 'user-agent': 'NeithLauncherWeb/1.0 (+https://www.neithlauncher.com)' },
    cf: { cacheTtl: 900, cacheEverything: true }
  });
  if (!response.ok) throw new Error('gamerpower_unavailable');
  const payload = await response.json();
  if (!Array.isArray(payload)) throw new Error('invalid_gamerpower_payload');
  return payload.filter(item => isDirectStoreFreebie(item, now)).map(item => ({
    id: Number(item.id),
    title: cleanTitle(item.title),
    platform: detectPlatform(item.platforms),
    worth: item.worth || null,
    image: item.image || item.thumbnail || '',
    thumbnail: item.thumbnail || item.image || '',
    endDate: item.end_date,
    endAt: parseEnd(item.end_date),
    publishedDate: item.published_date || null,
    source: 'GamerPower'
  }));
}

async function fetchPrime(now) {
  const [atomResult, htmlResult] = await Promise.allSettled([
    fetchText(PRIME_FEED, 'application/rss+xml,application/atom+xml,application/xml,text/xml,*/*'),
    fetchText(PRIME_HTML, 'text/html,application/xhtml+xml,*/*')
  ]);
  const atomRows = atomResult.status === 'fulfilled' ? parsePrimeAtom(atomResult.value) : [];
  const htmlRows = htmlResult.status === 'fulfilled' ? parsePrimeHtml(htmlResult.value) : [];
  if (!atomRows.length && !htmlRows.length) throw new Error('prime_unavailable');
  return mergePrime(atomRows, htmlRows, now);
}

function dedupeAndSort(rows, now) {
  const seen = new Map();
  for (const game of rows || []) {
    if (!game || Number(game.endAt) <= now) continue;
    const key = `${String(game.platform || '').toLowerCase()}|${cleanTitle(game.title).toLowerCase()}`;
    if (!key || seen.has(key)) continue;
    seen.set(key, game);
  }
  return [...seen.values()]
    .sort((a, b) => (Number(a.endAt) - Number(b.endAt)) || ((parseFloat(String(b.worth).replace(/[^0-9.]/g, '')) || 0) - (parseFloat(String(a.worth).replace(/[^0-9.]/g, '')) || 0)))
    .slice(0, 12);
}

export async function onRequestGet() {
  const now = Date.now();
  try {
    const [gamerPowerResult, primeResult] = await Promise.allSettled([fetchGamerPower(now), fetchPrime(now)]);
    const games = dedupeAndSort([
      ...(gamerPowerResult.status === 'fulfilled' ? gamerPowerResult.value : []),
      ...(primeResult.status === 'fulfilled' ? primeResult.value : [])
    ], now);
    if (!games.length && gamerPowerResult.status === 'rejected' && primeResult.status === 'rejected') {
      return json({ ok: false, error: 'upstreams_unavailable', games: [] }, 502, { 'cache-control': 'no-store' });
    }
    return json({
      ok: true,
      updatedAt: new Date().toISOString(),
      source: 'Neith verified multi-store feed',
      sources: {
        gamerPower: gamerPowerResult.status === 'fulfilled',
        primeGaming: primeResult.status === 'fulfilled'
      },
      games
    });
  } catch (_) {
    return json({ ok: false, error: 'request_failed', games: [] }, 502, { 'cache-control': 'no-store' });
  }
}

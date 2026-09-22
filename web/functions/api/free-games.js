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

function cleanTitle(title = '') {
  return title
    .replace(/\s*\((?:Steam|Epic Games|GOG|Ubisoft|PC)[^)]*\)\s*Giveaway\s*$/i, '')
    .replace(/\s*Giveaway\s*$/i, '')
    .trim();
}

function detectPlatform(platforms = '') {
  const found = SUPPORTED.find(([needle]) => platforms.toLowerCase().includes(needle.toLowerCase()));
  return found ? found[1] : 'PC';
}

function parseEnd(value) {
  if (!value || value === 'N/A') return null;
  const normalized = value.includes('T') ? value : value.replace(' ', 'T') + 'Z';
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
  return true;
}

export async function onRequestGet() {
  try {
    const response = await fetch('https://www.gamerpower.com/api/giveaways?type=game', {
      headers: {
        accept: 'application/json',
        'user-agent': 'NeithLauncher/1.0 (+https://www.neithlauncher.com)'
      },
      cf: { cacheTtl: 900, cacheEverything: true }
    });

    if (!response.ok) return json({ ok: false, error: 'upstream_unavailable', games: [] }, 502);
    const payload = await response.json();
    if (!Array.isArray(payload)) return json({ ok: false, error: 'invalid_upstream_payload', games: [] }, 502);

    const now = Date.now();
    const games = payload
      .filter(item => isDirectStoreFreebie(item, now))
      .map(item => ({
        id: Number(item.id),
        title: cleanTitle(item.title),
        platform: detectPlatform(item.platforms),
        worth: item.worth || null,
        image: item.image || item.thumbnail || '',
        thumbnail: item.thumbnail || item.image || '',
        endDate: item.end_date,
        endAt: parseEnd(item.end_date),
        publishedDate: item.published_date || null
      }))
      .sort((a, b) => (a.endAt - b.endAt) || ((parseFloat(String(b.worth).replace(/[^0-9.]/g, '')) || 0) - (parseFloat(String(a.worth).replace(/[^0-9.]/g, '')) || 0)))
      .slice(0, 8);

    return json({
      ok: true,
      updatedAt: new Date().toISOString(),
      source: 'GamerPower',
      sourceUrl: 'https://www.gamerpower.com/',
      games
    });
  } catch (error) {
    return json({ ok: false, error: 'request_failed', games: [] }, 502);
  }
}

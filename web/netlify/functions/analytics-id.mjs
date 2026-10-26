const hex = (buffer) => [...new Uint8Array(buffer)].map((b) => b.toString(16).padStart(2, '0')).join('');

export default async (_request, context) => {
  const ip = String(context?.ip || '').trim();
  const siteSalt = String(process.env.NEITH_ANALYTICS_IP_SALT || context?.site?.id || 'neith-site-analytics-v1');
  let visitorKey = '';
  if (ip) {
    const bytes = new TextEncoder().encode(`${siteSalt}|${ip}`);
    visitorKey = hex(await crypto.subtle.digest('SHA-256', bytes)).slice(0, 40);
  }
  return new Response(JSON.stringify({ ok: true, visitorKey }), {
    status: 200,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'private, no-store, max-age=0'
    }
  });
};

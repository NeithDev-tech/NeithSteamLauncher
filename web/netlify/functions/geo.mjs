export default async (_request, context) => {
  const country = context?.geo?.country || {};
  const payload = {
    ok: true,
    country: String(country.name || '').slice(0, 80),
    countryCode: String(country.code || '').slice(0, 2).toUpperCase()
  };
  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'private, no-store, max-age=0'
    }
  });
};

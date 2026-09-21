const json = (payload, status = 200) => new Response(JSON.stringify(payload), {
  status,
  headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }
});

export async function onRequestPost(context) {
  const { request, env } = context;
  const required = ['SUPABASE_URL','SUPABASE_ANON_KEY','STRIPE_SECRET_KEY','STRIPE_PREMIUM_PRICE_ID','SITE_URL'];
  const missing = required.filter(key => !env[key]);
  if (missing.length) return json({ error: `Faltan variables: ${missing.join(', ')}` }, 503);

  const auth = request.headers.get('authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (!token) return json({ error: 'Sesión requerida.' }, 401);

  const userResponse = await fetch(`${env.SUPABASE_URL}/auth/v1/user`, {
    headers: { apikey: env.SUPABASE_ANON_KEY, Authorization: `Bearer ${token}` }
  });
  if (!userResponse.ok) return json({ error: 'Sesión no válida.' }, 401);
  const user = await userResponse.json();

  const body = new URLSearchParams();
  body.set('mode', 'subscription');
  body.set('line_items[0][price]', env.STRIPE_PREMIUM_PRICE_ID);
  body.set('line_items[0][quantity]', '1');
  body.set('success_url', `${env.SITE_URL}/dashboard/?checkout=success`);
  body.set('cancel_url', `${env.SITE_URL}/free-premium/?checkout=cancelled`);
  body.set('client_reference_id', user.id);
  body.set('metadata[supabase_user_id]', user.id);
  body.set('subscription_data[metadata][supabase_user_id]', user.id);
  if (user.email) body.set('customer_email', user.email);

  const stripe = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body
  });
  const payload = await stripe.json();
  if (!stripe.ok) return json({ error: payload?.error?.message || 'Stripe rechazó la solicitud.' }, 502);
  return json({ url: payload.url });
}

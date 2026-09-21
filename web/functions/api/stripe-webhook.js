const encoder = new TextEncoder();
const json = (payload, status = 200) => new Response(JSON.stringify(payload), { status, headers: { 'content-type': 'application/json' } });

function hex(buffer) {
  return [...new Uint8Array(buffer)].map(b => b.toString(16).padStart(2, '0')).join('');
}

function constantTimeEqual(a, b) {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return out === 0;
}

async function verifyStripeSignature(payload, header, secret) {
  if (!header || !secret) return false;
  const parts = Object.fromEntries(header.split(',').map(part => part.split('=')));
  const timestamp = parts.t;
  const signature = parts.v1;
  if (!timestamp || !signature) return false;
  if (Math.abs(Date.now() / 1000 - Number(timestamp)) > 300) return false;
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const signed = await crypto.subtle.sign('HMAC', key, encoder.encode(`${timestamp}.${payload}`));
  return constantTimeEqual(hex(signed), signature);
}

async function patchProfile(env, query, data) {
  return fetch(`${env.SUPABASE_URL}/rest/v1/profiles?${query}`, {
    method: 'PATCH',
    headers: {
      apikey: env.SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal'
    },
    body: JSON.stringify({ ...data, updated_at: new Date().toISOString() })
  });
}

export async function onRequestPost({ request, env }) {
  if (!env.STRIPE_WEBHOOK_SECRET || !env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    return json({ error: 'Webhook no configurado.' }, 503);
  }
  const raw = await request.text();
  const valid = await verifyStripeSignature(raw, request.headers.get('stripe-signature'), env.STRIPE_WEBHOOK_SECRET);
  if (!valid) return json({ error: 'Firma inválida.' }, 400);

  const event = JSON.parse(raw);
  const object = event.data?.object || {};

  if (event.type === 'checkout.session.completed') {
    const userId = object.metadata?.supabase_user_id || object.client_reference_id;
    if (userId) {
      await patchProfile(env, `id=eq.${encodeURIComponent(userId)}`, {
        plan: 'premium',
        subscription_status: 'active',
        stripe_customer_id: object.customer || null,
        stripe_subscription_id: object.subscription || null
      });
    }
  }

  if (event.type === 'customer.subscription.deleted') {
    const customer = object.customer;
    if (customer) await patchProfile(env, `stripe_customer_id=eq.${encodeURIComponent(customer)}`, {
      plan: 'free', subscription_status: 'cancelled', stripe_subscription_id: object.id || null
    });
  }

  if (event.type === 'invoice.payment_failed') {
    const customer = object.customer;
    if (customer) await patchProfile(env, `stripe_customer_id=eq.${encodeURIComponent(customer)}`, {
      subscription_status: 'past_due'
    });
  }

  return json({ received: true });
}

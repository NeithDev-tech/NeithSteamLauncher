# Neith Web — Activar autenticación y Stripe

## 1. Supabase
1. Crea un proyecto Supabase.
2. Ejecuta `supabase/schema.sql` en SQL Editor.
3. En Authentication > Providers activa Email, Google y Discord según necesites.
4. Añade como Redirect URLs:
   - `https://neith-launcher.pages.dev/dashboard/`
   - tu dominio final `/dashboard/`
5. Copia Project URL y anon/public key en `js/supabase-config.js`.

La `service_role` NO debe ir jamás en JavaScript del navegador.

## 2. Cloudflare Pages Variables
Configura en Settings > Environment variables:
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (secret)
- `STRIPE_SECRET_KEY` (secret)
- `STRIPE_PREMIUM_PRICE_ID`
- `STRIPE_WEBHOOK_SECRET` (secret)
- `SITE_URL` = `https://neith-launcher.pages.dev` o tu dominio oficial

## 3. Stripe
- Crea el producto Premium y un precio recurrente.
- Copia el Price ID a `STRIPE_PREMIUM_PRICE_ID`.
- Configura un webhook hacia `/api/stripe-webhook`.
- Eventos mínimos: `checkout.session.completed`, `customer.subscription.deleted`, `invoice.payment_failed`.

## 4. Seguridad
- Los usuarios solo pueden leer su propio perfil mediante RLS.
- El navegador no puede cambiar `plan` ni `subscription_status`.
- Los cambios Premium se hacen únicamente desde el webhook firmado de Stripe usando la service-role server-side.

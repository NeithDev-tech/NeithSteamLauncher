# Neith Web R221 — Purchase Attempts

Supabase migration `r221_web_purchase_attempt_tracking` is already applied to Neith Production.

The website records checkout intent for authenticated Neith accounts. The payment path itself remains the existing PayPal LIVE checkout. Tracking failures never block checkout.

Admin Center → PURCHASE ATTEMPTS shows owner-only realtime data.

Status meanings:
- `checkout_started`: the website started a checkout request.
- `paypal_opened`: PayPal returned a valid LIVE approval URL and the website is redirecting there.
- `paid`: authoritative PayPal premium period was created.
- `failed`: checkout creation returned an error.
- `abandoned`: computed in the owner snapshot when an unfinished attempt is older than 30 minutes.

No launcher changes are required.

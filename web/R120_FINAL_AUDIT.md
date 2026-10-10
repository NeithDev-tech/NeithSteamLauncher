# Neith Official Web V34 R120 — Final Commercial/Admin Audit

Base: R119 HOME YOUTUBE 4K HDFORCED.

## Public commercial flow
- FREE/PREMIUM monthly and annual buttons now use authenticated PayPal LIVE checkout.
- Public JavaScript sends the current Supabase access token to the server-side `paypal-checkout` Edge Function.
- Returned approval URLs are accepted only when HTTPS and hosted by PayPal.
- No PayPal client secret, service-role key or LIVE plan ID is embedded in public browser code.
- Existing auto-renewing subscriptions and permanent PREMIUM are rejected server-side before creating another recurring subscription.

## Gift keys
- One-month gift-key checkout uses PayPal LIVE at EUR 7.99.
- The server validates and captures the PayPal order before issuing a key.
- Issuance is idempotent through the unique provider order reference.
- The user is redirected back to Mi Cuenta with a clear success/cancel/error result.

## Admin Center
- New PREMIUM & CLAVES commercial area uses the current authoritative Admin RPCs.
- MFA/AAL2 remains mandatory and server-side permissions remain authoritative.
- User detail, PREMIUM adjustments, permanent PREMIUM, device revocation/reset and ADMIN key inventory/actions are available according to role.
- Dangerous actions use Neith's own modal instead of native browser confirm/prompt.
- Legacy users-panel fallback to the nonexistent `neith_admin_list_users_v2` was removed; current v3/v1 paths remain.

## Responsive implementation
- Commercial admin uses CSS Grid with `minmax()` and `clamp()` rather than rigid main widths.
- Desktop two-column content reflows to one column at 1050 px.
- Action/result layouts reflow below 680 px; modal controls adapt again below 520 px.
- Existing site imagery keeps its aspect ratio and existing approved visual composition.

## Cleanup / validation
- Historical root audit/change report clutter was removed from the production package; current setup/reference documents remain.
- Malformed footer image attributes were corrected.
- All JavaScript passes `node --check`.
- JSON parses successfully.
- Normal local file references resolve.
- No PayPal Sandbox route remains in the public purchase flow.
- R120 commercial checks pass.

## Final backend reconciliation
- `neith_admin_bootstrap`, `neith_admin_dashboard_summary` and `neith_admin_list_users_v3` were aligned with the current `neith_memberships`, `neith_profiles` and `neith_admin_users` authority instead of legacy profile/role tables.
- OWNER is bridged to legacy SUPERADMIN-only RPC boundaries with mandatory AAL2/MFA so older admin modules remain compatible without weakening authorization.
- User suspension/reactivation in the web panel now calls the current `neith_admin_set_suspension` / `neith_admin_reactivate_user` RPCs.
- Legacy role/plan editing in the old Users card is now read-only; PREMIUM is managed from the new PREMIUM & CLAVES panel so the web cannot write stale legacy entitlement tables.
- Modern administrative writes are mirrored into the web audit stream, so PREMIUM/key/device operations are visible in Auditoría.

## PayPal gift reliability
- Gift checkout cancellation returns to Mi Cuenta with the same result UI as successful/error returns.
- Gift issuance has two idempotent completion paths: the authoritative PayPal return/capture handler and the signed `PAYMENT.CAPTURE.COMPLETED` webhook path.
- Therefore a buyer closing the browser after approval does not make the paid gift depend solely on the redirect completing.
- Lemon Squeezy checkout is now portal-only for historical subscriptions; new purchases are rejected there and remain PayPal LIVE-only.

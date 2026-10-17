# Neith Web V34 R179 — Commercial Performance & Integration Audit

Baseline: `Neith_Official_Web_V34_R178_LOGROS_PLANS_PREMIUM_REBUILD_SAFE.zip`

## Scope
This revision is a performance/integration pass. It does not redesign the approved UI. The goal is faster perceived navigation, lower transfer/request overhead, faster Admin startup and one authoritative account identity shared with the launcher.

## Frontend performance
- Converted the heaviest active approved artwork to high-quality WebP while preserving the original PNG files as rollback assets.
- Home trailer thumbnail is now lazy/low-priority instead of competing with first-view content.
- 4K trailer poster remains 3840×2160 while dropping from ~10.7 MB PNG to ~0.63 MB WebP.
- Added order-preserving CSS bundles for Admin, Boost PC, Hour Boost, Logros, Juegos Gratis and Cuentas, reducing HTTP request count without changing CSS cascade order.
- Added an order-preserving Admin JS bundle for the four large Admin modules.
- Added bounded same-origin navigation prefetch: 90 ms hover intent, max 3 documents, disabled on Save-Data/2G, no polling/background worker.
- Juegos Gratis now respects the existing server cache instead of forcing `no-store` for Neith's own endpoint.

## Account / launcher parity
- The website no longer treats legacy `public.profiles` as the source of truth for nickname/avatar.
- `neith_web_account_state()` schema 3 returns identity from `public.neith_profiles`, the same authoritative identity source used by launcher/Admin.
- Web `auth.js` coalesces simultaneous profile + membership loads into a single authoritative RPC and caches only the authoritative identity.
- This removes one network round-trip on normal account hydration and prevents website/launcher name/avatar drift.

## Admin performance
- `neith_admin_context` and `neith_my_role` start in parallel instead of serially.
- The validated Admin context is reused by commercial Admin modules instead of repeating the same access RPC.
- All 43 RPC names referenced by the web were checked against Neith Production and exist live.

## Supabase production migrations already applied
1. `r179_web_admin_performance_indexes` — covering indexes for previously unindexed foreign keys used by Admin/billing/membership workflows.
2. `r179_rls_auth_uid_initplan` — equivalent RLS policies using `(select auth.uid())`, avoiding per-row auth re-evaluation.
3. `r179_authoritative_web_identity_state` — adds authoritative `profile` data to `neith_web_account_state()` while preserving membership/periods semantics.

Reproducible SQL copies are stored under `supabase/`.

## Deliberately not changed
- Approved visual composition, pricing layout, FREE/PREMIUM product rules and launcher entitlement semantics.
- Security-definer/RLS architecture was not broadly rewritten during a performance pass.
- Existing security-advisor findings such as leaked-password protection and security-definer exposure remain separate hardening work and are not represented as fixed here.

## Validation limitation
Static/runtime syntax, asset integrity, RPC parity and ZIP integrity are validated in this environment. A real Chromium binary is unavailable here, so full browser-driven E2E is not claimed. Final production E2E should still cover account login, Google auth, Admin actions and a real purchase/webhook cycle.

## Final validation results
- JavaScript syntax: 24/24 files PASS (`node --check`).
- Python helper compile: 2/2 PASS.
- JSON/webmanifest parse: 2/2 PASS.
- HTML documents parsed/referenced: 32; broken local asset references: 0; duplicate HTML IDs: 0.
- Image decode verification: 40/40 PASS.
- CSS brace/integrity scan: 65/65 PASS.
- Merge markers / Python bytecode / temp residue: 0.
- Active references to replaced heavyweight PNG assets: 0.
- Local Neith server autoprobe: 29/29 resources PASS; key public/private pages and R179 bundles returned HTTP 200.
- Supabase performance advisor after migrations: no remaining unindexed-FK or auth-RLS-initplan warning; only informational unused-index notices remain immediately after index creation.

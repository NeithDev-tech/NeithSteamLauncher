# R181 — Instant Account Identity Root Fix SAFE

Base: R180_SCROLL_FLUIDITY_ROOT_FIX_SAFE.

## Root cause
R179/R180 moved web identity to the authoritative `neith_web_account_state()` RPC but invalidated the previous first-frame profile cache. After logout/login, the UI could render before that RPC returned. Avatar selection also preferred OAuth `user_metadata` over the authoritative Neith avatar, so a stale/expired Google/Discord image URL could render as a broken image.

## Fix
- Added a tiny persistent identity cache keyed strictly by Supabase `user_id` (display name/avatar only; no tokens/credentials).
- Migrates the valid R179/R180 session cache on first run.
- On password login, OAuth return, auth-state changes, and protected-page bootstrap, hydrates name/avatar synchronously from the keyed cache or auth metadata before any network wait.
- Supabase remains authoritative: `neith_web_account_state()` refreshes and overwrites the local identity as soon as it returns.
- Neith authoritative avatar now has priority over Google/Discord metadata.
- Broken remote avatar images fall back to initials instead of displaying a broken image icon.
- Logout clears active/session state but retains only the per-user visual identity cache so logout -> login can still paint the correct first frame.
- No polling, no new timers, no visual/layout/CSS changes, no extra recurring network calls.

## Validation
- `node --check` on auth.js: PASS.
- Local Neith server autoprobe: 29/29 resources PASS.
- R181 differs from R180 only in auth identity lifecycle, cache-bust references, version markers and this audit file.

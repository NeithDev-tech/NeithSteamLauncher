# R182 — Admin MFA hidden root fix

Base: R181.

## Root cause
The TOTP enrollment block carried the native `hidden` attribute for already-enrolled accounts, but `.neith-admin-mfa-enroll { display:grid }` in author CSS overrode the browser `[hidden] { display:none }` rule. This left the QR/manual-secret panel visible and produced a white broken-image box.

## Fix
- Added `.neith-admin-mfa-enroll[hidden]{display:none!important}`.
- Every MFA flow now starts with the enrollment panel hidden and clears stale QR/secret content before factor discovery.
- Existing verified TOTP: only code/status/actions render.
- New TOTP enrollment: QR/manual key still render normally.
- No auth, AAL2, Supabase, account, layout or launcher behavior changed.

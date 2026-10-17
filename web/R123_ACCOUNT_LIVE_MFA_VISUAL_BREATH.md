# V34 R123

- Dashboard membership now reads the authoritative Supabase membership state instead of `profiles.plan`.
- Permanent PREMIUM renders as permanent, with no expiry/renewal requirement.
- Commercial status shows purchase/period/end/renewal/provider/cancellation/next charge data where applicable.
- Membership refreshes on boot, focus, visibility return and during an active session.
- Added read-only authenticated `neith_web_account_state()` RPC; it has no launcher-device binding side effects.
- Admin Center MFA gate now verifies the existing TOTP factor directly in-page and elevates the session to AAL2 before entry.
- If no TOTP exists, the same premium modal can enroll one.
- Global visual breathing pass: larger fluid section rhythm, cleaner card spacing, responsive reflow and stronger PREMIUM hierarchy.

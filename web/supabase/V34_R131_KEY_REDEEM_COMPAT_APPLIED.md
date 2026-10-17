# V34 R131 — Key redeem compatibility (aplicado remotamente)

Supabase actualizado el 10/10/2026:

- `neith_redeem_key` acepta las duraciones flexibles emitidas por `neith_admin_generate_key`: días 1..365, meses 1..120, años 1..20 y permanente.
- Las claves regalo siguen concediendo 1 mes.
- Una Cuenta Neith con PREMIUM permanente no consume claves temporales ni pierde su condición permanente.
- El canje registra `neith_premium_periods`, `neith_membership_events` y marca la clave como canjeada una sola vez.
- La activación del PC permanece como paso explícito de seguridad en el launcher.

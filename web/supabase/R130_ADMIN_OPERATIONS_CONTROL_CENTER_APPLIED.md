# R130 Admin Operations Control Center

Aplicado al proyecto Supabase de Neith en esta revisión.

RPC protegidos por `neith_assert_admin` / AAL2:
- `neith_admin_devices_snapshot(p_query, p_limit)`
- `neith_admin_subscriptions_snapshot(p_limit)`
- `neith_admin_integrity_snapshot()`
- `neith_admin_repair_identity(p_user_id, p_reason)` — OWNER
- `neith_admin_set_premium_until(p_user_id, p_until, p_reason)` — OWNER
- `neith_admin_control_room()`

Las mutaciones de dispositivos y membresías reutilizan los RPC auditados existentes de Neith.

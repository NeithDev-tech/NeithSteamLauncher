-- Applied to Neith Production on 2026-10-12.
-- Non-destructive covering indexes for foreign keys used by web/admin workflows.
create index if not exists neith_admin_audit_actor_user_id_idx on public.neith_admin_audit(actor_user_id);
create index if not exists neith_admin_audit_target_user_id_idx on public.neith_admin_audit(target_user_id);
create index if not exists neith_admin_console_settings_updated_by_idx on public.neith_admin_console_settings(updated_by);
create index if not exists neith_admin_premium_adjustments_actor_user_id_idx on public.neith_admin_premium_adjustments(actor_user_id);
create index if not exists neith_admin_premium_adjustments_target_user_id_idx on public.neith_admin_premium_adjustments(target_user_id);
create index if not exists neith_admin_users_created_by_idx on public.neith_admin_users(created_by);
create index if not exists neith_announcements_created_by_idx on public.neith_announcements(created_by);
create index if not exists neith_announcements_updated_by_idx on public.neith_announcements(updated_by);
create index if not exists neith_billing_events_user_id_idx on public.neith_billing_events(user_id);
create index if not exists neith_feature_flags_updated_by_idx on public.neith_feature_flags(updated_by);
create index if not exists neith_launcher_config_updated_by_idx on public.neith_launcher_config(updated_by);
create index if not exists neith_license_keys_created_by_idx on public.neith_license_keys(created_by);
create index if not exists neith_license_keys_redeemed_by_idx on public.neith_license_keys(redeemed_by);
create index if not exists neith_membership_events_user_id_idx on public.neith_membership_events(user_id);
create index if not exists neith_user_roles_created_by_idx on public.neith_user_roles(created_by);

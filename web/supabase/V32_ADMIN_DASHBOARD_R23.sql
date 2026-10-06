-- NEITH Admin Center R23 — Dashboard PREMIUM summary
-- Ejecutar una sola vez en Supabase SQL Editor. No modifica datos existentes.
create or replace function public.neith_admin_dashboard_summary()
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  stats jsonb;
  launcher jsonb;
  recent_activity jsonb;
begin
  perform public.neith_assert_admin();

  select jsonb_build_object(
    'users_total', (select count(*) from auth.users),
    'premium_total', (select count(*) from public.profiles where plan='premium'),
    'suspended_total', (select count(*) from auth.users where banned_until is not null and banned_until > now()),
    'admins_total', (select count(*) from public.neith_user_roles where role in ('admin','superadmin')),
    'active_announcements', (select count(*) from public.neith_announcements where active=true and starts_at<=now() and (ends_at is null or ends_at>now())),
    'feature_flags_enabled', (select count(*) from public.neith_feature_flags where enabled=true),
    'audit_24h', (select count(*) from public.neith_admin_audit_log where created_at>=now()-interval '24 hours')
  ) into stats;

  select coalesce(to_jsonb(c),'{}'::jsonb) into launcher from public.neith_launcher_config c where id=1;

  select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at desc),'[]'::jsonb) into recent_activity
  from (
    select l.id,l.action,l.target_type,l.target_id,l.created_at,
           u.email as actor_email,
           coalesce(nullif(p.display_name,''),split_part(coalesce(u.email,''),'@',1),'Sistema') as actor_name
    from public.neith_admin_audit_log l
    left join auth.users u on u.id=l.actor_id
    left join public.profiles p on p.id=l.actor_id
    order by l.created_at desc,l.id desc
    limit 6
  ) x;

  return jsonb_build_object('stats',stats,'launcher',launcher,'recent_activity',recent_activity,'server_time',now());
end;
$$;
revoke all on function public.neith_admin_dashboard_summary() from public, anon;
grant execute on function public.neith_admin_dashboard_summary() to authenticated;
notify pgrst, 'reload schema';

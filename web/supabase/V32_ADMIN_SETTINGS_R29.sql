-- NEITH V32 · Admin Center Settings R29
-- Ejecutar UNA sola vez en Supabase SQL Editor.
-- Añade preferencias globales reales del Admin Center sin exponer secretos.

create table if not exists public.neith_admin_console_settings (
  id smallint primary key default 1 check (id = 1),
  users_page_size integer not null default 20 check (users_page_size in (10,20,30,50)),
  notices_page_size integer not null default 20 check (notices_page_size in (10,20,30,50)),
  flags_page_size integer not null default 20 check (flags_page_size in (10,20,30,50)),
  audit_page_size integer not null default 25 check (audit_page_size in (25,50,100)),
  dashboard_refresh_seconds integer not null default 0 check (dashboard_refresh_seconds in (0,30,60,120)),
  updated_at timestamptz not null default now(),
  updated_by uuid null references auth.users(id) on delete set null
);

insert into public.neith_admin_console_settings(id)
values (1)
on conflict (id) do nothing;

alter table public.neith_admin_console_settings enable row level security;
revoke all on public.neith_admin_console_settings from anon, authenticated;

create or replace function public.neith_admin_get_console_settings()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  result jsonb;
begin
  perform public.neith_assert_admin();
  select to_jsonb(s) into result
  from public.neith_admin_console_settings s
  where s.id = 1;
  return coalesce(result, '{}'::jsonb);
end;
$$;

create or replace function public.neith_admin_save_console_settings(p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_users integer := coalesce((p_payload->>'users_page_size')::integer,20);
  v_notices integer := coalesce((p_payload->>'notices_page_size')::integer,20);
  v_flags integer := coalesce((p_payload->>'flags_page_size')::integer,20);
  v_audit integer := coalesce((p_payload->>'audit_page_size')::integer,25);
  v_refresh integer := coalesce((p_payload->>'dashboard_refresh_seconds')::integer,0);
  result jsonb;
begin
  perform public.neith_assert_superadmin();

  if v_users not in (10,20,30,50) then raise exception 'users_page_size inválido'; end if;
  if v_notices not in (10,20,30,50) then raise exception 'notices_page_size inválido'; end if;
  if v_flags not in (10,20,30,50) then raise exception 'flags_page_size inválido'; end if;
  if v_audit not in (25,50,100) then raise exception 'audit_page_size inválido'; end if;
  if v_refresh not in (0,30,60,120) then raise exception 'dashboard_refresh_seconds inválido'; end if;

  update public.neith_admin_console_settings s
  set users_page_size=v_users,
      notices_page_size=v_notices,
      flags_page_size=v_flags,
      audit_page_size=v_audit,
      dashboard_refresh_seconds=v_refresh,
      updated_at=now(),
      updated_by=auth.uid()
  where s.id=1
  returning to_jsonb(s) into result;

  perform public.neith_audit(
    'console_settings.updated',
    'system',
    'admin-center',
    jsonb_build_object(
      'users_page_size',v_users,
      'notices_page_size',v_notices,
      'flags_page_size',v_flags,
      'audit_page_size',v_audit,
      'dashboard_refresh_seconds',v_refresh
    )
  );
  return result;
end;
$$;

grant execute on function public.neith_admin_get_console_settings() to authenticated;
grant execute on function public.neith_admin_save_console_settings(jsonb) to authenticated;
notify pgrst, 'reload schema';

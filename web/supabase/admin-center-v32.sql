-- NEITH ADMIN CENTER V32
-- Secure admin foundation for website + launcher remote control.
-- Run once in Supabase SQL Editor.

create extension if not exists pgcrypto;

create table if not exists public.neith_user_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'user' check (role in ('user','premium','staff','admin','superadmin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null
);

alter table public.neith_user_roles enable row level security;
drop policy if exists "Users read own Neith role" on public.neith_user_roles;
create policy "Users read own Neith role"
on public.neith_user_roles for select
to authenticated
using (auth.uid() = user_id);

create table if not exists public.neith_launcher_config (
  id smallint primary key default 1 check (id = 1),
  stable_version text not null default '1.0.0',
  minimum_version text not null default '1.0.0',
  download_url text not null default 'https://github.com/NeithDev-tech/NeithSteamLauncher/releases/latest/download/NeithSetup.exe',
  release_channel text not null default 'stable' check (release_channel in ('stable','beta','maintenance')),
  force_update boolean not null default false,
  maintenance_enabled boolean not null default false,
  maintenance_title text not null default 'Mantenimiento programado',
  maintenance_message text not null default 'Neith volverá a estar disponible en breve.',
  launcher_notice text not null default '',
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);

insert into public.neith_launcher_config (id) values (1)
on conflict (id) do nothing;
alter table public.neith_launcher_config enable row level security;

create table if not exists public.neith_feature_flags (
  flag_key text primary key check (flag_key ~ '^[a-z0-9_\-]{2,64}$'),
  label text not null,
  description text not null default '',
  enabled boolean not null default false,
  audience text not null default 'all' check (audience in ('all','free','premium','beta','staff')),
  rollout_percent integer not null default 100 check (rollout_percent between 0 and 100),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);

alter table public.neith_feature_flags enable row level security;

insert into public.neith_feature_flags(flag_key,label,description,enabled,audience,rollout_percent)
values
  ('hour_boost','Hour Boost','Permite activar/desactivar Hour Boost remotamente.',true,'all',100),
  ('boost_pc','Boost PC','Permite activar/desactivar Boost PC remotamente.',true,'all',100),
  ('achievements','Logros','Control remoto del módulo de Logros.',true,'all',100),
  ('free_games','Juegos Gratis','Control remoto del radar de Juegos Gratis.',true,'all',100),
  ('beta_features','Funciones Beta','Funciones experimentales para testers.',false,'beta',100)
on conflict (flag_key) do nothing;

create table if not exists public.neith_announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  severity text not null default 'info' check (severity in ('info','success','warning','critical')),
  audience text not null default 'all' check (audience in ('all','free','premium','beta','staff')),
  active boolean not null default true,
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null
);

alter table public.neith_announcements enable row level security;

create table if not exists public.neith_admin_audit_log (
  id bigint generated always as identity primary key,
  actor_id uuid references auth.users(id) on delete set null,
  action text not null,
  target_type text not null default 'system',
  target_id text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.neith_admin_audit_log enable row level security;

create or replace function public.neith_my_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select role from public.neith_user_roles where user_id = auth.uid()), 'user');
$$;

create or replace function public.neith_is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.neith_my_role() in ('admin','superadmin');
$$;

create or replace function public.neith_is_superadmin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.neith_my_role() = 'superadmin';
$$;

create or replace function public.neith_assert_admin()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or not public.neith_is_admin() then
    raise exception 'NEITH_ADMIN_REQUIRED' using errcode = '42501';
  end if;
end;
$$;

create or replace function public.neith_assert_superadmin()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or not public.neith_is_superadmin() then
    raise exception 'NEITH_SUPERADMIN_REQUIRED' using errcode = '42501';
  end if;
end;
$$;

create or replace function public.neith_audit(p_action text, p_target_type text default 'system', p_target_id text default null, p_payload jsonb default '{}'::jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.neith_admin_audit_log(actor_id, action, target_type, target_id, payload)
  values(auth.uid(), left(coalesce(p_action,'unknown'),120), left(coalesce(p_target_type,'system'),80), left(p_target_id,180), coalesce(p_payload,'{}'::jsonb));
end;
$$;

create or replace function public.neith_admin_bootstrap()
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  cfg jsonb;
  flags jsonb;
  notices jsonb;
  audits jsonb;
  stats jsonb;
begin
  perform public.neith_assert_admin();

  select to_jsonb(c) into cfg from public.neith_launcher_config c where id = 1;
  select coalesce(jsonb_agg(to_jsonb(f) order by f.flag_key), '[]'::jsonb) into flags from public.neith_feature_flags f;
  select coalesce(jsonb_agg(to_jsonb(a) order by a.created_at desc), '[]'::jsonb) into notices
    from (select * from public.neith_announcements order by created_at desc limit 30) a;
  select coalesce(jsonb_agg(to_jsonb(l) order by l.created_at desc), '[]'::jsonb) into audits
    from (select id, actor_id, action, target_type, target_id, payload, created_at from public.neith_admin_audit_log order by created_at desc limit 40) l;

  select jsonb_build_object(
    'users_total', (select count(*) from auth.users),
    'premium_total', (select count(*) from public.profiles where plan = 'premium'),
    'admins_total', (select count(*) from public.neith_user_roles where role in ('admin','superadmin')),
    'active_announcements', (select count(*) from public.neith_announcements where active = true and starts_at <= now() and (ends_at is null or ends_at > now())),
    'feature_flags_enabled', (select count(*) from public.neith_feature_flags where enabled = true)
  ) into stats;

  return jsonb_build_object(
    'role', public.neith_my_role(),
    'launcher', coalesce(cfg,'{}'::jsonb),
    'feature_flags', flags,
    'announcements', notices,
    'audit', audits,
    'stats', stats,
    'server_time', now()
  );
end;
$$;

create or replace function public.neith_admin_save_launcher_config(p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  result jsonb;
begin
  perform public.neith_assert_admin();

  update public.neith_launcher_config as c
  set
    stable_version = coalesce(nullif(trim(p_payload->>'stable_version'),''), stable_version),
    minimum_version = coalesce(nullif(trim(p_payload->>'minimum_version'),''), minimum_version),
    download_url = coalesce(nullif(trim(p_payload->>'download_url'),''), download_url),
    release_channel = case when p_payload->>'release_channel' in ('stable','beta','maintenance') then p_payload->>'release_channel' else release_channel end,
    force_update = coalesce((p_payload->>'force_update')::boolean, force_update),
    maintenance_enabled = coalesce((p_payload->>'maintenance_enabled')::boolean, maintenance_enabled),
    maintenance_title = coalesce(nullif(trim(p_payload->>'maintenance_title'),''), maintenance_title),
    maintenance_message = coalesce(nullif(trim(p_payload->>'maintenance_message'),''), maintenance_message),
    launcher_notice = coalesce(p_payload->>'launcher_notice', launcher_notice),
    updated_at = now(),
    updated_by = auth.uid()
  where id = 1
  returning to_jsonb(c) into result;

  perform public.neith_audit('launcher_config.updated','launcher','global',p_payload);
  return result;
end;
$$;

create or replace function public.neith_admin_upsert_feature_flag(p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  k text := lower(trim(p_payload->>'flag_key'));
  result jsonb;
begin
  perform public.neith_assert_admin();
  if k is null or k !~ '^[a-z0-9_\-]{2,64}$' then raise exception 'INVALID_FLAG_KEY'; end if;

  insert into public.neith_feature_flags as f(flag_key,label,description,enabled,audience,rollout_percent,updated_at,updated_by)
  values(
    k,
    coalesce(nullif(trim(p_payload->>'label'),''),k),
    coalesce(p_payload->>'description',''),
    coalesce((p_payload->>'enabled')::boolean,false),
    case when p_payload->>'audience' in ('all','free','premium','beta','staff') then p_payload->>'audience' else 'all' end,
    greatest(0,least(100,coalesce((p_payload->>'rollout_percent')::integer,100))),
    now(),auth.uid()
  )
  on conflict(flag_key) do update set
    label=excluded.label, description=excluded.description, enabled=excluded.enabled,
    audience=excluded.audience, rollout_percent=excluded.rollout_percent,
    updated_at=now(), updated_by=auth.uid()
  returning to_jsonb(f) into result;

  perform public.neith_audit('feature_flag.saved','feature_flag',k,p_payload);
  return result;
end;
$$;

create or replace function public.neith_admin_save_announcement(p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  announcement_id uuid;
  result jsonb;
begin
  perform public.neith_assert_admin();
  begin announcement_id := nullif(p_payload->>'id','')::uuid; exception when others then announcement_id := null; end;

  if announcement_id is null then
    insert into public.neith_announcements(title,body,severity,audience,active,starts_at,ends_at,created_by,updated_by)
    values(
      coalesce(nullif(trim(p_payload->>'title'),''),'Aviso Neith'),
      coalesce(nullif(trim(p_payload->>'body'),''),'Sin detalles.'),
      case when p_payload->>'severity' in ('info','success','warning','critical') then p_payload->>'severity' else 'info' end,
      case when p_payload->>'audience' in ('all','free','premium','beta','staff') then p_payload->>'audience' else 'all' end,
      coalesce((p_payload->>'active')::boolean,true),
      coalesce((p_payload->>'starts_at')::timestamptz,now()),
      nullif(p_payload->>'ends_at','')::timestamptz,
      auth.uid(),auth.uid()
    ) returning id into announcement_id;
  else
    update public.neith_announcements
    set title=coalesce(nullif(trim(p_payload->>'title'),''),title),
        body=coalesce(nullif(trim(p_payload->>'body'),''),body),
        severity=case when p_payload->>'severity' in ('info','success','warning','critical') then p_payload->>'severity' else severity end,
        audience=case when p_payload->>'audience' in ('all','free','premium','beta','staff') then p_payload->>'audience' else audience end,
        active=coalesce((p_payload->>'active')::boolean,active),
        starts_at=coalesce((p_payload->>'starts_at')::timestamptz,starts_at),
        ends_at=case when p_payload ? 'ends_at' then nullif(p_payload->>'ends_at','')::timestamptz else ends_at end,
        updated_at=now(),updated_by=auth.uid()
    where id=announcement_id;
  end if;

  select to_jsonb(a) into result from public.neith_announcements a where a.id=announcement_id;
  perform public.neith_audit('announcement.saved','announcement',announcement_id::text,p_payload);
  return result;
end;
$$;

create or replace function public.neith_admin_set_announcement_active(p_id uuid, p_active boolean)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.neith_assert_admin();
  update public.neith_announcements set active=p_active,updated_at=now(),updated_by=auth.uid() where id=p_id;
  perform public.neith_audit('announcement.active_changed','announcement',p_id::text,jsonb_build_object('active',p_active));
  return found;
end;
$$;

create or replace function public.neith_admin_search_users(p_query text default '', p_limit integer default 30)
returns table(user_id uuid,email text,display_name text,plan text,subscription_status text,role text,created_at timestamptz,last_sign_in_at timestamptz)
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  perform public.neith_assert_admin();
  return query
  select u.id,u.email,p.display_name,p.plan,p.subscription_status,coalesce(r.role,'user'),u.created_at,u.last_sign_in_at
  from auth.users u
  left join public.profiles p on p.id=u.id
  left join public.neith_user_roles r on r.user_id=u.id
  where trim(coalesce(p_query,''))='' or lower(coalesce(u.email,'')) like '%'||lower(trim(p_query))||'%' or lower(coalesce(p.display_name,'')) like '%'||lower(trim(p_query))||'%'
  order by u.created_at desc
  limit greatest(1,least(coalesce(p_limit,30),100));
end;
$$;

create or replace function public.neith_admin_set_user_access(p_user_id uuid, p_role text default null, p_plan text default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  result jsonb;
begin
  perform public.neith_assert_superadmin();
  if p_role is not null and p_role not in ('user','premium','staff','admin','superadmin') then raise exception 'INVALID_ROLE'; end if;
  if p_plan is not null and p_plan not in ('free','premium') then raise exception 'INVALID_PLAN'; end if;
  if p_role is not null and p_role <> 'superadmin' and exists(select 1 from public.neith_user_roles where user_id=p_user_id and role='superadmin') and (select count(*) from public.neith_user_roles where role='superadmin') <= 1 then
    raise exception 'CANNOT_REMOVE_LAST_SUPERADMIN';
  end if;

  if p_role is not null then
    insert into public.neith_user_roles(user_id,role,created_by,updated_at)
    values(p_user_id,p_role,auth.uid(),now())
    on conflict(user_id) do update set role=excluded.role,updated_at=now(),created_by=coalesce(neith_user_roles.created_by,auth.uid());
  end if;

  if p_plan is not null then
    update public.profiles
    set plan=p_plan,subscription_status=case when p_plan='premium' then 'manual_admin' else 'free' end,updated_at=now()
    where id=p_user_id;
  end if;

  select jsonb_build_object('user_id',p_user_id,'role',coalesce((select role from public.neith_user_roles where user_id=p_user_id),'user'),'plan',coalesce((select plan from public.profiles where id=p_user_id),'free')) into result;
  perform public.neith_audit('user_access.updated','user',p_user_id::text,jsonb_build_object('role',p_role,'plan',p_plan));
  return result;
end;
$$;

-- Safe launcher configuration endpoint. No secrets are returned.
create or replace function public.neith_launcher_public_config()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'stable_version',c.stable_version,
    'minimum_version',c.minimum_version,
    'download_url',c.download_url,
    'release_channel',c.release_channel,
    'force_update',c.force_update,
    'maintenance_enabled',c.maintenance_enabled,
    'maintenance_title',c.maintenance_title,
    'maintenance_message',c.maintenance_message,
    'launcher_notice',c.launcher_notice,
    'feature_flags',(select coalesce(jsonb_agg(jsonb_build_object('key',f.flag_key,'enabled',f.enabled,'audience',f.audience,'rollout_percent',f.rollout_percent)),'[]'::jsonb) from public.neith_feature_flags f where f.audience='all'),
    'announcements',(select coalesce(jsonb_agg(jsonb_build_object('id',a.id,'title',a.title,'body',a.body,'severity',a.severity,'audience',a.audience,'ends_at',a.ends_at) order by a.created_at desc),'[]'::jsonb) from public.neith_announcements a where a.active=true and a.audience='all' and a.starts_at<=now() and (a.ends_at is null or a.ends_at>now())),
    'updated_at',c.updated_at
  ) from public.neith_launcher_config c where c.id=1;
$$;

-- One-time bootstrap helper. It is intentionally NOT executable by browser roles.
create or replace function public.neith_bootstrap_superadmin(p_email text)
returns uuid
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  target uuid;
begin
  select id into target from auth.users where lower(email)=lower(trim(p_email)) limit 1;
  if target is null then raise exception 'No existe un usuario con ese correo'; end if;
  insert into public.neith_user_roles(user_id,role,created_by,updated_at)
  values(target,'superadmin',target,now())
  on conflict(user_id) do update set role='superadmin',updated_at=now();
  return target;
end;
$$;

-- Internal helpers must never be directly callable from browser roles.
revoke all on function public.neith_assert_admin() from public, anon, authenticated;
revoke all on function public.neith_assert_superadmin() from public, anon, authenticated;
revoke all on function public.neith_audit(text,text,text,jsonb) from public, anon, authenticated;
revoke all on function public.neith_is_admin() from public, anon, authenticated;
revoke all on function public.neith_is_superadmin() from public, anon, authenticated;
revoke all on function public.neith_bootstrap_superadmin(text) from public, anon, authenticated;

grant execute on function public.neith_my_role() to authenticated;
grant execute on function public.neith_admin_bootstrap() to authenticated;
grant execute on function public.neith_admin_save_launcher_config(jsonb) to authenticated;
grant execute on function public.neith_admin_upsert_feature_flag(jsonb) to authenticated;
grant execute on function public.neith_admin_save_announcement(jsonb) to authenticated;
grant execute on function public.neith_admin_set_announcement_active(uuid,boolean) to authenticated;
grant execute on function public.neith_admin_search_users(text,integer) to authenticated;
grant execute on function public.neith_admin_set_user_access(uuid,text,text) to authenticated;
grant execute on function public.neith_launcher_public_config() to anon, authenticated;

-- IMPORTANT: after running this migration, run ONCE in SQL Editor:
-- select public.neith_bootstrap_superadmin('TU_CORREO_DE_NEITH');

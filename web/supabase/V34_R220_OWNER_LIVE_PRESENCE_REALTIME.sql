-- Neith Official Web V34 R220 — fast owner-only realtime site telemetry.
-- Uses a per-page live session plus a stable anonymous browser visitor id.
-- No IP address is stored.

create table if not exists public.neith_site_presence_live (
  session_id uuid primary key,
  visitor_id uuid not null,
  user_id uuid,
  display_name text not null default 'Guest',
  page_path text not null default '/',
  first_seen timestamptz not null default now(),
  last_seen timestamptz not null default now()
);

create index if not exists neith_site_presence_live_last_seen_idx
  on public.neith_site_presence_live(last_seen desc);
create index if not exists neith_site_presence_live_visitor_idx
  on public.neith_site_presence_live(visitor_id,last_seen desc);
create index if not exists neith_site_presence_live_user_idx
  on public.neith_site_presence_live(user_id,last_seen desc) where user_id is not null;
create index if not exists neith_site_presence_live_page_idx
  on public.neith_site_presence_live(page_path,last_seen desc);

alter table public.neith_site_presence_live enable row level security;

drop policy if exists neith_site_presence_live_owner_read on public.neith_site_presence_live;
create policy neith_site_presence_live_owner_read
on public.neith_site_presence_live
for select
to authenticated
using (coalesce(public.neith_is_owner(), false));

-- Only RPCs write presence; clients never receive direct write grants.
revoke insert, update, delete on public.neith_site_presence_live from anon, authenticated;

create or replace function public.neith_presence_live_ping(
  p_session_id uuid,
  p_visitor_id uuid,
  p_page_path text default '/'
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_name text := 'Guest';
begin
  if p_session_id is null or p_visitor_id is null then return; end if;

  if v_uid is not null then
    select coalesce(
      nullif(btrim(np.nickname), ''),
      nullif(btrim(p.login_username), ''),
      nullif(btrim(p.display_name), ''),
      'Member'
    )
    into v_name
    from public.neith_profiles np
    full join public.profiles p on p.id = np.user_id
    where coalesce(np.user_id,p.id) = v_uid
    limit 1;
    v_name := coalesce(v_name, 'Member');
  end if;

  insert into public.neith_site_presence_live(
    session_id,visitor_id,user_id,display_name,page_path,first_seen,last_seen
  ) values (
    p_session_id,p_visitor_id,v_uid,left(v_name,48),
    left(coalesce(nullif(p_page_path,''),'/'),180),now(),now()
  )
  on conflict (session_id) do update set
    visitor_id = excluded.visitor_id,
    user_id = excluded.user_id,
    display_name = excluded.display_name,
    page_path = excluded.page_path,
    last_seen = now();

  -- Cheap opportunistic cleanup; indexed by last_seen.
  delete from public.neith_site_presence_live
  where last_seen < now() - interval '10 minutes';
end;
$$;

revoke all on function public.neith_presence_live_ping(uuid,uuid,text) from public;
grant execute on function public.neith_presence_live_ping(uuid,uuid,text) to anon, authenticated;

create or replace function public.neith_presence_live_leave(
  p_session_id uuid,
  p_visitor_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_session_id is null or p_visitor_id is null then return; end if;
  delete from public.neith_site_presence_live
  where session_id = p_session_id and visitor_id = p_visitor_id;
end;
$$;

revoke all on function public.neith_presence_live_leave(uuid,uuid) from public;
grant execute on function public.neith_presence_live_leave(uuid,uuid) to anon, authenticated;

create or replace function public.neith_owner_presence_snapshot_v2()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_result jsonb;
begin
  if not coalesce(public.neith_is_owner(), false) then
    raise exception 'Owner only';
  end if;

  with active_sessions as (
    select *
    from public.neith_site_presence_live
    where last_seen >= now() - interval '30 seconds'
  ),
  active_visitors as (
    select distinct on (visitor_id)
      visitor_id,user_id,display_name,page_path,last_seen
    from active_sessions
    order by visitor_id,last_seen desc
  ),
  member_rows as (
    select distinct on (a.user_id)
      a.user_id,
      a.display_name,
      a.page_path,
      a.last_seen,
      case
        when coalesce(m.premium_permanent,false) then 'premium'
        when lower(coalesce(m.plan,p.plan,'free'))='premium'
             and (m.premium_until is null or m.premium_until > now()) then 'premium'
        else 'free'
      end as plan
    from active_visitors a
    left join public.neith_memberships m on m.user_id=a.user_id
    left join public.profiles p on p.id=a.user_id
    where a.user_id is not null
    order by a.user_id,a.last_seen desc
  ),
  page_rows as (
    select page_path,
           count(distinct visitor_id)::int as visitors,
           count(distinct user_id) filter (where user_id is not null)::int as members
    from active_sessions
    group by page_path
    order by visitors desc,page_path
    limit 8
  ),
  all_accounts as (
    select coalesce(np.user_id,p.id) as user_id,
           coalesce(np.created_at,p.created_at) as created_at,
           coalesce(nullif(btrim(np.nickname),''),nullif(btrim(p.login_username),''),nullif(btrim(p.display_name),''),'Member') as display_name
    from public.neith_profiles np
    full join public.profiles p on p.id=np.user_id
    where coalesce(np.user_id,p.id) is not null
  ),
  newest as (
    select display_name,created_at
    from all_accounts
    order by created_at desc nulls last
    limit 1
  )
  select jsonb_build_object(
    'active_total',(select count(*) from active_visitors),
    'active_members',(select count(*) from member_rows),
    'active_guests',(select count(*) from active_visitors where user_id is null),
    'active_sessions',(select count(*) from active_sessions),
    'active_last_5m',(select count(distinct visitor_id) from public.neith_site_presence_live where last_seen >= now()-interval '5 minutes'),
    'premium_online',(select count(*) from member_rows where plan='premium'),
    'free_online',(select count(*) from member_rows where plan='free'),
    'members',coalesce((
      select jsonb_agg(jsonb_build_object(
        'name',display_name,
        'page',page_path,
        'plan',plan,
        'last_seen',last_seen
      ) order by display_name)
      from member_rows
    ),'[]'::jsonb),
    'pages',coalesce((
      select jsonb_agg(jsonb_build_object(
        'path',page_path,
        'visitors',visitors,
        'members',members
      ) order by visitors desc,page_path)
      from page_rows
    ),'[]'::jsonb),
    'top_page',coalesce((select page_path from page_rows limit 1),'—'),
    'registered_total',(select count(distinct user_id) from all_accounts),
    'registered_today',(select count(distinct user_id) from all_accounts where created_at >= date_trunc('day',now())),
    'unique_visitors_today',(select count(*) from public.site_unique_visitors where first_seen_at >= date_trunc('day',now())),
    'shoutbox_messages_24h',(select count(*) from public.neith_shoutbox_messages where created_at >= now()-interval '24 hours'),
    'shoutbox_bans',(select count(*) from public.neith_shoutbox_bans),
    'newest_member',coalesce((select display_name from newest),'—'),
    'newest_member_at',(select created_at from newest),
    'refreshed_at',now()
  ) into v_result;

  return v_result;
end;
$$;

revoke all on function public.neith_owner_presence_snapshot_v2() from public;
grant execute on function public.neith_owner_presence_snapshot_v2() to authenticated;

-- Enable Postgres Changes only for this owner-readable live table.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname='supabase_realtime'
      and schemaname='public'
      and tablename='neith_site_presence_live'
  ) then
    alter publication supabase_realtime add table public.neith_site_presence_live;
  end if;
end $$;

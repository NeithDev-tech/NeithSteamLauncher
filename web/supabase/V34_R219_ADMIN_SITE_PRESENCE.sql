-- Neith Official Web V34 R219 — owner-only live site presence footer.
-- Already applied to Neith Production.

create table if not exists public.neith_site_presence (
  visitor_id uuid primary key,
  user_id uuid,
  display_name text not null default 'Guest',
  page_path text not null default '/',
  first_seen timestamptz not null default now(),
  last_seen timestamptz not null default now()
);

create index if not exists neith_site_presence_last_seen_idx
  on public.neith_site_presence(last_seen desc);
create index if not exists neith_site_presence_user_id_idx
  on public.neith_site_presence(user_id) where user_id is not null;

alter table public.neith_site_presence enable row level security;

create or replace function public.neith_presence_ping(p_visitor_id uuid, p_page_path text default '/')
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_name text := 'Guest';
begin
  if p_visitor_id is null then return; end if;
  if v_uid is not null then
    select coalesce(nullif(btrim(np.nickname), ''), nullif(btrim(p.login_username), ''), nullif(btrim(p.display_name), ''), 'Member')
      into v_name
      from public.neith_profiles np
      full join public.profiles p on p.id = np.user_id
      where coalesce(np.user_id,p.id) = v_uid
      limit 1;
    v_name := coalesce(v_name, 'Member');
  end if;
  insert into public.neith_site_presence(visitor_id,user_id,display_name,page_path,first_seen,last_seen)
  values (p_visitor_id,v_uid,left(v_name,48),left(coalesce(nullif(p_page_path,''),'/'),180),now(),now())
  on conflict (visitor_id) do update set
    user_id=excluded.user_id,
    display_name=excluded.display_name,
    page_path=excluded.page_path,
    last_seen=now();
  delete from public.neith_site_presence where last_seen < now() - interval '1 day';
end;
$$;

revoke all on function public.neith_presence_ping(uuid,text) from public;
grant execute on function public.neith_presence_ping(uuid,text) to anon, authenticated;

create or replace function public.neith_owner_presence_snapshot()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare v_result jsonb;
begin
  if not coalesce(public.neith_is_owner(), false) then raise exception 'Owner only'; end if;
  with active as (
    select * from public.neith_site_presence where last_seen >= now() - interval '90 seconds'
  ), member_rows as (
    select user_id,max(display_name) as display_name,max(last_seen) as last_seen
    from active where user_id is not null group by user_id
  ), newest as (
    select coalesce(nullif(btrim(np.nickname),''),nullif(btrim(p.login_username),''),nullif(btrim(p.display_name),''),'Member') as display_name,
           coalesce(np.created_at,p.created_at) as created_at
    from public.neith_profiles np
    full join public.profiles p on p.id=np.user_id
    order by coalesce(np.created_at,p.created_at) desc nulls last
    limit 1
  )
  select jsonb_build_object(
    'active_total',(select count(*) from active),
    'active_members',(select count(*) from member_rows),
    'active_guests',(select count(*) from active where user_id is null),
    'members',coalesce((select jsonb_agg(jsonb_build_object('name',display_name,'last_seen',last_seen) order by display_name) from member_rows),'[]'::jsonb),
    'newest_member',coalesce((select display_name from newest),''),
    'newest_member_at',(select created_at from newest),
    'refreshed_at',now()
  ) into v_result;
  return v_result;
end;
$$;

revoke all on function public.neith_owner_presence_snapshot() from public;
grant execute on function public.neith_owner_presence_snapshot() to authenticated;

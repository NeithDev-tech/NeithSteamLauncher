-- Applied to Neith production on 2026-10-26.
-- Owner-only helper RPCs for the compact Site Intelligence panel.
-- Raw IP addresses are never stored; the frontend sends only a Netlify-generated one-way hash.

create or replace function public.neith_owner_site_intelligence_v74()
returns jsonb language plpgsql security definer set search_path to '' as $function$
declare
  v_today_start timestamptz := ((now() at time zone 'Europe/Madrid')::date::timestamp at time zone 'Europe/Madrid');
  v_result jsonb;
begin
  if not coalesce(public.neith_is_owner(), false) then raise exception 'Owner only'; end if;
  with page_events as (
    select coalesce(nullif(metadata->>'ip_hash',''), visitor_id::text) unique_key,
           lower(coalesce(nullif(metadata->>'device',''),'unknown')) device
    from public.neith_site_analytics_events
    where created_at >= v_today_start and event_type='page_view'
  ), download_events as (
    select coalesce(nullif(metadata->>'ip_hash',''), visitor_id::text) unique_key
    from public.neith_site_analytics_events
    where created_at >= v_today_start and event_type='launcher_download'
  ), stats as (
    select count(distinct unique_key)::int unique_visitors,
           count(distinct unique_key) filter(where device='desktop')::int desktop,
           count(distinct unique_key) filter(where device='mobile')::int mobile
    from page_events
  )
  select jsonb_build_object(
    'unique_visitors_today',coalesce((select unique_visitors from stats),0),
    'devices_today',jsonb_build_object('desktop',coalesce((select desktop from stats),0),'mobile',coalesce((select mobile from stats),0)),
    'download_conversion_pct',coalesce(round(100.0*(select count(distinct unique_key) from download_events)/nullif((select unique_visitors from stats),0),1),0),
    'generated_at',now()
  ) into v_result;
  return v_result;
end;$function$;

revoke all on function public.neith_owner_site_intelligence_v74() from public;
grant execute on function public.neith_owner_site_intelligence_v74() to authenticated;

create or replace function public.neith_owner_presence_details_v74()
returns jsonb language plpgsql security definer set search_path to '' as $function$
declare v_result jsonb;
begin
  if not coalesce(public.neith_is_owner(), false) then raise exception 'Owner only'; end if;
  with active as (
    select distinct on(visitor_id) visitor_id,user_id,display_name,page_path,last_seen
    from public.neith_site_presence_live
    where last_seen>=now()-interval '30 seconds'
    order by visitor_id,last_seen desc
  ), members as (
    select a.user_id,
      coalesce(nullif(btrim(a.display_name),''),nullif(btrim(np.nickname),''),nullif(btrim(p.login_username),''),nullif(btrim(p.display_name),''),'Member') name,
      a.page_path page,a.last_seen,
      case when coalesce(m.premium_permanent,false) then 'premium'
           when lower(coalesce(m.plan,p.plan,'free'))='premium' and (m.premium_until is null or m.premium_until>now()) then 'premium'
           else 'free' end plan
    from active a
    left join public.neith_profiles np on np.user_id=a.user_id
    left join public.profiles p on p.id=a.user_id
    left join public.neith_memberships m on m.user_id=a.user_id
    where a.user_id is not null
  ), guests as (
    select 'Guest #'||upper(substr(md5(visitor_id::text),1,5)) name,page_path page,last_seen
    from active where user_id is null
  )
  select jsonb_build_object(
    'members',coalesce((select jsonb_agg(jsonb_build_object('name',name,'page',page,'plan',plan,'last_seen',last_seen) order by last_seen desc) from members),'[]'::jsonb),
    'guests',coalesce((select jsonb_agg(jsonb_build_object('name',name,'page',page,'last_seen',last_seen) order by last_seen desc) from guests),'[]'::jsonb),
    'generated_at',now()
  ) into v_result;
  return v_result;
end;$function$;

revoke all on function public.neith_owner_presence_details_v74() from public;
grant execute on function public.neith_owner_presence_details_v74() to authenticated;

-- NEITH Admin Center R17 — Avisos Globales PREMIUM
-- Ejecutar UNA vez después de admin-center-v32.sql.
-- No elimina avisos existentes.

alter table public.neith_announcements
  add column if not exists priority smallint not null default 1,
  add column if not exists surface text not null default 'all';

do $$ begin
  if not exists (select 1 from pg_constraint where conname='neith_announcements_priority_check') then
    alter table public.neith_announcements add constraint neith_announcements_priority_check check (priority between 1 and 4);
  end if;
  if not exists (select 1 from pg_constraint where conname='neith_announcements_surface_check') then
    alter table public.neith_announcements add constraint neith_announcements_surface_check check (surface in ('all','web','launcher'));
  end if;
end $$;

create index if not exists neith_announcements_created_at_idx on public.neith_announcements(created_at desc);
create index if not exists neith_announcements_schedule_idx on public.neith_announcements(active,starts_at,ends_at);
create index if not exists neith_announcements_audience_idx on public.neith_announcements(audience);
create index if not exists neith_announcements_severity_idx on public.neith_announcements(severity);

create or replace function public.neith_admin_list_announcements(
  p_query text default '', p_status text default '', p_audience text default '', p_severity text default '',
  p_limit integer default 20, p_offset integer default 0
) returns jsonb
language plpgsql security definer set search_path=public
as $$
declare lim integer:=greatest(1,least(coalesce(p_limit,20),50)); off integer:=greatest(0,coalesce(p_offset,0)); total bigint; items jsonb;
begin
  perform public.neith_assert_admin();
  select count(*) into total from public.neith_announcements a
  where (trim(coalesce(p_query,''))='' or a.title ilike '%'||trim(p_query)||'%' or a.body ilike '%'||trim(p_query)||'%')
    and (trim(coalesce(p_audience,''))='' or a.audience=p_audience)
    and (trim(coalesce(p_severity,''))='' or a.severity=p_severity)
    and (trim(coalesce(p_status,''))='' or
      (p_status='live' and a.active and a.starts_at<=now() and (a.ends_at is null or a.ends_at>now())) or
      (p_status='scheduled' and a.active and a.starts_at>now()) or
      (p_status='paused' and not a.active) or
      (p_status='expired' and a.active and a.ends_at is not null and a.ends_at<=now()));

  select coalesce(jsonb_agg(to_jsonb(x) order by x.priority desc,x.created_at desc),'[]'::jsonb) into items
  from (
    select a.* from public.neith_announcements a
    where (trim(coalesce(p_query,''))='' or a.title ilike '%'||trim(p_query)||'%' or a.body ilike '%'||trim(p_query)||'%')
      and (trim(coalesce(p_audience,''))='' or a.audience=p_audience)
      and (trim(coalesce(p_severity,''))='' or a.severity=p_severity)
      and (trim(coalesce(p_status,''))='' or
        (p_status='live' and a.active and a.starts_at<=now() and (a.ends_at is null or a.ends_at>now())) or
        (p_status='scheduled' and a.active and a.starts_at>now()) or
        (p_status='paused' and not a.active) or
        (p_status='expired' and a.active and a.ends_at is not null and a.ends_at<=now()))
    order by a.priority desc,a.created_at desc limit lim offset off
  ) x;
  return jsonb_build_object('items',items,'total',total,'limit',lim,'offset',off);
end $$;

create or replace function public.neith_admin_save_announcement(p_payload jsonb)
returns jsonb language plpgsql security definer set search_path=public
as $$
declare announcement_id uuid; result jsonb; v_start timestamptz; v_end timestamptz; v_priority smallint; v_surface text;
begin
  perform public.neith_assert_admin();
  begin announcement_id:=nullif(p_payload->>'id','')::uuid; exception when others then announcement_id:=null; end;
  begin v_start:=coalesce(nullif(p_payload->>'starts_at','')::timestamptz,now()); exception when others then v_start:=now(); end;
  begin v_end:=nullif(p_payload->>'ends_at','')::timestamptz; exception when others then v_end:=null; end;
  v_priority:=greatest(1,least(coalesce(nullif(p_payload->>'priority','')::smallint,1),4));
  v_surface:=case when p_payload->>'surface' in ('all','web','launcher') then p_payload->>'surface' else 'all' end;
  if v_end is not null and v_end<=v_start then raise exception 'La fecha de fin debe ser posterior al inicio'; end if;

  if announcement_id is null then
    insert into public.neith_announcements(title,body,severity,audience,priority,surface,active,starts_at,ends_at,created_by,updated_by)
    values(coalesce(nullif(trim(p_payload->>'title'),''),'Aviso Neith'),coalesce(nullif(trim(p_payload->>'body'),''),'Sin detalles.'),
      case when p_payload->>'severity' in ('info','success','warning','critical') then p_payload->>'severity' else 'info' end,
      case when p_payload->>'audience' in ('all','free','premium','beta','staff') then p_payload->>'audience' else 'all' end,
      v_priority,v_surface,coalesce((p_payload->>'active')::boolean,true),v_start,v_end,auth.uid(),auth.uid()) returning id into announcement_id;
  else
    update public.neith_announcements set
      title=coalesce(nullif(trim(p_payload->>'title'),''),title),body=coalesce(nullif(trim(p_payload->>'body'),''),body),
      severity=case when p_payload->>'severity' in ('info','success','warning','critical') then p_payload->>'severity' else severity end,
      audience=case when p_payload->>'audience' in ('all','free','premium','beta','staff') then p_payload->>'audience' else audience end,
      priority=v_priority,surface=v_surface,active=coalesce((p_payload->>'active')::boolean,active),starts_at=v_start,ends_at=v_end,
      updated_at=now(),updated_by=auth.uid() where id=announcement_id;
  end if;
  select to_jsonb(a) into result from public.neith_announcements a where a.id=announcement_id;
  perform public.neith_audit('announcement.saved','announcement',announcement_id::text,p_payload);
  return result;
end $$;

-- Endpoint público sin secretos. El cliente puede filtrar por audiencia según su sesión/plan.
create or replace function public.neith_launcher_public_config()
returns jsonb language sql stable security definer set search_path=public
as $$
  select jsonb_build_object(
    'stable_version',c.stable_version,'minimum_version',c.minimum_version,'download_url',c.download_url,
    'release_channel',c.release_channel,'force_update',c.force_update,'maintenance_enabled',c.maintenance_enabled,
    'maintenance_title',c.maintenance_title,'maintenance_message',c.maintenance_message,'launcher_notice',c.launcher_notice,
    'feature_flags',(select coalesce(jsonb_agg(jsonb_build_object('key',f.flag_key,'enabled',f.enabled,'audience',f.audience,'rollout_percent',f.rollout_percent)),'[]'::jsonb) from public.neith_feature_flags f where f.audience='all'),
    'announcements',(select coalesce(jsonb_agg(jsonb_build_object('id',a.id,'title',a.title,'body',a.body,'severity',a.severity,'priority',a.priority,'audience',a.audience,'surface',a.surface,'starts_at',a.starts_at,'ends_at',a.ends_at) order by a.priority desc,a.created_at desc),'[]'::jsonb) from public.neith_announcements a where a.active=true and a.surface in ('all','launcher') and a.starts_at<=now() and (a.ends_at is null or a.ends_at>now())),
    'updated_at',c.updated_at
  ) from public.neith_launcher_config c where c.id=1;
$$;

revoke all on function public.neith_admin_list_announcements(text,text,text,text,integer,integer) from public,anon;
grant execute on function public.neith_admin_list_announcements(text,text,text,text,integer,integer) to authenticated;
grant execute on function public.neith_admin_save_announcement(jsonb) to authenticated;
notify pgrst,'reload schema';

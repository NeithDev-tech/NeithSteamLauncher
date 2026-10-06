-- NEITH Admin Center R26 — Avisos: revisión + borrado seguro
-- Ejecutar UNA vez en Supabase SQL Editor.
-- Conserva todos los avisos existentes. Los avisos actuales empiezan en revision=1.

alter table public.neith_announcements
  add column if not exists revision integer not null default 1;

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
    insert into public.neith_announcements(title,body,severity,audience,priority,surface,active,starts_at,ends_at,created_by,updated_by,revision)
    values(coalesce(nullif(trim(p_payload->>'title'),''),'Aviso Neith'),coalesce(nullif(trim(p_payload->>'body'),''),'Sin detalles.'),
      case when p_payload->>'severity' in ('info','success','warning','critical') then p_payload->>'severity' else 'info' end,
      case when p_payload->>'audience' in ('all','free','premium','beta','staff') then p_payload->>'audience' else 'all' end,
      v_priority,v_surface,coalesce((p_payload->>'active')::boolean,true),v_start,v_end,auth.uid(),auth.uid(),1) returning id into announcement_id;
  else
    update public.neith_announcements set
      title=coalesce(nullif(trim(p_payload->>'title'),''),title),body=coalesce(nullif(trim(p_payload->>'body'),''),body),
      severity=case when p_payload->>'severity' in ('info','success','warning','critical') then p_payload->>'severity' else severity end,
      audience=case when p_payload->>'audience' in ('all','free','premium','beta','staff') then p_payload->>'audience' else audience end,
      priority=v_priority,surface=v_surface,active=coalesce((p_payload->>'active')::boolean,active),starts_at=v_start,ends_at=v_end,
      revision=coalesce(revision,1)+1,updated_at=now(),updated_by=auth.uid() where id=announcement_id;
  end if;
  select to_jsonb(a) into result from public.neith_announcements a where a.id=announcement_id;
  perform public.neith_audit('announcement.saved','announcement',announcement_id::text,p_payload || jsonb_build_object('revision',result->'revision'));
  return result;
end $$;

create or replace function public.neith_admin_delete_announcement(p_id uuid)
returns jsonb language plpgsql security definer set search_path=public
as $$
declare old_row public.neith_announcements%rowtype;
begin
  perform public.neith_assert_admin();
  select * into old_row from public.neith_announcements where id=p_id for update;
  if not found then raise exception 'Aviso no encontrado'; end if;
  perform public.neith_audit('announcement.deleted','announcement',p_id::text,jsonb_build_object('title',old_row.title,'revision',old_row.revision,'surface',old_row.surface,'audience',old_row.audience));
  delete from public.neith_announcements where id=p_id;
  return jsonb_build_object('ok',true,'id',p_id,'title',old_row.title);
end $$;

create or replace function public.neith_launcher_public_config()
returns jsonb language sql stable security definer set search_path=public
as $$
  select jsonb_build_object(
    'stable_version',c.stable_version,'minimum_version',c.minimum_version,'download_url',c.download_url,
    'release_channel',c.release_channel,'force_update',c.force_update,'maintenance_enabled',c.maintenance_enabled,
    'maintenance_title',c.maintenance_title,'maintenance_message',c.maintenance_message,'launcher_notice',c.launcher_notice,
    'feature_flags',(select coalesce(jsonb_agg(jsonb_build_object('key',f.flag_key,'enabled',f.enabled,'audience',f.audience,'rollout_percent',f.rollout_percent)),'[]'::jsonb) from public.neith_feature_flags f where f.audience='all'),
    'announcements',(select coalesce(jsonb_agg(jsonb_build_object('id',a.id,'revision',coalesce(a.revision,1),'title',a.title,'body',a.body,'severity',a.severity,'priority',a.priority,'audience',a.audience,'surface',a.surface,'starts_at',a.starts_at,'ends_at',a.ends_at,'updated_at',a.updated_at) order by a.priority desc,a.created_at desc),'[]'::jsonb) from public.neith_announcements a where a.active=true and a.audience='all' and a.surface in ('all','launcher') and a.starts_at<=now() and (a.ends_at is null or a.ends_at>now())),
    'updated_at',c.updated_at,'server_time',now()
  ) from public.neith_launcher_config c where c.id=1;
$$;

revoke all on function public.neith_admin_delete_announcement(uuid) from public,anon;
grant execute on function public.neith_admin_delete_announcement(uuid) to authenticated;
grant execute on function public.neith_admin_save_announcement(jsonb) to authenticated;
grant execute on function public.neith_launcher_public_config() to anon, authenticated;
notify pgrst,'reload schema';

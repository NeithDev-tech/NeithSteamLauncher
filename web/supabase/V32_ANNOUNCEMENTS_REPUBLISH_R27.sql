-- NEITH Admin Center R27 — Republicación de avisos OFF -> ON
-- Ejecutar UNA vez DESPUÉS de V32_ANNOUNCEMENTS_DELETE_REVISION_R26.sql.
-- Conserva los avisos existentes y añade un contador de publicación independiente.

alter table public.neith_announcements
  add column if not exists publication integer not null default 1;

create or replace function public.neith_admin_set_announcement_active(p_id uuid, p_active boolean)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_old_active boolean;
  v_publication integer;
begin
  perform public.neith_assert_admin();

  select active, coalesce(publication,1)
    into v_old_active, v_publication
  from public.neith_announcements
  where id=p_id
  for update;

  if not found then
    return false;
  end if;

  -- Solo OFF -> ON crea una nueva publicación. Mantener ON no incrementa nada.
  if coalesce(v_old_active,false)=false and p_active=true then
    v_publication:=v_publication+1;
  end if;

  update public.neith_announcements
  set active=p_active,
      publication=v_publication,
      updated_at=now(),
      updated_by=auth.uid()
  where id=p_id;

  perform public.neith_audit(
    'announcement.active_changed',
    'announcement',
    p_id::text,
    jsonb_build_object(
      'active',p_active,
      'previous_active',v_old_active,
      'publication',v_publication,
      'republished',(coalesce(v_old_active,false)=false and p_active=true)
    )
  );
  return true;
end;
$$;

create or replace function public.neith_launcher_public_config()
returns jsonb language sql stable security definer set search_path=public
as $$
  select jsonb_build_object(
    'stable_version',c.stable_version,'minimum_version',c.minimum_version,'download_url',c.download_url,
    'release_channel',c.release_channel,'force_update',c.force_update,'maintenance_enabled',c.maintenance_enabled,
    'maintenance_title',c.maintenance_title,'maintenance_message',c.maintenance_message,'launcher_notice',c.launcher_notice,
    'feature_flags',(select coalesce(jsonb_agg(jsonb_build_object('key',f.flag_key,'enabled',f.enabled,'audience',f.audience,'rollout_percent',f.rollout_percent)),'[]'::jsonb) from public.neith_feature_flags f where f.audience='all'),
    'announcements',(select coalesce(jsonb_agg(jsonb_build_object(
      'id',a.id,
      'revision',coalesce(a.revision,1),
      'publication',coalesce(a.publication,1),
      'title',a.title,'body',a.body,'severity',a.severity,'priority',a.priority,
      'audience',a.audience,'surface',a.surface,'starts_at',a.starts_at,'ends_at',a.ends_at,'updated_at',a.updated_at
    ) order by a.priority desc,a.created_at desc),'[]'::jsonb)
      from public.neith_announcements a
      where a.active=true and a.audience='all' and a.surface in ('all','launcher')
        and a.starts_at<=now() and (a.ends_at is null or a.ends_at>now())),
    'updated_at',c.updated_at,'server_time',now()
  ) from public.neith_launcher_config c where c.id=1;
$$;

revoke all on function public.neith_admin_set_announcement_active(uuid,boolean) from public,anon;
grant execute on function public.neith_admin_set_announcement_active(uuid,boolean) to authenticated;
grant execute on function public.neith_launcher_public_config() to anon, authenticated;
notify pgrst,'reload schema';

-- NEITH V32 · Launcher Control R21
-- Safe hardening of the existing launcher configuration RPC.
-- Does not delete data or alter the launcher_config table.

create or replace function public.neith_admin_save_launcher_config(p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  result jsonb;
  v_stable text := nullif(trim(p_payload->>'stable_version'),'');
  v_minimum text := nullif(trim(p_payload->>'minimum_version'),'');
  v_download text := nullif(trim(p_payload->>'download_url'),'');
  v_channel text := p_payload->>'release_channel';
  v_force boolean;
  v_maintenance boolean;
  v_title text := nullif(trim(p_payload->>'maintenance_title'),'');
  v_message text := nullif(trim(p_payload->>'maintenance_message'),'');
begin
  perform public.neith_assert_admin();

  if v_stable is null or v_stable !~ '^v?[0-9]+(\.[0-9]+){1,3}([+-][0-9A-Za-z.-]+)?$' then
    raise exception 'Versión estable inválida. Usa un formato como 1.0.629.';
  end if;
  if v_minimum is null or v_minimum !~ '^v?[0-9]+(\.[0-9]+){1,3}([+-][0-9A-Za-z.-]+)?$' then
    raise exception 'Versión mínima inválida. Usa un formato como 1.0.500.';
  end if;
  if v_download is null or v_download !~* '^https://[^[:space:]]+$' then
    raise exception 'La URL de descarga debe ser una URL HTTPS válida.';
  end if;
  if v_channel not in ('stable','beta','maintenance') then
    raise exception 'Canal de release inválido.';
  end if;

  v_force := coalesce((p_payload->>'force_update')::boolean, false);
  v_maintenance := coalesce((p_payload->>'maintenance_enabled')::boolean, false);

  if v_maintenance and (v_title is null or v_message is null) then
    raise exception 'El modo mantenimiento necesita título y mensaje.';
  end if;

  update public.neith_launcher_config as c
  set
    stable_version = v_stable,
    minimum_version = v_minimum,
    download_url = v_download,
    release_channel = v_channel,
    force_update = v_force,
    maintenance_enabled = v_maintenance,
    maintenance_title = coalesce(v_title, maintenance_title),
    maintenance_message = coalesce(v_message, maintenance_message),
    launcher_notice = coalesce(p_payload->>'launcher_notice', ''),
    updated_at = now(),
    updated_by = auth.uid()
  where id = 1
  returning to_jsonb(c) into result;

  perform public.neith_audit(
    'launcher_config.updated',
    'launcher',
    'global',
    jsonb_build_object(
      'stable_version', v_stable,
      'minimum_version', v_minimum,
      'release_channel', v_channel,
      'force_update', v_force,
      'maintenance_enabled', v_maintenance,
      'download_url', v_download,
      'maintenance_title', coalesce(v_title,''),
      'launcher_notice', coalesce(p_payload->>'launcher_notice','')
    )
  );

  return result;
end;
$$;

grant execute on function public.neith_admin_save_launcher_config(jsonb) to authenticated;
notify pgrst, 'reload schema';

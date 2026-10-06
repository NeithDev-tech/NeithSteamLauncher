-- NEITH WEB V32 · FEATURE FLAGS R19 PREMIUM DEPLOYMENT
-- Safe additive migration. Does not delete flags or user data.

create index if not exists idx_neith_feature_flags_enabled on public.neith_feature_flags(enabled);
create index if not exists idx_neith_feature_flags_audience on public.neith_feature_flags(audience);
create index if not exists idx_neith_feature_flags_updated_at on public.neith_feature_flags(updated_at desc);

create or replace function public.neith_admin_list_feature_flags(
  p_query text default '',
  p_audience text default '',
  p_enabled boolean default null,
  p_limit integer default 20,
  p_offset integer default 0
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_query text := lower(trim(coalesce(p_query,'')));
  v_audience text := lower(trim(coalesce(p_audience,'')));
  v_limit integer := greatest(1, least(coalesce(p_limit,20), 50));
  v_offset integer := greatest(0, coalesce(p_offset,0));
  v_total bigint := 0;
  v_rows jsonb := '[]'::jsonb;
begin
  perform public.neith_assert_admin();

  select count(*)
    into v_total
  from public.neith_feature_flags f
  where (v_query = '' or lower(f.flag_key || ' ' || f.label || ' ' || coalesce(f.description,'')) like '%' || v_query || '%')
    and (v_audience = '' or f.audience = v_audience)
    and (p_enabled is null or f.enabled = p_enabled);

  select coalesce(jsonb_agg(to_jsonb(x) order by x.updated_at desc, x.flag_key), '[]'::jsonb)
    into v_rows
  from (
    select f.flag_key, f.label, f.description, f.enabled, f.audience,
           f.rollout_percent, f.updated_at, f.updated_by
    from public.neith_feature_flags f
    where (v_query = '' or lower(f.flag_key || ' ' || f.label || ' ' || coalesce(f.description,'')) like '%' || v_query || '%')
      and (v_audience = '' or f.audience = v_audience)
      and (p_enabled is null or f.enabled = p_enabled)
    order by f.updated_at desc, f.flag_key
    limit v_limit offset v_offset
  ) x;

  return jsonb_build_object('rows', v_rows, 'total', v_total);
end;
$$;

grant execute on function public.neith_admin_list_feature_flags(text,text,boolean,integer,integer) to authenticated;

notify pgrst, 'reload schema';

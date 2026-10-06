-- NEITH Admin Center R16 — Auditoría PREMIUM paginada.
-- Seguro para ejecutar sobre V32/R15. No elimina ni modifica registros existentes.

create index if not exists neith_admin_audit_log_created_at_idx
  on public.neith_admin_audit_log (created_at desc);
create index if not exists neith_admin_audit_log_action_idx
  on public.neith_admin_audit_log (action);
create index if not exists neith_admin_audit_log_target_type_idx
  on public.neith_admin_audit_log (target_type);
create index if not exists neith_admin_audit_log_actor_id_idx
  on public.neith_admin_audit_log (actor_id);

create or replace function public.neith_admin_list_audit(
  p_query text default null,
  p_action text default null,
  p_target_type text default null,
  p_from timestamptz default null,
  p_to timestamptz default null,
  p_limit integer default 25,
  p_offset integer default 0
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  q text := nullif(btrim(coalesce(p_query,'')), '');
  a text := nullif(btrim(coalesce(p_action,'')), '');
  t text := nullif(btrim(coalesce(p_target_type,'')), '');
  lim integer := greatest(1, least(coalesce(p_limit,25), 50));
  off integer := greatest(0, coalesce(p_offset,0));
  total_count bigint;
  items jsonb;
begin
  perform public.neith_assert_admin();

  select count(*) into total_count
  from public.neith_admin_audit_log l
  left join auth.users u on u.id = l.actor_id
  left join public.profiles p on p.id = l.actor_id
  where (a is null or l.action = a)
    and (t is null or l.target_type = t)
    and (p_from is null or l.created_at >= p_from)
    and (p_to is null or l.created_at < p_to)
    and (
      q is null
      or l.action ilike '%'||q||'%'
      or coalesce(l.target_id,'') ilike '%'||q||'%'
      or coalesce(u.email,'') ilike '%'||q||'%'
      or coalesce(p.display_name,'') ilike '%'||q||'%'
      or l.payload::text ilike '%'||q||'%'
    );

  select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at desc, x.id desc), '[]'::jsonb)
  into items
  from (
    select l.id, l.actor_id, l.action, l.target_type, l.target_id, l.payload, l.created_at,
           u.email as actor_email,
           coalesce(nullif(p.display_name,''), split_part(coalesce(u.email,''),'@',1), 'Sistema') as actor_name
    from public.neith_admin_audit_log l
    left join auth.users u on u.id = l.actor_id
    left join public.profiles p on p.id = l.actor_id
    where (a is null or l.action = a)
      and (t is null or l.target_type = t)
      and (p_from is null or l.created_at >= p_from)
      and (p_to is null or l.created_at < p_to)
      and (
        q is null
        or l.action ilike '%'||q||'%'
        or coalesce(l.target_id,'') ilike '%'||q||'%'
        or coalesce(u.email,'') ilike '%'||q||'%'
        or coalesce(p.display_name,'') ilike '%'||q||'%'
        or l.payload::text ilike '%'||q||'%'
      )
    order by l.created_at desc, l.id desc
    limit lim offset off
  ) x;

  return jsonb_build_object('items', items, 'total', total_count, 'limit', lim, 'offset', off);
end;
$$;

revoke all on function public.neith_admin_list_audit(text,text,text,timestamptz,timestamptz,integer,integer) from public, anon;
grant execute on function public.neith_admin_list_audit(text,text,text,timestamptz,timestamptz,integer,integer) to authenticated;

notify pgrst, 'reload schema';

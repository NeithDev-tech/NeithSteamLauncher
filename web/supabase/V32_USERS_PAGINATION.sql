-- NEITH V32 — Migración mínima de Usuarios (paginación server-side)
-- Ejecutar UNA sola vez en Supabase SQL Editor si quieres paginación real >20.
-- No borra ni reemplaza el backend V32 existente. Conserva neith_admin_search_users().

create or replace function public.neith_admin_list_users(
  p_query text default '',
  p_limit integer default 20,
  p_offset integer default 0
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  q text := lower(trim(coalesce(p_query,'')));
  safe_limit integer := greatest(1,least(coalesce(p_limit,20),20));
  safe_offset integer := greatest(0,coalesce(p_offset,0));
  total_count bigint;
  items jsonb;
begin
  perform public.neith_assert_admin();

  select count(*) into total_count
  from auth.users u
  left join public.profiles p on p.id=u.id
  where q=''
     or lower(coalesce(u.email,'')) like '%'||q||'%'
     or lower(coalesce(p.display_name,'')) like '%'||q||'%';

  select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at desc, x.user_id), '[]'::jsonb)
  into items
  from (
    select
      u.id as user_id,
      u.email,
      p.display_name,
      p.plan,
      p.subscription_status,
      coalesce(r.role,'user') as role,
      u.created_at,
      u.last_sign_in_at
    from auth.users u
    left join public.profiles p on p.id=u.id
    left join public.neith_user_roles r on r.user_id=u.id
    where q=''
       or lower(coalesce(u.email,'')) like '%'||q||'%'
       or lower(coalesce(p.display_name,'')) like '%'||q||'%'
    order by u.created_at desc,u.id
    limit safe_limit offset safe_offset
  ) x;

  return jsonb_build_object(
    'items',items,
    'total',total_count,
    'limit',safe_limit,
    'offset',safe_offset,
    'query',q
  );
end;
$$;

grant execute on function public.neith_admin_list_users(text,integer,integer) to authenticated;

-- Fuerza a PostgREST a refrescar la función nueva inmediatamente.
notify pgrst, 'reload schema';

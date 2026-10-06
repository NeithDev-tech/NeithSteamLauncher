-- NEITH V32 / Usuarios R14 — Detección real de capacidades del backend
-- Ejecutar UNA sola vez en Supabase SQL Editor.
-- NO modifica usuarios, roles, planes ni datos. Solo añade un RPC de diagnóstico seguro.

create or replace function public.neith_admin_users_capabilities()
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  has_list_v3 boolean;
  has_ban boolean;
  has_delete boolean;
begin
  perform public.neith_assert_admin();

  has_list_v3 := to_regprocedure('public.neith_admin_list_users_v3(text,integer,integer)') is not null;
  has_ban := to_regprocedure('public.neith_admin_set_user_ban(uuid,boolean,text)') is not null;
  has_delete := to_regprocedure('public.neith_admin_delete_user(uuid,text)') is not null;

  return jsonb_build_object(
    'list_v3', has_list_v3,
    'ban', has_ban,
    'delete', has_delete,
    'security_ready', (has_ban and has_delete)
  );
end;
$$;

grant execute on function public.neith_admin_users_capabilities() to authenticated;
notify pgrst, 'reload schema';

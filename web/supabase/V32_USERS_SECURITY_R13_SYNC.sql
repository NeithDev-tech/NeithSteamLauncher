-- NEITH V32 / Usuarios R13 — Sincronización segura del backend de Usuarios
-- Ejecutar UNA sola vez en Supabase SQL Editor si el Admin Center muestra el aviso amarillo.
-- Es idempotente: no elimina usuarios, roles ni perfiles al instalarse.
-- Reinstala/actualiza los RPC de listado v3, suspensión/reactivación y borrado, y recarga el schema cache de PostgREST.

create or replace function public.neith_admin_list_users_v3(
  p_query text default '', p_limit integer default 20, p_offset integer default 0
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
  total_count bigint; items jsonb;
begin
  perform public.neith_assert_admin();
  select count(*) into total_count
  from auth.users u left join public.profiles p on p.id=u.id
  where q='' or lower(coalesce(u.email,'')) like '%'||q||'%' or lower(coalesce(p.display_name,'')) like '%'||q||'%';

  select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at desc, x.user_id), '[]'::jsonb) into items
  from (
    select u.id as user_id,u.email,p.display_name,p.plan,p.subscription_status,coalesce(r.role,'user') as role,
           u.created_at,u.last_sign_in_at,u.banned_until
    from auth.users u
    left join public.profiles p on p.id=u.id
    left join public.neith_user_roles r on r.user_id=u.id
    where q='' or lower(coalesce(u.email,'')) like '%'||q||'%' or lower(coalesce(p.display_name,'')) like '%'||q||'%'
    order by u.created_at desc,u.id
    limit safe_limit offset safe_offset
  ) x;
  return jsonb_build_object('items',items,'total',total_count,'limit',safe_limit,'offset',safe_offset,'query',q);
end;
$$;

create or replace function public.neith_admin_set_user_ban(
  p_user_id uuid,
  p_banned boolean,
  p_duration text default 'permanent'
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  target_email text; ban_until timestamptz;
begin
  perform public.neith_assert_superadmin();
  if p_user_id is null then raise exception 'INVALID_USER'; end if;
  if p_user_id=auth.uid() then raise exception 'CANNOT_SUSPEND_SELF'; end if;
  select email into target_email from auth.users where id=p_user_id;
  if target_email is null then raise exception 'USER_NOT_FOUND'; end if;

  if coalesce(p_banned,false)=false then
    ban_until := null;
  else
    ban_until := case lower(coalesce(p_duration,'permanent'))
      when '1d' then now()+interval '1 day'
      when '7d' then now()+interval '7 days'
      when '30d' then now()+interval '30 days'
      when 'permanent' then timestamptz '9999-12-31 23:59:59+00'
      else null end;
    if ban_until is null then raise exception 'INVALID_BAN_DURATION'; end if;
  end if;

  update auth.users set banned_until=ban_until,updated_at=now() where id=p_user_id;
  perform public.neith_audit(
    case when p_banned then 'user.suspended' else 'user.reactivated' end,
    'user',p_user_id::text,
    jsonb_build_object('email',target_email,'duration',p_duration,'banned_until',ban_until)
  );
  return jsonb_build_object('user_id',p_user_id,'email',target_email,'banned',coalesce(p_banned,false),'banned_until',ban_until);
end;
$$;

create or replace function public.neith_admin_delete_user(
  p_user_id uuid,
  p_confirmation text
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare target_email text;
begin
  perform public.neith_assert_superadmin();
  if p_user_id is null then raise exception 'INVALID_USER'; end if;
  if p_user_id=auth.uid() then raise exception 'CANNOT_DELETE_SELF'; end if;
  select email into target_email from auth.users where id=p_user_id;
  if target_email is null then raise exception 'USER_NOT_FOUND'; end if;
  if lower(trim(coalesce(p_confirmation,'')))<>lower(trim(target_email)) then raise exception 'CONFIRMATION_MISMATCH'; end if;

  perform public.neith_audit('user.deleted','user',p_user_id::text,jsonb_build_object('email',target_email));
  delete from auth.users where id=p_user_id;
  if not found then raise exception 'USER_NOT_FOUND'; end if;
  return jsonb_build_object('deleted',true,'user_id',p_user_id,'email',target_email);
end;
$$;

grant execute on function public.neith_admin_list_users_v3(text,integer,integer) to authenticated;
grant execute on function public.neith_admin_set_user_ban(uuid,boolean,text) to authenticated;
grant execute on function public.neith_admin_delete_user(uuid,text) to authenticated;
notify pgrst, 'reload schema';

-- NEITH Admin Center R33 — audit deletion fix + premium confirm frontend support.
-- Run this once in Supabase SQL Editor to replace the R32 deletion RPC.

create or replace function public.neith_admin_delete_audit(
  p_ids bigint[] default null,
  p_limit integer default null,
  p_all boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  deleted_count integer := 0;
  lim integer := greatest(1, least(coalesce(p_limit, 0), 500));
begin
  perform public.neith_assert_superadmin();

  if coalesce(p_all,false) then
    -- Explicit WHERE is intentional: Supabase/Postgres safe-update protection
    -- rejects a bare DELETE even inside this guarded RPC.
    delete from public.neith_admin_audit_log
    where id is not null;
    get diagnostics deleted_count = row_count;
  elsif p_ids is not null and cardinality(p_ids) > 0 then
    delete from public.neith_admin_audit_log
    where id = any(p_ids);
    get diagnostics deleted_count = row_count;
  elsif coalesce(p_limit,0) > 0 then
    with doomed as (
      select id
      from public.neith_admin_audit_log
      order by created_at asc, id asc
      limit lim
    )
    delete from public.neith_admin_audit_log l
    using doomed d
    where l.id = d.id;
    get diagnostics deleted_count = row_count;
  else
    raise exception 'NEITH_AUDIT_DELETE_TARGET_REQUIRED' using errcode='22023';
  end if;

  return jsonb_build_object('deleted', deleted_count);
end;
$$;

revoke all on function public.neith_admin_delete_audit(bigint[],integer,boolean) from public, anon;
grant execute on function public.neith_admin_delete_audit(bigint[],integer,boolean) to authenticated;

notify pgrst, 'reload schema';

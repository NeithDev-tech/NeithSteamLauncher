-- NEITH WEB V34 R209
-- SHOUTBOX RETENTION: keep max 50 newest messages and delete anything older than 24 hours.

create or replace function public.neith_shoutbox_prune_expired()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  deleted_count integer := 0;
  deleted_old integer := 0;
  deleted_overflow integer := 0;
begin
  delete from public.neith_shoutbox_messages
  where created_at < now() - interval '24 hours';
  get diagnostics deleted_old = row_count;

  with ranked as (
    select id,
           row_number() over (order by created_at desc, id desc) as rn
    from public.neith_shoutbox_messages
  )
  delete from public.neith_shoutbox_messages m
  using ranked r
  where m.id = r.id
    and r.rn > 50;
  get diagnostics deleted_overflow = row_count;

  deleted_count := deleted_old + deleted_overflow;
  return deleted_count;
end;
$$;

grant execute on function public.neith_shoutbox_prune_expired() to authenticated;

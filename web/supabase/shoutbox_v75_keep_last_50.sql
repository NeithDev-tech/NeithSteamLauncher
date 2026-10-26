-- Neith Web V75 — keep the community shoutbox persistent by count, not by age.
-- Keeps the newest 50 messages indefinitely and deletes only overflow rows.
create or replace function public.neith_shoutbox_prune_expired()
returns integer
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  deleted_overflow integer := 0;
begin
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
  return deleted_overflow;
end;
$function$;

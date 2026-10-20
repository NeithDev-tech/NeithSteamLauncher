-- NEITH WEB V34 R213
-- Server-side shoutbox cooldown: 3 seconds between messages per authenticated user.

create or replace function public.neith_shoutbox_prepare_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner boolean := coalesce(public.neith_is_owner(), false);
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if public.neith_shoutbox_is_banned(auth.uid()) then raise exception 'Banned from shoutbox'; end if;

  if exists (
    select 1
    from public.neith_shoutbox_messages m
    where m.user_id = auth.uid()
      and m.created_at > now() - interval '3 seconds'
  ) then
    raise exception 'Rate limit';
  end if;

  new.user_id := auth.uid();
  new.message := left(btrim(regexp_replace(coalesce(new.message,''), E'[\\n\\r\\t]+', ' ', 'g')), 300);
  if new.message = '' then raise exception 'Empty message'; end if;
  if not v_owner and new.message ~* '(https?://|www\\.)' then raise exception 'Links are not allowed'; end if;

  new.display_name := left(btrim(regexp_replace(coalesce(new.display_name,'Usuario'), '\\s+', ' ', 'g')), 26);
  if new.display_name = '' then new.display_name := 'Usuario'; end if;
  if not v_owner and lower(new.display_name) in ('neith','@neith','admin','administrator','moderator') then new.display_name := 'Usuario'; end if;
  new.role := case when v_owner then 'admin' else 'user' end;
  return new;
end;
$$;

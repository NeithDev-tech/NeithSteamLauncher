-- Neith V8 — normalizacion de perfiles OAuth Google/Discord
-- Ejecutar una sola vez en Supabase SQL Editor antes de probar OAuth.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data->>'display_name',
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'name',
      new.raw_user_meta_data->>'preferred_username',
      new.raw_user_meta_data->>'user_name',
      split_part(new.email, '@', 1)
    ),
    coalesce(new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'picture')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- Completa perfiles ya existentes únicamente si les faltan nombre/avatar.
update public.profiles p
set
  display_name = coalesce(
    nullif(p.display_name, ''),
    u.raw_user_meta_data->>'display_name',
    u.raw_user_meta_data->>'full_name',
    u.raw_user_meta_data->>'name',
    u.raw_user_meta_data->>'preferred_username',
    u.raw_user_meta_data->>'user_name',
    split_part(u.email, '@', 1)
  ),
  avatar_url = coalesce(
    nullif(p.avatar_url, ''),
    u.raw_user_meta_data->>'avatar_url',
    u.raw_user_meta_data->>'picture'
  ),
  updated_at = now()
from auth.users u
where p.id = u.id;

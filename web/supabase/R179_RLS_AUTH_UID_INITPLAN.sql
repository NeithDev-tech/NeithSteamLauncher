-- Applied to Neith Production on 2026-10-12.
-- Same authorization semantics, but auth.uid() is initialized once instead of per row.
alter policy "Users can read own profile" on public.profiles
  using ((select auth.uid()) = id);

alter policy "Users read own Neith role" on public.neith_user_roles
  using ((select auth.uid()) = user_id);

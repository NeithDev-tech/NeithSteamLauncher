-- Neith Web R191 — anonymous unique visitor counter
-- One persistent browser UUID equals one unique visitor. No IP addresses are stored.

create table if not exists public.site_unique_visitors (
  visitor_id uuid primary key,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

alter table public.site_unique_visitors enable row level security;
revoke all on table public.site_unique_visitors from anon, authenticated;
grant usage on schema public to anon, authenticated;

create or replace function public.register_site_visitor(p_visitor_id uuid)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_total bigint;
begin
  insert into public.site_unique_visitors(visitor_id, first_seen_at, last_seen_at)
  values (p_visitor_id, now(), now())
  on conflict (visitor_id) do update set last_seen_at = excluded.last_seen_at;

  select count(*) into v_total from public.site_unique_visitors;
  return v_total;
end;
$$;

revoke all on function public.register_site_visitor(uuid) from public;
grant execute on function public.register_site_visitor(uuid) to anon, authenticated;

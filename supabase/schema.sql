create extension if not exists pgcrypto;

create table if not exists public.movies (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) > 0),
  url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_movies_updated_at on public.movies;
create trigger trg_movies_updated_at
before update on public.movies
for each row execute function public.set_updated_at();

alter table public.movies enable row level security;

drop policy if exists "public can read movies" on public.movies;
drop policy if exists "public can add movies" on public.movies;
drop policy if exists "public can edit movies" on public.movies;
drop policy if exists "public can delete movies" on public.movies;

create policy "public can read movies"
on public.movies for select
to anon
using (true);

create policy "public can add movies"
on public.movies for insert
to anon
with check (true);

create policy "public can edit movies"
on public.movies for update
to anon
using (true)
with check (true);

create policy "public can delete movies"
on public.movies for delete
to anon
using (true);

create index if not exists movies_created_at_idx on public.movies(created_at);
create index if not exists movies_name_idx on public.movies using gin (to_tsvector('simple', name));

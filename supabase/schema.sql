-- TripMelo Phase B1: one backed-up trip per user.
-- Paste this whole file into Supabase → SQL Editor → Run.

create table if not exists public.trips (
  owner_id   uuid primary key references auth.users (id) on delete cascade,
  data       jsonb not null,
  updated_at timestamptz not null default now()
);

-- Row Level Security: users can only ever touch their own row.
-- This is what makes a serverless client-only app safe.
alter table public.trips enable row level security;

create policy "read own trip"
  on public.trips for select
  using (auth.uid() = owner_id);

create policy "insert own trip"
  on public.trips for insert
  with check (auth.uid() = owner_id);

create policy "update own trip"
  on public.trips for update
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

create policy "delete own trip"
  on public.trips for delete
  using (auth.uid() = owner_id);

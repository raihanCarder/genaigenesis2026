create table if not exists public.favorites (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  service_id text not null,
  service_snapshot jsonb not null,
  saved_at timestamptz not null default timezone('utc', now()),
  unique (user_id, service_id)
);

create index if not exists favorites_user_saved_at_idx on public.favorites (user_id, saved_at desc);

alter table public.favorites enable row level security;

create policy "Users can view their own favorites"
on public.favorites
for select
to authenticated
using (auth.uid() = user_id);

create policy "Users can insert their own favorites"
on public.favorites
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "Users can update their own favorites"
on public.favorites
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can delete their own favorites"
on public.favorites
for delete
to authenticated
using (auth.uid() = user_id);

create extension if not exists pgcrypto with schema extensions;

create or replace function public.academy_reels_set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.academy_reels (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'idea'
    check (status in ('idea', 'script', 'to_record', 'to_edit', 'ready', 'published')),
  idea text not null check (char_length(trim(idea)) > 0),
  title text,
  caption text,
  body text,
  hashtags text[] not null default '{}',
  notes text,
  scheduled_at timestamptz,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index academy_reels_user_status_updated_idx
  on public.academy_reels (user_id, status, updated_at desc);

create index academy_reels_user_updated_idx
  on public.academy_reels (user_id, updated_at desc);

create trigger academy_reels_set_updated_at
  before update on public.academy_reels
  for each row
  execute function public.academy_reels_set_updated_at();

alter table public.academy_reels enable row level security;

create policy academy_reels_own_rows
  on public.academy_reels
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create or replace function public.academy_reel_generation_set_updated_at()
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

alter table public.academy_reels
  alter column hashtags drop default;

alter table public.academy_reels
  alter column hashtags drop not null;

alter table public.academy_reels
  alter column hashtags type text using nullif(array_to_string(hashtags, ' '), '');

alter table public.academy_reels
  add column generation_status text not null default 'not_generated'
    check (generation_status in ('not_generated', 'processing', 'completed', 'failed'));

create index academy_reels_user_generation_status_updated_idx
  on public.academy_reels (user_id, generation_status, updated_at desc);

create table public.academy_reel_generation_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.academy_reel_generation_queue_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  reel_id uuid not null references public.academy_reels(id) on delete cascade,
  status text not null default 'queued'
    check (status in ('queued', 'processing', 'completed', 'failed', 'canceled')),
  run_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index academy_reel_generation_queue_jobs_user_status_run_at_idx
  on public.academy_reel_generation_queue_jobs (user_id, status, run_at);

create table public.academy_reel_generation_run_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  reel_id uuid references public.academy_reels(id) on delete set null,
  job_id uuid references public.academy_reel_generation_queue_jobs(id) on delete set null,
  status text not null
    check (status in ('started', 'completed', 'failed')),
  metadata jsonb not null default '{}'::jsonb,
  error_message text,
  created_at timestamptz not null default now()
);

create trigger academy_reel_generation_settings_set_updated_at
  before update on public.academy_reel_generation_settings
  for each row
  execute function public.academy_reel_generation_set_updated_at();

create trigger academy_reel_generation_queue_jobs_set_updated_at
  before update on public.academy_reel_generation_queue_jobs
  for each row
  execute function public.academy_reel_generation_set_updated_at();

alter table public.academy_reel_generation_settings enable row level security;
alter table public.academy_reel_generation_queue_jobs enable row level security;
alter table public.academy_reel_generation_run_logs enable row level security;

create policy academy_reel_generation_settings_own_rows
  on public.academy_reel_generation_settings
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy academy_reel_generation_queue_jobs_own_rows
  on public.academy_reel_generation_queue_jobs
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy academy_reel_generation_run_logs_select_own_rows
  on public.academy_reel_generation_run_logs
  for select
  using (auth.uid() = user_id);

create policy academy_reel_generation_run_logs_insert_own_rows
  on public.academy_reel_generation_run_logs
  for insert
  with check (auth.uid() = user_id);

create or replace function public.academy_reel_generation_ensure_settings()
returns public.academy_reel_generation_settings
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_settings public.academy_reel_generation_settings;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;

  insert into public.academy_reel_generation_settings (user_id)
  values (v_user_id)
  on conflict (user_id) do nothing;

  select *
  into v_settings
  from public.academy_reel_generation_settings
  where user_id = v_user_id;

  return v_settings;
end;
$$;

create or replace function public.academy_reel_generation_on_profile_created()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.academy_reel_generation_settings (user_id)
  values (new.user_id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists academy_reel_generation_on_profile_created on public.progression_profiles;

create trigger academy_reel_generation_on_profile_created
  after insert on public.progression_profiles
  for each row
  execute function public.academy_reel_generation_on_profile_created();

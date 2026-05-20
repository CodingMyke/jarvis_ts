alter table public.academy_reels
  drop constraint if exists academy_reels_status_check;

alter table public.academy_reels
  add constraint academy_reels_status_check
    check (status in ('ai_idea', 'idea', 'script', 'to_record', 'to_edit', 'ready', 'published'));

create table public.academy_reel_automation_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  flow text not null check (flow in ('reel_scripting', 'reel_idea_generation')),
  trigger text not null check (trigger in ('scheduled', 'manual')),
  slot timestamptz,
  status text not null check (status in ('queued', 'processing', 'completed', 'failed')),
  metadata jsonb not null default '{}'::jsonb,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.academy_reels
  add column origin text not null default 'manual'
    check (origin in ('manual', 'ai_idea_generation')),
  add column last_idea_generation_run_id uuid references public.academy_reel_automation_runs(id) on delete set null;

create table public.academy_reel_rejected_ideas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  reel_id uuid references public.academy_reels(id) on delete set null,
  origin text not null check (origin in ('manual', 'ai_idea_generation')),
  idea text not null,
  title text,
  caption text,
  body text,
  hashtags text,
  notes text,
  run_id uuid references public.academy_reel_automation_runs(id) on delete set null,
  rejected_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table public.academy_reel_transition_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  reel_id uuid not null references public.academy_reels(id) on delete cascade,
  from_status text not null,
  to_status text not null,
  action text not null check (action in ('approve_ai_idea', 'manual_move')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index academy_reel_rejected_ideas_user_rejected_at_idx
  on public.academy_reel_rejected_ideas (user_id, rejected_at desc);

create index academy_reel_automation_runs_user_flow_status_created_idx
  on public.academy_reel_automation_runs (user_id, flow, status, created_at desc);

create index academy_reel_transition_events_user_created_at_idx
  on public.academy_reel_transition_events (user_id, created_at desc);

alter table public.academy_reel_rejected_ideas enable row level security;
alter table public.academy_reel_automation_runs enable row level security;
alter table public.academy_reel_transition_events enable row level security;

create policy academy_reel_rejected_ideas_own_rows
  on public.academy_reel_rejected_ideas
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy academy_reel_automation_runs_own_rows
  on public.academy_reel_automation_runs
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy academy_reel_transition_events_own_rows
  on public.academy_reel_transition_events
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

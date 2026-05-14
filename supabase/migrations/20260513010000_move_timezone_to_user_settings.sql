create table public.user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  timezone text not null check (char_length(trim(timezone)) between 1 and 120),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger user_settings_set_updated_at
  before update on public.user_settings
  for each row
  execute function public.progression_set_updated_at();

alter table public.user_settings enable row level security;

create policy user_settings_own_rows
  on public.user_settings
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

insert into public.user_settings (user_id, timezone)
select user_id, timezone
from public.progression_profiles
on conflict (user_id) do nothing;

create or replace function public.progression_ensure_profile()
returns public.progression_profiles
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_profile public.progression_profiles;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;

  insert into public.progression_profiles (user_id)
  values (v_user_id)
  on conflict (user_id) do nothing;

  select *
  into v_profile
  from public.progression_profiles
  where user_id = v_user_id;

  return v_profile;
end;
$$;

create or replace function public.progression_record_xp(
  p_xp_amount integer,
  p_description text,
  p_goal_id uuid default null,
  p_action_id uuid default null,
  p_checkin_id uuid default null
)
returns public.progression_xp_history
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_profile public.progression_profiles;
  v_new_total integer;
  v_actual_delta integer;
  v_history public.progression_xp_history;
  v_description text := nullif(trim(coalesce(p_description, '')), '');
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;

  if coalesce(p_xp_amount, 0) = 0 then
    return null;
  end if;

  if v_description is null then
    raise exception 'XP history description is required' using errcode = '22023';
  end if;

  perform public.progression_ensure_profile();

  select *
  into v_profile
  from public.progression_profiles
  where user_id = v_user_id
  for update;

  if p_goal_id is not null and not exists (
    select 1 from public.progression_goals where id = p_goal_id and user_id = v_user_id
  ) then
    raise exception 'Goal not found' using errcode = '22023';
  end if;

  if p_action_id is not null and not exists (
    select 1 from public.progression_actions where id = p_action_id and user_id = v_user_id
  ) then
    raise exception 'Action not found' using errcode = '22023';
  end if;

  if p_checkin_id is not null and not exists (
    select 1 from public.progression_checkins where id = p_checkin_id and user_id = v_user_id
  ) then
    raise exception 'Check-in not found' using errcode = '22023';
  end if;

  v_new_total := greatest(v_profile.total_xp + p_xp_amount, 0);
  v_actual_delta := v_new_total - v_profile.total_xp;

  if v_actual_delta = 0 then
    return null;
  end if;

  update public.progression_profiles
  set total_xp = v_new_total,
      level = public.progression_calculate_level(v_new_total)
  where user_id = v_user_id;

  insert into public.progression_xp_history (
    user_id,
    xp_amount,
    description,
    goal_id,
    action_id,
    checkin_id
  )
  values (
    v_user_id,
    v_actual_delta,
    v_description,
    p_goal_id,
    p_action_id,
    p_checkin_id
  )
  returning * into v_history;

  return v_history;
end;
$$;

create or replace function public.progression_create_checkin(
  p_action_id uuid,
  p_local_date date,
  p_timezone text,
  p_description text default null
)
returns public.progression_checkins
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_action public.progression_actions;
  v_goal public.progression_goals;
  v_checkin public.progression_checkins;
  v_inserted boolean := false;
  v_timezone text := coalesce(nullif(trim(p_timezone), ''), 'UTC');
  v_description text;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;

  if p_local_date is null then
    raise exception 'Local date is required' using errcode = '22023';
  end if;

  perform public.progression_ensure_profile();

  select *
  into v_action
  from public.progression_actions
  where id = p_action_id
    and user_id = v_user_id
    and active is true;

  if not found then
    raise exception 'Action not found' using errcode = '22023';
  end if;

  select *
  into v_goal
  from public.progression_goals
  where id = v_action.goal_id
    and user_id = v_user_id
    and deleted_at is null
    and status = 'in_progress';

  if not found then
    raise exception 'Goal is not active' using errcode = '22023';
  end if;

  insert into public.progression_checkins (
    action_id,
    goal_id,
    user_id,
    local_date,
    timezone,
    xp_awarded
  )
  values (
    v_action.id,
    v_goal.id,
    v_user_id,
    p_local_date,
    left(v_timezone, 120),
    v_action.xp_per_checkin
  )
  on conflict (action_id, local_date) do nothing
  returning * into v_checkin;

  v_inserted := found;

  if not v_inserted then
    select *
    into v_checkin
    from public.progression_checkins
    where action_id = v_action.id
      and local_date = p_local_date
      and user_id = v_user_id;

    return v_checkin;
  end if;

  if v_action.xp_per_checkin > 0 then
    v_description := coalesce(
      nullif(trim(p_description), ''),
      'Check-in: ' || v_action.title
    );

    perform public.progression_record_xp(
      v_action.xp_per_checkin,
      v_description,
      v_goal.id,
      v_action.id,
      v_checkin.id
    );
  end if;

  return v_checkin;
end;
$$;

create or replace function public.progression_undo_checkin(
  p_checkin_id uuid,
  p_local_date date,
  p_timezone text,
  p_description text default null
)
returns public.progression_checkins
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_checkin public.progression_checkins;
  v_description text;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;

  if p_local_date is null then
    raise exception 'Local date is required' using errcode = '22023';
  end if;

  perform public.progression_ensure_profile();

  select *
  into v_checkin
  from public.progression_checkins
  where id = p_checkin_id
    and user_id = v_user_id
  for update;

  if not found then
    raise exception 'Check-in not found' using errcode = '22023';
  end if;

  if v_checkin.local_date <> p_local_date then
    raise exception 'Only today''s check-in can be undone' using errcode = '22023';
  end if;

  if v_checkin.xp_awarded > 0 then
    v_description := coalesce(
      nullif(trim(p_description), ''),
      'Undo check-in'
    );

    perform public.progression_record_xp(
      -v_checkin.xp_awarded,
      v_description,
      v_checkin.goal_id,
      v_checkin.action_id,
      v_checkin.id
    );
  end if;

  delete from public.progression_checkins
  where id = v_checkin.id
    and user_id = v_user_id;

  return v_checkin;
end;
$$;

create or replace function public.progression_complete_goal(
  p_goal_id uuid,
  p_description text default null
)
returns public.progression_goals
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_goal public.progression_goals;
  v_description text;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;

  perform public.progression_ensure_profile();

  select *
  into v_goal
  from public.progression_goals
  where id = p_goal_id
    and user_id = v_user_id
    and deleted_at is null
  for update;

  if not found then
    raise exception 'Goal not found' using errcode = '22023';
  end if;

  if v_goal.status = 'completed' then
    return v_goal;
  end if;

  if v_goal.status = 'failed' then
    raise exception 'Failed goals cannot be completed' using errcode = '22023';
  end if;

  update public.progression_goals
  set status = 'completed',
      completed_at = now(),
      failed_at = null
  where id = v_goal.id
    and user_id = v_user_id
  returning * into v_goal;

  if v_goal.completion_xp > 0 then
    v_description := coalesce(
      nullif(trim(p_description), ''),
      'Completed goal: ' || v_goal.title
    );

    perform public.progression_record_xp(
      v_goal.completion_xp,
      v_description,
      v_goal.id,
      null,
      null
    );
  end if;

  return v_goal;
end;
$$;

create or replace function public.progression_fail_goal(
  p_goal_id uuid,
  p_description text default null
)
returns public.progression_goals
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_goal public.progression_goals;
  v_penalty integer;
  v_description text;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;

  perform public.progression_ensure_profile();

  select *
  into v_goal
  from public.progression_goals
  where id = p_goal_id
    and user_id = v_user_id
    and deleted_at is null
  for update;

  if not found then
    raise exception 'Goal not found' using errcode = '22023';
  end if;

  if v_goal.status = 'failed' then
    return v_goal;
  end if;

  if v_goal.status = 'completed' then
    raise exception 'Completed goals cannot be failed' using errcode = '22023';
  end if;

  v_penalty := floor(v_goal.completion_xp / 3.0)::integer;

  if v_penalty > 0 then
    v_description := coalesce(
      nullif(trim(p_description), ''),
      'Failed goal penalty: ' || v_goal.title
    );

    perform public.progression_record_xp(
      -v_penalty,
      v_description,
      v_goal.id,
      null,
      null
    );
  end if;

  update public.progression_goals
  set status = 'failed',
      failed_at = now()
  where id = v_goal.id
    and user_id = v_user_id
  returning * into v_goal;

  return v_goal;
end;
$$;

drop function if exists public.progression_ensure_profile(text);

alter table public.progression_profiles
  drop column timezone;

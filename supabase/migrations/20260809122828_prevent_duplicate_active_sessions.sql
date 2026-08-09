with ranked_active_sessions as (
  select
    id,
    row_number() over (
      partition by user_id
      order by started_at desc, id desc
    ) as active_rank
  from public.workout_sessions
  where status = 'active'
)
update public.workout_sessions as session
set
  status = 'abandoned',
  finished_at = greatest(session.started_at, now()),
  duration_seconds = coalesce(session.duration_seconds, 0)
from ranked_active_sessions as ranked
where session.id = ranked.id
  and ranked.active_rank > 1;

create unique index if not exists workout_sessions_one_active_per_user_idx
  on public.workout_sessions (user_id)
  where status = 'active';

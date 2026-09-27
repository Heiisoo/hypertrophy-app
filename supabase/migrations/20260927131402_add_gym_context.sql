alter table public.workout_sessions
  add column gym_id text not null default 'unspecified'
  check (gym_id in ('basic-fit', 'fitness-park', 'unspecified'));

create index workout_sessions_user_gym_started_idx
on public.workout_sessions (user_id, gym_id, started_at desc);

alter table public.exercise_notes
  add column gym_id text not null default 'unspecified'
  check (gym_id in ('basic-fit', 'fitness-park', 'unspecified'));

alter table public.exercise_notes
  drop constraint if exists exercise_notes_user_id_exercise_key_key,
  add constraint exercise_notes_user_gym_exercise_key
    unique (user_id, gym_id, exercise_key);

create index exercise_notes_user_gym_updated_idx
on public.exercise_notes (user_id, gym_id, updated_at desc);

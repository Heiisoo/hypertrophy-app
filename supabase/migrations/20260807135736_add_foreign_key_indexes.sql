create index program_exercises_exercise_idx
  on public.program_exercises (exercise_id);
create index workout_sessions_program_day_idx
  on public.workout_sessions (program_day_id);
create index workout_sets_exercise_idx
  on public.workout_sets (exercise_id);
create index workout_sets_session_user_idx
  on public.workout_sets (session_id, user_id);

alter table public.workout_sets
  add column duration_minutes numeric(7, 2),
  add column speed_kmh numeric(5, 2),
  add column incline_percent numeric(5, 2),
  add constraint workout_sets_duration_minutes_non_negative
    check (duration_minutes is null or duration_minutes >= 0),
  add constraint workout_sets_speed_kmh_non_negative
    check (speed_kmh is null or speed_kmh >= 0),
  add constraint workout_sets_incline_percent_non_negative
    check (incline_percent is null or incline_percent >= 0);

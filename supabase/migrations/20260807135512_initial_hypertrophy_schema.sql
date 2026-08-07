create extension if not exists pgcrypto;

create table public.programs (
  id text primary key,
  name text not null,
  description text not null default '',
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.program_days (
  id text primary key,
  program_id text not null references public.programs(id) on delete cascade,
  day_number smallint not null check (day_number between 1 and 7),
  title text not null,
  short_title text not null,
  focus text not null default '',
  kind text not null check (kind in ('training', 'recovery')),
  duration_minutes smallint not null check (duration_minutes >= 0),
  recovery_items text[] not null default '{}',
  unique (program_id, day_number)
);

create table public.exercises (
  id text primary key,
  name text not null,
  category text not null,
  created_at timestamptz not null default now()
);

create table public.program_exercises (
  program_day_id text not null references public.program_days(id) on delete cascade,
  exercise_id text not null references public.exercises(id) on delete restrict,
  position smallint not null check (position > 0),
  sets smallint not null check (sets > 0),
  rep_range text not null,
  target_rir text not null,
  rest_seconds smallint not null check (rest_seconds > 0),
  cue text,
  primary key (program_day_id, exercise_id),
  unique (program_day_id, position)
);

create table public.workout_sessions (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  program_day_id text not null references public.program_days(id) on delete restrict,
  started_at timestamptz not null,
  finished_at timestamptz,
  status text not null check (status in ('active', 'completed', 'abandoned')),
  duration_seconds integer check (duration_seconds is null or duration_seconds >= 0),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, user_id),
  check (finished_at is null or finished_at >= started_at)
);

create table public.workout_sets (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  session_id text not null,
  exercise_id text not null references public.exercises(id) on delete restrict,
  set_number smallint not null check (set_number > 0),
  weight_kg numeric(7,2) not null check (weight_kg >= 0),
  reps smallint not null check (reps >= 0),
  rir numeric(3,1) not null check (rir between 0 and 10),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (session_id, user_id)
    references public.workout_sessions(id, user_id) on delete cascade,
  unique (session_id, exercise_id, set_number)
);

create table public.body_measurements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  measured_at date not null default current_date,
  weight_kg numeric(6,2) check (weight_kg is null or weight_kg > 0),
  waist_cm numeric(6,2) check (waist_cm is null or waist_cm > 0),
  arm_cm numeric(6,2) check (arm_cm is null or arm_cm > 0),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, measured_at)
);

create index workout_sessions_user_started_idx
  on public.workout_sessions (user_id, started_at desc);
create index workout_sets_session_idx
  on public.workout_sets (session_id, set_number);
create index workout_sets_user_exercise_idx
  on public.workout_sets (user_id, exercise_id, completed_at desc);
create index body_measurements_user_date_idx
  on public.body_measurements (user_id, measured_at desc);

create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger workout_sessions_set_updated_at
before update on public.workout_sessions
for each row execute function public.set_updated_at();

create trigger workout_sets_set_updated_at
before update on public.workout_sets
for each row execute function public.set_updated_at();

create trigger body_measurements_set_updated_at
before update on public.body_measurements
for each row execute function public.set_updated_at();

revoke all on function public.set_updated_at() from public, anon, authenticated;

alter table public.programs enable row level security;
alter table public.program_days enable row level security;
alter table public.exercises enable row level security;
alter table public.program_exercises enable row level security;
alter table public.workout_sessions enable row level security;
alter table public.workout_sets enable row level security;
alter table public.body_measurements enable row level security;

create policy "Catalog programs are readable"
on public.programs for select to anon, authenticated using (true);
create policy "Catalog days are readable"
on public.program_days for select to anon, authenticated using (true);
create policy "Catalog exercises are readable"
on public.exercises for select to anon, authenticated using (true);
create policy "Catalog prescriptions are readable"
on public.program_exercises for select to anon, authenticated using (true);

create policy "Users read own sessions"
on public.workout_sessions for select to authenticated
using ((select auth.uid()) = user_id);
create policy "Users insert own sessions"
on public.workout_sessions for insert to authenticated
with check ((select auth.uid()) = user_id);
create policy "Users update own sessions"
on public.workout_sessions for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);
create policy "Users delete own sessions"
on public.workout_sessions for delete to authenticated
using ((select auth.uid()) = user_id);

create policy "Users read own sets"
on public.workout_sets for select to authenticated
using ((select auth.uid()) = user_id);
create policy "Users insert own sets"
on public.workout_sets for insert to authenticated
with check ((select auth.uid()) = user_id);
create policy "Users update own sets"
on public.workout_sets for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);
create policy "Users delete own sets"
on public.workout_sets for delete to authenticated
using ((select auth.uid()) = user_id);

create policy "Users read own measurements"
on public.body_measurements for select to authenticated
using ((select auth.uid()) = user_id);
create policy "Users insert own measurements"
on public.body_measurements for insert to authenticated
with check ((select auth.uid()) = user_id);
create policy "Users update own measurements"
on public.body_measurements for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);
create policy "Users delete own measurements"
on public.body_measurements for delete to authenticated
using ((select auth.uid()) = user_id);

grant usage on schema public to anon, authenticated;
grant select on public.programs, public.program_days, public.exercises, public.program_exercises
  to anon, authenticated;
grant select, insert, update, delete on public.workout_sessions, public.workout_sets, public.body_measurements
  to authenticated;

insert into public.programs (id, name, description, active)
values (
  'cbum-inspired-hypertrophy-v1',
  'Hypertrophie — Cycle 01',
  'Split 7 jours orienté V-taper, épaules, haut des pectoraux et performance.',
  true
);

insert into public.program_days
  (id, program_id, day_number, title, short_title, focus, kind, duration_minutes, recovery_items)
values
  ('day-1-quads', 'cbum-inspired-hypertrophy-v1', 1, 'Quadriceps & Mollets', 'Quadriceps', 'Force contrôlée · tension en amplitude', 'training', 72, '{}'),
  ('day-2-chest-triceps', 'cbum-inspired-hypertrophy-v1', 2, 'Haut des pectoraux & Triceps', 'Pectoraux', 'Priorité portion claviculaire', 'training', 78, '{}'),
  ('day-3-back-biceps', 'cbum-inspired-hypertrophy-v1', 3, 'Dos & Biceps', 'Dos', 'Largeur puis épaisseur', 'training', 82, '{}'),
  ('day-4-recovery', 'cbum-inspired-hypertrophy-v1', 4, 'Récupération active', 'Repos', 'Faire redescendre la fatigue', 'recovery', 30, array['Marche 25–40 min', 'Cardio zone 2 léger', 'Mobilité hanches & épaules', 'Hydratation et sommeil']),
  ('day-5-shoulders', 'cbum-inspired-hypertrophy-v1', 5, 'Épaules & Haut des pectoraux', 'Épaules', 'Deltoïdes ronds · V-taper', 'training', 76, '{}'),
  ('day-6-hamstrings', 'cbum-inspired-hypertrophy-v1', 6, 'Ischios, Fessiers & Lombaires', 'Ischios', 'Chaîne postérieure complète', 'training', 75, '{}'),
  ('day-7-arms', 'cbum-inspired-hypertrophy-v1', 7, 'Bras', 'Bras', 'Biceps & triceps sans compromis', 'training', 68, '{}');

insert into public.exercises (id, name, category)
values
  ('hack-squat', 'Hack Squat', 'Quadriceps'),
  ('leg-press-low', 'Leg Press pieds bas', 'Quadriceps'),
  ('bulgarian-split-squat', 'Fentes bulgares', 'Quadriceps'),
  ('leg-extension', 'Leg Extension', 'Quadriceps'),
  ('adductors', 'Adducteurs machine', 'Adducteurs'),
  ('standing-calf-raise', 'Mollets debout', 'Mollets'),
  ('incline-db-press', 'Développé incliné haltères', 'Pectoraux'),
  ('incline-chest-press', 'Chest Press convergente inclinée', 'Pectoraux'),
  ('smith-bench-press', 'Développé couché Smith', 'Pectoraux'),
  ('low-high-fly', 'Écartés poulie basse → haute', 'Pectoraux'),
  ('jm-press', 'JM Press', 'Triceps'),
  ('overhead-rope-extension', 'Extension overhead corde', 'Triceps'),
  ('triceps-pushdown', 'Pushdown', 'Triceps'),
  ('neutral-pulldown', 'Tirage vertical neutre', 'Dos'),
  ('chest-supported-row', 'Rowing poitrine appuyée', 'Dos'),
  ('t-bar-row', 'T-Bar Row', 'Dos'),
  ('single-arm-low-row', 'Low Row unilatéral', 'Dos'),
  ('cable-pullover', 'Pullover poulie', 'Dos'),
  ('incline-curl-back', 'Curl incliné', 'Biceps'),
  ('hammer-curl-back', 'Curl marteau', 'Biceps'),
  ('preacher-curl-back', 'Curl pupitre', 'Biceps'),
  ('military-press', 'Développé militaire', 'Épaules'),
  ('landmine-press', 'Landmine Press unilatéral', 'Épaules'),
  ('cable-lateral-raise', 'Élévations latérales poulie', 'Épaules'),
  ('db-lateral-raise', 'Élévations latérales haltères', 'Épaules'),
  ('reverse-pec-deck', 'Reverse Pec Deck', 'Épaules'),
  ('light-incline-press', 'Développé incliné léger', 'Pectoraux'),
  ('shrugs', 'Shrugs', 'Trapèzes'),
  ('romanian-deadlift', 'Romanian Deadlift', 'Ischios'),
  ('hip-thrust', 'Hip Thrust', 'Fessiers'),
  ('seated-leg-curl', 'Leg Curl assis', 'Ischios'),
  ('weighted-back-extension', 'Back Extension lestée', 'Lombaires'),
  ('good-morning', 'Good Morning léger', 'Ischios'),
  ('seated-calf-raise', 'Mollets assis', 'Mollets'),
  ('incline-curl-arms', 'Curl incliné', 'Biceps'),
  ('preacher-curl-arms', 'Curl pupitre', 'Biceps'),
  ('hammer-curl-arms', 'Curl marteau', 'Biceps'),
  ('ez-skull-crusher', 'Extension triceps barre EZ', 'Triceps'),
  ('overhead-rope-arms', 'Extension overhead corde', 'Triceps'),
  ('pushdown-arms', 'Pushdown', 'Triceps'),
  ('arms-finisher', 'Superset curl + extension câble', 'Finisher');

insert into public.program_exercises
  (program_day_id, exercise_id, position, sets, rep_range, target_rir, rest_seconds, cue)
values
  ('day-1-quads', 'hack-squat', 1, 4, '6–8', '1', 180, 'Descente contrôlée, bassin stable.'),
  ('day-1-quads', 'leg-press-low', 2, 3, '10–12', '1', 150, null),
  ('day-1-quads', 'bulgarian-split-squat', 3, 3, '8–10', '1', 120, null),
  ('day-1-quads', 'leg-extension', 4, 3, '12–15', '0–1', 90, 'Dernière série en drop set.'),
  ('day-1-quads', 'adductors', 5, 3, '12–15', '1', 90, null),
  ('day-1-quads', 'standing-calf-raise', 6, 5, '12–20', '1', 90, null),
  ('day-2-chest-triceps', 'incline-db-press', 1, 4, '6–8', '1', 180, null),
  ('day-2-chest-triceps', 'incline-chest-press', 2, 3, '8–10', '1', 180, null),
  ('day-2-chest-triceps', 'smith-bench-press', 3, 3, '8–10', '1', 150, null),
  ('day-2-chest-triceps', 'low-high-fly', 4, 3, '12–15', '0–1', 120, null),
  ('day-2-chest-triceps', 'jm-press', 5, 3, '8–10', '1', 120, null),
  ('day-2-chest-triceps', 'overhead-rope-extension', 6, 3, '10–12', '0–1', 120, null),
  ('day-2-chest-triceps', 'triceps-pushdown', 7, 2, '15', '0', 90, null),
  ('day-3-back-biceps', 'neutral-pulldown', 1, 4, '8', '1', 150, null),
  ('day-3-back-biceps', 'chest-supported-row', 2, 3, '8', '1', 150, null),
  ('day-3-back-biceps', 't-bar-row', 3, 3, '10', '1', 150, null),
  ('day-3-back-biceps', 'single-arm-low-row', 4, 3, '10', '1', 120, null),
  ('day-3-back-biceps', 'cable-pullover', 5, 2, '15', '0–1', 90, null),
  ('day-3-back-biceps', 'incline-curl-back', 6, 3, '8', '1', 120, null),
  ('day-3-back-biceps', 'hammer-curl-back', 7, 3, '10', '1', 90, null),
  ('day-3-back-biceps', 'preacher-curl-back', 8, 2, '12', '0–1', 90, null),
  ('day-5-shoulders', 'military-press', 1, 3, '6–8', '1', 180, null),
  ('day-5-shoulders', 'landmine-press', 2, 3, '8–10', '1', 120, null),
  ('day-5-shoulders', 'cable-lateral-raise', 3, 4, '12–15', '0–1', 120, null),
  ('day-5-shoulders', 'db-lateral-raise', 4, 3, '15–20', '0', 90, null),
  ('day-5-shoulders', 'reverse-pec-deck', 5, 4, '12–15', '0–1', 120, null),
  ('day-5-shoulders', 'light-incline-press', 6, 3, '10–12', '1', 120, null),
  ('day-5-shoulders', 'shrugs', 7, 3, '12', '1', 120, null),
  ('day-6-hamstrings', 'romanian-deadlift', 1, 4, '8', '1', 180, null),
  ('day-6-hamstrings', 'hip-thrust', 2, 3, '8', '1', 150, null),
  ('day-6-hamstrings', 'seated-leg-curl', 3, 4, '10–12', '0–1', 120, null),
  ('day-6-hamstrings', 'weighted-back-extension', 4, 3, '12', '1', 120, null),
  ('day-6-hamstrings', 'good-morning', 5, 2, '12', '2', 120, null),
  ('day-6-hamstrings', 'seated-calf-raise', 6, 4, '15–20', '1', 90, null),
  ('day-7-arms', 'incline-curl-arms', 1, 3, '8', '1', 120, null),
  ('day-7-arms', 'preacher-curl-arms', 2, 3, '10', '1', 90, null),
  ('day-7-arms', 'hammer-curl-arms', 3, 3, '10', '1', 90, null),
  ('day-7-arms', 'ez-skull-crusher', 4, 3, '8', '1', 120, null),
  ('day-7-arms', 'overhead-rope-arms', 5, 3, '10', '1', 90, null),
  ('day-7-arms', 'pushdown-arms', 6, 3, '12', '0–1', 90, null),
  ('day-7-arms', 'arms-finisher', 7, 3, '12–15', '0', 75, null);

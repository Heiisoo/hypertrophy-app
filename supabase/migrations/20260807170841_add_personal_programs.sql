create table public.user_programs (
  user_id uuid primary key references auth.users(id) on delete cascade,
  program jsonb not null check (jsonb_typeof(program) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger user_programs_set_updated_at
before update on public.user_programs
for each row execute function public.set_updated_at();

alter table public.user_programs enable row level security;

create policy "Users can read their own program"
on public.user_programs for select to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can create their own program"
on public.user_programs for insert to authenticated
with check ((select auth.uid()) = user_id);

create policy "Users can update their own program"
on public.user_programs for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Users can delete their own program"
on public.user_programs for delete to authenticated
using ((select auth.uid()) = user_id);

grant select, insert, update, delete on public.user_programs to authenticated;

-- Personalized exercises use identifiers owned by the user rather than catalog IDs.
-- Workout history remains protected by the session/user foreign key and RLS policies.
alter table public.workout_sets
drop constraint workout_sets_exercise_id_fkey;

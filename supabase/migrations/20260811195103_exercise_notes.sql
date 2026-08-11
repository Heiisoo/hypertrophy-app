create table public.exercise_notes (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  exercise_key text not null,
  exercise_name text not null,
  note text not null default '' check (char_length(note) <= 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, exercise_key)
);

create index exercise_notes_user_updated_idx
on public.exercise_notes (user_id, updated_at desc);

create trigger exercise_notes_set_updated_at
before update on public.exercise_notes
for each row execute function public.set_updated_at();

alter table public.exercise_notes enable row level security;

create policy "Users can read their exercise notes"
on public.exercise_notes for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can create their exercise notes"
on public.exercise_notes for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "Users can update their exercise notes"
on public.exercise_notes for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Users can delete their exercise notes"
on public.exercise_notes for delete
to authenticated
using ((select auth.uid()) = user_id);

revoke all on table public.exercise_notes from anon;
grant select, insert, update, delete on table public.exercise_notes to authenticated;

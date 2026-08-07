alter table public.exercises
  add column equipment text,
  add column primary_muscles text[] not null default '{}',
  add column aliases text[] not null default '{}',
  add column instructions text,
  add column image_url text,
  add column video_url text;

update public.exercises
set primary_muscles = array[category]
where cardinality(primary_muscles) = 0;

grant select on public.exercises to anon, authenticated;

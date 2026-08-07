alter table public.program_days
  drop constraint if exists program_days_day_number_check;

alter table public.program_days
  add constraint program_days_day_number_check check (day_number >= 1);

update public.programs
set description = 'Cycle de 8 jours orienté V-taper, épaules, haut des pectoraux et performance.'
where id = 'cbum-inspired-hypertrophy-v1';

insert into public.program_days
  (id, program_id, day_number, title, short_title, focus, kind, duration_minutes, recovery_items)
values
  (
    'day-8-recovery',
    'cbum-inspired-hypertrophy-v1',
    8,
    'Récupération active',
    'Repos',
    'Faire redescendre la fatigue',
    'recovery',
    30,
    array['Marche légère', 'Mobilité', 'Hydratation et sommeil']
  )
on conflict (id) do update set
  day_number = excluded.day_number,
  title = excluded.title,
  short_title = excluded.short_title,
  focus = excluded.focus,
  kind = excluded.kind,
  duration_minutes = excluded.duration_minutes,
  recovery_items = excluded.recovery_items;

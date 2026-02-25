-- Seed initial MVP cohorts (idempotent).
insert into public.rhetor_cohorts (name, focus_area, is_active)
values
  ('ESL Professionals', 'ESL Professionals', true),
  ('Interview Prep', 'Interview Prep', true),
  ('Executive Communication', 'Executive Communication', true)
on conflict (name) do update
set
  focus_area = excluded.focus_area,
  is_active = excluded.is_active;


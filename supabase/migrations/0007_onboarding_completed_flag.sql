-- Persist onboarding completion state.
alter table public.rhetor_users
  add column onboarding_completed boolean not null default false;


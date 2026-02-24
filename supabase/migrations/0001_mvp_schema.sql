-- Rhetor MVP schema v1
-- Scope: essential tables only for the core practice -> review -> credit loop.

create extension if not exists pgcrypto;

-- Enums
create type public.session_type as enum ('prompt', 'freeform', 'flash_notes');
create type public.session_status as enum ('recorded', 'processing', 'ready', 'failed');
create type public.review_queue_status as enum ('pending', 'claimed', 'submitted', 'expired');
create type public.credit_reason as enum ('onboarding', 'session_submit', 'review_submit', 'review_bonus', 'admin_adjustment');

-- Users (profile metadata for auth.users)
create table public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  pseudonym text not null check (char_length(trim(pseudonym)) between 3 and 32),
  native_language text,
  profession_level text,
  goals text[] not null default '{}',
  credits integer not null default 0 check (credits >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Cohorts are broad focus groups (ESL, Interview, Executive, etc.)
create table public.cohorts (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  focus_area text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Pods are assignment units inside cohorts.
create table public.pods (
  id uuid primary key default gen_random_uuid(),
  cohort_id uuid not null references public.cohorts (id) on delete cascade,
  pod_label text not null,
  capacity integer not null default 30 check (capacity between 2 and 100),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (cohort_id, pod_label)
);

-- Single active pod membership per user for MVP.
create table public.pod_memberships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  pod_id uuid not null references public.pods (id) on delete cascade,
  reputation_score numeric(3,2) not null default 0.00 check (reputation_score between 0 and 5),
  joined_at timestamptz not null default now(),
  left_at timestamptz,
  check (left_at is null or left_at > joined_at)
);

create unique index pod_memberships_user_active_uidx
  on public.pod_memberships (user_id)
  where left_at is null;

create index pod_memberships_pod_active_idx
  on public.pod_memberships (pod_id)
  where left_at is null;

-- Practice sessions
create table public.sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  pod_id uuid not null references public.pods (id) on delete restrict,
  session_type public.session_type not null,
  focus_tags text[] not null default '{}',
  audio_path text not null,
  transcript text,
  ai_diagnostics jsonb not null default '{}'::jsonb,
  flash_notes_original jsonb,
  memory_score numeric(4,3) check (memory_score between 0 and 1),
  status public.session_status not null default 'recorded',
  submitted_at timestamptz not null default now()
);

create index sessions_user_submitted_idx on public.sessions (user_id, submitted_at desc);
create index sessions_pod_status_idx on public.sessions (pod_id, status);

-- Submitted peer reviews
create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions (id) on delete cascade,
  reviewer_id uuid not null references public.users (id) on delete cascade,
  clarity smallint not null check (clarity between 1 and 5),
  structure smallint not null check (structure between 1 and 5),
  engagement smallint not null check (engagement between 1 and 5),
  confidence smallint not null check (confidence between 1 and 5),
  memory_delivery smallint check (memory_delivery between 1 and 5),
  strength text not null,
  improvement text not null,
  suggestion text not null,
  quality_score numeric(3,2) check (quality_score between 1 and 5),
  submitted_at timestamptz not null default now(),
  unique (session_id, reviewer_id)
);

create index reviews_reviewer_submitted_idx on public.reviews (reviewer_id, submitted_at desc);

-- Assignment queue for review workflow
create table public.review_queue (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions (id) on delete cascade,
  assigned_reviewer_id uuid not null references public.users (id) on delete cascade,
  assigned_at timestamptz not null default now(),
  due_at timestamptz not null,
  status public.review_queue_status not null default 'pending',
  check (due_at > assigned_at),
  unique (session_id, assigned_reviewer_id)
);

create index review_queue_assignee_status_idx
  on public.review_queue (assigned_reviewer_id, status, due_at);

-- Idempotent credit ledger
create table public.credit_ledger (
  id uuid primary key default gen_random_uuid(),
  event_id text not null unique,
  user_id uuid not null references public.users (id) on delete cascade,
  amount integer not null,
  reason public.credit_reason not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index credit_ledger_user_created_idx
  on public.credit_ledger (user_id, created_at desc);


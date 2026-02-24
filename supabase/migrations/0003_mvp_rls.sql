-- Rhetor MVP RLS baseline
-- Scope: secure-by-default access rules for core MVP tables.

-- Enable RLS on all app tables
alter table public.rhetor_users enable row level security;
alter table public.rhetor_cohorts enable row level security;
alter table public.rhetor_pods enable row level security;
alter table public.rhetor_pod_memberships enable row level security;
alter table public.rhetor_sessions enable row level security;
alter table public.rhetor_reviews enable row level security;
alter table public.rhetor_review_queue enable row level security;
alter table public.rhetor_credit_ledger enable row level security;

-- USERS
-- Users can create/read/update their own profile row.
create policy "rhetor_users_insert_self"
  on public.rhetor_users
  for insert
  with check (id = auth.uid());

create policy "rhetor_users_select_self"
  on public.rhetor_users
  for select
  using (id = auth.uid());

create policy "rhetor_users_update_self"
  on public.rhetor_users
  for update
  using (id = auth.uid())
  with check (id = auth.uid());

-- Users can view pseudonymous profiles of users in the same active pod.
create policy "rhetor_users_select_same_pod"
  on public.rhetor_users
  for select
  using (
    exists (
      select 1
      from public.rhetor_pod_memberships mine
      join public.rhetor_pod_memberships theirs
        on theirs.pod_id = mine.pod_id
       and theirs.left_at is null
      where mine.user_id = auth.uid()
        and mine.left_at is null
        and theirs.user_id = rhetor_users.id
    )
  );

-- COHORTS / PODS
-- Authenticated users can read active cohort and pod metadata.
create policy "rhetor_cohorts_select_authenticated"
  on public.rhetor_cohorts
  for select
  using (auth.uid() is not null);

create policy "rhetor_pods_select_authenticated"
  on public.rhetor_pods
  for select
  using (auth.uid() is not null);

-- POD MEMBERSHIPS
-- Users can read their own membership and other members in shared active pod(s).
create policy "rhetor_pod_memberships_select_shared"
  on public.rhetor_pod_memberships
  for select
  using (
    user_id = auth.uid()
    or exists (
      select 1
      from public.rhetor_pod_memberships mine
      where mine.user_id = auth.uid()
        and mine.left_at is null
        and mine.pod_id = rhetor_pod_memberships.pod_id
    )
  );

-- Users can insert/update their own active membership row.
create policy "rhetor_pod_memberships_insert_self"
  on public.rhetor_pod_memberships
  for insert
  with check (user_id = auth.uid());

create policy "rhetor_pod_memberships_update_self"
  on public.rhetor_pod_memberships
  for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- SESSIONS
-- Submitters can create and manage their own sessions.
create policy "rhetor_sessions_insert_owner"
  on public.rhetor_sessions
  for insert
  with check (
    user_id = auth.uid()
    and exists (
      select 1
      from public.rhetor_pod_memberships m
      where m.user_id = auth.uid()
        and m.left_at is null
        and m.pod_id = rhetor_sessions.pod_id
    )
  );

create policy "rhetor_sessions_select_owner"
  on public.rhetor_sessions
  for select
  using (user_id = auth.uid());

create policy "rhetor_sessions_update_owner"
  on public.rhetor_sessions
  for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Assigned reviewers can read sessions they were assigned.
create policy "rhetor_sessions_select_assigned_reviewer"
  on public.rhetor_sessions
  for select
  using (
    exists (
      select 1
      from public.rhetor_review_queue rq
      where rq.session_id = rhetor_sessions.id
        and rq.assigned_reviewer_id = auth.uid()
    )
  );

-- REVIEWS
-- Reviewer can submit one review for assigned sessions.
create policy "rhetor_reviews_insert_reviewer_assigned"
  on public.rhetor_reviews
  for insert
  with check (
    reviewer_id = auth.uid()
    and exists (
      select 1
      from public.rhetor_review_queue rq
      where rq.session_id = rhetor_reviews.session_id
        and rq.assigned_reviewer_id = auth.uid()
    )
  );

-- Reviewer can read own submitted reviews.
create policy "rhetor_reviews_select_reviewer"
  on public.rhetor_reviews
  for select
  using (reviewer_id = auth.uid());

-- Session owner can read reviews on their sessions.
create policy "rhetor_reviews_select_session_owner"
  on public.rhetor_reviews
  for select
  using (
    exists (
      select 1
      from public.rhetor_sessions s
      where s.id = rhetor_reviews.session_id
        and s.user_id = auth.uid()
    )
  );

-- REVIEW QUEUE
-- Assigned reviewers can read and update their queue items.
create policy "rhetor_review_queue_select_assignee"
  on public.rhetor_review_queue
  for select
  using (assigned_reviewer_id = auth.uid());

create policy "rhetor_review_queue_update_assignee"
  on public.rhetor_review_queue
  for update
  using (assigned_reviewer_id = auth.uid())
  with check (assigned_reviewer_id = auth.uid());

-- Session owner can view queue state for their submitted sessions.
create policy "rhetor_review_queue_select_submitter"
  on public.rhetor_review_queue
  for select
  using (
    exists (
      select 1
      from public.rhetor_sessions s
      where s.id = rhetor_review_queue.session_id
        and s.user_id = auth.uid()
    )
  );

-- CREDIT LEDGER
-- Users can read their own credit history only.
create policy "rhetor_credit_ledger_select_owner"
  on public.rhetor_credit_ledger
  for select
  using (user_id = auth.uid());


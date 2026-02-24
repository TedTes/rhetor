-- Rename initial unprefixed MVP objects to isolated rhetor_* names.
-- This migration assumes 0001_mvp_schema.sql has already been applied.

-- Enums
alter type public.session_type rename to rhetor_session_type;
alter type public.session_status rename to rhetor_session_status;
alter type public.review_queue_status rename to rhetor_review_queue_status;
alter type public.credit_reason rename to rhetor_credit_reason;

-- Tables
alter table public.users rename to rhetor_users;
alter table public.cohorts rename to rhetor_cohorts;
alter table public.pods rename to rhetor_pods;
alter table public.pod_memberships rename to rhetor_pod_memberships;
alter table public.sessions rename to rhetor_sessions;
alter table public.reviews rename to rhetor_reviews;
alter table public.review_queue rename to rhetor_review_queue;
alter table public.credit_ledger rename to rhetor_credit_ledger;

-- Indexes
alter index public.pod_memberships_user_active_uidx rename to rhetor_pod_memberships_user_active_uidx;
alter index public.pod_memberships_pod_active_idx rename to rhetor_pod_memberships_pod_active_idx;
alter index public.sessions_user_submitted_idx rename to rhetor_sessions_user_submitted_idx;
alter index public.sessions_pod_status_idx rename to rhetor_sessions_pod_status_idx;
alter index public.reviews_reviewer_submitted_idx rename to rhetor_reviews_reviewer_submitted_idx;
alter index public.review_queue_assignee_status_idx rename to rhetor_review_queue_assignee_status_idx;
alter index public.credit_ledger_user_created_idx rename to rhetor_credit_ledger_user_created_idx;


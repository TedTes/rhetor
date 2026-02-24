-- Concurrency-safe pod assignment for onboarding.
-- Assigns a user to an active pod in a cohort, creating a new pod if needed.

create or replace function public.rhetor_assign_to_pod(
  p_user_id uuid,
  p_cohort_id uuid
)
returns table (
  cohort_id uuid,
  pod_id uuid,
  pod_label text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cohort_id uuid;
  v_pod_id uuid;
  v_pod_label text;
  v_existing_pod_id uuid;
begin
  if p_user_id is null or p_cohort_id is null then
    raise exception 'p_user_id and p_cohort_id are required';
  end if;

  -- Per-cohort transaction lock to avoid assignment races.
  perform pg_advisory_xact_lock(hashtextextended(p_cohort_id::text, 0));

  select c.id
    into v_cohort_id
  from public.rhetor_cohorts c
  where c.id = p_cohort_id
    and c.is_active = true;

  if v_cohort_id is null then
    raise exception 'cohort is not active or does not exist';
  end if;

  -- If user already has an active membership in this cohort, return it.
  select m.pod_id, p.pod_label
    into v_existing_pod_id, v_pod_label
  from public.rhetor_pod_memberships m
  join public.rhetor_pods p on p.id = m.pod_id
  where m.user_id = p_user_id
    and m.left_at is null
    and p.cohort_id = v_cohort_id
  limit 1;

  if v_existing_pod_id is not null then
    return query
    select v_cohort_id, v_existing_pod_id, v_pod_label;
    return;
  end if;

  -- End any previous active membership (single active membership model).
  update public.rhetor_pod_memberships
  set left_at = now()
  where user_id = p_user_id
    and left_at is null;

  -- Find an active pod with free capacity.
  select p.id, p.pod_label
    into v_pod_id, v_pod_label
  from public.rhetor_pods p
  left join public.rhetor_pod_memberships m
    on m.pod_id = p.id
   and m.left_at is null
  where p.cohort_id = v_cohort_id
    and p.is_active = true
  group by p.id, p.pod_label, p.capacity
  having count(m.id) < p.capacity
  order by count(m.id) asc, p.created_at asc
  limit 1;

  -- If all active pods are full (or none exist), create a new pod.
  if v_pod_id is null then
    insert into public.rhetor_pods (cohort_id, pod_label, capacity, is_active)
    values (
      v_cohort_id,
      'pod-' || substring(gen_random_uuid()::text from 1 for 8),
      30,
      true
    )
    returning id, pod_label
      into v_pod_id, v_pod_label;
  end if;

  insert into public.rhetor_pod_memberships (user_id, pod_id)
  values (p_user_id, v_pod_id);

  return query
  select v_cohort_id, v_pod_id, v_pod_label;
end;
$$;

revoke all on function public.rhetor_assign_to_pod(uuid, uuid) from public;
grant execute on function public.rhetor_assign_to_pod(uuid, uuid) to authenticated, service_role;


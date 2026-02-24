-- Enforce audio_path contract for rhetor sessions.
-- Contract:
--   audio_path = <user_uuid>/<session_uuid>.<ext>
--   where <session_uuid> must equal sessions.id
--   and top folder <user_uuid> must equal sessions.user_id

-- Basic format check on audio_path
alter table public.rhetor_sessions
  add constraint rhetor_sessions_audio_path_format_chk
  check (
    audio_path ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\\.[a-z0-9]+$'
  );

-- Ensure each stored audio object maps to a single session.
create unique index if not exists rhetor_sessions_audio_path_uidx
  on public.rhetor_sessions (audio_path);

create or replace function public.rhetor_validate_session_audio_path()
returns trigger
language plpgsql
as $$
declare
  path_user uuid;
  path_session uuid;
begin
  path_user := split_part(new.audio_path, '/', 1)::uuid;
  path_session := split_part(split_part(new.audio_path, '/', 2), '.', 1)::uuid;

  if path_user <> new.user_id then
    raise exception 'audio_path user folder must match user_id';
  end if;

  if path_session <> new.id then
    raise exception 'audio_path session id must match sessions.id';
  end if;

  return new;
end;
$$;

drop trigger if exists rhetor_sessions_audio_path_validate_trg on public.rhetor_sessions;
create trigger rhetor_sessions_audio_path_validate_trg
before insert or update of audio_path, user_id
on public.rhetor_sessions
for each row
execute function public.rhetor_validate_session_audio_path();


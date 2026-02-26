import { supabase } from '../lib/supabase';

export type SessionType = 'prompt' | 'freeform' | 'flash_notes';
export type SessionStatus = 'recorded' | 'processing' | 'ready' | 'failed';

export interface HomeProfile {
  pseudonym: string;
  credits: number;
  goals: string[];
}

export interface HomeSession {
  id: string;
  session_type: SessionType;
  submitted_at: string;
  status: SessionStatus;
  memory_score: number | null;
  review_count: number;
}

export interface HomeData {
  profile: HomeProfile;
  pendingReviewCount: number;
  sessionsAwaitingFeedback: number;
  recentSessions: HomeSession[];
}

export interface CreatedSession {
  session_id: string;
  pod_id: string;
  session_type: SessionType;
  focus_tags: string[];
  audio_bucket: string;
  audio_path: string;
  status: SessionStatus;
  submitted_at: string;
}

function contentTypeFromPath(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'm4a':
      return 'audio/mp4';
    case 'aac':
      return 'audio/aac';
    case 'mp3':
      return 'audio/mpeg';
    case 'wav':
      return 'audio/wav';
    case 'caf':
      return 'audio/x-caf';
    case 'ogg':
      return 'audio/ogg';
    default:
      return 'application/octet-stream';
  }
}

const MOCK_MODE =
  process.env.EXPO_PUBLIC_MOCK_API === 'true' ||
  process.env.EXPO_PUBLIC_BYPASS_AUTH === 'true';

function pseudoId(): string {
  const a = Math.random().toString(16).slice(2, 10);
  const b = Math.random().toString(16).slice(2, 6);
  const c = Math.random().toString(16).slice(2, 6);
  const d = Math.random().toString(16).slice(2, 6);
  const e = Math.random().toString(16).slice(2, 14);
  return `${a}-${b}-${c}-${d}-${e}`;
}

const MOCK_DATA: HomeData = {
  profile: {
    pseudonym: 'sharpedge',
    credits: 4,
    goals: ['clarity', 'confidence', 'memory'],
  },
  pendingReviewCount: 2,
  sessionsAwaitingFeedback: 1,
  recentSessions: [
    {
      id: 'mock-1',
      session_type: 'flash_notes',
      submitted_at: new Date(Date.now() - 86_400_000).toISOString(),
      status: 'ready',
      memory_score: 0.72,
      review_count: 1,
    },
    {
      id: 'mock-2',
      session_type: 'prompt',
      submitted_at: new Date(Date.now() - 2 * 86_400_000).toISOString(),
      status: 'ready',
      memory_score: null,
      review_count: 2,
    },
    {
      id: 'mock-3',
      session_type: 'freeform',
      submitted_at: new Date(Date.now() - 5 * 86_400_000).toISOString(),
      status: 'ready',
      memory_score: null,
      review_count: 2,
    },
  ],
};

type RawSessionRow = {
  id: string;
  session_type: string;
  submitted_at: string;
  status: string;
  memory_score: number | null;
  rhetor_reviews: Array<{ id: string }> | null;
};

export async function fetchHomeData(userId: string): Promise<HomeData> {
  if (MOCK_MODE) {
    await new Promise<void>((r) => setTimeout(r, 700));
    return MOCK_DATA;
  }

  const [profileRes, reviewQueueRes, sessionsRes, allSessionIdsRes] = await Promise.all([
    supabase
      .from('rhetor_users')
      .select('pseudonym, credits, goals')
      .eq('id', userId)
      .single(),

    supabase
      .from('rhetor_review_queue')
      .select('id', { count: 'exact', head: true })
      .eq('assigned_reviewer_id', userId)
      .eq('status', 'pending'),

    supabase
      .from('rhetor_sessions')
      .select('id, session_type, submitted_at, status, memory_score, rhetor_reviews(id)')
      .eq('user_id', userId)
      .order('submitted_at', { ascending: false })
      .limit(5),

    // Pull all user session ids so "awaiting feedback" is accurate, not capped by recent items.
    supabase.from('rhetor_sessions').select('id').eq('user_id', userId),
  ]);

  if (profileRes.error) throw new Error(profileRes.error.message);
  if (reviewQueueRes.error) throw new Error(reviewQueueRes.error.message);
  if (sessionsRes.error) throw new Error(sessionsRes.error.message);
  if (allSessionIdsRes.error) throw new Error(allSessionIdsRes.error.message);

  const profile: HomeProfile = {
    pseudonym: profileRes.data.pseudonym,
    credits: profileRes.data.credits,
    goals: (profileRes.data.goals as string[]) ?? [],
  };

  const rawSessions = (sessionsRes.data as RawSessionRow[] | null) ?? [];
  const allSessionIds = ((allSessionIdsRes.data as Array<{ id: string }> | null) ?? []).map(
    (s) => s.id,
  );

  const allSessions: HomeSession[] = rawSessions.map((s) => ({
    id: s.id,
    session_type: s.session_type as SessionType,
    submitted_at: s.submitted_at,
    status: s.status as SessionStatus,
    memory_score: s.memory_score,
    review_count: Array.isArray(s.rhetor_reviews) ? s.rhetor_reviews.length : 0,
  }));

  let sessionsAwaitingFeedback = 0;
  if (allSessionIds.length > 0) {
    const { data: allReviews, error: allReviewsErr } = await supabase
      .from('rhetor_reviews')
      .select('session_id')
      .in('session_id', allSessionIds);

    if (allReviewsErr) throw new Error(allReviewsErr.message);

    const reviewCountBySession = new Map<string, number>();
    for (const row of allReviews ?? []) {
      const sessionId = row.session_id as string;
      reviewCountBySession.set(sessionId, (reviewCountBySession.get(sessionId) ?? 0) + 1);
    }

    sessionsAwaitingFeedback = allSessionIds.filter(
      (sessionId) => (reviewCountBySession.get(sessionId) ?? 0) < 2,
    ).length;
  }

  return {
    profile,
    pendingReviewCount: reviewQueueRes.count ?? 0,
    sessionsAwaitingFeedback,
    recentSessions: allSessions,
  };
}

export async function createSession(params?: {
  session_type?: SessionType;
  focus_tags?: string[];
  audio_ext?: string;
}): Promise<CreatedSession> {
  if (MOCK_MODE) {
    await new Promise<void>((r) => setTimeout(r, 600));
    const sessionId = pseudoId();
    return {
      session_id: sessionId,
      pod_id: 'mock-pod-id',
      session_type: params?.session_type ?? 'prompt',
      focus_tags: params?.focus_tags ?? ['clarity'],
      audio_bucket: 'rhetor-audio',
      audio_path: `mock-user-id/${sessionId}.${params?.audio_ext ?? 'm4a'}`,
      status: 'recorded',
      submitted_at: new Date().toISOString(),
    };
  }

  const { data, error } = await supabase.functions.invoke<CreatedSession>('create-session', {
    body: {
      session_type: params?.session_type ?? 'prompt',
      focus_tags: params?.focus_tags ?? ['clarity'],
      audio_ext: params?.audio_ext ?? 'm4a',
    },
  });

  if (error) throw new Error(error.message ?? 'Failed to create session');
  if (!data?.session_id) throw new Error('Invalid create-session response');

  return data;
}

export async function uploadSessionAudio(session: CreatedSession, fileUri: string): Promise<void> {
  if (MOCK_MODE) {
    await new Promise<void>((r) => setTimeout(r, 700));
    return;
  }

  const fileRes = await fetch(fileUri);
  if (!fileRes.ok) {
    throw new Error('Unable to read recorded audio file');
  }
  const audioBytes = await fileRes.arrayBuffer();

  const { error: uploadErr } = await supabase.storage
    .from(session.audio_bucket)
    .upload(session.audio_path, audioBytes, {
      contentType: contentTypeFromPath(session.audio_path),
      upsert: false,
    });

  if (uploadErr) throw new Error(uploadErr.message);
}

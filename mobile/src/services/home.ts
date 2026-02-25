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

const MOCK_MODE =
  process.env.EXPO_PUBLIC_MOCK_API === 'true' ||
  process.env.EXPO_PUBLIC_BYPASS_AUTH === 'true';

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

import { supabase } from '../lib/supabase';
import type { AssignmentResult, CohortFocusArea, ProfileFormData } from '../types/onboarding';

// Set EXPO_PUBLIC_MOCK_API=true in .env for local UI testing without a live backend.
const MOCK_MODE = process.env.EXPO_PUBLIC_MOCK_API === 'true';

function mockDelay(ms = 900): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function saveProfile(
  userId: string,
  data: ProfileFormData,
): Promise<void> {
  if (MOCK_MODE) {
    await mockDelay();
    return;
  }

  const { error } = await supabase.from('rhetor_users').upsert(
    {
      id: userId,
      pseudonym: data.pseudonym.trim(),
      native_language: data.native_language.trim(),
      profession_level: data.profession_level,
      goals: data.goals,
    },
    { onConflict: 'id' },
  );

  if (error) throw new Error(error.message);
}

export async function assignToPod(
  focusArea: CohortFocusArea,
): Promise<AssignmentResult> {
  if (MOCK_MODE) {
    await mockDelay(1200);
    return {
      user_id: 'mock-user-id',
      cohort_id: 'mock-cohort-id',
      pod_id: 'mock-pod-id',
      pod_label: 'pod-a3f2c891',
    };
  }

  const { data, error } = await supabase.functions.invoke<AssignmentResult>(
    'assign-to-pod',
    { body: { focus_area: focusArea } },
  );

  if (error) throw new Error(error.message ?? 'Assignment failed');
  if (!data) throw new Error('No data returned from assignment');

  return data;
}

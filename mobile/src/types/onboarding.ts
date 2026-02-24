export const PROFESSION_LEVELS = [
  'student',
  'early_career',
  'mid_level',
  'senior',
  'executive',
] as const;
export type ProfessionLevel = (typeof PROFESSION_LEVELS)[number];

export const PROFESSION_LEVEL_LABELS: Record<ProfessionLevel, string> = {
  student: 'Student',
  early_career: 'Early Career',
  mid_level: 'Mid-Level',
  senior: 'Senior',
  executive: 'Executive',
};

export const GOAL_TAGS = [
  'clarity',
  'confidence',
  'structure',
  'persuasion',
  'memory',
  'fluency',
] as const;
export type GoalTag = (typeof GOAL_TAGS)[number];

export const GOAL_TAG_LABELS: Record<GoalTag, string> = {
  clarity: 'Clarity',
  confidence: 'Confidence',
  structure: 'Structure',
  persuasion: 'Persuasion',
  memory: 'Memory',
  fluency: 'Fluency',
};

export interface ProfileFormData {
  pseudonym: string;
  native_language: string;
  profession_level: ProfessionLevel;
  goals: GoalTag[];
}

export interface AssignmentResult {
  user_id: string;
  cohort_id: string;
  pod_id: string;
  pod_label: string;
}

export const COHORTS = [
  {
    focus_area: 'ESL Professionals',
    name: 'ESL Professionals',
    description:
      'Build professional fluency, accent-neutral delivery, and workplace vocabulary for non-native speakers.',
    tag: 'Fluency & Professionalism',
  },
  {
    focus_area: 'Interview Prep',
    name: 'Interview Prep',
    description:
      'Master behavioral and technical interview delivery using structured STAR-format practice.',
    tag: 'Career Advancement',
  },
  {
    focus_area: 'Executive Communication',
    name: 'Executive Communication',
    description:
      'Sharpen executive presence, stakeholder persuasion, and high-stakes presentation delivery.',
    tag: 'Leadership',
  },
] as const;

export type CohortFocusArea = (typeof COHORTS)[number]['focus_area'];

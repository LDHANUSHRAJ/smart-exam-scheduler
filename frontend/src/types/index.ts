// Smart Exam Scheduler — TypeScript Types

export interface User {
  id: string;
  email: string;
  full_name: string | null;
  daily_study_hours: number;
  sleep_start_hour: number;
  sleep_end_hour: number;
  created_at: string;
}

export interface Exam {
  id: string;
  user_id: string;
  subject_name: string;
  exam_date: string;
  exam_start_time: string | null;
  duration_minutes: number;
  total_marks: number;
  color_code: string | null;
  conflict_group: number | null;
  created_at: string;
}

export interface Topic {
  id: string;
  exam_id: string;
  name: string;
  weightage_percent: number;
  difficulty_score: number;
  estimated_hours: number | null;
  past_score_percent: number | null;
  is_completed: boolean;
  completion_percent: number;
  priority_score: number | null;
}

export interface StudySession {
  id: string;
  topic_name: string;
  exam_subject: string;
  exam_date: string;
  scheduled_date: string;
  start_time: string;
  end_time: string;
  duration_minutes: number;
  priority_score: number;
  status: 'pending' | 'completed' | 'skipped';
  color_code: string;
}

export interface StudyPlan {
  plan_id: string;
  valid_from: string;
  valid_until: string;
  total_sessions: number;
  total_study_hours: number;
  conflict_summary: ConflictSummary;
  sessions_by_date: Record<string, StudySession[]>;
  warnings: string[];
}

export interface ConflictPair {
  exam_a: string;
  exam_b: string;
  exam_a_name?: string;
  exam_b_name?: string;
  days_apart: number;
  conflict_type: string;
}

export interface ConflictSummary {
  color_assignment: Record<string, number>;
  conflict_pairs: ConflictPair[];
  chromatic_number: number;
  color_hex_map?: Record<string, string>;
  total_exams: number;
  total_conflicts: number;
}

export interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  backgroundColor: string;
  borderColor: string;
  extendedProps: {
    priority_score: number;
    status: string;
    duration_minutes: number;
    topic_id?: string;
    exam_id?: string;
  };
}

export interface ProgressSummary {
  total_hours_studied: number;
  total_sessions: number;
  sessions_completed: number;
  sessions_skipped: number;
  sessions_pending: number;
  topics_completed: number;
  total_topics: number;
  overall_completion_percent: number;
}

export interface HeatmapEntry {
  exam_subject: string;
  topic_name: string;
  completion_percent: number;
  difficulty_score: number;
  priority_score: number;
}

export interface GeneratePlanRequest {
  start_date: string;
  include_weekends: boolean;
  daily_study_hours: number;
  buffer_days_before_exam: number;
}

export interface ExamCreate {
  subject_name: string;
  exam_date: string;
  exam_start_time?: string;
  duration_minutes?: number;
  total_marks?: number;
}

export interface TopicCreate {
  exam_id: string;
  name: string;
  weightage_percent: number;
  difficulty_score: number;
  estimated_hours?: number;
  past_score_percent?: number;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

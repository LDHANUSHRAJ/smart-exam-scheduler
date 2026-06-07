// Zustand store — global state management

import { create } from 'zustand';
import type { User, Exam, Topic, StudyPlan, ProgressSummary, CalendarEvent, ConflictSummary } from '../types';
import { authApi, examsApi, topicsApi, plansApi, progressApi } from '../api/client';

interface AppState {
  // Auth
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  // Exams
  exams: Exam[];
  conflicts: ConflictSummary | null;

  // Topics (by exam ID)
  topicsByExam: Record<string, Topic[]>;

  // Plan
  activePlan: StudyPlan | null;
  calendarEvents: CalendarEvent[];

  // Progress
  progress: ProgressSummary | null;

  // Navigation
  currentView: string;
  setView: (view: string) => void;

  // Actions
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, fullName?: string) => Promise<void>;
  logout: () => void;
  fetchUser: () => Promise<void>;

  fetchExams: () => Promise<void>;
  createExam: (data: { subject_name: string; exam_date: string; duration_minutes?: number; total_marks?: number }) => Promise<Exam>;
  deleteExam: (id: string) => Promise<void>;
  fetchConflicts: () => Promise<void>;

  fetchTopics: (examId: string) => Promise<void>;
  createTopic: (data: { exam_id: string; name: string; weightage_percent: number; difficulty_score: number; estimated_hours?: number; past_score_percent?: number }) => Promise<void>;
  deleteTopic: (id: string, examId: string) => Promise<void>;
  uploadTopics: (examId: string, file: File) => Promise<void>;

  generatePlan: (data: { start_date: string; include_weekends: boolean; daily_study_hours: number; buffer_days_before_exam: number }) => Promise<void>;
  fetchActivePlan: () => Promise<void>;
  fetchCalendarEvents: () => Promise<void>;

  completeSession: (id: string) => Promise<void>;
  skipSession: (id: string, reason?: string) => Promise<void>;
  fetchProgress: () => Promise<void>;
}

const useStore = create<AppState>((set, get) => ({
  // Initial state
  user: null,
  isAuthenticated: !!localStorage.getItem('access_token'),
  isLoading: false,
  exams: [],
  conflicts: null,
  topicsByExam: {},
  activePlan: null,
  calendarEvents: [],
  progress: null,
  currentView: localStorage.getItem('access_token') ? 'dashboard' : 'login',
  setView: (view) => set({ currentView: view }),

  // Auth actions
  login: async (email, password) => {
    const { data } = await authApi.login(email, password);
    localStorage.setItem('access_token', data.access_token);
    localStorage.setItem('refresh_token', data.refresh_token);
    set({ isAuthenticated: true, currentView: 'dashboard' });
    await get().fetchUser();
  },

  register: async (email, password, fullName) => {
    await authApi.register(email, password, fullName);
    await get().login(email, password);
  },

  logout: () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    set({ user: null, isAuthenticated: false, exams: [], activePlan: null, currentView: 'login' });
  },

  fetchUser: async () => {
    try {
      const { data } = await authApi.getMe();
      set({ user: data, isAuthenticated: true });
    } catch {
      set({ isAuthenticated: false, user: null });
    }
  },

  // Exam actions
  fetchExams: async () => {
    const { data } = await examsApi.list();
    set({ exams: data });
  },

  createExam: async (examData) => {
    const { data } = await examsApi.create(examData);
    await get().fetchExams();
    return data;
  },

  deleteExam: async (id) => {
    await examsApi.delete(id);
    await get().fetchExams();
  },

  fetchConflicts: async () => {
    const { data } = await examsApi.getConflicts();
    set({ conflicts: data });
  },

  // Topic actions
  fetchTopics: async (examId) => {
    const { data } = await topicsApi.getForExam(examId);
    set((state) => ({
      topicsByExam: { ...state.topicsByExam, [examId]: data },
    }));
  },

  createTopic: async (topicData) => {
    await topicsApi.create(topicData);
    await get().fetchTopics(topicData.exam_id);
  },

  deleteTopic: async (id, examId) => {
    await topicsApi.delete(id);
    await get().fetchTopics(examId);
  },

  uploadTopics: async (examId, file) => {
    await topicsApi.upload(examId, file);
    await get().fetchTopics(examId);
  },

  // Plan actions
  generatePlan: async (planData) => {
    set({ isLoading: true });
    try {
      const { data } = await plansApi.generate(planData);
      set({ activePlan: data });
      await get().fetchCalendarEvents();
    } finally {
      set({ isLoading: false });
    }
  },

  fetchActivePlan: async () => {
    try {
      const { data } = await plansApi.getActive();
      set({ activePlan: data });
    } catch {
      set({ activePlan: null });
    }
  },

  fetchCalendarEvents: async () => {
    try {
      const { data } = await plansApi.getCalendar();
      set({ calendarEvents: data });
    } catch {
      set({ calendarEvents: [] });
    }
  },

  // Progress actions
  completeSession: async (id) => {
    await progressApi.completeSession(id);
    await get().fetchCalendarEvents();
    await get().fetchProgress();
  },

  skipSession: async (id, reason) => {
    await progressApi.skipSession(id, reason);
    await get().fetchCalendarEvents();
    await get().fetchProgress();
  },

  fetchProgress: async () => {
    try {
      const { data } = await progressApi.getSummary();
      set({ progress: data });
    } catch {
      // ignore
    }
  },
}));

export default useStore;

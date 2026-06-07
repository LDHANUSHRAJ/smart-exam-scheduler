// API Client — Axios instance with JWT interceptor

import axios from 'axios';
import type { 
  TokenResponse, User, Exam, ExamCreate, Topic, TopicCreate,
  StudyPlan, GeneratePlanRequest, CalendarEvent, ProgressSummary,
  HeatmapEntry, ConflictSummary
} from '../types';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: `${API_BASE}/api/v1`,
  headers: { 'Content-Type': 'application/json' },
});

// JWT interceptor — auto-attach access token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auto-refresh on 401
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      const refreshToken = localStorage.getItem('refresh_token');
      if (refreshToken) {
        try {
          const { data } = await axios.post<TokenResponse>(
            `${API_BASE}/api/v1/auth/refresh`,
            { refresh_token: refreshToken }
          );
          localStorage.setItem('access_token', data.access_token);
          localStorage.setItem('refresh_token', data.refresh_token);
          original.headers.Authorization = `Bearer ${data.access_token}`;
          return api(original);
        } catch {
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

// ---------- Auth ----------
export const authApi = {
  register: (email: string, password: string, full_name?: string) =>
    api.post<User>('/auth/register', { email, password, full_name }),
  login: (email: string, password: string) =>
    api.post<TokenResponse>('/auth/login', { email, password }),
  getMe: () => api.get<User>('/auth/me'),
  updateConstraints: (data: Partial<{ daily_study_hours: number; sleep_start_hour: number; sleep_end_hour: number }>) =>
    api.put<User>('/auth/me/constraints', data),
};

// ---------- Exams ----------
export const examsApi = {
  create: (data: ExamCreate) => api.post<Exam>('/exams/', data),
  list: () => api.get<Exam[]>('/exams/'),
  update: (id: string, data: Partial<ExamCreate>) => api.put<Exam>(`/exams/${id}`, data),
  delete: (id: string) => api.delete(`/exams/${id}`),
  getConflicts: () => api.get<ConflictSummary>('/exams/conflicts'),
};

// ---------- Topics ----------
export const topicsApi = {
  create: (data: TopicCreate) => api.post<Topic>('/topics/', data),
  getForExam: (examId: string) => api.get<Topic[]>(`/topics/exam/${examId}`),
  update: (id: string, data: Partial<TopicCreate>) => api.put<Topic>(`/topics/${id}`, data),
  updateProgress: (id: string, completion_percent: number) =>
    api.put<Topic>(`/topics/${id}/progress`, { completion_percent }),
  delete: (id: string) => api.delete(`/topics/${id}`),
  upload: (examId: string, file: File) => {
    const formData = new FormData();
    formData.append('exam_id', examId);
    formData.append('file', file);
    return api.post<Topic[]>('/topics/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};


// ---------- Plans ----------
export const plansApi = {
  generate: (data: GeneratePlanRequest) => api.post<StudyPlan>('/plans/generate', data),
  getActive: () => api.get('/plans/active'),
  getCalendar: () => api.get<CalendarEvent[]>('/plans/calendar'),
  getDay: (date: string) => api.get(`/plans/day/${date}`),
};

// ---------- Progress ----------
export const progressApi = {
  completeSession: (id: string, actual_duration_minutes?: number) =>
    api.put(`/progress/session/${id}/complete`, { actual_duration_minutes }),
  skipSession: (id: string, reason?: string) =>
    api.put(`/progress/session/${id}/skip`, { reason }),
  getSummary: () => api.get<ProgressSummary>('/progress/summary'),
  getHeatmap: () => api.get<{ entries: HeatmapEntry[]; subjects: string[] }>('/progress/heatmap'),
};

export default api;

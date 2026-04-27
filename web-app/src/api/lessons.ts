import { apiClient } from '@/api/api-client';

export interface LessonData {
  id: string;
  title: string;
  objective: string;
  status: string;
  created_at: string;
}

export interface CreateLessonRequest {
  title: string;
  objective: string;
}

export async function createLesson(data: CreateLessonRequest): Promise<LessonData> {
  const response = await apiClient.post<LessonData>('/lessons', data);
  return response.data;
}

export async function getLesson(lessonId: string): Promise<LessonData> {
  const response = await apiClient.get<LessonData>(`/lessons/${lessonId}`);
  return response.data;
}

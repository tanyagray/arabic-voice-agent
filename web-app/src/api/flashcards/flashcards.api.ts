import { apiClient } from '../api-client';
import type { FlashcardSet } from './flashcards.types';

export async function getFlashcardSet(setId: string): Promise<FlashcardSet> {
  const { data } = await apiClient.get<FlashcardSet>(`/flashcards/${setId}`);
  return data;
}

export async function getPublicFlashcardSet(setId: string): Promise<FlashcardSet> {
  const { data } = await apiClient.get<FlashcardSet>(`/flashcards/${setId}/public`);
  return data;
}

export async function toggleFlashcardSetPublic(
  setId: string,
  isPublic: boolean,
): Promise<FlashcardSet> {
  const { data } = await apiClient.patch<FlashcardSet>(`/flashcards/${setId}`, {
    is_public: isPublic,
  });
  return data;
}

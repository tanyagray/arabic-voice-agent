export interface Flashcard {
  id: string;
  set_id: string;
  ordinal: number;
  arabic_text: string;
  transliteration: string;
  english: string;
  image_url: string | null;
  audio_url: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface FlashcardSet {
  id: string;
  title: string;
  description: string | null;
  language: string;
  status: string;
  is_public: boolean;
  error: string | null;
  cards: Flashcard[];
  created_by: string;
  created_at: string;
  updated_at: string;
}

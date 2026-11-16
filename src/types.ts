export type GradeGroup = "grade_1_2" | "grade_4_plus" | "grade_6";

export interface TagStat {
  tag: string;
  count: number;
  type?: string;
}

export interface StudentUser {
  id: string;
  name: string;
  grade_label: string;
  grade_group: GradeGroup;
  age: number;
  level: string;
  current_book_id: string;
  pin_code?: string;
  teacher_id?: string;
  classcard_level?: number;
  classcard_mode?: "both" | "phonics_only" | "book_only";
  progress_w1: number;
  progress_w2: number;
  progress_w3: number;
  progress_w4: number;
  audio_w1_url: string;
  audio_w4_url: string;
  w1_wpm: number;
  w4_wpm: number;
  w1_accuracy: number;
  w4_accuracy: number;
  strengths: TagStat[];
  weaknesses: TagStat[];
}

export interface TeacherAccount {
  id: string;
  name: string;
  role: "director" | "teacher";
  title_label: string;
  email: string;
  created_at?: string;
}

export interface VocabItem {
  word: string;
  surface?: string;
  meaning_kr: string;
  phonetic?: string;
  pos?: string;
  popo_tip?: string;
}

export interface ChunkItem {
  id?: string;
  sentence_index?: number;
  text: string;
  meaning_kr: string;
}

export interface CoreExpression {
  rank?: number;
  expression: string;
  meaning_kr: string;
  pattern_note?: string;
}

export interface SentenceTranslation {
  index: number;
  en: string;
  kr: string;
}

export interface SpeakingQuestion {
  en: string;
  kr: string;
  target: string;
  expression?: string;
}

export interface PageIllustration {
  page_index: number;
  scene_caption_kr?: string;
  key_objects?: string[];
  image_url?: string;
  svg?: string;
}

export interface BookWorksheets {
  week1?: {
    title_kr: string;
    vocab_test: { word: string; meaning_kr: string; hint?: string }[];
    comprehension: { question_kr: string; answer_hint_kr: string }[];
  };
  week2?: {
    title_kr: string;
    chunk_writing: { en: string; kr: string }[];
    fill_blanks: { sentence_blank: string; answer: string; kr: string }[];
  };
  week3_4?: {
    title_kr: string;
    sentence_copy: { en: string; kr: string }[];
    my_expressions: { base_sentence: string; swap_guide_kr: string; example_en: string }[];
  };
}

export interface Book {
  id: string;
  title: string;
  subtitle_kr: string;
  level: string;
  grade_recommended?: string;
  full_text: string;
  cover_theme?: string;
  vocab: VocabItem[];
  chunks: ChunkItem[];
  core_expressions: CoreExpression[];
  sentence_translations?: SentenceTranslation[];
  speaking_questions?: SpeakingQuestion[];
  page_illustrations?: PageIllustration[];
  worksheets?: BookWorksheets;
}

export interface TeacherQuestion {
  id: string;
  category: string;
  question_en: string;
  coaching_tip_kr: string;
  target_chunk: string;
}

export interface PopoFeedback {
  evaluation_status: string;
  accuracy_score?: number;
  student_utterance?: string;
  popo_response_template: {
    step1_encourage: string;
    step2_correction: string;
    step3_retry: string;
  };
}

export interface BookPageSpread {
  pageIndex: number;
  sentences: {
    sentenceIndex: number;
    en: string;
    kr: string;
  }[];
}

export interface StudentRecording {
  id: string;
  user_id: string;
  book_id: string;
  week_num: number;
  repeat_num: number;
  transcript: string;
  audio_data_url: string;
  ai_feedback?: {
    score?: number;
    weak_words?: string[];
    pronunciation_tip_kr?: string;
    intonation_tip_kr?: string;
  };
  created_at: string;
}

export interface PhonicsCurriculumWord {
  word: string;
  pattern: string;
  meaning_kr: string;
  tip_kr: string;
  example_en: string;
}

export interface BasicVocabularyWord {
  word: string;
  category: string;
  meaning_kr: string;
  example_en: string;
}

export interface PhonicsCurriculumTier {
  id: string;
  level_label: string;
  title_kr: string;
  desc_kr: string;
  sort_order: number;
  phonics_words: PhonicsCurriculumWord[];
  basic_words: BasicVocabularyWord[];
}


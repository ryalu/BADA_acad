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
  completed_books?: string[];
  daily_study_dates?: Record<string, string>;
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
  text_hash?: string;
  cover_theme?: string;
  vocab: VocabItem[];
  chunks: ChunkItem[];
  core_expressions: CoreExpression[];
  sentence_translations?: SentenceTranslation[];
  speaking_questions?: SpeakingQuestion[];
  page_illustrations?: PageIllustration[];
  worksheets?: BookWorksheets;
  has_illustrations?: boolean;
  has_worksheets?: boolean;
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

export type VocabTier = "all" | "elem_800" | "mid_high";
export type VocabInputMode = "tiles" | "typing";
export type VocabS1QuizMode = "meaning" | "picture_to_word" | "mixed";

export interface VocabUnit {
  id: string;
  tier: string;
  stage: 1 | 2 | 3;
  unit_key: string;
  title_kr: string;
  rule_summary_kr: string;
  word_count: number;
  sort_order: number;
}

export interface VocabPhonicsSpan {
  unit_id: string;
  pattern: string;
  start: number;
  end: number;
  silent_e_index?: number;
  sound_kr?: string;
}

export interface VocabWord {
  id: string;
  word: string;
  display_word: string;
  meaning_kr: string;
  initial_letter: string;
  is_elem_800: boolean;
  is_mid_high: boolean;
  elem_no: number | null;
  mh_no: number | null;
  elem_unit_key: string | null;
  mh_unit_key: string | null;
  image_url?: string | null;
  is_abstract?: boolean;
  phonics_spans: VocabPhonicsSpan[];
  phonics_unit_ids: string[];
}

export interface VocabAffixItem {
  id: string;
  unit_id: string;
  affix: string;
  affix_type: "prefix" | "suffix";
  affix_meaning_kr: string;
  root_word: string;
  root_meaning_kr: string;
  root_pos: string;
  derived_word: string;
  derived_meaning_kr: string;
  derived_pos: string;
  explanation_kr: string;
  root_in_pdf: boolean;
  derived_in_pdf: boolean;
  sort_order: number;
}

export interface StudentVocabProgress {
  user_id: string;
  vocab_tier: VocabTier;
  s1_quiz_mode: VocabS1QuizMode;
  current_stage: 1 | 2 | 3;
  current_unit_key: string;
  unit_started_at: string;
  completed_s1_units: string[];
  early_test_unlocked: boolean;
  current_s2_unit: string;
  s2_input_mode: VocabInputMode;
  completed_s2_units: string[];
  current_s3_unit: string;
  completed_s3_units: string[];
  pronunciation_done_date?: string | null;
  pronunciation_cycle?: PronunciationCycleState;
  updated_at?: string;
}

export interface StudentVocabAttempt {
  id: string;
  user_id: string;
  tier: string;
  stage: number;
  unit_key: string;
  attempt_type: string;
  total_count: number;
  correct_count: number;
  score_pct: number;
  passed: boolean;
  wrong_word_ids: string[];
  created_at: string;
}

export interface StudentVocabState {
  progress: StudentVocabProgress;
  todayKst: string;
  daysElapsed: number;
  monthReady: boolean;
  todayQuizAttempted?: boolean;
  todayPronunciationDone?: boolean;
  todayDailyQuizDone: boolean;
  nextPronunciationMode?: PronunciationMode;
  recentWrongWordIds: string[];
  stage1ByTier?: Record<VocabTier, VocabUnit[]>;
  units: {
    stage1: VocabUnit[];
    stage2: VocabUnit[];
    stage3: VocabUnit[];
  };
  recentAttempts: StudentVocabAttempt[];
}

export interface VocabStage1Question {
  wordId: string;
  word: string;
  displayWord: string;
  initialLetter: string;
  questionType?: "meaning" | "picture_to_word";
  imageUrl?: string | null;
  correctMeaning: string;
  correctAnswer?: string;
  options: string[];
}

export type PronunciationMode = "day1_listen" | "day2_speak";

export interface PronunciationCycleState {
  unit_scope?: string;
  pending_speak_words?: Array<{
    wordId?: string;
    word: string;
    meaningKr?: string;
    imageUrl?: string | null;
    ruleId?: string;
    phonicsLabel?: string;
    focusText?: string;
    matchStart?: number;
    matchEnd?: number;
    titleKr?: string;
    mouthTipKr?: string;
  }>;
  pending_created_date?: string | null;
  practiced_word_ids?: string[];
  last_mode?: PronunciationMode | null;
  last_completed_date?: string | null;
}

export interface PronunciationFocusOption {
  wordId: string;
  word: string;
  meaningKr: string;
  phonicsLabel: string;
  focusText: string;
  matchStart: number;
  matchEnd: number;
  isCorrect: boolean;
}

export interface PronunciationFocusItem {
  wordId: string;
  word: string;
  meaningKr: string;
  imageUrl?: string | null;
  ruleId: string;
  phonicsLabel: string;
  focusText: string;
  matchStart: number;
  matchEnd: number;
  titleKr: string;
  mouthTipKr: string;
  priority?: number;
  listenPromptKr?: string;
  listenOptions?: PronunciationFocusOption[];
  speakPromptKr?: string;
}

export interface PronunciationEvalResult {
  ok: boolean;
  passed: boolean;
  softPassed: boolean;
  heardText: string;
  confidence: number;
  feedbackKr: string;
  tipKr: string;
}

export interface VocabStage2Question {
  wordId: string;
  word: string;
  meaningKr: string;
  maskedWord: string;
  targetPattern: string;
  targetLetters?: string[];
  letterOptions?: string[];
  soundKr: string;
  span?: VocabPhonicsSpan;
  tileOptions: string[];
}

export interface VocabStage3Question {
  itemId: string;
  affix: string;
  affixType: "prefix" | "suffix";
  affixMeaningKr: string;
  rootWord: string;
  rootMeaningKr: string;
  rootPos: string;
  derivedWord: string;
  derivedMeaningKr: string;
  derivedPos: string;
  explanationKr: string;
  meaningOptions: string[];
  affixOptions: string[];
}

export interface VocabAttemptResult {
  id: string;
  score_pct: number;
  passed: boolean;
  total_count: number;
  correct_count: number;
  advancedToUnit: string | null;
  advancedToStage?: 2 | 3 | null;
  needsExtraMonth: boolean;
}


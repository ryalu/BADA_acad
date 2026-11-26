-- ============================================================================
-- BADA English (바다 영어) PostgreSQL Schema
-- 로컬 PostgreSQL 및 클라우드 PostgreSQL (Railway, Supabase, Neon, RDS) 공용
-- ============================================================================

CREATE TABLE IF NOT EXISTS teachers (
  id VARCHAR(80) PRIMARY KEY,
  name VARCHAR(80) NOT NULL,
  role VARCHAR(40) NOT NULL DEFAULT 'teacher',
  title_label VARCHAR(80) NOT NULL DEFAULT '담임 강사',
  email VARCHAR(120) UNIQUE NOT NULL,
  password_hash VARCHAR(128) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS books (
  id VARCHAR(120) PRIMARY KEY,
  title TEXT NOT NULL,
  subtitle_kr TEXT NOT NULL,
  level VARCHAR(50) NOT NULL,
  grade_recommended VARCHAR(80) NOT NULL,
  full_text TEXT NOT NULL,
  text_hash VARCHAR(64) NOT NULL,
  cover_theme VARCHAR(40) DEFAULT 'aqua'
);

CREATE TABLE IF NOT EXISTS vocab_chunks (
  text_hash VARCHAR(64) PRIMARY KEY,
  book_id VARCHAR(120),
  raw_text TEXT NOT NULL,
  vocab_json JSONB NOT NULL,
  chunks_json JSONB NOT NULL,
  core_expressions_json JSONB NOT NULL,
  sentence_translations_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  speaking_questions_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  lookup_count INTEGER DEFAULT 1,
  extraction_source VARCHAR(60) DEFAULT 'LLM_INITIAL_EXTRACT',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_hit_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(80) PRIMARY KEY,
  name VARCHAR(80) NOT NULL,
  grade_label VARCHAR(60) NOT NULL,
  grade_group VARCHAR(40) NOT NULL,
  age INTEGER NOT NULL,
  level VARCHAR(40) NOT NULL,
  current_book_id VARCHAR(120) NOT NULL,
  pin_code VARCHAR(10) NOT NULL DEFAULT '1234',
  teacher_id VARCHAR(80) NOT NULL DEFAULT 'tch_director',
  classcard_level INTEGER NOT NULL DEFAULT 2,
  progress_w1 INTEGER DEFAULT 0,
  progress_w2 INTEGER DEFAULT 0,
  progress_w3 INTEGER DEFAULT 0,
  progress_w4 INTEGER DEFAULT 0,
  audio_w1_url TEXT NOT NULL,
  audio_w4_url TEXT NOT NULL,
  w1_wpm INTEGER DEFAULT 38,
  w4_wpm INTEGER DEFAULT 94,
  w1_accuracy INTEGER DEFAULT 64,
  w4_accuracy INTEGER DEFAULT 96,
  strengths_json JSONB NOT NULL,
  weaknesses_json JSONB NOT NULL
);

-- Safe schema migration for existing deployments
ALTER TABLE users ADD COLUMN IF NOT EXISTS pin_code VARCHAR(10) NOT NULL DEFAULT '1234';
ALTER TABLE users ADD COLUMN IF NOT EXISTS teacher_id VARCHAR(80) NOT NULL DEFAULT 'tch_director';
ALTER TABLE users ADD COLUMN IF NOT EXISTS classcard_level INTEGER NOT NULL DEFAULT 2;
ALTER TABLE users ADD COLUMN IF NOT EXISTS classcard_mode VARCHAR(30) NOT NULL DEFAULT 'both';
ALTER TABLE users ADD COLUMN IF NOT EXISTS completed_books_json JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE users ADD COLUMN IF NOT EXISTS daily_study_dates_json JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE vocab_chunks ADD COLUMN IF NOT EXISTS sentence_translations_json JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE vocab_chunks ADD COLUMN IF NOT EXISTS speaking_questions_json JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE vocab_chunks ADD COLUMN IF NOT EXISTS page_illustrations_json JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE vocab_chunks ADD COLUMN IF NOT EXISTS worksheets_json JSONB NOT NULL DEFAULT '{}'::jsonb;

CREATE TABLE IF NOT EXISTS cache_audit_logs (
  id SERIAL PRIMARY KEY,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  text_preview TEXT NOT NULL,
  text_hash VARCHAR(64) NOT NULL,
  status VARCHAR(60) NOT NULL,
  detail TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS student_recordings (
  id VARCHAR(80) PRIMARY KEY,
  user_id VARCHAR(80) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  book_id VARCHAR(80) NOT NULL,
  week_num INTEGER NOT NULL DEFAULT 1,
  repeat_num INTEGER NOT NULL DEFAULT 1,
  transcript TEXT DEFAULT '',
  audio_data_url TEXT NOT NULL,
  ai_feedback_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tts_audio_cache (
  cache_key VARCHAR(255) PRIMARY KEY,
  content_type VARCHAR(60) NOT NULL DEFAULT 'audio/mpeg',
  audio_bytes BYTEA NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS phonics_curriculum (
  id VARCHAR(60) PRIMARY KEY,
  level_label VARCHAR(80) NOT NULL,
  title_kr VARCHAR(120) NOT NULL,
  desc_kr TEXT NOT NULL,
  phonics_words_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  basic_words_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  sort_order INTEGER NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_books_text_hash ON books(text_hash);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON cache_audit_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_student_recordings_user ON student_recordings(user_id, created_at DESC);

-- ============================================================================
-- 3-STAGE VOCABULARY LEARNING (A-Z / PHONICS VISUALIZATION / AFFIX EXPANSION)
-- ============================================================================
CREATE TABLE IF NOT EXISTS vocab_bank (
  id VARCHAR(120) PRIMARY KEY,
  word VARCHAR(120) UNIQUE NOT NULL,
  display_word VARCHAR(140) NOT NULL,
  meaning_kr TEXT NOT NULL,
  initial_letter VARCHAR(4) NOT NULL,
  is_elem_800 BOOLEAN NOT NULL DEFAULT FALSE,
  is_mid_high BOOLEAN NOT NULL DEFAULT FALSE,
  elem_no INTEGER,
  mh_no INTEGER,
  elem_unit_key VARCHAR(30),
  mh_unit_key VARCHAR(30),
  image_url TEXT,
  is_abstract BOOLEAN NOT NULL DEFAULT FALSE,
  phonics_spans_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  phonics_unit_ids_json JSONB NOT NULL DEFAULT '[]'::jsonb
);

CREATE TABLE IF NOT EXISTS vocab_units (
  id VARCHAR(80) PRIMARY KEY,
  tier VARCHAR(20) NOT NULL,
  stage INTEGER NOT NULL,
  unit_key VARCHAR(40) NOT NULL,
  title_kr VARCHAR(140) NOT NULL,
  rule_summary_kr TEXT NOT NULL,
  word_count INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS vocab_affix_items (
  id VARCHAR(100) PRIMARY KEY,
  unit_id VARCHAR(80) NOT NULL,
  affix VARCHAR(30) NOT NULL,
  affix_type VARCHAR(20) NOT NULL,
  affix_meaning_kr VARCHAR(120) NOT NULL,
  root_word VARCHAR(80) NOT NULL,
  root_meaning_kr VARCHAR(140) NOT NULL,
  root_pos VARCHAR(40) NOT NULL,
  derived_word VARCHAR(80) NOT NULL,
  derived_meaning_kr VARCHAR(140) NOT NULL,
  derived_pos VARCHAR(40) NOT NULL,
  explanation_kr TEXT NOT NULL,
  root_in_pdf BOOLEAN NOT NULL DEFAULT TRUE,
  derived_in_pdf BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS student_vocab_progress (
  user_id VARCHAR(80) PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  vocab_tier VARCHAR(20) NOT NULL DEFAULT 'all',
  s1_quiz_mode VARCHAR(20) NOT NULL DEFAULT 'meaning',
  current_stage INTEGER NOT NULL DEFAULT 1,
  current_unit_key VARCHAR(40) NOT NULL DEFAULT 'A',
  unit_started_at VARCHAR(20) NOT NULL,
  completed_s1_units_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  early_test_unlocked BOOLEAN NOT NULL DEFAULT FALSE,
  current_s2_unit VARCHAR(60) NOT NULL DEFAULT 's2_long_a',
  s2_input_mode VARCHAR(20) NOT NULL DEFAULT 'tiles',
  completed_s2_units_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  current_s3_unit VARCHAR(60) NOT NULL DEFAULT 's3_pre_un',
  completed_s3_units_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  pronunciation_done_date VARCHAR(20),
  pronunciation_cycle_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE vocab_bank ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE vocab_bank ADD COLUMN IF NOT EXISTS is_abstract BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE student_vocab_progress ADD COLUMN IF NOT EXISTS s1_quiz_mode VARCHAR(20) NOT NULL DEFAULT 'meaning';
ALTER TABLE student_vocab_progress ADD COLUMN IF NOT EXISTS pronunciation_done_date VARCHAR(20);
ALTER TABLE student_vocab_progress ADD COLUMN IF NOT EXISTS pronunciation_cycle_json JSONB NOT NULL DEFAULT '{}'::jsonb;

CREATE TABLE IF NOT EXISTS student_vocab_attempts (
  id VARCHAR(100) PRIMARY KEY,
  user_id VARCHAR(80) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tier VARCHAR(20) NOT NULL,
  stage INTEGER NOT NULL,
  unit_key VARCHAR(40) NOT NULL,
  attempt_type VARCHAR(20) NOT NULL,
  total_count INTEGER NOT NULL,
  correct_count INTEGER NOT NULL,
  score_pct INTEGER NOT NULL,
  passed BOOLEAN NOT NULL DEFAULT FALSE,
  wrong_word_ids_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vocab_bank_letter ON vocab_bank(initial_letter);
CREATE INDEX IF NOT EXISTS idx_vocab_bank_elem_unit ON vocab_bank(elem_unit_key);
CREATE INDEX IF NOT EXISTS idx_vocab_bank_mh_unit ON vocab_bank(mh_unit_key);
CREATE INDEX IF NOT EXISTS idx_vocab_units_stage ON vocab_units(stage, tier, sort_order);
CREATE INDEX IF NOT EXISTS idx_vocab_attempts_user ON student_vocab_attempts(user_id, stage, created_at DESC);

-- ============================================================================
-- SEASONAL BONUS SONGS (CHRISTMAS CAROLS / POP SONGS / YOUTUBE & MP3)
-- ============================================================================
CREATE TABLE IF NOT EXISTS seasonal_songs (
  id VARCHAR(80) PRIMARY KEY,
  season_key VARCHAR(40) NOT NULL DEFAULT 'christmas',
  season_label VARCHAR(100) NOT NULL DEFAULT '12월 크리스마스 스페셜',
  track VARCHAR(20) NOT NULL DEFAULT 'junior',
  title TEXT NOT NULL,
  subtitle_kr TEXT NOT NULL DEFAULT '',
  artist_label TEXT NOT NULL DEFAULT 'Traditional Christmas Carol',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  youtube_url TEXT NOT NULL DEFAULT '',
  audio_mime VARCHAR(80) NOT NULL DEFAULT '',
  audio_filename TEXT NOT NULL DEFAULT '',
  audio_bytes BYTEA,
  raw_lyrics TEXT NOT NULL DEFAULT '',
  lines_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  vocab_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS student_song_progress (
  id VARCHAR(160) PRIMARY KEY,
  user_id VARCHAR(80) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  song_id VARCHAR(80) NOT NULL REFERENCES seasonal_songs(id) ON DELETE CASCADE,
  week1_done BOOLEAN NOT NULL DEFAULT FALSE,
  week2_done BOOLEAN NOT NULL DEFAULT FALSE,
  week3_done BOOLEAN NOT NULL DEFAULT FALSE,
  week4_done BOOLEAN NOT NULL DEFAULT FALSE,
  practice_days_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  quiz_best_score INTEGER NOT NULL DEFAULT 0,
  recording_id VARCHAR(80),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_seasonal_songs_track ON seasonal_songs(is_active, track, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_student_song_progress_user ON student_song_progress(user_id, song_id);

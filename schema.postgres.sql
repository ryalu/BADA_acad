-- ============================================================================
-- BADA English (바다 영어) PostgreSQL Schema
-- 로컬 PostgreSQL 또는 클라우드 PostgreSQL (Supabase, Neon, Railway, RDS) 공용
-- ============================================================================

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
  progress_w1 INTEGER DEFAULT 100,
  progress_w2 INTEGER DEFAULT 100,
  progress_w3 INTEGER DEFAULT 90,
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

CREATE TABLE IF NOT EXISTS cache_audit_logs (
  id SERIAL PRIMARY KEY,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  text_preview TEXT NOT NULL,
  text_hash VARCHAR(64) NOT NULL,
  status VARCHAR(60) NOT NULL,
  detail TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_books_text_hash ON books(text_hash);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON cache_audit_logs(timestamp DESC);


/**
 * Database connection management (PostgreSQL Primary + SQLite Fallback),
 * shared schema initialization, hashing, JSON parsing, and KST date utilities.
 */

const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { DatabaseSync } = require("node:sqlite");
const { analyzeTextWithLLM } = require("../ai-engine");
const {
  INITIAL_TEACHERS,
  INITIAL_BOOKS,
  INITIAL_USERS,
  INITIAL_PHONICS_CURRICULUM
} = require("./seeds");

const ROOT_DIR = path.resolve(__dirname, "..");

function loadDotEnv() {
  const envPath = path.join(ROOT_DIR, ".env");
  if (!fs.existsSync(envPath)) return;
  const lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim().replace(/^['"]|['"]$/g, "");
    if (!(key in process.env)) {
      process.env[key] = val;
    }
  }
}

loadDotEnv();

function hashPassword(pw) {
  return crypto
    .createHash("sha256")
    .update(`bada_salt_v1:${String(pw || "").trim()}`)
    .digest("hex");
}

function hashText(text) {
  return crypto
    .createHash("sha256")
    .update(text.trim().replace(/\s+/g, " ").toLowerCase())
    .digest("hex")
    .slice(0, 24);
}

/**
 * Safely parses JSONB values (object/array in PostgreSQL or string in SQLite)
 * supporting both arrays and plain objects depending on `fallback`.
 */
function parseJsonField(val, fallback = []) {
  const expectArray = Array.isArray(fallback);
  if (val == null) return fallback;
  if (expectArray && Array.isArray(val)) return val;
  if (!expectArray && typeof val === "object" && !Array.isArray(val)) return val;
  if (typeof val !== "string") return fallback;
  try {
    const parsed = JSON.parse(val);
    if (expectArray) return Array.isArray(parsed) ? parsed : fallback;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : fallback;
  } catch (_) {
    return fallback;
  }
}

function getKstTodayDateString() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date());
}

// ============================================================================
// ENGINE 1: SQLITE FALLBACK / LOCAL CACHE
// ============================================================================
const DB_PATH = path.join(ROOT_DIR, "bada_english.sqlite");
const sqliteDb = new DatabaseSync(DB_PATH);

function initSqliteDatabase() {
  sqliteDb.exec(`
    CREATE TABLE IF NOT EXISTS teachers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'teacher',
      title_label TEXT NOT NULL DEFAULT '전담 코칭 강사',
      email TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS books (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      subtitle_kr TEXT NOT NULL,
      level TEXT NOT NULL,
      grade_recommended TEXT NOT NULL,
      full_text TEXT NOT NULL,
      text_hash TEXT NOT NULL,
      cover_theme TEXT DEFAULT 'aqua'
    );

    CREATE TABLE IF NOT EXISTS vocab_chunks (
      text_hash TEXT PRIMARY KEY,
      book_id TEXT,
      raw_text TEXT NOT NULL,
      vocab_json TEXT NOT NULL,
      chunks_json TEXT NOT NULL,
      core_expressions_json TEXT NOT NULL,
      sentence_translations_json TEXT DEFAULT '[]',
      speaking_questions_json TEXT DEFAULT '[]',
      lookup_count INTEGER DEFAULT 1,
      extraction_source TEXT DEFAULT 'LLM_INITIAL_EXTRACT',
      created_at TEXT NOT NULL,
      last_hit_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      grade_label TEXT NOT NULL,
      grade_group TEXT NOT NULL,
      age INTEGER NOT NULL,
      level TEXT NOT NULL,
      current_book_id TEXT NOT NULL,
      pin_code TEXT NOT NULL DEFAULT '1234',
      teacher_id TEXT DEFAULT 'tch_emma',
      classcard_level INTEGER DEFAULT 2,
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
      strengths_json TEXT NOT NULL,
      weaknesses_json TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS cache_audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp TEXT NOT NULL,
      text_preview TEXT NOT NULL,
      text_hash TEXT NOT NULL,
      status TEXT NOT NULL,
      detail TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS student_recordings (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      book_id TEXT NOT NULL,
      week_num INTEGER NOT NULL DEFAULT 1,
      repeat_num INTEGER NOT NULL DEFAULT 1,
      transcript TEXT DEFAULT '',
      audio_data_url TEXT NOT NULL,
      ai_feedback_json TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS tts_audio_cache (
      cache_key TEXT PRIMARY KEY,
      content_type TEXT NOT NULL DEFAULT 'audio/mpeg',
      audio_bytes BLOB NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS phonics_curriculum (
      id TEXT PRIMARY KEY,
      level_label TEXT NOT NULL,
      title_kr TEXT NOT NULL,
      desc_kr TEXT NOT NULL,
      phonics_words_json TEXT NOT NULL DEFAULT '[]',
      basic_words_json TEXT NOT NULL DEFAULT '[]',
      sort_order INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS vocab_bank (
      id TEXT PRIMARY KEY,
      word TEXT UNIQUE NOT NULL,
      display_word TEXT NOT NULL,
      meaning_kr TEXT NOT NULL,
      initial_letter TEXT NOT NULL,
      is_elem_800 INTEGER NOT NULL DEFAULT 0,
      is_mid_high INTEGER NOT NULL DEFAULT 0,
      elem_no INTEGER,
      mh_no INTEGER,
      elem_unit_key TEXT,
      mh_unit_key TEXT,
      image_url TEXT,
      is_abstract INTEGER NOT NULL DEFAULT 0,
      phonics_spans_json TEXT NOT NULL DEFAULT '[]',
      phonics_unit_ids_json TEXT NOT NULL DEFAULT '[]'
    );

    CREATE TABLE IF NOT EXISTS vocab_units (
      id TEXT PRIMARY KEY,
      tier TEXT NOT NULL,
      stage INTEGER NOT NULL,
      unit_key TEXT NOT NULL,
      title_kr TEXT NOT NULL,
      rule_summary_kr TEXT NOT NULL,
      word_count INTEGER NOT NULL DEFAULT 0,
      sort_order INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS vocab_affix_items (
      id TEXT PRIMARY KEY,
      unit_id TEXT NOT NULL,
      affix TEXT NOT NULL,
      affix_type TEXT NOT NULL,
      affix_meaning_kr TEXT NOT NULL,
      root_word TEXT NOT NULL,
      root_meaning_kr TEXT NOT NULL,
      root_pos TEXT NOT NULL,
      derived_word TEXT NOT NULL,
      derived_meaning_kr TEXT NOT NULL,
      derived_pos TEXT NOT NULL,
      explanation_kr TEXT NOT NULL,
      root_in_pdf INTEGER NOT NULL DEFAULT 1,
      derived_in_pdf INTEGER NOT NULL DEFAULT 0,
      sort_order INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS student_vocab_progress (
      user_id TEXT PRIMARY KEY,
      vocab_tier TEXT NOT NULL DEFAULT 'all',
      s1_quiz_mode TEXT NOT NULL DEFAULT 'meaning',
      current_stage INTEGER NOT NULL DEFAULT 1,
      current_unit_key TEXT NOT NULL DEFAULT 'A',
      unit_started_at TEXT NOT NULL,
      completed_s1_units_json TEXT NOT NULL DEFAULT '[]',
      early_test_unlocked INTEGER NOT NULL DEFAULT 0,
      current_s2_unit TEXT NOT NULL DEFAULT 's2_long_a',
      s2_input_mode TEXT NOT NULL DEFAULT 'tiles',
      completed_s2_units_json TEXT NOT NULL DEFAULT '[]',
      current_s3_unit TEXT NOT NULL DEFAULT 's3_pre_un',
      completed_s3_units_json TEXT NOT NULL DEFAULT '[]',
      pronunciation_done_date TEXT,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS student_vocab_attempts (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      tier TEXT NOT NULL,
      stage INTEGER NOT NULL,
      unit_key TEXT NOT NULL,
      attempt_type TEXT NOT NULL,
      total_count INTEGER NOT NULL,
      correct_count INTEGER NOT NULL,
      score_pct INTEGER NOT NULL,
      passed INTEGER NOT NULL DEFAULT 0,
      wrong_word_ids_json TEXT NOT NULL DEFAULT '[]',
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_vocab_bank_letter ON vocab_bank(initial_letter);
    CREATE INDEX IF NOT EXISTS idx_vocab_bank_elem_unit ON vocab_bank(elem_unit_key);
    CREATE INDEX IF NOT EXISTS idx_vocab_bank_mh_unit ON vocab_bank(mh_unit_key);
    CREATE INDEX IF NOT EXISTS idx_vocab_units_stage ON vocab_units(stage, tier, sort_order);
    CREATE INDEX IF NOT EXISTS idx_vocab_attempts_user ON student_vocab_attempts(user_id, stage, created_at DESC);
  `);

  const upsertPhonicsStmt = sqliteDb.prepare(`
    INSERT INTO phonics_curriculum (id, level_label, title_kr, desc_kr, phonics_words_json, basic_words_json, sort_order)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      level_label = excluded.level_label,
      title_kr = excluded.title_kr,
      desc_kr = excluded.desc_kr,
      phonics_words_json = excluded.phonics_words_json,
      basic_words_json = excluded.basic_words_json,
      sort_order = excluded.sort_order
  `);
  for (const tier of INITIAL_PHONICS_CURRICULUM) {
    upsertPhonicsStmt.run(
      tier.id,
      tier.level_label,
      tier.title_kr,
      tier.desc_kr,
      JSON.stringify(tier.phonics_words),
      JSON.stringify(tier.basic_words),
      tier.sort_order
    );
  }

  const alterStmts = [
    "ALTER TABLE users ADD COLUMN pin_code TEXT NOT NULL DEFAULT '1234'",
    "ALTER TABLE users ADD COLUMN teacher_id TEXT DEFAULT 'tch_director'",
    "ALTER TABLE users ADD COLUMN classcard_level INTEGER DEFAULT 2",
    "ALTER TABLE users ADD COLUMN classcard_mode TEXT DEFAULT 'both'",
    "ALTER TABLE users ADD COLUMN completed_books_json TEXT DEFAULT '[]'",
    "ALTER TABLE users ADD COLUMN daily_study_dates_json TEXT DEFAULT '{}'",
    "ALTER TABLE vocab_chunks ADD COLUMN sentence_translations_json TEXT DEFAULT '[]'",
    "ALTER TABLE vocab_chunks ADD COLUMN speaking_questions_json TEXT DEFAULT '[]'",
    "ALTER TABLE vocab_chunks ADD COLUMN page_illustrations_json TEXT DEFAULT '[]'",
    "ALTER TABLE vocab_chunks ADD COLUMN worksheets_json TEXT DEFAULT '{}'",
    "ALTER TABLE vocab_bank ADD COLUMN image_url TEXT",
    "ALTER TABLE vocab_bank ADD COLUMN is_abstract INTEGER NOT NULL DEFAULT 0",
    "ALTER TABLE student_vocab_progress ADD COLUMN s1_quiz_mode TEXT NOT NULL DEFAULT 'meaning'",
    "ALTER TABLE student_vocab_progress ADD COLUMN pronunciation_done_date TEXT"
  ];
  for (const sql of alterStmts) {
    try {
      sqliteDb.exec(sql);
    } catch (_) {
      // Column already exists
    }
  }

  sqliteDb.exec("UPDATE users SET teacher_id = 'tch_director' WHERE teacher_id = 'tch_emma'");
  sqliteDb.exec("DELETE FROM teachers WHERE id = 'tch_emma'");

  const teacherCount = sqliteDb.prepare("SELECT COUNT(*) AS cnt FROM teachers").get().cnt;
  if (teacherCount === 0) {
    const insertTeacher = sqliteDb.prepare(`
      INSERT INTO teachers (id, name, role, title_label, email, password_hash, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    const now = new Date().toISOString();
    for (const t of INITIAL_TEACHERS) {
      insertTeacher.run(t.id, t.name, t.role, t.title_label, t.email, hashPassword(t.password), now);
    }
  }

  const bookCount = sqliteDb.prepare("SELECT COUNT(*) AS cnt FROM books").get().cnt;
  if (bookCount === 0) {
    const insertBook = sqliteDb.prepare(`
      INSERT INTO books (id, title, subtitle_kr, level, grade_recommended, full_text, text_hash, cover_theme)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const insertVocab = sqliteDb.prepare(`
      INSERT OR IGNORE INTO vocab_chunks (
        text_hash, book_id, raw_text, vocab_json, chunks_json, core_expressions_json,
        sentence_translations_json, speaking_questions_json,
        lookup_count, extraction_source, created_at, last_hit_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, 'SEED_LLM_EXTRACTED', ?, ?)
    `);
    const now = new Date().toISOString();
    for (const b of INITIAL_BOOKS) {
      const tHash = hashText(b.full_text);
      insertBook.run(b.id, b.title, b.subtitle_kr, b.level, b.grade_recommended, b.full_text, tHash, b.cover_theme);
      const extracted = analyzeTextWithLLM(b.full_text, b.level);
      insertVocab.run(
        tHash,
        b.id,
        b.full_text.trim(),
        JSON.stringify(extracted.vocab),
        JSON.stringify(extracted.chunks),
        JSON.stringify(extracted.core_expressions),
        JSON.stringify(extracted.sentence_translations),
        JSON.stringify(extracted.speaking_questions),
        now,
        now
      );
    }

    const insertUser = sqliteDb.prepare(`
      INSERT INTO users (
        id, name, grade_label, grade_group, age, level, current_book_id,
        pin_code, teacher_id, classcard_level,
        progress_w1, progress_w2, progress_w3, progress_w4,
        audio_w1_url, audio_w4_url, w1_wpm, w4_wpm, w1_accuracy, w4_accuracy,
        strengths_json, weaknesses_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const u of INITIAL_USERS) {
      insertUser.run(
        u.id, u.name, u.grade_label, u.grade_group, u.age, u.level, u.current_book_id,
        u.pin_code || "1234", u.teacher_id || "tch_director", u.classcard_level || 2,
        u.progress_w1, u.progress_w2, u.progress_w3, u.progress_w4,
        u.audio_w1_url, u.audio_w4_url, u.w1_wpm, u.w4_wpm, u.w1_accuracy, u.w4_accuracy,
        JSON.stringify(u.strengths), JSON.stringify(u.weaknesses)
      );
    }
  }
}

// ============================================================================
// ENGINE 2: POSTGRESQL PRIMARY ENGINE (LOCAL OR CLOUD)
// ============================================================================
let pgPool = null;
let activeDbEngine = "sqlite";

async function initPostgresPoolIfConfigured() {
  const dbUrl = process.env.DATABASE_URL;
  const usePg = Boolean(dbUrl || process.env.PGHOST || process.env.USE_POSTGRES === "true");
  if (!usePg) {
    return false;
  }

  let Pool = null;
  try {
    ({ Pool } = require("pg"));
  } catch (_) {
    console.warn("⚠️ [BADA DB] 'pg' 패키지가 아직 설치되지 않아 내장 SQLite 모드로 동작합니다. (설치: npm install pg)");
    return false;
  }

  const poolConfig = dbUrl
    ? {
        connectionString: dbUrl,
        ssl: process.env.PGSSLMODE === "require" || (dbUrl.includes("supabase") || dbUrl.includes("neon.tech"))
          ? { rejectUnauthorized: false }
          : false
      }
    : {
        host: process.env.PGHOST || "localhost",
        port: Number(process.env.PGPORT) || 5432,
        user: process.env.PGUSER || "postgres",
        password: process.env.PGPASSWORD || "postgres",
        database: process.env.PGDATABASE || "bada_english"
      };

  try {
    const candidatePool = new Pool(poolConfig);
    await candidatePool.query("SELECT 1");

    const schemaSql = fs.readFileSync(path.join(ROOT_DIR, "schema.postgres.sql"), "utf8");
    await candidatePool.query(schemaSql);

    for (const tier of INITIAL_PHONICS_CURRICULUM) {
      await candidatePool.query(
        `INSERT INTO phonics_curriculum (id, level_label, title_kr, desc_kr, phonics_words_json, basic_words_json, sort_order)
         VALUES ($1, $2, $3, $4, $5::jsonb, $6::jsonb, $7)
         ON CONFLICT (id) DO UPDATE SET
           level_label = EXCLUDED.level_label,
           title_kr = EXCLUDED.title_kr,
           desc_kr = EXCLUDED.desc_kr,
           phonics_words_json = EXCLUDED.phonics_words_json,
           basic_words_json = EXCLUDED.basic_words_json,
           sort_order = EXCLUDED.sort_order`,
        [
          tier.id,
          tier.level_label,
          tier.title_kr,
          tier.desc_kr,
          JSON.stringify(tier.phonics_words),
          JSON.stringify(tier.basic_words),
          tier.sort_order
        ]
      );
    }

    await candidatePool.query("UPDATE users SET teacher_id = 'tch_director' WHERE teacher_id = 'tch_emma'");
    await candidatePool.query("DELETE FROM teachers WHERE id = 'tch_emma'");

    const tRes = await candidatePool.query("SELECT COUNT(*)::int AS cnt FROM teachers");
    if (tRes.rows[0].cnt === 0) {
      for (const t of INITIAL_TEACHERS) {
        await candidatePool.query(
          `INSERT INTO teachers (id, name, role, title_label, email, password_hash)
           VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT (id) DO NOTHING`,
          [t.id, t.name, t.role, t.title_label, t.email, hashPassword(t.password)]
        );
      }
    }

    const { rows } = await candidatePool.query("SELECT COUNT(*)::int AS cnt FROM books");
    if (rows[0].cnt === 0) {
      for (const b of INITIAL_BOOKS) {
        const tHash = hashText(b.full_text);
        await candidatePool.query(
          `INSERT INTO books (id, title, subtitle_kr, level, grade_recommended, full_text, text_hash, cover_theme)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
           ON CONFLICT (id) DO NOTHING`,
          [b.id, b.title, b.subtitle_kr, b.level, b.grade_recommended, b.full_text, tHash, b.cover_theme]
        );
        const extracted = analyzeTextWithLLM(b.full_text, b.level);
        await candidatePool.query(
          `INSERT INTO vocab_chunks (
             text_hash, book_id, raw_text, vocab_json, chunks_json, core_expressions_json,
             sentence_translations_json, speaking_questions_json,
             lookup_count, extraction_source
           ) VALUES ($1, $2, $3, $4::jsonb, $5::jsonb, $6::jsonb, $7::jsonb, $8::jsonb, 1, 'SEED_LLM_EXTRACTED')
           ON CONFLICT (text_hash) DO NOTHING`,
          [
            tHash,
            b.id,
            b.full_text.trim(),
            JSON.stringify(extracted.vocab),
            JSON.stringify(extracted.chunks),
            JSON.stringify(extracted.core_expressions),
            JSON.stringify(extracted.sentence_translations),
            JSON.stringify(extracted.speaking_questions)
          ]
        );
      }

      for (const u of INITIAL_USERS) {
        await candidatePool.query(
          `INSERT INTO users (
             id, name, grade_label, grade_group, age, level, current_book_id,
             pin_code, teacher_id, classcard_level,
             progress_w1, progress_w2, progress_w3, progress_w4,
             audio_w1_url, audio_w4_url, w1_wpm, w4_wpm, w1_accuracy, w4_accuracy,
             strengths_json, weaknesses_json
           ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21::jsonb,$22::jsonb)
           ON CONFLICT (id) DO NOTHING`,
          [
            u.id, u.name, u.grade_label, u.grade_group, u.age, u.level, u.current_book_id,
            u.pin_code || "1234", u.teacher_id || "tch_director", u.classcard_level || 2,
            u.progress_w1, u.progress_w2, u.progress_w3, u.progress_w4,
            u.audio_w1_url, u.audio_w4_url, u.w1_wpm, u.w4_wpm, u.w1_accuracy, u.w4_accuracy,
            JSON.stringify(u.strengths), JSON.stringify(u.weaknesses)
          ]
        );
      }
    }

    pgPool = candidatePool;
    activeDbEngine = "postgresql";
    console.log("🐘 [BADA DB] PostgreSQL 데이터베이스 연결 및 스키마 동기화 완료!");
    return true;
  } catch (err) {
    console.warn(`⚠️ [BADA DB] PostgreSQL 연결 실패 (${err.message}) ➔ 내장 SQLite 엔진으로 자동 전환하여 실행합니다.`);
    return false;
  }
}

initSqliteDatabase();

function getPgPool() {
  return pgPool;
}

function getSqliteDb() {
  return sqliteDb;
}

function getActiveDbEngine() {
  return activeDbEngine;
}

function getDbEngineInfo() {
  return {
    engine: activeDbEngine,
    postgresConnected: Boolean(pgPool)
  };
}

module.exports = {
  getPgPool,
  getSqliteDb,
  getActiveDbEngine,
  initPostgresPoolIfConfigured,
  getDbEngineInfo,
  parseJsonField,
  hashPassword,
  hashText,
  getKstTodayDateString
};

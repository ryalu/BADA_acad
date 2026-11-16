/**
 * BADA 영어 Database Layer (PostgreSQL Primary + SQLite Auto-Fallback)
 * - Supports Local PostgreSQL & Cloud PostgreSQL (Supabase, Neon, Railway, RDS) via `DATABASE_URL` or `PG*` env vars.
 * - Automatically creates tables, runs safe column migrations, and seeds initial data on startup.
 * - Supports Student Registration/Assignment (auto-resetting to Week 1 on new book assignment),
 *   Student 4-digit PIN authentication, and Director/Teacher password authentication & management.
 */

const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { DatabaseSync } = require("node:sqlite");
const {
  analyzeTextWithLLM,
  analyzeTextWithLLMAsync,
  analyzePronunciationWithLLM
} = require("./ai-engine");

// Built-in .env loader (no external dependency required)
function loadDotEnv() {
  const envPath = path.join(__dirname, ".env");
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

const INITIAL_TEACHERS = [
  {
    id: "tch_director",
    name: "원장님 (총괄)",
    role: "director",
    title_label: "원장 · 최고관리자",
    email: "director@bada.kr",
    password: process.env.DIRECTOR_PASSWORD || "bada1234"
  }
];

const INITIAL_BOOKS = [
  {
    id: "bada_level2_ocean_friends",
    title: "Popo and the Ocean Friends",
    subtitle_kr: "아기 고래 포포와 반짝이는 바다 친구들",
    level: "Level 2",
    grade_recommended: "초등 1~3학년",
    cover_theme: "aqua",
    full_text:
      "Look at the starfish shining on the sandy floor. Baby whale Popo swims across the coral reef. A gentle sea turtle glides through the clear water. Together, they find a golden treasure chest under the sea!"
  },
  {
    id: "bada_level6_deep_currents",
    title: "Guardians of the Deep Current",
    subtitle_kr: "깊은 해류의 수호자들과 비밀의 섬",
    level: "Level 7",
    grade_recommended: "초등 5~6학년 (중등 대비)",
    cover_theme: "coral",
    full_text:
      "The secret island is protected by a warm ocean current. Baby whale Popo explores the glowing cave where ancient pearls are hidden. Can you remember how the clear ocean water is kept clean by the coral reef?"
  },
  {
    id: "bada_pre_bubble_song",
    title: "Popo's Happy Bubble Song",
    subtitle_kr: "포포의 퐁퐁 물방울 노래",
    level: "Pre-Level",
    grade_recommended: "미취학 ~ 초등 1학년",
    cover_theme: "mint",
    full_text:
      "Popo blows a big water bubble in the blue sea. Jump high over the soft waves with baby dolphin! Look at the red crab dancing on the warm sandy beach."
  }
];

const INITIAL_USERS = [
  {
    id: "stu_hajun",
    name: "김하준",
    grade_label: "초등 2학년",
    grade_group: "grade_1_2",
    age: 9,
    level: "Level 2",
    current_book_id: "bada_level2_ocean_friends",
    pin_code: "1234",
    teacher_id: "tch_emma",
    classcard_level: 2,
    progress_w1: 100,
    progress_w2: 100,
    progress_w3: 90,
    progress_w4: 0,
    audio_w1_url: "storage://bada-audio/stu_hajun/week1_word_hesitant.wav",
    audio_w4_url: "storage://bada-audio/stu_hajun/week4_full_fluent.wav",
    w1_wpm: 36,
    w4_wpm: 92,
    w1_accuracy: 62,
    w4_accuracy: 96,
    strengths: [
      { tag: "under the sea (전치사구 리듬)", count: 14, type: "chunk" },
      { tag: "swims across (동사+전치사 연음)", count: 11, type: "fluency" },
      { tag: "shining starfish (강세 억양)", count: 9, type: "intonation" },
      { tag: "golden treasure chest (완전한 호흡)", count: 8, type: "chunk" }
    ],
    weaknesses: [
      { tag: "see vs look at 뉘앙스 혼동", count: 6, type: "nuance" },
      { tag: "through (/θruː/) th 발음 약화", count: 5, type: "phoneme" },
      { tag: "glides (/z/) 어미 자음 생략", count: 4, type: "phoneme" },
      { tag: "관사 a / the 호흡 누락", count: 3, type: "grammar" }
    ]
  },
  {
    id: "stu_seoyeon",
    name: "이서연",
    grade_label: "초등 4학년",
    grade_group: "grade_4_plus",
    age: 11,
    level: "Level 4",
    current_book_id: "bada_level2_ocean_friends",
    pin_code: "1234",
    teacher_id: "tch_emma",
    classcard_level: 4,
    progress_w1: 100,
    progress_w2: 85,
    progress_w3: 0,
    progress_w4: 0,
    audio_w1_url: "storage://bada-audio/stu_seoyeon/week1_word_hesitant.wav",
    audio_w4_url: "storage://bada-audio/stu_seoyeon/week4_full_fluent.wav",
    w1_wpm: 48,
    w4_wpm: 108,
    w1_accuracy: 71,
    w4_accuracy: 98,
    strengths: [
      { tag: "1~5형식 동사구 확장", count: 16, type: "pattern" },
      { tag: "glides through the clear water", count: 12, type: "chunk" },
      { tag: "Look at the + 명사구 응용", count: 10, type: "fluency" }
    ],
    weaknesses: [
      { tag: "5형식 목적격보어 분사(shining) 위치", count: 4, type: "pattern" },
      { tag: "across vs through 공간 전치사 구분", count: 3, type: "nuance" }
    ]
  },
  {
    id: "stu_jiho",
    name: "박지호",
    grade_label: "초등 6학년",
    grade_group: "grade_6",
    age: 13,
    level: "Level 7",
    current_book_id: "bada_level6_deep_currents",
    pin_code: "1234",
    teacher_id: "tch_emma",
    classcard_level: 7,
    progress_w1: 100,
    progress_w2: 100,
    progress_w3: 100,
    progress_w4: 85,
    audio_w1_url: "storage://bada-audio/stu_jiho/week1_word_hesitant.wav",
    audio_w4_url: "storage://bada-audio/stu_jiho/week4_full_fluent.wav",
    w1_wpm: 55,
    w4_wpm: 124,
    w1_accuracy: 74,
    w4_accuracy: 97,
    strengths: [
      { tag: "관계부사 where절 호흡 연결", count: 15, type: "grammar" },
      { tag: "is protected by (수동태 청크)", count: 13, type: "chunk" },
      { tag: "자연스러운 원어민 강세 리듬", count: 11, type: "fluency" }
    ],
    weaknesses: [
      { tag: "간접의문문 (how + S + V) 어순 도치", count: 5, type: "grammar" },
      { tag: "수동태 과거분사(kept / hidden) 불규칙 변화", count: 4, type: "grammar" }
    ]
  }
];

function mapGradeLabelToGroupAndAge(gradeLabel) {
  const label = String(gradeLabel || "초등 2학년");
  if (label.includes("6학년")) return { grade_group: "grade_6", age: 13 };
  if (label.includes("5학년")) return { grade_group: "grade_4_plus", age: 12 };
  if (label.includes("4학년")) return { grade_group: "grade_4_plus", age: 11 };
  if (label.includes("3학년")) return { grade_group: "grade_4_plus", age: 10 };
  if (label.includes("1학년") || label.includes("미취학")) return { grade_group: "grade_1_2", age: 8 };
  return { grade_group: "grade_1_2", age: 9 };
}

function mapLevelToDefaultClasscard(levelStr) {
  const m = String(levelStr || "").match(/(\d+)/);
  if (!m) return 1;
  return Math.min(26, Math.max(1, Number(m[1])));
}

// ============================================================================
// ENGINE 1: SQLITE FALLBACK / LOCAL CACHE
// ============================================================================
const DB_PATH = path.join(__dirname, "bada_english.sqlite");
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
  `);

  // Safe column migrations for existing SQLite files
  const alterStmts = [
    "ALTER TABLE users ADD COLUMN pin_code TEXT NOT NULL DEFAULT '1234'",
    "ALTER TABLE users ADD COLUMN teacher_id TEXT DEFAULT 'tch_director'",
    "ALTER TABLE users ADD COLUMN classcard_level INTEGER DEFAULT 2",
    "ALTER TABLE vocab_chunks ADD COLUMN sentence_translations_json TEXT DEFAULT '[]'",
    "ALTER TABLE vocab_chunks ADD COLUMN speaking_questions_json TEXT DEFAULT '[]'",
    "ALTER TABLE vocab_chunks ADD COLUMN page_illustrations_json TEXT DEFAULT '[]'"
  ];
  for (const sql of alterStmts) {
    try {
      sqliteDb.exec(sql);
    } catch (_) {
      // Column already exists
    }
  }

  // Ensure only director account remains from legacy demo teacher seeds
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
    for (const b of INITIAL_BOOKS) {
      const tHash = hashText(b.full_text);
      insertBook.run(b.id, b.title, b.subtitle_kr, b.level, b.grade_recommended, b.full_text, tHash, b.cover_theme);
      getOrExtractVocabAndChunksSqlite(b.full_text, b.level, b.id, true);
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
        u.pin_code || "1234", u.teacher_id || "tch_emma", u.classcard_level || 2,
        u.progress_w1, u.progress_w2, u.progress_w3, u.progress_w4,
        u.audio_w1_url, u.audio_w4_url, u.w1_wpm, u.w4_wpm, u.w1_accuracy, u.w4_accuracy,
        JSON.stringify(u.strengths), JSON.stringify(u.weaknesses)
      );
    }
  }
}

function parseJsonField(val, fallback = []) {
  if (Array.isArray(val)) return val;
  if (!val || typeof val !== "string") return fallback;
  try {
    const parsed = JSON.parse(val);
    return Array.isArray(parsed) ? parsed : fallback;
  } catch (_) {
    return fallback;
  }
}

function needsReanalysis(vcRow) {
  if (!vcRow) return true;
  const st = parseJsonField(vcRow.sentence_translations_json, []);
  const sq = parseJsonField(vcRow.speaking_questions_json, []);
  if (st.length === 0 || sq.length === 0) return true;
  const vocabStr = typeof vcRow.vocab_json === "string" ? vcRow.vocab_json : JSON.stringify(vcRow.vocab_json || []);
  const chunksStr = typeof vcRow.chunks_json === "string" ? vcRow.chunks_json : JSON.stringify(vcRow.chunks_json || []);
  if (vocabStr.includes("문맥 핵심 어휘") || chunksStr.includes("원어민 호흡 단위로 부드럽게")) {
    return true;
  }
  return false;
}

function getOrExtractVocabAndChunksSqlite(rawText, level = "Level 2", bookId = null, isSeed = false, customKoreanText = "", preExtracted = null) {
  const tHash = hashText(rawText);
  const now = new Date().toISOString();

  const existing = sqliteDb.prepare("SELECT * FROM vocab_chunks WHERE text_hash = ?").get(tHash);
  if (existing) {
    if (needsReanalysis(existing) || String(customKoreanText || "").trim() || preExtracted) {
      const refreshed = preExtracted || analyzeTextWithLLM(rawText, level, customKoreanText);
      const nextCount = Number(existing.lookup_count || 1) + 1;
      sqliteDb.prepare(`
        UPDATE vocab_chunks
        SET vocab_json = ?, chunks_json = ?, core_expressions_json = ?,
            sentence_translations_json = ?, speaking_questions_json = ?,
            lookup_count = ?, last_hit_at = ?
        WHERE text_hash = ?
      `).run(
        JSON.stringify(refreshed.vocab),
        JSON.stringify(refreshed.chunks),
        JSON.stringify(refreshed.core_expressions),
        JSON.stringify(refreshed.sentence_translations),
        JSON.stringify(refreshed.speaking_questions),
        nextCount,
        now,
        tHash
      );
      return {
        cache_status: customKoreanText ? "CUSTOM_KR_UPDATED" : "DB_CACHE_UPGRADED",
        llm_called: true,
        text_hash: tHash,
        lookup_count: nextCount,
        book_id: bookId || existing.book_id,
        vocab: refreshed.vocab,
        chunks: refreshed.chunks,
        core_expressions: refreshed.core_expressions,
        sentence_translations: refreshed.sentence_translations,
        speaking_questions: refreshed.speaking_questions,
        last_hit_at: now
      };
    }

    sqliteDb.prepare("UPDATE vocab_chunks SET lookup_count = lookup_count + 1, last_hit_at = ? WHERE text_hash = ?").run(now, tHash);
    sqliteDb.prepare("INSERT INTO cache_audit_logs (timestamp, text_preview, text_hash, status, detail) VALUES (?, ?, ?, ?, ?)").run(
      now,
      rawText.slice(0, 60) + (rawText.length > 60 ? "..." : ""),
      tHash,
      "DB_CACHE_HIT",
      `기존 DB에서 즉시 반환 (LLM 호출 생략 · 누적 조회 ${existing.lookup_count + 1}회)`
    );
    return {
      cache_status: "DB_CACHE_HIT",
      llm_called: false,
      text_hash: tHash,
      lookup_count: existing.lookup_count + 1,
      book_id: existing.book_id,
      vocab: parseJsonField(existing.vocab_json),
      chunks: parseJsonField(existing.chunks_json),
      core_expressions: parseJsonField(existing.core_expressions_json),
      sentence_translations: parseJsonField(existing.sentence_translations_json),
      speaking_questions: parseJsonField(existing.speaking_questions_json),
      last_hit_at: now
    };
  }

  const extracted = preExtracted || analyzeTextWithLLM(rawText, level, customKoreanText);
  sqliteDb.prepare(`
    INSERT INTO vocab_chunks (
      text_hash, book_id, raw_text, vocab_json, chunks_json, core_expressions_json,
      sentence_translations_json, speaking_questions_json,
      lookup_count, extraction_source, created_at, last_hit_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?)
  `).run(
    tHash,
    bookId || `custom_${tHash.slice(0, 8)}`,
    rawText.trim(),
    JSON.stringify(extracted.vocab),
    JSON.stringify(extracted.chunks),
    JSON.stringify(extracted.core_expressions),
    JSON.stringify(extracted.sentence_translations),
    JSON.stringify(extracted.speaking_questions),
    isSeed ? "SEED_LLM_EXTRACTED" : "LIVE_LLM_EXTRACTED",
    now,
    now
  );

  sqliteDb.prepare("INSERT INTO cache_audit_logs (timestamp, text_preview, text_hash, status, detail) VALUES (?, ?, ?, ?, ?)").run(
    now,
    rawText.slice(0, 60) + (rawText.length > 60 ? "..." : ""),
    tHash,
    "CACHE_MISS_LLM_SAVED",
    `신규 텍스트 감지 ➔ 단어(${extracted.vocab.length}개)·청크(${extracted.chunks.length}개)·문장해석(${extracted.sentence_translations.length}개)·질문(${extracted.speaking_questions.length}개) DB 영구 저장`
  );

  return {
    cache_status: "CACHE_MISS_LLM_SAVED",
    llm_called: true,
    text_hash: tHash,
    lookup_count: 1,
    book_id: bookId || `custom_${tHash.slice(0, 8)}`,
    vocab: extracted.vocab,
    chunks: extracted.chunks,
    core_expressions: extracted.core_expressions,
    sentence_translations: extracted.sentence_translations,
    speaking_questions: extracted.speaking_questions,
    last_hit_at: now
  };
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

    const schemaSql = fs.readFileSync(path.join(__dirname, "schema.postgres.sql"), "utf8");
    await candidatePool.query(schemaSql);

    // Ensure only director account remains from legacy demo teacher seeds
    await candidatePool.query("UPDATE users SET teacher_id = 'tch_director' WHERE teacher_id = 'tch_emma'");
    await candidatePool.query("DELETE FROM teachers WHERE id = 'tch_emma'");

    // Seed Teachers if empty
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
            u.pin_code || "1234", u.teacher_id || "tch_emma", u.classcard_level || 2,
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

function formatUserRow(u) {
  return {
    ...u,
    pin_code: u.pin_code || "1234",
    teacher_id: u.teacher_id || "tch_emma",
    classcard_level: Number(u.classcard_level) || mapLevelToDefaultClasscard(u.level),
    strengths: typeof u.strengths_json === "string" ? JSON.parse(u.strengths_json) : (u.strengths_json || []),
    weaknesses: typeof u.weaknesses_json === "string" ? JSON.parse(u.weaknesses_json) : (u.weaknesses_json || [])
  };
}

async function getAllBootstrapData() {
  if (pgPool) {
    const usersRes = await pgPool.query("SELECT * FROM users ORDER BY age ASC, name ASC");
    const teachersRes = await pgPool.query(
      "SELECT id, name, role, title_label, email, created_at FROM teachers ORDER BY CASE WHEN role = 'director' THEN 0 ELSE 1 END, created_at ASC"
    );
    const booksRes = await pgPool.query("SELECT * FROM books");
    const vcRes = await pgPool.query("SELECT * FROM vocab_chunks");
    const logsRes = await pgPool.query("SELECT * FROM cache_audit_logs ORDER BY id DESC LIMIT 12");

    const vcMap = new Map(vcRes.rows.map((r) => [r.text_hash, r]));
    const users = usersRes.rows.map(formatUserRow);

    const books = [];
    for (const b of booksRes.rows) {
      const vc = vcMap.get(b.text_hash);
      if (!vc || needsReanalysis(vc)) {
        const refreshed = analyzeTextWithLLM(b.full_text, b.level);
        await pgPool.query(
          `INSERT INTO vocab_chunks (
             text_hash, book_id, raw_text, vocab_json, chunks_json, core_expressions_json,
             sentence_translations_json, speaking_questions_json, lookup_count, extraction_source
           ) VALUES ($1, $2, $3, $4::jsonb, $5::jsonb, $6::jsonb, $7::jsonb, $8::jsonb, 1, 'AUTO_BACKFILL')
           ON CONFLICT (text_hash) DO UPDATE SET
             vocab_json = EXCLUDED.vocab_json,
             chunks_json = EXCLUDED.chunks_json,
             core_expressions_json = EXCLUDED.core_expressions_json,
             sentence_translations_json = CASE
               WHEN jsonb_array_length(vocab_chunks.sentence_translations_json) = 0 THEN EXCLUDED.sentence_translations_json
               ELSE vocab_chunks.sentence_translations_json
             END,
             speaking_questions_json = CASE
               WHEN jsonb_array_length(vocab_chunks.speaking_questions_json) = 0 THEN EXCLUDED.speaking_questions_json
               ELSE vocab_chunks.speaking_questions_json
             END`,
          [
            b.text_hash,
            b.id,
            b.full_text.trim(),
            JSON.stringify(refreshed.vocab),
            JSON.stringify(refreshed.chunks),
            JSON.stringify(refreshed.core_expressions),
            JSON.stringify(refreshed.sentence_translations),
            JSON.stringify(refreshed.speaking_questions)
          ]
        );
        const existingSt = vc ? parseJsonField(vc.sentence_translations_json, []) : [];
        const existingSq = vc ? parseJsonField(vc.speaking_questions_json, []) : [];
        books.push({
          ...b,
          vocab: refreshed.vocab,
          chunks: refreshed.chunks,
          core_expressions: refreshed.core_expressions,
          sentence_translations: existingSt.length ? existingSt : refreshed.sentence_translations,
          speaking_questions: existingSq.length ? existingSq : refreshed.speaking_questions,
          lookup_count: vc ? vc.lookup_count : 1
        });
      } else {
        books.push({
          ...b,
          vocab: parseJsonField(vc.vocab_json),
          chunks: parseJsonField(vc.chunks_json),
          core_expressions: parseJsonField(vc.core_expressions_json),
          sentence_translations: parseJsonField(vc.sentence_translations_json),
          speaking_questions: parseJsonField(vc.speaking_questions_json),
          page_illustrations: parseJsonField(vc.page_illustrations_json),
          lookup_count: vc.lookup_count || 1
        });
      }
    }

    return { users, teachers: teachersRes.rows, books, auditLogs: logsRes.rows, dbEngine: activeDbEngine };
  }

  // SQLite fallback
  const users = sqliteDb.prepare("SELECT * FROM users ORDER BY age ASC, name ASC").all().map(formatUserRow);
  const teachers = sqliteDb
    .prepare("SELECT id, name, role, title_label, email, created_at FROM teachers ORDER BY CASE WHEN role = 'director' THEN 0 ELSE 1 END, created_at ASC")
    .all();

  const books = sqliteDb.prepare("SELECT * FROM books").all().map((b) => {
    const vc = sqliteDb.prepare("SELECT * FROM vocab_chunks WHERE text_hash = ?").get(b.text_hash);
    if (!vc || needsReanalysis(vc)) {
      const upgraded = getOrExtractVocabAndChunksSqlite(b.full_text, b.level, b.id, true);
      return {
        ...b,
        vocab: upgraded.vocab,
        chunks: upgraded.chunks,
        core_expressions: upgraded.core_expressions,
        sentence_translations: upgraded.sentence_translations,
        speaking_questions: upgraded.speaking_questions,
        lookup_count: upgraded.lookup_count || 1
      };
    }
    return {
      ...b,
      vocab: parseJsonField(vc.vocab_json),
      chunks: parseJsonField(vc.chunks_json),
      core_expressions: parseJsonField(vc.core_expressions_json),
      sentence_translations: parseJsonField(vc.sentence_translations_json),
      speaking_questions: parseJsonField(vc.speaking_questions_json),
      page_illustrations: parseJsonField(vc.page_illustrations_json),
      lookup_count: vc.lookup_count || 1
    };
  });

  const auditLogs = sqliteDb.prepare("SELECT * FROM cache_audit_logs ORDER BY id DESC LIMIT 12").all();
  return { users, teachers, books, auditLogs, dbEngine: activeDbEngine };
}

// ============================================================================
// AUTHENTICATION & MANAGEMENT FUNCTIONS
// ============================================================================

async function verifyStudentPin(userId, pinCode) {
  const cleanPin = String(pinCode || "").trim();
  if (pgPool) {
    const { rows } = await pgPool.query("SELECT * FROM users WHERE id = $1", [userId]);
    if (rows.length === 0) return { ok: false, error: "등록된 학생을 찾을 수 없습니다." };
    const student = formatUserRow(rows[0]);
    if (student.pin_code !== cleanPin) {
      return { ok: false, error: "출석 PIN 번호 4자리가 일치하지 않습니다. (기본값: 1234)" };
    }
    return { ok: true, user: student };
  }

  const row = sqliteDb.prepare("SELECT * FROM users WHERE id = ?").get(userId);
  if (!row) return { ok: false, error: "등록된 학생을 찾을 수 없습니다." };
  const student = formatUserRow(row);
  if (student.pin_code !== cleanPin) {
    return { ok: false, error: "출석 PIN 번호 4자리가 일치하지 않습니다. (기본값: 1234)" };
  }
  return { ok: true, user: student };
}

async function verifyTeacherLogin(teacherId, password) {
  const inputHash = hashPassword(password);
  if (pgPool) {
    const { rows } = await pgPool.query("SELECT * FROM teachers WHERE id = $1", [teacherId]);
    if (rows.length === 0) return { ok: false, error: "선생님 계정을 찾을 수 없습니다." };
    const t = rows[0];
    if (t.password_hash !== inputHash) {
      return { ok: false, error: "비밀번호가 올바르지 않습니다." };
    }
    return {
      ok: true,
      teacher: {
        id: t.id,
        name: t.name,
        role: t.role,
        title_label: t.title_label,
        email: t.email
      }
    };
  }

  const t = sqliteDb.prepare("SELECT * FROM teachers WHERE id = ?").get(teacherId);
  if (!t) return { ok: false, error: "선생님 계정을 찾을 수 없습니다." };
  if (t.password_hash !== inputHash) {
    return { ok: false, error: "비밀번호가 올바르지 않습니다." };
  }
  return {
    ok: true,
    teacher: {
      id: t.id,
      name: t.name,
      role: t.role,
      title_label: t.title_label,
      email: t.email
    }
  };
}

async function createStudent(payload) {
  const name = String(payload.name || "").trim().slice(0, 30);
  if (!name) throw new Error("학생 이름을 입력해 주세요.");

  const grade_label = String(payload.grade_label || "초등 2학년").trim().slice(0, 30);
  const { grade_group, age } = mapGradeLabelToGroupAndAge(grade_label);
  const level = String(payload.level || "Level 2").trim().slice(0, 30);
  const current_book_id = String(payload.current_book_id || "bada_level2_ocean_friends").trim();
  const pin_code = String(payload.pin_code || "1234").replace(/[^0-9]/g, "").slice(0, 4) || "1234";
  const teacher_id = String(payload.teacher_id || "tch_emma").trim();
  const classcard_level = Math.min(26, Math.max(1, Number(payload.classcard_level) || mapLevelToDefaultClasscard(level)));

  const id = `stu_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
  const defaultStrengths = [{ tag: "신규 배정 (1주차 문장 쉐도잉 시작)", count: 1, type: "chunk" }];
  const defaultWeaknesses = [{ tag: "첫 1주차 원서 발화 데이터 수집 대기 중", count: 1, type: "fluency" }];
  const audioW1 = `storage://bada-audio/${id}/week1_word_hesitant.wav`;
  const audioW4 = `storage://bada-audio/${id}/week4_full_fluent.wav`;

  if (pgPool) {
    await pgPool.query(
      `INSERT INTO users (
         id, name, grade_label, grade_group, age, level, current_book_id,
         pin_code, teacher_id, classcard_level,
         progress_w1, progress_w2, progress_w3, progress_w4,
         audio_w1_url, audio_w4_url, w1_wpm, w4_wpm, w1_accuracy, w4_accuracy,
         strengths_json, weaknesses_json
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10, 0,0,0,0, $11,$12, 36,90,65,95, $13::jsonb,$14::jsonb)`,
      [
        id, name, grade_label, grade_group, age, level, current_book_id,
        pin_code, teacher_id, classcard_level,
        audioW1, audioW4,
        JSON.stringify(defaultStrengths), JSON.stringify(defaultWeaknesses)
      ]
    );
    const { rows } = await pgPool.query("SELECT * FROM users WHERE id = $1", [id]);
    return formatUserRow(rows[0]);
  }

  sqliteDb.prepare(`
    INSERT INTO users (
      id, name, grade_label, grade_group, age, level, current_book_id,
      pin_code, teacher_id, classcard_level,
      progress_w1, progress_w2, progress_w3, progress_w4,
      audio_w1_url, audio_w4_url, w1_wpm, w4_wpm, w1_accuracy, w4_accuracy,
      strengths_json, weaknesses_json
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, 0, 0, ?, ?, 36, 90, 65, 95, ?, ?)
  `).run(
    id, name, grade_label, grade_group, age, level, current_book_id,
    pin_code, teacher_id, classcard_level,
    audioW1, audioW4,
    JSON.stringify(defaultStrengths), JSON.stringify(defaultWeaknesses)
  );

  const created = sqliteDb.prepare("SELECT * FROM users WHERE id = ?").get(id);
  return formatUserRow(created);
}

/**
 * Updates student level, grade, assigned book, classcard level, teacher, or PIN.
 * IMPORTANT RULE (User Confirmed #3):
 * When a new book (`current_book_id`) is assigned (different from previous book) OR `resetProgress === true`,
 * automatically reset `progress_w1, progress_w2, progress_w3, progress_w4` to `0` so the student starts fresh at Week 1!
 */
async function updateStudentAssignment(payload) {
  const userId = String(payload.userId || "").trim();
  if (!userId) throw new Error("학생 ID가 필요합니다.");

  if (pgPool) {
    const existingRes = await pgPool.query("SELECT * FROM users WHERE id = $1", [userId]);
    if (existingRes.rows.length === 0) throw new Error("학생을 찾을 수 없습니다.");
    const prev = existingRes.rows[0];

    const nextGradeLabel = payload.grade_label ? String(payload.grade_label).trim() : prev.grade_label;
    const { grade_group, age } = payload.grade_label
      ? mapGradeLabelToGroupAndAge(nextGradeLabel)
      : { grade_group: prev.grade_group, age: prev.age };
    const nextLevel = payload.level ? String(payload.level).trim() : prev.level;
    const nextBookId = payload.current_book_id ? String(payload.current_book_id).trim() : prev.current_book_id;
    const nextPin = payload.pin_code
      ? String(payload.pin_code).replace(/[^0-9]/g, "").slice(0, 4) || prev.pin_code || "1234"
      : prev.pin_code || "1234";
    const nextTeacherId = payload.teacher_id ? String(payload.teacher_id).trim() : (prev.teacher_id || "tch_emma");
    const nextClasscard = payload.classcard_level !== undefined
      ? Math.min(26, Math.max(1, Number(payload.classcard_level) || 1))
      : (prev.classcard_level || mapLevelToDefaultClasscard(nextLevel));

    const bookChanged = nextBookId !== prev.current_book_id;
    const shouldResetWeek1 = bookChanged || Boolean(payload.resetProgress);

    const w1 = shouldResetWeek1 ? 0 : prev.progress_w1;
    const w2 = shouldResetWeek1 ? 0 : prev.progress_w2;
    const w3 = shouldResetWeek1 ? 0 : prev.progress_w3;
    const w4 = shouldResetWeek1 ? 0 : prev.progress_w4;

    await pgPool.query(
      `UPDATE users
       SET grade_label = $1, grade_group = $2, age = $3, level = $4, current_book_id = $5,
           pin_code = $6, teacher_id = $7, classcard_level = $8,
           progress_w1 = $9, progress_w2 = $10, progress_w3 = $11, progress_w4 = $12
       WHERE id = $13`,
      [
        nextGradeLabel, grade_group, age, nextLevel, nextBookId,
        nextPin, nextTeacherId, nextClasscard,
        w1, w2, w3, w4,
        userId
      ]
    );

    const updatedRes = await pgPool.query("SELECT * FROM users WHERE id = $1", [userId]);
    return {
      user: formatUserRow(updatedRes.rows[0]),
      bookChanged,
      resetToWeek1: shouldResetWeek1
    };
  }

  // SQLite
  const prev = sqliteDb.prepare("SELECT * FROM users WHERE id = ?").get(userId);
  if (!prev) throw new Error("학생을 찾을 수 없습니다.");

  const nextGradeLabel = payload.grade_label ? String(payload.grade_label).trim() : prev.grade_label;
  const { grade_group, age } = payload.grade_label
    ? mapGradeLabelToGroupAndAge(nextGradeLabel)
    : { grade_group: prev.grade_group, age: prev.age };
  const nextLevel = payload.level ? String(payload.level).trim() : prev.level;
  const nextBookId = payload.current_book_id ? String(payload.current_book_id).trim() : prev.current_book_id;
  const nextPin = payload.pin_code
    ? String(payload.pin_code).replace(/[^0-9]/g, "").slice(0, 4) || prev.pin_code || "1234"
    : prev.pin_code || "1234";
  const nextTeacherId = payload.teacher_id ? String(payload.teacher_id).trim() : (prev.teacher_id || "tch_emma");
  const nextClasscard = payload.classcard_level !== undefined
    ? Math.min(26, Math.max(1, Number(payload.classcard_level) || 1))
    : (prev.classcard_level || mapLevelToDefaultClasscard(nextLevel));

  const bookChanged = nextBookId !== prev.current_book_id;
  const shouldResetWeek1 = bookChanged || Boolean(payload.resetProgress);

  const w1 = shouldResetWeek1 ? 0 : prev.progress_w1;
  const w2 = shouldResetWeek1 ? 0 : prev.progress_w2;
  const w3 = shouldResetWeek1 ? 0 : prev.progress_w3;
  const w4 = shouldResetWeek1 ? 0 : prev.progress_w4;

  sqliteDb.prepare(`
    UPDATE users
    SET grade_label = ?, grade_group = ?, age = ?, level = ?, current_book_id = ?,
        pin_code = ?, teacher_id = ?, classcard_level = ?,
        progress_w1 = ?, progress_w2 = ?, progress_w3 = ?, progress_w4 = ?
    WHERE id = ?
  `).run(
    nextGradeLabel, grade_group, age, nextLevel, nextBookId,
    nextPin, nextTeacherId, nextClasscard,
    w1, w2, w3, w4,
    userId
  );

  const updated = sqliteDb.prepare("SELECT * FROM users WHERE id = ?").get(userId);
  return {
    user: formatUserRow(updated),
    bookChanged,
    resetToWeek1: shouldResetWeek1
  };
}

async function deleteStudent(userId) {
  const cleanId = String(userId || "").trim();
  if (!cleanId) throw new Error("삭제할 학생 ID가 필요합니다.");
  if (pgPool) {
    await pgPool.query("DELETE FROM users WHERE id = $1", [cleanId]);
    return { deletedId: cleanId };
  }
  sqliteDb.prepare("DELETE FROM users WHERE id = ?").run(cleanId);
  return { deletedId: cleanId };
}

async function createTeacher(payload) {
  const name = String(payload.name || "").trim().slice(0, 40);
  if (!name) throw new Error("선생님 성함을 입력해 주세요.");
  const role = payload.role === "director" ? "director" : "teacher";
  const title_label = String(payload.title_label || "전담 코칭 강사").trim().slice(0, 40);
  const email = String(payload.email || "teacher@bada.kr").trim().slice(0, 80);
  const rawPassword = String(payload.password || "1234").trim();
  if (rawPassword.length < 4) throw new Error("비밀번호는 최소 4자리 이상이어야 합니다.");

  const id = `tch_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 5)}`;
  const password_hash = hashPassword(rawPassword);
  const now = new Date().toISOString();

  if (pgPool) {
    await pgPool.query(
      `INSERT INTO teachers (id, name, role, title_label, email, password_hash)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [id, name, role, title_label, email, password_hash]
    );
    const { rows } = await pgPool.query(
      "SELECT id, name, role, title_label, email, created_at FROM teachers WHERE id = $1",
      [id]
    );
    return rows[0];
  }

  sqliteDb.prepare(`
    INSERT INTO teachers (id, name, role, title_label, email, password_hash, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(id, name, role, title_label, email, password_hash, now);

  return sqliteDb.prepare("SELECT id, name, role, title_label, email, created_at FROM teachers WHERE id = ?").get(id);
}

async function deleteTeacher(teacherId) {
  const cleanId = String(teacherId || "").trim();
  if (!cleanId) throw new Error("삭제할 강사 ID가 필요합니다.");
  if (cleanId === "tch_director") {
    throw new Error("원장님(최고관리자) 기본 계정은 삭제할 수 없습니다.");
  }
  if (pgPool) {
    await pgPool.query("DELETE FROM teachers WHERE id = $1", [cleanId]);
    return { deletedId: cleanId };
  }
  sqliteDb.prepare("DELETE FROM teachers WHERE id = ?").run(cleanId);
  return { deletedId: cleanId };
}

async function createBook(payload) {
  const title = String(payload.title || "").trim().slice(0, 120);
  const subtitle_kr = String(payload.subtitle_kr || "신규 등록 영어 원서").trim().slice(0, 120);
  const level = String(payload.level || "Level 2").trim().slice(0, 40);
  const grade_recommended = String(payload.grade_recommended || "초등 전학년").trim().slice(0, 60);
  const full_text = String(payload.full_text || "").trim().slice(0, 5000);
  const korean_text = String(payload.korean_text || "").trim().slice(0, 5000);
  const cover_theme = ["aqua", "coral", "mint"].includes(payload.cover_theme) ? payload.cover_theme : "aqua";

  if (!title || !full_text) {
    throw new Error("원서 제목과 본문 텍스트를 모두 입력해 주세요.");
  }

  const tHash = hashText(full_text);
  const id = `bada_${level.toLowerCase().replace(/[^a-z0-9]/g, "")}_${tHash.slice(0, 6)}`;

  if (pgPool) {
    await pgPool.query(
      `INSERT INTO books (id, title, subtitle_kr, level, grade_recommended, full_text, text_hash, cover_theme)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (id) DO UPDATE SET
         title = EXCLUDED.title,
         subtitle_kr = EXCLUDED.subtitle_kr,
         level = EXCLUDED.level,
         grade_recommended = EXCLUDED.grade_recommended,
         full_text = EXCLUDED.full_text,
         text_hash = EXCLUDED.text_hash`,
      [id, title, subtitle_kr, level, grade_recommended, full_text, tHash, cover_theme]
    );
  } else {
    sqliteDb.prepare(`
      INSERT OR REPLACE INTO books (id, title, subtitle_kr, level, grade_recommended, full_text, text_hash, cover_theme)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, title, subtitle_kr, level, grade_recommended, full_text, tHash, cover_theme);
  }

  const analysis = await getOrExtractVocabAndChunks(full_text, level, id, false, korean_text);
  return {
    book: {
      id,
      title,
      subtitle_kr,
      level,
      grade_recommended,
      full_text,
      text_hash: tHash,
      cover_theme,
      vocab: analysis.vocab,
      chunks: analysis.chunks,
      core_expressions: analysis.core_expressions,
      sentence_translations: analysis.sentence_translations,
      speaking_questions: analysis.speaking_questions
    },
    analysis
  };
}

async function updateBook(payload) {
  const id = String(payload.id || "").trim();
  const title = String(payload.title || "").trim();
  const subtitle_kr = String(payload.subtitle_kr || "").trim() || "원서 스토리북";
  const level = String(payload.level || "Level 2").trim();
  const grade_recommended = String(payload.grade_recommended || "초등 1~3학년").trim();
  const full_text = String(payload.full_text || "").trim();
  const korean_text = String(payload.korean_text || "").trim();

  if (!id || !title || !full_text) {
    throw new Error("교재 ID, 제목, 영어 원문은 필수입니다.");
  }

  const tHash = hashText(full_text);

  if (pgPool) {
    await pgPool.query(
      `UPDATE books
       SET title = $1, subtitle_kr = $2, level = $3, grade_recommended = $4, full_text = $5, text_hash = $6
       WHERE id = $7`,
      [title, subtitle_kr, level, grade_recommended, full_text, tHash, id]
    );
  } else {
    sqliteDb
      .prepare(
        `UPDATE books
         SET title = ?, subtitle_kr = ?, level = ?, grade_recommended = ?, full_text = ?, text_hash = ?
         WHERE id = ?`
      )
      .run(title, subtitle_kr, level, grade_recommended, full_text, tHash, id);
  }

  const analysis = await getOrExtractVocabAndChunks(full_text, level, id, false, korean_text);
  return {
    book: {
      id,
      title,
      subtitle_kr,
      level,
      grade_recommended,
      full_text,
      text_hash: tHash,
      vocab: analysis.vocab,
      chunks: analysis.chunks,
      core_expressions: analysis.core_expressions,
      sentence_translations: analysis.sentence_translations,
      speaking_questions: analysis.speaking_questions,
      page_illustrations: analysis.page_illustrations || []
    },
    analysis
  };
}

async function getOrExtractVocabAndChunks(rawText, level = "Level 2", bookId = null, isSeed = false, customKoreanText = "") {
  if (pgPool) {
    const tHash = hashText(rawText);
    const now = new Date().toISOString();
    const existingRes = await pgPool.query("SELECT * FROM vocab_chunks WHERE text_hash = $1", [tHash]);

    if (existingRes.rows.length > 0) {
      const existing = existingRes.rows[0];
      if (needsReanalysis(existing) || String(customKoreanText || "").trim()) {
        const refreshed = isSeed
          ? analyzeTextWithLLM(rawText, level, customKoreanText)
          : await analyzeTextWithLLMAsync(rawText, level, customKoreanText);
        const nextCount = Number(existing.lookup_count || 1) + 1;
        await pgPool.query(
          `UPDATE vocab_chunks
           SET vocab_json = $1::jsonb, chunks_json = $2::jsonb, core_expressions_json = $3::jsonb,
               sentence_translations_json = $4::jsonb, speaking_questions_json = $5::jsonb,
               lookup_count = $6, last_hit_at = NOW()
           WHERE text_hash = $7`,
          [
            JSON.stringify(refreshed.vocab),
            JSON.stringify(refreshed.chunks),
            JSON.stringify(refreshed.core_expressions),
            JSON.stringify(refreshed.sentence_translations),
            JSON.stringify(refreshed.speaking_questions),
            nextCount,
            tHash
          ]
        );
        return {
          cache_status: customKoreanText ? "CUSTOM_KR_UPDATED" : "DB_CACHE_UPGRADED",
          llm_called: true,
          text_hash: tHash,
          lookup_count: nextCount,
          book_id: bookId || existing.book_id,
          vocab: refreshed.vocab,
          chunks: refreshed.chunks,
          core_expressions: refreshed.core_expressions,
          sentence_translations: refreshed.sentence_translations,
          speaking_questions: refreshed.speaking_questions,
          last_hit_at: now
        };
      }

      const nextCount = Number(existing.lookup_count || 1) + 1;
      await pgPool.query(
        "UPDATE vocab_chunks SET lookup_count = $1, last_hit_at = NOW() WHERE text_hash = $2",
        [nextCount, tHash]
      );
      await pgPool.query(
        "INSERT INTO cache_audit_logs (timestamp, text_preview, text_hash, status, detail) VALUES (NOW(), $1, $2, $3, $4)",
        [
          rawText.slice(0, 60) + (rawText.length > 60 ? "..." : ""),
          tHash,
          "DB_CACHE_HIT",
          `PostgreSQL 캐시에서 즉시 반환 (LLM 호출 생략 · 누적 조회 ${nextCount}회)`
        ]
      );

      return {
        cache_status: "DB_CACHE_HIT",
        llm_called: false,
        text_hash: tHash,
        lookup_count: nextCount,
        book_id: existing.book_id,
        vocab: parseJsonField(existing.vocab_json),
        chunks: parseJsonField(existing.chunks_json),
        core_expressions: parseJsonField(existing.core_expressions_json),
        sentence_translations: parseJsonField(existing.sentence_translations_json),
        speaking_questions: parseJsonField(existing.speaking_questions_json),
        last_hit_at: now
      };
    }

    const extracted = isSeed
      ? analyzeTextWithLLM(rawText, level, customKoreanText)
      : await analyzeTextWithLLMAsync(rawText, level, customKoreanText);
    const bId = bookId || `custom_${tHash.slice(0, 8)}`;
    await pgPool.query(
      `INSERT INTO vocab_chunks (
         text_hash, book_id, raw_text, vocab_json, chunks_json, core_expressions_json,
         sentence_translations_json, speaking_questions_json, page_illustrations_json,
         lookup_count, extraction_source
       ) VALUES ($1, $2, $3, $4::jsonb, $5::jsonb, $6::jsonb, $7::jsonb, $8::jsonb, $9::jsonb, 1, $10)`,
      [
        tHash,
        bId,
        rawText.trim(),
        JSON.stringify(extracted.vocab),
        JSON.stringify(extracted.chunks),
        JSON.stringify(extracted.core_expressions),
        JSON.stringify(extracted.sentence_translations),
        JSON.stringify(extracted.speaking_questions),
        JSON.stringify(extracted.page_illustrations || []),
        isSeed ? "SEED_LLM_EXTRACTED" : "LIVE_LLM_EXTRACTED"
      ]
    );

    await pgPool.query(
      "INSERT INTO cache_audit_logs (timestamp, text_preview, text_hash, status, detail) VALUES (NOW(), $1, $2, $3, $4)",
      [
        rawText.slice(0, 60) + (rawText.length > 60 ? "..." : ""),
        tHash,
        "CACHE_MISS_LLM_SAVED",
        `신규 텍스트 감지 ➔ 단어·청크·문장해석(${extracted.sentence_translations.length}개)·질문(${extracted.speaking_questions.length}개) PostgreSQL 영구 저장`
      ]
    );

    return {
      cache_status: "CACHE_MISS_LLM_SAVED",
      llm_called: true,
      text_hash: tHash,
      lookup_count: 1,
      book_id: bId,
      vocab: extracted.vocab,
      chunks: extracted.chunks,
      core_expressions: extracted.core_expressions,
      sentence_translations: extracted.sentence_translations,
      speaking_questions: extracted.speaking_questions,
      last_hit_at: now
    };
  }

  let preExtracted = null;
  if (!isSeed) {
    const tHash = hashText(rawText);
    const existing = sqliteDb.prepare("SELECT * FROM vocab_chunks WHERE text_hash = ?").get(tHash);
    if (!existing || needsReanalysis(existing) || String(customKoreanText || "").trim()) {
      preExtracted = await analyzeTextWithLLMAsync(rawText, level, customKoreanText);
    }
  }
  return getOrExtractVocabAndChunksSqlite(rawText, level, bookId, isSeed, customKoreanText, preExtracted);
}

async function updateUserProgress(userId, weekNumber, progressVal, audioUrl) {
  const col = `progress_w${weekNumber}`;
  if (!["progress_w1", "progress_w2", "progress_w3", "progress_w4"].includes(col)) {
    throw new Error("Invalid week number");
  }
  const safeProg = Math.min(100, Math.max(0, Number(progressVal) || 100));

  if (pgPool) {
    await pgPool.query(`UPDATE users SET ${col} = $1 WHERE id = $2`, [safeProg, userId]);
    if (audioUrl && (weekNumber === 1 || weekNumber === 4)) {
      const audioCol = weekNumber === 1 ? "audio_w1_url" : "audio_w4_url";
      await pgPool.query(`UPDATE users SET ${audioCol} = $1 WHERE id = $2`, [audioUrl, userId]);
    }
    const { rows } = await pgPool.query("SELECT * FROM users WHERE id = $1", [userId]);
    return formatUserRow(rows[0]);
  }

  sqliteDb.prepare(`UPDATE users SET ${col} = ? WHERE id = ?`).run(safeProg, userId);
  if (audioUrl && (weekNumber === 1 || weekNumber === 4)) {
    const audioCol = weekNumber === 1 ? "audio_w1_url" : "audio_w4_url";
    sqliteDb.prepare(`UPDATE users SET ${audioCol} = ? WHERE id = ?`).run(audioUrl, userId);
  }
  return formatUserRow(sqliteDb.prepare("SELECT * FROM users WHERE id = ?").get(userId));
}

async function reanalyzeAllBooksWithLLM({ force = false } = {}) {
  const hasExternalKey = Boolean(process.env.OPENAI_API_KEY || process.env.GEMINI_API_KEY);
  if (!hasExternalKey && !force) {
    return { updated: 0, skipped: 0, reason: "no_external_llm_key" };
  }

  let updated = 0;
  let skipped = 0;

  if (pgPool) {
    if (force) {
      await pgPool.query("UPDATE vocab_chunks SET page_illustrations_json = '[]'::jsonb");
    }
    const { rows: books } = await pgPool.query("SELECT * FROM books ORDER BY id");
    for (const b of books) {
      const tHash = b.text_hash || hashText(b.full_text);
      const existingRes = await pgPool.query(
        "SELECT extraction_source, page_illustrations_json FROM vocab_chunks WHERE text_hash = $1 LIMIT 1",
        [tHash]
      );
      const src = existingRes.rows[0]?.extraction_source || "";
      const existingIllus = parseJsonField(existingRes.rows[0]?.page_illustrations_json, []);
      const hasGeneratedImage = existingIllus.length > 0 && Boolean(existingIllus[0]?.image_url);
      if (!force && src.startsWith("EXTERNAL_LLM_") && hasGeneratedImage) {
        skipped += 1;
        continue;
      }

      const extracted = await analyzeTextWithLLMAsync(b.full_text, b.level, "", b.title);
      const providerTag =
        extracted.llm_provider && extracted.llm_provider !== "local_deterministic"
          ? `EXTERNAL_LLM_${String(extracted.llm_provider).toUpperCase()}`
          : "LIVE_LLM_EXTRACTED";

      await pgPool.query(
        `INSERT INTO vocab_chunks (
           text_hash, book_id, raw_text, vocab_json, chunks_json, core_expressions_json,
           sentence_translations_json, speaking_questions_json, page_illustrations_json,
           lookup_count, extraction_source, last_hit_at
         ) VALUES ($1, $2, $3, $4::jsonb, $5::jsonb, $6::jsonb, $7::jsonb, $8::jsonb, $9::jsonb, 1, $10, NOW())
         ON CONFLICT (text_hash) DO UPDATE SET
           book_id = EXCLUDED.book_id,
           vocab_json = EXCLUDED.vocab_json,
           chunks_json = EXCLUDED.chunks_json,
           core_expressions_json = EXCLUDED.core_expressions_json,
           sentence_translations_json = EXCLUDED.sentence_translations_json,
           speaking_questions_json = EXCLUDED.speaking_questions_json,
           page_illustrations_json = EXCLUDED.page_illustrations_json,
           extraction_source = EXCLUDED.extraction_source,
           last_hit_at = NOW()`,
        [
          tHash,
          b.id,
          b.full_text.trim(),
          JSON.stringify(extracted.vocab),
          JSON.stringify(extracted.chunks),
          JSON.stringify(extracted.core_expressions),
          JSON.stringify(extracted.sentence_translations),
          JSON.stringify(extracted.speaking_questions),
          JSON.stringify(extracted.page_illustrations || []),
          providerTag
        ]
      );
      updated += 1;
    }
    return { updated, skipped, engine: "postgresql" };
  }

  if (force) {
    sqliteDb.exec("UPDATE vocab_chunks SET page_illustrations_json = '[]'");
  }
  const books = sqliteDb.prepare("SELECT * FROM books ORDER BY id").all();
  for (const b of books) {
    const tHash = b.text_hash || hashText(b.full_text);
    const existing = sqliteDb
      .prepare("SELECT extraction_source, page_illustrations_json FROM vocab_chunks WHERE text_hash = ? LIMIT 1")
      .get(tHash);
    const src = existing?.extraction_source || "";
    const existingIllus = parseJsonField(existing?.page_illustrations_json, []);
    const hasGeneratedImage = existingIllus.length > 0 && Boolean(existingIllus[0]?.image_url);
    if (!force && src.startsWith("EXTERNAL_LLM_") && hasGeneratedImage) {
      skipped += 1;
      continue;
    }

    const extracted = await analyzeTextWithLLMAsync(b.full_text, b.level, "", b.title);
    const providerTag =
      extracted.llm_provider && extracted.llm_provider !== "local_deterministic"
        ? `EXTERNAL_LLM_${String(extracted.llm_provider).toUpperCase()}`
        : "LIVE_LLM_EXTRACTED";
    const now = new Date().toISOString();

    sqliteDb
      .prepare(
        `INSERT INTO vocab_chunks (
           text_hash, book_id, raw_text, vocab_json, chunks_json, core_expressions_json,
           sentence_translations_json, speaking_questions_json, page_illustrations_json,
           lookup_count, extraction_source, created_at, last_hit_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?)
         ON CONFLICT(text_hash) DO UPDATE SET
           book_id = excluded.book_id,
           vocab_json = excluded.vocab_json,
           chunks_json = excluded.chunks_json,
           core_expressions_json = excluded.core_expressions_json,
           sentence_translations_json = excluded.sentence_translations_json,
           speaking_questions_json = excluded.speaking_questions_json,
           page_illustrations_json = excluded.page_illustrations_json,
           extraction_source = excluded.extraction_source,
           last_hit_at = excluded.last_hit_at`
      )
      .run(
        tHash,
        b.id,
        b.full_text.trim(),
        JSON.stringify(extracted.vocab),
        JSON.stringify(extracted.chunks),
        JSON.stringify(extracted.core_expressions),
        JSON.stringify(extracted.sentence_translations),
        JSON.stringify(extracted.speaking_questions),
        JSON.stringify(extracted.page_illustrations || []),
        providerTag,
        now,
        now
      );
    updated += 1;
  }
  return { updated, skipped, engine: "sqlite" };
}

async function saveStudentRecording({
  userId,
  bookId,
  weekNum,
  repeatNum,
  transcript,
  audioDataUrl,
  expectedText,
  level
}) {
  const id = `rec_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const aiFeedback = await analyzePronunciationWithLLM({
    expectedText: expectedText || "",
    spokenTranscript: transcript || "",
    level: level || "Level 2"
  });
  const now = new Date().toISOString();

  if (pgPool) {
    await pgPool.query(
      `INSERT INTO student_recordings (id, user_id, book_id, week_num, repeat_num, transcript, audio_data_url, ai_feedback_json)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb)`,
      [
        id,
        userId,
        bookId,
        Number(weekNum) || 1,
        Number(repeatNum) || 1,
        String(transcript || "").slice(0, 1000),
        String(audioDataUrl || ""),
        JSON.stringify(aiFeedback)
      ]
    );
    return {
      id,
      user_id: userId,
      book_id: bookId,
      week_num: Number(weekNum) || 1,
      repeat_num: Number(repeatNum) || 1,
      transcript: String(transcript || ""),
      audio_data_url: String(audioDataUrl || ""),
      ai_feedback: aiFeedback,
      created_at: now
    };
  }

  sqliteDb
    .prepare(
      `INSERT INTO student_recordings (id, user_id, book_id, week_num, repeat_num, transcript, audio_data_url, ai_feedback_json, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      id,
      userId,
      bookId,
      Number(weekNum) || 1,
      Number(repeatNum) || 1,
      String(transcript || "").slice(0, 1000),
      String(audioDataUrl || ""),
      JSON.stringify(aiFeedback),
      now
    );

  return {
    id,
    user_id: userId,
    book_id: bookId,
    week_num: Number(weekNum) || 1,
    repeat_num: Number(repeatNum) || 1,
    transcript: String(transcript || ""),
    audio_data_url: String(audioDataUrl || ""),
    ai_feedback: aiFeedback,
    created_at: now
  };
}

async function listStudentRecordings(userId) {
  if (pgPool) {
    const { rows } = userId
      ? await pgPool.query(
          "SELECT * FROM student_recordings WHERE user_id = $1 ORDER BY created_at DESC LIMIT 40",
          [userId]
        )
      : await pgPool.query("SELECT * FROM student_recordings ORDER BY created_at DESC LIMIT 60");
    return rows.map((r) => ({
      ...r,
      ai_feedback: parseJsonField(r.ai_feedback_json, {})
    }));
  }

  const rows = userId
    ? sqliteDb
        .prepare("SELECT * FROM student_recordings WHERE user_id = ? ORDER BY created_at DESC LIMIT 40")
        .all(userId)
    : sqliteDb.prepare("SELECT * FROM student_recordings ORDER BY created_at DESC LIMIT 60").all();
  return rows.map((r) => ({
    ...r,
    ai_feedback: parseJsonField(r.ai_feedback_json, {})
  }));
}

async function getCachedTtsAudio(cacheKey) {
  if (pgPool) {
    const { rows } = await pgPool.query(
      "SELECT audio_bytes FROM tts_audio_cache WHERE cache_key = $1 LIMIT 1",
      [cacheKey]
    );
    return rows[0]?.audio_bytes || null;
  }
  const row = sqliteDb
    .prepare("SELECT audio_bytes FROM tts_audio_cache WHERE cache_key = ? LIMIT 1")
    .get(cacheKey);
  return row?.audio_bytes ? Buffer.from(row.audio_bytes) : null;
}

async function saveCachedTtsAudio(cacheKey, audioBuf) {
  if (!audioBuf || !audioBuf.length) return;
  if (pgPool) {
    await pgPool.query(
      `INSERT INTO tts_audio_cache (cache_key, content_type, audio_bytes)
       VALUES ($1, 'audio/mpeg', $2)
       ON CONFLICT (cache_key) DO NOTHING`,
      [cacheKey, audioBuf]
    );
    return;
  }
  sqliteDb
    .prepare(
      `INSERT OR IGNORE INTO tts_audio_cache (cache_key, content_type, audio_bytes, created_at)
       VALUES (?, 'audio/mpeg', ?, ?)`
    )
    .run(cacheKey, audioBuf, new Date().toISOString());
}

function getDbEngineInfo() {
  return {
    engine: activeDbEngine,
    postgresConnected: Boolean(pgPool)
  };
}

initSqliteDatabase();

module.exports = {
  db: sqliteDb,
  initPostgresPoolIfConfigured,
  getDbEngineInfo,
  getAllBootstrapData,
  getOrExtractVocabAndChunks,
  updateUserProgress,
  verifyStudentPin,
  verifyTeacherLogin,
  createStudent,
  updateStudentAssignment,
  deleteStudent,
  createTeacher,
  deleteTeacher,
  createBook,
  updateBook,
  reanalyzeAllBooksWithLLM,
  saveStudentRecording,
  listStudentRecordings,
  getCachedTtsAudio,
  saveCachedTtsAudio
};

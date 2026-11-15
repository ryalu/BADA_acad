/**
 * BADA 영어 Database Layer (PostgreSQL Primary + SQLite Auto-Fallback)
 * - Supports Local PostgreSQL & Cloud PostgreSQL (Supabase, Neon, Railway, RDS) via `DATABASE_URL` or `PG*` env vars.
 * - Automatically creates tables and seeds initial data on startup.
 * - Falls back seamlessly to Node.js built-in SQLite if PostgreSQL is not yet configured or unreachable.
 */

const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { DatabaseSync } = require("node:sqlite");
const { analyzeTextWithLLM } = require("./ai-engine");

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

function hashText(text) {
  return crypto
    .createHash("sha256")
    .update(text.trim().replace(/\s+/g, " ").toLowerCase())
    .digest("hex")
    .slice(0, 24);
}

// ============================================================================
// ENGINE 1: SQLITE FALLBACK / LOCAL CACHE
// ============================================================================
const DB_PATH = path.join(__dirname, "bada_english.sqlite");
const sqliteDb = new DatabaseSync(DB_PATH);

function initSqliteDatabase() {
  sqliteDb.exec(`
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
  `);

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
        progress_w1, progress_w2, progress_w3, progress_w4,
        audio_w1_url, audio_w4_url, w1_wpm, w4_wpm, w1_accuracy, w4_accuracy,
        strengths_json, weaknesses_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const u of INITIAL_USERS) {
      insertUser.run(
        u.id, u.name, u.grade_label, u.grade_group, u.age, u.level, u.current_book_id,
        u.progress_w1, u.progress_w2, u.progress_w3, u.progress_w4,
        u.audio_w1_url, u.audio_w4_url, u.w1_wpm, u.w4_wpm, u.w1_accuracy, u.w4_accuracy,
        JSON.stringify(u.strengths), JSON.stringify(u.weaknesses)
      );
    }
  }
}

function getOrExtractVocabAndChunksSqlite(rawText, level = "Level 2", bookId = null, isSeed = false) {
  const tHash = hashText(rawText);
  const now = new Date().toISOString();

  const existing = sqliteDb.prepare("SELECT * FROM vocab_chunks WHERE text_hash = ?").get(tHash);
  if (existing) {
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
      vocab: JSON.parse(existing.vocab_json),
      chunks: JSON.parse(existing.chunks_json),
      core_expressions: JSON.parse(existing.core_expressions_json),
      last_hit_at: now
    };
  }

  const extracted = analyzeTextWithLLM(rawText, level);
  sqliteDb.prepare(`
    INSERT INTO vocab_chunks (
      text_hash, book_id, raw_text, vocab_json, chunks_json, core_expressions_json,
      lookup_count, extraction_source, created_at, last_hit_at
    ) VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?, ?)
  `).run(
    tHash,
    bookId || `custom_${tHash.slice(0, 8)}`,
    rawText.trim(),
    JSON.stringify(extracted.vocab),
    JSON.stringify(extracted.chunks),
    JSON.stringify(extracted.core_expressions),
    isSeed ? "SEED_LLM_EXTRACTED" : "LIVE_LLM_EXTRACTED",
    now,
    now
  );

  sqliteDb.prepare("INSERT INTO cache_audit_logs (timestamp, text_preview, text_hash, status, detail) VALUES (?, ?, ?, ?, ?)").run(
    now,
    rawText.slice(0, 60) + (rawText.length > 60 ? "..." : ""),
    tHash,
    "CACHE_MISS_LLM_SAVED",
    `신규 텍스트 감지 ➔ LLM 단어(${extracted.vocab.length}개)·청크(${extracted.chunks.length}개)·핵심표현(${extracted.core_expressions.length}개) 추출 후 DB 영구 저장`
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
             lookup_count, extraction_source
           ) VALUES ($1, $2, $3, $4::jsonb, $5::jsonb, $6::jsonb, 1, 'SEED_LLM_EXTRACTED')
           ON CONFLICT (text_hash) DO NOTHING`,
          [
            tHash,
            b.id,
            b.full_text.trim(),
            JSON.stringify(extracted.vocab),
            JSON.stringify(extracted.chunks),
            JSON.stringify(extracted.core_expressions)
          ]
        );
      }

      for (const u of INITIAL_USERS) {
        await candidatePool.query(
          `INSERT INTO users (
             id, name, grade_label, grade_group, age, level, current_book_id,
             progress_w1, progress_w2, progress_w3, progress_w4,
             audio_w1_url, audio_w4_url, w1_wpm, w4_wpm, w1_accuracy, w4_accuracy,
             strengths_json, weaknesses_json
           ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18::jsonb,$19::jsonb)
           ON CONFLICT (id) DO NOTHING`,
          [
            u.id, u.name, u.grade_label, u.grade_group, u.age, u.level, u.current_book_id,
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

async function getAllBootstrapData() {
  if (pgPool) {
    const usersRes = await pgPool.query("SELECT * FROM users ORDER BY age ASC");
    const booksRes = await pgPool.query("SELECT * FROM books");
    const vcRes = await pgPool.query("SELECT * FROM vocab_chunks");
    const logsRes = await pgPool.query("SELECT * FROM cache_audit_logs ORDER BY id DESC LIMIT 12");

    const vcMap = new Map(vcRes.rows.map((r) => [r.text_hash, r]));

    const users = usersRes.rows.map((u) => ({
      ...u,
      strengths: typeof u.strengths_json === "string" ? JSON.parse(u.strengths_json) : u.strengths_json,
      weaknesses: typeof u.weaknesses_json === "string" ? JSON.parse(u.weaknesses_json) : u.weaknesses_json
    }));

    const books = booksRes.rows.map((b) => {
      const vc = vcMap.get(b.text_hash);
      return {
        ...b,
        vocab: vc ? (typeof vc.vocab_json === "string" ? JSON.parse(vc.vocab_json) : vc.vocab_json) : [],
        chunks: vc ? (typeof vc.chunks_json === "string" ? JSON.parse(vc.chunks_json) : vc.chunks_json) : [],
        core_expressions: vc
          ? typeof vc.core_expressions_json === "string"
            ? JSON.parse(vc.core_expressions_json)
            : vc.core_expressions_json
          : [],
        lookup_count: vc ? vc.lookup_count : 1
      };
    });

    return { users, books, auditLogs: logsRes.rows, dbEngine: activeDbEngine };
  }

  // SQLite fallback
  const users = sqliteDb.prepare("SELECT * FROM users").all().map((u) => ({
    ...u,
    strengths: JSON.parse(u.strengths_json),
    weaknesses: JSON.parse(u.weaknesses_json)
  }));

  const books = sqliteDb.prepare("SELECT * FROM books").all().map((b) => {
    const vc = sqliteDb.prepare("SELECT * FROM vocab_chunks WHERE text_hash = ?").get(b.text_hash);
    return {
      ...b,
      vocab: vc ? JSON.parse(vc.vocab_json) : [],
      chunks: vc ? JSON.parse(vc.chunks_json) : [],
      core_expressions: vc ? JSON.parse(vc.core_expressions_json) : [],
      lookup_count: vc ? vc.lookup_count : 1
    };
  });

  const auditLogs = sqliteDb.prepare("SELECT * FROM cache_audit_logs ORDER BY id DESC LIMIT 12").all();
  return { users, books, auditLogs, dbEngine: activeDbEngine };
}

async function getOrExtractVocabAndChunks(rawText, level = "Level 2", bookId = null, isSeed = false) {
  if (pgPool) {
    const tHash = hashText(rawText);
    const now = new Date().toISOString();
    const existingRes = await pgPool.query("SELECT * FROM vocab_chunks WHERE text_hash = $1", [tHash]);

    if (existingRes.rows.length > 0) {
      const existing = existingRes.rows[0];
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
        vocab: typeof existing.vocab_json === "string" ? JSON.parse(existing.vocab_json) : existing.vocab_json,
        chunks: typeof existing.chunks_json === "string" ? JSON.parse(existing.chunks_json) : existing.chunks_json,
        core_expressions:
          typeof existing.core_expressions_json === "string"
            ? JSON.parse(existing.core_expressions_json)
            : existing.core_expressions_json,
        last_hit_at: now
      };
    }

    const extracted = analyzeTextWithLLM(rawText, level);
    const bId = bookId || `custom_${tHash.slice(0, 8)}`;
    await pgPool.query(
      `INSERT INTO vocab_chunks (
         text_hash, book_id, raw_text, vocab_json, chunks_json, core_expressions_json,
         lookup_count, extraction_source
       ) VALUES ($1, $2, $3, $4::jsonb, $5::jsonb, $6::jsonb, 1, $7)`,
      [
        tHash,
        bId,
        rawText.trim(),
        JSON.stringify(extracted.vocab),
        JSON.stringify(extracted.chunks),
        JSON.stringify(extracted.core_expressions),
        isSeed ? "SEED_LLM_EXTRACTED" : "LIVE_LLM_EXTRACTED"
      ]
    );

    await pgPool.query(
      "INSERT INTO cache_audit_logs (timestamp, text_preview, text_hash, status, detail) VALUES (NOW(), $1, $2, $3, $4)",
      [
        rawText.slice(0, 60) + (rawText.length > 60 ? "..." : ""),
        tHash,
        "CACHE_MISS_LLM_SAVED",
        `신규 텍스트 감지 ➔ LLM 추출 후 PostgreSQL 영구 저장`
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
      last_hit_at: now
    };
  }

  return getOrExtractVocabAndChunksSqlite(rawText, level, bookId, isSeed);
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
    return rows[0];
  }

  sqliteDb.prepare(`UPDATE users SET ${col} = ? WHERE id = ?`).run(safeProg, userId);
  if (audioUrl && (weekNumber === 1 || weekNumber === 4)) {
    const audioCol = weekNumber === 1 ? "audio_w1_url" : "audio_w4_url";
    sqliteDb.prepare(`UPDATE users SET ${audioCol} = ? WHERE id = ?`).run(audioUrl, userId);
  }
  return sqliteDb.prepare("SELECT * FROM users WHERE id = ?").get(userId);
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
  updateUserProgress
};

/**
 * 3-Stage Vocabulary DB Module (PostgreSQL Primary + SQLite Auto-Fallback)
 * - 3 Teacher-Selectable Tiers: `elem_800` (800), `mid_high` (1,800), `all` (2,483)
 * - Stage 1: A-Z monthly initial-phonics & meaning study (concrete-first, image cards,
 *            daily meaning or picture-to-word quiz + 80% final test)
 * - Stage 2: Visualized phonics & spelling mastery (red highlights, tile-pick or keyboard typing)
 * - Stage 3: Prefix & Suffix morphological word expansion families
 * - Mandatory Post-Quiz Confusing Pronunciation Mini-Learning ("헷갈리는 발음 콕콕")
 */

const fs = require("node:fs");
const path = require("node:path");
const { getPgPool, getSqliteDb, parseJsonField, getKstTodayDateString } = require("./connection");
const {
  buildDay1ListenSession,
  buildDay2SpeakSession
} = require("./pronunciationRules");

const MASTER_JSON_PATH = path.resolve(__dirname, "..", "data", "vocab_master.json");

function toKstDate(ts) {
  if (!ts) return "";
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Seoul",
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    }).format(new Date(ts));
  } catch (_) {
    return String(ts).slice(0, 10);
  }
}

function diffDaysYmd(fromYmd, toYmd) {
  if (!fromYmd || !toYmd) return 0;
  const ms = new Date(`${toYmd}T00:00:00Z`).getTime() - new Date(`${fromYmd}T00:00:00Z`).getTime();
  return Math.max(0, Math.round(ms / 86400000));
}

function shuffleArray(arr) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function normalizeVocabTier(rawTier) {
  const clean = String(rawTier || "").trim();
  return ["elem_800", "mid_high", "all"].includes(clean) ? clean : "all";
}

function normalizeS1QuizMode(rawMode) {
  const clean = String(rawMode || "").trim();
  return ["meaning", "picture_to_word", "mixed"].includes(clean) ? clean : "meaning";
}

function normalizeSingleStage1Key(rawKey) {
  const ch = String(rawKey || "A").trim().slice(0, 1).toUpperCase();
  return /^[A-WY-Z]$/.test(ch) ? ch : "A";
}

function formatVocabWordRow(r) {
  return {
    id: r.id,
    word: r.word,
    display_word: r.display_word,
    meaning_kr: r.meaning_kr,
    initial_letter: r.initial_letter,
    is_elem_800: Boolean(r.is_elem_800),
    is_mid_high: Boolean(r.is_mid_high),
    elem_no: r.elem_no ?? null,
    mh_no: r.mh_no ?? null,
    elem_unit_key: r.elem_unit_key ?? null,
    mh_unit_key: r.mh_unit_key ?? null,
    image_url: r.image_url || null,
    is_abstract: Boolean(r.is_abstract),
    phonics_spans: parseJsonField(r.phonics_spans_json, []),
    phonics_unit_ids: parseJsonField(r.phonics_unit_ids_json, [])
  };
}

function formatVocabProgressRow(r) {
  return {
    user_id: r.user_id,
    vocab_tier: normalizeVocabTier(r.vocab_tier),
    s1_quiz_mode: normalizeS1QuizMode(r.s1_quiz_mode),
    current_stage: Number(r.current_stage) || 1,
    current_unit_key: r.current_unit_key || "A",
    unit_started_at: r.unit_started_at || getKstTodayDateString(),
    completed_s1_units: parseJsonField(r.completed_s1_units_json, []),
    early_test_unlocked: Boolean(r.early_test_unlocked),
    current_s2_unit: r.current_s2_unit || "s2_long_a",
    s2_input_mode: r.s2_input_mode || "tiles",
    completed_s2_units: parseJsonField(r.completed_s2_units_json, []),
    current_s3_unit: r.current_s3_unit || "s3_pre_un",
    completed_s3_units: parseJsonField(r.completed_s3_units_json, []),
    pronunciation_done_date: r.pronunciation_done_date || null,
    pronunciation_cycle: normalizePronunciationCycle(parseJsonField(r.pronunciation_cycle_json, {})),
    updated_at: r.updated_at
  };
}

function normalizePronunciationCycle(raw) {
  const obj = raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};
  return {
    unit_scope: obj.unit_scope ? String(obj.unit_scope) : "",
    pending_speak_words: Array.isArray(obj.pending_speak_words) ? obj.pending_speak_words : [],
    pending_created_date: obj.pending_created_date ? String(obj.pending_created_date) : null,
    practiced_word_ids: Array.isArray(obj.practiced_word_ids) ? obj.practiced_word_ids : [],
    last_mode: obj.last_mode ? String(obj.last_mode) : null,
    last_completed_date: obj.last_completed_date ? String(obj.last_completed_date) : null
  };
}

function resolveNextPronunciationMode({ progress, stage, unitKey, tier, todayKst }) {
  const cycle = normalizePronunciationCycle(progress?.pronunciation_cycle);
  const scopeKey = `${Number(stage) || 1}:${String(unitKey || "A").trim()}:${normalizeVocabTier(tier)}`;
  const hasPendingFromEarlierDay =
    cycle.unit_scope === scopeKey &&
    cycle.pending_speak_words.length > 0 &&
    Boolean(cycle.pending_created_date) &&
    cycle.pending_created_date !== todayKst;
  return hasPendingFromEarlierDay ? "day2_speak" : "day1_listen";
}

/**
 * Executes chunked multi-row PostgreSQL upserts inside an active transaction.
 */
async function runChunkedPgUpsert(client, items, chunkSize, colCasts, mapRow, sqlPrefix, sqlSuffix) {
  for (let i = 0; i < items.length; i += chunkSize) {
    const chunk = items.slice(i, i + chunkSize);
    const values = [];
    const tuples = chunk.map((item, rowIdx) => {
      const rowVals = mapRow(item);
      const base = rowIdx * colCasts.length;
      values.push(...rowVals);
      const cols = colCasts.map((cast, cIdx) => `$${base + cIdx + 1}${cast}`);
      return `(${cols.join(",")})`;
    });
    await client.query(`${sqlPrefix} VALUES ${tuples.join(",")} ${sqlSuffix}`, values);
  }
}

/**
 * Loads `data/vocab_master.json` and upserts all units, words, and affix families.
 */
async function syncVocabMasterData() {
  if (!fs.existsSync(MASTER_JSON_PATH)) {
    throw new Error("data/vocab_master.json 파일이 없습니다. 먼저 `python scripts/extract_vocab_pdfs.py`를 실행해 주세요.");
  }
  const master = JSON.parse(fs.readFileSync(MASTER_JSON_PATH, "utf8"));
  const units = Array.isArray(master.units) ? master.units : [];
  const words = Array.isArray(master.words) ? master.words : [];
  const affixItems = Array.isArray(master.affix_items) ? master.affix_items : [];

  const pgPool = getPgPool();
  if (pgPool) {
    const client = await pgPool.connect();
    try {
      await client.query("BEGIN");
      await client.query("DELETE FROM vocab_units");
      await runChunkedPgUpsert(
        client,
        units,
        50,
        ["", "", "", "", "", "", "", ""],
        (u) => [u.id, u.tier, u.stage, u.unit_key, u.title_kr, u.rule_summary_kr, u.word_count, u.sort_order],
        `INSERT INTO vocab_units (id, tier, stage, unit_key, title_kr, rule_summary_kr, word_count, sort_order)`,
        `ON CONFLICT (id) DO UPDATE SET
           tier = EXCLUDED.tier,
           stage = EXCLUDED.stage,
           unit_key = EXCLUDED.unit_key,
           title_kr = EXCLUDED.title_kr,
           rule_summary_kr = EXCLUDED.rule_summary_kr,
           word_count = EXCLUDED.word_count,
           sort_order = EXCLUDED.sort_order`
      );

      await runChunkedPgUpsert(
        client,
        words,
        180,
        ["", "", "", "", "", "", "", "", "", "", "", "", "", "::jsonb", "::jsonb"],
        (w) => [
          w.id,
          w.word,
          w.display_word,
          w.meaning_kr,
          w.initial_letter,
          Boolean(w.is_elem_800),
          Boolean(w.is_mid_high),
          w.elem_no ?? null,
          w.mh_no ?? null,
          w.elem_unit_key ?? null,
          w.mh_unit_key ?? null,
          w.image_url || null,
          Boolean(w.is_abstract),
          JSON.stringify(w.phonics_spans || []),
          JSON.stringify(w.phonics_unit_ids || [])
        ],
        `INSERT INTO vocab_bank (
           id, word, display_word, meaning_kr, initial_letter,
           is_elem_800, is_mid_high, elem_no, mh_no, elem_unit_key, mh_unit_key,
           image_url, is_abstract, phonics_spans_json, phonics_unit_ids_json
         )`,
        `ON CONFLICT (id) DO UPDATE SET
           word = EXCLUDED.word,
           display_word = EXCLUDED.display_word,
           meaning_kr = EXCLUDED.meaning_kr,
           initial_letter = EXCLUDED.initial_letter,
           is_elem_800 = EXCLUDED.is_elem_800,
           is_mid_high = EXCLUDED.is_mid_high,
           elem_no = EXCLUDED.elem_no,
           mh_no = EXCLUDED.mh_no,
           elem_unit_key = EXCLUDED.elem_unit_key,
           mh_unit_key = EXCLUDED.mh_unit_key,
           image_url = EXCLUDED.image_url,
           is_abstract = EXCLUDED.is_abstract,
           phonics_spans_json = EXCLUDED.phonics_spans_json,
           phonics_unit_ids_json = EXCLUDED.phonics_unit_ids_json`
      );

      await runChunkedPgUpsert(
        client,
        affixItems,
        50,
        Array(15).fill(""),
        (a) => [
          a.id,
          a.unit_id,
          a.affix,
          a.affix_type,
          a.affix_meaning_kr,
          a.root_word,
          a.root_meaning_kr,
          a.root_pos,
          a.derived_word,
          a.derived_meaning_kr,
          a.derived_pos,
          a.explanation_kr,
          Boolean(a.root_in_pdf),
          Boolean(a.derived_in_pdf),
          a.sort_order
        ],
        `INSERT INTO vocab_affix_items (
           id, unit_id, affix, affix_type, affix_meaning_kr,
           root_word, root_meaning_kr, root_pos,
           derived_word, derived_meaning_kr, derived_pos,
           explanation_kr, root_in_pdf, derived_in_pdf, sort_order
         )`,
        `ON CONFLICT (id) DO UPDATE SET
           unit_id = EXCLUDED.unit_id,
           affix = EXCLUDED.affix,
           affix_type = EXCLUDED.affix_type,
           affix_meaning_kr = EXCLUDED.affix_meaning_kr,
           root_word = EXCLUDED.root_word,
           root_meaning_kr = EXCLUDED.root_meaning_kr,
           root_pos = EXCLUDED.root_pos,
           derived_word = EXCLUDED.derived_word,
           derived_meaning_kr = EXCLUDED.derived_meaning_kr,
           derived_pos = EXCLUDED.derived_pos,
           explanation_kr = EXCLUDED.explanation_kr,
           root_in_pdf = EXCLUDED.root_in_pdf,
           derived_in_pdf = EXCLUDED.derived_in_pdf,
           sort_order = EXCLUDED.sort_order`
      );
      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
    return {
      engine: "postgresql",
      units: units.length,
      words: words.length,
      affixItems: affixItems.length
    };
  }

  const sqliteDb = getSqliteDb();
  sqliteDb.exec("BEGIN");
  try {
    sqliteDb.exec("DELETE FROM vocab_units");
    const unitStmt = sqliteDb.prepare(`
      INSERT INTO vocab_units (id, tier, stage, unit_key, title_kr, rule_summary_kr, word_count, sort_order)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        tier = excluded.tier,
        stage = excluded.stage,
        unit_key = excluded.unit_key,
        title_kr = excluded.title_kr,
        rule_summary_kr = excluded.rule_summary_kr,
        word_count = excluded.word_count,
        sort_order = excluded.sort_order
    `);
    for (const u of units) {
      unitStmt.run(u.id, u.tier, u.stage, u.unit_key, u.title_kr, u.rule_summary_kr, u.word_count, u.sort_order);
    }

    const wordStmt = sqliteDb.prepare(`
      INSERT INTO vocab_bank (
        id, word, display_word, meaning_kr, initial_letter,
        is_elem_800, is_mid_high, elem_no, mh_no, elem_unit_key, mh_unit_key,
        image_url, is_abstract, phonics_spans_json, phonics_unit_ids_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        word = excluded.word,
        display_word = excluded.display_word,
        meaning_kr = excluded.meaning_kr,
        initial_letter = excluded.initial_letter,
        is_elem_800 = excluded.is_elem_800,
        is_mid_high = excluded.is_mid_high,
        elem_no = excluded.elem_no,
        mh_no = excluded.mh_no,
        elem_unit_key = excluded.elem_unit_key,
        mh_unit_key = excluded.mh_unit_key,
        image_url = excluded.image_url,
        is_abstract = excluded.is_abstract,
        phonics_spans_json = excluded.phonics_spans_json,
        phonics_unit_ids_json = excluded.phonics_unit_ids_json
    `);
    for (const w of words) {
      wordStmt.run(
        w.id,
        w.word,
        w.display_word,
        w.meaning_kr,
        w.initial_letter,
        w.is_elem_800 ? 1 : 0,
        w.is_mid_high ? 1 : 0,
        w.elem_no ?? null,
        w.mh_no ?? null,
        w.elem_unit_key ?? null,
        w.mh_unit_key ?? null,
        w.image_url || null,
        w.is_abstract ? 1 : 0,
        JSON.stringify(w.phonics_spans || []),
        JSON.stringify(w.phonics_unit_ids || [])
      );
    }

    const affixStmt = sqliteDb.prepare(`
      INSERT INTO vocab_affix_items (
        id, unit_id, affix, affix_type, affix_meaning_kr,
        root_word, root_meaning_kr, root_pos,
        derived_word, derived_meaning_kr, derived_pos,
        explanation_kr, root_in_pdf, derived_in_pdf, sort_order
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        unit_id = excluded.unit_id,
        affix = excluded.affix,
        affix_type = excluded.affix_type,
        affix_meaning_kr = excluded.affix_meaning_kr,
        root_word = excluded.root_word,
        root_meaning_kr = excluded.root_meaning_kr,
        root_pos = excluded.root_pos,
        derived_word = excluded.derived_word,
        derived_meaning_kr = excluded.derived_meaning_kr,
        derived_pos = excluded.derived_pos,
        explanation_kr = excluded.explanation_kr,
        root_in_pdf = excluded.root_in_pdf,
        derived_in_pdf = excluded.derived_in_pdf,
        sort_order = excluded.sort_order
    `);
    for (const a of affixItems) {
      affixStmt.run(
        a.id,
        a.unit_id,
        a.affix,
        a.affix_type,
        a.affix_meaning_kr,
        a.root_word,
        a.root_meaning_kr,
        a.root_pos,
        a.derived_word,
        a.derived_meaning_kr,
        a.derived_pos,
        a.explanation_kr,
        a.root_in_pdf ? 1 : 0,
        a.derived_in_pdf ? 1 : 0,
        a.sort_order
      );
    }
    sqliteDb.exec("COMMIT");
  } catch (err) {
    sqliteDb.exec("ROLLBACK");
    throw err;
  }

  return {
    engine: "sqlite",
    units: units.length,
    words: words.length,
    affixItems: affixItems.length
  };
}

async function seedVocabIfEmpty() {
  if (!fs.existsSync(MASTER_JSON_PATH)) {
    return { skipped: true, reason: "no_vocab_master_json" };
  }
  const master = JSON.parse(fs.readFileSync(MASTER_JSON_PATH, "utf8"));
  const masterImgCount = Array.isArray(master.words) ? master.words.filter((w) => Boolean(w.image_url)).length : 0;

  const pgPool = getPgPool();
  if (pgPool) {
    const { rows } = await pgPool.query(
      "SELECT COUNT(*)::int AS cnt, COUNT(*) FILTER (WHERE image_url IS NOT NULL)::int AS img_cnt FROM vocab_bank"
    );
    const { rows: uRows } = await pgPool.query(
      "SELECT COUNT(*)::int AS cnt FROM vocab_units WHERE stage = 1 AND tier = 'elem_800'"
    );
    if (rows[0].cnt > 0 && uRows[0].cnt === 25 && rows[0].img_cnt >= masterImgCount) {
      return { skipped: true, reason: "already_seeded", count: rows[0].cnt };
    }
    return await syncVocabMasterData();
  }
  const sqliteDb = getSqliteDb();
  const bankStat = sqliteDb
    .prepare("SELECT COUNT(*) AS cnt, SUM(CASE WHEN image_url IS NOT NULL THEN 1 ELSE 0 END) AS img_cnt FROM vocab_bank")
    .get();
  const uCnt = sqliteDb
    .prepare("SELECT COUNT(*) AS cnt FROM vocab_units WHERE stage = 1 AND tier = 'elem_800'")
    .get().cnt;
  if (bankStat.cnt > 0 && uCnt === 25 && Number(bankStat.img_cnt || 0) >= masterImgCount) {
    return { skipped: true, reason: "already_seeded", count: bankStat.cnt };
  }
  return await syncVocabMasterData();
}

function inferDefaultsForNewStudent(u = {}) {
  const age = Number(u.age) || 9;
  const gradeLabel = String(u.grade_label || "");
  const isKindergarten = age <= 7 || /유치/.test(gradeLabel);
  const isElementary = !isKindergarten && (age <= 12 || /초등/.test(gradeLabel));

  return {
    vocab_tier: isKindergarten || isElementary ? "elem_800" : "mid_high",
    s1_quiz_mode: isKindergarten ? "picture_to_word" : "meaning",
    s2_input_mode: age >= 11 ? "typing" : "tiles"
  };
}

async function getOrInitStudentVocabProgress(userId) {
  const cleanUid = String(userId || "").trim();
  if (!cleanUid) throw new Error("학생 ID가 필요합니다.");

  const pgPool = getPgPool();
  const todayKst = getKstTodayDateString();
  const nowIso = new Date().toISOString();

  if (pgPool) {
    const { rows } = await pgPool.query("SELECT * FROM student_vocab_progress WHERE user_id = $1 LIMIT 1", [cleanUid]);
    if (rows.length > 0) {
      const row = rows[0];
      const normTier = normalizeVocabTier(row.vocab_tier);
      const normMode = normalizeS1QuizMode(row.s1_quiz_mode);
      const normKey = normalizeSingleStage1Key(row.current_unit_key);
      if (normTier !== row.vocab_tier || normMode !== row.s1_quiz_mode || normKey !== row.current_unit_key) {
        await pgPool.query(
          "UPDATE student_vocab_progress SET vocab_tier = $1, s1_quiz_mode = $2, current_unit_key = $3, updated_at = NOW() WHERE user_id = $4",
          [normTier, normMode, normKey, cleanUid]
        );
        row.vocab_tier = normTier;
        row.s1_quiz_mode = normMode;
        row.current_unit_key = normKey;
      }
      return formatVocabProgressRow(row);
    }

    const uRes = await pgPool.query("SELECT age, grade_label FROM users WHERE id = $1 LIMIT 1", [cleanUid]);
    const defaults = inferDefaultsForNewStudent(uRes.rows[0]);

    await pgPool.query(
      `INSERT INTO student_vocab_progress (
         user_id, vocab_tier, s1_quiz_mode, current_stage, current_unit_key, unit_started_at,
         completed_s1_units_json, early_test_unlocked,
         current_s2_unit, s2_input_mode, completed_s2_units_json,
         current_s3_unit, completed_s3_units_json
       ) VALUES ($1,$2,$3,1,'A',$4,'[]'::jsonb,FALSE,'s2_long_a',$5,'[]'::jsonb,'s3_pre_un','[]'::jsonb)`,
      [cleanUid, defaults.vocab_tier, defaults.s1_quiz_mode, todayKst, defaults.s2_input_mode]
    );
    const created = await pgPool.query("SELECT * FROM student_vocab_progress WHERE user_id = $1 LIMIT 1", [cleanUid]);
    return formatVocabProgressRow(created.rows[0]);
  }

  const sqliteDb = getSqliteDb();
  const existing = sqliteDb.prepare("SELECT * FROM student_vocab_progress WHERE user_id = ? LIMIT 1").get(cleanUid);
  if (existing) {
    const normTier = normalizeVocabTier(existing.vocab_tier);
    const normMode = normalizeS1QuizMode(existing.s1_quiz_mode);
    const normKey = normalizeSingleStage1Key(existing.current_unit_key);
    if (normTier !== existing.vocab_tier || normMode !== existing.s1_quiz_mode || normKey !== existing.current_unit_key) {
      sqliteDb
        .prepare("UPDATE student_vocab_progress SET vocab_tier = ?, s1_quiz_mode = ?, current_unit_key = ?, updated_at = ? WHERE user_id = ?")
        .run(normTier, normMode, normKey, nowIso, cleanUid);
      existing.vocab_tier = normTier;
      existing.s1_quiz_mode = normMode;
      existing.current_unit_key = normKey;
    }
    return formatVocabProgressRow(existing);
  }

  const u = sqliteDb.prepare("SELECT age, grade_label FROM users WHERE id = ? LIMIT 1").get(cleanUid) || {};
  const defaults = inferDefaultsForNewStudent(u);

  sqliteDb
    .prepare(
      `INSERT INTO student_vocab_progress (
         user_id, vocab_tier, s1_quiz_mode, current_stage, current_unit_key, unit_started_at,
         completed_s1_units_json, early_test_unlocked,
         current_s2_unit, s2_input_mode, completed_s2_units_json,
         current_s3_unit, completed_s3_units_json, updated_at
       ) VALUES (?, ?, ?, 1, 'A', ?, '[]', 0, 's2_long_a', ?, '[]', 's3_pre_un', '[]', ?)`
    )
    .run(cleanUid, defaults.vocab_tier, defaults.s1_quiz_mode, todayKst, defaults.s2_input_mode, nowIso);

  return formatVocabProgressRow(sqliteDb.prepare("SELECT * FROM student_vocab_progress WHERE user_id = ? LIMIT 1").get(cleanUid));
}

async function getStudentVocabState(userId) {
  const progress = await getOrInitStudentVocabProgress(userId);
  const todayKst = getKstTodayDateString();
  const daysElapsed = diffDaysYmd(progress.unit_started_at, todayKst);

  const pgPool = getPgPool();
  let units = [];
  let attempts = [];

  if (pgPool) {
    const uRes = await pgPool.query("SELECT * FROM vocab_units ORDER BY stage ASC, sort_order ASC");
    units = uRes.rows;

    const aRes = await pgPool.query(
      `SELECT * FROM student_vocab_attempts
       WHERE user_id = $1 ORDER BY created_at DESC LIMIT 20`,
      [userId]
    );
    attempts = aRes.rows.map((a) => ({
      ...a,
      passed: Boolean(a.passed),
      wrong_word_ids: parseJsonField(a.wrong_word_ids_json, [])
    }));
  } else {
    const sqliteDb = getSqliteDb();
    units = sqliteDb.prepare("SELECT * FROM vocab_units ORDER BY stage ASC, sort_order ASC").all();

    attempts = sqliteDb
      .prepare(
        `SELECT * FROM student_vocab_attempts
         WHERE user_id = ? ORDER BY created_at DESC LIMIT 20`
      )
      .all(userId)
      .map((a) => ({
        ...a,
        passed: Boolean(a.passed),
        wrong_word_ids: parseJsonField(a.wrong_word_ids_json, [])
      }));
  }

  const stage1All = units.filter((u) => Number(u.stage) === 1);
  const stage1ByTier = {
    elem_800: stage1All.filter((u) => u.tier === "elem_800"),
    mid_high: stage1All.filter((u) => u.tier === "mid_high"),
    all: stage1All.filter((u) => u.tier === "all")
  };

  const todayQuizAttempted = attempts.some((a) => toKstDate(a.created_at) === todayKst);
  const todayPronunciationDone = progress.pronunciation_done_date === todayKst;
  const todayDailyQuizDone = todayQuizAttempted && todayPronunciationDone;
  const activeUnitKey =
    progress.current_stage === 1
      ? progress.current_unit_key
      : progress.current_stage === 2
        ? progress.current_s2_unit
        : progress.current_s3_unit;
  const nextPronunciationMode = resolveNextPronunciationMode({
    progress,
    stage: progress.current_stage,
    unitKey: activeUnitKey,
    tier: progress.vocab_tier,
    todayKst
  });

  const recentWrongWordIds = Array.from(
    new Set(
      attempts
        .filter((a) => a.stage === progress.current_stage)
        .slice(0, 5)
        .flatMap((a) => a.wrong_word_ids || [])
    )
  );

  return {
    progress,
    todayKst,
    daysElapsed,
    monthReady: daysElapsed >= 30 || progress.early_test_unlocked,
    todayQuizAttempted,
    todayPronunciationDone,
    todayDailyQuizDone,
    nextPronunciationMode,
    recentWrongWordIds,
    stage1ByTier,
    units: {
      stage1: stage1ByTier[progress.vocab_tier] || stage1ByTier.all,
      stage2: units.filter((u) => Number(u.stage) === 2),
      stage3: units.filter((u) => Number(u.stage) === 3)
    },
    recentAttempts: attempts
  };
}

function sortWordsConcreteFirst(words, tier) {
  const rank = (w) => {
    if (tier === "elem_800") return w.is_abstract ? 1 : 0;
    if (tier === "all") return w.is_elem_800 ? (w.is_abstract ? 1 : 0) : 2;
    return 0;
  };
  return [...words]
    .sort((a, b) => rank(a) - rank(b) || a.word.toLowerCase().localeCompare(b.word.toLowerCase()))
    .map((w) => (tier === "mid_high" ? { ...w, image_url: null } : w));
}

async function getVocabUnitContent({ tier = "all", stage = 1, unitKey = "A" }) {
  const cleanTier = normalizeVocabTier(tier);
  const numStage = Number(stage) || 1;
  const cleanKey = String(unitKey || "").trim();
  const pgPool = getPgPool();

  if (numStage === 1) {
    const cleanLetter = normalizeSingleStage1Key(cleanKey);
    if (pgPool) {
      const unitRes = await pgPool.query(
        "SELECT * FROM vocab_units WHERE stage = 1 AND tier = $1 AND unit_key = $2 LIMIT 1",
        [cleanTier, cleanLetter]
      );
      const tierWhere =
        cleanTier === "elem_800"
          ? "AND is_elem_800 = TRUE"
          : cleanTier === "mid_high"
            ? "AND is_mid_high = TRUE"
            : "";
      const wordRes = await pgPool.query(
        `SELECT * FROM vocab_bank WHERE initial_letter = $1 ${tierWhere} ORDER BY LOWER(word) ASC`,
        [cleanLetter]
      );
      return {
        stage: 1,
        tier: cleanTier,
        unit: unitRes.rows[0] || null,
        words: sortWordsConcreteFirst(wordRes.rows.map(formatVocabWordRow), cleanTier),
        affixItems: []
      };
    }

    const sqliteDb = getSqliteDb();
    const unit = sqliteDb
      .prepare("SELECT * FROM vocab_units WHERE stage = 1 AND tier = ? AND unit_key = ? LIMIT 1")
      .get(cleanTier, cleanLetter);
    const tierWhere =
      cleanTier === "elem_800"
        ? "AND is_elem_800 = 1"
        : cleanTier === "mid_high"
          ? "AND is_mid_high = 1"
          : "";
    const words = sqliteDb
      .prepare(`SELECT * FROM vocab_bank WHERE initial_letter = ? ${tierWhere} ORDER BY LOWER(word) ASC`)
      .all(cleanLetter)
      .map(formatVocabWordRow);
    return {
      stage: 1,
      tier: cleanTier,
      unit: unit || null,
      words: sortWordsConcreteFirst(words, cleanTier),
      affixItems: []
    };
  }

  if (numStage === 2) {
    let unit = null;
    let rawWords = [];
    if (pgPool) {
      const unitRes = await pgPool.query("SELECT * FROM vocab_units WHERE stage = 2 AND id = $1 LIMIT 1", [cleanKey]);
      unit = unitRes.rows[0] || null;
      const wordRes = await pgPool.query(
        `SELECT * FROM vocab_bank
         WHERE phonics_unit_ids_json @> $1::jsonb
         ORDER BY LOWER(word) ASC`,
        [JSON.stringify([cleanKey])]
      );
      rawWords = wordRes.rows.map(formatVocabWordRow);
    } else {
      const sqliteDb = getSqliteDb();
      unit = sqliteDb.prepare("SELECT * FROM vocab_units WHERE stage = 2 AND id = ? LIMIT 1").get(cleanKey);
      rawWords = sqliteDb
        .prepare(
          `SELECT * FROM vocab_bank
           WHERE instr(phonics_unit_ids_json, ?) > 0
           ORDER BY LOWER(word) ASC`
        )
        .all(`"${cleanKey}"`)
        .map(formatVocabWordRow)
        .filter((w) => w.phonics_unit_ids.includes(cleanKey));
    }

    const tierFiltered =
      cleanTier === "elem_800"
        ? rawWords.filter((w) => w.is_elem_800)
        : cleanTier === "mid_high"
          ? rawWords.filter((w) => w.is_mid_high)
          : rawWords;
    const chosen = tierFiltered.length >= 6 ? tierFiltered : rawWords;

    return {
      stage: 2,
      tier: cleanTier,
      unit,
      words: sortWordsConcreteFirst(chosen, cleanTier),
      affixItems: []
    };
  }

  // Stage 3
  if (pgPool) {
    const unitRes = await pgPool.query("SELECT * FROM vocab_units WHERE stage = 3 AND id = $1 LIMIT 1", [cleanKey]);
    const affRes = await pgPool.query(
      "SELECT * FROM vocab_affix_items WHERE unit_id = $1 ORDER BY sort_order ASC",
      [cleanKey]
    );
    return {
      stage: 3,
      tier: cleanTier,
      unit: unitRes.rows[0] || null,
      words: [],
      affixItems: affRes.rows.map((a) => ({
        ...a,
        root_in_pdf: Boolean(a.root_in_pdf),
        derived_in_pdf: Boolean(a.derived_in_pdf)
      }))
    };
  }

  const sqliteDb = getSqliteDb();
  const unit = sqliteDb.prepare("SELECT * FROM vocab_units WHERE stage = 3 AND id = ? LIMIT 1").get(cleanKey);
  const affixItems = sqliteDb
    .prepare("SELECT * FROM vocab_affix_items WHERE unit_id = ? ORDER BY sort_order ASC")
    .all(cleanKey)
    .map((a) => ({
      ...a,
      root_in_pdf: Boolean(a.root_in_pdf),
      derived_in_pdf: Boolean(a.derived_in_pdf)
    }));
  return { stage: 3, tier: cleanTier, unit: unit || null, words: [], affixItems };
}

function buildMaskForPhonicsWord(word, span) {
  if (!span) return { maskedWord: word, targetPattern: "" };
  const chars = Array.from(word);
  if (typeof span.silent_e_index === "number") {
    chars[span.start] = "_";
    chars[span.silent_e_index] = "_";
    return { maskedWord: chars.join(""), targetPattern: span.pattern };
  }
  const len = Math.max(1, span.end - span.start);
  const before = word.slice(0, span.start);
  const after = word.slice(span.end);
  return { maskedWord: `${before}${"_".repeat(len)}${after}`, targetPattern: span.pattern };
}

async function buildVocabQuiz({
  userId,
  tier,
  stage = 1,
  unitKey = "A",
  attemptType = "daily_quiz",
  quizMode
}) {
  const numStage = Number(stage) || 1;
  const normalizedKey = numStage === 1 ? normalizeSingleStage1Key(unitKey) : unitKey;
  const pgPool = getPgPool();

  let effectiveTier = tier ? normalizeVocabTier(tier) : "all";
  let effectiveQuizMode = quizMode ? normalizeS1QuizMode(quizMode) : "meaning";
  let wrongSet = new Set();

  if (userId) {
    const state = await getStudentVocabState(userId);
    if (!tier) effectiveTier = state.progress.vocab_tier;
    if (!quizMode) effectiveQuizMode = state.progress.s1_quiz_mode;
    wrongSet = new Set(state.recentWrongWordIds || []);
  }

  const content = await getVocabUnitContent({ tier: effectiveTier, stage: numStage, unitKey: normalizedKey });

  if (numStage === 1) {
    const allUnitWords = content.words;
    if (allUnitWords.length === 0) return { stage: 1, tier: effectiveTier, attemptType, questions: [] };

    let chosen = [];
    if (attemptType === "final_test") {
      chosen = shuffleArray(allUnitWords);
    } else if (effectiveQuizMode === "picture_to_word" && effectiveTier !== "mid_high") {
      const imaged = allUnitWords.filter((w) => Boolean(w.image_url));
      const pool = imaged.length >= 10 ? imaged : allUnitWords;
      const wrongOnes = shuffleArray(pool.filter((w) => wrongSet.has(w.id))).slice(0, 3);
      const wrongIds = new Set(wrongOnes.map((w) => w.id));
      const imagedRest = shuffleArray(imaged.filter((w) => !wrongIds.has(w.id)));
      const nonImagedRest = shuffleArray(allUnitWords.filter((w) => !wrongIds.has(w.id) && !w.image_url));
      chosen = shuffleArray([...wrongOnes, ...imagedRest, ...nonImagedRest].slice(0, Math.min(10, allUnitWords.length)));
    } else {
      const wrongOnes = shuffleArray(allUnitWords.filter((w) => wrongSet.has(w.id))).slice(0, 3);
      const wrongIds = new Set(wrongOnes.map((w) => w.id));
      const rest = shuffleArray(allUnitWords.filter((w) => !wrongIds.has(w.id)));
      chosen = shuffleArray([...wrongOnes, ...rest.slice(0, Math.max(0, 10 - wrongOnes.length))]);
    }

    const tierWhere =
      effectiveTier === "elem_800"
        ? "WHERE is_elem_800 = TRUE"
        : effectiveTier === "mid_high"
          ? "WHERE is_mid_high = TRUE"
          : "";
    const sqliteTierWhere =
      effectiveTier === "elem_800"
        ? "WHERE is_elem_800 = 1"
        : effectiveTier === "mid_high"
          ? "WHERE is_mid_high = 1"
          : "";

    let distractorRows = [];
    if (pgPool) {
      const { rows } = await pgPool.query(
        `SELECT word, meaning_kr, is_elem_800 FROM vocab_bank ${tierWhere} ORDER BY RANDOM() LIMIT 160`
      );
      distractorRows = rows;
    } else {
      distractorRows = getSqliteDb()
        .prepare(`SELECT word, meaning_kr, is_elem_800 FROM vocab_bank ${sqliteTierWhere} ORDER BY RANDOM() LIMIT 160`)
        .all();
    }

    const distractorMeanings = distractorRows.map((r) => r.meaning_kr);
    const sameUnitElemWords = allUnitWords.filter((w) => w.is_elem_800).map((w) => w.word);
    const globalElemWords = distractorRows.filter((r) => Boolean(r.is_elem_800)).map((r) => r.word);
    const fallbackGlobalWords = distractorRows.map((r) => r.word);

    const questions = chosen.map((w, idx) => {
      const canUsePicture = effectiveTier !== "mid_high" && Boolean(w.image_url);
      const usePicture =
        canUsePicture &&
        (effectiveQuizMode === "picture_to_word" || (effectiveQuizMode === "mixed" && idx % 2 === 0));

      if (usePicture) {
        const sameLetterWrongs = shuffleArray(
          Array.from(new Set(sameUnitElemWords.filter((word) => word && word !== w.word)))
        );
        const globalWrongs = shuffleArray(
          Array.from(
            new Set([...globalElemWords, ...fallbackGlobalWords].filter((word) => word && word !== w.word))
          )
        );
        const combinedWrongs = [];
        for (const cand of [...sameLetterWrongs, ...globalWrongs]) {
          if (combinedWrongs.length >= 3) break;
          if (!combinedWrongs.includes(cand)) combinedWrongs.push(cand);
        }
        return {
          wordId: w.id,
          word: w.word,
          displayWord: w.display_word,
          initialLetter: w.initial_letter,
          questionType: "picture_to_word",
          imageUrl: w.image_url,
          correctMeaning: w.meaning_kr,
          correctAnswer: w.word,
          options: shuffleArray([w.word, ...combinedWrongs])
        };
      }

      const wrongs = shuffleArray(
        Array.from(new Set(distractorMeanings.filter((m) => m && m !== w.meaning_kr)))
      ).slice(0, 3);
      return {
        wordId: w.id,
        word: w.word,
        displayWord: w.display_word,
        initialLetter: w.initial_letter,
        questionType: "meaning",
        imageUrl: effectiveTier === "mid_high" ? null : w.image_url || null,
        correctMeaning: w.meaning_kr,
        correctAnswer: w.meaning_kr,
        options: shuffleArray([w.meaning_kr, ...wrongs])
      };
    });

    return {
      stage: 1,
      tier: effectiveTier,
      unitKey: normalizedKey,
      attemptType,
      quizMode: effectiveQuizMode,
      totalCount: questions.length,
      questions
    };
  }

  if (numStage === 2) {
    const baseWords = content.words;
    const chosen = attemptType === "final_test" ? shuffleArray(baseWords) : shuffleArray(baseWords).slice(0, 10);

    const ALL_PATTERNS = [
      "ai", "ay", "ee", "ea", "oa", "ow", "oo", "oi", "oy", "ou",
      "a_e", "i_e", "o_e", "u_e", "ar", "or", "ir", "ur", "er",
      "sh", "ch", "th", "wh", "ph", "ck", "ng", "nk"
    ];
    const VOWEL_POOL = ["a", "e", "i", "o", "u", "y", "w", "r"];
    const CONSONANT_POOL = ["s", "c", "h", "t", "w", "p", "k", "n", "g", "b", "d", "f", "l"];

    const questions = chosen.map((w) => {
      const span = w.phonics_spans.find((sp) => sp.unit_id === unitKey) || w.phonics_spans[0];
      const { maskedWord, targetPattern } = buildMaskForPhonicsWord(w.word, span);
      const distractors = shuffleArray(ALL_PATTERNS.filter((p) => p !== targetPattern)).slice(0, 3);

      const targetLetters = String(targetPattern || "")
        .toLowerCase()
        .replace(/_/g, "")
        .split("")
        .filter(Boolean);
      const isVowelPattern = /[aeiou]/.test(targetPattern);
      const primaryPool = isVowelPattern ? VOWEL_POOL : CONSONANT_POOL;
      const fallbackPool = isVowelPattern ? CONSONANT_POOL : VOWEL_POOL;
      const letterSet = new Set(targetLetters);
      for (const ch of shuffleArray(primaryPool)) {
        if (letterSet.size >= 6) break;
        letterSet.add(ch);
      }
      for (const ch of shuffleArray(fallbackPool)) {
        if (letterSet.size >= 6) break;
        letterSet.add(ch);
      }

      return {
        wordId: w.id,
        word: w.word,
        meaningKr: w.meaning_kr,
        maskedWord,
        targetPattern,
        targetLetters,
        letterOptions: shuffleArray(Array.from(letterSet)),
        soundKr: span?.sound_kr || "",
        span,
        tileOptions: shuffleArray([targetPattern, ...distractors])
      };
    });

    return {
      stage: 2,
      tier: effectiveTier,
      unitKey,
      attemptType,
      totalCount: questions.length,
      questions
    };
  }

  // Stage 3
  const items = shuffleArray(content.affixItems);
  let distractorPool = [];
  if (pgPool) {
    const { rows } = await pgPool.query("SELECT derived_meaning_kr, affix FROM vocab_affix_items");
    distractorPool = rows;
  } else {
    distractorPool = getSqliteDb().prepare("SELECT derived_meaning_kr, affix FROM vocab_affix_items").all();
  }

  const allMeanings = Array.from(new Set(distractorPool.map((r) => r.derived_meaning_kr)));
  const allAffixes = Array.from(new Set(distractorPool.map((r) => r.affix)));

  const questions = items.map((item) => {
    const meaningWrongs = shuffleArray(allMeanings.filter((m) => m !== item.derived_meaning_kr)).slice(0, 3);
    const affixWrongs = shuffleArray(allAffixes.filter((a) => a !== item.affix)).slice(0, 3);
    return {
      itemId: item.id,
      affix: item.affix,
      affixType: item.affix_type,
      affixMeaningKr: item.affix_meaning_kr,
      rootWord: item.root_word,
      rootMeaningKr: item.root_meaning_kr,
      rootPos: item.root_pos,
      derivedWord: item.derived_word,
      derivedMeaningKr: item.derived_meaning_kr,
      derivedPos: item.derived_pos,
      explanationKr: item.explanation_kr,
      meaningOptions: shuffleArray([item.derived_meaning_kr, ...meaningWrongs]),
      affixOptions: shuffleArray([item.affix, ...affixWrongs])
    };
  });

  return {
    stage: 3,
    tier: effectiveTier,
    unitKey,
    attemptType,
    totalCount: questions.length,
    questions
  };
}

async function submitVocabAttempt({
  userId,
  tier,
  stage = 1,
  unitKey = "A",
  attemptType = "daily_quiz",
  totalCount = 0,
  correctCount = 0,
  wrongWordIds = []
}) {
  const progress = await getOrInitStudentVocabProgress(userId);
  const effectiveTier = tier ? normalizeVocabTier(tier) : progress.vocab_tier;
  const numStage = Number(stage) || 1;
  const cleanUnitKey = numStage === 1 ? normalizeSingleStage1Key(unitKey) : unitKey;
  const total = Math.max(1, Number(totalCount) || 1);
  const correct = Math.min(total, Math.max(0, Number(correctCount) || 0));
  const scorePct = Math.round((correct / total) * 100);
  const passed = scorePct >= 80;
  const todayKst = getKstTodayDateString();
  const attemptId = `va_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  const nowIso = new Date().toISOString();
  const cleanWrong = Array.isArray(wrongWordIds) ? wrongWordIds.slice(0, 200) : [];

  const pgPool = getPgPool();
  const sqliteDb = getSqliteDb();

  if (pgPool) {
    await pgPool.query(
      `INSERT INTO student_vocab_attempts (
         id, user_id, tier, stage, unit_key, attempt_type,
         total_count, correct_count, score_pct, passed, wrong_word_ids_json
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::jsonb)`,
      [attemptId, userId, effectiveTier, numStage, cleanUnitKey, attemptType, total, correct, scorePct, passed, JSON.stringify(cleanWrong)]
    );
  } else {
    sqliteDb
      .prepare(
        `INSERT INTO student_vocab_attempts (
           id, user_id, tier, stage, unit_key, attempt_type,
           total_count, correct_count, score_pct, passed, wrong_word_ids_json, created_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        attemptId,
        userId,
        effectiveTier,
        numStage,
        cleanUnitKey,
        attemptType,
        total,
        correct,
        scorePct,
        passed ? 1 : 0,
        JSON.stringify(cleanWrong),
        nowIso
      );
  }

  let advancedToUnit = null;
  let advancedToStage = null;
  let needsExtraMonth = false;

  if (numStage === 1 && attemptType === "final_test") {
    const unitRows = pgPool
      ? (
          await pgPool.query(
            "SELECT unit_key FROM vocab_units WHERE stage = 1 AND tier = $1 ORDER BY sort_order ASC",
            [effectiveTier]
          )
        ).rows
      : sqliteDb
          .prepare("SELECT unit_key FROM vocab_units WHERE stage = 1 AND tier = ? ORDER BY sort_order ASC")
          .all(effectiveTier);
    const orderedKeys = unitRows.map((r) => r.unit_key);

    if (passed) {
      const doneSet = new Set(progress.completed_s1_units || []);
      doneSet.add(cleanUnitKey);
      const curIdx = orderedKeys.indexOf(cleanUnitKey);
      const hasNextLetter = curIdx >= 0 && curIdx + 1 < orderedKeys.length;
      const nextKey = hasNextLetter ? orderedKeys[curIdx + 1] : cleanUnitKey;
      const nextStage = hasNextLetter ? progress.current_stage : 2;
      if (hasNextLetter) {
        advancedToUnit = nextKey;
      } else {
        advancedToStage = 2;
      }

      if (pgPool) {
        await pgPool.query(
          `UPDATE student_vocab_progress
           SET vocab_tier = $1, current_stage = $2, completed_s1_units_json = $3::jsonb, current_unit_key = $4,
               unit_started_at = $5, early_test_unlocked = FALSE, updated_at = NOW()
           WHERE user_id = $6`,
          [effectiveTier, nextStage, JSON.stringify(Array.from(doneSet)), nextKey, todayKst, userId]
        );
      } else {
        sqliteDb
          .prepare(
            `UPDATE student_vocab_progress
             SET vocab_tier = ?, current_stage = ?, completed_s1_units_json = ?, current_unit_key = ?,
                 unit_started_at = ?, early_test_unlocked = 0, updated_at = ?
             WHERE user_id = ?`
          )
          .run(effectiveTier, nextStage, JSON.stringify(Array.from(doneSet)), nextKey, todayKst, nowIso, userId);
      }
    } else {
      needsExtraMonth = true;
      if (pgPool) {
        await pgPool.query(
          "UPDATE student_vocab_progress SET unit_started_at = $1, early_test_unlocked = FALSE, updated_at = NOW() WHERE user_id = $2",
          [todayKst, userId]
        );
      } else {
        sqliteDb
          .prepare("UPDATE student_vocab_progress SET unit_started_at = ?, early_test_unlocked = 0, updated_at = ? WHERE user_id = ?")
          .run(todayKst, nowIso, userId);
      }
    }
  } else if (numStage === 2 && passed) {
    const unitRows = pgPool
      ? (await pgPool.query("SELECT id FROM vocab_units WHERE stage = 2 ORDER BY sort_order ASC")).rows
      : sqliteDb.prepare("SELECT id FROM vocab_units WHERE stage = 2 ORDER BY sort_order ASC").all();
    const orderedIds = unitRows.map((r) => r.id);
    const doneSet = new Set(progress.completed_s2_units || []);
    doneSet.add(cleanUnitKey);
    const curIdx = orderedIds.indexOf(cleanUnitKey);
    const hasNext = curIdx >= 0 && curIdx + 1 < orderedIds.length;
    const nextId = hasNext ? orderedIds[curIdx + 1] : cleanUnitKey;
    const nextStage = hasNext ? progress.current_stage : 3;
    if (hasNext) {
      advancedToUnit = nextId;
    } else {
      advancedToStage = 3;
    }

    if (pgPool) {
      await pgPool.query(
        "UPDATE student_vocab_progress SET current_stage = $1, completed_s2_units_json = $2::jsonb, current_s2_unit = $3, updated_at = NOW() WHERE user_id = $4",
        [nextStage, JSON.stringify(Array.from(doneSet)), nextId, userId]
      );
    } else {
      sqliteDb
        .prepare("UPDATE student_vocab_progress SET current_stage = ?, completed_s2_units_json = ?, current_s2_unit = ?, updated_at = ? WHERE user_id = ?")
        .run(nextStage, JSON.stringify(Array.from(doneSet)), nextId, nowIso, userId);
    }
  } else if (numStage === 3 && passed) {
    const unitRows = pgPool
      ? (await pgPool.query("SELECT id FROM vocab_units WHERE stage = 3 ORDER BY sort_order ASC")).rows
      : sqliteDb.prepare("SELECT id FROM vocab_units WHERE stage = 3 ORDER BY sort_order ASC").all();
    const orderedIds = unitRows.map((r) => r.id);
    const doneSet = new Set(progress.completed_s3_units || []);
    doneSet.add(cleanUnitKey);
    const curIdx = orderedIds.indexOf(cleanUnitKey);
    const nextId = curIdx >= 0 && curIdx + 1 < orderedIds.length ? orderedIds[curIdx + 1] : cleanUnitKey;
    advancedToUnit = nextId !== cleanUnitKey ? nextId : null;

    if (pgPool) {
      await pgPool.query(
        "UPDATE student_vocab_progress SET completed_s3_units_json = $1::jsonb, current_s3_unit = $2, updated_at = NOW() WHERE user_id = $3",
        [JSON.stringify(Array.from(doneSet)), nextId, userId]
      );
    } else {
      sqliteDb
        .prepare("UPDATE student_vocab_progress SET completed_s3_units_json = ?, current_s3_unit = ?, updated_at = ? WHERE user_id = ?")
        .run(JSON.stringify(Array.from(doneSet)), nextId, nowIso, userId);
    }
  }

  const nextState = await getStudentVocabState(userId);
  return {
    attempt: {
      id: attemptId,
      score_pct: scorePct,
      passed,
      total_count: total,
      correct_count: correct,
      advancedToUnit,
      advancedToStage,
      needsExtraMonth
    },
    state: nextState
  };
}

async function updateStudentVocabSettings(payload) {
  const userId = String(payload.userId || "").trim();
  const prev = await getOrInitStudentVocabProgress(userId);

  const nextTier = payload.vocab_tier ? normalizeVocabTier(payload.vocab_tier) : prev.vocab_tier;
  const nextS1QuizMode = payload.s1_quiz_mode ? normalizeS1QuizMode(payload.s1_quiz_mode) : prev.s1_quiz_mode;
  const nextStage = [1, 2, 3].includes(Number(payload.current_stage))
    ? Number(payload.current_stage)
    : prev.current_stage;
  const nextUnitKey = payload.current_unit_key
    ? normalizeSingleStage1Key(payload.current_unit_key)
    : prev.current_unit_key;
  const nextEarly = payload.early_test_unlocked !== undefined
    ? Boolean(payload.early_test_unlocked)
    : prev.early_test_unlocked;
  const nextS2Unit = payload.current_s2_unit ? String(payload.current_s2_unit).trim() : prev.current_s2_unit;
  const nextS2Mode = ["tiles", "typing"].includes(payload.s2_input_mode)
    ? payload.s2_input_mode
    : prev.s2_input_mode;
  const nextS3Unit = payload.current_s3_unit ? String(payload.current_s3_unit).trim() : prev.current_s3_unit;
  const nextStartedAt = payload.unit_started_at
    ? String(payload.unit_started_at).slice(0, 10)
    : nextUnitKey !== prev.current_unit_key
      ? getKstTodayDateString()
      : prev.unit_started_at;

  const pgPool = getPgPool();
  const nowIso = new Date().toISOString();

  if (pgPool) {
    await pgPool.query(
      `UPDATE student_vocab_progress
       SET vocab_tier = $1, s1_quiz_mode = $2, current_stage = $3, current_unit_key = $4, unit_started_at = $5,
           early_test_unlocked = $6, current_s2_unit = $7, s2_input_mode = $8, current_s3_unit = $9,
           updated_at = NOW()
       WHERE user_id = $10`,
      [
        nextTier,
        nextS1QuizMode,
        nextStage,
        nextUnitKey,
        nextStartedAt,
        nextEarly,
        nextS2Unit,
        nextS2Mode,
        nextS3Unit,
        userId
      ]
    );
  } else {
    getSqliteDb()
      .prepare(
        `UPDATE student_vocab_progress
         SET vocab_tier = ?, s1_quiz_mode = ?, current_stage = ?, current_unit_key = ?, unit_started_at = ?,
             early_test_unlocked = ?, current_s2_unit = ?, s2_input_mode = ?, current_s3_unit = ?,
             updated_at = ?
         WHERE user_id = ?`
      )
      .run(
        nextTier,
        nextS1QuizMode,
        nextStage,
        nextUnitKey,
        nextStartedAt,
        nextEarly ? 1 : 0,
        nextS2Unit,
        nextS2Mode,
        nextS3Unit,
        nowIso,
        userId
      );
  }

  return await getStudentVocabState(userId);
}

async function getPronunciationFocusForStudent({
  userId,
  stage = 1,
  unitKey = "A",
  tier,
  forceMode,
  quizWordIds = [],
  wrongWordIds = []
}) {
  let effectiveTier = tier ? normalizeVocabTier(tier) : "all";
  let effectiveStage = Number(stage) || 1;
  let effectiveKey = String(unitKey || "A").trim();
  let state = null;

  if (userId) {
    state = await getStudentVocabState(userId);
    if (!tier) effectiveTier = state.progress.vocab_tier;
    if (!stage) effectiveStage = state.progress.current_stage;
    if (!unitKey) {
      effectiveKey =
        effectiveStage === 1
          ? state.progress.current_unit_key
          : effectiveStage === 2
            ? state.progress.current_s2_unit
            : state.progress.current_s3_unit;
    }
  }

  const content = await getVocabUnitContent({
    tier: effectiveTier,
    stage: effectiveStage,
    unitKey: effectiveKey
  });

  const unitWords =
    effectiveStage === 3
      ? (content.affixItems || []).flatMap((it) => [
          { id: it.id, word: it.derived_word, meaning_kr: it.derived_meaning_kr },
          { id: `${it.id}_root`, word: it.root_word, meaning_kr: it.root_meaning_kr }
        ])
      : content.words || [];

  const quizSet = new Set(Array.isArray(quizWordIds) ? quizWordIds : []);
  const wrongSet = new Set(Array.isArray(wrongWordIds) ? wrongWordIds : []);
  const quizWords = unitWords.filter((w) => quizSet.has(w.id));
  const wrongWords = unitWords.filter((w) => wrongSet.has(w.id));

  const todayKst = getKstTodayDateString();
  const scopeKey = `${effectiveStage}:${effectiveKey}:${effectiveTier}`;
  const cycle = normalizePronunciationCycle(state?.progress?.pronunciation_cycle);
  const autoMode = state
    ? resolveNextPronunciationMode({
        progress: state.progress,
        stage: effectiveStage,
        unitKey: effectiveKey,
        tier: effectiveTier,
        todayKst
      })
    : "day1_listen";

  const requestedMode =
    forceMode === "day2_speak" || forceMode === "day1_listen" ? forceMode : autoMode;

  let session;
  if (requestedMode === "day2_speak") {
    const hasSavedPending =
      cycle.unit_scope === scopeKey && Array.isArray(cycle.pending_speak_words) && cycle.pending_speak_words.length > 0;
    if (hasSavedPending) {
      session = buildDay2SpeakSession(cycle.pending_speak_words, unitWords);
    } else {
      const prevPracticed = cycle.unit_scope === scopeKey ? cycle.practiced_word_ids : [];
      const fallbackDay1 = buildDay1ListenSession({
        unitWords,
        quizWords,
        wrongWords,
        practicedWordIds: prevPracticed.length >= unitWords.length ? [] : prevPracticed,
        maxWords: 6
      });
      session = buildDay2SpeakSession(fallbackDay1.items, unitWords);
    }
  } else {
    const prevPracticed = cycle.unit_scope === scopeKey ? cycle.practiced_word_ids : [];
    const effectivePracticed = prevPracticed.length >= unitWords.length ? [] : prevPracticed;
    session = buildDay1ListenSession({
      unitWords,
      quizWords,
      wrongWords,
      practicedWordIds: effectivePracticed,
      maxWords: 6
    });
  }

  return {
    stage: effectiveStage,
    unitKey: effectiveKey,
    tier: effectiveTier,
    mode: session.mode,
    todayKst,
    unitWordCount: unitWords.length,
    items: session.items
  };
}

function sanitizePronunciationWordSnapshot(w) {
  const word = String(w?.word || "").trim();
  if (!word) return null;
  return {
    wordId: String(w.wordId || w.id || word.toLowerCase()),
    word,
    meaningKr: String(w.meaningKr || w.meaning_kr || ""),
    imageUrl: w.imageUrl || w.image_url || null,
    ruleId: String(w.ruleId || ""),
    phonicsLabel: String(w.phonicsLabel || ""),
    focusText: String(w.focusText || ""),
    matchStart: Number(w.matchStart) || 0,
    matchEnd: Number(w.matchEnd) || 1,
    titleKr: String(w.titleKr || ""),
    mouthTipKr: String(w.mouthTipKr || "")
  };
}

async function completePronunciationFocusToday(payload) {
  const opts = typeof payload === "string" ? { userId: payload } : payload || {};
  const cleanUid = String(opts.userId || "").trim();
  if (!cleanUid) throw new Error("학생 ID가 필요합니다.");
  const state = await getStudentVocabState(cleanUid);
  const todayKst = getKstTodayDateString();
  const pgPool = getPgPool();

  const effectiveStage = Number(opts.stage) || state.progress.current_stage || 1;
  const effectiveTier = normalizeVocabTier(opts.tier || state.progress.vocab_tier);
  const effectiveKey = String(
    opts.unitKey ||
      (effectiveStage === 1
        ? state.progress.current_unit_key
        : effectiveStage === 2
          ? state.progress.current_s2_unit
          : state.progress.current_s3_unit) ||
      "A"
  ).trim();

  const scopeKey = `${effectiveStage}:${effectiveKey}:${effectiveTier}`;
  const prevCycle = normalizePronunciationCycle(state.progress.pronunciation_cycle);
  const completedMode = opts.completedMode === "day2_speak" ? "day2_speak" : "day1_listen";

  const snapshots = (Array.isArray(opts.words) ? opts.words : [])
    .map(sanitizePronunciationWordSnapshot)
    .filter(Boolean)
    .slice(0, 12);

  const prevPracticed = prevCycle.unit_scope === scopeKey ? prevCycle.practiced_word_ids : [];
  const nextPracticed = Array.from(
    new Set([...prevPracticed, ...snapshots.map((s) => s.wordId)])
  );

  const nextCycle =
    completedMode === "day1_listen"
      ? {
          unit_scope: scopeKey,
          pending_speak_words: snapshots,
          pending_created_date: todayKst,
          practiced_word_ids: nextPracticed,
          last_mode: "day1_listen",
          last_completed_date: todayKst
        }
      : {
          unit_scope: scopeKey,
          pending_speak_words: [],
          pending_created_date: null,
          practiced_word_ids: nextPracticed,
          last_mode: "day2_speak",
          last_completed_date: todayKst
        };

  if (pgPool) {
    await pgPool.query(
      `UPDATE student_vocab_progress
       SET pronunciation_done_date = $1, pronunciation_cycle_json = $2::jsonb, updated_at = NOW()
       WHERE user_id = $3`,
      [todayKst, JSON.stringify(nextCycle), cleanUid]
    );
  } else {
    getSqliteDb()
      .prepare(
        `UPDATE student_vocab_progress
         SET pronunciation_done_date = ?, pronunciation_cycle_json = ?, updated_at = ?
         WHERE user_id = ?`
      )
      .run(todayKst, JSON.stringify(nextCycle), new Date().toISOString(), cleanUid);
  }

  return await getStudentVocabState(cleanUid);
}

module.exports = {
  syncVocabMasterData,
  seedVocabIfEmpty,
  getOrInitStudentVocabProgress,
  getStudentVocabState,
  getVocabUnitContent,
  buildVocabQuiz,
  submitVocabAttempt,
  updateStudentVocabSettings,
  getPronunciationFocusForStudent,
  completePronunciationFocusToday
};

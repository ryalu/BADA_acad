/**
 * BADA 영어 Database Layer Facade (PostgreSQL Primary + SQLite Auto-Fallback)
 * Re-exports modularized DB domains and serves lightweight bootstrap payloads.
 */

const { analyzeTextWithLLM } = require("./ai-engine");
const connection = require("./db/connection");
const usersMod = require("./db/users");
const booksMod = require("./db/books");
const mediaMod = require("./db/media");
const vocabMod = require("./db/vocab");

const {
  getPgPool,
  getSqliteDb,
  getActiveDbEngine,
  initPostgresPoolIfConfigured,
  getDbEngineInfo,
  parseJsonField
} = connection;

async function getAllBootstrapData() {
  const pgPool = getPgPool();
  const activeDbEngine = getActiveDbEngine();

  if (pgPool) {
    const usersRes = await pgPool.query("SELECT * FROM users ORDER BY age ASC, name ASC");
    const teachersRes = await pgPool.query(
      "SELECT id, name, role, title_label, email, created_at FROM teachers ORDER BY CASE WHEN role = 'director' THEN 0 ELSE 1 END, created_at ASC"
    );
    const booksRes = await pgPool.query("SELECT * FROM books");
    const vcRes = await pgPool.query(
      `SELECT text_hash, book_id, vocab_json, chunks_json, core_expressions_json,
              sentence_translations_json, speaking_questions_json, lookup_count, extraction_source,
              (jsonb_array_length(COALESCE(page_illustrations_json, '[]'::jsonb)) > 0) AS has_illustrations,
              (COALESCE(page_illustrations_json::text, '') LIKE '%"is_cover":true%') AS has_custom_cover,
              (COALESCE(worksheets_json, '{}'::jsonb) ? 'week1') AS has_worksheets
       FROM vocab_chunks`
    );

    const vcMap = new Map(vcRes.rows.map((r) => [r.text_hash, r]));
    const users = usersRes.rows.map(usersMod.formatUserRow);

    const books = [];
    for (const b of booksRes.rows) {
      const vc = vcMap.get(b.text_hash);
      if (!vc || booksMod.needsReanalysis(vc)) {
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
          has_illustrations: Boolean(vc?.has_illustrations),
          has_custom_cover: Boolean(vc?.has_custom_cover),
          has_worksheets: Boolean(vc?.has_worksheets),
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
          has_illustrations: Boolean(vc.has_illustrations),
          has_custom_cover: Boolean(vc.has_custom_cover),
          has_worksheets: Boolean(vc.has_worksheets),
          lookup_count: vc.lookup_count || 1
        });
      }
    }

    const phonicsRes = await pgPool.query("SELECT * FROM phonics_curriculum ORDER BY sort_order ASC");
    const phonicsCurriculum = phonicsRes.rows.map((r) => ({
      id: r.id,
      level_label: r.level_label,
      title_kr: r.title_kr,
      desc_kr: r.desc_kr,
      sort_order: Number(r.sort_order) || 1,
      phonics_words: parseJsonField(r.phonics_words_json, []),
      basic_words: parseJsonField(r.basic_words_json, [])
    }));

    return { users, teachers: teachersRes.rows, books, phonicsCurriculum, dbEngine: activeDbEngine };
  }

  const sqliteDb = getSqliteDb();
  const users = sqliteDb.prepare("SELECT * FROM users ORDER BY age ASC, name ASC").all().map(usersMod.formatUserRow);
  const teachers = sqliteDb
    .prepare("SELECT id, name, role, title_label, email, created_at FROM teachers ORDER BY CASE WHEN role = 'director' THEN 0 ELSE 1 END, created_at ASC")
    .all();

  const vcStmt = sqliteDb.prepare(
    `SELECT text_hash, book_id, vocab_json, chunks_json, core_expressions_json,
            sentence_translations_json, speaking_questions_json, lookup_count, extraction_source,
            (length(COALESCE(page_illustrations_json, '')) > 10) AS has_illustrations,
            (instr(COALESCE(page_illustrations_json, ''), '"is_cover":true') > 0) AS has_custom_cover,
            (instr(COALESCE(worksheets_json, ''), '"week1"') > 0) AS has_worksheets
     FROM vocab_chunks WHERE text_hash = ?`
  );

  const books = sqliteDb.prepare("SELECT * FROM books").all().map((b) => {
    const vc = vcStmt.get(b.text_hash);
    if (!vc || booksMod.needsReanalysis(vc)) {
      const upgraded = booksMod.getOrExtractVocabAndChunksSqlite(b.full_text, b.level, b.id, true);
      return {
        ...b,
        vocab: upgraded.vocab,
        chunks: upgraded.chunks,
        core_expressions: upgraded.core_expressions,
        sentence_translations: upgraded.sentence_translations,
        speaking_questions: upgraded.speaking_questions,
        has_illustrations: Boolean(vc?.has_illustrations),
        has_custom_cover: Boolean(vc?.has_custom_cover),
        has_worksheets: Boolean(vc?.has_worksheets),
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
      has_illustrations: Boolean(vc.has_illustrations),
      has_custom_cover: Boolean(vc.has_custom_cover),
      has_worksheets: Boolean(vc.has_worksheets),
      lookup_count: vc.lookup_count || 1
    };
  });

  const phonicsCurriculum = sqliteDb
    .prepare("SELECT * FROM phonics_curriculum ORDER BY sort_order ASC")
    .all()
    .map((r) => ({
      id: r.id,
      level_label: r.level_label,
      title_kr: r.title_kr,
      desc_kr: r.desc_kr,
      sort_order: Number(r.sort_order) || 1,
      phonics_words: parseJsonField(r.phonics_words_json, []),
      basic_words: parseJsonField(r.basic_words_json, [])
    }));

  return { users, teachers, books, phonicsCurriculum, dbEngine: activeDbEngine };
}

module.exports = {
  db: getSqliteDb(),
  initPostgresPoolIfConfigured,
  getDbEngineInfo,
  parseJsonField,
  getAllBootstrapData,
  getOrExtractVocabAndChunks: booksMod.getOrExtractVocabAndChunks,
  cleanupOrphanVocabChunks: booksMod.cleanupOrphanVocabChunks,
  updateUserProgress: usersMod.updateUserProgress,
  markAgeTrackCompleteToday: usersMod.markAgeTrackCompleteToday,
  verifyStudentPin: usersMod.verifyStudentPin,
  verifyTeacherLogin: usersMod.verifyTeacherLogin,
  createStudent: usersMod.createStudent,
  updateStudentAssignment: usersMod.updateStudentAssignment,
  deleteStudent: usersMod.deleteStudent,
  createTeacher: usersMod.createTeacher,
  updateTeacher: usersMod.updateTeacher,
  deleteTeacher: usersMod.deleteTeacher,
  createBook: booksMod.createBook,
  updateBook: booksMod.updateBook,
  getBookIllustrations: booksMod.getBookIllustrations,
  getBookCoverBuffer: booksMod.getBookCoverBuffer,
  ensureBookIllustrations: booksMod.ensureBookIllustrations,
  getIllustrationJobStatus: booksMod.getIllustrationJobStatus,
  reanalyzeAllBooksWithLLM: booksMod.reanalyzeAllBooksWithLLM,
  saveStudentRecording: mediaMod.saveStudentRecording,
  listStudentRecordings: mediaMod.listStudentRecordings,
  getCachedTtsAudio: mediaMod.getCachedTtsAudio,
  saveCachedTtsAudio: mediaMod.saveCachedTtsAudio,
  getOrCreateBookWorksheets: booksMod.getOrCreateBookWorksheets,
  syncVocabMasterData: vocabMod.syncVocabMasterData,
  seedVocabIfEmpty: vocabMod.seedVocabIfEmpty,
  getOrInitStudentVocabProgress: vocabMod.getOrInitStudentVocabProgress,
  getStudentVocabState: vocabMod.getStudentVocabState,
  getVocabUnitContent: vocabMod.getVocabUnitContent,
  buildVocabQuiz: vocabMod.buildVocabQuiz,
  submitVocabAttempt: vocabMod.submitVocabAttempt,
  updateStudentVocabSettings: vocabMod.updateStudentVocabSettings,
  getPronunciationFocusForStudent: vocabMod.getPronunciationFocusForStudent,
  completePronunciationFocusToday: vocabMod.completePronunciationFocusToday
};

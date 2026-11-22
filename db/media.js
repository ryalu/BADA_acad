/**
 * Student voice recordings (with AI pronunciation feedback) and OpenAI TTS audio cache.
 */

const { analyzePronunciationWithLLM } = require("../ai-engine");
const { getPgPool, getSqliteDb, parseJsonField } = require("./connection");

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
  const pgPool = getPgPool();

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

  getSqliteDb()
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
  const pgPool = getPgPool();
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

  const sqliteDb = getSqliteDb();
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
  const pgPool = getPgPool();
  if (pgPool) {
    const { rows } = await pgPool.query(
      "SELECT audio_bytes FROM tts_audio_cache WHERE cache_key = $1 LIMIT 1",
      [cacheKey]
    );
    return rows[0]?.audio_bytes || null;
  }
  const row = getSqliteDb()
    .prepare("SELECT audio_bytes FROM tts_audio_cache WHERE cache_key = ? LIMIT 1")
    .get(cacheKey);
  return row?.audio_bytes ? Buffer.from(row.audio_bytes) : null;
}

async function saveCachedTtsAudio(cacheKey, audioBuf) {
  if (!audioBuf || !audioBuf.length) return;
  const pgPool = getPgPool();
  if (pgPool) {
    await pgPool.query(
      `INSERT INTO tts_audio_cache (cache_key, content_type, audio_bytes)
       VALUES ($1, 'audio/mpeg', $2)
       ON CONFLICT (cache_key) DO NOTHING`,
      [cacheKey, audioBuf]
    );
    return;
  }
  getSqliteDb()
    .prepare(
      `INSERT OR IGNORE INTO tts_audio_cache (cache_key, content_type, audio_bytes, created_at)
       VALUES (?, 'audio/mpeg', ?, ?)`
    )
    .run(cacheKey, audioBuf, new Date().toISOString());
}

module.exports = {
  saveStudentRecording,
  listStudentRecordings,
  getCachedTtsAudio,
  saveCachedTtsAudio
};

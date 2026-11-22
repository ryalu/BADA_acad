/**
 * Books, LLM vocab/chunk extraction caching, lazy illustrations, offline worksheets, and orphan cleanup.
 */

const {
  analyzeTextWithLLM,
  analyzeTextWithLLMAsync,
  generateBookWorksheetsWithLLM
} = require("../ai-engine");
const { getPgPool, getSqliteDb, parseJsonField, hashText } = require("./connection");

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
  const sqliteDb = getSqliteDb();
  const tHash = hashText(rawText);
  const now = new Date().toISOString();

  const existing = sqliteDb.prepare("SELECT * FROM vocab_chunks WHERE text_hash = ?").get(tHash);
  if (existing) {
    const hasCustomKr = Boolean(String(customKoreanText || "").trim());
    if (!needsReanalysis(existing) && hasCustomKr) {
      const customLines = String(customKoreanText).split(/\r?\n+/).map((l) => l.trim()).filter(Boolean);
      const existingSt = parseJsonField(existing.sentence_translations_json, []);
      const updatedSt = existingSt.map((st, idx) => ({
        ...st,
        kr: customLines[idx] || st.kr
      }));
      const nextCount = Number(existing.lookup_count || 1) + 1;
      sqliteDb
        .prepare("UPDATE vocab_chunks SET sentence_translations_json = ?, lookup_count = ?, last_hit_at = ? WHERE text_hash = ?")
        .run(JSON.stringify(updatedSt), nextCount, now, tHash);
      return {
        cache_status: "CUSTOM_KR_FAST_UPDATED",
        llm_called: false,
        text_hash: tHash,
        lookup_count: nextCount,
        book_id: bookId || existing.book_id,
        vocab: parseJsonField(existing.vocab_json),
        chunks: parseJsonField(existing.chunks_json),
        core_expressions: parseJsonField(existing.core_expressions_json),
        sentence_translations: updatedSt,
        speaking_questions: parseJsonField(existing.speaking_questions_json),
        page_illustrations: parseJsonField(existing.page_illustrations_json),
        last_hit_at: now
      };
    }

    if (needsReanalysis(existing) || preExtracted) {
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
        page_illustrations: parseJsonField(existing.page_illustrations_json),
        last_hit_at: now
      };
    }

    sqliteDb.prepare("UPDATE vocab_chunks SET lookup_count = lookup_count + 1, last_hit_at = ? WHERE text_hash = ?").run(now, tHash);
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
      page_illustrations: parseJsonField(existing.page_illustrations_json),
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

async function getOrExtractVocabAndChunks(rawText, level = "Level 2", bookId = null, isSeed = false, customKoreanText = "") {
  const pgPool = getPgPool();
  if (pgPool) {
    const tHash = hashText(rawText);
    const now = new Date().toISOString();
    const existingRes = await pgPool.query("SELECT * FROM vocab_chunks WHERE text_hash = $1", [tHash]);

    if (existingRes.rows.length > 0) {
      const existing = existingRes.rows[0];
      const hasCustomKr = Boolean(String(customKoreanText || "").trim());
      if (!needsReanalysis(existing) && hasCustomKr) {
        const customLines = String(customKoreanText).split(/\r?\n+/).map((l) => l.trim()).filter(Boolean);
        const existingSt = parseJsonField(existing.sentence_translations_json, []);
        const updatedSt = existingSt.map((st, idx) => ({
          ...st,
          kr: customLines[idx] || st.kr
        }));
        const nextCount = Number(existing.lookup_count || 1) + 1;
        await pgPool.query(
          "UPDATE vocab_chunks SET sentence_translations_json = $1::jsonb, lookup_count = $2, last_hit_at = NOW() WHERE text_hash = $3",
          [JSON.stringify(updatedSt), nextCount, tHash]
        );
        return {
          cache_status: "CUSTOM_KR_FAST_UPDATED",
          llm_called: false,
          text_hash: tHash,
          lookup_count: nextCount,
          book_id: bookId || existing.book_id,
          vocab: parseJsonField(existing.vocab_json),
          chunks: parseJsonField(existing.chunks_json),
          core_expressions: parseJsonField(existing.core_expressions_json),
          sentence_translations: updatedSt,
          speaking_questions: parseJsonField(existing.speaking_questions_json),
          page_illustrations: parseJsonField(existing.page_illustrations_json),
          last_hit_at: now
        };
      }

      if (needsReanalysis(existing)) {
        const refreshed = isSeed
          ? analyzeTextWithLLM(rawText, level, customKoreanText)
          : await analyzeTextWithLLMAsync(rawText, level, customKoreanText, "", { skipIllustrations: true });
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
          page_illustrations: parseJsonField(existing.page_illustrations_json),
          last_hit_at: now
        };
      }

      const nextCount = Number(existing.lookup_count || 1) + 1;
      await pgPool.query(
        "UPDATE vocab_chunks SET lookup_count = $1, last_hit_at = NOW() WHERE text_hash = $2",
        [nextCount, tHash]
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
        page_illustrations: parseJsonField(existing.page_illustrations_json),
        last_hit_at: now
      };
    }

    const extracted = isSeed
      ? analyzeTextWithLLM(rawText, level, customKoreanText)
      : await analyzeTextWithLLMAsync(rawText, level, customKoreanText, "", { skipIllustrations: true });
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
    const existing = getSqliteDb().prepare("SELECT * FROM vocab_chunks WHERE text_hash = ?").get(tHash);
    if (!existing || needsReanalysis(existing)) {
      preExtracted = await analyzeTextWithLLMAsync(rawText, level, customKoreanText, "", { skipIllustrations: true });
    }
  }
  return getOrExtractVocabAndChunksSqlite(rawText, level, bookId, isSeed, customKoreanText, preExtracted);
}

async function cleanupOrphanVocabChunks() {
  const pgPool = getPgPool();
  if (pgPool) {
    const res = await pgPool.query(
      "DELETE FROM vocab_chunks WHERE text_hash NOT IN (SELECT text_hash FROM books)"
    );
    return { deleted: res.rowCount || 0, engine: "postgresql" };
  }
  const info = getSqliteDb()
    .prepare("DELETE FROM vocab_chunks WHERE text_hash NOT IN (SELECT text_hash FROM books)")
    .run();
  return { deleted: info.changes || 0, engine: "sqlite" };
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

  const pgPool = getPgPool();
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
    getSqliteDb().prepare(`
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
  const pgPool = getPgPool();

  if (pgPool) {
    await pgPool.query(
      `UPDATE books
       SET title = $1, subtitle_kr = $2, level = $3, grade_recommended = $4, full_text = $5, text_hash = $6
       WHERE id = $7`,
      [title, subtitle_kr, level, grade_recommended, full_text, tHash, id]
    );
  } else {
    getSqliteDb()
      .prepare(
        `UPDATE books
         SET title = ?, subtitle_kr = ?, level = ?, grade_recommended = ?, full_text = ?, text_hash = ?
         WHERE id = ?`
      )
      .run(title, subtitle_kr, level, grade_recommended, full_text, tHash, id);
  }

  const analysis = await getOrExtractVocabAndChunks(full_text, level, id, false, korean_text);
  await cleanupOrphanVocabChunks().catch(() => {});

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
      speaking_questions: analysis.speaking_questions
    },
    analysis
  };
}

async function getBookIllustrations(bookId) {
  const cleanId = String(bookId || "").trim();
  if (!cleanId) return [];

  const pgPool = getPgPool();
  if (pgPool) {
    const bookRes = await pgPool.query("SELECT text_hash FROM books WHERE id = $1 LIMIT 1", [cleanId]);
    if (bookRes.rows.length === 0) return [];
    const tHash = bookRes.rows[0].text_hash;
    const vcRes = await pgPool.query(
      "SELECT page_illustrations_json FROM vocab_chunks WHERE text_hash = $1 LIMIT 1",
      [tHash]
    );
    return parseJsonField(vcRes.rows[0]?.page_illustrations_json, []);
  }

  const sqliteDb = getSqliteDb();
  const bookRow = sqliteDb.prepare("SELECT text_hash FROM books WHERE id = ? LIMIT 1").get(cleanId);
  if (!bookRow) return [];
  const vcRow = sqliteDb
    .prepare("SELECT page_illustrations_json FROM vocab_chunks WHERE text_hash = ? LIMIT 1")
    .get(bookRow.text_hash);
  return parseJsonField(vcRow?.page_illustrations_json, []);
}

async function ensureBookIllustrations(bookId) {
  const cleanId = String(bookId || "").trim();
  if (!cleanId) return { updated: 0, skipped: 0, reason: "missing_book_id" };
  const hasExternalKey = Boolean(process.env.OPENAI_API_KEY || process.env.GEMINI_API_KEY);
  if (!hasExternalKey) {
    return { updated: 0, skipped: 0, reason: "no_external_llm_key" };
  }

  const pgPool = getPgPool();
  if (pgPool) {
    const { rows: bRows } = await pgPool.query("SELECT * FROM books WHERE id = $1 LIMIT 1", [cleanId]);
    if (bRows.length === 0) return { updated: 0, skipped: 0, reason: "not_found" };
    const b = bRows[0];
    const tHash = b.text_hash || hashText(b.full_text);
    const existingRes = await pgPool.query(
      "SELECT extraction_source, page_illustrations_json FROM vocab_chunks WHERE text_hash = $1 LIMIT 1",
      [tHash]
    );
    const src = existingRes.rows[0]?.extraction_source || "";
    const existingIllus = parseJsonField(existingRes.rows[0]?.page_illustrations_json, []);
    if (src.startsWith("EXTERNAL_LLM_") && existingIllus.length > 0 && Boolean(existingIllus[0]?.image_url)) {
      return { updated: 0, skipped: 1, engine: "postgresql" };
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
    return { updated: 1, skipped: 0, engine: "postgresql" };
  }

  const sqliteDb = getSqliteDb();
  const b = sqliteDb.prepare("SELECT * FROM books WHERE id = ? LIMIT 1").get(cleanId);
  if (!b) return { updated: 0, skipped: 0, reason: "not_found" };
  const tHash = b.text_hash || hashText(b.full_text);
  const existing = sqliteDb
    .prepare("SELECT extraction_source, page_illustrations_json FROM vocab_chunks WHERE text_hash = ? LIMIT 1")
    .get(tHash);
  const src = existing?.extraction_source || "";
  const existingIllus = parseJsonField(existing?.page_illustrations_json, []);
  if (src.startsWith("EXTERNAL_LLM_") && existingIllus.length > 0 && Boolean(existingIllus[0]?.image_url)) {
    return { updated: 0, skipped: 1, engine: "sqlite" };
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
  return { updated: 1, skipped: 0, engine: "sqlite" };
}

async function reanalyzeAllBooksWithLLM({ force = false } = {}) {
  const hasExternalKey = Boolean(process.env.OPENAI_API_KEY || process.env.GEMINI_API_KEY);
  if (!hasExternalKey && !force) {
    return { updated: 0, skipped: 0, reason: "no_external_llm_key" };
  }

  let updated = 0;
  let skipped = 0;
  const pgPool = getPgPool();

  if (pgPool) {
    if (force) {
      await pgPool.query("UPDATE vocab_chunks SET page_illustrations_json = '[]'::jsonb");
    }
    const { rows: books } = await pgPool.query("SELECT id FROM books ORDER BY id");
    for (const b of books) {
      const res = await ensureBookIllustrations(b.id);
      updated += res.updated || 0;
      skipped += res.skipped || 0;
    }
    return { updated, skipped, engine: "postgresql" };
  }

  const sqliteDb = getSqliteDb();
  if (force) {
    sqliteDb.exec("UPDATE vocab_chunks SET page_illustrations_json = '[]'");
  }
  const books = sqliteDb.prepare("SELECT id FROM books ORDER BY id").all();
  for (const b of books) {
    const res = await ensureBookIllustrations(b.id);
    updated += res.updated || 0;
    skipped += res.skipped || 0;
  }
  return { updated, skipped, engine: "sqlite" };
}

async function getOrCreateBookWorksheets(bookId, force = false) {
  const cleanId = String(bookId || "").trim();
  if (!cleanId) throw new Error("교재 ID가 필요합니다.");

  const pgPool = getPgPool();
  let bookRow = null;
  let vcRow = null;

  if (pgPool) {
    const { rows: bRows } = await pgPool.query("SELECT * FROM books WHERE id = $1 LIMIT 1", [cleanId]);
    bookRow = bRows[0] || null;
    if (!bookRow) throw new Error("해당 원서를 찾을 수 없습니다.");
    const tHash = bookRow.text_hash || hashText(bookRow.full_text);
    const { rows: vcRows } = await pgPool.query(
      `SELECT vocab_json, chunks_json, sentence_translations_json, worksheets_json
       FROM vocab_chunks WHERE text_hash = $1 LIMIT 1`,
      [tHash]
    );
    vcRow = vcRows[0] || null;
  } else {
    const sqliteDb = getSqliteDb();
    bookRow = sqliteDb.prepare("SELECT * FROM books WHERE id = ? LIMIT 1").get(cleanId) || null;
    if (!bookRow) throw new Error("해당 원서를 찾을 수 없습니다.");
    const tHash = bookRow.text_hash || hashText(bookRow.full_text);
    vcRow =
      sqliteDb
        .prepare(
          `SELECT vocab_json, chunks_json, sentence_translations_json, worksheets_json
           FROM vocab_chunks WHERE text_hash = ? LIMIT 1`
        )
        .get(tHash) || null;
  }

  const existingWs = parseJsonField(vcRow?.worksheets_json, {});
  if (!force && existingWs && existingWs.week1 && existingWs.week2 && existingWs.week3_4) {
    return existingWs;
  }

  const hydratedBook = {
    ...bookRow,
    vocab: parseJsonField(vcRow?.vocab_json, []),
    chunks: parseJsonField(vcRow?.chunks_json, []),
    sentence_translations: parseJsonField(vcRow?.sentence_translations_json, [])
  };

  const worksheets = await generateBookWorksheetsWithLLM(hydratedBook);
  const tHash = bookRow.text_hash || hashText(bookRow.full_text);

  if (pgPool) {
    await pgPool.query(
      "UPDATE vocab_chunks SET worksheets_json = $1::jsonb WHERE text_hash = $2",
      [JSON.stringify(worksheets), tHash]
    );
  } else {
    getSqliteDb()
      .prepare("UPDATE vocab_chunks SET worksheets_json = ? WHERE text_hash = ?")
      .run(JSON.stringify(worksheets), tHash);
  }

  return worksheets;
}

module.exports = {
  needsReanalysis,
  getOrExtractVocabAndChunksSqlite,
  getOrExtractVocabAndChunks,
  cleanupOrphanVocabChunks,
  createBook,
  updateBook,
  getBookIllustrations,
  ensureBookIllustrations,
  reanalyzeAllBooksWithLLM,
  getOrCreateBookWorksheets
};

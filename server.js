/**
 * BADA 영어 Web Service Server (Production & Security Hardened)
 * Serves the 3D Kid-Friendly Student App (/student), Teacher SaaS Backoffice (/teacher),
 * and PostgreSQL/SQLite Dual-Engine REST APIs.
 */

const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const {
  initPostgresPoolIfConfigured,
  getDbEngineInfo,
  getAllBootstrapData,
  cleanupOrphanVocabChunks,
  updateUserProgress,
  markAgeTrackCompleteToday,
  verifyStudentPin,
  verifyTeacherLogin,
  createStudent,
  updateStudentAssignment,
  deleteStudent,
  createTeacher,
  updateTeacher,
  deleteTeacher,
  createBook,
  updateBook,
  getBookIllustrations,
  getBookCoverBuffer,
  ensureBookIllustrations,
  getIllustrationJobStatus,
  reanalyzeAllBooksWithLLM,
  saveStudentRecording,
  listStudentRecordings,
  getCachedTtsAudio,
  saveCachedTtsAudio,
  getOrCreateBookWorksheets,
  seedVocabIfEmpty,
  getStudentVocabState,
  getVocabUnitContent,
  buildVocabQuiz,
  submitVocabAttempt,
  updateStudentVocabSettings,
  getPronunciationFocusForStudent,
  completePronunciationFocusToday
} = require("./db");
const {
  evaluatePopoSpeech,
  evaluateWordPronunciationWithAI,
  generateTeacherQuestions,
  generateParentFeedbackMessage
} = require("./ai-engine");

const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || "0.0.0.0";
const DIST_DIR = path.resolve(__dirname, "dist");
const PUBLIC_DIR = path.resolve(__dirname, "public");
const SERVE_DIR = fs.existsSync(path.join(DIST_DIR, "index.html")) ? DIST_DIR : PUBLIC_DIR;

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2"
};

// Security Headers applied to every response
const SECURITY_HEADERS = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "SAMEORIGIN",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "microphone=(self), camera=(), geolocation=()"
};

// Lightweight per-IP rate limiter for write/compute endpoints (60 POST requests / minute)
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX_POST = 60;

function checkRateLimit(req) {
  const forwarded = req.headers["x-forwarded-for"];
  const ip = (typeof forwarded === "string" ? forwarded.split(",")[0].trim() : req.socket.remoteAddress) || "unknown";
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now - entry.start > RATE_LIMIT_WINDOW_MS) {
    rateLimitMap.set(ip, { start: now, count: 1 });
    return true;
  }
  entry.count += 1;
  return entry.count <= RATE_LIMIT_MAX_POST;
}

function sendJson(res, statusCode, payload, extraHeaders = {}) {
  const allowedOrigin = process.env.ALLOWED_ORIGIN || "*";
  res.writeHead(statusCode, {
    ...SECURITY_HEADERS,
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    ...extraHeaders
  });
  res.end(JSON.stringify(payload, null, 2));
}

function parseJsonBody(req, maxBytes = 100 * 1024) {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", (chunk) => {
      raw += chunk;
      if (raw.length > maxBytes) {
        req.destroy();
        reject(new Error("Payload too large"));
      }
    });
    req.on("end", () => {
      if (!raw) return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch (err) {
        reject(new Error("Invalid JSON body"));
      }
    });
    req.on("error", reject);
  });
}

const server = http.createServer(async (req, res) => {
  try {
    if (req.method === "OPTIONS") {
      return sendJson(res, 200, { ok: true });
    }

    if (req.method === "POST" && !checkRateLimit(req)) {
      return sendJson(res, 429, { error: "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요." });
    }

    const urlObj = new URL(req.url, `http://${req.headers.host || "localhost"}`);
    let pathname = "/";
    try {
      pathname = decodeURIComponent(urlObj.pathname);
    } catch (_) {
      return sendJson(res, 400, { error: "Bad Request" });
    }

    // 0. Health check endpoint for cloud deployment (Railway / Render / Docker)
    if (pathname === "/api/health" && req.method === "GET") {
      return sendJson(res, 200, {
        status: "ok",
        service: "bada-english-platform",
        ...getDbEngineInfo(),
        timestamp: new Date().toISOString()
      });
    }

    // 1. Bootstrap endpoint (lightweight; page illustrations & worksheets loaded on demand)
    if (pathname === "/api/bootstrap" && req.method === "GET") {
      const data = await getAllBootstrapData();
      return sendJson(res, 200, data);
    }

    // 1-A. Student PIN Authentication
    if (pathname === "/api/auth/student" && req.method === "POST") {
      const body = await parseJsonBody(req);
      const userId = String(body.userId || "").trim();
      const pinCode = String(body.pinCode || "").trim();
      const authRes = await verifyStudentPin(userId, pinCode);
      if (!authRes.ok) {
        return sendJson(res, 401, { ok: false, error: authRes.error });
      }
      return sendJson(res, 200, { ok: true, user: authRes.user });
    }

    // 1-B. Teacher / Director Password Authentication
    if (pathname === "/api/auth/teacher" && req.method === "POST") {
      const body = await parseJsonBody(req);
      const teacherId = String(body.teacherId || "").trim();
      const password = String(body.password || "").trim();
      const authRes = await verifyTeacherLogin(teacherId, password);
      if (!authRes.ok) {
        return sendJson(res, 401, { ok: false, error: authRes.error });
      }
      return sendJson(res, 200, { ok: true, teacher: authRes.teacher });
    }

    // 1-C. Student Registration & Assignment CRUD
    if (pathname === "/api/students/create" && req.method === "POST") {
      const body = await parseJsonBody(req);
      try {
        const student = await createStudent(body);
        const bootstrap = await getAllBootstrapData();
        return sendJson(res, 200, { ok: true, student, users: bootstrap.users });
      } catch (err) {
        return sendJson(res, 400, { ok: false, error: err.message });
      }
    }

    if (pathname === "/api/students/update" && req.method === "POST") {
      const body = await parseJsonBody(req);
      try {
        const result = await updateStudentAssignment(body);
        const bootstrap = await getAllBootstrapData();
        return sendJson(res, 200, {
          ok: true,
          ...result,
          users: bootstrap.users
        });
      } catch (err) {
        return sendJson(res, 400, { ok: false, error: err.message });
      }
    }

    if (pathname === "/api/students/delete" && req.method === "POST") {
      const body = await parseJsonBody(req);
      try {
        await deleteStudent(body.userId);
        const bootstrap = await getAllBootstrapData();
        return sendJson(res, 200, { ok: true, users: bootstrap.users });
      } catch (err) {
        return sendJson(res, 400, { ok: false, error: err.message });
      }
    }

    // 1-D. Director Teacher Registration & Management CRUD
    if (pathname === "/api/teachers/create" && req.method === "POST") {
      const body = await parseJsonBody(req);
      try {
        const teacher = await createTeacher(body);
        const bootstrap = await getAllBootstrapData();
        return sendJson(res, 200, { ok: true, teacher, teachers: bootstrap.teachers });
      } catch (err) {
        return sendJson(res, 400, { ok: false, error: err.message });
      }
    }

    if (pathname === "/api/teachers/update" && req.method === "POST") {
      const body = await parseJsonBody(req);
      try {
        const teacher = await updateTeacher(body);
        const bootstrap = await getAllBootstrapData();
        return sendJson(res, 200, { ok: true, teacher, teachers: bootstrap.teachers });
      } catch (err) {
        return sendJson(res, 400, { ok: false, error: err.message });
      }
    }

    if (pathname === "/api/teachers/delete" && req.method === "POST") {
      const body = await parseJsonBody(req);
      try {
        await deleteTeacher(body.teacherId);
        const bootstrap = await getAllBootstrapData();
        return sendJson(res, 200, { ok: true, teachers: bootstrap.teachers });
      } catch (err) {
        return sendJson(res, 400, { ok: false, error: err.message });
      }
    }

    // 2. Lazy-load page illustrations for a single book
    if (pathname === "/api/books/illustrations" && req.method === "GET") {
      const bookId = String(urlObj.searchParams.get("bookId") || "").trim();
      if (!bookId) {
        return sendJson(res, 400, { ok: false, error: "bookId is required." });
      }
      const page_illustrations = await getBookIllustrations(bookId);
      return sendJson(
        res,
        200,
        { ok: true, bookId, page_illustrations },
        { "Cache-Control": "private, max-age=60" }
      );
    }

    if (pathname === "/api/books/cover" && req.method === "GET") {
      const bookId = String(urlObj.searchParams.get("bookId") || "").trim();
      if (!bookId) {
        return sendJson(res, 400, { ok: false, error: "bookId is required." });
      }
      const cover = await getBookCoverBuffer(bookId);
      if (!cover) {
        return sendJson(res, 404, { ok: false, error: "Custom cover not found." });
      }
      res.writeHead(200, {
        "Content-Type": cover.mimeType,
        "Content-Length": cover.buffer.length,
        "Cache-Control": "public, max-age=3600"
      });
      res.end(cover.buffer);
      return;
    }

    if (pathname === "/api/books/illustrations/regenerate" && req.method === "POST") {
      try {
        const body = await parseJsonBody(req);
        const bookId = String(body.bookId || "").trim();
        if (!bookId) throw new Error("bookId is required.");
        if (body.async) {
          ensureBookIllustrations(bookId, { force: true, onlyIllustrations: true }).catch(() => {});
          return sendJson(res, 200, { ok: true, status: "started", bookId });
        }
        const result = await ensureBookIllustrations(bookId, { force: true, onlyIllustrations: true });
        return sendJson(res, 200, { ok: true, bookId, ...result });
      } catch (err) {
        return sendJson(res, 400, { ok: false, error: err.message });
      }
    }

    if (pathname === "/api/books/illustrations/status" && req.method === "GET") {
      const bookId = String(urlObj.searchParams.get("bookId") || "").trim();
      if (!bookId) {
        return sendJson(res, 400, { ok: false, error: "bookId is required." });
      }
      const status = await getIllustrationJobStatus(bookId);
      return sendJson(res, 200, { ok: true, ...status });
    }

    // 2-B. Register New Book into DB (so it appears in Student Assignment Dropdown)
    if (pathname === "/api/books/create" && req.method === "POST") {
      const body = await parseJsonBody(req);
      try {
        const created = await createBook(body);
        const updatedBootstrap = await getAllBootstrapData();
        ensureBookIllustrations(created.book.id).catch(() => {});
        getOrCreateBookWorksheets(created.book.id, false).catch(() => {});
        return sendJson(res, 200, {
          ok: true,
          book: created.book,
          analysis: created.analysis,
          books: updatedBootstrap.books
        });
      } catch (err) {
        return sendJson(res, 400, { ok: false, error: err.message });
      }
    }

    // 2.55 Update existing storybook
    if (pathname === "/api/books/update" && req.method === "POST") {
      try {
        const body = await parseJsonBody(req);
        const updated = await updateBook(body);
        const updatedBootstrap = await getAllBootstrapData();
        ensureBookIllustrations(updated.book.id).catch(() => {});
        getOrCreateBookWorksheets(updated.book.id, true).catch(() => {});
        return sendJson(res, 200, {
          ok: true,
          book: updated.book,
          analysis: updated.analysis,
          books: updatedBootstrap.books
        });
      } catch (err) {
        return sendJson(res, 400, { ok: false, error: err.message });
      }
    }

    // 2.7 Generate or fetch cached offline printable worksheets for a storybook (O(1) single-book payload)
    if (pathname === "/api/books/worksheets" && req.method === "POST") {
      try {
        const body = await parseJsonBody(req);
        const cleanBookId = String(body.bookId || "").trim();
        const [worksheets, page_illustrations] = await Promise.all([
          getOrCreateBookWorksheets(cleanBookId, Boolean(body.force)),
          getBookIllustrations(cleanBookId).catch(() => [])
        ]);
        return sendJson(res, 200, {
          ok: true,
          bookId: cleanBookId,
          has_worksheets: true,
          worksheets,
          page_illustrations
        });
      } catch (err) {
        return sendJson(res, 400, { ok: false, error: err.message });
      }
    }

    // 3. Week 3 Popo Speaking Feedback endpoint
    if (pathname === "/api/popo/feedback" && req.method === "POST") {
      const body = await parseJsonBody(req);
      const feedback = evaluatePopoSpeech({
        transcript: String(body.transcript || "").slice(0, 300),
        bookId: String(body.bookId || "").slice(0, 80),
        targetChunk: String(body.targetChunk || "").slice(0, 120),
        popoQuestion: String(body.popoQuestion || "").slice(0, 300)
      });
      return sendJson(res, 200, feedback);
    }

    // 4. Student weekly progress & audio URL update endpoint
    if (pathname === "/api/users/progress" && req.method === "POST") {
      const body = await parseJsonBody(req);
      const safeUserId = String(body.userId || "stu_hajun").replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 60);
      const safeWeek = Math.min(4, Math.max(1, Number(body.week) || 1));
      const safeProgress = Math.min(100, Math.max(0, Number(body.progress) || 100));
      let safeAudioUrl = null;
      if (typeof body.audioUrl === "string" && /^(storage:\/\/bada-audio\/|https:\/\/)[a-zA-Z0-9/_.-]+$/.test(body.audioUrl)) {
        safeAudioUrl = body.audioUrl.slice(0, 250);
      }
      const result = await updateUserProgress(safeUserId, safeWeek, safeProgress, safeAudioUrl, {
        enforceDailyLimit: Boolean(body.enforceDailyLimit)
      });
      return sendJson(res, 200, { ok: true, ...result });
    }

    if (pathname === "/api/users/age-track-complete" && req.method === "POST") {
      try {
        const body = await parseJsonBody(req);
        const safeUserId = String(body.userId || "stu_hajun").replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 60);
        const result = await markAgeTrackCompleteToday(safeUserId);
        return sendJson(res, 200, { ok: true, ...result });
      } catch (err) {
        return sendJson(res, 400, { ok: false, error: err.message });
      }
    }

    // 4-B. 3-Stage Vocabulary Learning APIs
    if (pathname === "/api/vocab/state" && req.method === "GET") {
      try {
        const userId = String(urlObj.searchParams.get("userId") || "stu_hajun").trim();
        const state = await getStudentVocabState(userId);
        return sendJson(res, 200, { ok: true, ...state });
      } catch (err) {
        return sendJson(res, 400, { ok: false, error: err.message });
      }
    }

    if (pathname === "/api/vocab/unit" && req.method === "GET") {
      try {
        const tier = String(urlObj.searchParams.get("tier") || "all").trim();
        const stage = Number(urlObj.searchParams.get("stage")) || 1;
        const unitKey = String(urlObj.searchParams.get("unitKey") || "A").trim();
        const content = await getVocabUnitContent({ tier, stage, unitKey });
        return sendJson(res, 200, { ok: true, ...content });
      } catch (err) {
        return sendJson(res, 400, { ok: false, error: err.message });
      }
    }

    if (pathname === "/api/vocab/quiz" && req.method === "POST") {
      try {
        const body = await parseJsonBody(req);
        const quiz = await buildVocabQuiz({
          userId: String(body.userId || "").trim(),
          tier: body.tier ? String(body.tier).trim() : undefined,
          stage: Number(body.stage) || 1,
          unitKey: String(body.unitKey || "A").trim(),
          attemptType: body.attemptType === "final_test" ? "final_test" : "daily_quiz",
          quizMode: body.quizMode ? String(body.quizMode).trim() : undefined
        });
        return sendJson(res, 200, { ok: true, ...quiz });
      } catch (err) {
        return sendJson(res, 400, { ok: false, error: err.message });
      }
    }

    if (pathname === "/api/vocab/attempt" && req.method === "POST") {
      try {
        const body = await parseJsonBody(req);
        const result = await submitVocabAttempt({
          userId: String(body.userId || "").trim(),
          tier: body.tier ? String(body.tier).trim() : undefined,
          stage: Number(body.stage) || 1,
          unitKey: String(body.unitKey || "A").trim(),
          attemptType: body.attemptType === "final_test" ? "final_test" : "daily_quiz",
          totalCount: Number(body.totalCount) || 0,
          correctCount: Number(body.correctCount) || 0,
          wrongWordIds: Array.isArray(body.wrongWordIds) ? body.wrongWordIds : []
        });
        return sendJson(res, 200, { ok: true, ...result });
      } catch (err) {
        return sendJson(res, 400, { ok: false, error: err.message });
      }
    }

    if (pathname === "/api/vocab/settings" && req.method === "POST") {
      try {
        const body = await parseJsonBody(req);
        const state = await updateStudentVocabSettings(body);
        return sendJson(res, 200, { ok: true, ...state });
      } catch (err) {
        return sendJson(res, 400, { ok: false, error: err.message });
      }
    }

    if (pathname === "/api/vocab/pronunciation-focus" && req.method === "POST") {
      try {
        const body = await parseJsonBody(req);
        const focus = await getPronunciationFocusForStudent({
          userId: String(body.userId || "").trim(),
          stage: Number(body.stage) || 1,
          unitKey: String(body.unitKey || "A").trim(),
          tier: body.tier ? String(body.tier).trim() : undefined,
          forceMode: body.forceMode ? String(body.forceMode).trim() : undefined,
          quizWordIds: Array.isArray(body.quizWordIds) ? body.quizWordIds : [],
          wrongWordIds: Array.isArray(body.wrongWordIds) ? body.wrongWordIds : []
        });
        return sendJson(res, 200, { ok: true, ...focus });
      } catch (err) {
        return sendJson(res, 400, { ok: false, error: err.message });
      }
    }

    if (pathname === "/api/vocab/pronunciation-eval" && req.method === "POST") {
      try {
        const body = await parseJsonBody(req, 4 * 1024 * 1024);
        const result = await evaluateWordPronunciationWithAI({
          targetWord: String(body.targetWord || "").trim(),
          phonicsLabel: String(body.phonicsLabel || "").trim(),
          mouthTipKr: String(body.mouthTipKr || "").trim(),
          audioDataUrl: String(body.audioDataUrl || ""),
          attemptNumber: Number(body.attemptNumber) || 1
        });
        return sendJson(res, 200, result);
      } catch (err) {
        return sendJson(res, 400, { ok: false, error: err.message });
      }
    }

    if (pathname === "/api/vocab/pronunciation-complete" && req.method === "POST") {
      try {
        const body = await parseJsonBody(req);
        const state = await completePronunciationFocusToday({
          userId: String(body.userId || "").trim(),
          completedMode: body.completedMode ? String(body.completedMode).trim() : "day1_listen",
          stage: body.stage ? Number(body.stage) : undefined,
          unitKey: body.unitKey ? String(body.unitKey).trim() : undefined,
          tier: body.tier ? String(body.tier).trim() : undefined,
          words: Array.isArray(body.words) ? body.words : []
        });
        return sendJson(res, 200, { ok: true, ...state });
      } catch (err) {
        return sendJson(res, 400, { ok: false, error: err.message });
      }
    }

    // 5. Teacher SaaS 4th-Week AI Recommended Questions endpoint
    if (pathname === "/api/teacher/questions" && req.method === "POST") {
      const body = await parseJsonBody(req);
      const questions = generateTeacherQuestions({
        studentName: String(body.studentName || "김하준").slice(0, 40),
        bookTitle: String(body.bookTitle || "Popo and the Ocean Friends").slice(0, 120),
        weakPoints: Array.isArray(body.weakPoints) ? body.weakPoints.slice(0, 10) : [],
        strongPoints: Array.isArray(body.strongPoints) ? body.strongPoints.slice(0, 10) : [],
        coreExpressions: Array.isArray(body.coreExpressions) ? body.coreExpressions.slice(0, 8) : []
      });
      return sendJson(res, 200, { questions });
    }

    // 5.2 AI Parent Feedback Message Generator
    if (pathname === "/api/teacher/parent-feedback" && req.method === "POST") {
      const body = await parseJsonBody(req);
      const userId = String(body.userId || "").trim();
      const recs = userId ? await listStudentRecordings(userId) : [];
      const message = await generateParentFeedbackMessage({
        studentName: String(body.studentName || "학생").slice(0, 40),
        level: String(body.level || "Level 2").slice(0, 40),
        bookTitle: String(body.bookTitle || "").slice(0, 120),
        weeklyProgress: body.weeklyProgress || {},
        recordingsSummary: recs.slice(0, 5).map((r) => ({
          week_num: r.week_num,
          weak_words: r.ai_feedback?.weak_words || [],
          pronunciation_tip_kr: r.ai_feedback?.pronunciation_tip_kr || ""
        }))
      });
      return sendJson(res, 200, { ok: true, message });
    }

    // 5.5 Student Voice Recordings (list & upload with AI pronunciation feedback)
    if (pathname === "/api/recordings" && req.method === "GET") {
      const userId = urlObj.searchParams.get("userId") || "";
      const recordings = await listStudentRecordings(userId || null);
      return sendJson(res, 200, { ok: true, recordings });
    }

    if (pathname === "/api/recordings" && req.method === "POST") {
      try {
        const body = await parseJsonBody(req, 8 * 1024 * 1024);
        const userId = String(body.userId || "").trim();
        const bookId = String(body.bookId || "").trim();
        const rawAudio = String(body.audioDataUrl || "");
        const audioDataUrl =
          rawAudio.startsWith("data:audio/") || rawAudio.startsWith("data:video/")
            ? rawAudio
            : "";
        if (!userId || !bookId) {
          return sendJson(res, 400, { ok: false, error: "userId and bookId are required." });
        }
        const saved = await saveStudentRecording({
          userId,
          bookId,
          weekNum: Number(body.weekNum) || 1,
          repeatNum: Number(body.repeatNum) || 1,
          transcript: String(body.transcript || ""),
          audioDataUrl,
          expectedText: String(body.expectedText || ""),
          level: String(body.level || "Level 2")
        });
        return sendJson(res, 200, { ok: true, recording: saved });
      } catch (err) {
        return sendJson(res, 400, { ok: false, error: err.message });
      }
    }

    // 6. Natural Storyteller TTS endpoint (OpenAI gpt-4o-mini-tts / tts-1-hd when OPENAI_API_KEY is set; 204 otherwise)
    if (pathname === "/api/tts" && req.method === "POST") {
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) {
        res.writeHead(204, SECURITY_HEADERS);
        res.end();
        return;
      }
      const body = await parseJsonBody(req);
      const text = String(body.text || "").trim().slice(0, 1500);
      if (!text) {
        return sendJson(res, 400, { error: "text is required" });
      }
      const isSingleWord = !/\s/.test(text);
      const rawSpeed = Number(body.speed) || 0.90;
      const speed = isSingleWord ? 0.85 : rawSpeed < 0.85 ? 0.80 : 0.90;
      const voice = String(body.voice || process.env.OPENAI_TTS_VOICE || "shimmer");
      const crypto = require("node:crypto");
      const rawKey = `v3|${voice}|${speed.toFixed(2)}|${text}`;
      const cacheKey = crypto.createHash("sha256").update(rawKey).digest("hex");
      if (!global.__badaTtsCache) global.__badaTtsCache = new Map();
      const cache = global.__badaTtsCache;

      if (cache.has(cacheKey)) {
        res.writeHead(200, {
          ...SECURITY_HEADERS,
          "Content-Type": "audio/mpeg",
          "Cache-Control": "public, max-age=86400"
        });
        res.end(cache.get(cacheKey));
        return;
      }

      // Check permanent PostgreSQL / SQLite TTS cache before calling OpenAI
      const dbAudio = await getCachedTtsAudio(cacheKey);
      if (dbAudio) {
        if (cache.size >= 200) cache.delete(cache.keys().next().value);
        cache.set(cacheKey, dbAudio);
        res.writeHead(200, {
          ...SECURITY_HEADERS,
          "Content-Type": "audio/mpeg",
          "Cache-Control": "public, max-age=86400"
        });
        res.end(dbAudio);
        return;
      }

      const instructions = isSingleWord
        ? "Speak with a bright, sweet, youthful voice like a friendly young older-sister or teen storyteller. Pronounce this single English word clearly, crisply, and at a cheerful, confident volume so elementary phonics beginners can hear every sound distinctly."
        : "Read aloud with a bright, sweet, youthful voice like a friendly young storyteller reading a picture book to kids. Use lively natural melody, gentle pauses at commas, warm enthusiasm, and crisp articulation.";

      let ttsRes = await fetch("https://api.openai.com/v1/audio/speech", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: "gpt-4o-mini-tts",
          voice,
          input: text,
          speed,
          instructions
        })
      });

      if (!ttsRes.ok) {
        ttsRes = await fetch("https://api.openai.com/v1/audio/speech", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model: "tts-1-hd",
            voice: "nova",
            input: text,
            speed
          })
        });
      }

      if (!ttsRes.ok) {
        res.writeHead(204, SECURITY_HEADERS);
        res.end();
        return;
      }

      const audioBuf = Buffer.from(await ttsRes.arrayBuffer());
      if (cache.size >= 200) {
        const oldestKey = cache.keys().next().value;
        cache.delete(oldestKey);
      }
      cache.set(cacheKey, audioBuf);
      saveCachedTtsAudio(cacheKey, audioBuf).catch(() => {});

      res.writeHead(200, {
        ...SECURITY_HEADERS,
        "Content-Type": "audio/mpeg",
        "Cache-Control": "public, max-age=86400"
      });
      res.end(audioBuf);
      return;
    }

    // Static file serving with strict directory boundary enforcement
    const relTarget = pathname === "/" ? "index.html" : pathname.replace(/^[/\\]+/, "");
    const absPath = path.resolve(SERVE_DIR, relTarget);

    if (!absPath.startsWith(SERVE_DIR + path.sep) && absPath !== path.join(SERVE_DIR, "index.html")) {
      res.writeHead(403, { ...SECURITY_HEADERS, "Content-Type": "text/plain; charset=utf-8" });
      res.end("Forbidden");
      return;
    }

    if (fs.existsSync(absPath) && fs.statSync(absPath).isFile()) {
      const ext = path.extname(absPath).toLowerCase();
      const contentType = MIME_TYPES[ext] || "application/octet-stream";
      const headers = { ...SECURITY_HEADERS, "Content-Type": contentType };
      if ([".jpg", ".jpeg", ".png", ".webp", ".svg", ".woff2"].includes(ext)) {
        headers["Cache-Control"] = "public, max-age=86400";
      }
      res.writeHead(200, headers);
      fs.createReadStream(absPath).pipe(res);
      return;
    }

    // Fallback to index.html for SPA routes (/student, /student/learn, /student/curriculum, /teacher/*)
    const indexPath = path.join(SERVE_DIR, "index.html");
    if (fs.existsSync(indexPath)) {
      res.writeHead(200, { ...SECURITY_HEADERS, "Content-Type": "text/html; charset=utf-8" });
      fs.createReadStream(indexPath).pipe(res);
      return;
    }

    res.writeHead(404, { ...SECURITY_HEADERS, "Content-Type": "text/plain; charset=utf-8" });
    res.end("Not Found");
  } catch (err) {
    console.error("Server error:", err);
    sendJson(res, 500, { error: "Internal Server Error" });
  }
});

async function startServer() {
  await initPostgresPoolIfConfigured();
  await cleanupOrphanVocabChunks().catch(() => {});
  const vocabSeedRes = await seedVocabIfEmpty().catch((err) => {
    console.warn("⚠️ [BADA Vocab] 초기 어휘 시드 적재 오류:", err.message);
    return null;
  });
  if (vocabSeedRes) {
    console.log(
      vocabSeedRes.skipped
        ? `📚 [BADA Vocab] 어휘 DB 준비 완료 (기존 시드 유지: ${vocabSeedRes.count ?? "ok"})`
        : `📚 [BADA Vocab] 어휘 DB 자동 시드 완료: ${vocabSeedRes.words}개 단어 / ${vocabSeedRes.units}개 유닛 / ${vocabSeedRes.affixItems}개 접사 (${vocabSeedRes.engine})`
    );
  }
  const info = getDbEngineInfo();
  server.listen(PORT, HOST, () => {
    console.log(`🌊 BADA 영어 웹 서비스가 실행되었습니다: http://localhost:${PORT} (DB Engine: ${info.engine.toUpperCase()})`);
  });

  // Automatically upgrade any un-analyzed / fallback-analyzed books in DB using configured external LLM
  reanalyzeAllBooksWithLLM({ force: false })
    .then((res) => {
      if (res.updated > 0) {
        console.log(`✨ [BADA LLM] 기존 원서 ${res.updated}권 외부 LLM 재분석 및 DB 저장 완료`);
      }
    })
    .catch((err) => {
      console.warn("⚠️ [BADA LLM] 시작 시 원서 재분석 중 오류:", err.message);
    });
}

startServer();

/**
 * Student & Teacher authentication, assignment management, and KST daily-limited weekly progress.
 */

const {
  getPgPool,
  getSqliteDb,
  parseJsonField,
  hashPassword,
  getKstTodayDateString
} = require("./connection");
const { mapGradeLabelToGroupAndAge, mapLevelToDefaultClasscard } = require("./seeds");

function formatUserRow(u) {
  const rawCompleted = parseJsonField(u.completed_books_json, []);
  const completedSet = new Set(Array.isArray(rawCompleted) ? rawCompleted : []);
  if (Number(u.progress_w4) >= 100 && u.current_book_id) {
    completedSet.add(u.current_book_id);
  }
  return {
    ...u,
    pin_code: u.pin_code || "1234",
    teacher_id: u.teacher_id || "tch_director",
    classcard_level: Number(u.classcard_level) || mapLevelToDefaultClasscard(u.level),
    classcard_mode: u.classcard_mode || "both",
    completed_books: Array.from(completedSet),
    daily_study_dates: parseJsonField(u.daily_study_dates_json, {}),
    strengths: parseJsonField(u.strengths_json, []),
    weaknesses: parseJsonField(u.weaknesses_json, [])
  };
}

async function verifyStudentPin(userId, pinCode) {
  const cleanPin = String(pinCode || "").trim();
  const pgPool = getPgPool();
  if (pgPool) {
    const { rows } = await pgPool.query("SELECT * FROM users WHERE id = $1", [userId]);
    if (rows.length === 0) return { ok: false, error: "등록된 학생을 찾을 수 없습니다." };
    const student = formatUserRow(rows[0]);
    if (student.pin_code !== cleanPin) {
      return { ok: false, error: "출석 PIN 번호 4자리가 일치하지 않습니다. (기본값: 1234)" };
    }
    return { ok: true, user: student };
  }

  const row = getSqliteDb().prepare("SELECT * FROM users WHERE id = ?").get(userId);
  if (!row) return { ok: false, error: "등록된 학생을 찾을 수 없습니다." };
  const student = formatUserRow(row);
  if (student.pin_code !== cleanPin) {
    return { ok: false, error: "출석 PIN 번호 4자리가 일치하지 않습니다. (기본값: 1234)" };
  }
  return { ok: true, user: student };
}

async function verifyTeacherLogin(teacherId, password) {
  const inputHash = hashPassword(password);
  const pgPool = getPgPool();
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

  const t = getSqliteDb().prepare("SELECT * FROM teachers WHERE id = ?").get(teacherId);
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
  const teacher_id = String(payload.teacher_id || "tch_director").trim();
  const classcard_level = Math.min(26, Math.max(1, Number(payload.classcard_level) || mapLevelToDefaultClasscard(level)));

  const id = `stu_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
  const defaultStrengths = [{ tag: "신규 배정 (1주차 문장 쉐도잉 시작)", count: 1, type: "chunk" }];
  const defaultWeaknesses = [{ tag: "첫 1주차 원서 발화 데이터 수집 대기 중", count: 1, type: "fluency" }];
  const audioW1 = `storage://bada-audio/${id}/week1_word_hesitant.wav`;
  const audioW4 = `storage://bada-audio/${id}/week4_full_fluent.wav`;

  const pgPool = getPgPool();
  if (pgPool) {
    await pgPool.query(
      `INSERT INTO users (
         id, name, grade_label, grade_group, age, level, current_book_id,
         pin_code, teacher_id, classcard_level,
         progress_w1, progress_w2, progress_w3, progress_w4,
         audio_w1_url, audio_w4_url, w1_wpm, w4_wpm, w1_accuracy, w4_accuracy,
         strengths_json, weaknesses_json, daily_study_dates_json
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10, 0,0,0,0, $11,$12, 36,90,65,95, $13::jsonb,$14::jsonb, '{}'::jsonb)`,
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

  const sqliteDb = getSqliteDb();
  sqliteDb.prepare(`
    INSERT INTO users (
      id, name, grade_label, grade_group, age, level, current_book_id,
      pin_code, teacher_id, classcard_level,
      progress_w1, progress_w2, progress_w3, progress_w4,
      audio_w1_url, audio_w4_url, w1_wpm, w4_wpm, w1_accuracy, w4_accuracy,
      strengths_json, weaknesses_json, daily_study_dates_json
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, 0, 0, ?, ?, 36, 90, 65, 95, ?, ?, '{}')
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
 * Resets weekly progress & daily credit dates to 0 when assigning a new book or when resetProgress=true.
 */
async function updateStudentAssignment(payload) {
  const userId = String(payload.userId || "").trim();
  if (!userId) throw new Error("학생 ID가 필요합니다.");

  const pgPool = getPgPool();
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
    const nextTeacherId = payload.teacher_id ? String(payload.teacher_id).trim() : (prev.teacher_id || "tch_director");
    const nextClasscard = payload.classcard_level !== undefined
      ? Math.min(26, Math.max(1, Number(payload.classcard_level) || 1))
      : (prev.classcard_level || mapLevelToDefaultClasscard(nextLevel));
    const nextClasscardMode = ["both", "phonics_only", "book_only"].includes(payload.classcard_mode)
      ? payload.classcard_mode
      : (prev.classcard_mode || "both");

    const bookChanged = nextBookId !== prev.current_book_id;
    const shouldResetWeek1 = bookChanged || Boolean(payload.resetProgress);

    const clampProg = (v, fallback) =>
      v !== undefined ? Math.min(100, Math.max(0, Number(v) || 0)) : fallback;

    const w1 = shouldResetWeek1 ? 0 : clampProg(payload.progress_w1, prev.progress_w1);
    const w2 = shouldResetWeek1 ? 0 : clampProg(payload.progress_w2, prev.progress_w2);
    const w3 = shouldResetWeek1 ? 0 : clampProg(payload.progress_w3, prev.progress_w3);
    const w4 = shouldResetWeek1 ? 0 : clampProg(payload.progress_w4, prev.progress_w4);

    const prevCompleted = parseJsonField(prev.completed_books_json, []);
    const nextCompletedSet = new Set(Array.isArray(prevCompleted) ? prevCompleted : []);
    if (Number(prev.progress_w4) >= 100 && prev.current_book_id) {
      nextCompletedSet.add(prev.current_book_id);
    }
    if (w4 >= 100 && nextBookId) {
      nextCompletedSet.add(nextBookId);
    }

    const nextDailyDates = shouldResetWeek1
      ? {}
      : parseJsonField(prev.daily_study_dates_json, {});

    await pgPool.query(
      `UPDATE users
       SET grade_label = $1, grade_group = $2, age = $3, level = $4, current_book_id = $5,
           pin_code = $6, teacher_id = $7, classcard_level = $8, classcard_mode = $9,
           progress_w1 = $10, progress_w2 = $11, progress_w3 = $12, progress_w4 = $13,
           completed_books_json = $14::jsonb,
           daily_study_dates_json = $15::jsonb
       WHERE id = $16`,
      [
        nextGradeLabel, grade_group, age, nextLevel, nextBookId,
        nextPin, nextTeacherId, nextClasscard, nextClasscardMode,
        w1, w2, w3, w4,
        JSON.stringify(Array.from(nextCompletedSet)),
        JSON.stringify(nextDailyDates),
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

  const sqliteDb = getSqliteDb();
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
  const nextTeacherId = payload.teacher_id ? String(payload.teacher_id).trim() : (prev.teacher_id || "tch_director");
  const nextClasscard = payload.classcard_level !== undefined
    ? Math.min(26, Math.max(1, Number(payload.classcard_level) || 1))
    : (prev.classcard_level || mapLevelToDefaultClasscard(nextLevel));
  const nextClasscardMode = ["both", "phonics_only", "book_only"].includes(payload.classcard_mode)
    ? payload.classcard_mode
    : (prev.classcard_mode || "both");

  const bookChanged = nextBookId !== prev.current_book_id;
  const shouldResetWeek1 = bookChanged || Boolean(payload.resetProgress);

  const clampProg = (v, fallback) =>
    v !== undefined ? Math.min(100, Math.max(0, Number(v) || 0)) : fallback;

  const w1 = shouldResetWeek1 ? 0 : clampProg(payload.progress_w1, prev.progress_w1);
  const w2 = shouldResetWeek1 ? 0 : clampProg(payload.progress_w2, prev.progress_w2);
  const w3 = shouldResetWeek1 ? 0 : clampProg(payload.progress_w3, prev.progress_w3);
  const w4 = shouldResetWeek1 ? 0 : clampProg(payload.progress_w4, prev.progress_w4);

  const prevCompleted = parseJsonField(prev.completed_books_json, []);
  const nextCompletedSet = new Set(Array.isArray(prevCompleted) ? prevCompleted : []);
  if (Number(prev.progress_w4) >= 100 && prev.current_book_id) {
    nextCompletedSet.add(prev.current_book_id);
  }
  if (w4 >= 100 && nextBookId) {
    nextCompletedSet.add(nextBookId);
  }

  const nextDailyDates = shouldResetWeek1
    ? {}
    : parseJsonField(prev.daily_study_dates_json, {});

  sqliteDb.prepare(`
    UPDATE users
    SET grade_label = ?, grade_group = ?, age = ?, level = ?, current_book_id = ?,
        pin_code = ?, teacher_id = ?, classcard_level = ?, classcard_mode = ?,
        progress_w1 = ?, progress_w2 = ?, progress_w3 = ?, progress_w4 = ?,
        completed_books_json = ?,
        daily_study_dates_json = ?
    WHERE id = ?
  `).run(
    nextGradeLabel, grade_group, age, nextLevel, nextBookId,
    nextPin, nextTeacherId, nextClasscard, nextClasscardMode,
    w1, w2, w3, w4,
    JSON.stringify(Array.from(nextCompletedSet)),
    JSON.stringify(nextDailyDates),
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
  const pgPool = getPgPool();
  if (pgPool) {
    await pgPool.query("DELETE FROM users WHERE id = $1", [cleanId]);
    return { deletedId: cleanId };
  }
  getSqliteDb().prepare("DELETE FROM users WHERE id = ?").run(cleanId);
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

  const pgPool = getPgPool();
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

  const sqliteDb = getSqliteDb();
  sqliteDb.prepare(`
    INSERT INTO teachers (id, name, role, title_label, email, password_hash, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(id, name, role, title_label, email, password_hash, now);

  return sqliteDb.prepare("SELECT id, name, role, title_label, email, created_at FROM teachers WHERE id = ?").get(id);
}

async function updateTeacher(payload) {
  const teacherId = String(payload.teacherId || payload.id || "").trim();
  const name = String(payload.name || "").trim();
  const title_label = String(payload.title_label || "").trim();
  const email = String(payload.email || "").trim();
  const newPassword = String(payload.password || "").trim();

  if (!teacherId) throw new Error("수정할 계정 ID가 필요합니다.");
  if (!name) throw new Error("이름을 입력해 주세요.");
  if (newPassword && newPassword.length < 4) {
    throw new Error("새 비밀번호는 최소 4자리 이상이어야 합니다.");
  }

  const pgPool = getPgPool();
  if (pgPool) {
    if (newPassword) {
      await pgPool.query(
        `UPDATE teachers SET name = $1, title_label = $2, email = $3, password_hash = $4 WHERE id = $5`,
        [name, title_label || "원장 · 최고관리자", email || "director@bada.kr", hashPassword(newPassword), teacherId]
      );
    } else {
      await pgPool.query(
        `UPDATE teachers SET name = $1, title_label = $2, email = $3 WHERE id = $4`,
        [name, title_label || "원장 · 최고관리자", email || "director@bada.kr", teacherId]
      );
    }
    const { rows } = await pgPool.query(
      "SELECT id, name, role, title_label, email, created_at FROM teachers WHERE id = $1",
      [teacherId]
    );
    return rows[0];
  }

  const sqliteDb = getSqliteDb();
  if (newPassword) {
    sqliteDb
      .prepare(`UPDATE teachers SET name = ?, title_label = ?, email = ?, password_hash = ? WHERE id = ?`)
      .run(name, title_label || "원장 · 최고관리자", email || "director@bada.kr", hashPassword(newPassword), teacherId);
  } else {
    sqliteDb
      .prepare(`UPDATE teachers SET name = ?, title_label = ?, email = ? WHERE id = ?`)
      .run(name, title_label || "원장 · 최고관리자", email || "director@bada.kr", teacherId);
  }
  return sqliteDb.prepare("SELECT id, name, role, title_label, email, created_at FROM teachers WHERE id = ?").get(teacherId);
}

async function deleteTeacher(teacherId) {
  const cleanId = String(teacherId || "").trim();
  if (!cleanId) throw new Error("삭제할 강사 ID가 필요합니다.");
  if (cleanId === "tch_director") {
    throw new Error("원장님(최고관리자) 기본 계정은 삭제할 수 없습니다.");
  }
  const pgPool = getPgPool();
  if (pgPool) {
    await pgPool.query("DELETE FROM teachers WHERE id = $1", [cleanId]);
    return { deletedId: cleanId };
  }
  getSqliteDb().prepare("DELETE FROM teachers WHERE id = ?").run(cleanId);
  return { deletedId: cleanId };
}

/**
 * Updates weekly progress. When `options.enforceDailyLimit === true`, enforces once-per-KST-day
 * progression (+20% per day, 5 days = 100%) in `users.daily_study_dates_json`.
 */
async function updateUserProgress(userId, weekNumber, progressVal, audioUrl, options = {}) {
  const col = `progress_w${weekNumber}`;
  if (!["progress_w1", "progress_w2", "progress_w3", "progress_w4"].includes(col)) {
    throw new Error("Invalid week number");
  }

  const enforceDailyLimit = Boolean(options.enforceDailyLimit);
  const todayKst = getKstTodayDateString();
  const weekKey = `w${weekNumber}`;
  const pgPool = getPgPool();

  if (pgPool) {
    const existingRes = await pgPool.query("SELECT * FROM users WHERE id = $1", [userId]);
    if (existingRes.rows.length === 0) throw new Error("학생을 찾을 수 없습니다.");
    const prev = existingRes.rows[0];
    const curProg = Number(prev[col]) || 0;
    const dates = parseJsonField(prev.daily_study_dates_json, {});

    if (enforceDailyLimit) {
      if (dates[weekKey] === todayKst) {
        return {
          user: formatUserRow(prev),
          alreadyCreditedToday: true,
          progress: curProg
        };
      }
      const nextProg = Math.min(100, Math.floor(curProg / 20) * 20 + 20);
      dates[weekKey] = todayKst;
      await pgPool.query(
        `UPDATE users SET ${col} = $1, daily_study_dates_json = $2::jsonb WHERE id = $3`,
        [nextProg, JSON.stringify(dates), userId]
      );
      if (audioUrl && (weekNumber === 1 || weekNumber === 4)) {
        const audioCol = weekNumber === 1 ? "audio_w1_url" : "audio_w4_url";
        await pgPool.query(`UPDATE users SET ${audioCol} = $1 WHERE id = $2`, [audioUrl, userId]);
      }
      if (weekNumber === 4 && nextProg >= 100 && prev.current_book_id) {
        const list = parseJsonField(prev.completed_books_json, []);
        const set = new Set(Array.isArray(list) ? list : []);
        set.add(prev.current_book_id);
        await pgPool.query("UPDATE users SET completed_books_json = $1::jsonb WHERE id = $2", [
          JSON.stringify(Array.from(set)),
          userId
        ]);
      }
      const { rows } = await pgPool.query("SELECT * FROM users WHERE id = $1", [userId]);
      return {
        user: formatUserRow(rows[0]),
        alreadyCreditedToday: false,
        progress: nextProg
      };
    }

    const safeProg = Math.min(100, Math.max(0, Number(progressVal) || 100));
    await pgPool.query(`UPDATE users SET ${col} = $1 WHERE id = $2`, [safeProg, userId]);
    if (audioUrl && (weekNumber === 1 || weekNumber === 4)) {
      const audioCol = weekNumber === 1 ? "audio_w1_url" : "audio_w4_url";
      await pgPool.query(`UPDATE users SET ${audioCol} = $1 WHERE id = $2`, [audioUrl, userId]);
    }
    if (weekNumber === 4 && safeProg >= 100 && prev.current_book_id) {
      const list = parseJsonField(prev.completed_books_json, []);
      const set = new Set(Array.isArray(list) ? list : []);
      set.add(prev.current_book_id);
      await pgPool.query("UPDATE users SET completed_books_json = $1::jsonb WHERE id = $2", [
        JSON.stringify(Array.from(set)),
        userId
      ]);
    }
    const { rows } = await pgPool.query("SELECT * FROM users WHERE id = $1", [userId]);
    return {
      user: formatUserRow(rows[0]),
      alreadyCreditedToday: false,
      progress: safeProg
    };
  }

  const sqliteDb = getSqliteDb();
  const prev = sqliteDb.prepare("SELECT * FROM users WHERE id = ?").get(userId);
  if (!prev) throw new Error("학생을 찾을 수 없습니다.");
  const curProg = Number(prev[col]) || 0;
  const dates = parseJsonField(prev.daily_study_dates_json, {});

  if (enforceDailyLimit) {
    if (dates[weekKey] === todayKst) {
      return {
        user: formatUserRow(prev),
        alreadyCreditedToday: true,
        progress: curProg
      };
    }
    const nextProg = Math.min(100, Math.floor(curProg / 20) * 20 + 20);
    dates[weekKey] = todayKst;
    sqliteDb
      .prepare(`UPDATE users SET ${col} = ?, daily_study_dates_json = ? WHERE id = ?`)
      .run(nextProg, JSON.stringify(dates), userId);
    if (audioUrl && (weekNumber === 1 || weekNumber === 4)) {
      const audioCol = weekNumber === 1 ? "audio_w1_url" : "audio_w4_url";
      sqliteDb.prepare(`UPDATE users SET ${audioCol} = ? WHERE id = ?`).run(audioUrl, userId);
    }
    if (weekNumber === 4 && nextProg >= 100 && prev.current_book_id) {
      const list = parseJsonField(prev.completed_books_json, []);
      const set = new Set(Array.isArray(list) ? list : []);
      set.add(prev.current_book_id);
      sqliteDb.prepare("UPDATE users SET completed_books_json = ? WHERE id = ?").run(
        JSON.stringify(Array.from(set)),
        userId
      );
    }
    const updated = sqliteDb.prepare("SELECT * FROM users WHERE id = ?").get(userId);
    return {
      user: formatUserRow(updated),
      alreadyCreditedToday: false,
      progress: nextProg
    };
  }

  const safeProg = Math.min(100, Math.max(0, Number(progressVal) || 100));
  sqliteDb.prepare(`UPDATE users SET ${col} = ? WHERE id = ?`).run(safeProg, userId);
  if (audioUrl && (weekNumber === 1 || weekNumber === 4)) {
    const audioCol = weekNumber === 1 ? "audio_w1_url" : "audio_w4_url";
    sqliteDb.prepare(`UPDATE users SET ${audioCol} = ? WHERE id = ?`).run(audioUrl, userId);
  }
  if (weekNumber === 4 && safeProg >= 100 && prev.current_book_id) {
    const list = parseJsonField(prev.completed_books_json, []);
    const set = new Set(Array.isArray(list) ? list : []);
    set.add(prev.current_book_id);
    sqliteDb.prepare("UPDATE users SET completed_books_json = ? WHERE id = ?").run(
      JSON.stringify(Array.from(set)),
      userId
    );
  }
  const updated = sqliteDb.prepare("SELECT * FROM users WHERE id = ?").get(userId);
  return {
    user: formatUserRow(updated),
    alreadyCreditedToday: false,
    progress: safeProg
  };
}

/**
 * Records today's KST completion date for the 3rd mission (age-specific curriculum).
 */
async function markAgeTrackCompleteToday(userId) {
  const cleanUid = String(userId || "").trim();
  if (!cleanUid) throw new Error("학생 ID가 필요합니다.");
  const todayKst = getKstTodayDateString();
  const pgPool = getPgPool();

  if (pgPool) {
    const existingRes = await pgPool.query("SELECT * FROM users WHERE id = $1", [cleanUid]);
    if (existingRes.rows.length === 0) throw new Error("학생을 찾을 수 없습니다.");
    const dates = parseJsonField(existingRes.rows[0].daily_study_dates_json, {});
    dates.age_track = todayKst;
    await pgPool.query("UPDATE users SET daily_study_dates_json = $1::jsonb WHERE id = $2", [
      JSON.stringify(dates),
      cleanUid
    ]);
    const { rows } = await pgPool.query("SELECT * FROM users WHERE id = $1", [cleanUid]);
    return { user: formatUserRow(rows[0]), todayKst };
  }

  const sqliteDb = getSqliteDb();
  const prev = sqliteDb.prepare("SELECT * FROM users WHERE id = ?").get(cleanUid);
  if (!prev) throw new Error("학생을 찾을 수 없습니다.");
  const dates = parseJsonField(prev.daily_study_dates_json, {});
  dates.age_track = todayKst;
  sqliteDb
    .prepare("UPDATE users SET daily_study_dates_json = ? WHERE id = ?")
    .run(JSON.stringify(dates), cleanUid);
  const updated = sqliteDb.prepare("SELECT * FROM users WHERE id = ?").get(cleanUid);
  return { user: formatUserRow(updated), todayKst };
}

module.exports = {
  formatUserRow,
  verifyStudentPin,
  verifyTeacherLogin,
  createStudent,
  updateStudentAssignment,
  deleteStudent,
  createTeacher,
  updateTeacher,
  deleteTeacher,
  updateUserProgress,
  markAgeTrackCompleteToday
};

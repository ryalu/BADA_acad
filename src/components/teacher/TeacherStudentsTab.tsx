import React, { useEffect, useState } from "react";
import { GraduationCap, RotateCcw, Save, Trash2, UserPlus } from "lucide-react";
import type { Book, StudentUser, TeacherAccount } from "../../types";
import { ALL_BADA_LEVELS, getStudentCurrentWeek } from "../../utils/bookHelpers";
import { playSoftTone } from "../../utils/speech";

interface TeacherStudentsTabProps {
  users: StudentUser[];
  teachers: TeacherAccount[];
  books: Book[];
  loggedTeacher: TeacherAccount;
  selectedUserId: string;
  onSelectStudent: (userId: string) => void;
  onChangeTab: (tab: "home" | "coaching" | "worksheets" | "songs" | "database") => void;
  onDataUpdated: (payload: {
    users?: StudentUser[];
    teachers?: TeacherAccount[];
    books?: Book[];
    loggedTeacher?: TeacherAccount;
  }) => void;
}

function toggleCcMode(
  current: "both" | "phonics_only" | "book_only",
  target: "phonics" | "book",
  checked: boolean
): "both" | "phonics_only" | "book_only" {
  const hasPhonics = current === "both" || current === "phonics_only";
  const hasBook = current === "both" || current === "book_only";
  const nextPhonics = target === "phonics" ? checked : hasPhonics;
  const nextBook = target === "book" ? checked : hasBook;
  if (nextPhonics && nextBook) return "both";
  if (nextPhonics) return "phonics_only";
  if (nextBook) return "book_only";
  return target === "phonics" ? "book_only" : "phonics_only";
}

export const TeacherStudentsTab: React.FC<TeacherStudentsTabProps> = ({
  users,
  teachers,
  books,
  loggedTeacher,
  selectedUserId,
  onSelectStudent,
  onChangeTab,
  onDataUpdated
}) => {
  const [stuName, setStuName] = useState("");
  const [stuGrade, setStuGrade] = useState("초등 2학년");
  const [stuLevel, setStuLevel] = useState("Level 2");
  const [stuBookId, setStuBookId] = useState(books[0]?.id || "");
  const [stuCc, setStuCc] = useState(2);
  const [stuCcMode, setStuCcMode] = useState<"both" | "phonics_only" | "book_only">("both");
  const [stuTeacherId, setStuTeacherId] = useState(teachers[0]?.id || "tch_director");
  const [stuPin, setStuPin] = useState("1234");
  const [stuMsg, setStuMsg] = useState("");

  const [edits, setEdits] = useState<
    Record<
      string,
      {
        level: string;
        bookId: string;
        cc: number;
        ccMode: "both" | "phonics_only" | "book_only";
        teacherId: string;
        pin: string;
      }
    >
  >({});

  const [showNewStudentForm, setShowNewStudentForm] = useState(false);
  const [showTeacherSettings, setShowTeacherSettings] = useState(false);
  const [studentSearch, setStudentSearch] = useState("");
  const [studentLevelFilter, setStudentLevelFilter] = useState("ALL");

  const directorAccount = teachers.find((t) => t.id === "tch_director") || loggedTeacher;
  const [dirName, setDirName] = useState(directorAccount?.name || "원장님 (총괄)");
  const [dirTitle, setDirTitle] = useState(directorAccount?.title_label || "원장 · 최고관리자");
  const [dirEmail, setDirEmail] = useState(directorAccount?.email || "director@bada.kr");
  const [dirNewPw, setDirNewPw] = useState("");
  const [dirSaving, setDirSaving] = useState(false);

  const [inlineDirectorPw, setInlineDirectorPw] = useState("");
  const [tchName, setTchName] = useState("");
  const [tchTitle, setTchTitle] = useState("전담 코칭 강사");
  const [tchEmail, setTchEmail] = useState("");
  const [tchPw, setTchPw] = useState("1234");
  const [tchRole, setTchRole] = useState<"teacher" | "director">("teacher");
  const [tchMsg, setTchMsg] = useState("");

  useEffect(() => {
    if (!stuBookId && books[0]) setStuBookId(books[0].id);
  }, [books, stuBookId]);

  useEffect(() => {
    const map: Record<
      string,
      {
        level: string;
        bookId: string;
        cc: number;
        ccMode: "both" | "phonics_only" | "book_only";
        teacherId: string;
        pin: string;
      }
    > = {};
    users.forEach((u) => {
      map[u.id] = {
        level: u.level,
        bookId: u.current_book_id,
        cc: u.classcard_level || 2,
        ccMode: u.classcard_mode || "both",
        teacherId: u.teacher_id || teachers[0]?.id || "tch_director",
        pin: u.pin_code || "1234"
      };
    });
    setEdits(map);
  }, [users, teachers]);

  const handleRegisterStudent = async () => {
    if (!stuName.trim()) {
      setStuMsg("등록할 학생 이름을 입력해 주세요.");
      return;
    }
    const res = await fetch("/api/students/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: stuName.trim(),
        grade_label: stuGrade,
        level: stuLevel,
        current_book_id: stuBookId || books[0]?.id,
        classcard_level: stuCc,
        classcard_mode: stuCcMode,
        teacher_id: stuTeacherId,
        pin_code: stuPin
      })
    });
    const data = await res.json();
    if (res.ok && data.ok) {
      setStuName("");
      onDataUpdated({ users: data.users });
      onSelectStudent(data.student.id);
      setStuMsg(`신규 학생 '${data.student.name}' 등록이 완료되었습니다. (1주차부터 시작)`);
      playSoftTone(780, 0.16);
    }
  };

  const handleSaveStudentAssign = async (u: StudentUser) => {
    const ed = edits[u.id];
    if (!ed) return;
    const res = await fetch("/api/students/update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: u.id,
        level: ed.level,
        current_book_id: ed.bookId,
        classcard_level: ed.cc,
        classcard_mode: ed.ccMode,
        teacher_id: ed.teacherId,
        pin_code: ed.pin
      })
    });
    const data = await res.json();
    if (res.ok && data.ok) {
      onDataUpdated({ users: data.users });
      setStuMsg(
        data.bookChanged
          ? `'${u.name}' 학생의 원서가 변경되어 1주차부터 새로 시작합니다.`
          : `'${u.name}' 학생 정보가 저장되었습니다.`
      );
      playSoftTone(760, 0.14);
    }
  };

  const handleResetWeek1 = async (u: StudentUser) => {
    const res = await fetch("/api/students/update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: u.id, resetProgress: true })
    });
    const data = await res.json();
    if (res.ok && data.ok) {
      onDataUpdated({ users: data.users });
      setStuMsg(`'${u.name}' 학생의 진도가 1주차(0%)로 초기화되었습니다.`);
    }
  };

  const handleDeleteStudent = async (u: StudentUser) => {
    if (users.length <= 1) return;
    const res = await fetch("/api/students/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: u.id })
    });
    const data = await res.json();
    if (res.ok && data.ok) {
      onDataUpdated({ users: data.users });
      if (selectedUserId === u.id && data.users[0]) {
        onSelectStudent(data.users[0].id);
      }
    }
  };

  const handleUnlockDirector = async () => {
    const res = await fetch("/api/auth/teacher", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ teacherId: "tch_director", password: inlineDirectorPw.trim() })
    });
    const data = await res.json();
    if (res.ok && data.ok) {
      onDataUpdated({ loggedTeacher: data.teacher });
      setTchMsg("원장님 권한으로 전환되었습니다.");
    } else {
      setTchMsg(data.error || "비밀번호가 일치하지 않습니다.");
    }
  };

  const handleRegisterTeacher = async () => {
    if (!tchName.trim()) {
      setTchMsg("선생님 성함을 입력해 주세요.");
      return;
    }
    const res = await fetch("/api/teachers/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: tchName.trim(),
        title_label: tchTitle.trim() || "전담 코칭 강사",
        email: tchEmail.trim() || "teacher@bada.kr",
        password: tchPw.trim() || "1234",
        role: tchRole
      })
    });
    const data = await res.json();
    if (res.ok && data.ok) {
      setTchName("");
      setTchEmail("");
      onDataUpdated({ teachers: data.teachers });
      setTchMsg(`'${data.teacher.name}' 계정이 등록되었습니다.`);
    }
  };

  const handleUpdateDirectorProfile = async () => {
    if (!dirName.trim()) {
      setTchMsg("원장님 성함을 입력해 주세요.");
      return;
    }
    setDirSaving(true);
    setTchMsg("");
    try {
      const targetId = directorAccount?.id || "tch_director";
      const res = await fetch("/api/teachers/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teacherId: targetId,
          name: dirName.trim(),
          title_label: dirTitle.trim() || "원장 · 최고관리자",
          email: dirEmail.trim() || "director@bada.kr",
          password: dirNewPw.trim() || undefined
        })
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setDirNewPw("");
        onDataUpdated({
          teachers: data.teachers,
          loggedTeacher: loggedTeacher.id === targetId ? data.teacher : loggedTeacher
        });
        setTchMsg("원장 계정 정보가 저장되었습니다.");
        playSoftTone(760, 0.14);
      } else {
        setTchMsg(data.error || "계정 정보 수정에 실패했습니다.");
      }
    } finally {
      setDirSaving(false);
    }
  };

  const handleDeleteTeacher = async (tid: string) => {
    const res = await fetch("/api/teachers/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ teacherId: tid })
    });
    const data = await res.json();
    if (res.ok && data.ok) {
      onDataUpdated({ teachers: data.teachers });
    }
  };

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[#e5dcc9]">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">학생 관리 &amp; 원서 배정</h2>
          <p className="text-xs text-slate-600 mt-1">
            재원생 {users.length}명 · 등록 원서 {books.length}권 · 원서를 새로 배정하면 1주차부터 자동 시작됩니다.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setShowNewStudentForm((v) => !v);
              setShowTeacherSettings(false);
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full btn-slate-glass text-xs font-bold"
          >
            <UserPlus className="w-3.5 h-3.5" />
            {showNewStudentForm ? "등록 창 닫기" : "+ 신규 학생 등록"}
          </button>
          <button
            type="button"
            onClick={() => {
              setShowTeacherSettings((v) => !v);
              setShowNewStudentForm(false);
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#f2ece1] hover:bg-[#e8dfd1] text-slate-800 text-xs font-bold transition"
          >
            <GraduationCap className="w-3.5 h-3.5 text-sky-700" />
            {showTeacherSettings ? "계정 설정 닫기" : "원장 · 강사 계정 설정"}
          </button>
        </div>
      </div>

      {showNewStudentForm && (
        <div className="pb-6 border-b border-[#e5dcc9] space-y-4">
          <h3 className="text-sm font-bold text-slate-900">신규 학생 등록</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">학생 이름</label>
              <input
                type="text"
                value={stuName}
                onChange={(e) => setStuName(e.target.value)}
                placeholder="예: 최유나"
                className="w-full px-3 py-2 rounded-lg bg-[#fbf8f2]/80 border border-[#e5dcc9] focus:outline-none focus:border-sky-500 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">학년</label>
              <select
                value={stuGrade}
                onChange={(e) => setStuGrade(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-[#fbf8f2]/80 border border-[#e5dcc9] focus:outline-none focus:border-sky-500 text-sm"
              >
                {["초등 1학년", "초등 2학년", "초등 3학년", "초등 4학년", "초등 5학년", "초등 6학년"].map(
                  (g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  )
                )}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">배정 등급</label>
              <select
                value={stuLevel}
                onChange={(e) => setStuLevel(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-[#fbf8f2]/80 border border-[#e5dcc9] focus:outline-none focus:border-sky-500 text-sm"
              >
                {ALL_BADA_LEVELS.map((lv) => (
                  <option key={lv} value={lv}>
                    {lv}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">배정 원서</label>
              <select
                value={stuBookId}
                onChange={(e) => setStuBookId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-[#fbf8f2]/80 border border-[#e5dcc9] focus:outline-none focus:border-sky-500 text-sm"
              >
                {books.map((b) => (
                  <option key={b.id} value={b.id}>
                    [{b.level}] {b.title}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">클카 레벨</label>
              <select
                value={stuCc}
                onChange={(e) => setStuCc(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-lg bg-[#fbf8f2]/80 border border-[#e5dcc9] focus:outline-none focus:border-sky-500 text-sm"
              >
                {Array.from({ length: 26 }, (_, i) => i + 1).map((lv) => (
                  <option key={lv} value={lv}>
                    Level {lv}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">클카 단어 구성</label>
              <div className="flex items-center gap-4 px-3 py-2 rounded-lg bg-[#fbf8f2]/80 border border-[#e5dcc9] text-sm">
                <label className="inline-flex items-center gap-1.5 cursor-pointer select-none font-semibold text-slate-700">
                  <input
                    type="checkbox"
                    checked={stuCcMode === "both" || stuCcMode === "phonics_only"}
                    onChange={(e) =>
                      setStuCcMode(toggleCcMode(stuCcMode, "phonics", e.target.checked))
                    }
                    className="w-4 h-4 accent-slate-700 rounded focus:outline-none"
                  />
                  파닉스
                </label>
                <label className="inline-flex items-center gap-1.5 cursor-pointer select-none font-semibold text-slate-700">
                  <input
                    type="checkbox"
                    checked={stuCcMode === "both" || stuCcMode === "book_only"}
                    onChange={(e) =>
                      setStuCcMode(toggleCcMode(stuCcMode, "book", e.target.checked))
                    }
                    className="w-4 h-4 accent-slate-700 rounded focus:outline-none"
                  />
                  원서
                </label>
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">담당 선생님</label>
              <select
                value={stuTeacherId}
                onChange={(e) => setStuTeacherId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-[#fbf8f2]/80 border border-[#e5dcc9] focus:outline-none focus:border-sky-500 text-sm"
              >
                {teachers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">출석번호 (4자리)</label>
              <input
                type="text"
                maxLength={4}
                value={stuPin}
                onChange={(e) => setStuPin(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-[#fbf8f2]/80 border border-[#e5dcc9] focus:outline-none focus:border-slate-500 text-sm"
              />
            </div>
            <div className="flex items-end">
              <button
                type="button"
                onClick={handleRegisterStudent}
                className="w-full py-2 px-4 rounded-full btn-slate-glass text-sm font-bold"
              >
                등록 완료
              </button>
            </div>
          </div>
        </div>
      )}

      {showTeacherSettings && (
        <div className="pb-6 border-b border-[#e5dcc9] space-y-6">
          {loggedTeacher.role !== "director" ? (
            <div className="flex flex-wrap items-center justify-between gap-3 py-2">
              <p className="text-xs text-slate-600">
                원장 계정 수정 및 선생님 계정을 관리하려면 원장님 비밀번호로 권한을 전환하세요.
              </p>
              <div className="flex items-center gap-2">
                <input
                  type="password"
                  value={inlineDirectorPw}
                  onChange={(e) => setInlineDirectorPw(e.target.value)}
                  placeholder="원장님 비밀번호"
                  className="px-3 py-1.5 rounded-lg bg-[#fbf8f2]/80 border border-[#e5dcc9] focus:outline-none focus:border-slate-500 text-xs"
                />
                <button
                  type="button"
                  onClick={handleUnlockDirector}
                  className="px-3.5 py-1.5 rounded-full btn-slate-glass text-xs font-bold"
                >
                  권한 전환
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-slate-900">원장 계정 정보 수정</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                  <input
                    type="text"
                    value={dirName}
                    onChange={(e) => setDirName(e.target.value)}
                    placeholder="원장님 성함"
                    className="px-3 py-2 rounded-lg bg-[#fbf8f2]/80 border border-[#e5dcc9] focus:outline-none focus:border-slate-500 text-sm"
                  />
                  <input
                    type="text"
                    value={dirTitle}
                    onChange={(e) => setDirTitle(e.target.value)}
                    placeholder="직함"
                    className="px-3 py-2 rounded-lg bg-[#fbf8f2]/80 border border-[#e5dcc9] focus:outline-none focus:border-slate-500 text-sm"
                  />
                  <input
                    type="email"
                    value={dirEmail}
                    onChange={(e) => setDirEmail(e.target.value)}
                    placeholder="이메일"
                    className="px-3 py-2 rounded-lg bg-[#fbf8f2]/80 border border-[#e5dcc9] focus:outline-none focus:border-slate-500 text-sm"
                  />
                  <input
                    type="password"
                    value={dirNewPw}
                    onChange={(e) => setDirNewPw(e.target.value)}
                    placeholder="새 비밀번호 (변경 시 입력)"
                    className="px-3 py-2 rounded-lg bg-[#fbf8f2]/80 border border-[#e5dcc9] focus:outline-none focus:border-slate-500 text-sm"
                  />
                  <button
                    type="button"
                    onClick={handleUpdateDirectorProfile}
                    disabled={dirSaving}
                    className="py-2 px-4 rounded-full btn-slate-glass text-xs font-bold disabled:opacity-60"
                  >
                    {dirSaving ? "저장 중..." : "원장 정보 저장"}
                  </button>
                </div>
              </div>

              <div className="pt-4 border-t border-[#e5dcc9] space-y-3">
                <h3 className="text-sm font-bold text-slate-900">선생님 계정 추가</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                  <input
                    type="text"
                    value={tchName}
                    onChange={(e) => setTchName(e.target.value)}
                    placeholder="선생님 성함"
                    className="px-3 py-2 rounded-lg bg-[#fbf8f2]/80 border border-[#e5dcc9] focus:outline-none focus:border-slate-500 text-sm"
                  />
                  <input
                    type="text"
                    value={tchTitle}
                    onChange={(e) => setTchTitle(e.target.value)}
                    placeholder="직책"
                    className="px-3 py-2 rounded-lg bg-[#fbf8f2]/80 border border-[#e5dcc9] focus:outline-none focus:border-slate-500 text-sm"
                  />
                  <input
                    type="email"
                    value={tchEmail}
                    onChange={(e) => setTchEmail(e.target.value)}
                    placeholder="이메일"
                    className="px-3 py-2 rounded-lg bg-[#fbf8f2]/80 border border-[#e5dcc9] focus:outline-none focus:border-slate-500 text-sm"
                  />
                  <input
                    type="text"
                    value={tchPw}
                    onChange={(e) => setTchPw(e.target.value)}
                    placeholder="비밀번호"
                    className="px-3 py-2 rounded-lg bg-[#fbf8f2]/80 border border-[#e5dcc9] focus:outline-none focus:border-slate-500 text-sm"
                  />
                  <select
                    value={tchRole}
                    onChange={(e) => setTchRole(e.target.value as "teacher" | "director")}
                    className="px-3 py-2 rounded-lg bg-[#fbf8f2]/80 border border-[#e5dcc9] focus:outline-none focus:border-slate-500 text-sm"
                  >
                    <option value="teacher">일반 강사</option>
                    <option value="director">공동 원장님</option>
                  </select>
                  <button
                    type="button"
                    onClick={handleRegisterTeacher}
                    className="py-2 px-4 rounded-full btn-slate-glass text-xs font-bold"
                  >
                    선생님 등록
                  </button>
                </div>
                <div className="divide-y divide-[#e5dcc9] border-y border-[#e5dcc9]">
                  {teachers.map((t) => (
                    <div key={t.id} className="py-2.5 flex items-center justify-between text-xs">
                      <div>
                        <strong className="text-slate-900">{t.name}</strong>{" "}
                        <span className="text-slate-500">· {t.title_label} · {t.email}</span>
                      </div>
                      {t.id !== "tch_director" && (
                        <button
                          type="button"
                          onClick={() => handleDeleteTeacher(t.id)}
                          className="font-semibold text-rose-600 hover:underline"
                        >
                          삭제
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
          {tchMsg && <p className="text-xs font-semibold text-sky-700">{tchMsg}</p>}
        </div>
      )}

      {stuMsg && <p className="text-xs font-semibold text-sky-800 py-1">{stuMsg}</p>}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {["ALL", ...ALL_BADA_LEVELS].map((lv) => {
            const count =
              lv === "ALL" ? users.length : users.filter((u) => u.level === lv).length;
            if (lv !== "ALL" && count === 0) return null;
            return (
              <button
                key={lv}
                type="button"
                onClick={() => setStudentLevelFilter(lv)}
                className={`px-3 py-1 rounded-full text-xs font-bold transition ${
                  studentLevelFilter === lv
                    ? "btn-slate-glass"
                    : "bg-[#f2ece1] hover:bg-[#e8dfd1] text-slate-700"
                }`}
              >
                {lv === "ALL" ? `전체 (${count})` : `${lv} (${count})`}
              </button>
            );
          })}
        </div>
        <input
          type="text"
          value={studentSearch}
          onChange={(e) => setStudentSearch(e.target.value)}
          placeholder="학생 이름 검색..."
          className="px-3.5 py-1.5 rounded-full bg-[#fbf8f2]/80 border border-[#e5dcc9] text-xs w-48 focus:outline-none focus:border-slate-500"
        />
      </div>

      <div className="overflow-x-auto border-y border-[#e5dcc9]">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-[#e5dcc9] text-[11px] font-bold text-slate-500 uppercase">
              <th className="py-3 pr-3">학생</th>
              <th className="py-3 px-2">배정 등급</th>
              <th className="py-3 px-2">배정 원서</th>
              <th className="py-3 px-2">클카</th>
              <th className="py-3 px-2">클카 구성</th>
              <th className="py-3 px-2">담당 선생님</th>
              <th className="py-3 px-2">PIN</th>
              <th className="py-3 px-2">진도</th>
              <th className="py-3 pl-2 text-right">관리</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#e5dcc9]">
            {users
              .filter((u) => studentLevelFilter === "ALL" || u.level === studentLevelFilter)
              .filter((u) => !studentSearch.trim() || u.name.includes(studentSearch.trim()))
              .map((u) => {
                const ed = edits[u.id] || {
                  level: u.level,
                  bookId: u.current_book_id,
                  cc: u.classcard_level || 2,
                  ccMode: u.classcard_mode || "both",
                  teacherId: u.teacher_id || teachers[0]?.id || "tch_director",
                  pin: u.pin_code || "1234"
                };
                const activeWk = getStudentCurrentWeek(u);
                const wkProg = (u[`progress_w${activeWk}` as keyof StudentUser] as number) || 0;
                const repeats = Math.min(5, Math.floor(wkProg / 20));
                return (
                  <tr key={u.id} className="hover:bg-[#f4efe5]/55 transition">
                    <td className="py-3 pr-3 whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => {
                          onSelectStudent(u.id);
                          onChangeTab("coaching");
                        }}
                        className="text-left group"
                      >
                        <div className="text-sm font-bold text-slate-900 group-hover:text-sky-700 transition">
                          {u.name}
                        </div>
                        <div className="text-[11px] text-slate-500">{u.grade_label}</div>
                      </button>
                    </td>
                    <td className="py-3 px-2">
                      <select
                        value={ed.level}
                        onChange={(e) =>
                          setEdits({ ...edits, [u.id]: { ...ed, level: e.target.value } })
                        }
                        className="px-2 py-1.5 rounded-lg border border-[#e5dcc9] focus:outline-none focus:border-sky-500 bg-[#fbf8f2]/65 hover:bg-[#fbf8f2]/95 text-xs font-semibold"
                      >
                        {ALL_BADA_LEVELS.map((lv) => (
                          <option key={lv} value={lv}>
                            {lv}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-3 px-2">
                      <select
                        value={ed.bookId}
                        onChange={(e) =>
                          setEdits({ ...edits, [u.id]: { ...ed, bookId: e.target.value } })
                        }
                        className="px-2 py-1.5 rounded-lg border border-[#e5dcc9] focus:outline-none focus:border-sky-500 bg-[#fbf8f2]/65 hover:bg-[#fbf8f2]/95 text-xs font-semibold max-w-[180px]"
                      >
                        {books.map((b) => (
                          <option key={b.id} value={b.id}>
                            [{b.level}] {b.title}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-3 px-2">
                      <select
                        value={ed.cc}
                        onChange={(e) =>
                          setEdits({ ...edits, [u.id]: { ...ed, cc: Number(e.target.value) } })
                        }
                        className="px-2 py-1.5 rounded-lg border border-[#e5dcc9] focus:outline-none focus:border-sky-500 bg-[#fbf8f2]/65 hover:bg-[#fbf8f2]/95 text-xs font-semibold"
                      >
                        {Array.from({ length: 26 }, (_, i) => i + 1).map((lv) => (
                          <option key={lv} value={lv}>
                            Lv.{lv}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-3 px-2 whitespace-nowrap">
                      <div className="inline-flex items-center gap-2.5 px-2 py-1.5 rounded-lg border border-[#e5dcc9] bg-[#fbf8f2]/65 text-xs font-semibold text-slate-700">
                        <label className="inline-flex items-center gap-1 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={ed.ccMode === "both" || ed.ccMode === "phonics_only"}
                            onChange={(e) =>
                              setEdits({
                                ...edits,
                                [u.id]: {
                                  ...ed,
                                  ccMode: toggleCcMode(ed.ccMode, "phonics", e.target.checked)
                                }
                              })
                            }
                            className="w-3.5 h-3.5 accent-slate-700 rounded focus:outline-none"
                          />
                          파닉스
                        </label>
                        <label className="inline-flex items-center gap-1 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={ed.ccMode === "both" || ed.ccMode === "book_only"}
                            onChange={(e) =>
                              setEdits({
                                ...edits,
                                [u.id]: {
                                  ...ed,
                                  ccMode: toggleCcMode(ed.ccMode, "book", e.target.checked)
                                }
                              })
                            }
                            className="w-3.5 h-3.5 accent-slate-700 rounded focus:outline-none"
                          />
                          원서
                        </label>
                      </div>
                    </td>
                    <td className="py-3 px-2">
                      <select
                        value={ed.teacherId}
                        onChange={(e) =>
                          setEdits({ ...edits, [u.id]: { ...ed, teacherId: e.target.value } })
                        }
                        className="px-2 py-1.5 rounded-lg border border-[#e5dcc9] focus:outline-none focus:border-sky-500 bg-[#fbf8f2]/65 hover:bg-[#fbf8f2]/95 text-xs font-semibold max-w-[120px]"
                      >
                        {teachers.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-3 px-2">
                      <input
                        type="text"
                        maxLength={4}
                        value={ed.pin}
                        onChange={(e) =>
                          setEdits({ ...edits, [u.id]: { ...ed, pin: e.target.value } })
                        }
                        className="w-13 px-1.5 py-1.5 rounded-lg border border-[#e5dcc9] focus:outline-none focus:border-sky-500 bg-[#fbf8f2]/65 hover:bg-[#fbf8f2]/95 text-xs font-semibold text-center"
                      />
                    </td>
                    <td className="py-3 px-2 whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => {
                          onSelectStudent(u.id);
                          onChangeTab("coaching");
                        }}
                        className="text-xs font-bold text-sky-700 hover:underline"
                        title="학습 관리에서 진도 직접 수정"
                      >
                        {activeWk}주차 · {repeats}/5회
                      </button>
                    </td>
                    <td className="py-3 pl-2 text-right whitespace-nowrap space-x-1">
                      <button
                        type="button"
                        onClick={() => handleSaveStudentAssign(u)}
                        className="inline-flex items-center justify-center p-1.5 rounded-full btn-slate-glass"
                        title="저장"
                      >
                        <Save className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleResetWeek1(u)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-[#f2ece1] hover:bg-[#e8dfd1] text-slate-700 text-xs font-semibold"
                        title="1주차로 초기화"
                      >
                        <RotateCcw className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteStudent(u)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full hover:bg-rose-50 text-rose-600 text-xs font-semibold"
                        title="학생 삭제"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

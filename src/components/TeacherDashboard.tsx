import React, { useEffect, useRef, useState } from "react";
import {
  BookPlus,
  Download,
  GraduationCap,
  LogOut,
  MessageCircle,
  Plus,
  RefreshCw,
  RotateCcw,
  Save,
  Trash2,
  UserPlus,
  Users,
  Video,
  Volume2
} from "lucide-react";
import type { Book, StudentRecording, StudentUser, TeacherAccount, TeacherQuestion } from "../types";
import { ALL_BADA_LEVELS, getBookSentences, getStudentCurrentWeek } from "../utils/bookHelpers";
import { playSoftTone, speakEnglish } from "../utils/speech";
import { BookCover } from "./BookCover";

export type TeacherTab = "home" | "coaching" | "reports" | "database";

interface TeacherDashboardProps {
  activeTab: TeacherTab;
  onChangeTab: (tab: TeacherTab) => void;
  users: StudentUser[];
  teachers: TeacherAccount[];
  books: Book[];
  loggedTeacher: TeacherAccount;
  selectedUserId: string;
  onSelectStudent: (userId: string) => void;
  onDataUpdated: (payload: {
    users?: StudentUser[];
    teachers?: TeacherAccount[];
    books?: Book[];
    loggedTeacher?: TeacherAccount;
  }) => void;
  onPreviewStudentApp: () => void;
  onLogout: () => void;
}

export const TeacherDashboard: React.FC<TeacherDashboardProps> = ({
  activeTab,
  onChangeTab,
  users,
  teachers,
  books,
  loggedTeacher,
  selectedUserId,
  onSelectStudent,
  onDataUpdated,
  onPreviewStudentApp,
  onLogout
}) => {
  const currentUser = users.find((u) => u.id === selectedUserId) || users[0];
  const currentBook = books.find((b) => b.id === currentUser?.current_book_id) || books[0];

  // Student registration form state
  const [stuName, setStuName] = useState("");
  const [stuGrade, setStuGrade] = useState("초등 2학년");
  const [stuLevel, setStuLevel] = useState("Level 2");
  const [stuBookId, setStuBookId] = useState(books[0]?.id || "");
  const [stuCc, setStuCc] = useState(2);
  const [stuTeacherId, setStuTeacherId] = useState(teachers[1]?.id || teachers[0]?.id || "tch_emma");
  const [stuPin, setStuPin] = useState("1234");
  const [stuMsg, setStuMsg] = useState("");

  // Inline edits per student
  const [edits, setEdits] = useState<
    Record<string, { level: string; bookId: string; cc: number; pin: string }>
  >({});

  // Director teacher management
  const [inlineDirectorPw, setInlineDirectorPw] = useState("");
  const [tchName, setTchName] = useState("");
  const [tchTitle, setTchTitle] = useState("전담 코칭 강사");
  const [tchEmail, setTchEmail] = useState("");
  const [tchPw, setTchPw] = useState("1234");
  const [tchRole, setTchRole] = useState<"teacher" | "director">("teacher");
  const [tchMsg, setTchMsg] = useState("");

  // Coaching recommended questions & student recordings
  const [coachQuestions, setCoachQuestions] = useState<TeacherQuestion[]>([]);
  const [studentRecordings, setStudentRecordings] = useState<StudentRecording[]>([]);

  // Book registration
  const [bookTitle, setBookTitle] = useState("");
  const [bookSubKr, setBookSubKr] = useState("");
  const [bookLevel, setBookLevel] = useState("Level 2");
  const [bookGrade, setBookGrade] = useState("초등 1~3학년");
  const [bookEnText, setBookEnText] = useState("");
  const [bookKrText, setBookKrText] = useState("");
  const [bookResultMsg, setBookResultMsg] = useState("");
  const [bookSaving, setBookSaving] = useState(false);

  // Report canvas & toast
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [alimtalkMsg, setAlimtalkMsg] = useState("");

  useEffect(() => {
    if (!stuBookId && books[0]) setStuBookId(books[0].id);
  }, [books, stuBookId]);

  useEffect(() => {
    const map: Record<string, { level: string; bookId: string; cc: number; pin: string }> = {};
    users.forEach((u) => {
      map[u.id] = {
        level: u.level,
        bookId: u.current_book_id,
        cc: u.classcard_level || 2,
        pin: u.pin_code || "1234"
      };
    });
    setEdits(map);
  }, [users]);

  useEffect(() => {
    if (!selectedUserId) return;
    fetch(`/api/recordings?userId=${encodeURIComponent(selectedUserId)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.recordings) setStudentRecordings(data.recordings);
      })
      .catch(() => {});
  }, [selectedUserId, activeTab]);

  const loadCoachingQuestions = async () => {
    if (!currentUser || !currentBook) return;
    try {
      const res = await fetch("/api/teacher/questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentName: currentUser.name,
          bookTitle: currentBook.title,
          weakPoints: currentUser.weaknesses,
          strongPoints: currentUser.strengths,
          coreExpressions: currentBook.core_expressions || []
        })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.questions) setCoachQuestions(data.questions);
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    if (activeTab === "coaching") {
      loadCoachingQuestions();
    }
  }, [activeTab, currentUser?.id, currentBook?.id]);

  // Draw certificate when reports tab is active
  useEffect(() => {
    if (activeTab !== "reports" || !canvasRef.current || !currentUser || !currentBook) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, w, h);

    ctx.strokeStyle = "#0284c7";
    ctx.lineWidth = 8;
    ctx.strokeRect(18, 18, w - 36, h - 36);

    ctx.strokeStyle = "#cbd5e1";
    ctx.lineWidth = 2;
    ctx.strokeRect(30, 30, w - 60, h - 60);

    ctx.fillStyle = "#0369a1";
    ctx.font = "bold 18px 'Noto Sans KR', sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("BADA ENGLISH ACADEMY", w / 2, 78);

    ctx.fillStyle = "#0f172a";
    ctx.font = "bold 34px 'Noto Sans KR', sans-serif";
    ctx.fillText("영어 원서 완독 수료증", w / 2, 130);

    ctx.fillStyle = "#475569";
    ctx.font = "16px 'Noto Sans KR', sans-serif";
    ctx.fillText("위 학생은 4주 원서 리딩 및 스피킹 과정을 성실히 수료하였습니다.", w / 2, 175);

    ctx.fillStyle = "#0284c7";
    ctx.font = "bold 36px 'Noto Sans KR', sans-serif";
    ctx.fillText(currentUser.name, w / 2, 240);

    ctx.fillStyle = "#334155";
    ctx.font = "16px 'Noto Sans KR', sans-serif";
    ctx.fillText(`${currentUser.grade_label} · ${currentUser.level}`, w / 2, 275);
    ctx.fillText(`수료 원서: ${currentBook.title}`, w / 2, 315);
    ctx.fillText(
      `유창성 성장: ${currentUser.w1_wpm} WPM → ${currentUser.w4_wpm} WPM`,
      w / 2,
      350
    );

    const todayStr = new Date().toLocaleDateString("ko-KR");
    ctx.fillStyle = "#64748b";
    ctx.font = "14px 'Noto Sans KR', sans-serif";
    ctx.fillText(`발급일: ${todayStr} · BADA 영어 원장`, w / 2, 445);
  }, [activeTab, currentUser, currentBook]);

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

  const handleCreateBook = async () => {
    if (!bookEnText.trim()) {
      setBookResultMsg("등록할 영어 원서 본문을 입력해 주세요.");
      return;
    }
    setBookSaving(true);
    setBookResultMsg("");
    try {
      const res = await fetch("/api/books/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: bookTitle.trim() || `New Storybook #${books.length + 1}`,
          subtitle_kr: bookSubKr.trim() || "신규 등록 영어 원서",
          level: bookLevel,
          grade_recommended: bookGrade.trim() || "초등 전학년",
          full_text: bookEnText.trim(),
          korean_text: bookKrText.trim()
        })
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        onDataUpdated({ books: data.books });
        setBookTitle("");
        setBookSubKr("");
        setBookEnText("");
        setBookKrText("");
        setBookResultMsg(
          `신규 원서 《${data.book.title}》 (${data.book.level}) 등록 완료 · 단어 ${
            (data.book.vocab || []).length
          }개, 문장 해석 ${(data.book.sentence_translations || []).length}개, 스피킹 질문 ${
            (data.book.speaking_questions || []).length
          }개가 저장되었습니다.`
        );
        playSoftTone(820, 0.18);
      } else {
        setBookResultMsg(data.error || "원서 등록에 실패했습니다.");
      }
    } finally {
      setBookSaving(false);
    }
  };

  const navItems: { id: TeacherTab; label: string; icon: React.ReactNode }[] = [
    { id: "home", label: "학생 관리 & 원서 배정", icon: <Users className="w-4 h-4" /> },
    { id: "coaching", label: "4주차 화상수업 코칭", icon: <Video className="w-4 h-4" /> },
    { id: "reports", label: "학부모 리포트 & 수료증", icon: <MessageCircle className="w-4 h-4" /> },
    { id: "database", label: "원서 교재 등록 · 관리", icon: <BookPlus className="w-4 h-4" /> }
  ];

  return (
    <div className="min-h-screen bg-transparent flex flex-col md:flex-row">
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-slate-900 text-slate-100 flex flex-col justify-between p-5 shrink-0">
        <div className="space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-slate-800">
            <img
              src="/assets/popo-3d.jpg"
              alt="BADA"
              className="w-10 h-10 rounded-xl object-cover"
            />
            <div>
              <div className="text-sm font-bold text-white">BADA 영어 관리센터</div>
              <div className="text-xs text-slate-400">강사 · 원장님 전용</div>
            </div>
          </div>

          <nav className="space-y-1.5">
            {navItems.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => onChangeTab(item.id)}
                className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition text-left ${
                  activeTab === item.id
                    ? "bg-sky-600 text-white"
                    : "text-slate-300 hover:bg-slate-800 hover:text-white"
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            ))}
          </nav>

          <div className="pt-2 space-y-1.5">
            <label className="block text-[11px] font-bold text-slate-400">현재 선택된 코칭 학생</label>
            <select
              value={currentUser?.id || ""}
              onChange={(e) => onSelectStudent(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs font-semibold text-white"
            >
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.grade_label} · {u.level})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="pt-6 mt-6 border-t border-slate-800 space-y-2.5">
          <div className="bg-slate-800/80 rounded-xl px-3.5 py-2.5">
            <div className="text-xs font-bold text-white">{loggedTeacher.name}</div>
            <div className="text-[11px] text-slate-400">{loggedTeacher.title_label}</div>
          </div>
          <button
            type="button"
            onClick={onPreviewStudentApp}
            className="w-full py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 transition"
          >
            학생 화면 미리보기
          </button>
          <button
            type="button"
            onClick={onLogout}
            className="w-full py-2 px-3 rounded-xl bg-slate-800/60 hover:bg-slate-700 text-xs font-semibold text-slate-400 inline-flex items-center justify-center gap-1.5"
          >
            <LogOut className="w-3.5 h-3.5" />
            로그아웃
          </button>
        </div>
      </aside>

      {/* Main Workspace */}
      <main className="flex-1 p-5 md:p-8 space-y-6 overflow-y-auto">
        {activeTab === "home" && (
          <div className="space-y-6 max-w-6xl">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">
                  학생 등록 · 등급/원서 배정 &amp; 선생님 관리
                </h2>
                <p className="text-sm text-slate-500 mt-1">
                  새로운 원서를 배정하면 자동으로 1주차(0%)부터 새로 시작합니다.
                </p>
              </div>
              <button
                type="button"
                onClick={() => onChangeTab("database")}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-sm font-bold"
              >
                <Plus className="w-4 h-4" />
                신규 원서 교재 등록
              </button>
            </div>

            {/* KPI Row */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white border border-slate-200 rounded-xl p-4">
                <div className="text-xs text-slate-500">등록된 학생</div>
                <div className="text-2xl font-bold text-slate-900 mt-1">{users.length}명</div>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl p-4">
                <div className="text-xs text-slate-500">등록된 원서 교재</div>
                <div className="text-2xl font-bold text-slate-900 mt-1">{books.length}권</div>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl p-4">
                <div className="text-xs text-slate-500">강사 · 원장님 계정</div>
                <div className="text-2xl font-bold text-slate-900 mt-1">{teachers.length}명</div>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl p-4">
                <div className="text-xs text-slate-500">새 원서 배정 규칙</div>
                <div className="text-lg font-bold text-sky-700 mt-1.5">1주차 자동 시작</div>
              </div>
            </div>

            {/* Section 1: New Student Registration */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-sky-600" />
                신규 학생 등록 및 초기 원서 배정
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">학생 이름</label>
                  <input
                    type="text"
                    value={stuName}
                    onChange={(e) => setStuName(e.target.value)}
                    placeholder="예: 최유나"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">학년</label>
                  <select
                    value={stuGrade}
                    onChange={(e) => setStuGrade(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
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
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
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
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
                  >
                    {books.map((b) => (
                      <option key={b.id} value={b.id}>
                        [{b.level}] {b.title}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">클카 레벨 (1~26)</label>
                  <input
                    type="number"
                    min={1}
                    max={26}
                    value={stuCc}
                    onChange={(e) => setStuCc(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">담당 선생님</label>
                  <select
                    value={stuTeacherId}
                    onChange={(e) => setStuTeacherId(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
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
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
                  />
                </div>
                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={handleRegisterStudent}
                    className="w-full py-2 px-4 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-sm font-bold"
                  >
                    신규 학생 등록
                  </button>
                </div>
              </div>
              {stuMsg && (
                <p className="text-xs font-semibold text-sky-800 bg-sky-50 border border-sky-200 rounded-lg px-3.5 py-2">
                  {stuMsg}
                </p>
              )}
            </div>

            {/* Section 2: Roster & Inline Assignment */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
              <h3 className="text-base font-bold text-slate-900">
                학생별 등급 · 원서 배정 및 진도 관리
              </h3>
              <div className="space-y-3">
                {users.map((u) => {
                  const ed = edits[u.id] || {
                    level: u.level,
                    bookId: u.current_book_id,
                    cc: u.classcard_level || 2,
                    pin: u.pin_code || "1234"
                  };
                  const activeWk = getStudentCurrentWeek(u);
                  return (
                    <div
                      key={u.id}
                      className="border border-slate-200 rounded-xl p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-slate-50/50"
                    >
                      <div className="space-y-2 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <strong className="text-sm text-slate-900">
                            {u.name} ({u.grade_label} · {u.level})
                          </strong>
                          <span className="text-xs px-2 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-200 font-semibold">
                            현재 {activeWk}주차 진행 중 (W1:{u.progress_w1}% W2:{u.progress_w2}% W3:{u.progress_w3}% W4:{u.progress_w4}%)
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <select
                            value={ed.level}
                            onChange={(e) =>
                              setEdits({ ...edits, [u.id]: { ...ed, level: e.target.value } })
                            }
                            className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-semibold"
                          >
                            {ALL_BADA_LEVELS.map((lv) => (
                              <option key={lv} value={lv}>
                                {lv}
                              </option>
                            ))}
                          </select>
                          <select
                            value={ed.bookId}
                            onChange={(e) =>
                              setEdits({ ...edits, [u.id]: { ...ed, bookId: e.target.value } })
                            }
                            className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-semibold max-w-xs"
                          >
                            {books.map((b) => (
                              <option key={b.id} value={b.id}>
                                [{b.level}] {b.title}
                              </option>
                            ))}
                          </select>
                          <input
                            type="number"
                            min={1}
                            max={26}
                            value={ed.cc}
                            onChange={(e) =>
                              setEdits({ ...edits, [u.id]: { ...ed, cc: Number(e.target.value) } })
                            }
                            className="w-16 px-2 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-center"
                            title="클카 레벨"
                          />
                          <input
                            type="text"
                            maxLength={4}
                            value={ed.pin}
                            onChange={(e) =>
                              setEdits({ ...edits, [u.id]: { ...ed, pin: e.target.value } })
                            }
                            className="w-16 px-2 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-center"
                            title="출석 PIN"
                          />
                          <button
                            type="button"
                            onClick={() => handleSaveStudentAssign(u)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold"
                          >
                            <Save className="w-3.5 h-3.5" />
                            배정 저장
                          </button>
                          <button
                            type="button"
                            onClick={() => handleResetWeek1(u)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-semibold"
                          >
                            <RotateCcw className="w-3 h-3" />
                            1주차 초기화
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteStudent(u)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white border border-rose-200 hover:bg-rose-50 text-rose-600 text-xs font-semibold"
                          >
                            <Trash2 className="w-3 h-3" />
                            삭제
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Section 3: Director Teacher Management */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <GraduationCap className="w-4 h-4 text-sky-600" />
                  원장님 전용 · 선생님 계정 관리
                </h3>
                <span className="text-xs font-semibold text-slate-500">
                  {loggedTeacher.role === "director" ? "원장님 권한 활성" : "일반 강사 접속 중"}
                </span>
              </div>

              {loggedTeacher.role !== "director" ? (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
                  <p className="text-xs text-slate-600">
                    선생님 계정을 등록하거나 삭제하려면 원장님 비밀번호로 권한을 전환하세요.
                  </p>
                  <div className="flex items-center gap-2">
                    <input
                      type="password"
                      value={inlineDirectorPw}
                      onChange={(e) => setInlineDirectorPw(e.target.value)}
                      placeholder="원장님 비밀번호"
                      className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs"
                    />
                    <button
                      type="button"
                      onClick={handleUnlockDirector}
                      className="px-3.5 py-1.5 rounded-lg bg-sky-600 text-white text-xs font-bold"
                    >
                      권한 전환
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                    <input
                      type="text"
                      value={tchName}
                      onChange={(e) => setTchName(e.target.value)}
                      placeholder="선생님 성함"
                      className="px-3 py-2 rounded-lg border border-slate-300 text-sm"
                    />
                    <input
                      type="text"
                      value={tchTitle}
                      onChange={(e) => setTchTitle(e.target.value)}
                      placeholder="직책"
                      className="px-3 py-2 rounded-lg border border-slate-300 text-sm"
                    />
                    <input
                      type="email"
                      value={tchEmail}
                      onChange={(e) => setTchEmail(e.target.value)}
                      placeholder="이메일"
                      className="px-3 py-2 rounded-lg border border-slate-300 text-sm"
                    />
                    <input
                      type="text"
                      value={tchPw}
                      onChange={(e) => setTchPw(e.target.value)}
                      placeholder="비밀번호"
                      className="px-3 py-2 rounded-lg border border-slate-300 text-sm"
                    />
                    <select
                      value={tchRole}
                      onChange={(e) => setTchRole(e.target.value as "teacher" | "director")}
                      className="px-3 py-2 rounded-lg border border-slate-300 text-sm"
                    >
                      <option value="teacher">일반 강사</option>
                      <option value="director">공동 원장님</option>
                    </select>
                    <button
                      type="button"
                      onClick={handleRegisterTeacher}
                      className="py-2 px-4 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-sm font-bold"
                    >
                      선생님 등록
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {teachers.map((t) => (
                      <div
                        key={t.id}
                        className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between"
                      >
                        <div>
                          <div className="text-sm font-bold text-slate-900">{t.name}</div>
                          <div className="text-xs text-slate-500">
                            {t.title_label} · {t.email}
                          </div>
                        </div>
                        {t.id !== "tch_director" && (
                          <button
                            type="button"
                            onClick={() => handleDeleteTeacher(t.id)}
                            className="text-xs font-semibold text-rose-600 hover:underline"
                          >
                            삭제
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {tchMsg && <p className="text-xs font-semibold text-sky-700">{tchMsg}</p>}
            </div>
          </div>
        )}

        {activeTab === "coaching" && currentUser && currentBook && (
          <div className="space-y-6 max-w-5xl">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">4주차 원어민 화상 수업 코칭</h2>
                <p className="text-sm text-slate-500 mt-1">
                  {currentUser.name} ({currentUser.level}) · {currentBook.title}
                </p>
              </div>
              <button
                type="button"
                onClick={() => onChangeTab("reports")}
                className="px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-sm font-bold"
              >
                수업 완료 및 학부모 리포트
              </button>
            </div>

            {/* Student Weekly Voice Recordings & AI Pronunciation Feedback */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-900">학생 주차별 발음 녹음 &amp; AI 분석함</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    학생이 따라 말하기를 완료하고 전송한 실제 녹음 파일과 AI 발음·억양 피드백입니다.
                  </p>
                </div>
                <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-sky-50 text-sky-700 border border-sky-200">
                  녹음 {studentRecordings.length}건
                </span>
              </div>

              {studentRecordings.length === 0 ? (
                <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 text-xs text-slate-500">
                  아직 {currentUser.name} 학생이 제출한 발음 녹음 파일이 없습니다. 학생이 원서 읽기 완료 후 &lsquo;진주 받기&rsquo;를 누르면 여기에 자동으로 올라옵니다.
                </div>
              ) : (
                <div className="space-y-3 max-h-[340px] overflow-y-auto pr-1">
                  {studentRecordings.map((rec) => {
                    const recBook = books.find((b) => b.id === rec.book_id);
                    return (
                      <div key={rec.id} className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-sky-600 text-white">
                              {rec.week_num}주차 · {rec.repeat_num}회차
                            </span>
                            <span className="text-xs font-semibold text-slate-700">
                              {recBook?.title || rec.book_id}
                            </span>
                            {typeof rec.ai_feedback?.score === "number" && (
                              <span className="text-xs font-bold text-emerald-700">
                                AI 점수 {rec.ai_feedback.score}점
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-slate-400">
                            {new Date(rec.created_at).toLocaleString("ko-KR")}
                          </span>
                        </div>

                        {rec.audio_data_url && (
                          <audio controls src={rec.audio_data_url} className="w-full h-9" />
                        )}

                        {rec.transcript && (
                          <p className="text-xs text-slate-600 bg-white border border-slate-200 rounded-lg px-3 py-2">
                            <span className="font-bold text-slate-700">인식된 발화:</span> {rec.transcript}
                          </p>
                        )}

                        {rec.ai_feedback?.pronunciation_tip_kr && (
                          <div className="text-xs text-slate-700 space-y-1">
                            <div>
                              <span className="font-bold text-sky-700">발음 교정:</span>{" "}
                              {rec.ai_feedback.pronunciation_tip_kr}
                            </div>
                            {rec.ai_feedback.intonation_tip_kr && (
                              <div>
                                <span className="font-bold text-amber-700">억양 팁:</span>{" "}
                                {rec.ai_feedback.intonation_tip_kr}
                              </div>
                            )}
                            {rec.ai_feedback.weak_words && rec.ai_feedback.weak_words.length > 0 && (
                              <div className="flex flex-wrap items-center gap-1 pt-1">
                                <span className="font-bold text-rose-700">집중 단어:</span>
                                {rec.ai_feedback.weak_words.map((w) => (
                                  <span
                                    key={w}
                                    className="px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 font-semibold"
                                  >
                                    {w}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
                <h3 className="text-base font-bold text-slate-900">학생 발화 강점 &amp; 취약점 분석</h3>
                <div className="space-y-3">
                  <div>
                    <div className="text-xs font-bold text-emerald-700 mb-1.5">강점 표현</div>
                    <div className="flex flex-wrap gap-1.5">
                      {(currentUser.strengths || []).map((s) => (
                        <span
                          key={s.tag}
                          className="text-xs px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold"
                        >
                          {s.tag} ({s.count})
                        </span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs font-bold text-amber-700 mb-1.5">집중 교정 포인트</div>
                    <div className="flex flex-wrap gap-1.5">
                      {(currentUser.weaknesses || []).map((w) => (
                        <span
                          key={w.tag}
                          className="text-xs px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200 font-semibold"
                        >
                          {w.tag} ({w.count})
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-slate-900">4주차 화상 수업 추천 질문 3선</h3>
                  <button
                    type="button"
                    onClick={loadCoachingQuestions}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    새로고침
                  </button>
                </div>
                <div className="space-y-3">
                  {coachQuestions.map((q, idx) => (
                    <div key={q.id || idx} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                      <div className="text-[11px] font-bold text-sky-700">
                        질문 0{idx + 1} · {q.category}
                      </div>
                      <div className="storybook-font text-sm font-bold text-slate-900">"{q.question_en}"</div>
                      <div className="text-xs text-slate-600">{q.coaching_tip_kr}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "reports" && currentUser && currentBook && (
          <div className="space-y-6 max-w-5xl">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">학부모 성장 리포트 &amp; 수료증</h2>
              <p className="text-sm text-slate-500 mt-1">
                {currentUser.name} 학생의 1주차 vs 4주차 읽기 성장 비교 및 수료증을 발송합니다.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
                <h3 className="text-base font-bold text-slate-900">1주차 vs 4주차 읽기 비교</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                    <div className="text-xs font-bold text-slate-500">1주차 (처음 읽기)</div>
                    <div className="text-lg font-bold text-slate-900">
                      {currentUser.w1_wpm} WPM · {currentUser.w1_accuracy}%
                    </div>
                    <button
                      type="button"
                      onClick={() => speakEnglish("Look. at. the. star-fish.", 0.65, 1.0)}
                      className="w-full py-2 px-3 rounded-lg bg-white border border-slate-300 text-xs font-bold text-slate-700 inline-flex items-center justify-center gap-1"
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                      1주차 샘플 듣기
                    </button>
                  </div>
                  <div className="p-4 rounded-xl bg-sky-50 border border-sky-200 space-y-2">
                    <div className="text-xs font-bold text-sky-700">4주차 (완성 읽기)</div>
                    <div className="text-lg font-bold text-slate-900">
                      {currentUser.w4_wpm} WPM · {currentUser.w4_accuracy}%
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        speakEnglish("Look at the starfish shining on the sandy floor!", 0.94, 1.06)
                      }
                      className="w-full py-2 px-3 rounded-lg bg-sky-600 text-white text-xs font-bold inline-flex items-center justify-center gap-1"
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                      4주차 샘플 듣기
                    </button>
                  </div>
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-base font-bold text-slate-900">BADA 탐험 수료증</h3>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        if (!canvasRef.current) return;
                        const link = document.createElement("a");
                        link.download = `BADA_수료증_${currentUser.name}.png`;
                        link.href = canvasRef.current.toDataURL("image/png");
                        link.click();
                      }}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700"
                    >
                      <Download className="w-3.5 h-3.5" />
                      이미지 저장
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setAlimtalkMsg(`${currentUser.name} 학부모님께 성장 리포트와 수료증이 발송되었습니다.`)
                      }
                      className="px-3 py-1.5 rounded-lg bg-sky-600 text-white text-xs font-bold"
                    >
                      알림톡 발송
                    </button>
                  </div>
                </div>
                <canvas
                  ref={canvasRef}
                  width={760}
                  height={500}
                  className="w-full h-auto rounded-xl border border-slate-200"
                />
                {alimtalkMsg && (
                  <p className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
                    {alimtalkMsg}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === "database" && (
          <div className="space-y-6 max-w-5xl">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">원서 교재 등록 및 관리</h2>
              <p className="text-sm text-slate-500 mt-1">
                수업에 사용할 영어 원서 본문과 문장별 한국어 해석을 등록합니다. 등록 즉시 학생 배정 목록에 반영됩니다.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">
              <div className="lg:col-span-3 bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
                <h3 className="text-base font-bold text-slate-900">신규 원서 교재 등록</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">원서 영어 제목</label>
                    <input
                      type="text"
                      value={bookTitle}
                      onChange={(e) => setBookTitle(e.target.value)}
                      placeholder="예: Popo and the Shining Starfish"
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">한국어 부제</label>
                    <input
                      type="text"
                      value={bookSubKr}
                      onChange={(e) => setBookSubKr(e.target.value)}
                      placeholder="예: 포포와 빛나는 불가사리"
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">권장 레벨</label>
                    <select
                      value={bookLevel}
                      onChange={(e) => setBookLevel(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
                    >
                      {ALL_BADA_LEVELS.map((lv) => (
                        <option key={lv} value={lv}>
                          {lv}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">권장 학년</label>
                    <input
                      type="text"
                      value={bookGrade}
                      onChange={(e) => setBookGrade(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">영어 원서 본문</label>
                  <textarea
                    rows={5}
                    value={bookEnText}
                    onChange={(e) => setBookEnText(e.target.value)}
                    placeholder="등록할 영어 원서 전체 문장을 입력하세요..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">
                    문장별 한국어 해석 (선택 입력 — 비워두면 자동 생성되며, 외부 LLM API 연동 시 정밀 번역됩니다)
                  </label>
                  <textarea
                    rows={4}
                    value={bookKrText}
                    onChange={(e) => setBookKrText(e.target.value)}
                    placeholder="문장별 한국어 해석을 줄바꿈으로 입력하세요 (선택)"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleCreateBook}
                  disabled={bookSaving}
                  className="px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-sm font-bold disabled:opacity-60"
                >
                  {bookSaving ? "분석 및 등록 중..." : "신규 원서 등록하기"}
                </button>

                {bookResultMsg && (
                  <p className="text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
                    {bookResultMsg}
                  </p>
                )}
              </div>

              {/* Registered Books Catalog */}
              <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-6 space-y-3">
                <h3 className="text-base font-bold text-slate-900">등록된 원서 교재 목록</h3>
                <div className="space-y-2.5 max-h-[540px] overflow-y-auto pr-1">
                  {books.map((b) => {
                    const sCount = getBookSentences(b).length;
                    return (
                      <div key={b.id} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center gap-3.5">
                        <BookCover book={b} size="sm" />
                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="flex items-center justify-between gap-2">
                            <strong className="text-sm text-slate-900 truncate">{b.title}</strong>
                            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-white border border-slate-200 text-sky-700 shrink-0">
                              {b.level}
                            </span>
                          </div>
                          <div className="text-xs text-slate-500 truncate">{b.subtitle_kr}</div>
                          <div className="text-[11px] text-slate-400">
                            문장 {sCount}개 · 단어 {(b.vocab || []).length}개 · 질문{" "}
                            {(b.speaking_questions || []).length}개
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};


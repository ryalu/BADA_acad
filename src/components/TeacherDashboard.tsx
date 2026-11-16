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

  // Home Roster & Modals/Panels
  const [showNewStudentForm, setShowNewStudentForm] = useState(false);
  const [showTeacherSettings, setShowTeacherSettings] = useState(false);
  const [studentSearch, setStudentSearch] = useState("");
  const [studentLevelFilter, setStudentLevelFilter] = useState("ALL");

  // Director profile edit
  const directorAccount = teachers.find((t) => t.id === "tch_director") || loggedTeacher;
  const [dirName, setDirName] = useState(directorAccount?.name || "원장님 (총괄)");
  const [dirTitle, setDirTitle] = useState(directorAccount?.title_label || "원장 · 최고관리자");
  const [dirEmail, setDirEmail] = useState(directorAccount?.email || "director@bada.kr");
  const [dirNewPw, setDirNewPw] = useState("");
  const [dirSaving, setDirSaving] = useState(false);

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

  // Book registration & edit
  const [editingBookId, setEditingBookId] = useState<string | null>(null);
  const [bookLevelFilter, setBookLevelFilter] = useState<string>("ALL");
  const [bookTitle, setBookTitle] = useState("");
  const [bookSubKr, setBookSubKr] = useState("");
  const [bookLevel, setBookLevel] = useState("Level 2");
  const [bookGrade, setBookGrade] = useState("초등 1~3학년");
  const [bookEnText, setBookEnText] = useState("");
  const [bookKrText, setBookKrText] = useState("");
  const [bookResultMsg, setBookResultMsg] = useState("");
  const [bookSaving, setBookSaving] = useState(false);

  // Report canvas & AI parent feedback
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [parentMsg, setParentMsg] = useState("");
  const [parentMsgLoading, setParentMsgLoading] = useState(false);
  const [parentMsgCopied, setParentMsgCopied] = useState(false);

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
      .catch(() => { });
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
    if (activeTab === "coaching" || activeTab === "reports") {
      loadCoachingQuestions();
    }
  }, [activeTab, currentUser?.id, currentBook?.id]);

  // Draw certificate when coaching/reports tab is active
  useEffect(() => {
    if ((activeTab !== "coaching" && activeTab !== "reports") || !canvasRef.current || !currentUser || !currentBook) return;
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
    ctx.fillText(`발급일: ${todayStr} · BADA English 원장`, w / 2, 445);
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

  const handleCreateBook = async () => {
    if (!bookEnText.trim()) {
      setBookResultMsg("등록할 영어 원서 본문을 입력해 주세요.");
      return;
    }
    setBookSaving(true);
    setBookResultMsg("");
    try {
      const endpoint = editingBookId ? "/api/books/update" : "/api/books/create";
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingBookId || undefined,
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
        if (!editingBookId) {
          setBookTitle("");
          setBookSubKr("");
          setBookEnText("");
          setBookKrText("");
        }
        setBookResultMsg(
          `${editingBookId ? "수정" : "신규 등록"} 완료: 《${data.book.title}》 (${data.book.level}) · 단어 ${(data.book.vocab || []).length
          }개, 문장 해석 ${(data.book.sentence_translations || []).length}개, 스피킹 질문 ${(data.book.speaking_questions || []).length
          }개가 저장되었습니다.`
        );
        playSoftTone(820, 0.18);
      } else {
        setBookResultMsg(data.error || "원서 저장에 실패했습니다.");
      }
    } catch (err) {
      setBookResultMsg("저장 요청 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setBookSaving(false);
    }
  };

  const handleSelectBookForEdit = (b: Book) => {
    setEditingBookId(b.id);
    setBookTitle(b.title);
    setBookSubKr(b.subtitle_kr || "");
    setBookLevel(b.level || "Level 2");
    setBookGrade(b.grade_recommended || "초등 1~3학년");
    setBookEnText(b.full_text || "");
    setBookKrText((b.sentence_translations || []).map((st) => st.kr).join("\n"));
    setBookResultMsg(`《${b.title}》 교재를 수정 모드로 불러왔습니다.`);
    playSoftTone(600, 0.1);
  };

  const handleResetNewBookMode = () => {
    setEditingBookId(null);
    setBookTitle("");
    setBookSubKr("");
    setBookEnText("");
    setBookKrText("");
    setBookResultMsg("");
  };

  const handleGenerateParentMsg = async () => {
    if (!currentUser || !currentBook) return;
    setParentMsgLoading(true);
    setParentMsgCopied(false);
    try {
      const res = await fetch("/api/teacher/parent-feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: currentUser.id,
          studentName: currentUser.name,
          level: currentUser.level,
          bookTitle: currentBook.title,
          weeklyProgress: {
            w1: currentUser.progress_w1,
            w2: currentUser.progress_w2,
            w3: currentUser.progress_w3,
            w4: currentUser.progress_w4
          }
        })
      });
      const data = await res.json();
      if (res.ok && data.ok && data.message) {
        setParentMsg(data.message);
        playSoftTone(760, 0.14);
      }
    } finally {
      setParentMsgLoading(false);
    }
  };

  const handleCopyParentMsg = async () => {
    if (!parentMsg.trim()) return;
    try {
      await navigator.clipboard.writeText(parentMsg);
      setParentMsgCopied(true);
      playSoftTone(820, 0.12);
      setTimeout(() => setParentMsgCopied(false), 2500);
    } catch {
      // ignore clipboard errors
    }
  };

  const navItems: { id: TeacherTab; label: string; icon: React.ReactNode }[] = [
    { id: "home", label: "학생 관리 & 원서 배정", icon: <Users className="w-4 h-4" /> },
    { id: "coaching", label: "학생 학습 관리", icon: <Video className="w-4 h-4" /> },
    { id: "database", label: "원서 교재 등록 · 관리", icon: <BookPlus className="w-4 h-4" /> }
  ];

  return (
    <div className="min-h-screen bg-transparent flex flex-col md:flex-row">
      {/* Sticky Sidebar */}
      <aside className="w-full md:w-64 md:sticky md:top-0 md:h-screen md:overflow-y-auto bg-slate-900/95 backdrop-blur-md text-slate-100 flex flex-col justify-between p-5 shrink-0">
        <div className="space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-slate-800">
            <img
              src="/assets/popo-3d.jpg"
              alt="BADA"
              className="w-10 h-10 rounded-xl object-cover"
            />
            <div>
              <div className="text-sm font-bold text-white">BADA English 관리센터</div>
              <div className="text-xs text-slate-400">강사 · 원장님 전용</div>
            </div>
          </div>

          <nav className="space-y-1.5">
            {navItems.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => onChangeTab(item.id)}
                className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition text-left ${activeTab === item.id
                  ? "bg-sky-600 text-white"
                  : "text-slate-300 hover:bg-slate-800 hover:text-white"
                  }`}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            ))}
          </nav>
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
      <main className="flex-1 p-6 md:p-10 space-y-6 overflow-y-auto bg-[#fbf8f2]/72 backdrop-blur-xs">
        {activeTab === "home" && (
          <div className="space-y-6 max-w-6xl">
            {/* Clean Academy Header (No 4-box KPI boilerplate) */}
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
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold transition"
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

            {/* Collapsible New Student Registration Drawer */}
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
                      className="w-full px-3 py-2 rounded-lg bg-white/90 border border-[#d8ceb8] text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">학년</label>
                    <select
                      value={stuGrade}
                      onChange={(e) => setStuGrade(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-white/90 border border-[#d8ceb8] text-sm"
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
                      className="w-full px-3 py-2 rounded-lg bg-white/90 border border-[#d8ceb8] text-sm"
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
                      className="w-full px-3 py-2 rounded-lg bg-white/90 border border-[#d8ceb8] text-sm"
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
                      className="w-full px-3 py-2 rounded-lg bg-white/90 border border-[#d8ceb8] text-sm"
                    >
                      {Array.from({ length: 26 }, (_, i) => i + 1).map((lv) => (
                        <option key={lv} value={lv}>
                          Level {lv}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">담당 선생님</label>
                    <select
                      value={stuTeacherId}
                      onChange={(e) => setStuTeacherId(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-white/90 border border-[#d8ceb8] text-sm"
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
                      className="w-full px-3 py-2 rounded-lg bg-white/90 border border-[#d8ceb8] text-sm"
                    />
                  </div>
                  <div className="flex items-end">
                    <button
                      type="button"
                      onClick={handleRegisterStudent}
                      className="w-full py-2 px-4 rounded-full bg-sky-600 hover:bg-sky-700 text-white text-sm font-bold"
                    >
                      등록 완료
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Collapsible Director & Teacher Account Settings (includes Director Profile Edit) */}
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
                        className="px-3 py-1.5 rounded-lg bg-white/90 border border-[#d8ceb8] text-xs"
                      />
                      <button
                        type="button"
                        onClick={handleUnlockDirector}
                        className="px-3.5 py-1.5 rounded-full bg-sky-600 text-white text-xs font-bold"
                      >
                        권한 전환
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Director Own Account Edit */}
                    <div className="space-y-3">
                      <h3 className="text-sm font-bold text-slate-900">원장 계정 정보 수정</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                        <input
                          type="text"
                          value={dirName}
                          onChange={(e) => setDirName(e.target.value)}
                          placeholder="원장님 성함"
                          className="px-3 py-2 rounded-lg bg-white/90 border border-[#d8ceb8] text-sm"
                        />
                        <input
                          type="text"
                          value={dirTitle}
                          onChange={(e) => setDirTitle(e.target.value)}
                          placeholder="직함"
                          className="px-3 py-2 rounded-lg bg-white/90 border border-[#d8ceb8] text-sm"
                        />
                        <input
                          type="email"
                          value={dirEmail}
                          onChange={(e) => setDirEmail(e.target.value)}
                          placeholder="이메일"
                          className="px-3 py-2 rounded-lg bg-white/90 border border-[#d8ceb8] text-sm"
                        />
                        <input
                          type="password"
                          value={dirNewPw}
                          onChange={(e) => setDirNewPw(e.target.value)}
                          placeholder="새 비밀번호 (변경 시 입력)"
                          className="px-3 py-2 rounded-lg bg-white/90 border border-[#d8ceb8] text-sm"
                        />
                        <button
                          type="button"
                          onClick={handleUpdateDirectorProfile}
                          disabled={dirSaving}
                          className="py-2 px-4 rounded-full bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold disabled:opacity-60"
                        >
                          {dirSaving ? "저장 중..." : "원장 정보 저장"}
                        </button>
                      </div>
                    </div>

                    {/* Additional Teacher Registration */}
                    <div className="pt-4 border-t border-[#e5dcc9] space-y-3">
                      <h3 className="text-sm font-bold text-slate-900">선생님 계정 추가</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                        <input
                          type="text"
                          value={tchName}
                          onChange={(e) => setTchName(e.target.value)}
                          placeholder="선생님 성함"
                          className="px-3 py-2 rounded-lg bg-white/90 border border-[#d8ceb8] text-sm"
                        />
                        <input
                          type="text"
                          value={tchTitle}
                          onChange={(e) => setTchTitle(e.target.value)}
                          placeholder="직책"
                          className="px-3 py-2 rounded-lg bg-white/90 border border-[#d8ceb8] text-sm"
                        />
                        <input
                          type="email"
                          value={tchEmail}
                          onChange={(e) => setTchEmail(e.target.value)}
                          placeholder="이메일"
                          className="px-3 py-2 rounded-lg bg-white/90 border border-[#d8ceb8] text-sm"
                        />
                        <input
                          type="text"
                          value={tchPw}
                          onChange={(e) => setTchPw(e.target.value)}
                          placeholder="비밀번호"
                          className="px-3 py-2 rounded-lg bg-white/90 border border-[#d8ceb8] text-sm"
                        />
                        <select
                          value={tchRole}
                          onChange={(e) => setTchRole(e.target.value as "teacher" | "director")}
                          className="px-3 py-2 rounded-lg bg-white/90 border border-[#d8ceb8] text-sm"
                        >
                          <option value="teacher">일반 강사</option>
                          <option value="director">공동 원장님</option>
                        </select>
                        <button
                          type="button"
                          onClick={handleRegisterTeacher}
                          className="py-2 px-4 rounded-full bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold"
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

            {stuMsg && (
              <p className="text-xs font-semibold text-sky-800 py-1">{stuMsg}</p>
            )}

            {/* Search & Level Filter Strip */}
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
                          ? "bg-sky-600 text-white"
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
                className="px-3.5 py-1.5 rounded-full bg-white/85 border border-[#d8ceb8] text-xs w-48 focus:outline-none focus:border-sky-600"
              />
            </div>

            {/* Clean Academy Roster Table (Line-separated, zero card boxes) */}
            <div className="overflow-x-auto border-y border-[#e5dcc9]">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#e5dcc9] text-[11px] font-bold text-slate-500 uppercase">
                    <th className="py-3 pr-3">학생</th>
                    <th className="py-3 px-2">배정 등급</th>
                    <th className="py-3 px-2">배정 원서</th>
                    <th className="py-3 px-2">클카</th>
                    <th className="py-3 px-2">PIN</th>
                    <th className="py-3 px-2">현재 진도</th>
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
                              className="px-2.5 py-1.5 rounded-lg border border-[#d8ceb8] bg-white/90 text-xs font-semibold"
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
                              className="px-2.5 py-1.5 rounded-lg border border-[#d8ceb8] bg-white/90 text-xs font-semibold max-w-[210px]"
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
                              className="px-2 py-1.5 rounded-lg border border-[#d8ceb8] bg-white/90 text-xs font-semibold"
                            >
                              {Array.from({ length: 26 }, (_, i) => i + 1).map((lv) => (
                                <option key={lv} value={lv}>
                                  Lv.{lv}
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
                              className="w-14 px-2 py-1.5 rounded-lg border border-[#d8ceb8] bg-white/90 text-xs font-semibold text-center"
                            />
                          </td>
                          <td className="py-3 px-2 whitespace-nowrap">
                            <span className="text-xs font-bold text-sky-700">
                              {activeWk}주차 · {repeats}/5회
                            </span>
                          </td>
                          <td className="py-3 pl-2 text-right whitespace-nowrap space-x-1.5">
                            <button
                              type="button"
                              onClick={() => handleSaveStudentAssign(u)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold"
                            >
                              <Save className="w-3 h-3" />
                              저장
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
        )}

        {(activeTab === "coaching" || activeTab === "reports") && currentUser && currentBook && (
          <div className="space-y-8 max-w-5xl">
            <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[#e5dcc9]">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">학생 학습 관리</h2>
                <p className="text-sm text-slate-600 mt-1">
                  {currentUser.name} ({currentUser.grade_label} · {currentUser.level}) · 《{currentBook.title}》
                </p>
              </div>
              <div className="flex items-center gap-2">
                <label htmlFor="coachingStudentSelect" className="text-xs font-bold text-slate-600">
                  학생 선택
                </label>
                <select
                  id="coachingStudentSelect"
                  value={currentUser.id}
                  onChange={(e) => {
                    onSelectStudent(e.target.value);
                    setParentMsg("");
                    setParentMsgCopied(false);
                  }}
                  className="px-3.5 py-2 rounded-xl bg-white/85 border border-[#d8ceb8] text-sm font-semibold text-slate-900"
                >
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.grade_label} · {u.level})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Student Weekly Voice Recordings & AI Pronunciation Feedback */}
            <div className="pt-6 border-t border-[#e5dcc9] space-y-4">
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

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pt-6 border-t border-[#e5dcc9]">
              {/* Real Progress & Recording Analysis Summary (no dummy data) */}
              <div className="space-y-4">
                <h3 className="text-base font-bold text-slate-900">주차별 진도 &amp; 실제 발음 분석 요약</h3>
                <div className="divide-y divide-[#e5dcc9] border-y border-[#e5dcc9]">
                  {([1, 2, 3, 4] as const).map((wk) => {
                    const prog = (currentUser[`progress_w${wk}` as keyof StudentUser] as number) || 0;
                    const repeats = Math.min(5, Math.floor(prog / 20));
                    return (
                      <div key={wk} className="py-2.5 flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-700">{wk}주차 학습 진도</span>
                        <div className="flex items-center gap-3">
                          <span className="text-slate-500">반복 {repeats}/5회</span>
                          <span className="font-bold text-sky-700 w-10 text-right">{prog}%</span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {studentRecordings.length === 0 ? (
                  <p className="text-xs text-slate-500">
                    아직 제출된 발음 녹음이 없어 집중 교정 단어가 기록되지 않았습니다.
                  </p>
                ) : (
                  <div className="space-y-2 pt-1">
                    <div className="text-xs font-bold text-slate-700">
                      최근 녹음 기준 집중 연습 단어
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {Array.from(
                        new Set(studentRecordings.flatMap((r) => r.ai_feedback?.weak_words || []))
                      )
                        .slice(0, 8)
                        .map((w) => (
                          <span
                            key={w}
                            className="text-xs px-2.5 py-0.5 rounded-full bg-amber-100/80 text-amber-900 font-semibold"
                          >
                            {w}
                          </span>
                        ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="lg:border-l lg:border-[#e5dcc9] lg:pl-8 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-slate-900">수업 추천 질문 3선</h3>
                  <button
                    type="button"
                    onClick={loadCoachingQuestions}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-[#f2ece1] hover:bg-[#e8dfd1] text-xs font-bold text-slate-700"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    새로고침
                  </button>
                </div>
                <div className="divide-y divide-[#e5dcc9] border-y border-[#e5dcc9]">
                  {coachQuestions.map((q, idx) => (
                    <div key={q.id || idx} className="py-3 space-y-1">
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

            {/* Merged Parent Feedback AI Generator + Copy & Certificate */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pt-6 border-t border-[#e5dcc9]">
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="text-base font-bold text-slate-900">학부모 피드백 메시지 (AI 작성)</h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      진도율과 녹음 분석 결과를 바탕으로 학부모님께 보낼 안내 문구를 생성합니다.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleGenerateParentMsg}
                    disabled={parentMsgLoading}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold transition disabled:opacity-60"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    {parentMsgLoading ? "생성 중..." : "AI 피드백 생성"}
                  </button>
                </div>

                <textarea
                  rows={6}
                  value={parentMsg}
                  onChange={(e) => setParentMsg(e.target.value)}
                  placeholder="오른쪽 위 'AI 피드백 생성' 버튼을 누르면 학생의 실제 진도와 발음 분석을 반영한 학부모 안내 메시지가 자동으로 작성됩니다."
                  className="w-full px-4 py-3 rounded-xl bg-white/85 border border-[#d8ceb8] text-sm text-slate-800 leading-relaxed focus:outline-none focus:border-sky-600"
                />

                <div className="flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={handleCopyParentMsg}
                    disabled={!parentMsg.trim()}
                    className="px-4 py-2 rounded-full bg-slate-800 hover:bg-slate-900 disabled:opacity-40 text-white text-xs font-bold transition"
                  >
                    {parentMsgCopied ? "복사 완료! (붙여넣기 하세요)" : "메시지 복사하기"}
                  </button>
                  <span className="text-[11px] text-slate-500">
                    복사 후 카카오톡·문자에 바로 붙여넣어 전송할 수 있습니다.
                  </span>
                </div>
              </div>

              <div className="lg:border-l lg:border-[#e5dcc9] lg:pl-8 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-base font-bold text-slate-900">BADA 탐험 수료증</h3>
                  <button
                    type="button"
                    onClick={() => {
                      if (!canvasRef.current) return;
                      const link = document.createElement("a");
                      link.download = `BADA_수료증_${currentUser.name}.png`;
                      link.href = canvasRef.current.toDataURL("image/png");
                      link.click();
                    }}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-[#f2ece1] hover:bg-[#e8dfd1] text-xs font-bold text-slate-700"
                  >
                    <Download className="w-3.5 h-3.5" />
                    수료증 이미지 저장
                  </button>
                </div>
                <canvas
                  ref={canvasRef}
                  width={760}
                  height={500}
                  className="w-full h-auto rounded-xl border border-[#e5dcc9]"
                />
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
              <div className="lg:col-span-3 pt-4 border-t border-[#e5dcc9] space-y-4">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-base font-bold text-slate-900">
                    {editingBookId ? "기존 원서 교재 수정" : "신규 원서 교재 등록"}
                  </h3>
                  {editingBookId && (
                    <button
                      type="button"
                      onClick={handleResetNewBookMode}
                      className="text-xs font-bold px-3 py-1 rounded-full bg-[#f2ece1] hover:bg-[#e8dfd1] text-slate-700"
                    >
                      + 새 교재 등록 모드로 전환
                    </button>
                  )}
                </div>
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
                  className="px-5 py-2.5 rounded-full bg-sky-600 hover:bg-sky-700 text-white text-sm font-bold disabled:opacity-60"
                >
                  {bookSaving
                    ? "저장 및 AI 분석 중..."
                    : editingBookId
                    ? "수정 내용 저장하기"
                    : "신규 원서 등록하기"}
                </button>

                {bookResultMsg && (
                  <p className="text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
                    {bookResultMsg}
                  </p>
                )}
              </div>

              {/* Registered Books Catalog (with Level Filter & Click-to-Edit) */}
              <div className="lg:col-span-2 lg:border-l lg:border-[#e5dcc9] lg:pl-6 pt-4 border-t border-[#e5dcc9] space-y-3">
                <div className="flex items-baseline justify-between">
                  <h3 className="text-base font-bold text-slate-900">등록된 원서 교재 목록</h3>
                  <span className="text-[11px] text-slate-500">누르면 내용 확인·수정 가능</span>
                </div>

                {/* Level Category Filter Pills */}
                <div className="flex flex-wrap gap-1.5 pb-1">
                  {["ALL", ...ALL_BADA_LEVELS].map((lv) => {
                    const count =
                      lv === "ALL"
                        ? books.length
                        : books.filter((b) => b.level === lv).length;
                    if (lv !== "ALL" && count === 0) return null;
                    const active = bookLevelFilter === lv;
                    return (
                      <button
                        key={lv}
                        type="button"
                        onClick={() => setBookLevelFilter(lv)}
                        className={`px-2.5 py-1 rounded-full text-[11px] font-bold transition ${
                          active
                            ? "bg-sky-600 text-white"
                            : "bg-[#f2ece1] hover:bg-[#e8dfd1] text-slate-700"
                        }`}
                      >
                        {lv === "ALL" ? `전체 (${count})` : `${lv} (${count})`}
                      </button>
                    );
                  })}
                </div>

                <div className="divide-y divide-[#e5dcc9] border-y border-[#e5dcc9] max-h-[540px] overflow-y-auto pr-1">
                  {books
                    .filter((b) => bookLevelFilter === "ALL" || b.level === bookLevelFilter)
                    .map((b) => {
                    const sCount = getBookSentences(b).length;
                    const isEditing = editingBookId === b.id;
                    return (
                      <button
                        key={b.id}
                        type="button"
                        onClick={() => handleSelectBookForEdit(b)}
                        className={`w-full text-left py-3 px-2 flex items-center gap-3.5 transition ${
                          isEditing ? "bg-sky-50/80 border-l-4 border-sky-600 pl-3" : "hover:bg-[#f4efe5]/70"
                        }`}
                      >
                        <BookCover book={b} size="sm" />
                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="flex items-center justify-between gap-2">
                            <strong className="text-sm text-slate-900 truncate">{b.title}</strong>
                            <span className="text-[11px] font-bold text-sky-700 shrink-0">
                              {b.level}
                            </span>
                          </div>
                          <div className="text-xs text-slate-500 truncate">{b.subtitle_kr}</div>
                          <div className="text-[11px] text-slate-400">
                            문장 {sCount}개 · 단어 {(b.vocab || []).length}개 · 질문{" "}
                            {(b.speaking_questions || []).length}개
                          </div>
                        </div>
                      </button>
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


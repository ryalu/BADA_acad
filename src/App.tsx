import React, { useEffect, useState } from "react";
import { ArrowLeft, BookOpen, Compass, LogOut, Map as MapIcon, Sparkles } from "lucide-react";
import type { Book, StudentUser, TeacherAccount } from "./types";
import { getStudentCurrentWeek } from "./utils/bookHelpers";
import { EntryPortal } from "./components/EntryPortal";
import { StudentHome } from "./components/StudentHome";
import { StorybookReader } from "./components/StorybookReader";
import { FlashcardDeck } from "./components/FlashcardDeck";
import { SpeakingStage } from "./components/SpeakingStage";
import { CurriculumPlayground } from "./components/CurriculumPlayground";
import { TeacherDashboard, type TeacherTab } from "./components/TeacherDashboard";
import { OceanBackdrop } from "./components/OceanBackdrop";

export default function App() {
  const [users, setUsers] = useState<StudentUser[]>([]);
  const [teachers, setTeachers] = useState<TeacherAccount[]>([]);
  const [books, setBooks] = useState<Book[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>("stu_hajun");
  const [loggedTeacher, setLoggedTeacher] = useState<TeacherAccount | null>(null);
  const [route, setRoute] = useState<string>(() => window.location.pathname || "/");
  const [currentWeek, setCurrentWeek] = useState<1 | 2 | 3 | 4>(1);
  const [learnStep, setLearnStep] = useState<1 | 2 | 3>(1);
  const [currSubview, setCurrSubview] = useState<"hub" | "phonics" | "classcard" | "upper">("hub");
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState(false);

  const loadBootstrap = async () => {
    setApiError(false);
    try {
      const res = await fetch("/api/bootstrap");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.users?.length) {
        setUsers(data.users);
        setSelectedUserId(data.users[0].id);
        setCurrentWeek(getStudentCurrentWeek(data.users[0]));
      }
      if (data.teachers?.length) {
        setTeachers(data.teachers);
        setLoggedTeacher(data.teachers[0]);
      }
      if (data.books?.length) {
        setBooks(data.books);
      }
    } catch {
      setApiError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBootstrap();

    const onPopState = () => {
      setRoute(window.location.pathname || "/");
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  const navigate = (path: string) => {
    const clean = path || "/";
    if (window.location.pathname !== clean) {
      window.history.pushState({}, "", clean);
    }
    setRoute(clean);
  };

  const currentUser = users.find((u) => u.id === selectedUserId) || users[0];
  const currentBook = books.find((b) => b.id === currentUser?.current_book_id) || books[0];

  const handleSelectStudent = (userId: string) => {
    setSelectedUserId(userId);
    const found = users.find((u) => u.id === userId);
    if (found) {
      setCurrentWeek(getStudentCurrentWeek(found));
    }
  };

  const handleCompleteWeek = async () => {
    if (!currentUser) return;
    const wk = currentWeek;
    const nextWk = (wk < 4 ? wk + 1 : 4) as 1 | 2 | 3 | 4;

    setUsers((prev) =>
      prev.map((u) =>
        u.id === currentUser.id
          ? { ...u, [`progress_w${wk}`]: 100 }
          : u
      )
    );
    setCurrentWeek(nextWk);

    try {
      const res = await fetch("/api/users/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: currentUser.id, week: wk, progress: 100 })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.user) {
          setUsers((prev) => prev.map((u) => (u.id === data.user.id ? data.user : u)));
        }
      }
    } catch {
      // ignore offline
    }

    navigate("/student");
  };

  if (loading) {
    return (
      <>
        <OceanBackdrop />
        <div className="min-h-screen bg-transparent flex flex-col items-center justify-center gap-4 px-4">
          <div className="relative flex items-center justify-center w-36 h-24">
            <img
              src="/assets/popo-3d.jpg"
              alt="헤엄치는 포포"
              className="w-20 h-20 rounded-full object-cover border-2 border-cyan-300 shadow-lg animate-popo-swim"
            />
            <span className="animate-bubble-1 absolute right-4 top-3 w-3 h-3 rounded-full bg-white/80 border border-cyan-300" />
            <span className="animate-bubble-2 absolute right-2 top-7 w-2 h-2 rounded-full bg-white/75 border border-cyan-300" />
          </div>
          <div className="text-center space-y-1">
            <p className="text-base font-bold text-slate-800">BADA 영어를 불러오는 중입니다...</p>
            <p className="text-xs text-sky-700 font-medium">아기 고래 포포가 바닷길을 안내하고 있어요</p>
          </div>
        </div>
      </>
    );
  }

  if (apiError && users.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white border border-slate-200 rounded-2xl p-6 text-center space-y-3 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900">백엔드 서버에 연결할 수 없습니다</h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            학생·선생님·원서 데이터를 불러오려면 별도 터미널에서 백엔드 서버(<code>npm run dev</code>)가 함께 실행 중이어야 합니다.
          </p>
          <button
            type="button"
            onClick={() => {
              setLoading(true);
              loadBootstrap();
            }}
            className="px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-sm font-bold"
          >
            다시 연결하기
          </button>
        </div>
      </div>
    );
  }

  // 1. Entry Portal (/)
  if (route === "/" || (!route.startsWith("/student") && !route.startsWith("/teacher"))) {
    return (
      <>
        <OceanBackdrop />
        <EntryPortal
          users={users}
          teachers={teachers}
          books={books}
          selectedUserId={selectedUserId}
          onSelectStudent={handleSelectStudent}
          onStudentLoginSuccess={(user) => {
            setSelectedUserId(user.id);
            setCurrentWeek(getStudentCurrentWeek(user));
            navigate("/student");
          }}
          onTeacherLoginSuccess={(teacher) => {
            setLoggedTeacher(teacher);
            navigate("/teacher");
          }}
        />
      </>
    );
  }

  // 2. Teacher Dashboard (/teacher*)
  if (route.startsWith("/teacher")) {
    const teacherTab: TeacherTab = route.includes("/coaching")
      ? "coaching"
      : route.includes("/reports")
        ? "reports"
        : route.includes("/database")
          ? "database"
          : "home";

    return (
      <>
        <OceanBackdrop />
        <TeacherDashboard
          activeTab={teacherTab}
          onChangeTab={(tab) => navigate(tab === "home" ? "/teacher" : `/teacher/${tab}`)}
          users={users}
          teachers={teachers}
          books={books}
          loggedTeacher={loggedTeacher || teachers[0]}
          selectedUserId={selectedUserId}
          onSelectStudent={handleSelectStudent}
          onDataUpdated={(payload) => {
            if (payload.users) setUsers(payload.users);
            if (payload.teachers) setTeachers(payload.teachers);
            if (payload.books) setBooks(payload.books);
            if (payload.loggedTeacher) setLoggedTeacher(payload.loggedTeacher);
          }}
          onPreviewStudentApp={() => navigate("/student")}
          onLogout={() => navigate("/")}
        />
      </>
    );
  }

  // 3. Student App (/student*)
  if (!currentUser || !currentBook) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-4">
        <p className="text-slate-600">등록된 학생 또는 원서 정보가 없습니다.</p>
        <button
          type="button"
          onClick={() => navigate("/")}
          className="px-4 py-2 rounded-xl bg-sky-600 text-white text-sm font-bold"
        >
          로그인 화면으로
        </button>
      </div>
    );
  }

  const studentPage = route.includes("/learn")
    ? "learn"
    : route.includes("/curriculum")
      ? "curriculum"
      : "home";

  return (
    <div className="min-h-screen bg-transparent flex flex-col">
      <OceanBackdrop />
      {/* Compact Student Header (shown on Home Map; hidden on Learn & Curriculum for larger workspace) */}
      {studentPage === "home" && (
        <header className="bg-[#fbf8f2]/80 backdrop-blur-md border-b border-[#e8dfd1] px-4 md:px-8 py-2.5 sticky top-0 z-40">
          <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
            <div
              onClick={() => navigate("/student")}
              role="button"
              tabIndex={0}
              className="flex items-center gap-3 cursor-pointer"
            >
              <img
                src="/assets/popo-3d.jpg"
                alt="포포"
                className="w-9 h-9 rounded-full object-cover border-2 border-amber-200 shadow-xs"
              />
              <div>
                <div className="text-sm font-bold text-slate-900">BADA English</div>
                <div className="text-[11px] text-amber-800/80 font-medium">
                  {currentUser.grade_label} · {currentUser.level}
                </div>
              </div>
            </div>

            <nav className="flex items-center gap-1 border-b border-transparent">
              <button
                type="button"
                onClick={() => navigate("/student")}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-bold transition bg-sky-600 text-white shadow-xs"
              >
                <MapIcon className="w-3.5 h-3.5" />
                학습 맵
              </button>
              <button
                type="button"
                onClick={() => {
                  setLearnStep(1);
                  navigate("/student/learn");
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-bold transition text-slate-600 hover:text-slate-900 hover:bg-[#f2ece1]"
              >
                <BookOpen className="w-3.5 h-3.5" />
                오늘의 원서 읽기
              </button>
              <button
                type="button"
                onClick={() => {
                  setCurrSubview("hub");
                  navigate("/student/curriculum");
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-bold transition text-slate-600 hover:text-slate-900 hover:bg-[#f2ece1]"
              >
                <Sparkles className="w-3.5 h-3.5" />
                맞춤 훈련소
              </button>
            </nav>

            <div className="flex items-center gap-3">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-cyan-50/90 border border-cyan-200/80">
                <img
                  src="/assets/pearl-badge-3d.jpg"
                  alt="바다 진주"
                  className="w-5 h-5 rounded-full object-cover"
                />
                <span className="text-xs font-bold text-cyan-900">
                  진주 {Math.round((((currentUser.progress_w1 || 0) + (currentUser.progress_w2 || 0) + (currentUser.progress_w3 || 0) + (currentUser.progress_w4 || 0)) / 400) * 12)} / 12
                </span>
              </div>
              <div className="hidden sm:block text-right">
                <div className="text-xs font-bold text-slate-800">{currentUser.name}</div>
                <div className="text-[11px] text-slate-500 truncate max-w-[160px]">{currentBook.title}</div>
              </div>
              <button
                type="button"
                onClick={() => navigate("/")}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-[#f2ece1] hover:bg-[#e8dfd1] text-slate-700 text-xs font-bold transition"
              >
                <LogOut className="w-3.5 h-3.5" />
                로그아웃
              </button>
            </div>
          </div>
        </header>
      )}

      {/* Main Content */}
      <main
        className={
          studentPage === "learn" && learnStep === 1
            ? "flex-1 w-full px-3 md:px-5 py-2"
            : "flex-1 max-w-7xl w-full mx-auto px-4 md:px-6 py-4"
        }
      >
        {studentPage === "home" && (
          <StudentHome
            user={currentUser}
            book={currentBook}
            onStartWeek={(wk) => {
              setCurrentWeek(wk);
              setLearnStep(1);
              navigate("/student/learn");
            }}
            onOpenCurriculum={(sub = "hub") => {
              setCurrSubview(sub);
              navigate("/student/curriculum");
            }}
          />
        )}

        {studentPage === "learn" && (
          <div className={learnStep === 1 ? "" : "space-y-3"}>
            {/* Clean Hairline Stepper & Week Selector (hidden in full-screen StorybookReader step 1) */}
            {learnStep !== 1 && (
              <div className="pb-2.5 border-b border-[#e8dfd1] flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => navigate("/student")}
                    className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-[#f2ece1] hover:bg-[#e8dfd1] text-xs font-bold text-slate-700 transition"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    항해 맵
                  </button>
                  <div className="flex items-center gap-1">
                    {([1, 2, 3, 4] as const).map((wk) => (
                      <button
                        key={wk}
                        type="button"
                        onClick={() => {
                          setCurrentWeek(wk);
                          setLearnStep(1);
                        }}
                        className={`px-3 py-1 rounded-full text-xs font-bold transition ${currentWeek === wk
                          ? "bg-sky-600 text-white shadow-xs"
                          : "text-slate-600 hover:bg-[#f2ece1]"
                          }`}
                      >
                        {wk}주차
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  {[
                    { step: 1 as const, label: "1교시 · 원서 읽기" },
                    { step: 2 as const, label: "2교시 · 단어 카드" },
                    { step: 3 as const, label: "3교시 · 스피킹" }
                  ].map((s) => (
                    <button
                      key={s.step}
                      type="button"
                      onClick={() => setLearnStep(s.step)}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition ${learnStep === s.step
                        ? "bg-sky-600 text-white"
                        : learnStep > s.step
                          ? "bg-sky-50 text-sky-700 border border-sky-200"
                          : "bg-slate-100 text-slate-600"
                        }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>

                <span className="hidden md:inline-flex items-center gap-1 text-xs font-semibold text-slate-500">
                  <Compass className="w-3.5 h-3.5 text-sky-600" />
                  {currentWeek}주차 학습
                </span>
              </div>
            )}

            {learnStep === 1 && (
              <StorybookReader
                book={currentBook}
                weekNum={currentWeek}
                userId={currentUser.id}
                weekProgress={(currentUser[`progress_w${currentWeek}` as keyof StudentUser] as number) || 0}
                onRecordRepeatComplete={({ nextProgress }) => {
                  setUsers((prev) =>
                    prev.map((u) =>
                      u.id === currentUser.id
                        ? { ...u, [`progress_w${currentWeek}`]: nextProgress }
                        : u
                    )
                  );
                }}
                onBackHome={() => navigate("/student")}
                onGoToFlashcards={() => setLearnStep(2)}
              />
            )}

            {learnStep === 2 && (
              <FlashcardDeck
                book={currentBook}
                weekNum={currentWeek}
                onGoToSpeaking={() => setLearnStep(3)}
              />
            )}

            {learnStep === 3 && (
              <SpeakingStage
                book={currentBook}
                weekNum={currentWeek}
                onBackToFlashcards={() => setLearnStep(2)}
                onCompleteWeek={handleCompleteWeek}
              />
            )}
          </div>
        )}

        {studentPage === "curriculum" && (
          <CurriculumPlayground
            user={currentUser}
            book={currentBook}
            initialSubview={currSubview}
            onBackHome={() => navigate("/student")}
          />
        )}
      </main>
    </div>
  );
}


import React, { useState } from "react";
import { BookOpen, Check, Lock, UserCheck } from "lucide-react";
import type { Book, StudentUser, TeacherAccount } from "../types";
import { getStudentCurrentWeek } from "../utils/bookHelpers";
import { playSoftTone } from "../utils/speech";

interface EntryPortalProps {
  users: StudentUser[];
  teachers: TeacherAccount[];
  books: Book[];
  selectedUserId: string;
  onSelectStudent: (userId: string) => void;
  onStudentLoginSuccess: (user: StudentUser) => void;
  onTeacherLoginSuccess: (teacher: TeacherAccount) => void;
}

export const EntryPortal: React.FC<EntryPortalProps> = ({
  users,
  teachers,
  books,
  selectedUserId,
  onSelectStudent,
  onStudentLoginSuccess,
  onTeacherLoginSuccess
}) => {
  const [pinCode, setPinCode] = useState("1234");
  const [studentError, setStudentError] = useState("");
  const [teacherId, setTeacherId] = useState<string>(teachers[0]?.id || "tch_director");
  const [teacherPassword, setTeacherPassword] = useState("");
  const [teacherError, setTeacherError] = useState("");
  const [loadingStu, setLoadingStu] = useState(false);
  const [loadingTch, setLoadingTch] = useState(false);

  const handleStudentLogin = async () => {
    setStudentError("");
    setLoadingStu(true);
    try {
      const res = await fetch("/api/auth/student", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: selectedUserId, pinCode: pinCode.trim() })
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setStudentError(data.error || "출석번호가 일치하지 않습니다.");
        playSoftTone(320, 0.14);
        return;
      }
      playSoftTone(660, 0.14);
      onStudentLoginSuccess(data.user);
    } catch {
      const fallback = users.find((u) => u.id === selectedUserId) || users[0];
      if (fallback) onStudentLoginSuccess(fallback);
    } finally {
      setLoadingStu(false);
    }
  };

  const handleTeacherLogin = async () => {
    setTeacherError("");
    setLoadingTch(true);
    try {
      const res = await fetch("/api/auth/teacher", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teacherId, password: teacherPassword.trim() })
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setTeacherError(data.error || "비밀번호가 올바르지 않습니다.");
        playSoftTone(320, 0.14);
        return;
      }
      playSoftTone(660, 0.14);
      onTeacherLoginSuccess(data.teacher);
    } catch {
      const fallback = teachers.find((t) => t.id === teacherId) || teachers[0];
      if (fallback) onTeacherLoginSuccess(fallback);
    } finally {
      setLoadingTch(false);
    }
  };

  return (
    <div className="min-h-screen bg-transparent py-8 px-4 md:px-8 flex flex-col items-center justify-center">
      <div className="w-full max-w-5xl space-y-8">
        {/* Top Brand Header (clean hairline, no box) */}
        <header className="flex items-center gap-4 pb-5 border-b border-[#e5dcc9]">
          <img
            src="/assets/popo-3d.jpg"
            alt="BADA English 포포"
            className="w-14 h-14 rounded-full object-cover border-2 border-cyan-300 shadow-sm"
          />
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-semibold text-amber-800">
                Pre-Level ~ Level 8
              </span>
              <span className="text-xs text-stone-400">·</span>
              <span className="text-xs font-semibold text-sky-700">
                초등 영어 원서 리딩 프로그램
              </span>
            </div>
            <h1 className="text-xl md:text-2xl font-bold text-slate-900">
              BADA English{" "}
              <span className="text-base font-medium text-slate-600 ml-1">
                아기 고래 포포와 함께하는 4주 원서 리딩
              </span>
            </h1>
          </div>
        </header>

        {/* Two Portals separated by clean vertical hairline */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start">
          {/* Student Login Section */}
          <section className="lg:col-span-7 flex flex-col justify-between gap-5">
            <div className="space-y-4">
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-sky-700">
                <BookOpen className="w-3.5 h-3.5" />
                학생 학습 공간
              </span>
              <div>
                <h2 className="text-2xl font-bold text-slate-900 leading-snug">
                  오늘의 영어 원서 학습을 시작해 볼까요?
                </h2>
                <p className="text-sm text-slate-600 mt-1">
                  내 이름을 선택하고 출석번호 4자리를 입력해 입장하세요.
                </p>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-600">1. 내 이름 선택</label>
                <div className="divide-y divide-[#e5dcc9] border-y border-[#e5dcc9] max-h-56 overflow-y-auto pr-1">
                  {users.map((u) => {
                    const uBook = books.find((b) => b.id === u.current_book_id) || books[0];
                    const isAct = u.id === selectedUserId;
                    const activeWk = getStudentCurrentWeek(u);
                    return (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => {
                          onSelectStudent(u.id);
                          setPinCode(u.pin_code || "1234");
                          setStudentError("");
                          playSoftTone(540, 0.1);
                        }}
                        className={`w-full text-left px-3 py-3 transition flex items-center justify-between gap-3 ${
                          isAct
                            ? "bg-sky-50/80 border-l-4 border-sky-600 pl-3.5"
                            : "hover:bg-[#f4efe5]/70"
                        }`}
                      >
                        <div>
                          <div className="text-sm font-bold text-slate-900">
                            {u.name} ({u.grade_label} · {u.level})
                          </div>
                          <div className="text-xs text-slate-600 mt-0.5">
                            원서: {uBook?.title || ""} · {activeWk}주차 진행 중
                          </div>
                        </div>
                        <span
                          className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${
                            isAct ? "btn-water-glass" : "text-slate-500"
                          }`}
                        >
                          {isAct && <Check className="w-3 h-3" />}
                          {isAct ? "선택됨" : "선택"}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="pt-2 space-y-2">
                <label htmlFor="entryPinInput" className="flex items-center gap-1.5 text-xs font-bold text-slate-600">
                  <Lock className="w-3.5 h-3.5 text-slate-400" />
                  2. 출석번호 (4자리) 입력
                </label>
                <div className="flex items-center gap-3">
                  <input
                    id="entryPinInput"
                    type="password"
                    maxLength={4}
                    inputMode="numeric"
                    value={pinCode}
                    onChange={(e) => setPinCode(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleStudentLogin()}
                    placeholder="••••"
                    className="w-32 px-4 py-2.5 rounded-xl bg-white/85 border border-[#d8ceb8] text-center text-lg font-bold tracking-widest text-slate-900 focus:outline-none focus:border-sky-600"
                  />
                  <span className="text-xs text-slate-600">
                    내 이름과 배정된 원서로 입장합니다.
                  </span>
                </div>
                {studentError && (
                  <p className="text-xs font-semibold text-rose-600">{studentError}</p>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={handleStudentLogin}
              disabled={loadingStu}
              className="w-full py-3.5 px-5 rounded-full btn-water-glass font-bold text-base disabled:opacity-60"
            >
              {loadingStu ? "입장 중..." : "학습 시작하기"}
            </button>
          </section>

          {/* Teacher / Director Login Section (separated by vertical hairline) */}
          <section className="lg:col-span-5 lg:border-l lg:border-[#e5dcc9] lg:pl-10 pt-6 lg:pt-0 border-t lg:border-t-0 border-[#e5dcc9] flex flex-col justify-between gap-5">
            <div className="space-y-4">
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-800">
                <UserCheck className="w-3.5 h-3.5" />
                선생님 · 원장님 전용
              </span>
              <div>
                <h2 className="text-2xl font-bold text-slate-900">학원 및 학생 학습 관리</h2>
                <p className="text-sm text-slate-600 mt-1">
                  학생 등록, 레벨·원서 배정, 수업 코칭 및 학습 리포트를 관리합니다.
                </p>
              </div>

              <div className="pt-2 border-t border-[#e5dcc9] space-y-4">
                <div className="space-y-1.5">
                  <label htmlFor="entryTeacherSelect" className="block text-xs font-bold text-slate-600">
                    1. 로그인할 계정 선택
                  </label>
                  <select
                    id="entryTeacherSelect"
                    value={teacherId}
                    onChange={(e) => {
                      setTeacherId(e.target.value);
                      setTeacherPassword("");
                      setTeacherError("");
                    }}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white/85 border border-[#d8ceb8] text-sm font-semibold text-slate-900 focus:outline-none focus:border-sky-600"
                  >
                    {teachers.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} · {t.title_label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="entryTeacherPw" className="block text-xs font-bold text-slate-600">
                    2. 계정 비밀번호 입력
                  </label>
                  <input
                    id="entryTeacherPw"
                    type="password"
                    value={teacherPassword}
                    onChange={(e) => setTeacherPassword(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleTeacherLogin()}
                    placeholder="비밀번호 입력"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white/85 border border-[#d8ceb8] text-sm font-semibold text-slate-900 placeholder-slate-400 focus:outline-none focus:border-sky-600"
                  />
                </div>

                {teacherError && (
                  <p className="text-xs font-semibold text-rose-600">{teacherError}</p>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={handleTeacherLogin}
              disabled={loadingTch}
              className="w-full py-3.5 px-5 rounded-full bg-slate-800 hover:bg-slate-900 text-white font-bold text-base transition shadow-sm disabled:opacity-60"
            >
              {loadingTch ? "확인 중..." : "관리자 로그인"}
            </button>
          </section>
        </div>
      </div>
    </div>
  );
};


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
    <div className="min-h-screen bg-slate-50 py-8 px-4 md:px-8 flex flex-col items-center justify-center">
      <div className="w-full max-w-5xl space-y-6">
        {/* Top Brand Header */}
        <header className="flex items-center gap-4 bg-white border border-slate-200 rounded-2xl px-6 py-4 shadow-sm">
          <img
            src="/assets/popo-3d.jpg"
            alt="BADA 영어 포포"
            className="w-14 h-14 rounded-xl object-cover border border-slate-200"
          />
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                Pre-Level ~ Level 8
              </span>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-200">
                초등 영어 원서 리딩 프로그램
              </span>
            </div>
            <h1 className="text-xl md:text-2xl font-bold text-slate-900">
              BADA 영어{" "}
              <span className="text-base font-medium text-slate-500 ml-1">
                아기 고래 포포와 함께하는 4주 원서 리딩
              </span>
            </h1>
          </div>
        </header>

        {/* Two Portals */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Student Login Card */}
          <section className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col justify-between gap-5">
            <div className="space-y-4">
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                <BookOpen className="w-3.5 h-3.5 text-sky-600" />
                학생 학습 공간
              </span>
              <div>
                <h2 className="text-2xl font-bold text-slate-900 leading-snug">
                  오늘의 영어 원서 학습을 시작해 볼까요?
                </h2>
                <p className="text-sm text-slate-500 mt-1">
                  내 이름을 선택하고 출석번호 4자리를 입력해 입장하세요.
                </p>
              </div>

              <div className="space-y-2.5">
                <label className="block text-xs font-bold text-slate-600">1. 내 이름 선택</label>
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
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
                        className={`w-full text-left px-4 py-3 rounded-xl border transition flex items-center justify-between gap-3 ${
                          isAct
                            ? "bg-sky-50 border-sky-600 ring-1 ring-sky-600"
                            : "bg-slate-50 border-slate-200 hover:border-slate-300"
                        }`}
                      >
                        <div>
                          <div className="text-sm font-bold text-slate-900">
                            {u.name} ({u.grade_label} · {u.level})
                          </div>
                          <div className="text-xs text-slate-500 mt-0.5">
                            원서: {uBook?.title || ""} · {activeWk}주차 진행 중
                          </div>
                        </div>
                        <span
                          className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${
                            isAct ? "bg-sky-600 text-white" : "bg-slate-200 text-slate-600"
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

              <div className="pt-3 border-t border-slate-100 space-y-2">
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
                    className="w-32 px-4 py-2.5 rounded-xl border border-slate-300 text-center text-lg font-bold tracking-widest text-slate-900 focus:outline-none focus:border-sky-600"
                  />
                  <span className="text-xs text-slate-500">
                    내 이름과 배정된 원서로 입장합니다.
                  </span>
                </div>
                {studentError && (
                  <p className="text-xs font-semibold text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
                    {studentError}
                  </p>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={handleStudentLogin}
              disabled={loadingStu}
              className="w-full py-3.5 px-5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-base transition shadow-sm disabled:opacity-60"
            >
              {loadingStu ? "입장 중..." : "학습 시작하기"}
            </button>
          </section>

          {/* Teacher / Director Login Card */}
          <section className="bg-slate-800 border border-slate-700 rounded-2xl p-6 shadow-sm flex flex-col justify-between gap-5 text-white">
            <div className="space-y-4">
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full bg-slate-700 text-slate-200 border border-slate-600">
                <UserCheck className="w-3.5 h-3.5 text-sky-400" />
                선생님 · 원장님 전용
              </span>
              <div>
                <h2 className="text-2xl font-bold text-white">학원 및 학생 학습 관리</h2>
                <p className="text-sm text-slate-300 mt-1">
                  학생 등록, 레벨·원서 배정, 수업 코칭 및 학습 리포트를 관리합니다.
                </p>
              </div>

              <div className="bg-slate-900/60 border border-slate-700 rounded-xl p-4 space-y-4">
                <div className="space-y-1.5">
                  <label htmlFor="entryTeacherSelect" className="block text-xs font-bold text-slate-300">
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
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-600 text-sm font-semibold text-white focus:outline-none focus:border-sky-500"
                  >
                    {teachers.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} · {t.title_label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="entryTeacherPw" className="block text-xs font-bold text-slate-300">
                    2. 계정 비밀번호 입력
                  </label>
                  <input
                    id="entryTeacherPw"
                    type="password"
                    value={teacherPassword}
                    onChange={(e) => setTeacherPassword(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleTeacherLogin()}
                    placeholder="비밀번호 입력"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-600 text-sm font-semibold text-white placeholder-slate-400 focus:outline-none focus:border-sky-500"
                  />
                </div>

                {teacherError && (
                  <p className="text-xs font-semibold text-rose-300 bg-rose-950/60 border border-rose-700 rounded-lg px-3 py-2">
                    {teacherError}
                  </p>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={handleTeacherLogin}
              disabled={loadingTch}
              className="w-full py-3.5 px-5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-base transition shadow-sm disabled:opacity-60"
            >
              {loadingTch ? "확인 중..." : "관리자 로그인"}
            </button>
          </section>
        </div>
      </div>
    </div>
  );
};


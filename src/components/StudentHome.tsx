import React from "react";
import { ArrowRight, BookOpen, CheckCircle2, Lock, Sparkles } from "lucide-react";
import type { Book, StudentUser } from "../types";
import { getStudentCurrentWeek } from "../utils/bookHelpers";
import { BookCover } from "./BookCover";

interface StudentHomeProps {
  user: StudentUser;
  book: Book;
  onStartWeek: (weekNum: 1 | 2 | 3 | 4) => void;
  onOpenCurriculum: (subview?: "hub" | "phonics" | "classcard") => void;
}

const WEEK_ITEMS: { week: 1 | 2 | 3 | 4; island: string; title: string; desc: string }[] = [
  {
    week: 1,
    island: "산호초 얕은 바다",
    title: "1주차 · 한 단어씩 천천히 읽기",
    desc: "단어 뜻을 확인하며 한 단어씩 천천히 소리 내어 따라 읽습니다."
  },
  {
    week: 2,
    island: "반짝이는 해류 길",
    title: "2주차 · 의미 단위(구) 끊어 읽기",
    desc: "문장을 자연스러운 의미 덩어리(구)로 나누어 읽고 표현 카드를 익힙니다."
  },
  {
    week: 3,
    island: "포포의 비밀 동굴",
    title: "3주차 · 줄거리 읽기 & 스피킹 대화",
    desc: "원서 이야기를 읽고 배운 표현을 활용해 포포의 질문에 답합니다."
  },
  {
    week: 4,
    island: "진주 보물섬",
    title: "4주차 · 전체 스토리 완성 & 리허설",
    desc: "원서 전체를 유창하게 완독하고 원어민 화상수업 리허설을 진행합니다."
  }
];

export const StudentHome: React.FC<StudentHomeProps> = ({
  user,
  book,
  onStartWeek,
  onOpenCurriculum
}) => {
  const activeWk = getStudentCurrentWeek(user);
  const totalPearls = Math.round(
    (((user.progress_w1 || 0) +
      (user.progress_w2 || 0) +
      (user.progress_w3 || 0) +
      (user.progress_w4 || 0)) /
      400) *
      12
  );

  const gradeTitle =
    user.grade_group === "grade_1_2"
      ? "초등 1~2학년 맞춤 20분 훈련"
      : user.grade_group === "grade_4_plus"
      ? "초등 3~5학년 40분 문장 훈련"
      : "초등 6학년 중등 대비 문법 훈련";

  const gradeDesc =
    user.grade_group === "grade_1_2"
      ? `통문자 파닉스(10분)와 클카 Level ${user.classcard_level || 2} 학습을 진행합니다.`
      : user.grade_group === "grade_4_plus"
      ? "1~5형식 핵심 문장 패턴 훈련과 클카 어휘 학습을 진행합니다."
      : "수동태(be+p.p.)와 간접의문문 어순 훈련 및 어휘 학습을 진행합니다.";

  return (
    <div className="space-y-8">
      {/* Ocean Voyage Hero Strip with Popo & 3D Pearl Treasure (no heavy boxes) */}
      <div className="relative pb-6 border-b border-[#e8dfd1] flex flex-col lg:flex-row items-start lg:items-center justify-between gap-5">
        <div className="flex items-center gap-4">
          <img
            src="/assets/popo-3d.jpg"
            alt="포포"
            className="w-16 h-16 md:w-20 md:h-20 rounded-full object-cover border-2 border-cyan-300 shadow-sm shrink-0"
          />
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              <span className="inline-block text-xs font-bold px-2.5 py-0.5 rounded-full bg-cyan-100/80 text-cyan-900">
                포포의 바다 영어 여행 · {activeWk}주차 항해 중
              </span>
              <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-800">
                <img
                  src="/assets/pearl-badge-3d.jpg"
                  alt="진주"
                  className="w-4 h-4 rounded-full object-cover"
                />
                모은 진주 {totalPearls} / 12개
              </span>
            </div>
            <h2 className="text-xl md:text-2xl font-bold text-slate-900">
              {user.name} 학생, 포포와 함께 바다 진주를 모으러 갈까요?
            </h2>
            <p className="text-sm text-slate-600 mt-0.5">
              《{book.title}》 항해를 완주하면 12개의 바다 진주가 보물함에 채워집니다.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 self-stretch lg:self-auto justify-between lg:justify-end">
          {/* Pearl Collection Progress Dots */}
          <div className="flex items-center gap-2.5 pr-3 border-r border-[#e8dfd1]">
            <img
              src="/assets/treasure-pearl-3d.jpg"
              alt="진주 보물함"
              className="w-11 h-11 rounded-2xl object-cover border border-amber-200 shadow-xs"
            />
            <div>
              <div className="text-[11px] font-bold text-slate-500">이번 달 진주 보물함</div>
              <div className="flex items-center gap-1 mt-1">
                {Array.from({ length: 12 }).map((_, idx) => (
                  <span
                    key={idx}
                    className={`w-2 h-2 rounded-full transition ${
                      idx < totalPearls
                        ? "bg-cyan-500 ring-2 ring-cyan-200"
                        : "bg-[#e3dac9]"
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onStartWeek(activeWk)}
            className="shrink-0 inline-flex items-center gap-2 px-6 py-3 rounded-full btn-water-glass font-bold text-sm"
          >
            {activeWk}주차 항해 시작
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Two-Column Editorial Flow separated by a clean vertical line */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left 7 Columns: 4-Week Ocean Voyage Roadmap */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between pb-2.5 border-b border-[#e8dfd1]">
            <div className="flex items-center gap-2.5">
              <img
                src="/assets/ocean-compass-3d.jpg"
                alt="항해 나침반"
                className="w-8 h-8 rounded-full object-cover border border-amber-200"
              />
              <h3 className="text-base font-bold text-slate-900">4주 바다 항해 로드맵</h3>
            </div>
            <span className="text-xs text-slate-500">섬을 누르면 해당 주차로 바로 이동합니다</span>
          </div>

          <div className="divide-y divide-[#e8dfd1]">
            {WEEK_ITEMS.map((item) => {
              const prog = (user[`progress_w${item.week}` as keyof StudentUser] as number) || 0;
              const isDone = prog >= 100;
              const isCurrent = item.week === activeWk;
              const isLocked = item.week > activeWk && prog === 0;

              return (
                <div
                  key={item.week}
                  onClick={() => onStartWeek(item.week)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === "Enter" && onStartWeek(item.week)}
                  className={`py-4 px-3.5 -mx-3 rounded-2xl transition cursor-pointer flex items-center justify-between gap-4 ${
                    isCurrent
                      ? "surface-water-glass"
                      : isLocked
                      ? "opacity-70 hover:opacity-100 hover:bg-[#f4efe5]"
                      : "hover:bg-[#f4efe5]"
                  }`}
                >
                  <div className="space-y-0.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`text-xs font-bold ${
                          isCurrent ? "text-cyan-700" : isDone ? "text-emerald-700" : "text-amber-700"
                        }`}
                      >
                        {item.island}
                      </span>
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 bg-amber-100/70 px-2 py-0.5 rounded-full">
                        <img
                          src="/assets/pearl-badge-3d.jpg"
                          alt="진주"
                          className="w-3.5 h-3.5 rounded-full object-cover"
                        />
                        진주 +3
                      </span>
                      {isCurrent && (
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-cyan-100 text-cyan-800">
                          현재 위치
                        </span>
                      )}
                    </div>
                    <h4 className="text-base font-bold text-slate-900">{item.title}</h4>
                    <p className="text-xs text-slate-600">{item.desc}</p>
                  </div>

                  <div className="shrink-0">
                    {isCurrent ? (
                      <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full btn-water-glass text-xs font-bold">
                        출발하기
                        <ArrowRight className="w-3.5 h-3.5" />
                      </span>
                    ) : isDone ? (
                      <span className="inline-flex items-center gap-1 text-emerald-700 text-xs font-bold">
                        <CheckCircle2 className="w-4 h-4" />
                        진주 획득
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-slate-400 text-xs font-semibold">
                        <Lock className="w-3.5 h-3.5" />
                        대기 중
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right 5 Columns: Assigned Book Cover & Grade Playground */}
        <div className="lg:col-span-5 lg:border-l lg:border-[#e8dfd1] lg:pl-8 space-y-7">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <BookOpen className="w-4 h-4 text-cyan-700" />
                이번 항해 원서
              </h3>
              <span className="text-xs font-semibold text-amber-800">{book.level}</span>
            </div>

            <BookCover book={book} size="md" onClick={() => onStartWeek(activeWk)} />

            <div className="flex items-center justify-between pt-1 text-xs text-slate-600">
              <span>
                핵심 어휘 {(book.vocab || []).length}개 · 표현 {(book.core_expressions || []).length}개
              </span>
              <button
                type="button"
                onClick={() => onStartWeek(activeWk)}
                className="font-bold text-sky-700 hover:text-sky-800"
              >
                책 펼치기 →
              </button>
            </div>
          </div>

          <div className="pt-6 border-t border-[#e8dfd1] space-y-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-600" />
              {gradeTitle}
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">{gradeDesc}</p>

            {user.grade_group === "grade_1_2" && (
              <div className="divide-y divide-[#e8dfd1] border-y border-[#e8dfd1]">
                <button
                  type="button"
                  onClick={() => onOpenCurriculum("phonics")}
                  className="w-full py-3 text-left flex items-center justify-between text-xs font-bold text-slate-800 hover:text-sky-700 transition"
                >
                  <span>통문자 파닉스 연습</span>
                  <span className="text-sky-600">들어가기 →</span>
                </button>
                <button
                  type="button"
                  onClick={() => onOpenCurriculum("classcard")}
                  className="w-full py-3 text-left flex items-center justify-between text-xs font-bold text-slate-800 hover:text-sky-700 transition"
                >
                  <span>초등필수 클카 단어 &amp; 퀴즈</span>
                  <span className="text-sky-600">들어가기 →</span>
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={() => onOpenCurriculum("hub")}
              className="w-full py-2.5 px-4 rounded-full bg-amber-100/80 hover:bg-amber-200/80 text-amber-950 font-bold text-xs transition"
            >
              맞춤 훈련소 열기
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

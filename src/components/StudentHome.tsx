import React, { useEffect, useState } from "react";
import { ArrowRight, BookOpen, CheckCircle2, Lock, Sparkles, X } from "lucide-react";
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

  const [showTreasureModal, setShowTreasureModal] = useState(false);
  const [animPearls, setAnimPearls] = useState(0);

  useEffect(() => {
    if (!showTreasureModal) return;
    setAnimPearls(0);
    if (totalPearls <= 0) return;
    let cur = 0;
    const timer = window.setInterval(() => {
      cur += 1;
      setAnimPearls(cur);
      if (cur >= totalPearls) {
        window.clearInterval(timer);
      }
    }, 240);
    return () => window.clearInterval(timer);
  }, [showTreasureModal, totalPearls]);

  const popoStageIdx =
    animPearls <= 0 ? 0 : Math.min(3, Math.floor((animPearls - 1) / 3));

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
              <button
                type="button"
                onClick={() => setShowTreasureModal(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full surface-water-glass text-xs font-bold text-sky-900 hover:brightness-105 transition cursor-pointer"
              >
                <img
                  src="/assets/pearl-badge-3d.jpg"
                  alt="진주"
                  className="w-4 h-4 rounded-full object-cover"
                />
                {user.name} 대원의 보물함 ({totalPearls}/12)
              </button>
            </div>
            <h2 className="text-xl md:text-2xl font-bold text-slate-900">
              {user.name} 학생, 포포와 함께 바다 진주를 모으러 갈까요?
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-4 self-stretch lg:self-auto justify-between lg:justify-end">
          {/* Pearl Collection Progress Dots */}
          <button
            type="button"
            onClick={() => setShowTreasureModal(true)}
            className="flex items-center gap-2.5 pr-3 border-r border-[#e8dfd1] text-left hover:opacity-85 transition cursor-pointer"
          >
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
          </button>

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

      {/* Animated Pearl Treasure Chest Voyage Popup */}
      {showTreasureModal && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/55 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setShowTreasureModal(false)}
        >
          <div
            className="w-full max-w-2xl rounded-3xl bg-[#fdfaf2] border border-[#e5dcc9] shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-6 py-4 bg-gradient-to-r from-sky-100/80 via-cyan-50 to-amber-50 border-b border-[#e5dcc9] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img
                  src="/assets/treasure-pearl-3d.jpg"
                  alt="보물함"
                  className="w-10 h-10 rounded-xl object-cover border border-amber-200 shadow-xs"
                />
                <div>
                  <h3 className="text-base md:text-lg font-bold text-slate-900">
                    {user.name} 대원의 바다 진주 보물함
                  </h3>
                  <p className="text-xs text-slate-600">
                    진주가 3개씩 모일 때마다 포포가 다음 바다 섬으로 헤엄쳐 갑니다.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowTreasureModal(false)}
                className="p-2 rounded-full hover:bg-white/80 text-slate-500 transition"
                aria-label="닫기"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* 4-Stage Ocean Path with Swimming Popo */}
              <div className="relative rounded-2xl bg-gradient-to-b from-sky-100/75 via-cyan-50/75 to-sky-100/60 border border-sky-200/80 p-5 overflow-hidden">
                {/* Swimming Popo gliding across the 4 islands */}
                <div className="relative h-16 mb-3">
                  <div className="absolute inset-x-6 top-1/2 -translate-y-1/2 h-1.5 rounded-full bg-white/80 border border-sky-200/70 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-sky-400 to-cyan-500 transition-all duration-700 ease-out"
                      style={{ width: `${Math.min(100, Math.round((animPearls / 12) * 100))}%` }}
                    />
                  </div>

                  <div
                    className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 transition-all duration-700 ease-out z-10"
                    style={{
                      left:
                        animPearls === 0
                          ? "10%"
                          : `${Math.min(89, 12 + popoStageIdx * 25.5)}%`
                    }}
                  >
                    <div className="animate-popo-swim relative">
                      <img
                        src="/assets/popo-3d.jpg"
                        alt="헤엄치는 포포"
                        className="w-14 h-14 rounded-full object-cover border-2 border-white shadow-md ring-2 ring-sky-300/70"
                      />
                      <span className="animate-bubble-1 absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-white/85 border border-sky-300" />
                      <span className="animate-bubble-2 absolute top-1 -right-3 w-2 h-2 rounded-full bg-white/75 border border-sky-200" />
                    </div>
                  </div>
                </div>

                {/* 4 Island Checkpoints */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {WEEK_ITEMS.map((stage, idx) => {
                    const stageStart = idx * 3;
                    const stageFilled = Math.max(0, Math.min(3, animPearls - stageStart));
                    const isStageReached = animPearls > stageStart;
                    const isStageComplete = stageFilled === 3;
                    return (
                      <div
                        key={stage.week}
                        className={`rounded-xl p-3 border transition-all duration-500 ${
                          isStageComplete
                            ? "bg-white/95 border-cyan-400 shadow-xs"
                            : isStageReached
                            ? "surface-water-glass"
                            : "bg-white/55 border-sky-200/60 opacity-75"
                        }`}
                      >
                        <div className="text-[11px] font-bold text-sky-800">
                          {stage.week}주차 항해
                        </div>
                        <div className="text-xs font-bold text-slate-900 mt-0.5">
                          {stage.island}
                        </div>
                        <div className="flex items-center gap-1 mt-2">
                          {[0, 1, 2].map((dot) => (
                            <img
                              key={dot}
                              src="/assets/pearl-badge-3d.jpg"
                              alt="진주"
                              className={`w-4 h-4 rounded-full object-cover transition-all duration-300 ${
                                dot < stageFilled
                                  ? "scale-105 opacity-100 ring-1 ring-cyan-400"
                                  : "scale-90 opacity-25 grayscale"
                              }`}
                            />
                          ))}
                          <span className="ml-auto text-[10px] font-bold text-slate-500">
                            {stageFilled}/3
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Treasure Chest & 12 Individual Pearls Filling Up */}
              <div className="flex flex-col sm:flex-row items-center gap-5 rounded-2xl bg-[#f7f2e7] border border-[#e5dcc9] p-4">
                <div className="relative shrink-0">
                  <img
                    src="/assets/treasure-pearl-3d.jpg"
                    alt="진주 보물함"
                    className="w-24 h-24 rounded-2xl object-cover border-2 border-amber-300 shadow-md"
                  />
                  <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 whitespace-nowrap px-2.5 py-0.5 rounded-full bg-amber-900 text-amber-50 text-[11px] font-bold shadow-xs">
                    {animPearls} / 12 진주
                  </span>
                </div>

                <div className="flex-1 w-full space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800">
                      보물함에 차곡차곡 모인 바다 진주
                    </span>
                    <span className="text-xs font-bold text-sky-700">
                      {animPearls === 12
                        ? "보물함 완성! 대단해요!"
                        : `${12 - animPearls}개 더 모으면 보물함 완성!`}
                    </span>
                  </div>
                  <div className="grid grid-cols-6 sm:grid-cols-12 gap-2 pt-1">
                    {Array.from({ length: 12 }).map((_, idx) => {
                      const filled = idx < animPearls;
                      return (
                        <div
                          key={idx}
                          className={`aspect-square rounded-full flex items-center justify-center border transition-all duration-300 ${
                            filled
                              ? "bg-white border-cyan-400 shadow-sm scale-105"
                              : "bg-[#efe7d6] border-[#ddd2bc] scale-95"
                          }`}
                        >
                          <img
                            src="/assets/pearl-badge-3d.jpg"
                            alt={`진주 ${idx + 1}`}
                            className={`w-full h-full rounded-full object-cover transition-all duration-300 ${
                              filled ? "opacity-100 scale-100" : "opacity-20 grayscale scale-75"
                            }`}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowTreasureModal(false)}
                  className="px-6 py-2 rounded-full btn-water-glass text-xs font-bold"
                >
                  확인
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

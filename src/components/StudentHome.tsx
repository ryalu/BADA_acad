import React, { useEffect, useState } from "react";
import { ArrowRight, BookOpen, Lock, Sparkles, X } from "lucide-react";
import type { Book, StudentUser } from "../types";
import { getStudentCurrentWeek } from "../utils/bookHelpers";
import { BookCover } from "./BookCover";

const TREASURE_STAGES = [
  {
    week: 1,
    name: "산호초 얕은 바다",
    img: "/assets/stage-coral-3d.jpg",
    xPct: 13,
    yPct: 28,
    popoLeft: "13%",
    popoTop: "14%"
  },
  {
    week: 2,
    name: "반짝이는 해류 길",
    img: "/assets/stage-current-3d.jpg",
    xPct: 38,
    yPct: 72,
    popoLeft: "38%",
    popoTop: "56%"
  },
  {
    week: 3,
    name: "포포의 비밀 동굴",
    img: "/assets/stage-cave-3d.jpg",
    xPct: 63,
    yPct: 28,
    popoLeft: "63%",
    popoTop: "14%"
  },
  {
    week: 4,
    name: "진주 보물섬",
    img: "/assets/stage-island-3d.jpg",
    xPct: 87,
    yPct: 72,
    popoLeft: "87%",
    popoTop: "56%"
  }
];

interface StudentHomeProps {
  user: StudentUser;
  book: Book;
  onStartWeek: (weekNum: 1 | 2 | 3 | 4) => void;
  onOpenCurriculum: (subview?: "hub" | "phonics" | "classcard") => void;
}

const WEEK_ITEMS: { week: 1 | 2 | 3 | 4; island: string; title: string; desc: string }[] = [
  {
    week: 1,
    island: "STAGE 1",
    title: "한 단어씩 천천히 읽기",
    desc: "단어 뜻을 확인하며 한 단어씩 천천히 소리 내어 따라 말해봐요."
  },
  {
    week: 2,
    island: "STAGE 2",
    title: "의미 단위로 끊어 읽기",
    desc: "새로운 표현을 따라 말하면서 익혀봐요."
  },
  {
    week: 3,
    island: "STAGE 3",
    title: "문장 단위로 말하기",
    desc: "한 문장씩 자신있게 읽고 연습해요."
  },
  {
    week: 4,
    island: "STAGE 4",
    title: "스토리 마스터",
    desc: "원서 전체를 유창하게 완독하고 나만의 영어로 말해요."
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

        <div className="flex items-center gap-4 self-stretch lg:self-auto justify-end">
          <button
            type="button"
            onClick={() => onStartWeek(activeWk)}
            className="shrink-0 inline-flex items-center gap-2 px-6 py-3 rounded-full btn-water-glass font-bold text-sm"
          >
            {activeWk}주차 탐험 시작
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
                alt="탐험 나침반"
                className="w-8 h-8 rounded-full object-cover border border-amber-200"
              />
              <h3 className="text-base font-bold text-slate-900">나만의 바다 탐험 지도</h3>
            </div>
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
                  className={`py-4 px-3.5 -mx-3 rounded-2xl transition cursor-pointer flex items-center justify-between gap-4 ${isCurrent
                    ? "surface-water-glass"
                    : isLocked
                      ? "opacity-70 hover:opacity-100 hover:bg-[#f4efe5]"
                      : "hover:bg-[#f4efe5]"
                    }`}
                >
                  <div className="space-y-0.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`text-xs font-bold ${isCurrent ? "text-cyan-700" : isDone ? "text-emerald-700" : "text-amber-700"
                          }`}
                      >
                        {item.island}
                      </span>
                      {isCurrent && (
                        <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full surface-water-glass text-sky-900">
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
                      <span className="inline-flex items-center gap-1.5 text-emerald-700 text-xs font-bold">
                        <img
                          src="/assets/pearl-badge-3d.jpg"
                          alt="진주"
                          className="w-4 h-4 rounded-full object-cover shadow-xs"
                        />
                        탐험 완료
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
                이번 탐험 원서
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

            <div className="p-5 md:p-6 space-y-5">
              {/* Zigzag Winding Ocean Voyage Map with 4 3D Stage Images & Swimming Popo */}
              <div className="relative rounded-2xl bg-gradient-to-b from-sky-100/80 via-cyan-50/85 to-sky-100/75 border border-sky-200/80 p-4 overflow-hidden">
                {/* Desktop / Tablet Zigzag Curved Path Container */}
                <div className="relative h-[265px] w-full hidden sm:block">
                  {/* Winding S-Curve Path wrapping around the 4 zigzag locations */}
                  <svg
                    viewBox="0 0 800 265"
                    preserveAspectRatio="none"
                    className="absolute inset-0 w-full h-full pointer-events-none"
                  >
                    <defs>
                      <linearGradient id="voyageGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#38bdf8" />
                        <stop offset="50%" stopColor="#06b6d4" />
                        <stop offset="100%" stopColor="#0284c7" />
                      </linearGradient>
                    </defs>
                    {/* Soft background wave trail */}
                    <path
                      d="M 40 120 C 70 30, 145 30, 195 130 C 245 230, 355 230, 405 130 C 455 30, 555 30, 605 130 C 655 230, 730 220, 765 155"
                      fill="none"
                      stroke="rgba(14, 165, 233, 0.24)"
                      strokeWidth="6"
                      strokeLinecap="round"
                      strokeDasharray="10 10"
                    />
                    {/* Animated glowing progress path */}
                    <path
                      d="M 40 120 C 70 30, 145 30, 195 130 C 245 230, 355 230, 405 130 C 455 30, 555 30, 605 130 C 655 230, 730 220, 765 155"
                      fill="none"
                      stroke="url(#voyageGrad)"
                      strokeWidth="6"
                      strokeLinecap="round"
                      pathLength={100}
                      strokeDasharray="100"
                      strokeDashoffset={100 - Math.min(100, Math.round((animPearls / 12) * 100))}
                      style={{ transition: "stroke-dashoffset 0.7s ease-out" }}
                    />
                  </svg>

                  {/* 4 Zigzag 3D Stage Islands with 3 Pearls Attached to Each */}
                  {TREASURE_STAGES.map((stage, idx) => {
                    const stageStart = idx * 3;
                    const stageFilled = Math.max(0, Math.min(3, animPearls - stageStart));
                    const isStageReached = animPearls > stageStart;
                    const isStageComplete = stageFilled === 3;
                    return (
                      <div
                        key={stage.week}
                        className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center z-10"
                        style={{ left: `${stage.xPct}%`, top: `${stage.yPct}%` }}
                      >
                        <div className="relative">
                          <img
                            src={stage.img}
                            alt={stage.name}
                            className={`w-20 h-20 rounded-full object-cover border-[3px] shadow-md transition-all duration-500 ${isStageComplete
                                ? "border-cyan-400 ring-4 ring-cyan-200/70 scale-105"
                                : isStageReached
                                  ? "border-sky-300 ring-2 ring-sky-200/60"
                                  : "border-white/80 opacity-80 grayscale-[25%]"
                              }`}
                          />
                          {/* 3 Pearls attached along the bottom rim of each location */}
                          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-white/90 backdrop-blur-xs px-1.5 py-0.5 rounded-full border border-sky-200 shadow-xs">
                            {[0, 1, 2].map((dot) => (
                              <img
                                key={dot}
                                src="/assets/pearl-badge-3d.jpg"
                                alt="진주"
                                className={`w-4 h-4 rounded-full object-cover transition-all duration-300 ${dot < stageFilled
                                    ? "scale-110 opacity-100 ring-1 ring-cyan-400"
                                    : "scale-90 opacity-25 grayscale"
                                  }`}
                              />
                            ))}
                          </div>
                        </div>
                        <span className="mt-3 px-2.5 py-0.5 rounded-full bg-white/90 border border-sky-200/80 text-[11px] font-bold text-slate-800 whitespace-nowrap shadow-xs">
                          {stage.name}
                        </span>
                      </div>
                    );
                  })}

                  {/* Swimming Popo Gliding Up & Down Along the Zigzag Path */}
                  <div
                    className="absolute -translate-x-1/2 -translate-y-1/2 transition-all duration-700 ease-in-out z-20 pointer-events-none"
                    style={{
                      left: animPearls === 0 ? "6%" : TREASURE_STAGES[popoStageIdx].popoLeft,
                      top: animPearls === 0 ? "44%" : TREASURE_STAGES[popoStageIdx].popoTop
                    }}
                  >
                    <div className="animate-popo-swim relative">
                      <img
                        src="/assets/popo-3d.jpg"
                        alt="헤엄치는 포포"
                        className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-lg ring-2 ring-cyan-300"
                      />
                      <span className="animate-bubble-1 absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-white/90 border border-sky-300" />
                      <span className="animate-bubble-2 absolute top-1 -right-3 w-2 h-2 rounded-full bg-white/80 border border-sky-200" />
                    </div>
                  </div>
                </div>

                {/* Mobile Fallback Zigzag Grid */}
                <div className="grid grid-cols-2 gap-3 sm:hidden">
                  {TREASURE_STAGES.map((stage, idx) => {
                    const stageStart = idx * 3;
                    const stageFilled = Math.max(0, Math.min(3, animPearls - stageStart));
                    const isActive = animPearls > 0 && popoStageIdx === idx;
                    return (
                      <div
                        key={stage.week}
                        className={`rounded-xl p-2.5 border flex flex-col items-center text-center gap-1.5 ${idx % 2 === 1 ? "mt-4" : ""
                          } ${isActive ? "surface-water-glass" : "bg-white/75 border-sky-200/70"
                          }`}
                      >
                        <div className="relative">
                          <img
                            src={stage.img}
                            alt={stage.name}
                            className="w-16 h-16 rounded-full object-cover border-2 border-white shadow-sm"
                          />
                          {isActive && (
                            <img
                              src="/assets/popo-3d.jpg"
                              alt="포포"
                              className="animate-popo-swim w-8 h-8 rounded-full object-cover border-2 border-white shadow absolute -top-2 -right-2"
                            />
                          )}
                        </div>
                        <div className="text-[11px] font-bold text-slate-900">{stage.name}</div>
                        <div className="flex items-center gap-1">
                          {[0, 1, 2].map((dot) => (
                            <img
                              key={dot}
                              src="/assets/pearl-badge-3d.jpg"
                              alt="진주"
                              className={`w-3.5 h-3.5 rounded-full object-cover ${dot < stageFilled ? "opacity-100" : "opacity-25 grayscale"
                                }`}
                            />
                          ))}
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
                          className={`aspect-square rounded-full flex items-center justify-center border transition-all duration-300 ${filled
                            ? "bg-white border-cyan-400 shadow-sm scale-105"
                            : "bg-[#efe7d6] border-[#ddd2bc] scale-95"
                            }`}
                        >
                          <img
                            src="/assets/pearl-badge-3d.jpg"
                            alt={`진주 ${idx + 1}`}
                            className={`w-full h-full rounded-full object-cover transition-all duration-300 ${filled ? "opacity-100 scale-100" : "opacity-20 grayscale scale-75"
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

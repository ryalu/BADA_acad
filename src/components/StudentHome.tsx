import React, { useEffect, useState } from "react";
import {
  ArrowRight,
  Award,
  BookOpen,
  CheckCircle2,
  GraduationCap,
  Layers,
  Sparkles,
  X
} from "lucide-react";
import type { Book, StudentUser, StudentVocabState } from "../types";
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

const WEEK_SHORT_TITLE: Record<1 | 2 | 3 | 4, string> = {
  1: "한 단어씩 읽기",
  2: "의미 단위 끊어 읽기",
  3: "문장 단위로 말하기",
  4: "스토리 마스터"
};

function getKstTodayDateString(): string {
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Seoul",
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    }).format(new Date());
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}

interface StudentHomeProps {
  user: StudentUser;
  book: Book;
  onStartWeek: (weekNum: 1 | 2 | 3 | 4) => void;
  onOpenVocab: () => void;
  onOpenAgeTrack: () => void;
}

const PopoCompleteStamp: React.FC = () => (
  <div
    aria-label="탐험 완료!"
    className="absolute inset-0 z-20 flex items-center justify-center bg-white/15 backdrop-blur-[2px] cursor-not-allowed select-none"
  >
    <div className="animate-popo-stamp w-44 h-44 rounded-full border-[4px] border-double border-sky-700/85 bg-white/80 backdrop-blur-md shadow-xl ring-4 ring-white/65 flex flex-col items-center justify-center gap-1.5">
      <img
        src="/assets/popo-3d.jpg"
        alt="포포 도장"
        className="w-20 h-20 rounded-full object-cover border-2 border-sky-500 shadow-sm"
      />
      <span className="text-lg font-black tracking-tight text-sky-900 leading-none">
        탐험 완료!
      </span>
      <span className="text-[10px] font-extrabold tracking-widest text-sky-700/85 uppercase">
        BADA CLEAR
      </span>
    </div>
  </div>
);

export const StudentHome: React.FC<StudentHomeProps> = ({
  user,
  book,
  onStartWeek,
  onOpenVocab,
  onOpenAgeTrack
}) => {
  const activeWk = getStudentCurrentWeek(user);
  const activeWeekProg = Number(user[`progress_w${activeWk}` as keyof StudentUser] || 0);
  const completedDays = Math.min(5, Math.round(activeWeekProg / 20));
  const todayKst = getKstTodayDateString();

  const todayBookDone = Object.entries(user.daily_study_dates || {}).some(
    ([k, v]) => /^w[1-4]$/.test(k) && v === todayKst
  );
  const todayAgeDone = user.daily_study_dates?.age_track === todayKst;

  const totalPearls = Math.round(
    (((user.progress_w1 || 0) +
      (user.progress_w2 || 0) +
      (user.progress_w3 || 0) +
      (user.progress_w4 || 0)) /
      400) *
    12
  );

  const [vocabState, setVocabState] = useState<StudentVocabState | null>(null);
  const [showTreasureModal, setShowTreasureModal] = useState(false);
  const [animPearls, setAnimPearls] = useState(0);

  useEffect(() => {
    let active = true;
    const loadVocab = async () => {
      try {
        const res = await fetch(`/api/vocab/state?userId=${encodeURIComponent(user.id)}`);
        if (!res.ok) return;
        const data = await res.json();
        if (active && data.ok) {
          const { ok: _ok, ...rest } = data;
          setVocabState(rest as StudentVocabState);
        }
      } catch {
        // ignore network hiccup on home badge fetch
      }
    };
    void loadVocab();
    return () => {
      active = false;
    };
  }, [user.id]);

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

  const ageNum = user.age || 8;
  const ageTrackNum = ageNum <= 7 ? 7 : ageNum === 8 ? 8 : 9;
  const ageFocusTags =
    ageTrackNum === 7
      ? ["알파벳 음가", "짧은 문장 쉐도잉", "기초 어휘"]
      : ageTrackNum === 8
        ? ["소리 블렌딩", "단어 인지 퀴즈", "패턴 읽기"]
        : ["품사 블록", "1~3형식 문장", "직접 말하기"];

  const currentVocabStage = vocabState?.progress.current_stage || 1;
  const s1Unit = vocabState?.units.stage1.find(
    (u) => u.unit_key === vocabState.progress.current_unit_key
  );
  const s2Unit = vocabState?.units.stage2.find(
    (u) => u.id === vocabState.progress.current_s2_unit
  );
  const s3Unit = vocabState?.units.stage3.find(
    (u) => u.id === vocabState.progress.current_s3_unit
  );
  const todayVocabDone = Boolean(vocabState?.todayDailyQuizDone);
  const vocabNeedsPronunciation = Boolean(
    vocabState?.todayQuizAttempted && !vocabState?.todayPronunciationDone
  );
  const monthReady = Boolean(vocabState?.monthReady);
  const daysElapsed = vocabState?.daysElapsed || 0;
  const monthProgressPct = Math.min(100, Math.round((daysElapsed / 30) * 100));

  const completedMissionCount = [todayBookDone, todayVocabDone, todayAgeDone].filter(Boolean).length;

  return (
    <div className="space-y-7">
      {/* Compact Hero Greeting Strip */}
      <div className="pb-5 border-b border-[#e8dfd1] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <img
            src="/assets/popo-3d.jpg"
            alt="포포"
            className="w-16 h-16 rounded-full object-cover border-2 border-cyan-300 shadow-sm shrink-0"
          />
          <div className="space-y-0.5">
            <p
              className={`text-xs font-extrabold ${completedMissionCount === 3 ? "text-emerald-700" : "text-cyan-700"
                }`}
            >
              {completedMissionCount === 3
                ? "오늘의 3가지 미션을 모두 완료했어요!"
                : `${user.grade_label} · 오늘 미션 ${completedMissionCount}/3 완료`}
            </p>
            <h2 className="text-xl md:text-2xl font-extrabold text-slate-900">
              {user.name} 대원, 오늘의 3가지 미션!
            </h2>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowTreasureModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full surface-water-glass text-xs md:text-sm font-extrabold text-sky-900 hover:brightness-105 transition cursor-pointer shrink-0"
        >
          <img
            src="/assets/pearl-badge-3d.jpg"
            alt="진주"
            className="w-5 h-5 rounded-full object-cover"
          />
          보물함 {totalPearls}/12 진주
        </button>
      </div>

      {/* 3-Column Bento Mission Board (Clear Frosted Glass + Popo Stamp) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
        {/* Card 1: Today's Storybook Reading */}
        <section className="card-clear-glass rounded-3xl p-6 flex flex-col justify-between gap-5 overflow-hidden">
          {todayBookDone && <PopoCompleteStamp />}

          <div className={`space-y-4 ${todayBookDone ? "opacity-45 pointer-events-none select-none" : ""}`}>
            <div className="flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/55 border border-white/80 text-slate-800 text-xs font-extrabold">
                <BookOpen className="w-3.5 h-3.5 text-sky-700" />
                01 · 오늘의 원서
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/45 border border-white/75 text-slate-700 text-xs font-bold">
                {todayBookDone ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-sky-700" />
                    탐험 완료!
                  </>
                ) : (
                  `${activeWk}주차 · ${completedDays}/5일`
                )}
              </span>
            </div>

            <div className="flex items-center gap-4">
              <div className="shrink-0">
                <BookCover
                  book={book}
                  size="sm"
                  onClick={todayBookDone ? undefined : () => onStartWeek(activeWk)}
                />
              </div>
              <div className="min-w-0 space-y-2">
                <div>
                  <div className="text-xs font-bold text-cyan-800">
                    {activeWk}주차 · {WEEK_SHORT_TITLE[activeWk]}
                  </div>
                  <h3 className="storybook-font text-base font-black text-slate-900 truncate">
                    {book.title}
                  </h3>
                </div>
                <div className="flex items-center gap-1.5" aria-label={`5일 중 ${completedDays}일 완료`}>
                  {[0, 1, 2, 3, 4].map((dot) => (
                    <span
                      key={dot}
                      className={`w-3.5 h-3.5 rounded-full border transition ${dot < completedDays
                        ? "bg-sky-400 border-sky-500 shadow-xs"
                        : "bg-white/45 border-white/80"
                        }`}
                    />
                  ))}
                  <span className="ml-1 text-[11px] font-bold text-slate-600">
                    {completedDays}/5일
                  </span>
                </div>
              </div>
            </div>
          </div>

          {todayBookDone ? (
            <button
              type="button"
              disabled
              className="w-full py-3.5 px-5 rounded-2xl btn-clear-glass opacity-65 text-base font-extrabold inline-flex items-center justify-center gap-2 cursor-not-allowed"
            >
              <CheckCircle2 className="w-5 h-5" />
              탐험 완료!
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onStartWeek(activeWk)}
              className="w-full py-3.5 px-5 rounded-2xl btn-water-glass text-base font-extrabold inline-flex items-center justify-center gap-2"
            >
              원서 펼치기
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </section>

        {/* Card 2: 3-Stage Vocabulary */}
        <section className="card-clear-glass rounded-3xl p-6 flex flex-col justify-between gap-5 overflow-hidden">
          {todayVocabDone && <PopoCompleteStamp />}

          <div className={`space-y-4 ${todayVocabDone ? "opacity-45 pointer-events-none select-none" : ""}`}>
            <div className="flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/55 border border-white/80 text-slate-800 text-xs font-extrabold">
                <Award className="w-3.5 h-3.5 text-amber-700" />
                02 · 영단어 학습
              </span>
              <span
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${monthReady && !todayVocabDone
                  ? "bg-amber-100/80 text-amber-900 border border-amber-200"
                  : "bg-white/45 border border-white/75 text-slate-700"
                  }`}
              >
                {todayVocabDone ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-sky-700" />
                    탐험 완료!
                  </>
                ) : vocabNeedsPronunciation ? (
                  "발음 마무리 남음"
                ) : monthReady ? (
                  "파이널 테스트 가능!"
                ) : (
                  `D+${daysElapsed + 1} · 30일`
                )}
              </span>
            </div>

            <div className="rounded-2xl bg-white/40 border border-white/75 backdrop-blur-sm p-4 flex items-center gap-4">
              {currentVocabStage === 1 ? (
                <>
                  <div className="w-16 h-16 rounded-2xl surface-water-glass border border-sky-300 flex items-center justify-center shrink-0">
                    <span className="storybook-font text-3xl font-black text-sky-900">
                      {s1Unit?.unit_key || "A"}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <div className="text-xs font-bold text-sky-800">
                      1단계 · 알파벳 순서 {s1Unit ? `(${s1Unit.word_count}단어)` : ""}
                    </div>
                    <div className="text-sm font-extrabold text-slate-900 truncate">
                      {s1Unit?.title_kr || "A 단어 · 첫소리"}
                    </div>
                    <div className="w-full h-2 rounded-full bg-white/55 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-sky-500 transition-all"
                        style={{ width: `${Math.max(8, monthProgressPct)}%` }}
                      />
                    </div>
                  </div>
                </>
              ) : currentVocabStage === 2 ? (
                <>
                  <div className="px-3.5 py-3 rounded-2xl bg-rose-50/80 border border-rose-200 shrink-0">
                    <span className="storybook-font text-2xl font-black text-slate-900">
                      tr
                      <span className="text-rose-600 underline decoration-rose-400">ai</span>
                      n
                    </span>
                  </div>
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="text-xs font-bold text-rose-600">2단계 · 파닉스</div>
                    <div className="text-sm font-extrabold text-slate-900 truncate">
                      {s2Unit?.title_kr || "장모음 A · ai / ay"}
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="px-3 py-3 rounded-2xl bg-white/55 border border-white/80 shrink-0 text-center">
                    <span className="storybook-font text-lg font-black text-rose-600">un-</span>
                    <span className="mx-1 text-slate-400 font-bold">+</span>
                    <span className="storybook-font text-lg font-black text-slate-900">happy</span>
                  </div>
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="text-xs font-bold text-sky-800">3단계 · 접두·접미사</div>
                    <div className="text-sm font-extrabold text-slate-900 truncate">
                      {s3Unit?.title_kr || "접두어 un- (반대)"}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {todayVocabDone ? (
            <button
              type="button"
              disabled
              className="w-full py-3.5 px-5 rounded-2xl btn-clear-glass opacity-65 text-base font-extrabold inline-flex items-center justify-center gap-2 cursor-not-allowed"
            >
              <CheckCircle2 className="w-5 h-5" />
              탐험 완료!
            </button>
          ) : (
            <button
              type="button"
              onClick={onOpenVocab}
              className="w-full py-3.5 px-5 rounded-2xl btn-water-glass text-base font-extrabold inline-flex items-center justify-center gap-2"
            >
              {vocabNeedsPronunciation ? "헷갈리는 발음 마무리하기" : "단어 시작하기"}
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </section>

        {/* Card 3: Age-Specific Curriculum */}
        <section className="card-clear-glass rounded-3xl p-6 flex flex-col justify-between gap-5 overflow-hidden">
          {todayAgeDone && <PopoCompleteStamp />}

          <div className={`space-y-4 ${todayAgeDone ? "opacity-45 pointer-events-none select-none" : ""}`}>
            <div className="flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/55 border border-white/80 text-slate-800 text-xs font-extrabold">
                <Layers className="w-3.5 h-3.5 text-emerald-700" />
                03 · 연령별 커리큘럼
              </span>
            </div>

            <div className="rounded-2xl bg-white/40 border border-white/75 backdrop-blur-sm p-4 space-y-2.5">
              {ageTrackNum === 7 ? (
                <div className="flex items-center gap-2">
                  {["Aa", "Bb", "Cc"].map((letter) => (
                    <span
                      key={letter}
                      className="storybook-font flex-1 py-2 rounded-xl bg-white/55 border border-white/80 text-center text-lg font-black text-sky-900"
                    >
                      {letter}
                    </span>
                  ))}
                </div>
              ) : ageTrackNum === 8 ? (
                <div className="flex items-center justify-center gap-2 storybook-font">
                  <span className="px-3 py-1.5 rounded-xl bg-sky-100/80 text-sky-900 text-lg font-black">
                    c
                  </span>
                  <span className="text-slate-400 font-bold">+</span>
                  <span className="px-3 py-1.5 rounded-xl bg-amber-100/80 text-amber-900 text-lg font-black">
                    at
                  </span>
                  <span className="text-slate-400 font-bold">=</span>
                  <span className="px-3.5 py-1.5 rounded-xl surface-water-glass text-slate-900 text-lg font-black">
                    cat
                  </span>
                </div>
              ) : (
                <div className="flex flex-wrap items-center gap-1.5 storybook-font">
                  <span className="px-2.5 py-1.5 rounded-xl bg-sky-50/85 border border-sky-200 text-sky-800 text-sm font-black">
                    Popo <span className="text-[10px] font-sans">명사</span>
                  </span>
                  <span className="px-2.5 py-1.5 rounded-xl bg-amber-50/85 border border-amber-200 text-amber-800 text-sm font-black">
                    is <span className="text-[10px] font-sans">동사</span>
                  </span>
                  <span className="px-2.5 py-1.5 rounded-xl bg-emerald-50/85 border border-emerald-200 text-emerald-800 text-sm font-black">
                    happy <span className="text-[10px] font-sans">형용사</span>
                  </span>
                </div>
              )}

              <div className="text-sm font-extrabold text-slate-900 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                {ageTrackNum === 7
                  ? "7세 · 알파벳 & 짧은 쉐도잉"
                  : ageTrackNum === 8
                    ? "8세 · 소리 조합 & 단어 인지"
                    : "9세 · 품사 & 1~3형식 말하기"}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              {ageFocusTags.map((tag) => (
                <span
                  key={tag}
                  className="px-3 py-1.5 rounded-xl bg-white/45 border border-white/80 text-xs font-bold text-slate-800"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>

          {todayAgeDone ? (
            <button
              type="button"
              disabled
              className="w-full py-3.5 px-5 rounded-2xl btn-clear-glass opacity-65 text-base font-extrabold inline-flex items-center justify-center gap-2 cursor-not-allowed"
            >
              <CheckCircle2 className="w-5 h-5" />
              탐험 완료!
            </button>
          ) : (
            <button
              type="button"
              onClick={onOpenAgeTrack}
              className="w-full py-3.5 px-5 rounded-2xl btn-water-glass text-base font-extrabold inline-flex items-center justify-center gap-2"
            >
              연령별 훈련
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </section>
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
              <div className="relative rounded-2xl bg-gradient-to-b from-sky-100/80 via-cyan-50/85 to-sky-100/75 border border-sky-200/80 p-4 overflow-hidden">
                <div className="relative h-[265px] w-full hidden sm:block">
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
                    <path
                      d="M 40 120 C 70 30, 145 30, 195 130 C 245 230, 355 230, 405 130 C 455 30, 555 30, 605 130 C 655 230, 730 220, 765 155"
                      fill="none"
                      stroke="rgba(14, 165, 233, 0.24)"
                      strokeWidth="6"
                      strokeLinecap="round"
                      strokeDasharray="10 10"
                    />
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

                <div className="grid grid-cols-2 gap-3 sm:hidden">
                  {TREASURE_STAGES.map((stage, idx) => {
                    const stageStart = idx * 3;
                    const stageFilled = Math.max(0, Math.min(3, animPearls - stageStart));
                    const isActive = animPearls > 0 && popoStageIdx === idx;
                    return (
                      <div
                        key={stage.week}
                        className={`rounded-xl p-2.5 border flex flex-col items-center text-center gap-1.5 ${idx % 2 === 1 ? "mt-4" : ""
                          } ${isActive ? "surface-water-glass" : "bg-white/75 border-sky-200/70"}`}
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

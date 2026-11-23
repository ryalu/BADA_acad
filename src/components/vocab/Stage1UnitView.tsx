import React, { useCallback, useEffect, useState } from "react";
import {
  ArrowRight,
  Award,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Eye,
  RotateCcw,
  Volume2
} from "lucide-react";
import type {
  StudentVocabState,
  VocabAttemptResult,
  VocabStage1Question,
  VocabUnit,
  VocabWord
} from "../../types";
import { playSoftTone, speakEnglish } from "../../utils/speech";
import { OceanProgressGauge } from "./OceanProgressGauge";
import { PhonicsWordDisplay } from "./PhonicsWordDisplay";
import { PronunciationFocusView } from "./PronunciationFocusView";

interface Stage1UnitViewProps {
  userId: string;
  state: StudentVocabState;
  onStateChange: (next: StudentVocabState) => void;
  onEnterNextStage?: (nextStage: 2 | 3) => void;
  onBackHome: () => void;
}

type Stage1Mode = "study" | "daily_quiz" | "final_test" | "pronunciation";

export const Stage1UnitView: React.FC<Stage1UnitViewProps> = ({
  userId,
  state,
  onStateChange,
  onEnterNextStage,
  onBackHome
}) => {
  const { progress, daysElapsed, monthReady, todayKst } = state;
  const activeTier = progress.vocab_tier || "all";
  const activeUnitKey = progress.current_unit_key || "A";
  const storageKey = `bada_vocab_seen_${userId}_${todayKst}_s1_${activeTier}_${activeUnitKey}`;

  const [unitMeta, setUnitMeta] = useState<VocabUnit | null>(null);
  const [words, setWords] = useState<VocabWord[]>([]);
  const [loadingUnit, setLoadingUnit] = useState(true);

  const [mode, setMode] = useState<Stage1Mode>("study");
  const [wordIdx, setWordIdx] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [seenIds, setSeenIds] = useState<string[]>([]);
  const [showWordList, setShowWordList] = useState(false);
  const [listFilter, setListFilter] = useState<"all" | "unseen">("all");

  // Quiz & Final Test state
  const [quizQuestions, setQuizQuestions] = useState<VocabStage1Question[]>([]);
  const [quizIdx, setQuizIdx] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [wrongWords, setWrongWords] = useState<VocabStage1Question[]>([]);
  const [quizLoading, setQuizLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [attemptResult, setAttemptResult] = useState<VocabAttemptResult | null>(null);
  const [showEarlyConfirm, setShowEarlyConfirm] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      const parsed = saved ? JSON.parse(saved) : [];
      setSeenIds(Array.isArray(parsed) ? parsed : []);
    } catch {
      setSeenIds([]);
    }
  }, [storageKey]);

  const markWordSeen = useCallback(
    (wordId: string) => {
      setSeenIds((prev) => {
        if (prev.includes(wordId)) return prev;
        const next = [...prev, wordId];
        try {
          localStorage.setItem(storageKey, JSON.stringify(next));
        } catch {
          // ignore
        }
        return next;
      });
    },
    [storageKey]
  );

  useEffect(() => {
    let active = true;
    const loadUnit = async () => {
      setLoadingUnit(true);
      try {
        const res = await fetch(
          `/api/vocab/unit?stage=1&tier=${encodeURIComponent(activeTier)}&unitKey=${encodeURIComponent(activeUnitKey)}`
        );
        if (!res.ok) return;
        const data = await res.json();
        if (!active) return;
        if (data.ok) {
          setUnitMeta(data.unit || null);
          setWords(Array.isArray(data.words) ? data.words : []);
          setWordIdx(0);
          setRevealed(false);
        }
      } finally {
        if (active) setLoadingUnit(false);
      }
    };
    void loadUnit();
    return () => {
      active = false;
    };
  }, [activeTier, activeUnitKey]);

  const activeWord = words[wordIdx] || words[0];
  const seenSet = new Set(seenIds);
  const validSeenCount = words.filter((w) => seenSet.has(w.id)).length;
  const allWordsChecked = words.length > 0 && validSeenCount >= words.length;
  const unseenWords = words.filter((w) => !seenSet.has(w.id));

  const revealCurrentWord = useCallback(() => {
    if (!activeWord) return;
    setRevealed(true);
    markWordSeen(activeWord.id);
    speakEnglish(activeWord.word, 0.85, 1.04);
  }, [activeWord, markWordSeen]);

  const goPrev = useCallback(() => {
    if (words.length === 0) return;
    const prev = (wordIdx - 1 + words.length) % words.length;
    setWordIdx(prev);
    setRevealed(false);
    speakEnglish(words[prev].word, 0.85, 1.04);
  }, [wordIdx, words]);

  const goNext = useCallback(() => {
    if (words.length === 0) return;
    let next = wordIdx + 1;
    if (next >= words.length) {
      const firstUnseen = words.findIndex((w) => !seenSet.has(w.id));
      next = firstUnseen >= 0 ? firstUnseen : 0;
    }
    setWordIdx(next);
    setRevealed(false);
    speakEnglish(words[next].word, 0.85, 1.04);
  }, [wordIdx, words, seenSet]);

  const jumpToFirstUnseen = () => {
    const idx = words.findIndex((w) => !seenSet.has(w.id));
    if (idx >= 0) {
      setWordIdx(idx);
      setRevealed(false);
      speakEnglish(words[idx].word, 0.85, 1.04);
    }
  };

  useEffect(() => {
    if (mode !== "study") return;
    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (e.code === "Space") {
        e.preventDefault();
        revealCurrentWord();
      } else if (e.code === "ArrowRight") {
        e.preventDefault();
        goNext();
      } else if (e.code === "ArrowLeft") {
        e.preventDefault();
        goPrev();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [mode, revealCurrentWord, goNext, goPrev]);

  const startQuiz = async (attemptType: "daily_quiz" | "final_test") => {
    setQuizLoading(true);
    setMode(attemptType);
    setAttemptResult(null);
    setSelectedOption(null);
    setQuizIdx(0);
    setCorrectCount(0);
    setWrongWords([]);
    setShowEarlyConfirm(false);
    try {
      const res = await fetch("/api/vocab/quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          tier: activeTier,
          stage: 1,
          unitKey: activeUnitKey,
          attemptType,
          quizMode: progress.s1_quiz_mode || "meaning"
        })
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        const qs: VocabStage1Question[] = Array.isArray(data.questions) ? data.questions : [];
        setQuizQuestions(qs);
        if (qs[0]) speakEnglish(qs[0].word, 0.85, 1.04);
      }
    } finally {
      setQuizLoading(false);
    }
  };

  const handleUnlockEarlyAndStart = async () => {
    const res = await fetch("/api/vocab/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, early_test_unlocked: true })
    });
    const data = await res.json();
    if (res.ok && data.ok) {
      const { ok: _ok, ...nextState } = data;
      onStateChange(nextState as StudentVocabState);
      void startQuiz("final_test");
    }
  };

  const handleChooseOption = (opt: string) => {
    if (selectedOption || quizLoading || submitting) return;
    const q = quizQuestions[quizIdx];
    if (!q) return;

    const expectedAnswer = q.correctAnswer || q.correctMeaning;
    const isRight = opt === expectedAnswer;
    setSelectedOption(opt);
    const nextCorrect = isRight ? correctCount + 1 : correctCount;
    const nextWrong = isRight ? wrongWords : [...wrongWords, q];
    setCorrectCount(nextCorrect);
    setWrongWords(nextWrong);

    if (isRight) playSoftTone(820, 0.14);
    else playSoftTone(330, 0.14);
    speakEnglish(q.word, 0.85, 1.04);

    window.setTimeout(async () => {
      if (quizIdx + 1 < quizQuestions.length) {
        const nextIdx = quizIdx + 1;
        setQuizIdx(nextIdx);
        setSelectedOption(null);
        speakEnglish(quizQuestions[nextIdx].word, 0.85, 1.04);
        return;
      }

      setSubmitting(true);
      try {
        const attemptType = mode === "final_test" ? "final_test" : "daily_quiz";
        const res = await fetch("/api/vocab/attempt", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId,
            tier: activeTier,
            stage: 1,
            unitKey: activeUnitKey,
            attemptType,
            totalCount: quizQuestions.length,
            correctCount: nextCorrect,
            wrongWordIds: nextWrong.map((item) => item.wordId)
          })
        });
        const data = await res.json();
        if (res.ok && data.ok) {
          setAttemptResult(data.attempt);
          if (data.state) onStateChange(data.state);
        }
      } finally {
        setSubmitting(false);
      }
    }, 780);
  };

  const daysLeft = Math.max(1, 30 - daysElapsed);
  const visibleGridWords = listFilter === "unseen" ? unseenWords : words;

  return (
    <div className="space-y-5">
      {/* Clean Header: Title Only + Final Test Button (No Top Colored Badges) */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-[#e5dcc9]">
        <h2 className="text-lg md:text-xl font-extrabold text-slate-900">
          {unitMeta?.title_kr || `${activeUnitKey} 단어 학습`}
        </h2>

        <button
          type="button"
          onClick={() => {
            if (monthReady) {
              void startQuiz("final_test");
            } else {
              setMode("final_test");
              setShowEarlyConfirm(true);
              setAttemptResult(null);
            }
          }}
          className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold transition ${
            monthReady
              ? "bg-amber-100 hover:bg-amber-200 text-amber-950 border border-amber-300"
              : "bg-[#f2ece1] hover:bg-[#e8dfd1] text-slate-700"
          }`}
        >
          <Award className="w-3.5 h-3.5 text-amber-700" />
          {monthReady ? "파이널 테스트" : `파이널 D-${daysLeft}`}
        </button>
      </div>

      {/* Mode 1: Vertical Ocean Progress Gauge (Left) + Tap-to-Reveal Flashcard (Right) */}
      {mode === "study" && (
        loadingUnit ? (
          <div className="py-12 text-center text-sm font-bold text-slate-500">단어를 불러오는 중...</div>
        ) : activeWord ? (
          <div className="space-y-6">
            {state.todayQuizAttempted && !state.todayPronunciationDone && (
              <button
                type="button"
                onClick={() => setMode("pronunciation")}
                className="max-w-4xl mx-auto w-full card-clear-glass rounded-2xl px-5 py-3.5 flex flex-wrap items-center justify-between gap-3 text-left hover:bg-white/55 transition cursor-pointer"
              >
                <span className="text-sm font-extrabold text-sky-900">
                  오늘 퀴즈는 완료했어요! 마지막 &apos;헷갈리는 발음 콕콕&apos;만 끝내면 탐험 완료 도장이 찍혀요.
                </span>
                <span className="shrink-0 inline-flex items-center gap-1 px-4 py-1.5 rounded-full btn-water-glass text-xs font-extrabold">
                  발음 학습하기 <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </button>
            )}

            <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center md:items-start justify-center gap-6">
              <OceanProgressGauge
                seenCount={validSeenCount}
                totalCount={words.length}
                onJumpUnseen={jumpToFirstUnseen}
              />

              <div className="w-full max-w-xl space-y-4">
                <div className="card-clear-glass rounded-3xl p-6 md:p-8 text-center space-y-5">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-600">
                    <span>
                      {wordIdx + 1} / {words.length}
                    </span>
                    <div className="flex items-center gap-1.5">
                      {activeWord.image_url && (
                        <span className="px-2.5 py-0.5 rounded-full bg-white/50 border border-white/80 text-slate-600">
                          {activeWord.is_abstract ? "상황 만화" : "그림 단어"}
                        </span>
                      )}
                      {seenSet.has(activeWord.id) ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100/70 border border-emerald-300/70 text-emerald-800">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          확인 완료
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full bg-white/50 border border-white/80 text-slate-600">
                          미확인
                        </span>
                      )}
                    </div>
                  </div>

                  {activeWord.image_url && (
                    <button
                      type="button"
                      onClick={revealCurrentWord}
                      className="block mx-auto focus:outline-none cursor-pointer"
                    >
                      <img
                        src={activeWord.image_url}
                        alt={activeWord.word}
                        className="w-44 h-44 sm:w-52 sm:h-52 rounded-2xl object-cover border-2 border-white/85 shadow-md mx-auto bg-white/60"
                      />
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={revealCurrentWord}
                    className="w-full py-2 focus:outline-none cursor-pointer"
                  >
                    <PhonicsWordDisplay word={activeWord.word} mode="initial" size="lg" />
                  </button>

                  <button
                    type="button"
                    onClick={revealCurrentWord}
                    className={`w-full min-h-[64px] flex items-center justify-center gap-2 rounded-2xl border px-4 py-3 backdrop-blur-md transition cursor-pointer ${
                      revealed
                        ? "bg-white/55 border-white/90 shadow-xs"
                        : "bg-white/35 hover:bg-white/52 border-dashed border-white/85"
                    }`}
                  >
                    {revealed ? (
                      <span className="text-xl font-extrabold text-slate-900">
                        {activeWord.meaning_kr}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-2 text-sm font-extrabold text-slate-800">
                        <Eye className="w-4 h-4 text-slate-700" />
                        눌러서 뜻 확인하기
                      </span>
                    )}
                  </button>

                  <div className="flex items-center justify-center gap-3">
                    <button
                      type="button"
                      onClick={goPrev}
                      className="btn-clear-glass inline-flex items-center gap-1 px-4 py-2.5 rounded-2xl text-sm font-bold"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      이전
                    </button>
                    <button
                      type="button"
                      onClick={() => speakEnglish(activeWord.word, 0.85, 1.04)}
                      className="btn-clear-glass inline-flex items-center gap-1.5 px-5 py-2.5 rounded-2xl text-sm font-bold"
                    >
                      <Volume2 className="w-4 h-4 text-slate-700" />
                      소리 듣기
                    </button>
                    <button
                      type="button"
                      onClick={goNext}
                      className="inline-flex items-center gap-1 px-5 py-2.5 rounded-2xl btn-water-glass text-sm font-bold"
                    >
                      다음
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                  <p className="text-[11px] font-semibold text-slate-500">
                    단축키: Space 뜻 확인 · ←/→ 이전·다음 단어
                  </p>
                </div>

                {allWordsChecked && (
                  <button
                    type="button"
                    onClick={() => void startQuiz("daily_quiz")}
                    className="w-full py-3.5 px-5 rounded-2xl btn-water-glass text-base font-extrabold inline-flex items-center justify-center gap-2 shadow-sm"
                  >
                    모든 단어 확인 완료! 오늘의 퀴즈 시작 (랜덤 10문제)
                    <ArrowRight className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Collapsible Whole Word List (Collapsed by Default) */}
            <div className="max-w-4xl mx-auto card-clear-glass rounded-2xl overflow-hidden">
              <button
                type="button"
                onClick={() => setShowWordList((v) => !v)}
                className="w-full px-5 py-3.5 flex items-center justify-between text-sm font-extrabold text-slate-800 hover:bg-white/30 transition"
              >
                <span>
                  전체 단어 모아보기 (확인 {validSeenCount} / {words.length})
                </span>
                {showWordList ? (
                  <ChevronUp className="w-4 h-4 text-slate-600" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-slate-600" />
                )}
              </button>

              {showWordList && (
                <div className="p-4 pt-2 border-t border-white/60 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setListFilter("all")}
                        className={`px-3 py-1 rounded-full text-xs font-bold ${
                          listFilter === "all"
                            ? "btn-clear-glass font-extrabold"
                            : "bg-white/30 hover:bg-white/50 text-slate-700"
                        }`}
                      >
                        전체 ({words.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setListFilter("unseen")}
                        className={`px-3 py-1 rounded-full text-xs font-bold ${
                          listFilter === "unseen"
                            ? "btn-clear-glass font-extrabold"
                            : "bg-white/30 hover:bg-white/50 text-slate-700"
                        }`}
                      >
                        안 본 단어 ({unseenWords.length})
                      </button>
                    </div>
                    <span className="text-[11px] font-semibold text-slate-600">
                      단어를 누르면 뜻이 열리고 확인 완료로 체크돼요
                    </span>
                  </div>

                  {visibleGridWords.length === 0 ? (
                    <div className="py-6 text-center text-xs font-bold text-emerald-700">
                      모든 단어를 다 확인했어요!
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2.5">
                      {visibleGridWords.map((w) => {
                        const isChecked = seenSet.has(w.id);
                        const origIdx = words.findIndex((x) => x.id === w.id);
                        return (
                          <button
                            key={w.id}
                            type="button"
                            onClick={() => {
                              markWordSeen(w.id);
                              speakEnglish(w.word, 0.85, 1.04);
                              if (origIdx >= 0) {
                                setWordIdx(origIdx);
                                setRevealed(true);
                              }
                            }}
                            className={`p-3 rounded-2xl text-left transition ${
                              origIdx === wordIdx
                                ? "bg-white/65 border-2 border-slate-500 backdrop-blur-md shadow-sm"
                                : isChecked
                                  ? "bg-emerald-50/55 border border-emerald-300/80 backdrop-blur-md"
                                  : "btn-clear-glass"
                            }`}
                          >
                            <div className="flex items-center justify-between gap-1.5">
                              <div className="flex items-center gap-2 min-w-0">
                                {w.image_url && (
                                  <img
                                    src={w.image_url}
                                    alt=""
                                    className="w-8 h-8 rounded-lg object-cover border border-white/80 shrink-0"
                                  />
                                )}
                                <span className="storybook-font text-base font-extrabold text-slate-900 truncate">
                                  <span className="text-sky-700">{w.word.slice(0, 1)}</span>
                                  {w.word.slice(1)}
                                </span>
                              </div>
                              {isChecked && (
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                              )}
                            </div>
                            <div className="text-xs font-semibold truncate mt-0.5">
                              {isChecked ? (
                                <span className="text-slate-700">{w.meaning_kr}</span>
                              ) : (
                                <span className="text-slate-600">눌러서 뜻 보기</span>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="py-10 text-center text-sm text-slate-500">이 유닛에 등록된 단어가 없습니다.</div>
        )
      )}

      {/* Early Final Test Confirmation Gate */}
      {mode === "final_test" && showEarlyConfirm && !attemptResult && (
        <div className="max-w-lg mx-auto card-clear-glass rounded-3xl p-6 md:p-7 text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-100/80 text-amber-700 flex items-center justify-center mx-auto">
            <Award className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-extrabold text-slate-900">
            한 달 전이지만 파이널 테스트에 먼저 도전할까요?
          </h3>
          <p className="text-sm font-medium text-slate-600">
            {activeUnitKey} 전체 {words.length}단어 중 <strong>80% 이상</strong> 맞추면 다음 알파벳이 바로 열립니다.
          </p>
          <div className="flex items-center justify-center gap-3 pt-1">
            <button
              type="button"
              onClick={() => {
                setShowEarlyConfirm(false);
                setMode("study");
              }}
              className="btn-clear-glass px-5 py-2.5 rounded-full text-sm font-bold"
            >
              더 연습하기
            </button>
            <button
              type="button"
              onClick={handleUnlockEarlyAndStart}
              className="px-6 py-2.5 rounded-full btn-water-glass text-sm font-bold"
            >
              지금 도전하기
            </button>
          </div>
        </div>
      )}

      {/* Mode 2 & 3: Daily Quiz or Final Test */}
      {(mode === "daily_quiz" || (mode === "final_test" && !showEarlyConfirm)) && (
        quizLoading ? (
          <div className="py-12 text-center text-sm font-bold text-slate-500">문제를 준비하는 중...</div>
        ) : attemptResult ? (
          <div className="max-w-xl mx-auto card-clear-glass rounded-3xl p-6 md:p-8 text-center space-y-5">
            <div
              className={`w-14 h-14 rounded-2xl flex items-center justify-center mx-auto ${
                attemptResult.passed
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-amber-100 text-amber-700"
              }`}
            >
              {attemptResult.passed ? <CheckCircle2 className="w-7 h-7" /> : <RotateCcw className="w-7 h-7" />}
            </div>

            <div className="space-y-1">
              <div className="text-3xl font-black text-slate-900">
                {attemptResult.score_pct}% ({attemptResult.correct_count} / {attemptResult.total_count})
              </div>
              <p className="text-sm font-bold text-slate-700">
                {mode === "final_test"
                  ? attemptResult.advancedToStage === 2
                    ? "1단계 A–Z 전 과정을 완주했어요! 2단계 파닉스 시각화가 열립니다."
                    : attemptResult.passed
                      ? "80% 이상 통과! 다음 알파벳이 열렸어요."
                      : "아쉽지만 80% 미만이에요. 한 달 더 복습하고 다시 도전해요!"
                  : !state.todayPronunciationDone
                    ? "퀴즈 완료! 이제 마지막 '헷갈리는 발음 콕콕'을 마치면 탐험 완료 도장이 찍힙니다."
                    : wrongWords.length === 0
                      ? "오늘의 10단어 퀴즈를 모두 맞혔어요!"
                      : "오늘의 퀴즈를 완료했어요! 아래 틀린 단어를 눌러 소리를 확인해 보세요."}
              </p>
            </div>

            {wrongWords.length > 0 && (
              <div className="text-left space-y-2 pt-2 border-t border-white/60">
                <div className="text-xs font-bold text-rose-700">다시 볼 단어 ({wrongWords.length})</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {wrongWords.map((w) => (
                    <button
                      key={w.wordId}
                      type="button"
                      onClick={() => speakEnglish(w.word, 0.85, 1.04)}
                      className="flex items-center justify-between px-3.5 py-2 rounded-xl bg-rose-50/60 border border-rose-200/80 backdrop-blur-sm text-left"
                    >
                      <div>
                        <span className="storybook-font font-extrabold text-slate-900">{w.word}</span>
                        <span className="ml-2 text-xs font-semibold text-slate-600">{w.correctMeaning}</span>
                      </div>
                      <Volume2 className="w-4 h-4 text-rose-600 shrink-0" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              {!state.todayPronunciationDone ? (
                <button
                  type="button"
                  onClick={() => setMode("pronunciation")}
                  className="px-7 py-3 rounded-full btn-water-glass text-sm font-extrabold inline-flex items-center gap-2"
                >
                  필수 마무리 · 헷갈리는 발음 학습하기
                  <ArrowRight className="w-4 h-4" />
                </button>
              ) : mode === "daily_quiz" ? (
                <button
                  type="button"
                  onClick={onBackHome}
                  className="px-7 py-3 rounded-full btn-water-glass text-sm font-extrabold"
                >
                  학습 맵으로 돌아가기 →
                </button>
              ) : (
                <>
                  {attemptResult.advancedToStage === 2 && onEnterNextStage && (
                    <button
                      type="button"
                      onClick={() => onEnterNextStage(2)}
                      className="px-6 py-3 rounded-full btn-water-glass text-sm font-bold"
                    >
                      2단계 파닉스 시작하기 →
                    </button>
                  )}
                  {attemptResult.advancedToUnit && (
                    <button
                      type="button"
                      onClick={() => {
                        setMode("study");
                        setAttemptResult(null);
                      }}
                      className="px-6 py-3 rounded-full btn-water-glass text-sm font-bold"
                    >
                      다음 알파벳 [{attemptResult.advancedToUnit}] 시작 →
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={onBackHome}
                    className="btn-clear-glass px-5 py-2.5 rounded-full text-sm font-bold"
                  >
                    학습 맵으로 돌아가기
                  </button>
                </>
              )}
            </div>
          </div>
        ) : quizQuestions[quizIdx] ? (
          (() => {
            const q = quizQuestions[quizIdx];
            const isPictureQuiz = q.questionType === "picture_to_word" && Boolean(q.imageUrl);
            const expectedAnswer = q.correctAnswer || q.correctMeaning;

            return (
              <div className="max-w-xl mx-auto space-y-5">
                <div className="card-clear-glass rounded-3xl p-6 md:p-8 text-center space-y-4">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-600">
                    <span>
                      {mode === "final_test" ? "파이널 테스트" : "오늘의 퀴즈"} · {quizIdx + 1} /{" "}
                      {quizQuestions.length}
                    </span>
                    <span className="text-slate-700">맞힌 개수 {correctCount}</span>
                  </div>

                  {isPictureQuiz ? (
                    <div className="space-y-3">
                      <div className="text-xs font-extrabold text-sky-900">
                        그림과 소리를 듣고 알맞은 영단어를 골라보세요!
                      </div>
                      <img
                        src={q.imageUrl || ""}
                        alt="퀴즈 그림"
                        className="w-48 h-48 sm:w-56 sm:h-56 rounded-2xl object-cover border-2 border-white/90 shadow-md mx-auto bg-white/60"
                      />
                      {selectedOption && (
                        <div className="text-base font-extrabold text-slate-900">
                          <span className="storybook-font text-xl text-sky-900">{q.word}</span>
                          <span className="ml-2 text-sm text-slate-600">({q.correctMeaning})</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="py-2">
                      <PhonicsWordDisplay word={q.word} mode="initial" size="lg" />
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => speakEnglish(q.word, 0.85, 1.04)}
                    className="btn-clear-glass inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold"
                  >
                    <Volume2 className="w-3.5 h-3.5 text-slate-700" />
                    {isPictureQuiz ? "발음 다시 듣기" : "발음 듣기"}
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {q.options.map((opt) => {
                    const isPicked = selectedOption === opt;
                    const isCorrect = opt === expectedAnswer;
                    let style = "btn-clear-glass";
                    if (selectedOption) {
                      if (isCorrect) {
                        style = "bg-emerald-100/75 border-2 border-emerald-500 text-emerald-950 backdrop-blur-md";
                      } else if (isPicked) {
                        style = "bg-rose-100/75 border-2 border-rose-500 text-rose-950 backdrop-blur-md";
                      } else {
                        style = "bg-white/25 border border-white/50 text-slate-400 backdrop-blur-sm";
                      }
                    }
                    return (
                      <button
                        key={opt}
                        type="button"
                        disabled={Boolean(selectedOption) || submitting}
                        onClick={() => handleChooseOption(opt)}
                        className={`p-4 rounded-2xl font-extrabold transition ${
                          isPictureQuiz ? "storybook-font text-xl" : "text-base"
                        } ${style}`}
                      >
                        {opt}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })()
        ) : (
          <div className="py-10 text-center text-sm text-slate-500">문제를 불러오지 못했습니다.</div>
        )
      )}

      {/* Mode 4: Mandatory Confusing Pronunciation Focus */}
      {mode === "pronunciation" && (
        <PronunciationFocusView
          userId={userId}
          stage={1}
          unitKey={activeUnitKey}
          tier={activeTier}
          quizWordIds={quizQuestions.map((q) => q.wordId)}
          wrongWordIds={wrongWords.map((w) => w.wordId)}
          onComplete={(nextState) => {
            onStateChange(nextState);
            onBackHome();
          }}
        />
      )}
    </div>
  );
};

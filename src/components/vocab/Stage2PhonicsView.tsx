import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Delete,
  Eye,
  Keyboard,
  LayoutGrid,
  RotateCcw,
  Volume2
} from "lucide-react";
import type {
  StudentVocabState,
  VocabAttemptResult,
  VocabInputMode,
  VocabStage2Question,
  VocabUnit,
  VocabWord
} from "../../types";
import { playSoftTone, speakEnglish } from "../../utils/speech";
import { OceanProgressGauge } from "./OceanProgressGauge";
import { PhonicsWordDisplay } from "./PhonicsWordDisplay";

interface Stage2PhonicsViewProps {
  userId: string;
  state: StudentVocabState;
  onStateChange: (next: StudentVocabState) => void;
  onEnterNextStage?: (nextStage: 3) => void;
  onBackHome: () => void;
}

function normalizeAnswer(val: string): string {
  return String(val || "")
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, "");
}

function getQuestionSlotCount(q?: VocabStage2Question): number {
  if (!q) return 2;
  if (q.targetLetters?.length) return q.targetLetters.length;
  const underCount = (q.maskedWord.match(/_/g) || []).length;
  if (underCount > 0) return underCount;
  return Math.max(1, q.targetPattern.replace(/_/g, "").length);
}

export const Stage2PhonicsView: React.FC<Stage2PhonicsViewProps> = ({
  userId,
  state,
  onStateChange,
  onEnterNextStage,
  onBackHome
}) => {
  const { progress, units, todayKst } = state;
  const stage2Units = units.stage2;
  const activeUnitId = progress.current_s2_unit || stage2Units[0]?.id || "s2_long_a";
  const storageKey = `bada_vocab_seen_${userId}_${todayKst}_s2_${activeUnitId}`;

  const [unitMeta, setUnitMeta] = useState<VocabUnit | null>(null);
  const [words, setWords] = useState<VocabWord[]>([]);
  const [loadingUnit, setLoadingUnit] = useState(true);

  const [mode, setMode] = useState<"study" | "quiz">("study");
  const [wordIdx, setWordIdx] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [seenIds, setSeenIds] = useState<string[]>([]);
  const [showWordList, setShowWordList] = useState(false);
  const [listFilter, setListFilter] = useState<"all" | "unseen">("all");

  // Quiz state
  const [quizQuestions, setQuizQuestions] = useState<VocabStage2Question[]>([]);
  const [quizIdx, setQuizIdx] = useState(0);
  const [quizLoading, setQuizLoading] = useState(false);
  const [typedInput, setTypedInput] = useState("");
  const [pickedLetters, setPickedLetters] = useState<string[]>(["", ""]);
  const [draggingOver, setDraggingOver] = useState(false);
  const [answerFeedback, setAnswerFeedback] = useState<{
    correct: boolean;
    message: string;
  } | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [wrongWords, setWrongWords] = useState<VocabStage2Question[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [attemptResult, setAttemptResult] = useState<VocabAttemptResult | null>(null);
  const autoSubmitRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (autoSubmitRef.current !== null) window.clearTimeout(autoSubmitRef.current);
    };
  }, []);

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
          `/api/vocab/unit?stage=2&unitKey=${encodeURIComponent(activeUnitId)}`
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
  }, [activeUnitId]);

  // Auto-return home after spotless daily quiz completion
  useEffect(() => {
    if (!attemptResult || wrongWords.length > 0 || attemptResult.advancedToStage === 3) return;
    const timer = window.setTimeout(() => {
      onBackHome();
    }, 2200);
    return () => window.clearTimeout(timer);
  }, [attemptResult, wrongWords.length, onBackHome]);

  const activeWord = words[wordIdx] || words[0];
  const seenSet = new Set(seenIds);
  const validSeenCount = words.filter((w) => seenSet.has(w.id)).length;
  const allWordsChecked = words.length > 0 && validSeenCount >= words.length;
  const unseenWords = words.filter((w) => !seenSet.has(w.id));

  const getSpanForUnit = (w?: VocabWord) => {
    if (!w) return undefined;
    return w.phonics_spans.find((s) => s.unit_id === activeUnitId) || w.phonics_spans[0];
  };

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

  const handleToggleInputMode = async (nextMode: VocabInputMode) => {
    if (nextMode === progress.s2_input_mode) return;
    const res = await fetch("/api/vocab/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, s2_input_mode: nextMode })
    });
    const data = await res.json();
    if (res.ok && data.ok) {
      const { ok: _ok, ...nextState } = data;
      onStateChange(nextState as StudentVocabState);
    }
  };

  const startQuiz = async () => {
    if (autoSubmitRef.current !== null) window.clearTimeout(autoSubmitRef.current);
    setMode("quiz");
    setQuizLoading(true);
    setAttemptResult(null);
    setAnswerFeedback(null);
    setTypedInput("");
    setQuizIdx(0);
    setCorrectCount(0);
    setWrongWords([]);
    try {
      const res = await fetch("/api/vocab/quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          stage: 2,
          unitKey: activeUnitId,
          attemptType: "daily_quiz"
        })
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        const qs: VocabStage2Question[] = Array.isArray(data.questions) ? data.questions : [];
        setQuizQuestions(qs);
        setPickedLetters(Array(getQuestionSlotCount(qs[0])).fill(""));
        if (qs[0]) speakEnglish(qs[0].word, 0.85, 1.04);
      }
    } finally {
      setQuizLoading(false);
    }
  };

  const submitAnswer = useCallback(
    (rawChoice: string) => {
      if (answerFeedback || submitting) return;
      const q = quizQuestions[quizIdx];
      if (!q) return;

      const normChoice = normalizeAnswer(rawChoice);
      if (!normChoice) return;

      const normPattern = normalizeAnswer(q.targetPattern);
      const normWord = normalizeAnswer(q.word);
      const isCorrect = normChoice === normPattern || normChoice === normWord;

      const nextCorrect = isCorrect ? correctCount + 1 : correctCount;
      const nextWrong = isCorrect ? wrongWords : [...wrongWords, q];
      setCorrectCount(nextCorrect);
      setWrongWords(nextWrong);

      if (isCorrect) {
        playSoftTone(820, 0.14);
        setAnswerFeedback({ correct: true, message: `정답! ${q.word} (${q.meaningKr})` });
      } else {
        playSoftTone(330, 0.14);
        setAnswerFeedback({ correct: false, message: `정답은 '${q.targetPattern}' → ${q.word}` });
      }
      speakEnglish(q.word, 0.85, 1.04);

      window.setTimeout(async () => {
        if (quizIdx + 1 < quizQuestions.length) {
          const nextIdx = quizIdx + 1;
          setQuizIdx(nextIdx);
          setAnswerFeedback(null);
          setTypedInput("");
          setPickedLetters(Array(getQuestionSlotCount(quizQuestions[nextIdx])).fill(""));
          speakEnglish(quizQuestions[nextIdx].word, 0.85, 1.04);
          return;
        }

        setSubmitting(true);
        try {
          const res = await fetch("/api/vocab/attempt", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              userId,
              stage: 2,
              unitKey: activeUnitId,
              attemptType: "daily_quiz",
              totalCount: quizQuestions.length,
              correctCount: nextCorrect,
              wrongWordIds: nextWrong.map((w) => w.wordId)
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
      }, 950);
    },
    [answerFeedback, submitting, quizQuestions, quizIdx, correctCount, wrongWords, userId, activeUnitId, onStateChange]
  );

  const handlePickSingleLetter = (letter: string, targetSlot?: number) => {
    if (answerFeedback || submitting) return;
    const next = [...pickedLetters];
    if (targetSlot !== undefined && targetSlot >= 0 && targetSlot < next.length) {
      next[targetSlot] = letter;
    } else {
      const emptyIdx = next.findIndex((c) => !c);
      if (emptyIdx === -1) return;
      next[emptyIdx] = letter;
    }
    setPickedLetters(next);

    if (next.every(Boolean)) {
      if (autoSubmitRef.current !== null) window.clearTimeout(autoSubmitRef.current);
      autoSubmitRef.current = window.setTimeout(() => {
        submitAnswer(next.join(""));
      }, 220);
    }
  };

  const handleRemoveSlotLetter = (slotIdx: number) => {
    if (answerFeedback || submitting) return;
    if (autoSubmitRef.current !== null) window.clearTimeout(autoSubmitRef.current);
    const next = [...pickedLetters];
    next[slotIdx] = "";
    setPickedLetters(next);
  };

  const handleClearLastLetter = () => {
    if (answerFeedback || submitting) return;
    if (autoSubmitRef.current !== null) window.clearTimeout(autoSubmitRef.current);
    const next = [...pickedLetters];
    for (let i = next.length - 1; i >= 0; i -= 1) {
      if (next[i]) {
        next[i] = "";
        break;
      }
    }
    setPickedLetters(next);
  };

  const visibleGridWords = listFilter === "unseen" ? unseenWords : words;

  const activeQuizQ = quizQuestions[quizIdx];
  const letterOptions =
    activeQuizQ?.letterOptions?.length
      ? activeQuizQ.letterOptions
      : activeQuizQ?.targetPattern
        ? Array.from(new Set(activeQuizQ.targetPattern.replace(/_/g, "").split("")))
        : [];

  return (
    <div className="space-y-5">
      {/* Clean Header (No Top Colored Badges) */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-[#e5dcc9]">
        <div className="space-y-1">
          <h2 className="text-lg md:text-xl font-extrabold text-slate-900">
            {unitMeta?.title_kr || "파닉스 시각화 학습"}
          </h2>
          {unitMeta?.rule_summary_kr && (
            <p className="text-xs font-medium text-slate-600">{unitMeta.rule_summary_kr}</p>
          )}
        </div>

        <div className="inline-flex items-center rounded-full bg-[#f2ece1] p-1 border border-[#e5dcc9]">
          <button
            type="button"
            onClick={() => void handleToggleInputMode("tiles")}
            className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold transition ${
              progress.s2_input_mode === "tiles"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-600"
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5 text-sky-700" />
            글자 고르기
          </button>
          <button
            type="button"
            onClick={() => void handleToggleInputMode("typing")}
            className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold transition ${
              progress.s2_input_mode === "typing"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-600"
            }`}
          >
            <Keyboard className="w-3.5 h-3.5 text-sky-700" />
            직접 입력
          </button>
        </div>
      </div>

      {/* Mode 1: Vertical Ocean Progress Gauge + Flashcard */}
      {mode === "study" && (
        loadingUnit ? (
          <div className="py-12 text-center text-sm font-bold text-slate-500">단어를 불러오는 중...</div>
        ) : activeWord ? (
          <div className="space-y-6">
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
                    <div className="flex items-center gap-2">
                      {getSpanForUnit(activeWord)?.sound_kr && (
                        <span className="px-2.5 py-0.5 rounded-full bg-rose-50/75 border border-rose-200 text-rose-700 font-bold">
                          [{getSpanForUnit(activeWord)?.sound_kr}]
                        </span>
                      )}
                      {seenSet.has(activeWord.id) && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100/70 border border-emerald-300/70 text-emerald-800">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          확인 완료
                        </span>
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={revealCurrentWord}
                    className="w-full py-2 focus:outline-none cursor-pointer"
                  >
                    <PhonicsWordDisplay
                      word={activeWord.word}
                      mode="phonics"
                      span={getSpanForUnit(activeWord)}
                      size="lg"
                    />
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
                      발음 듣기
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
                    onClick={() => void startQuiz()}
                    className="w-full py-3.5 px-5 rounded-2xl btn-water-glass text-base font-extrabold inline-flex items-center justify-center gap-2 shadow-sm"
                  >
                    모든 단어 확인 완료! 스펠링 테스트 시작 (랜덤 10문제)
                    <ArrowRight className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Collapsible Whole Word List */}
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
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
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
                            className={`p-3.5 rounded-2xl text-left transition ${
                              origIdx === wordIdx
                                ? "bg-white/65 border-2 border-slate-500 backdrop-blur-md shadow-sm"
                                : isChecked
                                  ? "bg-emerald-50/55 border border-emerald-300/80 backdrop-blur-md"
                                  : "btn-clear-glass"
                            }`}
                          >
                            <div className="flex items-center justify-between gap-1">
                              <PhonicsWordDisplay
                                word={w.word}
                                mode="phonics"
                                span={getSpanForUnit(w)}
                                size="sm"
                              />
                              {isChecked && (
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                              )}
                            </div>
                            <div className="text-xs font-semibold truncate mt-1">
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
          <div className="py-10 text-center text-sm text-slate-500">해당 패턴의 단어가 없습니다.</div>
        )
      )}

      {/* Mode 2: Spelling Test (Single-Letter Tiles 6 options OR Keyboard Typing) */}
      {mode === "quiz" && (
        quizLoading ? (
          <div className="py-12 text-center text-sm font-bold text-slate-500">테스트를 준비하는 중...</div>
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
            <div className="text-3xl font-black text-slate-900">
              {attemptResult.score_pct}% ({attemptResult.correct_count} / {attemptResult.total_count})
            </div>
            <p className="text-sm font-bold text-slate-700">
              {attemptResult.advancedToStage === 3
                ? "2단계 파닉스 전 과정을 완주했어요! 3단계 접두·접미사 확장이 열립니다."
                : wrongWords.length === 0
                  ? "오늘 스펠링 테스트 완료! 잠시 후 학습 맵으로 돌아갑니다."
                  : "오늘 스펠링 테스트를 마쳤어요! 틀린 단어 발음을 확인한 뒤 학습 맵으로 돌아가세요."}
            </p>

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
                      <PhonicsWordDisplay word={w.word} mode="phonics" span={w.span} size="sm" />
                      <Volume2 className="w-4 h-4 text-rose-600 shrink-0" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex flex-wrap items-center justify-center gap-3">
              {attemptResult.advancedToStage === 3 && onEnterNextStage && (
                <button
                  type="button"
                  onClick={() => onEnterNextStage(3)}
                  className="px-6 py-3 rounded-full btn-water-glass text-sm font-bold"
                >
                  3단계 확장 학습 시작 →
                </button>
              )}
              <button
                type="button"
                onClick={onBackHome}
                className="px-7 py-3 rounded-full btn-water-glass text-sm font-extrabold"
              >
                학습 맵으로 돌아가기 →
              </button>
            </div>
          </div>
        ) : activeQuizQ ? (
          <div className="max-w-xl mx-auto space-y-5">
            <div className="card-clear-glass rounded-3xl p-6 md:p-8 text-center space-y-4">
              <div className="flex items-center justify-between text-xs font-bold text-slate-600">
                <span>
                  문제 {quizIdx + 1} / {quizQuestions.length}
                </span>
                <span className="text-slate-700">맞힌 개수 {correctCount}</span>
              </div>

              <div className="text-2xl font-extrabold text-slate-900">
                {activeQuizQ.meaningKr}
              </div>

              <div className="py-2">
                {answerFeedback ? (
                  <PhonicsWordDisplay
                    word={activeQuizQ.word}
                    mode="phonics"
                    span={activeQuizQ.span}
                    size="lg"
                  />
                ) : progress.s2_input_mode === "tiles" ? (
                  <PhonicsWordDisplay
                    word={activeQuizQ.word}
                    mode="masked"
                    maskedWord={activeQuizQ.maskedWord}
                    filledLetters={pickedLetters}
                    isDraggingOver={draggingOver}
                    onDragOverChange={setDraggingOver}
                    onDropLetterAt={(ch, slotIdx) => handlePickSingleLetter(ch, slotIdx)}
                    onRemoveLetterAt={handleRemoveSlotLetter}
                    size="lg"
                  />
                ) : (
                  <PhonicsWordDisplay
                    word={activeQuizQ.word}
                    mode="masked"
                    maskedWord={activeQuizQ.maskedWord}
                    filledPattern={typedInput}
                    size="lg"
                  />
                )}
              </div>

              <div className="flex items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => speakEnglish(activeQuizQ.word, 0.85, 1.04)}
                  className="btn-clear-glass inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold"
                >
                  <Volume2 className="w-3.5 h-3.5 text-slate-700" />
                  소리 다시 듣기
                </button>
                {progress.s2_input_mode === "tiles" && !answerFeedback && pickedLetters.some(Boolean) && (
                  <button
                    type="button"
                    onClick={handleClearLastLetter}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-rose-50/80 hover:bg-rose-100/80 border border-rose-200 text-xs font-bold text-rose-700 backdrop-blur-sm"
                  >
                    <Delete className="w-3.5 h-3.5" />
                    하나 지우기
                  </button>
                )}
              </div>

              {answerFeedback && (
                <div
                  className={`px-4 py-2 rounded-xl text-sm font-extrabold ${
                    answerFeedback.correct
                      ? "bg-emerald-100/80 text-emerald-900 border border-emerald-300"
                      : "bg-rose-100/80 text-rose-900 border border-rose-300"
                  }`}
                >
                  {answerFeedback.message}
                </div>
              )}
            </div>

            {progress.s2_input_mode === "tiles" ? (
              <div className="space-y-2.5 text-center">
                <p className="text-xs font-bold text-slate-600">
                  빈칸에 들어갈 알파벳을 한 글자씩 순서대로 누르거나 끌어다 놓으세요
                </p>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2.5">
                  {letterOptions.map((letter) => (
                    <button
                      key={letter}
                      type="button"
                      draggable={!answerFeedback}
                      onDragStart={(e) => e.dataTransfer.setData("text/plain", letter)}
                      disabled={Boolean(answerFeedback) || submitting}
                      onClick={() => handlePickSingleLetter(letter)}
                      className="btn-clear-glass storybook-font py-3.5 rounded-full sm:rounded-2xl text-2xl font-black text-rose-600 cursor-grab active:cursor-grabbing"
                    >
                      {letter}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  submitAnswer(typedInput);
                }}
                className="flex gap-2.5"
              >
                <input
                  type="text"
                  autoFocus
                  value={typedInput}
                  disabled={Boolean(answerFeedback) || submitting}
                  onChange={(e) => setTypedInput(e.target.value)}
                  placeholder="빠진 글자 또는 전체 단어를 입력하세요"
                  className="storybook-font flex-1 px-4 py-3.5 rounded-2xl bg-white/45 backdrop-blur-md border border-white/85 shadow-inner focus:outline-none focus:bg-white/65 focus:border-slate-500 text-lg font-bold text-slate-900"
                />
                <button
                  type="submit"
                  disabled={!typedInput.trim() || Boolean(answerFeedback) || submitting}
                  className="btn-clear-glass px-6 py-3.5 rounded-2xl text-sm font-extrabold disabled:opacity-50"
                >
                  확인
                </button>
              </form>
            )}
          </div>
        ) : (
          <div className="py-10 text-center text-sm text-slate-500">문제를 불러오지 못했습니다.</div>
        )
      )}
    </div>
  );
};

import React, { useCallback, useEffect, useState } from "react";
import {
  ArrowRight,
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
  VocabAffixItem,
  VocabAttemptResult,
  VocabStage3Question,
  VocabUnit
} from "../../types";
import { playSoftTone, speakEnglish } from "../../utils/speech";
import { OceanProgressGauge } from "./OceanProgressGauge";
import { PronunciationFocusView } from "./PronunciationFocusView";

interface Stage3AffixViewProps {
  userId: string;
  state: StudentVocabState;
  onStateChange: (next: StudentVocabState) => void;
  onBackHome: () => void;
}

export const Stage3AffixView: React.FC<Stage3AffixViewProps> = ({
  userId,
  state,
  onStateChange,
  onBackHome
}) => {
  const { progress, units, todayKst } = state;
  const stage3Units = units.stage3;
  const activeUnitId = progress.current_s3_unit || stage3Units[0]?.id || "s3_pre_un";
  const storageKey = `bada_vocab_seen_${userId}_${todayKst}_s3_${activeUnitId}`;

  const [unitMeta, setUnitMeta] = useState<VocabUnit | null>(null);
  const [items, setItems] = useState<VocabAffixItem[]>([]);
  const [loadingUnit, setLoadingUnit] = useState(true);

  const [mode, setMode] = useState<"study" | "quiz" | "pronunciation">("study");
  const [itemIdx, setItemIdx] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [seenIds, setSeenIds] = useState<string[]>([]);
  const [showFamilyList, setShowFamilyList] = useState(false);

  // Quiz state
  const [quizQuestions, setQuizQuestions] = useState<VocabStage3Question[]>([]);
  const [quizIdx, setQuizIdx] = useState(0);
  const [quizLoading, setQuizLoading] = useState(false);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [wrongItems, setWrongItems] = useState<VocabStage3Question[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [attemptResult, setAttemptResult] = useState<VocabAttemptResult | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      const parsed = saved ? JSON.parse(saved) : [];
      setSeenIds(Array.isArray(parsed) ? parsed : []);
    } catch {
      setSeenIds([]);
    }
  }, [storageKey]);

  const markItemSeen = useCallback(
    (itemId: string) => {
      setSeenIds((prev) => {
        if (prev.includes(itemId)) return prev;
        const next = [...prev, itemId];
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
          `/api/vocab/unit?stage=3&unitKey=${encodeURIComponent(activeUnitId)}`
        );
        if (!res.ok) return;
        const data = await res.json();
        if (!active) return;
        if (data.ok) {
          setUnitMeta(data.unit || null);
          setItems(Array.isArray(data.affixItems) ? data.affixItems : []);
          setItemIdx(0);
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

  const activeItem = items[itemIdx] || items[0];
  const seenSet = new Set(seenIds);
  const validSeenCount = items.filter((it) => seenSet.has(it.id)).length;
  const allItemsChecked = items.length > 0 && validSeenCount >= items.length;

  const revealCurrentItem = useCallback(() => {
    if (!activeItem) return;
    setRevealed(true);
    markItemSeen(activeItem.id);
    speakEnglish(activeItem.derived_word, 0.85, 1.04);
  }, [activeItem, markItemSeen]);

  const goPrev = useCallback(() => {
    if (items.length === 0) return;
    const prev = (itemIdx - 1 + items.length) % items.length;
    setItemIdx(prev);
    setRevealed(false);
    speakEnglish(items[prev].derived_word, 0.85, 1.04);
  }, [itemIdx, items]);

  const goNext = useCallback(() => {
    if (items.length === 0) return;
    let next = itemIdx + 1;
    if (next >= items.length) {
      const firstUnseen = items.findIndex((it) => !seenSet.has(it.id));
      next = firstUnseen >= 0 ? firstUnseen : 0;
    }
    setItemIdx(next);
    setRevealed(false);
    speakEnglish(items[next].derived_word, 0.85, 1.04);
  }, [itemIdx, items, seenSet]);

  const jumpToFirstUnseen = () => {
    const idx = items.findIndex((it) => !seenSet.has(it.id));
    if (idx >= 0) {
      setItemIdx(idx);
      setRevealed(false);
      speakEnglish(items[idx].derived_word, 0.85, 1.04);
    }
  };

  useEffect(() => {
    if (mode !== "study") return;
    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (e.code === "Space") {
        e.preventDefault();
        revealCurrentItem();
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
  }, [mode, revealCurrentItem, goNext, goPrev]);

  const startQuiz = async () => {
    setMode("quiz");
    setQuizLoading(true);
    setAttemptResult(null);
    setSelectedOption(null);
    setQuizIdx(0);
    setCorrectCount(0);
    setWrongItems([]);
    try {
      const res = await fetch("/api/vocab/quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          stage: 3,
          unitKey: activeUnitId,
          attemptType: "daily_quiz"
        })
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        const qs: VocabStage3Question[] = Array.isArray(data.questions) ? data.questions : [];
        setQuizQuestions(qs);
        if (qs[0]) speakEnglish(qs[0].derivedWord, 0.85, 1.04);
      }
    } finally {
      setQuizLoading(false);
    }
  };

  const handleChoose = (opt: string) => {
    if (selectedOption || submitting) return;
    const q = quizQuestions[quizIdx];
    if (!q) return;

    const askAffix = quizIdx % 2 === 1;
    const expected = askAffix ? q.affix : q.derivedMeaningKr;
    const isRight = opt === expected;

    setSelectedOption(opt);
    const nextCorrect = isRight ? correctCount + 1 : correctCount;
    const nextWrong = isRight ? wrongItems : [...wrongItems, q];
    setCorrectCount(nextCorrect);
    setWrongItems(nextWrong);

    if (isRight) playSoftTone(820, 0.14);
    else playSoftTone(330, 0.14);
    speakEnglish(q.derivedWord, 0.85, 1.04);

    window.setTimeout(async () => {
      if (quizIdx + 1 < quizQuestions.length) {
        const nextIdx = quizIdx + 1;
        setQuizIdx(nextIdx);
        setSelectedOption(null);
        speakEnglish(quizQuestions[nextIdx].derivedWord, 0.85, 1.04);
        return;
      }

      setSubmitting(true);
      try {
        const res = await fetch("/api/vocab/attempt", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId,
            stage: 3,
            unitKey: activeUnitId,
            attemptType: "daily_quiz",
            totalCount: quizQuestions.length,
            correctCount: nextCorrect,
            wrongWordIds: nextWrong.map((w) => w.itemId)
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
    }, 820);
  };

  const renderFormulaBlocks = (item: VocabAffixItem) => {
    const affixBlock = (
      <div className="px-4 py-3 rounded-2xl bg-rose-50 border border-rose-200 text-center">
        <div className="storybook-font text-2xl font-black text-rose-600">{item.affix}</div>
        <div className="text-[11px] font-bold text-rose-800 mt-0.5">{item.affix_meaning_kr}</div>
      </div>
    );
    const rootBlock = (
      <button
        type="button"
        onClick={() => speakEnglish(item.root_word, 0.85, 1.04)}
        className="btn-clear-glass px-4 py-3 rounded-2xl text-center"
      >
        <div className="storybook-font text-2xl font-black text-slate-900">{item.root_word}</div>
        <div className="text-[11px] font-bold text-slate-600 mt-0.5">
          {item.root_pos} · {item.root_meaning_kr}
        </div>
      </button>
    );
    const derivedBlock = (
      <button
        type="button"
        onClick={revealCurrentItem}
        className={`px-5 py-3 rounded-2xl border backdrop-blur-md text-center transition cursor-pointer ${
          revealed
            ? "bg-white/60 border-white/95 shadow-xs"
            : "bg-white/35 hover:bg-white/52 border-dashed border-white/85"
        }`}
      >
        <div className="storybook-font text-2xl md:text-3xl font-black text-slate-900">
          {item.derived_word}
        </div>
        <div className="text-xs font-extrabold mt-0.5">
          {revealed ? (
            <span className="text-slate-800">
              {item.derived_pos} · {item.derived_meaning_kr}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-slate-700">
              <Eye className="w-3.5 h-3.5" />
              눌러서 뜻 확인
            </span>
          )}
        </div>
      </button>
    );

    return (
      <div className="flex flex-wrap items-center justify-center gap-3">
        {item.affix_type === "prefix" ? (
          <>
            {affixBlock}
            <span className="text-xl font-black text-slate-400">+</span>
            {rootBlock}
          </>
        ) : (
          <>
            {rootBlock}
            <span className="text-xl font-black text-slate-400">+</span>
            {affixBlock}
          </>
        )}
        <span className="text-xl font-black text-slate-400">=</span>
        {derivedBlock}
      </div>
    );
  };

  return (
    <div className="space-y-5">
      {/* Clean Header (No Top Colored Badges) */}
      <div className="pb-4 border-b border-[#e5dcc9] space-y-1">
        <h2 className="text-lg md:text-xl font-extrabold text-slate-900">
          {unitMeta?.title_kr || "접두어 · 접미사 단어 확장"}
        </h2>
        {unitMeta?.rule_summary_kr && (
          <p className="text-xs font-medium text-slate-600">{unitMeta.rule_summary_kr}</p>
        )}
      </div>

      {mode === "study" && (
        loadingUnit ? (
          <div className="py-12 text-center text-sm font-bold text-slate-500">단어 패밀리를 불러오는 중...</div>
        ) : activeItem ? (
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
                totalCount={items.length}
                onJumpUnseen={jumpToFirstUnseen}
              />

              <div className="w-full max-w-2xl space-y-4">
                <div className="card-clear-glass rounded-3xl p-6 md:p-8 text-center space-y-5">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-600">
                    <span>
                      {itemIdx + 1} / {items.length}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full bg-white/50 border border-white/80 text-slate-700">
                      {activeItem.explanation_kr}
                    </span>
                  </div>

                  {renderFormulaBlocks(activeItem)}

                  <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
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
                      onClick={() => speakEnglish(activeItem.root_word, 0.85, 1.04)}
                      className="btn-clear-glass inline-flex items-center gap-1.5 px-4 py-2.5 rounded-2xl text-xs font-bold"
                    >
                      <Volume2 className="w-3.5 h-3.5 text-slate-700" />
                      {activeItem.root_word}
                    </button>
                    <button
                      type="button"
                      onClick={() => speakEnglish(activeItem.derived_word, 0.85, 1.04)}
                      className="btn-clear-glass inline-flex items-center gap-1.5 px-5 py-2.5 rounded-2xl text-sm font-bold"
                    >
                      <Volume2 className="w-4 h-4 text-slate-700" />
                      {activeItem.derived_word}
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

                {allItemsChecked && (
                  <button
                    type="button"
                    onClick={() => void startQuiz()}
                    className="w-full py-3.5 px-5 rounded-2xl btn-water-glass text-base font-extrabold inline-flex items-center justify-center gap-2 shadow-sm"
                  >
                    모든 단어 확인 완료! 확장 퀴즈 시작
                    <ArrowRight className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Collapsible Affix Families */}
            <div className="max-w-4xl mx-auto card-clear-glass rounded-2xl overflow-hidden">
              <button
                type="button"
                onClick={() => setShowFamilyList((v) => !v)}
                className="w-full px-5 py-3.5 flex items-center justify-between text-sm font-extrabold text-slate-800 hover:bg-white/30 transition"
              >
                <span>
                  전체 단어 모아보기 (확인 {validSeenCount} / {items.length})
                </span>
                {showFamilyList ? (
                  <ChevronUp className="w-4 h-4 text-slate-600" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-slate-600" />
                )}
              </button>

              {showFamilyList && (
                <div className="p-4 pt-3 border-t border-white/60 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {items.map((it, idx) => {
                    const isChecked = seenSet.has(it.id);
                    return (
                      <button
                        key={it.id}
                        type="button"
                        onClick={() => {
                          markItemSeen(it.id);
                          speakEnglish(it.derived_word, 0.85, 1.04);
                          setItemIdx(idx);
                          setRevealed(true);
                        }}
                        className={`p-4 rounded-2xl text-left transition space-y-1.5 ${
                          idx === itemIdx
                            ? "bg-white/65 border-2 border-slate-500 backdrop-blur-md shadow-sm"
                            : isChecked
                              ? "bg-emerald-50/55 border border-emerald-300/80 backdrop-blur-md"
                              : "btn-clear-glass"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="storybook-font text-lg font-black text-slate-900">
                            {it.derived_word}
                          </span>
                          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-rose-50/80 text-rose-700">
                            {it.affix}
                          </span>
                        </div>
                        <div className="text-xs font-bold">
                          {isChecked ? (
                            <span className="text-slate-800">
                              {it.derived_pos} · {it.derived_meaning_kr}
                            </span>
                          ) : (
                            <span className="text-slate-600">눌러서 뜻 보기</span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          원형: {it.root_word} ({it.root_pos} · {it.root_meaning_kr})
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="py-10 text-center text-sm text-slate-500">학습 항목이 없습니다.</div>
        )
      )}

      {mode === "quiz" && (
        quizLoading ? (
          <div className="py-12 text-center text-sm font-bold text-slate-500">확장 퀴즈를 준비하는 중...</div>
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
              {!state.todayPronunciationDone
                ? "확장 퀴즈 완료! 마지막 '헷갈리는 발음 콕콕'을 마치면 탐험 완료 도장이 찍힙니다."
                : wrongItems.length === 0
                  ? "오늘 확장 퀴즈를 모두 맞혔어요!"
                  : "오늘 확장 퀴즈를 마쳤어요! 아래 틀린 표현을 확인한 뒤 학습 맵으로 돌아가세요."}
            </p>
            {wrongItems.length > 0 && (
              <div className="text-left space-y-2 pt-2 border-t border-white/60">
                <div className="text-xs font-bold text-rose-700">다시 볼 단어 ({wrongItems.length})</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {wrongItems.map((it) => (
                    <button
                      key={it.itemId}
                      type="button"
                      onClick={() => speakEnglish(it.derivedWord, 0.85, 1.04)}
                      className="flex items-center justify-between px-3.5 py-2 rounded-xl bg-rose-50/60 border border-rose-200/80 backdrop-blur-sm text-left"
                    >
                      <div>
                        <span className="storybook-font font-extrabold text-slate-900">{it.derivedWord}</span>
                        <span className="ml-2 text-xs font-semibold text-slate-600">{it.derivedMeaningKr}</span>
                      </div>
                      <Volume2 className="w-4 h-4 text-rose-600 shrink-0" />
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div className="flex flex-wrap items-center justify-center gap-3">
              {!state.todayPronunciationDone ? (
                <button
                  type="button"
                  onClick={() => setMode("pronunciation")}
                  className="px-7 py-3 rounded-full btn-water-glass text-sm font-extrabold inline-flex items-center gap-2"
                >
                  필수 마무리 · 헷갈리는 발음 학습하기
                  <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onBackHome}
                  className="px-7 py-3 rounded-full btn-water-glass text-sm font-extrabold"
                >
                  학습 맵으로 돌아가기 →
                </button>
              )}
            </div>
          </div>
        ) : quizQuestions[quizIdx] ? (
          (() => {
            const q = quizQuestions[quizIdx];
            const askAffix = quizIdx % 2 === 1;
            const choices = askAffix ? q.affixOptions : q.meaningOptions;
            const expected = askAffix ? q.affix : q.derivedMeaningKr;

            return (
              <div className="max-w-xl mx-auto space-y-5">
                <div className="card-clear-glass rounded-3xl p-6 md:p-8 text-center space-y-4">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-600">
                    <span>
                      문제 {quizIdx + 1} / {quizQuestions.length}
                    </span>
                    <span className="text-slate-700">맞힌 개수 {correctCount}</span>
                  </div>

                  {askAffix ? (
                    <div className="space-y-3">
                      <div className="text-xs font-bold text-rose-700">
                        빈칸에 알맞은 {q.affixType === "prefix" ? "접두어" : "접미사"}를 고르세요
                      </div>
                      <div className="flex flex-wrap items-center justify-center gap-2 text-2xl md:text-3xl font-black storybook-font">
                        {q.affixType === "prefix" ? (
                          <>
                            <span className="px-3 py-1 rounded-xl border-2 border-dashed border-rose-400 bg-rose-50/75 text-rose-600">
                              {selectedOption ? q.affix : "?"}
                            </span>
                            <span className="text-slate-400">+</span>
                            <span>{q.rootWord}</span>
                          </>
                        ) : (
                          <>
                            <span>{q.rootWord}</span>
                            <span className="text-slate-400">+</span>
                            <span className="px-3 py-1 rounded-xl border-2 border-dashed border-rose-400 bg-rose-50/75 text-rose-600">
                              {selectedOption ? q.affix : "?"}
                            </span>
                          </>
                        )}
                      </div>
                      <div className="text-base font-extrabold text-slate-800">
                        = {q.derivedMeaningKr} ({q.derivedPos})
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="text-xs font-bold text-slate-700">조합된 단어의 뜻을 고르세요</div>
                      <div className="text-sm font-bold text-slate-600">
                        <span className="text-rose-600">{q.affix}</span> ({q.affixMeaningKr}) +{" "}
                        <span className="storybook-font text-slate-900">{q.rootWord}</span> (
                        {q.rootMeaningKr})
                      </div>
                      <div className="storybook-font text-4xl font-black text-slate-900">
                        {q.derivedWord}
                      </div>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => speakEnglish(q.derivedWord, 0.85, 1.04)}
                    className="btn-clear-glass inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold"
                  >
                    <Volume2 className="w-3.5 h-3.5 text-slate-700" />
                    발음 듣기
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {choices.map((opt) => {
                    const isPicked = selectedOption === opt;
                    const isRight = opt === expected;
                    let style = "btn-clear-glass";
                    if (selectedOption) {
                      if (isRight) {
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
                        onClick={() => handleChoose(opt)}
                        className={`p-4 rounded-2xl text-base font-extrabold transition ${style} ${
                          askAffix ? "storybook-font text-xl" : ""
                        }`}
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

      {mode === "pronunciation" && (
        <PronunciationFocusView
          userId={userId}
          stage={3}
          unitKey={activeUnitId}
          tier={progress.vocab_tier || "all"}
          quizWordIds={quizQuestions.map((q) => q.itemId)}
          wrongWordIds={wrongItems.map((w) => w.itemId)}
          onComplete={(nextState) => {
            onStateChange(nextState);
            onBackHome();
          }}
        />
      )}
    </div>
  );
};

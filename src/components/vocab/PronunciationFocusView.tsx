import React, { useEffect, useState } from "react";
import { ArrowRight, CheckCircle2, Ear, Sparkles, Volume2 } from "lucide-react";
import type { PronunciationFocusItem, StudentVocabState, VocabTier } from "../../types";
import { playSoftTone, speakEnglish } from "../../utils/speech";

interface PronunciationFocusViewProps {
  userId: string;
  stage: 1 | 2 | 3;
  unitKey: string;
  tier: VocabTier;
  quizWordIds?: string[];
  wrongWordIds?: string[];
  onComplete: (nextState: StudentVocabState) => void;
}

function renderHighlightedWord(word: string, highlight: string, accentClass: string) {
  const lowerW = word.toLowerCase();
  const lowerH = highlight.toLowerCase();
  const idx = lowerH ? lowerW.indexOf(lowerH) : -1;
  if (idx < 0) return <span>{word}</span>;
  return (
    <span>
      {word.slice(0, idx)}
      <span className={accentClass}>{word.slice(idx, idx + highlight.length)}</span>
      {word.slice(idx + highlight.length)}
    </span>
  );
}

export const PronunciationFocusView: React.FC<PronunciationFocusViewProps> = ({
  userId,
  stage,
  unitKey,
  tier,
  quizWordIds = [],
  wrongWordIds = [],
  onComplete
}) => {
  const [items, setItems] = useState<PronunciationFocusItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [idx, setIdx] = useState(0);
  const [pickedSide, setPickedSide] = useState<"left" | "right" | null>(null);
  const [isRight, setIsRight] = useState(false);
  const [retryPrompt, setRetryPrompt] = useState("");
  const [completing, setCompleting] = useState(false);
  const [finished, setFinished] = useState(false);

  useEffect(() => {
    let active = true;
    const loadFocus = async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/vocab/pronunciation-focus", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId, stage, unitKey, tier, quizWordIds, wrongWordIds })
        });
        const data = await res.json();
        if (!active) return;
        if (res.ok && data.ok && Array.isArray(data.items)) {
          setItems(data.items);
          setIdx(0);
          setPickedSide(null);
          setIsRight(false);
          setRetryPrompt("");
          if (data.items[0]?.earQuiz?.audioWord) {
            window.setTimeout(() => {
              speakEnglish(data.items[0].earQuiz.audioWord, 0.85, 1.04);
            }, 250);
          }
        }
      } finally {
        if (active) setLoading(false);
      }
    };
    void loadFocus();
    return () => {
      active = false;
    };
  }, [userId, stage, unitKey, tier, quizWordIds, wrongWordIds]);

  const activeItem = items[idx];

  const handleChooseSide = (side: "left" | "right") => {
    if (!activeItem || isRight || completing) return;
    setPickedSide(side);
    const correct = side === activeItem.earQuiz.correctSide;

    if (correct) {
      playSoftTone(840, 0.16);
      setIsRight(true);
      setRetryPrompt("");
      speakEnglish(activeItem.earQuiz.audioWord, 0.85, 1.04);
    } else {
      playSoftTone(320, 0.14);
      setRetryPrompt("아쉬워요! 소리를 한 번 더 잘 듣고 다시 골라보세요.");
      speakEnglish(activeItem.earQuiz.audioWord, 0.82, 1.02);
    }
  };

  const handleAdvance = async () => {
    if (!activeItem || completing) return;
    if (idx + 1 < items.length) {
      const nextIdx = idx + 1;
      setIdx(nextIdx);
      setPickedSide(null);
      setIsRight(false);
      setRetryPrompt("");
      const nextAudio = items[nextIdx]?.earQuiz?.audioWord;
      if (nextAudio) {
        window.setTimeout(() => speakEnglish(nextAudio, 0.85, 1.04), 200);
      }
      return;
    }

    setCompleting(true);
    try {
      const res = await fetch("/api/vocab/pronunciation-complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId })
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        const { ok: _ok, ...nextState } = data;
        setFinished(true);
        playSoftTone(900, 0.18);
        window.setTimeout(() => {
          onComplete(nextState as StudentVocabState);
        }, 1200);
      }
    } finally {
      setCompleting(false);
    }
  };

  if (loading) {
    return (
      <div className="py-12 text-center text-sm font-bold text-slate-600">
        오늘 배운 단어에서 헷갈리는 발음을 선별하는 중...
      </div>
    );
  }

  if (finished) {
    return (
      <div className="max-w-lg mx-auto card-clear-glass rounded-3xl p-8 text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-emerald-100/90 text-emerald-700 flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-9 h-9" />
        </div>
        <h3 className="text-xl font-black text-slate-900">헷갈리는 발음까지 완벽 마스터!</h3>
        <p className="text-sm font-bold text-slate-700">
          오늘의 영단어 탐험이 완료되어 학습 맵에 포포 도장이 찍힙니다!
        </p>
      </div>
    );
  }

  if (!activeItem) {
    return (
      <div className="max-w-lg mx-auto card-clear-glass rounded-3xl p-7 text-center space-y-4">
        <p className="text-sm font-bold text-slate-700">발음 포인트를 바로 마무리할 수 있어요.</p>
        <button
          type="button"
          onClick={() => void handleAdvance()}
          className="px-6 py-3 rounded-full btn-water-glass text-sm font-extrabold"
        >
          탐험 완료하고 학습 맵으로 →
        </button>
      </div>
    );
  }

  const { pair, earQuiz } = activeItem;

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div className="card-clear-glass rounded-3xl p-6 md:p-8 space-y-5">
        <div className="flex items-center justify-between gap-2 text-xs font-extrabold text-slate-700">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/60 border border-white/85">
            <Ear className="w-3.5 h-3.5 text-sky-700" />
            필수 마무리 · 헷갈리는 발음 콕콕
          </span>
          <span>
            {idx + 1} / {items.length}
          </span>
        </div>

        <h3 className="text-lg md:text-xl font-black text-slate-900 leading-snug">
          {activeItem.titleKr}
        </h3>

        {activeItem.matchedTodayWords.length > 0 && (
          <div className="space-y-1.5">
            <div className="text-xs font-bold text-slate-600">오늘 단어 속 발음 확인</div>
            <div className="flex flex-wrap gap-2">
              {activeItem.matchedTodayWords.map((mw) => (
                <button
                  key={mw.word}
                  type="button"
                  onClick={() => speakEnglish(mw.word, 0.85, 1.04)}
                  className="btn-clear-glass inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm font-extrabold"
                >
                  <span className="storybook-font">
                    {mw.word.slice(0, mw.matchStart)}
                    <span className="text-rose-600 underline decoration-rose-400">
                      {mw.word.slice(mw.matchStart, mw.matchEnd)}
                    </span>
                    {mw.word.slice(mw.matchEnd)}
                  </span>
                  <span className="text-xs font-semibold text-slate-600">{mw.meaning_kr}</span>
                  <Volume2 className="w-3.5 h-3.5 text-slate-700" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Side-by-side Minimal Pair Comparison */}
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => speakEnglish(pair.leftWord, 0.82, 1.02)}
            className="btn-clear-glass rounded-2xl p-4 text-center space-y-1.5"
          >
            <div className="storybook-font text-2xl md:text-3xl font-black text-slate-900">
              {renderHighlightedWord(pair.leftWord, pair.leftHighlight, "text-rose-600")}
            </div>
            <div className="text-xs font-bold text-slate-600">{pair.leftMeaning}</div>
            <div className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-700">
              <Volume2 className="w-3.5 h-3.5" />
              비교 듣기
            </div>
          </button>

          <button
            type="button"
            onClick={() => speakEnglish(pair.rightWord, 0.82, 1.02)}
            className="btn-clear-glass rounded-2xl p-4 text-center space-y-1.5"
          >
            <div className="storybook-font text-2xl md:text-3xl font-black text-slate-900">
              {renderHighlightedWord(pair.rightWord, pair.rightHighlight, "text-sky-700")}
            </div>
            <div className="text-xs font-bold text-slate-600">{pair.rightMeaning}</div>
            <div className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-700">
              <Volume2 className="w-3.5 h-3.5" />
              비교 듣기
            </div>
          </button>
        </div>

        {/* Popo Mouth Tip */}
        <div className="rounded-2xl bg-white/50 border border-white/85 p-3.5 flex items-start gap-3">
          <img
            src="/assets/popo-3d.jpg"
            alt="포포 팁"
            className="w-9 h-9 rounded-full object-cover border border-sky-300 shrink-0"
          />
          <div className="space-y-0.5 text-left">
            <div className="text-xs font-extrabold text-sky-900 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              포포의 입모양 비법
            </div>
            <p className="text-xs md:text-sm font-bold text-slate-700 leading-relaxed">
              {activeItem.mouthTipKr}
            </p>
          </div>
        </div>

        {/* Mandatory Ear-Training Quiz */}
        <div className="pt-2 border-t border-white/60 space-y-3 text-center">
          <div className="text-sm font-extrabold text-slate-800">{earQuiz.promptKr}</div>

          <button
            type="button"
            onClick={() => speakEnglish(earQuiz.audioWord, 0.82, 1.02)}
            className="btn-clear-glass inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-extrabold"
          >
            <Volume2 className="w-4 h-4 text-sky-700" />
            문제 소리 다시 듣기
          </button>

          <div className="grid grid-cols-2 gap-3 pt-1">
            {(["left", "right"] as const).map((side) => {
              const label = side === "left" ? earQuiz.leftOption : earQuiz.rightOption;
              const isPicked = pickedSide === side;
              const isAnswer = side === earQuiz.correctSide;

              let btnStyle = "btn-clear-glass";
              if (isRight && isAnswer) {
                btnStyle = "bg-emerald-100/80 border-2 border-emerald-500 text-emerald-950 backdrop-blur-md";
              } else if (!isRight && isPicked) {
                btnStyle = "bg-rose-100/75 border-2 border-rose-400 text-rose-900 backdrop-blur-md";
              }

              return (
                <button
                  key={side}
                  type="button"
                  disabled={isRight || completing}
                  onClick={() => handleChooseSide(side)}
                  className={`storybook-font py-4 px-4 rounded-2xl text-2xl font-black transition ${btnStyle}`}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {retryPrompt && !isRight && (
            <p className="text-xs font-extrabold text-rose-700">{retryPrompt}</p>
          )}

          {isRight && (
            <div className="pt-2 space-y-3">
              <p className="text-sm font-extrabold text-emerald-800">
                정답이에요! ({earQuiz.audioWord}) 귀가 활짝 열렸어요!
              </p>
              <button
                type="button"
                disabled={completing}
                onClick={() => void handleAdvance()}
                className="w-full py-3.5 px-6 rounded-2xl btn-water-glass text-base font-extrabold inline-flex items-center justify-center gap-2"
              >
                {completing
                  ? "완료 기록 중..."
                  : idx + 1 < items.length
                    ? "다음 발음으로 →"
                    : "탐험 완료! 학습 맵으로 돌아가기"}
                {idx + 1 >= items.length && <ArrowRight className="w-4 h-4" />}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

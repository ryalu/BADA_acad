import React, { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, RotateCw, Volume2 } from "lucide-react";
import type { Book } from "../types";
import { getWeekDeckForBook } from "../utils/bookHelpers";
import { playSoftTone, speakEnglish } from "../utils/speech";

interface FlashcardDeckProps {
  book: Book;
  weekNum: 1 | 2 | 3 | 4;
  onGoToSpeaking: () => void;
}

export const FlashcardDeck: React.FC<FlashcardDeckProps> = ({
  book,
  weekNum,
  onGoToSpeaking
}) => {
  const deck = useMemo(() => getWeekDeckForBook(book, weekNum), [book, weekNum]);
  const [cardIdx, setCardIdx] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  const safeIdx = Math.min(cardIdx, Math.max(0, deck.length - 1));
  const item = deck[safeIdx];

  useEffect(() => {
    setCardIdx(0);
    setIsFlipped(false);
    if (deck[0]) {
      speakEnglish(deck[0].word, 0.84, 1.06);
    }
  }, [book.id, weekNum, deck]);

  if (!item) {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center">
        <p className="text-slate-600 mb-4">표시할 플래시카드가 없습니다.</p>
        <button
          type="button"
          onClick={onGoToSpeaking}
          className="px-5 py-2.5 rounded-xl bg-sky-600 text-white font-bold text-sm"
        >
          다음 단계로 이동
        </button>
      </div>
    );
  }

  const handleFlip = () => {
    const nextFlipped = !isFlipped;
    setIsFlipped(nextFlipped);
    playSoftTone(660, 0.12);
    if (!nextFlipped) {
      speakEnglish(item.word, 0.84, 1.06);
    }
  };

  const handlePrev = () => {
    const prevIdx = (safeIdx - 1 + deck.length) % deck.length;
    setCardIdx(prevIdx);
    setIsFlipped(false);
    speakEnglish(deck[prevIdx].word, 0.84, 1.06);
  };

  const handleNext = () => {
    playSoftTone(720, 0.14);
    if (safeIdx < deck.length - 1) {
      const nextIdx = safeIdx + 1;
      setCardIdx(nextIdx);
      setIsFlipped(false);
      speakEnglish(deck[nextIdx].word, 0.84, 1.06);
    } else {
      onGoToSpeaking();
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col justify-between gap-5 h-[calc(100vh-148px)] min-h-[500px] max-h-[760px]">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div>
          <span className="text-xs font-bold text-sky-700">{weekNum}주차 2교시 · 앞뒤 단어장</span>
          <h2 className="text-lg font-bold text-slate-900">
            영어 발음을 듣고 따라 말한 뒤 카드를 눌러 뜻을 확인하세요.
          </h2>
        </div>
        <span className="text-xs font-bold px-3 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
          카드 {safeIdx + 1} / {deck.length}
        </span>
      </div>

      {/* Center Interactive Flip Card */}
      <div className="flex-1 flex items-center justify-center">
        <div
          role="button"
          tabIndex={0}
          onClick={handleFlip}
          onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && handleFlip()}
          className={`w-full max-w-xl rounded-2xl border-2 p-8 text-center cursor-pointer transition shadow-sm ${
            isFlipped
              ? "bg-slate-50 border-sky-600"
              : "bg-white border-slate-200 hover:border-sky-400"
          }`}
        >
          <div className="flex items-center justify-between mb-6">
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-slate-100 text-slate-600">
              {safeIdx + 1} / {deck.length}
            </span>
            <span className="inline-flex items-center gap-1 text-xs font-bold px-3 py-1 rounded-full bg-sky-50 text-sky-700 border border-sky-200">
              <RotateCw className="w-3 h-3" />
              {isFlipped ? "뒷면 (뜻 · 예문)" : "앞면 (영어 단어)"}
            </span>
          </div>

          <div className="storybook-font text-4xl md:text-5xl font-black text-slate-900 mb-2">
            {item.word}
          </div>
          {item.phonetic && (
            <div className="text-sm font-semibold text-slate-400 mb-6">{item.phonetic}</div>
          )}

          {!isFlipped ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-600">
              소리를 듣고 따라 말한 뒤, 카드를 터치하면 뒷면(단어 뜻과 원서 예문)이 열립니다.
            </div>
          ) : (
            <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-3 text-left">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600">
                  {item.pos}
                </span>
              </div>
              <div className="text-2xl font-bold text-sky-700">{item.meaning_kr}</div>
              {item.example_en && (
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-1">
                  <p className="storybook-font text-sm font-bold text-slate-800">{item.example_en}</p>
                  <p className="text-xs font-medium text-slate-600">{item.example_kr}</p>
                </div>
              )}
              <p className="text-xs text-slate-500">{item.popo_tip}</p>
            </div>
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center justify-center gap-3 pt-2 border-t border-slate-100">
        <button
          type="button"
          onClick={handlePrev}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-bold transition"
        >
          <ArrowLeft className="w-4 h-4" />
          이전 카드
        </button>

        <button
          type="button"
          onClick={() => speakEnglish(item.word, 0.84, 1.06)}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-800 text-sm font-bold transition"
        >
          <Volume2 className="w-4 h-4 text-sky-600" />
          발음 듣기
        </button>

        <button
          type="button"
          onClick={handleNext}
          className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-sm font-bold transition shadow-sm"
        >
          {safeIdx < deck.length - 1 ? "익혔어요 · 다음 카드" : "카드 완료 · 3교시 스피킹으로"}
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};


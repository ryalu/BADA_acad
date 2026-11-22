import React, { useMemo, useState } from "react";
import { CheckCircle2, Volume2 } from "lucide-react";
import type { ClassCardItem } from "../../data/phonicsCurriculum";
import { playSoftTone, speakEnglish } from "../../utils/speech";

interface ClassCardStudioProps {
  classcardLevel: number;
  classCardDeck: ClassCardItem[];
  onBackToHub: () => void;
}

export const ClassCardStudio: React.FC<ClassCardStudioProps> = ({
  classcardLevel,
  classCardDeck,
  onBackToHub
}) => {
  const [ccStage, setCcStage] = useState<"study" | "quiz">("study");
  const [ccIdx, setCcIdx] = useState(0);
  const [ccFlipped, setCcFlipped] = useState(false);

  const [quizIdx, setQuizIdx] = useState(0);
  const [quizMsg, setQuizMsg] = useState("");
  const [quizDone, setQuizDone] = useState(false);

  const activeCc = classCardDeck[ccIdx] || classCardDeck[0];
  const activeQuiz = classCardDeck[quizIdx] || classCardDeck[0];

  const quizOptions = useMemo(() => {
    const distractors = classCardDeck
      .filter((_, idx) => idx !== quizIdx)
      .slice(0, 3)
      .map((c) => c.meaning);
    return [activeQuiz.meaning, ...distractors].sort();
  }, [classCardDeck, quizIdx, activeQuiz.meaning]);

  const handleAnswerQuiz = (choice: string) => {
    if (choice === activeQuiz.meaning) {
      playSoftTone(820, 0.16);
      speakEnglish(activeQuiz.word, 0.9, 1.06);
      setQuizMsg(`정답입니다! '${activeQuiz.word}'의 뜻은 '${activeQuiz.meaning}'입니다.`);
      setTimeout(() => {
        if (quizIdx < classCardDeck.length - 1) {
          setQuizIdx(quizIdx + 1);
          setQuizMsg("");
        } else {
          setQuizDone(true);
          setQuizMsg(`${classCardDeck.length}문제 복습 퀴즈를 모두 완료했습니다!`);
        }
      }, 750);
    } else {
      playSoftTone(340, 0.14);
      setQuizMsg("아쉽습니다. 다시 한 번 생각해 보세요.");
    }
  };

  return (
    <div className="py-2 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setCcStage("study")}
            className={`px-4 py-2 rounded-xl text-xs font-bold border ${
              ccStage === "study"
                ? "btn-water-glass"
                : "bg-white text-slate-600 border-slate-200"
            }`}
          >
            1단계 · 단어 카드 학습
          </button>
          <button
            type="button"
            onClick={() => {
              setCcStage("quiz");
              setQuizIdx(0);
              setQuizDone(false);
              setQuizMsg("");
            }}
            className={`px-4 py-2 rounded-xl text-xs font-bold border ${
              ccStage === "quiz"
                ? "btn-water-glass"
                : "bg-white text-slate-600 border-slate-200"
            }`}
          >
            2단계 · 복습 퀴즈
          </button>
        </div>
        <span className="text-xs font-bold text-slate-500">
          Level {classcardLevel || 2} / 26 · 총 {classCardDeck.length}단어 (파닉스 포함)
        </span>
      </div>

      {ccStage === "study" ? (
        <div className="space-y-5 max-w-xl mx-auto text-center">
          <div
            role="button"
            tabIndex={0}
            onClick={() => {
              const next = !ccFlipped;
              setCcFlipped(next);
              if (!next) speakEnglish(activeCc.word, 0.85, 1.06);
            }}
            className={`rounded-2xl border-2 p-8 cursor-pointer transition ${
              ccFlipped ? "bg-slate-50 border-sky-600" : "bg-white border-slate-200 hover:border-sky-400"
            }`}
          >
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold text-slate-400">
                카드 {ccIdx + 1} / {classCardDeck.length} · {ccFlipped ? "뒷면" : "앞면"}
              </span>
              {activeCc.category ? (
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-200">
                  {activeCc.category}
                </span>
              ) : activeCc.fromPhonics ? (
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-200">
                  파닉스 연계 단어
                </span>
              ) : null}
            </div>
            <div className="storybook-font text-4xl font-black text-slate-900 mb-4">
              {activeCc.word}
            </div>
            {!ccFlipped ? (
              <p className="text-sm text-slate-500">카드를 터치하면 뜻과 예문이 표시됩니다.</p>
            ) : (
              <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-1">
                <div className="text-xl font-bold text-sky-700">{activeCc.meaning}</div>
                <div className="storybook-font text-sm text-slate-600">{activeCc.example}</div>
              </div>
            )}
          </div>

          <div className="flex justify-center gap-3">
            <button
              type="button"
              onClick={() => {
                const prev = (ccIdx - 1 + classCardDeck.length) % classCardDeck.length;
                setCcIdx(prev);
                setCcFlipped(false);
                speakEnglish(classCardDeck[prev].word, 0.85, 1.06);
              }}
              className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-sm font-bold"
            >
              이전
            </button>
            <button
              type="button"
              onClick={() => speakEnglish(activeCc.word, 0.85, 1.06)}
              className="px-4 py-2 rounded-xl bg-slate-100 border border-slate-300 text-slate-800 text-sm font-bold"
            >
              발음 듣기
            </button>
            <button
              type="button"
              onClick={() => {
                if (ccIdx < classCardDeck.length - 1) {
                  const next = ccIdx + 1;
                  setCcIdx(next);
                  setCcFlipped(false);
                  speakEnglish(classCardDeck[next].word, 0.85, 1.06);
                } else {
                  setCcStage("quiz");
                  setQuizIdx(0);
                  setQuizDone(false);
                }
              }}
              className="px-5 py-2 rounded-xl btn-water-glass text-sm font-bold"
            >
              {ccIdx < classCardDeck.length - 1 ? "다음 카드" : "퀴즈로 이동"}
            </button>
          </div>
        </div>
      ) : (
        <div className="max-w-xl mx-auto space-y-5 text-center">
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 space-y-2">
            <span className="text-xs font-bold text-sky-700">
              복습 퀴즈 {quizIdx + 1} / {classCardDeck.length}
            </span>
            <div className="storybook-font text-4xl font-black text-slate-900">
              {activeQuiz.word}
            </div>
            <button
              type="button"
              onClick={() => speakEnglish(activeQuiz.word, 0.86, 1.06)}
              className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-white border border-slate-300 text-xs font-bold text-slate-700"
            >
              <Volume2 className="w-3.5 h-3.5 text-sky-600" />
              단어 듣기
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {quizOptions.map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => handleAnswerQuiz(opt)}
                className="p-4 rounded-xl bg-white hover:bg-sky-50 border border-slate-200 hover:border-sky-500 text-sm font-bold text-slate-800 transition"
              >
                {opt}
              </button>
            ))}
          </div>

          {quizMsg && (
            <div className="p-3 rounded-xl bg-slate-100 text-sm font-bold text-slate-800">
              {quizMsg}
            </div>
          )}

          {quizDone && (
            <button
              type="button"
              onClick={onBackToHub}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-bold"
            >
              <CheckCircle2 className="w-4 h-4" />
              훈련소 홈으로 돌아가기
            </button>
          )}
        </div>
      )}
    </div>
  );
};

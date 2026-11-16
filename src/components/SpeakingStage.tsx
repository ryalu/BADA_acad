import React, { useEffect, useMemo, useState } from "react";
import { ArrowLeft, CheckCircle2, MessageSquare, Mic, Volume2 } from "lucide-react";
import type { Book, PopoFeedback } from "../types";
import { getWeekSpeakingQuestions } from "../utils/bookHelpers";
import { playSoftTone, speakEnglish } from "../utils/speech";

interface SpeakingStageProps {
  book: Book;
  weekNum: 1 | 2 | 3 | 4;
  onBackToFlashcards: () => void;
  onCompleteWeek: () => Promise<void>;
}

export const SpeakingStage: React.FC<SpeakingStageProps> = ({
  book,
  weekNum,
  onBackToFlashcards,
  onCompleteWeek
}) => {
  const questions = useMemo(() => getWeekSpeakingQuestions(book, weekNum), [book, weekNum]);
  const [qIdx, setQIdx] = useState(0);
  const [showSubtitle, setShowSubtitle] = useState(true);
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [popoReplyEn, setPopoReplyEn] = useState("");
  const [popoReplyKr, setPopoReplyKr] = useState("");
  const [saving, setSaving] = useState(false);

  const safeIdx = Math.min(qIdx, Math.max(0, questions.length - 1));
  const qItem = questions[safeIdx];

  useEffect(() => {
    setQIdx(0);
    setTranscript("");
    setPopoReplyEn("");
    setPopoReplyKr("");
    if (questions[0]) {
      speakEnglish(questions[0].en, 0.9, 1.06);
    }
  }, [book.id, weekNum, questions]);

  const submitSpeech = async (spoken: string) => {
    setTranscript(spoken);
    try {
      const res = await fetch("/api/popo/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transcript: spoken,
          bookId: book.id,
          targetChunk: qItem?.target || "Look at the starfish"
        })
      });
      if (res.ok) {
        const fb: PopoFeedback = await res.json();
        const isPerfect = fb.evaluation_status === "PERFECT_BREACH";
        const enMsg = isPerfect
          ? `Awesome! "${spoken}" sounds great!`
          : `Good try! Let's practice saying: "${qItem?.target || spoken}"`;
        setPopoReplyEn(enMsg);
        setPopoReplyKr(
          isPerfect
            ? "아주 잘 말했어요! 다음 질문도 이어서 도전해 볼까요?"
            : `${fb.popo_response_template.step1_encourage} ${fb.popo_response_template.step2_correction}`
        );
        speakEnglish(enMsg, 0.9, 1.06);
        return;
      }
    } catch {
      // Fallback below
    }
    const fallbackEn = `Great job saying "${spoken}"!`;
    setPopoReplyEn(fallbackEn);
    setPopoReplyKr("좋아요! 자신감 있는 목소리로 아주 잘 말했습니다.");
    speakEnglish(fallbackEn, 0.9, 1.06);
  };

  const handleActivateMic = () => {
    if (!qItem) return;
    setListening(true);
    playSoftTone(700, 0.15);

    const SpeechRec =
      (window as unknown as { SpeechRecognition?: new () => unknown; webkitSpeechRecognition?: new () => unknown })
        .SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition?: new () => unknown }).webkitSpeechRecognition;

    if (SpeechRec) {
      try {
        const rec = new SpeechRec() as {
          lang: string;
          interimResults: boolean;
          maxAlternatives: number;
          onresult: (e: { results: { [i: number]: { [j: number]: { transcript: string } } } }) => void;
          onerror: () => void;
          start: () => void;
        };
        rec.lang = "en-US";
        rec.interimResults = false;
        rec.maxAlternatives = 1;
        rec.onresult = (e) => {
          setListening(false);
          submitSpeech(e.results[0][0].transcript);
        };
        rec.onerror = () => {
          setListening(false);
          submitSpeech(qItem.target);
        };
        rec.start();
        return;
      } catch {
        // fallback timer below
      }
    }

    setTimeout(() => {
      setListening(false);
      submitSpeech(qItem.target);
    }, 1100);
  };

  const handleNextQuestion = () => {
    const next = (safeIdx + 1) % questions.length;
    setQIdx(next);
    setTranscript("");
    setPopoReplyEn("");
    setPopoReplyKr("");
    if (questions[next]) {
      speakEnglish(questions[next].en, 0.9, 1.06);
    }
  };

  const handleFinish = async () => {
    setSaving(true);
    try {
      await onCompleteWeek();
    } finally {
      setSaving(false);
    }
  };

  if (!qItem) return null;

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col justify-between gap-5 h-[calc(100vh-148px)] min-h-[500px] max-h-[760px]">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div>
          <span className="text-xs font-bold text-sky-700">{weekNum}주차 3교시 · 스피킹 연습</span>
          <h2 className="text-lg font-bold text-slate-900">
            포포의 질문을 듣고 배운 표현으로 영어로 대답해 보세요.
          </h2>
        </div>
        <span className="text-xs font-bold px-3 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
          질문 {safeIdx + 1} / {questions.length}
        </span>
      </div>

      {/* Conversation Stage */}
      <div className="flex-1 flex flex-col justify-center gap-5 max-w-3xl mx-auto w-full">
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 flex flex-col sm:flex-row items-center gap-5">
          <div className="flex flex-col items-center gap-2.5 shrink-0">
            <img
              src="/assets/popo-3d.jpg"
              alt="아기 고래 포포"
              className="w-28 h-28 rounded-2xl object-cover border border-slate-200 shadow-sm"
            />
            <button
              type="button"
              onClick={() => speakEnglish(popoReplyEn || qItem.en, 0.9, 1.06)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-slate-100 border border-slate-300 text-xs font-bold text-slate-700"
            >
              <Volume2 className="w-3.5 h-3.5 text-sky-600" />
              다시 듣기
            </button>
          </div>

          <div className="flex-1 bg-white border border-slate-200 rounded-xl p-4 space-y-2.5 w-full">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-sky-700">포포의 질문</span>
              <button
                type="button"
                onClick={() => setShowSubtitle(!showSubtitle)}
                className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-700"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                {showSubtitle ? "자막 숨기기" : "자막 보기"}
              </button>
            </div>

            <p className="storybook-font text-xl font-bold text-slate-900 leading-snug">
              "{popoReplyEn || qItem.en}"
            </p>

            {showSubtitle && (
              <p className="text-sm font-medium text-slate-600 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
                {popoReplyKr || qItem.kr}
              </p>
            )}

            <div className="text-xs font-semibold text-slate-700 bg-sky-50 border border-sky-200 rounded-lg px-3 py-2">
              {transcript
                ? `내가 말한 문장: "${transcript}"`
                : "아래 마이크 버튼을 누르고 영어로 대답해 보세요."}
            </div>
          </div>
        </div>

        <div className="flex justify-center">
          <button
            type="button"
            onClick={handleActivateMic}
            disabled={listening}
            className={`inline-flex items-center gap-3 px-7 py-3.5 rounded-xl font-bold text-base text-white transition shadow-sm ${
              listening ? "bg-amber-600" : "btn-water-glass"
            }`}
          >
            <Mic className="w-5 h-5" />
            {listening ? "내 목소리를 듣고 있어요..." : "마이크 누르고 대답하기"}
          </button>
        </div>
      </div>

      {/* Bottom Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
        <button
          type="button"
          onClick={onBackToFlashcards}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-bold transition"
        >
          <ArrowLeft className="w-4 h-4" />
          단어 카드로
        </button>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleNextQuestion}
            className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-800 text-sm font-bold transition"
          >
            다음 질문 듣기
          </button>

          {safeIdx >= questions.length - 1 && (
            <button
              type="button"
              onClick={handleFinish}
              disabled={saving}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold transition shadow-sm disabled:opacity-60"
            >
              <CheckCircle2 className="w-4 h-4" />
              {saving ? "저장 중..." : `${weekNum}주차 학습 완료하기`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};


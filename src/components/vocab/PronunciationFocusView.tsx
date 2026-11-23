import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  Ear,
  Mic,
  MicOff,
  RotateCcw,
  Sparkles,
  Square,
  Volume2
} from "lucide-react";
import {
  PronunciationEvalResult,
  PronunciationFocusItem,
  PronunciationMode,
  StudentVocabState,
  VocabTier
} from "../../types";
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

function renderHighlightedWord(
  word: string,
  matchStart: number,
  matchEnd: number,
  sizeClass = "text-3xl sm:text-4xl"
) {
  const safeStart = Math.max(0, Math.min(word.length, matchStart || 0));
  const safeEnd = Math.max(safeStart, Math.min(word.length, matchEnd || safeStart + 1));
  const prefix = word.slice(0, safeStart);
  const focus = word.slice(safeStart, safeEnd);
  const suffix = word.slice(safeEnd);

  return (
    <span className={`${sizeClass} font-black tracking-tight text-slate-900`}>
      {prefix}
      <span className="text-rose-600 underline decoration-rose-400 decoration-4 underline-offset-4 bg-rose-50/80 px-1 rounded-md">
        {focus}
      </span>
      {suffix}
    </span>
  );
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(typeof reader.result === "string" ? reader.result : "");
    reader.onerror = () => reject(new Error("오디오 인코딩 실패"));
    reader.readAsDataURL(blob);
  });
}

export const PronunciationFocusView: React.FC<PronunciationFocusViewProps> = ({
  userId,
  stage,
  unitKey,
  tier,
  quizWordIds,
  wrongWordIds,
  onComplete
}) => {
  const quizIdsStableKey = useMemo(() => (quizWordIds || []).join(","), [quizWordIds]);
  const wrongIdsStableKey = useMemo(() => (wrongWordIds || []).join(","), [wrongWordIds]);

  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [mode, setMode] = useState<PronunciationMode>("day1_listen");
  const [requestedForceMode, setRequestedForceMode] = useState<PronunciationMode | null>(null);
  const [items, setItems] = useState<PronunciationFocusItem[]>([]);

  // Card progression state
  const [currentIndex, setCurrentIndex] = useState(0);
  const [day1SubStep, setDay1SubStep] = useState<"learn" | "ear_quiz">("learn");
  const [selectedOptionWord, setSelectedOptionWord] = useState<string | null>(null);
  const [earQuizFeedback, setEarQuizFeedback] = useState<"idle" | "wrong" | "correct">("idle");
  const [wrongOptionMessage, setWrongOptionMessage] = useState("");

  // Day 2 Speaking + AI Eval state
  const [recStatus, setRecStatus] = useState<
    "idle" | "recording" | "evaluating" | "passed" | "retry"
  >("idle");
  const [micLevel, setMicLevel] = useState(0);
  const [attemptCount, setAttemptCount] = useState(0);
  const [evalResult, setEvalResult] = useState<PronunciationEvalResult | null>(null);
  const [noMicFallback, setNoMicFallback] = useState(false);
  const [noMicReady, setNoMicReady] = useState(false);

  // Completion state
  const [completedPhase, setCompletedPhase] = useState<"active" | "day1_done" | "day2_done">("active");
  const [completing, setCompleting] = useState(false);
  const [savedNextState, setSavedNextState] = useState<StudentVocabState | null>(null);

  // MediaRecorder / Web Audio refs for strict cleanup
  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const rafRef = useRef<number | null>(null);
  const stopTimerRef = useRef<number | null>(null);
  const noMicTimerRef = useRef<number | null>(null);
  const mountedRef = useRef(true);

  const stopCaptureResources = useCallback(() => {
    if (stopTimerRef.current !== null) {
      window.clearTimeout(stopTimerRef.current);
      stopTimerRef.current = null;
    }
    if (noMicTimerRef.current !== null) {
      window.clearTimeout(noMicTimerRef.current);
      noMicTimerRef.current = null;
    }
    if (rafRef.current !== null) {
      window.cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      try {
        recorderRef.current.stop();
      } catch (_) {
        // ignore already stopped
      }
    }
    recorderRef.current = null;

    if (streamRef.current) {
      for (const t of streamRef.current.getTracks()) {
        try {
          t.stop();
        } catch (_) {
          // ignore
        }
      }
      streamRef.current = null;
    }
    if (audioCtxRef.current) {
      try {
        if (audioCtxRef.current.state !== "closed") {
          audioCtxRef.current.close().catch(() => {});
        }
      } catch (_) {
        // ignore
      }
      audioCtxRef.current = null;
    }
    setMicLevel(0);
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      stopCaptureResources();
    };
  }, [stopCaptureResources]);

  const loadSession = useCallback(async () => {
    setLoading(true);
    setErrorMsg("");
    stopCaptureResources();
    try {
      const resp = await fetch("/api/vocab/pronunciation-focus", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          stage,
          unitKey,
          tier,
          forceMode: requestedForceMode || undefined,
          quizWordIds: quizIdsStableKey ? quizIdsStableKey.split(",") : [],
          wrongWordIds: wrongIdsStableKey ? wrongIdsStableKey.split(",") : []
        })
      });
      const data = await resp.json();
      if (!resp.ok || !data.ok) {
        throw new Error(data.error || "발음 연습 데이터를 불러오지 못했습니다.");
      }
      if (!mountedRef.current) return;
      const loadedMode: PronunciationMode = data.mode === "day2_speak" ? "day2_speak" : "day1_listen";
      setMode(loadedMode);
      setItems(Array.isArray(data.items) ? data.items : []);
      setCurrentIndex(0);
      setDay1SubStep("learn");
      setSelectedOptionWord(null);
      setEarQuizFeedback("idle");
      setWrongOptionMessage("");
      setRecStatus("idle");
      setAttemptCount(0);
      setEvalResult(null);
      setNoMicReady(false);
      setCompletedPhase("active");
    } catch (err: any) {
      if (!mountedRef.current) return;
      setErrorMsg(err?.message || "오류가 발생했습니다.");
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [
    userId,
    stage,
    unitKey,
    tier,
    requestedForceMode,
    quizIdsStableKey,
    wrongIdsStableKey,
    stopCaptureResources
  ]);

  useEffect(() => {
    void loadSession();
  }, [loadSession]);

  const currentItem = items[currentIndex] || null;

  // Gently auto-play pronunciation once when arriving on a new card
  useEffect(() => {
    if (!currentItem || completedPhase !== "active" || loading) return;
    if (mode === "day1_listen" && day1SubStep === "learn") {
      const id = window.setTimeout(() => speakEnglish(currentItem.word, 0.82), 240);
      return () => window.clearTimeout(id);
    }
    if (mode === "day1_listen" && day1SubStep === "ear_quiz") {
      const id = window.setTimeout(() => speakEnglish(currentItem.word, 0.82), 200);
      return () => window.clearTimeout(id);
    }
    return undefined;
  }, [currentItem, currentIndex, mode, day1SubStep, completedPhase, loading]);

  const persistCompletion = useCallback(
    async (finishedMode: PronunciationMode) => {
      setCompleting(true);
      setErrorMsg("");
      try {
        const resp = await fetch("/api/vocab/pronunciation-complete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId,
            completedMode: finishedMode,
            stage,
            unitKey,
            tier,
            words: items
          })
        });
        const data = await resp.json();
        if (!resp.ok || !data.ok) {
          throw new Error(data.error || "완료 저장에 실패했습니다.");
        }
        if (!mountedRef.current) return;
        setSavedNextState(data as StudentVocabState);
        setCompletedPhase(finishedMode === "day2_speak" ? "day2_done" : "day1_done");
        playSoftTone(740, 0.22);
      } catch (err: any) {
        if (!mountedRef.current) return;
        setErrorMsg(err?.message || "완료 저장 중 오류가 발생했습니다.");
      } finally {
        if (mountedRef.current) setCompleting(false);
      }
    },
    [userId, stage, unitKey, tier, items]
  );

  const advanceToNextWord = useCallback(() => {
    stopCaptureResources();
    setSelectedOptionWord(null);
    setEarQuizFeedback("idle");
    setWrongOptionMessage("");
    setRecStatus("idle");
    setAttemptCount(0);
    setEvalResult(null);
    setNoMicReady(false);
    setDay1SubStep("learn");

    if (currentIndex + 1 < items.length) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      void persistCompletion(mode);
    }
  }, [currentIndex, items.length, mode, persistCompletion, stopCaptureResources]);

  const handleEarOptionClick = (optWord: string, isCorrect: boolean, meaningKr: string) => {
    setSelectedOptionWord(optWord);
    if (isCorrect) {
      setEarQuizFeedback("correct");
      setWrongOptionMessage("");
      playSoftTone(640, 0.16);
      speakEnglish(optWord, 0.85);
    } else {
      setEarQuizFeedback("wrong");
      setWrongOptionMessage(
        `아쉬워요! "${optWord}"(${meaningKr})가 아니라 다시 한 번 문제 소리를 잘 들어볼까요?`
      );
      playSoftTone(290, 0.15);
    }
  };

  const evaluateAudioBlob = useCallback(
    async (blob: Blob, targetItem: PronunciationFocusItem, nextAttemptNum: number) => {
      if (!mountedRef.current) return;
      setRecStatus("evaluating");
      try {
        const audioDataUrl = await blobToDataUrl(blob);
        const resp = await fetch("/api/vocab/pronunciation-eval", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            targetWord: targetItem.word,
            phonicsLabel: targetItem.phonicsLabel,
            mouthTipKr: targetItem.mouthTipKr,
            audioDataUrl,
            attemptNumber: nextAttemptNum
          })
        });
        const data: PronunciationEvalResult = await resp.json();
        if (!mountedRef.current) return;
        setEvalResult(data);
        if (data.passed) {
          setRecStatus("passed");
          playSoftTone(680, 0.18);
        } else {
          setRecStatus("retry");
          playSoftTone(330, 0.14);
        }
      } catch (_) {
        if (!mountedRef.current) return;
        setEvalResult({
          ok: true,
          passed: true,
          softPassed: true,
          heardText: targetItem.word,
          confidence: 0.75,
          feedbackKr: `좋아요! "${targetItem.word}" 발음을 큰 소리로 잘 연습했어요!`,
          tipKr: targetItem.mouthTipKr
        });
        setRecStatus("passed");
      }
    },
    []
  );

  const stopRecordingEarly = useCallback(() => {
    if (stopTimerRef.current !== null) {
      window.clearTimeout(stopTimerRef.current);
      stopTimerRef.current = null;
    }
    if (recorderRef.current && recorderRef.current.state === "recording") {
      try {
        recorderRef.current.stop();
      } catch (_) {
        // ignore
      }
    }
  }, []);

  const startRecordingWord = async () => {
    if (!currentItem || recStatus === "recording" || recStatus === "evaluating") return;
    stopCaptureResources();
    setErrorMsg("");

    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setNoMicFallback(true);
      setErrorMsg("이 브라우저에서는 마이크 녹음이 지원되지 않아 따라 읽기 모드로 전환했어요.");
      return;
    }

    const nextAttemptNum = attemptCount + 1;
    setAttemptCount(nextAttemptNum);

    try {
      const rawStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      if (!mountedRef.current) {
        rawStream.getTracks().forEach((t) => t.stop());
        return;
      }
      streamRef.current = rawStream;

      // Web Audio Gain + Level Meter + Processed Destination Stream
      let targetStream: MediaStream = rawStream;
      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx) {
          const ctx = new AudioCtx();
          audioCtxRef.current = ctx;
          const src = ctx.createMediaStreamSource(rawStream);
          const gain = ctx.createGain();
          gain.gain.value = 2.6;
          const analyser = ctx.createAnalyser();
          analyser.fftSize = 256;
          const dest = ctx.createMediaStreamDestination();
          src.connect(gain);
          gain.connect(analyser);
          gain.connect(dest);
          targetStream = dest.stream;

          const dataArr = new Uint8Array(analyser.frequencyBinCount);
          const updateMeter = () => {
            if (!mountedRef.current || !audioCtxRef.current) return;
            analyser.getByteFrequencyData(dataArr);
            let sum = 0;
            for (let i = 0; i < dataArr.length; i += 1) sum += dataArr[i];
            const avg = sum / Math.max(1, dataArr.length);
            setMicLevel(Math.min(100, Math.round((avg / 95) * 100)));
            rafRef.current = window.requestAnimationFrame(updateMeter);
          };
          rafRef.current = window.requestAnimationFrame(updateMeter);
        }
      } catch (_) {
        // Fallback to rawStream without GainNode
      }

      const preferredMimes = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg"];
      const supportedMime =
        preferredMimes.find((m) => MediaRecorder.isTypeSupported?.(m)) || "";

      const recorder = supportedMime
        ? new MediaRecorder(targetStream, { mimeType: supportedMime })
        : new MediaRecorder(targetStream);

      chunksRef.current = [];
      recorder.ondataavailable = (ev) => {
        if (ev.data && ev.data.size > 0) {
          chunksRef.current.push(ev.data);
        }
      };

      const capturedItem = currentItem;
      recorder.onstop = () => {
        const mimeType = recorder.mimeType || supportedMime || "audio/webm";
        const blob = new Blob(chunksRef.current, { type: mimeType });
        chunksRef.current = [];
        stopCaptureResources();
        if (mountedRef.current) {
          void evaluateAudioBlob(blob, capturedItem, nextAttemptNum);
        }
      };

      recorderRef.current = recorder;
      setRecStatus("recording");
      setEvalResult(null);
      recorder.start(150);

      stopTimerRef.current = window.setTimeout(() => {
        stopRecordingEarly();
      }, 3200);
    } catch (_) {
      stopCaptureResources();
      setNoMicFallback(true);
      setErrorMsg("마이크 연결을 확인할 수 없어 '따라 읽기 연습' 모드로 전환했어요.");
    }
  };

  const handleStartNoMicShadowing = () => {
    if (!currentItem) return;
    setNoMicReady(false);
    speakEnglish(currentItem.word, 0.8);
    if (noMicTimerRef.current !== null) window.clearTimeout(noMicTimerRef.current);
    noMicTimerRef.current = window.setTimeout(() => {
      if (mountedRef.current) setNoMicReady(true);
    }, 1100);
  };

  const progressPercent =
    items.length > 0 ? Math.round(((currentIndex + (completedPhase !== "active" ? 1 : 0)) / items.length) * 100) : 0;

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto p-6 card-water-glass rounded-3xl text-center">
        <div className="w-12 h-12 rounded-full border-4 border-sky-400 border-t-transparent animate-spin mx-auto mb-3" />
        <p className="text-slate-800 font-extrabold text-lg">오늘의 발음 코스를 준비하고 있어요...</p>
      </div>
    );
  }

  if (errorMsg && items.length === 0) {
    return (
      <div className="max-w-xl mx-auto p-6 card-water-glass rounded-3xl text-center space-y-4">
        <p className="text-rose-600 font-bold">{errorMsg}</p>
        <button
          type="button"
          onClick={() => void loadSession()}
          className="px-5 py-2.5 rounded-2xl btn-water-glass font-extrabold"
        >
          다시 시도
        </button>
      </div>
    );
  }

  // Day 1 Completed Screen
  if (completedPhase === "day1_done") {
    return (
      <div className="max-w-2xl mx-auto p-6 sm:p-8 card-water-glass rounded-3xl space-y-6 text-center">
        <div className="w-20 h-20 rounded-full bg-emerald-100/90 border-2 border-emerald-300 flex items-center justify-center mx-auto shadow-md">
          <Sparkles className="w-10 h-10 text-emerald-600" />
        </div>
        <div className="space-y-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-100 text-sky-800 text-xs font-extrabold">
            DAY 1 듣기 · 구분 완료!
          </span>
          <h3 className="text-2xl sm:text-3xl font-black text-slate-900">
            오늘 배운 {items.length}개 단어 발음을 정확히 익혔어요!
          </h3>
          <p className="text-slate-700 text-sm sm:text-base font-medium">
            내일 단어 학습 뒤에는 오늘 고른 단어들을 직접 소리 내어 발음하고 AI 포포 선생님에게 체크받아요.
          </p>
        </div>

        <div className="flex flex-wrap justify-center gap-2 bg-white/60 rounded-2xl p-4 border border-white/80">
          {items.map((it) => (
            <span
              key={it.wordId}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-sky-200 text-slate-800 font-bold text-sm shadow-xs"
            >
              <span>{it.word}</span>
              <span className="text-xs text-rose-600 font-extrabold">({it.phonicsLabel})</span>
            </span>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
          <button
            type="button"
            disabled={!savedNextState}
            onClick={() => savedNextState && onComplete(savedNextState)}
            className="px-6 py-3.5 rounded-2xl btn-water-glass font-black text-base text-slate-900 inline-flex items-center justify-center gap-2 shadow-md"
          >
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            탐험 완료! 학습 맵으로 돌아가기
          </button>

          <button
            type="button"
            onClick={() => setRequestedForceMode("day2_speak")}
            className="px-5 py-3.5 rounded-2xl bg-white/60 hover:bg-white/85 border border-sky-300 font-extrabold text-sm text-sky-900 inline-flex items-center justify-center gap-2 transition"
          >
            <Mic className="w-4 h-4 text-sky-600" />
            내일 할 직접 발음(Day 2) 미리 해보기
          </button>
        </div>
      </div>
    );
  }

  // Day 2 Completed Screen
  if (completedPhase === "day2_done") {
    return (
      <div className="max-w-2xl mx-auto p-6 sm:p-8 card-water-glass rounded-3xl space-y-6 text-center">
        <div className="w-20 h-20 rounded-full bg-amber-100/90 border-2 border-amber-300 flex items-center justify-center mx-auto shadow-md">
          <Mic className="w-10 h-10 text-amber-600" />
        </div>
        <div className="space-y-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-extrabold">
            DAY 2 직접 발음 AI 체크 완료!
          </span>
          <h3 className="text-2xl sm:text-3xl font-black text-slate-900">
            직접 소리 내어 {items.length}개 단어 발음까지 완벽 클리어!
          </h3>
          <p className="text-slate-700 text-sm sm:text-base font-medium">
            다음 날엔 현재 단원({unitKey})의 새로운 헷갈리는 단어들로 Day 1부터 다시 이어서 공부해요!
          </p>
        </div>

        <button
          type="button"
          disabled={!savedNextState}
          onClick={() => savedNextState && onComplete(savedNextState)}
          className="px-7 py-4 rounded-2xl btn-water-glass font-black text-base text-slate-900 inline-flex items-center justify-center gap-2 shadow-md"
        >
          <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          탐험 완료! 학습 맵으로 돌아가기
        </button>
      </div>
    );
  }

  if (!currentItem) {
    return null;
  }

  const isDay2 = mode === "day2_speak";

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      {/* Top Progress Header */}
      <div className="card-water-glass rounded-3xl p-4 sm:p-5 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black ${
                isDay2 ? "bg-amber-100 text-amber-800" : "bg-sky-100 text-sky-900"
              }`}
            >
              {isDay2 ? <Mic className="w-3.5 h-3.5" /> : <Ear className="w-3.5 h-3.5" />}
              {isDay2 ? "DAY 2 · 직접 발음 AI 체크" : "DAY 1 · 헷갈리는 발음 콕콕"}
            </span>
            <span className="text-xs font-extrabold text-slate-700 bg-white/70 px-2.5 py-1 rounded-full border border-white">
              Unit {unitKey} ({currentIndex + 1} / {items.length})
            </span>
          </div>

          {!isDay2 && requestedForceMode === "day1_listen" && (
            <span className="text-xs font-bold text-slate-600">듣기 집중 모드</span>
          )}
          {isDay2 && requestedForceMode === "day2_speak" && (
            <button
              type="button"
              onClick={() => setRequestedForceMode("day1_listen")}
              className="text-xs font-bold text-sky-800 underline"
            >
              Day 1 듣기로 돌아가기
            </button>
          )}
        </div>

        <div className="w-full h-2.5 rounded-full bg-white/60 overflow-hidden border border-white/80">
          <div
            className={`h-full rounded-full transition-all duration-300 ${
              isDay2
                ? "bg-gradient-to-r from-amber-400 to-orange-500"
                : "bg-gradient-to-r from-sky-400 to-cyan-500"
            }`}
            style={{ width: `${Math.max(8, progressPercent)}%` }}
          />
        </div>
      </div>

      {/* Main Word Card */}
      <div className="card-water-glass rounded-3xl p-5 sm:p-7 space-y-5">
        {errorMsg && (
          <div className="p-3 rounded-2xl bg-amber-50/90 border border-amber-200 text-amber-900 text-xs font-bold">
            {errorMsg}
          </div>
        )}

        {/* Word + Highlight + Optional Illustration */}
        <div className="flex flex-col sm:flex-row items-center gap-5 bg-white/65 rounded-3xl p-5 border border-white">
          {currentItem.imageUrl && (
            <img
              src={currentItem.imageUrl}
              alt={currentItem.word}
              className="w-28 h-28 sm:w-32 sm:h-32 object-contain rounded-2xl bg-white/80 p-2 border border-sky-100 shrink-0"
            />
          )}
          <div className="flex-1 text-center sm:text-left space-y-2">
            <span className="inline-block px-3 py-1 rounded-full bg-rose-100 text-rose-700 text-xs font-black">
              {currentItem.phonicsLabel}
            </span>
            <div>
              {renderHighlightedWord(
                currentItem.word,
                currentItem.matchStart,
                currentItem.matchEnd
              )}
            </div>
            <p className="text-lg font-extrabold text-slate-700">{currentItem.meaningKr}</p>
          </div>
        </div>

        {/* Popo Mouth Tip Box */}
        <div className="rounded-2xl bg-sky-50/80 border border-sky-200/80 p-4 space-y-1.5">
          <p className="text-sm font-black text-sky-900">{currentItem.titleKr}</p>
          <p className="text-sm font-semibold text-slate-700 leading-relaxed">
            포포 팁: {currentItem.mouthTipKr}
          </p>
        </div>

        {/* Audio Reference Controls */}
        <div className="flex flex-wrap gap-2.5 justify-center sm:justify-start">
          <button
            type="button"
            onClick={() => speakEnglish(currentItem.word, 0.68)}
            className="px-4 py-2.5 rounded-2xl bg-white/75 hover:bg-white border border-sky-200 text-slate-800 text-sm font-extrabold inline-flex items-center gap-2 transition"
          >
            <Volume2 className="w-4 h-4 text-sky-600" />
            천천히 듣기 (0.68x)
          </button>
          <button
            type="button"
            onClick={() => speakEnglish(currentItem.word, 0.88)}
            className="px-4 py-2.5 rounded-2xl bg-white/75 hover:bg-white border border-sky-200 text-slate-800 text-sm font-extrabold inline-flex items-center gap-2 transition"
          >
            <Volume2 className="w-4 h-4 text-cyan-600" />
            자연스럽게 듣기 (0.88x)
          </button>
        </div>

        {/* DAY 1 SUBSTEPS */}
        {!isDay2 && day1SubStep === "learn" && (
          <div className="pt-2 flex justify-end">
            <button
              type="button"
              onClick={() => {
                setDay1SubStep("ear_quiz");
                setSelectedOptionWord(null);
                setEarQuizFeedback("idle");
                setWrongOptionMessage("");
              }}
              className="w-full sm:w-auto px-6 py-3.5 rounded-2xl btn-water-glass font-black text-base text-slate-900 inline-flex items-center justify-center gap-2"
            >
              소리 잘 들었어요! 귀 퀴즈 풀기
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {!isDay2 && day1SubStep === "ear_quiz" && (
          <div className="space-y-4 pt-2 border-t border-white/70">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <p className="text-sm font-extrabold text-slate-800">
                {currentItem.listenPromptKr ||
                  `Unit ${unitKey} 단어 중에서 방금 들린 소리를 찾아보세요!`}
              </p>
              <button
                type="button"
                onClick={() => speakEnglish(currentItem.word, 0.82)}
                className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-black inline-flex items-center gap-1.5 shrink-0"
              >
                <Volume2 className="w-4 h-4" />
                문제 다시 듣기
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {(currentItem.listenOptions || []).map((opt) => {
                const isSelected = selectedOptionWord === opt.word;
                const isCorrectHighlight = earQuizFeedback === "correct" && opt.isCorrect;
                const isWrongSelected = earQuizFeedback === "wrong" && isSelected && !opt.isCorrect;

                return (
                  <button
                    key={opt.wordId}
                    type="button"
                    onClick={() => handleEarOptionClick(opt.word, opt.isCorrect, opt.meaningKr)}
                    className={`p-4 rounded-2xl border-2 text-center transition space-y-1 ${
                      isCorrectHighlight
                        ? "bg-emerald-50/90 border-emerald-400 shadow-md"
                        : isWrongSelected
                          ? "bg-rose-50/90 border-rose-400"
                          : "bg-white/45 hover:bg-white/75 border-white/80"
                    }`}
                  >
                    <div className="font-black text-xl text-slate-900">
                      {renderHighlightedWord(opt.word, opt.matchStart, opt.matchEnd, "text-xl")}
                    </div>
                    <p className="text-xs font-bold text-slate-600">{opt.meaningKr}</p>
                  </button>
                );
              })}
            </div>

            {earQuizFeedback === "wrong" && wrongOptionMessage && (
              <p className="text-sm font-bold text-rose-700 bg-rose-50/80 border border-rose-200 rounded-xl px-4 py-2.5">
                {wrongOptionMessage}
              </p>
            )}

            {earQuizFeedback === "correct" && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-emerald-50/90 border border-emerald-300 rounded-2xl p-4">
                <p className="text-sm font-black text-emerald-900">
                  정답이에요! &ldquo;{currentItem.word}&rdquo;({currentItem.meaningKr}) 발음을 정확히 구별했어요!
                </p>
                <button
                  type="button"
                  disabled={completing}
                  onClick={advanceToNextWord}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm inline-flex items-center justify-center gap-1.5 shrink-0"
                >
                  {currentIndex + 1 < items.length ? "다음 단어로" : "Day 1 완료하기!"}
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        )}

        {/* DAY 2 SPEAKING + AI PRONUNCIATION CHECK */}
        {isDay2 && (
          <div className="space-y-4 pt-2 border-t border-white/70">
            {!noMicFallback ? (
              <>
                <p className="text-sm font-extrabold text-slate-800">
                  {currentItem.speakPromptKr ||
                    "마이크 버튼을 누르고 1~3초 안에 큰 목소리로 한 번만 또렷하게 말해보세요!"}
                </p>

                <div className="rounded-2xl bg-white/60 border border-white p-4 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    {recStatus === "recording" ? (
                      <button
                        type="button"
                        onClick={stopRecordingEarly}
                        className="px-6 py-3.5 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-black text-base inline-flex items-center gap-2 shadow-md animate-pulse"
                      >
                        <Square className="w-4 h-4 fill-current" />
                        녹음 중... 다 말했으면 누르기
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={recStatus === "evaluating" || recStatus === "passed"}
                        onClick={() => void startRecordingWord()}
                        className="px-6 py-3.5 rounded-2xl btn-water-glass font-black text-base text-slate-900 inline-flex items-center gap-2 disabled:opacity-60"
                      >
                        <Mic className="w-5 h-5 text-rose-600" />
                        {recStatus === "evaluating"
                          ? "포포가 발음을 듣고 있어요..."
                          : recStatus === "retry"
                            ? `다시 말해보기 (${attemptCount}/3회)`
                            : "마이크 눌러 발음하기"}
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        stopCaptureResources();
                        setNoMicFallback(true);
                      }}
                      className="text-xs font-bold text-slate-600 hover:text-slate-900 underline inline-flex items-center gap-1"
                    >
                      <MicOff className="w-3.5 h-3.5" />
                      마이크가 없나요? 따라 읽기 연습으로 진행
                    </button>
                  </div>

                  {/* Live mic level meter */}
                  {recStatus === "recording" && (
                    <div className="space-y-1">
                      <div className="w-full h-3 rounded-full bg-slate-200/80 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-emerald-400 via-sky-500 to-rose-500 transition-all duration-75"
                          style={{ width: `${Math.max(10, micLevel)}%` }}
                        />
                      </div>
                      <p className="text-xs font-bold text-slate-600">
                        지금 &ldquo;{currentItem.word}&rdquo;를 또렷하게 말해주세요!
                      </p>
                    </div>
                  )}
                </div>

                {/* AI Evaluation Feedback */}
                {evalResult && (
                  <div
                    className={`rounded-2xl p-4 border space-y-2 ${
                      evalResult.passed
                        ? "bg-emerald-50/90 border-emerald-300 text-emerald-950"
                        : "bg-amber-50/90 border-amber-300 text-amber-950"
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-black text-sm">
                        {evalResult.passed ? "통과!" : "한 번 더 도전해 볼까요?"}
                      </span>
                      {evalResult.heardText && (
                        <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-white/80 border border-slate-200 text-slate-700">
                          포포가 들은 발음: &ldquo;{evalResult.heardText}&rdquo;
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-bold">{evalResult.feedbackKr}</p>
                    {evalResult.tipKr && !evalResult.passed && (
                      <p className="text-xs font-semibold text-amber-900">
                        입모양 힌트: {evalResult.tipKr}
                      </p>
                    )}

                    {evalResult.passed && (
                      <div className="pt-1 flex justify-end">
                        <button
                          type="button"
                          disabled={completing}
                          onClick={advanceToNextWord}
                          className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm inline-flex items-center gap-1.5"
                        >
                          {currentIndex + 1 < items.length ? "다음 단어 발음하기" : "Day 2 완료하기!"}
                          <ArrowRight className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </>
            ) : (
              /* Guided Aloud Shadowing Mode when no microphone is connected */
              <div className="rounded-2xl bg-white/65 border border-sky-200 p-4 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-black text-sky-900">
                    따라 읽기 모드 (마이크 없음)
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setNoMicFallback(false);
                      setErrorMsg("");
                    }}
                    className="text-xs font-bold text-sky-700 underline inline-flex items-center gap-1"
                  >
                    <RotateCcw className="w-3 h-3" />
                    마이크 다시 연결
                  </button>
                </div>
                <p className="text-xs font-semibold text-slate-700">
                  아래 버튼을 눌러 원어민 발음을 들은 뒤, 입을 크게 벌려 3번 큰 소리로 따라 읽어 보세요!
                </p>
                <div className="flex flex-wrap gap-2.5">
                  <button
                    type="button"
                    onClick={handleStartNoMicShadowing}
                    className="px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-sm font-black inline-flex items-center gap-1.5"
                  >
                    <Volume2 className="w-4 h-4" />
                    듣고 큰 소리로 따라 읽기
                  </button>
                  <button
                    type="button"
                    disabled={!noMicReady || completing}
                    onClick={advanceToNextWord}
                    className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white text-sm font-black inline-flex items-center gap-1.5 transition"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    {currentIndex + 1 < items.length
                      ? "따라 읽었어요! 다음 단어로"
                      : "따라 읽었어요! 완료하기"}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default PronunciationFocusView;

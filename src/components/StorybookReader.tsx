import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  BookOpen,
  Check,
  ChevronLeft,
  ChevronRight,
  Mic,
  MicOff,
  Square,
  Volume2,
  X
} from "lucide-react";
import type { Book } from "../types";
import { BookCover } from "./BookCover";
import {
  getBookSentences,
  getSentenceChunksForWeek2,
  lookupWordMeaning,
  splitBookIntoContextPages
} from "../utils/bookHelpers";
import { playPageFlipSound, playSoftTone, speakEnglish, stopAllSpeech } from "../utils/speech";

interface StorybookReaderProps {
  book: Book;
  weekNum: 1 | 2 | 3 | 4;
  userId?: string;
  weekProgress?: number;
  onRecordRepeatComplete?: (payload: {
    repeatNum: number;
    nextProgress: number;
    weakWords: string[];
    feedbackTip: string;
  }) => void;
  onBackHome?: () => void;
  onGoToFlashcards: () => void;
}

type VoiceStatus = "idle" | "playing" | "listening" | "matched" | "retry" | "unsupported";

const SHORT_FUNCTION_WORDS = new Set([
  "a",
  "an",
  "the",
  "i",
  "in",
  "on",
  "at",
  "to",
  "of",
  "is",
  "it",
  "by",
  "or",
  "as",
  "be",
  "do",
  "go",
  "he",
  "me",
  "my",
  "no",
  "so",
  "up",
  "us",
  "we"
]);

function normalizeSpeech(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9'\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function doesSpeechMatch(transcript: string, target: string, weekNum: 1 | 2 | 3 | 4): boolean {
  const spokenNorm = normalizeSpeech(transcript);
  const targetNorm = normalizeSpeech(target);
  if (!spokenNorm || !targetNorm) return false;

  const spokenWords = spokenNorm.split(" ").filter(Boolean);
  const targetWords = targetNorm.split(" ").filter(Boolean);

  if (weekNum === 1 || targetWords.length === 1) {
    const tWord = targetWords[0] || targetNorm;
    if (SHORT_FUNCTION_WORDS.has(tWord) || tWord.length <= 2) {
      return spokenWords.length > 0;
    }
    if (spokenWords.includes(tWord) || spokenNorm.includes(tWord)) return true;
    const prefix = tWord.slice(0, Math.min(3, tWord.length));
    return spokenWords.some(
      (w) => (w.length >= 2 && tWord.startsWith(w)) || (prefix.length >= 3 && w.startsWith(prefix))
    );
  }

  let matchedCount = 0;
  for (const tw of targetWords) {
    if (spokenWords.includes(tw)) {
      matchedCount += 1;
      continue;
    }
    if (tw.length >= 3) {
      const prefix = tw.slice(0, 3);
      if (spokenWords.some((sw) => sw.startsWith(prefix) || tw.startsWith(sw))) {
        matchedCount += 1;
      }
    }
  }

  const required = targetWords.length <= 2 ? 1 : Math.max(1, Math.ceil(targetWords.length * 0.45));
  return matchedCount >= required;
}

export const StorybookReader: React.FC<StorybookReaderProps> = ({
  book,
  weekNum,
  userId,
  weekProgress = 0,
  onRecordRepeatComplete,
  onBackHome,
  onGoToFlashcards
}) => {
  const sentences = useMemo(() => getBookSentences(book), [book]);
  const spreads = useMemo(() => splitBookIntoContextPages(book), [book]);

  const [isCoverOpen, setIsCoverOpen] = useState(false);
  const [pageIdx, setPageIdx] = useState(0);
  const [flipLeaf, setFlipLeaf] = useState<{ dir: "next" | "prev"; key: number } | null>(null);
  const [sentenceIdx, setSentenceIdx] = useState(0);
  const [wordIdx, setWordIdx] = useState(0);
  const [chunkIdx, setChunkIdx] = useState(0);
  const [completedSentences, setCompletedSentences] = useState<Set<number>>(new Set());
  const [pinnedWordKey, setPinnedWordKey] = useState<string | null>(null);
  const [hoveredWordInfo, setHoveredWordInfo] = useState<{
    word: string;
    kr: string;
    phonetic: string;
    nextWord?: string;
  } | null>(null);

  const [voiceStatus, setVoiceStatus] = useState<VoiceStatus>("idle");
  const [recognizedText, setRecognizedText] = useState("");
  const [isAutoLoop, setIsAutoLoop] = useState(false);
  const [showCoverModal, setShowCoverModal] = useState(false);
  const [submittingRepeat, setSubmittingRepeat] = useState(false);
  const [repeatSubmittedMsg, setRepeatSubmittedMsg] = useState<string | null>(null);
  const [aiCoachingTip, setAiCoachingTip] = useState<{
    pronunciation: string;
    intonation: string;
    weakWords: string[];
  } | null>(null);

  const completedRepeats = Math.min(5, Math.floor((weekProgress || 0) / 20));

  const recognitionRef = useRef<any>(null);
  const autoLoopRef = useRef(false);
  const advanceTimeoutRef = useRef<number | null>(null);
  const flipTimerRef = useRef<number | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const recordedChunksRef = useRef<BlobPart[]>([]);
  const sessionTranscriptRef = useRef<string[]>([]);

  const startAudioCapture = useCallback(async () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") return;
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      const recorder = new MediaRecorder(stream);
      recordedChunksRef.current = [];
      recorder.ondataavailable = (ev) => {
        if (ev.data && ev.data.size > 0) recordedChunksRef.current.push(ev.data);
      };
      recorder.start(500);
      mediaRecorderRef.current = recorder;
    } catch {
      // Mic permission denied or unavailable; speech recognition fallback still works
    }
  }, []);

  const stopAudioCaptureAndGetDataUrl = useCallback(async (): Promise<string> => {
    const rec = mediaRecorderRef.current;
    const stream = mediaStreamRef.current;
    mediaRecorderRef.current = null;
    mediaStreamRef.current = null;

    if (!rec) {
      if (stream) stream.getTracks().forEach((t) => t.stop());
      return "";
    }

    const blob = await new Promise<Blob>((resolve) => {
      const finalize = () => {
        if (stream) stream.getTracks().forEach((t) => t.stop());
        resolve(new Blob(recordedChunksRef.current, { type: rec.mimeType || "audio/webm" }));
      };
      if (rec.state === "inactive") {
        finalize();
      } else {
        rec.onstop = finalize;
        try {
          rec.stop();
        } catch {
          finalize();
        }
      }
    });

    if (!blob || blob.size === 0) return "";
    return await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(typeof reader.result === "string" ? reader.result : "");
      reader.onerror = () => resolve("");
      reader.readAsDataURL(blob);
    });
  }, []);

  const triggerBookFlip = useCallback((dir: "next" | "prev") => {
    if (flipTimerRef.current !== null) {
      window.clearTimeout(flipTimerRef.current);
    }
    playPageFlipSound();
    setFlipLeaf({ dir, key: Date.now() });
    flipTimerRef.current = window.setTimeout(() => {
      setFlipLeaf(null);
      flipTimerRef.current = null;
    }, 560);
  }, []);

  const stopVoiceSession = useCallback(() => {
    autoLoopRef.current = false;
    setIsAutoLoop(false);
    if (advanceTimeoutRef.current !== null) {
      window.clearTimeout(advanceTimeoutRef.current);
      advanceTimeoutRef.current = null;
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.onresult = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.onend = null;
        recognitionRef.current.abort();
      } catch {
        // ignore abort errors
      }
      recognitionRef.current = null;
    }
    stopAllSpeech();
    setVoiceStatus("idle");
    setRecognizedText("");
  }, []);

  // Reset reading indices when book or week changes
  useEffect(() => {
    stopVoiceSession();
    setPageIdx(0);
    setFlipLeaf(null);
    setSentenceIdx(0);
    setWordIdx(0);
    setChunkIdx(0);
    setCompletedSentences(new Set());
    setPinnedWordKey(null);
    setHoveredWordInfo(null);
  }, [book.id, weekNum, stopVoiceSession]);

  useEffect(() => {
    return () => {
      stopVoiceSession();
      if (flipTimerRef.current !== null) {
        window.clearTimeout(flipTimerRef.current);
      }
    };
  }, [stopVoiceSession]);

  const currentSpread = spreads[pageIdx] || spreads[0] || { pageIndex: 0, sentences: [] };
  const currentIllustration =
    (book.page_illustrations || []).find((p) => Number(p.page_index) === pageIdx) ||
    (book.page_illustrations || [])[pageIdx];
  const illustrationImageUrl = currentIllustration?.image_url || "";
  const activeSent = sentences[sentenceIdx] || "";
  const activeWords = useMemo(() => activeSent.split(/\s+/).filter(Boolean), [activeSent]);
  const activeChunks = useMemo(() => getSentenceChunksForWeek2(activeSent, book), [activeSent, book]);

  const safeWordIdx = Math.min(wordIdx, Math.max(0, activeWords.length - 1));
  const safeChunkIdx = Math.min(chunkIdx, Math.max(0, activeChunks.length - 1));
  const activeWordRaw = activeWords[safeWordIdx] || "";
  const cleanActiveWord = activeWordRaw.replace(/[^a-zA-Z0-9'-]/g, "") || activeWordRaw;
  const activeWordInfo = lookupWordMeaning(activeWordRaw, book);
  const activeChunk = activeChunks[safeChunkIdx] || activeChunks[0];

  const allDone = sentences.length > 0 && completedSentences.size >= sentences.length;

  const syncPageToSentence = useCallback(
    (nextSentIdx: number) => {
      const targetSpreadIdx = spreads.findIndex((sp) =>
        sp.sentences.some((s) => s.sentenceIndex === nextSentIdx)
      );
      if (targetSpreadIdx >= 0 && targetSpreadIdx !== pageIdx) {
        triggerBookFlip(targetSpreadIdx > pageIdx ? "next" : "prev");
        setPageIdx(targetSpreadIdx);
      }
    },
    [spreads, pageIdx, triggerBookFlip]
  );

  // Compute the next reading step without relying on stale closures
  const advanceStep = useCallback(
    (
      curSentIdx: number,
      curWordIdx: number,
      curChunkIdx: number
    ): {
      finishedAll: boolean;
      nextSentIdx: number;
      nextWordIdx: number;
      nextChunkIdx: number;
      nextSpeechText: string;
      nextSpeechRate: number;
      nextContextWord?: string;
    } => {
      const curSent = sentences[curSentIdx] || "";
      const words = curSent.split(/\s+/).filter(Boolean);
      const chunks = getSentenceChunksForWeek2(curSent, book);

      if (weekNum === 1) {
        if (curWordIdx < words.length - 1) {
          const nw = curWordIdx + 1;
          setWordIdx(nw);
          const raw = words[nw] || "";
          const clean = raw.replace(/[^a-zA-Z0-9'-]/g, "") || raw;
          return {
            finishedAll: false,
            nextSentIdx: curSentIdx,
            nextWordIdx: nw,
            nextChunkIdx: curChunkIdx,
            nextSpeechText: clean,
            nextSpeechRate: 0.72,
            nextContextWord: words[nw + 1] || ""
          };
        }

        setCompletedSentences((prev) => {
          const next = new Set(prev);
          next.add(curSentIdx);
          return next;
        });

        if (curSentIdx < sentences.length - 1) {
          const ns = curSentIdx + 1;
          setSentenceIdx(ns);
          setWordIdx(0);
          syncPageToSentence(ns);
          const nWords = (sentences[ns] || "").split(/\s+/).filter(Boolean);
          const firstClean = (nWords[0] || "").replace(/[^a-zA-Z0-9'-]/g, "") || nWords[0] || "";
          return {
            finishedAll: false,
            nextSentIdx: ns,
            nextWordIdx: 0,
            nextChunkIdx: 0,
            nextSpeechText: firstClean,
            nextSpeechRate: 0.72,
            nextContextWord: nWords[1] || ""
          };
        }

        return {
          finishedAll: true,
          nextSentIdx: curSentIdx,
          nextWordIdx: curWordIdx,
          nextChunkIdx: curChunkIdx,
          nextSpeechText: "",
          nextSpeechRate: 0.72
        };
      }

      if (weekNum === 2) {
        if (curChunkIdx < chunks.length - 1) {
          const nc = curChunkIdx + 1;
          setChunkIdx(nc);
          return {
            finishedAll: false,
            nextSentIdx: curSentIdx,
            nextWordIdx: curWordIdx,
            nextChunkIdx: nc,
            nextSpeechText: chunks[nc]?.text || "",
            nextSpeechRate: 0.76
          };
        }

        setCompletedSentences((prev) => {
          const next = new Set(prev);
          next.add(curSentIdx);
          return next;
        });

        if (curSentIdx < sentences.length - 1) {
          const ns = curSentIdx + 1;
          setSentenceIdx(ns);
          setChunkIdx(0);
          syncPageToSentence(ns);
          const nChunks = getSentenceChunksForWeek2(sentences[ns] || "", book);
          return {
            finishedAll: false,
            nextSentIdx: ns,
            nextWordIdx: 0,
            nextChunkIdx: 0,
            nextSpeechText: nChunks[0]?.text || sentences[ns] || "",
            nextSpeechRate: 0.76
          };
        }

        return {
          finishedAll: true,
          nextSentIdx: curSentIdx,
          nextWordIdx: curWordIdx,
          nextChunkIdx: curChunkIdx,
          nextSpeechText: "",
          nextSpeechRate: 0.76
        };
      }

      // Week 3 & 4: sentence by sentence
      setCompletedSentences((prev) => {
        const next = new Set(prev);
        next.add(curSentIdx);
        return next;
      });

      if (curSentIdx < sentences.length - 1) {
        const ns = curSentIdx + 1;
        setSentenceIdx(ns);
        syncPageToSentence(ns);
        return {
          finishedAll: false,
          nextSentIdx: ns,
          nextWordIdx: 0,
          nextChunkIdx: 0,
          nextSpeechText: sentences[ns] || "",
          nextSpeechRate: weekNum === 4 ? 0.94 : 0.88
        };
      }

      return {
        finishedAll: true,
        nextSentIdx: curSentIdx,
        nextWordIdx: curWordIdx,
        nextChunkIdx: curChunkIdx,
        nextSpeechText: "",
        nextSpeechRate: weekNum === 4 ? 0.94 : 0.88
      };
    },
    [sentences, book, weekNum, syncPageToSentence]
  );

  const runVoiceStep = useCallback(
    (
      targetText: string,
      rate: number,
      contextNextWord: string | undefined,
      curS: number,
      curW: number,
      curC: number
    ) => {
      if (!targetText) {
        stopVoiceSession();
        return;
      }

      const SpeechRecognitionCtor =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

      setVoiceStatus("playing");
      setRecognizedText("");

      speakEnglish(
        targetText,
        rate,
        1.04,
        () => {
          if (!autoLoopRef.current) return;

          if (!SpeechRecognitionCtor) {
            setVoiceStatus("unsupported");
            autoLoopRef.current = false;
            setIsAutoLoop(false);
            return;
          }

          try {
            const recognition = new SpeechRecognitionCtor();
            recognitionRef.current = recognition;
            recognition.lang = "en-US";
            recognition.interimResults = true;
            recognition.maxAlternatives = 3;
            recognition.continuous = false;

            let matched = false;
            setVoiceStatus("listening");
            setRecognizedText("");

            recognition.onresult = (event: any) => {
              if (matched || !autoLoopRef.current) return;

              let combined = "";
              for (let i = event.resultIndex; i < event.results.length; i += 1) {
                for (let j = 0; j < event.results[i].length; j += 1) {
                  combined += " " + (event.results[i][j]?.transcript || "");
                }
              }

              const latestDisplay = (event.results[event.results.length - 1]?.[0]?.transcript || "").trim();
              if (latestDisplay) setRecognizedText(latestDisplay);

              if (doesSpeechMatch(combined, targetText, weekNum)) {
                matched = true;
                if (latestDisplay) {
                  sessionTranscriptRef.current.push(latestDisplay);
                }
                try {
                  recognition.stop();
                } catch {
                  // ignore
                }
                setVoiceStatus("matched");
                playSoftTone(780, 0.14);

                advanceTimeoutRef.current = window.setTimeout(() => {
                  if (!autoLoopRef.current) return;
                  const next = advanceStep(curS, curW, curC);
                  if (next.finishedAll) {
                    stopVoiceSession();
                    playSoftTone(880, 0.25);
                    return;
                  }
                  runVoiceStep(
                    next.nextSpeechText,
                    next.nextSpeechRate,
                    next.nextContextWord,
                    next.nextSentIdx,
                    next.nextWordIdx,
                    next.nextChunkIdx
                  );
                }, 400);
              }
            };

            recognition.onerror = (err: any) => {
              if (matched || !autoLoopRef.current) return;
              if (err?.error === "not-allowed" || err?.error === "service-not-allowed") {
                setVoiceStatus("unsupported");
                autoLoopRef.current = false;
                setIsAutoLoop(false);
                return;
              }
              setVoiceStatus("retry");
            };

            recognition.onend = () => {
              if (!matched && autoLoopRef.current) {
                setVoiceStatus((prev) => (prev === "unsupported" ? prev : "retry"));
              }
            };

            recognition.start();
          } catch {
            setVoiceStatus("unsupported");
            autoLoopRef.current = false;
            setIsAutoLoop(false);
          }
        },
        contextNextWord
      );
    },
    [weekNum, advanceStep, stopVoiceSession]
  );

  const handleToggleVoicePractice = () => {
    if (isAutoLoop) {
      stopVoiceSession();
      return;
    }

    setRepeatSubmittedMsg(null);
    sessionTranscriptRef.current = [];
    void startAudioCapture();
    autoLoopRef.current = true;
    setIsAutoLoop(true);

    if (weekNum === 1) {
      runVoiceStep(
        cleanActiveWord,
        0.72,
        activeWords[safeWordIdx + 1] || "",
        sentenceIdx,
        safeWordIdx,
        safeChunkIdx
      );
    } else if (weekNum === 2 && activeChunk) {
      runVoiceStep(activeChunk.text, 0.76, undefined, sentenceIdx, safeWordIdx, safeChunkIdx);
    } else if (activeSent) {
      runVoiceStep(
        activeSent,
        weekNum === 4 ? 0.94 : 0.88,
        undefined,
        sentenceIdx,
        safeWordIdx,
        safeChunkIdx
      );
    }
  };

  const handleSubmitRepeatToTeacher = async () => {
    if (submittingRepeat) return;
    setSubmittingRepeat(true);
    stopVoiceSession();

    const nextRepeat = Math.min(5, completedRepeats + 1);
    const nextProgress = Math.min(100, nextRepeat * 20);
    const transcript = sessionTranscriptRef.current.join(" ").trim();
    const audioDataUrl = await stopAudioCaptureAndGetDataUrl();

    let weakWords: string[] = [];
    let pronunciationTip = "오늘 하루도 정말 잘 읽었어요! 다음 회차도 차근차근 도전해 보아요.";
    let intonationTip = "문장 끝에 리듬을 실어 자연스럽게 읽어 보아요.";

    try {
      if (userId && audioDataUrl) {
        const recRes = await fetch("/api/recordings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId,
            bookId: book.id,
            weekNum,
            repeatNum: nextRepeat,
            transcript,
            audioDataUrl,
            expectedText: book.full_text,
            level: book.level
          })
        });
        if (recRes.ok) {
          const recData = await recRes.json();
          const fb = recData?.recording?.ai_feedback;
          if (fb) {
            weakWords = Array.isArray(fb.weak_words) ? fb.weak_words : [];
            pronunciationTip = fb.pronunciation_tip_kr || pronunciationTip;
            intonationTip = fb.intonation_tip_kr || intonationTip;
          }
        }
      }

      if (userId) {
        await fetch("/api/users/progress", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId,
            week: weekNum,
            progress: nextProgress
          })
        });
      }

      setAiCoachingTip({ pronunciation: pronunciationTip, intonation: intonationTip, weakWords });
      setRepeatSubmittedMsg(
        nextRepeat >= 5
          ? `${weekNum}주차 5회 반복 완주! 진주 5개를 모두 모았어요!`
          : `오늘 ${nextRepeat}회차 읽기 완료! 진주 ${nextRepeat}/5개를 모았어요.`
      );
      playSoftTone(880, 0.22);

      if (onRecordRepeatComplete) {
        onRecordRepeatComplete({
          repeatNum: nextRepeat,
          nextProgress,
          weakWords,
          feedbackTip: pronunciationTip
        });
      }
    } finally {
      setSubmittingRepeat(false);
    }
  };

  const handleManualNext = () => {
    stopVoiceSession();
    playSoftTone(720, 0.12);
    const next = advanceStep(sentenceIdx, safeWordIdx, safeChunkIdx);
    if (!next.finishedAll && next.nextSpeechText) {
      speakEnglish(next.nextSpeechText, next.nextSpeechRate, 1.04, null, next.nextContextWord || "");
    }
  };

  const handleListenCurrent = () => {
    stopVoiceSession();
    if (weekNum === 1) {
      speakEnglish(cleanActiveWord, 0.72, 1.04, null, activeWords[safeWordIdx + 1] || "");
    } else if (weekNum === 2 && activeChunk) {
      speakEnglish(activeChunk.text, 0.76, 1.04);
    } else if (activeSent) {
      speakEnglish(activeSent, weekNum === 4 ? 0.94 : 0.88, 1.04);
    }
  };

  const handleTurnPage = (dir: -1 | 1) => {
    stopVoiceSession();
    if (dir === -1 && pageIdx === 0) {
      playPageFlipSound();
      setIsCoverOpen(false);
      return;
    }
    const nextP = Math.min(spreads.length - 1, Math.max(0, pageIdx + dir));
    if (nextP === pageIdx) return;
    triggerBookFlip(dir > 0 ? "next" : "prev");
    setPageIdx(nextP);
    const firstSentOnPage = spreads[nextP]?.sentences[0];
    if (firstSentOnPage) {
      setSentenceIdx(firstSentOnPage.sentenceIndex);
      setWordIdx(0);
      setChunkIdx(0);
    }
  };

  const weekGuidance =
    weekNum === 1
      ? "1주차 · 한 단어씩 천천히 듣고 따라 말하기 (소리가 인식되면 다음 단어로 넘어갑니다)"
      : weekNum === 2
        ? "2주차 · 의미 단위(구)로 끊어 읽고 따라 말하기"
        : weekNum === 3
          ? "3주차 · 이야기 줄거리를 생각하며 한 문장씩 따라 읽기"
          : "4주차 · 전체 스토리 자연스럽게 완독하기";

  const focusDisplay = hoveredWordInfo
    ? hoveredWordInfo
    : weekNum === 2 && activeChunk
      ? {
        word: activeChunk.text,
        kr: activeChunk.meaning_kr,
        phonetic: `구 ${safeChunkIdx + 1}/${activeChunks.length}`
      }
      : {
        word: activeWordInfo.word,
        kr: activeWordInfo.kr,
        phonetic: activeWordInfo.phonetic,
        nextWord: activeWords[safeWordIdx + 1] || ""
      };

  if (!isCoverOpen) {
    return (
      <div className="relative flex flex-col items-center justify-center gap-6 h-[calc(100vh-16px)] min-h-[560px]">
        {onBackHome && (
          <button
            type="button"
            onClick={onBackHome}
            className="absolute top-2 left-2 inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-white/85 hover:bg-white border border-[#e5dcc9] text-xs font-bold text-slate-700 shadow-xs transition"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            항해 맵
          </button>
        )}
        <div className="w-full max-w-sm space-y-5 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#f4efe5] border border-[#e5dcc9] text-xs font-bold text-amber-900">
            {weekNum}주차 원서 읽기 · 반복 {completedRepeats}/5
          </div>

          <BookCover
            book={book}
            size="lg"
            onClick={() => {
              playPageFlipSound();
              setIsCoverOpen(true);
            }}
            className="shadow-[0_24px_48px_-14px_rgba(30,41,59,0.28)]"
          />

          <p className="text-xs text-slate-600">{weekGuidance}</p>

          <button
            type="button"
            onClick={() => {
              playPageFlipSound();
              setIsCoverOpen(true);
            }}
            className="w-full py-3.5 px-6 rounded-full btn-water-glass font-bold text-sm inline-flex items-center justify-center gap-2"
          >
            책 펼치기 (1쪽 시작)
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col justify-between gap-2 h-[calc(100vh-16px)] min-h-[580px]">
      {showCoverModal && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setShowCoverModal(false)}
        >
          <div
            className="bg-white rounded-3xl p-5 max-w-sm w-full shadow-2xl border border-slate-200 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-slate-800">원서 표지</span>
              <button
                type="button"
                onClick={() => setShowCoverModal(false)}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <BookCover book={book} size="lg" />
            <button
              type="button"
              onClick={() => setShowCoverModal(false)}
              className="w-full py-2.5 rounded-xl btn-water-glass text-sm font-bold"
            >
              책 계속 읽기
            </button>
          </div>
        </div>
      )}

      {/* Open Picture-Book Spread: Left (Full-Height Illustration) | Spine | Right (English + Korean right below) */}
      <div className="book-stage relative flex-1 min-h-0 rounded-2xl shadow-[0_18px_44px_-12px_rgba(92,74,48,0.22)] border border-[#e5dcc9] bg-[#fdfaf2] overflow-hidden grid grid-cols-1 md:grid-cols-[8px_1.08fr_6px_1fr_8px]">
        {/* Left Stacked Paper Thickness */}
        <div className="hidden md:block book-edges-left border-r border-[#e5dcc9]" />

        {/* LEFT PAGE: Full-Height Picture-Book Illustration */}
        <div className="relative bg-[#f7f2e7] book-gutter-left flex items-center justify-center overflow-hidden min-h-[240px]">
          {illustrationImageUrl ? (
            <img
              src={illustrationImageUrl}
              alt={currentIllustration?.scene_caption_kr || book.title}
              className="w-full h-full object-contain"
            />
          ) : (
            <div className="text-xs text-stone-400">그림을 준비하고 있어요</div>
          )}

          {/* Minimal floating back button */}
          {onBackHome && (
            <button
              type="button"
              onClick={() => {
                stopVoiceSession();
                onBackHome();
              }}
              className="absolute top-3 left-3 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/85 hover:bg-white text-slate-700 text-[11px] font-bold shadow-xs backdrop-blur-xs transition"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              항해 맵
            </button>
          )}

          {/* Subtle caption overlay (keyword tags removed per user request) */}
          {currentIllustration?.scene_caption_kr && (
            <div className="absolute inset-x-0 bottom-0 px-4 py-2.5 bg-gradient-to-t from-slate-950/55 via-slate-950/15 to-transparent">
              <span className="text-xs font-semibold text-white drop-shadow">
                {currentIllustration.scene_caption_kr}
              </span>
            </div>
          )}
        </div>

        {/* REALISTIC CENTER BOOK SPINE CREASE */}
        <div className="hidden md:block bg-gradient-to-r from-[#d2c8b4] via-[#9e937e] to-[#d2c8b4]" />

        {/* RIGHT PAGE: English Sentences with Korean Translation directly beneath each sentence */}
        <div className="bg-[#fdfaf2] book-gutter-right px-5 py-4 md:px-7 md:py-5 flex flex-col justify-between overflow-y-auto">
          <div className="flex items-center justify-between gap-2 pb-2 border-b border-[#ece4d3]">
            <span className="text-[11px] text-stone-400">단어에 마우스를 올리면 뜻이 보입니다</span>
            <div className="flex items-center gap-1.5">
              <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#f4efe5]">
                <span className="text-[11px] font-bold text-amber-900">{weekNum}주차 {completedRepeats}/5</span>
                {Array.from({ length: 5 }).map((_, idx) => (
                  <img
                    key={idx}
                    src="/assets/pearl-badge-3d.jpg"
                    alt={`${idx + 1}회차`}
                    className={`w-3.5 h-3.5 rounded-full object-cover ${idx < completedRepeats ? "opacity-100 ring-1 ring-cyan-400" : "opacity-30 grayscale"
                      }`}
                  />
                ))}
              </div>
              <button
                type="button"
                onClick={() => {
                  stopVoiceSession();
                  speakEnglish(book.full_text, weekNum <= 2 ? 0.78 : 0.9, 1.04);
                }}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#f2ece1] hover:bg-[#e8dfd1] text-slate-700 text-[11px] font-bold transition"
              >
                <Volume2 className="w-3.5 h-3.5 text-sky-700" />
                전체 듣기
              </button>
            </div>
          </div>

          <div className="my-auto py-3 space-y-5 divide-y divide-[#ece4d3]/80">
            {currentSpread.sentences.map((s) => {
              const isActSent = s.sentenceIndex === sentenceIdx;
              const isDoneSent = completedSentences.has(s.sentenceIndex);
              const words = s.en.split(/\s+/).filter(Boolean);
              const sChunks = weekNum === 2 ? getSentenceChunksForWeek2(s.en, book) : [];
              const chunkEnds = new Set(sChunks.slice(0, -1).map((c) => c.endWordIdx));

              return (
                <div
                  key={s.sentenceIndex}
                  onClick={() => {
                    stopVoiceSession();
                    setSentenceIdx(s.sentenceIndex);
                    setWordIdx(0);
                    setChunkIdx(0);
                  }}
                  className={`pt-4 first:pt-0 pl-3.5 py-1.5 border-l-2 transition cursor-pointer ${isActSent
                      ? "border-sky-600 bg-amber-50/45 rounded-r-lg"
                      : isDoneSent
                        ? "border-emerald-400/70 text-slate-600"
                        : "border-transparent hover:border-stone-300"
                    }`}
                >
                  <p className="book-serif text-xl md:text-[23px] font-semibold text-slate-800 leading-[2.05]">
                    {words.map((tok, wIdx) => {
                      const info = lookupWordMeaning(tok, book);
                      const wKey = `${s.sentenceIndex}-${wIdx}`;
                      const isAutoActiveWord = weekNum === 1 && isActSent && wIdx === safeWordIdx;
                      const isDoneWord = weekNum === 1 && isActSent && wIdx < safeWordIdx;
                      const isChunkActive =
                        weekNum === 2 &&
                        isActSent &&
                        activeChunk &&
                        wIdx >= activeChunk.startWordIdx &&
                        wIdx <= activeChunk.endWordIdx;
                      const isPinned = pinnedWordKey === wKey || isAutoActiveWord;

                      return (
                        <React.Fragment key={wKey}>
                          <span
                            tabIndex={0}
                            onMouseEnter={() =>
                              setHoveredWordInfo({
                                word: info.word,
                                kr: info.kr,
                                phonetic: info.phonetic,
                                nextWord: words[wIdx + 1] || ""
                              })
                            }
                            onMouseLeave={() => setHoveredWordInfo(null)}
                            onClick={(e) => {
                              e.stopPropagation();
                              stopVoiceSession();
                              setSentenceIdx(s.sentenceIndex);
                              if (weekNum === 1) {
                                setWordIdx(wIdx);
                                speakEnglish(info.word, 0.72, 1.04, null, words[wIdx + 1] || "");
                              } else {
                                setPinnedWordKey(pinnedWordKey === wKey ? null : wKey);
                                speakEnglish(info.word, 0.86, 1.04, null, words[wIdx + 1] || "");
                              }
                            }}
                            className={`group relative inline-block px-1 py-0.5 mx-0.5 rounded-lg border-b-2 transition cursor-pointer ${isAutoActiveWord
                                ? "bg-amber-100 border-amber-500 text-slate-900 scale-105 z-20"
                                : isChunkActive
                                  ? "bg-sky-100 border-sky-600 text-sky-950"
                                  : isDoneWord
                                    ? "text-teal-700 border-emerald-400"
                                    : info.isCore
                                      ? "bg-sky-50/80 border-sky-400 text-slate-900 hover:bg-amber-100"
                                      : "border-dotted border-stone-300 hover:bg-amber-100"
                              }`}
                          >
                            {tok}
                            <span
                              className={`pointer-events-none font-sans absolute left-1/2 -translate-x-1/2 bottom-[calc(100%+8px)] whitespace-nowrap bg-slate-900 text-white text-xs font-semibold px-2.5 py-1.5 rounded-lg shadow-lg z-30 transition-opacity ${isPinned
                                  ? "opacity-100"
                                  : "opacity-0 group-hover:opacity-100 group-focus:opacity-100"
                                }`}
                            >
                              <span className="text-amber-300 font-bold">{info.kr}</span>
                              {info.phonetic && (
                                <span className="text-slate-300 ml-1.5 font-normal">{info.phonetic}</span>
                              )}
                            </span>
                          </span>{" "}
                          {weekNum === 2 && wIdx < words.length - 1 && chunkEnds.has(wIdx) && (
                            <span className="font-sans inline-block mx-1 px-1.5 py-0.5 text-xs font-bold rounded bg-stone-100 text-sky-700 border border-stone-200 align-middle">
                              /
                            </span>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </p>

                  {/* Korean translation directly beneath each English sentence (no sentence index label) */}
                  <p
                    className={`mt-2 text-sm md:text-base leading-relaxed ${isActSent ? "font-bold text-slate-700" : "font-medium text-slate-500"
                      }`}
                  >
                    {s.kr}
                  </p>

                  {weekNum === 2 && isActSent && activeChunk && (
                    <div className="mt-1 text-xs font-semibold text-sky-700">
                      현재 구: "{activeChunk.text}" → {activeChunk.meaning_kr}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Active Word/Chunk Quick Meaning & Sound Bar (clean hairline, no heavy box) */}
          <div className="pt-2.5 border-t border-[#e5dcc9] flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="font-bold text-sm text-slate-900 truncate">{focusDisplay.word}</span>
              {focusDisplay.phonetic && (
                <span className="text-xs text-stone-400 shrink-0">{focusDisplay.phonetic}</span>
              )}
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-amber-100/80 text-amber-900 truncate">
                {focusDisplay.kr}
              </span>
            </div>
            <button
              type="button"
              onClick={() =>
                speakEnglish(
                  focusDisplay.word,
                  weekNum === 1 ? 0.72 : 0.86,
                  1.04,
                  null,
                  focusDisplay.nextWord || ""
                )
              }
              className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#efe8d8] hover:bg-[#e5dcc7] text-slate-700 text-xs font-semibold transition"
            >
              <Volume2 className="w-3.5 h-3.5 text-sky-700" />
              발음
            </button>
          </div>
        </div>

        {/* Right Stacked Paper Thickness */}
        <div className="hidden md:block book-edges-right border-l border-[#e5dcc9]" />

        {/* 3D Turning Paper Leaf Overlay ("샤락" page flip across full picture-book spread) */}
        {flipLeaf && (
          <div
            key={flipLeaf.key}
            className={`hidden md:block pointer-events-none absolute inset-y-0 z-30 ${flipLeaf.dir === "next"
                ? "left-1/2 right-2 book-leaf-next bg-gradient-to-l from-[#f5eedf] via-[#fdfaf2] to-[#ede4d1] border-l border-[#d8ceb8]"
                : "left-2 right-1/2 book-leaf-prev bg-gradient-to-r from-[#f5eedf] via-[#fdfaf2] to-[#ede4d1] border-r border-[#d8ceb8]"
              }`}
          />
        )}
      </div>

      {/* Bottom Controls: Page Turn + Voice Recognition Status & Buttons */}
      <div className="pt-1 flex flex-wrap items-center justify-between gap-3 shrink-0">
        {/* Book Page Flipping Controls */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => handleTurnPage(-1)}
            className="inline-flex items-center gap-1 px-3.5 py-2.5 rounded-xl bg-[#f2ece1] hover:bg-[#e8dfd1] text-slate-700 text-xs font-bold transition"
          >
            <ChevronLeft className="w-4 h-4" />
            {pageIdx === 0 ? "표지로" : "이전 장"}
          </button>
          <span className="text-xs font-bold text-slate-600 px-2">
            {pageIdx + 1} / {spreads.length} 장
          </span>
          <button
            type="button"
            onClick={() => handleTurnPage(1)}
            disabled={pageIdx >= spreads.length - 1}
            className="inline-flex items-center gap-1 px-3.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-slate-700 text-xs font-bold transition"
          >
            다음 장
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Live Speech Recognition Status Pill */}
        {voiceStatus !== "idle" && (
          <div
            className={`text-xs font-semibold px-3 py-1.5 rounded-full border flex items-center gap-1.5 ${voiceStatus === "listening"
                ? "bg-rose-50 text-rose-700 border-rose-200 animate-pulse"
                : voiceStatus === "matched"
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : voiceStatus === "retry" || voiceStatus === "unsupported"
                    ? "bg-amber-50 text-amber-800 border-amber-200"
                    : "bg-sky-50 text-sky-700 border-sky-200"
              }`}
          >
            {voiceStatus === "unsupported" ? (
              <MicOff className="w-3.5 h-3.5" />
            ) : (
              <Mic className="w-3.5 h-3.5" />
            )}
            <span>
              {voiceStatus === "playing" && "원어민 발음 듣는 중..."}
              {voiceStatus === "listening" &&
                (recognizedText ? `듣고 있어요: "${recognizedText}"` : "지금 따라 말해보세요")}
              {voiceStatus === "matched" && "잘 읽었어요! 다음으로 넘어갑니다"}
              {voiceStatus === "retry" && "소리가 잘 안 들렸어요. 다시 말하거나 직접 다음으로 누르세요"}
              {voiceStatus === "unsupported" && "마이크 권한/음성 인식을 사용할 수 없어 수동 버튼으로 진행하세요"}
            </span>
          </div>
        )}

        {/* Sequential Reading Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleListenCurrent}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-800 text-xs md:text-sm font-bold transition"
          >
            <Volume2 className="w-4 h-4 text-sky-600" />
            {weekNum === 1
              ? `"${cleanActiveWord}" 듣기`
              : weekNum === 2 && activeChunk
                ? `"${activeChunk.text}" 듣기`
                : "문장 듣기"}
          </button>

          <button
            type="button"
            onClick={handleToggleVoicePractice}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-xs md:text-sm font-bold transition shadow-sm ${isAutoLoop ? "bg-rose-600 hover:bg-rose-700" : "btn-water-glass"
              }`}
          >
            {isAutoLoop ? <Square className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            {isAutoLoop
              ? "따라 말하기 멈추기"
              : allDone
                ? "음성 인식으로 다시 읽기"
                : "듣고 따라 말하기 (음성 인식)"}
          </button>

          <button
            type="button"
            onClick={handleManualNext}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 text-xs md:text-sm font-bold transition"
          >
            직접 다음으로
            <ArrowRight className="w-4 h-4" />
          </button>

          {allDone && (
            <>
              <button
                type="button"
                onClick={handleSubmitRepeatToTeacher}
                disabled={submittingRepeat}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-700 disabled:opacity-50 text-white text-xs md:text-sm font-bold transition shadow-sm"
              >
                {submittingRepeat
                  ? "녹음 저장 및 AI 분석 중..."
                  : completedRepeats >= 5
                    ? "복습 녹음 한 번 더 보내기"
                    : `오늘 ${completedRepeats + 1}회차 완료 & 진주 받기`}
              </button>
              <button
                type="button"
                onClick={onGoToFlashcards}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs md:text-sm font-bold transition shadow-sm"
              >
                단어 플래시카드
                <ArrowRight className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </div>

      {(repeatSubmittedMsg || aiCoachingTip) && (
        <div className="rounded-xl bg-cyan-50/90 border border-cyan-200 px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs shrink-0">
          <div className="space-y-0.5">
            {repeatSubmittedMsg && <div className="font-bold text-cyan-900">{repeatSubmittedMsg}</div>}
            {aiCoachingTip && (
              <div className="text-slate-700">
                <span className="font-semibold text-sky-800">포포 발음 팁:</span> {aiCoachingTip.pronunciation}{" "}
                <span className="text-slate-500">({aiCoachingTip.intonation})</span>
              </div>
            )}
          </div>
          {aiCoachingTip && aiCoachingTip.weakWords.length > 0 && (
            <button
              type="button"
              onClick={onGoToFlashcards}
              className="shrink-0 px-3 py-1.5 rounded-full bg-amber-100 hover:bg-amber-200 text-amber-950 font-bold transition"
            >
              집중 단어({aiCoachingTip.weakWords.slice(0, 3).join(", ")}) 카드 복습 →
            </button>
          )}
        </div>
      )}
    </div>
  );
};

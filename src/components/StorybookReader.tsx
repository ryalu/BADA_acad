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
  onGoToFlashcards
}) => {
  const sentences = useMemo(() => getBookSentences(book), [book]);
  const spreads = useMemo(() => splitBookIntoContextPages(book), [book]);

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

  const recognitionRef = useRef<any>(null);
  const autoLoopRef = useRef(false);
  const advanceTimeoutRef = useRef<number | null>(null);
  const flipTimerRef = useRef<number | null>(null);

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

  return (
    <div className="flex flex-col justify-between gap-3 h-[calc(100vh-132px)] min-h-[540px] max-h-[780px]">
      {/* Clean Hairline Header Strip (No outer card box) */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-[#e8dfd1] shrink-0">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-amber-100/80 text-amber-900">
              {book.level}
            </span>
            <h2 className="book-serif text-lg md:text-xl font-bold text-slate-900">{book.title}</h2>
          </div>
          <p className="text-xs text-slate-600 mt-0.5">{weekGuidance}</p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-600 pr-2 border-r border-[#e8dfd1]">
            문장 진도 {completedSentences.size} / {sentences.length}
          </span>
          <button
            type="button"
            onClick={() => setShowCoverModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#f2ece1] hover:bg-[#e8dfd1] text-slate-700 text-xs font-semibold transition"
          >
            <BookOpen className="w-3.5 h-3.5 text-sky-700" />
            표지 보기
          </button>
          <button
            type="button"
            onClick={() => {
              stopVoiceSession();
              speakEnglish(book.full_text, weekNum <= 2 ? 0.78 : 0.9, 1.04);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#f2ece1] hover:bg-[#e8dfd1] text-slate-700 text-xs font-semibold transition"
          >
            <Volume2 className="w-3.5 h-3.5 text-sky-700" />
            전체 듣기
          </button>
        </div>
      </div>

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
              className="w-full py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-sm font-bold transition"
            >
              책 계속 읽기
            </button>
          </div>
        </div>
      )}

      {/* Real 3D Open Hardcover Storybook */}
      <div className="flex-1 min-h-0 bg-[#2d3646] p-2.5 md:p-3.5 rounded-[26px] shadow-[0_20px_45px_-15px_rgba(30,41,59,0.45)] border border-[#1f2633] flex flex-col">
        <div className="book-stage relative flex-1 min-h-0 grid grid-cols-1 md:grid-cols-[8px_1fr_6px_1fr_8px] rounded-xl overflow-hidden bg-[#f9f5eb]">
          {/* Left Stacked Paper Thickness */}
          <div className="hidden md:block book-edges-left border-r border-[#dfd6c3]" />

          {/* LEFT PAGE: English Original Text */}
          <div className="bg-[#fdfaf2] book-gutter-left px-6 py-5 md:px-8 md:py-6 flex flex-col justify-between overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-[#ece4d3]">
              <span className="text-[11px] font-bold text-stone-400 uppercase tracking-widest">
                English Story
              </span>
              <span className="text-xs text-stone-400">단어에 마우스를 올리면 뜻이 보입니다</span>
            </div>

            <div className="my-auto py-3 space-y-5">
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
                    className={`pl-3.5 py-1.5 border-l-2 transition cursor-pointer ${
                      isActSent
                        ? "border-sky-600 bg-amber-50/45 rounded-r-lg"
                        : isDoneSent
                        ? "border-emerald-400/70 text-slate-600"
                        : "border-transparent hover:border-stone-300"
                    }`}
                  >
                    <div className="flex items-center gap-1.5 mb-1">
                      <span
                        className={`inline-flex items-center gap-1 text-[11px] font-bold ${
                          isDoneSent
                            ? "text-emerald-700"
                            : isActSent
                            ? "text-sky-700"
                            : "text-stone-400"
                        }`}
                      >
                        {isDoneSent && <Check className="w-3 h-3" />}
                        {s.sentenceIndex + 1}문장
                      </span>
                    </div>

                    <p className="book-serif text-xl md:text-[22px] font-semibold text-slate-800 leading-[2.15]">
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
                              className={`group relative inline-block px-1 py-0.5 mx-0.5 rounded-lg border-b-2 transition cursor-pointer ${
                                isAutoActiveWord
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
                                className={`pointer-events-none font-sans absolute left-1/2 -translate-x-1/2 bottom-[calc(100%+8px)] whitespace-nowrap bg-slate-900 text-white text-xs font-semibold px-2.5 py-1.5 rounded-lg shadow-lg z-30 transition-opacity ${
                                  isPinned
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
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-between text-xs text-stone-400 pt-2 border-t border-[#ece4d3]">
              <span>p. {pageIdx * 2 + 1}</span>
              <span className="book-serif italic">{book.title}</span>
            </div>
          </div>

          {/* REALISTIC CENTER BOOK SPINE CREASE */}
          <div className="hidden md:block bg-gradient-to-r from-[#d2c8b4] via-[#9e937e] to-[#d2c8b4]" />

          {/* RIGHT PAGE: Korean Translation & Word/Chunk Bar */}
          <div className="bg-[#faf6ea] book-gutter-right px-6 py-5 md:px-8 md:py-6 flex flex-col justify-between border-t md:border-t-0 border-[#e5dfd2] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-[#ece4d3]">
              <span className="text-[11px] font-bold text-stone-400 uppercase tracking-widest">
                우리말 해석
              </span>
              <span className="text-xs text-stone-400">p. {pageIdx * 2 + 2}</span>
            </div>

            <div className="my-auto py-3 space-y-5 divide-y divide-[#ece4d3]/80">
              {currentSpread.sentences.map((s) => {
                const isActSent = s.sentenceIndex === sentenceIdx;
                return (
                  <div
                    key={s.sentenceIndex}
                    className={`pt-3 first:pt-0 pl-3.5 border-l-2 transition ${
                      isActSent ? "border-amber-500" : "border-transparent text-slate-500"
                    }`}
                  >
                    <div className="text-[11px] font-bold text-stone-400 mb-1">
                      {s.sentenceIndex + 1}번 문장 뜻
                    </div>
                    <p
                      className={`text-base md:text-lg leading-relaxed ${
                        isActSent ? "font-bold text-slate-800" : "font-medium text-slate-500"
                      }`}
                    >
                      {s.kr}
                    </p>
                    {weekNum === 2 && isActSent && activeChunk && (
                      <div className="mt-1.5 text-xs font-semibold text-sky-700">
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
          <div className="hidden md:block book-edges-right border-l border-[#dfd6c3]" />

          {/* 3D Turning Paper Leaf Overlay ("샤락" page flip) */}
          {flipLeaf && (
            <div
              key={flipLeaf.key}
              className={`hidden md:block pointer-events-none absolute inset-y-0 z-30 ${
                flipLeaf.dir === "next"
                  ? "left-1/2 right-2 book-leaf-next bg-gradient-to-l from-[#f5eedf] via-[#fdfaf2] to-[#ede4d1] border-l border-[#d8ceb8]"
                  : "left-2 right-1/2 book-leaf-prev bg-gradient-to-r from-[#f5eedf] via-[#fdfaf2] to-[#ede4d1] border-r border-[#d8ceb8]"
              }`}
            />
          )}
        </div>
      </div>

      {/* Bottom Controls: Page Turn + Voice Recognition Status & Buttons */}
      <div className="pt-1 flex flex-wrap items-center justify-between gap-3 shrink-0">
        {/* Book Page Flipping Controls */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => handleTurnPage(-1)}
            disabled={pageIdx === 0}
            className="inline-flex items-center gap-1 px-3.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-slate-700 text-xs font-bold transition"
          >
            <ChevronLeft className="w-4 h-4" />
            이전 장
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
            className={`text-xs font-semibold px-3 py-1.5 rounded-full border flex items-center gap-1.5 ${
              voiceStatus === "listening"
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
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-xs md:text-sm font-bold transition shadow-sm ${
              isAutoLoop ? "bg-rose-600 hover:bg-rose-700" : "bg-sky-600 hover:bg-sky-700"
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
            <button
              type="button"
              onClick={onGoToFlashcards}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs md:text-sm font-bold transition shadow-sm"
            >
              단어 플래시카드
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

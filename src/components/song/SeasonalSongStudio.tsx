import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  Award,
  Check,
  CheckCircle2,
  HelpCircle,
  Mic,
  Music,
  Repeat,
  RotateCcw,
  Sparkles,
  Square,
  Volume2
} from "lucide-react";
import type { SeasonalSong, StudentSongProgress, StudentUser } from "../../types";
import { getSeasonVisualMeta, resolveStudentSongTrack } from "../../utils/songHelpers";
import { playSoftTone, speakEnglish, stopAllSpeech } from "../../utils/speech";
import { SongMediaPlayer, type SongSeekRequest } from "./SongMediaPlayer";
import {
  SeasonalCardAmbient,
  SeasonalCompleteStamp,
  SeasonalPopoAvatar,
  SeasonalTopCap
} from "./SeasonalDecorations";

interface SeasonalSongStudioProps {
  user: StudentUser;
  songs: SeasonalSong[];
  initialSongId?: string;
  onBackHome: () => void;
}

type SongWeek = 1 | 2 | 3 | 4;

interface PhraseGroup {
  idx: number;
  section: string;
  lines: SeasonalSong["lines"];
  combinedEn: string;
  combinedKr: string;
  startSec: number | null;
  endSec: number | null;
}

function shuffleDeterministic(items: string[], seed: number): string[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = (seed * 7 + i * 13) % (i + 1);
    const tmp = arr[i];
    arr[i] = arr[j];
    arr[j] = tmp;
  }
  return arr;
}

export const SeasonalSongStudio: React.FC<SeasonalSongStudioProps> = ({
  user,
  songs,
  initialSongId,
  onBackHome
}) => {
  const activeSongs = useMemo(() => songs.filter((s) => s.is_active), [songs]);
  const recommendedTrack = resolveStudentSongTrack(user);

  const [selectedSongId, setSelectedSongId] = useState<string>(() => {
    if (initialSongId && activeSongs.some((s) => s.id === initialSongId)) return initialSongId;
    const match = activeSongs.find((s) => s.track === recommendedTrack) || activeSongs[0];
    return match?.id || "";
  });

  useEffect(() => {
    if (!activeSongs.some((s) => s.id === selectedSongId)) {
      const match = activeSongs.find((s) => s.track === recommendedTrack) || activeSongs[0];
      if (match) setSelectedSongId(match.id);
    }
  }, [activeSongs, selectedSongId, recommendedTrack]);

  const activeSong = useMemo(
    () => activeSongs.find((s) => s.id === selectedSongId) || activeSongs[0] || null,
    [activeSongs, selectedSongId]
  );

  const [progressMap, setProgressMap] = useState<Record<string, StudentSongProgress>>({});
  const [weekTab, setWeekTab] = useState<SongWeek>(1);
  const [showKrLines, setShowKrLines] = useState(true);
  const [revealedVocab, setRevealedVocab] = useState<Record<string, boolean>>({});
  const [activeLineIdx, setActiveLineIdx] = useState<number | null>(null);
  const [seekRequest, setSeekRequest] = useState<SongSeekRequest | null>(null);
  const [savingProgress, setSavingProgress] = useState(false);

  // Week 2 phrase practice state
  const [practicedPhrases, setPracticedPhrases] = useState<Record<number, boolean>>({});
  const [listeningPhraseIdx, setListeningPhraseIdx] = useState<number | null>(null);
  const [phraseFeedback, setPhraseFeedback] = useState<string>("");
  const recRef = useRef<any>(null);

  // Week 3 quiz state
  const [quizAnswers, setQuizAnswers] = useState<Record<number, string>>({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);

  // Week 4 recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recSeconds, setRecSeconds] = useState(0);
  const [recordedAudioUrl, setRecordedAudioUrl] = useState<string>("");
  const [recordedBlobUrl, setRecordedBlobUrl] = useState<string>("");
  const [submittingRec, setSubmittingRec] = useState(false);
  const [recNotice, setRecNotice] = useState("");
  const mediaRecRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const recTimerRef = useRef<number | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);

  const loadProgress = async () => {
    try {
      const res = await fetch(`/api/songs/progress?userId=${encodeURIComponent(user.id)}`);
      if (!res.ok) return;
      const data = await res.json();
      if (data?.ok && Array.isArray(data.progress)) {
        const next: Record<string, StudentSongProgress> = {};
        for (const p of data.progress as StudentSongProgress[]) {
          next[p.song_id] = p;
        }
        setProgressMap(next);
      }
    } catch {
      // ignore offline
    }
  };

  useEffect(() => {
    void loadProgress();
  }, [user.id]);

  useEffect(() => {
    return () => {
      stopAllSpeech();
      if (recTimerRef.current !== null) window.clearInterval(recTimerRef.current);
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      }
      try {
        recRef.current?.stop();
      } catch {
        // ignore
      }
    };
  }, []);

  const currentProgress = activeSong ? progressMap[activeSong.id] || null : null;

  const phraseGroups: PhraseGroup[] = useMemo(() => {
    if (!activeSong) return [];
    const lines = activeSong.lines || [];
    const groups: PhraseGroup[] = [];
    for (let i = 0; i < lines.length; i += 2) {
      const slice = lines.slice(i, i + 2);
      const firstSec = slice[0]?.start_sec ?? null;
      const lastEnd = slice[slice.length - 1]?.end_sec ?? null;
      groups.push({
        idx: groups.length,
        section: slice[0]?.section || "Verse",
        lines: slice,
        combinedEn: slice.map((l) => l.en).join(" "),
        combinedKr: slice.map((l) => l.kr).join(" "),
        startSec: typeof firstSec === "number" ? firstSec : null,
        endSec: typeof lastEnd === "number" ? lastEnd : null
      });
    }
    return groups;
  }, [activeSong]);

  const quizQuestions = useMemo(() => {
    if (!activeSong) return [];
    const candidates = (activeSong.lines || []).filter((l) => l.blank_word && l.en.toLowerCase().includes(l.blank_word.toLowerCase()));
    return candidates.slice(0, 6).map((l, idx) => {
      const target = l.blank_word || "";
      const re = new RegExp(`\\b${target.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
      const masked = re.test(l.en) ? l.en.replace(re, "______") : `${l.en} (______)`;
      const rawOpts = Array.from(new Set([target, ...(l.distractors || []).slice(0, 2)]));
      const options = shuffleDeterministic(rawOpts, idx + 3);
      return {
        idx,
        lineIndex: l.index,
        en: l.en,
        masked,
        kr: l.kr,
        answer: target,
        options,
        startSec: l.start_sec
      };
    });
  }, [activeSong]);

  const handleTimeSync = (sec: number) => {
    if (!activeSong) return;
    const matched = activeSong.lines.find(
      (l) => typeof l.start_sec === "number" && typeof l.end_sec === "number" && sec >= l.start_sec && sec <= l.end_sec
    );
    if (matched) setActiveLineIdx(matched.index);
  };

  const saveWeekProgress = async (payload: {
    week1Done?: boolean;
    week2Done?: boolean;
    week3Done?: boolean;
    week4Done?: boolean;
    quizScore?: number;
    recordingId?: string;
  }) => {
    if (!activeSong) return;
    setSavingProgress(true);
    try {
      const res = await fetch("/api/songs/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          songId: activeSong.id,
          ...payload
        })
      });
      const data = await res.json();
      if (res.ok && data.ok && data.item) {
        setProgressMap((prev) => ({ ...prev, [activeSong.id]: data.item }));
        playSoftTone(820, 0.16);
      }
    } finally {
      setSavingProgress(false);
    }
  };

  const handlePracticePhraseMic = (group: PhraseGroup) => {
    const SpeechCtor = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechCtor) {
      speakEnglish(group.combinedEn, 0.85, 1.04);
      setPracticedPhrases((prev) => ({ ...prev, [group.idx]: true }));
      setPhraseFeedback("음성 인식이 지원되지 않는 환경이라 따라 듣기 완료로 기록했어요! 큰 소리로 함께 불러 보세요.");
      return;
    }

    try {
      recRef.current?.stop();
    } catch {
      // ignore
    }

    stopAllSpeech();
    setListeningPhraseIdx(group.idx);
    setPhraseFeedback(`"${group.combinedEn}" 소절을 신나게 불러 보세요!`);

    const recognition = new SpeechCtor();
    recRef.current = recognition;
    recognition.lang = "en-US";
    recognition.interimResults = true;
    recognition.maxAlternatives = 3;
    let handled = false;

    const finishSuccess = (heard: string) => {
      if (handled) return;
      handled = true;
      setListeningPhraseIdx(null);
      setPracticedPhrases((prev) => ({ ...prev, [group.idx]: true }));
      setPhraseFeedback(
        heard
          ? `💦 푸슈! "${heard}" 아주 신나고 또렷했어요! 리듬이 최고예요!`
          : "💦 푸슈! 리듬에 맞춰 자신 있게 잘 불렀어요!"
      );
      playSoftTone(800, 0.16);
    };

    recognition.onresult = (ev: any) => {
      const heard = (ev.results?.[ev.results.length - 1]?.[0]?.transcript || "").trim();
      if (heard) finishSuccess(heard);
    };
    recognition.onerror = () => {
      if (!handled) {
        handled = true;
        setListeningPhraseIdx(null);
        setPracticedPhrases((prev) => ({ ...prev, [group.idx]: true }));
        setPhraseFeedback("조금 작게 들렸지만 도전 완료! 한 번 더 불러도 좋아요.");
      }
    };
    recognition.onend = () => {
      if (!handled) {
        handled = true;
        setListeningPhraseIdx(null);
      }
    };

    try {
      recognition.start();
    } catch {
      setListeningPhraseIdx(null);
    }
  };

  const handleStartFullRecording = async () => {
    setRecNotice("");
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setRecNotice("이 브라우저에서는 마이크 녹음을 사용할 수 없습니다.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      chunksRef.current = [];
      const mr = new MediaRecorder(stream);
      mediaRecRef.current = mr;

      mr.ondataavailable = (ev) => {
        if (ev.data && ev.data.size > 0) chunksRef.current.push(ev.data);
      };
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mr.mimeType || "audio/webm" });
        const blobUrl = URL.createObjectURL(blob);
        setRecordedBlobUrl(blobUrl);
        const reader = new FileReader();
        reader.onloadend = () => {
          setRecordedAudioUrl(typeof reader.result === "string" ? reader.result : "");
        };
        reader.readAsDataURL(blob);
        stream.getTracks().forEach((t) => t.stop());
        mediaStreamRef.current = null;
      };

      mr.start();
      setIsRecording(true);
      setRecSeconds(0);
      if (recTimerRef.current !== null) window.clearInterval(recTimerRef.current);
      recTimerRef.current = window.setInterval(() => {
        setRecSeconds((s) => {
          if (s >= 119) {
            handleStopFullRecording();
            return 120;
          }
          return s + 1;
        });
      }, 1000);
    } catch {
      setRecNotice("마이크 권한을 허용해 주세요.");
    }
  };

  const handleStopFullRecording = () => {
    if (recTimerRef.current !== null) {
      window.clearInterval(recTimerRef.current);
      recTimerRef.current = null;
    }
    setIsRecording(false);
    try {
      if (mediaRecRef.current && mediaRecRef.current.state !== "inactive") {
        mediaRecRef.current.stop();
      }
    } catch {
      // ignore
    }
  };

  const handleSubmitFullSongRecording = async () => {
    if (!activeSong) return;
    setSubmittingRec(true);
    setRecNotice("");
    try {
      let recordingId = "";
      if (recordedAudioUrl) {
        const recRes = await fetch("/api/recordings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: user.id,
            bookId: `song:${activeSong.id}`,
            weekNum: 4,
            repeatNum: 1,
            transcript: `${activeSong.title} 완창 녹음`,
            audioDataUrl: recordedAudioUrl,
            expectedText: activeSong.raw_lyrics,
            level: user.level
          })
        });
        const recData = await recRes.json();
        if (recRes.ok && recData?.recording?.id) {
          recordingId = recData.recording.id;
        }
      }
      await saveWeekProgress({ week4Done: true, recordingId });
      setRecNotice("🎄 축하해요! 크리스마스 포포 스페셜 완창 도장을 받았어요! 선생님께 녹음이 전달되었습니다.");
      playSoftTone(880, 0.25);
    } catch {
      setRecNotice("저장 중 오류가 발생했습니다. 다시 시도해 주세요.");
    } finally {
      setSubmittingRec(false);
    }
  };

  if (!activeSong) {
    return (
      <div className="max-w-3xl mx-auto py-12 text-center space-y-4">
        <p className="text-base font-bold text-slate-700">현재 열려 있는 시즌 스페셜 곡이 없습니다.</p>
        <button
          type="button"
          onClick={onBackHome}
          className="px-5 py-2.5 rounded-full btn-water-glass text-sm font-extrabold inline-flex items-center gap-1.5"
        >
          <ArrowLeft className="w-4 h-4" />
          탐험 맵으로 돌아가기
        </button>
      </div>
    );
  }

  const meta = getSeasonVisualMeta(activeSong.season_key);
  const quizCorrectCount = quizQuestions.filter(
    (q) => (quizAnswers[q.idx] || "").toLowerCase() === q.answer.toLowerCase()
  ).length;
  const quizScorePct = quizQuestions.length
    ? Math.round((quizCorrectCount / quizQuestions.length) * 100)
    : 100;

  return (
    <div className="max-w-5xl mx-auto space-y-5 pb-12">
      {/* Top Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#e8dfd1]">
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => {
              stopAllSpeech();
              onBackHome();
            }}
            className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-full bg-white/75 hover:bg-white border border-white/85 text-xs font-extrabold text-slate-700 transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            탐험 맵
          </button>
          <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full border text-xs font-extrabold ${meta.pillBgClass}`}>
            <span>{meta.iconEmoji}</span>
            보너스 스페셜 · {activeSong.season_label}
          </span>
        </div>

        {/* Track Switcher (Junior / Senior) */}
        {activeSongs.length > 1 && (
          <div className="flex flex-wrap items-center gap-1.5">
            {activeSongs.map((s) => {
              const sMeta = getSeasonVisualMeta(s.season_key);
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => {
                    stopAllSpeech();
                    setSelectedSongId(s.id);
                    setActiveLineIdx(null);
                    setQuizAnswers({});
                    setQuizSubmitted(false);
                  }}
                  className={`px-3 py-1.5 rounded-full text-xs font-extrabold transition ${
                    s.id === activeSong.id
                      ? sMeta.ctaBtnClass
                      : "bg-white/75 border border-white text-slate-600 hover:bg-white"
                  }`}
                >
                  {sMeta.iconEmoji} {s.title}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Hero Header Card (Snow Cap, Twinkling Fairy Lights, Snowflakes & Santa/Rudolph Popo) */}
      <div className="relative pt-2">
        <SeasonalTopCap seasonKey={activeSong.season_key} />
        <div className={`relative rounded-3xl p-5 md:p-6 pt-8 ${meta.cardClass} ${meta.accentRingClass} space-y-4`}>
          <SeasonalCardAmbient seasonKey={activeSong.season_key} dense />

          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4 md:gap-5">
              <SeasonalPopoAvatar
                seasonKey={activeSong.season_key}
                accessory={activeSong.track === "senior" ? "rudolph" : "santa"}
                size="lg"
              />
              <div className="space-y-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-bold text-slate-600">
                    {(activeSong.artist_label || "Traditional Christmas Carol")
                      .replace(/\s*·\s*(저학년|고학년)\s*추천/g, "")
                      .trim()}
                  </span>
                </div>
                <h1 className="storybook-font text-2xl md:text-3xl font-black text-slate-900">
                  {activeSong.title}
                </h1>
                <p className="text-sm font-semibold text-slate-600">{activeSong.subtitle_kr}</p>
              </div>
            </div>

            {currentProgress?.week4_done && (
              <div className="shrink-0">
                <SeasonalCompleteStamp
                  seasonKey={activeSong.season_key}
                  accessory={activeSong.track === "senior" ? "rudolph" : "santa"}
                  practiceDays={currentProgress.practice_days?.length || 1}
                  quizScore={currentProgress.quiz_best_score}
                />
              </div>
            )}
          </div>

          {/* 4-Week Stepper Tabs */}
          <div className="relative z-10 grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
            {[
              { wk: 1 as SongWeek, label: "1주 · 노래 친해지기", done: Boolean(currentProgress?.week1_done) },
              { wk: 2 as SongWeek, label: "2주 · 소절 따라 부르기", done: Boolean(currentProgress?.week2_done) },
              { wk: 3 as SongWeek, label: "3주 · 가사 빈칸 퀴즈", done: Boolean(currentProgress?.week3_done) },
              { wk: 4 as SongWeek, label: "4주 · 완창 도전 녹음", done: Boolean(currentProgress?.week4_done) }
            ].map((item) => (
              <button
                key={item.wk}
                type="button"
                onClick={() => setWeekTab(item.wk)}
                className={`px-3.5 py-2.5 rounded-2xl text-xs font-extrabold inline-flex items-center justify-center gap-1.5 transition ${
                  weekTab === item.wk
                    ? meta.ctaBtnClass
                    : item.done
                      ? "bg-emerald-50/90 border border-emerald-200 text-emerald-800"
                      : "bg-white/70 border border-white/90 text-slate-700 hover:bg-white"
                }`}
              >
                {item.done && <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />}
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Unified Song Player (Shown across Weeks 1, 2, 4) */}
      {weekTab !== 3 && (
        <SongMediaPlayer
          song={activeSong}
          seekRequest={seekRequest}
          onTimeUpdate={handleTimeSync}
          onActiveLineChange={setActiveLineIdx}
        />
      )}

      {/* WEEK 1: Full Lyrics + Core Words */}
      {weekTab === 1 && (
        <div className="space-y-6">
          <div className={`${meta.cardClass} ${meta.accentRingClass} rounded-3xl p-5 md:p-6 space-y-4`}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-lg font-extrabold text-slate-900">1주차 · 노래 들으며 가사 친해지기</h2>
                <p className="text-xs text-slate-600">가사 줄을 누르면 AI가 또렷하게 읽어 주고, 음원 구간이 설정된 곡은 바로 그 부분으로 이동해요.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowKrLines((v) => !v)}
                className="px-3 py-1.5 rounded-full bg-white/80 border border-slate-200 text-xs font-bold text-slate-700"
              >
                {showKrLines ? "한국어 해석 숨기기" : "한국어 해석 보기"}
              </button>
            </div>

            <div className="space-y-2">
              {activeSong.lines.map((line, idx) => {
                const isActive = activeLineIdx === idx;
                const prevSection = idx > 0 ? activeSong.lines[idx - 1]?.section : "";
                const showSection = line.section && line.section !== prevSection;
                return (
                  <React.Fragment key={`${line.index}-${line.en}`}>
                    {showSection && (
                      <div className="pt-2 pb-0.5 text-[11px] font-black uppercase tracking-wider text-rose-700">
                        {line.section}
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setActiveLineIdx(idx);
                        speakEnglish(line.en, 0.88, 1.05);
                        if (typeof line.start_sec === "number") {
                          setSeekRequest({ startSec: line.start_sec, endSec: line.end_sec, loop: false, nonce: Date.now() });
                        }
                      }}
                      className={`w-full text-left px-4 py-3 rounded-2xl border transition flex items-start justify-between gap-3 ${
                        isActive
                          ? "bg-sky-50/90 border-sky-300 shadow-xs"
                          : "bg-white/65 border-white/85 hover:bg-white/90"
                      }`}
                    >
                      <div className="space-y-0.5">
                        <div className="storybook-font text-base md:text-lg font-extrabold text-slate-900">
                          {line.en}
                        </div>
                        {showKrLines && (
                          <div className="text-xs font-medium text-slate-600">{line.kr}</div>
                        )}
                      </div>
                      <Volume2 className="w-4 h-4 text-sky-600 shrink-0 mt-1" />
                    </button>
                  </React.Fragment>
                );
              })}
            </div>
          </div>

          {/* Core Song Vocabulary Cards */}
          <div className={`${meta.cardClass} ${meta.accentRingClass} rounded-3xl p-5 md:p-6 space-y-4`}>
            <div>
              <h3 className="text-base font-extrabold text-slate-900">노래 속 반짝 핵심 표현 ({activeSong.vocab.length}개)</h3>
              <p className="text-xs text-slate-600">카드를 누르면 영어 소리가 나오고 뜻과 포포 팁이 열려요!</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {activeSong.vocab.map((v) => {
                const open = Boolean(revealedVocab[v.word]);
                return (
                  <button
                    key={v.word}
                    type="button"
                    onClick={() => {
                      speakEnglish(v.word, 0.85, 1.05);
                      setRevealedVocab((prev) => ({ ...prev, [v.word]: !prev[v.word] }));
                    }}
                    className="text-left rounded-2xl bg-white/75 hover:bg-white border border-white/90 p-4 space-y-1.5 shadow-xs transition"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="storybook-font text-lg font-black text-slate-900">{v.word}</span>
                      <Volume2 className="w-4 h-4 text-sky-600 shrink-0" />
                    </div>
                    {v.phonetic && <div className="text-[11px] text-slate-400 font-mono">{v.phonetic}</div>}
                    {open ? (
                      <div className="pt-1 space-y-1 border-t border-slate-100">
                        <div className="text-sm font-extrabold text-sky-800">{v.meaning_kr}</div>
                        {v.tip_kr && <p className="text-[11px] text-slate-600 leading-snug">{v.tip_kr}</p>}
                      </div>
                    ) : (
                      <div className="text-[11px] font-bold text-amber-700 pt-1">눌러서 뜻 확인하기 →</div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              disabled={savingProgress}
              onClick={async () => {
                await saveWeekProgress({ week1Done: true });
                setWeekTab(2);
              }}
              className="px-6 py-3.5 rounded-2xl btn-water-glass text-sm font-extrabold inline-flex items-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              {currentProgress?.week1_done ? "1주차 완료됨 · 2주차로 가기" : "1주차 노래 친해지기 완료!"}
            </button>
          </div>
        </div>
      )}

      {/* WEEK 2: Phrase-by-Phrase Singing Practice */}
      {weekTab === 2 && (
        <div className="space-y-4">
          <div className={`${meta.cardClass} ${meta.accentRingClass} rounded-3xl p-5 md:p-6 space-y-3`}>
            <h2 className="text-lg font-extrabold text-slate-900">2주차 · 한 소절씩 리듬 따라 부르기</h2>
            <p className="text-xs text-slate-600">
              느린 속도로 귀에 익히고, 마이크 버튼을 눌러 한 소절씩 소리 내어 불러 보세요.
            </p>
            {phraseFeedback && (
              <div className="rounded-2xl bg-sky-50 border border-sky-200 px-4 py-2.5 text-xs font-bold text-sky-900">
                {phraseFeedback}
              </div>
            )}

            <div className="space-y-3 pt-1">
              {phraseGroups.map((group) => {
                const done = Boolean(practicedPhrases[group.idx]);
                const isListening = listeningPhraseIdx === group.idx;
                return (
                  <div
                    key={group.idx}
                    className={`rounded-2xl border p-4 space-y-3 transition ${
                      done ? "bg-emerald-50/70 border-emerald-200" : "bg-white/75 border-white/90"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-black text-rose-700 uppercase">
                        소절 {group.idx + 1} · {group.section}
                      </span>
                      {done && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-extrabold">
                          <Check className="w-3 h-3" /> 연습 완료
                        </span>
                      )}
                    </div>

                    <div className="space-y-1">
                      {group.lines.map((l) => (
                        <div key={l.index} className="space-y-0.5">
                          <div className="storybook-font text-lg font-black text-slate-900">{l.en}</div>
                          <div className="text-xs text-slate-600">{l.kr}</div>
                        </div>
                      ))}
                    </div>

                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => speakEnglish(group.combinedEn, 0.78, 1.05)}
                        className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50"
                      >
                        🐢 천천히 듣기
                      </button>
                      <button
                        type="button"
                        onClick={() => speakEnglish(group.combinedEn, 0.94, 1.05)}
                        className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50"
                      >
                        🔊 제 속도로 듣기
                      </button>
                      {typeof group.startSec === "number" &&
                        typeof group.endSec === "number" &&
                        (activeSong.has_audio || Boolean(activeSong.youtube_url)) && (
                          <button
                            type="button"
                            onClick={() =>
                              setSeekRequest({
                                startSec: group.startSec!,
                                endSec: group.endSec!,
                                loop: true,
                                nonce: Date.now()
                              })
                            }
                            className="px-3 py-1.5 rounded-xl bg-rose-50 border border-rose-200 text-xs font-bold text-rose-700 inline-flex items-center gap-1"
                          >
                            <Repeat className="w-3.5 h-3.5" />
                            노래 구간 반복
                          </button>
                        )}
                      <button
                        type="button"
                        onClick={() => handlePracticePhraseMic(group)}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold inline-flex items-center gap-1.5 transition ${
                          isListening ? "bg-rose-500 text-white animate-pulse" : "btn-water-glass"
                        }`}
                      >
                        <Mic className="w-3.5 h-3.5" />
                        {isListening ? "듣고 있어요..." : "따라 불러보기"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              disabled={savingProgress}
              onClick={async () => {
                await saveWeekProgress({ week2Done: true });
                setWeekTab(3);
              }}
              className="px-6 py-3.5 rounded-2xl btn-water-glass text-sm font-extrabold inline-flex items-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              {currentProgress?.week2_done ? "2주차 완료됨 · 3주차로 가기" : "2주차 소절 연습 완료!"}
            </button>
          </div>
        </div>
      )}

      {/* WEEK 3: Fill-in-the-Blank Listening Quiz */}
      {weekTab === 3 && (
        <div className="space-y-5">
          <div className={`${meta.cardClass} ${meta.accentRingClass} rounded-3xl p-5 md:p-6 space-y-4`}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-lg font-extrabold text-slate-900">3주차 · 가사 빈칸 리스닝 퀴즈</h2>
                <p className="text-xs text-slate-600">소리를 잘 듣고 빈칸에 들어갈 알맞은 가사 단어를 골라 보세요!</p>
              </div>
              {quizSubmitted && (
                <span className="px-3.5 py-1.5 rounded-full bg-amber-100 border border-amber-300 text-xs font-black text-amber-900">
                  점수: {quizScorePct}점 ({quizCorrectCount}/{quizQuestions.length})
                </span>
              )}
            </div>

            {quizQuestions.length === 0 ? (
              <div className="rounded-2xl bg-white/70 p-6 text-center text-sm text-slate-600">
                출제 가능한 가사 빈칸 문제가 아직 없습니다.
              </div>
            ) : (
              <div className="space-y-4">
                {quizQuestions.map((q) => {
                  const chosen = quizAnswers[q.idx] || "";
                  return (
                    <div key={q.idx} className="rounded-2xl bg-white/75 border border-white/90 p-4 space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="inline-flex items-center gap-1 text-xs font-black text-sky-800">
                          <HelpCircle className="w-3.5 h-3.5" /> Q{q.idx + 1}
                        </span>
                        <button
                          type="button"
                          onClick={() => speakEnglish(q.en, 0.85, 1.05)}
                          className="px-3 py-1 rounded-full bg-sky-50 border border-sky-200 text-xs font-bold text-sky-800 inline-flex items-center gap-1"
                        >
                          <Volume2 className="w-3.5 h-3.5" /> 이 줄 소리 듣기
                        </button>
                      </div>

                      <div className="space-y-1">
                        <p className="storybook-font text-lg font-black text-slate-900">{q.masked}</p>
                        <p className="text-xs text-slate-500">{q.kr}</p>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        {q.options.map((opt) => {
                          const isPicked = chosen === opt;
                          const isRight = opt.toLowerCase() === q.answer.toLowerCase();
                          let cls = "bg-white border-slate-200 text-slate-800 hover:bg-sky-50";
                          if (quizSubmitted) {
                            if (isRight) cls = "bg-emerald-100 border-emerald-400 text-emerald-900";
                            else if (isPicked && !isRight) cls = "bg-rose-100 border-rose-300 text-rose-800";
                          } else if (isPicked) {
                            cls = "bg-sky-100 border-sky-400 text-sky-900 ring-2 ring-sky-200";
                          }
                          return (
                            <button
                              key={opt}
                              type="button"
                              disabled={quizSubmitted}
                              onClick={() => setQuizAnswers((prev) => ({ ...prev, [q.idx]: opt }))}
                              className={`py-2.5 px-4 rounded-xl border text-sm font-extrabold transition ${cls}`}
                            >
                              {opt}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="flex flex-wrap items-center justify-end gap-2 pt-2">
              {quizSubmitted ? (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setQuizAnswers({});
                      setQuizSubmitted(false);
                    }}
                    className="px-4 py-2.5 rounded-2xl bg-white border border-slate-200 text-xs font-extrabold text-slate-700 inline-flex items-center gap-1.5"
                  >
                    <RotateCcw className="w-3.5 h-3.5" /> 다시 풀기
                  </button>
                  <button
                    type="button"
                    onClick={() => setWeekTab(4)}
                    className="px-6 py-3 rounded-2xl btn-water-glass text-sm font-extrabold"
                  >
                    4주차 완창 도전으로 가기 →
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  disabled={savingProgress || Object.keys(quizAnswers).length < quizQuestions.length}
                  onClick={async () => {
                    setQuizSubmitted(true);
                    await saveWeekProgress({ week3Done: true, quizScore: quizScorePct });
                  }}
                  className="px-6 py-3 rounded-2xl btn-water-glass text-sm font-extrabold disabled:opacity-50"
                >
                  채점하고 3주차 완료하기!
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* WEEK 4: Full-Song Karaoke & Recording */}
      {weekTab === 4 && (
        <div className="space-y-5">
          <div className={`${meta.cardClass} ${meta.accentRingClass} rounded-3xl p-5 md:p-6 space-y-4`}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-lg font-extrabold text-slate-900">4주차 · 처음부터 끝까지 완창 도전!</h2>
                <p className="text-xs text-slate-600">
                  노래를 틀어 두고 녹음 버튼을 눌러 끝까지 불러 보세요. 완료하면 크리스마스 특별 포포 도장이 찍혀요!
                </p>
              </div>
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-rose-50 border border-rose-200 text-xs font-extrabold text-rose-700">
                <Sparkles className="w-3.5 h-3.5" /> {meta.iconEmoji} 특별 도장 미션
              </span>
            </div>

            {/* Karaoke Lyric Sheet */}
            <div className="rounded-2xl bg-white/75 border border-white/90 p-4 max-h-72 overflow-y-auto space-y-2">
              {activeSong.lines.map((line, idx) => (
                <div
                  key={line.index}
                  className={`px-3 py-2 rounded-xl transition ${
                    activeLineIdx === idx ? "bg-sky-100/90 border border-sky-300" : ""
                  }`}
                >
                  <div className="storybook-font text-base font-black text-slate-900">{line.en}</div>
                  <div className="text-xs text-slate-500">{line.kr}</div>
                </div>
              ))}
            </div>

            {/* Recorder Controls */}
            <div className="rounded-2xl bg-sky-50/80 border border-sky-200 p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  {!isRecording ? (
                    <button
                      type="button"
                      onClick={handleStartFullRecording}
                      className="px-5 py-3 rounded-2xl bg-rose-500 hover:bg-rose-600 text-white text-sm font-extrabold inline-flex items-center gap-2 shadow-sm transition"
                    >
                      <Mic className="w-4 h-4" />
                      완창 녹음 시작하기
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleStopFullRecording}
                      className="px-5 py-3 rounded-2xl bg-slate-900 text-white text-sm font-extrabold inline-flex items-center gap-2 animate-pulse"
                    >
                      <Square className="w-4 h-4" />
                      녹음 끝내기 ({Math.floor(recSeconds / 60)}:{String(recSeconds % 60).padStart(2, "0")})
                    </button>
                  )}

                  {!isRecording && recordedBlobUrl && (
                    <audio controls src={recordedBlobUrl} className="h-10 max-w-xs" />
                  )}
                </div>

                <button
                  type="button"
                  disabled={submittingRec || isRecording}
                  onClick={handleSubmitFullSongRecording}
                  className="px-5 py-3 rounded-2xl btn-water-glass text-sm font-extrabold inline-flex items-center gap-2 disabled:opacity-50"
                >
                  <Award className="w-4 h-4 text-rose-600" />
                  {submittingRec
                    ? "저장 중..."
                    : recordedBlobUrl
                      ? "녹음 제출 & 포포 특별 도장 받기!"
                      : "녹음 없이 완창 도장 받기!"}
                </button>
              </div>

              {recNotice && (
                <div className="rounded-xl bg-white/90 border border-rose-200 px-3.5 py-2.5 text-xs font-bold text-rose-800 flex items-center gap-2">
                  <Music className="w-4 h-4 shrink-0" />
                  <span>{recNotice}</span>
                </div>
              )}

              {currentProgress?.week4_done && (
                <div className="pt-1 flex justify-end">
                  <SeasonalCompleteStamp
                    seasonKey={activeSong.season_key}
                    accessory={activeSong.track === "senior" ? "rudolph" : "santa"}
                    practiceDays={currentProgress.practice_days?.length || 1}
                    quizScore={currentProgress.quiz_best_score}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

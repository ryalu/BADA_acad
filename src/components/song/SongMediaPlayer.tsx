import React, { useEffect, useMemo, useRef, useState } from "react";
import { Pause, Play, Repeat, RotateCcw, Video, Volume2, Music } from "lucide-react";
import type { SeasonalSong } from "../../types";
import { extractYouTubeVideoId, getSeasonVisualMeta } from "../../utils/songHelpers";
import { speakEnglish, stopAllSpeech } from "../../utils/speech";

export interface SongSeekRequest {
  startSec: number;
  endSec?: number | null;
  loop?: boolean;
  nonce: number;
}

interface SongMediaPlayerProps {
  song: SeasonalSong;
  seekRequest?: SongSeekRequest | null;
  onTimeUpdate?: (sec: number) => void;
  onActiveLineChange?: (lineIdx: number | null) => void;
}

declare global {
  interface Window {
    YT?: {
      Player: new (
        element: HTMLElement | string,
        options: {
          videoId: string;
          playerVars?: Record<string, string | number>;
          events?: {
            onReady?: (ev: { target: YTPlayerInstance }) => void;
            onStateChange?: (ev: { data: number; target: YTPlayerInstance }) => void;
          };
        }
      ) => YTPlayerInstance;
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

interface YTPlayerInstance {
  playVideo: () => void;
  pauseVideo: () => void;
  seekTo: (seconds: number, allowSeekAhead?: boolean) => void;
  getCurrentTime: () => number;
  getDuration: () => number;
  getPlayerState: () => number;
  setPlaybackRate: (rate: number) => void;
  destroy: () => void;
}

let ytApiPromise: Promise<boolean> | null = null;
function loadYouTubeIframeApi(): Promise<boolean> {
  if (typeof window === "undefined") return Promise.resolve(false);
  if (window.YT && typeof window.YT.Player === "function") return Promise.resolve(true);
  if (ytApiPromise) return ytApiPromise;

  ytApiPromise = new Promise<boolean>((resolve) => {
    const existing = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      try {
        existing?.();
      } catch {
        // ignore prior listener
      }
      resolve(true);
    };

    if (!document.querySelector('script[src="https://www.youtube.com/iframe_api"]')) {
      const script = document.createElement("script");
      script.src = "https://www.youtube.com/iframe_api";
      script.async = true;
      script.onerror = () => resolve(false);
      document.head.appendChild(script);
    }

    window.setTimeout(() => {
      resolve(Boolean(window.YT && typeof window.YT.Player === "function"));
    }, 6000);
  });
  return ytApiPromise;
}

function formatTime(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

export const SongMediaPlayer: React.FC<SongMediaPlayerProps> = ({
  song,
  seekRequest,
  onTimeUpdate,
  onActiveLineChange
}) => {
  const youtubeId = useMemo(() => extractYouTubeVideoId(song.youtube_url), [song.youtube_url]);
  const seasonMeta = useMemo(() => getSeasonVisualMeta(song.season_key), [song.season_key]);
  const hasMp3 = Boolean(song.has_audio);
  const hasYt = Boolean(youtubeId);

  const [mode, setMode] = useState<"audio" | "youtube" | "ai">(() =>
    hasMp3 ? "audio" : hasYt ? "youtube" : "ai"
  );

  useEffect(() => {
    setMode(hasMp3 ? "audio" : hasYt ? "youtube" : "ai");
  }, [song.id, hasMp3, hasYt]);

  // Shared section loop state
  const [loopRange, setLoopRange] = useState<{ startSec: number; endSec: number } | null>(null);

  // Audio player state
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [audioPlaying, setAudioPlaying] = useState(false);
  const [audioTime, setAudioTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState<number>(1.0);

  // YouTube player state
  const ytContainerRef = useRef<HTMLDivElement | null>(null);
  const ytPlayerRef = useRef<YTPlayerInstance | null>(null);
  const [ytReady, setYtReady] = useState(false);
  const [ytPlaying, setYtPlaying] = useState(false);
  const [ytApiFallback, setYtApiFallback] = useState(false);

  // AI full-lyrics playback state
  const [aiPlaying, setAiPlaying] = useState(false);
  const aiTokenRef = useRef(0);

  const stopAiPlay = () => {
    aiTokenRef.current += 1;
    setAiPlaying(false);
    stopAllSpeech();
    onActiveLineChange?.(null);
  };

  useEffect(() => {
    return () => {
      aiTokenRef.current += 1;
      stopAllSpeech();
    };
  }, [song.id]);

  // Sync playbackRate to HTMLAudioElement
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackRate;
    }
    if (ytPlayerRef.current && ytReady) {
      try {
        ytPlayerRef.current.setPlaybackRate(playbackRate);
      } catch {
        // ignore rate change unsupported
      }
    }
  }, [playbackRate, ytReady]);

  // Mount / destroy YouTube IFrame API player
  useEffect(() => {
    if (mode !== "youtube" || !youtubeId) return;
    let cancelled = false;
    setYtReady(false);
    setYtApiFallback(false);

    void loadYouTubeIframeApi().then((loaded) => {
      if (cancelled || !ytContainerRef.current) return;
      if (!loaded || !window.YT || typeof window.YT.Player !== "function") {
        setYtApiFallback(true);
        return;
      }
      try {
        ytPlayerRef.current?.destroy();
      } catch {
        // ignore
      }
      ytContainerRef.current.innerHTML = "";
      const holder = document.createElement("div");
      ytContainerRef.current.appendChild(holder);

      ytPlayerRef.current = new window.YT.Player(holder, {
        videoId: youtubeId,
        playerVars: {
          rel: 0,
          modestbranding: 1,
          playsinline: 1,
          origin: window.location.origin
        },
        events: {
          onReady: (ev) => {
            if (cancelled) return;
            setYtReady(true);
            try {
              ev.target.setPlaybackRate(playbackRate);
            } catch {
              // ignore
            }
          },
          onStateChange: (ev) => {
            if (cancelled) return;
            // 1 = PLAYING
            setYtPlaying(ev.data === 1);
          }
        }
      });
    });

    return () => {
      cancelled = true;
      setYtPlaying(false);
      setYtReady(false);
      try {
        ytPlayerRef.current?.destroy();
      } catch {
        // ignore
      }
      ytPlayerRef.current = null;
    };
  }, [mode, youtubeId]);

  // Poll YouTube time + enforce A-B loop
  useEffect(() => {
    if (mode !== "youtube" || !ytPlaying) return;
    const timer = window.setInterval(() => {
      const p = ytPlayerRef.current;
      if (!p) return;
      try {
        const cur = p.getCurrentTime();
        if (Number.isFinite(cur)) {
          onTimeUpdate?.(cur);
          if (loopRange && cur >= loopRange.endSec) {
            p.seekTo(loopRange.startSec, true);
          }
        }
      } catch {
        // ignore
      }
    }, 250);
    return () => window.clearInterval(timer);
  }, [mode, ytPlaying, loopRange, onTimeUpdate]);

  // Handle external seek / loop requests (from line click or Week 2 phrase loop)
  useEffect(() => {
    if (!seekRequest) return;
    const { startSec, endSec, loop } = seekRequest;
    if (loop && typeof endSec === "number" && endSec > startSec) {
      setLoopRange({ startSec, endSec });
    } else if (!loop) {
      setLoopRange(null);
    }

    if (mode === "audio" && audioRef.current) {
      audioRef.current.currentTime = Math.max(0, startSec);
      void audioRef.current.play().catch(() => {});
    } else if (mode === "youtube" && ytPlayerRef.current && ytReady) {
      try {
        ytPlayerRef.current.seekTo(Math.max(0, startSec), true);
        ytPlayerRef.current.playVideo();
      } catch {
        // ignore
      }
    }
  }, [seekRequest]);

  const handleToggleAudioPlay = () => {
    const el = audioRef.current;
    if (!el) return;
    stopAiPlay();
    if (el.paused) {
      void el.play().catch(() => {});
    } else {
      el.pause();
    }
  };

  const handleAiFullPlay = () => {
    if (aiPlaying) {
      stopAiPlay();
      return;
    }
    if (audioRef.current && !audioRef.current.paused) audioRef.current.pause();
    if (ytPlayerRef.current && ytPlaying) {
      try {
        ytPlayerRef.current.pauseVideo();
      } catch {
        // ignore
      }
    }

    const lines = song.lines || [];
    if (lines.length === 0) return;

    stopAllSpeech();
    const token = aiTokenRef.current + 1;
    aiTokenRef.current = token;
    setAiPlaying(true);

    const playAt = (idx: number) => {
      if (aiTokenRef.current !== token) return;
      if (idx >= lines.length) {
        setAiPlaying(false);
        onActiveLineChange?.(null);
        return;
      }
      onActiveLineChange?.(idx);
      const rate = playbackRate < 0.85 ? 0.80 : 0.92;
      speakEnglish(lines[idx].en, rate, 1.05, () => {
        if (aiTokenRef.current !== token) return;
        window.setTimeout(() => playAt(idx + 1), 220);
      });
    };
    playAt(0);
  };

  const audioSrc = useMemo(
    () => `/api/songs/audio?songId=${encodeURIComponent(song.id)}&v=${encodeURIComponent(song.updated_at || "1")}`,
    [song.id, song.updated_at]
  );

  return (
    <div className={`rounded-3xl border backdrop-blur-md p-4 md:p-5 space-y-3.5 shadow-sm ${seasonMeta.playerAccentClass}`}>
      {/* Top Mode Switcher + Speed Controls */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          {hasMp3 && (
            <button
              type="button"
              onClick={() => {
                stopAiPlay();
                setMode("audio");
              }}
              className={`px-3 py-1.5 rounded-full text-xs font-extrabold inline-flex items-center gap-1.5 transition ${
                mode === "audio" ? "btn-water-glass" : "bg-white/60 border border-slate-200 text-slate-700 hover:bg-white"
              }`}
            >
              <Music className="w-3.5 h-3.5 text-sky-700" />
              MP3 음원
            </button>
          )}
          {hasYt && (
            <button
              type="button"
              onClick={() => {
                stopAiPlay();
                if (audioRef.current && !audioRef.current.paused) audioRef.current.pause();
                setMode("youtube");
              }}
              className={`px-3 py-1.5 rounded-full text-xs font-extrabold inline-flex items-center gap-1.5 transition ${
                mode === "youtube" ? "btn-water-glass" : "bg-white/60 border border-slate-200 text-slate-700 hover:bg-white"
              }`}
            >
              <Video className="w-3.5 h-3.5 text-rose-600" />
              유튜브 영상
            </button>
          )}
          <button
            type="button"
            onClick={handleAiFullPlay}
            className={`px-3 py-1.5 rounded-full text-xs font-extrabold inline-flex items-center gap-1.5 transition ${
              aiPlaying
                ? "bg-amber-500 text-white shadow-sm"
                : mode === "ai"
                  ? "btn-water-glass"
                  : "bg-white/70 border border-slate-200 text-slate-700 hover:bg-white"
            }`}
          >
            {aiPlaying ? <Pause className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5 text-amber-700" />}
            {aiPlaying ? "AI 가사 듣기 멈춤" : "AI 목소리로 한 줄씩 듣기"}
          </button>
        </div>

        <div className="flex items-center gap-1">
          {loopRange && (
            <button
              type="button"
              onClick={() => setLoopRange(null)}
              className="px-2.5 py-1 rounded-full bg-rose-100 border border-rose-200 text-[11px] font-extrabold text-rose-700 inline-flex items-center gap-1"
              title="구간 반복 해제"
            >
              <Repeat className="w-3 h-3" />
              반복 해제 ({formatTime(loopRange.startSec)}~{formatTime(loopRange.endSec)})
            </button>
          )}
          {[0.75, 0.85, 1.0].map((rate) => (
            <button
              key={rate}
              type="button"
              onClick={() => setPlaybackRate(rate)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-extrabold transition ${
                playbackRate === rate
                  ? "bg-sky-600 text-white"
                  : "bg-white/70 border border-slate-200 text-slate-600 hover:bg-white"
              }`}
            >
              {rate}x
            </button>
          ))}
        </div>
      </div>

      {/* Mode 1: Uploaded MP3/Audio Player */}
      {mode === "audio" && hasMp3 && (
        <div className="rounded-2xl bg-sky-50/70 border border-sky-200/80 p-3.5 space-y-2.5">
          <audio
            ref={audioRef}
            src={audioSrc}
            preload="metadata"
            onLoadedMetadata={(e) => setAudioDuration(e.currentTarget.duration || 0)}
            onPlay={() => setAudioPlaying(true)}
            onPause={() => setAudioPlaying(false)}
            onEnded={() => setAudioPlaying(false)}
            onTimeUpdate={(e) => {
              const cur = e.currentTarget.currentTime;
              setAudioTime(cur);
              onTimeUpdate?.(cur);
              if (loopRange && cur >= loopRange.endSec) {
                e.currentTarget.currentTime = loopRange.startSec;
              }
            }}
          />
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleToggleAudioPlay}
              className="w-11 h-11 rounded-full btn-water-glass flex items-center justify-center shrink-0"
              aria-label={audioPlaying ? "일시정지" : "재생"}
            >
              {audioPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
            </button>
            <div className="flex-1 min-w-0 space-y-1">
              <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                <span className="truncate">{song.audio_filename || song.title}</span>
                <span className="tabular-nums text-slate-500">
                  {formatTime(audioTime)} / {formatTime(audioDuration)}
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={Math.max(1, audioDuration)}
                step={0.1}
                value={Math.min(audioTime, Math.max(1, audioDuration))}
                onChange={(e) => {
                  const next = Number(e.target.value);
                  setAudioTime(next);
                  if (audioRef.current) audioRef.current.currentTime = next;
                }}
                className="w-full accent-sky-600 cursor-pointer"
              />
            </div>
            <button
              type="button"
              onClick={() => {
                setLoopRange(null);
                if (audioRef.current) audioRef.current.currentTime = 0;
              }}
              className="p-2 rounded-xl bg-white/80 border border-slate-200 text-slate-600 hover:text-slate-900"
              title="처음부터 다시"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Mode 2: YouTube Embed Player */}
      {mode === "youtube" && youtubeId && (
        <div className="space-y-2">
          <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-slate-900 border border-slate-200">
            {ytApiFallback ? (
              <iframe
                src={`https://www.youtube-nocookie.com/embed/${youtubeId}?rel=0&modestbranding=1`}
                title={song.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="w-full h-full border-0"
              />
            ) : (
              <div ref={ytContainerRef} className="w-full h-full [&>div]:w-full [&>div]:h-full [&_iframe]:w-full [&_iframe]:h-full" />
            )}
          </div>
        </div>
      )}

      {/* Mode 3: AI-only Guidance Banner when no MP3 / YouTube attached yet */}
      {!hasMp3 && !hasYt && (
        <div className="rounded-2xl bg-amber-50/75 border border-amber-200/80 px-4 py-3 flex flex-wrap items-center justify-between gap-2 text-xs text-amber-950">
          <span>
            선생님이 아직 반주 음원(MP3/유튜브)을 연결하지 않았어요. 위 <strong>AI 목소리로 한 줄씩 듣기</strong>나 아래 가사 줄을 눌러 바로 따라 부를 수 있어요!
          </span>
        </div>
      )}
    </div>
  );
};

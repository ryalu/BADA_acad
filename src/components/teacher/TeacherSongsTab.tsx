import React, { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  ExternalLink,
  Music,
  Plus,
  Sparkles,
  Trash2,
  Upload,
  Video
} from "lucide-react";
import type {
  SeasonalSong,
  SongLyricLine,
  SongTrack,
  SongVocabItem,
  StudentSongProgress,
  StudentUser
} from "../../types";
import { extractYouTubeVideoId, resolveStudentSongTrack } from "../../utils/songHelpers";
import { playSoftTone } from "../../utils/speech";

interface TeacherSongsTabProps {
  users: StudentUser[];
  seasonalSongs: SeasonalSong[];
  onSelectStudent: (userId: string) => void;
  onChangeTab: (tab: "home" | "coaching" | "worksheets" | "songs" | "database") => void;
  onDataUpdated: (payload: { seasonalSongs?: SeasonalSong[] }) => void;
}

const SEASON_PRESETS = [
  { key: "christmas", label: "12월 크리스마스 스페셜" },
  { key: "spring", label: "봄 시즌 팝송 스페셜" },
  { key: "summer", label: "여름방학 영어 송 스페셜" },
  { key: "halloween", label: "10월 할로윈 스페셜" },
  { key: "custom", label: "특별 시즌 스페셜" }
];

export const TeacherSongsTab: React.FC<TeacherSongsTabProps> = ({
  users,
  seasonalSongs,
  onSelectStudent,
  onChangeTab,
  onDataUpdated
}) => {
  const [editingSongId, setEditingSongId] = useState<string | null>(null);
  const [seasonKey, setSeasonKey] = useState("christmas");
  const [seasonLabel, setSeasonLabel] = useState("12월 크리스마스 스페셜");
  const [track, setTrack] = useState<SongTrack>("junior");
  const [title, setTitle] = useState("");
  const [subtitleKr, setSubtitleKr] = useState("");
  const [artistLabel, setArtistLabel] = useState("Seasonal English Song");
  const [isActive, setIsActive] = useState(true);
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [rawLyrics, setRawLyrics] = useState("");
  const [lines, setLines] = useState<SongLyricLine[]>([]);
  const [vocab, setVocab] = useState<SongVocabItem[]>([]);

  // Audio upload state
  const [audioBase64, setAudioBase64] = useState<string>("");
  const [audioMime, setAudioMime] = useState<string>("");
  const [audioFilename, setAudioFilename] = useState<string>("");
  const [hasExistingAudio, setHasExistingAudio] = useState(false);
  const [clearAudio, setClearAudio] = useState(false);

  const [analyzing, setAnalyzing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");
  const [allProgress, setAllProgress] = useState<StudentSongProgress[]>([]);

  const loadAllProgress = async () => {
    try {
      const res = await fetch("/api/songs/progress");
      if (!res.ok) return;
      const data = await res.json();
      if (data?.ok && Array.isArray(data.progress)) {
        setAllProgress(data.progress);
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    void loadAllProgress();
  }, [seasonalSongs]);

  const anyActive = seasonalSongs.some((s) => s.is_active);
  const ytPreviewId = useMemo(() => extractYouTubeVideoId(youtubeUrl), [youtubeUrl]);

  const resetForm = () => {
    setEditingSongId(null);
    setSeasonKey("christmas");
    setSeasonLabel("12월 크리스마스 스페셜");
    setTrack("junior");
    setTitle("");
    setSubtitleKr("");
    setArtistLabel("Seasonal English Song");
    setIsActive(true);
    setYoutubeUrl("");
    setRawLyrics("");
    setLines([]);
    setVocab([]);
    setAudioBase64("");
    setAudioMime("");
    setAudioFilename("");
    setHasExistingAudio(false);
    setClearAudio(false);
    setStatusMsg("");
  };

  const loadSongIntoForm = (song: SeasonalSong) => {
    setEditingSongId(song.id);
    setSeasonKey(song.season_key || "christmas");
    setSeasonLabel(song.season_label || "12월 크리스마스 스페셜");
    setTrack(song.track === "senior" ? "senior" : "junior");
    setTitle(song.title || "");
    setSubtitleKr(song.subtitle_kr || "");
    setArtistLabel(song.artist_label || "");
    setIsActive(Boolean(song.is_active));
    setYoutubeUrl(song.youtube_url || "");
    setRawLyrics(song.raw_lyrics || "");
    setLines(song.lines || []);
    setVocab(song.vocab || []);
    setAudioBase64("");
    setAudioMime(song.audio_mime || "");
    setAudioFilename(song.audio_filename || "");
    setHasExistingAudio(Boolean(song.has_audio));
    setClearAudio(false);
    setStatusMsg(`《${song.title}》 편집 모드로 불러왔습니다.`);
    playSoftTone(620, 0.1);
  };

  const handleGlobalToggle = async (nextActive: boolean) => {
    const res = await fetch("/api/songs/toggle", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: nextActive })
    });
    const data = await res.json();
    if (res.ok && data.ok) {
      onDataUpdated({ seasonalSongs: data.songs });
      playSoftTone(nextActive ? 780 : 520, 0.12);
    }
  };

  const handleToggleOne = async (song: SeasonalSong) => {
    const res = await fetch("/api/songs/toggle", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ songId: song.id, isActive: !song.is_active })
    });
    const data = await res.json();
    if (res.ok && data.ok) {
      onDataUpdated({ seasonalSongs: data.songs });
      if (editingSongId === song.id) setIsActive(!song.is_active);
      playSoftTone(680, 0.1);
    }
  };

  const handleDeleteSong = async (song: SeasonalSong) => {
    if (!window.confirm(`《${song.title}》 시즌송을 삭제할까요? 학생들의 해당 곡 진행 기록도 함께 삭제됩니다.`)) {
      return;
    }
    const res = await fetch("/api/songs/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ songId: song.id })
    });
    const data = await res.json();
    if (res.ok && data.ok) {
      onDataUpdated({ seasonalSongs: data.songs });
      if (editingSongId === song.id) resetForm();
    }
  };

  const handleAudioFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 12 * 1024 * 1024) {
      setStatusMsg("오디오 파일 크기는 12MB 이하여야 합니다.");
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === "string") {
        setAudioBase64(reader.result);
        setAudioMime(file.type || "audio/mpeg");
        setAudioFilename(file.name);
        setClearAudio(false);
        setStatusMsg(`음원 파일 "${file.name}"이(가) 준비되었습니다. 저장을 눌러 반영하세요.`);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleAnalyzeLyrics = async () => {
    if (!rawLyrics.trim()) {
      setStatusMsg("먼저 영어 가사를 입력해 주세요.");
      return;
    }
    setAnalyzing(true);
    setStatusMsg("");
    try {
      const res = await fetch("/api/songs/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim() || "Seasonal Song", rawLyrics, track })
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setLines(data.lines || []);
        setVocab(data.vocab || []);
        setStatusMsg(
          `AI 가사 분석 완료: 소절 ${data.lines?.length || 0}줄, 핵심 단어 ${data.vocab?.length || 0}개가 생성되었습니다.`
        );
        playSoftTone(820, 0.14);
      } else {
        setStatusMsg(data.error || "가사 분석에 실패했습니다.");
      }
    } catch {
      setStatusMsg("가사 분석 요청 중 오류가 발생했습니다.");
    } finally {
      setAnalyzing(false);
    }
  };

  const handleSaveSong = async () => {
    if (!title.trim()) {
      setStatusMsg("곡 제목을 입력해 주세요.");
      return;
    }
    setSaving(true);
    setStatusMsg("");
    try {
      const res = await fetch("/api/songs/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingSongId || undefined,
          season_key: seasonKey,
          season_label: seasonLabel.trim() || "시즌 스페셜",
          track,
          title: title.trim(),
          subtitle_kr: subtitleKr.trim(),
          artist_label: artistLabel.trim(),
          is_active: isActive,
          youtube_url: youtubeUrl.trim(),
          audio_base64: audioBase64 || undefined,
          audio_mime: audioMime || undefined,
          audio_filename: audioFilename || undefined,
          clear_audio: clearAudio,
          raw_lyrics: rawLyrics.trim(),
          lines,
          vocab,
          autoAnalyze: lines.length === 0 && Boolean(rawLyrics.trim())
        })
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        onDataUpdated({ seasonalSongs: data.songs });
        if (data.song) loadSongIntoForm(data.song);
        setStatusMsg(`저장 완료! 《${data.song?.title || title}》이(가) 반영되었습니다.`);
        playSoftTone(860, 0.18);
      } else {
        setStatusMsg(data.error || "저장에 실패했습니다.");
      }
    } catch {
      setStatusMsg("저장 중 오류가 발생했습니다.");
    } finally {
      setSaving(false);
    }
  };

  const updateLineField = (idx: number, patch: Partial<SongLyricLine>) => {
    setLines((prev) => prev.map((l, i) => (i === idx ? { ...l, ...patch } : l)));
  };

  return (
    <div className="space-y-8 max-w-6xl">
      {/* Header & Global ON/OFF */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#e5dcc9]">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">시즌송 · 크리스마스 캐롤 관리</h2>
          <p className="text-sm text-slate-500 mt-1">
            학생 홈에 보너스 스페셜 배너로 노출되는 시즌 노래를 관리합니다. 유튜브 링크와 MP3 음원 모두 지원합니다.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span
            className={`px-3 py-1.5 rounded-full text-xs font-extrabold border ${
              anyActive
                ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                : "bg-slate-100 border-slate-200 text-slate-500"
            }`}
          >
            {anyActive ? "학생 홈 노출 중 (ON)" : "학생 홈 숨김 (OFF)"}
          </span>
          <button
            type="button"
            onClick={() => handleGlobalToggle(!anyActive)}
            className="px-4 py-2 rounded-xl btn-water-glass text-xs font-extrabold"
          >
            {anyActive ? "시즌 전체 OFF" : "시즌 전체 ON"}
          </button>
        </div>
      </div>

      {/* Song List + Editor Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Registered Seasonal Songs */}
        <div className="lg:col-span-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900">등록된 시즌송 ({seasonalSongs.length}곡)</h3>
            <button
              type="button"
              onClick={resetForm}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800"
            >
              <Plus className="w-3.5 h-3.5" /> 새 시즌송 등록
            </button>
          </div>

          {seasonalSongs.map((s) => (
            <div
              key={s.id}
              className={`rounded-2xl border p-4 bg-white/90 space-y-2.5 transition ${
                editingSongId === s.id ? "border-sky-400 ring-2 ring-sky-100" : "border-slate-200"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-0.5 min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="px-2 py-0.5 rounded-full bg-rose-50 border border-rose-200 text-[11px] font-extrabold text-rose-700">
                      {s.season_label}
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-slate-100 text-[11px] font-bold text-slate-700">
                      {s.track === "junior" ? "저학년" : "고학년"}
                    </span>
                  </div>
                  <div className="text-base font-extrabold text-slate-900 truncate">{s.title}</div>
                  <div className="text-xs text-slate-500">{s.subtitle_kr}</div>
                </div>

                <button
                  type="button"
                  onClick={() => handleToggleOne(s)}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-extrabold border shrink-0 ${
                    s.is_active
                      ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                      : "bg-slate-100 border-slate-200 text-slate-500"
                  }`}
                >
                  {s.is_active ? "ON" : "OFF"}
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                <span
                  className={`px-2 py-0.5 rounded-md font-bold ${
                    s.has_audio ? "bg-sky-50 text-sky-700 border border-sky-200" : "bg-slate-50 text-slate-400"
                  }`}
                >
                  {s.has_audio ? `MP3: ${s.audio_filename || "업로드됨"}` : "MP3 미등록"}
                </span>
                <span
                  className={`px-2 py-0.5 rounded-md font-bold ${
                    s.youtube_url ? "bg-rose-50 text-rose-700 border border-rose-200" : "bg-slate-50 text-slate-400"
                  }`}
                >
                  {s.youtube_url ? "유튜브 연결됨" : "유튜브 미등록"}
                </span>
                <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 font-bold">
                  가사 {s.lines.length}줄 · 단어 {s.vocab.length}개
                </span>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => loadSongIntoForm(s)}
                  className="flex-1 py-1.5 px-3 rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-800 text-xs font-bold border border-sky-200"
                >
                  음원 · 가사 편집
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteSong(s)}
                  className="p-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200"
                  title="삭제"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Right: Song Form */}
        <div className="lg:col-span-7 rounded-2xl border border-slate-200 bg-white/95 p-5 space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900">
              {editingSongId ? "시즌송 정보 · 음원 수정" : "새 시즌송 등록"}
            </h3>
            <label className="inline-flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="rounded accent-sky-600"
              />
              학생 홈 노출 활성화
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">시즌 테마</label>
              <select
                value={seasonKey}
                onChange={(e) => {
                  const key = e.target.value;
                  setSeasonKey(key);
                  const preset = SEASON_PRESETS.find((p) => p.key === key);
                  if (preset) setSeasonLabel(preset.label);
                }}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold bg-white"
              >
                {SEASON_PRESETS.map((p) => (
                  <option key={p.key} value={p.key}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">시즌 배지 문구</label>
              <input
                type="text"
                value={seasonLabel}
                onChange={(e) => setSeasonLabel(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">대상 트랙</label>
              <select
                value={track}
                onChange={(e) => setTrack(e.target.value === "senior" ? "senior" : "junior")}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold bg-white"
              >
                <option value="junior">저학년 (초등 1~3 / 유치)</option>
                <option value="senior">고학년 (초등 4~6)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">영어 곡 제목</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="예: We Wish You a Merry Christmas"
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">한국어 부제 / 설명</label>
              <input
                type="text"
                value={subtitleKr}
                onChange={(e) => setSubtitleKr(e.target.value)}
                placeholder="예: 즐거운 크리스마스 인사 캐롤"
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold"
              />
            </div>
          </div>

          {/* Media Sources: Both YouTube + MP3 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
            <div className="rounded-xl bg-rose-50/55 border border-rose-200/80 p-3.5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 text-xs font-extrabold text-rose-800">
                  <Video className="w-4 h-4" /> 유튜브 영상 링크 (선택)
                </span>
                {title.trim() && (
                  <a
                    href={`https://www.youtube.com/results?search_query=${encodeURIComponent(title + " kids song lyrics")}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-0.5 text-[11px] font-bold text-rose-600 hover:underline"
                  >
                    유튜브 검색 <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
              <input
                type="url"
                value={youtubeUrl}
                onChange={(e) => setYoutubeUrl(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=..."
                className="w-full rounded-lg border border-rose-200 bg-white px-3 py-1.5 text-xs"
              />
              {ytPreviewId && (
                <div className="text-[11px] font-bold text-emerald-700">
                  ✓ 유튜브 ID 인식됨: {ytPreviewId}
                </div>
              )}
            </div>

            <div className="rounded-xl bg-sky-50/55 border border-sky-200/80 p-3.5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 text-xs font-extrabold text-sky-900">
                  <Music className="w-4 h-4" /> MP3 / 오디오 파일 업로드 (선택)
                </span>
                {(hasExistingAudio || audioBase64) && !clearAudio && (
                  <button
                    type="button"
                    onClick={() => {
                      setAudioBase64("");
                      setAudioFilename("");
                      setClearAudio(true);
                    }}
                    className="text-[11px] font-bold text-rose-600 hover:underline"
                  >
                    음원 제거
                  </button>
                )}
              </div>
              <label className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-dashed border-sky-300 bg-white text-xs font-bold text-sky-800 cursor-pointer hover:bg-sky-50">
                <Upload className="w-3.5 h-3.5" />
                <span>{audioFilename ? audioFilename : "MP3 / M4A / WAV 선택 (최대 12MB)"}</span>
                <input type="file" accept="audio/*" onChange={handleAudioFileChange} className="hidden" />
              </label>
              {editingSongId && hasExistingAudio && !clearAudio && !audioBase64 && (
                <audio
                  controls
                  src={`/api/songs/audio?songId=${encodeURIComponent(editingSongId)}`}
                  className="w-full h-8"
                />
              )}
            </div>
          </div>

          {/* Lyrics + AI Auto Analysis */}
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="text-xs font-bold text-slate-700">
                영어 가사 (`[Chorus]`, `[Verse 1]` 섹션 구분 지원)
              </label>
              <button
                type="button"
                disabled={analyzing}
                onClick={handleAnalyzeLyrics}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-950 text-xs font-extrabold border border-amber-300 disabled:opacity-50"
              >
                <Sparkles className="w-3.5 h-3.5" />
                {analyzing ? "AI 분석 중..." : "AI 가사 해석·단어·퀴즈 자동 생성"}
              </button>
            </div>
            <textarea
              rows={5}
              value={rawLyrics}
              onChange={(e) => setRawLyrics(e.target.value)}
              placeholder={"[Chorus]\nWe wish you a merry Christmas..."}
              className="w-full rounded-xl border border-slate-200 p-3 text-xs font-mono leading-relaxed"
            />
          </div>

          {/* Line-by-line Interpretation & Timestamp Editor */}
          {lines.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <div className="text-xs font-bold text-slate-700">
                소절별 한국어 해석 · 빈칸 단어 · 구간 타임스탬프 ({lines.length}줄)
              </div>
              <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
                {lines.map((line, idx) => (
                  <div key={idx} className="rounded-xl bg-slate-50 border border-slate-200 p-2.5 space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-bold text-rose-700">{line.section}</span>
                      <div className="flex items-center gap-1.5 text-[11px]">
                        <input
                          type="number"
                          placeholder="시작(초)"
                          value={line.start_sec ?? ""}
                          onChange={(e) =>
                            updateLineField(idx, {
                              start_sec: e.target.value === "" ? null : Number(e.target.value)
                            })
                          }
                          className="w-16 rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[11px]"
                        />
                        <span>~</span>
                        <input
                          type="number"
                          placeholder="끝(초)"
                          value={line.end_sec ?? ""}
                          onChange={(e) =>
                            updateLineField(idx, {
                              end_sec: e.target.value === "" ? null : Number(e.target.value)
                            })
                          }
                          className="w-16 rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[11px]"
                        />
                        <input
                          type="text"
                          placeholder="빈칸단어"
                          value={line.blank_word || ""}
                          onChange={(e) => updateLineField(idx, { blank_word: e.target.value })}
                          className="w-24 rounded border border-amber-200 bg-amber-50/70 px-1.5 py-0.5 text-[11px] font-bold"
                        />
                      </div>
                    </div>
                    <input
                      type="text"
                      value={line.en}
                      onChange={(e) => updateLineField(idx, { en: e.target.value })}
                      className="w-full rounded border border-slate-200 bg-white px-2 py-1 text-xs font-bold"
                    />
                    <input
                      type="text"
                      value={line.kr}
                      onChange={(e) => updateLineField(idx, { kr: e.target.value })}
                      className="w-full rounded border border-slate-200 bg-white px-2 py-1 text-xs text-slate-600"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {statusMsg && (
            <div className="rounded-xl bg-sky-50 border border-sky-200 px-3.5 py-2.5 text-xs font-bold text-sky-900">
              {statusMsg}
            </div>
          )}

          <div className="flex justify-end">
            <button
              type="button"
              disabled={saving}
              onClick={handleSaveSong}
              className="px-6 py-2.5 rounded-xl btn-water-glass text-sm font-extrabold disabled:opacity-50"
            >
              {saving ? "저장 중..." : editingSongId ? "수정 사항 저장하기" : "새 시즌송 등록하기"}
            </button>
          </div>
        </div>
      </div>

      {/* Student Seasonal Song Progress Table */}
      <div className="rounded-2xl border border-slate-200 bg-white/95 p-5 space-y-3">
        <h3 className="text-base font-bold text-slate-900">학생별 시즌송 참여 현황</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500">
                <th className="py-2 pr-3 font-bold">학생</th>
                <th className="py-2 pr-3 font-bold">추천 트랙</th>
                <th className="py-2 pr-3 font-bold">진행 곡</th>
                <th className="py-2 pr-3 font-bold">1~4주 완료</th>
                <th className="py-2 pr-3 font-bold">퀴즈 최고점</th>
                <th className="py-2 font-bold text-right">녹음 듣기</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map((stu) => {
                const recTrack = resolveStudentSongTrack(stu);
                const stuProgs = allProgress.filter((p) => p.user_id === stu.id);
                const mainProg = stuProgs[0] || null;
                const matchedSong = mainProg
                  ? seasonalSongs.find((s) => s.id === mainProg.song_id)
                  : seasonalSongs.find((s) => s.track === recTrack && s.is_active);
                return (
                  <tr key={stu.id}>
                    <td className="py-2.5 pr-3 font-extrabold text-slate-900">
                      {stu.name} <span className="text-slate-400 font-medium">({stu.grade_label})</span>
                    </td>
                    <td className="py-2.5 pr-3">
                      <span className="px-2 py-0.5 rounded-full bg-slate-100 font-bold text-slate-700">
                        {recTrack === "junior" ? "저학년" : "고학년"}
                      </span>
                    </td>
                    <td className="py-2.5 pr-3 font-semibold text-slate-700">
                      {matchedSong?.title || "-"}
                    </td>
                    <td className="py-2.5 pr-3">
                      <div className="flex items-center gap-1">
                        {[
                          { label: "1주", done: Boolean(mainProg?.week1_done) },
                          { label: "2주", done: Boolean(mainProg?.week2_done) },
                          { label: "3주", done: Boolean(mainProg?.week3_done) },
                          { label: "4주", done: Boolean(mainProg?.week4_done) }
                        ].map((w) => (
                          <span
                            key={w.label}
                            className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              w.done
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-slate-100 text-slate-400"
                            }`}
                          >
                            {w.done && <CheckCircle2 className="w-2.5 h-2.5" />}
                            {w.label}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="py-2.5 pr-3 font-bold text-slate-700">
                      {mainProg ? `${mainProg.quiz_best_score}점` : "-"}
                    </td>
                    <td className="py-2.5 text-right">
                      <button
                        type="button"
                        onClick={() => {
                          onSelectStudent(stu.id);
                          onChangeTab("coaching");
                        }}
                        className="px-2.5 py-1 rounded-lg bg-sky-50 hover:bg-sky-100 text-sky-800 font-bold"
                      >
                        녹음 확인 →
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

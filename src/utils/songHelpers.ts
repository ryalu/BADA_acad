import type { SeasonalSong, SongTrack, StudentUser } from "../types";

/**
 * Extracts the 11-character YouTube video ID from common YouTube share/watch/embed URLs.
 */
export function extractYouTubeVideoId(url: string): string | null {
  const raw = String(url || "").trim();
  if (!raw) return null;
  if (/^[a-zA-Z0-9_-]{11}$/.test(raw)) return raw;
  try {
    const u = new URL(raw.startsWith("http") ? raw : `https://${raw}`);
    const host = u.hostname.replace(/^www\./, "").toLowerCase();
    if (host === "youtu.be") {
      const id = u.pathname.replace(/^\//, "").split("/")[0];
      return /^[a-zA-Z0-9_-]{11}$/.test(id) ? id : null;
    }
    if (host.endsWith("youtube.com") || host === "youtube-nocookie.com") {
      const v = u.searchParams.get("v");
      if (v && /^[a-zA-Z0-9_-]{11}$/.test(v)) return v;
      const parts = u.pathname.split("/").filter(Boolean);
      const embedIdx = parts.findIndex((p) => p === "embed" || p === "shorts" || p === "live" || p === "v");
      if (embedIdx !== -1 && parts[embedIdx + 1]) {
        const candidate = parts[embedIdx + 1];
        return /^[a-zA-Z0-9_-]{11}$/.test(candidate) ? candidate : null;
      }
    }
  } catch {
    const m = /(?:v=|youtu\.be\/|\/embed\/|\/shorts\/)([a-zA-Z0-9_-]{11})/.exec(raw);
    return m ? m[1] : null;
  }
  return null;
}

/**
 * Resolves Junior vs Senior seasonal song track from student grade group, age, and book level.
 */
export function resolveStudentSongTrack(user?: StudentUser | null): SongTrack {
  if (!user) return "junior";
  if (user.grade_group === "grade_4_plus" || user.grade_group === "grade_6") {
    return "senior";
  }
  if ((user.age || 0) >= 11 || /^Level\s*[4-8]$/i.test(user.level || "")) {
    return "senior";
  }
  return "junior";
}

/**
 * Picks the recommended active seasonal song matching the student's track, falling back to any active song.
 */
export function pickRecommendedSongForStudent(
  songs: SeasonalSong[] = [],
  user?: StudentUser | null
): SeasonalSong | null {
  const active = songs.filter((s) => Boolean(s.is_active));
  if (active.length === 0) return null;
  const preferredTrack = resolveStudentSongTrack(user);
  return active.find((s) => s.track === preferredTrack) || active[0];
}

export interface SeasonVisualMeta {
  badgeText: string;
  accentRingClass: string;
  pillBgClass: string;
  iconEmoji: string;
  cardClass: string;
  ctaBtnClass: string;
  progressDoneClass: string;
  playerAccentClass: string;
}

/**
 * Returns glassmorphic seasonal styling matching each seasonal theme.
 */
export function getSeasonVisualMeta(seasonKey: string): SeasonVisualMeta {
  switch (String(seasonKey || "").toLowerCase()) {
    case "christmas":
      return {
        badgeText: "크리스마스 스페셜",
        accentRingClass: "ring-1 ring-rose-300/60 border-white/90",
        pillBgClass: "bg-rose-50/90 text-rose-700 border-rose-200",
        iconEmoji: "🎄",
        cardClass: "card-season-christmas",
        ctaBtnClass: "btn-season-christmas",
        progressDoneClass: "bg-emerald-600/95 border-emerald-700 text-white shadow-xs",
        playerAccentClass: "border-rose-200/80 bg-gradient-to-br from-white/75 via-sky-50/50 to-rose-50/50"
      };
    case "spring":
      return {
        badgeText: "봄 시즌 스페셜",
        accentRingClass: "ring-1 ring-pink-300/60 border-white/90",
        pillBgClass: "bg-pink-50/90 text-pink-700 border-pink-200",
        iconEmoji: "🌸",
        cardClass: "card-season-spring",
        ctaBtnClass: "btn-season-spring",
        progressDoneClass: "bg-pink-600/90 border-pink-700 text-white shadow-xs",
        playerAccentClass: "border-pink-200/80 bg-gradient-to-br from-white/75 via-pink-50/50 to-amber-50/40"
      };
    case "summer":
      return {
        badgeText: "여름 시즌 스페셜",
        accentRingClass: "ring-1 ring-cyan-300/65 border-white/90",
        pillBgClass: "bg-cyan-50/90 text-cyan-700 border-cyan-200",
        iconEmoji: "🌊",
        cardClass: "card-season-summer",
        ctaBtnClass: "btn-season-summer",
        progressDoneClass: "bg-cyan-600/90 border-cyan-700 text-white shadow-xs",
        playerAccentClass: "border-cyan-200/80 bg-gradient-to-br from-white/75 via-sky-50/55 to-cyan-50/50"
      };
    case "halloween":
      return {
        badgeText: "할로윈 스페셜",
        accentRingClass: "ring-1 ring-amber-300/65 border-white/90",
        pillBgClass: "bg-amber-50/90 text-amber-800 border-amber-200",
        iconEmoji: "🎃",
        cardClass: "card-season-halloween",
        ctaBtnClass: "btn-season-halloween",
        progressDoneClass: "bg-amber-600/90 border-amber-700 text-white shadow-xs",
        playerAccentClass: "border-amber-200/80 bg-gradient-to-br from-white/75 via-amber-50/50 to-purple-50/45"
      };
    default:
      return {
        badgeText: "시즌 스페셜",
        accentRingClass: "ring-1 ring-sky-300/65 border-white/90",
        pillBgClass: "bg-sky-50/90 text-sky-800 border-sky-200",
        iconEmoji: "🎵",
        cardClass: "card-season-custom",
        ctaBtnClass: "btn-season-custom",
        progressDoneClass: "bg-sky-600/90 border-sky-700 text-white shadow-xs",
        playerAccentClass: "border-sky-200/80 bg-gradient-to-br from-white/75 via-sky-50/50 to-amber-50/35"
      };
  }
}

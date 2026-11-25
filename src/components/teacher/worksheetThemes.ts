import type { Book } from "../../types";
import { detectCoverTheme, type CoverThemeId } from "../BookCover";

export interface WorksheetTheme {
  id: CoverThemeId;
  primary: string;
  primaryDark: string;
  softBg: string;
  softBorder: string;
  accentBg: string;
  coverBgStart: string;
  coverBgEnd: string;
  baselineColor: string;
  midlineColor: string;
  outerlineColor: string;
  coverImageUrl?: string;
  motifSvg: string;
  headerBadgeSvg: string;
}

const THEME_PALETTES: Record<CoverThemeId, Omit<WorksheetTheme, "id" | "coverImageUrl">> = {
  ocean_friends: {
    primary: "#0284c7",
    primaryDark: "#0369a1",
    softBg: "#f0f9ff",
    softBorder: "#bae6fd",
    accentBg: "#e0f2fe",
    coverBgStart: "#e0f2fe",
    coverBgEnd: "#f0fdfa",
    baselineColor: "#ef4444",
    midlineColor: "#60a5fa",
    outerlineColor: "#cbd5e1",
    headerBadgeSvg: `<svg viewBox="0 0 28 28" width="22" height="22"><path d="M14 3l2.9 6.2 6.8.9-5 4.8 1.2 6.8L14 18.4 8.1 21.7l1.2-6.8-5-4.8 6.8-.9z" fill="#fb923c" stroke="#ea580c" stroke-width="1.4" stroke-linejoin="round"/></svg>`,
    motifSvg: `<svg viewBox="0 0 120 36" width="110" height="32"><path d="M0 24 Q15 14 30 24 T60 24 T90 24 T120 24" fill="none" stroke="#38bdf8" stroke-width="2.4" stroke-linecap="round"/><circle cx="22" cy="10" r="4" fill="#bae6fd"/><circle cx="88" cy="9" r="3" fill="#7dd3fc"/></svg>`
  },
  deep_current: {
    primary: "#4f46e5",
    primaryDark: "#3730a3",
    softBg: "#eef2ff",
    softBorder: "#c7d2fe",
    accentBg: "#e0e7ff",
    coverBgStart: "#e0e7ff",
    coverBgEnd: "#ecfeff",
    baselineColor: "#f43f5e",
    midlineColor: "#818cf8",
    outerlineColor: "#cbd5e1",
    headerBadgeSvg: `<svg viewBox="0 0 28 28" width="22" height="22"><circle cx="14" cy="14" r="9" fill="#a5f3fc" stroke="#0891b2" stroke-width="1.6"/><circle cx="11" cy="11" r="2.6" fill="#ffffff"/></svg>`,
    motifSvg: `<svg viewBox="0 0 120 36" width="110" height="32"><path d="M4 22 Q24 10 44 22 T84 22 T116 18" fill="none" stroke="#818cf8" stroke-width="2.2" stroke-linecap="round"/><circle cx="102" cy="10" r="4" fill="#a5f3fc"/></svg>`
  },
  bubble_song: {
    primary: "#0891b2",
    primaryDark: "#0e7490",
    softBg: "#ecfeff",
    softBorder: "#a5f3fc",
    accentBg: "#cffafe",
    coverBgStart: "#cffafe",
    coverBgEnd: "#e0f2fe",
    baselineColor: "#ef4444",
    midlineColor: "#38bdf8",
    outerlineColor: "#cbd5e1",
    headerBadgeSvg: `<svg viewBox="0 0 28 28" width="22" height="22"><circle cx="12" cy="15" r="7.5" fill="#bae6fd" stroke="#0284c7" stroke-width="1.5"/><circle cx="20" cy="8" r="3.5" fill="#fef08a" stroke="#eab308" stroke-width="1.2"/></svg>`,
    motifSvg: `<svg viewBox="0 0 120 36" width="110" height="32"><circle cx="18" cy="18" r="8" fill="#cffafe" stroke="#22d3ee" stroke-width="1.6"/><circle cx="38" cy="11" r="5" fill="#e0f2fe" stroke="#38bdf8" stroke-width="1.4"/><circle cx="56" cy="21" r="6.5" fill="#fef9c3" stroke="#facc15" stroke-width="1.4"/></svg>`
  },
  yard: {
    primary: "#16a34a",
    primaryDark: "#15803d",
    softBg: "#f0fdf4",
    softBorder: "#bbf7d0",
    accentBg: "#dcfce7",
    coverBgStart: "#dcfce7",
    coverBgEnd: "#fefce8",
    baselineColor: "#ef4444",
    midlineColor: "#4ade80",
    outerlineColor: "#cbd5e1",
    headerBadgeSvg: `<svg viewBox="0 0 28 28" width="22" height="22"><path d="M6 21C7 10 15 6 22 7c1 7-3 15-16 14z" fill="#86efac" stroke="#16a34a" stroke-width="1.5"/></svg>`,
    motifSvg: `<svg viewBox="0 0 120 36" width="110" height="32"><circle cx="24" cy="18" r="5" fill="#fde047"/><circle cx="24" cy="10" r="4" fill="#fbcfe8"/><circle cx="32" cy="18" r="4" fill="#fbcfe8"/><circle cx="24" cy="26" r="4" fill="#fbcfe8"/><circle cx="16" cy="18" r="4" fill="#fbcfe8"/></svg>`
  },
  school: {
    primary: "#ea580c",
    primaryDark: "#c2410c",
    softBg: "#fff7ed",
    softBorder: "#fed7aa",
    accentBg: "#ffedd5",
    coverBgStart: "#ffedd5",
    coverBgEnd: "#fef3c7",
    baselineColor: "#ef4444",
    midlineColor: "#fb923c",
    outerlineColor: "#cbd5e1",
    headerBadgeSvg: `<svg viewBox="0 0 28 28" width="22" height="22"><rect x="6" y="7" width="16" height="14" rx="3" fill="#fde68a" stroke="#d97706" stroke-width="1.5"/><path d="M10 12h8M10 16h6" stroke="#b45309" stroke-width="1.5" stroke-linecap="round"/></svg>`,
    motifSvg: `<svg viewBox="0 0 120 36" width="110" height="32"><rect x="12" y="13" width="38" height="10" rx="3" fill="#fdba74" stroke="#ea580c" stroke-width="1.4"/><polygon points="50,13 60,18 50,23" fill="#fef3c7" stroke="#ea580c" stroke-width="1.4"/></svg>`
  },
  forest: {
    primary: "#0d9488",
    primaryDark: "#0f766e",
    softBg: "#f0fdfa",
    softBorder: "#99f6e4",
    accentBg: "#ccfbf1",
    coverBgStart: "#dcfce7",
    coverBgEnd: "#f0fdfa",
    baselineColor: "#ef4444",
    midlineColor: "#34d399",
    outerlineColor: "#cbd5e1",
    headerBadgeSvg: `<svg viewBox="0 0 28 28" width="22" height="22"><polygon points="14,4 22,19 6,19" fill="#6ee7b7" stroke="#059669" stroke-width="1.5"/><rect x="12.5" y="19" width="3" height="5" fill="#92400e"/></svg>`,
    motifSvg: `<svg viewBox="0 0 120 36" width="110" height="32"><polygon points="20,6 29,24 11,24" fill="#86efac" stroke="#16a34a" stroke-width="1.4"/><polygon points="44,10 52,24 36,24" fill="#6ee7b7" stroke="#0d9488" stroke-width="1.4"/></svg>`
  },
  space: {
    primary: "#6366f1",
    primaryDark: "#4338ca",
    softBg: "#eef2ff",
    softBorder: "#c7d2fe",
    accentBg: "#e0e7ff",
    coverBgStart: "#e0e7ff",
    coverBgEnd: "#f3e8ff",
    baselineColor: "#ef4444",
    midlineColor: "#818cf8",
    outerlineColor: "#cbd5e1",
    headerBadgeSvg: `<svg viewBox="0 0 28 28" width="22" height="22"><circle cx="14" cy="14" r="6" fill="#fde047" stroke="#ca8a04" stroke-width="1.4"/><ellipse cx="14" cy="14" rx="11" ry="3.5" fill="none" stroke="#6366f1" stroke-width="1.5" transform="rotate(-18 14 14)"/></svg>`,
    motifSvg: `<svg viewBox="0 0 120 36" width="110" height="32"><circle cx="24" cy="18" r="8" fill="#fde047"/><ellipse cx="24" cy="18" rx="15" ry="4.5" fill="none" stroke="#818cf8" stroke-width="1.5" transform="rotate(-14 24 18)"/><circle cx="52" cy="11" r="2.5" fill="#818cf8"/></svg>`
  },
  magic: {
    primary: "#db2777",
    primaryDark: "#9d174d",
    softBg: "#fdf2f8",
    softBorder: "#fbcfe8",
    accentBg: "#fce7f3",
    coverBgStart: "#fce7f3",
    coverBgEnd: "#f3e8ff",
    baselineColor: "#ef4444",
    midlineColor: "#f472b6",
    outerlineColor: "#cbd5e1",
    headerBadgeSvg: `<svg viewBox="0 0 28 28" width="22" height="22"><path d="M5 19l3-10 6 5 6-5 3 10z" fill="#fde047" stroke="#db2777" stroke-width="1.4" stroke-linejoin="round"/></svg>`,
    motifSvg: `<svg viewBox="0 0 120 36" width="110" height="32"><path d="M18 18l3-7 3 7 7 3-7 3-3 7-3-7-7-3z" fill="#fde047" stroke="#ec4899" stroke-width="1.3"/></svg>`
  },
  sunny: {
    primary: "#d97706",
    primaryDark: "#b45309",
    softBg: "#fffbeb",
    softBorder: "#fde68a",
    accentBg: "#fef3c7",
    coverBgStart: "#fef3c7",
    coverBgEnd: "#ffedd5",
    baselineColor: "#ef4444",
    midlineColor: "#fbbf24",
    outerlineColor: "#cbd5e1",
    headerBadgeSvg: `<svg viewBox="0 0 28 28" width="22" height="22"><circle cx="14" cy="14" r="6.5" fill="#fde047" stroke="#d97706" stroke-width="1.5"/><path d="M14 3v3M14 22v3M3 14h3M22 14h3" stroke="#d97706" stroke-width="1.6" stroke-linecap="round"/></svg>`,
    motifSvg: `<svg viewBox="0 0 120 36" width="110" height="32"><circle cx="22" cy="18" r="8" fill="#fde047" stroke="#f59e0b" stroke-width="1.5"/><path d="M46 23a6 6 0 015-9 7 7 0 0113 1 5 5 0 011 9z" fill="#ffffff" stroke="#93c5fd" stroke-width="1.5"/></svg>`
  }
};

export function getWorksheetTheme(book: Pick<Book, "id" | "title" | "full_text">): WorksheetTheme {
  const detected = detectCoverTheme(book);
  const palette = THEME_PALETTES[detected.id] || THEME_PALETTES.sunny;
  return {
    id: detected.id,
    coverImageUrl: detected.imageUrl,
    ...palette
  };
}

export function getBookLevelRank(level: string | undefined | null): number {
  const raw = String(level || "").trim().toLowerCase();
  if (!raw || raw.includes("pre")) return 0;
  const match = /\d+/.exec(raw);
  return match ? Number(match[0]) : 2;
}

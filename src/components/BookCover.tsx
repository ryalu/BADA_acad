import React from "react";
import type { Book } from "../types";

export type CoverThemeId =
  | "ocean_friends"
  | "deep_current"
  | "bubble_song"
  | "forest"
  | "space"
  | "magic"
  | "sunny";

interface ThemePalette {
  id: CoverThemeId;
  bgGradient: string;
  spineBg: string;
  badgeBg: string;
  accentColor: string;
  textColor: string;
  subTextColor: string;
}

const THEMES: Record<CoverThemeId, ThemePalette> = {
  ocean_friends: {
    id: "ocean_friends",
    bgGradient: "from-sky-500 via-cyan-600 to-teal-700",
    spineBg: "bg-teal-900/45",
    badgeBg: "bg-white/20 text-white border-white/30",
    accentColor: "#bae6fd",
    textColor: "text-white",
    subTextColor: "text-sky-100"
  },
  deep_current: {
    id: "deep_current",
    bgGradient: "from-slate-800 via-indigo-900 to-cyan-900",
    spineBg: "bg-slate-950/60",
    badgeBg: "bg-cyan-400/20 text-cyan-100 border-cyan-300/30",
    accentColor: "#67e8f9",
    textColor: "text-white",
    subTextColor: "text-indigo-200"
  },
  bubble_song: {
    id: "bubble_song",
    bgGradient: "from-cyan-400 via-sky-500 to-blue-600",
    spineBg: "bg-blue-800/45",
    badgeBg: "bg-white/25 text-white border-white/35",
    accentColor: "#fef08a",
    textColor: "text-white",
    subTextColor: "text-cyan-50"
  },
  forest: {
    id: "forest",
    bgGradient: "from-emerald-600 via-teal-700 to-green-900",
    spineBg: "bg-green-950/50",
    badgeBg: "bg-amber-200/20 text-amber-100 border-amber-200/30",
    accentColor: "#fde68a",
    textColor: "text-white",
    subTextColor: "text-emerald-100"
  },
  space: {
    id: "space",
    bgGradient: "from-indigo-900 via-slate-900 to-violet-950",
    spineBg: "bg-black/50",
    badgeBg: "bg-amber-300/20 text-amber-100 border-amber-300/30",
    accentColor: "#fde047",
    textColor: "text-white",
    subTextColor: "text-indigo-200"
  },
  magic: {
    id: "magic",
    bgGradient: "from-rose-700 via-purple-800 to-indigo-900",
    spineBg: "bg-purple-950/55",
    badgeBg: "bg-amber-200/20 text-amber-100 border-amber-200/30",
    accentColor: "#fcd34d",
    textColor: "text-white",
    subTextColor: "text-rose-100"
  },
  sunny: {
    id: "sunny",
    bgGradient: "from-amber-500 via-orange-500 to-rose-500",
    spineBg: "bg-orange-900/40",
    badgeBg: "bg-white/25 text-white border-white/35",
    accentColor: "#fef9c3",
    textColor: "text-white",
    subTextColor: "text-amber-50"
  }
};

export function detectCoverTheme(book: Pick<Book, "id" | "title" | "full_text">): ThemePalette {
  const hay = `${book.title || ""} ${book.full_text || ""}`.toLowerCase();

  if (hay.includes("guardian") || hay.includes("deep current")) {
    return THEMES.deep_current;
  }
  if (hay.includes("bubble") || hay.includes("song") || hay.includes("music")) {
    return THEMES.bubble_song;
  }
  if (hay.includes("ocean") || hay.includes("sea") || hay.includes("whale") || hay.includes("turtle") || hay.includes("coral")) {
    return THEMES.ocean_friends;
  }
  if (hay.includes("forest") || hay.includes("tree") || hay.includes("wood") || hay.includes("fox") || hay.includes("bear") || hay.includes("garden") || hay.includes("flower")) {
    return THEMES.forest;
  }
  if (hay.includes("space") || hay.includes("star") || hay.includes("moon") || hay.includes("planet") || hay.includes("rocket") || hay.includes("galaxy")) {
    return THEMES.space;
  }
  if (hay.includes("castle") || hay.includes("magic") || hay.includes("king") || hay.includes("queen") || hay.includes("dragon") || hay.includes("wizard") || hay.includes("crown")) {
    return THEMES.magic;
  }
  if (hay.includes("sun") || hay.includes("happy") || hay.includes("school") || hay.includes("friend") || hay.includes("cake") || hay.includes("puppy")) {
    return THEMES.sunny;
  }

  const keys: CoverThemeId[] = ["ocean_friends", "forest", "space", "sunny", "magic", "bubble_song"];
  let hash = 0;
  for (let i = 0; i < hay.length; i += 1) {
    hash = (hash * 31 + hay.charCodeAt(i)) >>> 0;
  }
  return THEMES[keys[hash % keys.length]];
}

const CoverArtwork: React.FC<{ themeId: CoverThemeId; accent: string }> = ({ themeId, accent }) => {
  if (themeId === "ocean_friends") {
    return (
      <svg viewBox="0 0 220 120" className="w-full h-full opacity-90" aria-hidden="true">
        <path d="M0 90 Q55 74 110 90 T220 90 L220 120 L0 120 Z" fill="white" fillOpacity="0.16" />
        <path d="M0 102 Q55 88 110 102 T220 102 L220 120 L0 120 Z" fill="white" fillOpacity="0.22" />
        {/* Friendly whale silhouette */}
        <path
          d="M65 62 C65 40 105 34 128 46 C142 53 148 56 156 52 C158 43 166 40 172 45 C168 53 166 58 175 63 C167 68 159 66 154 62 C142 74 118 78 90 76 C74 75 65 70 65 62 Z"
          fill={accent}
          fillOpacity="0.92"
        />
        <circle cx="84" cy="57" r="2.6" fill="#0f172a" />
        <circle cx="48" cy="36" r="5" fill="white" fillOpacity="0.35" />
        <circle cx="38" cy="24" r="3" fill="white" fillOpacity="0.3" />
        <circle cx="182" cy="28" r="4" fill="white" fillOpacity="0.3" />
      </svg>
    );
  }

  if (themeId === "deep_current") {
    return (
      <svg viewBox="0 0 220 120" className="w-full h-full opacity-90" aria-hidden="true">
        <path d="M10 35 Q70 15 130 42 T215 32" stroke={accent} strokeWidth="2.5" fill="none" strokeOpacity="0.55" />
        <path d="M5 62 Q75 40 140 68 T215 58" stroke={accent} strokeWidth="3" fill="none" strokeOpacity="0.7" />
        <path d="M15 88 Q80 68 145 92 T210 84" stroke="white" strokeWidth="2" fill="none" strokeOpacity="0.35" />
        <polygon points="110,22 142,56 110,70 78,56" fill={accent} fillOpacity="0.82" />
        <circle cx="52" cy="24" r="2" fill="white" fillOpacity="0.7" />
        <circle cx="176" cy="22" r="2.5" fill="white" fillOpacity="0.6" />
        <circle cx="164" cy="94" r="2" fill={accent} fillOpacity="0.7" />
      </svg>
    );
  }

  if (themeId === "bubble_song") {
    return (
      <svg viewBox="0 0 220 120" className="w-full h-full opacity-95" aria-hidden="true">
        <circle cx="60" cy="65" r="20" fill="white" fillOpacity="0.18" stroke="white" strokeOpacity="0.55" strokeWidth="2" />
        <circle cx="115" cy="48" r="26" fill="white" fillOpacity="0.2" stroke="white" strokeOpacity="0.6" strokeWidth="2" />
        <circle cx="162" cy="70" r="15" fill="white" fillOpacity="0.18" stroke="white" strokeOpacity="0.5" strokeWidth="2" />
        <circle cx="106" cy="40" r="6" fill="white" fillOpacity="0.45" />
        <circle cx="53" cy="58" r="4" fill="white" fillOpacity="0.45" />
        {/* Musical note */}
        <path d="M112 58 L112 36 L126 32 L126 52" stroke={accent} strokeWidth="3" fill="none" strokeLinecap="round" />
        <circle cx="108" cy="59" r="4.5" fill={accent} />
        <circle cx="122" cy="53" r="4.5" fill={accent} />
      </svg>
    );
  }

  if (themeId === "forest") {
    return (
      <svg viewBox="0 0 220 120" className="w-full h-full opacity-90" aria-hidden="true">
        <path d="M0 100 Q110 82 220 100 L220 120 L0 120 Z" fill="white" fillOpacity="0.18" />
        <polygon points="58,95 80,40 102,95" fill="white" fillOpacity="0.28" />
        <polygon points="118,95 145,28 172,95" fill={accent} fillOpacity="0.72" />
        <circle cx="42" cy="30" r="10" fill={accent} fillOpacity="0.8" />
      </svg>
    );
  }

  if (themeId === "space") {
    return (
      <svg viewBox="0 0 220 120" className="w-full h-full opacity-95" aria-hidden="true">
        <circle cx="112" cy="58" r="24" fill={accent} fillOpacity="0.88" />
        <ellipse cx="112" cy="58" rx="46" ry="11" stroke="white" strokeOpacity="0.65" strokeWidth="3" fill="none" transform="rotate(-14 112 58)" />
        <circle cx="44" cy="32" r="2.5" fill="white" />
        <circle cx="176" cy="28" r="3" fill="white" />
        <circle cx="164" cy="88" r="2" fill="white" />
        <circle cx="52" cy="86" r="2" fill="white" />
      </svg>
    );
  }

  if (themeId === "magic") {
    return (
      <svg viewBox="0 0 220 120" className="w-full h-full opacity-90" aria-hidden="true">
        <rect x="78" y="54" width="64" height="54" fill="white" fillOpacity="0.2" rx="2" />
        <polygon points="72,54 90,28 108,54" fill={accent} fillOpacity="0.8" />
        <polygon points="112,54 130,28 148,54" fill={accent} fillOpacity="0.8" />
        <polygon points="94,54 110,20 126,54" fill="white" fillOpacity="0.45" />
        <circle cx="46" cy="36" r="3" fill={accent} />
        <circle cx="178" cy="40" r="3" fill={accent} />
      </svg>
    );
  }

  // sunny
  return (
    <svg viewBox="0 0 220 120" className="w-full h-full opacity-90" aria-hidden="true">
      <circle cx="110" cy="52" r="22" fill={accent} fillOpacity="0.92" />
      <path d="M0 95 Q60 76 120 92 T220 90 L220 120 L0 120 Z" fill="white" fillOpacity="0.22" />
      <path d="M40 38 Q56 26 72 38" stroke="white" strokeOpacity="0.6" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <path d="M148 34 Q164 22 180 34" stroke="white" strokeOpacity="0.6" strokeWidth="2.5" fill="none" strokeLinecap="round" />
    </svg>
  );
};

interface BookCoverProps {
  book: Book;
  size?: "sm" | "md" | "lg";
  onClick?: () => void;
  className?: string;
}

export const BookCover: React.FC<BookCoverProps> = ({
  book,
  size = "md",
  onClick,
  className = ""
}) => {
  const theme = detectCoverTheme(book);

  if (size === "sm") {
    return (
      <div
        onClick={onClick}
        className={`relative w-16 h-22 rounded-lg bg-gradient-to-br ${theme.bgGradient} shadow-sm overflow-hidden shrink-0 border border-black/10 flex flex-col justify-between p-1.5 ${
          onClick ? "cursor-pointer hover:scale-[1.03] transition" : ""
        } ${className}`}
      >
        <div className={`absolute inset-y-0 left-0 w-1.5 ${theme.spineBg}`} />
        <div className="pl-1.5 relative z-10">
          <div className="text-[7px] font-bold uppercase tracking-wider text-white/80 truncate">
            {book.level}
          </div>
          <div className="book-serif text-[9px] font-bold text-white leading-tight line-clamp-2 mt-0.5">
            {book.title}
          </div>
        </div>
        <div className="h-8 w-full relative z-10">
          <CoverArtwork themeId={theme.id} accent={theme.accentColor} />
        </div>
      </div>
    );
  }

  const heightCls = size === "lg" ? "min-h-[260px] p-6" : "min-h-[200px] p-5";

  return (
    <div
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={(e) => onClick && e.key === "Enter" && onClick()}
      className={`relative rounded-2xl bg-gradient-to-br ${theme.bgGradient} ${heightCls} shadow-md overflow-hidden border border-black/10 flex flex-col justify-between ${
        onClick ? "cursor-pointer hover:shadow-lg hover:-translate-y-0.5 transition" : ""
      } ${className}`}
    >
      {/* Left Hardcover Spine Crease */}
      <div className={`absolute inset-y-0 left-0 w-3.5 ${theme.spineBg} border-r border-white/15`} />
      {/* Subtle Top Page Edge */}
      <div className="absolute top-1.5 right-1.5 bottom-1.5 left-4 rounded-xl border border-white/15 pointer-events-none" />

      <div className="pl-3 relative z-10 flex items-start justify-between gap-2">
        <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${theme.badgeBg}`}>
          {book.level}
        </span>
        <span className="text-[10px] font-bold uppercase tracking-widest text-white/75">
          BADA Storybook
        </span>
      </div>

      <div className="pl-3 my-2 h-24 w-full relative z-10">
        <CoverArtwork themeId={theme.id} accent={theme.accentColor} />
      </div>

      <div className="pl-3 relative z-10">
        <h4 className={`book-serif text-lg md:text-xl font-bold leading-snug ${theme.textColor}`}>
          {book.title}
        </h4>
        <p className={`text-xs mt-1 font-medium ${theme.subTextColor}`}>{book.subtitle_kr}</p>
      </div>
    </div>
  );
};


import React from "react";
import type { Book } from "../types";

export type CoverThemeId =
  | "ocean_friends"
  | "deep_current"
  | "bubble_song"
  | "yard"
  | "school"
  | "forest"
  | "space"
  | "magic"
  | "sunny";

interface ThemeConfig {
  id: CoverThemeId;
  imageUrl?: string;
  bgGradient: string;
  spineBg: string;
  badgeBg: string;
  accentColor: string;
}

const THEMES: Record<CoverThemeId, ThemeConfig> = {
  ocean_friends: {
    id: "ocean_friends",
    imageUrl: "/assets/cover-ocean-friends.jpg",
    bgGradient: "from-sky-500 via-cyan-600 to-teal-700",
    spineBg: "bg-teal-950/45",
    badgeBg: "bg-white/25 text-white border-white/40",
    accentColor: "#bae6fd"
  },
  deep_current: {
    id: "deep_current",
    imageUrl: "/assets/cover-deep-current.jpg",
    bgGradient: "from-slate-800 via-indigo-900 to-cyan-900",
    spineBg: "bg-slate-950/60",
    badgeBg: "bg-cyan-400/25 text-cyan-50 border-cyan-200/40",
    accentColor: "#67e8f9"
  },
  bubble_song: {
    id: "bubble_song",
    imageUrl: "/assets/cover-bubble-song.jpg",
    bgGradient: "from-cyan-400 via-sky-500 to-blue-600",
    spineBg: "bg-blue-900/45",
    badgeBg: "bg-white/25 text-white border-white/40",
    accentColor: "#fef08a"
  },
  yard: {
    id: "yard",
    imageUrl: "/assets/cover-yard.jpg",
    bgGradient: "from-emerald-500 via-green-600 to-teal-700",
    spineBg: "bg-emerald-950/45",
    badgeBg: "bg-white/25 text-white border-white/40",
    accentColor: "#fde68a"
  },
  school: {
    id: "school",
    imageUrl: "/assets/cover-school.jpg",
    bgGradient: "from-amber-500 via-orange-500 to-rose-600",
    spineBg: "bg-amber-950/45",
    badgeBg: "bg-white/25 text-white border-white/40",
    accentColor: "#fef08a"
  },
  forest: {
    id: "forest",
    bgGradient: "from-emerald-600 via-teal-700 to-green-900",
    spineBg: "bg-green-950/50",
    badgeBg: "bg-amber-200/25 text-amber-50 border-amber-200/40",
    accentColor: "#fde68a"
  },
  space: {
    id: "space",
    bgGradient: "from-indigo-900 via-slate-900 to-violet-950",
    spineBg: "bg-black/50",
    badgeBg: "bg-amber-300/25 text-amber-50 border-amber-300/40",
    accentColor: "#fde047"
  },
  magic: {
    id: "magic",
    bgGradient: "from-rose-700 via-purple-800 to-indigo-900",
    spineBg: "bg-purple-950/55",
    badgeBg: "bg-amber-200/25 text-amber-50 border-amber-200/40",
    accentColor: "#fcd34d"
  },
  sunny: {
    id: "sunny",
    bgGradient: "from-amber-500 via-orange-500 to-rose-500",
    spineBg: "bg-orange-900/40",
    badgeBg: "bg-white/25 text-white border-white/40",
    accentColor: "#fef9c3"
  }
};

export function detectCoverTheme(book: Pick<Book, "id" | "title" | "full_text">): ThemeConfig {
  const titleLower = (book.title || "").toLowerCase();
  const hay = `${titleLower} ${(book.full_text || "").toLowerCase()}`;

  if (titleLower.includes("yard") || titleLower.includes("garden") || hay.includes("backyard") || hay.includes("ladybug")) {
    return THEMES.yard;
  }
  if (titleLower.includes("school") || titleLower.includes("hoo") || hay.includes("classroom") || hay.includes("teacher")) {
    return THEMES.school;
  }
  if (titleLower.includes("guardian") || titleLower.includes("deep current")) {
    return THEMES.deep_current;
  }
  if (titleLower.includes("bubble") || titleLower.includes("song")) {
    return THEMES.bubble_song;
  }
  if (titleLower.includes("ocean") || titleLower.includes("popo") || hay.includes("whale") || hay.includes("coral") || hay.includes("sea")) {
    return THEMES.ocean_friends;
  }
  if (hay.includes("forest") || hay.includes("tree") || hay.includes("bear") || hay.includes("fox") || hay.includes("flower")) {
    return THEMES.forest;
  }
  if (hay.includes("space") || hay.includes("star") || hay.includes("moon") || hay.includes("planet") || hay.includes("rocket")) {
    return THEMES.space;
  }
  if (hay.includes("castle") || hay.includes("magic") || hay.includes("king") || hay.includes("queen") || hay.includes("dragon")) {
    return THEMES.magic;
  }

  return THEMES.sunny;
}

// Cute character SVG fallback for newly registered custom themes
const CuteCharacterSvg: React.FC<{ themeId: CoverThemeId; accent: string }> = ({ themeId, accent }) => {
  if (themeId === "forest") {
    return (
      <svg viewBox="0 0 220 120" className="w-full h-full" aria-hidden="true">
        <path d="M0 98 Q110 80 220 98 L220 120 L0 120 Z" fill="white" fillOpacity="0.2" />
        {/* Cute bear character */}
        <circle cx="92" cy="46" r="9" fill="#d97706" />
        <circle cx="128" cy="46" r="9" fill="#d97706" />
        <circle cx="110" cy="64" r="24" fill="#f59e0b" />
        <ellipse cx="110" cy="70" rx="11" ry="8" fill="#fef3c7" />
        <circle cx="101" cy="60" r="2.8" fill="#1e293b" />
        <circle cx="119" cy="60" r="2.8" fill="#1e293b" />
        <circle cx="95" cy="66" r="3.5" fill="#fb7185" fillOpacity="0.55" />
        <circle cx="125" cy="66" r="3.5" fill="#fb7185" fillOpacity="0.55" />
        <circle cx="110" cy="67" r="3" fill="#78350f" />
        <path d="M106 72 Q110 76 114 72" stroke="#78350f" strokeWidth="2" fill="none" strokeLinecap="round" />
      </svg>
    );
  }

  if (themeId === "space") {
    return (
      <svg viewBox="0 0 220 120" className="w-full h-full" aria-hidden="true">
        <circle cx="45" cy="30" r="2.5" fill="white" />
        <circle cx="176" cy="28" r="3" fill="white" />
        <circle cx="164" cy="88" r="2" fill="white" />
        {/* Cute smiling planet */}
        <circle cx="110" cy="58" r="24" fill={accent} />
        <ellipse cx="110" cy="58" rx="44" ry="10" stroke="white" strokeOpacity="0.75" strokeWidth="3" fill="none" transform="rotate(-12 110 58)" />
        <circle cx="102" cy="55" r="2.5" fill="#1e293b" />
        <circle cx="118" cy="55" r="2.5" fill="#1e293b" />
        <path d="M105 62 Q110 66 115 62" stroke="#1e293b" strokeWidth="2" fill="none" strokeLinecap="round" />
      </svg>
    );
  }

  // sunny / magic cute character
  return (
    <svg viewBox="0 0 220 120" className="w-full h-full" aria-hidden="true">
      <circle cx="110" cy="58" r="25" fill={accent} />
      <circle cx="101" cy="54" r="2.8" fill="#1e293b" />
      <circle cx="119" cy="54" r="2.8" fill="#1e293b" />
      <circle cx="94" cy="60" r="3.5" fill="#fb7185" fillOpacity="0.6" />
      <circle cx="126" cy="60" r="3.5" fill="#fb7185" fillOpacity="0.6" />
      <path d="M103 63 Q110 70 117 63" stroke="#1e293b" strokeWidth="2.2" fill="none" strokeLinecap="round" />
      <path d="M0 98 Q110 82 220 98 L220 120 L0 120 Z" fill="white" fillOpacity="0.2" />
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
        {theme.imageUrl && (
          <>
            <img
              src={theme.imageUrl}
              alt={book.title}
              className="absolute inset-0 w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-slate-950/60 via-transparent to-slate-950/70" />
          </>
        )}
        <div className={`absolute inset-y-0 left-0 w-1.5 ${theme.spineBg} z-10`} />
        <div className="pl-1.5 relative z-10">
          <div className="text-[7px] font-bold uppercase tracking-wider text-white/90 truncate">
            {book.level}
          </div>
          <div className="book-serif text-[9px] font-bold text-white leading-tight line-clamp-2 mt-0.5 drop-shadow">
            {book.title}
          </div>
        </div>
        {!theme.imageUrl && (
          <div className="h-8 w-full relative z-10">
            <CuteCharacterSvg themeId={theme.id} accent={theme.accentColor} />
          </div>
        )}
      </div>
    );
  }

  const heightCls = size === "lg" ? "min-h-[340px] p-6" : "min-h-[250px] p-5";

  return (
    <div
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={(e) => onClick && e.key === "Enter" && onClick()}
      className={`relative rounded-2xl bg-gradient-to-br ${theme.bgGradient} ${heightCls} shadow-md overflow-hidden border border-black/10 flex flex-col justify-between ${
        onClick ? "cursor-pointer hover:shadow-xl hover:-translate-y-0.5 transition" : ""
      } ${className}`}
    >
      {theme.imageUrl && (
        <>
          <img
            src={theme.imageUrl}
            alt={book.title}
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-slate-950/65 via-slate-950/10 to-slate-950/75" />
        </>
      )}

      {/* Left Hardcover Spine Crease */}
      <div className={`absolute inset-y-0 left-0 w-3.5 ${theme.spineBg} border-r border-white/20 z-10`} />
      <div className="absolute top-1.5 right-1.5 bottom-1.5 left-4 rounded-xl border border-white/20 pointer-events-none z-10" />

      <div className="pl-3 relative z-10 flex items-start justify-between gap-2">
        <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border backdrop-blur-xs ${theme.badgeBg}`}>
          {book.level}
        </span>
        <span className="text-[10px] font-bold uppercase tracking-widest text-white/85 drop-shadow">
          BADA Storybook
        </span>
      </div>

      {!theme.imageUrl && (
        <div className="pl-3 my-2 h-24 w-full relative z-10">
          <CuteCharacterSvg themeId={theme.id} accent={theme.accentColor} />
        </div>
      )}

      <div className="pl-3 relative z-10 mt-auto">
        <h4 className="book-serif text-xl md:text-2xl font-bold leading-snug text-white drop-shadow">
          {book.title}
        </h4>
        <p className="text-xs mt-1 font-semibold text-white/90 drop-shadow">{book.subtitle_kr}</p>
      </div>
    </div>
  );
};

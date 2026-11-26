import React from "react";
import { getSeasonVisualMeta } from "../../utils/songHelpers";

interface SeasonalTopCapProps {
  seasonKey: string;
}

/**
 * Decorative top cap resting on top of the seasonal card border:
 * piled snowdrift + icicles + holly berries for Christmas, blossom garland / waves / bunting for other seasons.
 */
export const SeasonalTopCap: React.FC<SeasonalTopCapProps> = ({ seasonKey }) => {
  const key = String(seasonKey || "christmas").toLowerCase();

  if (key === "christmas") {
    return (
      <div
        aria-hidden="true"
        className="pointer-events-none select-none absolute -top-2.5 inset-x-3 z-20 flex items-start justify-between"
      >
        <svg
          viewBox="0 0 800 34"
          preserveAspectRatio="none"
          className="w-full h-7 drop-shadow-[0_2px_4px_rgba(148,163,184,0.38)]"
        >
          {/* Ice-blue snow underside */}
          <path
            d="M0,18 Q35,5 80,14 Q130,3 190,15 Q250,4 320,16 Q390,3 460,15 Q535,4 610,16 Q685,4 745,14 Q778,9 800,18 L800,24 Q776,30 762,21 Q740,28 710,20 Q650,27 590,20 Q515,29 445,20 Q375,28 300,20 Q220,29 145,20 Q72,29 36,21 Q15,27 0,22 Z"
            fill="#dbeafe"
            opacity="0.9"
          />
          {/* Fluffy white piled snowdrift */}
          <path
            d="M0,16 Q35,3 80,12 Q130,1 190,13 Q250,2 320,14 Q390,1 460,13 Q535,2 610,14 Q685,2 745,12 Q778,7 800,16 L800,21 Q772,25 752,18 Q718,26 675,18 Q618,25 560,17 Q498,26 435,18 Q372,26 310,17 Q242,26 178,18 Q112,26 54,18 Q24,25 0,19 Z"
            fill="#ffffff"
          />
          {/* Cute mini icicles on left & right shoulders */}
          <path d="M52,19 L58,31 L64,19 Z" fill="#e0f2fe" stroke="#bae6fd" strokeWidth="0.8" />
          <path d="M74,19 L78,27 L82,19 Z" fill="#ffffff" stroke="#dbeafe" strokeWidth="0.7" />
          <path d="M722,19 L728,32 L734,19 Z" fill="#e0f2fe" stroke="#bae6fd" strokeWidth="0.8" />
        </svg>

        {/* Holly leaves & bright red berries perched on right corner */}
        <svg
          viewBox="0 0 64 40"
          className="w-14 h-9 -mt-2 -ml-14 shrink-0 drop-shadow-sm"
        >
          <path
            d="M28,22 C18,12 10,16 6,24 C13,25 19,29 28,22 Z"
            fill="#15803d"
            stroke="#166534"
            strokeWidth="1.2"
          />
          <path
            d="M32,20 C36,8 48,8 55,14 C48,18 44,24 32,20 Z"
            fill="#16a34a"
            stroke="#166534"
            strokeWidth="1.2"
          />
          <circle cx="29" cy="21" r="4.6" fill="#e11d48" stroke="#fff" strokeWidth="1" />
          <circle cx="36" cy="24" r="4.3" fill="#dc2626" stroke="#fff" strokeWidth="1" />
          <circle cx="26" cy="27" r="4" fill="#be123c" stroke="#fff" strokeWidth="1" />
        </svg>
      </div>
    );
  }

  if (key === "spring") {
    return (
      <div aria-hidden="true" className="pointer-events-none select-none absolute -top-2.5 inset-x-4 z-20">
        <svg viewBox="0 0 800 26" preserveAspectRatio="none" className="w-full h-5">
          <path
            d="M0,14 Q100,2 200,14 Q300,2 400,14 Q500,2 600,14 Q700,2 800,14"
            fill="none"
            stroke="#f9a8d4"
            strokeWidth="3"
          />
          {[80, 200, 320, 440, 560, 680].map((cx) => (
            <circle key={cx} cx={cx} cy={12} r="6" fill="#fbcfe8" stroke="#fff" strokeWidth="1.5" />
          ))}
        </svg>
      </div>
    );
  }

  if (key === "summer") {
    return (
      <div aria-hidden="true" className="pointer-events-none select-none absolute -top-2 inset-x-4 z-20">
        <svg viewBox="0 0 800 24" preserveAspectRatio="none" className="w-full h-5">
          <path
            d="M0,14 Q50,3 100,14 T200,14 T300,14 T400,14 T500,14 T600,14 T700,14 T800,14 L800,20 L0,20 Z"
            fill="#e0f2fe"
            opacity="0.92"
          />
        </svg>
      </div>
    );
  }

  if (key === "halloween") {
    return (
      <div aria-hidden="true" className="pointer-events-none select-none absolute -top-1.5 inset-x-5 z-20">
        <svg viewBox="0 0 800 28" preserveAspectRatio="none" className="w-full h-6">
          {[20, 100, 180, 260, 340, 420, 500, 580, 660, 740].map((x, idx) => (
            <polygon
              key={x}
              points={`${x},2 ${x + 36},2 ${x + 18},22`}
              fill={idx % 2 === 0 ? "#f59e0b" : "#7e22ce"}
              opacity="0.9"
            />
          ))}
        </svg>
      </div>
    );
  }

  return null;
};

interface SeasonalCardAmbientProps {
  seasonKey: string;
  dense?: boolean;
}

const CHRISTMAS_SNOWFLAKES = [
  { left: "6%", delay: "0s", dur: "6.4s", size: 13 },
  { left: "16%", delay: "1.8s", dur: "5.8s", size: 10 },
  { left: "27%", delay: "0.7s", dur: "7.1s", size: 14 },
  { left: "39%", delay: "2.6s", dur: "6.0s", size: 9 },
  { left: "51%", delay: "1.1s", dur: "6.8s", size: 13 },
  { left: "63%", delay: "3.1s", dur: "5.7s", size: 11 },
  { left: "76%", delay: "0.4s", dur: "6.5s", size: 14 },
  { left: "88%", delay: "2.1s", dur: "6.2s", size: 10 },
  { left: "94%", delay: "3.7s", dur: "5.9s", size: 12 }
];

const FAIRY_BULBS = [
  { x: 45, y: 18, color: "#ef4444", delay: "0s" },
  { x: 125, y: 27, color: "#facc15", delay: "0.4s" },
  { x: 205, y: 20, color: "#22c55e", delay: "0.8s" },
  { x: 285, y: 28, color: "#38bdf8", delay: "1.2s" },
  { x: 375, y: 21, color: "#ef4444", delay: "0.2s" },
  { x: 465, y: 28, color: "#facc15", delay: "0.6s" },
  { x: 555, y: 19, color: "#22c55e", delay: "1.0s" },
  { x: 645, y: 27, color: "#38bdf8", delay: "1.4s" },
  { x: 735, y: 18, color: "#ef4444", delay: "0.3s" }
];

/**
 * Ambient seasonal background effects inside the glass card:
 * twinkling Christmas fairy lights + drifting SVG snowflakes.
 */
export const SeasonalCardAmbient: React.FC<SeasonalCardAmbientProps> = ({ seasonKey, dense = false }) => {
  const key = String(seasonKey || "christmas").toLowerCase();

  if (key === "christmas") {
    const flakes = dense ? CHRISTMAS_SNOWFLAKES : CHRISTMAS_SNOWFLAKES.slice(0, 6);
    return (
      <div
        aria-hidden="true"
        className="pointer-events-none select-none absolute inset-0 overflow-hidden rounded-3xl z-0"
      >
        {/* Twinkling Fairy Light Garland across upper interior */}
        <svg viewBox="0 0 800 44" preserveAspectRatio="none" className="w-full h-9 opacity-90">
          <path
            d="M0,10 Q80,32 165,16 Q255,34 340,18 Q425,34 510,16 Q600,34 690,16 Q750,28 800,12"
            fill="none"
            stroke="#166534"
            strokeWidth="2"
            strokeOpacity="0.65"
          />
          {FAIRY_BULBS.map((b) => (
            <g key={b.x}>
              <rect x={b.x - 2.5} y={b.y - 6} width="5" height="4" rx="1" fill="#1e293b" opacity="0.7" />
              <circle
                cx={b.x}
                cy={b.y + 1}
                r="5.2"
                fill={b.color}
                className="animate-seasonal-twinkle"
                style={{ animationDelay: b.delay, transformOrigin: `${b.x}px ${b.y}px` }}
              />
              <circle cx={b.x} cy={b.y + 1} r="10" fill={b.color} opacity="0.16" />
            </g>
          ))}
        </svg>

        {/* Softly Drifting Snowflakes */}
        {flakes.map((f, idx) => (
          <svg
            key={idx}
            viewBox="0 0 24 24"
            className="absolute top-2 animate-seasonal-snow text-white drop-shadow-[0_1px_2px_rgba(56,189,248,0.45)]"
            style={{
              left: f.left,
              width: f.size,
              height: f.size,
              animationDelay: f.delay,
              animationDuration: f.dur
            }}
          >
            <g stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="12" y1="2" x2="12" y2="22" />
              <line x1="3.3" y1="7" x2="20.7" y2="17" />
              <line x1="20.7" y1="7" x2="3.3" y2="17" />
            </g>
            <circle cx="12" cy="12" r="2.2" fill="currentColor" />
          </svg>
        ))}

        {/* Soft frosty glow bottom right */}
        <div className="absolute -bottom-8 -right-8 w-44 h-44 rounded-full bg-rose-200/20 blur-2xl" />
      </div>
    );
  }

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none select-none absolute inset-0 overflow-hidden rounded-3xl z-0"
    >
      <div className="absolute -top-6 -right-6 w-36 h-36 rounded-full bg-white/35 blur-2xl" />
    </div>
  );
};

interface SeasonalPopoAvatarProps {
  seasonKey: string;
  accessory?: "santa" | "rudolph";
  size?: "sm" | "md" | "lg";
}

/**
 * Popo mascot badge wearing custom hand-crafted SVG seasonal headwear above the circle
 * (Santa Hat or Rudolph Reindeer Antlers for Christmas, flower/witch/star accessories for other seasons).
 */
export const SeasonalPopoAvatar: React.FC<SeasonalPopoAvatarProps> = ({
  seasonKey,
  accessory = "santa",
  size = "md"
}) => {
  const key = String(seasonKey || "christmas").toLowerCase();
  const dim =
    size === "sm"
      ? { box: "w-12 h-12", img: "w-12 h-12", hatTop: "-top-5", hatW: "w-14" }
      : size === "lg"
        ? { box: "w-20 h-20", img: "w-20 h-20", hatTop: "-top-8", hatW: "w-24" }
        : { box: "w-16 h-16", img: "w-16 h-16", hatTop: "-top-7", hatW: "w-20" };

  return (
    <div className={`relative ${dim.box} shrink-0 overflow-visible animate-seasonal-bob`}>
      {/* Headwear SVG floating playfully on top of Popo */}
      {key === "christmas" && accessory === "santa" && (
        <svg
          viewBox="0 0 100 64"
          aria-hidden="true"
          className={`pointer-events-none absolute left-1/2 -translate-x-1/2 ${dim.hatTop} ${dim.hatW} z-20 drop-shadow-md`}
        >
          {/* Tilted red Santa cap */}
          <path
            d="M18,46 C22,18 48,4 76,12 C86,15 88,28 84,36 C77,31 66,24 58,28 C44,32 34,42 18,46 Z"
            fill="#dc2626"
            stroke="#991b1b"
            strokeWidth="1.5"
          />
          {/* White Pom-pom */}
          <circle cx="85" cy="36" r="8.5" fill="#ffffff" stroke="#e2e8f0" strokeWidth="1.4" />
          {/* Fluffy scalloped white brim */}
          <path
            d="M14,45 Q23,36 33,43 Q43,35 53,42 Q63,36 72,44 Q76,52 67,55 Q52,58 37,56 Q20,57 14,50 Z"
            fill="#ffffff"
            stroke="#cbd5e1"
            strokeWidth="1.2"
          />
        </svg>
      )}

      {key === "christmas" && accessory === "rudolph" && (
        <svg
          viewBox="0 0 120 68"
          aria-hidden="true"
          className={`pointer-events-none absolute left-1/2 -translate-x-1/2 ${dim.hatTop} ${dim.hatW} z-20 drop-shadow-md`}
        >
          {/* Left Antler */}
          <path
            d="M42,54 C36,42 26,32 16,14 M28,36 C20,34 14,28 10,22 M33,28 C37,20 38,14 34,8"
            fill="none"
            stroke="#92400e"
            strokeWidth="6.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M42,54 C36,42 26,32 16,14 M28,36 C20,34 14,28 10,22 M33,28 C37,20 38,14 34,8"
            fill="none"
            stroke="#b45309"
            strokeWidth="3.2"
            strokeLinecap="round"
          />
          {/* Right Antler */}
          <path
            d="M78,54 C84,42 94,32 104,14 M92,36 C100,34 106,28 110,22 M87,28 C83,20 82,14 86,8"
            fill="none"
            stroke="#92400e"
            strokeWidth="6.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M78,54 C84,42 94,32 104,14 M92,36 C100,34 106,28 110,22 M87,28 C83,20 82,14 86,8"
            fill="none"
            stroke="#b45309"
            strokeWidth="3.2"
            strokeLinecap="round"
          />
          {/* Festive Red Holly Bow at center */}
          <ellipse cx="52" cy="52" rx="7.5" ry="5" fill="#e11d48" transform="rotate(-14 52 52)" />
          <ellipse cx="68" cy="52" rx="7.5" ry="5" fill="#e11d48" transform="rotate(14 68 52)" />
          <circle cx="60" cy="52" r="4.5" fill="#facc15" stroke="#fff" strokeWidth="1" />
        </svg>
      )}

      {key === "spring" && (
        <svg
          viewBox="0 0 100 44"
          aria-hidden="true"
          className={`pointer-events-none absolute left-1/2 -translate-x-1/2 ${dim.hatTop} ${dim.hatW} z-20 drop-shadow-sm`}
        >
          <path d="M18,36 Q50,20 82,36" fill="none" stroke="#16a34a" strokeWidth="3.5" strokeLinecap="round" />
          <circle cx="28" cy="28" r="8" fill="#f472b6" stroke="#fff" strokeWidth="1.5" />
          <circle cx="50" cy="23" r="9" fill="#fb7185" stroke="#fff" strokeWidth="1.5" />
          <circle cx="72" cy="28" r="8" fill="#f472b6" stroke="#fff" strokeWidth="1.5" />
          <circle cx="50" cy="23" r="3" fill="#fde047" />
        </svg>
      )}

      {key === "halloween" && (
        <svg
          viewBox="0 0 100 64"
          aria-hidden="true"
          className={`pointer-events-none absolute left-1/2 -translate-x-1/2 ${dim.hatTop} ${dim.hatW} z-20 drop-shadow-md`}
        >
          <path d="M24,48 L50,8 L74,48 Z" fill="#6b21a8" stroke="#4c1d95" strokeWidth="1.5" />
          <rect x="28" y="38" width="42" height="7" rx="2" fill="#f59e0b" />
          <ellipse cx="49" cy="48" rx="38" ry="8" fill="#7e22ce" stroke="#4c1d95" strokeWidth="1.5" />
        </svg>
      )}

      {/* Circular Popo Image */}
      <img
        src="/assets/popo-3d.jpg"
        alt="시즌 포포"
        className={`${dim.img} rounded-full object-cover border-[3px] ${
          key === "christmas"
            ? "border-white ring-2 ring-rose-300"
            : "border-white ring-2 ring-sky-200"
        } shadow-md relative z-10`}
      />
    </div>
  );
};

interface SeasonalCompleteStampProps {
  seasonKey: string;
  accessory?: "santa" | "rudolph";
  practiceDays?: number;
  quizScore?: number;
}

/**
 * Celebratory holiday Popo completion seal shown after finishing Week 4.
 */
export const SeasonalCompleteStamp: React.FC<SeasonalCompleteStampProps> = ({
  seasonKey,
  accessory = "santa",
  practiceDays = 1,
  quizScore = 100
}) => {
  const key = String(seasonKey || "christmas").toLowerCase();
  const meta = getSeasonVisualMeta(key);

  return (
    <div
      className={`animate-popo-stamp inline-flex items-center gap-3 px-4 py-2.5 rounded-2xl border-[3px] border-double shadow-md bg-white/90 backdrop-blur-md ${
        key === "christmas"
          ? "border-rose-500 ring-2 ring-emerald-400/50"
          : "border-sky-500 ring-2 ring-sky-200"
      }`}
    >
      <SeasonalPopoAvatar seasonKey={key} accessory={accessory} size="sm" />
      <div className="pr-1">
        <div className={`text-xs font-black tracking-tight ${key === "christmas" ? "text-rose-700" : "text-sky-800"}`}>
          {meta.iconEmoji} {key === "christmas" ? "캐롤 완창 스페셜 도장!" : "시즌송 완창 도장!"}
        </div>
        <div className="text-[11px] font-bold text-slate-600">
          연습 {practiceDays}일 · 퀴즈 최고 {quizScore}점
        </div>
      </div>
    </div>
  );
};

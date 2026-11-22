import React from "react";

interface OceanProgressGaugeProps {
  seenCount: number;
  totalCount: number;
  onJumpUnseen?: () => void;
}

export const OceanProgressGauge: React.FC<OceanProgressGaugeProps> = ({
  seenCount,
  totalCount,
  onJumpUnseen
}) => {
  const pct = totalCount > 0 ? Math.min(100, Math.round((seenCount / totalCount) * 100)) : 0;
  const isComplete = totalCount > 0 && seenCount >= totalCount;
  const remaining = Math.max(0, totalCount - seenCount);

  return (
    <>
      {/* Desktop / Tablet: Left Vertical Ocean Tube */}
      <aside
        aria-label={`단어 확인 진도 ${seenCount} / ${totalCount}`}
        className="hidden md:flex flex-col items-center shrink-0 w-28 select-none pt-1"
      >
        <div className="relative mb-2">
          <img
            src="/assets/pearl-badge-3d.jpg"
            alt="진주 목표"
            className={`w-11 h-11 rounded-full object-cover border-2 transition-all duration-500 ${
              isComplete
                ? "border-emerald-400 ring-4 ring-emerald-200/80 scale-110 opacity-100"
                : "border-white/90 opacity-65 grayscale-[25%]"
            }`}
          />
        </div>

        <div className="relative w-12 h-[300px] rounded-full bg-white/65 backdrop-blur-md border-2 border-white/95 shadow-inner overflow-hidden">
          {/* Deepening Ocean Water Level */}
          <div
            className={`absolute inset-x-0 bottom-0 transition-all duration-500 ease-out ${
              isComplete
                ? "bg-gradient-to-t from-emerald-500 via-teal-400 to-cyan-200"
                : "bg-gradient-to-t from-cyan-500 via-sky-400 to-sky-200"
            }`}
            style={{ height: `${pct}%` }}
          >
            <span className="animate-bubble-1 absolute left-2.5 bottom-4 w-2 h-2 rounded-full bg-white/80" />
            <span className="animate-bubble-2 absolute right-2.5 bottom-8 w-1.5 h-1.5 rounded-full bg-white/75" />
          </div>

          {/* Waterline Swimming Popo */}
          <div
            className="absolute left-1/2 -translate-x-1/2 transition-all duration-500 ease-out z-10 pointer-events-none"
            style={{ bottom: `${Math.min(84, Math.max(4, pct - 6))}%` }}
          >
            <img
              src="/assets/popo-3d.jpg"
              alt="포포"
              className="w-9 h-9 rounded-full object-cover border-2 border-white shadow-md"
            />
          </div>
        </div>

        <div className="mt-2.5 text-center space-y-1">
          <div className="text-xs font-black text-slate-800">
            {seenCount} / {totalCount}
          </div>
          <div className={`text-[11px] font-extrabold ${isComplete ? "text-emerald-700" : "text-sky-700"}`}>
            {pct}%
          </div>
          {!isComplete && onJumpUnseen && remaining > 0 && (
            <button
              type="button"
              onClick={onJumpUnseen}
              className="mt-1 px-2.5 py-1 rounded-full bg-white/90 hover:bg-sky-50 border border-[#e5dcc9] text-[11px] font-extrabold text-sky-700 transition cursor-pointer"
            >
              안 본 단어 →
            </button>
          )}
        </div>
      </aside>

      {/* Mobile: Compact Horizontal Ocean Bar */}
      <div className="flex md:hidden w-full items-center gap-3 rounded-2xl bg-white/85 border border-[#e5dcc9] px-3.5 py-2.5">
        <img
          src="/assets/popo-3d.jpg"
          alt="포포"
          className="w-8 h-8 rounded-full object-cover border border-cyan-300 shrink-0"
        />
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center justify-between text-xs font-bold text-slate-800">
            <span>
              단어 확인 {seenCount} / {totalCount} ({pct}%)
            </span>
            {!isComplete && onJumpUnseen && remaining > 0 && (
              <button
                type="button"
                onClick={onJumpUnseen}
                className="text-sky-700 font-extrabold hover:underline"
              >
                안 본 단어 →
              </button>
            )}
          </div>
          <div className="w-full h-2.5 rounded-full bg-[#efe7d6] overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                isComplete ? "bg-emerald-500" : "bg-sky-500"
              }`}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
        <img
          src="/assets/pearl-badge-3d.jpg"
          alt="진주"
          className={`w-7 h-7 rounded-full object-cover border shrink-0 ${
            isComplete ? "border-emerald-400" : "border-white opacity-60 grayscale-[30%]"
          }`}
        />
      </div>
    </>
  );
};

import React from "react";
import type { VocabPhonicsSpan } from "../../types";

interface PhonicsWordDisplayProps {
  word: string;
  mode: "initial" | "phonics" | "masked";
  span?: VocabPhonicsSpan;
  maskedWord?: string;
  filledPattern?: string;
  filledLetters?: string[];
  isDraggingOver?: boolean;
  onDropTile?: (pattern: string) => void;
  onDropLetterAt?: (letter: string, slotIdx: number) => void;
  onRemoveLetterAt?: (slotIdx: number) => void;
  onDragOverChange?: (over: boolean) => void;
  size?: "sm" | "md" | "lg";
}

export const PhonicsWordDisplay: React.FC<PhonicsWordDisplayProps> = ({
  word,
  mode,
  span,
  maskedWord,
  filledPattern,
  filledLetters,
  isDraggingOver = false,
  onDropTile,
  onDropLetterAt,
  onRemoveLetterAt,
  onDragOverChange,
  size = "lg"
}) => {
  const sizeClass =
    size === "sm"
      ? "text-2xl font-black tracking-tight"
      : size === "md"
        ? "text-4xl font-black tracking-tight"
        : "text-5xl md:text-6xl font-black tracking-tight";

  if (mode === "initial") {
    const first = word.slice(0, 1);
    const rest = word.slice(1);
    return (
      <span className={`storybook-font inline-flex items-baseline ${sizeClass}`}>
        <span className="text-sky-700 bg-sky-100/90 border-b-[3px] border-sky-500 rounded-sm px-0.5">
          {first}
        </span>
        <span className="text-slate-900">{rest}</span>
      </span>
    );
  }

  if (mode === "phonics") {
    const chars = Array.from(word);
    const hasMagicE = typeof span?.silent_e_index === "number";
    return (
      <span className="inline-flex flex-col items-center">
        <span className={`storybook-font inline-flex items-baseline ${sizeClass}`}>
          {chars.map((ch, idx) => {
            const isMainSpan = span && idx >= span.start && idx < span.end;
            const isSilentE = hasMagicE && idx === span?.silent_e_index;
            if (isMainSpan || isSilentE) {
              return (
                <span
                  key={idx}
                  className="text-rose-600 bg-rose-50/90 border-b-[3px] border-rose-500 rounded-sm px-0.5 mx-[0.5px]"
                >
                  {ch}
                </span>
              );
            }
            return (
              <span key={idx} className="text-slate-900">
                {ch}
              </span>
            );
          })}
        </span>
        {hasMagicE && size !== "sm" && (
          <span className="mt-1.5 text-[11px] font-bold text-rose-600 bg-rose-50 border border-rose-200 rounded-full px-2.5 py-0.5">
            매직 e 연결 · {span?.pattern}
          </span>
        )}
      </span>
    );
  }

  // Single-letter interactive slots when `filledLetters` or single-letter handlers are used
  const rawMask = maskedWord || word;
  if (filledLetters || onDropLetterAt || onRemoveLetterAt) {
    const chars = Array.from(rawMask);
    let slotCounter = 0;

    return (
      <span className={`storybook-font inline-flex flex-wrap items-center justify-center gap-1 ${sizeClass}`}>
        {chars.map((ch, idx) => {
          if (ch === "_") {
            const slotIdx = slotCounter;
            slotCounter += 1;
            const letter = filledLetters?.[slotIdx] || "";
            return (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  if (letter && onRemoveLetterAt) onRemoveLetterAt(slotIdx);
                }}
                onDragOver={(e) => {
                  if (!onDropLetterAt) return;
                  e.preventDefault();
                  onDragOverChange?.(true);
                }}
                onDragLeave={() => onDragOverChange?.(false)}
                onDrop={(e) => {
                  if (!onDropLetterAt) return;
                  e.preventDefault();
                  onDragOverChange?.(false);
                  const dropped = e.dataTransfer.getData("text/plain");
                  if (dropped) onDropLetterAt(dropped, slotIdx);
                }}
                className={`inline-flex items-center justify-center min-w-[1.35ch] px-2 py-0.5 rounded-xl border-2 border-dashed transition ${
                  isDraggingOver
                    ? "border-sky-500 bg-sky-100/90 text-sky-700 scale-105"
                    : letter
                      ? "border-rose-500 bg-rose-50 text-rose-600 cursor-pointer hover:bg-rose-100"
                      : "border-rose-400 bg-rose-50/70 text-rose-500"
                }`}
                title={letter ? "누르면 지워집니다" : undefined}
              >
                {letter || "?"}
              </button>
            );
          }
          return (
            <span key={idx} className="text-slate-900">
              {ch}
            </span>
          );
        })}
      </span>
    );
  }

  // Fallback grouped mask display (e.g., typing mode)
  const parts = rawMask.split(/(_+)/g);
  const patternParts = (filledPattern || "").includes("_")
    ? (filledPattern || "").split("_")
    : [filledPattern || ""];
  let slotIndex = 0;

  return (
    <span className={`storybook-font inline-flex flex-wrap items-center justify-center gap-1 ${sizeClass}`}>
      {parts.map((part, idx) => {
        if (!part) return null;
        if (/^_+$/.test(part)) {
          const slotText = patternParts[slotIndex] || patternParts[0] || "";
          slotIndex += 1;
          return (
            <span
              key={idx}
              onDragOver={(e) => {
                if (!onDropTile) return;
                e.preventDefault();
                onDragOverChange?.(true);
              }}
              onDragLeave={() => onDragOverChange?.(false)}
              onDrop={(e) => {
                if (!onDropTile) return;
                e.preventDefault();
                onDragOverChange?.(false);
                const dropped = e.dataTransfer.getData("text/plain");
                if (dropped) onDropTile(dropped);
              }}
              className={`inline-flex items-center justify-center min-w-[2.4ch] px-2.5 py-0.5 rounded-xl border-2 border-dashed transition ${
                isDraggingOver
                  ? "border-sky-500 bg-sky-100/90 text-sky-700 scale-105"
                  : slotText
                    ? "border-rose-500 bg-rose-50 text-rose-600"
                    : "border-rose-400 bg-rose-50/70 text-rose-500"
              }`}
            >
              {slotText || "?"}
            </span>
          );
        }
        return (
          <span key={idx} className="text-slate-900">
            {part}
          </span>
        );
      })}
    </span>
  );
};

import React from "react";
import { Volume2 } from "lucide-react";
import { speakEnglish } from "../../utils/speech";

export interface FocusWordDisplay {
  word: string;
  kr: string;
  phonetic?: string;
  nextWord?: string;
}

interface WordMeaningPopupProps {
  focusDisplay: FocusWordDisplay;
  weekNum: 1 | 2 | 3 | 4;
}

/**
 * Hairline active word/chunk quick meaning & pronunciation footer bar inside StorybookReader.
 */
export const WordMeaningPopup: React.FC<WordMeaningPopupProps> = ({
  focusDisplay,
  weekNum
}) => {
  return (
    <div className="pt-2.5 border-t border-[#e5dcc9] flex items-center justify-between gap-3">
      <div className="flex items-center gap-2.5 min-w-0">
        <span className="font-bold text-sm text-slate-900 truncate">{focusDisplay.word}</span>
        {focusDisplay.phonetic && (
          <span className="text-xs text-stone-400 shrink-0">{focusDisplay.phonetic}</span>
        )}
        <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-amber-100/80 text-amber-900 truncate">
          {focusDisplay.kr}
        </span>
      </div>
      <button
        type="button"
        onClick={() =>
          speakEnglish(
            focusDisplay.word,
            weekNum === 1 ? 0.72 : 0.86,
            1.04,
            null,
            focusDisplay.nextWord || ""
          )
        }
        className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#efe8d8] hover:bg-[#e5dcc7] text-slate-700 text-xs font-semibold transition"
      >
        <Volume2 className="w-3.5 h-3.5 text-sky-700" />
        발음
      </button>
    </div>
  );
};

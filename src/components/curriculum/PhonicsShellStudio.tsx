import React, { useState } from "react";
import { ArrowRight, Mic, Volume2 } from "lucide-react";
import { PHONICS_26_STAGES, splitOnsetRime } from "../../data/phonicsCurriculum";
import { playSoftTone, speakEnglish, speakPhonicsBlend } from "../../utils/speech";

interface PhonicsShellStudioProps {
  initialStageNum: number;
  onOpenClassCard: () => void;
}

export const PhonicsShellStudio: React.FC<PhonicsShellStudioProps> = ({
  initialStageNum,
  onOpenClassCard
}) => {
  const [phonicsStageNum, setPhonicsStageNum] = useState<number>(
    Math.min(26, Math.max(1, initialStageNum || 2))
  );
  const [phonicsIdx, setPhonicsIdx] = useState(0);
  const [poppedSet, setPoppedSet] = useState<Set<number>>(new Set());
  const [phonicsSoundPassed, setPhonicsSoundPassed] = useState(false);
  const [checkingSoundMic, setCheckingSoundMic] = useState(false);
  const [soundCheckMsg, setSoundCheckMsg] = useState("");
  const [blendStep, setBlendStep] = useState<"idle" | "onset" | "rime" | "word" | "done">("idle");

  const activeStage =
    PHONICS_26_STAGES.find((s) => s.stage === phonicsStageNum) || PHONICS_26_STAGES[0];
  const stageWords = activeStage.words;
  const activeStageWord = stageWords[phonicsIdx] || stageWords[0];

  const remaining = stageWords
    .map((item, origIdx) => ({ ...item, origIdx, parts: splitOnsetRime(item.word) }))
    .filter((w) => !poppedSet.has(w.origIdx));

  return (
    <div className="py-2 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div>
          <span className="text-xs font-bold text-sky-700">
            파닉스 {activeStage.stage} / 26단계 · {activeStage.soundSymbol}
          </span>
          <h2 className="text-lg font-bold text-slate-900">{activeStage.soundLabel}</h2>
        </div>

        <div className="flex items-center gap-2.5">
          <select
            value={phonicsStageNum}
            onChange={(e) => {
              setPhonicsStageNum(Number(e.target.value));
              setPhonicsIdx(0);
              setPoppedSet(new Set());
              setPhonicsSoundPassed(false);
              setSoundCheckMsg("");
              setBlendStep("idle");
            }}
            className="px-3 py-1.5 rounded-xl bg-[#fbf8f2] border border-[#e5dcc9] text-xs font-bold text-slate-800 focus:outline-none focus:border-sky-500"
          >
            {PHONICS_26_STAGES.map((st) => (
              <option key={st.stage} value={st.stage}>
                {st.stage}단계 · {st.soundLabel}
              </option>
            ))}
          </select>
          <span className="text-xs font-bold px-3 py-1.5 rounded-full surface-water-glass text-sky-900">
            완료 물방울 {poppedSet.size} / {stageWords.length}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
        <div className="lg:col-span-5 space-y-4">
          <div className="text-xs font-bold text-slate-600">
            {phonicsSoundPassed
              ? "왼쪽 자음 물방울을 눌러 진주와 합쳐 보세요! 완료하면 방울이 터지며 아래 방울이 올라와요."
              : "먼저 오른쪽 조개의 음가를 마이크로 발음 확인하면, 진주와 함께 물방울 조합이 열려요!"}
          </div>

          {remaining.length === 0 ? (
            <div className="py-10 text-center space-y-3">
              <div className="text-base font-bold text-emerald-700">
                {activeStage.stage}단계 물방울을 모두 터뜨렸어요!
              </div>
              <button
                type="button"
                onClick={() => {
                  setPoppedSet(new Set());
                  setPhonicsIdx(0);
                  setBlendStep("idle");
                }}
                className="px-4 py-2 rounded-full surface-water-glass text-xs font-bold text-sky-900"
              >
                물방울 다시 채우기
              </button>
            </div>
          ) : (
            <div className="flex flex-wrap justify-center lg:justify-start gap-4 py-2 transition-all duration-500">
              {remaining.map((item) => {
                const isSelected = phonicsSoundPassed && item.origIdx === phonicsIdx;
                return (
                  <button
                    key={`${activeStage.stage}_${item.word}`}
                    type="button"
                    disabled={!phonicsSoundPassed}
                    onClick={() => {
                      setPhonicsIdx(item.origIdx);
                      speakPhonicsBlend(
                        item.parts.onset,
                        item.parts.rime,
                        item.word,
                        (st) => setBlendStep(st)
                      );
                    }}
                    className={`w-24 h-24 sm:w-28 sm:h-28 rounded-full aspect-square flex flex-col items-center justify-center p-2 transition-all duration-500 ${
                      !phonicsSoundPassed
                        ? "surface-water-glass opacity-55 cursor-not-allowed"
                        : isSelected
                          ? "btn-water-glass scale-110 ring-4 ring-sky-200/80"
                          : "surface-water-glass hover:scale-105"
                    }`}
                  >
                    <span className="storybook-font text-2xl font-black text-slate-900 leading-none">
                      {item.parts.onset || item.word}
                    </span>
                    <span className="text-[11px] font-bold text-sky-800 mt-1">{item.word}</span>
                    <span className="text-[10px] font-semibold text-slate-600">{item.meaning}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="lg:col-span-7 flex flex-col items-center justify-center text-center space-y-3">
          <div className="relative w-full max-w-[540px] aspect-square mx-auto flex items-center justify-center">
            <img
              src="/assets/seashell-3d.png"
              alt="조개"
              className="w-full h-full object-contain drop-shadow-xl select-none pointer-events-none"
            />

            <div className="absolute top-[11%] left-[10%] right-[10%] flex flex-col items-center text-center px-2 pointer-events-none">
              <div className="text-xl sm:text-3xl font-black text-sky-950 tracking-tight drop-shadow-[0_2px_4px_rgba(255,255,255,0.95)]">
                {activeStage.soundLabel}
              </div>
              <p className="text-sm sm:text-lg font-extrabold text-slate-900 leading-snug mt-1.5 drop-shadow-[0_2px_4px_rgba(255,255,255,0.95)]">
                {activeStage.pronunciationGuide}
              </p>
            </div>

            <div className="absolute bottom-[25%] left-1/2 -translate-x-1/2 flex items-center justify-center">
              {!phonicsSoundPassed ? (
                <div className="text-xs sm:text-sm font-extrabold text-sky-900 drop-shadow-[0_1px_2px_rgba(255,255,255,0.95)]">
                  음가 발음 확인 후 진주가 열려요!
                </div>
              ) : (
                (() => {
                  const activeParts = splitOnsetRime(activeStageWord.word);
                  return (
                    <div
                      onClick={() =>
                        speakPhonicsBlend(
                          activeParts.onset,
                          activeParts.rime,
                          activeStageWord.word,
                          (st) => setBlendStep(st)
                        )
                      }
                      role="button"
                      tabIndex={0}
                      className={`relative w-40 h-40 sm:w-48 sm:h-48 rounded-full overflow-hidden flex flex-col items-center justify-center p-3 cursor-pointer transition-transform duration-300 hover:scale-105 border-2 border-white/95 shadow-[0_14px_34px_rgba(14,165,233,0.32),inset_0_-14px_22px_rgba(56,189,248,0.35),inset_0_12px_20px_rgba(255,255,255,0.98)] ${
                        blendStep === "word" ? "scale-105 ring-4 ring-cyan-300/80" : ""
                      }`}
                      style={{
                        background:
                          "radial-gradient(circle at 30% 26%, #ffffff 0%, #f8fcff 36%, #e0f2fe 68%, #bae6fd 90%, #7dd3fc 100%)"
                      }}
                    >
                      <div className="relative z-10 flex flex-col items-center">
                        <div className="flex items-center gap-1 text-xs sm:text-sm font-extrabold">
                          <span
                            className={`px-1.5 py-0.5 rounded-full transition ${
                              blendStep === "onset"
                                ? "bg-sky-600 text-white scale-110"
                                : "bg-white/85 text-sky-800"
                            }`}
                          >
                            {activeParts.onset}
                          </span>
                          <span className="text-slate-600">+</span>
                          <span
                            className={`px-1.5 py-0.5 rounded-full transition ${
                              blendStep === "rime"
                                ? "bg-cyan-600 text-white scale-110"
                                : "bg-white/85 text-cyan-800"
                            }`}
                          >
                            {activeParts.rime}
                          </span>
                        </div>
                        <span className="storybook-font text-3xl sm:text-4xl font-black text-slate-900 mt-1">
                          {activeStageWord.word}
                        </span>
                        <span className="text-xs sm:text-sm font-extrabold text-sky-900 mt-0.5">
                          {activeStageWord.meaning}
                        </span>
                      </div>
                    </div>
                  );
                })()
              )}
            </div>
          </div>

          {!phonicsSoundPassed ? (
            <div className="space-y-2">
              <div className="flex flex-wrap justify-center gap-3">
                <button
                  type="button"
                  onClick={() => speakEnglish(stageWords[0].word, 0.72, 1.08)}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-white border border-[#e5dcc9] text-slate-800 text-sm font-bold hover:bg-[#f4efe5] transition"
                >
                  <Volume2 className="w-4 h-4 text-sky-600" />
                  음가 소리 듣기
                </button>
                <button
                  type="button"
                  disabled={checkingSoundMic}
                  onClick={() => {
                    const firstParts = splitOnsetRime(stageWords[0].word);
                    const finishCheck = (msg: string) => {
                      setCheckingSoundMic(false);
                      setPhonicsSoundPassed(true);
                      setSoundCheckMsg(msg);
                      playSoftTone(880, 0.2);
                      speakPhonicsBlend(
                        firstParts.onset,
                        firstParts.rime,
                        stageWords[0].word,
                        (st) => setBlendStep(st)
                      );
                    };
                    const SpeechRec =
                      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
                    if (SpeechRec) {
                      try {
                        setCheckingSoundMic(true);
                        setSoundCheckMsg("마이크에 대고 큰 소리로 음가를 발음해 보세요...");
                        const rec = new SpeechRec();
                        rec.lang = "en-US";
                        rec.interimResults = false;
                        rec.onresult = () =>
                          finishCheck(
                            "잘했어요! 진주가 열렸어요. 이제 물방울과 진주를 합쳐 보아요!"
                          );
                        rec.onerror = () =>
                          finishCheck(
                            "음가 연습 확인! 진주 속 단어로 파닉스를 조합해 보아요!"
                          );
                        rec.onend = () => setCheckingSoundMic(false);
                        rec.start();
                        return;
                      } catch {
                        setCheckingSoundMic(false);
                      }
                    }
                    finishCheck("음가 확인 완료! 진주 속 단어로 파닉스를 조합해 보아요!");
                  }}
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full btn-water-glass text-sm font-bold"
                >
                  <Mic className="w-4 h-4" />
                  {checkingSoundMic ? "음가 듣는 중..." : "마이크로 음가 발음 확인하기"}
                </button>
              </div>
              {soundCheckMsg && (
                <p className="text-xs font-bold text-sky-700">{soundCheckMsg}</p>
              )}
            </div>
          ) : (
            <div className="space-y-3.5 w-full max-w-lg">
              <div className="flex flex-wrap items-center justify-center gap-2.5 py-1">
                <span className="storybook-font text-lg sm:text-xl font-bold text-slate-900">
                  &ldquo;{activeStageWord.example}&rdquo;
                </span>
                <button
                  type="button"
                  onClick={() => speakEnglish(activeStageWord.example, 0.86, 1.06)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full surface-water-glass text-xs font-bold text-sky-900 hover:brightness-105 transition"
                >
                  <Volume2 className="w-3.5 h-3.5" />
                  예문 듣기
                </button>
              </div>

              {soundCheckMsg && (
                <p className="text-xs font-bold text-emerald-700">{soundCheckMsg}</p>
              )}

              <div className="flex flex-wrap justify-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    const parts = splitOnsetRime(activeStageWord.word);
                    speakPhonicsBlend(
                      parts.onset,
                      parts.rime,
                      activeStageWord.word,
                      (st) => setBlendStep(st)
                    );
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-white border border-[#e5dcc9] text-slate-800 text-sm font-bold hover:bg-[#f4efe5] transition"
                >
                  <Volume2 className="w-4 h-4 text-sky-600" />
                  음가 합쳐서 듣기
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const next = new Set(poppedSet);
                    next.add(phonicsIdx);
                    setPoppedSet(next);
                    playSoftTone(820, 0.16);
                    speakEnglish(activeStageWord.word, 0.85, 1.06);
                    const nextUnpopped = stageWords.findIndex((_, i) => !next.has(i));
                    if (nextUnpopped !== -1) {
                      window.setTimeout(() => setPhonicsIdx(nextUnpopped), 450);
                    }
                  }}
                  className="px-5 py-2.5 rounded-full btn-water-glass text-sm font-bold"
                >
                  따라 말하고 물방울 터뜨리기!
                </button>
                {poppedSet.size >= stageWords.length && (
                  <button
                    type="button"
                    onClick={onOpenClassCard}
                    className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold"
                  >
                    클카 단어장에서 이어서 복습하기
                    <ArrowRight className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

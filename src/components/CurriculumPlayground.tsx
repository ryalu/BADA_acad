import React, { useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, CheckCircle2, HelpCircle, Layers, Volume2 } from "lucide-react";
import type { Book, PhonicsCurriculumTier, StudentUser } from "../types";
import { getClassCardDeckForLevel, getPhonicsModuleForLevel } from "../data/phonicsCurriculum";
import { playSoftTone, speakEnglish } from "../utils/speech";

interface CurriculumPlaygroundProps {
  user: StudentUser;
  book?: Book;
  phonicsCurriculum?: PhonicsCurriculumTier[];
  initialSubview?: "hub" | "phonics" | "classcard" | "upper";
  onBackHome: () => void;
}

const G4_PATTERNS = [
  { p: "1형식 (S + V)", ex: "Baby whale Popo swims across the coral reef.", kr: "주어 + 동사 + 장소 전치사구" },
  { p: "3형식 (S + V + O)", ex: "Together, they find a golden treasure chest.", kr: "주어 + 동사 + 목적어(명사구)" },
  { p: "5형식 (S + V + O + OC)", ex: "Look at the starfish shining on the sandy floor.", kr: "지각/동사 + 목적어 + 현재분사 보어" }
];

export const CurriculumPlayground: React.FC<CurriculumPlaygroundProps> = ({
  user,
  book,
  phonicsCurriculum,
  initialSubview = "hub",
  onBackHome
}) => {
  const phonicsModule = useMemo(
    () => getPhonicsModuleForLevel(user.level, phonicsCurriculum),
    [user.level, phonicsCurriculum]
  );
  const classCardDeck = useMemo(() => {
    const mode = user.classcard_mode || "both";
    const baseDeck = getClassCardDeckForLevel(user.level, phonicsCurriculum);
    const filteredBase =
      mode === "book_only"
        ? baseDeck.filter((c) => !c.fromPhonics)
        : baseDeck;

    if (mode === "phonics_only" || !book?.vocab?.length) {
      return filteredBase;
    }

    const seen = new Set(filteredBase.map((c) => c.word.toLowerCase()));
    const bookCards = (book.vocab || [])
      .filter((v) => v.word && v.meaning_kr && !seen.has(v.word.toLowerCase()))
      .slice(0, 8)
      .map((v) => ({
        word: v.surface || v.word,
        meaning: v.meaning_kr,
        example: v.popo_tip || `《${book.title}》 핵심 단어`,
        fromPhonics: false,
        category: "원서 단어"
      }));

    return mode === "book_only" ? [...bookCards, ...filteredBase] : [...filteredBase, ...bookCards];
  }, [user.level, user.classcard_mode, book, phonicsCurriculum]);

  const [subview, setSubview] = useState<"hub" | "phonics" | "classcard" | "upper">(initialSubview);
  const [phonicsIdx, setPhonicsIdx] = useState(0);
  const [poppedSet, setPoppedSet] = useState<Set<number>>(new Set());

  const [ccStage, setCcStage] = useState<"study" | "quiz">("study");
  const [ccIdx, setCcIdx] = useState(0);
  const [ccFlipped, setCcFlipped] = useState(false);

  const [quizIdx, setQuizIdx] = useState(0);
  const [quizMsg, setQuizMsg] = useState("");
  const [quizDone, setQuizDone] = useState(false);

  const [g6Feedback, setG6Feedback] = useState("");

  const phonicsItems = phonicsModule.items;
  const activePhonics = phonicsItems[phonicsIdx] || phonicsItems[0];
  const activeCc = classCardDeck[ccIdx] || classCardDeck[0];
  const activeQuiz = classCardDeck[quizIdx] || classCardDeck[0];

  const quizOptions = useMemo(() => {
    const distractors = classCardDeck
      .filter((_, idx) => idx !== quizIdx)
      .slice(0, 3)
      .map((c) => c.meaning);
    return [activeQuiz.meaning, ...distractors].sort();
  }, [classCardDeck, quizIdx, activeQuiz.meaning]);

  const handleAnswerQuiz = (choice: string) => {
    if (choice === activeQuiz.meaning) {
      playSoftTone(820, 0.16);
      speakEnglish(activeQuiz.word, 0.9, 1.06);
      setQuizMsg(`정답입니다! '${activeQuiz.word}'의 뜻은 '${activeQuiz.meaning}'입니다.`);
      setTimeout(() => {
        if (quizIdx < classCardDeck.length - 1) {
          setQuizIdx(quizIdx + 1);
          setQuizMsg("");
        } else {
          setQuizDone(true);
          setQuizMsg(`${classCardDeck.length}문제 복습 퀴즈를 모두 완료했습니다!`);
        }
      }, 750);
    } else {
      playSoftTone(340, 0.14);
      setQuizMsg("아쉽습니다. 다시 한 번 생각해 보세요.");
    }
  };

  return (
    <div className="space-y-5">
      <div className="pb-3 border-b border-[#e8dfd1] flex items-center justify-between">
        <button
          type="button"
          onClick={subview === "hub" ? onBackHome : () => setSubview("hub")}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          {subview === "hub" ? "내 학습 맵으로" : "훈련소 메뉴로"}
        </button>
        <span className="text-xs font-bold text-slate-600">
          {user.name} · {user.grade_label} ({user.level}) 맞춤 훈련소
        </span>
      </div>

      {subview === "hub" && (
        <div className="py-2 space-y-5">
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              {user.level} · {user.grade_label} 맞춤 집중 훈련소
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              오늘 진행할 학습 카드를 선택하면 전용 화면으로 이동합니다.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            <div className="border border-slate-200 rounded-2xl p-6 flex flex-col justify-between gap-4 bg-slate-50/50">
              <div className="space-y-2">
                <span className="inline-block text-xs font-bold px-2.5 py-0.5 rounded-full bg-white border border-slate-200 text-sky-700">
                  {phonicsModule.tierLabel} 파닉스
                </span>
                <h3 className="text-lg font-bold text-slate-900">{phonicsModule.unitTitle}</h3>
                <p className="text-xs text-slate-500 leading-relaxed">{phonicsModule.unitDesc}</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setPhonicsIdx(0);
                  setSubview("phonics");
                }}
                className="w-full py-2.5 px-4 rounded-xl btn-water-glass text-sm font-bold inline-flex items-center justify-center gap-1.5"
              >
                파닉스 시작하기
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            <div className="border border-slate-200 rounded-2xl p-6 flex flex-col justify-between gap-4 bg-slate-50/50">
              <div className="space-y-2">
                <span className="inline-block text-xs font-bold px-2.5 py-0.5 rounded-full bg-white border border-slate-200 text-slate-600">
                  Level {user.classcard_level || 2} / 26 · 파닉스 단어 포함
                </span>
                <h3 className="text-lg font-bold text-slate-900">초등필수 클카 단어 &amp; 퀴즈</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  방금 익힌 {phonicsModule.tierLabel} 파닉스 단어와 필수 어휘 {classCardDeck.length}개를 카드로 배우고 퀴즈로 복습합니다.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSubview("classcard");
                  setCcStage("study");
                  setCcIdx(0);
                  setCcFlipped(false);
                }}
                className="w-full py-2.5 px-4 rounded-xl btn-water-glass text-sm font-bold inline-flex items-center justify-center gap-1.5"
              >
                클카 단어장 열기
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            {user.grade_group !== "grade_1_2" && (
              <div className="border border-slate-200 rounded-2xl p-6 flex flex-col justify-between gap-4 bg-slate-50/50">
                <div className="space-y-2">
                  <span className="inline-block text-xs font-bold px-2.5 py-0.5 rounded-full bg-white border border-slate-200 text-slate-600">
                    {user.grade_group === "grade_6" ? "중등 내신 대비" : "40분 심화"}
                  </span>
                  <h3 className="text-lg font-bold text-slate-900">
                    {user.grade_group === "grade_6" ? "수동태 & 간접의문문 훈련" : "1~5형식 문장 패턴 훈련"}
                  </h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    핵심 문장 구조를 익히고 직접 말해 봅니다.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSubview("upper")}
                  className="w-full py-2.5 px-4 rounded-xl btn-water-glass text-sm font-bold inline-flex items-center justify-center gap-1.5"
                >
                  문장 훈련 열기
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {subview === "phonics" && (
        <div className="py-2 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <span className="text-xs font-bold text-sky-700">{phonicsModule.tierLabel} · 레벨 맞춤 파닉스</span>
              <h2 className="text-lg font-bold text-slate-900">{phonicsModule.unitTitle}</h2>
            </div>
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-slate-100 text-slate-700">
              완료 {poppedSet.size} / {phonicsItems.length}
            </span>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 text-center space-y-3">
            <span className="inline-block text-xs font-bold px-3 py-1 rounded-full bg-white border border-slate-200 text-sky-700">
              핵심 음가: {activePhonics.sound} ({activePhonics.phonetic})
            </span>
            <div className="storybook-font text-4xl font-black text-slate-900">{activePhonics.word}</div>
            <div className="text-xl font-bold text-sky-700">{activePhonics.meaning}</div>
            <div className="storybook-font text-sm text-slate-600">"{activePhonics.example}"</div>
            <p className="text-xs text-slate-500">{activePhonics.tip}</p>
            <div className="pt-2 flex flex-wrap justify-center gap-3">
              <button
                type="button"
                onClick={() => speakEnglish(activePhonics.word, 0.8, 1.06)}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-800 text-sm font-bold"
              >
                <Volume2 className="w-4 h-4 text-sky-600" />
                단어 듣기
              </button>
              <button
                type="button"
                onClick={() => {
                  const next = new Set(poppedSet);
                  next.add(phonicsIdx);
                  setPoppedSet(next);
                  speakEnglish(activePhonics.word, 0.8, 1.06);
                  playSoftTone(760, 0.16);
                }}
                className="px-5 py-2.5 rounded-xl btn-water-glass text-sm font-bold"
              >
                따라 말하고 완료 체크
              </button>
              {poppedSet.size >= phonicsItems.length && (
                <button
                  type="button"
                  onClick={() => {
                    setSubview("classcard");
                    setCcStage("study");
                    setCcIdx(0);
                    setCcFlipped(false);
                  }}
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold"
                >
                  클카 단어장에서 이어서 복습하기
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {phonicsItems.map((item, idx) => {
              const isDone = poppedSet.has(idx);
              return (
                <button
                  key={item.word}
                  type="button"
                  onClick={() => {
                    setPhonicsIdx(idx);
                    speakEnglish(item.word, 0.8, 1.06);
                  }}
                  className={`p-4 rounded-xl border text-left transition ${
                    idx === phonicsIdx
                      ? "surface-water-glass"
                      : isDone
                      ? "bg-emerald-50 border-emerald-300"
                      : "bg-white border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <div className="text-xs font-bold text-slate-400">{item.sound}</div>
                  <div className="storybook-font text-lg font-bold text-slate-900">{item.word}</div>
                  <div className="text-xs text-slate-600 mt-0.5">{item.meaning}</div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {subview === "classcard" && (
        <div className="py-2 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCcStage("study")}
                className={`px-4 py-2 rounded-xl text-xs font-bold border ${
                  ccStage === "study"
                    ? "btn-water-glass"
                    : "bg-white text-slate-600 border-slate-200"
                }`}
              >
                1단계 · 단어 카드 학습
              </button>
              <button
                type="button"
                onClick={() => {
                  setCcStage("quiz");
                  setQuizIdx(0);
                  setQuizDone(false);
                  setQuizMsg("");
                }}
                className={`px-4 py-2 rounded-xl text-xs font-bold border ${
                  ccStage === "quiz"
                    ? "btn-water-glass"
                    : "bg-white text-slate-600 border-slate-200"
                }`}
              >
                2단계 · 복습 퀴즈
              </button>
            </div>
            <span className="text-xs font-bold text-slate-500">
              Level {user.classcard_level || 2} / 26 · 총 {classCardDeck.length}단어 (파닉스 포함)
            </span>
          </div>

          {ccStage === "study" ? (
            <div className="space-y-5 max-w-xl mx-auto text-center">
              <div
                role="button"
                tabIndex={0}
                onClick={() => {
                  const next = !ccFlipped;
                  setCcFlipped(next);
                  if (!next) speakEnglish(activeCc.word, 0.85, 1.06);
                }}
                className={`rounded-2xl border-2 p-8 cursor-pointer transition ${
                  ccFlipped ? "bg-slate-50 border-sky-600" : "bg-white border-slate-200 hover:border-sky-400"
                }`}
              >
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-bold text-slate-400">
                    카드 {ccIdx + 1} / {classCardDeck.length} · {ccFlipped ? "뒷면" : "앞면"}
                  </span>
                  {activeCc.category ? (
                    <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-200">
                      {activeCc.category}
                    </span>
                  ) : activeCc.fromPhonics ? (
                    <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-200">
                      파닉스 연계 단어
                    </span>
                  ) : null}
                </div>
                <div className="storybook-font text-4xl font-black text-slate-900 mb-4">
                  {activeCc.word}
                </div>
                {!ccFlipped ? (
                  <p className="text-sm text-slate-500">카드를 터치하면 뜻과 예문이 표시됩니다.</p>
                ) : (
                  <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-1">
                    <div className="text-xl font-bold text-sky-700">{activeCc.meaning}</div>
                    <div className="storybook-font text-sm text-slate-600">{activeCc.example}</div>
                  </div>
                )}
              </div>

              <div className="flex justify-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    const prev = (ccIdx - 1 + classCardDeck.length) % classCardDeck.length;
                    setCcIdx(prev);
                    setCcFlipped(false);
                    speakEnglish(classCardDeck[prev].word, 0.85, 1.06);
                  }}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-sm font-bold"
                >
                  이전
                </button>
                <button
                  type="button"
                  onClick={() => speakEnglish(activeCc.word, 0.85, 1.06)}
                  className="px-4 py-2 rounded-xl bg-slate-100 border border-slate-300 text-slate-800 text-sm font-bold"
                >
                  발음 듣기
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (ccIdx < classCardDeck.length - 1) {
                      const next = ccIdx + 1;
                      setCcIdx(next);
                      setCcFlipped(false);
                      speakEnglish(classCardDeck[next].word, 0.85, 1.06);
                    } else {
                      setCcStage("quiz");
                      setQuizIdx(0);
                      setQuizDone(false);
                    }
                  }}
                  className="px-5 py-2 rounded-xl btn-water-glass text-sm font-bold"
                >
                  {ccIdx < classCardDeck.length - 1 ? "다음 카드" : "퀴즈로 이동"}
                </button>
              </div>
            </div>
          ) : (
            <div className="max-w-xl mx-auto space-y-5 text-center">
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 space-y-2">
                <span className="text-xs font-bold text-sky-700">
                  복습 퀴즈 {quizIdx + 1} / {classCardDeck.length}
                </span>
                <div className="storybook-font text-4xl font-black text-slate-900">
                  {activeQuiz.word}
                </div>
                <button
                  type="button"
                  onClick={() => speakEnglish(activeQuiz.word, 0.86, 1.06)}
                  className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-white border border-slate-300 text-xs font-bold text-slate-700"
                >
                  <Volume2 className="w-3.5 h-3.5 text-sky-600" />
                  단어 듣기
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {quizOptions.map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => handleAnswerQuiz(opt)}
                    className="p-4 rounded-xl bg-white hover:bg-sky-50 border border-slate-200 hover:border-sky-500 text-sm font-bold text-slate-800 transition"
                  >
                    {opt}
                  </button>
                ))}
              </div>

              {quizMsg && (
                <div className="p-3 rounded-xl bg-slate-100 text-sm font-bold text-slate-800">
                  {quizMsg}
                </div>
              )}

              {quizDone && (
                <button
                  type="button"
                  onClick={() => setSubview("hub")}
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-bold"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  훈련소 홈으로 돌아가기
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {subview === "upper" && (
        <div className="py-2 space-y-5">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-sky-600" />
            <h2 className="text-lg font-bold text-slate-900">
              {user.grade_group === "grade_6" ? "초등 6학년 수동태 · 간접의문문 훈련" : "1~5형식 핵심 문장 패턴 훈련"}
            </h2>
          </div>

          {user.grade_group !== "grade_6" ? (
            <div className="space-y-3">
              {G4_PATTERNS.map((item) => (
                <div
                  key={item.p}
                  className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-4"
                >
                  <div>
                    <span className="text-xs font-bold text-sky-700">{item.p}</span>
                    <div className="storybook-font text-base font-bold text-slate-900 mt-0.5">{item.ex}</div>
                    <div className="text-xs text-slate-500 mt-0.5">{item.kr}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => speakEnglish(item.ex, 0.88, 1.06)}
                    className="shrink-0 inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-white border border-slate-300 text-xs font-bold text-slate-700"
                  >
                    <Volume2 className="w-3.5 h-3.5 text-sky-600" />
                    듣기
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex items-center gap-1.5 text-xs font-bold text-sky-700">
                  <HelpCircle className="w-4 h-4" />
                  수동태 문장 완성 퀴즈
                </div>
                <p className="storybook-font text-base font-bold text-slate-900">
                  The secret island ( _____ ) by a warm ocean current.
                </p>
                <div className="flex flex-wrap gap-2">
                  {["is protected", "protects", "protected"].map((ans) => (
                    <button
                      key={ans}
                      type="button"
                      onClick={() =>
                        setG6Feedback(
                          ans === "is protected"
                            ? "정답입니다! 'is protected by ~' 수동태 표현입니다."
                            : "다시 생각해 보세요. 섬이 해류에 의해 보호를 받는 수동태입니다."
                        )
                      }
                      className="px-4 py-2 rounded-lg bg-white border border-slate-300 hover:border-sky-500 text-sm font-bold text-slate-800"
                    >
                      {ans}
                    </button>
                  ))}
                </div>
                {g6Feedback && <p className="text-xs font-bold text-sky-700">{g6Feedback}</p>}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

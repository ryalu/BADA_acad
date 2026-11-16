import React, { useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, CheckCircle2, Layers, Mic, Volume2 } from "lucide-react";
import type { Book, PhonicsCurriculumTier, StudentUser } from "../types";
import {
  getClassCardDeckForLevel,
  getPhonicsModuleForLevel,
  PHONICS_26_STAGES,
  splitOnsetRime
} from "../data/phonicsCurriculum";
import { playSoftTone, speakEnglish, speakPhonicsBlend } from "../utils/speech";

interface CurriculumPlaygroundProps {
  user: StudentUser;
  book?: Book;
  phonicsCurriculum?: PhonicsCurriculumTier[];
  initialSubview?: "hub" | "phonics" | "classcard" | "upper";
  onBackHome: () => void;
}

const AGE7_ALPHABET = [
  { letter: "Aa", sound: "애", word: "apple" },
  { letter: "Bb", sound: "브", word: "ball" },
  { letter: "Cc", sound: "크", word: "cat" },
  { letter: "Dd", sound: "드", word: "dog" },
  { letter: "Ee", sound: "에", word: "egg" },
  { letter: "Ff", sound: "프", word: "fish" },
  { letter: "Gg", sound: "그", word: "grape" },
  { letter: "Hh", sound: "흐", word: "hat" },
  { letter: "Ii", sound: "이", word: "igloo" },
  { letter: "Jj", sound: "쥐", word: "jump" },
  { letter: "Kk", sound: "크", word: "kite" },
  { letter: "Ll", sound: "을", word: "leaf" },
  { letter: "Mm", sound: "므", word: "moon" },
  { letter: "Nn", sound: "느", word: "nest" },
  { letter: "Oo", sound: "오", word: "octopus" },
  { letter: "Pp", sound: "프", word: "pen" },
  { letter: "Qq", sound: "쿠", word: "queen" },
  { letter: "Rr", sound: "르", word: "rain" },
  { letter: "Ss", sound: "스", word: "sun" },
  { letter: "Tt", sound: "트", word: "tree" },
  { letter: "Uu", sound: "어", word: "umbrella" },
  { letter: "Vv", sound: "브", word: "van" },
  { letter: "Ww", sound: "우", word: "whale" },
  { letter: "Xx", sound: "크스", word: "box" },
  { letter: "Yy", sound: "여", word: "yellow" },
  { letter: "Zz", sound: "즈", word: "zebra" }
];

const AGE7_SHADOWING = [
  { en: "I see a fish.", kr: "나는 물고기를 보아요." },
  { en: "The sea is blue.", kr: "바다는 파래요." },
  { en: "Popo swims fast.", kr: "포포는 빠르게 헤엄쳐요." },
  { en: "Look at the star!", kr: "저 별을 보세요!" }
];

const AGE8_BLENDS = [
  { onset: "c", rime: "at", word: "cat", kr: "고양이", ex: "A cat sits on the mat." },
  { onset: "sh", rime: "ip", word: "ship", kr: "큰 배", ex: "A big ship sails far." },
  { onset: "f", rime: "ish", word: "fish", kr: "물고기", ex: "A blue fish swims by." },
  { onset: "c", rime: "ake", word: "cake", kr: "케이크", ex: "We share a sweet cake." },
  { onset: "st", rime: "ar", word: "star", kr: "별", ex: "Look at the bright star." },
  { onset: "w", rime: "ave", word: "wave", kr: "파도", ex: "Ride the gentle wave." }
];

const AGE8_WORD_QUIZ = [
  { promptKr: "고양이", answer: "cat", options: ["cat", "cup", "car"] },
  { promptKr: "물고기", answer: "fish", options: ["frog", "fish", "flag"] },
  { promptKr: "큰 배", answer: "ship", options: ["shop", "shoe", "ship"] },
  { promptKr: "케이크", answer: "cake", options: ["cake", "kite", "bike"] }
];

const AGE9_POS_SENTENCES = [
  {
    en: "Popo is happy.",
    kr: "포포는 행복해요.",
    verbType: "be동사 (is)",
    tokens: [
      { word: "Popo", role: "주어 · 명사", color: "bg-sky-50 text-sky-800 border-sky-200" },
      { word: "is", role: "be동사", color: "bg-amber-50 text-amber-800 border-amber-200" },
      { word: "happy", role: "형용사", color: "bg-emerald-50 text-emerald-800 border-emerald-200" }
    ]
  },
  {
    en: "Small fish swim.",
    kr: "작은 물고기들이 헤엄쳐요.",
    verbType: "일반동사 (swim)",
    tokens: [
      { word: "Small", role: "형용사", color: "bg-emerald-50 text-emerald-800 border-emerald-200" },
      { word: "fish", role: "주어 · 명사", color: "bg-sky-50 text-sky-800 border-sky-200" },
      { word: "swim", role: "일반동사", color: "bg-rose-50 text-rose-800 border-rose-200" }
    ]
  },
  {
    en: "Popo finds a blue pearl.",
    kr: "포포는 파란 진주를 찾아요.",
    verbType: "일반동사 (finds)",
    tokens: [
      { word: "Popo", role: "주어 · 명사", color: "bg-sky-50 text-sky-800 border-sky-200" },
      { word: "finds", role: "일반동사", color: "bg-rose-50 text-rose-800 border-rose-200" },
      { word: "blue", role: "형용사", color: "bg-emerald-50 text-emerald-800 border-emerald-200" },
      { word: "pearl", role: "목적어 · 명사", color: "bg-sky-50 text-sky-800 border-sky-200" }
    ]
  }
];

const AGE9_PATTERNS_123 = [
  { form: "1형식 (주어 + 동사)", en: "Popo swims.", kr: "포포가 헤엄쳐요." },
  { form: "1형식 (주어 + 동사)", en: "The sun shines.", kr: "태양이 빛나요." },
  { form: "2형식 (주어 + be동사 + 형용사)", en: "The water is clear.", kr: "물이 맑아요." },
  { form: "2형식 (주어 + 동사 + 형용사)", en: "Popo feels happy.", kr: "포포는 기분이 좋아요." },
  { form: "3형식 (주어 + 동사 + 목적어)", en: "Popo finds a pearl.", kr: "포포가 진주를 찾아요." },
  { form: "3형식 (주어 + 동사 + 목적어)", en: "We read English books.", kr: "우리는 영어 원서를 읽어요." }
];

const AGE9_POS_QUIZ = [
  {
    sentence: "The blue whale is big.",
    question: "이 문장에서 'be동사'는 무엇일까요?",
    answer: "is",
    options: ["blue", "whale", "is", "big"]
  },
  {
    sentence: "Popo swims in the ocean.",
    question: "이 문장에서 '주어(누가)'는 무엇일까요?",
    answer: "Popo",
    options: ["Popo", "swims", "in", "ocean"]
  },
  {
    sentence: "A happy turtle finds a shell.",
    question: "이 문장에서 '형용사(꾸며주는 말)'는 무엇일까요?",
    answer: "happy",
    options: ["turtle", "finds", "happy", "shell"]
  }
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
  const [phonicsStageNum, setPhonicsStageNum] = useState<number>(
    Math.min(26, Math.max(1, user.classcard_level || 2))
  );
  const [phonicsIdx, setPhonicsIdx] = useState(0);
  const [poppedSet, setPoppedSet] = useState<Set<number>>(new Set());
  const [phonicsSoundPassed, setPhonicsSoundPassed] = useState(false);
  const [checkingSoundMic, setCheckingSoundMic] = useState(false);
  const [soundCheckMsg, setSoundCheckMsg] = useState("");
  const [blendStep, setBlendStep] = useState<"idle" | "onset" | "rime" | "word" | "done">("idle");

  const [ccStage, setCcStage] = useState<"study" | "quiz">("study");
  const [ccIdx, setCcIdx] = useState(0);
  const [ccFlipped, setCcFlipped] = useState(false);

  const [quizIdx, setQuizIdx] = useState(0);
  const [quizMsg, setQuizMsg] = useState("");
  const [quizDone, setQuizDone] = useState(false);

  const [ageTrack, setAgeTrack] = useState<"age7" | "age8" | "age9">(
    (user.age || 8) <= 7 ? "age7" : (user.age || 8) === 8 ? "age8" : "age9"
  );
  const [spokenDone, setSpokenDone] = useState<Set<string>>(new Set());
  const [listeningKey, setListeningKey] = useState<string | null>(null);
  const [age8QuizIdx, setAge8QuizIdx] = useState(0);
  const [age8QuizMsg, setAge8QuizMsg] = useState("");
  const [age9QuizIdx, setAge9QuizIdx] = useState(0);
  const [age9QuizMsg, setAge9QuizMsg] = useState("");

  const handlePracticeSpeak = (targetText: string, key: string) => {
    const SpeechRec =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRec) {
      try {
        setListeningKey(key);
        const rec = new SpeechRec();
        rec.lang = "en-US";
        rec.interimResults = false;
        rec.onresult = () => {
          setListeningKey(null);
          setSpokenDone((prev) => new Set(prev).add(key));
          playSoftTone(820, 0.16);
        };
        rec.onerror = () => {
          setListeningKey(null);
          setSpokenDone((prev) => new Set(prev).add(key));
          playSoftTone(760, 0.14);
        };
        rec.onend = () => setListeningKey(null);
        rec.start();
        return;
      } catch {
        setListeningKey(null);
      }
    }
    speakEnglish(targetText, 0.88, 1.06);
    setSpokenDone((prev) => new Set(prev).add(key));
    playSoftTone(780, 0.14);
  };

  const activeStage =
    PHONICS_26_STAGES.find((s) => s.stage === phonicsStageNum) || PHONICS_26_STAGES[0];
  const stageWords = activeStage.words;
  const activeStageWord = stageWords[phonicsIdx] || stageWords[0];
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
                  setPoppedSet(new Set());
                  setPhonicsSoundPassed(false);
                  setSoundCheckMsg("");
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

            <div className="border border-slate-200 rounded-2xl p-6 flex flex-col justify-between gap-4 bg-slate-50/50">
              <div className="space-y-2">
                <span className="inline-block text-xs font-bold px-2.5 py-0.5 rounded-full bg-white border border-slate-200 text-slate-600">
                  7세 · 8세 · 9세 연령별 맞춤
                </span>
                <h3 className="text-lg font-bold text-slate-900">
                  연령별 유창성 · 문장 훈련
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  7세 알파벳·쉐도잉, 8세 파닉스·단어 인지, 9세 품사·1~3형식 문장 말하기를 연습합니다.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSubview("upper")}
                className="w-full py-2.5 px-4 rounded-xl btn-water-glass text-sm font-bold inline-flex items-center justify-center gap-1.5"
              >
                맞춤 훈련 열기
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {subview === "phonics" && (
        <div className="py-2 space-y-5">
          {/* Top Bar: 26-Stage Phonics Selector & Progress */}
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

          {/* Left: True-Circular Rising Water Droplets (No outer box) | Right: Large Box-Free Seashell + Service-Matched Pearl */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
            {/* LEFT: Circular Water Droplets (Popped ones leave, lower droplets rise upward!) */}
            <div className="lg:col-span-5 space-y-4">
              <div className="text-xs font-bold text-slate-600">
                {phonicsSoundPassed
                  ? "왼쪽 자음 물방울을 눌러 진주와 합쳐 보세요! 완료하면 방울이 터지며 아래 방울이 올라와요."
                  : "먼저 오른쪽 조개의 음가를 마이크로 발음 확인하면, 진주와 함께 물방울 조합이 열려요!"}
              </div>

              {(() => {
                const remaining = stageWords
                  .map((item, origIdx) => ({ ...item, origIdx, parts: splitOnsetRime(item.word) }))
                  .filter((w) => !poppedSet.has(w.origIdx));

                if (remaining.length === 0) {
                  return (
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
                  );
                }

                return (
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
                          <span className="text-[11px] font-bold text-sky-800 mt-1">
                            {item.word}
                          </span>
                          <span className="text-[10px] font-semibold text-slate-600">
                            {item.meaning}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                );
              })()}
            </div>

            {/* RIGHT: No outer box! Larger Isolated 3D Seashell */}
            <div className="lg:col-span-7 flex flex-col items-center justify-center text-center space-y-3">
              <div className="relative w-full max-w-[540px] aspect-square mx-auto flex items-center justify-center">
                <img
                  src="/assets/seashell-3d.png"
                  alt="조개"
                  className="w-full h-full object-contain drop-shadow-xl select-none pointer-events-none"
                />

                {/* UPPER SHELL: Large Self-Decodable Alphabet-to-Sound Guide (No box!) */}
                <div className="absolute top-[11%] left-[10%] right-[10%] flex flex-col items-center text-center px-2 pointer-events-none">
                  <div className="text-xl sm:text-3xl font-black text-sky-950 tracking-tight drop-shadow-[0_2px_4px_rgba(255,255,255,0.95)]">
                    {activeStage.soundLabel}
                  </div>
                  <p className="text-sm sm:text-lg font-extrabold text-slate-900 leading-snug mt-1.5 drop-shadow-[0_2px_4px_rgba(255,255,255,0.95)]">
                    {activeStage.pronunciationGuide}
                  </p>
                </div>

                {/* LOWER SHELL CAVITY: Mid-shell position -> Pure 3D Pearl Sphere (no inner shell image) */}
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

              {/* Controls Below Seashell */}
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
                          (window as any).SpeechRecognition ||
                          (window as any).webkitSpeechRecognition;
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
                  {/* Prominent Example Sentence + Dedicated Listen Button */}
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
                        onClick={() => {
                          setSubview("classcard");
                          setCcStage("study");
                          setCcIdx(0);
                          setCcFlipped(false);
                        }}
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
        <div className="py-2 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Layers className="w-5 h-5 text-sky-600" />
              <h2 className="text-lg font-bold text-slate-900">연령별 맞춤형 학습 훈련소</h2>
            </div>
            <div className="flex items-center gap-1.5">
              {[
                { id: "age7" as const, label: "7세 · 알파벳/쉐도잉" },
                { id: "age8" as const, label: "8세 · 파닉스/단어인지" },
                { id: "age9" as const, label: "9세 · 품사/1~3형식" }
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setAgeTrack(tab.id)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition ${
                    ageTrack === tab.id
                      ? "btn-water-glass"
                      : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {ageTrack === "age7" && (
            <div className="space-y-6">
              <div className="space-y-3">
                <div className="flex items-baseline justify-between">
                  <h3 className="text-sm font-bold text-slate-900">1. 알파벳 음가 &amp; 대표 단어 익히기</h3>
                  <span className="text-xs text-slate-500">글자를 눌러 소리를 들어보세요</span>
                </div>
                <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-9 gap-2">
                  {AGE7_ALPHABET.map((a) => (
                    <button
                      key={a.letter}
                      type="button"
                      onClick={() => speakEnglish(`${a.word}`, 0.78, 1.08)}
                      className="p-2.5 rounded-xl bg-slate-50 hover:bg-sky-50 border border-slate-200 hover:border-sky-300 text-center transition"
                    >
                      <div className="storybook-font text-lg font-bold text-slate-900">{a.letter}</div>
                      <div className="text-[11px] font-bold text-sky-700">[{a.sound}]</div>
                      <div className="text-[10px] text-slate-500">{a.word}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3 pt-4 border-t border-slate-100">
                <h3 className="text-sm font-bold text-slate-900">2. 쉐도잉 따라말하기 유창성</h3>
                <div className="space-y-2.5">
                  {AGE7_SHADOWING.map((s, idx) => {
                    const key = `age7_${idx}`;
                    const done = spokenDone.has(key);
                    return (
                      <div
                        key={key}
                        className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-wrap items-center justify-between gap-3"
                      >
                        <div>
                          <div className="storybook-font text-lg font-bold text-slate-900">{s.en}</div>
                          <div className="text-xs text-slate-500 mt-0.5">{s.kr}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => speakEnglish(s.en, 0.84, 1.06)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-white border border-slate-200 text-xs font-bold text-slate-700"
                          >
                            <Volume2 className="w-3.5 h-3.5 text-sky-600" />
                            듣기
                          </button>
                          <button
                            type="button"
                            onClick={() => handlePracticeSpeak(s.en, key)}
                            className={`inline-flex items-center gap-1 px-3.5 py-1.5 rounded-full text-xs font-bold ${
                              done ? "bg-emerald-600 text-white" : "btn-water-glass"
                            }`}
                          >
                            <Mic className="w-3.5 h-3.5" />
                            {listeningKey === key ? "듣는 중..." : done ? "따라말하기 완료" : "쉐도잉 말하기"}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {ageTrack === "age8" && (
            <div className="space-y-6">
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-slate-900">1. 알파벳 파닉스 조합 &amp; 유창성 읽기</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {AGE8_BLENDS.map((b, idx) => {
                    const key = `age8_${idx}`;
                    const done = spokenDone.has(key);
                    return (
                      <div
                        key={b.word}
                        className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-sky-700">
                            {b.onset} + {b.rime} ➔ {b.word}
                          </span>
                          <span className="text-xs font-bold text-slate-600">{b.kr}</span>
                        </div>
                        <div className="storybook-font text-base font-bold text-slate-900">{b.ex}</div>
                        <div className="flex items-center gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => speakEnglish(`${b.word}. ${b.ex}`, 0.85, 1.06)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-white border border-slate-200 text-xs font-bold text-slate-700"
                          >
                            <Volume2 className="w-3.5 h-3.5 text-sky-600" />
                            소리 듣기
                          </button>
                          <button
                            type="button"
                            onClick={() => handlePracticeSpeak(b.ex, key)}
                            className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold ${
                              done ? "bg-emerald-600 text-white" : "btn-water-glass"
                            }`}
                          >
                            <Mic className="w-3.5 h-3.5" />
                            {listeningKey === key ? "듣는 중..." : done ? "완료" : "유창성 읽기"}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-3 pt-4 border-t border-slate-100">
                <h3 className="text-sm font-bold text-slate-900">2. 단어 인지 퀴즈 ({age8QuizIdx + 1} / {AGE8_WORD_QUIZ.length})</h3>
                <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="text-base font-bold text-slate-900">
                      우리말 뜻: <span className="text-sky-700">{AGE8_WORD_QUIZ[age8QuizIdx].promptKr}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => speakEnglish(AGE8_WORD_QUIZ[age8QuizIdx].answer, 0.82, 1.06)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-white border border-slate-200 text-xs font-bold text-slate-700"
                    >
                      <Volume2 className="w-3.5 h-3.5 text-sky-600" />
                      힌트 듣기
                    </button>
                  </div>
                  <div className="grid grid-cols-3 gap-2.5">
                    {AGE8_WORD_QUIZ[age8QuizIdx].options.map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => {
                          const q = AGE8_WORD_QUIZ[age8QuizIdx];
                          if (opt === q.answer) {
                            playSoftTone(820, 0.16);
                            speakEnglish(opt, 0.85, 1.06);
                            setAge8QuizMsg(`정답! '${opt}'은(는) '${q.promptKr}'입니다.`);
                            setTimeout(() => {
                              setAge8QuizMsg("");
                              setAge8QuizIdx((i) => (i + 1) % AGE8_WORD_QUIZ.length);
                            }, 900);
                          } else {
                            playSoftTone(340, 0.14);
                            setAge8QuizMsg("다시 한 번 소리를 듣고 골라보세요.");
                          }
                        }}
                        className="py-3 rounded-xl bg-white hover:bg-sky-50 border border-slate-200 font-bold text-base storybook-font text-slate-900"
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                  {age8QuizMsg && <p className="text-xs font-bold text-sky-700">{age8QuizMsg}</p>}
                </div>
              </div>
            </div>
          )}

          {ageTrack === "age9" && (
            <div className="space-y-6">
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-slate-900">
                  1. 문장 인지 · 주어 / be동사 / 일반동사 · 품사(명사·동사·형용사) 나누기
                </h3>
                <div className="space-y-3">
                  {AGE9_POS_SENTENCES.map((item) => (
                    <div
                      key={item.en}
                      className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <span className="text-xs font-bold text-sky-700">{item.verbType}</span>
                          <div className="storybook-font text-lg font-bold text-slate-900">{item.en}</div>
                          <div className="text-xs text-slate-500">{item.kr}</div>
                        </div>
                        <button
                          type="button"
                          onClick={() => speakEnglish(item.en, 0.88, 1.05)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-white border border-slate-200 text-xs font-bold text-slate-700"
                        >
                          <Volume2 className="w-3.5 h-3.5 text-sky-600" />
                          듣기
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-2 pt-1">
                        {item.tokens.map((t, i) => (
                          <div
                            key={`${item.en}_${i}`}
                            className={`px-3 py-1.5 rounded-xl border text-xs font-bold ${t.color}`}
                          >
                            <span className="storybook-font text-sm mr-1.5">{t.word}</span>
                            <span className="opacity-80">({t.role})</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-3 pt-4 border-t border-slate-100">
                <h3 className="text-sm font-bold text-slate-900">2. 주어 · 동사 · 품사 찾기 퀴즈</h3>
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                  <div className="storybook-font text-base font-bold text-slate-900">
                    {AGE9_POS_QUIZ[age9QuizIdx].sentence}
                  </div>
                  <div className="text-xs font-bold text-sky-700">
                    {AGE9_POS_QUIZ[age9QuizIdx].question}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {AGE9_POS_QUIZ[age9QuizIdx].options.map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => {
                          const q = AGE9_POS_QUIZ[age9QuizIdx];
                          if (opt === q.answer) {
                            playSoftTone(820, 0.16);
                            setAge9QuizMsg(`정답입니다! '${opt}'가 맞아요.`);
                            setTimeout(() => {
                              setAge9QuizMsg("");
                              setAge9QuizIdx((i) => (i + 1) % AGE9_POS_QUIZ.length);
                            }, 950);
                          } else {
                            playSoftTone(340, 0.14);
                            setAge9QuizMsg("다시 한 번 문장 역할을 살펴보세요.");
                          }
                        }}
                        className="px-4 py-2 rounded-xl bg-white hover:bg-sky-50 border border-slate-200 text-sm font-bold text-slate-800"
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                  {age9QuizMsg && <p className="text-xs font-bold text-sky-700">{age9QuizMsg}</p>}
                </div>
              </div>

              <div className="space-y-3 pt-4 border-t border-slate-100">
                <h3 className="text-sm font-bold text-slate-900">3. 1형식 · 2형식 · 3형식 문장 말하기 연습</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {AGE9_PATTERNS_123.map((p, idx) => {
                    const key = `age9_${idx}`;
                    const done = spokenDone.has(key);
                    return (
                      <div
                        key={key}
                        className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3"
                      >
                        <div>
                          <span className="text-[11px] font-bold text-sky-700">{p.form}</span>
                          <div className="storybook-font text-base font-bold text-slate-900 mt-0.5">{p.en}</div>
                          <div className="text-xs text-slate-500">{p.kr}</div>
                        </div>
                        <div className="flex flex-col gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => speakEnglish(p.en, 0.88, 1.05)}
                            className="inline-flex items-center justify-center gap-1 px-3 py-1 rounded-full bg-white border border-slate-200 text-xs font-bold text-slate-700"
                          >
                            <Volume2 className="w-3.5 h-3.5 text-sky-600" />
                            듣기
                          </button>
                          <button
                            type="button"
                            onClick={() => handlePracticeSpeak(p.en, key)}
                            className={`inline-flex items-center justify-center gap-1 px-3 py-1 rounded-full text-xs font-bold ${
                              done ? "bg-emerald-600 text-white" : "btn-water-glass"
                            }`}
                          >
                            <Mic className="w-3.5 h-3.5" />
                            {listeningKey === key ? "듣는 중..." : done ? "완료" : "말하기"}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

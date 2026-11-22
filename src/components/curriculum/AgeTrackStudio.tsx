import React, { useState } from "react";
import { Layers, Mic, Volume2 } from "lucide-react";
import { playSoftTone, speakEnglish } from "../../utils/speech";

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

interface AgeTrackStudioProps {
  studentAge: number;
  onCompleteToday?: () => Promise<void> | void;
}

export const AgeTrackStudio: React.FC<AgeTrackStudioProps> = ({
  studentAge,
  onCompleteToday
}) => {
  const [savingDone, setSavingDone] = useState(false);
  const [ageTrack, setAgeTrack] = useState<"age7" | "age8" | "age9">(
    (studentAge || 8) <= 7 ? "age7" : (studentAge || 8) === 8 ? "age8" : "age9"
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

  return (
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
            <h3 className="text-sm font-bold text-slate-900">
              2. 단어 인지 퀴즈 ({age8QuizIdx + 1} / {AGE8_WORD_QUIZ.length})
            </h3>
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

      {onCompleteToday && (
        <div className="pt-5 border-t border-[#e8dfd1] flex justify-end">
          <button
            type="button"
            disabled={savingDone}
            onClick={async () => {
              setSavingDone(true);
              try {
                playSoftTone(820, 0.16);
                await onCompleteToday();
              } finally {
                setSavingDone(false);
              }
            }}
            className="w-full sm:w-auto px-7 py-3.5 rounded-2xl btn-water-glass text-sm font-extrabold disabled:opacity-60"
          >
            {savingDone ? "저장 중..." : "오늘 연령별 훈련 완료하고 학습 맵으로 →"}
          </button>
        </div>
      )}
    </div>
  );
};

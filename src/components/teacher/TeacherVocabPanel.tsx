import React, { useEffect, useState } from "react";
import { BookOpen, CheckCircle2, Save } from "lucide-react";
import type {
  StudentUser,
  StudentVocabState,
  VocabInputMode,
  VocabS1QuizMode,
  VocabTier
} from "../../types";
import { playSoftTone } from "../../utils/speech";

interface TeacherVocabPanelProps {
  student: StudentUser;
}

export const TeacherVocabPanel: React.FC<TeacherVocabPanelProps> = ({ student }) => {
  const [state, setState] = useState<StudentVocabState | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  const [vocabTier, setVocabTier] = useState<VocabTier>("elem_800");
  const [s1QuizMode, setS1QuizMode] = useState<VocabS1QuizMode>("meaning");
  const [currentStage, setCurrentStage] = useState<1 | 2 | 3>(1);
  const [unitKey, setUnitKey] = useState("A");
  const [s2Unit, setS2Unit] = useState("s2_long_a");
  const [s3Unit, setS3Unit] = useState("s3_pre_un");
  const [earlyUnlocked, setEarlyUnlocked] = useState(false);
  const [s2InputMode, setS2InputMode] = useState<VocabInputMode>("tiles");

  useEffect(() => {
    let active = true;
    const loadState = async () => {
      setLoading(true);
      setMsg("");
      try {
        const res = await fetch(`/api/vocab/state?userId=${encodeURIComponent(student.id)}`);
        const data = await res.json();
        if (!active) return;
        if (res.ok && data.ok) {
          const { ok: _ok, ...rest } = data;
          const vocab = rest as StudentVocabState;
          setState(vocab);
          setVocabTier(vocab.progress.vocab_tier);
          setS1QuizMode(vocab.progress.s1_quiz_mode || "meaning");
          setCurrentStage(vocab.progress.current_stage);
          setUnitKey(vocab.progress.current_unit_key);
          setS2Unit(vocab.progress.current_s2_unit);
          setS3Unit(vocab.progress.current_s3_unit);
          setEarlyUnlocked(vocab.progress.early_test_unlocked);
          setS2InputMode(vocab.progress.s2_input_mode);
        }
      } finally {
        if (active) setLoading(false);
      }
    };
    void loadState();
    return () => {
      active = false;
    };
  }, [student.id]);

  const handleSave = async () => {
    setSaving(true);
    setMsg("");
    try {
      const res = await fetch("/api/vocab/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: student.id,
          vocab_tier: vocabTier,
          s1_quiz_mode: s1QuizMode,
          current_stage: currentStage,
          current_unit_key: unitKey,
          current_s2_unit: s2Unit,
          current_s3_unit: s3Unit,
          early_test_unlocked: earlyUnlocked,
          s2_input_mode: s2InputMode
        })
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        const { ok: _ok, ...rest } = data;
        const next = rest as StudentVocabState;
        setState(next);
        setVocabTier(next.progress.vocab_tier);
        setS1QuizMode(next.progress.s1_quiz_mode || "meaning");
        setCurrentStage(next.progress.current_stage);
        setUnitKey(next.progress.current_unit_key);
        setS2Unit(next.progress.current_s2_unit);
        setS3Unit(next.progress.current_s3_unit);
        setEarlyUnlocked(next.progress.early_test_unlocked);
        setS2InputMode(next.progress.s2_input_mode);
        setMsg(`'${student.name}' 학생의 영단어 설정(범위·퀴즈 방식·진도)이 저장되었습니다.`);
        playSoftTone(780, 0.14);
      } else {
        setMsg(data.error || "설정을 저장하지 못했습니다.");
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="pt-6 border-t border-[#e5dcc9] text-xs font-bold text-slate-500">
        3단계 영단어 학습 상태를 불러오는 중...
      </div>
    );
  }

  if (!state) return null;

  const s1Units = state.stage1ByTier?.[vocabTier] || state.units.stage1;
  const s2Units = state.units.stage2;
  const s3Units = state.units.stage3;
  const completedS1 = state.progress.completed_s1_units?.length || 0;
  const completedS2 = state.progress.completed_s2_units?.length || 0;
  const completedS3 = state.progress.completed_s3_units?.length || 0;

  return (
    <div className="pt-6 border-t border-[#e5dcc9] space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-sky-700" />
            3단계 영단어 학습 제어 ({student.name})
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            완료 현황: 1단계 {completedS1}/{s1Units.length} · 2단계 {completedS2}/{s2Units.length} ·
            3단계 {completedS3}/{s3Units.length} · 현재 유닛 {state.daysElapsed + 1}일째
          </p>
        </div>
        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={saving}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full btn-slate-glass text-xs font-bold disabled:opacity-60"
        >
          <Save className="w-3.5 h-3.5" />
          {saving ? "저장 중..." : "단어 설정 저장"}
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <label className="space-y-1 text-xs">
          <span className="font-bold text-slate-600 block">학습 단어장 범위</span>
          <select
            value={vocabTier}
            onChange={(e) => {
              const nextTier = e.target.value as VocabTier;
              setVocabTier(nextTier);
              if (nextTier === "mid_high" && s1QuizMode === "picture_to_word") {
                setS1QuizMode("meaning");
              }
            }}
            className="w-full px-3 py-2 rounded-lg border border-[#e5dcc9] bg-[#fbf8f2]/80 font-bold text-slate-800"
          >
            <option value="elem_800">초등 필수 800단어만 (그림 지원)</option>
            <option value="mid_high">중·고등 필수 1,800단어만</option>
            <option value="all">초·중등 전체 통합 (2,483단어)</option>
          </select>
        </label>

        <label className="space-y-1 text-xs">
          <span className="font-bold text-slate-600 block">1단계 퀴즈 방식</span>
          <select
            value={s1QuizMode}
            onChange={(e) => setS1QuizMode(e.target.value as VocabS1QuizMode)}
            className="w-full px-3 py-2 rounded-lg border border-[#e5dcc9] bg-[#fbf8f2]/80 font-bold text-slate-800"
          >
            <option value="meaning">영단어 → 한글 뜻 맞추기 (기본)</option>
            <option value="picture_to_word" disabled={vocabTier === "mid_high"}>
              그림 + 소리 → 영단어 맞추기 (유치원 추천)
            </option>
            <option value="mixed" disabled={vocabTier === "mid_high"}>
              그림 맞추기 + 뜻 맞추기 혼합
            </option>
          </select>
        </label>

        <label className="space-y-1 text-xs">
          <span className="font-bold text-slate-600 block">현재 단계</span>
          <select
            value={currentStage}
            onChange={(e) => setCurrentStage(Number(e.target.value) as 1 | 2 | 3)}
            className="w-full px-3 py-2 rounded-lg border border-[#e5dcc9] bg-[#fbf8f2]/80 font-bold text-slate-800"
          >
            <option value={1}>1단계 · A–Z 첫소리·뜻</option>
            <option value={2}>2단계 · 파닉스 시각화</option>
            <option value={3}>3단계 · 접두·접미사 확장</option>
          </select>
        </label>

        <label className="space-y-1 text-xs">
          <span className="font-bold text-slate-600 block">현재 학습 유닛</span>
          {currentStage === 1 ? (
            <select
              value={unitKey}
              onChange={(e) => setUnitKey(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-[#e5dcc9] bg-[#fbf8f2]/80 font-bold text-slate-800"
            >
              {s1Units.map((u) => (
                <option key={u.id} value={u.unit_key}>
                  {u.unit_key} ({u.word_count}단어)
                </option>
              ))}
            </select>
          ) : currentStage === 2 ? (
            <select
              value={s2Unit}
              onChange={(e) => setS2Unit(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-[#e5dcc9] bg-[#fbf8f2]/80 font-bold text-slate-800"
            >
              {s2Units.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.title_kr} ({u.word_count}단어)
                </option>
              ))}
            </select>
          ) : (
            <select
              value={s3Unit}
              onChange={(e) => setS3Unit(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-[#e5dcc9] bg-[#fbf8f2]/80 font-bold text-slate-800"
            >
              {s3Units.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.title_kr} ({u.word_count}패밀리)
                </option>
              ))}
            </select>
          )}
        </label>

        <label className="space-y-1 text-xs">
          <span className="font-bold text-slate-600 block">2단계 스펠링 방식</span>
          <select
            value={s2InputMode}
            onChange={(e) => setS2InputMode(e.target.value as VocabInputMode)}
            className="w-full px-3 py-2 rounded-lg border border-[#e5dcc9] bg-[#fbf8f2]/80 font-bold text-slate-800"
          >
            <option value="tiles">블록 고르기 (저학년)</option>
            <option value="typing">직접 입력 (고학년)</option>
          </select>
        </label>

        <label className="flex items-center gap-2 px-3 py-2 mt-5 rounded-lg border border-[#e5dcc9] bg-[#fbf8f2]/80 cursor-pointer text-xs font-bold text-slate-800">
          <input
            type="checkbox"
            checked={earlyUnlocked}
            onChange={(e) => setEarlyUnlocked(e.target.checked)}
            className="w-4 h-4 accent-sky-600"
          />
          <span>조기 파이널 테스트 허용</span>
        </label>
      </div>

      {msg && <p className="text-xs font-bold text-sky-800">{msg}</p>}

      {state.recentAttempts.length > 0 && (
        <div className="space-y-2 pt-1">
          <div className="text-xs font-bold text-slate-600">최근 퀴즈 · 테스트 기록</div>
          <div className="flex flex-wrap gap-2">
            {state.recentAttempts.slice(0, 5).map((a) => (
              <div
                key={a.id}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border ${
                  a.passed
                    ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                    : "bg-amber-50 border-amber-200 text-amber-900"
                }`}
              >
                {a.passed && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
                <span>
                  {a.stage}단계 · {a.unit_key} (
                  {a.attempt_type === "final_test" ? "파이널" : "퀴즈"})
                </span>
                <span>
                  {a.score_pct}% ({a.correct_count}/{a.total_count})
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

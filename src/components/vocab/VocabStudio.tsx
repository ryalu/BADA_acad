import React, { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import type { StudentUser, StudentVocabState } from "../../types";
import { Stage1UnitView } from "./Stage1UnitView";
import { Stage2PhonicsView } from "./Stage2PhonicsView";
import { Stage3AffixView } from "./Stage3AffixView";

interface VocabStudioProps {
  user: StudentUser;
  onBackHome: () => void;
}

export const VocabStudio: React.FC<VocabStudioProps> = ({ user, onBackHome }) => {
  const [vocabState, setVocabState] = useState<StudentVocabState | null>(null);
  const [displayStage, setDisplayStage] = useState<1 | 2 | 3>(1);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    let active = true;
    const loadState = async () => {
      setLoading(true);
      setErrorMsg("");
      try {
        const res = await fetch(`/api/vocab/state?userId=${encodeURIComponent(user.id)}`);
        const data = await res.json();
        if (!active) return;
        if (res.ok && data.ok) {
          const { ok: _ok, ...rest } = data;
          const next = rest as StudentVocabState;
          setVocabState(next);
          setDisplayStage(next.progress.current_stage || 1);
        } else {
          setErrorMsg(data.error || "영단어 학습 정보를 불러오지 못했습니다.");
        }
      } catch {
        if (active) setErrorMsg("서버와 통신하지 못했습니다.");
      } finally {
        if (active) setLoading(false);
      }
    };
    void loadState();
    return () => {
      active = false;
    };
  }, [user.id]);

  return (
    <div className="space-y-5">
      {/* Minimal Header Bar (No Center Stage Pill, No Tier Pill) */}
      <div className="pb-3 border-b border-[#e8dfd1] flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onBackHome}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-[#f2ece1] hover:bg-[#e8dfd1] text-slate-800 text-xs font-bold transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          학습 맵
        </button>

        <span className="text-xs font-bold text-slate-600">{user.name}</span>
      </div>

      {loading ? (
        <div className="py-16 text-center text-sm font-bold text-slate-500">
          영단어 학습장을 여는 중입니다...
        </div>
      ) : errorMsg || !vocabState ? (
        <div className="py-12 text-center space-y-3">
          <p className="text-sm font-bold text-rose-700">
            {errorMsg || "데이터를 불러오지 못했습니다."}
          </p>
          <button
            type="button"
            onClick={onBackHome}
            className="px-5 py-2 rounded-full btn-water-glass text-xs font-bold"
          >
            학습 맵으로 돌아가기
          </button>
        </div>
      ) : displayStage === 1 ? (
        <Stage1UnitView
          userId={user.id}
          state={vocabState}
          onStateChange={setVocabState}
          onEnterNextStage={(nextStage) => setDisplayStage(nextStage)}
          onBackHome={onBackHome}
        />
      ) : displayStage === 2 ? (
        <Stage2PhonicsView
          userId={user.id}
          state={vocabState}
          onStateChange={setVocabState}
          onEnterNextStage={(nextStage) => setDisplayStage(nextStage)}
          onBackHome={onBackHome}
        />
      ) : (
        <Stage3AffixView
          userId={user.id}
          state={vocabState}
          onStateChange={setVocabState}
          onBackHome={onBackHome}
        />
      )}
    </div>
  );
};

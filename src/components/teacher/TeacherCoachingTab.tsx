import React, { useEffect, useRef, useState } from "react";
import { Download, MessageCircle, RefreshCw, RotateCcw } from "lucide-react";
import type { Book, StudentRecording, StudentUser, TeacherQuestion } from "../../types";
import { playSoftTone } from "../../utils/speech";
import { TeacherVocabPanel } from "./TeacherVocabPanel";

interface TeacherCoachingTabProps {
  users: StudentUser[];
  books: Book[];
  currentUser: StudentUser;
  currentBook: Book;
  onSelectStudent: (userId: string) => void;
  onChangeTab: (tab: "home" | "coaching" | "worksheets" | "database") => void;
  onDataUpdated: (payload: { users?: StudentUser[] }) => void;
}

export const TeacherCoachingTab: React.FC<TeacherCoachingTabProps> = ({
  users,
  books,
  currentUser,
  currentBook,
  onSelectStudent,
  onChangeTab,
  onDataUpdated
}) => {
  const [coachQuestions, setCoachQuestions] = useState<TeacherQuestion[]>([]);
  const [studentRecordings, setStudentRecordings] = useState<StudentRecording[]>([]);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [parentMsg, setParentMsg] = useState("");
  const [parentMsgLoading, setParentMsgLoading] = useState(false);
  const [parentMsgCopied, setParentMsgCopied] = useState(false);

  const fetchStudentRecordings = async (uid = currentUser.id) => {
    if (!uid) return;
    try {
      const r = await fetch(`/api/recordings?userId=${encodeURIComponent(uid)}`);
      if (!r.ok) return;
      const data = await r.json();
      if (data?.recordings) setStudentRecordings(data.recordings);
    } catch {
      // ignore transient network errors
    }
  };

  useEffect(() => {
    void fetchStudentRecordings(currentUser.id);
  }, [currentUser.id, users]);

  const loadCoachingQuestions = async () => {
    try {
      const res = await fetch("/api/teacher/questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentName: currentUser.name,
          bookTitle: currentBook.title,
          weakPoints: currentUser.weaknesses,
          strongPoints: currentUser.strengths,
          coreExpressions: currentBook.core_expressions || []
        })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.questions) setCoachQuestions(data.questions);
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    void loadCoachingQuestions();
  }, [currentUser.id, currentBook.id]);

  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, w, h);

    ctx.strokeStyle = "#0284c7";
    ctx.lineWidth = 8;
    ctx.strokeRect(18, 18, w - 36, h - 36);

    ctx.strokeStyle = "#cbd5e1";
    ctx.lineWidth = 2;
    ctx.strokeRect(30, 30, w - 60, h - 60);

    ctx.fillStyle = "#0369a1";
    ctx.font = "bold 18px 'Noto Sans KR', sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("BADA ENGLISH ACADEMY", w / 2, 78);

    ctx.fillStyle = "#0f172a";
    ctx.font = "bold 34px 'Noto Sans KR', sans-serif";
    ctx.fillText("영어 원서 완독 수료증", w / 2, 130);

    ctx.fillStyle = "#475569";
    ctx.font = "16px 'Noto Sans KR', sans-serif";
    ctx.fillText("위 학생은 4주 원서 리딩 및 스피킹 과정을 성실히 수료하였습니다.", w / 2, 175);

    ctx.fillStyle = "#0284c7";
    ctx.font = "bold 36px 'Noto Sans KR', sans-serif";
    ctx.fillText(currentUser.name, w / 2, 240);

    ctx.fillStyle = "#334155";
    ctx.font = "16px 'Noto Sans KR', sans-serif";
    ctx.fillText(`${currentUser.grade_label} · ${currentUser.level}`, w / 2, 275);
    ctx.fillText(`수료 원서: ${currentBook.title}`, w / 2, 315);
    ctx.fillText(
      `유창성 성장: ${currentUser.w1_wpm} WPM → ${currentUser.w4_wpm} WPM`,
      w / 2,
      350
    );

    const todayStr = new Date().toLocaleDateString("ko-KR");
    ctx.fillStyle = "#64748b";
    ctx.font = "14px 'Noto Sans KR', sans-serif";
    ctx.fillText(`발급일: ${todayStr} · BADA English 원장`, w / 2, 445);
  }, [currentUser, currentBook]);

  const handleManualProgressChange = async (weekNum: 1 | 2 | 3 | 4, progressVal: number) => {
    const res = await fetch("/api/students/update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: currentUser.id,
        [`progress_w${weekNum}`]: progressVal
      })
    });
    const data = await res.json();
    if (res.ok && data.ok) {
      onDataUpdated({ users: data.users });
      playSoftTone(720, 0.12);
    }
  };

  const handleGenerateParentMsg = async () => {
    setParentMsgLoading(true);
    setParentMsgCopied(false);
    try {
      const res = await fetch("/api/teacher/parent-feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: currentUser.id,
          studentName: currentUser.name,
          level: currentUser.level,
          bookTitle: currentBook.title,
          weeklyProgress: {
            w1: currentUser.progress_w1,
            w2: currentUser.progress_w2,
            w3: currentUser.progress_w3,
            w4: currentUser.progress_w4
          }
        })
      });
      const data = await res.json();
      if (res.ok && data.ok && data.message) {
        setParentMsg(data.message);
        playSoftTone(760, 0.14);
      }
    } finally {
      setParentMsgLoading(false);
    }
  };

  const handleCopyParentMsg = async () => {
    if (!parentMsg.trim()) return;
    try {
      await navigator.clipboard.writeText(parentMsg);
      setParentMsgCopied(true);
      playSoftTone(820, 0.12);
      setTimeout(() => setParentMsgCopied(false), 2500);
    } catch {
      // ignore clipboard errors
    }
  };

  return (
    <div className="space-y-8 max-w-5xl">
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[#e5dcc9]">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">학생 학습 관리</h2>
          <p className="text-sm text-slate-600 mt-1">
            {currentUser.name} ({currentUser.grade_label} · {currentUser.level}) · 《{currentBook.title}》
          </p>
        </div>
        <div className="flex items-center gap-2">
          <label htmlFor="coachingStudentSelect" className="text-xs font-bold text-slate-600">
            학생 선택
          </label>
          <select
            id="coachingStudentSelect"
            value={currentUser.id}
            onChange={(e) => {
              onSelectStudent(e.target.value);
              setParentMsg("");
              setParentMsgCopied(false);
            }}
            className="px-3.5 py-2 rounded-xl bg-[#fbf8f2]/80 border border-[#e5dcc9] focus:outline-none focus:border-slate-500 text-sm font-semibold text-slate-900"
          >
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name} ({u.grade_label} · {u.level})
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="pt-6 border-t border-[#e5dcc9] space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900">학생 주차별 발음 녹음 &amp; AI 분석함</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              학생이 따라 말하기를 완료하고 전송한 실제 녹음 파일과 AI 발음·억양 피드백입니다.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void fetchStudentRecordings(currentUser.id)}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#f2ece1] hover:bg-[#e8dfd1] text-slate-700 text-xs font-bold transition"
            >
              <RotateCcw className="w-3 h-3" />
              새로고침
            </button>
            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-sky-50 text-sky-700 border border-sky-200">
              녹음 {studentRecordings.length}건
            </span>
          </div>
        </div>

        {studentRecordings.length === 0 ? (
          <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 text-xs text-slate-500">
            아직 {currentUser.name} 학생이 제출한 발음 녹음 파일이 없습니다. 학생이 원서 읽기 완료 후 &lsquo;진주 받기&rsquo;를 누르면 여기에 자동으로 올라옵니다.
          </div>
        ) : (
          <div className="space-y-3 max-h-[340px] overflow-y-auto pr-1">
            {studentRecordings.map((rec) => {
              const recBook = books.find((b) => b.id === rec.book_id);
              return (
                <div key={rec.id} className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold px-2.5 py-0.5 rounded-full btn-slate-glass">
                        {rec.week_num}주차 · {rec.repeat_num}회차
                      </span>
                      <span className="text-xs font-semibold text-slate-700">
                        {recBook?.title || rec.book_id}
                      </span>
                      {typeof rec.ai_feedback?.score === "number" && (
                        <span className="text-xs font-bold text-emerald-700">
                          AI 점수 {rec.ai_feedback.score}점
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-slate-400">
                      {new Date(rec.created_at).toLocaleString("ko-KR")}
                    </span>
                  </div>

                  {rec.audio_data_url ? (
                    <audio controls src={rec.audio_data_url} className="w-full h-9" />
                  ) : (
                    <p className="text-[11px] text-slate-400">
                      음성 녹음 파일 없이 학습·발화 기록만 저장되었습니다.
                    </p>
                  )}

                  {rec.transcript && (
                    <p className="text-xs text-slate-600 bg-white border border-slate-200 rounded-lg px-3 py-2">
                      <span className="font-bold text-slate-700">인식된 발화:</span> {rec.transcript}
                    </p>
                  )}

                  {rec.ai_feedback?.pronunciation_tip_kr && (
                    <div className="text-xs text-slate-700 space-y-1">
                      <div>
                        <span className="font-bold text-sky-700">발음 교정:</span>{" "}
                        {rec.ai_feedback.pronunciation_tip_kr}
                      </div>
                      {rec.ai_feedback.intonation_tip_kr && (
                        <div>
                          <span className="font-bold text-amber-700">억양 팁:</span>{" "}
                          {rec.ai_feedback.intonation_tip_kr}
                        </div>
                      )}
                      {rec.ai_feedback.weak_words && rec.ai_feedback.weak_words.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1 pt-1">
                          <span className="font-bold text-rose-700">집중 단어:</span>
                          {rec.ai_feedback.weak_words.map((w) => (
                            <span
                              key={w}
                              className="px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 font-semibold"
                            >
                              {w}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pt-6 border-t border-[#e5dcc9]">
        <div className="space-y-4">
          <div className="flex items-baseline justify-between">
            <h3 className="text-base font-bold text-slate-900">주차별 진도 관리 &amp; 발음 요약</h3>
            <span className="text-[11px] text-slate-500">미흡 시 진도를 직접 조정할 수 있습니다</span>
          </div>
          <div className="divide-y divide-[#e5dcc9] border-y border-[#e5dcc9]">
            {([1, 2, 3, 4] as const).map((wk) => {
              const prog = (currentUser[`progress_w${wk}` as keyof StudentUser] as number) || 0;
              return (
                <div key={wk} className="py-2.5 flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-700">{wk}주차 학습 진도</span>
                  <select
                    value={prog}
                    onChange={(e) => handleManualProgressChange(wk, Number(e.target.value))}
                    className="px-2.5 py-1 rounded-lg border border-[#e5dcc9] bg-[#fbf8f2]/80 focus:outline-none focus:border-slate-500 font-bold text-slate-800"
                  >
                    {[0, 20, 40, 60, 80, 100].map((v) => (
                      <option key={v} value={v}>
                        {v}% (반복 {Math.floor(v / 20)}/5회)
                      </option>
                    ))}
                  </select>
                </div>
              );
            })}
          </div>

          <div className="pt-3 flex items-center justify-between gap-3">
            <div>
              <h4 className="text-xs font-bold text-slate-800">주차별 오프라인 학습지 (PDF 인쇄)</h4>
              <p className="text-[11px] text-slate-500">전체 원서 학습지 목록에서 선택해 인쇄할 수 있습니다.</p>
            </div>
            <button
              type="button"
              onClick={() => onChangeTab("worksheets")}
              className="px-3.5 py-1.5 rounded-full btn-slate-glass text-xs font-bold shrink-0"
            >
              학습지 목록 열기
            </button>
          </div>

          {studentRecordings.length === 0 ? (
            <p className="text-xs text-slate-500">
              아직 제출된 발음 녹음이 없어 집중 교정 단어가 기록되지 않았습니다.
            </p>
          ) : (
            <div className="space-y-2 pt-1">
              <div className="text-xs font-bold text-slate-700">최근 녹음 기준 집중 연습 단어</div>
              <div className="flex flex-wrap gap-1.5">
                {Array.from(new Set(studentRecordings.flatMap((r) => r.ai_feedback?.weak_words || [])))
                  .slice(0, 8)
                  .map((w) => (
                    <span
                      key={w}
                      className="text-xs px-2.5 py-0.5 rounded-full bg-amber-100/80 text-amber-900 font-semibold"
                    >
                      {w}
                    </span>
                  ))}
              </div>
            </div>
          )}
        </div>

        <div className="lg:border-l lg:border-[#e5dcc9] lg:pl-8 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900">수업 추천 질문 3선</h3>
            <button
              type="button"
              onClick={loadCoachingQuestions}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-[#f2ece1] hover:bg-[#e8dfd1] text-xs font-bold text-slate-700"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              새로고침
            </button>
          </div>
          <div className="divide-y divide-[#e5dcc9] border-y border-[#e5dcc9]">
            {coachQuestions.map((q, idx) => (
              <div key={q.id || idx} className="py-3 space-y-1">
                <div className="text-[11px] font-bold text-sky-700">
                  질문 0{idx + 1} · {q.category}
                </div>
                <div className="storybook-font text-sm font-bold text-slate-900">"{q.question_en}"</div>
                <div className="text-xs text-slate-600">{q.coaching_tip_kr}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <TeacherVocabPanel student={currentUser} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pt-6 border-t border-[#e5dcc9]">
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-base font-bold text-slate-900">학부모 피드백 메시지 (AI 작성)</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                진도율과 녹음 분석 결과를 바탕으로 학부모님께 보낼 안내 문구를 생성합니다.
              </p>
            </div>
            <button
              type="button"
              onClick={handleGenerateParentMsg}
              disabled={parentMsgLoading}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full btn-slate-glass text-xs font-bold disabled:opacity-60"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              {parentMsgLoading ? "생성 중..." : "AI 피드백 생성"}
            </button>
          </div>

          <textarea
            rows={6}
            value={parentMsg}
            onChange={(e) => setParentMsg(e.target.value)}
            placeholder="오른쪽 위 'AI 피드백 생성' 버튼을 누르면 학생의 실제 진도와 발음 분석을 반영한 학부모 안내 메시지가 자동으로 작성됩니다."
            className="w-full px-4 py-3 rounded-xl bg-[#fbf8f2]/80 border border-[#e5dcc9] text-sm text-slate-800 leading-relaxed focus:outline-none focus:border-slate-500"
          />

          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={handleCopyParentMsg}
              disabled={!parentMsg.trim()}
              className="px-4 py-2 rounded-full btn-slate-glass disabled:opacity-40 text-xs font-bold"
            >
              {parentMsgCopied ? "복사 완료! (붙여넣기 하세요)" : "메시지 복사하기"}
            </button>
            <span className="text-[11px] text-slate-500">
              복사 후 카카오톡·문자에 바로 붙여넣어 전송할 수 있습니다.
            </span>
          </div>
        </div>

        <div className="lg:border-l lg:border-[#e5dcc9] lg:pl-8 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-base font-bold text-slate-900">BADA 탐험 수료증</h3>
            <button
              type="button"
              onClick={() => {
                if (!canvasRef.current) return;
                const link = document.createElement("a");
                link.download = `BADA_수료증_${currentUser.name}.png`;
                link.href = canvasRef.current.toDataURL("image/png");
                link.click();
              }}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-[#f2ece1] hover:bg-[#e8dfd1] text-xs font-bold text-slate-700"
            >
              <Download className="w-3.5 h-3.5" />
              수료증 이미지 저장
            </button>
          </div>
          <canvas
            ref={canvasRef}
            width={760}
            height={500}
            className="w-full h-auto rounded-xl border border-[#e5dcc9]"
          />
        </div>
      </div>
    </div>
  );
};

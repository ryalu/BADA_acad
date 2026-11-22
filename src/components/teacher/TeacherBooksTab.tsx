import React, { useState } from "react";
import type { Book } from "../../types";
import { ALL_BADA_LEVELS, getBookSentences } from "../../utils/bookHelpers";
import { playSoftTone } from "../../utils/speech";
import { BookCover } from "../BookCover";

interface TeacherBooksTabProps {
  books: Book[];
  onDataUpdated: (payload: { books?: Book[] }) => void;
}

export const TeacherBooksTab: React.FC<TeacherBooksTabProps> = ({ books, onDataUpdated }) => {
  const [editingBookId, setEditingBookId] = useState<string | null>(null);
  const [bookLevelFilter, setBookLevelFilter] = useState<string>("ALL");
  const [bookTitle, setBookTitle] = useState("");
  const [bookSubKr, setBookSubKr] = useState("");
  const [bookLevel, setBookLevel] = useState("Level 2");
  const [bookGrade, setBookGrade] = useState("초등 1~3학년");
  const [bookEnText, setBookEnText] = useState("");
  const [bookKrText, setBookKrText] = useState("");
  const [bookResultMsg, setBookResultMsg] = useState("");
  const [bookSaving, setBookSaving] = useState(false);

  const handleCreateBook = async () => {
    if (!bookEnText.trim()) {
      setBookResultMsg("등록할 영어 원서 본문을 입력해 주세요.");
      return;
    }
    setBookSaving(true);
    setBookResultMsg("");
    try {
      const endpoint = editingBookId ? "/api/books/update" : "/api/books/create";
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingBookId || undefined,
          title: bookTitle.trim() || `New Storybook #${books.length + 1}`,
          subtitle_kr: bookSubKr.trim() || "신규 등록 영어 원서",
          level: bookLevel,
          grade_recommended: bookGrade.trim() || "초등 전학년",
          full_text: bookEnText.trim(),
          korean_text: bookKrText.trim()
        })
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        onDataUpdated({ books: data.books });
        if (!editingBookId) {
          setBookTitle("");
          setBookSubKr("");
          setBookEnText("");
          setBookKrText("");
        }
        setBookResultMsg(
          `${editingBookId ? "수정" : "신규 등록"} 완료: 《${data.book.title}》 (${data.book.level}) · 단어 ${
            (data.book.vocab || []).length
          }개, 문장 해석 ${(data.book.sentence_translations || []).length}개, 스피킹 질문 ${
            (data.book.speaking_questions || []).length
          }개가 저장되었습니다.`
        );
        playSoftTone(820, 0.18);
      } else {
        setBookResultMsg(data.error || "원서 저장에 실패했습니다.");
      }
    } catch {
      setBookResultMsg("저장 요청 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setBookSaving(false);
    }
  };

  const handleSelectBookForEdit = (b: Book) => {
    setEditingBookId(b.id);
    setBookTitle(b.title);
    setBookSubKr(b.subtitle_kr || "");
    setBookLevel(b.level || "Level 2");
    setBookGrade(b.grade_recommended || "초등 1~3학년");
    setBookEnText(b.full_text || "");
    setBookKrText((b.sentence_translations || []).map((st) => st.kr).join("\n"));
    setBookResultMsg(`《${b.title}》 교재를 수정 모드로 불러왔습니다.`);
    playSoftTone(600, 0.1);
  };

  const handleResetNewBookMode = () => {
    setEditingBookId(null);
    setBookTitle("");
    setBookSubKr("");
    setBookEnText("");
    setBookKrText("");
    setBookResultMsg("");
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">원서 교재 등록 및 관리</h2>
        <p className="text-sm text-slate-500 mt-1">
          수업에 사용할 영어 원서 본문과 문장별 한국어 해석을 등록합니다. 등록 즉시 학생 배정 목록에 반영됩니다.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">
        <div className="lg:col-span-3 pt-4 border-t border-[#e5dcc9] space-y-4">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-base font-bold text-slate-900">
              {editingBookId ? "기존 원서 교재 수정" : "신규 원서 교재 등록"}
            </h3>
            {editingBookId && (
              <button
                type="button"
                onClick={handleResetNewBookMode}
                className="text-xs font-bold px-3 py-1 rounded-full bg-[#f2ece1] hover:bg-[#e8dfd1] text-slate-700"
              >
                + 새 교재 등록 모드로 전환
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">원서 영어 제목</label>
              <input
                type="text"
                value={bookTitle}
                onChange={(e) => setBookTitle(e.target.value)}
                placeholder="예: Popo and the Shining Starfish"
                className="w-full px-3 py-2 rounded-lg bg-[#fbf8f2]/80 border border-[#e5dcc9] focus:outline-none focus:border-slate-500 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">한국어 부제</label>
              <input
                type="text"
                value={bookSubKr}
                onChange={(e) => setBookSubKr(e.target.value)}
                placeholder="예: 포포와 빛나는 불가사리"
                className="w-full px-3 py-2 rounded-lg bg-[#fbf8f2]/80 border border-[#e5dcc9] focus:outline-none focus:border-slate-500 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">권장 레벨</label>
              <select
                value={bookLevel}
                onChange={(e) => setBookLevel(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-[#fbf8f2]/80 border border-[#e5dcc9] focus:outline-none focus:border-slate-500 text-sm"
              >
                {ALL_BADA_LEVELS.map((lv) => (
                  <option key={lv} value={lv}>
                    {lv}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">권장 학년</label>
              <input
                type="text"
                value={bookGrade}
                onChange={(e) => setBookGrade(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-[#fbf8f2]/80 border border-[#e5dcc9] focus:outline-none focus:border-slate-500 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">영어 원서 본문</label>
            <textarea
              rows={5}
              value={bookEnText}
              onChange={(e) => setBookEnText(e.target.value)}
              placeholder="등록할 영어 원서 전체 문장을 입력하세요..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#fbf8f2]/80 border border-[#e5dcc9] focus:outline-none focus:border-slate-500 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">
              문장별 한국어 해석 (선택 입력 — 비워두면 자동 생성되며, 외부 LLM API 연동 시 정밀 번역됩니다)
            </label>
            <textarea
              rows={4}
              value={bookKrText}
              onChange={(e) => setBookKrText(e.target.value)}
              placeholder="문장별 한국어 해석을 줄바꿈으로 입력하세요 (선택)"
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#fbf8f2]/80 border border-[#e5dcc9] focus:outline-none focus:border-slate-500 text-sm"
            />
          </div>

          <button
            type="button"
            onClick={handleCreateBook}
            disabled={bookSaving}
            className="px-5 py-2.5 rounded-full btn-slate-glass text-sm font-bold disabled:opacity-60"
          >
            {bookSaving
              ? "저장 및 AI 분석 중..."
              : editingBookId
                ? "수정 내용 저장하기"
                : "신규 원서 등록하기"}
          </button>

          {bookResultMsg && (
            <p className="text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
              {bookResultMsg}
            </p>
          )}
        </div>

        <div className="lg:col-span-2 lg:border-l lg:border-[#e5dcc9] lg:pl-6 pt-4 border-t border-[#e5dcc9] space-y-3">
          <div className="flex items-baseline justify-between">
            <h3 className="text-base font-bold text-slate-900">등록된 원서 교재 목록</h3>
            <span className="text-[11px] text-slate-500">누르면 내용 확인·수정 가능</span>
          </div>

          <div className="flex flex-wrap gap-1.5 pb-1">
            {["ALL", ...ALL_BADA_LEVELS].map((lv) => {
              const count =
                lv === "ALL"
                  ? books.length
                  : books.filter((b) => b.level === lv).length;
              if (lv !== "ALL" && count === 0) return null;
              const active = bookLevelFilter === lv;
              return (
                <button
                  key={lv}
                  type="button"
                  onClick={() => setBookLevelFilter(lv)}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-bold transition ${
                    active
                      ? "btn-slate-glass"
                      : "bg-[#f2ece1] hover:bg-[#e8dfd1] text-slate-700"
                  }`}
                >
                  {lv === "ALL" ? `전체 (${count})` : `${lv} (${count})`}
                </button>
              );
            })}
          </div>

          <div className="divide-y divide-[#e5dcc9] border-y border-[#e5dcc9] max-h-[540px] overflow-y-auto pr-1">
            {books
              .filter((b) => bookLevelFilter === "ALL" || b.level === bookLevelFilter)
              .map((b) => {
                const sCount = getBookSentences(b).length;
                const isEditing = editingBookId === b.id;
                return (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => handleSelectBookForEdit(b)}
                    className={`w-full text-left py-3 px-2 flex items-center gap-3.5 transition ${
                      isEditing ? "bg-sky-50/80 border-l-4 border-sky-600 pl-3" : "hover:bg-[#f4efe5]/70"
                    }`}
                  >
                    <BookCover book={b} size="sm" />
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <strong className="text-sm text-slate-900 truncate">{b.title}</strong>
                        <span className="text-[11px] font-bold text-sky-700 shrink-0">
                          {b.level}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 truncate">{b.subtitle_kr}</div>
                      <div className="text-[11px] text-slate-400">
                        문장 {sCount}개 · 단어 {(b.vocab || []).length}개 · 질문{" "}
                        {(b.speaking_questions || []).length}개
                      </div>
                    </div>
                  </button>
                );
              })}
          </div>
        </div>
      </div>
    </div>
  );
};

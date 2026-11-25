import React, { useState } from "react";
import { BookOpen, RefreshCw, Search } from "lucide-react";
import type { Book, StudentUser } from "../../types";
import { ALL_BADA_LEVELS } from "../../utils/bookHelpers";
import { getBookLevelRank } from "./worksheetThemes";
import {
  printBookWorksheetHtml,
  type WorksheetNameMode,
  type WorksheetPrintMode
} from "./worksheetPrinter";

interface TeacherWorksheetsTabProps {
  users: StudentUser[];
  books: Book[];
  currentUser?: StudentUser;
  currentBook?: Book;
  onSelectStudent: (userId: string) => void;
  onDataUpdated: (payload: { books?: Book[] }) => void;
}

export const TeacherWorksheetsTab: React.FC<TeacherWorksheetsTabProps> = ({
  users,
  books,
  currentUser,
  currentBook,
  onSelectStudent,
  onDataUpdated
}) => {
  const [bookLevelFilter, setBookLevelFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [nameMode, setNameMode] = useState<WorksheetNameMode>("none");
  const [worksheetLoading, setWorksheetLoading] = useState<string | null>(null);
  const [regeneratingBookId, setRegeneratingBookId] = useState<string | null>(null);

  const markBookHasWorksheets = (targetBookId: string) => {
    onDataUpdated({
      books: books.map((item) =>
        item.id === targetBookId ? { ...item, has_worksheets: true } : item
      )
    });
  };

  const handlePrintWorksheet = async (
    weekKey: WorksheetPrintMode,
    targetBook: Book | undefined = currentBook,
    forceRegenerate = false
  ) => {
    if (!targetBook) return;
    const preWin = window.open("", "_blank", "width=1060,height=920");
    if (preWin) {
      preWin.document.write(
        `<!doctype html><html lang="ko"><head><meta charset="utf-8"><title>준비 중...</title></head>` +
          `<body style="font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:90vh;color:#334155;">` +
          `<div style="text-align:center;"><div style="font-size:18px;font-weight:700;margin-bottom:6px;">활동지를 준비하고 있습니다...</div>` +
          `<div style="font-size:13px;color:#64748b;">《${targetBook.title}》 데이터를 불러오는 중입니다.</div></div></body></html>`
      );
    }

    setWorksheetLoading(`${targetBook.id}:${weekKey}`);
    try {
      const res = await fetch("/api/books/worksheets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookId: targetBook.id, force: forceRegenerate })
      });
      const data = await res.json();
      if (!res.ok || !data.ok || !data.worksheets) {
        if (preWin && !preWin.closed) preWin.close();
        return;
      }
      if (!targetBook.has_worksheets || data.has_worksheets) {
        markBookHasWorksheets(targetBook.id);
      }

      printBookWorksheetHtml({
        weekKey,
        targetBook,
        worksheets: data.worksheets,
        pageIllustrations: Array.isArray(data.page_illustrations)
          ? data.page_illustrations
          : targetBook.page_illustrations || [],
        studentName: currentUser?.name || "학생",
        nameMode,
        preOpenedWindow: preWin
      });
    } catch (_) {
      if (preWin && !preWin.closed) preWin.close();
    } finally {
      setWorksheetLoading(null);
    }
  };

  const handleRegenerateWorksheets = async (targetBook: Book) => {
    setRegeneratingBookId(targetBook.id);
    try {
      const res = await fetch("/api/books/worksheets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookId: targetBook.id, force: true })
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        markBookHasWorksheets(targetBook.id);
      }
    } finally {
      setRegeneratingBookId(null);
    }
  };

  const qLower = searchQuery.trim().toLowerCase();
  const filteredBooks = books.filter((b) => {
    if (bookLevelFilter !== "ALL" && b.level !== bookLevelFilter) return false;
    if (!qLower) return true;
    return (
      b.title.toLowerCase().includes(qLower) ||
      (b.subtitle_kr || "").toLowerCase().includes(qLower)
    );
  });

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[#e5dcc9]">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">오프라인 학습지 관리</h2>
          <p className="text-sm text-slate-600 mt-1">
            주차별 1~5일차 활동지 또는 표지·원서 본문·4주 워크시트가 합쳐진 한 달 활동책을 PDF로 인쇄할 수 있습니다.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="inline-flex rounded-xl bg-[#f2ece1] p-1 border border-[#e5dcc9]">
            {(
              [
                { id: "none", label: "이름 표시 안 함" },
                { id: "blank", label: "빈 이름 칸" },
                { id: "student", label: "학생 이름 넣기" }
              ] as { id: WorksheetNameMode; label: string }[]
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setNameMode(opt.id)}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition ${
                  nameMode === opt.id
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {nameMode === "student" && (
            <select
              id="wsStudentSelect"
              value={currentUser?.id || ""}
              onChange={(e) => onSelectStudent(e.target.value)}
              className="px-3.5 py-2 rounded-xl bg-[#fbf8f2]/80 border border-[#e5dcc9] focus:outline-none focus:border-slate-500 text-xs font-semibold text-slate-900"
            >
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.level})
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5">
          {["ALL", ...ALL_BADA_LEVELS].map((lv) => {
            const count =
              lv === "ALL" ? books.length : books.filter((b) => b.level === lv).length;
            if (lv !== "ALL" && count === 0) return null;
            const active = bookLevelFilter === lv;
            return (
              <button
                key={lv}
                type="button"
                onClick={() => setBookLevelFilter(lv)}
                className={`px-3 py-1 rounded-full text-xs font-bold transition ${
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

        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="원서 제목·한글 부제 검색..."
            className="w-full pl-8 pr-3 py-1.5 rounded-full bg-[#fbf8f2]/90 border border-[#e5dcc9] focus:outline-none focus:border-slate-500 text-xs font-semibold text-slate-800 placeholder:text-slate-400"
          />
        </div>
      </div>

      <div className="overflow-x-auto border-y border-[#e5dcc9]">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-[#e5dcc9] text-[11px] font-bold text-slate-500 uppercase">
              <th className="py-3 pr-3">레벨 · 원서명</th>
              <th className="py-3 px-2">생성 상태</th>
              <th className="py-3 pl-2 text-right">학습지 · 한 달 활동책 인쇄 (PDF)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#e5dcc9]">
            {filteredBooks.map((b) => {
                const hasCached = Boolean(b.has_worksheets || b.worksheets?.week1);
                const isIntegratedBookLevel = getBookLevelRank(b.level) <= 5;
                return (
                  <tr key={b.id} className="hover:bg-[#f4efe5]/55 transition">
                    <td className="py-3.5 pr-3 align-top">
                      <div className="text-[11px] font-bold text-slate-500">{b.level}</div>
                      <div className="text-sm font-bold text-slate-900">{b.title}</div>
                      <div className="text-xs text-slate-500">{b.subtitle_kr}</div>
                    </td>
                    <td className="py-3.5 px-2 whitespace-nowrap align-top">
                      <div className="inline-flex items-center gap-1.5">
                        <span
                          className={`inline-block text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                            hasCached
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : "bg-[#f2ece1] text-slate-600"
                          }`}
                        >
                          {hasCached ? "DB 저장됨" : "첫 인쇄 시 생성"}
                        </span>
                        <button
                          type="button"
                          title="새 버전으로 활동지 다시 생성"
                          disabled={regeneratingBookId !== null || worksheetLoading !== null}
                          onClick={() => void handleRegenerateWorksheets(b)}
                          className="p-1.5 rounded-full text-slate-500 hover:text-slate-900 hover:bg-[#ede6d8] transition disabled:opacity-40"
                        >
                          <RefreshCw
                            className={`w-3.5 h-3.5 ${
                              regeneratingBookId === b.id ? "animate-spin" : ""
                            }`}
                          />
                        </button>
                      </div>
                    </td>
                    <td className="py-3.5 pl-2 text-right">
                      <div className="flex flex-col items-end gap-1.5">
                        <div className="inline-flex flex-wrap justify-end gap-1.5">
                          {(
                            [
                              { key: "week1", label: "1주차 (1~5일)" },
                              { key: "week2", label: "2주차 (1~5일)" },
                              { key: "week3", label: "3주차 (1~5일)" },
                              { key: "week4", label: "4주차 (1~5일)" }
                            ] as { key: WorksheetPrintMode; label: string }[]
                          ).map((wk) => (
                            <button
                              key={wk.key}
                              type="button"
                              onClick={() => void handlePrintWorksheet(wk.key, b)}
                              disabled={worksheetLoading !== null}
                              className="px-3 py-1.5 rounded-full bg-[#f2ece1] hover:bg-[#e8dfd1] text-slate-800 text-xs font-bold transition disabled:opacity-50"
                            >
                              {worksheetLoading === `${b.id}:${wk.key}` ? "준비 중..." : wk.label}
                            </button>
                          ))}
                        </div>

                        <div className="inline-flex flex-wrap justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => void handlePrintWorksheet("book_single", b)}
                            disabled={worksheetLoading !== null}
                            className={`px-3.5 py-1.5 rounded-full text-xs font-bold inline-flex items-center gap-1 transition disabled:opacity-50 ${
                              isIntegratedBookLevel
                                ? "bg-sky-50 hover:bg-sky-100 text-sky-900 border border-sky-200"
                                : "bg-[#f2ece1] hover:bg-[#e8dfd1] text-slate-800"
                            }`}
                          >
                            <BookOpen className="w-3.5 h-3.5" />
                            {worksheetLoading === `${b.id}:book_single`
                              ? "책 생성 중..."
                              : "한 달 활동책 (1p씩)"}
                          </button>
                          <button
                            type="button"
                            onClick={() => void handlePrintWorksheet("book_booklet", b)}
                            disabled={worksheetLoading !== null}
                            className="px-3.5 py-1.5 rounded-full btn-slate-glass text-xs font-bold inline-flex items-center gap-1 disabled:opacity-50"
                          >
                            <BookOpen className="w-3.5 h-3.5" />
                            {worksheetLoading === `${b.id}:book_booklet`
                              ? "소책자 배열 중..."
                              : "반접기 소책자 (A5)"}
                          </button>
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

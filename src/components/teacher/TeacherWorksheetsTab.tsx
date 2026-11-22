import React, { useState } from "react";
import type { Book, StudentUser } from "../../types";
import { ALL_BADA_LEVELS } from "../../utils/bookHelpers";
import { printBookWorksheetHtml, type WorksheetWeekKey } from "./worksheetPrinter";

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
  const [worksheetLoading, setWorksheetLoading] = useState<string | null>(null);

  const handlePrintWorksheet = async (
    weekKey: WorksheetWeekKey,
    targetBook: Book | undefined = currentBook
  ) => {
    if (!targetBook) return;
    setWorksheetLoading(`${targetBook.id}:${weekKey}`);
    try {
      const res = await fetch("/api/books/worksheets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookId: targetBook.id })
      });
      const data = await res.json();
      if (!res.ok || !data.ok || !data.worksheets) return;
      if (data.books) onDataUpdated({ books: data.books });

      printBookWorksheetHtml({
        weekKey,
        targetBook,
        worksheets: data.worksheets,
        studentName: currentUser?.name || "학생"
      });
    } finally {
      setWorksheetLoading(null);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[#e5dcc9]">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">오프라인 학습지 관리</h2>
          <p className="text-sm text-slate-600 mt-1">
            원서별로 생성된 저학년용 4선 줄노트 학습지를 목록에서 바로 확인하고 PDF로 인쇄할 수 있습니다.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <label htmlFor="wsStudentSelect" className="text-xs font-bold text-slate-600">
            이름 표기 학생
          </label>
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
        </div>
      </div>

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

      <div className="overflow-x-auto border-y border-[#e5dcc9]">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-[#e5dcc9] text-[11px] font-bold text-slate-500 uppercase">
              <th className="py-3 pr-3">레벨 · 원서명</th>
              <th className="py-3 px-2">생성 상태</th>
              <th className="py-3 pl-2 text-right">학습지 인쇄 (PDF)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#e5dcc9]">
            {books
              .filter((b) => bookLevelFilter === "ALL" || b.level === bookLevelFilter)
              .map((b) => {
                const hasCached = Boolean(b.has_worksheets || b.worksheets?.week1);
                return (
                  <tr key={b.id} className="hover:bg-[#f4efe5]/55 transition">
                    <td className="py-3.5 pr-3">
                      <div className="text-[11px] font-bold text-slate-500">{b.level}</div>
                      <div className="text-sm font-bold text-slate-900">{b.title}</div>
                      <div className="text-xs text-slate-500">{b.subtitle_kr}</div>
                    </td>
                    <td className="py-3.5 px-2 whitespace-nowrap">
                      <span
                        className={`inline-block text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                          hasCached
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-[#f2ece1] text-slate-600"
                        }`}
                      >
                        {hasCached ? "DB 저장됨" : "첫 인쇄 시 생성"}
                      </span>
                    </td>
                    <td className="py-3.5 pl-2 text-right">
                      <div className="inline-flex flex-wrap justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => handlePrintWorksheet("week1", b)}
                          disabled={worksheetLoading !== null}
                          className="px-3 py-1.5 rounded-full bg-[#f2ece1] hover:bg-[#e8dfd1] text-slate-800 text-xs font-bold transition disabled:opacity-50"
                        >
                          {worksheetLoading === `${b.id}:week1` ? "생성 중..." : "1주차 그림자"}
                        </button>
                        <button
                          type="button"
                          onClick={() => handlePrintWorksheet("week2", b)}
                          disabled={worksheetLoading !== null}
                          className="px-3 py-1.5 rounded-full bg-[#f2ece1] hover:bg-[#e8dfd1] text-slate-800 text-xs font-bold transition disabled:opacity-50"
                        >
                          {worksheetLoading === `${b.id}:week2` ? "생성 중..." : "2주차 그림자"}
                        </button>
                        <button
                          type="button"
                          onClick={() => handlePrintWorksheet("week3_4_study", b)}
                          disabled={worksheetLoading !== null}
                          className="px-3 py-1.5 rounded-full bg-[#f2ece1] hover:bg-[#e8dfd1] text-slate-800 text-xs font-bold transition disabled:opacity-50"
                        >
                          {worksheetLoading === `${b.id}:week3_4_study` ? "생성 중..." : "3·4주차 보고쓰기"}
                        </button>
                        <button
                          type="button"
                          onClick={() => handlePrintWorksheet("week3_4_test", b)}
                          disabled={worksheetLoading !== null}
                          className="px-3 py-1.5 rounded-full btn-slate-glass text-xs font-bold disabled:opacity-50"
                        >
                          {worksheetLoading === `${b.id}:week3_4_test` ? "생성 중..." : "3·4주차 안보고쓰기"}
                        </button>
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

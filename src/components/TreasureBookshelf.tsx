import React, { useMemo, useState } from "react";
import { Volume2, X } from "lucide-react";
import type { Book, StudentUser } from "../types";
import { splitBookIntoContextPages } from "../utils/bookHelpers";
import { speakEnglish } from "../utils/speech";
import { BookCover } from "./BookCover";

interface TreasureBookshelfProps {
  user: StudentUser;
  books: Book[];
  onGoToHome: () => void;
}

export const TreasureBookshelf: React.FC<TreasureBookshelfProps> = ({
  user,
  books,
  onGoToHome
}) => {
  const completedBooks = useMemo(() => {
    const idSet = new Set<string>(user.completed_books || []);
    if ((user.progress_w4 || 0) >= 100 && user.current_book_id) {
      idSet.add(user.current_book_id);
    }
    return books.filter((b) => idSet.has(b.id));
  }, [user, books]);

  const [readingBook, setReadingBook] = useState<Book | null>(null);

  const spreads = useMemo(() => {
    if (!readingBook) return [];
    return splitBookIntoContextPages(readingBook);
  }, [readingBook]);

  return (
    <div className="space-y-8">
      {/* Header strip */}
      <div className="pb-5 border-b border-[#e8dfd1] flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-slate-900">
            {user.name} 대원의 보물창고 책장
          </h2>
          <p className="text-sm text-slate-600 mt-1">
            4주차까지 완주한 영어 원서들이 소중한 보물처럼 보관됩니다. 원서를 클릭하면 e-book으로 스크롤하며 다시 읽을 수 있어요.
          </p>
        </div>
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-100/80 border border-amber-200 text-xs font-bold text-amber-950">
          완주한 원서 {completedBooks.length}권
        </div>
      </div>

      {/* Bookshelf Content */}
      {completedBooks.length === 0 ? (
        <div className="py-16 px-6 rounded-3xl border border-dashed border-[#d8ceb8] bg-[#fdfaf2]/70 text-center space-y-4">
          <img
            src="/assets/treasure-pearl-3d.jpg"
            alt="보물창고"
            className="w-20 h-20 rounded-2xl object-cover mx-auto border border-amber-200 shadow-sm"
          />
          <div className="space-y-1.5 max-w-md mx-auto">
            <h3 className="text-base font-bold text-slate-900">
              아직 보물창고 책장이 비어 있어요
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              지금 학습 중인 원서를 4주차까지 완주하면 이곳 보물창고 책장에 예쁘게 보관되어 언제든 e-book처럼 다시 꺼내 읽을 수 있습니다.
            </p>
          </div>
          <button
            type="button"
            onClick={onGoToHome}
            className="px-6 py-2.5 rounded-full btn-water-glass text-xs font-bold"
          >
            학습 맵으로 돌아가기
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Wooden / Ocean Bookshelf Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {completedBooks.map((book) => (
              <button
                key={book.id}
                type="button"
                onClick={() => setReadingBook(book)}
                className="group text-left rounded-2xl p-4 bg-[#fdfaf2]/85 border border-[#e5dcc9] hover:border-sky-400 hover:shadow-lg transition-all flex flex-col gap-3 cursor-pointer"
              >
                <div className="relative">
                  <BookCover book={book} size="md" />
                  <span className="absolute top-2.5 right-2.5 px-2.5 py-0.5 rounded-full bg-emerald-600 text-white text-[10px] font-bold shadow-xs">
                    4주 완주
                  </span>
                </div>
                <div className="space-y-1">
                  <div className="text-[11px] font-bold text-sky-700">{book.level}</div>
                  <div className="text-sm font-bold text-slate-900 group-hover:text-sky-700 transition line-clamp-1">
                    {book.title}
                  </div>
                  <div className="text-xs text-slate-500 line-clamp-1">
                    {book.subtitle_kr}
                  </div>
                </div>
                <div className="pt-2 border-t border-[#ece4d3] flex items-center justify-between text-[11px] font-bold text-sky-700">
                  <span>e-book으로 읽기</span>
                  <span>열기 →</span>
                </div>
              </button>
            ))}
          </div>
          {/* Bookshelf ledge accent */}
          <div className="h-3 rounded-full bg-gradient-to-b from-[#d8c8ad] to-[#bfa984] shadow-inner opacity-80" />
        </div>
      )}

      {/* E-Book Vertical Scroll Reader Modal */}
      {readingBook && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/65 backdrop-blur-sm flex items-center justify-center p-3 md:p-6"
          onClick={() => setReadingBook(null)}
        >
          <div
            className="w-full max-w-4xl h-[90vh] rounded-3xl bg-[#fdfaf2] border border-[#e5dcc9] shadow-2xl flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* E-book Top Bar */}
            <div className="px-5 py-3.5 bg-[#f7f2e7] border-b border-[#e5dcc9] flex items-center justify-between gap-3 shrink-0">
              <div>
                <div className="text-[11px] font-bold text-sky-700">
                  {readingBook.level} · e-book 다시 읽기
                </div>
                <h3 className="text-base md:text-lg font-bold text-slate-900">
                  {readingBook.title}
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => speakEnglish(readingBook.full_text, 0.88, 1.04)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full btn-water-glass text-xs font-bold"
                >
                  <Volume2 className="w-3.5 h-3.5" />
                  전체 듣기
                </button>
                <button
                  type="button"
                  onClick={() => setReadingBook(null)}
                  className="p-2 rounded-full hover:bg-white text-slate-600 transition"
                  aria-label="닫기"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Scrollable E-book Pages */}
            <div className="flex-1 overflow-y-auto px-5 py-6 md:px-10 md:py-8 space-y-10">
              {/* Cover Intro inside E-book */}
              <div className="max-w-sm mx-auto text-center space-y-3 pb-6 border-b border-[#ece4d3]">
                <BookCover book={readingBook} size="md" />
                <div className="text-xs font-medium text-slate-600">
                  {readingBook.subtitle_kr}
                </div>
              </div>

              {/* All Spreads Rendered Vertically for Scroll Reading */}
              {spreads.map((spread) => {
                const ill = readingBook.page_illustrations?.find(
                  (p) => p.page_index === spread.pageIndex
                );
                return (
                  <article
                    key={spread.pageIndex}
                    className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center pb-8 border-b border-[#ece4d3] last:border-b-0"
                  >
                    <div className="rounded-2xl overflow-hidden bg-[#f7f2e7] border border-[#e5dcc9] aspect-[4/3] flex items-center justify-center">
                      {ill?.image_url ? (
                        <img
                          src={ill.image_url}
                          alt={ill.scene_caption_kr || `${readingBook.title} ${spread.pageIndex + 1}쪽`}
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <span className="text-xs text-stone-400">
                          {spread.pageIndex + 1}쪽 삽화
                        </span>
                      )}
                    </div>

                    <div className="space-y-4">
                      <div className="text-[11px] font-bold text-stone-400">
                        PAGE {spread.pageIndex + 1}
                      </div>
                      {spread.sentences.map((s) => (
                        <div key={s.sentenceIndex} className="space-y-1">
                          <div className="flex items-start justify-between gap-2">
                            <p className="book-serif text-lg md:text-xl font-semibold text-slate-900 leading-relaxed">
                              {s.en}
                            </p>
                            <button
                              type="button"
                              onClick={() => speakEnglish(s.en, 0.88, 1.04)}
                              className="shrink-0 p-1.5 rounded-full hover:bg-[#f2ece1] text-sky-700 transition"
                              title="문장 듣기"
                            >
                              <Volume2 className="w-4 h-4" />
                            </button>
                          </div>
                          {s.kr && (
                            <p className="text-xs md:text-sm text-slate-600 leading-relaxed">
                              {s.kr}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

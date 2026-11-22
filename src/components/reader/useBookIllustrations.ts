import { useEffect, useState } from "react";
import type { Book, PageIllustration } from "../../types";

const illustrationCache = new Map<string, PageIllustration[]>();

/**
 * Lazy-loads page illustrations for a book on demand (so `/api/bootstrap` stays fast and lightweight)
 * and caches results in memory keyed by `book.id:text_hash`.
 */
export function useBookIllustrations(book?: Book | null): PageIllustration[] {
  const cacheKey = book ? `${book.id}:${book.text_hash || ""}` : "";
  const [illustrations, setIllustrations] = useState<PageIllustration[]>(() => {
    if (!book) return [];
    if (book.page_illustrations?.length) return book.page_illustrations;
    return illustrationCache.get(cacheKey) || [];
  });

  useEffect(() => {
    if (!book) {
      setIllustrations([]);
      return;
    }

    if (book.page_illustrations?.length) {
      illustrationCache.set(cacheKey, book.page_illustrations);
      setIllustrations(book.page_illustrations);
      return;
    }

    const cached = illustrationCache.get(cacheKey);
    if (cached) {
      setIllustrations(cached);
      return;
    }

    let cancelled = false;
    setIllustrations([]);

    fetch(`/api/books/illustrations?bookId=${encodeURIComponent(book.id)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled) return;
        const list = Array.isArray(data?.page_illustrations) ? data.page_illustrations : [];
        illustrationCache.set(cacheKey, list);
        setIllustrations(list);
      })
      .catch(() => {
        if (!cancelled) setIllustrations([]);
      });

    return () => {
      cancelled = true;
    };
  }, [book?.id, book?.text_hash, book?.page_illustrations, cacheKey]);

  return illustrations;
}

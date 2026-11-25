import type {
  Book,
  BookWorksheets,
  PageIllustration,
  WorksheetChunkItem,
  WorksheetPatternSwap,
  WorksheetSentenceItem,
  WorksheetVocabItem
} from "../../types";
import { getBookSentences, splitBookIntoContextPages } from "../../utils/bookHelpers";
import { buildBookletImpositionHtml } from "./worksheetBooklet";
import {
  CALIBRATION_SCRIPT_SNIPPET,
  escHtml,
  renderRuledSvgBlock
} from "./worksheetRuledSvg";
import {
  getBookLevelRank,
  getWorksheetTheme,
  type WorksheetTheme
} from "./worksheetThemes";

export type WorksheetPrintMode =
  | "week1"
  | "week2"
  | "week3"
  | "week4"
  | "book_single"
  | "book_booklet"
  // Legacy compatibility keys mapped cleanly
  | "week3_4_study"
  | "week3_4_test";

export type WorksheetWeekKey = WorksheetPrintMode;
export type WorksheetNameMode = "none" | "blank" | "student";

export interface PrintBookWorksheetOptions {
  weekKey: WorksheetPrintMode;
  targetBook: Book;
  worksheets: BookWorksheets;
  pageIllustrations?: PageIllustration[];
  studentName?: string;
  nameMode?: WorksheetNameMode;
  assetOrigin?: string;
  preOpenedWindow?: Window | null;
}

function toAssetUrl(url: string | null | undefined, origin: string): string {
  const raw = String(url || "").trim();
  if (!raw) return "";
  if (raw.startsWith("http://") || raw.startsWith("https://") || raw.startsWith("data:")) {
    return raw;
  }
  const cleanOrigin = origin.replace(/\/+$/, "");
  if (!cleanOrigin) return raw;
  return `${cleanOrigin}${raw.startsWith("/") ? raw : `/${raw}`}`;
}

function rotateArray<T>(arr: T[], shift: number): T[] {
  if (arr.length <= 1) return [...arr];
  const s = ((shift % arr.length) + arr.length) % arr.length;
  return [...arr.slice(s), ...arr.slice(0, s)];
}

function shuffleChoicesDeterministic(options: string[], seedIdx: number): string[] {
  const unique: string[] = [];
  const seen = new Set<string>();
  for (const o of options) {
    const clean = String(o || "").trim();
    if (!clean) continue;
    const k = clean.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    unique.push(clean);
  }
  return rotateArray(unique, seedIdx + 1);
}

function renderVocabThumb(
  imgUrl: string | null | undefined,
  alt: string,
  origin: string,
  sizePx = 48
): string {
  const abs = toAssetUrl(imgUrl, origin);
  if (!abs) {
    return "";
  }
  return `<img class="vocab-thumb" src="${escHtml(abs)}" alt="${escHtml(alt)}" style="width:${sizePx}px;height:${sizePx}px;" />`;
}

function extractNormalizedData(targetBook: Book, ws: BookWorksheets) {
  const sentences = getBookSentences(targetBook);

  const vocabItems: WorksheetVocabItem[] =
    Array.isArray(ws.vocab_items) && ws.vocab_items.length
      ? ws.vocab_items
      : (ws.week1?.vocab_test || targetBook.vocab || []).slice(0, 8).map((v: any, idx) => {
          const word = String(v.word || v.surface || "").trim();
          const mid = Math.max(0, Math.floor(word.length / 2));
          return {
            word,
            meaning_kr: String(v.meaning_kr || word),
            phonics_hint: String(v.hint || v.phonetic || ""),
            missing_word:
              word.length >= 2
                ? `${word.slice(0, mid)}_${word.slice(mid + 1)}`
                : word,
            missing_answer: word[mid] || word[0] || "",
            distractors: [idx % 2 === 0 ? "star" : "blue", idx % 2 === 0 ? "moon" : "happy"],
            image_url: v.image_url || null
          };
        });

  const chunkItems: WorksheetChunkItem[] =
    Array.isArray(ws.chunk_items) && ws.chunk_items.length
      ? ws.chunk_items
      : (ws.week2?.chunk_writing || targetBook.chunks || []).slice(0, 6).map((c: any) => {
          const en = String(c.en || c.text || "").trim();
          const kr = String(c.kr || c.meaning_kr || "").trim();
          const toks = en.split(/\s+/).filter(Boolean);
          const ans = (toks[toks.length - 1] || "").replace(/[^a-zA-Z0-9'-]/g, "");
          return {
            en,
            kr,
            daily_kr: kr,
            scrambled_words: toks.length > 1 ? [...toks.slice(1), toks[0]] : toks,
            blank_en: toks.map((t, ti) => (ti === toks.length - 1 ? "______" : t)).join(" "),
            blank_answer: ans
          };
        });

  const sentenceItems: WorksheetSentenceItem[] =
    Array.isArray(ws.sentence_items) && ws.sentence_items.length
      ? ws.sentence_items
      : sentences.slice(0, 8).map((en, idx) => {
          const kr = targetBook.sentence_translations?.[idx]?.kr || "";
          const toks = en.split(/\s+/).filter(Boolean);
          const mid = Math.max(0, Math.floor(toks.length / 2));
          const ans = (toks[mid] || "").replace(/[^a-zA-Z0-9'-]/g, "");
          return {
            page_index: idx,
            en,
            kr,
            daily_kr: kr,
            scrambled_chunks:
              toks.length >= 4
                ? [toks.slice(mid).join(" "), toks.slice(0, mid).join(" ")]
                : [en],
            blank_sentence: toks.map((t, ti) => (ti === mid ? "______" : t)).join(" "),
            blank_answer: ans
          };
        });

  const tfItems =
    Array.isArray(ws.true_false_items) && ws.true_false_items.length
      ? ws.true_false_items
      : [
          {
            statement_kr: `이 이야기의 제목은 《${targetBook.title}》입니다.`,
            statement_en: `The story is "${targetBook.title}".`,
            answer: "O" as const
          },
          {
            statement_kr: sentenceItems[0]?.kr || "주인공 친구들이 즐겁게 모험합니다.",
            answer: "O" as const
          },
          {
            statement_kr: "이 책에는 영어 문장이 하나도 나오지 않아요.",
            statement_en: "There are no English words in this book.",
            answer: "X" as const
          },
          {
            statement_kr: sentenceItems[1]?.kr || "이야기 속 배경과 친구들을 기억해 보세요.",
            answer: "O" as const
          }
        ];

  const patternSwaps: WorksheetPatternSwap[] =
    Array.isArray(ws.pattern_swaps) && ws.pattern_swaps.length
      ? ws.pattern_swaps
      : [
          {
            base_en: sentenceItems[0]?.en || targetBook.title,
            base_kr: sentenceItems[0]?.kr || targetBook.subtitle_kr || "원서 표현을 바꿔 말해요.",
            pattern_en: "I see a ______.",
            pattern_kr: "나는 ______을(를) 보아요.",
            example_en: "I see a dog.",
            example_kr: "강아지를 보아요.",
            swap_options: [
              { word: "dog", meaning_kr: "강아지" },
              { word: "cat", meaning_kr: "고양이" },
              { word: "star", meaning_kr: "별" },
              { word: "moon", meaning_kr: "달" }
            ]
          }
        ];

  const qaItems =
    Array.isArray(ws.qa_items) && ws.qa_items.length
      ? ws.qa_items
      : [
          {
            question_en: "Who is in the story?",
            question_kr: "이야기에 누가 나오나요?",
            starter_en: "I see ",
            sample_en: ""
          },
          {
            question_en: "What did you like in the story?",
            question_kr: "이야기에서 가장 기억에 남는 것은 무엇인가요?",
            starter_en: "I like ",
            sample_en: ""
          }
        ];

  const miniPrompts =
    Array.isArray(ws.mini_story_prompts) && ws.mini_story_prompts.length
      ? ws.mini_story_prompts
      : [
          {
            prompt_kr: "오늘 내가 본 멋진 장면을 영어로 써 보세요.",
            prompt_en: "Write one sentence about what you see!",
            starter_en: patternSwaps[0]?.pattern_en || "I see a ______."
          },
          {
            prompt_kr: "내가 이야기 속 주인공이 되어 한 문장을 이어 써 보세요.",
            prompt_en: "What happens next in your story?",
            starter_en: "Together, we "
          }
        ];

  return {
    vocabItems,
    chunkItems,
    sentenceItems,
    tfItems,
    patternSwaps,
    qaItems,
    miniPrompts
  };
}

function renderSheetHeader({
  bookTitle,
  weekNum,
  dayNum,
  theme,
  nameMode,
  studentName
}: {
  bookTitle: string;
  weekNum: number;
  dayNum: number;
  theme: WorksheetTheme;
  nameMode: WorksheetNameMode;
  studentName: string;
}): string {
  const nameBlock =
    nameMode === "none"
      ? `<div class="header-date">Date: ____ . __ . __</div>`
      : nameMode === "blank"
        ? `<div class="header-meta-row"><span>Name: ____________</span><span>Date: ____ . __ . __</span></div>`
        : `<div class="header-meta-row"><span>Name: <strong>${escHtml(studentName)}</strong></span><span>Date: ____ . __ . __</span></div>`;

  return `
    <header class="sheet-header" style="border-bottom-color:${theme.primary};">
      <div class="header-left">
        <span class="header-icon">${theme.headerBadgeSvg}</span>
        <div>
          <div class="header-book">${escHtml(bookTitle)}</div>
        </div>
      </div>
      <div class="header-right">
        <div class="day-pill" style="background:${theme.accentBg};color:${theme.primaryDark};border-color:${theme.softBorder};">
          Week ${weekNum} · Day ${dayNum}
        </div>
        ${nameBlock}
      </div>
    </header>`;
}

function renderSheetFooter(theme: WorksheetTheme, pageLabel: string): string {
  return `
    <footer class="sheet-footer">
      <div class="footer-motif">${theme.motifSvg}</div>
      <div class="footer-page" style="color:${theme.primaryDark};">${escHtml(pageLabel)}</div>
    </footer>`;
}

function wrapWorksheetPage({
  bookTitle,
  weekNum,
  dayNum,
  theme,
  nameMode,
  studentName,
  pageLabel,
  bodyHtml
}: {
  bookTitle: string;
  weekNum: number;
  dayNum: number;
  theme: WorksheetTheme;
  nameMode: WorksheetNameMode;
  studentName: string;
  pageLabel: string;
  bodyHtml: string;
}): string {
  return `
    <section class="sheet-page">
      ${renderSheetHeader({ bookTitle, weekNum, dayNum, theme, nameMode, studentName })}
      <div class="sheet-body">${bodyHtml}</div>
      ${renderSheetFooter(theme, pageLabel)}
    </section>`;
}

function renderMatchingColumns(
  leftItems: { labelHtml: string }[],
  rightItems: { labelHtml: string }[]
): string {
  const rightRotated = rotateArray(rightItems, 1);
  return `
    <div class="match-grid">
      <div class="match-col">
        ${leftItems
          .map(
            (it) => `
            <div class="match-card">
              <div class="match-content">${it.labelHtml}</div>
              <span class="match-dot"></span>
            </div>`
          )
          .join("")}
      </div>
      <div class="match-col">
        ${rightRotated
          .map(
            (it) => `
            <div class="match-card match-card-right">
              <span class="match-dot"></span>
              <div class="match-content">${it.labelHtml}</div>
            </div>`
          )
          .join("")}
      </div>
    </div>`;
}

function buildWeek1Pages({
  targetBook,
  data,
  theme,
  nameMode,
  studentName,
  origin
}: {
  targetBook: Book;
  data: ReturnType<typeof extractNormalizedData>;
  theme: WorksheetTheme;
  nameMode: WorksheetNameMode;
  studentName: string;
  origin: string;
}): string[] {
  const words = data.vocabItems;
  const setA = words.slice(0, 4);
  const setB = words.slice(4, 8).length >= 2 ? words.slice(4, 8) : words.slice(0, 4);
  const levelRank = getBookLevelRank(targetBook.level);
  const supportEarlyShadow = levelRank <= 3;

  // Week 1 · Day 1 (KR): 그림-단어 선 잇기 + 그림자 따라쓰기
  const day1 = wrapWorksheetPage({
    bookTitle: targetBook.title,
    weekNum: 1,
    dayNum: 1,
    theme,
    nameMode,
    studentName,
    pageLabel: "Week 1 · Day 1",
    bodyHtml: `
      <div class="q-block">
        <div class="q-title"><span class="q-num" style="background:${theme.primary};">1</span> 그림과 뜻을 보고 알맞은 영단어와 선으로 이어 보세요.</div>
        ${renderMatchingColumns(
          setA.map((w) => ({
            labelHtml: `<div class="match-left-row">${renderVocabThumb(w.image_url, w.word, origin, 42)}<span class="kr-label">${escHtml(w.meaning_kr)}</span></div>`
          })),
          setA.map((w) => ({
            labelHtml: `<span class="en-word-big">${escHtml(w.word)}</span>`
          }))
        )}
      </div>
      <div class="q-block">
        <div class="q-title"><span class="q-num" style="background:${theme.primary};">2</span> 큰 소리로 읽으며 그림자 글씨를 따라 써 보세요.</div>
        <div class="two-col">
          ${setA
            .map(
              (w) => `
              <div class="trace-card" style="border-color:${theme.softBorder};background:${theme.softBg};">
                <div class="trace-head">
                  <strong class="kr-label">${escHtml(w.meaning_kr)}</strong>
                  <span class="en-chip">${escHtml(w.word)}</span>
                </div>
                ${renderRuledSvgBlock({ text: w.word, showShadow: true, fontSize: 27, maxChars: 15, svgWidth: 260, theme })}
              </div>`
            )
            .join("")}
        </div>
      </div>`
  });

  // Week 1 · Day 2 (EN): Circle the matching word. + Read and trace.
  const day2 = wrapWorksheetPage({
    bookTitle: targetBook.title,
    weekNum: 1,
    dayNum: 2,
    theme,
    nameMode,
    studentName,
    pageLabel: "Week 1 · Day 2",
    bodyHtml: `
      <div class="q-block">
        <div class="q-title"><span class="q-num" style="background:${theme.primary};">1</span> Circle the matching word.</div>
        <div class="list-stack">
          ${setB
            .map((w, idx) => {
              const choices = shuffleChoicesDeterministic([w.word, ...(w.distractors || [])], idx);
              return `
                <div class="choice-row" style="border-color:${theme.softBorder};">
                  <div class="choice-prompt">
                    ${renderVocabThumb(w.image_url, w.word, origin, 44)}
                    <span class="kr-label">${escHtml(w.meaning_kr)}</span>
                  </div>
                  <div class="choice-pills">
                    ${choices.map((c) => `<span class="circle-opt">${escHtml(c)}</span>`).join("")}
                  </div>
                </div>`;
            })
            .join("")}
        </div>
      </div>
      <div class="q-block">
        <div class="q-title"><span class="q-num" style="background:${theme.primary};">2</span> Read and trace.</div>
        <div class="two-col">
          ${setB
            .map(
              (w) => `
              <div class="trace-card" style="border-color:${theme.softBorder};background:${theme.softBg};">
                <div class="trace-head">
                  <strong class="kr-label">${escHtml(w.meaning_kr)}</strong>
                </div>
                ${renderRuledSvgBlock({ text: w.word, showShadow: true, fontSize: 27, maxChars: 15, svgWidth: 260, theme })}
              </div>`
            )
            .join("")}
        </div>
      </div>`
  });

  // Week 1 · Day 3 (KR): 빠진 알파벳 채우기 + 따라 쓰기
  const day3Words = words.slice(0, 5);
  const day3 = wrapWorksheetPage({
    bookTitle: targetBook.title,
    weekNum: 1,
    dayNum: 3,
    theme,
    nameMode,
    studentName,
    pageLabel: "Week 1 · Day 3",
    bodyHtml: `
      <div class="q-block">
        <div class="q-title"><span class="q-num" style="background:${theme.primary};">1</span> 알맞은 알파벳을 채우고 3선 노트에 한 번 더 써 보세요.</div>
        <div class="list-stack">
          ${day3Words
            .map(
              (w) => `
              <div class="missing-row" style="border-color:${theme.softBorder};">
                <div class="missing-left">
                  ${renderVocabThumb(w.image_url, w.word, origin, 40)}
                  <div>
                    <div class="kr-label">${escHtml(w.meaning_kr)}</div>
                    <div class="missing-word">${escHtml(w.missing_word)}</div>
                  </div>
                </div>
                <div class="missing-write">
                  ${renderRuledSvgBlock({ text: w.word, showShadow: true, fontSize: 26, maxChars: 16, svgWidth: 270, theme })}
                </div>
              </div>`
            )
            .join("")}
        </div>
      </div>`
  });

  // Week 1 · Day 4 (EN): Look at the meaning and write the word.
  const day4Words = words.slice(0, 6);
  const bankWords = rotateArray(day4Words.map((w) => w.word), 2);
  const day4 = wrapWorksheetPage({
    bookTitle: targetBook.title,
    weekNum: 1,
    dayNum: 4,
    theme,
    nameMode,
    studentName,
    pageLabel: "Week 1 · Day 4",
    bodyHtml: `
      <div class="word-bank" style="background:${theme.softBg};border-color:${theme.softBorder};">
        <span class="bank-title" style="color:${theme.primaryDark};">Word Box</span>
        <div class="bank-chips">
          ${bankWords.map((bw) => `<span class="bank-chip">${escHtml(bw)}</span>`).join("")}
        </div>
      </div>
      <div class="q-block">
        <div class="q-title"><span class="q-num" style="background:${theme.primary};">1</span> Look at the picture and write the English word.</div>
        <div class="two-col">
          ${day4Words
            .map(
              (w) => `
              <div class="trace-card" style="border-color:${theme.softBorder};">
                <div class="trace-head">
                  ${renderVocabThumb(w.image_url, w.word, origin, 36)}
                  <strong class="kr-label">${escHtml(w.meaning_kr)}</strong>
                </div>
                ${renderRuledSvgBlock({
                  text: w.word,
                  showShadow: supportEarlyShadow,
                  fontSize: 26,
                  maxChars: 15,
                  svgWidth: 260,
                  theme
                })}
              </div>`
            )
            .join("")}
        </div>
      </div>`
  });

  // Week 1 · Day 5 (KR · 복습)
  const day5Match = words.slice(0, 4);
  const day5Circle = words.slice(3, 6).length ? words.slice(3, 6) : words.slice(0, 3);
  const day5 = wrapWorksheetPage({
    bookTitle: targetBook.title,
    weekNum: 1,
    dayNum: 5,
    theme,
    nameMode,
    studentName,
    pageLabel: "Week 1 · Day 5 (Review)",
    bodyHtml: `
      <div class="q-block">
        <div class="q-title"><span class="q-num" style="background:${theme.primary};">1</span> 이번 주 단어를 알맞은 뜻과 선으로 이어 보세요.</div>
        ${renderMatchingColumns(
          day5Match.map((w) => ({
            labelHtml: `<div class="match-left-row">${renderVocabThumb(w.image_url, w.word, origin, 36)}<span class="kr-label">${escHtml(w.meaning_kr)}</span></div>`
          })),
          day5Match.map((w) => ({
            labelHtml: `<span class="en-word-big">${escHtml(w.word)}</span>`
          }))
        )}
      </div>
      <div class="q-block">
        <div class="q-title"><span class="q-num" style="background:${theme.primary};">2</span> 뜻에 맞는 단어에 동그라미 ○ 해 보세요.</div>
        <div class="list-stack">
          ${day5Circle
            .map((w, idx) => {
              const opts = shuffleChoicesDeterministic([w.word, ...(w.distractors || [])], idx + 2);
              return `
                <div class="choice-row" style="border-color:${theme.softBorder};">
                  <span class="kr-label">${escHtml(w.meaning_kr)}</span>
                  <div class="choice-pills">
                    ${opts.map((c) => `<span class="circle-opt">${escHtml(c)}</span>`).join("")}
                  </div>
                </div>`;
            })
            .join("")}
        </div>
      </div>
      <div class="q-block">
        <div class="q-title"><span class="q-num" style="background:${theme.primary};">3</span> 내가 기억하는 단어 2개를 직접 써 보세요.</div>
        <div class="two-col">
          ${renderRuledSvgBlock({ text: "", showShadow: false, fontSize: 26, maxChars: 15, svgWidth: 260, theme })}
          ${renderRuledSvgBlock({ text: "", showShadow: false, fontSize: 26, maxChars: 15, svgWidth: 260, theme })}
        </div>
      </div>`
  });

  return [day1, day2, day3, day4, day5];
}

function buildWeek2Pages({
  targetBook,
  data,
  pageIllustrations,
  theme,
  nameMode,
  studentName,
  origin
}: {
  targetBook: Book;
  data: ReturnType<typeof extractNormalizedData>;
  pageIllustrations: PageIllustration[];
  theme: WorksheetTheme;
  nameMode: WorksheetNameMode;
  studentName: string;
  origin: string;
}): string[] {
  const chunks = data.chunkItems;
  const setA = chunks.slice(0, 4);
  const levelRank = getBookLevelRank(targetBook.level);
  const supportEarlyShadow = levelRank <= 3;

  // Week 2 · Day 1 (KR): 한-영 덩어리 선 잇기 + 따라 쓰기
  const day1 = wrapWorksheetPage({
    bookTitle: targetBook.title,
    weekNum: 2,
    dayNum: 1,
    theme,
    nameMode,
    studentName,
    pageLabel: "Week 2 · Day 1",
    bodyHtml: `
      <div class="q-block">
        <div class="q-title"><span class="q-num" style="background:${theme.primary};">1</span> 우리말과 같은 뜻의 영어 표현을 선으로 이어 보세요.</div>
        ${renderMatchingColumns(
          setA.map((c) => ({ labelHtml: `<span class="kr-label">${escHtml(c.daily_kr || c.kr)}</span>` })),
          setA.map((c) => ({ labelHtml: `<span class="en-chunk">${escHtml(c.en)}</span>` }))
        )}
      </div>
      <div class="q-block">
        <div class="q-title"><span class="q-num" style="background:${theme.primary};">2</span> 그림자 글씨를 따라 쓰며 소리 내어 읽어 보세요.</div>
        <div class="list-stack">
          ${setA.slice(0, 3)
            .map(
              (c) => `
              <div class="trace-card" style="border-color:${theme.softBorder};background:${theme.softBg};">
                <div class="trace-head">
                  <strong class="kr-label">${escHtml(c.daily_kr || c.kr)}</strong>
                  <span class="en-chip">${escHtml(c.en)}</span>
                </div>
                ${renderRuledSvgBlock({ text: c.en, showShadow: true, fontSize: 23, maxChars: 34, svgWidth: 540, theme })}
              </div>`
            )
            .join("")}
        </div>
      </div>`
  });

  // Week 2 · Day 2 (EN): Look at the picture. Circle the right expression. + Trace.
  const firstScene = toAssetUrl(pageIllustrations[0]?.image_url || theme.coverImageUrl, origin);
  const secondScene = toAssetUrl(
    pageIllustrations[1]?.image_url || pageIllustrations[0]?.image_url || theme.coverImageUrl,
    origin
  );
  const pairChunks = setA.slice(0, 2);
  const altChunkA = chunks[2]?.en || chunks[1]?.en || data.vocabItems[0]?.word || "";
  const altChunkB = chunks[3]?.en || chunks[0]?.en || data.vocabItems[1]?.word || "";

  const day2 = wrapWorksheetPage({
    bookTitle: targetBook.title,
    weekNum: 2,
    dayNum: 2,
    theme,
    nameMode,
    studentName,
    pageLabel: "Week 2 · Day 2",
    bodyHtml: `
      <div class="q-block">
        <div class="q-title"><span class="q-num" style="background:${theme.primary};">1</span> Look at the picture. Circle the matching English expression.</div>
        <div class="two-col">
          <div class="scene-quiz-card" style="border-color:${theme.softBorder};">
            ${
              firstScene
                ? `<img src="${escHtml(firstScene)}" alt="Scene 1" class="scene-mini-img" />`
                : `<div class="scene-mini-empty">${escHtml(pairChunks[0]?.kr || "")}</div>`
            }
            <div class="kr-caption">${escHtml(pairChunks[0]?.daily_kr || pairChunks[0]?.kr || "")}</div>
            <div class="choice-pills-col">
              <span class="circle-opt">${escHtml(pairChunks[0]?.en || "")}</span>
              <span class="circle-opt">${escHtml(altChunkA)}</span>
            </div>
          </div>
          <div class="scene-quiz-card" style="border-color:${theme.softBorder};">
            ${
              secondScene
                ? `<img src="${escHtml(secondScene)}" alt="Scene 2" class="scene-mini-img" />`
                : `<div class="scene-mini-empty">${escHtml(pairChunks[1]?.kr || "")}</div>`
            }
            <div class="kr-caption">${escHtml(pairChunks[1]?.daily_kr || pairChunks[1]?.kr || "")}</div>
            <div class="choice-pills-col">
              <span class="circle-opt">${escHtml(altChunkB)}</span>
              <span class="circle-opt">${escHtml(pairChunks[1]?.en || "")}</span>
            </div>
          </div>
        </div>
      </div>
      <div class="q-block">
        <div class="q-title"><span class="q-num" style="background:${theme.primary};">2</span> Trace the expressions.</div>
        <div class="list-stack">
          ${setA.slice(0, 3)
            .map(
              (c) => `
              <div class="trace-card" style="border-color:${theme.softBorder};background:${theme.softBg};">
                <div class="trace-head"><strong class="kr-label">${escHtml(c.daily_kr || c.kr)}</strong></div>
                ${renderRuledSvgBlock({ text: c.en, showShadow: true, fontSize: 23, maxChars: 34, svgWidth: 540, theme })}
              </div>`
            )
            .join("")}
        </div>
      </div>`
  });

  // Week 2 · Day 3 (KR): 단어 순서 맞춰 표현 쓰기
  const day3Chunks = chunks.slice(0, 3);
  const day3 = wrapWorksheetPage({
    bookTitle: targetBook.title,
    weekNum: 2,
    dayNum: 3,
    theme,
    nameMode,
    studentName,
    pageLabel: "Week 2 · Day 3",
    bodyHtml: `
      <div class="q-block">
        <div class="q-title"><span class="q-num" style="background:${theme.primary};">1</span> 섞인 단어 카드를 우리말 뜻 순서에 맞게 배열해 써 보세요.</div>
        <div class="list-stack">
          ${day3Chunks
            .map(
              (c, idx) => `
              <div class="trace-card" style="border-color:${theme.softBorder};">
                <div class="trace-head">
                  <span class="q-mini-num">${idx + 1}</span>
                  <strong class="kr-label">${escHtml(c.daily_kr || c.kr)}</strong>
                </div>
                <div class="scramble-row">
                  ${(c.scrambled_words || []).map((w) => `<span class="word-tile">${escHtml(w)}</span>`).join("")}
                </div>
                ${renderRuledSvgBlock({ text: c.en, showShadow: true, fontSize: 23, maxChars: 34, svgWidth: 540, theme })}
              </div>`
            )
            .join("")}
        </div>
      </div>`
  });

  // Week 2 · Day 4 (KR): 우리말 보고 3번 말하기 체크 + 빈칸 완성
  const day4Chunks = chunks.slice(0, 4);
  const day4 = wrapWorksheetPage({
    bookTitle: targetBook.title,
    weekNum: 2,
    dayNum: 4,
    theme,
    nameMode,
    studentName,
    pageLabel: "Week 2 · Day 4",
    bodyHtml: `
      <div class="q-block">
        <div class="q-title"><span class="q-num" style="background:${theme.primary};">1</span> 우리말을 보고 영어로 3번 말한 뒤 □에 표시(✓)하고 빈칸을 채워 보세요.</div>
        <div class="list-stack">
          ${day4Chunks
            .map(
              (c) => `
              <div class="speak-card" style="border-color:${theme.softBorder};background:${theme.softBg};">
                <div class="speak-top">
                  <strong class="kr-big-prompt">"${escHtml(c.daily_kr || c.kr)}"</strong>
                  <div class="check-trio"><span>□</span><span>□</span><span>□</span></div>
                </div>
                <div class="blank-line-en">${escHtml(c.blank_en)}</div>
                ${renderRuledSvgBlock({
                  text: c.en,
                  showShadow: supportEarlyShadow,
                  fontSize: 22,
                  maxChars: 36,
                  svgWidth: 540,
                  theme
                })}
              </div>`
            )
            .join("")}
        </div>
      </div>`
  });

  // Week 2 · Day 5 (EN · Review)
  const day5Chunks = chunks.slice(0, 4);
  const bankChunks = rotateArray(day5Chunks.map((c) => c.blank_answer).filter(Boolean), 1);
  const day5 = wrapWorksheetPage({
    bookTitle: targetBook.title,
    weekNum: 2,
    dayNum: 5,
    theme,
    nameMode,
    studentName,
    pageLabel: "Week 2 · Day 5 (Review)",
    bodyHtml: `
      <div class="q-block">
        <div class="q-title"><span class="q-num" style="background:${theme.primary};">1</span> Match Korean and English!</div>
        ${renderMatchingColumns(
          day5Chunks.map((c) => ({ labelHtml: `<span class="kr-label">${escHtml(c.daily_kr || c.kr)}</span>` })),
          day5Chunks.map((c) => ({ labelHtml: `<span class="en-chunk">${escHtml(c.en)}</span>` }))
        )}
      </div>
      <div class="q-block">
        <div class="q-title"><span class="q-num" style="background:${theme.primary};">2</span> Fill in the missing words.</div>
        <div class="word-bank" style="background:${theme.softBg};border-color:${theme.softBorder};margin-bottom:8px;">
          <span class="bank-title" style="color:${theme.primaryDark};">Word Box</span>
          <div class="bank-chips">
            ${bankChunks.map((bw) => `<span class="bank-chip">${escHtml(bw)}</span>`).join("")}
          </div>
        </div>
        <div class="list-stack">
          ${day5Chunks.slice(0, 3)
            .map(
              (c) => `
              <div class="choice-row" style="border-color:${theme.softBorder};">
                <div>
                  <div class="kr-label">${escHtml(c.daily_kr || c.kr)}</div>
                  <div class="blank-line-en">${escHtml(c.blank_en)}</div>
                </div>
              </div>`
            )
            .join("")}
        </div>
      </div>`
  });

  return [day1, day2, day3, day4, day5];
}

function buildWeek3Pages({
  targetBook,
  data,
  pageIllustrations,
  theme,
  nameMode,
  studentName,
  origin
}: {
  targetBook: Book;
  data: ReturnType<typeof extractNormalizedData>;
  pageIllustrations: PageIllustration[];
  theme: WorksheetTheme;
  nameMode: WorksheetNameMode;
  studentName: string;
  origin: string;
}): string[] {
  const sents = data.sentenceItems;
  const levelRank = getBookLevelRank(targetBook.level);
  const showShadowW34 = levelRank <= 3;

  // Week 3 · Day 1 (KR): 이야기 장면 순서 번호 매기기 + 핵심 문장 쓰기 (Pre~Lv3 그림자)
  const sceneCards = sents.slice(0, 4).map((s, idx) => ({
    idx,
    en: s.en,
    kr: s.kr,
    img: toAssetUrl(pageIllustrations[idx]?.image_url || theme.coverImageUrl, origin)
  }));
  const mixedScenes = rotateArray(sceneCards, 1);

  const day1 = wrapWorksheetPage({
    bookTitle: targetBook.title,
    weekNum: 3,
    dayNum: 1,
    theme,
    nameMode,
    studentName,
    pageLabel: "Week 3 · Day 1",
    bodyHtml: `
      <div class="q-block">
        <div class="q-title"><span class="q-num" style="background:${theme.primary};">1</span> 원서 이야기 순서대로 ( ) 안에 1, 2, 3 번호를 적어 보세요.</div>
        <div class="two-col">
          ${mixedScenes
            .map(
              (sc) => `
              <div class="order-scene-card" style="border-color:${theme.softBorder};">
                <div class="order-head">
                  <span class="order-circle">( &nbsp;&nbsp; )</span>
                  <span class="kr-small">${escHtml(sc.kr || sc.en)}</span>
                </div>
                ${
                  sc.img
                    ? `<img src="${escHtml(sc.img)}" alt="Scene" class="order-thumb" />`
                    : ""
                }
              </div>`
            )
            .join("")}
        </div>
      </div>
      <div class="q-block">
        <div class="q-title"><span class="q-num" style="background:${theme.primary};">2</span> 이야기 문장을 3선 노트에 바르게 써 보세요.</div>
        <div class="list-stack">
          ${sents.slice(0, 2)
            .map(
              (s) => `
              <div class="trace-card" style="border-color:${theme.softBorder};background:${theme.softBg};">
                <div class="trace-head">
                  <strong class="kr-label">${escHtml(s.kr)}</strong>
                </div>
                ${showShadowW34 ? "" : `<div class="model-line-en">${escHtml(s.en)}</div>`}
                ${renderRuledSvgBlock({ text: s.en, showShadow: showShadowW34, fontSize: 21, maxChars: 38, svgWidth: 540, theme })}
              </div>`
            )
            .join("")}
        </div>
      </div>`
  });

  // Week 3 · Day 2 (EN): Read and circle O or X. + Write the sentences.
  const day2 = wrapWorksheetPage({
    bookTitle: targetBook.title,
    weekNum: 3,
    dayNum: 2,
    theme,
    nameMode,
    studentName,
    pageLabel: "Week 3 · Day 2",
    bodyHtml: `
      <div class="q-block">
        <div class="q-title"><span class="q-num" style="background:${theme.primary};">1</span> Read about the story and circle O or X.</div>
        <div class="list-stack">
          ${data.tfItems.slice(0, 4)
            .map(
              (tf, idx) => `
              <div class="tf-row" style="border-color:${theme.softBorder};">
                <div>
                  <div class="tf-kr"><strong>${idx + 1}.</strong> ${escHtml(tf.statement_kr)}</div>
                  ${tf.statement_en ? `<div class="tf-en">${escHtml(tf.statement_en)}</div>` : ""}
                </div>
                <div class="tf-ox"><span>O</span> / <span>X</span></div>
              </div>`
            )
            .join("")}
        </div>
      </div>
      <div class="q-block">
        <div class="q-title"><span class="q-num" style="background:${theme.primary};">2</span> Write the story sentences.</div>
        <div class="list-stack">
          ${(sents.slice(2, 4).length ? sents.slice(2, 4) : sents.slice(0, 2))
            .map(
              (s) => `
              <div class="trace-card" style="border-color:${theme.softBorder};background:${theme.softBg};">
                <div class="trace-head"><strong class="kr-label">${escHtml(s.kr)}</strong></div>
                ${showShadowW34 ? "" : `<div class="model-line-en">${escHtml(s.en)}</div>`}
                ${renderRuledSvgBlock({ text: s.en, showShadow: showShadowW34, fontSize: 21, maxChars: 38, svgWidth: 540, theme })}
              </div>`
            )
            .join("")}
        </div>
      </div>`
  });

  // Week 3 · Day 3 (KR): 패턴 바꿔 끼우기 ① (Look at the [___] + 그림 단어 4개 보기)
  const swapA = data.patternSwaps[0];
  const swapB = data.patternSwaps[1] || data.patternSwaps[0];
  const day3 = wrapWorksheetPage({
    bookTitle: targetBook.title,
    weekNum: 3,
    dayNum: 3,
    theme,
    nameMode,
    studentName,
    pageLabel: "Week 3 · Day 3",
    bodyHtml: `
      <div class="q-block">
        <div class="q-title"><span class="q-num" style="background:${theme.primary};">1</span> 아래 그림 단어를 골라 내 문장으로 바꾸어 써 보세요.</div>
        <div class="pattern-box" style="border-color:${theme.softBorder};background:${theme.softBg};">
          <div class="pattern-line-base">${escHtml(swapA.base_en)} <span class="kr-small">(${escHtml(swapA.base_kr)})</span></div>
          <div class="pattern-slot" style="color:${theme.primaryDark};">${escHtml(swapA.pattern_en)}</div>
          <div class="swap-gallery">
            ${(swapA.swap_options || [])
              .slice(0, 4)
              .map(
                (opt) => `
                <div class="swap-card">
                  ${renderVocabThumb(opt.image_url, opt.word, origin, 44)}
                  <div class="swap-word">${escHtml(opt.word)}</div>
                  <div class="swap-kr">${escHtml(opt.meaning_kr)}</div>
                </div>`
              )
              .join("")}
          </div>
          ${renderRuledSvgBlock({ text: swapA.example_en, showShadow: showShadowW34, fontSize: 21, maxChars: 38, svgWidth: 540, theme })}
          ${renderRuledSvgBlock({ text: "", showShadow: false, fontSize: 21, maxChars: 38, svgWidth: 540, theme })}
        </div>
      </div>
      <div class="q-block">
        <div class="q-title"><span class="q-num" style="background:${theme.primary};">2</span> 또 다른 표현도 내 단어로 바꿔 써 보세요.</div>
        <div class="pattern-box" style="border-color:${theme.softBorder};">
          <div class="pattern-line-base">${escHtml(swapB.base_en)}</div>
          <div class="pattern-slot" style="color:${theme.primaryDark};">${escHtml(swapB.pattern_en)}</div>
          ${renderRuledSvgBlock({ text: "", showShadow: false, fontSize: 21, maxChars: 38, svgWidth: 540, theme })}
        </div>
      </div>`
  });

  // Week 3 · Day 4 (EN): Draw your own picture and write your sentence!
  const day4 = wrapWorksheetPage({
    bookTitle: targetBook.title,
    weekNum: 3,
    dayNum: 4,
    theme,
    nameMode,
    studentName,
    pageLabel: "Week 3 · Day 4",
    bodyHtml: `
      <div class="q-block">
        <div class="q-title"><span class="q-num" style="background:${theme.primary};">1</span> Draw your own picture and write your English sentence!</div>
        <div class="draw-frame" style="border-color:${theme.primary};">
          <div class="draw-corner-hint" style="color:${theme.primaryDark};">${escHtml(swapA.pattern_en)}</div>
        </div>
      </div>
      <div class="q-block">
        <div class="q-title"><span class="q-num" style="background:${theme.primary};">2</span> My Sentence</div>
        ${renderRuledSvgBlock({ text: "", showShadow: false, fontSize: 23, maxChars: 36, minLines: 2, svgWidth: 540, theme })}
      </div>`
  });

  // Week 3 · Day 5 (KR · 복습): 우리말 보고 영어 문장 완성하기
  const day5Sents = sents.slice(0, 3);
  const bankWords = rotateArray(day5Sents.map((s) => s.blank_answer).filter(Boolean), 1);
  const day5 = wrapWorksheetPage({
    bookTitle: targetBook.title,
    weekNum: 3,
    dayNum: 5,
    theme,
    nameMode,
    studentName,
    pageLabel: "Week 3 · Day 5 (Review)",
    bodyHtml: `
      <div class="word-bank" style="background:${theme.softBg};border-color:${theme.softBorder};">
        <span class="bank-title" style="color:${theme.primaryDark};">Word Box</span>
        <div class="bank-chips">
          ${bankWords.map((bw) => `<span class="bank-chip">${escHtml(bw)}</span>`).join("")}
        </div>
      </div>
      <div class="q-block">
        <div class="q-title"><span class="q-num" style="background:${theme.primary};">1</span> 우리말 뜻을 보고 원서 문장을 바르게 완성해 보세요.</div>
        <div class="list-stack">
          ${day5Sents
            .map(
              (s) => `
              <div class="trace-card" style="border-color:${theme.softBorder};">
                <div class="kr-label" style="margin-bottom:4px;">${escHtml(s.daily_kr || s.kr)}</div>
                <div class="blank-line-en">${escHtml(s.blank_sentence)}</div>
                ${renderRuledSvgBlock({
                  text: s.en,
                  showShadow: showShadowW34,
                  fontSize: 20,
                  maxChars: 38,
                  svgWidth: 540,
                  theme
                })}
              </div>`
            )
            .join("")}
        </div>
      </div>`
  });

  return [day1, day2, day3, day4, day5];
}

function buildWeek4Pages({
  targetBook,
  data,
  theme,
  nameMode,
  studentName
}: {
  targetBook: Book;
  data: ReturnType<typeof extractNormalizedData>;
  theme: WorksheetTheme;
  nameMode: WorksheetNameMode;
  studentName: string;
}): string[] {
  const sents = data.sentenceItems;
  const levelRank = getBookLevelRank(targetBook.level);
  const showShadowW34 = levelRank <= 3;

  // Week 4 · Day 1 (EN): Put the parts in order and write the sentence.
  const day1 = wrapWorksheetPage({
    bookTitle: targetBook.title,
    weekNum: 4,
    dayNum: 1,
    theme,
    nameMode,
    studentName,
    pageLabel: "Week 4 · Day 1",
    bodyHtml: `
      <div class="q-block">
        <div class="q-title"><span class="q-num" style="background:${theme.primary};">1</span> Put the parts in order and write the sentence.</div>
        <div class="list-stack">
          ${sents.slice(0, 3)
            .map(
              (s, idx) => `
              <div class="trace-card" style="border-color:${theme.softBorder};background:${theme.softBg};">
                <div class="trace-head">
                  <span class="q-mini-num">${idx + 1}</span>
                  <strong class="kr-label">${escHtml(s.kr)}</strong>
                </div>
                <div class="scramble-row">
                  ${(s.scrambled_chunks || []).map((p) => `<span class="word-tile">${escHtml(p)}</span>`).join("")}
                </div>
                ${renderRuledSvgBlock({
                  text: s.en,
                  showShadow: showShadowW34,
                  fontSize: 20,
                  maxChars: 38,
                  svgWidth: 540,
                  theme
                })}
              </div>`
            )
            .join("")}
        </div>
      </div>`
  });

  // Week 4 · Day 2 (KR): 고민 없이 한 -> 영 즉답 말하기 & 쓰기
  const recallItems = [
    ...(data.chunkItems.slice(0, 2).map((c) => ({ en: c.en, kr: c.daily_kr || c.kr }))),
    ...(sents.slice(0, 2).map((s) => ({ en: s.en, kr: s.daily_kr || s.kr })))
  ].slice(0, 4);

  const day2 = wrapWorksheetPage({
    bookTitle: targetBook.title,
    weekNum: 4,
    dayNum: 2,
    theme,
    nameMode,
    studentName,
    pageLabel: "Week 4 · Day 2",
    bodyHtml: `
      <div class="q-block">
        <div class="q-title"><span class="q-num" style="background:${theme.primary};">1</span> 우리말을 보자마자 영어로 3번 말하고 □에 체크(✓)한 뒤 써 보세요.</div>
        <div class="list-stack">
          ${recallItems
            .map(
              (it) => `
              <div class="speak-card" style="border-color:${theme.softBorder};">
                <div class="speak-top">
                  <strong class="kr-big-prompt">"${escHtml(it.kr)}"</strong>
                  <div class="check-trio"><span>□</span><span>□</span><span>□</span></div>
                </div>
                ${renderRuledSvgBlock({
                  text: it.en,
                  showShadow: showShadowW34,
                  fontSize: 20,
                  maxChars: 38,
                  svgWidth: 540,
                  theme
                })}
              </div>`
            )
            .join("")}
        </div>
      </div>`
  });

  // Week 4 · Day 3 (KR): 나만의 원서 1페이지 만들기
  const promptA = data.miniPrompts[0];
  const promptB = data.miniPrompts[1] || data.miniPrompts[0];
  const day3 = wrapWorksheetPage({
    bookTitle: targetBook.title,
    weekNum: 4,
    dayNum: 3,
    theme,
    nameMode,
    studentName,
    pageLabel: "Week 4 · Day 3",
    bodyHtml: `
      <div class="q-block">
        <div class="q-title"><span class="q-num" style="background:${theme.primary};">1</span> 내가 작가가 되어 장면을 그리고 2문장 이야기를 만들어 보세요.</div>
        <div class="draw-frame draw-frame-sm" style="border-color:${theme.primary};"></div>
        <div class="list-stack" style="margin-top:8px;">
          <div class="mini-story-card" style="border-color:${theme.softBorder};background:${theme.softBg};">
            <div class="kr-small">${escHtml(promptA.prompt_kr)} <span class="starter-tag">${escHtml(promptA.starter_en)}</span></div>
            ${renderRuledSvgBlock({ text: "", showShadow: false, fontSize: 21, maxChars: 38, svgWidth: 540, theme })}
          </div>
          <div class="mini-story-card" style="border-color:${theme.softBorder};background:${theme.softBg};">
            <div class="kr-small">${escHtml(promptB.prompt_kr)} <span class="starter-tag">${escHtml(promptB.starter_en)}</span></div>
            ${renderRuledSvgBlock({ text: "", showShadow: false, fontSize: 21, maxChars: 38, svgWidth: 540, theme })}
          </div>
        </div>
      </div>`
  });

  // Week 4 · Day 4 (EN): Answer the questions about the story.
  const day4 = wrapWorksheetPage({
    bookTitle: targetBook.title,
    weekNum: 4,
    dayNum: 4,
    theme,
    nameMode,
    studentName,
    pageLabel: "Week 4 · Day 4",
    bodyHtml: `
      <div class="q-block">
        <div class="q-title"><span class="q-num" style="background:${theme.primary};">1</span> Answer the questions about the story.</div>
        <div class="list-stack">
          ${data.qaItems.slice(0, 3)
            .map(
              (qa, idx) => `
              <div class="trace-card" style="border-color:${theme.softBorder};">
                <div class="qa-en"><strong>Q${idx + 1}.</strong> ${escHtml(qa.question_en)}</div>
                <div class="kr-small">${escHtml(qa.question_kr)}</div>
                <div class="starter-line">${escHtml(qa.starter_en)} __________________________</div>
                ${renderRuledSvgBlock({ text: "", showShadow: false, fontSize: 21, maxChars: 38, svgWidth: 540, theme })}
              </div>`
            )
            .join("")}
        </div>
      </div>`
  });

  // Week 4 · Day 5 (KR · 총복습)
  const finalPairs = data.chunkItems.slice(0, 4);
  const day5 = wrapWorksheetPage({
    bookTitle: targetBook.title,
    weekNum: 4,
    dayNum: 5,
    theme,
    nameMode,
    studentName,
    pageLabel: "Week 4 · Day 5 (Final Review)",
    bodyHtml: `
      <div class="q-block">
        <div class="q-title"><span class="q-num" style="background:${theme.primary};">1</span> 원서 핵심 표현을 한국어 뜻과 선으로 이어 보세요.</div>
        ${renderMatchingColumns(
          finalPairs.map((c) => ({ labelHtml: `<span class="kr-label">${escHtml(c.daily_kr || c.kr)}</span>` })),
          finalPairs.map((c) => ({ labelHtml: `<span class="en-chunk">${escHtml(c.en)}</span>` }))
        )}
      </div>
      <div class="q-block">
        <div class="q-title"><span class="q-num" style="background:${theme.primary};">2</span> 이 책에서 내가 가장 자신 있는 문장 1개를 써 보세요.</div>
        ${renderRuledSvgBlock({ text: "", showShadow: false, fontSize: 22, maxChars: 36, minLines: 2, svgWidth: 540, theme })}
      </div>
      <div class="star-box" style="background:${theme.softBg};border-color:${theme.softBorder};">
        <div class="kr-label">원서 한 권 완료! 별을 색칠해 주세요.</div>
        <div class="stars-row" style="color:${theme.primary};">☆ &nbsp; ☆ &nbsp; ☆ &nbsp; ☆ &nbsp; ☆</div>
      </div>`
  });

  return [day1, day2, day3, day4, day5];
}

function buildStorybookCoverPage({
  targetBook,
  theme,
  nameMode,
  studentName,
  origin
}: {
  targetBook: Book;
  theme: WorksheetTheme;
  nameMode: WorksheetNameMode;
  studentName: string;
  origin: string;
}): string {
  const coverImg = toAssetUrl(theme.coverImageUrl, origin);
  const shownName = nameMode === "student" ? studentName : "";

  return `
    <section class="sheet-page cover-page" style="background:linear-gradient(160deg, ${theme.coverBgStart} 0%, #ffffff 52%, ${theme.coverBgEnd} 100%);">
      <div class="cover-top-row">
        <span class="cover-level-pill" style="background:${theme.primary};color:#fff;">${escHtml(targetBook.level)}</span>
        <span class="cover-brand" style="color:${theme.primaryDark};">BADA ENGLISH</span>
      </div>

      <div class="cover-art-frame" style="border-color:${theme.softBorder};">
        ${
          coverImg
            ? `<img src="${escHtml(coverImg)}" alt="${escHtml(targetBook.title)}" class="cover-art-img" />`
            : `<div class="cover-art-fallback">${theme.motifSvg}</div>`
        }
      </div>

      <div class="cover-title-wrap">
        <h1 class="cover-title" style="color:${theme.primaryDark};">${escHtml(targetBook.title)}</h1>
        <p class="cover-subtitle">${escHtml(targetBook.subtitle_kr || "")}</p>
      </div>

      <div class="cover-nameplate" style="border-color:${theme.primary};">
        <div class="cover-nameplate-label" style="color:${theme.primaryDark};">This book belongs to · 이름</div>
        <div class="cover-nameplate-value">${escHtml(shownName)}</div>
      </div>
    </section>`;
}

function buildAuthenticStoryPages({
  targetBook,
  pageIllustrations,
  theme,
  origin
}: {
  targetBook: Book;
  pageIllustrations: PageIllustration[];
  theme: WorksheetTheme;
  origin: string;
}): string[] {
  const spreads = splitBookIntoContextPages(targetBook);
  const fallbackCover = toAssetUrl(theme.coverImageUrl, origin);

  return spreads.map((spread, idx) => {
    const illUrl = toAssetUrl(pageIllustrations[idx]?.image_url || fallbackCover, origin);
    const englishParagraph = spread.sentences.map((s) => s.en).join(" ");

    return `
      <section class="sheet-page story-page">
        <div class="story-art-frame" style="border-color:${theme.softBorder};background:${theme.softBg};">
          ${
            illUrl
              ? `<img src="${escHtml(illUrl)}" alt="Story Page ${idx + 1}" class="story-art-img" />`
              : `<div class="story-art-empty">${theme.motifSvg}</div>`
          }
        </div>
        <div class="story-text-area">
          <p class="story-english-text">${escHtml(englishParagraph)}</p>
        </div>
        <div class="story-page-num" style="color:${theme.primaryDark};">- ${idx + 1} -</div>
      </section>`;
  });
}

function buildBookletPadPage(pageNumber: number, theme: WorksheetTheme): string {
  return `
    <section class="sheet-page pad-page">
      <div class="pad-box" style="border-color:${theme.softBorder};">
        <div class="pad-title" style="color:${theme.primaryDark};">My Sketch &amp; Word Notes</div>
        <div class="pad-motif">${theme.motifSvg}</div>
      </div>
      <footer class="sheet-footer">
        <div></div>
        <div class="footer-page" style="color:${theme.primaryDark};">- ${pageNumber} -</div>
      </footer>
    </section>`;
}

export function buildWorksheetDocumentHtml({
  weekKey,
  targetBook,
  worksheets,
  pageIllustrations = [],
  studentName = "학생",
  nameMode = "none",
  assetOrigin
}: PrintBookWorksheetOptions): string {
  const origin =
    assetOrigin ?? (typeof window !== "undefined" ? window.location.origin : "");
  const theme = getWorksheetTheme(targetBook);
  const data = extractNormalizedData(targetBook, worksheets);
  const effectiveIllustrations =
    pageIllustrations.length > 0
      ? pageIllustrations
      : targetBook.page_illustrations || [];

  const normalizedMode: WorksheetPrintMode =
    weekKey === "week3_4_study"
      ? "week3"
      : weekKey === "week3_4_test"
        ? "week4"
        : weekKey;

  let pages: string[] = [];

  if (normalizedMode === "week1") {
    pages = buildWeek1Pages({ targetBook, data, theme, nameMode, studentName, origin });
  } else if (normalizedMode === "week2") {
    pages = buildWeek2Pages({
      targetBook,
      data,
      pageIllustrations: effectiveIllustrations,
      theme,
      nameMode,
      studentName,
      origin
    });
  } else if (normalizedMode === "week3") {
    pages = buildWeek3Pages({
      targetBook,
      data,
      pageIllustrations: effectiveIllustrations,
      theme,
      nameMode,
      studentName,
      origin
    });
  } else if (normalizedMode === "week4") {
    pages = buildWeek4Pages({ targetBook, data, theme, nameMode, studentName });
  } else {
    // Integrated Monthly Activity Book: Cover + Story Pages + Week 1..4 (Days 1..5 = 20 days)
    const cover = buildStorybookCoverPage({ targetBook, theme, nameMode, studentName, origin });
    const storyPages = buildAuthenticStoryPages({
      targetBook,
      pageIllustrations: effectiveIllustrations,
      theme,
      origin
    });
    const w1 = buildWeek1Pages({ targetBook, data, theme, nameMode, studentName, origin });
    const w2 = buildWeek2Pages({
      targetBook,
      data,
      pageIllustrations: effectiveIllustrations,
      theme,
      nameMode,
      studentName,
      origin
    });
    const w3 = buildWeek3Pages({
      targetBook,
      data,
      pageIllustrations: effectiveIllustrations,
      theme,
      nameMode,
      studentName,
      origin
    });
    const w4 = buildWeek4Pages({ targetBook, data, theme, nameMode, studentName });
    pages = [cover, ...storyPages, ...w1, ...w2, ...w3, ...w4];
  }

  const isBooklet = normalizedMode === "book_booklet";
  const contentHtml = isBooklet
    ? buildBookletImpositionHtml(pages, (num) => buildBookletPadPage(num, theme))
    : pages.join("");

  const toolbarTip = isBooklet
    ? "양면 인쇄(짧은 쪽 넘기기)로 출력 후 가운데 점선을 따라 반으로 접어 묶어 주세요."
    : "A4 1장씩 바로 인쇄하거나, 인쇄 설정에서 [시트당 페이지 수: 2]로 설정하면 반접기 크기로 출력됩니다.";

  return `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8" />
<title>${escHtml(targetBook.title)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Andika:wght@400;700&family=Fredoka:wght@500;600;700&family=Gowun+Dodum&family=Jua&display=swap" rel="stylesheet" />
<style>
  @page {
    size: ${isBooklet ? "A4 landscape" : "A4 portrait"};
    margin: ${isBooklet ? "8mm" : "12mm"};
  }
  * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  body {
    margin: 0;
    padding: 0;
    font-family: "Gowun Dodum", "Malgun Gothic", sans-serif;
    color: #0f172a;
    background: #e2e8f0;
  }
  .print-toolbar {
    position: sticky;
    top: 0;
    z-index: 50;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 10px 18px;
    background: #0f172a;
    color: #f8fafc;
    font-size: 13px;
    font-weight: 700;
  }
  .print-btn {
    padding: 8px 18px;
    border: none;
    border-radius: 999px;
    background: ${theme.primary};
    color: #ffffff;
    font-size: 13px;
    font-weight: 800;
    cursor: pointer;
  }

  .sheet-page {
    width: 184mm;
    height: 268mm;
    margin: 12px auto;
    padding: 9mm 10mm;
    background: #ffffff;
    border-radius: 8px;
    box-shadow: 0 4px 18px rgba(15, 23, 42, 0.12);
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    overflow: hidden;
    page-break-after: always;
  }

  /* Booklet imposition sheets (A4 landscape -> two A5 half pages) */
  .booklet-sheet {
    width: 280mm;
    height: 192mm;
    margin: 12px auto;
    background: #ffffff;
    box-shadow: 0 4px 18px rgba(15, 23, 42, 0.14);
    display: grid;
    grid-template-columns: 1fr 1px 1fr;
    align-items: stretch;
    overflow: hidden;
    page-break-after: always;
  }
  .booklet-half {
    position: relative;
    width: 139mm;
    height: 192mm;
    padding: 1mm 3.5mm;
    overflow: hidden;
  }
  .booklet-scale {
    width: 184mm;
    height: 268mm;
    transform: scale(0.71);
    transform-origin: top left;
  }
  .booklet-scale .sheet-page {
    margin: 0;
    border-radius: 0;
    box-shadow: none;
    page-break-after: auto;
  }
  .booklet-fold-guide {
    border-left: 1px dashed #cbd5e1;
    height: 100%;
  }

  .sheet-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    padding-bottom: 6px;
    border-bottom: 2.5px solid;
    margin-bottom: 10px;
  }
  .header-left { display: flex; align-items: center; gap: 8px; }
  .header-icon { display: inline-flex; align-items: center; }
  .header-book {
    font-family: "Fredoka", "Jua", sans-serif;
    font-size: 16px;
    font-weight: 700;
    color: #0f172a;
  }
  .header-right { text-align: right; display: flex; flex-direction: column; align-items: flex-end; gap: 3px; }
  .day-pill {
    font-family: "Fredoka", sans-serif;
    font-size: 13px;
    font-weight: 700;
    padding: 2px 10px;
    border-radius: 999px;
    border: 1.5px solid;
  }
  .header-date, .header-meta-row {
    font-size: 12px;
    color: #334155;
    display: flex;
    gap: 10px;
  }

  .sheet-body {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 12px;
    overflow: hidden;
  }
  .sheet-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding-top: 6px;
    border-top: 1px dashed #e2e8f0;
  }
  .footer-page {
    font-family: "Fredoka", sans-serif;
    font-size: 12px;
    font-weight: 700;
  }

  .q-block { display: flex; flex-direction: column; gap: 8px; }
  .q-title {
    font-size: 15.5px;
    font-weight: 700;
    color: #0f172a;
    display: flex;
    align-items: center;
    gap: 7px;
  }
  .q-num {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 22px;
    height: 22px;
    border-radius: 999px;
    color: #ffffff;
    font-family: "Fredoka", sans-serif;
    font-size: 13px;
    font-weight: 700;
    flex-shrink: 0;
  }
  .q-mini-num {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 19px;
    height: 19px;
    border-radius: 999px;
    background: #e2e8f0;
    color: #334155;
    font-family: "Fredoka", sans-serif;
    font-size: 11.5px;
    font-weight: 700;
  }

  .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  .list-stack { display: flex; flex-direction: column; gap: 9px; }

  .match-grid { display: grid; grid-template-columns: 1fr 1fr; column-gap: 46px; row-gap: 8px; }
  .match-col { display: flex; flex-direction: column; gap: 8px; }
  .match-card {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    padding: 6px 10px;
    border: 1.5px solid #cbd5e1;
    border-radius: 12px;
    background: #ffffff;
    min-height: 46px;
  }
  .match-card-right { justify-content: flex-start; }
  .match-left-row { display: flex; align-items: center; gap: 8px; }
  .match-dot {
    width: 10px;
    height: 10px;
    border-radius: 999px;
    border: 2px solid #64748b;
    background: #ffffff;
    flex-shrink: 0;
  }

  .vocab-thumb {
    object-fit: contain;
    border-radius: 8px;
    background: #ffffff;
    border: 1px solid #e2e8f0;
    flex-shrink: 0;
  }
  .thumb-placeholder {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 8px;
    background: #f1f5f9;
    color: #94a3b8;
    font-weight: 800;
    flex-shrink: 0;
  }
  .kr-label { font-size: 15px; font-weight: 700; color: #1e293b; }
  .kr-small { font-size: 13.5px; font-weight: 700; color: #334155; }
  .kr-big-prompt { font-size: 16.5px; font-weight: 700; color: #0f172a; }
  .en-word-big {
    font-family: "Andika", sans-serif;
    font-size: 20px;
    font-weight: 700;
    color: #0f172a;
  }
  .en-chunk {
    font-family: "Andika", sans-serif;
    font-size: 16.5px;
    font-weight: 700;
    color: #0f172a;
  }
  .en-chip {
    font-family: "Andika", sans-serif;
    font-size: 15px;
    font-weight: 700;
    color: #334155;
    margin-left: 6px;
  }

  .trace-card {
    padding: 8px 11px;
    border: 1.5px solid;
    border-radius: 12px;
  }
  .trace-head { display: flex; align-items: center; gap: 6px; margin-bottom: 3px; }
  .model-line-en {
    font-family: "Andika", sans-serif;
    font-size: 16px;
    font-weight: 700;
    color: #1e293b;
    margin-bottom: 3px;
  }

  svg.ruled-svg { display: block; width: 100%; height: auto; overflow: visible; }
  svg.ruled-svg text.trace-svg-text {
    font-family: "Andika", sans-serif;
    font-weight: 400;
    fill: rgba(100, 116, 139, 0.24);
    letter-spacing: 0.015em;
  }

  .choice-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    padding: 8px 12px;
    border: 1.5px solid;
    border-radius: 12px;
    background: #ffffff;
  }
  .choice-prompt { display: flex; align-items: center; gap: 8px; }
  .choice-pills { display: flex; gap: 10px; flex-wrap: wrap; }
  .choice-pills-col { display: flex; flex-direction: column; gap: 6px; margin-top: 6px; }
  .circle-opt {
    font-family: "Andika", sans-serif;
    font-size: 16.5px;
    font-weight: 700;
    padding: 4px 12px;
    border: 1.5px solid #cbd5e1;
    border-radius: 999px;
    color: #0f172a;
    background: #f8fafc;
  }

  .missing-row {
    display: grid;
    grid-template-columns: 1fr 1.3fr;
    align-items: center;
    gap: 12px;
    padding: 8px 12px;
    border: 1.5px solid;
    border-radius: 12px;
  }
  .missing-left { display: flex; align-items: center; gap: 10px; }
  .missing-word {
    font-family: "Andika", sans-serif;
    font-size: 21px;
    font-weight: 700;
    letter-spacing: 0.1em;
    color: #0f172a;
  }

  .word-bank {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
    padding: 8px 12px;
    border: 1.5px solid;
    border-radius: 12px;
  }
  .bank-title { font-family: "Fredoka", sans-serif; font-size: 13.5px; font-weight: 700; }
  .bank-chips { display: flex; gap: 8px; flex-wrap: wrap; }
  .bank-chip {
    font-family: "Andika", sans-serif;
    font-size: 15px;
    font-weight: 700;
    padding: 2px 10px;
    background: #ffffff;
    border: 1px solid #cbd5e1;
    border-radius: 999px;
  }

  .scene-quiz-card {
    padding: 8px;
    border: 1.5px solid;
    border-radius: 12px;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .scene-mini-img {
    width: 100%;
    height: 112px;
    object-fit: cover;
    border-radius: 8px;
  }
  .kr-caption { font-size: 13.5px; font-weight: 700; color: #334155; }

  .scramble-row { display: flex; flex-wrap: wrap; gap: 6px; margin: 4px 0 6px; }
  .word-tile {
    font-family: "Andika", sans-serif;
    font-size: 14.5px;
    font-weight: 700;
    padding: 3px 10px;
    border: 1.5px solid #cbd5e1;
    border-radius: 8px;
    background: #f8fafc;
  }

  .speak-card { padding: 9px 12px; border: 1.5px solid; border-radius: 12px; }
  .speak-top { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 4px; }
  .check-trio { display: flex; gap: 6px; font-size: 18px; color: #475569; }
  .blank-line-en { font-family: "Andika", sans-serif; font-size: 16.5px; font-weight: 700; color: #1e293b; margin-bottom: 4px; }

  .order-scene-card { padding: 7px; border: 1.5px solid; border-radius: 12px; }
  .order-head { display: flex; align-items: center; gap: 6px; margin-bottom: 5px; }
  .order-circle { font-family: "Fredoka", sans-serif; font-size: 14px; font-weight: 700; color: #0f172a; white-space: nowrap; }
  .order-thumb { width: 100%; height: 86px; object-fit: cover; border-radius: 8px; }

  .tf-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 7px 12px;
    border: 1.5px solid;
    border-radius: 12px;
  }
  .tf-kr { font-size: 14.5px; font-weight: 700; color: #0f172a; }
  .tf-en { font-family: "Andika", sans-serif; font-size: 12.5px; color: #475569; margin-top: 2px; }
  .tf-ox { font-family: "Fredoka", sans-serif; font-size: 20px; font-weight: 700; color: #334155; white-space: nowrap; }

  .pattern-box { padding: 10px 12px; border: 1.5px solid; border-radius: 14px; display: flex; flex-direction: column; gap: 6px; }
  .pattern-line-base { font-family: "Andika", sans-serif; font-size: 15px; font-weight: 700; color: #334155; }
  .pattern-slot { font-family: "Andika", sans-serif; font-size: 19px; font-weight: 700; }
  .swap-gallery { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin: 4px 0; }
  .swap-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
    padding: 6px;
    background: #ffffff;
    border: 1px solid #cbd5e1;
    border-radius: 10px;
  }
  .swap-word { font-family: "Andika", sans-serif; font-size: 14.5px; font-weight: 700; color: #0f172a; }
  .swap-kr { font-size: 12px; color: #475569; font-weight: 700; }

  .draw-frame {
    height: 118mm;
    border: 2px dashed;
    border-radius: 16px;
    background: #ffffff;
    position: relative;
    padding: 10px;
  }
  .draw-frame-sm { height: 78mm; }
  .draw-corner-hint { font-family: "Andika", sans-serif; font-size: 15px; font-weight: 700; opacity: 0.72; }

  .mini-story-card { padding: 9px 12px; border: 1.5px solid; border-radius: 12px; }
  .starter-tag { font-family: "Andika", sans-serif; font-size: 13.5px; font-weight: 700; color: #0369a1; margin-left: 6px; }
  .qa-en { font-family: "Andika", sans-serif; font-size: 16px; font-weight: 700; color: #0f172a; }
  .starter-line { font-family: "Andika", sans-serif; font-size: 15.5px; font-weight: 700; color: #334155; margin: 4px 0; }

  .star-box {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 14px;
    border: 1.5px solid;
    border-radius: 14px;
  }
  .stars-row { font-size: 26px; letter-spacing: 0.08em; }

  /* Cover Page */
  .cover-page { justify-content: space-between; padding: 12mm; }
  .cover-top-row { display: flex; justify-content: space-between; align-items: center; }
  .cover-level-pill {
    font-family: "Fredoka", sans-serif;
    font-size: 15px;
    font-weight: 700;
    padding: 4px 16px;
    border-radius: 999px;
  }
  .cover-brand { font-family: "Fredoka", sans-serif; font-size: 15px; font-weight: 700; letter-spacing: 0.06em; }
  .cover-art-frame {
    height: 106mm;
    border-radius: 20px;
    border: 3px solid;
    background: #ffffff;
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .cover-art-img { width: 100%; height: 100%; object-fit: cover; }
  .cover-title-wrap { text-align: center; padding: 4px 8px; }
  .cover-title {
    font-family: "Fredoka", "Jua", sans-serif;
    font-size: 29px;
    line-height: 1.2;
    margin: 0 0 6px;
  }
  .cover-subtitle { font-family: "Jua", sans-serif; font-size: 18px; color: #475569; margin: 0; }
  .cover-nameplate {
    border: 2.5px dashed;
    border-radius: 18px;
    background: rgba(255, 255, 255, 0.92);
    padding: 10px 18px;
    min-height: 27mm;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    gap: 4px;
  }
  .cover-nameplate-label { font-family: "Fredoka", "Jua", sans-serif; font-size: 13px; font-weight: 700; }
  .cover-nameplate-value { font-family: "Jua", sans-serif; font-size: 25px; font-weight: 700; color: #0f172a; min-height: 30px; }

  /* Authentic Picture-Book Pages (Top Illustration + Bottom English Text Only) */
  .story-page { justify-content: space-between; }
  .story-art-frame {
    height: 145mm;
    border-radius: 18px;
    border: 2px solid;
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .story-art-img { width: 100%; height: 100%; object-fit: cover; }
  .story-text-area {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 10px 14px;
  }
  .story-english-text {
    font-family: "Andika", sans-serif;
    font-size: 21px;
    line-height: 1.7;
    font-weight: 700;
    color: #0f172a;
    text-align: center;
    margin: 0;
  }
  .story-page-num {
    font-family: "Fredoka", sans-serif;
    font-size: 13px;
    font-weight: 700;
    text-align: center;
  }

  .pad-box {
    flex: 1;
    border: 2px dashed;
    border-radius: 18px;
    padding: 18px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: space-between;
  }
  .pad-title { font-family: "Fredoka", sans-serif; font-size: 18px; font-weight: 700; }

  @media print {
    body { background: #ffffff; }
    .no-print { display: none !important; }
    .sheet-page {
      margin: 0;
      box-shadow: none;
      border-radius: 0;
      width: 100%;
      height: 268mm;
    }
    .booklet-sheet {
      margin: 0;
      box-shadow: none;
      width: 280mm;
      height: 192mm;
    }
    .sheet-page:last-child,
    .booklet-sheet:last-child {
      page-break-after: auto;
    }
  }
</style>
</head>
<body>
  <div class="no-print print-toolbar">
    <span>${escHtml(toolbarTip)}</span>
    <button type="button" class="print-btn" onclick="window.print()">인쇄 / PDF 저장</button>
  </div>
  ${contentHtml}
  <script>
    ${CALIBRATION_SCRIPT_SNIPPET}
    async function readyAndPrint() {
      try {
        if (document.fonts && document.fonts.ready) {
          await document.fonts.ready;
        }
      } catch (e) {}
      calibrateRuledLines();
      var imgs = Array.prototype.slice.call(document.images || []);
      await Promise.race([
        Promise.all(imgs.map(function (img) {
          if (img.complete) return Promise.resolve();
          return new Promise(function (resolve) {
            img.addEventListener('load', resolve, { once: true });
            img.addEventListener('error', resolve, { once: true });
          });
        })),
        new Promise(function (resolve) { setTimeout(resolve, 2600); })
      ]);
      calibrateRuledLines();
      setTimeout(function () { window.print(); }, 220);
    }
    window.addEventListener('load', function () { void readyAndPrint(); });
  </script>
</body>
</html>`;
}

export function printBookWorksheetHtml(options: PrintBookWorksheetOptions): void {
  const html = buildWorksheetDocumentHtml(options);
  const win = options.preOpenedWindow || window.open("", "_blank", "width=1060,height=920");
  if (!win) return;
  win.document.open();
  win.document.write(html);
  win.document.close();
}

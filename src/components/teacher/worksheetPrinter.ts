import type { Book, BookWorksheets } from "../../types";

export type WorksheetWeekKey = "week1" | "week2" | "week3_4_study" | "week3_4_test";

export function printBookWorksheetHtml({
  weekKey,
  targetBook,
  worksheets: ws,
  studentName = "학생"
}: {
  weekKey: WorksheetWeekKey;
  targetBook: Book;
  worksheets: BookWorksheets;
  studentName?: string;
}): void {
  const esc = (s: string) =>
    String(s || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

  const ruledLineHtml = (shadowText = "", tall = false) => `
    <div class="ruled-box ${tall ? "ruled-tall" : ""}">
      <span class="r-line r-top"></span>
      <span class="r-line r-mid"></span>
      <span class="r-line r-base"></span>
      <span class="r-line r-bot"></span>
      ${shadowText ? `<div class="trace-text">${esc(shadowText)}</div>` : ""}
    </div>`;

  const coreWords = (
    ws.week1?.vocab_test?.length
      ? ws.week1.vocab_test
      : (targetBook.vocab || []).map((v) => ({
          word: v.surface || v.word,
          meaning_kr: v.meaning_kr,
          hint: v.popo_tip || ""
        }))
  ).slice(0, 6);

  const coreSentences = (
    ws.week3_4?.sentence_copy?.length
      ? ws.week3_4.sentence_copy
      : (targetBook.sentence_translations || []).map((s) => ({ en: s.en, kr: s.kr }))
  ).slice(0, 4);

  let bodyHtml = "";
  if (weekKey === "week1" && ws.week1) {
    bodyHtml = `
      <h2>1주차 핵심 단어 · 그림자 따라쓰기</h2>
      <div class="sec">
        <h3>1. 큰 소리로 읽으며 그림자 글씨를 따라 써 보세요 (핵심 단어)</h3>
        ${coreWords
          .map(
            (v: any, i: number) => `
              <div class="word-card">
                <div class="word-head">
                  <span class="num">${i + 1}</span>
                  <strong class="kr-big">${esc(v.meaning_kr)}</strong>
                  <span class="en-model">${esc(v.word)}</span>
                </div>
                <div class="trace-grid">
                  ${ruledLineHtml(v.word)}
                  ${ruledLineHtml(v.word)}
                </div>
              </div>`
          )
          .join("")}
      </div>
      <div class="sec">
        <h3>2. 이야기 내용을 떠올리며 답을 써 보세요</h3>
        ${(ws.week1.comprehension || [])
          .slice(0, 2)
          .map(
            (q: any, i: number) => `
              <div class="qbox">
                <p class="qtitle"><strong>Q${i + 1}.</strong> ${esc(q.question_kr)}</p>
                ${ruledLineHtml("")}
              </div>`
          )
          .join("")}
      </div>`;
  } else if (weekKey === "week2" && ws.week2) {
    const coreChunks = (ws.week2.chunk_writing || []).slice(0, 5);
    bodyHtml = `
      <h2>2주차 핵심 표현 · 그림자 따라쓰기</h2>
      <div class="sec">
        <h3>1. 의미 덩어리(구)를 그림자 글씨 위로 천천히 따라 써 보세요</h3>
        ${coreChunks
          .map(
            (c: any, i: number) => `
              <div class="word-card">
                <div class="word-head">
                  <span class="num">${i + 1}</span>
                  <strong class="kr-big">${esc(c.kr)}</strong>
                </div>
                ${ruledLineHtml(c.en, true)}
              </div>`
          )
          .join("")}
      </div>
      <div class="sec">
        <h3>2. 알맞은 핵심 단어를 떠올려 빈칸을 채워 보세요</h3>
        ${(ws.week2.fill_blanks || [])
          .slice(0, 4)
          .map(
            (b: any, i: number) => `
              <div class="qbox">
                <p class="qtitle"><strong>${i + 1}.</strong> ${esc(b.sentence_blank)}</p>
                <p class="hint">뜻: ${esc(b.kr)}</p>
              </div>`
          )
          .join("")}
      </div>`;
  } else {
    const isBlindTest = weekKey === "week3_4_test";
    bodyHtml = `
      <h2>3·4주차 집중 학습지 (${isBlindTest ? "안 보고 쓰기 · 테스트 버전" : "보고 쓰기 · 연습 버전"})</h2>
      <div class="guide-banner">
        주 2회는 <strong>핵심 문장 필사</strong>, 나머지 2회는 <strong>핵심 단어 집중 쓰기</strong>로 진행합니다.
      </div>
      <div class="sec">
        <h3>Part 1. 핵심 문장 쓰기 (주 2회 · 문장 필사)</h3>
        ${coreSentences
          .map(
            (s: any, i: number) => `
              <div class="word-card">
                <div class="word-head">
                  <span class="num">${i + 1}</span>
                  <strong class="kr-big">${esc(s.kr)}</strong>
                </div>
                ${isBlindTest ? "" : `<div class="en-sentence">${esc(s.en)}</div>`}
                ${ruledLineHtml("", true)}
              </div>`
          )
          .join("")}
      </div>
      <div class="sec">
        <h3>Part 2. 핵심 단어 쓰기 (주 2회 · 단어 집중)</h3>
        <div class="two-col">
          ${coreWords
            .map(
              (v: any, i: number) => `
                <div class="word-card">
                  <div class="word-head">
                    <span class="num">${i + 1}</span>
                    <strong class="kr-big">${esc(v.meaning_kr)}</strong>
                    ${isBlindTest ? "" : `<span class="en-model">${esc(v.word)}</span>`}
                  </div>
                  ${ruledLineHtml("")}
                </div>`
            )
            .join("")}
        </div>
      </div>`;
  }

  const win = window.open("", "_blank", "width=920,height=1040");
  if (!win) return;
  win.document.write(`<!doctype html><html lang="ko"><head><meta charset="utf-8"><title>${esc(targetBook.title)} 학습지</title>
    <style>
      @page { size: A4; margin: 13mm; }
      body { font-family: "Pretendard", "Malgun Gothic", sans-serif; color: #0f172a; line-height: 1.5; margin: 0; padding: 14px; }
      .top { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 2.5px solid #0284c7; padding-bottom: 8px; margin-bottom: 14px; }
      .brand { font-size: 12px; font-weight: 800; color: #0284c7; }
      .meta { font-size: 13px; color: #334155; }
      h2 { font-size: 20px; margin: 0 0 12px; color: #0f172a; }
      h3 { font-size: 15px; color: #0369a1; margin: 0 0 10px; }
      .guide-banner { background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 10px; padding: 8px 12px; font-size: 13px; color: #0c4a6e; margin-bottom: 14px; }
      .sec { margin-bottom: 18px; }
      .word-card { margin-bottom: 12px; page-break-inside: avoid; }
      .word-head { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; }
      .num { display: inline-flex; align-items: center; justify-content: center; width: 22px; height: 22px; border-radius: 999px; background: #e0f2fe; color: #0369a1; font-size: 12px; font-weight: 800; }
      .kr-big { font-size: 16px; color: #0f172a; }
      .en-model { font-family: Georgia, serif; font-size: 17px; font-weight: 700; color: #0369a1; margin-left: 4px; }
      .en-sentence { font-family: Georgia, serif; font-size: 18px; font-weight: 700; color: #1e293b; margin: 2px 0 4px 30px; }
      .trace-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
      .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
      .ruled-box { position: relative; height: 50px; margin-top: 2px; }
      .ruled-tall { height: 54px; }
      .r-line { position: absolute; left: 0; right: 0; border-top: 1px solid #cbd5e1; }
      .r-top { top: 8px; }
      .r-mid { top: 21px; border-top: 1px dashed #93c5fd; }
      .r-base { top: 35px; border-top: 1.5px solid #64748b; }
      .r-bot { top: 46px; }
      .trace-text { position: absolute; left: 8px; top: 8px; font-family: Georgia, "Times New Roman", serif; font-size: 25px; font-weight: 700; color: #cbd5e1; letter-spacing: 0.04em; line-height: 28px; user-select: none; }
      .qbox { margin-bottom: 12px; page-break-inside: avoid; }
      .qtitle { font-size: 15px; font-weight: 600; margin: 0 0 4px; }
      .hint { font-size: 13px; color: #475569; margin: 2px 0 0 18px; }
      @media print { .no-print { display: none; } }
    </style>
  </head><body>
    <div class="no-print" style="margin-bottom:12px; text-align:right;">
      <button onclick="window.print()" style="padding:8px 16px; background:#0284c7; color:#fff; border:none; border-radius:8px; font-weight:700; cursor:pointer;">인쇄 / PDF로 저장</button>
    </div>
    <div class="top">
      <div><div class="brand">BADA ENGLISH · 저학년 맞춤 줄노트 학습지</div><div style="font-size:16px;font-weight:800;">《${esc(targetBook.title)}》 (${esc(targetBook.level)})</div></div>
      <div class="meta">이름: <strong>${esc(studentName)}</strong> &nbsp;|&nbsp; 날짜: ____년 __월 __일</div>
    </div>
    ${bodyHtml}
    <script>setTimeout(() => window.print(), 300);</script>
  </body></html>`);
  win.document.close();
}

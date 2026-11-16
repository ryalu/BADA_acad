import type { Book, BookPageSpread, SpeakingQuestion, StudentUser } from "../types";

export const ALL_BADA_LEVELS = [
  "Pre-Level",
  "Level 1",
  "Level 2",
  "Level 3",
  "Level 4",
  "Level 5",
  "Level 6",
  "Level 7",
  "Level 8"
];

const FALLBACK_WORD_DICT: Record<string, { kr: string; phonetic: string; pos: string; tip: string }> = {
  look: { kr: "보다", phonetic: "/lʊk/", pos: "동사", tip: "at과 함께 쓰여 무언가를 콕 짚어 볼 때 씁니다." },
  at: { kr: "~을 향해", phonetic: "/æt/", pos: "전치사", tip: "look at은 '~을 봐!'라는 짝꿍 표현입니다." },
  the: { kr: "그", phonetic: "/ðə/", pos: "관사", tip: "서로 알고 있는 특정 대상을 가리킵니다." },
  a: { kr: "하나의", phonetic: "/ə/", pos: "관사", tip: "하나를 말할 때 단어 앞에 붙입니다." },
  an: { kr: "하나의", phonetic: "/ən/", pos: "관사", tip: "모음 소리 단어 앞에서 하나를 뜻합니다." },
  starfish: { kr: "불가사리", phonetic: "/ˈstɑːr.fɪʃ/", pos: "명사", tip: "별(star) 모양을 닮은 바다 생물입니다." },
  shining: { kr: "반짝이는", phonetic: "/ˈʃaɪ.nɪŋ/", pos: "형용사", tip: "햇빛이나 보석처럼 빛나는 모습입니다." },
  on: { kr: "~위에", phonetic: "/ɑːn/", pos: "전치사", tip: "표면 위에 닿아 있을 때 씁니다." },
  sandy: { kr: "모래가 깔린", phonetic: "/ˈsæn.di/", pos: "형용사", tip: "모래(sand)로 덮인 바닥을 뜻합니다." },
  floor: { kr: "바닥", phonetic: "/flɔːr/", pos: "명사", tip: "바닷속 아래 모래 바닥을 가리킵니다." },
  baby: { kr: "아기", phonetic: "/ˈbeɪ.bi/", pos: "명사", tip: "어리고 귀여운 아기를 뜻합니다." },
  whale: { kr: "고래", phonetic: "/weɪl/", pos: "명사", tip: "바다에 사는 커다란 고래입니다." },
  popo: { kr: "포포", phonetic: "/ˈpoʊ.poʊ/", pos: "이름", tip: "아기 고래 포포의 이름입니다." },
  swims: { kr: "헤엄치다", phonetic: "/swɪmz/", pos: "동사", tip: "물속을 헤엄쳐 나아갑니다." },
  across: { kr: "~을 가로질러", phonetic: "/əˈkrɔːs/", pos: "전치사", tip: "이쪽에서 저쪽까지 건너가는 뜻입니다." },
  coral: { kr: "산호", phonetic: "/ˈkɔːr.əl/", pos: "명사", tip: "바닷속 알록달록한 산호입니다." },
  reef: { kr: "산호초", phonetic: "/riːf/", pos: "명사", tip: "물고기들이 사는 산호초 지대입니다." },
  gentle: { kr: "다정한, 온순한", phonetic: "/ˈdʒen.təl/", pos: "형용사", tip: "성격이 부드럽고 친절한 모습입니다." },
  sea: { kr: "바다", phonetic: "/siː/", pos: "명사", tip: "넓고 푸른 바다입니다." },
  turtle: { kr: "거북이", phonetic: "/ˈtɜːr.təl/", pos: "명사", tip: "sea turtle은 바다거북입니다." },
  glides: { kr: "미끄러지듯 나아가다", phonetic: "/ɡlaɪdz/", pos: "동사", tip: "물결을 타고 부드럽게 헤엄칩니다." },
  through: { kr: "~사이를 통과해", phonetic: "/θruː/", pos: "전치사", tip: "공간 사이를 뚫고 지나갑니다." },
  clear: { kr: "맑고 투명한", phonetic: "/klɪr/", pos: "형용사", tip: "속이 환히 보이는 깨끗한 물입니다." },
  water: { kr: "물, 바닷물", phonetic: "/ˈwɔː.tər/", pos: "명사", tip: "맑고 시원한 물입니다." },
  together: { kr: "함께", phonetic: "/təˈɡeð.ər/", pos: "부사", tip: "여럿이 다 함께 행동할 때 씁니다." },
  they: { kr: "그들은", phonetic: "/ðeɪ/", pos: "대명사", tip: "앞서 나온 친구들을 가리킵니다." },
  find: { kr: "발견하다", phonetic: "/faɪnd/", pos: "동사", tip: "숨겨진 것을 찾아냅니다." },
  golden: { kr: "황금빛의", phonetic: "/ˈɡoʊl.dən/", pos: "형용사", tip: "금처럼 노랗게 빛나는 색입니다." },
  treasure: { kr: "보물", phonetic: "/ˈtreʒ.ər/", pos: "명사", tip: "귀중하고 반짝이는 보물입니다." },
  chest: { kr: "상자", phonetic: "/tʃest/", pos: "명사", tip: "보물을 담는 튼튼한 상자입니다." },
  under: { kr: "~아래에", phonetic: "/ˈʌn.dər/", pos: "전치사", tip: "무언가의 아래쪽 위치를 나타냅니다." }
};

const KNOWN_SENTENCE_KR: Record<string, string> = {
  "Look at the starfish shining on the sandy floor.": "모래 바닥 위에서 반짝이고 있는 저 불가사리를 봐.",
  "Baby whale Popo swims across the coral reef.": "아기 고래 포포가 아름다운 산호초 숲을 가로질러 헤엄쳐요.",
  "A gentle sea turtle glides through the clear water.": "다정한 바다거북 한 마리가 맑은 바닷물 사이로 미끄러지듯 나아가요.",
  "Together, they find a golden treasure chest under the sea!": "친구들은 다 함께 바닷속에서 황금 보물 상자를 발견해요!",
  "The secret island is protected by a warm ocean current.": "그 비밀의 섬은 따뜻한 바다 해류에 의해 안전하게 보호받아요.",
  "Baby whale Popo explores the glowing cave where ancient pearls are hidden.": "아기 고래 포포는 고대 진주들이 숨겨져 있는 빛나는 동굴을 탐험해요.",
  "Can you remember how the clear ocean water is kept clean by the coral reef?": "어떻게 맑은 바닷물이 산호초에 의해 깨끗하게 유지되는지 기억할 수 있니?",
  "Popo blows a big water bubble in the blue sea.": "포포가 푸른 바닷속에서 커다란 물방울을 불어요.",
  "Jump high over the soft waves with baby dolphin!": "아기 돌고래와 함께 부드러운 파도 위로 높이 점프해 봐!",
  "Look at the red crab dancing on the warm sandy beach.": "따뜻한 모래 해변 위에서 춤추고 있는 빨간 꽃게를 봐."
};

export function getStudentCurrentWeek(user?: StudentUser | null): 1 | 2 | 3 | 4 {
  if (!user) return 1;
  if (user.progress_w1 < 100) return 1;
  if (user.progress_w2 < 100) return 2;
  if (user.progress_w3 < 100) return 3;
  return 4;
}

export function getBookSentences(book?: Book | null): string[] {
  if (!book || !book.full_text) return [];
  return book.full_text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function getSentenceKoreanMeaning(book: Book | null | undefined, sentence: string, sIdx = -1): string {
  const cleanSent = String(sentence || "").trim();
  const norm = (str: string) => String(str || "").trim().toLowerCase().replace(/\s+/g, " ");

  if (book && Array.isArray(book.sentence_translations) && book.sentence_translations.length) {
    const matched = book.sentence_translations.find((st) => norm(st.en) === norm(cleanSent));
    if (matched?.kr) return matched.kr;
    if (sIdx >= 0 && book.sentence_translations[sIdx]?.kr) {
      return book.sentence_translations[sIdx].kr;
    }
  }

  if (KNOWN_SENTENCE_KR[cleanSent]) {
    return KNOWN_SENTENCE_KR[cleanSent];
  }

  const chunksInBook = book?.chunks || [];
  const matchedChunkKrs = chunksInBook
    .filter((c) => c.text && norm(cleanSent).includes(norm(c.text)))
    .map((c) => c.meaning_kr)
    .filter(Boolean);
  if (matchedChunkKrs.length > 0) {
    return matchedChunkKrs.join(" ");
  }

  return book?.subtitle_kr || "원서 문장을 읽으며 뜻을 익혀 보세요.";
}

/**
 * Splits a book's sentences into context-aware spreads (1-2 sentences per spread)
 * so children can flip pages like a real book without vertical scrolling.
 */
export function splitBookIntoContextPages(book?: Book | null): BookPageSpread[] {
  const sentences = getBookSentences(book);
  if (!sentences.length) return [];

  const spreads: BookPageSpread[] = [];
  let buffer: { sentenceIndex: number; en: string; kr: string }[] = [];
  let charCount = 0;

  sentences.forEach((en, idx) => {
    const kr = getSentenceKoreanMeaning(book, en, idx);
    const shouldBreakBefore =
      buffer.length >= 2 ||
      (buffer.length >= 1 && (charCount + en.length > 135 || en.length > 90));

    if (shouldBreakBefore) {
      spreads.push({ pageIndex: spreads.length, sentences: buffer });
      buffer = [];
      charCount = 0;
    }

    buffer.push({ sentenceIndex: idx, en, kr });
    charCount += en.length;
  });

  if (buffer.length > 0) {
    spreads.push({ pageIndex: spreads.length, sentences: buffer });
  }

  return spreads;
}

export function lookupWordMeaning(rawToken: string, book?: Book | null) {
  const clean = (rawToken || "").replace(/[^a-zA-Z]/g, "").toLowerCase();
  if (!clean) return { word: rawToken, kr: "단어", phonetic: "", pos: "", tip: "", isCore: false };

  const bookVocab = book?.vocab || [];
  const fromBook = bookVocab.find(
    (v) =>
      v.word?.toLowerCase() === clean ||
      v.surface?.replace(/[^a-zA-Z]/g, "").toLowerCase() === clean
  );
  if (fromBook) {
    return {
      word: fromBook.surface || fromBook.word,
      kr: fromBook.meaning_kr,
      phonetic: fromBook.phonetic || `/${clean}/`,
      pos: fromBook.pos || "핵심 단어",
      tip: fromBook.popo_tip || "원서 핵심 단어입니다.",
      isCore: !["단어", "기본어", "관사", "전치사", "접속사"].includes(fromBook.pos || "")
    };
  }

  const fromDict = FALLBACK_WORD_DICT[clean];
  if (fromDict) {
    return { word: clean, ...fromDict, isCore: false };
  }

  const stemCandidates: string[] = [];
  if (clean.endsWith("ing") && clean.length > 5) {
    stemCandidates.push(clean.slice(0, -3), `${clean.slice(0, -3)}e`);
  }
  if (clean.endsWith("ed") && clean.length > 4) {
    stemCandidates.push(clean.slice(0, -2), `${clean.slice(0, -2)}e`);
  }
  if (clean.endsWith("s") && clean.length > 2) {
    stemCandidates.push(clean.slice(0, -1), clean.slice(0, -2));
  }

  for (const root of stemCandidates) {
    const bv = bookVocab.find((v) => v.word?.toLowerCase() === root);
    if (bv) {
      return {
        word: clean,
        kr: bv.meaning_kr,
        phonetic: `/${clean}/`,
        pos: bv.pos || "단어",
        tip: bv.popo_tip || "원서에서 배운 단어입니다.",
        isCore: false
      };
    }
    if (FALLBACK_WORD_DICT[root]) {
      return { word: clean, ...FALLBACK_WORD_DICT[root], isCore: false };
    }
  }

  return {
    word: clean,
    kr: `${clean} (원서 어휘)`,
    phonetic: `/${clean}/`,
    pos: "단어",
    tip: "클릭하면 원어민 발음을 들을 수 있습니다.",
    isCore: false
  };
}

export interface SentenceChunkRange {
  text: string;
  meaning_kr: string;
  startWordIdx: number;
  endWordIdx: number;
}

export function getSentenceChunksForWeek2(sent: string, book?: Book | null): SentenceChunkRange[] {
  const words = (sent || "").split(/\s+/).filter(Boolean);
  if (!words.length) return [{ text: "", meaning_kr: "", startWordIdx: 0, endWordIdx: 0 }];

  const cleanStr = (s: string) =>
    (s || "").toLowerCase().replace(/[^a-z0-9\s]/g, "").replace(/\s+/g, " ").trim();
  const sentClean = cleanStr(sent);
  const bookChunks = book?.chunks || [];

  const matched: SentenceChunkRange[] = [];
  let cursorWordIdx = 0;

  bookChunks.forEach((c) => {
    const chunkClean = cleanStr(c.text);
    if (!chunkClean || !sentClean.includes(chunkClean)) return;
    const cWords = chunkClean.split(/\s+/).filter(Boolean);
    for (let i = cursorWordIdx; i <= words.length - cWords.length; i++) {
      const sliceClean = cleanStr(words.slice(i, i + cWords.length).join(" "));
      if (sliceClean === chunkClean) {
        matched.push({
          text: words.slice(i, i + cWords.length).join(" "),
          meaning_kr: c.meaning_kr || "의미 단위 구",
          startWordIdx: i,
          endWordIdx: i + cWords.length - 1
        });
        cursorWordIdx = i + cWords.length;
        break;
      }
    }
  });

  if (matched.length > 0) {
    const lastEnd = matched[matched.length - 1].endWordIdx;
    if (lastEnd < words.length - 1) {
      matched.push({
        text: words.slice(lastEnd + 1).join(" "),
        meaning_kr: getSentenceKoreanMeaning(book, sent),
        startWordIdx: lastEnd + 1,
        endWordIdx: words.length - 1
      });
    }
    return matched;
  }

  const breakPreps = new Set([
    "on", "in", "across", "through", "under", "with", "by", "where", "how", "over", "at", "for", "to"
  ]);
  let splitIdx = -1;
  for (let i = 2; i < words.length - 1; i++) {
    if (breakPreps.has(cleanStr(words[i]))) {
      splitIdx = i;
      break;
    }
  }
  if (splitIdx === -1 && words.length >= 4) {
    splitIdx = Math.ceil(words.length / 2);
  }

  if (splitIdx > 0 && splitIdx < words.length) {
    return [
      {
        text: words.slice(0, splitIdx).join(" "),
        meaning_kr: "앞부분 의미 구",
        startWordIdx: 0,
        endWordIdx: splitIdx - 1
      },
      {
        text: words.slice(splitIdx).join(" "),
        meaning_kr: "뒷부분 의미 구",
        startWordIdx: splitIdx,
        endWordIdx: words.length - 1
      }
    ];
  }

  return [
    {
      text: words.join(" "),
      meaning_kr: getSentenceKoreanMeaning(book, sent),
      startWordIdx: 0,
      endWordIdx: words.length - 1
    }
  ];
}

export interface FlashcardDeckItem {
  word: string;
  phonetic: string;
  pos: string;
  meaning_kr: string;
  popo_tip: string;
  example_en: string;
  example_kr: string;
}

export function getWeekDeckForBook(book: Book | null | undefined, weekNum: number): FlashcardDeckItem[] {
  const sentences = getBookSentences(book);
  const findEx = (tok: string) => {
    const cleanTok = (tok || "").toLowerCase().replace(/[^a-z\s]/g, "").trim();
    const idx = sentences.findIndex((s) => s.toLowerCase().replace(/[^a-z\s]/g, "").includes(cleanTok));
    const useIdx = idx >= 0 ? idx : 0;
    const en = sentences[useIdx] || book?.full_text || "";
    return {
      example_en: en,
      example_kr: getSentenceKoreanMeaning(book, en, useIdx)
    };
  };

  const vocab = book?.vocab || [];
  const chunks = book?.chunks || [];
  const exprs = book?.core_expressions || [];

  if (weekNum === 1) {
    return vocab.map((v) => ({
      word: v.word,
      phonetic: v.phonetic || `/${v.word}/`,
      pos: v.pos || "핵심 단어",
      meaning_kr: v.meaning_kr,
      popo_tip: v.popo_tip || "단어 소리를 듣고 큰 소리로 따라 말해 보세요.",
      ...findEx(v.word)
    }));
  }
  if (weekNum === 2) {
    return chunks.map((c, idx) => ({
      word: c.text,
      phonetic: `의미 구 #${idx + 1}`,
      pos: "2주차 의미 단위 구",
      meaning_kr: c.meaning_kr,
      popo_tip: "단어를 끊지 말고 한 호흡에 부드럽게 이어 읽어보세요.",
      ...findEx(c.text)
    }));
  }
  if (weekNum === 3) {
    return exprs.map((e) => ({
      word: e.expression,
      phonetic: `핵심 표현 #${e.rank || 1}`,
      pos: "3주차 핵심 표현",
      meaning_kr: e.meaning_kr,
      popo_tip: e.pattern_note || "스피킹 질문에 답할 때 활용해 보세요.",
      ...findEx(e.expression)
    }));
  }
  return [
    ...exprs.map((e) => ({
      word: e.expression,
      phonetic: "핵심 표현",
      pos: "4주차 마스터",
      meaning_kr: e.meaning_kr,
      popo_tip: e.pattern_note || "원어민 호흡으로 자연스럽게 말해 보세요.",
      ...findEx(e.expression)
    })),
    ...vocab.slice(0, 4).map((v) => ({
      word: v.word,
      phonetic: v.phonetic || `/${v.word}/`,
      pos: "필수 어휘",
      meaning_kr: v.meaning_kr,
      popo_tip: v.popo_tip || "원서 완주 필수 단어입니다.",
      ...findEx(v.word)
    }))
  ];
}

export function getWeekSpeakingQuestions(book: Book | null | undefined, weekNum: number): SpeakingQuestion[] {
  const vocab = book?.vocab || [];
  const chunks = book?.chunks || [];
  const exprs = book?.core_expressions || [];
  const sentences = getBookSentences(book);

  const dbQuestions: SpeakingQuestion[] =
    book?.speaking_questions && book.speaking_questions.length
      ? book.speaking_questions
      : [
          exprs[0]
            ? {
                en: `Can you use today's expression "${exprs[0].expression}" to tell Popo something fun?`,
                kr: `오늘 배운 표현 '${exprs[0].expression}'(${exprs[0].meaning_kr})를 넣어서 포포에게 영어로 말해 볼까요?`,
                target: exprs[0].expression
              }
            : {
                en: `Let's say "${sentences[0] || "Hello!"}" together!`,
                kr: "오늘 배운 문장을 큰 소리로 말해 볼까요?",
                target: sentences[0] || "Hello!"
              }
        ];

  if (weekNum === 1) {
    return vocab.slice(0, 3).map((v, idx) => ({
      en: `Word Quiz #${idx + 1}: How do you say "${v.meaning_kr}" in English?`,
      kr: `'${v.meaning_kr}'를 영어로 크게 말해 보세요. (힌트: ${v.word})`,
      target: v.word
    }));
  }
  if (weekNum === 2) {
    return chunks.slice(0, 3).map((c, idx) => ({
      en: `Phrase #${idx + 1}: Let's say "${c.text}" in one smooth breath!`,
      kr: `'${c.meaning_kr}'라는 뜻의 구를 끊지 말고 한 호흡으로 말해 보세요. (${c.text})`,
      target: c.text
    }));
  }
  if (weekNum === 3) {
    return dbQuestions;
  }
  const favSent = sentences[0] || "Look at the starfish shining on the sandy floor.";
  return [
    ...dbQuestions.slice(0, 2),
    {
      en: `Final Speaking: Can you say "${favSent}" with natural fluency?`,
      kr: `원어민 선생님 앞에서 말하듯 "${favSent}"를 자연스럽게 말해 보세요.`,
      target: favSent
    }
  ];
}


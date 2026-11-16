import type { PhonicsCurriculumTier } from "../types";

export interface PhonicsWordItem {
  sound: string;
  phonetic: string;
  word: string;
  meaning: string;
  example: string;
  tip: string;
}

export interface PhonicsLevelModule {
  tierLabel: string;
  unitTitle: string;
  unitDesc: string;
  items: PhonicsWordItem[];
}

export interface ClassCardItem {
  word: string;
  meaning: string;
  example: string;
  fromPhonics?: boolean;
  category?: string;
}

const PHONICS_TIERS: Record<string, PhonicsLevelModule> = {
  tier_pre_1: {
    tierLabel: "Pre-Level · Level 1",
    unitTitle: "단모음 & 기초 자음 통문자 파닉스",
    unitDesc: "원서와 별개로 기초 단모음(a, e, i, o)이 들어간 생활 영단어를 소리와 함께 익힙니다.",
    items: [
      { sound: "-at", phonetic: "/kæt/", word: "cat", meaning: "고양이", example: "The cat sits on the mat.", tip: "'크-애-트'를 한 번에 이어서 '캣'으로 읽어요." },
      { sound: "-ap", phonetic: "/mæp/", word: "map", meaning: "지도", example: "I have a big map.", tip: "'므-애-프'를 한 번에 묶어 '맵'으로 읽어요." },
      { sound: "-ed", phonetic: "/bed/", word: "bed", meaning: "침대", example: "It is time for bed.", tip: "입을 가볍게 벌려 '베드'라고 발음해요." },
      { sound: "-ig", phonetic: "/pɪɡ/", word: "pig", meaning: "돼지", example: "The pink pig runs fast.", tip: "짧은 /i/ 소리로 '피그'라고 읽어요." }
    ]
  },
  tier_2: {
    tierLabel: "Level 2",
    unitTitle: "이중자음 (sh · ch · th · wh) 파닉스",
    unitDesc: "두 글자가 만나 하나의 소리를 내는 이중자음 통문자를 집중 연습합니다.",
    items: [
      { sound: "sh-", phonetic: "/ʃɪp/", word: "ship", meaning: "배 (큰 배)", example: "A big ship sails far away.", tip: "'쉬~' 하는 조용한 소리로 시작하는 통문자입니다." },
      { sound: "ch-", phonetic: "/tʃer/", word: "chair", meaning: "의자", example: "Sit down on the chair.", tip: "'취-' 하고 힘차게 내뱉는 소리입니다." },
      { sound: "th-", phonetic: "/θriː/", word: "three", meaning: "숫자 3 (셋)", example: "I have three pencils.", tip: "혀끝을 윗니와 아랫니 사이에 살짝 대고 바람을 내보내요." },
      { sound: "wh-", phonetic: "/wiːl/", word: "wheel", meaning: "바퀴", example: "The bike wheel spins fast.", tip: "입술을 동그랗게 오므렸다가 펴며 '윌' 하고 읽어요." }
    ]
  },
  tier_3_4: {
    tierLabel: "Level 3 · Level 4",
    unitTitle: "장모음 & 매직 e (Magic-E) 파닉스",
    unitDesc: "끝에 오는 e가 앞 모음을 길게 알파벳 이름으로 발음하게 만드는 규칙을 익힙니다.",
    items: [
      { sound: "a_e", phonetic: "/keɪk/", word: "cake", meaning: "케이크", example: "We share a sweet cake.", tip: "끝의 e는 소리가 없고 앞의 a가 '에이' 소리가 납니다." },
      { sound: "i_e", phonetic: "/kaɪt/", word: "kite", meaning: "연", example: "Fly a colorful kite high.", tip: "끝의 e 덕분에 앞의 i가 '아이' 소리가 납니다." },
      { sound: "ee", phonetic: "/triː/", word: "tree", meaning: "나무", example: "Birds sing in the green tree.", tip: "e가 두 번 만나 길고 맑은 '이-' 소리를 냅니다." },
      { sound: "oa", phonetic: "/boʊt/", word: "boat", meaning: "보트 (작은 배)", example: "Row the wooden boat.", tip: "o와 a가 만나 길게 '오우' 소리를 냅니다." }
    ]
  },
  tier_5_6: {
    tierLabel: "Level 5 · Level 6",
    unitTitle: "R-통제 모음 & 이중모음 파닉스",
    unitDesc: "모음 뒤의 r과 이중모음(ou, oi)이 만드는 묵직한 영어 리듬을 익힙니다.",
    items: [
      { sound: "ar", phonetic: "/pɑːrk/", word: "park", meaning: "공원", example: "Let's walk in the sunny park.", tip: "혀를 살짝 말아 올리며 '아르' 소리를 내요." },
      { sound: "or", phonetic: "/stɔːrm/", word: "storm", meaning: "폭풍", example: "A loud storm is coming.", tip: "입을 둥글게 모아 '오르' 소리로 연결해요." },
      { sound: "ou", phonetic: "/klaʊd/", word: "cloud", meaning: "구름", example: "Look at that fluffy white cloud.", tip: "'아우' 하고 입을 크게 벌렸다가 모아요." },
      { sound: "oi", phonetic: "/kɔɪn/", word: "coin", meaning: "동전", example: "I found a shiny coin.", tip: "'오이' 소리를 한 음절로 부드럽게 연결해요." }
    ]
  },
  tier_7_8: {
    tierLabel: "Level 7 · Level 8",
    unitTitle: "고급 음절 · 묵음 & 접미사 파닉스",
    unitDesc: "중등 내신·고급 어휘에 자주 나오는 묵음(kn)과 접미사(-tion, -ous) 패턴을 익힙니다.",
    items: [
      { sound: "kn-", phonetic: "/naɪt/", word: "knight", meaning: "기사", example: "The brave knight guards the castle.", tip: "k는 소리가 나지 않는 묵음이라 '나이트'로 읽어요." },
      { sound: "ph-", phonetic: "/ˈfoʊ.toʊ/", word: "photo", meaning: "사진", example: "Take a photo of the sunset.", tip: "p와 h가 만나 /f/ 소리를 냅니다." },
      { sound: "-tion", phonetic: "/ˈsteɪ.ʃən/", word: "station", meaning: "역, 정거장", example: "Meet me at the train station.", tip: "-tion은 항상 '션'으로 발음됩니다." },
      { sound: "-ous", phonetic: "/ˈfeɪ.məs/", word: "famous", meaning: "유명한", example: "She is a famous writer.", tip: "-ous는 힘을 빼고 가볍게 '어스'로 읽어요." }
    ]
  }
};

const EXTRA_CLASSCARD_BY_TIER: Record<string, ClassCardItem[]> = {
  tier_pre_1: [
    { word: "apple", meaning: "사과", example: "I eat a red apple." },
    { word: "book", meaning: "책", example: "Open your English book." }
  ],
  tier_2: [
    { word: "clock", meaning: "시계", example: "Check the wall clock." },
    { word: "smile", meaning: "미소 짓다", example: "Give me a big smile." }
  ],
  tier_3_4: [
    { word: "library", meaning: "도서관", example: "Let's read at the library." },
    { word: "bridge", meaning: "다리", example: "Cross the stone bridge." }
  ],
  tier_5_6: [
    { word: "journey", meaning: "여행, 여정", example: "Our exciting journey begins." },
    { word: "planet", meaning: "행성", example: "Earth is a blue planet." }
  ],
  tier_7_8: [
    { word: "adventure", meaning: "모험", example: "Life is a great adventure." },
    { word: "knowledge", meaning: "지식", example: "Reading builds your knowledge." }
  ]
};

export function resolvePhonicsTierKey(level?: string): string {
  const lv = String(level || "Level 2").toLowerCase();
  if (lv.includes("pre") || lv.includes("1")) return "tier_pre_1";
  if (lv.includes("2")) return "tier_2";
  if (lv.includes("3") || lv.includes("4")) return "tier_3_4";
  if (lv.includes("5") || lv.includes("6")) return "tier_5_6";
  if (lv.includes("7") || lv.includes("8")) return "tier_7_8";
  return "tier_2";
}

export function getPhonicsModuleForLevel(
  level?: string,
  dbTiers?: PhonicsCurriculumTier[]
): PhonicsLevelModule {
  const key = resolvePhonicsTierKey(level);
  const dbTier = dbTiers?.find((t) => t.id === key);
  if (dbTier && dbTier.phonics_words?.length) {
    return {
      tierLabel: dbTier.level_label,
      unitTitle: dbTier.title_kr,
      unitDesc: dbTier.desc_kr,
      items: dbTier.phonics_words.map((w) => ({
        sound: w.pattern,
        phonetic: "",
        word: w.word,
        meaning: w.meaning_kr,
        example: w.example_en,
        tip: w.tip_kr
      }))
    };
  }
  return PHONICS_TIERS[key] || PHONICS_TIERS.tier_2;
}

/**
 * ClassCard deck includes BOTH the student's current-level Phonics words (10~15)
 * AND essential basic words (numbers, days, months, prepositions) from DB.
 */
export function getClassCardDeckForLevel(
  level?: string,
  dbTiers?: PhonicsCurriculumTier[]
): ClassCardItem[] {
  const key = resolvePhonicsTierKey(level);
  const dbTier = dbTiers?.find((t) => t.id === key);
  if (dbTier && (dbTier.phonics_words?.length || dbTier.basic_words?.length)) {
    const phonicsCards: ClassCardItem[] = (dbTier.phonics_words || []).map((p) => ({
      word: p.word,
      meaning: p.meaning_kr,
      example: p.example_en,
      fromPhonics: true,
      category: `파닉스 · ${p.pattern}`
    }));
    const basicCards: ClassCardItem[] = (dbTier.basic_words || []).map((b) => ({
      word: b.word,
      meaning: b.meaning_kr,
      example: b.example_en,
      fromPhonics: false,
      category: b.category
    }));
    return [...phonicsCards, ...basicCards];
  }

  const phonics = getPhonicsModuleForLevel(level);
  const phonicsCards: ClassCardItem[] = phonics.items.map((p) => ({
    word: p.word,
    meaning: p.meaning,
    example: p.example,
    fromPhonics: true,
    category: `파닉스 · ${p.sound}`
  }));
  const extras = (EXTRA_CLASSCARD_BY_TIER[key] || EXTRA_CLASSCARD_BY_TIER.tier_2).map((e) => ({
    ...e,
    category: "기초 어휘"
  }));
  return [...phonicsCards, ...extras];
}


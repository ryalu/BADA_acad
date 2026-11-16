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

export interface PhonicsStageWord {
  word: string;
  meaning: string;
  example: string;
}

export function splitOnsetRime(word: string): { onset: string; rime: string } {
  const clean = String(word || "").trim();
  const m = clean.match(
    /^(sh|ch|th|wh|ph|kn|wr|bl|cl|fl|sl|br|cr|fr|tr|sm|sn|sp|st|sw|[bcdfghjklmnpqrstvwxyz])(.+)$/i
  );
  if (!m) return { onset: "", rime: clean };
  return { onset: m[1], rime: m[2] };
}

export interface PhonicsStage26 {
  stage: number;
  soundSymbol: string;
  soundLabel: string;
  pronunciationGuide: string;
  words: PhonicsStageWord[];
}

export const PHONICS_26_STAGES: PhonicsStage26[] = [
  {
    stage: 1,
    soundSymbol: "Short a (-at / -ap)",
    soundLabel: "a = [애] · -at [앳]",
    pronunciationGuide: "a = [애], t = [트] ➔ 합치면 [앳]! 앞 자음 소리를 붙여 읽어 보세요.",
    words: [
      { word: "cat", meaning: "고양이", example: "A cute cat sits on the mat." },
      { word: "hat", meaning: "모자", example: "Put on your blue hat." },
      { word: "mat", meaning: "매트, 깔개", example: "Sit down on the soft mat." },
      { word: "bat", meaning: "야구 방망이, 박쥐", example: "Swing the bat and hit the ball." },
      { word: "map", meaning: "지도", example: "Look at the treasure map." },
      { word: "cap", meaning: "야구모자", example: "My red cap is on the desk." }
    ]
  },
  {
    stage: 2,
    soundSymbol: "Short a (-an / -ag)",
    soundLabel: "a = [애] · -an [앤] · -ag [애그]",
    pronunciationGuide: "a = [애], n = [느], g = [그] ➔ [앤 / 애그]! 앞 자음 물방울과 합쳐 보세요.",
    words: [
      { word: "can", meaning: "할 수 있다, 캔", example: "I can swim in the sea." },
      { word: "man", meaning: "남자", example: "The kind man smiles at us." },
      { word: "pan", meaning: "프라이팬", example: "Cook an egg in the pan." },
      { word: "fan", meaning: "선풍기, 부채", example: "Turn on the cool fan." },
      { word: "bag", meaning: "가방", example: "My school bag is blue." },
      { word: "tag", meaning: "꼬리표", example: "Write your name on the tag." }
    ]
  },
  {
    stage: 3,
    soundSymbol: "Short e (-ed / -en / -et)",
    soundLabel: "e = [에] · -ed [에드] · -en [엔]",
    pronunciationGuide: "e = [에]! 입을 살짝 벌려 '에' 소리 낸 뒤, d [드]·n [느]·t [트]를 이어 읽어요.",
    words: [
      { word: "bed", meaning: "침대", example: "Go to bed early tonight." },
      { word: "red", meaning: "빨간색", example: "I like the red apple." },
      { word: "pen", meaning: "펜", example: "Draw a star with a pen." },
      { word: "ten", meaning: "열 (10)", example: "Count from one to ten." },
      { word: "pet", meaning: "반려동물", example: "Popo is my ocean pet." },
      { word: "net", meaning: "그물", example: "Catch the ball in the net." }
    ]
  },
  {
    stage: 4,
    soundSymbol: "Short i (-ig / -in / -it)",
    soundLabel: "i = [이] · -ig [이그] · -it [잇]",
    pronunciationGuide: "i = [이]! 짧게 '이' 하고, g [그]·n [느]·t [트]와 바로 연결해서 읽어요.",
    words: [
      { word: "pig", meaning: "돼지", example: "The pink pig likes mud." },
      { word: "big", meaning: "큰", example: "Look at that big whale!" },
      { word: "dig", meaning: "파다", example: "Let us dig in the sand." },
      { word: "pin", meaning: "핀", example: "Put the shiny pin here." },
      { word: "sit", meaning: "앉다", example: "Please sit on the chair." },
      { word: "hit", meaning: "치다", example: "Hit the ball with the bat." }
    ]
  },
  {
    stage: 5,
    soundSymbol: "Short o (-og / -op / -ot)",
    soundLabel: "o = [오/아] · -og [오그] · -op [옵]",
    pronunciationGuide: "o = [오/아]! 입을 동그랗게 벌려 '오' 한 뒤, g [그]·p [프]·t [트]를 붙여요.",
    words: [
      { word: "dog", meaning: "강아지", example: "The happy dog runs fast." },
      { word: "log", meaning: "통나무", example: "A frog sits on the log." },
      { word: "hop", meaning: "깡충 뛰다", example: "Bunnies hop on the grass." },
      { word: "top", meaning: "꼭대기, 팽이", example: "Spin the colorful top." },
      { word: "hot", meaning: "뜨거운, 더운", example: "The summer sun is hot." },
      { word: "pot", meaning: "냄비, 화분", example: "Plant a seed in the pot." }
    ]
  },
  {
    stage: 6,
    soundSymbol: "Short u (-un / -ug / -up)",
    soundLabel: "u = [어] · -un [언] · -ug [어그]",
    pronunciationGuide: "u = [어]! 힘을 빼고 '어' 소리에 n [느]·g [그]·p [프]를 이어서 말해요.",
    words: [
      { word: "sun", meaning: "태양", example: "The bright sun shines today." },
      { word: "run", meaning: "달리다", example: "Run across the green yard." },
      { word: "fun", meaning: "재미있는", example: "English class is so fun!" },
      { word: "bug", meaning: "벌레", example: "A tiny bug is on the leaf." },
      { word: "hug", meaning: "안아주다", example: "Give your mom a big hug." },
      { word: "cup", meaning: "컵", example: "Drink water from the cup." }
    ]
  },
  {
    stage: 7,
    soundSymbol: "Magic e (a_e)",
    soundLabel: "매직 e · 긴 [에이]",
    pronunciationGuide: "맨 끝 e는 소리를 숨기고, 앞의 a에게 '에이~' 알파벳 이름을 부르게 해줘요!",
    words: [
      { word: "cake", meaning: "케이크", example: "We share a sweet cake." },
      { word: "lake", meaning: "호수", example: "Ducks swim in the lake." },
      { word: "make", meaning: "만들다", example: "Let us make a sand castle." },
      { word: "name", meaning: "이름", example: "Write your name clearly." },
      { word: "game", meaning: "게임, 놀이", example: "Play a fun word game." },
      { word: "wave", meaning: "파도, 손 흔들다", example: "Watch the ocean wave roll." }
    ]
  },
  {
    stage: 8,
    soundSymbol: "Magic e (i_e)",
    soundLabel: "매직 e · 긴 [아이]",
    pronunciationGuide: "끝의 조용한 e 덕분에 앞의 i가 '아이~' 하고 길게 변신해요.",
    words: [
      { word: "bike", meaning: "자전거", example: "I ride my bike to school." },
      { word: "like", meaning: "좋아하다", example: "I like blue sea animals." },
      { word: "kite", meaning: "연", example: "Fly a kite in the wind." },
      { word: "time", meaning: "시간", example: "It is time to read books." },
      { word: "five", meaning: "다섯 (5)", example: "Give me a high five!" },
      { word: "smile", meaning: "미소 짓다", example: "Give a bright smile today." }
    ]
  },
  {
    stage: 9,
    soundSymbol: "Magic e (o_e / u_e)",
    soundLabel: "매직 e · [오우 / 유]",
    pronunciationGuide: "끝에 e가 오면 o는 '오우~', u는 '유~' 하고 입술을 둥글게 내밀며 길게 읽어요.",
    words: [
      { word: "home", meaning: "집", example: "Let us go home together." },
      { word: "bone", meaning: "뼈", example: "The puppy found a bone." },
      { word: "nose", meaning: "코", example: "Touch your nose gently." },
      { word: "rose", meaning: "장미", example: "Smell the pretty red rose." },
      { word: "cube", meaning: "정육면체", example: "Put an ice cube in juice." },
      { word: "cute", meaning: "귀여운", example: "Popo is a cute baby whale." }
    ]
  },
  {
    stage: 10,
    soundSymbol: "Digraph sh",
    soundLabel: "이중자음 sh [쉬]",
    pronunciationGuide: "s와 h가 만나 '조용히 해~' 할 때처럼 입술을 동그랗게 모아 [쉬] 소리를 내요.",
    words: [
      { word: "ship", meaning: "큰 배", example: "A big ship sails on the sea." },
      { word: "shop", meaning: "가게", example: "Visit the ice cream shop." },
      { word: "shell", meaning: "조개껍질", example: "I found a pink shell." },
      { word: "fish", meaning: "물고기", example: "A silver fish jumps high." },
      { word: "wish", meaning: "소원", example: "Make a wish upon a star." },
      { word: "wash", meaning: "씻다", example: "Wash your hands before lunch." }
    ]
  },
  {
    stage: 11,
    soundSymbol: "Digraph ch",
    soundLabel: "이중자음 ch [취]",
    pronunciationGuide: "기차 소리 '칙칙폭폭!'처럼 입에서 바람을 힘차게 끊어 [취] 소리를 내요.",
    words: [
      { word: "chat", meaning: "이야기하다", example: "Friends chat after class." },
      { word: "chin", meaning: "턱", example: "Point to your chin." },
      { word: "chip", meaning: "감자칩, 조각", example: "Share a crunchy potato chip." },
      { word: "chop", meaning: "자르다", example: "Chop the fresh carrots." },
      { word: "rich", meaning: "부자인, 풍부한", example: "The ocean is rich in life." },
      { word: "lunch", meaning: "점심", example: "Eat a yummy school lunch." }
    ]
  },
  {
    stage: 12,
    soundSymbol: "Digraph th",
    soundLabel: "이중자음 th [쓰/드]",
    pronunciationGuide: "혀끝을 윗니와 아랫니 사이에 살짝 물고 바람을 '쓰~' 하고 내보내요.",
    words: [
      { word: "thin", meaning: "얇은", example: "This paper is very thin." },
      { word: "thick", meaning: "두꺼운", example: "Read a thick storybook." },
      { word: "three", meaning: "셋 (3)", example: "Count one, two, three!" },
      { word: "bath", meaning: "목욕", example: "Take a warm bubble bath." },
      { word: "math", meaning: "수학", example: "I enjoy fun math puzzles." },
      { word: "this", meaning: "이것", example: "This shell is shiny." }
    ]
  },
  {
    stage: 13,
    soundSymbol: "Digraph wh / ph",
    soundLabel: "이중자음 wh [우] · ph [프]",
    pronunciationGuide: "wh는 입술을 동그랗게 오므려 [우], ph는 윗니로 아랫입술을 살짝 스치며 [프] 소리!",
    words: [
      { word: "whale", meaning: "고래", example: "A baby whale swims happily." },
      { word: "wheel", meaning: "바퀴", example: "The bike wheel spins fast." },
      { word: "white", meaning: "하얀색", example: "White clouds float above." },
      { word: "phone", meaning: "전화기", example: "Answer the phone politely." },
      { word: "photo", meaning: "사진", example: "Take a photo of the sea." },
      { word: "dolphin", meaning: "돌고래", example: "A dolphin leaps over waves." }
    ]
  },
  {
    stage: 14,
    soundSymbol: "L-Blends (bl / cl / fl / sl)",
    soundLabel: "L 자음군 [블·클·플·슬]",
    pronunciationGuide: "앞 자음과 L을 끊지 말고 한 번에 부드럽게 미끄러지듯 이어 읽어요.",
    words: [
      { word: "blue", meaning: "파란색", example: "Look at the deep blue ocean." },
      { word: "black", meaning: "검은색", example: "I have a black pen." },
      { word: "clap", meaning: "박수치다", example: "Clap your hands together!" },
      { word: "clock", meaning: "시계", example: "Check the wall clock." },
      { word: "flag", meaning: "깃발", example: "Wave the colorful flag." },
      { word: "slide", meaning: "미끄럼틀, 미끄러지다", example: "Slide down into the pool." }
    ]
  },
  {
    stage: 15,
    soundSymbol: "R-Blends (br / cr / fr / tr)",
    soundLabel: "R 자음군 [브르·크르·프르·트르]",
    pronunciationGuide: "혀끝을 입천장에 대지 않고 살짝 말면서 앞 자음과 빠르게 연결해요.",
    words: [
      { word: "brave", meaning: "용감한", example: "Popo is a brave explorer." },
      { word: "crab", meaning: "게", example: "A little crab walks sideways." },
      { word: "frog", meaning: "개구리", example: "A green frog hops high." },
      { word: "friend", meaning: "친구", example: "You are my best friend." },
      { word: "tree", meaning: "나무", example: "Birds sing in the tall tree." },
      { word: "train", meaning: "기차", example: "The fast train arrives soon." }
    ]
  },
  {
    stage: 16,
    soundSymbol: "S-Blends (sm / sn / sp / st / sw)",
    soundLabel: "S 자음군 [스ㅁ·스ㄴ·스ㅍ·스ㅌ·스ㅇ]",
    pronunciationGuide: "첫 글자 s에 '으'를 넣지 말고 작게 '스-' 바람만 낸 뒤 바로 다음 소리를 내요.",
    words: [
      { word: "small", meaning: "작은", example: "A small fish hides in coral." },
      { word: "snow", meaning: "눈", example: "White snow falls softly." },
      { word: "spot", meaning: "점, 장소", example: "Find a sunny picnic spot." },
      { word: "star", meaning: "별", example: "A bright starfish glows." },
      { word: "stop", meaning: "멈추다", example: "Stop at the red light." },
      { word: "swim", meaning: "수영하다", example: "Dolphins swim very fast." }
    ]
  },
  {
    stage: 17,
    soundSymbol: "Vowel Team (ai / ay)",
    soundLabel: "이중모음 ai · ay [에이]",
    pronunciationGuide: "a와 i(또는 y)가 나란히 서면 앞 글자 a만 길게 '에이~' 하고 소리 나요.",
    words: [
      { word: "rain", meaning: "비", example: "Rain falls on the ocean." },
      { word: "tail", meaning: "꼬리", example: "The whale splashes its tail." },
      { word: "sail", meaning: "항해하다, 돛", example: "Sail across the calm bay." },
      { word: "play", meaning: "놀다", example: "Children play in the yard." },
      { word: "day", meaning: "낮, 하루", example: "Have a wonderful day!" },
      { word: "stay", meaning: "머무르다", example: "Stay safe near the shore." }
    ]
  },
  {
    stage: 18,
    soundSymbol: "Vowel Team (ee / ea)",
    soundLabel: "이중모음 ee · ea [이~]",
    pronunciationGuide: "e 두 개나 ea가 만나면 입꼬리를 옆으로 당기며 맑고 길게 '이~' 소리 내요.",
    words: [
      { word: "seed", meaning: "씨앗", example: "Plant a tiny seed today." },
      { word: "deep", meaning: "깊은", example: "Dive into the deep blue sea." },
      { word: "sleep", meaning: "자다", example: "Sea otters sleep on water." },
      { word: "sea", meaning: "바다", example: "The sea sparkles in sunlight." },
      { word: "leaf", meaning: "나뭇잎", example: "A green leaf floats down." },
      { word: "dream", meaning: "꿈", example: "I had a sweet ocean dream." }
    ]
  },
  {
    stage: 19,
    soundSymbol: "Vowel Team (oa / ow)",
    soundLabel: "이중모음 oa · ow [오우~]",
    pronunciationGuide: "입술을 동그랗게 모아서 길고 부드럽게 '오우~' 하고 발음해요.",
    words: [
      { word: "boat", meaning: "보트 (작은 배)", example: "Row the boat gently." },
      { word: "coat", meaning: "외투", example: "Wear a warm winter coat." },
      { word: "goat", meaning: "염소", example: "A white goat eats grass." },
      { word: "road", meaning: "길, 도로", example: "Walk safely on the road." },
      { word: "glow", meaning: "빛나다", example: "Pearls glow in the dark cave." },
      { word: "slow", meaning: "느린", example: "The sea turtle moves slow." }
    ]
  },
  {
    stage: 20,
    soundSymbol: "Double O (oo)",
    soundLabel: "긴 oo [우~] · 짧은 oo [우]",
    pronunciationGuide: "moon처럼 길게 '우~' 소리 나기도 하고, book처럼 짧게 '우!' 하고 끊기도 해요.",
    words: [
      { word: "moon", meaning: "달", example: "The full moon shines brightly." },
      { word: "pool", meaning: "수영장", example: "Splash in the cool pool." },
      { word: "spoon", meaning: "숟가락", example: "Use a silver spoon." },
      { word: "book", meaning: "책", example: "Open your English book." },
      { word: "look", meaning: "보다", example: "Look at the coral reef." },
      { word: "foot", meaning: "발", example: "Step gently with your foot." }
    ]
  },
  {
    stage: 21,
    soundSymbol: "R-Controlled (ar / or)",
    soundLabel: "R통제 모음 ar [아르] · or [오르]",
    pronunciationGuide: "a나 o 뒤에 r이 오면 혀를 살짝 뒤로 말면서 묵직하게 '아르', '오르' 소리를 내요.",
    words: [
      { word: "park", meaning: "공원", example: "Walk in the sunny park." },
      { word: "dark", meaning: "어두운", example: "Explore the dark sea cave." },
      { word: "shark", meaning: "상어", example: "A friendly shark swims by." },
      { word: "storm", meaning: "폭풍", example: "Sail safely through the storm." },
      { word: "coral", meaning: "산호", example: "Colorful coral grows here." },
      { word: "north", meaning: "북쪽", example: "The compass points north." }
    ]
  },
  {
    stage: 22,
    soundSymbol: "R-Controlled (er / ir / ur)",
    soundLabel: "R통제 모음 er·ir·ur [어르]",
    pronunciationGuide: "er, ir, ur 세 친구는 모두 입을 살짝 모으고 혀를 말며 같은 [어르] 소리를 내요!",
    words: [
      { word: "bird", meaning: "새", example: "A sea bird flies high." },
      { word: "girl", meaning: "소녀", example: "The girl loves reading books." },
      { word: "first", meaning: "첫 번째", example: "Finish the first stage!" },
      { word: "turn", meaning: "돌다, 차례", example: "Now it is your turn." },
      { word: "turtle", meaning: "거북이", example: "A sea turtle glides slowly." },
      { word: "water", meaning: "물", example: "Clear water feels cool." }
    ]
  },
  {
    stage: 23,
    soundSymbol: "Diphthong (ou / ow)",
    soundLabel: "이중모음 ou · ow [아우]",
    pronunciationGuide: "'아!' 하고 입을 크게 벌렸다가 '우!' 하고 오므리면서 한 번에 [아우]로 읽어요.",
    words: [
      { word: "cloud", meaning: "구름", example: "A fluffy cloud drifts by." },
      { word: "sound", meaning: "소리", example: "Listen to the ocean sound." },
      { word: "found", meaning: "찾았다", example: "Popo found a bright pearl." },
      { word: "house", meaning: "집", example: "A shell is a crab's house." },
      { word: "cow", meaning: "소", example: "A brown cow eats hay." },
      { word: "brown", meaning: "갈색", example: "See the brown sea rock." }
    ]
  },
  {
    stage: 24,
    soundSymbol: "Diphthong (oi / oy)",
    soundLabel: "이중모음 oi · oy [오이]",
    pronunciationGuide: "입을 동그랗게 '오' 했다가 입꼬리를 당기며 '이'로 자연스럽게 이어 [오이]로 읽어요.",
    words: [
      { word: "coin", meaning: "동전", example: "Find a gold coin in sand." },
      { word: "voice", meaning: "목소리", example: "Read with a clear voice." },
      { word: "point", meaning: "가리키다", example: "Point to the right answer." },
      { word: "join", meaning: "함께하다", example: "Join our ocean adventure!" },
      { word: "boy", meaning: "소년", example: "The boy reads every day." },
      { word: "joy", meaning: "기쁨", example: "Reading brings us great joy." }
    ]
  },
  {
    stage: 25,
    soundSymbol: "Silent Letters (kn / wr / -mb / -igh)",
    soundLabel: "묵음 자음 · -igh [아이]",
    pronunciationGuide: "kn의 k, wr의 w, -mb의 b, -igh의 gh는 글자만 있고 소리는 숨겨져 있어요!",
    words: [
      { word: "knight", meaning: "기사", example: "The brave knight stood tall." },
      { word: "know", meaning: "알다", example: "I know many English words." },
      { word: "write", meaning: "쓰다", example: "Write neatly on the lines." },
      { word: "climb", meaning: "오르다", example: "Climb up the sandy hill." },
      { word: "light", meaning: "빛", example: "Sunlight enters the cave." },
      { word: "bright", meaning: "밝은", example: "The pearl looks very bright." }
    ]
  },
  {
    stage: 26,
    soundSymbol: "Suffixes (-tion / -sion / -ous / -ture)",
    soundLabel: "접미사 [-션 / -어스 / -처]",
    pronunciationGuide: "단어 끝 -tion은 [션], -ous는 가볍게 [어스], -ture는 [처]로 끊어 읽으면 쉬워요!",
    words: [
      { word: "station", meaning: "역, 정거장", example: "Wait at the train station." },
      { word: "action", meaning: "행동", example: "Small actions make change." },
      { word: "mission", meaning: "임무", example: "Complete your daily mission." },
      { word: "famous", meaning: "유명한", example: "This reef is very famous." },
      { word: "curious", meaning: "호기심 많은", example: "Curious kids learn fast." },
      { word: "nature", meaning: "자연", example: "Protect ocean nature together." }
    ]
  }
];


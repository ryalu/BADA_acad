/**
 * Korean-learner confusing pronunciation rules & automatic focus selector.
 * Automatically picks 2-3 high-yield pronunciation checkpoints from today's studied words.
 */

const PRONUNCIATION_RULES = [
  {
    id: "sl_blend",
    label: "sl vs sh/s",
    title_kr: "sl [슬] — s 뒤에 '으'를 넣지 않고 혀끝을 바로 윗니 뒤 L로 올려요",
    mouth_tip_kr: "sleep을 '슬립'처럼 끊어 발음하지 말고, [쓰-] 소리를 내자마자 혀끝을 윗니 뒤에 붙여 부드럽게 이어서 말해요!",
    pattern: "sl",
    regex: /sl/i,
    contrastPairs: [
      { leftWord: "sleep", leftMeaning: "자다", leftHighlight: "sl", rightWord: "sheep", rightMeaning: "양", rightHighlight: "sh" },
      { leftWord: "slide", leftMeaning: "미끄러지다", leftHighlight: "sl", rightWord: "side", rightMeaning: "옆", rightHighlight: "s" }
    ]
  },
  {
    id: "l_vs_r",
    label: "L vs R",
    title_kr: "L [을] vs R [르] — 혀끝이 닿으면 L, 혀를 말아 띄우면 R",
    mouth_tip_kr: "L은 혀끝을 윗니 뒷잇몸에 꼭 붙이고, R은 입술을 살짝 오므리며 혀를 천장에 대지 않고 안으로 말아요.",
    pattern: "l/r",
    regex: /\b(?:l|r)[a-z]/i,
    contrastPairs: [
      { leftWord: "light", leftMeaning: "빛 · 가벼운", leftHighlight: "l", rightWord: "right", rightMeaning: "오른쪽 · 맞는", rightHighlight: "r" },
      { leftWord: "long", leftMeaning: "긴", leftHighlight: "l", rightWord: "wrong", rightMeaning: "틀린", rightHighlight: "wr" }
    ]
  },
  {
    id: "bl_vs_br",
    label: "bl vs br",
    title_kr: "bl [블] vs br [브르] — b 뒤의 L과 R 구별하기",
    mouth_tip_kr: "입술을 붙였다 터뜨린 뒤 L은 혀끝을 윗니 뒤에 대고(blue), R은 혀를 둥글게 말아요(brown)!",
    pattern: "bl/br",
    regex: /\b(?:bl|br)[a-z]/i,
    contrastPairs: [
      { leftWord: "black", leftMeaning: "검은색", leftHighlight: "bl", rightWord: "bread", rightMeaning: "빵", rightHighlight: "br" },
      { leftWord: "blow", leftMeaning: "불다", leftHighlight: "bl", rightWord: "brown", rightMeaning: "갈색", rightHighlight: "br" }
    ]
  },
  {
    id: "cl_vs_cr",
    label: "cl vs cr",
    title_kr: "cl [클] vs cr [크르] — '크' 소리에 이어지는 L과 R",
    mouth_tip_kr: "class의 cl은 혀끝이 윗니 뒤에 닿고, cry의 cr은 혀가 어디에도 닿지 않고 뒤로 말립니다.",
    pattern: "cl/cr",
    regex: /\b(?:cl|cr)[a-z]/i,
    contrastPairs: [
      { leftWord: "cloud", leftMeaning: "구름", leftHighlight: "cl", rightWord: "crowd", rightMeaning: "군중", rightHighlight: "cr" },
      { leftWord: "clean", leftMeaning: "깨끗한", leftHighlight: "cl", rightWord: "cream", rightMeaning: "크림", rightHighlight: "cr" }
    ]
  },
  {
    id: "fl_vs_fr",
    label: "fl vs fr",
    title_kr: "fl [플] vs fr [프르] — 윗니-아랫입술 바람 + L/R",
    mouth_tip_kr: "윗니로 아랫입술을 살짝 스치며 바람(F)을 낸 다음, 혀를 올리면 fl(fly), 혀를 말면 fr(frog)이에요.",
    pattern: "fl/fr",
    regex: /\b(?:fl|fr)[a-z]/i,
    contrastPairs: [
      { leftWord: "fly", leftMeaning: "날다", leftHighlight: "fl", rightWord: "fry", rightMeaning: "튀기다", rightHighlight: "fr" },
      { leftWord: "flower", leftMeaning: "꽃", leftHighlight: "fl", rightWord: "friend", rightMeaning: "친구", rightHighlight: "fr" }
    ]
  },
  {
    id: "gl_vs_gr",
    label: "gl vs gr",
    title_kr: "gl [글] vs gr [그르] — 부드럽게 연결하는 L과 R",
    mouth_tip_kr: "glass(유리)는 [그] 뒤에 혀끝을 대고, grass(풀)는 [그] 뒤에 혀를 말며 소리가 갈라져요.",
    pattern: "gl/gr",
    regex: /\b(?:gl|gr)[a-z]/i,
    contrastPairs: [
      { leftWord: "glass", leftMeaning: "유리 · 컵", leftHighlight: "gl", rightWord: "grass", rightMeaning: "풀 · 잔디", rightHighlight: "gr" },
      { leftWord: "glad", leftMeaning: "기쁜", leftHighlight: "gl", rightWord: "green", rightMeaning: "초록색", rightHighlight: "gr" }
    ]
  },
  {
    id: "pl_vs_pr",
    label: "pl vs pr",
    title_kr: "pl [플] vs pr [프르] — 두 입술을 터뜨린 뒤 L/R",
    mouth_tip_kr: "play는 두 입술을 힘차게 터뜨린 뒤 바로 혀를 윗니 뒤에 대고, pray는 혀를 안으로 말아요.",
    pattern: "pl/pr",
    regex: /\b(?:pl|pr)[a-z]/i,
    contrastPairs: [
      { leftWord: "play", leftMeaning: "놀다", leftHighlight: "pl", rightWord: "pray", rightMeaning: "기도하다", rightHighlight: "pr" },
      { leftWord: "plane", leftMeaning: "비행기", leftHighlight: "pl", rightWord: "present", rightMeaning: "선물", rightHighlight: "pr" }
    ]
  },
  {
    id: "s_vs_sh",
    label: "s vs sh",
    title_kr: "s [쓰] vs sh [쉬] — 입술 모양에 따라 완전히 달라지는 소리",
    mouth_tip_kr: "s는 입꼬리를 옆으로 당기며 가느다란 바람 소리 [쓰], sh는 입술을 동그랗게 내밀며 조용히 [쉬~] 소리예요.",
    pattern: "s/sh",
    regex: /sh|\bs[aeiou]/i,
    contrastPairs: [
      { leftWord: "sea", leftMeaning: "바다", leftHighlight: "s", rightWord: "she", rightMeaning: "그녀", rightHighlight: "sh" },
      { leftWord: "seat", leftMeaning: "자리", leftHighlight: "s", rightWord: "sheet", rightMeaning: "종이 한 장", rightHighlight: "sh" }
    ]
  },
  {
    id: "th_dental",
    label: "th vs s/d",
    title_kr: "th [쓰/드] — 혀끝을 윗니·아랫니 사이에 살짝 물고 바람 내기",
    mouth_tip_kr: "th를 '스'나 '드'로 읽지 말고, 거울을 보고 혀끝이 앞니 사이에 살짝 보인 상태에서 바람을 후 불어요.",
    pattern: "th",
    regex: /th/i,
    contrastPairs: [
      { leftWord: "think", leftMeaning: "생각하다", leftHighlight: "th", rightWord: "sink", rightMeaning: "가라앉다", rightHighlight: "s" },
      { leftWord: "three", leftMeaning: "셋 (3)", leftHighlight: "th", rightWord: "tree", rightMeaning: "나무", rightHighlight: "tr" }
    ]
  },
  {
    id: "f_vs_p",
    label: "F vs P",
    title_kr: "F [프(바람)] vs P [프(터짐)] — 입술이 닿는지 윗니가 닿는지 확인!",
    mouth_tip_kr: "P는 위아래 두 입술을 딱 붙였다가 빵 터뜨리고, F는 윗니 끝으로 아랫입술을 살짝 스치며 바람을 불어요.",
    pattern: "f/p",
    regex: /\b(?:f|p)[a-z]/i,
    contrastPairs: [
      { leftWord: "fan", leftMeaning: "선풍기 · 팬", leftHighlight: "f", rightWord: "pan", rightMeaning: "프라이팬", rightHighlight: "p" },
      { leftWord: "fast", leftMeaning: "빠른", leftHighlight: "f", rightWord: "past", rightMeaning: "과거 · 지난", rightHighlight: "p" }
    ]
  },
  {
    id: "v_vs_b",
    label: "V vs B",
    title_kr: "V [브(진동)] vs B [브] — 아랫입술이 떨리는 V 소리",
    mouth_tip_kr: "B는 두 입술을 붙였다 떼는 소리, V는 윗니를 아랫입술 위에 가볍게 대고 목을 울리며 진동시키는 소리예요.",
    pattern: "v/b",
    regex: /\b(?:v|b)[a-z]/i,
    contrastPairs: [
      { leftWord: "very", leftMeaning: "매우", leftHighlight: "v", rightWord: "berry", rightMeaning: "딸기류 열매", rightHighlight: "b" },
      { leftWord: "vest", leftMeaning: "조끼", leftHighlight: "v", rightWord: "best", rightMeaning: "최고의", rightHighlight: "b" }
    ]
  },
  {
    id: "s_clusters",
    label: "sp/st/sk/sm/sn/sw",
    title_kr: "S-자음군 — '스' 다음에 짧은 '으'를 넣지 않고 한 번에 붙이기",
    mouth_tip_kr: "star를 '스타르'처럼 2글자로 늘리지 말고, 작은 [쓰] 숨소리 바로 뒤에 t/p/k/m/n을 딱 붙여 한 호흡에 말해요!",
    pattern: "s-cluster",
    regex: /\bs(?:p|t|k|m|n|w|cr|tr)[a-z]/i,
    contrastPairs: [
      { leftWord: "star", leftMeaning: "별", leftHighlight: "st", rightWord: "smile", rightMeaning: "미소 짓다", rightHighlight: "sm" },
      { leftWord: "snow", leftMeaning: "눈", leftHighlight: "sn", rightWord: "swim", rightMeaning: "수영하다", rightHighlight: "sw" }
    ]
  },
  {
    id: "ch_vs_tr",
    label: "ch vs tr",
    title_kr: "ch [취] vs tr [트르] — 혀를 말아 소리 내는 차이",
    mouth_tip_kr: "ch(chair)는 입술을 모으며 '취' 하고 힘차게 내보내고, tr(train)은 t와 r이 만나 혀를 말며 [트르] 소리가 나요.",
    pattern: "ch/tr",
    regex: /\b(?:ch|tr)[a-z]/i,
    contrastPairs: [
      { leftWord: "chair", leftMeaning: "의자", leftHighlight: "ch", rightWord: "train", rightMeaning: "기차", rightHighlight: "tr" },
      { leftWord: "chip", leftMeaning: "조각 · 칩", leftHighlight: "ch", rightWord: "trip", rightMeaning: "여행", rightHighlight: "tr" }
    ]
  },
  {
    id: "z_vs_j",
    label: "Z vs J",
    title_kr: "Z [즈(울림)] vs J [쥐] — 목 울림 Z와 입천장 마찰 J",
    mouth_tip_kr: "Z는 벌이 '윙~' 날아가듯 윗니와 아랫니 사이로 공기를 계속 울리고, J는 혀가 입천장을 한 번 치고 나와요.",
    pattern: "z/j",
    regex: /\b(?:z|j)[a-z]/i,
    contrastPairs: [
      { leftWord: "zoo", leftMeaning: "동물원", leftHighlight: "z", rightWord: "juice", rightMeaning: "주스", rightHighlight: "j" },
      { leftWord: "zero", leftMeaning: "영 (0)", leftHighlight: "z", rightWord: "jump", rightMeaning: "점프하다", rightHighlight: "j" }
    ]
  },
  {
    id: "short_i_vs_long_e",
    label: "i [ɪ] vs ee/ea [iː]",
    title_kr: "짧은 i [이/에 사이] vs 긴 ee/ea [이ː] — 입 꼬리 긴장도 구별",
    mouth_tip_kr: "ee/ea는 입꼬리를 옆으로 힘주어 쭉 당기며 길게 [이ː], 짧은 i는 입 힘을 빼고 아주 짧고 톡 끊어지게 말해요.",
    pattern: "i/ee",
    regex: /ee|ea|\b[bcdfghjklmnpqrstvwxyz]+i[bcdfghjklmnpqrstvwxyz]+\b/i,
    contrastPairs: [
      { leftWord: "sit", leftMeaning: "앉다", leftHighlight: "i", rightWord: "seat", rightMeaning: "자리", rightHighlight: "ea" },
      { leftWord: "ship", leftMeaning: "배", leftHighlight: "i", rightWord: "sheep", rightMeaning: "양", rightHighlight: "ee" }
    ]
  },
  {
    id: "ae_vs_e",
    label: "a [æ] vs e [e]",
    title_kr: "넓은 a [애] vs 가벼운 e [에] — 턱을 아래로 내리는 차이",
    mouth_tip_kr: "apple, bag의 짧은 a는 턱을 아래로 크게 내려 혀를 낮추고 [애], bed, pen의 e는 입을 덜 벌리고 가볍게 [에] 해요.",
    pattern: "a/e",
    regex: /\b(?:a|e|[bcdfghjklmnpqrstvwxyz]+a[bcdfghjklmnpqrstvwxyz]+)\b/i,
    contrastPairs: [
      { leftWord: "bad", leftMeaning: "나쁜", leftHighlight: "a", rightWord: "bed", rightMeaning: "침대", rightHighlight: "e" },
      { leftWord: "bag", leftMeaning: "가방", leftHighlight: "a", rightWord: "egg", rightMeaning: "달걀", rightHighlight: "e" }
    ]
  },
  {
    id: "c_hard_soft",
    label: "c [k] vs [s]",
    title_kr: "카멜레온 C — e, i, y 앞에선 [스], 그 외엔 [크]",
    mouth_tip_kr: "cat, cake는 강한 [크] 소리지만, city, center, circle처럼 뒤에 e, i, y가 오면 부드러운 [스] 소리로 바뀌어요!",
    pattern: "c",
    regex: /\bc[a-z]/i,
    contrastPairs: [
      { leftWord: "cat", leftMeaning: "고양이 [크]", leftHighlight: "c", rightWord: "city", rightMeaning: "도시 [스]", rightHighlight: "c" },
      { leftWord: "cake", leftMeaning: "케이크 [크]", leftHighlight: "c", rightWord: "circle", rightMeaning: "원 · 동그라미 [스]", rightHighlight: "c" }
    ]
  },
  {
    id: "g_hard_soft",
    label: "g [g] vs [dʒ]",
    title_kr: "카멜레온 G — e, i, y 앞에선 [쥐], 그 외엔 [그]",
    mouth_tip_kr: "game, go는 [그] 소리, giant, giraffe, gentle처럼 e/i/y 앞의 g는 주로 [쥐] 소리가 나요(단, get/give는 예외!).",
    pattern: "g",
    regex: /\bg[a-z]/i,
    contrastPairs: [
      { leftWord: "go", leftMeaning: "가다 [그]", leftHighlight: "g", rightWord: "giraffe", rightMeaning: "기린 [쥐]", rightHighlight: "g" },
      { leftWord: "game", leftMeaning: "게임 [그]", leftHighlight: "g", rightWord: "gentle", rightMeaning: "부드러운 [쥐]", rightHighlight: "g" }
    ]
  },
  {
    id: "silent_kn_wr",
    label: "묵음 kn- / wr-",
    title_kr: "소리 없는 첫 글자 — kn에서 k는 묵음, wr에서 w는 묵음",
    mouth_tip_kr: "know, knife는 k를 발음하지 않고 [노우/나이프]로, write, wrong은 w를 떼고 바로 R 소리로 시작해요!",
    pattern: "kn/wr",
    regex: /\b(?:kn|wr)/i,
    contrastPairs: [
      { leftWord: "know", leftMeaning: "알다", leftHighlight: "kn", rightWord: "now", rightMeaning: "지금", rightHighlight: "n" },
      { leftWord: "write", leftMeaning: "쓰다", leftHighlight: "wr", rightWord: "right", rightMeaning: "오른쪽", rightHighlight: "r" }
    ]
  },
  {
    id: "ph_as_f",
    label: "ph [f] vs p [p]",
    title_kr: "ph = F [프] — p와 h가 만나면 입술 바람 F 소리!",
    mouth_tip_kr: "photo, phone의 ph는 두 입술을 터뜨리는 [ㅍ]가 아니라, 윗니가 아랫입술을 스치는 F 바람 소리예요.",
    pattern: "ph",
    regex: /ph/i,
    contrastPairs: [
      { leftWord: "phone", leftMeaning: "전화기", leftHighlight: "ph", rightWord: "pond", rightMeaning: "연못", rightHighlight: "p" },
      { leftWord: "photo", leftMeaning: "사진", leftHighlight: "ph", rightWord: "piano", rightMeaning: "피아노", rightHighlight: "p" }
    ]
  }
];

function scoreAndExtractWords(rule, wordsList, weight) {
  let score = 0;
  const matched = [];
  for (const w of wordsList) {
    const str = String(w.word || "").trim();
    if (!str) continue;
    const m = str.match(rule.regex);
    if (m) {
      score += weight;
      matched.push({
        word: str,
        meaning_kr: w.meaning_kr || "",
        matchStart: m.index ?? 0,
        matchEnd: (m.index ?? 0) + m[0].length
      });
    }
  }
  return { score, matched };
}

/**
 * Selects 2-3 high-yield confusing pronunciation lessons tailored to today's studied words.
 */
function selectPronunciationFocusItems({
  unitWords = [],
  quizWords = [],
  wrongWords = [],
  maxItems = 3
}) {
  const scored = PRONUNCIATION_RULES.map((rule) => {
    const wHit = scoreAndExtractWords(rule, wrongWords, 5);
    const qHit = scoreAndExtractWords(rule, quizWords, 2);
    const uHit = scoreAndExtractWords(rule, unitWords, 1);
    const totalScore = wHit.score + qHit.score + Math.min(4, uHit.score);

    const dedupMap = new Map();
    for (const item of [...wHit.matched, ...qHit.matched, ...uHit.matched]) {
      if (!dedupMap.has(item.word)) dedupMap.set(item.word, item);
      if (dedupMap.size >= 3) break;
    }

    return {
      rule,
      score: totalScore,
      matchedTodayWords: Array.from(dedupMap.values())
    };
  });

  scored.sort((a, b) => b.score - a.score);
  const picked = scored.filter((item) => item.score > 0).slice(0, maxItems);

  // Guarantee at least 2 helpful starter checkpoints if a tiny unit had few regex hits
  if (picked.length < 2) {
    const pickedIds = new Set(picked.map((p) => p.rule.id));
    for (const fallbackId of ["l_vs_r", "f_vs_p", "s_vs_sh"]) {
      if (picked.length >= Math.min(2, maxItems)) break;
      if (pickedIds.has(fallbackId)) continue;
      const entry = scored.find((s) => s.rule.id === fallbackId);
      if (entry) {
        picked.push(entry);
        pickedIds.add(fallbackId);
      }
    }
  }

  return picked.map(({ rule, matchedTodayWords }) => {
    const pairIdx = Math.floor(Math.random() * rule.contrastPairs.length);
    const pair = rule.contrastPairs[pairIdx] || rule.contrastPairs[0];
    const correctSide = Math.random() < 0.5 ? "left" : "right";
    const audioWord = correctSide === "left" ? pair.leftWord : pair.rightWord;

    return {
      ruleId: rule.id,
      label: rule.label,
      titleKr: rule.title_kr,
      mouthTipKr: rule.mouth_tip_kr,
      matchedTodayWords,
      pair,
      earQuiz: {
        promptKr: "포포가 들려주는 단어를 잘 듣고, 알맞은 단어를 골라보세요!",
        audioWord,
        correctSide,
        leftOption: pair.leftWord,
        rightOption: pair.rightWord
      }
    };
  });
}

module.exports = {
  PRONUNCIATION_RULES,
  selectPronunciationFocusItems
};

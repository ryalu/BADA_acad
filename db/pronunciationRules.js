// Current-unit-only Day 1 (Listen & Discriminate) and Day 2 (Speak & AI Check)
// pronunciation focus selector for BADA English Vocab.
// Every word card and every multiple-choice distractor MUST originate strictly
// from the student's current unit (`unitWords`).

const PHONICS_WORD_RULES = [
  // 1. Silent letters (highest pedagogical yield)
  {
    id: "silent_kn",
    label: "묵음 k (kn)",
    priority: 100,
    test: (w) => /^kn/.exec(w),
    titleKr: "'kn'의 'k'는 소리 나지 않아요!",
    tipKr: "앞의 'k'는 입 밖으로 내지 말고 바로 [ㄴ] 소리로 시작해요."
  },
  {
    id: "silent_wr",
    label: "묵음 w (wr)",
    priority: 100,
    test: (w) => /^wr/.exec(w),
    titleKr: "'wr'의 'w'는 조용히 숨어요!",
    tipKr: "'w' 소리는 빼고 혀끝을 말아서 바로 [r] 소리로 시작해요."
  },
  {
    id: "silent_mb",
    label: "묵음 b (mb)",
    priority: 99,
    test: (w) => /mb$/.exec(w),
    titleKr: "끝의 'mb'에서 'b'는 묵음이에요!",
    tipKr: "입술을 다물어 [ㅁ] 소리만 내고 끝의 'b'는 발음하지 않아요."
  },
  {
    id: "silent_mn",
    label: "묵음 n (mn)",
    priority: 99,
    test: (w) => /mn$/.exec(w),
    titleKr: "끝의 'mn'에서 'n'은 소리 나지 않아요!",
    tipKr: "'m' 소리로 입술을 닫으며 자연스럽게 멈추세요."
  },
  {
    id: "silent_w_word",
    label: "묵음 w",
    priority: 99,
    test: (w) => /^(answer|two|sword|who|whom|whose|whole)$/.test(w) ? /w/.exec(w) : null,
    titleKr: "단어 속 'w'가 조용히 쉬고 있어요!",
    tipKr: "글자에는 'w'가 보이지만 읽을 때는 [우] 소리를 넣지 않고 부드럽게 이어 읽어요."
  },
  {
    id: "silent_h_word",
    label: "묵음 h",
    priority: 98,
    test: (w) => /^(hour|honest|honor|heir)/.test(w) ? /^h/.exec(w) : null,
    titleKr: "맨 앞 'h'는 묵음이에요!",
    tipKr: "'h' 소리([ㅎ])를 내지 말고 바로 뒤 모음 소리로 시작해요."
  },
  {
    id: "silent_l_al",
    label: "묵음 l",
    priority: 98,
    test: (w) => /l(?=[kmf]$)/.exec(w),
    titleKr: "이 단어의 'l'은 소리가 숨어 있어요!",
    tipKr: "혀를 윗니 뒤에 대지 말고 앞 모음을 길고 둥글게 소리 내세요."
  },
  {
    id: "silent_gh",
    label: "묵음 gh",
    priority: 97,
    test: (w) => /(?<=[aiou])gh/.exec(w) || /gh(?=[t])/.exec(w),
    titleKr: "'gh'는 소리가 나지 않아요!",
    tipKr: "'gh'는 글자로만 남고 앞 모음을 길고 또렷하게 소리 내면 돼요."
  },
  {
    id: "silent_st",
    label: "묵음 t",
    priority: 96,
    test: (w) => /(?<=s)t(?=(?:le|en)$)/.exec(w),
    titleKr: "'s' 뒤의 't'는 조용히 넘어가요!",
    tipKr: "[ㅌ] 소리를 끊어 내지 말고 앞뒤 소리를 자연스럽게 이어 주세요."
  },
  {
    id: "silent_s_island",
    label: "묵음 s",
    priority: 96,
    test: (w) => /^island/.test(w) ? /s/.exec(w) : null,
    titleKr: "'island'의 's'는 소리가 나지 않아요!",
    tipKr: "[아이슬란드]가 아니라 [아일런드]처럼 's'를 빼고 읽어요."
  },

  // 2. Multi-letter endings & digraphs
  {
    id: "suffix_tion",
    label: "tion [션] 덩어리",
    priority: 93,
    test: (w) => /tion/.exec(w),
    titleKr: "'tion'은 한 번에 [션]으로 읽어요!",
    tipKr: "글자를 하나씩 끊지 말고 입술을 살짝 내밀어 부드럽게 [션] 하고 묶어 발음해요."
  },
  {
    id: "suffix_sion",
    label: "sion [전/션] 덩어리",
    priority: 92,
    test: (w) => /sion/.exec(w),
    titleKr: "'sion'은 목을 울려 [전] 또는 [션]!",
    tipKr: "모음 뒤에서는 성대를 울려 [전]처럼 부드럽게 이어 읽어 보세요."
  },
  {
    id: "digraph_ph",
    label: "ph = [f] 바람 소리",
    priority: 94,
    test: (w) => /ph/.exec(w),
    titleKr: "'p'와 'h'가 만나면 [f] 소리가 나요!",
    tipKr: "입술을 터뜨리는 [ㅍ]이 아니라 윗니로 아랫입술을 살짝 스치며 바람을 불어요."
  },
  {
    id: "digraph_qu",
    label: "qu = [쿠어] 입모양",
    priority: 91,
    test: (w) => /qu/.exec(w),
    titleKr: "'q' 뒤에는 언제나 'u'가 함께 [쿠어]!",
    tipKr: "입술을 동그랗게 내밀었다가 빠르게 펴면서 [쿠어] 소리를 내요."
  },
  {
    id: "digraph_th",
    label: "th 혀끝 바람 소리",
    priority: 93,
    test: (w) => /th/.exec(w),
    titleKr: "'th'는 혀끝을 살짝 물고 바람을 내보내요!",
    tipKr: "[ㅅ]이나 [ㄷ] 대신 윗니와 아랫니 사이에 혀끝을 살짝 대고 바람을 빼 보세요."
  },
  {
    id: "digraph_sh",
    label: "sh 부드러운 [쉬~]",
    priority: 90,
    test: (w) => /sh/.exec(w),
    titleKr: "'sh'는 조용히 하듯 [쉬~] 소리!",
    tipKr: "입술을 동그랗게 앞으로 내밀고 공기를 넓게 불어 내세요."
  },
  {
    id: "digraph_ch",
    label: "ch 힘찬 [취] 소리",
    priority: 90,
    test: (w) => /ch/.exec(w),
    titleKr: "'ch'는 입술을 모았다가 힘차게 [취]!",
    tipKr: "혀가 입천장을 막았다가 숨을 한 번에 터뜨리며 발음해요."
  },
  {
    id: "digraph_ng",
    label: "ng 콧소리 [ㅇ]",
    priority: 89,
    test: (w) => /ng/.exec(w),
    titleKr: "'ng'는 코와 목 뒤에서 울리는 [ㅇ]!",
    tipKr: "혀 뒷부분을 들어 올려 입 안을 막고 코 쪽으로 소리를 울려 주세요."
  },

  // 3. Vowel teams & R-controlled vowels
  {
    id: "vowel_ai",
    label: "ai 이중모음 [에이]",
    priority: 89,
    test: (w) => /ai/.exec(w),
    titleKr: "'ai'가 만나면 길게 [에이]!",
    tipKr: "단모음 [애]로 끊지 말고 [에]에서 [이]로 입꼬리를 당기며 이어 소리 내요."
  },
  {
    id: "vowel_ay",
    label: "ay 이중모음 [에이]",
    priority: 88,
    test: (w) => /ay/.exec(w),
    titleKr: "'ay'는 웃는 입모양으로 [에이]!",
    tipKr: "[에이] 소리를 끝까지 또렷하게 유지하면서 발음해 보세요."
  },
  {
    id: "vowel_ea",
    label: "ea 모음 팀",
    priority: 87,
    test: (w) => /ea/.exec(w),
    titleKr: "'ea'는 주로 길게 [이:], 때로는 [에]!",
    tipKr: "입꼬리를 양옆으로 살짝 당겨 길게 [이:] 하는지, 짧게 [에] 하는지 들어 보세요."
  },
  {
    id: "vowel_ee",
    label: "ee 긴 소리 [이:]",
    priority: 87,
    test: (w) => /ee/.exec(w),
    titleKr: "'e'가 둘 모이면 환하게 [이:]!",
    tipKr: "짧게 [이] 하지 말고 입꼬리를 당겨 길고 맑게 소리 내세요."
  },
  {
    id: "vowel_oo",
    label: "oo 입술 모음 [우]",
    priority: 87,
    test: (w) => /oo/.exec(w),
    titleKr: "'oo'는 입술을 동그랗게 모아 [우]!",
    tipKr: "한국어 [우]보다 입술을 훨씬 작고 동그랗게 앞으로 내밀어 보세요."
  },
  {
    id: "vowel_ou",
    label: "ou 이중모음 [아우]",
    priority: 88,
    test: (w) => /ou/.exec(w),
    titleKr: "'ou'는 입을 크게 벌렸다 모으며 [아우]!",
    tipKr: "처음에는 [아]로 넓게 열고 끝에는 [우]로 입술을 동그랗게 모아요."
  },
  {
    id: "vowel_ow",
    label: "ow 모음 [아우 / 오우]",
    priority: 86,
    test: (w) => /ow/.exec(w),
    titleKr: "'ow'는 [아우] 또는 [오우] 소리가 나요!",
    tipKr: "앞에 따라 입을 크게 여는 [아우]인지, 둥글게 닫는 [오우]인지 귀 기울여 보세요."
  },
  {
    id: "vowel_oa",
    label: "oa 긴 소리 [오우]",
    priority: 86,
    test: (w) => /oa/.exec(w),
    titleKr: "'oa'는 앞의 'o'가 길게 [오우]!",
    tipKr: "입술을 둥글게 모아 [오]에서 [우]로 미끄러지듯 소리 내요."
  },
  {
    id: "vowel_oi_oy",
    label: "oi / oy [오이]",
    priority: 86,
    test: (w) => /o[iy]/.exec(w),
    titleKr: "'oi / oy'는 입술을 둥글렸다가 펴며 [오이]!",
    tipKr: "둥근 [오]에서 환한 [이]로 자연스럽게 연결해 발음해요."
  },
  {
    id: "vowel_au_aw",
    label: "au / aw 깊은 [오]",
    priority: 86,
    test: (w) => /a[uw]/.exec(w),
    titleKr: "'au / aw'는 입을 둥글게 벌려 깊은 [오]!",
    tipKr: "[아]와 [오] 사이에서 턱을 살짝 내리며 길게 소리 내세요."
  },
  {
    id: "vowel_all",
    label: "al / all 깊은 [올]",
    priority: 85,
    test: (w) => /(?:all|al(?=[td]))/.exec(w),
    titleKr: "'all / al'의 'a'는 둥근 [오]처럼 소리 나요!",
    tipKr: "입을 옆으로 찢지 말고 둥글게 모아 [오] 소리에 가깝게 시작해요."
  },
  {
    id: "r_vowel_ar",
    label: "ar 혀를 마는 [아르]",
    priority: 85,
    test: (w) => /ar/.exec(w),
    titleKr: "'ar'은 입을 크게 열고 혀를 뒤로!",
    tipKr: "[아] 소리를 내면서 혀끝이 입천장에 닿지 않게 살짝 말아 보세요."
  },
  {
    id: "r_vowel_or",
    label: "or 혀를 마는 [오르]",
    priority: 85,
    test: (w) => /or/.exec(w),
    titleKr: "'or'은 입술을 모으고 혀를 뒤로!",
    tipKr: "입술을 동그랗게 오므린 채 혀끝만 살짝 들어 올려 소리 내세요."
  },
  {
    id: "r_vowel_er_ir_ur",
    label: "er / ir / ur [어~]",
    priority: 84,
    test: (w) => /[eiu]r/.exec(w),
    titleKr: "'er / ir / ur'은 힘을 빼고 혀를 말아 [어~]!",
    tipKr: "세 가지 모양 모두 혀를 살짝 말아 올린 편안한 [어~] 소리가 나요."
  },

  // 4. Consonant-le & Magic e & Double letters
  {
    id: "ending_le",
    label: "끝의 -le [을]",
    priority: 82,
    test: (w) => /[bcdfgkptz]le$/.exec(w),
    titleKr: "끝의 '-le'는 혀끝을 대며 가볍게 [을]!",
    tipKr: "뒤의 'e'는 묵음이고 혀끝을 윗니 뒤 잇몸에 살짝 붙이며 마무리해요."
  },
  {
    id: "magic_e",
    label: "Magic e (끝 묵음 e)",
    priority: 83,
    test: (w) => /[aiou][bcdfghjkmnpqrstvwxyz]e$/.exec(w),
    titleKr: "끝의 'e'가 앞 모음을 길게 바꿔 주는 Magic e!",
    tipKr: "끝 'e'는 소리를 내지 말고, 앞 모음을 알파벳 이름([에이/아이/오우/유])대로 길게 읽어요."
  },
  {
    id: "double_consonant",
    label: "쌍자음 한 번에 읽기",
    priority: 80,
    test: (w) => /([bcdfghjklmnpqrstvwxz])\1/.exec(w),
    titleKr: "같은 자음이 둘이어도 소리는 한 번만!",
    tipKr: "두 번 끊어 읽지 말고 앞 모음은 짧고 힘 있게, 자음은 한 번에 넘어가요."
  },

  // 5. Key Korean learner consonant contrasts (f/v, r/l, soft c/g, z/j/x)
  {
    id: "cons_f",
    label: "f 입술 스치는 바람",
    priority: 79,
    test: (w) => /f/.exec(w),
    titleKr: "'f'는 [ㅍ]이 아니라 아랫입술 바람 소리!",
    tipKr: "두 입술을 붙이지 말고, 윗니로 아랫입술을 살짝 대고 '후~' 바람만 불어요."
  },
  {
    id: "cons_v",
    label: "v 입술 진동 소리",
    priority: 79,
    test: (w) => /v/.exec(w),
    titleKr: "'v'는 아랫입술에 목울림을 얹어요!",
    tipKr: "윗니로 아랫입술을 살짝 스치면서 [ㅂ] 대신 성대를 '브~' 울려 보세요."
  },
  {
    id: "cons_z",
    label: "z 벌처럼 [즈~] 진동",
    priority: 78,
    test: (w) => /z/.exec(w),
    titleKr: "'z'는 꿀벌 날갯짓처럼 진동하는 [즈~]!",
    tipKr: "윗니와 아랫니 사이로 소리를 내며 목이 지잉 울리는지 손으로 느껴 보세요."
  },
  {
    id: "soft_c",
    label: "soft c = [ㅅ] 소리",
    priority: 77,
    test: (w) => /c(?=[eiy])/.exec(w),
    titleKr: "'c' 뒤에 e, i, y가 오면 [ㅅ] 소리!",
    tipKr: "[ㅋ]이 아니라 날씬하고 가벼운 [ㅅ] 소리로 소리 내 보세요."
  },
  {
    id: "soft_g",
    label: "soft g = [ㅈ] 소리",
    priority: 77,
    test: (w) => /g(?=[eiy])/.exec(w),
    titleKr: "'g' 뒤에 e, i, y가 오면 부드러운 [ㅈ]!",
    tipKr: "[ㄱ]이 아니라 입술을 살짝 내밀며 [ㅈ] 소리로 읽어 봐요."
  },
  {
    id: "cons_x",
    label: "x = [크스] 두 소리",
    priority: 76,
    test: (w) => /x/.exec(w),
    titleKr: "'x'는 [크]와 [스]가 빠르게 이어져요!",
    tipKr: "[크스]를 한 박자 안에 또렷하게 붙여서 발음해 보세요."
  },
  {
    id: "cons_r",
    label: "r 혀가 안 닿는 [ㄹ]",
    priority: 75,
    test: (w) => /r/.exec(w),
    titleKr: "'r'은 혀끝이 입천장에 절대 닿지 않아요!",
    tipKr: "입술을 살짝 오므리고 혀를 입 가운데에 띄운 채 [우러]처럼 시작해요."
  },
  {
    id: "cons_l",
    label: "l 혀끝 붙는 맑은 [ㄹ]",
    priority: 74,
    test: (w) => /l/.exec(w),
    titleKr: "'l'은 혀끝을 윗니 뒤 잇몸에 딱!",
    tipKr: "혀끝을 윗니 바로 뒤 딱딱한 잇몸에 붙였다가 맑게 [ㄹ] 소리 내세요."
  },
  {
    id: "cons_j",
    label: "j 입술 내미는 [쥐]",
    priority: 73,
    test: (w) => /j/.exec(w),
    titleKr: "'j'는 한국어 [ㅈ]보다 입술을 동그랗게!",
    tipKr: "입술을 살짝 앞으로 모으고 힘 있게 터뜨려 [쥐]처럼 시작하세요."
  },
  {
    id: "cons_p",
    label: "p 힘찬 입술 바람 [ㅍ]",
    priority: 70,
    test: (w) => /p/.exec(w),
    titleKr: "'p'는 두 입술을 꼭 다물었다가 '파!' 터뜨려요!",
    tipKr: "입 앞에 손을 대고 숨바람이 닿을 만큼 또렷하게 터뜨려 보세요."
  },
  {
    id: "cons_b",
    label: "b 입술 울림 [ㅂ]",
    priority: 69,
    test: (w) => /b/.exec(w),
    titleKr: "'b'는 아랫입술을 깨물지 않고 두 입술로 [ㅂ]!",
    tipKr: "'v'와 달리 두 입술을 다물었다가 목을 울리며 떼세요."
  },
  {
    id: "cons_end_t_d",
    label: "끝소리 [트 / 드]",
    priority: 64,
    test: (w) => /[td]$/.exec(w),
    titleKr: "단어 끝 't / d'는 아주 가볍게!",
    tipKr: "끝에 [트으] 하고 모음을 붙이지 말고 혀끝으로 공기만 살짝 멈춰 주세요."
  },
  {
    id: "short_vowel_fallback",
    label: "짧고 또렷한 모음",
    priority: 50,
    test: (w) => /[aeiouy]/.exec(w),
    titleKr: "첫 모음의 입모양을 또렷하게 잡아요!",
    tipKr: "입 모양을 뭉개지 말고 첫 모음을 분명하게 열어 소리 내 보세요."
  }
];

function normalizeCandidateWord(wordObj) {
  if (!wordObj || typeof wordObj !== "object") return null;
  const word = String(wordObj.word || wordObj.derived_word || "").trim();
  const meaningKr = String(wordObj.meaning_kr || wordObj.meaningKr || wordObj.derived_meaning_kr || "").trim();
  if (!word || !meaningKr) return null;
  const id = String(wordObj.id || word.toLowerCase());
  const imageUrl = wordObj.image_url || wordObj.imageUrl || null;
  return { id, word, meaningKr, imageUrl };
}

function analyzeWordPronunciationPoint(wordObj) {
  const clean = normalizeCandidateWord(wordObj) || {
    id: String(wordObj?.id || wordObj?.word || "w"),
    word: String(wordObj?.word || "").trim() || "word",
    meaningKr: String(wordObj?.meaning_kr || wordObj?.meaningKr || "").trim(),
    imageUrl: wordObj?.image_url || wordObj?.imageUrl || null
  };

  const rawWord = clean.word;
  const lower = rawWord.toLowerCase();

  let bestRule = null;
  let bestMatch = null;
  let bestScore = -1;

  for (const rule of PHONICS_WORD_RULES) {
    const match = rule.test(lower);
    if (!match) continue;
    // Prefer rules with higher priority; break ties earlier in the word for visibility
    const score = rule.priority * 10 - match.index * 0.05;
    if (score > bestScore) {
      bestScore = score;
      bestRule = rule;
      bestMatch = match;
    }
  }

  let matchStart = 0;
  let matchEnd = Math.min(rawWord.length, 2);
  if (bestMatch && typeof bestMatch.index === "number") {
    matchStart = bestMatch.index;
    matchEnd = Math.min(rawWord.length, bestMatch.index + Math.max(1, bestMatch[0].length));
  } else {
    bestRule = PHONICS_WORD_RULES[PHONICS_WORD_RULES.length - 1];
    matchStart = 0;
    matchEnd = Math.min(rawWord.length, 1);
  }

  const focusText = rawWord.slice(matchStart, matchEnd) || rawWord.slice(0, 1);

  return {
    wordId: clean.id,
    word: rawWord,
    meaningKr: clean.meaningKr,
    imageUrl: clean.imageUrl,
    ruleId: bestRule.id,
    phonicsLabel: bestRule.label,
    focusText,
    matchStart,
    matchEnd,
    titleKr: bestRule.titleKr,
    mouthTipKr: bestRule.tipKr,
    priority: bestRule.priority
  };
}

function deterministicHash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function buildSameUnitListenOptions(targetItem, allAnalyzedPool) {
  const targetLower = targetItem.word.toLowerCase();
  const candidates = allAnalyzedPool.filter((c) => c.word.toLowerCase() !== targetLower);

  // Score distractors strictly within the same unit:
  // favor same opening letter + close length + contrasting rule so listening discrimination is meaningful
  const scored = candidates.map((cand) => {
    const cLower = cand.word.toLowerCase();
    let score = 0;
    if (cLower[0] === targetLower[0]) score += 30;
    if (cLower.slice(0, 2) === targetLower.slice(0, 2)) score += 25;
    if (cand.ruleId !== targetItem.ruleId) score += 20;
    const lenDiff = Math.abs(cLower.length - targetLower.length);
    score += Math.max(0, 15 - lenDiff * 4);
    // Tiny deterministic tiebreaker
    score += (deterministicHash(`${targetLower}:${cLower}`) % 7);
    return { cand, score };
  });

  scored.sort((a, b) => b.score - a.score);
  const distractorCount = Math.min(2, scored.length);
  const chosenDistractors = scored.slice(0, distractorCount).map((s) => s.cand);

  const rawOptions = [targetItem, ...chosenDistractors].map((entry) => ({
    wordId: entry.wordId,
    word: entry.word,
    meaningKr: entry.meaningKr,
    phonicsLabel: entry.phonicsLabel,
    focusText: entry.focusText,
    matchStart: entry.matchStart,
    matchEnd: entry.matchEnd,
    isCorrect: entry.word.toLowerCase() === targetLower
  }));

  // Deterministic order rotation/shuffle per target word so correct choice isn't always first
  const seed = deterministicHash(targetLower);
  const shuffled = [...rawOptions];
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = (seed + i * 31) % (i + 1);
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function buildDay1ListenSession({
  unitWords = [],
  quizWords = [],
  wrongWords = [],
  practicedWordIds = [],
  maxWords = 6
}) {
  // Deduplicate current unit words strictly
  const seenWords = new Set();
  const cleanPool = [];
  for (const w of unitWords || []) {
    const norm = normalizeCandidateWord(w);
    if (!norm) continue;
    const key = norm.word.toLowerCase();
    if (seenWords.has(key)) continue;
    seenWords.add(key);
    cleanPool.push(norm);
  }

  if (cleanPool.length === 0) {
    return { mode: "day1_listen", items: [] };
  }

  const analyzedPool = cleanPool.map((w) => analyzeWordPronunciationPoint(w));
  const targetCount = Math.min(analyzedPool.length, Math.max(1, Number(maxWords) || 6));

  const wrongSet = new Set(
    (wrongWords || []).map((w) => String(typeof w === "string" ? w : w?.id || w?.word || "").toLowerCase())
  );
  const quizSet = new Set(
    (quizWords || []).map((w) => String(typeof w === "string" ? w : w?.id || w?.word || "").toLowerCase())
  );
  const practicedSet = new Set((practicedWordIds || []).map((id) => String(id).toLowerCase()));

  const isInSet = (item, set) =>
    set.has(String(item.wordId).toLowerCase()) || set.has(item.word.toLowerCase());

  const remaining = [...analyzedPool];
  const chosen = [];
  const ruleCounts = Object.create(null);

  while (chosen.length < targetCount && remaining.length > 0) {
    let bestIdx = 0;
    let bestScore = -Infinity;

    for (let i = 0; i < remaining.length; i += 1) {
      const item = remaining[i];
      let score = item.priority;
      if (isInSet(item, wrongSet)) score += 1000;
      if (!isInSet(item, practicedSet)) score += 400;
      if (isInSet(item, quizSet)) score += 200;
      const repeatPenalty = (ruleCounts[item.ruleId] || 0) * 120;
      score -= repeatPenalty;

      if (score > bestScore) {
        bestScore = score;
        bestIdx = i;
      }
    }

    const picked = remaining.splice(bestIdx, 1)[0];
    ruleCounts[picked.ruleId] = (ruleCounts[picked.ruleId] || 0) + 1;
    chosen.push(picked);
  }

  const items = chosen.map((item) => ({
    ...item,
    listenPromptKr: `오늘 배운 단어 소리를 잘 듣고, "${item.focusText}" (${item.phonicsLabel}) 소리가 정확히 들리는 단어를 골라보세요!`,
    listenOptions: buildSameUnitListenOptions(item, analyzedPool)
  }));

  return {
    mode: "day1_listen",
    items
  };
}

function buildDay2SpeakSession(pendingWords = [], unitWords = []) {
  const unitLookup = new Map();
  for (const u of unitWords || []) {
    const norm = normalizeCandidateWord(u);
    if (norm) {
      unitLookup.set(norm.id.toLowerCase(), norm);
      unitLookup.set(norm.word.toLowerCase(), norm);
    }
  }

  const seen = new Set();
  const items = [];

  for (const raw of pendingWords || []) {
    const rawId = String(raw?.wordId || raw?.id || "").toLowerCase();
    const rawWordLower = String(raw?.word || "").toLowerCase();
    const matched = unitLookup.get(rawId) || unitLookup.get(rawWordLower);
    const merged = {
      id: raw?.wordId || raw?.id || matched?.id || rawWordLower,
      word: raw?.word || matched?.word || "",
      meaning_kr: raw?.meaningKr || raw?.meaning_kr || matched?.meaningKr || "",
      image_url: raw?.imageUrl || raw?.image_url || matched?.imageUrl || null
    };
    const analyzed = analyzeWordPronunciationPoint(merged);
    if (!analyzed.word || seen.has(analyzed.word.toLowerCase())) continue;
    seen.add(analyzed.word.toLowerCase());
    items.push({
      ...analyzed,
      speakPromptKr: `어제 콕콕 짚어본 "${analyzed.phonicsLabel}" 포인트를 떠올리며, 이번엔 직접 소리 내어 발음해 볼까요?`
    });
  }

  return {
    mode: "day2_speak",
    items
  };
}

module.exports = {
  PHONICS_WORD_RULES,
  analyzeWordPronunciationPoint,
  buildDay1ListenSession,
  buildDay2SpeakSession
};

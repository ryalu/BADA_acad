/**
 * BADA English Client Application
 * Implements:
 * - 4-Week Organic Student Flow (W1 Water-Drop Words, W2 Sea Glass Wave Chunks, W3 Pearl Clam Mic & 3-Step Popo AI, W4 E-book & Breaching Treasure Chest)
 * - Grade-Specific Curriculum Routing (Grade 1-2 20m Phonics+26Lv ClassCard, Grade 4+ 40m 1-5 Patterns, Grade 6 Passive/Wh- Grammar)
 * - Parent Report (Week 1 vs Week 4 Dual Audio Player + Canvas Certificate with Popo Stamp)
 * - Teacher SaaS Dashboard (Strengths/Weaknesses STT Tag Cloud + 3 AI Recommended Questions)
 * - Vocab & Chunk DB Deduplication Tester (works both with Node/SQLite backend and standalone browser mode)
 */

const FALLBACK_POPO_SPEC = {
  agent_config: {
    role: "Baby Whale 'Popo' (아기 고래 포포)",
    persona:
      "씩씩하고 긍정적이며, 물 뿜기(💦)와 높이 뛰어오르기(🐋✨)를 좋아하는 바다 탐험가. 문법 용어를 배제하고 바다와 물놀이에 빗대어 피드백함.",
    feedback_pipeline_rules: [
      "STEP 1 (격려): 발화 내용의 일부라도 맞으면 고래가 물을 뿜는 이모티콘(💦)과 함께 크게 칭찬하며 시작할 것.",
      "STEP 2 (교정): '틀렸어'라는 부정어 대신, '이렇게 말하면 포포가 더 높이 점프할 수 있어!'와 같은 긍정적 화법으로 자연스러운 뉘앙스와 발음을 제시할 것.",
      "STEP 3 (재시도 유도): 교정된 문장을 진주조개 마이크에 대고 다시 한번 말해보도록 유도하며 발화를 넘길 것."
    ]
  },
  quiz_session: {
    book_id: "bada_level2_ocean_friends",
    target_chunk: "look at the starfish",
    popo_question:
      "우와, 저기 바닥에 반짝이는 불가사리가 있어! 포포한테 '불가사리를 봐!'라고 영어로 어떻게 말해줄까?"
  },
  popo_response_template: {
    step1_encourage:
      "💦 푸슈! 불가사리(starfish)를 완벽하게 찾아냈구나! 넌 정말 멋진 탐험가야!",
    step2_correction:
      "그런데 무언가를 콕 짚어서 보라고 할 때는 'see' 보다 'look at'을 쓰면 포포가 더 빨리 헤엄쳐갈 수 있어! 'Look at the starfish' 처럼 말이야.",
    step3_retry:
      "포포가 저 높이 점프할 수 있게, 진주 마이크에 대고 큰 소리로 다시 말해볼까? 'Look at the starfish!'",
    expected_next_action: "activate_pearl_mic_recording"
  }
};

const FALLBACK_USERS = [
  {
    id: "stu_hajun",
    name: "김하준",
    grade_label: "초등 2학년",
    grade_group: "grade_1_2",
    age: 9,
    level: "Level 2",
    current_book_id: "bada_level2_ocean_friends",
    progress_w1: 100,
    progress_w2: 100,
    progress_w3: 90,
    progress_w4: 0,
    audio_w1_url: "storage://bada-audio/stu_hajun/week1_word_hesitant.wav",
    audio_w4_url: "storage://bada-audio/stu_hajun/week4_full_fluent.wav",
    w1_wpm: 36,
    w4_wpm: 92,
    w1_accuracy: 62,
    w4_accuracy: 96,
    strengths: [
      { tag: "under the sea (전치사구 리듬)", count: 14 },
      { tag: "swims across (동사+전치사 연음)", count: 11 },
      { tag: "shining starfish (강세 억양)", count: 9 },
      { tag: "golden treasure chest (완전한 호흡)", count: 8 }
    ],
    weaknesses: [
      { tag: "see vs look at 뉘앙스 혼동", count: 6 },
      { tag: "through (/θruː/) th 발음 약화", count: 5 },
      { tag: "glides (/z/) 어미 자음 생략", count: 4 },
      { tag: "관사 a / the 호흡 누락", count: 3 }
    ]
  },
  {
    id: "stu_seoyeon",
    name: "이서연",
    grade_label: "초등 4학년",
    grade_group: "grade_4_plus",
    age: 11,
    level: "Level 4",
    current_book_id: "bada_level2_ocean_friends",
    progress_w1: 100,
    progress_w2: 85,
    progress_w3: 0,
    progress_w4: 0,
    audio_w1_url: "storage://bada-audio/stu_seoyeon/week1_word_hesitant.wav",
    audio_w4_url: "storage://bada-audio/stu_seoyeon/week4_full_fluent.wav",
    w1_wpm: 48,
    w4_wpm: 108,
    w1_accuracy: 71,
    w4_accuracy: 98,
    strengths: [
      { tag: "1~5형식 동사구 확장", count: 16 },
      { tag: "glides through the clear water", count: 12 },
      { tag: "Look at the + 명사구 응용", count: 10 }
    ],
    weaknesses: [
      { tag: "5형식 목적격보어 분사(shining) 위치", count: 4 },
      { tag: "across vs through 공간 전치사 구분", count: 3 }
    ]
  },
  {
    id: "stu_jiho",
    name: "박지호",
    grade_label: "초등 6학년",
    grade_group: "grade_6",
    age: 13,
    level: "Level 7",
    current_book_id: "bada_level6_deep_currents",
    progress_w1: 100,
    progress_w2: 100,
    progress_w3: 100,
    progress_w4: 85,
    audio_w1_url: "storage://bada-audio/stu_jiho/week1_word_hesitant.wav",
    audio_w4_url: "storage://bada-audio/stu_jiho/week4_full_fluent.wav",
    w1_wpm: 55,
    w4_wpm: 124,
    w1_accuracy: 74,
    w4_accuracy: 97,
    strengths: [
      { tag: "관계부사 where절 호흡 연결", count: 15 },
      { tag: "is protected by (수동태 청크)", count: 13 },
      { tag: "자연스러운 원어민 강세 리듬", count: 11 }
    ],
    weaknesses: [
      { tag: "간접의문문 (how + S + V) 어순 도치", count: 5 },
      { tag: "수동태 과거분사(kept / hidden) 불규칙 변화", count: 4 }
    ]
  }
];

const FALLBACK_BOOKS = [
  {
    id: "bada_level2_ocean_friends",
    title: "Popo and the Ocean Friends",
    subtitle_kr: "아기 고래 포포와 반짝이는 바다 친구들",
    level: "Level 2",
    full_text:
      "Look at the starfish shining on the sandy floor. Baby whale Popo swims across the coral reef. A gentle sea turtle glides through the clear water. Together, they find a golden treasure chest under the sea!",
    vocab: [
      { word: "look", meaning_kr: "보다, 시선을 두다", phonetic: "/lʊk/", pos: "동사", popo_tip: "at과 함께 쓰여 무언가를 콕 짚어 볼 때 써요!" },
      { word: "starfish", meaning_kr: "불가사리", phonetic: "/ˈstɑːr.fɪʃ/", pos: "명사", popo_tip: "별(star) 모양을 닮은 바다 친구예요." },
      { word: "shining", meaning_kr: "반짝이는, 빛나는", phonetic: "/ˈʃaɪ.nɪŋ/", pos: "형용사", popo_tip: "햇빛이나 진주처럼 반짝일 때 써요." },
      { word: "sandy", meaning_kr: "모래빛의, 모래가 깔린", phonetic: "/ˈsæn.di/", pos: "형용사", popo_tip: "따뜻한 코랄 샌드(Coral Sand) 바닥!" },
      { word: "whale", meaning_kr: "고래", phonetic: "/weɪl/", pos: "명사", popo_tip: "아기 고래 포포(Baby Whale Popo)!" },
      { word: "swims", meaning_kr: "헤엄치다", phonetic: "/swɪmz/", pos: "동사", popo_tip: "지느러미를 흔들며 물속을 나아가요." },
      { word: "coral", meaning_kr: "산호", phonetic: "/ˈkɔːr.əl/", pos: "명사", popo_tip: "알록달록 바닷속 꽃밭 산호초예요." },
      { word: "turtle", meaning_kr: "바다거북", phonetic: "/ˈtɜːr.təl/", pos: "명사", popo_tip: "느긋하게 헤엄치는 다정한 친구예요." },
      { word: "glides", meaning_kr: "미끄러지듯 나아가다", phonetic: "/ɡlaɪdz/", pos: "동사", popo_tip: "물결을 타고 스르륵 날아가듯 이동해요." },
      { word: "treasure", meaning_kr: "보물", phonetic: "/ˈtreʒ.ər/", pos: "명사", popo_tip: "바다 깊은 곳에 숨겨진 황금 보물!" }
    ],
    chunks: [
      { text: "Look at the starfish", meaning_kr: "저 불가사리를 봐" },
      { text: "shining on the sandy floor.", meaning_kr: "모래 바닥 위에서 반짝이고 있는" },
      { text: "Baby whale Popo swims", meaning_kr: "아기 고래 포포가 힘차게 헤엄쳐요" },
      { text: "across the coral reef.", meaning_kr: "아름다운 산호초 숲을 가로질러" },
      { text: "A gentle sea turtle glides", meaning_kr: "다정한 바다거북 한 마리가 미끄러지듯 나아가요" },
      { text: "through the clear water.", meaning_kr: "맑고 투명한 바닷물 사이를 통과해" },
      { text: "Together, they find", meaning_kr: "친구들과 다 함께 발견해요" },
      { text: "a golden treasure chest under the sea!", meaning_kr: "바닷속 황금빛 보물 상자를!" }
    ],
    core_expressions: [
      { rank: 1, expression: "Look at the starfish", meaning_kr: "저 불가사리를 봐", pattern_note: "원어민 호흡 1순위 핵심 청크" },
      { rank: 2, expression: "shining on the sandy floor", meaning_kr: "모래 바닥 위에서 반짝이는", pattern_note: "분사구 묘사 호흡" },
      { rank: 3, expression: "swims across the coral reef", meaning_kr: "산호초를 가로질러 헤엄치다", pattern_note: "동사 + 방향 전치사구" },
      { rank: 4, expression: "glides through the clear water", meaning_kr: "맑은 물을 가르며 미끄러지듯 나아가다", pattern_note: "연음 리듬 핵심 표현" }
    ]
  },
  {
    id: "bada_level6_deep_currents",
    title: "Guardians of the Deep Current",
    subtitle_kr: "깊은 해류의 수호자들과 비밀의 섬",
    level: "Level 7",
    full_text:
      "The secret island is protected by a warm ocean current. Baby whale Popo explores the glowing cave where ancient pearls are hidden. Can you remember how the clear ocean water is kept clean by the coral reef?",
    vocab: [
      { word: "secret", meaning_kr: "비밀의, 신비로운", phonetic: "/ˈsiː.krət/", pos: "형용사", popo_tip: "아무도 모르는 바닷속 비밀 이야기!" },
      { word: "island", meaning_kr: "섬", phonetic: "/ˈaɪ.lənd/", pos: "명사", popo_tip: "s가 묵음이라 '아일랜드'라고 읽어요!" },
      { word: "protected", meaning_kr: "보호받는 (수동태 p.p.)", phonetic: "/prəˈtek.tɪd/", pos: "분사", popo_tip: "is protected by로 수동태를 만들어요." },
      { word: "current", meaning_kr: "해류, 물결의 흐름", phonetic: "/ˈkɜːr.ənt/", pos: "명사", popo_tip: "바닷속에 흐르는 따뜻한 물길이에요." },
      { word: "explores", meaning_kr: "탐험하다", phonetic: "/ɪkˈsplɔːrz/", pos: "동사", popo_tip: "포포와 함께 미지의 동굴을 탐험해요!" },
      { word: "glowing", meaning_kr: "은은하게 빛나는", phonetic: "/ˈɡloʊ.ɪŋ/", pos: "형용사", popo_tip: "진주조개처럼 스스로 빛을 내는 모습!" }
    ],
    chunks: [
      { text: "The secret island is protected", meaning_kr: "그 비밀의 섬은 안전하게 보호받아요" },
      { text: "by a warm ocean current.", meaning_kr: "따뜻한 바닷속 해류에 의해서" },
      { text: "Baby whale Popo explores the glowing cave", meaning_kr: "아기 고래 포포는 빛나는 동굴을 탐험해요" },
      { text: "where ancient pearls are hidden.", meaning_kr: "고대 진주들이 숨겨져 있는 곳인" },
      { text: "Can you remember", meaning_kr: "너는 기억할 수 있니" },
      { text: "how the clear ocean water is kept clean?", meaning_kr: "어떻게 맑은 바닷물이 깨끗하게 유지되는지?" }
    ],
    core_expressions: [
      { rank: 1, expression: "is protected by a warm ocean current", meaning_kr: "따뜻한 해류에 의해 보호받다", pattern_note: "초6 중등 대비 수동태 핵심 구문" },
      { rank: 2, expression: "where ancient pearls are hidden", meaning_kr: "고대 진주가 숨겨져 있는 (관계부사절)", pattern_note: "관계부사 + 수동태 결합" },
      { rank: 3, expression: "how the clear ocean water is kept clean", meaning_kr: "어떻게 바닷물이 깨끗하게 유지되는지", pattern_note: "의문사 + 주어 + 동사 간접의문문" }
    ]
  },
  {
    id: "bada_pre_bubble_song",
    title: "Popo's Happy Bubble Song",
    subtitle_kr: "포포의 퐁퐁 물방울 노래",
    level: "Pre-Level",
    full_text:
      "Popo blows a big water bubble in the blue sea. Jump high over the soft waves with baby dolphin! Look at the red crab dancing on the warm sandy beach.",
    vocab: [
      { word: "bubble", meaning_kr: "물방울, 거품", phonetic: "/ˈbʌb.əl/", pos: "명사", popo_tip: "포포가 푸슈~ 뿜어내는 둥근 물방울!" },
      { word: "waves", meaning_kr: "파도, 물결", phonetic: "/weɪvz/", pos: "명사", popo_tip: "출렁출렁 신나는 바다 파도!" },
      { word: "dolphin", meaning_kr: "돌고래", phonetic: "/ˈdɑːl.fɪn/", pos: "명사", popo_tip: "포포의 단짝 친구 아기 돌고래!" }
    ],
    chunks: [
      { text: "Popo blows a big water bubble", meaning_kr: "포포가 커다란 물방울을 불어요" },
      { text: "in the blue sea.", meaning_kr: "푸른 바닷속에서" },
      { text: "Jump high over the soft waves", meaning_kr: "부드러운 파도 위로 높이 점프해 봐" },
      { text: "with baby dolphin!", meaning_kr: "아기 돌고래와 함께!" },
      { text: "Look at the red crab", meaning_kr: "저 빨간 꽃게를 봐" },
      { text: "dancing on the warm sandy beach.", meaning_kr: "따뜻한 모래 해변 위에서 춤추고 있는" }
    ],
    core_expressions: [
      { rank: 1, expression: "blows a big water bubble", meaning_kr: "커다란 물방울을 불다", pattern_note: "Pre-Level 핵심 동작 청크" },
      { rank: 2, expression: "Jump high over the soft waves", meaning_kr: "파도 위로 높이 점프하다", pattern_note: "리듬 액션 표현" }
    ]
  }
];

const FALLBACK_AUDIT_LOGS = [
  {
    status: "DB_CACHE_HIT",
    text_hash: "8f3c2a19d04e71b2a90c114e",
    detail: "기존 DB에서 즉시 반환 (LLM 호출 생략 · 누적 조회 4회)",
    text_preview: "Look at the starfish shining on the sandy floor. Baby whale..."
  },
  {
    status: "CACHE_MISS_LLM_SAVED",
    text_hash: "4d91e87a02c53f18b620e91a",
    detail: "신규 텍스트 감지 ➔ LLM 단어·청크·핵심표현 추출 후 DB 영구 저장",
    text_preview: "The secret island is protected by a warm ocean current..."
  }
];

const FALLBACK_TEACHERS = [
  {
    id: "tch_director",
    name: "원장님 (총괄)",
    role: "director",
    title_label: "원장 · 최고관리자",
    email: "director@bada.kr"
  },
  {
    id: "tch_emma",
    name: "Teacher Emma",
    role: "teacher",
    title_label: "원어민 스피킹 코치",
    email: "emma@bada.kr"
  }
];

const state = {
  users: [...FALLBACK_USERS],
  teachers: [...FALLBACK_TEACHERS],
  books: [...FALLBACK_BOOKS],
  auditLogs: [...FALLBACK_AUDIT_LOGS],
  popoMasterSpec: FALLBACK_POPO_SPEC,
  currentUserId: "stu_hajun",
  currentBookId: "bada_level2_ocean_friends",
  loggedTeacher: { ...FALLBACK_TEACHERS[0] },
  currentWeek: 1,
  currentMode: "student",
  g4Phase: "w1_oral",
  classCardLevel: 2,
  classCardIndex: 0,
  classCardMastered: 1,
  w2Playing: false,
  puzzleTargetWords: ["Look", "at", "the", "shining", "starfish"],
  puzzleSelected: [],
  localHashCache: new Set(["look at the starfish shining on the sandy floor. baby whale popo swims across the coral reef. a gentle sea turtle glides through the clear water. together, they find a golden treasure chest under the sea!"])
};

// Web Speech & Web Audio Helpers
function formatTextForNaturalTts(text, contextNextWord = "") {
  const trimmed = String(text || "").trim();
  if (!trimmed) return "";

  // Single token word-by-word pronunciation normalization
  if (!/\s/.test(trimmed)) {
    const bare = trimmed.replace(/^[^a-zA-Z0-9]+|[^a-zA-Z0-9'-]+$/g, "");
    const lower = bare.toLowerCase();
    if (lower === "a") return "uh";
    if (lower === "the") {
      const nextClean = String(contextNextWord || "").replace(/^[^a-zA-Z]+/, "");
      return /^[aeiou]/i.test(nextClean) ? "thee" : "thuh";
    }
    return bare || trimmed;
  }

  // Multi-word chunk or sentence: normalize capitalized article "A " to lowercase "a "
  return trimmed
    .replace(/^(['"“”‘’]?)A\s+/g, "$1a ")
    .replace(/([.!?]\s+)A\s+/g, "$1a ");
}

function speakEnglish(text, rate = 0.92, pitch = 1.08, onEnd = null, contextNextWord = "") {
  if (!("speechSynthesis" in window)) {
    if (onEnd) setTimeout(onEnd, 700);
    return;
  }
  window.speechSynthesis.cancel();
  const spokenText = formatTextForNaturalTts(text, contextNextWord);
  const utter = new SpeechSynthesisUtterance(spokenText);
  utter.lang = "en-US";
  utter.rate = rate;
  utter.pitch = pitch;
  if (onEnd) {
    utter.onend = onEnd;
    utter.onerror = onEnd;
  }
  window.speechSynthesis.speak(utter);
}

function playOceanBubbleSound(freq = 520, duration = 0.16) {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(freq * 1.45, ctx.currentTime + duration);
    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch (_) {}
}

function getCurrentUser() {
  return state.users.find((u) => u.id === state.currentUserId) || state.users[0];
}

function getCurrentBook() {
  return state.books.find((b) => b.id === state.currentBookId) || state.books[0];
}

// ============================================================================
// INITIALIZATION & BOOTSTRAP
// ============================================================================
async function initApp() {
  try {
    const res = await fetch("/api/bootstrap");
    if (res.ok) {
      const data = await res.json();
      if (data.users && data.users.length) {
        state.users = data.users;
      }
      if (data.teachers && data.teachers.length) {
        state.teachers = data.teachers;
        state.loggedTeacher = data.teachers[0];
      }
      if (data.books && data.books.length) state.books = data.books;
      if (data.auditLogs && data.auditLogs.length) state.auditLogs = data.auditLogs;
      if (data.popoMasterSpec) state.popoMasterSpec = data.popoMasterSpec;
    }
  } catch (_) {
    // Runs seamlessly using built-in FALLBACK_USERS and FALLBACK_BOOKS
  }

  renderDynamicSelectorsAndEntry();
  bindNavigationEvents();
  bindAuthAndAdminManagementEvents();
  populateClassCardLevels();
  syncAllViews();
  applyRouteFromUrl(window.location.pathname, window.location.search, false);

  window.addEventListener("popstate", () => {
    applyRouteFromUrl(window.location.pathname, window.location.search, false);
  });
}

function navigateToRoute(path, pushHistory = true) {
  if (pushHistory && window.location.pathname + window.location.search !== path) {
    try {
      window.history.pushState({}, "", path);
    } catch (_) {}
  }
  const urlObj = new URL(path, window.location.origin);
  applyRouteFromUrl(urlObj.pathname, urlObj.search, false);
}

function getStudentCurrentWeek(user) {
  if (!user) return 1;
  if (user.progress_w1 < 100) return 1;
  if (user.progress_w2 < 100) return 2;
  if (user.progress_w3 < 100) return 3;
  return 4;
}

const WEEK_META_LABELS = {
  1: { title: "1주차 · 포포의 물방울 단어 탐험", doneSummary: "이번 달 첫 원서 탐험 시작!" },
  2: { title: "2주차 · 바다 유리 파도 타기 낭독", doneSummary: "1주차 완료 ✓" },
  3: { title: "3주차 · 포포와의 바다 대화", doneSummary: "1·2주차 완료 ✓" },
  4: { title: "4주차 · 전체 스토리 e-Book & 보물 상자", doneSummary: "1·2·3주차 완료 ✓" }
};

function syncCurrentWeekPlayer(user, forcedWeek = null) {
  if (!user) return;
  const activeWk = forcedWeek || state.currentWeek || getStudentCurrentWeek(user);
  activateWeekIsland(activeWk);

  const progVal = user[`progress_w${activeWk}`] || 0;
  const meta = WEEK_META_LABELS[activeWk] || WEEK_META_LABELS[1];

  const donePill = document.getElementById("learnCompletedSummaryPill");
  const curPill = document.getElementById("learnCurrentWeekPill");
  if (donePill) donePill.textContent = meta.doneSummary;
  if (curPill) {
    curPill.textContent = `🔥 ${user.name} 대원 · ${meta.title} (진도율 ${progVal}%)`;
  }
}

function syncCurrentGradeCurriculum(user) {
  if (!user) return;
  const gGroup = user.grade_group || "grade_1_2";
  activateGradeTab(gGroup);

  const activeWk = getStudentCurrentWeek(user);
  if (activeWk === 1) state.g4Phase = "w1_oral";
  else if (activeWk === 2) state.g4Phase = "w2_late_guided";
  else state.g4Phase = "w3_blank";

  const currPill = document.getElementById("currMyProgressPill");
  const currTitle = document.getElementById("currStudentMainTitle");
  const currDesc = document.getElementById("currStudentMainDesc");
  const g4Banner = document.getElementById("g4CurrentPhaseBanner");
  const g4Tag = document.getElementById("g4CurrentPhaseTag");

  const cardPhonics = document.getElementById("hubCardPhonics");
  const cardCc = document.getElementById("hubCardClassCard");
  const cardUpper = document.getElementById("hubCardUpperGrammar");
  const upperBadge = document.getElementById("hubUpperBadge");
  const upperTitle = document.getElementById("hubUpperTitle");
  const upperDesc = document.getElementById("hubUpperDesc");

  if (gGroup === "grade_1_2") {
    if (currPill) currPill.textContent = `🌱 ${user.name} 대원 · 초등 1~2학년 맞춤 20분 집중 훈련소`;
    if (currTitle) currTitle.textContent = `🌱 ${user.name} 대원(${user.grade_label}) 20분 집중 훈련소`;
    if (currDesc) currDesc.textContent = "오늘 하고 싶은 훈련 카드를 누르면 해당 훈련 전용 화면으로 이동해요!";
    if (cardPhonics) cardPhonics.classList.remove("hidden");
    if (cardCc) cardCc.classList.remove("hidden");
    if (cardUpper) cardUpper.classList.add("hidden");
  } else if (gGroup === "grade_4_plus") {
    const phaseLabel =
      state.g4Phase === "w1_oral"
        ? "1~2주차 초반 구두 반복"
        : state.g4Phase === "w2_late_guided"
        ? "2주차 후반 가이드 직접 쓰기"
        : "3~4주차 백지상태 발화 & 쓰기";
    if (currPill) currPill.textContent = `🌊 ${user.name} 대원 · 초4+ 40분 코스 (${phaseLabel})`;
    if (currTitle) currTitle.textContent = `🌊 ${user.name} 대원(${user.grade_label}) 맞춤 40분 심화 훈련소`;
    if (currDesc) currDesc.textContent = "클카 어휘 복습 또는 1~5형식 핵심 문장 훈련 카드를 눌러 전용 화면으로 입장하세요!";
    if (g4Banner) g4Banner.innerHTML = `현재 나의 원서 진도(<strong>${activeWk}주차</strong>)에 맞춰 <strong>'${phaseLabel} 1~5형식 패턴 훈련'</strong>이 열렸습니다.`;
    if (g4Tag) g4Tag.textContent = `⏱️ 나의 현재 진도: ${phaseLabel}`;
    if (cardPhonics) cardPhonics.classList.add("hidden");
    if (cardCc) cardCc.classList.remove("hidden");
    if (cardUpper) cardUpper.classList.remove("hidden");
    if (upperBadge) upperBadge.textContent = `PART 2 · 40분 심화 · ${phaseLabel}`;
    if (upperTitle) upperTitle.textContent = "1~5형식 문장 패턴 훈련소";
    if (upperDesc) upperDesc.textContent = "원서 속 핵심 문장 5형식을 입으로 말하고 직접 채워보며 문장 구조를 마스터해요!";
  } else {
    if (currPill) currPill.textContent = `🎓 ${user.name} 대원 · 초6 중등 대비 핵심 문법 훈련소`;
    if (currTitle) currTitle.textContent = `🎓 ${user.name} 대원(${user.grade_label}) 중등 대비 문법 훈련소`;
    if (currDesc) currDesc.textContent = "클카 어휘 복습 또는 초6 전용 중등 핵심 문법(수동태·간접의문문) 전용 화면으로 입장하세요!";
    if (cardPhonics) cardPhonics.classList.add("hidden");
    if (cardCc) cardCc.classList.remove("hidden");
    if (cardUpper) cardUpper.classList.remove("hidden");
    if (upperBadge) upperBadge.textContent = "초6 전용 · 중등 내신 대비 핵심 문법";
    if (upperTitle) upperTitle.textContent = "수동태 & 간접의문문 훈련소";
    if (upperDesc) upperDesc.textContent = "중등 시험 단골 포인트인 수동태(be+p.p.)와 간접의문문 어순을 원서 문장으로 정복해요!";
  }
}

function applyRouteFromUrl(pathname, search = "", playSound = true) {
  const cleanPath = (pathname || "/").replace(/\/+$/, "") || "/";
  const user = getCurrentUser();

  if (cleanPath.startsWith("/student")) {
    switchShell("student");
    if (cleanPath === "/student/learn") {
      switchStudentPage("learn");
      syncCurrentWeekPlayer(user);
    } else if (cleanPath === "/student/curriculum") {
      switchStudentPage("curriculum");
      syncCurrentGradeCurriculum(user);
    } else {
      switchStudentPage("home");
    }
  } else if (cleanPath.startsWith("/teacher")) {
    switchShell("teacher");
    if (cleanPath === "/teacher/coaching") {
      switchTeacherPage("coaching");
    } else if (cleanPath === "/teacher/reports") {
      switchTeacherPage("reports");
      drawBadaCertificate();
    } else if (cleanPath === "/teacher/database") {
      switchTeacherPage("database");
    } else {
      switchTeacherPage("home");
    }
  } else {
    switchShell("entry");
  }

  if (playSound) playOceanBubbleSound(580, 0.14);
}

function switchShell(shellName) {
  document.body.setAttribute("data-app-shell", shellName);
  document.querySelectorAll(".app-shell").forEach((el) => {
    el.classList.toggle("active", el.id === `shell-${shellName}`);
  });
}

function switchStudentPage(pageName) {
  document.querySelectorAll(".stu-nav-tab").forEach((btn) => {
    btn.classList.toggle("active", btn.getAttribute("data-student-page") === pageName);
  });
  document.querySelectorAll(".student-page").forEach((sec) => {
    sec.classList.toggle("active", sec.id === `student-page-${pageName}`);
  });
}

function switchTeacherPage(pageName) {
  document.querySelectorAll(".sidebar-nav-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.getAttribute("data-teacher-page") === pageName);
  });
  document.querySelectorAll(".teacher-page").forEach((sec) => {
    sec.classList.toggle("active", sec.id === `teacher-page-${pageName}`);
  });
  if (pageName === "reports") {
    drawBadaCertificate();
  }
}

function activateWeekIsland(wk) {
  state.currentWeek = wk;
  document.querySelectorAll(".week-island").forEach((i) => {
    i.classList.toggle("active", Number(i.getAttribute("data-week")) === wk);
  });
  document.querySelectorAll(".week-panel").forEach((p) => {
    p.classList.toggle("active", p.id === `week-panel-${wk}`);
  });
}

function selectActiveStudent(userId) {
  state.currentUserId = userId;
  const user = getCurrentUser();
  if (user && user.current_book_id) {
    state.currentBookId = user.current_book_id;
  }
  if (user && user.classcard_level) {
    state.classCardLevel = Number(user.classcard_level) || 2;
  }
  if (user) {
    state.currentWeek = getStudentCurrentWeek(user);
    state.learnStepPage = 1;
    state.storySentenceIdx = 0;
    state.storyWordIdx = 0;
    state.storyChunkIdx = 0;
    if (state.storyCompletedSentences) state.storyCompletedSentences.clear();
    state.learnVocabIdx = 0;
    state.isLearnFcFlipped = false;
    state.isG12FcFlipped = false;
    state.speakingQuestionIdx = 0;
  }
  const studentSelect = document.getElementById("studentSelect");
  const teacherStudentSelect = document.getElementById("teacherStudentSelect");
  const bookSelect = document.getElementById("bookSelect");
  if (studentSelect) studentSelect.value = state.currentUserId;
  if (teacherStudentSelect) teacherStudentSelect.value = state.currentUserId;
  if (bookSelect) bookSelect.value = state.currentBookId;

  document.querySelectorAll(".entry-stu-card").forEach((card) => {
    const isAct = card.getAttribute("data-entry-user") === state.currentUserId;
    card.classList.toggle("active", isAct);
    const badge = card.querySelector(".stu-select-badge");
    if (badge) badge.textContent = isAct ? "선택됨 ✓" : "선택하기";
  });

  syncAllViews();
  if (user && user.grade_group) {
    activateGradeTab(user.grade_group);
  }
}

function renderDynamicSelectorsAndEntry() {
  // 1. Entry Student Cards (#entryStudentCards)
  const entryCards = document.getElementById("entryStudentCards");
  if (entryCards) {
    entryCards.innerHTML = "";
    state.users.forEach((u) => {
      const uBook = state.books.find((b) => b.id === u.current_book_id) || state.books[0];
      const isAct = u.id === state.currentUserId;
      const activeWk = getStudentCurrentWeek(u);
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = `entry-stu-card ${isAct ? "active" : ""}`;
      btn.setAttribute("data-entry-user", u.id);
      btn.innerHTML = `
        <div class="stu-card-left">
          <strong>🧒 ${u.name} 대원 (${u.grade_label} · ${u.level})</strong>
          <span>배정 원서: 《${uBook ? uBook.title : ""}》 · 현재 ${activeWk}주차 진행 중 · 클카 Lv.${u.classcard_level || 2}</span>
        </div>
        <span class="stu-select-badge">${isAct ? "선택됨 ✓" : "선택하기"}</span>
      `;
      btn.addEventListener("click", () => {
        selectActiveStudent(u.id);
        const pinInput = document.getElementById("entryStudentPinInput");
        if (pinInput) pinInput.value = u.pin_code || "1234";
        playOceanBubbleSound(560, 0.14);
      });
      entryCards.appendChild(btn);
    });
  }

  // 2. Entry Teacher Select & Registration Teacher Select
  const entryTchSel = document.getElementById("entryTeacherSelect");
  const regStuTchSel = document.getElementById("regStuTeacher");
  if (entryTchSel) {
    const curVal = entryTchSel.value || "tch_director";
    entryTchSel.innerHTML = "";
    state.teachers.forEach((t) => {
      const opt = document.createElement("option");
      opt.value = t.id;
      opt.textContent = `${t.role === "director" ? "👑" : "👩‍🏫"} ${t.name} · ${t.title_label}`;
      if (t.id === curVal) opt.selected = true;
      entryTchSel.appendChild(opt);
    });
  }
  if (regStuTchSel) {
    regStuTchSel.innerHTML = "";
    state.teachers.forEach((t) => {
      const opt = document.createElement("option");
      opt.value = t.id;
      opt.textContent = `${t.role === "director" ? "👑" : "👩‍🏫"} ${t.name} (${t.title_label})`;
      if (t.id === "tch_emma") opt.selected = true;
      regStuTchSel.appendChild(opt);
    });
  }

  // 3. Book Dropdowns (#regStuBook, #bookSelect)
  const regBookSel = document.getElementById("regStuBook");
  const bookSel = document.getElementById("bookSelect");
  [regBookSel, bookSel].forEach((sel) => {
    if (!sel) return;
    const prev = sel.value;
    sel.innerHTML = "";
    state.books.forEach((b) => {
      const opt = document.createElement("option");
      opt.value = b.id;
      opt.textContent = `[${b.level}] ${b.title} (${b.subtitle_kr || ""})`;
      if (b.id === prev) opt.selected = true;
      sel.appendChild(opt);
    });
  });

  // 4. Student Dropdowns (#teacherStudentSelect, #studentSelect)
  const tchStuSel = document.getElementById("teacherStudentSelect");
  const stuSel = document.getElementById("studentSelect");
  [tchStuSel, stuSel].forEach((sel) => {
    if (!sel) return;
    sel.innerHTML = "";
    state.users.forEach((u) => {
      const opt = document.createElement("option");
      opt.value = u.id;
      opt.textContent = `${u.name} (${u.grade_label} · ${u.level})`;
      if (u.id === state.currentUserId) opt.selected = true;
      sel.appendChild(opt);
    });
  });
}

function bindNavigationEvents() {
  // Entry Portal: Student PIN Login -> /student
  const btnEnterStudent = document.getElementById("btnEnterStudentApp");
  if (btnEnterStudent) {
    btnEnterStudent.addEventListener("click", async () => {
      const pinInput = document.getElementById("entryStudentPinInput");
      const msgEl = document.getElementById("entryStudentAuthMsg");
      const pinCode = (pinInput ? pinInput.value : "1234").trim();

      try {
        const res = await fetch("/api/auth/student", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: state.currentUserId, pinCode })
        });
        const data = await res.json();
        if (!res.ok || !data.ok) {
          if (msgEl) {
            msgEl.textContent = `❌ ${data.error || "출석 PIN 번호가 일치하지 않습니다."}`;
            msgEl.className = "entry-auth-feedback error";
          }
          playOceanBubbleSound(320, 0.18);
          return;
        }
        if (msgEl) msgEl.className = "entry-auth-feedback hidden";
        selectActiveStudent(data.user.id);
        navigateToRoute("/student");
      } catch (_) {
        // Standalone fallback
        navigateToRoute("/student");
      }
    });
  }

  // Entry Portal: Teacher / Director Password Login -> /teacher
  async function attemptTeacherLoginAndNavigate(targetTeacherPage = "home") {
    const sel = document.getElementById("entryTeacherSelect");
    const pwInput = document.getElementById("entryTeacherPasswordInput");
    const msgEl = document.getElementById("entryTeacherAuthMsg");
    const teacherId = sel ? sel.value : "tch_director";
    const password = pwInput ? pwInput.value.trim() : "";

    try {
      const res = await fetch("/api/auth/teacher", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teacherId, password })
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        if (msgEl) {
          msgEl.textContent = `❌ ${data.error || "비밀번호가 올바르지 않습니다."}`;
          msgEl.className = "entry-auth-feedback error";
        }
        playOceanBubbleSound(320, 0.18);
        return;
      }
      if (msgEl) msgEl.className = "entry-auth-feedback hidden";
      state.loggedTeacher = data.teacher;
      syncLoggedTeacherUI();
      navigateToRoute(targetTeacherPage === "home" ? "/teacher" : `/teacher/${targetTeacherPage}`);
    } catch (_) {
      const found = state.teachers.find((t) => t.id === teacherId) || state.teachers[0];
      state.loggedTeacher = found;
      syncLoggedTeacherUI();
      navigateToRoute(targetTeacherPage === "home" ? "/teacher" : `/teacher/${targetTeacherPage}`);
    }
  }

  const btnEnterTeacher = document.getElementById("btnEnterTeacherApp");
  if (btnEnterTeacher) {
    btnEnterTeacher.addEventListener("click", () => attemptTeacherLoginAndNavigate("home"));
  }

  document.querySelectorAll("[data-goto-teacher]").forEach((row) => {
    row.addEventListener("click", () => {
      const page = row.getAttribute("data-goto-teacher");
      attemptTeacherLoginAndNavigate(page);
    });
  });

  // Quick-fill password helper buttons on Entry Screen
  const entryTchSel = document.getElementById("entryTeacherSelect");
  const entryTchPw = document.getElementById("entryTeacherPasswordInput");
  if (entryTchSel && entryTchPw) {
    entryTchSel.addEventListener("change", () => {
      entryTchPw.value = "";
    });
  }
  const btnQuickDir = document.getElementById("btnQuickFillDirectorPw");
  if (btnQuickDir && entryTchSel && entryTchPw) {
    btnQuickDir.addEventListener("click", () => {
      entryTchSel.value = "tch_director";
      entryTchPw.value = "bada1234";
    });
  }
  const btnQuickTch = document.getElementById("btnQuickFillTeacherPw");
  if (btnQuickTch && entryTchSel && entryTchPw) {
    btnQuickTch.addEventListener("click", () => {
      const firstTch = state.teachers.find((t) => t.role !== "director") || state.teachers[0];
      if (firstTch) entryTchSel.value = firstTch.id;
      entryTchPw.value = "1234";
    });
  }

  // Student App GNB tabs
  document.querySelectorAll(".stu-nav-tab").forEach((btn) => {
    btn.addEventListener("click", () => {
      const p = btn.getAttribute("data-student-page");
      navigateToRoute(p === "home" ? "/student" : `/student/${p}`);
    });
  });

  const brandHomeBtn = document.getElementById("brandHomeBtn");
  if (brandHomeBtn) {
    brandHomeBtn.addEventListener("click", () => navigateToRoute("/student"));
  }

  const btnStudentExit = document.getElementById("btnStudentExitToEntry");
  if (btnStudentExit) {
    btnStudentExit.addEventListener("click", () => navigateToRoute("/"));
  }

  const btnBackLearn = document.getElementById("btnBackToStudentHomeFromLearn");
  if (btnBackLearn) {
    btnBackLearn.addEventListener("click", () => navigateToRoute("/student"));
  }

  const btnBackCurr = document.getElementById("btnBackToStudentHomeFromCurr");
  if (btnBackCurr) {
    btnBackCurr.addEventListener("click", () => navigateToRoute("/student"));
  }

  const btnStartTodayMission = document.getElementById("btnStartTodayMission");
  if (btnStartTodayMission) {
    btnStartTodayMission.addEventListener("click", () => {
      const user = getCurrentUser();
      state.currentWeek = getStudentCurrentWeek(user);
      state.learnStepPage = 1;
      state.storySentenceIdx = 0;
      state.storyWordIdx = 0;
      state.storyChunkIdx = 0;
      state.storyCompletedSentences.clear();
      state.learnVocabIdx = 0;
      state.isLearnFcFlipped = false;
      state.speakingQuestionIdx = 0;
      switchLearnStepPage(1);
      renderSequentialLearnPlayer(getCurrentBook(), user);
      navigateToRoute("/student/learn");
    });
  }

  document.querySelectorAll("[data-open-week]").forEach((row) => {
    row.addEventListener("click", () => {
      const wk = Number(row.getAttribute("data-open-week")) || 1;
      const user = getCurrentUser();
      state.currentWeek = wk;
      state.learnStepPage = 1;
      state.storySentenceIdx = 0;
      state.storyWordIdx = 0;
      state.storyChunkIdx = 0;
      state.storyCompletedSentences.clear();
      state.learnVocabIdx = 0;
      state.isLearnFcFlipped = false;
      state.speakingQuestionIdx = 0;
      switchLearnStepPage(1);
      syncCurrentWeekPlayer(user, wk);
      renderSequentialLearnPlayer(getCurrentBook(), user);
      navigateToRoute("/student/learn");
    });
  });

  const btnHomeGotoCurr = document.getElementById("btnHomeGotoCurriculum");
  if (btnHomeGotoCurr) {
    btnHomeGotoCurr.addEventListener("click", () => navigateToRoute("/student/curriculum"));
  }

  // Teacher SaaS Sidebar navigation
  document.querySelectorAll(".sidebar-nav-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const p = btn.getAttribute("data-teacher-page");
      navigateToRoute(p === "home" ? "/teacher" : `/teacher/${p}`);
    });
  });

  const teacherBrandHome = document.getElementById("teacherBrandHomeBtn");
  if (teacherBrandHome) {
    teacherBrandHome.addEventListener("click", () => navigateToRoute("/teacher"));
  }

  const btnTeacherGotoDb = document.getElementById("btnTeacherGotoDbFromHome");
  if (btnTeacherGotoDb) {
    btnTeacherGotoDb.addEventListener("click", () => navigateToRoute("/teacher/database"));
  }

  const btnCoachingToReport = document.getElementById("btnCoachingToReport");
  if (btnCoachingToReport) {
    btnCoachingToReport.addEventListener("click", () => navigateToRoute("/teacher/reports"));
  }

  const btnTeacherToStudent = document.getElementById("btnTeacherSwitchToStudent");
  if (btnTeacherToStudent) {
    btnTeacherToStudent.addEventListener("click", () => navigateToRoute("/student"));
  }

  const btnTeacherExit = document.getElementById("btnTeacherExitToEntry");
  if (btnTeacherExit) {
    btnTeacherExit.addEventListener("click", () => navigateToRoute("/"));
  }

  // Student & Book selectors
  const studentSelect = document.getElementById("studentSelect");
  const teacherStudentSelect = document.getElementById("teacherStudentSelect");
  const bookSelect = document.getElementById("bookSelect");

  if (studentSelect) {
    studentSelect.addEventListener("change", () => {
      selectActiveStudent(studentSelect.value);
    });
  }

  if (teacherStudentSelect) {
    teacherStudentSelect.addEventListener("change", () => {
      selectActiveStudent(teacherStudentSelect.value);
    });
  }

  if (bookSelect) {
    bookSelect.addEventListener("change", () => {
      state.currentBookId = bookSelect.value;
      syncAllViews();
    });
  }

  // Grade router tabs
  document.querySelectorAll(".grade-tab-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const gTab = btn.getAttribute("data-grade-tab");
      activateGradeTab(gTab);
      playOceanBubbleSound(620, 0.14);
    });
  });

  // Grade 4+ weekly phase buttons
  document.querySelectorAll(".phase-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".phase-btn").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      state.g4Phase = btn.getAttribute("data-g4-phase");
      renderGrade4Patterns();
    });
  });

  bindParentReportEvents();
  bindTeacherSaasEvents();
  bindDbLabEvents();
}

function activateGradeTab(gradeGroup) {
  document.querySelectorAll(".grade-tab-btn").forEach((b) => {
    b.classList.toggle("active", b.getAttribute("data-grade-tab") === gradeGroup);
  });
  document.querySelectorAll(".grade-branch-panel").forEach((p) => {
    p.classList.toggle("active", p.id === `grade-panel-${gradeGroup}`);
  });
}

function renderStudentMapHome(user, book) {
  const gradeBadge = document.getElementById("studentHeaderGradeBadge");
  const bookSub = document.getElementById("studentHeaderBookSub");
  const lockedUserBadge = document.getElementById("studentLockedUserBadge");
  const lockedBookBadge = document.getElementById("studentLockedBookBadge");
  const fixedCcBadge = document.getElementById("g12CurrentLevelFixedBadge");

  if (gradeBadge) gradeBadge.textContent = `${user.grade_label} · ${user.level}`;
  if (bookSub) bookSub.textContent = book.title;
  if (lockedUserBadge) lockedUserBadge.textContent = `🧒 ${user.name} (${user.grade_label} · ${user.level})`;
  if (lockedBookBadge) lockedBookBadge.textContent = `📖 ${book.title}`;
  if (fixedCcBadge) fixedCcBadge.textContent = `나의 현재 레벨: Level ${user.classcard_level || 2} / 26`;

  const activeWk = getStudentCurrentWeek(user);

  const hW1 = document.getElementById("homeBadgeW1");
  const hW2 = document.getElementById("homeBadgeW2");
  const hW3 = document.getElementById("homeBadgeW3");
  const hW4 = document.getElementById("homeBadgeW4");
  const badgeMap = { 1: hW1, 2: hW2, 3: hW3, 4: hW4 };

  [1, 2, 3, 4].forEach((wk) => {
    const badgeEl = badgeMap[wk];
    const cardEl = document.getElementById(`homeIslandCard${wk}`);
    const actionEl = document.getElementById(`homeIslandAction${wk}`);
    const prog = user[`progress_w${wk}`] || 0;

    if (wk < activeWk) {
      if (badgeEl) {
        badgeEl.className = "home-week-tag";
        badgeEl.textContent = `완료 ✓ (${prog}%)`;
      }
      if (cardEl) {
        cardEl.className = "home-island-row toy-3d-island-card mint";
      }
      if (actionEl) {
        actionEl.innerHTML = `<button type="button" class="toy-3d-btn sm mint">복습하기 ⭐</button>`;
      }
    } else if (wk === activeWk) {
      if (badgeEl) {
        badgeEl.className = "home-week-tag coral";
        badgeEl.textContent = `🔥 나의 현재 진도 · ${wk}주차 (${prog}%)`;
      }
      if (cardEl) {
        cardEl.className = "home-island-row toy-3d-island-card coral";
      }
      if (actionEl) {
        actionEl.innerHTML = `<button type="button" class="toy-3d-btn sm coral">${wk}주차 출발하기! ➔</button>`;
      }
    } else {
      if (badgeEl) {
        badgeEl.className = "home-week-tag gold";
        badgeEl.textContent = `🔒 다음 섬 (${wk}주차)`;
      }
      if (cardEl) {
        cardEl.className = "home-island-row toy-3d-island-card gold locked-island";
      }
      if (actionEl) {
        actionEl.innerHTML = `<span class="toy-3d-chip sand">기다리는 중 🔒</span>`;
      }
    }
  });

  const mBadge = document.getElementById("homeMissionBadge");
  const mTitle = document.getElementById("homeMissionTitle");
  const mDesc = document.getElementById("homeMissionDesc");
  const mBtn = document.getElementById("btnStartTodayMission");

  const missionCopyByWeek = {
    1: {
      badge: "🔥 나의 현재 진도 · 1주차 물방울 단어 탐험",
      title: `${user.name} 대원! 오늘은 1주차 '포포의 물방울 단어'와 원서 첫 문장을 읽어볼까요?`,
      desc: "배정된 원서 《" + book.title + "》을 펼치고 단어 뜻과 문장을 한 줄씩 소리 내어 읽어봐요!",
      btn: "🐬 나의 현재 진도 (1주차 원서 책 펼치기) ➔"
    },
    2: {
      badge: "🔥 나의 현재 진도 · 2주차 파도 타기 낭독",
      title: `${user.name} 대원! 오늘은 2주차 원서 문장을 의미 단위 호흡으로 읽어볼까요?`,
      desc: "포포와 함께 단어 뜻 툴팁을 확인하고 플래시카드와 스피킹 질문까지 완주해 봐요!",
      btn: "🐬 나의 현재 진도 (2주차 원서 책 펼치기) ➔"
    },
    3: {
      badge: "🔥 나의 현재 진도 · 3주차 포포와의 바다 대화",
      title: `${user.name} 대원! 오늘은 3주차 '포포와의 대화'에서 진주조개 마이크로 문장을 말해볼까요?`,
      desc: "이번 달 원서 《" + book.title + "》의 핵심 표현을 말하면 포포가 공중제비로 응원해요!",
      btn: "🐬 나의 현재 진도 (3주차 원서 책 펼치기) ➔"
    },
    4: {
      badge: "🔥 나의 현재 진도 · 4주차 전체 스토리 & 보물 상자",
      title: `${user.name} 대원! 오늘은 4주차 '전체 스토리 낭독'으로 황금 보물 상자를 열어볼까요?`,
      desc: "진짜 원서 텍스트를 처음부터 끝까지 원어민 호흡으로 멋지게 완성해요!",
      btn: "🐬 나의 현재 진도 (4주차 전체 낭독) ➔"
    }
  };

  const curMission = missionCopyByWeek[activeWk] || missionCopyByWeek[1];
  if (mBadge) mBadge.textContent = curMission.badge;
  if (mTitle) mTitle.textContent = curMission.title;
  if (mDesc) mDesc.textContent = curMission.desc;
  if (mBtn) {
    mBtn.textContent = curMission.btn;
    mBtn.setAttribute("data-goto-week", String(activeWk));
  }

  const hbLevel = document.getElementById("homeBookLevelBadge");
  const hbTitle = document.getElementById("homeBookTitle");
  const hbSub = document.getElementById("homeBookSubtitle");
  if (hbLevel) hbLevel.textContent = `배정된 원서 · ${book.level}`;
  if (hbTitle) hbTitle.textContent = book.title;
  if (hbSub) hbSub.textContent = `${book.subtitle_kr || ""} · 핵심 어휘 ${(book.vocab || []).length}개`;

  const gCardTitle = document.getElementById("homeGradeCardTitle");
  const gCardDesc = document.getElementById("homeGradeCardDesc");
  const gNavLabel = document.getElementById("stuNavCurriculumLabel");
  if (user.grade_group === "grade_1_2") {
    if (gCardTitle) gCardTitle.textContent = "🌱 초등 1~2학년 맞춤 20분 집중 훈련소";
    if (gCardDesc) gCardDesc.textContent = `통문자 파닉스(10분) + 클카 Level ${user.classcard_level || 2}(20분) 코스입니다.`;
    if (gNavLabel) gNavLabel.textContent = "맞춤 훈련 놀이터";
  } else if (user.grade_group === "grade_4_plus") {
    if (gCardTitle) gCardTitle.textContent = "🌊 초등 4학년 이상 맞춤 40분 심화 훈련소";
    if (gCardDesc) gCardDesc.textContent = "1~5형식 패턴 기반 구두 반복 ➔ 가이드 쓰기 ➔ 백지 발화/영작 40분 코스입니다.";
    if (gNavLabel) gNavLabel.textContent = "맞춤 훈련 놀이터";
  } else {
    if (gCardTitle) gCardTitle.textContent = "🎓 초등 6학년 중등 내신 문법 특화 훈련소";
    if (gCardDesc) gCardDesc.textContent = "수동태(be+p.p.)와 간접의문문 어순 모듈이 활성화됩니다.";
    if (gNavLabel) gNavLabel.textContent = "맞춤 훈련 놀이터";
  }

  const w1Metric = document.getElementById("homeW1Metric");
  const w4Metric = document.getElementById("homeW4Metric");
  if (w1Metric) w1Metric.textContent = `${user.w1_wpm} WPM · ${user.w1_accuracy}%`;
  if (w4Metric) w4Metric.textContent = `${user.w4_wpm} WPM · ${user.w4_accuracy}%`;
}

const ALL_BADA_LEVELS = [
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

function syncLoggedTeacherUI() {
  const t = state.loggedTeacher || state.teachers[0] || FALLBACK_TEACHERS[0];
  const isDirector = t.role === "director";

  const nameBadge = document.getElementById("loggedTeacherNameBadge");
  const roleBadge = document.getElementById("loggedTeacherRoleBadge");
  const kpiStudents = document.getElementById("kpiTotalStudents");
  const kpiBreak = document.getElementById("kpiStudentBreakdown");
  const kpiBooks = document.getElementById("kpiTotalBooks");
  const kpiTeachers = document.getElementById("kpiTotalTeachers");
  const kpiRole = document.getElementById("kpiCurrentLoginRole");

  if (nameBadge) nameBadge.textContent = `${isDirector ? "👑" : "👩‍🏫"} ${t.name}`;
  if (roleBadge) roleBadge.textContent = `${t.title_label} · 온라인`;
  if (kpiStudents) kpiStudents.textContent = `${state.users.length}명`;
  if (kpiBreak) {
    const g12 = state.users.filter((u) => u.grade_group === "grade_1_2").length;
    const g4 = state.users.filter((u) => u.grade_group === "grade_4_plus").length;
    const g6 = state.users.filter((u) => u.grade_group === "grade_6").length;
    kpiBreak.textContent = `초1~2 ${g12}명 · 초3~5 ${g4}명 · 초6 ${g6}명`;
  }
  if (kpiBooks) kpiBooks.textContent = `${state.books.length}권`;
  if (kpiTeachers) kpiTeachers.textContent = `${state.teachers.length}명`;
  if (kpiRole) kpiRole.textContent = `현재 접속: ${t.name}`;

  const lockedNotice = document.getElementById("directorLockedNotice");
  const unlockedBody = document.getElementById("directorUnlockedBody");
  const accessBadge = document.getElementById("directorAccessBadge");
  if (lockedNotice) lockedNotice.classList.toggle("hidden", isDirector);
  if (unlockedBody) unlockedBody.classList.toggle("hidden", !isDirector);
  if (accessBadge) {
    accessBadge.textContent = isDirector
      ? "👑 원장님(최고관리자) 권한 활성됨"
      : "🔒 일반 강사 모드 (원장님 비밀번호 입력 시 해제)";
  }

  renderDirectorTeachersList();
}

function renderDirectorTeachersList() {
  const container = document.getElementById("teacherAccountsList");
  if (!container) return;
  container.innerHTML = "";

  state.teachers.forEach((t) => {
    const isDir = t.role === "director";
    const card = document.createElement("div");
    card.className = `teacher-account-card ${isDir ? "is-director" : ""}`;
    card.innerHTML = `
      <div>
        <strong>${isDir ? "👑" : "👩‍🏫"} ${t.name}</strong>
        <div style="font-size:12px;color:#475569;margin-top:2px;">${t.title_label} · <code>${t.email}</code></div>
      </div>
      <div>
        ${
          t.id === "tch_director"
            ? `<span class="saas-pill">기본 최고관리자</span>`
            : `<button type="button" class="saas-btn coral-btn" data-delete-teacher="${t.id}" style="padding:6px 10px;font-size:12px;">🗑️ 삭제</button>`
        }
      </div>
    `;

    const delBtn = card.querySelector("[data-delete-teacher]");
    if (delBtn) {
      delBtn.addEventListener("click", async () => {
        try {
          const res = await fetch("/api/teachers/delete", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ teacherId: t.id })
          });
          const data = await res.json();
          if (res.ok && data.ok) {
            state.teachers = data.teachers;
            renderDynamicSelectorsAndEntry();
            syncLoggedTeacherUI();
            playOceanBubbleSound(620, 0.16);
          }
        } catch (_) {}
      });
    }

    container.appendChild(card);
  });
}

function renderTeacherRoster() {
  const list = document.getElementById("teacherRosterList");
  if (!list) return;
  list.innerHTML = "";

  state.users.forEach((u) => {
    const uBook = state.books.find((b) => b.id === u.current_book_id) || state.books[0];
    const assignedTch = state.teachers.find((t) => t.id === u.teacher_id) || state.teachers[1] || state.teachers[0];
    const growthPct = Math.round(((u.w4_wpm - u.w1_wpm) / Math.max(1, u.w1_wpm)) * 100);
    const isAct = u.id === state.currentUserId;
    const activeWk = getStudentCurrentWeek(u);

    const row = document.createElement("div");
    row.className = `roster-student-row ${isAct ? "active-row" : ""}`;

    const levelOptionsHtml = ALL_BADA_LEVELS.map(
      (lv) => `<option value="${lv}" ${u.level === lv ? "selected" : ""}>${lv}</option>`
    ).join("");

    const bookOptionsHtml = state.books
      .map(
        (b) =>
          `<option value="${b.id}" ${u.current_book_id === b.id ? "selected" : ""}>[${b.level}] ${b.title}</option>`
      )
      .join("");

    row.innerHTML = `
      <div class="roster-col-main">
        <strong>🧒 ${u.name} (${u.grade_label} · ${u.level})</strong>
        <span>담당: ${assignedTch ? assignedTch.name : "Teacher Emma"} · 출석PIN: <code>${u.pin_code || "1234"}</code> · 클카 Lv.${u.classcard_level || 2}</span>
        <div class="roster-assign-controls">
          <label class="roster-inline-field">
            <span>등급:</span>
            <select class="roster-inline-select" data-edit-level="${u.id}">
              ${levelOptionsHtml}
            </select>
          </label>
          <label class="roster-inline-field">
            <span>배정 원서:</span>
            <select class="roster-inline-select" data-edit-book="${u.id}">
              ${bookOptionsHtml}
            </select>
          </label>
          <label class="roster-inline-field">
            <span>클카Lv:</span>
            <input type="number" class="roster-inline-input cc-mini" data-edit-cc="${u.id}" min="1" max="26" value="${u.classcard_level || 2}" />
          </label>
          <label class="roster-inline-field">
            <span>PIN:</span>
            <input type="text" class="roster-inline-input pin-mini" data-edit-pin="${u.id}" maxlength="4" value="${u.pin_code || "1234"}" />
          </label>
          <button type="button" class="saas-btn emerald-btn" data-save-assign="${u.id}" style="padding:5px 10px;font-size:12px;">
            💾 배정 저장 (새 원서 변경 시 1주차 자동 시작)
          </button>
          <button type="button" class="saas-btn" data-reset-w1="${u.id}" style="padding:5px 9px;font-size:11.5px;" title="현재 원서 그대로 1주차부터 다시 시작">
            🔄 1주차 초기화
          </button>
          <button type="button" class="saas-btn coral-btn" data-delete-stu="${u.id}" style="padding:5px 9px;font-size:11.5px;">
            🗑️ 학생 삭제
          </button>
        </div>
      </div>
      <div class="roster-col-book">
        <strong>📖 현재 원서: ${uBook ? uBook.title : ""}</strong>
        <span>🔥 현재 <strong>${activeWk}주차</strong> 진행 중 — W1: ${u.progress_w1}% | W2: ${u.progress_w2}% | W3: ${u.progress_w3}% | W4: ${u.progress_w4}%</span>
      </div>
      <div class="roster-col-audio">
        <strong>유창성: ${u.w1_wpm} WPM ➔ ${u.w4_wpm} WPM (+${growthPct}%)</strong>
        <div class="roster-audio-btns">
          <button type="button" class="roster-mini-audio-btn" data-roster-play="w1" data-uid="${u.id}">▶️ 1주차 녹음</button>
          <button type="button" class="roster-mini-audio-btn" data-roster-play="w4" data-uid="${u.id}">▶️ 4주차 녹음</button>
        </div>
      </div>
      <div class="roster-actions-col">
        <button type="button" class="saas-btn" data-roster-coach="${u.id}">🎥 화상수업 코칭룸 ➔</button>
        <button type="button" class="saas-btn coral-btn" data-roster-report="${u.id}">💌 리포트 발송</button>
      </div>
    `;

    // Save Level & Book Assignment (Auto-resets to Week 1 when book changes!)
    const saveBtn = row.querySelector(`[data-save-assign="${u.id}"]`);
    if (saveBtn) {
      saveBtn.addEventListener("click", async () => {
        const nextLevel = row.querySelector(`[data-edit-level="${u.id}"]`).value;
        const nextBookId = row.querySelector(`[data-edit-book="${u.id}"]`).value;
        const nextCc = Number(row.querySelector(`[data-edit-cc="${u.id}"]`).value) || 2;
        const nextPin = row.querySelector(`[data-edit-pin="${u.id}"]`).value.trim() || "1234";

        try {
          const res = await fetch("/api/students/update", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              userId: u.id,
              level: nextLevel,
              current_book_id: nextBookId,
              classcard_level: nextCc,
              pin_code: nextPin
            })
          });
          const data = await res.json();
          if (res.ok && data.ok) {
            state.users = data.users;
            if (state.currentUserId === u.id) {
              state.currentBookId = nextBookId;
              state.classCardLevel = nextCc;
              state.storyCompletedSentences.clear();
              state.storySentenceIdx = 0;
            }
            renderDynamicSelectorsAndEntry();
            syncAllViews();
            playOceanBubbleSound(820, 0.22);

            const fb = document.getElementById("regStuFeedbackMsg");
            if (fb) {
              const newBookObj = state.books.find((b) => b.id === nextBookId);
              fb.classList.remove("hidden");
              fb.textContent = data.bookChanged
                ? `✅ [${u.name}] 대원에게 새 원서 《${newBookObj ? newBookObj.title : nextBookId}》(${nextLevel})가 배정되어 진도가 자동으로 1주차(0%)부터 새로 시작됩니다!`
                : `✅ [${u.name}] 대원의 등급(${nextLevel}) · 클카(Lv.${nextCc}) · 출석번호(${nextPin}) 정보가 저장되었습니다!`;
            }
          }
        } catch (_) {}
      });
    }

    // Explicit Reset to Week 1 button
    const resetW1Btn = row.querySelector(`[data-reset-w1="${u.id}"]`);
    if (resetW1Btn) {
      resetW1Btn.addEventListener("click", async () => {
        try {
          const res = await fetch("/api/students/update", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId: u.id, resetProgress: true })
          });
          const data = await res.json();
          if (res.ok && data.ok) {
            state.users = data.users;
            state.storyCompletedSentences.clear();
            state.storySentenceIdx = 0;
            renderDynamicSelectorsAndEntry();
            syncAllViews();
            playOceanBubbleSound(760, 0.2);
            const fb = document.getElementById("regStuFeedbackMsg");
            if (fb) {
              fb.classList.remove("hidden");
              fb.textContent = `🔄 [${u.name}] 대원의 원서 진도가 1주차(0%) 초기 상태로 리셋되었습니다!`;
            }
          }
        } catch (_) {}
      });
    }

    // Delete student button
    const delStuBtn = row.querySelector(`[data-delete-stu="${u.id}"]`);
    if (delStuBtn) {
      delStuBtn.addEventListener("click", async () => {
        if (state.users.length <= 1) {
          alert("최소 1명의 학생 프로필은 유지되어야 합니다.");
          return;
        }
        try {
          const res = await fetch("/api/students/delete", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId: u.id })
          });
          const data = await res.json();
          if (res.ok && data.ok) {
            state.users = data.users;
            if (state.currentUserId === u.id && state.users[0]) {
              state.currentUserId = state.users[0].id;
              state.currentBookId = state.users[0].current_book_id;
            }
            renderDynamicSelectorsAndEntry();
            syncAllViews();
            playOceanBubbleSound(520, 0.16);
          }
        } catch (_) {}
      });
    }

    row.querySelectorAll("[data-roster-play]").forEach((btn) => {
      btn.addEventListener("click", () => {
        selectActiveStudent(u.id);
        if (btn.getAttribute("data-roster-play") === "w1") {
          playHesitantWeek1Sample();
        } else {
          playFluentWeek4Sample();
        }
      });
    });

    const coachBtn = row.querySelector("[data-roster-coach]");
    if (coachBtn) {
      coachBtn.addEventListener("click", () => {
        selectActiveStudent(u.id);
        navigateToRoute("/teacher/coaching");
      });
    }

    const repBtn = row.querySelector("[data-roster-report]");
    if (repBtn) {
      repBtn.addEventListener("click", () => {
        selectActiveStudent(u.id);
        navigateToRoute("/teacher/reports");
      });
    }

    list.appendChild(row);
  });
}

function bindAuthAndAdminManagementEvents() {
  // 1. Register New Student (#btnRegisterNewStudent)
  const btnRegStu = document.getElementById("btnRegisterNewStudent");
  if (btnRegStu) {
    btnRegStu.addEventListener("click", async () => {
      const nameInput = document.getElementById("regStuName");
      const gradeSel = document.getElementById("regStuGrade");
      const levelSel = document.getElementById("regStuLevel");
      const bookSel = document.getElementById("regStuBook");
      const ccInput = document.getElementById("regStuClasscard");
      const tchSel = document.getElementById("regStuTeacher");
      const pinInput = document.getElementById("regStuPin");
      const fb = document.getElementById("regStuFeedbackMsg");

      const name = (nameInput ? nameInput.value : "").trim();
      if (!name) {
        if (fb) {
          fb.classList.remove("hidden");
          fb.textContent = "⚠️ 등록할 학생의 이름을 입력해 주세요.";
        }
        return;
      }

      const payload = {
        name,
        grade_label: gradeSel ? gradeSel.value : "초등 2학년",
        level: levelSel ? levelSel.value : "Level 2",
        current_book_id: bookSel ? bookSel.value : state.books[0].id,
        classcard_level: ccInput ? Number(ccInput.value) || 2 : 2,
        teacher_id: tchSel ? tchSel.value : "tch_emma",
        pin_code: pinInput ? pinInput.value.trim() || "1234" : "1234"
      };

      try {
        const res = await fetch("/api/students/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (res.ok && data.ok) {
          state.users = data.users;
          if (nameInput) nameInput.value = "";
          renderDynamicSelectorsAndEntry();
          selectActiveStudent(data.student.id);
          playOceanBubbleSound(860, 0.25);

          if (fb) {
            const assignedBook = state.books.find((b) => b.id === data.student.current_book_id);
            fb.classList.remove("hidden");
            fb.textContent = `🎉 신규 학생 [${data.student.name}] (${data.student.grade_label} · ${data.student.level}) 등록 완료! 배정 원서 《${assignedBook ? assignedBook.title : ""}》 1주차(0%)부터 자동 시작됩니다. (출석번호: ${data.student.pin_code})`;
          }
        }
      } catch (_) {}
    });
  }

  // 2. Inline Director Unlock inside /teacher (#btnInlineUnlockDirector)
  const btnUnlockDir = document.getElementById("btnInlineUnlockDirector");
  if (btnUnlockDir) {
    btnUnlockDir.addEventListener("click", async () => {
      const pwInput = document.getElementById("inlineDirectorPwInput");
      const password = pwInput ? pwInput.value.trim() : "bada1234";
      try {
        const res = await fetch("/api/auth/teacher", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ teacherId: "tch_director", password })
        });
        const data = await res.json();
        if (res.ok && data.ok) {
          state.loggedTeacher = data.teacher;
          syncLoggedTeacherUI();
          playOceanBubbleSound(840, 0.2);
        } else {
          alert(data.error || "원장님 비밀번호가 일치하지 않습니다.");
        }
      } catch (_) {}
    });
  }

  // 3. Director: Register New Teacher (#btnRegisterNewTeacher)
  const btnRegTch = document.getElementById("btnRegisterNewTeacher");
  if (btnRegTch) {
    btnRegTch.addEventListener("click", async () => {
      const nameInput = document.getElementById("regTchName");
      const titleInput = document.getElementById("regTchTitle");
      const emailInput = document.getElementById("regTchEmail");
      const pwInput = document.getElementById("regTchPassword");
      const roleSel = document.getElementById("regTchRole");
      const fb = document.getElementById("regTchFeedbackMsg");

      const name = (nameInput ? nameInput.value : "").trim();
      if (!name) {
        if (fb) {
          fb.classList.remove("hidden");
          fb.textContent = "⚠️ 등록할 선생님 성함을 입력해 주세요.";
        }
        return;
      }

      const payload = {
        name,
        title_label: titleInput ? titleInput.value.trim() || "전담 코칭 강사" : "전담 코칭 강사",
        email: emailInput ? emailInput.value.trim() || "teacher@bada.kr" : "teacher@bada.kr",
        password: pwInput ? pwInput.value.trim() || "1234" : "1234",
        role: roleSel ? roleSel.value : "teacher"
      };

      try {
        const res = await fetch("/api/teachers/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (res.ok && data.ok) {
          state.teachers = data.teachers;
          if (nameInput) nameInput.value = "";
          if (emailInput) emailInput.value = "";
          renderDynamicSelectorsAndEntry();
          syncLoggedTeacherUI();
          playOceanBubbleSound(840, 0.22);
          if (fb) {
            fb.classList.remove("hidden");
            fb.textContent = `✅ [${data.teacher.name}] 선생님 계정이 등록되었습니다! 로그인 화면에서 등록한 비밀번호(${payload.password})로 접속할 수 있습니다.`;
          }
        }
      } catch (_) {}
    });
  }

  // 4. Register New Book to DB in /teacher/database (#btnRegisterNewBookToDb)
  const btnRegBook = document.getElementById("btnRegisterNewBookToDb");
  if (btnRegBook) {
    btnRegBook.addEventListener("click", async () => {
      const titleInput = document.getElementById("dbNewBookTitle");
      const subInput = document.getElementById("dbNewBookSubtitle");
      const levelSel = document.getElementById("dbNewBookLevel");
      const gradeInput = document.getElementById("dbNewBookGrade");
      const textInput = document.getElementById("dbTestTextInput");
      const krInput = document.getElementById("dbNewBookKoreanText");
      const resBox = document.getElementById("dbAnalyzeResultBox");

      const title = (titleInput ? titleInput.value : "").trim() || `Popo's New Ocean Story #${state.books.length + 1}`;
      const subtitle_kr = (subInput ? subInput.value : "").trim() || "포포의 새로운 바다 원서 모험";
      const level = levelSel ? levelSel.value : "Level 2";
      const grade_recommended = (gradeInput ? gradeInput.value : "").trim() || "초등 전학년";
      const full_text = (textInput ? textInput.value : "").trim();
      const korean_text = (krInput ? krInput.value : "").trim();

      if (!full_text) {
        if (resBox) resBox.innerHTML = `<strong style="color:#dc2626;">⚠️ 원서 본문 영어 텍스트를 입력해 주세요.</strong>`;
        return;
      }

      try {
        const res = await fetch("/api/books/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title, subtitle_kr, level, grade_recommended, full_text, korean_text })
        });
        const data = await res.json();
        if (res.ok && data.ok) {
          state.books = data.books;
          state.auditLogs = data.auditLogs || state.auditLogs;
          renderDynamicSelectorsAndEntry();
          syncAllViews();
          playOceanBubbleSound(880, 0.25);

          if (resBox) {
            const stList = (data.book.sentence_translations || []).map((s, i) => `${i + 1}. ${s.kr}`).join("<br/>");
            const sqList = (data.book.speaking_questions || []).map((q, i) => `Q${i + 1}. ${q.en} (${q.kr})`).join("<br/>");
            resBox.innerHTML = `
              <div style="padding:12px;background:#ecfdf5;border:1.5px solid #34d399;border-radius:12px;font-size:13px;line-height:1.6;">
                <strong style="color:#047857;">📚 신규 원서 《${data.book.title}》 (${data.book.level}) DB 정식 등록 완료!</strong><br/>
                <span>이제 [01. 강사 홈 & 학생 관리]에서 학생들에게 이 원서를 즉시 배정할 수 있습니다.</span><br/><br/>
                <strong>✅ 저장된 단어 뜻 (${(data.book.vocab || []).length}개):</strong> ${(data.book.vocab || []).slice(0, 8).map((v) => `${v.word}(${v.meaning_kr})`).join(", ")}<br/>
                <strong>✅ 문장별 한국어 해석 (${(data.book.sentence_translations || []).length}문장):</strong><br/>${stList || "자동 생성됨"}<br/>
                <strong>✅ 생성된 표현 스피킹 질문 (${(data.book.speaking_questions || []).length}개):</strong><br/>${sqList || "자동 생성됨"}
              </div>
            `;
          }
        }
      } catch (_) {}
    });
  }
}

function syncAllViews() {
  const user = getCurrentUser();
  const book = getCurrentBook();
  if (!user || !book) return;

  const bw1 = document.getElementById("badge-w1");
  const bw2 = document.getElementById("badge-w2");
  const bw3 = document.getElementById("badge-w3");
  const bw4 = document.getElementById("badge-w4");
  if (bw1) bw1.textContent = `${user.progress_w1}%`;
  if (bw2) bw2.textContent = `${user.progress_w2}%`;
  if (bw3) bw3.textContent = `${user.progress_w3}%`;
  if (bw4) bw4.textContent = `${user.progress_w4}%`;

  syncCurrentWeekPlayer(user);
  syncCurrentGradeCurriculum(user);
  syncLoggedTeacherUI();

  renderStudentMapHome(user, book);
  renderSequentialLearnPlayer(book, user);
  renderGrade12PhonicsAndClassCard();
  renderGrade4Patterns();
  renderGrade6Grammar();
  renderTeacherRoster();
  renderParentReport(user, book);
  renderTeacherDashboard(user, book);
  renderDbLab();
}

// ============================================================================
// WEEK 1: 포포의 물방울 단어 (WORD FOCUS)
// ============================================================================
let currentDropWord = "starfish";

function renderWeek1(book, user) {
  const container = document.getElementById("w1InteractiveText");
  container.innerHTML = "";

  const vocabMap = new Map();
  (book.vocab || []).forEach((v) => {
    vocabMap.set(v.word.toLowerCase(), v);
  });

  const tokens = book.full_text.split(/\s+/);
  tokens.forEach((tok) => {
    const clean = tok.replace(/[^a-zA-Z]/g, "").toLowerCase();
    const span = document.createElement("span");
    span.className = "w1-word-token";
    span.textContent = tok;

    if (vocabMap.has(clean)) {
      const vData = vocabMap.get(clean);
      span.classList.add("core-vocab");
      span.addEventListener("mouseenter", () => triggerWaterDropPopup(vData, span));
      span.addEventListener("click", () => {
        triggerWaterDropPopup(vData, span);
        speakEnglish(vData.word, 0.85, 1.1);
      });
    } else {
      span.addEventListener("click", () => speakEnglish(clean || tok, 0.9, 1.05));
    }

    container.appendChild(span);
    container.appendChild(document.createTextNode(" "));
  });

  if (book.vocab && book.vocab.length > 0) {
    updateWaterDropPopupContent(book.vocab[0]);
  }

  document.getElementById("w1StorageUrlCode").textContent = user.audio_w1_url;
  document.getElementById("w1WpmBadge").textContent = `${user.w1_wpm} WPM`;
  document.getElementById("w1AccBadge").textContent = `${user.w1_accuracy}%`;
}

function updateWaterDropPopupContent(vData) {
  currentDropWord = vData.word;
  document.getElementById("dropWordTitle").textContent = vData.word;
  document.getElementById("dropWordPhonetic").textContent = vData.phonetic || `/${vData.word}/`;
  document.getElementById("dropWordPos").textContent = vData.pos || "핵심어";
  document.getElementById("dropWordMeaning").textContent = vData.meaning_kr;
  document.getElementById("dropWordTip").textContent = `💦 ${vData.popo_tip || "포포와 함께 소리 내어 읽어봐요!"}`;
}

function triggerWaterDropPopup(vData, tokenEl) {
  document.querySelectorAll(".w1-word-token").forEach((el) => el.classList.remove("active-word"));
  if (tokenEl) tokenEl.classList.add("active-word");

  updateWaterDropPopupContent(vData);

  const popup = document.getElementById("waterDropPopup");
  const popoDock = document.getElementById("w1PopoDock");
  popup.classList.remove("spout-bounce");
  popoDock.classList.remove("spouting");
  void popup.offsetWidth;
  popup.classList.add("spout-bounce");
  popoDock.classList.add("spouting");

  document.getElementById("w1PopoStatusText").textContent =
    `💦 푸슈우! "${vData.word}"는 '${vData.meaning_kr}'라는 뜻이야! 물방울 팝업을 확인해 봐!`;
  playOceanBubbleSound(660, 0.14);
}

function bindWeek1Events() {
  document.getElementById("btnDropSpeakWord").addEventListener("click", () => {
    speakEnglish(currentDropWord, 0.82, 1.12);
  });

  document.getElementById("btnW1WordByWordTts").addEventListener("click", () => {
    const tokenEls = Array.from(document.querySelectorAll("#w1InteractiveText .w1-word-token"));
    let idx = 0;
    function stepWord() {
      tokenEls.forEach((el) => el.classList.remove("speaking-now"));
      if (idx >= tokenEls.length) {
        document.getElementById("w1PopoStatusText").textContent =
          "💦 단어 단위 끊어 읽기를 끝까지 잘 들었어! 이제 녹음 버튼을 눌러 읽어볼까?";
        return;
      }
      const el = tokenEls[idx++];
      el.classList.add("speaking-now");
      speakEnglish(el.textContent, 0.85, 1.08, () => {
        setTimeout(stepWord, 180);
      });
    }
    stepWord();
  });

  document.getElementById("btnW1StartStt").addEventListener("click", async () => {
    const dot = document.getElementById("w1RecDot");
    const title = document.getElementById("w1RecTitle");
    dot.classList.add("recording");
    title.textContent = "🎙️ 1주차 단어 읽기 녹음 중... 핵심 단어를 또렷하게 읽어보세요!";
    playOceanBubbleSound(520, 0.2);

    setTimeout(async () => {
      dot.classList.remove("recording");
      const user = getCurrentUser();
      const newUrl = `storage://bada-audio/${user.id}/week1_word_${Date.now().toString().slice(-4)}.wav`;
      user.audio_w1_url = newUrl;
      document.getElementById("w1StorageUrlCode").textContent = newUrl;
      title.textContent = "✅ 1주차 음성 녹음 완료! (4주차 유창성 비교용으로 스토리지에 자동 저장됨)";
      playOceanBubbleSound(780, 0.22);

      try {
        await fetch("/api/users/progress", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: user.id, week: 1, progress: 100, audioUrl: newUrl })
        });
      } catch (_) {}
    }, 1500);
  });

  document.getElementById("btnPlayW1Sample").addEventListener("click", () => {
    playHesitantWeek1Sample();
  });
}

// ============================================================================
// WEEK 2: 파도 타기 낭독 (CHUNK FOCUS — SEA GLASS BLOCKS & SWIMMING POPO)
// ============================================================================
function renderWeek2(book) {
  const container = document.getElementById("w2ChunksContainer");
  container.innerHTML = "";

  const chunks = book.chunks || [];
  chunks.forEach((chunk, cIdx) => {
    const block = document.createElement("div");
    block.className = "sea-glass-chunk";
    block.setAttribute("data-chunk-idx", cIdx);

    const enLine = document.createElement("div");
    enLine.className = "chunk-en-line";

    Array.from(chunk.text).forEach((ch, charIdx) => {
      const charSpan = document.createElement("span");
      charSpan.className = "wave-char";
      charSpan.style.setProperty("--char-idx", charIdx);
      charSpan.textContent = ch === " " ? "\u00A0" : ch;
      enLine.appendChild(charSpan);
    });

    const krLine = document.createElement("span");
    krLine.className = "chunk-kr-hint";
    krLine.textContent = `🫧 ${chunk.meaning_kr}`;

    block.appendChild(enLine);
    block.appendChild(krLine);

    block.addEventListener("click", () => {
      activateSeaGlassChunk(cIdx, chunks);
    });

    container.appendChild(block);
  });

  const exprGrid = document.getElementById("w2CoreExpressionsGrid");
  exprGrid.innerHTML = "";
  (book.core_expressions || []).forEach((expr) => {
    const card = document.createElement("div");
    card.className = "core-expr-card squishy-btn";
    card.innerHTML = `
      <span class="mini-pill">핵심 표현 #${expr.rank} · ${expr.pattern_note}</span>
      <strong>"${expr.expression}"</strong>
      <span>${expr.meaning_kr}</span>
    `;
    card.addEventListener("click", () => speakEnglish(expr.expression, 0.9, 1.08));
    exprGrid.appendChild(card);
  });
}

function activateSeaGlassChunk(chunkIdx, chunks, onDone = null) {
  const allBlocks = Array.from(document.querySelectorAll(".sea-glass-chunk"));
  allBlocks.forEach((b) => b.classList.remove("wave-active"));

  const activeBlock = allBlocks[chunkIdx];
  if (!activeBlock) {
    if (onDone) onDone();
    return;
  }

  activeBlock.classList.add("wave-active");

  const swimLane = document.getElementById("w2SwimLane");
  const swimmingPopo = document.getElementById("w2SwimmingPopo");
  const maxOffset = Math.max(0, swimLane.clientWidth - 280);
  const ratio = chunks.length > 1 ? chunkIdx / (chunks.length - 1) : 0;
  const xPos = Math.round(ratio * maxOffset);
  swimmingPopo.style.transform = `translateX(${xPos}px)`;

  document.getElementById("w2SwimCaption").textContent =
    `🌊 포포 파도 타기 중 (${chunkIdx + 1}/${chunks.length}): "${chunks[chunkIdx].text}"`;

  speakEnglish(chunks[chunkIdx].text, 0.9, 1.1, () => {
    if (onDone) onDone();
  });
}

function bindWeek2Events() {
  document.getElementById("btnW2PlayAllWaves").addEventListener("click", () => {
    const book = getCurrentBook();
    const chunks = book.chunks || [];
    state.w2Playing = true;
    let idx = 0;

    function playNextChunk() {
      if (!state.w2Playing || idx >= chunks.length) {
        state.w2Playing = false;
        document.getElementById("w2SwimCaption").textContent =
          "🐋✨ 파도 타기 완주 성공! 원어민 호흡 리듬이 훨씬 부드러워졌어요!";
        return;
      }
      activateSeaGlassChunk(idx++, chunks, () => {
        setTimeout(playNextChunk, 260);
      });
    }
    playNextChunk();
  });

  document.getElementById("btnW2StopWaves").addEventListener("click", () => {
    state.w2Playing = false;
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    document.querySelectorAll(".sea-glass-chunk").forEach((b) => b.classList.remove("wave-active"));
  });
}

// ============================================================================
// WEEK 3: 포포와의 대화 (PEARL CLAM MIC & 3-STEP POPO AI FEEDBACK)
// ============================================================================
function renderWeek3(book) {
  const firstExpr =
    book.core_expressions && book.core_expressions[0]
      ? book.core_expressions[0].expression
      : "Look at the shining starfish";
  state.puzzleTargetWords = firstExpr.split(/\s+/);
  state.puzzleSelected = [];
  renderWordOrderPuzzle();

  document.getElementById("w3LiveJsonPre").textContent = JSON.stringify(
    state.popoMasterSpec,
    null,
    2
  );
}

function renderWordOrderPuzzle() {
  const tray = document.getElementById("w3PuzzleAnswerTray");
  const pool = document.getElementById("w3PuzzlePebblesPool");
  const msg = document.getElementById("w3PuzzleFeedbackMsg");
  tray.innerHTML = "";
  pool.innerHTML = "";

  state.puzzleSelected.forEach((word, idx) => {
    const btn = document.createElement("button");
    btn.className = "pebble-word-btn";
    btn.textContent = word;
    btn.addEventListener("click", () => {
      state.puzzleSelected.splice(idx, 1);
      renderWordOrderPuzzle();
    });
    tray.appendChild(btn);
  });

  const remaining = [...state.puzzleTargetWords];
  state.puzzleSelected.forEach((sel) => {
    const i = remaining.indexOf(sel);
    if (i !== -1) remaining.splice(i, 1);
  });

  remaining
    .slice()
    .sort((a, b) => a.localeCompare(b))
    .forEach((word) => {
      const btn = document.createElement("button");
      btn.className = "pebble-word-btn";
      btn.textContent = word;
      btn.addEventListener("click", () => {
        state.puzzleSelected.push(word);
        speakEnglish(word, 0.95, 1.1);
        renderWordOrderPuzzle();
      });
      pool.appendChild(btn);
    });

  if (state.puzzleSelected.length === state.puzzleTargetWords.length) {
    const formed = state.puzzleSelected.join(" ");
    const target = state.puzzleTargetWords.join(" ");
    if (formed.toLowerCase() === target.toLowerCase()) {
      msg.textContent = `💦🐋 푸슈우! "${formed}" 완벽한 어순 징검다리 완성!`;
      speakEnglish(formed, 0.92, 1.1);
    } else {
      msg.textContent = "🫧 순서가 조금 바뀌었어! 조약돌을 다시 눌러 순서를 맞춰볼까?";
    }
  } else {
    msg.textContent = "👆 아래 조약돌 단어를 순서대로 눌러 문장을 완성해 보세요!";
  }
}

function bindWeek3Events() {
  document.getElementById("btnW3ListenTargetSentence").addEventListener("click", () => {
    speakEnglish(state.puzzleTargetWords.join(" "), 0.88, 1.1);
  });

  document.getElementById("btnW3ResetPuzzle").addEventListener("click", () => {
    state.puzzleSelected = [];
    renderWordOrderPuzzle();
  });

  document.getElementById("btnW3SpeakQuestion").addEventListener("click", () => {
    speakEnglish("Look at the starfish!", 0.88, 1.12);
  });

  document.getElementById("btnTogglePopoJson").addEventListener("click", () => {
    document.getElementById("w3PopoJsonDrawer").classList.toggle("hidden");
  });

  const clamBtn = document.getElementById("btnPearlClamMic");
  clamBtn.addEventListener("click", () => {
    activatePearlClamMicrophone();
  });

  document.querySelectorAll("[data-sim-speech]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const text = btn.getAttribute("data-sim-speech");
      submitSpeechToPopo(text);
    });
  });
}

function activatePearlClamMicrophone() {
  const clamBtn = document.getElementById("btnPearlClamMic");
  const label = document.getElementById("pearlClamLabel");
  if (!clamBtn || !label) return;

  const book = getCurrentBook();
  const qList = getWeekSpeakingQuestions(book, state.currentWeek || 1);
  const qItem = qList[state.speakingQuestionIdx] || qList[0];
  const sampleAns = (qItem && (qItem.target || qItem.hint)) || "Look at the starfish!";

  clamBtn.classList.add("listening");
  label.textContent = `🐚✨ 진주가 빛나며 내 목소리를 듣고 있어요... ('${sampleAns}'라고 말해보세요)`;
  playOceanBubbleSound(720, 0.2);

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (SpeechRecognition) {
    try {
      const rec = new SpeechRecognition();
      rec.lang = "en-US";
      rec.interimResults = false;
      rec.maxAlternatives = 1;
      rec.onresult = (e) => {
        const transcript = e.results[0][0].transcript;
        clamBtn.classList.remove("listening");
        submitSpeechToPopo(transcript);
      };
      rec.onerror = () => {
        clamBtn.classList.remove("listening");
        submitSpeechToPopo(sampleAns);
      };
      rec.start();
      return;
    } catch (_) {}
  }

  setTimeout(() => {
    clamBtn.classList.remove("listening");
    submitSpeechToPopo(sampleAns);
  }, 1300);
}

function evaluatePopoSpeechLocal(transcript) {
  const norm = (transcript || "").toLowerCase();
  if (norm.includes("look at") && norm.includes("starfish")) {
    return {
      ...FALLBACK_POPO_SPEC,
      student_utterance: transcript,
      evaluation_status: "PERFECT_BREACH",
      popo_response_template: {
        step1_encourage:
          "💦🐋✨ 푸슈우우!! 'Look at the starfish!' 완벽한 파도 타기 발음이야! 포포가 신나서 하늘 높이 점프했어!",
        step2_correction:
          "'look at'으로 콕 짚어 주고 'starfish'까지 또렷하게 이어 말해서 포포가 단번에 불가사리를 찾았어! 이렇게 말하면 포포가 더 높이 점프할 수 있어!",
        step3_retry:
          "이제 자신감 가득한 목소리로 진주 마이크에 대고 보너스 문장도 외쳐볼까? 'Look at the shining starfish!'",
        expected_next_action: "activate_pearl_mic_recording"
      }
    };
  }
  return {
    ...FALLBACK_POPO_SPEC,
    student_utterance: transcript
  };
}

async function submitSpeechToPopo(transcript) {
  const pill = document.getElementById("w3StudentTranscriptPill");
  const label = document.getElementById("pearlClamLabel");
  pill.textContent = `🗣️ 내가 말한 문장: "${transcript}"`;
  label.textContent = "🐚 진주조개 마이크 누르고 다시 말하기 (Press to Talk)";

  let feedbackData = null;
  try {
    const res = await fetch("/api/popo/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        transcript,
        bookId: state.currentBookId,
        targetChunk: "look at the starfish"
      })
    });
    if (res.ok) {
      feedbackData = await res.json();
    } else {
      feedbackData = evaluatePopoSpeechLocal(transcript);
    }
  } catch (_) {
    feedbackData = evaluatePopoSpeechLocal(transcript);
  }

  const tpl = feedbackData.popo_response_template;
  const s1 = document.getElementById("w3Step1Text");
  const s2 = document.getElementById("w3Step2Text");
  const s3 = document.getElementById("w3Step3Text");
  const jPre = document.getElementById("w3LiveJsonPre");
  if (s1) s1.textContent = tpl.step1_encourage;
  if (s2) s2.textContent = tpl.step2_correction;
  if (s3) s3.textContent = tpl.step3_retry;
  if (jPre) jPre.textContent = JSON.stringify(feedbackData, null, 2);

  // Clean Kid-Friendly Popo Speech Bubble (NO STEP 1/2/3 AI prompt headers!)
  const popoKrEl = document.getElementById("popoSpokenSubtitleKr");
  const popoEnEl = document.getElementById("popoSpokenQuestionEn");
  const isPerfect = feedbackData.evaluation_status === "PERFECT_BREACH";
  if (isPerfect) {
    if (popoEnEl) {
      popoEnEl.textContent = `"Awesome! ${transcript} — You said it just like a real ocean explorer!"`;
    }
    if (popoKrEl) {
      popoKrEl.textContent = `💦🐋✨ "${tpl.step1_encourage} 다음 질문도 들어볼까?"`;
    }
    playOceanBubbleSound(880, 0.28);
    speakEnglish("Awesome! Look at the starfish! Great job!", 0.94, 1.14);
  } else {
    if (popoEnEl) {
      popoEnEl.textContent = `"Good try! Let's say together: Look at the starfish!"`;
    }
    if (popoKrEl) {
      popoKrEl.textContent = `🐬 "${tpl.step1_encourage} ${tpl.step2_correction}"`;
    }
    playOceanBubbleSound(680, 0.22);
    speakEnglish("Good try! Let's say, Look at the starfish!", 0.9, 1.12);
  }

  const stage = document.getElementById("w3CenterPopoStage") || document.getElementById("speakingPopoCard");
  if (stage) {
    stage.classList.remove("jelly-pop");
    void stage.offsetWidth;
    stage.classList.add("jelly-pop");
  }
}

// ============================================================================
// WEEK 4: FULL READING E-BOOK, WORKSHEET & BREACHING TREASURE CHEST
// ============================================================================
function renderWeek4(book, user) {
  document.getElementById("w4EbookLevelBadge").textContent = `${book.level} e-Book`;
  document.getElementById("w4EbookTitle").textContent = book.title;

  const spread = document.getElementById("w4EbookSpread");
  spread.innerHTML = "";

  const sentences = book.full_text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);

  sentences.forEach((sent) => {
    const span = document.createElement("span");
    span.className = "ebook-sentence";
    span.textContent = sent + " ";
    span.addEventListener("click", () => {
      document.querySelectorAll(".ebook-sentence").forEach((el) => el.classList.remove("reading-active"));
      span.classList.add("reading-active");
      speakEnglish(sent, 0.96, 1.05);
    });
    spread.appendChild(span);
  });

  const wsContainer = document.getElementById("w4WorksheetContainer");
  wsContainer.innerHTML = "";

  const prompts = [
    {
      kr: "1. 핵심 문장 백지 쓰기 (1)",
      answer: sentences[0] || "Look at the starfish shining on the sandy floor."
    },
    {
      kr: "2. 핵심 문장 백지 쓰기 (2)",
      answer: sentences[1] || "Baby whale Popo swims across the coral reef."
    }
  ];

  prompts.forEach((p, idx) => {
    const div = document.createElement("div");
    div.className = "worksheet-item";
    div.innerHTML = `
      <label>${p.kr}</label>
      <input type="text" class="worksheet-input" data-ans="${p.answer}" placeholder="백지상태에서 영어 문장을 직접 입력해 보세요..." id="wsInput_${idx}" />
    `;
    wsContainer.appendChild(div);
  });

  const treasureStage = document.getElementById("w4TreasureStage");
  if (user.progress_w4 >= 100) {
    treasureStage.classList.add("unlocked");
    document.getElementById("w4TreasureCaption").innerHTML =
      "🎉 <strong>보물 상자 오픈 완료!</strong> 포포가 수면 위로 힘차게 점프(Breaching)하며 황금 진주 보물을 선물했어요!";
  } else {
    treasureStage.classList.remove("unlocked");
  }
}

function bindWeek4Events() {
  document.getElementById("btnW4ReadFullEbook").addEventListener("click", () => {
    const sentEls = Array.from(document.querySelectorAll(".ebook-sentence"));
    let idx = 0;
    function readNext() {
      sentEls.forEach((el) => el.classList.remove("reading-active"));
      if (idx >= sentEls.length) return;
      const el = sentEls[idx++];
      el.classList.add("reading-active");
      speakEnglish(el.textContent, 0.98, 1.06, () => setTimeout(readNext, 200));
    }
    readNext();
  });

  document.getElementById("btnW4FillAnswerHint").addEventListener("click", () => {
    document.querySelectorAll(".worksheet-input").forEach((inp) => {
      inp.value = inp.getAttribute("data-ans");
    });
  });

  document.getElementById("btnW4CheckWorksheet").addEventListener("click", () => {
    let correctCount = 0;
    const inputs = document.querySelectorAll(".worksheet-input");
    inputs.forEach((inp) => {
      const expected = inp.getAttribute("data-ans").toLowerCase().replace(/[^a-z\s]/g, "").trim();
      const actual = inp.value.toLowerCase().replace(/[^a-z\s]/g, "").trim();
      if (actual && (actual === expected || expected.includes(actual.slice(0, 10)))) {
        inp.classList.add("correct");
        correctCount++;
      }
    });
    document.getElementById("w4WorksheetResult").textContent =
      `✨ 백지 쓰기 채점 결과: ${inputs.length}문항 중 ${correctCount}문항 완성! 포포가 물방울 박수를 보내요!`;
    playOceanBubbleSound(760, 0.2);
  });

  document.getElementById("btnW4RecordFullStory").addEventListener("click", async () => {
    const stage = document.getElementById("w4TreasureStage");
    const caption = document.getElementById("w4TreasureCaption");
    caption.innerHTML = "🎙️ 원어민 속도로 전체 스토리 녹음 분석 중...";
    playOceanBubbleSound(600, 0.2);

    setTimeout(async () => {
      stage.classList.add("unlocked");
      caption.innerHTML =
        "🐋✨ <strong>브리칭(Breaching) &amp; 보물 상자 오픈!</strong> 원어민 속도(92 WPM) 전체 문장 녹음 성공! 바닷속 황금 보물 상자가 열렸어요!";
      playOceanBubbleSound(880, 0.35);

      const user = getCurrentUser();
      user.progress_w4 = 100;
      const bw4 = document.getElementById("badge-w4");
      if (bw4) bw4.textContent = "100%";
      syncCurrentWeekPlayer(user);
      renderStudentMapHome(user, getCurrentBook());

      try {
        await fetch("/api/users/progress", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: user.id,
            week: 4,
            progress: 100,
            audioUrl: `storage://bada-audio/${user.id}/week4_full_fluent_verified.wav`
          })
        });
      } catch (_) {}
    }, 850);
  });
}

// ============================================================================
// GRADE-SPECIFIC CURRICULUM (학년별 분기 처리)
// ============================================================================
const CLASSCARD_DECK = [
  { word: "starfish", meaning: "🌟 불가사리 (Look at the starfish!)" },
  { word: "coral reef", meaning: "🪸 산호초 (Popo swims across the coral reef.)" },
  { word: "sea turtle", meaning: "🐢 바다거북 (A gentle sea turtle glides.)" },
  { word: "treasure chest", meaning: "👑 보물 상자 (They find a golden treasure chest!)" },
  { word: "clear water", meaning: "💧 맑은 바닷물 (Through the clear water.)" }
];

function populateClassCardLevels() {
  const sel = document.getElementById("g12ClassCardLevelSelect");
  if (!sel) return;
  sel.innerHTML = "";
  for (let lv = 1; lv <= 26; lv++) {
    const opt = document.createElement("option");
    opt.value = lv;
    opt.textContent = `초등필수 클카 Level ${lv} / 26`;
    if (lv === 2) opt.selected = true;
    sel.appendChild(opt);
  }
  sel.addEventListener("change", () => {
    state.classCardLevel = Number(sel.value);
    state.classCardIndex = 0;
    updateFlashcardUI();
  });
}

function renderGrade12PhonicsAndClassCard() {
  const phonicsGrid = document.getElementById("g12PhonicsGrid");
  phonicsGrid.innerHTML = "";
  const phonicsItems = [
    { sound: "sh-", word: "shining", kr: "✨ 반짝이는 (/ʃ/ 물결 소리)" },
    { sound: "st-", word: "starfish", kr: "🌟 불가사리 (/st/ 별 모양 통문자)" },
    { sound: "wh-", word: "whale", kr: "🐋 고래 (/w/ 입술을 둥글게)" },
    { sound: "tr-", word: "treasure", kr: "💎 보물 (/tr/ 보물 상자 통문자)" }
  ];

  phonicsItems.forEach((item) => {
    const btn = document.createElement("button");
    btn.className = "phonics-bubble-btn";
    btn.innerHTML = `
      <span class="mini-pill">${item.sound} 통문자</span>
      <strong>${item.word}</strong>
      <span>${item.kr}</span>
    `;
    btn.addEventListener("click", () => {
      speakEnglish(item.word, 0.85, 1.12);
      document.getElementById("g12PhonicsFeedback").textContent =
        `💦 퐁! [${item.sound}] 통문자 '${item.word}'(${item.kr}) 물방울을 터뜨렸어요!`;
    });
    phonicsGrid.appendChild(btn);
  });

  updateFlashcardUI();

  const g12CardEl = document.getElementById("g12Flashcard");
  if (g12CardEl) {
    g12CardEl.onclick = () => {
      const card = CLASSCARD_DECK[state.classCardIndex];
      state.isG12FcFlipped = !state.isG12FcFlipped;
      playOceanBubbleSound(680, 0.15);
      updateFlashcardUI();
      if (!state.isG12FcFlipped && card) {
        speakEnglish(card.word, 0.86, 1.08);
      }
    };
  }

  document.getElementById("btnG12PrevCard").onclick = () => {
    state.isG12FcFlipped = false;
    state.classCardIndex = (state.classCardIndex - 1 + CLASSCARD_DECK.length) % CLASSCARD_DECK.length;
    updateFlashcardUI({ speakFront: true });
  };

  document.getElementById("btnG12NextCard").onclick = () => {
    state.isG12FcFlipped = false;
    state.classCardIndex = (state.classCardIndex + 1) % CLASSCARD_DECK.length;
    updateFlashcardUI({ speakFront: true });
  };

  document.getElementById("btnG12KnowCard").onclick = () => {
    state.isG12FcFlipped = false;
    state.classCardMastered = Math.min(5, state.classCardMastered + 1);
    state.classCardIndex = (state.classCardIndex + 1) % CLASSCARD_DECK.length;
    playOceanBubbleSound(760, 0.18);
    updateFlashcardUI({ speakFront: true });
  };
}

function updateFlashcardUI(options = {}) {
  const card = CLASSCARD_DECK[state.classCardIndex];
  if (!card) return;
  const tag = document.getElementById("g12CardLevelTag");
  const front = document.getElementById("g12CardFront");
  const back = document.getElementById("g12CardBack");
  const masteryText = document.getElementById("g12CardMasteryText");
  const cardEl = document.getElementById("g12Flashcard");
  const badge = document.getElementById("g12CardSideBadge");
  const frontNotice = document.getElementById("g12CardFrontNotice");
  const backBox = document.getElementById("g12CardBackBox");
  const tapHint = document.getElementById("g12CardTapHint");

  if (tag) {
    tag.textContent = `ClassCard Level ${state.classCardLevel} (26 Level 과정) · 카드 ${state.classCardIndex + 1} / ${CLASSCARD_DECK.length}`;
  }
  if (front) front.textContent = card.word;
  if (back) back.textContent = card.meaning;
  if (masteryText) {
    masteryText.innerHTML = `현재 Level ${state.classCardLevel} 마스터 진도: <strong>${state.classCardMastered} / ${CLASSCARD_DECK.length} 카드 완료</strong>`;
  }

  const isFlipped = !!state.isG12FcFlipped;
  if (cardEl) cardEl.classList.toggle("is-flipped", isFlipped);
  if (badge) {
    badge.textContent = isFlipped ? "✨ 뒷면 (단어 뜻 & 예문)" : "🃏 앞면 (영어 단어) · 터치해서 뒤집기";
  }
  if (frontNotice) frontNotice.classList.toggle("hidden", isFlipped);
  if (backBox) backBox.classList.toggle("hidden", !isFlipped);
  if (tapHint) {
    tapHint.textContent = isFlipped
      ? "👆 카드를 다시 터치하면 앞면(영어 단어)으로 돌아가요!"
      : "👆 카드를 터치하면 뒷면(뜻·예문)이 열려요!";
  }

  if (options.speakFront) {
    speakEnglish(card.word, 0.86, 1.08);
  }
}

function renderGrade4Patterns() {
  const container = document.getElementById("g4PatternsContainer");
  container.innerHTML = "";

  const patterns = [
    {
      form: "1형식 (S + V + 수식어)",
      en: "Baby whale Popo swims across the coral reef.",
      guidedHint: "Baby whale Popo _____ across the coral reef.",
      kr: "아기 고래 포포가 산호초를 가로질러 헤엄친다."
    },
    {
      form: "2형식 (S + V + C)",
      en: "The ocean water looks clear and warm.",
      guidedHint: "The ocean water _____ clear and warm.",
      kr: "바닷물이 맑고 따뜻해 보인다."
    },
    {
      form: "3형식 (S + V + O)",
      en: "They find a golden treasure chest.",
      guidedHint: "They _____ a golden treasure chest.",
      kr: "그들은 황금 보물 상자를 발견한다."
    },
    {
      form: "4형식 (S + V + I.O + D.O)",
      en: "Popo gives the turtle a shining pearl.",
      guidedHint: "Popo gives _____ a shining pearl.",
      kr: "포포는 바다거북에게 반짝이는 진주를 준다."
    },
    {
      form: "5형식 (S + V + O + O.C)",
      en: "Coral reefs keep the ocean clean.",
      guidedHint: "Coral reefs keep the ocean _____.",
      kr: "산호초는 바다를 깨끗한 상태로 유지해 준다."
    }
  ];

  patterns.forEach((pat) => {
    const card = document.createElement("div");
    card.className = "pattern-card";

    let interactionHtml = "";
    if (state.g4Phase === "w1_oral") {
      interactionHtml = `
        <p style="font-size:15px;font-weight:800;color:#0f3d3e;">"${pat.en}"</p>
        <button class="squishy-mini-btn mint" data-speak="${pat.en}">🗣️ 구두 반복 따라 말하기 (1~2주차 초반)</button>
      `;
    } else if (state.g4Phase === "w2_late_guided") {
      interactionHtml = `
        <p style="font-size:13px;color:#0f766e;">힌트: ${pat.guidedHint}</p>
        <input type="text" class="worksheet-input" value="${pat.en}" aria-label="${pat.form} 직접 쓰기" />
      `;
    } else {
      interactionHtml = `
        <input type="text" class="worksheet-input" placeholder="백지상태에서 ${pat.form} 문장을 직접 영작해 보세요!" />
      `;
    }

    card.innerHTML = `
      <span class="mini-pill">${pat.form}</span>
      <h4>${pat.kr}</h4>
      ${interactionHtml}
    `;

    const speakBtn = card.querySelector("[data-speak]");
    if (speakBtn) {
      speakBtn.addEventListener("click", () => speakEnglish(pat.en, 0.92, 1.08));
    }

    container.appendChild(card);
  });
}

function renderGrade6Grammar() {
  const passiveBox = document.getElementById("g6PassiveQuizBox");
  const whBox = document.getElementById("g6WhQuizBox");

  passiveBox.innerHTML = `
    <div class="g6-item">
      <span class="mini-pill">능동태 (Active)</span>
      <p><strong>A warm ocean current protects the secret island.</strong></p>
      <span class="mini-pill coral" style="margin-top:8px;">수동태 변환 (be + p.p. + by)</span>
      <p style="color:#0f766e;font-weight:800;margin-top:4px;">➔ The secret island <u>is protected by</u> a warm ocean current.</p>
      <button class="squishy-mini-btn mint" style="margin-top:8px;" onclick="speakEnglish('The secret island is protected by a warm ocean current.')">🔊 수동태 원어민 호흡 듣기</button>
    </div>
  `;

  whBox.innerHTML = `
    <div class="g6-item">
      <span class="mini-pill">직접의문문</span>
      <p><strong>How is the clear ocean water kept clean?</strong></p>
      <span class="mini-pill coral" style="margin-top:8px;">간접의문문 어순 (의문사 + 주어 + 동사)</span>
      <p style="color:#0f766e;font-weight:800;margin-top:4px;">➔ Can you remember <u>how the clear ocean water is</u> kept clean?</p>
      <button class="squishy-mini-btn mint" style="margin-top:8px;" onclick="speakEnglish('Can you remember how the clear ocean water is kept clean?')">🔊 간접의문문 호흡 듣기</button>
    </div>
  `;
}

// ============================================================================
// PARENT REPORT: DUAL AUDIO PLAYER & AUTO-GENERATED BADA CERTIFICATE
// ============================================================================
function renderParentReport(user) {
  document.getElementById("parentReportStudentBadge").textContent = `${user.name} (${user.grade_label}) 학부모님`;
  document.getElementById("reportStudentName").textContent = user.name;
  document.getElementById("dualW1Metrics").textContent = `${user.w1_wpm} WPM · 정확도 ${user.w1_accuracy}%`;
  document.getElementById("dualW4Metrics").textContent = `${user.w4_wpm} WPM · 정확도 ${user.w4_accuracy}%`;
  drawBadaCertificate();
}

function playHesitantWeek1Sample() {
  const wave = document.getElementById("waveW1");
  wave.classList.add("playing");
  const hesitantWords = ["Look...", "at...", "the...", "star...", "fish..."];
  let idx = 0;
  function speakStaccato() {
    if (idx >= hesitantWords.length) {
      wave.classList.remove("playing");
      return;
    }
    speakEnglish(hesitantWords[idx++], 0.65, 0.95, () => {
      setTimeout(speakStaccato, 340);
    });
  }
  speakStaccato();
}

function playFluentWeek4Sample() {
  const wave = document.getElementById("waveW4");
  wave.classList.add("playing");
  const book = getCurrentBook();
  speakEnglish(book.full_text, 1.02, 1.1, () => {
    wave.classList.remove("playing");
  });
}

function bindParentReportEvents() {
  document.getElementById("btnDualPlayW1").addEventListener("click", () => {
    playHesitantWeek1Sample();
  });

  document.getElementById("btnDualPlayW4").addEventListener("click", () => {
    playFluentWeek4Sample();
  });

  document.getElementById("btnDownloadCertificate").addEventListener("click", () => {
    drawBadaCertificate();
    const canvas = document.getElementById("badaCertificateCanvas");
    const link = document.createElement("a");
    link.download = `BADA_탐험수료증_${getCurrentUser().name}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  });

  document.getElementById("btnSendAlimTalkToast").addEventListener("click", () => {
    const banner = document.getElementById("alimtalkSentBanner");
    const user = getCurrentUser();
    banner.classList.remove("hidden");
    banner.textContent = `✅ [${user.name} 학부모님] 카카오톡 알림톡으로 1주차/4주차 듀얼 음성 비교 링크와 'BADA 탐험 수료증' 이미지가 전송되었습니다!`;
    playOceanBubbleSound(820, 0.25);
  });
}

function drawBadaCertificate() {
  const canvas = document.getElementById("badaCertificateCanvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const user = getCurrentUser();
  const book = getCurrentBook();
  if (!user || !book) return;

  const w = canvas.width;
  const h = canvas.height;

  const bgGrad = ctx.createLinearGradient(0, 0, w, h);
  bgGrad.addColorStop(0, "#E0FBF6");
  bgGrad.addColorStop(0.55, "#FFFDF9");
  bgGrad.addColorStop(1, "#FFF1F2");
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, w, h);

  ctx.strokeStyle = "#14B8A6";
  ctx.lineWidth = 8;
  ctx.strokeRect(22, 22, w - 44, h - 44);

  ctx.strokeStyle = "#FB7185";
  ctx.lineWidth = 3;
  ctx.strokeRect(34, 34, w - 68, h - 68);

  ctx.fillStyle = "#0F766E";
  ctx.font = "bold 16px Pretendard, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("🌊 BADA ENGLISH OCEAN EXPLORER CERTIFICATE 🌊", w / 2, 78);

  ctx.fillStyle = "#0F3D3E";
  ctx.font = "bold 36px Jua, Pretendard, sans-serif";
  ctx.fillText("BADA 영어 4주 탐험 수료증", w / 2, 126);

  ctx.fillStyle = "#E11D48";
  ctx.font = "bold 30px Pretendard, sans-serif";
  ctx.fillText(`탐험 대원 : ${user.name} (${user.grade_label} · ${user.level})`, w / 2, 185);

  ctx.fillStyle = "#335C67";
  ctx.font = "600 18px Pretendard, sans-serif";
  ctx.fillText(`완주 원서 : "${book.title}"`, w / 2, 228);
  ctx.fillText(
    `낭독 유창성 성장 : 1주차 ${user.w1_wpm} WPM ➔ 4주차 ${user.w4_wpm} WPM (정확도 ${user.w4_accuracy}% 달성!)`,
    w / 2,
    262
  );

  ctx.fillStyle = "#0F3D3E";
  ctx.font = "500 16px Pretendard, sans-serif";
  ctx.fillText("위 어린이는 아기 고래 포포와 함께 4주간의 영어 원서 읽기 및", w / 2, 315);
  ctx.fillText("스피킹 바다 탐험 과정을 성실히 완주하였으므로 이 수료증을 수여합니다.", w / 2, 342);

  const stampX = w - 155;
  const stampY = h - 115;
  ctx.save();
  ctx.beginPath();
  ctx.arc(stampX, stampY, 56, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(45, 212, 191, 0.18)";
  ctx.fill();
  ctx.lineWidth = 3.5;
  ctx.strokeStyle = "#0D9488";
  ctx.stroke();

  ctx.fillStyle = "#0F766E";
  ctx.font = "bold 14px Pretendard, sans-serif";
  ctx.fillText("아기 고래 포포", stampX, stampY - 18);
  ctx.font = "28px sans-serif";
  ctx.fillText("🐋💦", stampX, stampY + 14);
  ctx.font = "bold 12px Pretendard, sans-serif";
  ctx.fillText("OFFICIAL STAMP", stampX, stampY + 36);
  ctx.restore();

  ctx.fillStyle = "#475569";
  ctx.font = "bold 15px Pretendard, sans-serif";
  ctx.textAlign = "left";
  ctx.fillText("발급일 : 2026년 11월 10일", 64, h - 85);
  ctx.fillText("BADA 영어 교육연구소 & 아기 고래 포포", 64, h - 60);
}

// ============================================================================
// TEACHER SAAS DASHBOARD (WIDGET 1: TAG CLOUD, WIDGET 2: 3 AI QUESTIONS)
// ============================================================================
async function renderTeacherDashboard(user, book) {
  document.getElementById("saasStudentName").textContent = `${user.name} (${user.grade_label} · ${user.level})`;
  document.getElementById("saasW1Wpm").textContent = `${user.w1_wpm} WPM`;
  const growthPct = Math.round(((user.w4_wpm - user.w1_wpm) / user.w1_wpm) * 100);
  document.getElementById("saasW4Wpm").textContent = `${user.w4_wpm} WPM (+${growthPct}%)`;

  const sCloud = document.getElementById("saasStrengthsCloud");
  const wCloud = document.getElementById("saasWeaknessesCloud");
  sCloud.innerHTML = "";
  wCloud.innerHTML = "";

  (user.strengths || []).forEach((s) => {
    const span = document.createElement("span");
    span.className = "saas-tag good";
    span.innerHTML = `✨ ${s.tag} <strong>(${s.count}회 성공)</strong>`;
    sCloud.appendChild(span);
  });

  (user.weaknesses || []).forEach((w, idx) => {
    if (idx === 0) {
      document.getElementById("saasPrimaryFocus").textContent = w.tag;
    }
    const span = document.createElement("span");
    span.className = "saas-tag weak";
    span.innerHTML = `⚠️ ${w.tag} <strong>(${w.count}회 감지)</strong>`;
    wCloud.appendChild(span);
  });

  await loadTeacherRecommendedQuestions(user, book);
}

function getFallbackTeacherQuestions(user, book) {
  return [
    {
      category: "취약 표현 교정 (see vs look at 뉘앙스)",
      question_en: `Hi ${user.name}! In "${book.title}", Popo found something shining on the sandy floor. Can you tell me what to look at using "Look at the ~"?`,
      coaching_tip_kr: "학생이 3주차 STT에서 'see the starfish'를 먼저 발화했습니다. 자연스럽게 'Look at the starfish!'를 유도해 주세요.",
      target_chunk: "Look at the shining starfish!"
    },
    {
      category: "발음 집중 케어 (/θ/ & /f/ 발음 호흡 연결)",
      question_en: `How does the gentle sea turtle move through the clear water? Let's say "glides through the clear water" together!`,
      coaching_tip_kr: "2주차 파도 타기 낭독에서 'through(/θruː/)' 발음 시 호흡이 끊기는 패턴이 관찰되었습니다. 연음 리듬을 가이드해 주세요.",
      target_chunk: "glides through the clear water"
    },
    {
      category: "스토리 확장 & 상상 발화 (강점 표현 활용)",
      question_en: `At the end, Popo and friends opened the golden treasure chest! If YOU found a treasure chest under the sea, what would be inside?`,
      coaching_tip_kr: "학생의 강점 표현인 'under the sea', 'golden treasure'를 활용하여 완전한 문장으로 성취감을 느끼도록 마무리해 주세요.",
      target_chunk: "I found a glowing pearl under the sea!"
    }
  ];
}

async function loadTeacherRecommendedQuestions(user, book) {
  const qList = document.getElementById("saasQuestionsList");
  let questions = getFallbackTeacherQuestions(user, book);

  try {
    const res = await fetch("/api/teacher/questions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        studentName: user.name,
        bookTitle: book.title,
        weakPoints: user.weaknesses,
        strongPoints: user.strengths,
        coreExpressions: book.core_expressions || []
      })
    });
    if (res.ok) {
      const data = await res.json();
      if (data.questions && data.questions.length) questions = data.questions;
    }
  } catch (_) {}

  qList.innerHTML = "";
  questions.forEach((q, idx) => {
    const div = document.createElement("div");
    div.className = "rec-question-item";
    div.innerHTML = `
      <span class="q-cat">RECOMMENDED QUESTION 0${idx + 1} · ${q.category}</span>
      <div class="q-en">"${q.question_en}"</div>
      <div class="q-tip">💡 <strong>강사 코칭 가이드:</strong> ${q.coaching_tip_kr} (목표 발화: <code>${q.target_chunk}</code>)</div>
    `;
    qList.appendChild(div);
  });
}

function bindTeacherSaasEvents() {
  document.getElementById("btnRegenerateTeacherQuestions").addEventListener("click", () => {
    loadTeacherRecommendedQuestions(getCurrentUser(), getCurrentBook());
    playOceanBubbleSound(680, 0.16);
  });
}

// ============================================================================
// DATABASE ARCHITECTURE & VOCAB/CHUNK DEDUPLICATION LAB
// ============================================================================
function renderDbLab() {
  const catalogList = document.getElementById("registeredBooksCatalogList");
  if (catalogList) {
    catalogList.innerHTML = "";
    state.books.forEach((b) => {
      const sents = getBookSentences(b);
      const div = document.createElement("div");
      div.className = "audit-log-item";
      div.innerHTML = `
        <strong>📖 ${b.title}</strong> <span class="mini-pill" style="margin-left:6px;">${b.level} · ${b.grade_recommended || "초등 전학년"}</span><br/>
        <span style="color:#475569;font-size:13px;">${b.subtitle_kr || ""}</span><br/>
        <small style="color:#64748b;">문장 ${sents.length}개 · 단어 ${(b.vocab || []).length}개 · 스피킹 질문 ${(b.speaking_questions || []).length}개</small>
      `;
      catalogList.appendChild(div);
    });
  }

  renderAuditLogs(state.auditLogs);

  const snap = document.getElementById("dbUsersSnapshot");
  if (snap) {
    snap.innerHTML = "";
    state.users.forEach((u) => {
      const div = document.createElement("div");
      div.className = "user-snap-row";
      div.innerHTML = `<strong>${u.name} (${u.grade_label} · ${u.level})</strong> — W1:${u.progress_w1}% / W2:${u.progress_w2}% / W3:${u.progress_w3}% / W4:${u.progress_w4}%`;
      snap.appendChild(div);
    });
  }
}

function renderAuditLogs(logs) {
  const list = document.getElementById("dbAuditLogsList");
  list.innerHTML = "";
  (logs || []).forEach((log) => {
    const div = document.createElement("div");
    div.className = `audit-log-item ${log.status.includes("MISS") ? "miss" : ""}`;
    div.innerHTML = `
      <strong>[${log.status}]</strong> Hash: <code>${log.text_hash}</code><br/>
      <span>${log.detail}</span><br/>
      <small style="color:#64748b;">텍스트: "${log.text_preview}"</small>
    `;
    list.appendChild(div);
  });
}

function bindDbLabEvents() {
  document.getElementById("btnLoadExistingText").addEventListener("click", () => {
    const book = getCurrentBook();
    document.getElementById("dbTestTextInput").value = book.full_text;
    const krInput = document.getElementById("dbNewBookKoreanText");
    if (krInput) {
      krInput.value = (book.sentence_translations || []).map((s) => s.kr).join("\n");
    }
  });

  document.getElementById("btnLoadNewText").addEventListener("click", () => {
    const randomId = Math.floor(Math.random() * 900 + 100);
    document.getElementById("dbTestTextInput").value =
      `Baby whale Popo jumps over the glowing waves #${randomId}. A friendly dolphin explores the secret coral island through the clear ocean water!`;
    const krInput = document.getElementById("dbNewBookKoreanText");
    if (krInput) {
      krInput.value = `아기 고래 포포가 은은하게 빛나는 파도 #${randomId} 위로 높이 점프해요.\n다정한 돌고래 한 마리가 맑고 투명한 바닷물을 지나 비밀의 산호 섬을 탐험해요!`;
    }
  });

  document.getElementById("btnRunDbAnalyze").addEventListener("click", async () => {
    const rawText = document.getElementById("dbTestTextInput").value.trim();
    const krInput = document.getElementById("dbNewBookKoreanText");
    const korean_text = krInput ? krInput.value.trim() : "";
    const levelSel = document.getElementById("dbNewBookLevel");
    const level = levelSel ? levelSel.value : "Level 3";
    const resBox = document.getElementById("dbAnalyzeResultBox");
    if (!rawText) return;

    let r = null;
    try {
      const res = await fetch("/api/books/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: rawText, level, korean_text })
      });
      if (res.ok) {
        const data = await res.json();
        r = data.result;
        state.auditLogs = data.auditLogs || state.auditLogs;
      }
    } catch (_) {}

    if (!r) {
      // Local standalone fallback for DB deduplication
      const key = rawText.toLowerCase().replace(/\s+/g, " ");
      const isHit = state.localHashCache.has(key);
      state.localHashCache.add(key);
      r = {
        cache_status: isHit ? "DB_CACHE_HIT" : "CACHE_MISS_LLM_SAVED",
        lookup_count: isHit ? 2 : 1,
        text_hash: btoa(encodeURIComponent(key.slice(0, 18))).slice(0, 16),
        vocab: FALLBACK_BOOKS[0].vocab.slice(0, 5),
        chunks: FALLBACK_BOOKS[0].chunks.slice(0, 4),
        core_expressions: FALLBACK_BOOKS[0].core_expressions.slice(0, 3),
        sentence_translations: [],
        speaking_questions: []
      };
      state.auditLogs.unshift({
        status: r.cache_status,
        text_hash: r.text_hash,
        detail: isHit
          ? "기존 DB에서 즉시 반환 (LLM 호출 생략)"
          : "신규 텍스트 감지 ➔ LLM 단어·청크·핵심표현 추출 후 DB 영구 저장",
        text_preview: rawText.slice(0, 55) + "..."
      });
    }

    renderAuditLogs(state.auditLogs);

    const isHit = r.cache_status === "DB_CACHE_HIT";
    const stList = (r.sentence_translations || []).map((s, i) => `${i + 1}) ${s.kr}`).join(" / ");
    const sqList = (r.speaking_questions || []).map((q, i) => `Q${i + 1}. "${q.target}" (${q.kr})`).join("<br/>");
    resBox.innerHTML = `
      <div style="margin-bottom:10px;">
        <span class="mini-pill ${isHit ? "" : "coral"}" style="font-size:13px;">
          ${isHit ? "⚡ DB_CACHE_HIT (기존 DB 존재 ➔ LLM 호출 생략!)" : "🆕 CACHE_MISS_LLM_SAVED (신규 텍스트 ➔ DB 저장 완료!)"}
        </span>
        <span style="font-size:12.5px;margin-left:8px;">누적 조회수: <strong>${r.lookup_count}회</strong> · Hash: <code>${r.text_hash}</code></span>
      </div>
      <div style="font-size:13px;line-height:1.6;">
        <strong>1) 추출된 단어 (${r.vocab.length}개):</strong> ${r.vocab.map((v) => `${v.word}(${v.meaning_kr})`).join(", ")}<br/>
        <strong>2) 원어민 호흡 청크 (${r.chunks.length}개):</strong> ${r.chunks.map((c) => `[${c.text}: ${c.meaning_kr}]`).join(" ")}<br/>
        <strong>3) 문장별 한국어 해석 (${(r.sentence_translations || []).length}문장):</strong> ${stList || "자동 생성됨"}<br/>
        <strong>4) 생성된 표현 스피킹 질문 (${(r.speaking_questions || []).length}개):</strong><br/>${sqList || "자동 생성됨"}
      </div>
    `;
    playOceanBubbleSound(isHit ? 640 : 820, 0.2);
  });
}

// ============================================================================
// 3-STEP SEQUENTIAL STORYBOOK PLAYER & DEDICATED CURRICULUM SUB-SCREENS
// ============================================================================
const EVERY_WORD_KR_DICT = {
  look: { kr: "보다", phonetic: "/lʊk/", pos: "동사", tip: "at과 함께 쓰여 무언가를 쳐다볼 때 써요!" },
  at: { kr: "~을 향해", phonetic: "/æt/", pos: "전치사", tip: "look at은 '~을 봐!'라는 짝꿍 표현이에요." },
  the: { kr: "그 (특정한 것)", phonetic: "/ðə/", pos: "관사", tip: "우리가 함께 보고 있는 바로 그것을 가리켜요." },
  starfish: { kr: "불가사리", phonetic: "/ˈstɑːr.fɪʃ/", pos: "명사", tip: "별(star) 모양을 닮은 귀여운 바다 친구!" },
  shining: { kr: "반짝이는", phonetic: "/ˈʃaɪ.nɪŋ/", pos: "형용사", tip: "햇살이나 보석처럼 반짝반짝 빛나는 모습이에요." },
  on: { kr: "~위에", phonetic: "/ɑːn/", pos: "전치사", tip: "바닥이나 표면 위에 닿아 있을 때 써요." },
  sandy: { kr: "모래가 깔린", phonetic: "/ˈsæn.di/", pos: "형용사", tip: "보들보들한 바닷속 모래(sand) 바닥이에요." },
  floor: { kr: "바닥", phonetic: "/flɔːr/", pos: "명사", tip: "바닷속 맨 아래 모래 바닥을 뜻해요." },
  baby: { kr: "아기", phonetic: "/ˈbeɪ.bi/", pos: "명사", tip: "귀여운 아기 고래 포포!" },
  whale: { kr: "고래", phonetic: "/weɪl/", pos: "명사", tip: "푸슈~ 물을 뿜는 커다란 바다 친구 고래예요." },
  popo: { kr: "포포 (아기고래 이름)", phonetic: "/ˈpoʊ.poʊ/", pos: "이름", tip: "우리와 함께 바다를 탐험하는 아기 고래 친구!" },
  swims: { kr: "헤엄치다", phonetic: "/swɪmz/", pos: "동사", tip: "지느러미를 흔들며 물속을 신나게 헤엄쳐요." },
  across: { kr: "~을 가로질러", phonetic: "/əˈkrɔːs/", pos: "전치사", tip: "이쪽에서 저쪽까지 쭉 건너가는 모습이에요." },
  coral: { kr: "산호", phonetic: "/ˈkɔːr.əl/", pos: "명사", tip: "알록달록 바닷속 꽃밭 같은 산호예요." },
  reef: { kr: "암초 (산호초)", phonetic: "/riːf/", pos: "명사", tip: "coral reef는 물고기들이 사는 산호초 마을이에요!" },
  a: { kr: "하나의", phonetic: "/ə/", pos: "관사", tip: "셀 수 있는 친구 하나를 말할 때 앞에 붙여요." },
  gentle: { kr: "다정한, 온순한", phonetic: "/ˈdʒen.təl/", pos: "형용사", tip: "마음씨가 따뜻하고 부드러운 모습이에요." },
  sea: { kr: "바다", phonetic: "/siː/", pos: "명사", tip: "푸르고 넓은 바다!" },
  turtle: { kr: "거북이", phonetic: "/ˈtɜːr.təl/", pos: "명사", tip: "sea turtle은 바닷속을 유영하는 바다거북이에요." },
  glides: { kr: "미끄러지듯 나아가다", phonetic: "/ɡlaɪdz/", pos: "동사", tip: "물결을 타고 스르륵 부드럽게 헤엄쳐요." },
  through: { kr: "~사이를 통과해", phonetic: "/θruː/", pos: "전치사", tip: "맑은 바닷물 속을 뚫고 지나가는 모습이에요." },
  clear: { kr: "맑고 투명한", phonetic: "/klɪr/", pos: "형용사", tip: "속이 환히 들여다보일 만큼 깨끗한 물!" },
  water: { kr: "물, 바닷물", phonetic: "/ˈwɔː.tər/", pos: "명사", tip: "시원하고 맑은 바닷물이에요." },
  together: { kr: "함께, 다 같이", phonetic: "/təˈɡeð.ər/", pos: "부사", tip: "혼자가 아니라 친구들과 손잡고 다 함께!" },
  they: { kr: "그들은 (포포와 거북이)", phonetic: "/ðeɪ/", pos: "대명사", tip: "아기 고래 포포와 바다거북을 가리켜요." },
  find: { kr: "발견하다, 찾다", phonetic: "/faɪnd/", pos: "동사", tip: "숨겨져 있던 보물을 짜잔! 하고 찾아내다." },
  golden: { kr: "황금빛의", phonetic: "/ˈɡoʊl.dən/", pos: "형용사", tip: "금(gold)처럼 번쩍번쩍 빛나는 노란빛!" },
  treasure: { kr: "보물", phonetic: "/ˈtreʒ.ər/", pos: "명사", tip: "바닷속에 숨겨진 반짝이는 보물이에요." },
  chest: { kr: "상자", phonetic: "/tʃest/", pos: "명사", tip: "treasure chest는 보물이 가득 든 보물상자!" },
  under: { kr: "~아래에", phonetic: "/ˈʌn.dər/", pos: "전치사", tip: "under the sea는 '바닷속 깊은 곳에'라는 뜻이에요!" },
  secret: { kr: "비밀의", phonetic: "/ˈsiː.krət/", pos: "형용사", tip: "아무도 모르는 신비로운 비밀!" },
  island: { kr: "섬", phonetic: "/ˈaɪ.lənd/", pos: "명사", tip: "바다 한가운데 떠 있는 섬이에요 (s는 소리가 안 나요!)." },
  is: { kr: "~이다", phonetic: "/ɪz/", pos: "동사", tip: "주어의 상태나 모습을 설명해 주는 be동사예요." },
  protected: { kr: "보호받는", phonetic: "/prəˈtek.tɪd/", pos: "분사", tip: "안전하게 지켜지고 보호받는 상태예요." },
  by: { kr: "~에 의해서", phonetic: "/baɪ/", pos: "전치사", tip: "누가 지켜주는지 알려줄 때 써요." },
  warm: { kr: "따뜻한", phonetic: "/wɔːrm/", pos: "형용사", tip: "포근하고 따뜻한 기분!" },
  ocean: { kr: "대양, 큰 바다", phonetic: "/ˈoʊ.ʃən/", pos: "명사", tip: "끝없이 펼쳐진 넓고 깊은 바다예요." },
  current: { kr: "해류, 물결", phonetic: "/ˈkɜːr.ənt/", pos: "명사", tip: "바닷속에 흐르는 따뜻한 물길이에요." },
  explores: { kr: "탐험하다", phonetic: "/ɪkˈsplɔːrz/", pos: "동사", tip: "새로운 곳을 호기심 가득 찾아다니며 모험해요!" },
  glowing: { kr: "은은히 빛나는", phonetic: "/ˈɡloʊ.ɪŋ/", pos: "형용사", tip: "어두운 곳에서도 반딧불처럼 빛을 내는 모습!" },
  cave: { kr: "동굴", phonetic: "/keɪv/", pos: "명사", tip: "바닷속 바위 사이에 있는 신비한 동굴!" },
  where: { kr: "어디에 (~하는 곳)", phonetic: "/wer/", pos: "관계부사", tip: "앞에 나온 장소를 자세히 설명해 주는 말이에요." },
  ancient: { kr: "고대의, 아주 오래된", phonetic: "/ˈeɪn.ʃənt/", pos: "형용사", tip: "아주아주 옛날부터 전해 내려온 신비로운 것!" },
  pearls: { kr: "진주들", phonetic: "/pɜːrlz/", pos: "명사", tip: "조개 속에서 자라난 동그랗고 빛나는 보석!" },
  are: { kr: "~이다 (복수)", phonetic: "/ɑːr/", pos: "동사", tip: "여러 개(pearls)와 짝꿍이 되는 be동사예요." },
  hidden: { kr: "숨겨진", phonetic: "/ˈhɪd.ən/", pos: "분사", tip: "아무도 못 찾게 꼭꼭 숨겨져 있는 상태예요." },
  can: { kr: "~할 수 있니?", phonetic: "/kæn/", pos: "조동사", tip: "할 수 있는지 물어볼 때 문장 맨 앞에 써요." },
  you: { kr: "너는", phonetic: "/juː/", pos: "대명사", tip: "책을 읽고 있는 멋진 탐험 대원 바로 너!" },
  remember: { kr: "기억하다", phonetic: "/rɪˈmem.bər/", pos: "동사", tip: "머릿속에 떠올려 기억해 내는 거예요." },
  how: { kr: "어떻게", phonetic: "/haʊ/", pos: "의문사", tip: "어떤 방법으로 그렇게 되는지 궁금할 때 써요." },
  kept: { kr: "유지되는", phonetic: "/kept/", pos: "분사", tip: "계속 그 상태로 지켜지고 유지된다는 뜻이에요." },
  clean: { kr: "깨끗한", phonetic: "/kliːn/", pos: "형용사", tip: "더러운 것 없이 맑고 깨끗한 상태!" },
  blows: { kr: "불다, 뿜어내다", phonetic: "/bloʊz/", pos: "동사", tip: "후~ 하고 바람이나 물방울을 불어내요." },
  big: { kr: "커다란", phonetic: "/bɪɡ/", pos: "형용사", tip: "아주 크고 큼직한 모양!" },
  bubble: { kr: "물방울", phonetic: "/ˈbʌb.əl/", pos: "명사", tip: "동글동글 퐁퐁 떠오르는 물방울이에요." },
  in: { kr: "~안에", phonetic: "/ɪn/", pos: "전치사", tip: "바닷속 안에 있을 때 써요." },
  blue: { kr: "파란, 푸른", phonetic: "/bluː/", pos: "형용사", tip: "맑은 하늘과 바다처럼 새파란 색!" },
  jump: { kr: "점프하다, 뛰어오르다", phonetic: "/dʒʌmp/", pos: "동사", tip: "폴짝! 하늘 높이 뛰어오르는 동작이에요." },
  high: { kr: "높이", phonetic: "/haɪ/", pos: "부사", tip: "구름까지 닿을 만큼 저 높이!" },
  over: { kr: "~위로 넘어", phonetic: "/ˈoʊ.vər/", pos: "전치사", tip: "파도 위를 폴짝 뛰어넘어가는 모습이에요." },
  soft: { kr: "부드러운", phonetic: "/sɔːft/", pos: "형용사", tip: "솜사탕처럼 말랑하고 부드러운 느낌!" },
  waves: { kr: "파도들", phonetic: "/weɪvz/", pos: "명사", tip: "출렁출렁 밀려오는 바다 물결이에요." },
  with: { kr: "~와 함께", phonetic: "/wɪð/", pos: "전치사", tip: "단짝 친구와 같이 행동할 때 써요." },
  dolphin: { kr: "돌고래", phonetic: "/ˈdɑːl.fɪn/", pos: "명사", tip: "포포의 단짝 친구인 영리한 돌고래!" },
  red: { kr: "빨간", phonetic: "/red/", pos: "형용사", tip: "사과처럼 새빨간 색!" },
  crab: { kr: "꽃게", phonetic: "/kræb/", pos: "명사", tip: "집게발을 흔들며 옆으로 걷는 바닷가 친구!" },
  dancing: { kr: "춤추고 있는", phonetic: "/ˈdæn.sɪŋ/", pos: "분사", tip: "신나게 리듬에 맞춰 춤을 추는 모습!" },
  beach: { kr: "해변, 바닷가", phonetic: "/biːtʃ/", pos: "명사", tip: "모래사장이 펼쳐진 따뜻한 바닷가예요." }
};

const SENTENCE_KR_MAP = {
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

const BOOK_SPEAKING_QUESTIONS = {
  bada_level2_ocean_friends: [
    {
      en: "What is shining on the sandy floor? Tell Popo in English!",
      kr: "모래 바닥 위에서 반짝이는 바다 친구는 누구였나요? 포포에게 영어로 말해줄래? (힌트: Look at the starfish!)",
      target: "Look at the starfish!"
    },
    {
      en: "Where does baby whale Popo swim across?",
      kr: "아기 고래 포포는 어디를 가로질러 헤엄쳤나요? (힌트: Popo swims across the coral reef!)",
      target: "Popo swims across the coral reef!"
    },
    {
      en: "What do Popo and the sea turtle find under the sea?",
      kr: "포포와 바다거북이 바닷속에서 무엇을 발견했나요? (힌트: A golden treasure chest!)",
      target: "They find a golden treasure chest!"
    }
  ],
  bada_level6_deep_currents: [
    {
      en: "How is the secret island protected?",
      kr: "비밀의 섬은 무엇에 의해 보호받고 있나요? (힌트: It is protected by a warm ocean current!)",
      target: "It is protected by a warm ocean current!"
    },
    {
      en: "Where are the ancient pearls hidden?",
      kr: "고대 진주들은 어디에 숨겨져 있나요? (힌트: In the glowing cave!)",
      target: "They are hidden in the glowing cave!"
    }
  ],
  bada_pre_bubble_song: [
    {
      en: "What does Popo blow in the blue sea?",
      kr: "포포가 푸른 바다에서 무엇을 불었나요? (힌트: A big water bubble!)",
      target: "Popo blows a big water bubble!"
    },
    {
      en: "Who is dancing on the warm sandy beach?",
      kr: "따뜻한 모래 해변에서 누가 춤추고 있나요? (힌트: Look at the red crab!)",
      target: "Look at the red crab!"
    }
  ]
};

state.learnStepPage = 1;
state.storySentenceIdx = 0;
state.storyWordIdx = 0;
state.storyChunkIdx = 0;
state.storyCompletedSentences = new Set();
state.showSentenceKrHint = true;
state.learnVocabIdx = 0;
state.isLearnFcFlipped = false;
state.isG12FcFlipped = false;
state.speakingQuestionIdx = 0;
state.showSpeakingSubtitle = true;
state.phonicsSpotIdx = 0;
state.phonicsPoppedSet = new Set();
state.ccQuizIdx = 0;
state.ccQuizScore = 0;

function lookupWordMeaning(rawToken, book) {
  const clean = (rawToken || "").replace(/[^a-zA-Z]/g, "").toLowerCase();
  if (!clean) return { word: rawToken, kr: "단어", phonetic: "", pos: "", tip: "" };

  const bookVocab = (book && book.vocab) || [];
  const fromBook = bookVocab.find(
    (v) =>
      (v.word && v.word.toLowerCase() === clean) ||
      (v.surface && v.surface.replace(/[^a-zA-Z]/g, "").toLowerCase() === clean)
  );
  if (fromBook) {
    return {
      word: fromBook.surface || fromBook.word,
      kr: fromBook.meaning_kr,
      phonetic: fromBook.phonetic || `/${clean}/`,
      pos: fromBook.pos || "핵심 단어",
      tip: fromBook.popo_tip || "원서 핵심 단어예요!",
      isCore: !["단어", "기본어", "관사", "전치사", "접속사"].includes(fromBook.pos)
    };
  }

  const fromDict = EVERY_WORD_KR_DICT[clean];
  if (fromDict) {
    return {
      word: clean,
      kr: fromDict.kr,
      phonetic: fromDict.phonetic,
      pos: fromDict.pos,
      tip: fromDict.tip,
      isCore: false
    };
  }

  // Stemming fallback in frontend dictionary too
  const stemCandidates = [];
  if (clean.endsWith("ing") && clean.length > 5) {
    stemCandidates.push(clean.slice(0, -3), clean.slice(0, -3) + "e");
  }
  if (clean.endsWith("ed") && clean.length > 4) {
    stemCandidates.push(clean.slice(0, -2), clean.slice(0, -2) + "e");
  }
  if (clean.endsWith("s") && clean.length > 2) {
    stemCandidates.push(clean.slice(0, -1), clean.slice(0, -2));
  }
  for (const root of stemCandidates) {
    const bv = bookVocab.find((v) => v.word && v.word.toLowerCase() === root);
    if (bv) {
      return {
        word: clean,
        kr: bv.meaning_kr,
        phonetic: `/${clean}/`,
        pos: bv.pos || "단어",
        tip: bv.popo_tip || "원서에서 배운 단어예요!",
        isCore: false
      };
    }
    if (EVERY_WORD_KR_DICT[root]) {
      const fd = EVERY_WORD_KR_DICT[root];
      return {
        word: clean,
        kr: fd.kr,
        phonetic: `/${clean}/`,
        pos: fd.pos,
        tip: fd.tip,
        isCore: false
      };
    }
  }

  return {
    word: clean,
    kr: `${clean} (원서 어휘)`,
    phonetic: `/${clean}/`,
    pos: "단어",
    tip: "클릭하면 원어민 발음을 들려줘요!",
    isCore: false
  };
}

function getSentenceKoreanMeaning(book, sentence, sIdx = -1) {
  const cleanSent = String(sentence || "").trim();
  const norm = (str) => String(str || "").trim().toLowerCase().replace(/\s+/g, " ");

  if (book && Array.isArray(book.sentence_translations) && book.sentence_translations.length) {
    const matched = book.sentence_translations.find((st) => norm(st.en) === norm(cleanSent));
    if (matched && matched.kr) return matched.kr;
    if (sIdx >= 0 && book.sentence_translations[sIdx] && book.sentence_translations[sIdx].kr) {
      return book.sentence_translations[sIdx].kr;
    }
  }

  if (SENTENCE_KR_MAP[cleanSent]) {
    return SENTENCE_KR_MAP[cleanSent];
  }

  // Fallback: assemble from matching chunks in book.chunks
  const chunksInBook = (book && book.chunks) || [];
  const matchedChunkKrs = chunksInBook
    .filter((c) => c.text && norm(cleanSent).includes(norm(c.text)))
    .map((c) => c.meaning_kr)
    .filter(Boolean);
  if (matchedChunkKrs.length > 0) {
    return matchedChunkKrs.join(" ");
  }

  return (book && book.subtitle_kr) || "원서 문장을 소리 내어 읽으며 뜻을 익혀 보세요!";
}

function getBookSentences(book) {
  if (!book || !book.full_text) return [];
  return book.full_text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function switchLearnStepPage(stepNum) {
  state.learnStepPage = stepNum;
  [1, 2, 3].forEach((n) => {
    const btn = document.getElementById(`learnStepBtn${n}`);
    if (btn) {
      btn.classList.toggle("active", n === stepNum);
      btn.classList.toggle("completed", n < stepNum);
    }
  });
  const p1 = document.getElementById("learn-page-1-book");
  const p2 = document.getElementById("learn-page-2-vocab");
  const p3 = document.getElementById("learn-page-3-speaking");
  if (p1) p1.classList.toggle("active", stepNum === 1);
  if (p2) p2.classList.toggle("active", stepNum === 2);
  if (p3) p3.classList.toggle("active", stepNum === 3);
  playOceanBubbleSound(520 + stepNum * 70, 0.15);
}

function getSentenceChunksForWeek2(sent, book) {
  const words = (sent || "").split(/\s+/).filter(Boolean);
  if (!words.length) return [{ text: "", meaning_kr: "", startWordIdx: 0, endWordIdx: 0 }];

  const cleanStr = (s) => (s || "").toLowerCase().replace(/[^a-z0-9\s]/g, "").replace(/\s+/g, " ").trim();
  const sentClean = cleanStr(sent);
  const bookChunks = (book && book.chunks) || [];

  const matched = [];
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
    // Ensure remaining words (if any) are included in last chunk or appended
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

  // Automatic phrase fallback for newly registered custom books
  const breakPreps = new Set(["on", "in", "across", "through", "under", "with", "by", "where", "how", "over", "at", "for", "to"]);
  let splitIdx = -1;
  for (let i = 2; i < words.length - 1; i++) {
    const wClean = cleanStr(words[i]);
    if (breakPreps.has(wClean)) {
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

const WEEK_CURRICULUM_CONFIG = {
  1: {
    step1Tab: "1교시 · 한 단어씩 읽기",
    step2Tab: "2교시 · 단어 플래시카드",
    step3Tab: "3교시 · 포포와 말하기",
    modeBanner: "1주차 · 한 단어씩 천천히 끊어 듣고 따라 말하기",
    subInstruction:
      "원서 전체를 <strong>한 단어씩 천천히</strong> 듣고 따라 말해 보세요. 음성과 함께 단어 뜻이 표시되며, 단어 위에 마우스를 올려도 뜻을 볼 수 있어요.",
    rightKicker: "전체 원서 이야기 (한 단어씩 따라 말하면 다음 단어로 넘어갑니다)",
    page2Kicker: "1주차 2교시 · 단어장 플래시카드",
    page2Heading: "영어 단어를 먼저 듣고 따라 말한 뒤, 카드를 눌러 뒷면(뜻·예문)을 확인해 봐요.",
    page3Kicker: "1주차 3교시 · 포포와 단어 말하기",
    page3Heading: "포포가 물어보는 핵심 단어를 마이크로 또렷하게 말해 볼까요?",
    finishBtnText: "1주차 학습 완료하기 ➔"
  },
  2: {
    step1Tab: "1교시 · 구(Chunk) 단위 읽기",
    step2Tab: "2교시 · 구(Chunk) 카드",
    step3Tab: "3교시 · 구 리듬 말하기",
    modeBanner: "2주차 · 의미 단위(구)로 천천히 끊어 읽고 따라 말하기",
    subInstruction:
      "원서 전체를 <strong>구(의미 단위)</strong>로 천천히 듣고 따라 말해 보세요. 현재 읽는 문장의 전체 뜻은 아래에 함께 표시됩니다.",
    rightKicker: "전체 원서 이야기 (의미 단위로 나누어 천천히 읽어보세요)",
    page2Kicker: "2주차 2교시 · 의미 단위(구) 플래시카드",
    page2Heading: "영어 구를 먼저 듣고 따라 말한 뒤, 카드를 눌러 뒷면(뜻·예문)을 확인해 봐요.",
    page3Kicker: "2주차 3교시 · 포포와 구 단위 말하기",
    page3Heading: "포포의 안내에 맞춰 의미 단위 구를 자연스럽게 말해 볼까요?",
    finishBtnText: "2주차 학습 완료하기 ➔"
  },
  3: {
    step1Tab: "1교시 · 줄거리 문장 읽기",
    step2Tab: "2교시 · 핵심 표현 카드",
    step3Tab: "3교시 · 포포와 스토리 Q&A",
    modeBanner: "3주차 · 원서 핵심 표현 & 포포와의 스피킹 대화",
    subInstruction:
      "이야기 줄거리를 생각하며 한 문장씩 자연스럽게 읽고, 포포가 던지는 영어 질문에 내 목소리로 대답해 보세요.",
    rightKicker: "전체 원서 이야기 (한 문장씩 차례로 읽어보세요)",
    page2Kicker: "3주차 2교시 · 핵심 표현 플래시카드",
    page2Heading: "원서의 핵심 표현을 먼저 듣고 말한 뒤, 카드를 눌러 뒷면(뜻·예문)을 확인해 봐요.",
    page3Kicker: "3주차 3교시 · 포포와 스피킹 질문",
    page3Heading: "포포의 질문을 듣고 배운 표현으로 영어로 답해 볼까요?",
    finishBtnText: "3주차 학습 완료하기 ➔"
  },
  4: {
    step1Tab: "1교시 · 전체 스토리 완독",
    step2Tab: "2교시 · 어휘·표현 총정리",
    step3Tab: "3교시 · 화상수업 리허설",
    modeBanner: "4주차 · 전체 스토리 유창성 완독 & 화상수업 리허설",
    subInstruction:
      "1~3주차 동안 익힌 실력으로 첫 문장부터 끝까지 자연스럽게 낭독해 보세요.",
    rightKicker: "전체 원서 이야기 (자연스러운 호흡으로 끝까지 읽어보세요)",
    page2Kicker: "4주차 2교시 · 핵심 표현 & 어휘 총정리 카드",
    page2Heading: "이번 달 원서의 핵심 표현과 단어를 카드를 뒤집어 최종 확인해 봐요.",
    page3Kicker: "4주차 3교시 · 화상수업 스피킹 리허설",
    page3Heading: "원어민 선생님과의 화상수업 질문을 미리 영어로 연습해 봐요.",
    finishBtnText: "4주차 원서 완주 완료하기 ➔"
  }
};

function findExampleForToken(book, tokenText) {
  const sentences = getBookSentences(book);
  const cleanTok = (tokenText || "").toLowerCase().replace(/[^a-z\s]/g, "").trim();
  const matchedIdx = sentences.findIndex((s) => s.toLowerCase().replace(/[^a-z\s]/g, "").includes(cleanTok));
  const useIdx = matchedIdx >= 0 ? matchedIdx : 0;
  const matchedSent =
    sentences[useIdx] ||
    (book && book.full_text) ||
    "Look at the starfish shining on the sandy floor.";
  return {
    example_en: matchedSent,
    example_kr: getSentenceKoreanMeaning(book, matchedSent, useIdx)
  };
}

function getWeekDeckForBook(book, weekNum) {
  const vocab = (book && book.vocab && book.vocab.length) ? book.vocab : FALLBACK_BOOKS[0].vocab;
  const chunks = (book && book.chunks && book.chunks.length) ? book.chunks : FALLBACK_BOOKS[0].chunks;
  const exprs = (book && book.core_expressions && book.core_expressions.length)
    ? book.core_expressions
    : FALLBACK_BOOKS[0].core_expressions;

  if (weekNum === 1) {
    return vocab.map((v) => {
      const ex = findExampleForToken(book, v.word);
      return {
        word: v.word,
        phonetic: v.phonetic || `/${v.word}/`,
        pos: v.pos || "1주차 핵심 단어",
        meaning_kr: v.meaning_kr,
        popo_tip: v.popo_tip || "단어 소리를 듣고 큰 소리로 따라 말해 보세요!",
        ...ex
      };
    });
  }
  if (weekNum === 2) {
    return chunks.map((c, idx) => {
      const ex = findExampleForToken(book, c.text);
      return {
        word: c.text,
        phonetic: `호흡 청크 #${idx + 1}`,
        pos: "2주차 의미 단위 구",
        meaning_kr: c.meaning_kr,
        popo_tip: "단어를 끊지 말고 파도처럼 한 호흡에 부드럽게 이어 읽어보세요!",
        ...ex
      };
    });
  }
  if (weekNum === 3) {
    return exprs.map((e) => {
      const ex = findExampleForToken(book, e.expression);
      return {
        word: e.expression,
        phonetic: `핵심 패턴 #${e.rank || 1}`,
        pos: "3주차 스피킹 핵심 표현",
        meaning_kr: e.meaning_kr,
        popo_tip: e.pattern_note || "포포의 질문에 대답할 때 이 표현을 그대로 활용해 보세요!",
        ...ex
      };
    });
  }
  // Week 4: Master review combining core expressions + key vocab
  return [
    ...exprs.map((e) => {
      const ex = findExampleForToken(book, e.expression);
      return {
        word: e.expression,
        phonetic: "4주차 마스터 문장",
        pos: "핵심 표현 완주",
        meaning_kr: e.meaning_kr,
        popo_tip: `화상수업 필수 표현 (${e.pattern_note || "원어민 호흡"})`,
        ...ex
      };
    }),
    ...vocab.slice(0, 4).map((v) => {
      const ex = findExampleForToken(book, v.word);
      return {
        word: v.word,
        phonetic: v.phonetic || `/${v.word}/`,
        pos: "필수 어휘 마스터",
        meaning_kr: v.meaning_kr,
        popo_tip: v.popo_tip || "원서 완주 필수 단어!",
        ...ex
      };
    })
  ];
}

function getWeekSpeakingQuestions(book, weekNum) {
  const safeBook = book || FALLBACK_BOOKS[0];
  const vocab = (safeBook.vocab && safeBook.vocab.length) ? safeBook.vocab : FALLBACK_BOOKS[0].vocab;
  const chunks = (safeBook.chunks && safeBook.chunks.length) ? safeBook.chunks : FALLBACK_BOOKS[0].chunks;
  const exprs = (safeBook.core_expressions && safeBook.core_expressions.length) ? safeBook.core_expressions : [];
  const sentences = getBookSentences(safeBook);

  let baseStoryQs = [];
  if (Array.isArray(safeBook.speaking_questions) && safeBook.speaking_questions.length) {
    baseStoryQs = safeBook.speaking_questions;
  } else if (BOOK_SPEAKING_QUESTIONS[safeBook.id]) {
    baseStoryQs = BOOK_SPEAKING_QUESTIONS[safeBook.id];
  } else {
    baseStoryQs = [
      exprs[0]
        ? {
            en: `Can you use today's expression "${exprs[0].expression}" to tell Popo something fun?`,
            kr: `[핵심 표현 말하기] 오늘 배운 '${exprs[0].expression}'(${exprs[0].meaning_kr})를 사용해서 포포에게 영어로 말해 볼까요?`,
            target: exprs[0].expression
          }
        : {
            en: `Let's practice our favorite sentence from "${safeBook.title}": "${sentences[0] || "Hello ocean!"}"`,
            kr: `[원서 문장 말하기] 오늘 배운 문장을 큰 소리로 말해 볼까요?`,
            target: sentences[0] || "Hello ocean!"
          },
      chunks[0]
        ? {
            en: `How can you say "${chunks[0].meaning_kr}" in English?`,
            kr: `[표현 응용 퀴즈] '${chunks[0].meaning_kr}'라는 뜻을 영어로 말해 볼래요? (힌트: ${chunks[0].text})`,
            target: chunks[0].text
          }
        : null,
      vocab[0]
        ? {
            en: `Using the word "${vocab[0].word}", can you make a happy sentence with Popo?`,
            kr: `[내 이야기로 확장] 원서 밖 내 이야기에서도 단어 '${vocab[0].word}(${vocab[0].meaning_kr})'를 써서 말해 볼까요?`,
            target: sentences[0] || vocab[0].word
          }
        : null
    ].filter(Boolean);
  }

  if (weekNum === 1) {
    return vocab.slice(0, 3).map((v, idx) => ({
      en: `Week 1 Word Quiz #${idx + 1}: How do you say "${v.meaning_kr}" in English?`,
      kr: `[1주차 단어 말하기] 포포에게 '${v.meaning_kr}'를 영어로 크게 말해줄래? (정답 힌트: ${v.word}!)`,
      target: v.word
    }));
  }
  if (weekNum === 2) {
    return chunks.slice(0, 3).map((c, idx) => ({
      en: `Week 2 Wave Chunk #${idx + 1}: Let's say "${c.text}" in one smooth breath!`,
      kr: `[2주차 청크 파도 타기] '${c.meaning_kr}'라는 뜻의 구를 끊지 말고 한 호흡으로 말해볼까? (${c.text})`,
      target: c.text
    }));
  }
  if (weekNum === 3) {
    return baseStoryQs;
  }
  // Week 4: Full sentence fluency & live coaching rehearsal
  const favSent = sentences[0] || "Look at the starfish shining on the sandy floor.";
  return [
    ...baseStoryQs.slice(0, 2),
    {
      en: `Week 4 Final Master Challenge: Can you say "${favSent}" with native fluency?`,
      kr: `[4주차 황금 보물상자 마지막 관문] 원어민 선생님 앞에서 말하듯 "${favSent}"를 멋지게 말해 볼까요?`,
      target: favSent
    }
  ];
}

function renderSequentialLearnPlayer(book, user) {
  if (!book) return;
  const activeUser = user || getCurrentUser();
  const wk = state.currentWeek || getStudentCurrentWeek(activeUser);
  const cfg = WEEK_CURRICULUM_CONFIG[wk] || WEEK_CURRICULUM_CONFIG[1];

  const l1 = document.getElementById("learnStepLabel1");
  const l2 = document.getElementById("learnStepLabel2");
  const l3 = document.getElementById("learnStepLabel3");
  const modeBanner = document.getElementById("learnWeekModeBanner");
  const subInst = document.getElementById("storybookSubInstruction");
  const rightKick = document.getElementById("bookRightPageKicker");
  const p2Kick = document.getElementById("learnPage2Kicker");
  const p2Head = document.getElementById("learnPage2Heading");
  const p3Kick = document.getElementById("learnPage3Kicker");
  const p3Head = document.getElementById("learnPage3Heading");
  const finishBtn = document.getElementById("btnFinishTodayStoryLearn");

  if (l1) l1.textContent = cfg.step1Tab;
  if (l2) l2.textContent = cfg.step2Tab;
  if (l3) l3.textContent = cfg.step3Tab;
  if (modeBanner) modeBanner.textContent = cfg.modeBanner;
  if (subInst) subInst.innerHTML = cfg.subInstruction;
  if (rightKick) rightKick.textContent = cfg.rightKicker;
  if (p2Kick) p2Kick.textContent = cfg.page2Kicker;
  if (p2Head) p2Head.textContent = cfg.page2Heading;
  if (p3Kick) p3Kick.textContent = cfg.page3Kicker;
  if (p3Head) p3Head.textContent = cfg.page3Heading;
  if (finishBtn) finishBtn.textContent = cfg.finishBtnText;

  const sentences = getBookSentences(book);
  if (state.storySentenceIdx >= sentences.length) {
    state.storySentenceIdx = 0;
    state.storyWordIdx = 0;
    state.storyChunkIdx = 0;
  }

  const titleHeading = document.getElementById("storybookTitleHeading");
  const levelTag = document.getElementById("storybookLevelTag");
  if (titleHeading) titleHeading.textContent = `📖 ${book.title}`;
  if (levelTag) levelTag.textContent = `${book.level} · ${wk}주차 진행 중`;

  renderStorybookSpread(book, sentences);
  renderLearnStep2Vocab(book);
  renderLearnStep3Speaking(book);
}

function renderStorybookSpread(book, sentences, options = {}) {
  const container = document.getElementById("fullStorybookTextContainer");
  if (!container) return;
  container.innerHTML = "";

  const wk = state.currentWeek || 1;
  const total = sentences.length || 1;
  const activeIdx = Math.min(state.storySentenceIdx, total - 1);
  const activeSent = sentences[activeIdx] || "";
  const activeWords = activeSent.split(/\s+/).filter(Boolean);
  const sentChunks = getSentenceChunksForWeek2(activeSent, book);

  if (state.storyWordIdx >= activeWords.length) state.storyWordIdx = Math.max(0, activeWords.length - 1);
  if (state.storyWordIdx < 0) state.storyWordIdx = 0;
  if (state.storyChunkIdx >= sentChunks.length) state.storyChunkIdx = Math.max(0, sentChunks.length - 1);
  if (state.storyChunkIdx < 0) state.storyChunkIdx = 0;

  const activeWordRaw = activeWords[state.storyWordIdx] || "";
  const cleanActiveWord = activeWordRaw.replace(/[^a-zA-Z0-9'-]/g, "") || activeWordRaw;
  const activeWordInfo = lookupWordMeaning(activeWordRaw, book);
  const activeChunk = sentChunks[state.storyChunkIdx] || sentChunks[0] || { text: activeSent, meaning_kr: "", startWordIdx: 0, endWordIdx: Math.max(0, activeWords.length - 1) };

  const counterBadge = document.getElementById("storySentenceCounterBadge");
  if (counterBadge) {
    if (wk === 1) {
      counterBadge.innerHTML = `1주차 단어 따라 읽기: <strong>${state.storyWordIdx + 1}/${activeWords.length} 단어</strong> · 문장 <strong>${state.storyCompletedSentences.size}/${total}</strong>`;
    } else if (wk === 2) {
      counterBadge.innerHTML = `2주차 구 따라 읽기: <strong>${state.storyChunkIdx + 1}/${sentChunks.length} 구</strong> · 문장 <strong>${state.storyCompletedSentences.size}/${total}</strong>`;
    } else {
      counterBadge.innerHTML = `${wk}주차 읽은 문장: <strong>${state.storyCompletedSentences.size} / ${total} 완료</strong>`;
    }
  }

  const orderBadge = document.getElementById("activeSentenceOrderBadge");
  const enLarge = document.getElementById("activeSentenceEnLarge");
  const krHint = document.getElementById("activeSentenceKrHint");
  const rightKrBadge = document.getElementById("rightPageKrBarBadge");
  const rightKrText = document.getElementById("rightPageCurrentSentenceKrText");
  const fullSentKr = getSentenceKoreanMeaning(book, activeSent, activeIdx);

  if (orderBadge) {
    if (wk === 1) {
      orderBadge.textContent = `💧 1주차 · ${activeIdx + 1}번째 문장의 ${state.storyWordIdx + 1}번째 단어 (${state.storyWordIdx + 1}/${activeWords.length})`;
    } else if (wk === 2) {
      orderBadge.textContent = `🌊 2주차 · ${activeIdx + 1}번째 문장의 ${state.storyChunkIdx + 1}번째 구 (${state.storyChunkIdx + 1}/${sentChunks.length})`;
    } else {
      orderBadge.textContent = `🌟 ${wk}주차 · 지금 읽을 ${activeIdx + 1}번째 문장 (${activeIdx + 1}/${total})`;
    }
  }

  if (enLarge) {
    if (wk === 1) {
      enLarge.innerHTML = "";
      const highlightEl = document.createElement("span");
      highlightEl.style.cssText = "background:#fef08a;padding:2px 10px;border-radius:10px;border:2px solid #f59e0b;margin-right:8px;display:inline-block;";
      highlightEl.textContent = cleanActiveWord;
      const krTag = document.createElement("span");
      krTag.style.cssText = "font-size:16px;color:#be123c;font-weight:800;";
      krTag.textContent = `(${activeWordInfo.kr})`;
      enLarge.appendChild(highlightEl);
      enLarge.appendChild(krTag);
    } else if (wk === 2) {
      enLarge.innerHTML = "";
      const chunkEl = document.createElement("span");
      chunkEl.style.cssText = "background:#cffafe;padding:3px 12px;border-radius:10px;border:2px solid #0284c7;margin-right:8px;display:inline-block;";
      chunkEl.textContent = activeChunk.text;
      const chunkKr = document.createElement("span");
      chunkKr.style.cssText = "font-size:15.5px;color:#0369a1;font-weight:800;";
      chunkKr.textContent = `(${activeChunk.meaning_kr})`;
      enLarge.appendChild(chunkEl);
      enLarge.appendChild(chunkKr);
    } else {
      enLarge.textContent = activeSent;
    }
  }

  if (krHint) {
    krHint.textContent = `💡 현재 문장 뜻: "${fullSentKr}"`;
    krHint.classList.toggle("hidden", !state.showSentenceKrHint);
  }
  if (rightKrBadge) {
    rightKrBadge.textContent =
      wk === 2
        ? `🌊 현재 구 뜻: "${activeChunk.meaning_kr}" · 전체 문장 뜻`
        : "📖 현재 읽고 있는 문장 뜻";
  }
  if (rightKrText) {
    rightKrText.textContent = `"${fullSentKr}"`;
  }

  const listenBtn = document.getElementById("btnListenCurrentSentence");
  const speakBtn = document.getElementById("btnSpeakCurrentSentence");
  const nextStepBtn = document.getElementById("btnGoToLearnPage2");
  const allDone = state.storyCompletedSentences.size >= total;

  if (listenBtn) {
    if (wk === 1) {
      listenBtn.textContent = `🔊 지금 단어 ("${cleanActiveWord}") 천천히 듣기`;
    } else if (wk === 2) {
      listenBtn.textContent = `🔊 지금 구 ("${activeChunk.text}") 천천히 듣기`;
    } else {
      listenBtn.textContent = `🔊 이 문장 먼저 들어보기`;
    }
  }

  if (speakBtn) {
    const actionLabelByWeek = {
      1: `🎙️ [1주차] "${cleanActiveWord}" 따라 말하고 다음 단어로! (${state.storyWordIdx + 1}/${activeWords.length} · ${activeIdx + 1}문장)`,
      2: `🌊 [2주차] "${activeChunk.text}" 따라 말하고 다음 구로! (${state.storyChunkIdx + 1}/${sentChunks.length} · ${activeIdx + 1}문장)`,
      3: `🐚 [3주차] ${activeIdx + 1}번째 문장 줄거리 살려 말하기 (${activeIdx + 1}/${total})`,
      4: `👑 [4주차] ${activeIdx + 1}번째 문장 원어민 속도로 녹음하기 (${activeIdx + 1}/${total})`
    };
    speakBtn.textContent = allDone
      ? `🎉 전체 원서 완독 완료! (${activeIdx + 1}번째 문장 다시 연습하기)`
      : (actionLabelByWeek[wk] || actionLabelByWeek[1]);
  }
  if (nextStepBtn) {
    nextStepBtn.classList.toggle("hidden", !allDone);
  }

  const updateDockValues = (wEn, wPh, wKr, wTip) => {
    const dEn = document.getElementById("dockWordEn");
    const dPh = document.getElementById("dockWordPhonetic");
    const dKr = document.getElementById("dockWordKr");
    const dTip = document.getElementById("dockWordTip");
    if (dEn) dEn.textContent = wEn;
    if (dPh) dPh.textContent = wPh;
    if (dKr) dKr.textContent = wKr;
    if (dTip) dTip.textContent = wTip;
    currentDropWord = wEn;
  };

  if (wk === 1) {
    updateDockValues(activeWordInfo.word, activeWordInfo.phonetic, activeWordInfo.kr, activeWordInfo.tip);
  } else if (wk === 2) {
    updateDockValues(activeChunk.text, `구 #${state.storyChunkIdx + 1}/${sentChunks.length}`, activeChunk.meaning_kr, "지금 구를 천천히 끊어 읽고 따라 말해보세요!");
  }

  sentences.forEach((sent, sIdx) => {
    const sentSpan = document.createElement("span");
    const isDone = state.storyCompletedSentences.has(sIdx);
    const isAct = sIdx === activeIdx;
    sentSpan.className = `story-sentence-unit ${
      isAct ? "active-sentence" : isDone ? "done-sentence" : "upcoming-sentence"
    }`;

    const statusBadge = document.createElement("span");
    statusBadge.className = "sentence-status-tag";
    statusBadge.textContent = isDone ? `✓ ${sIdx + 1}` : `${sIdx + 1}문장`;
    statusBadge.title = "이 문장 선택하기";
    statusBadge.addEventListener("click", (e) => {
      e.stopPropagation();
      state.storySentenceIdx = sIdx;
      state.storyWordIdx = 0;
      state.storyChunkIdx = 0;
      renderStorybookSpread(book, sentences, { autoSpeak: true });
    });
    sentSpan.appendChild(statusBadge);

    const rowChunks = wk === 2 ? getSentenceChunksForWeek2(sent, book) : [];
    const rowChunkEnds = new Set(rowChunks.slice(0, -1).map((c) => c.endWordIdx));

    const words = sent.split(/\s+/).filter(Boolean);
    words.forEach((tok, wIdx) => {
      const info = lookupWordMeaning(tok, book);
      const wordSpan = document.createElement("span");
      wordSpan.className = `story-word-chip ${info.isCore ? "core-vocab-word" : ""}`;

      // Week 1: automatically highlight & pop up Korean meaning above the current active word!
      if (wk === 1 && isAct) {
        if (wIdx === state.storyWordIdx) {
          wordSpan.classList.add("active-spoken-word", "tooltip-pinned");
        } else if (wIdx < state.storyWordIdx) {
          wordSpan.classList.add("done-spoken-word");
        }
      }

      // Week 2: highlight the entire current phrase/chunk in cyan!
      if (wk === 2 && isAct) {
        if (wIdx >= activeChunk.startWordIdx && wIdx <= activeChunk.endWordIdx) {
          wordSpan.classList.add("active-spoken-chunk");
        }
      }

      wordSpan.tabIndex = 0;
      wordSpan.textContent = tok;

      const tooltip = document.createElement("span");
      tooltip.className = "word-above-tooltip";
      tooltip.innerHTML = `<strong>${info.kr}</strong><span>${info.phonetic}</span>`;
      wordSpan.appendChild(tooltip);

      const updateDock = () => {
        updateDockValues(info.word, info.phonetic, info.kr, info.tip);
      };

      wordSpan.addEventListener("mouseenter", updateDock);
      wordSpan.addEventListener("click", (e) => {
        e.stopPropagation();
        if (wk === 1 && isAct) {
          state.storyWordIdx = wIdx;
          renderStorybookSpread(book, sentences, { autoSpeak: true });
          return;
        }
        document.querySelectorAll(".story-word-chip.tooltip-pinned").forEach((el) => {
          if (el !== wordSpan) el.classList.remove("tooltip-pinned");
        });
        wordSpan.classList.toggle("tooltip-pinned");
        updateDock();
        speakEnglish(info.word, wk === 1 ? 0.72 : 0.86, 1.08, null, words[wIdx + 1] || "");
      });

      sentSpan.appendChild(wordSpan);
      sentSpan.appendChild(document.createTextNode(" "));

      // In Week 2, show a visual wave chunk breathing marker after phrase boundaries
      if (wk === 2 && wIdx < words.length - 1 && rowChunkEnds.has(wIdx)) {
        const slash = document.createElement("span");
        slash.className = "chunk-slash-badge";
        slash.textContent = "🌊 /";
        slash.title = "의미 단위(구) 호흡 쉬어가기";
        sentSpan.appendChild(slash);
        sentSpan.appendChild(document.createTextNode(" "));
      }
    });

    container.appendChild(sentSpan);
  });

  if (options.autoSpeak) {
    if (wk === 1) {
      speakEnglish(cleanActiveWord, 0.72, 1.06, null, activeWords[state.storyWordIdx + 1] || "");
    } else if (wk === 2) {
      speakEnglish(activeChunk.text, 0.76, 1.06);
    } else {
      speakEnglish(activeSent, wk === 4 ? 0.96 : 0.9, 1.06);
    }
  }
}

function renderLearnStep2Vocab(book, options = {}) {
  const wk = state.currentWeek || 1;
  const vocabList = getWeekDeckForBook(book, wk);
  if (state.learnVocabIdx >= vocabList.length) state.learnVocabIdx = 0;
  const item = vocabList[state.learnVocabIdx];

  const cardEl = document.getElementById("learnBigFlashcard");
  const counter = document.getElementById("learnVocabCounterBadge");
  const idxChip = document.getElementById("learnFcIndexChip");
  const sideBadge = document.getElementById("learnFcSideBadge");
  const posChip = document.getElementById("learnFcPosChip");
  const wordEn = document.getElementById("learnFcWordEn");
  const phonetic = document.getElementById("learnFcPhonetic");
  const frontNotice = document.getElementById("learnFcFrontNotice");
  const meaningBox = document.getElementById("learnFcMeaningBox");
  const meaningKr = document.getElementById("learnFcMeaningKr");
  const exampleEn = document.getElementById("learnFcExampleEn");
  const exampleKr = document.getElementById("learnFcExampleKr");
  const tipKr = document.getElementById("learnFcTipKr");
  const tapInst = document.getElementById("learnFcTapInstruction");
  const goP3Btn = document.getElementById("btnGoToLearnPage3");

  const isFlipped = !!state.isLearnFcFlipped;

  if (counter) counter.innerHTML = `${wk}주차 카드: <strong>${state.learnVocabIdx + 1} / ${vocabList.length}</strong>`;
  if (idxChip) idxChip.textContent = `${wk}주차 카드 ${state.learnVocabIdx + 1} / ${vocabList.length}`;
  if (sideBadge) {
    sideBadge.textContent = isFlipped ? "✨ 뒷면 (단어 뜻 & 원서 예문)" : "🃏 앞면 (영어 단어) · 터치하면 뒷면 열기";
  }
  if (posChip) posChip.textContent = item.pos || "핵심 학습";
  if (wordEn) wordEn.textContent = item.word;
  if (phonetic) phonetic.textContent = item.phonetic || "";
  if (meaningKr) meaningKr.textContent = `🌟 ${item.meaning_kr}`;
  if (exampleEn) exampleEn.textContent = `📖 "${item.example_en || ""}"`;
  if (exampleKr) exampleKr.textContent = `💬 "${item.example_kr || ""}"`;
  if (tipKr) tipKr.textContent = item.popo_tip || "소리 내어 따라 읽어보세요!";

  if (cardEl) cardEl.classList.toggle("is-flipped", isFlipped);
  if (frontNotice) frontNotice.classList.toggle("hidden", isFlipped);
  if (meaningBox) meaningBox.classList.toggle("hidden", !isFlipped);
  if (tapInst) {
    tapInst.textContent = isFlipped
      ? "👆 카드를 다시 터치하면 앞면(영어 단어)으로 돌아가요!"
      : "👆 카드를 터치하면 뒷면(단어 뜻·예문)으로 뒤집혀요!";
  }

  if (goP3Btn) {
    goP3Btn.classList.toggle("hidden", state.learnVocabIdx < vocabList.length - 1);
  }

  if (options.speakFront) {
    speakEnglish(item.word, 0.84, 1.08);
  }
}

function renderLearnStep3Speaking(book) {
  const wk = state.currentWeek || 1;
  const qList = getWeekSpeakingQuestions(book, wk);
  if (state.speakingQuestionIdx >= qList.length) state.speakingQuestionIdx = 0;
  const qItem = qList[state.speakingQuestionIdx];

  const counter = document.getElementById("speakingQuestionCounterBadge");
  const enEl = document.getElementById("popoSpokenQuestionEn");
  const krEl = document.getElementById("popoSpokenSubtitleKr");
  const finishBtn = document.getElementById("btnFinishTodayStoryLearn");

  if (counter) counter.innerHTML = `${wk}주차 질문: <strong>${state.speakingQuestionIdx + 1} / ${qList.length}</strong>`;
  if (enEl) enEl.textContent = `"${qItem.en}"`;
  if (krEl) {
    krEl.textContent = `💬 ${qItem.kr}`;
    krEl.classList.toggle("hidden", !state.showSpeakingSubtitle);
  }
  if (finishBtn) {
    finishBtn.classList.toggle("hidden", state.speakingQuestionIdx < qList.length - 1);
  }

  const simPerfect = document.getElementById("btnSimPerfectAnswer");
  if (simPerfect) {
    simPerfect.setAttribute("data-sim-speech", qItem.target);
    simPerfect.textContent = `🗣️ "${qItem.target}" (정답 말하기!)`;
  }
}

function switchCurrSubView(viewName) {
  ["hub", "phonics", "classcard", "upper"].forEach((v) => {
    const el = document.getElementById(`curr-subview-${v}`);
    if (el) el.classList.toggle("active", v === viewName);
  });
  playOceanBubbleSound(600, 0.15);
}

function switchClassCardStage(stageName) {
  const isStudy = stageName === "study";
  const stStudy = document.getElementById("cc-stage-study");
  const stQuiz = document.getElementById("cc-stage-quiz");
  const btnStudy = document.getElementById("ccModeBtnStudy");
  const btnQuiz = document.getElementById("ccModeBtnQuiz");
  if (stStudy) stStudy.classList.toggle("active", isStudy);
  if (stQuiz) stQuiz.classList.toggle("active", !isStudy);
  if (btnStudy) btnStudy.classList.toggle("active", isStudy);
  if (btnQuiz) btnQuiz.classList.toggle("active", !isStudy);

  if (!isStudy) {
    state.ccQuizIdx = 0;
    state.ccQuizScore = 0;
    renderClassCardQuizQuestion();
  }
}

function renderClassCardQuizQuestion() {
  const total = CLASSCARD_DECK.length;
  if (state.ccQuizIdx >= total) state.ccQuizIdx = 0;
  const currentCard = CLASSCARD_DECK[state.ccQuizIdx];

  const chip = document.getElementById("ccQuizProgressChip");
  const wordEl = document.getElementById("ccQuizPromptWord");
  const grid = document.getElementById("ccQuizOptionsGrid");
  const banner = document.getElementById("ccQuizFeedbackBanner");
  const finishBtn = document.getElementById("btnFinishCcQuizToHub");

  if (chip) chip.textContent = `복습 퀴즈 ${state.ccQuizIdx + 1} / ${total}`;
  if (wordEl) wordEl.textContent = currentCard.word;
  if (grid) grid.innerHTML = "";
  if (finishBtn) finishBtn.classList.add("hidden");

  const wrongPool = CLASSCARD_DECK.filter((_, idx) => idx !== state.ccQuizIdx).map((c) => c.meaning);
  const options = [currentCard.meaning, ...wrongPool.slice(0, 3)].sort(() => Math.random() - 0.5);

  options.forEach((optMeaning) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "cc-quiz-option-btn";
    btn.textContent = optMeaning;
    btn.addEventListener("click", () => {
      if (optMeaning === currentCard.meaning) {
        btn.classList.add("correct");
        state.ccQuizScore++;
        playOceanBubbleSound(860, 0.22);
        speakEnglish(currentCard.word, 0.92, 1.12);
        if (banner) {
          banner.textContent = `🎉 딩동댕! '${currentCard.word}'의 뜻은 '${currentCard.meaning}' 맞아요!`;
        }
        setTimeout(() => {
          if (state.ccQuizIdx < total - 1) {
            state.ccQuizIdx++;
            renderClassCardQuizQuestion();
          } else {
            if (banner) {
              banner.textContent = `🏆 우와! 클카 단어 5문제 복습 퀴즈를 모두 완료했어요! 참 잘했어요!`;
            }
            if (finishBtn) finishBtn.classList.remove("hidden");
          }
        }, 900);
      } else {
        btn.classList.add("wrong");
        playOceanBubbleSound(340, 0.18);
        if (banner) {
          banner.textContent = `🫧 아차차! 다시 한번 생각해 볼까요?`;
        }
      }
    });
    if (grid) grid.appendChild(btn);
  });
}

function bindKidFriendlyOverhaulEvents() {
  // Step pills in /student/learn
  document.querySelectorAll("[data-learn-step]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const s = Number(btn.getAttribute("data-learn-step")) || 1;
      if (s === 2) {
        state.isLearnFcFlipped = false;
        renderLearnStep2Vocab(getCurrentBook(), { speakFront: true });
      }
      switchLearnStepPage(s);
    });
  });

  const btnToggleKr = document.getElementById("btnToggleKoreanHint");
  if (btnToggleKr) {
    btnToggleKr.addEventListener("click", () => {
      state.showSentenceKrHint = !state.showSentenceKrHint;
      const hint = document.getElementById("activeSentenceKrHint");
      if (hint) hint.classList.toggle("hidden", !state.showSentenceKrHint);
    });
  }

  const btnDockSpeak = document.getElementById("btnDockSpeakWord");
  if (btnDockSpeak) {
    btnDockSpeak.addEventListener("click", () => {
      const wk = state.currentWeek || 1;
      const book = getCurrentBook();
      const sents = getBookSentences(book);
      const activeWords = (sents[state.storySentenceIdx] || "").split(/\s+/).filter(Boolean);
      const nextWord = activeWords[state.storyWordIdx + 1] || "";
      speakEnglish(currentDropWord || "starfish", wk === 1 ? 0.72 : 0.86, 1.08, null, nextWord);
    });
  }

  const btnListenCurrent = document.getElementById("btnListenCurrentSentence");
  if (btnListenCurrent) {
    btnListenCurrent.addEventListener("click", () => {
      const book = getCurrentBook();
      const sents = getBookSentences(book);
      const sent = sents[state.storySentenceIdx] || sents[0] || "";
      const wk = state.currentWeek || 1;
      if (wk === 1) {
        const words = sent.split(/\s+/).filter(Boolean);
        const w = (words[state.storyWordIdx] || words[0] || "").replace(/[^a-zA-Z0-9'-]/g, "");
        renderStorybookSpread(book, sents, { autoSpeak: true });
        if (!w && sent) speakEnglish(sent, 0.72, 1.06);
      } else if (wk === 2) {
        renderStorybookSpread(book, sents, { autoSpeak: true });
      } else if (sent) {
        speakEnglish(sent, 0.88, 1.08);
      }
    });
  }

  const btnListenWholeBook = document.getElementById("btnListenWholeStoryBook");
  if (btnListenWholeBook) {
    btnListenWholeBook.addEventListener("click", () => {
      const book = getCurrentBook();
      if (book && book.full_text) {
        const wk = state.currentWeek || 1;
        speakEnglish(book.full_text, wk <= 2 ? 0.78 : 0.9, 1.06);
      }
    });
  }

  const btnSpeakCurrent = document.getElementById("btnSpeakCurrentSentence");
  if (btnSpeakCurrent) {
    btnSpeakCurrent.addEventListener("click", () => {
      const book = getCurrentBook();
      const sents = getBookSentences(book);
      const wk = state.currentWeek || 1;
      const curIdx = Math.min(state.storySentenceIdx, Math.max(0, sents.length - 1));
      const sent = sents[curIdx] || "";

      playOceanBubbleSound(780, 0.2);

      if (wk === 1) {
        const words = sent.split(/\s+/).filter(Boolean);
        if (state.storyWordIdx < words.length - 1) {
          state.storyWordIdx++;
          renderStorybookSpread(book, sents, { autoSpeak: true });
        } else {
          state.storyCompletedSentences.add(curIdx);
          if (curIdx < sents.length - 1) {
            state.storySentenceIdx = curIdx + 1;
            state.storyWordIdx = 0;
            renderStorybookSpread(book, sents, { autoSpeak: true });
          } else {
            renderStorybookSpread(book, sents, { autoSpeak: false });
          }
        }
        return;
      }

      if (wk === 2) {
        const chunks = getSentenceChunksForWeek2(sent, book);
        if (state.storyChunkIdx < chunks.length - 1) {
          state.storyChunkIdx++;
          renderStorybookSpread(book, sents, { autoSpeak: true });
        } else {
          state.storyCompletedSentences.add(curIdx);
          if (curIdx < sents.length - 1) {
            state.storySentenceIdx = curIdx + 1;
            state.storyChunkIdx = 0;
            renderStorybookSpread(book, sents, { autoSpeak: true });
          } else {
            renderStorybookSpread(book, sents, { autoSpeak: false });
          }
        }
        return;
      }

      // Week 3 & Week 4: Sentence-by-sentence
      state.storyCompletedSentences.add(curIdx);
      speakEnglish(sent, wk === 4 ? 0.96 : 0.92, 1.1);
      if (curIdx < sents.length - 1) {
        state.storySentenceIdx = curIdx + 1;
      }
      renderStorybookSpread(book, sents, { autoSpeak: false });
    });
  }

  const btnGoP2 = document.getElementById("btnGoToLearnPage2");
  if (btnGoP2) {
    btnGoP2.addEventListener("click", () => {
      state.learnVocabIdx = 0;
      state.isLearnFcFlipped = false;
      renderLearnStep2Vocab(getCurrentBook(), { speakFront: true });
      switchLearnStepPage(2);
    });
  }

  // Page 2 Real Front/Back Flip Flashcards (Week-Aware Deck)
  const bigFc = document.getElementById("learnBigFlashcard");
  if (bigFc) {
    bigFc.addEventListener("click", () => {
      const book = getCurrentBook();
      const deck = getWeekDeckForBook(book, state.currentWeek || 1);
      const item = deck[state.learnVocabIdx] || deck[0];
      state.isLearnFcFlipped = !state.isLearnFcFlipped;
      playOceanBubbleSound(680, 0.15);
      renderLearnStep2Vocab(book);
      if (!state.isLearnFcFlipped && item) {
        speakEnglish(item.word, 0.84, 1.08);
      }
    });
  }

  const btnFcPrev = document.getElementById("btnLearnFcPrev");
  if (btnFcPrev) {
    btnFcPrev.addEventListener("click", () => {
      const book = getCurrentBook();
      const deck = getWeekDeckForBook(book, state.currentWeek || 1);
      state.isLearnFcFlipped = false;
      state.learnVocabIdx = (state.learnVocabIdx - 1 + deck.length) % deck.length;
      renderLearnStep2Vocab(book, { speakFront: true });
    });
  }

  const btnFcListen = document.getElementById("btnLearnFcListen");
  if (btnFcListen) {
    btnFcListen.addEventListener("click", () => {
      const book = getCurrentBook();
      const deck = getWeekDeckForBook(book, state.currentWeek || 1);
      const item = deck[state.learnVocabIdx] || deck[0];
      if (item) speakEnglish(item.word, 0.84, 1.08);
    });
  }

  const btnFcNext = document.getElementById("btnLearnFcNextKnow");
  if (btnFcNext) {
    btnFcNext.addEventListener("click", () => {
      const book = getCurrentBook();
      const deck = getWeekDeckForBook(book, state.currentWeek || 1);
      playOceanBubbleSound(740, 0.18);
      if (state.learnVocabIdx < deck.length - 1) {
        state.learnVocabIdx++;
        state.isLearnFcFlipped = false;
        renderLearnStep2Vocab(book, { speakFront: true });
      } else {
        renderLearnStep2Vocab(book);
        const goP3 = document.getElementById("btnGoToLearnPage3");
        if (goP3) goP3.classList.remove("hidden");
      }
    });
  }

  const btnGoP3 = document.getElementById("btnGoToLearnPage3");
  if (btnGoP3) {
    btnGoP3.addEventListener("click", () => {
      state.speakingQuestionIdx = 0;
      const book = getCurrentBook();
      renderLearnStep3Speaking(book);
      switchLearnStepPage(3);
      const qList = getWeekSpeakingQuestions(book, state.currentWeek || 1);
      if (qList[0]) speakEnglish(qList[0].en, 0.9, 1.12);
    });
  }

  // Page 3 Popo Speaking & Clam Mic
  const clamBtn = document.getElementById("btnPearlClamMic");
  if (clamBtn) {
    clamBtn.addEventListener("click", () => {
      activatePearlClamMicrophone();
    });
  }

  document.querySelectorAll("[data-sim-speech]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const text = btn.getAttribute("data-sim-speech");
      submitSpeechToPopo(text);
    });
  });

  const btnReplayPopo = document.getElementById("btnReplayPopoVoice");
  if (btnReplayPopo) {
    btnReplayPopo.addEventListener("click", () => {
      const book = getCurrentBook();
      const qList = getWeekSpeakingQuestions(book, state.currentWeek || 1);
      const qItem = qList[state.speakingQuestionIdx] || qList[0];
      if (qItem) speakEnglish(qItem.en, 0.9, 1.12);
    });
  }

  const btnToggleSub = document.getElementById("btnToggleSubtitleText");
  if (btnToggleSub) {
    btnToggleSub.addEventListener("click", () => {
      state.showSpeakingSubtitle = !state.showSpeakingSubtitle;
      const sub = document.getElementById("popoSpokenSubtitleKr");
      if (sub) sub.classList.toggle("hidden", !state.showSpeakingSubtitle);
    });
  }

  const btnBackP2 = document.getElementById("btnBackToLearnPage2");
  if (btnBackP2) {
    btnBackP2.addEventListener("click", () => switchLearnStepPage(2));
  }

  const btnNextQ = document.getElementById("btnNextSpeakingQuestion");
  if (btnNextQ) {
    btnNextQ.addEventListener("click", () => {
      const book = getCurrentBook();
      const qList = getWeekSpeakingQuestions(book, state.currentWeek || 1);
      state.speakingQuestionIdx = (state.speakingQuestionIdx + 1) % qList.length;
      renderLearnStep3Speaking(book);
      const qItem = qList[state.speakingQuestionIdx];
      if (qItem) speakEnglish(qItem.en, 0.9, 1.12);
    });
  }

  const btnFinishLearn = document.getElementById("btnFinishTodayStoryLearn");
  if (btnFinishLearn) {
    btnFinishLearn.addEventListener("click", async () => {
      playOceanBubbleSound(920, 0.3);
      const user = getCurrentUser();
      const wk = state.currentWeek || 1;
      if (user) {
        user[`progress_w${wk}`] = 100;
        const nextWk = wk < 4 ? wk + 1 : 4;
        if (wk < 4 && (Number(user[`progress_w${nextWk}`]) || 0) === 0) {
          user[`progress_w${nextWk}`] = 10;
        }
        state.currentWeek = nextWk;
        try {
          await fetch("/api/users/progress", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              userId: user.id,
              week: wk,
              progress: 100
            })
          });
        } catch (_) {}
      }
      syncAllViews();
      navigateToRoute("/student");
    });
  }

  // Curriculum Dedicated Subviews (Hub -> Phonics / ClassCard / Upper)
  const btnEnterPhonics = document.getElementById("btnEnterPhonicsView");
  if (btnEnterPhonics) {
    btnEnterPhonics.addEventListener("click", () => switchCurrSubView("phonics"));
  }

  const btnEnterCc = document.getElementById("btnEnterClassCardView");
  if (btnEnterCc) {
    btnEnterCc.addEventListener("click", () => {
      switchCurrSubView("classcard");
      switchClassCardStage("study");
    });
  }

  const btnEnterUpper = document.getElementById("btnEnterUpperGrammarView");
  if (btnEnterUpper) {
    btnEnterUpper.addEventListener("click", () => switchCurrSubView("upper"));
  }

  document.querySelectorAll("[data-back-curr-hub]").forEach((btn) => {
    btn.addEventListener("click", () => switchCurrSubView("hub"));
  });

  document.querySelectorAll("[data-home-open-curr]").forEach((row) => {
    row.addEventListener("click", () => {
      const target = row.getAttribute("data-home-open-curr");
      navigateToRoute("/student/curriculum");
      if (target === "phonics") switchCurrSubView("phonics");
      else if (target === "classcard") {
        switchCurrSubView("classcard");
        switchClassCardStage("study");
      }
    });
  });

  const btnPhonicsToCc = document.getElementById("btnPhonicsToClassCard");
  if (btnPhonicsToCc) {
    btnPhonicsToCc.addEventListener("click", () => {
      switchCurrSubView("classcard");
      switchClassCardStage("study");
    });
  }

  const phonicsItems = [
    { sound: "sh-", word: "shining", kr: "✨ 반짝이는", tip: "'쉬~🤫' 물결 소리로 시작하는 통문자예요!" },
    { sound: "st-", word: "starfish", kr: "🌟 불가사리", tip: "별(star) 모양을 떠올리며 한 번에 읽어봐요!" },
    { sound: "wh-", word: "whale", kr: "🐋 고래", tip: "입술을 동그랗게 모으고 '웨일~' 하고 소리 내요!" },
    { sound: "tr-", word: "treasure", kr: "💎 보물", tip: "바닷속 반짝이는 보물 상자 통문자예요!" }
  ];

  const btnPhonicsListen = document.getElementById("btnPhonicsListenSpot");
  if (btnPhonicsListen) {
    btnPhonicsListen.addEventListener("click", () => {
      const it = phonicsItems[state.phonicsSpotIdx] || phonicsItems[0];
      speakEnglish(it.word, 0.84, 1.12);
    });
  }

  const btnPhonicsPop = document.getElementById("btnPhonicsPopBubble");
  if (btnPhonicsPop) {
    btnPhonicsPop.addEventListener("click", () => {
      const it = phonicsItems[state.phonicsSpotIdx] || phonicsItems[0];
      state.phonicsPoppedSet.add(state.phonicsSpotIdx);
      playOceanBubbleSound(840, 0.22);
      speakEnglish(it.word, 0.86, 1.12);
      const cnt = document.getElementById("phonicsDoneCounter");
      if (cnt) cnt.innerHTML = `터뜨린 물방울: <strong>${state.phonicsPoppedSet.size} / 4</strong>`;
      const fb = document.getElementById("g12PhonicsFeedback");
      if (fb) fb.textContent = `💦 팡! '${it.word}'(${it.kr}) 물방울을 멋지게 터뜨렸어요!`;
      state.phonicsSpotIdx = (state.phonicsSpotIdx + 1) % phonicsItems.length;
      const nextIt = phonicsItems[state.phonicsSpotIdx];
      const sChip = document.getElementById("phonicsSpotSoundChip");
      const sWord = document.getElementById("phonicsSpotWord");
      const sMean = document.getElementById("phonicsSpotMeaning");
      const sTip = document.getElementById("phonicsSpotTip");
      if (sChip) sChip.textContent = `오늘의 소리: ${nextIt.sound}`;
      if (sWord) sWord.textContent = nextIt.word;
      if (sMean) sMean.textContent = nextIt.kr;
      if (sTip) sTip.textContent = nextIt.tip;
    });
  }

  // ClassCard Stage 1 -> Stage 2 Quiz
  const ccBtnStudy = document.getElementById("ccModeBtnStudy");
  const ccBtnQuiz = document.getElementById("ccModeBtnQuiz");
  const btnStartQuiz = document.getElementById("btnStartClassCardQuiz");
  const btnBackStudy = document.getElementById("btnBackToCcStudy");
  const btnFinishQuiz = document.getElementById("btnFinishCcQuizToHub");
  const btnCcQuizListen = document.getElementById("btnCcQuizListen");

  if (ccBtnStudy) ccBtnStudy.addEventListener("click", () => switchClassCardStage("study"));
  if (ccBtnQuiz) ccBtnQuiz.addEventListener("click", () => switchClassCardStage("quiz"));
  if (btnStartQuiz) btnStartQuiz.addEventListener("click", () => switchClassCardStage("quiz"));
  if (btnBackStudy) btnBackStudy.addEventListener("click", () => switchClassCardStage("study"));
  if (btnFinishQuiz) btnFinishQuiz.addEventListener("click", () => switchCurrSubView("hub"));
  if (btnCcQuizListen) {
    btnCcQuizListen.addEventListener("click", () => {
      const card = CLASSCARD_DECK[state.ccQuizIdx] || CLASSCARD_DECK[0];
      speakEnglish(card.word, 0.88, 1.1);
    });
  }
}

window.addEventListener("DOMContentLoaded", () => {
  initApp();
  bindKidFriendlyOverhaulEvents();
});

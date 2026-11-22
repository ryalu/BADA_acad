/**
 * Initial seed constants and student-level mapping helpers.
 */

const INITIAL_TEACHERS = [
  {
    id: "tch_director",
    name: "원장님 (총괄)",
    role: "director",
    title_label: "원장 · 최고관리자",
    email: "director@bada.kr",
    password: process.env.DIRECTOR_PASSWORD || "bada1234"
  }
];

const INITIAL_BOOKS = [
  {
    id: "bada_level2_ocean_friends",
    title: "Popo and the Ocean Friends",
    subtitle_kr: "아기 고래 포포와 반짝이는 바다 친구들",
    level: "Level 2",
    grade_recommended: "초등 1~3학년",
    cover_theme: "aqua",
    full_text:
      "Look at the starfish shining on the sandy floor. Baby whale Popo swims across the coral reef. A gentle sea turtle glides through the clear water. Together, they find a golden treasure chest under the sea!"
  },
  {
    id: "bada_level6_deep_currents",
    title: "Guardians of the Deep Current",
    subtitle_kr: "깊은 해류의 수호자들과 비밀의 섬",
    level: "Level 7",
    grade_recommended: "초등 5~6학년 (중등 대비)",
    cover_theme: "coral",
    full_text:
      "The secret island is protected by a warm ocean current. Baby whale Popo explores the glowing cave where ancient pearls are hidden. Can you remember how the clear ocean water is kept clean by the coral reef?"
  },
  {
    id: "bada_pre_bubble_song",
    title: "Popo's Happy Bubble Song",
    subtitle_kr: "포포의 퐁퐁 물방울 노래",
    level: "Pre-Level",
    grade_recommended: "미취학 ~ 초등 1학년",
    cover_theme: "mint",
    full_text:
      "Popo blows a big water bubble in the blue sea. Jump high over the soft waves with baby dolphin! Look at the red crab dancing on the warm sandy beach."
  }
];

const INITIAL_USERS = [
  {
    id: "stu_hajun",
    name: "김하준",
    grade_label: "초등 2학년",
    grade_group: "grade_1_2",
    age: 9,
    level: "Level 2",
    current_book_id: "bada_level2_ocean_friends",
    pin_code: "1234",
    teacher_id: "tch_emma",
    classcard_level: 2,
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
      { tag: "under the sea (전치사구 리듬)", count: 14, type: "chunk" },
      { tag: "swims across (동사+전치사 연음)", count: 11, type: "fluency" },
      { tag: "shining starfish (강세 억양)", count: 9, type: "intonation" },
      { tag: "golden treasure chest (완전한 호흡)", count: 8, type: "chunk" }
    ],
    weaknesses: [
      { tag: "see vs look at 뉘앙스 혼동", count: 6, type: "nuance" },
      { tag: "through (/θruː/) th 발음 약화", count: 5, type: "phoneme" },
      { tag: "glides (/z/) 어미 자음 생략", count: 4, type: "phoneme" },
      { tag: "관사 a / the 호흡 누락", count: 3, type: "grammar" }
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
    pin_code: "1234",
    teacher_id: "tch_emma",
    classcard_level: 4,
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
      { tag: "1~5형식 동사구 확장", count: 16, type: "pattern" },
      { tag: "glides through the clear water", count: 12, type: "chunk" },
      { tag: "Look at the + 명사구 응용", count: 10, type: "fluency" }
    ],
    weaknesses: [
      { tag: "5형식 목적격보어 분사(shining) 위치", count: 4, type: "pattern" },
      { tag: "across vs through 공간 전치사 구분", count: 3, type: "nuance" }
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
    pin_code: "1234",
    teacher_id: "tch_emma",
    classcard_level: 7,
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
      { tag: "관계부사 where절 호흡 연결", count: 15, type: "grammar" },
      { tag: "is protected by (수동태 청크)", count: 13, type: "chunk" },
      { tag: "자연스러운 원어민 강세 리듬", count: 11, type: "fluency" }
    ],
    weaknesses: [
      { tag: "간접의문문 (how + S + V) 어순 도치", count: 5, type: "grammar" },
      { tag: "수동태 과거분사(kept / hidden) 불규칙 변화", count: 4, type: "grammar" }
    ]
  }
];

const INITIAL_PHONICS_CURRICULUM = [
  {
    id: "tier_pre_1",
    level_label: "Level Pre ~ 1",
    title_kr: "단모음 파닉스 & 숫자·기초 전치사",
    desc_kr: "단모음(CVC) 12단어와 기본 숫자(1~10), 위치 전치사를 함께 익혀요.",
    sort_order: 1,
    phonics_words: [
      { word: "cat", pattern: "Short a (-at)", meaning_kr: "고양이", tip_kr: "크-애-트 ➔ 캣", example_en: "A small cat sits on the mat." },
      { word: "hat", pattern: "Short a (-at)", meaning_kr: "모자", tip_kr: "흐-애-트 ➔ 햇", example_en: "Put on your blue hat." },
      { word: "bag", pattern: "Short a (-ag)", meaning_kr: "가방", tip_kr: "브-애-그 ➔ 백", example_en: "My red bag is heavy." },
      { word: "map", pattern: "Short a (-ap)", meaning_kr: "지도", tip_kr: "므-애-프 ➔ 맵", example_en: "Look at the treasure map." },
      { word: "pen", pattern: "Short e (-en)", meaning_kr: "펜", tip_kr: "프-에-느 ➔ 펜", example_en: "I have a black pen." },
      { word: "bed", pattern: "Short e (-ed)", meaning_kr: "침대", tip_kr: "브-에-드 ➔ 베드", example_en: "The puppy is on the bed." },
      { word: "pig", pattern: "Short i (-ig)", meaning_kr: "돼지", tip_kr: "프-이-그 ➔ 피그", example_en: "The pink pig likes mud." },
      { word: "sit", pattern: "Short i (-it)", meaning_kr: "앉다", tip_kr: "스-이-트 ➔ 싯", example_en: "Please sit down here." },
      { word: "dog", pattern: "Short o (-og)", meaning_kr: "강아지", tip_kr: "드-오-그 ➔ 도그", example_en: "The happy dog runs fast." },
      { word: "box", pattern: "Short o (-ox)", meaning_kr: "상자", tip_kr: "브-오-크스 ➔ 박스", example_en: "What is inside the box?" },
      { word: "sun", pattern: "Short u (-un)", meaning_kr: "태양", tip_kr: "스-어-느 ➔ 선", example_en: "The bright sun shines today." },
      { word: "cup", pattern: "Short u (-up)", meaning_kr: "컵", tip_kr: "크-어-프 ➔ 컵", example_en: "Drink water from the cup." }
    ],
    basic_words: [
      { word: "one", category: "숫자", meaning_kr: "하나 (1)", example_en: "I see one yellow star." },
      { word: "two", category: "숫자", meaning_kr: "둘 (2)", example_en: "Two little birds sing." },
      { word: "three", category: "숫자", meaning_kr: "셋 (3)", example_en: "Count one, two, three." },
      { word: "four", category: "숫자", meaning_kr: "넷 (4)", example_en: "There are four apples." },
      { word: "five", category: "숫자", meaning_kr: "다섯 (5)", example_en: "Give me a high five!" },
      { word: "six", category: "숫자", meaning_kr: "여섯 (6)", example_en: "Six fish swim together." },
      { word: "seven", category: "숫자", meaning_kr: "일곱 (7)", example_en: "Seven colors in a rainbow." },
      { word: "eight", category: "숫자", meaning_kr: "여덟 (8)", example_en: "An octopus has eight arms." },
      { word: "nine", category: "숫자", meaning_kr: "아홉 (9)", example_en: "Nine balloons float up." },
      { word: "ten", category: "숫자", meaning_kr: "열 (10)", example_en: "I have ten fingers." },
      { word: "in", category: "전치사", meaning_kr: "~ 안에", example_en: "The toy is in the box." },
      { word: "on", category: "전치사", meaning_kr: "~ 위에", example_en: "The book is on the desk." },
      { word: "under", category: "전치사", meaning_kr: "~ 아래에", example_en: "The cat sleeps under the chair." }
    ]
  },
  {
    id: "tier_2",
    level_label: "Level 2",
    title_kr: "이중자음·매직 e & 요일·위치 전치사",
    desc_kr: "sh/ch/th·Magic e 12단어와 일주일 요일, 위치 전치사를 마스터해요.",
    sort_order: 2,
    phonics_words: [
      { word: "cake", pattern: "Magic e (a_e)", meaning_kr: "케이크", tip_kr: "끝의 e는 소리 없이 a를 [에이]로", example_en: "We share a sweet cake." },
      { word: "name", pattern: "Magic e (a_e)", meaning_kr: "이름", tip_kr: "ㄴ-에이-ㅁ ➔ 네임", example_en: "Write your name on the card." },
      { word: "bike", pattern: "Magic e (i_e)", meaning_kr: "자전거", tip_kr: "i가 [아이] 소리로 길어져요", example_en: "I ride my bike to the park." },
      { word: "time", pattern: "Magic e (i_e)", meaning_kr: "시간", tip_kr: "ㅌ-아이-ㅁ ➔ 타임", example_en: "It is time for English class." },
      { word: "home", pattern: "Magic e (o_e)", meaning_kr: "집", tip_kr: "o가 [오우] 소리로 길어져요", example_en: "Let us go home now." },
      { word: "cube", pattern: "Magic e (u_e)", meaning_kr: "정육면체", tip_kr: "u가 [유] 소리로 길어져요", example_en: "Put an ice cube in the juice." },
      { word: "ship", pattern: "Digraph sh", meaning_kr: "큰 배", tip_kr: "sh는 입술을 모아 [쉬] 소리", example_en: "A big ship sails on the sea." },
      { word: "fish", pattern: "Digraph sh", meaning_kr: "물고기", tip_kr: "끝소리 sh도 부드럽게 [쉬]", example_en: "A silver fish jumps high." },
      { word: "chat", pattern: "Digraph ch", meaning_kr: "이야기하다", tip_kr: "ch는 힘차게 [취] 소리", example_en: "Friends chat after school." },
      { word: "chin", pattern: "Digraph ch", meaning_kr: "턱", tip_kr: "취-이-ㄴ ➔ 친", example_en: "Touch your chin gently." },
      { word: "thin", pattern: "Digraph th", meaning_kr: "얇은", tip_kr: "혀끝을 살짝 물고 바람 소리", example_en: "This paper is very thin." },
      { word: "frog", pattern: "Blend fr-", meaning_kr: "개구리", tip_kr: "f와 r을 이어서 [프러그]", example_en: "A green frog hops on a leaf." }
    ],
    basic_words: [
      { word: "Monday", category: "요일", meaning_kr: "월요일", example_en: "School starts on Monday." },
      { word: "Tuesday", category: "요일", meaning_kr: "화요일", example_en: "I play soccer on Tuesday." },
      { word: "Wednesday", category: "요일", meaning_kr: "수요일", example_en: "We read books on Wednesday." },
      { word: "Thursday", category: "요일", meaning_kr: "목요일", example_en: "Music class is on Thursday." },
      { word: "Friday", category: "요일", meaning_kr: "금요일", example_en: "Friday is our fun movie day." },
      { word: "Saturday", category: "요일", meaning_kr: "토요일", example_en: "We visit grandma on Saturday." },
      { word: "Sunday", category: "요일", meaning_kr: "일요일", example_en: "Sunday is a peaceful day." },
      { word: "near", category: "전치사", meaning_kr: "~ 가까이에", example_en: "The park is near my house." },
      { word: "behind", category: "전치사", meaning_kr: "~ 뒤에", example_en: "Popo hides behind the coral." },
      { word: "beside", category: "전치사", meaning_kr: "~ 옆에", example_en: "Sit beside your best friend." },
      { word: "between", category: "전치사", meaning_kr: "~ 사이에", example_en: "The ball is between two shoes." },
      { word: "over", category: "전치사", meaning_kr: "~ 위로 (건너서)", example_en: "The dolphin leaps over the wave." }
    ]
  },
  {
    id: "tier_3_4",
    level_label: "Level 3 ~ 4",
    title_kr: "이중모음(Vowel Teams) & 12달·방향 전치사",
    desc_kr: "ai/ea/oa/ow 이중모음 12단어와 12달 이름, 방향·시간 전치사를 익혀요.",
    sort_order: 3,
    phonics_words: [
      { word: "rain", pattern: "Vowel Team ai", meaning_kr: "비", tip_kr: "ai는 앞 글자 a 소리만 길게 [에이]", example_en: "Rain falls softly on the roof." },
      { word: "train", pattern: "Vowel Team ai", meaning_kr: "기차", tip_kr: "tr + ain ➔ 트레인", example_en: "The fast train arrives on time." },
      { word: "play", pattern: "Vowel Team ay", meaning_kr: "놀다", tip_kr: "단어 끝 [에이] 소리는 ay", example_en: "Children play in the yard." },
      { word: "leaf", pattern: "Vowel Team ea", meaning_kr: "나뭇잎", tip_kr: "ea가 만나 긴 [이] 소리", example_en: "A green leaf floats down." },
      { word: "dream", pattern: "Vowel Team ea", meaning_kr: "꿈", tip_kr: "dr + eam ➔ 드림", example_en: "I had a wonderful dream." },
      { word: "seed", pattern: "Vowel Team ee", meaning_kr: "씨앗", tip_kr: "ee는 또렷한 긴 [이] 소리", example_en: "Plant a tiny seed in the soil." },
      { word: "boat", pattern: "Vowel Team oa", meaning_kr: "보트", tip_kr: "oa가 만나 긴 [오우] 소리", example_en: "Row the boat across the lake." },
      { word: "coat", pattern: "Vowel Team oa", meaning_kr: "외투", tip_kr: "ㅋ-오우-트 ➔ 코트", example_en: "Wear a warm coat outside." },
      { word: "snow", pattern: "Vowel Team ow", meaning_kr: "눈", tip_kr: "단어 끝 ow가 [오우] 소리", example_en: "White snow covers the hill." },
      { word: "cloud", pattern: "Diphthong ou", meaning_kr: "구름", tip_kr: "ou가 [아우] 입모양으로", example_en: "A fluffy cloud drifts by." },
      { word: "moon", pattern: "Long oo", meaning_kr: "달", tip_kr: "oo는 길게 [우] 소리", example_en: "The full moon glows at night." },
      { word: "star", pattern: "R-controlled ar", meaning_kr: "별", tip_kr: "ar은 혀를 살짝 말아 [아르]", example_en: "Make a wish upon a star." }
    ],
    basic_words: [
      { word: "January", category: "달(월)", meaning_kr: "1월", example_en: "January is the first month." },
      { word: "February", category: "달(월)", meaning_kr: "2월", example_en: "February can be very cold." },
      { word: "March", category: "달(월)", meaning_kr: "3월", example_en: "Spring begins in March." },
      { word: "April", category: "달(월)", meaning_kr: "4월", example_en: "Cherry blossoms bloom in April." },
      { word: "May", category: "달(월)", meaning_kr: "5월", example_en: "We celebrate Children's Day in May." },
      { word: "June", category: "달(월)", meaning_kr: "6월", example_en: "Summer starts in June." },
      { word: "July", category: "달(월)", meaning_kr: "7월", example_en: "We go swimming in July." },
      { word: "August", category: "달(월)", meaning_kr: "8월", example_en: "August is the hottest month." },
      { word: "September", category: "달(월)", meaning_kr: "9월", example_en: "Cool wind blows in September." },
      { word: "October", category: "달(월)", meaning_kr: "10월", example_en: "Leaves turn red in October." },
      { word: "November", category: "달(월)", meaning_kr: "11월", example_en: "November brings chilly mornings." },
      { word: "December", category: "달(월)", meaning_kr: "12월", example_en: "December is the last month." },
      { word: "at", category: "전치사", meaning_kr: "~에 (시각/장소)", example_en: "Meet me at three o'clock." },
      { word: "by", category: "전치사", meaning_kr: "~ 옆에 / ~까지", example_en: "Wait by the school gate." },
      { word: "from", category: "전치사", meaning_kr: "~로부터", example_en: "This letter is from my cousin." },
      { word: "to", category: "전치사", meaning_kr: "~로 / ~까지", example_en: "Walk to the library quietly." },
      { word: "into", category: "전치사", meaning_kr: "~ 안으로", example_en: "Dive into the clear blue water." },
      { word: "across", category: "전치사", meaning_kr: "~을 가로질러", example_en: "Swim across the calm bay." }
    ]
  },
  {
    id: "tier_5_6",
    level_label: "Level 5 ~ 6",
    title_kr: "묵음·R통제모음 & 서수·큰 숫자·복합 전치사",
    desc_kr: "묵음 자음과 R통제 모음 12단어, 서수(1st~5th)·큰 숫자, 시간·이동 전치사를 배워요.",
    sort_order: 4,
    phonics_words: [
      { word: "bird", pattern: "R-controlled ir", meaning_kr: "새", tip_kr: "ir/er/ur은 모두 [어르] 소리", example_en: "A blue bird sings in the tree." },
      { word: "turn", pattern: "R-controlled ur", meaning_kr: "돌다, 차례", tip_kr: "ㅌ-어르-ㄴ ➔ 턴", example_en: "Now it is your turn to read." },
      { word: "storm", pattern: "R-controlled or", meaning_kr: "폭풍", tip_kr: "or은 [오르] 소리", example_en: "The ship sailed through the storm." },
      { word: "knight", pattern: "Silent kn / -igh", meaning_kr: "기사", tip_kr: "kn의 k와 igh의 gh는 묵음!", example_en: "The brave knight guarded the castle." },
      { word: "write", pattern: "Silent wr", meaning_kr: "쓰다", tip_kr: "wr에서 w는 소리 내지 않아요", example_en: "Write a short diary every night." },
      { word: "climb", pattern: "Silent -mb", meaning_kr: "오르다", tip_kr: "끝의 mb에서 b는 묵음", example_en: "Monkeys climb tall trees easily." },
      { word: "light", pattern: "Silent -igh", meaning_kr: "빛, 가벼운", tip_kr: "igh는 길게 [아이] 소리", example_en: "Sunlight enters the deep ocean." },
      { word: "bright", pattern: "Silent -igh", meaning_kr: "밝은", tip_kr: "br + ight ➔ 브라이트", example_en: "Your future looks very bright." },
      { word: "phone", pattern: "Digraph ph", meaning_kr: "전화기", tip_kr: "ph는 f와 같은 [프] 소리", example_en: "Answer the phone politely." },
      { word: "whale", pattern: "Digraph wh", meaning_kr: "고래", tip_kr: "wh + ale ➔ 웨일", example_en: "A giant whale sings under the sea." },
      { word: "voice", pattern: "Diphthong oi", meaning_kr: "목소리", tip_kr: "oi와 ce[스]가 만나 [보이스]", example_en: "Read aloud with a clear voice." },
      { word: "bridge", pattern: "Soft g (-dge)", meaning_kr: "다리", tip_kr: "dge는 부드러운 [쥐] 소리", example_en: "Cross the wooden bridge safely." }
    ],
    basic_words: [
      { word: "first", category: "숫자(서수)", meaning_kr: "첫 번째 (1st)", example_en: "She finished in first place." },
      { word: "second", category: "숫자(서수)", meaning_kr: "두 번째 (2nd)", example_en: "Take the second turn on the left." },
      { word: "third", category: "숫자(서수)", meaning_kr: "세 번째 (3rd)", example_en: "Earth is the third planet." },
      { word: "fourth", category: "숫자(서수)", meaning_kr: "네 번째 (4th)", example_en: "Today is the fourth day of camp." },
      { word: "fifth", category: "숫자(서수)", meaning_kr: "다섯 번째 (5th)", example_en: "Our classroom is on the fifth floor." },
      { word: "twenty", category: "숫자", meaning_kr: "스물 (20)", example_en: "There are twenty students here." },
      { word: "fifty", category: "숫자", meaning_kr: "쉰 (50)", example_en: "Read fifty pages this week." },
      { word: "hundred", category: "숫자", meaning_kr: "백 (100)", example_en: "One hundred stars shine brightly." },
      { word: "thousand", category: "숫자", meaning_kr: "천 (1,000)", example_en: "A thousand drops make a wave." },
      { word: "through", category: "전치사", meaning_kr: "~을 통과하여", example_en: "Walk through the coral tunnel." },
      { word: "around", category: "전치사", meaning_kr: "~ 주위에", example_en: "Earth moves around the sun." },
      { word: "during", category: "전치사", meaning_kr: "~ 동안에", example_en: "Stay quiet during the movie." },
      { word: "before", category: "전치사", meaning_kr: "~ 전에", example_en: "Wash your hands before lunch." },
      { word: "after", category: "전치사", meaning_kr: "~ 후에", example_en: "We play soccer after school." },
      { word: "against", category: "전치사", meaning_kr: "~에 맞서 / 기대어", example_en: "Lean the board against the wall." }
    ]
  },
  {
    id: "tier_7_8",
    level_label: "Level 7 ~ 8",
    title_kr: "다음절 접사·고급 파닉스 & 계절·빈도·고급 전치사",
    desc_kr: "-tion/-sion/-ous 접사 12단어와 사계절·빈도부사·고급 전치사를 완성해요.",
    sort_order: 5,
    phonics_words: [
      { word: "nation", pattern: "Suffix -tion", meaning_kr: "국가, 나라", tip_kr: "-tion은 [션]으로 읽어요", example_en: "People from every nation gathered." },
      { word: "station", pattern: "Suffix -tion", meaning_kr: "역, 정거장", tip_kr: "st + a + tion ➔ 스테이션", example_en: "Wait at the subway station." },
      { word: "action", pattern: "Suffix -tion", meaning_kr: "행동, 움직임", tip_kr: "ac + tion ➔ 액션", example_en: "Small actions make a big change." },
      { word: "vision", pattern: "Suffix -sion", meaning_kr: "시야, 비전", tip_kr: "모음 뒤 -sion은 울림 [젼]", example_en: "Clear vision helps us plan ahead." },
      { word: "mission", pattern: "Suffix -ssion", meaning_kr: "임무, 사명", tip_kr: "-ssion은 힘 있게 [션]", example_en: "Our mission is to protect the sea." },
      { word: "famous", pattern: "Suffix -ous", meaning_kr: "유명한", tip_kr: "-ous는 가볍게 [어스]", example_en: "This island is famous for coral." },
      { word: "curious", pattern: "Suffix -ous", meaning_kr: "호기심 많은", tip_kr: "큐-어리-어스 ➔ 큐리어스", example_en: "Curious minds ask great questions." },
      { word: "future", pattern: "Suffix -ture", meaning_kr: "미래", tip_kr: "-ture는 [처] 소리가 나요", example_en: "Clean energy powers our future." },
      { word: "nature", pattern: "Suffix -ture", meaning_kr: "자연", tip_kr: "네이-처 ➔ 네이처", example_en: "Respect nature and ocean wildlife." },
      { word: "science", pattern: "Soft c (sc-)", meaning_kr: "과학", tip_kr: "sc가 e/i 앞에서 [사] 소리", example_en: "Ocean science reveals hidden worlds." },
      { word: "explore", pattern: "Prefix ex-", meaning_kr: "탐험하다", tip_kr: "ex-[익스] + plore[플로어]", example_en: "Scientists explore the deep sea." },
      { word: "protect", pattern: "Prefix pro-", meaning_kr: "보호하다", tip_kr: "pro-[프러] + tect[텍트]", example_en: "We must protect sea turtles." }
    ],
    basic_words: [
      { word: "spring", category: "계절", meaning_kr: "봄", example_en: "Warm breezes return in spring." },
      { word: "summer", category: "계절", meaning_kr: "여름", example_en: "We love ocean waves in summer." },
      { word: "autumn", category: "계절", meaning_kr: "가을", example_en: "Autumn skies look crisp and clear." },
      { word: "winter", category: "계절", meaning_kr: "겨울", example_en: "Snowflakes fall softly in winter." },
      { word: "always", category: "빈도", meaning_kr: "항상", example_en: "Always check your spelling carefully." },
      { word: "usually", category: "빈도", meaning_kr: "보통, 대개", example_en: "I usually read for twenty minutes." },
      { word: "sometimes", category: "빈도", meaning_kr: "가끔", example_en: "Sometimes whales swim near boats." },
      { word: "without", category: "전치사", meaning_kr: "~ 없이", example_en: "We cannot live without clean water." },
      { word: "within", category: "전치사", meaning_kr: "~ 이내에", example_en: "Finish the quiz within ten minutes." },
      { word: "toward", category: "전치사", meaning_kr: "~을 향하여", example_en: "Sail toward the bright lighthouse." },
      { word: "beneath", category: "전치사", meaning_kr: "~ 바로 아래에", example_en: "Hidden currents flow beneath the surface." },
      { word: "beyond", category: "전치사", meaning_kr: "~ 너머에", example_en: "Look beyond the distant horizon." },
      { word: "despite", category: "전치사", meaning_kr: "~에도 불구하고", example_en: "They smiled despite the heavy rain." },
      { word: "throughout", category: "전치사", meaning_kr: "~ 내내, 도처에", example_en: "Ocean currents travel throughout the globe." }
    ]
  }
];

function mapGradeLabelToGroupAndAge(gradeLabel) {
  const label = String(gradeLabel || "초등 2학년");
  if (label.includes("6학년")) return { grade_group: "grade_6", age: 13 };
  if (label.includes("5학년")) return { grade_group: "grade_4_plus", age: 12 };
  if (label.includes("4학년")) return { grade_group: "grade_4_plus", age: 11 };
  if (label.includes("3학년")) return { grade_group: "grade_4_plus", age: 10 };
  if (label.includes("1학년") || label.includes("미취학")) return { grade_group: "grade_1_2", age: 8 };
  return { grade_group: "grade_1_2", age: 9 };
}

function mapLevelToDefaultClasscard(levelStr) {
  const m = String(levelStr || "").match(/(\d+)/);
  if (!m) return 1;
  return Math.min(26, Math.max(1, Number(m[1])));
}

module.exports = {
  INITIAL_TEACHERS,
  INITIAL_BOOKS,
  INITIAL_USERS,
  INITIAL_PHONICS_CURRICULUM,
  mapGradeLabelToGroupAndAge,
  mapLevelToDefaultClasscard
};

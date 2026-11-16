/**
 * BADA 영어 AI Engine
 * 1. Vocab & Chunk Extractor (LLM pipeline + deterministic linguistic analyzer)
 * 2. Week 3 Baby Whale 'Popo' 3-Step Feedback Pipeline (JSON Specification compliant)
 * 3. Week 4 Teacher SaaS AI Recommended Questions Generator
 */

const POPO_MASTER_PROMPT_SPEC = {
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

// Built-in dictionary for instant offline/sandbox LLM extraction fallback
const OCEAN_LEXICON = {
  look: { kr: "보다, 시선을 두다", phonetic: "/lʊk/", pos: "동사", tip: "at과 함께 쓰여 무언가를 콕 짚어 볼 때 써요!" },
  starfish: { kr: "불가사리", phonetic: "/ˈstɑːr.fɪʃ/", pos: "명사", tip: "별(star) 모양을 닮은 바다 친구예요." },
  shining: { kr: "반짝이는, 빛나는", phonetic: "/ˈʃaɪ.nɪŋ/", pos: "형용사", tip: "햇빛이나 진주처럼 반짝일 때 써요." },
  sandy: { kr: "모래가 많은, 모래빛의", phonetic: "/ˈsæn.di/", pos: "형용사", tip: "따뜻한 산호 모래(Coral Sand) 바닥을 떠올려요!" },
  floor: { kr: "바닥 (바닷속 바닥)", phonetic: "/flɔːr/", pos: "명사", tip: "ocean floor는 바닷속 깊은 바닥이에요." },
  baby: { kr: "아기, 어린", phonetic: "/ˈbeɪ.bi/", pos: "명사", tip: "아기 고래 포포(Baby Whale Popo)!" },
  whale: { kr: "고래", phonetic: "/weɪl/", pos: "명사", tip: "바다에서 가장 씩씩하고 큰 친구예요." },
  swims: { kr: "헤엄치다", phonetic: "/swɪmz/", pos: "동사", tip: "지느러미를 흔들며 물속을 나아가요." },
  across: { kr: "~을 가로질러", phonetic: "/əˈkrɔːs/", pos: "전치사", tip: "이쪽에서 저쪽 끝까지 시원하게 건너가요." },
  coral: { kr: "산호", phonetic: "/ˈkɔːr.əl/", pos: "명사", tip: "알록달록 바닷속 꽃밭 같은 산호초예요." },
  reef: { kr: "암초, 산호초", phonetic: "/riːf/", pos: "명사", tip: "coral reef는 물고기들의 보금자리 산호초예요." },
  gentle: { kr: "부드러운, 온화한", phonetic: "/ˈdʒen.təl/", pos: "형용사", tip: "살랑살랑 부는 파도처럼 다정한 느낌이에요." },
  sea: { kr: "바다", phonetic: "/siː/", pos: "명사", tip: "포포가 살고 있는 넓고 푸른 바다!" },
  turtle: { kr: "거북이", phonetic: "/ˈtɜːr.təl/", pos: "명사", tip: "sea turtle은 느긋하게 헤엄치는 바다거북이에요." },
  glides: { kr: "미끄러지듯 나아가다", phonetic: "/ɡlaɪdz/", pos: "동사", tip: "힘을 빼고 물결을 타고 스르륵 날아가듯 이동해요." },
  through: { kr: "~을 통과하여, 사이로", phonetic: "/θruː/", pos: "전치사", tip: "물방울이나 해초 사이를 쏙 지나가요." },
  clear: { kr: "맑고 투명한", phonetic: "/klɪr/", pos: "형용사", tip: "바닥까지 훤히 보이는 아쿠아 민트빛 물!" },
  water: { kr: "물, 바닷물", phonetic: "/ˈwɔː.tər/", pos: "명사", tip: "포포가 뿜어내는 시원한 물방울!" },
  together: { kr: "함께, 같이", phonetic: "/təˈɡeð.ər/", pos: "부사", tip: "혼자가 아니라 친구들과 다 같이!" },
  find: { kr: "찾다, 발견하다", phonetic: "/faɪnd/", pos: "동사", tip: "숨겨진 보물을 마침내 찾아냈을 때!" },
  golden: { kr: "황금빛의", phonetic: "/ˈɡoʊl.dən/", pos: "형용사", tip: "반짝반짝 빛나는 금빛 보물 상자!" },
  treasure: { kr: "보물", phonetic: "/ˈtreʒ.ər/", pos: "명사", tip: "바다 깊은 곳에 숨겨진 소중한 보물!" },
  chest: { kr: "상자, 궤짝", phonetic: "/tʃest/", pos: "명사", tip: "treasure chest는 보물 상자예요." },
  dolphin: { kr: "돌고래", phonetic: "/ˈdɑːl.fɪn/", pos: "명사", tip: "포포의 단짝 친구 돌고래!" },
  jumps: { kr: "점프하다, 뛰어오르다", phonetic: "/dʒʌmps/", pos: "동사", tip: "수면 위로 힘차게 솟구쳐 오르는 동작!" },
  waves: { kr: "파도, 물결", phonetic: "/weɪvz/", pos: "명사", tip: "출렁출렁 리듬을 타는 바다 물결!" },
  secret: { kr: "비밀의, 신비로운", phonetic: "/ˈsiː.krət/", pos: "형용사", tip: "아무도 모르는 바닷속 비밀 이야기!" },
  island: { kr: "섬", phonetic: "/ˈaɪ.lənd/", pos: "명사", tip: "바다 한가운데 떠 있는 신비한 섬(s는 소리가 안 나요!)." },
  protect: { kr: "지키다, 보호하다", phonetic: "/prəˈtekt/", pos: "동사", tip: "바다 환경을 소중하게 아끼고 지켜요." },
  ocean: { kr: "대양, 넓은 바다", phonetic: "/ˈoʊ.ʃən/", pos: "명사", tip: "세상을 감싸 안은 거대하고 깊은 바다!" },
  plastic: { kr: "플라스틱", phonetic: "/ˈplæs.tɪk/", pos: "명사", tip: "바다 친구들을 위해 줄여야 하는 쓰레기예요." },
  clean: { kr: "깨끗한, 청소하다", phonetic: "/kliːn/", pos: "형용사", tip: "티 없이 맑고 깨끗한 바다를 만들어요." },
  current: { kr: "해류, 물결의 흐름", phonetic: "/ˈkɜːr.ənt/", pos: "명사", tip: "바닷속에 흐르는 보이지 않는 강물 같은 물길!" },
  explore: { kr: "탐험하다", phonetic: "/ɪkˈsplɔːr/", pos: "동사", tip: "포포와 함께 새로운 바다를 모험해요!" },
  glowing: { kr: "은은하게 빛나는", phonetic: "/ˈɡloʊ.ɪŋ/", pos: "형용사", tip: "진주조개처럼 스스로 신비한 빛을 내는 모습!" },
  pearl: { kr: "진주", phonetic: "/pɜːrl/", pos: "명사", tip: "조개 속에서 자라난 반짝이는 보석!" },
  // Basic function & core elementary storybook vocabulary
  the: { kr: "그", phonetic: "/ðə/", pos: "관사", tip: "방금 말하거나 서로 알고 있는 대상을 가리켜요." },
  a: { kr: "하나의", phonetic: "/ə/", pos: "관사", tip: "하나를 말할 때 앞에 '어' 하고 가볍게 붙여요." },
  an: { kr: "하나의", phonetic: "/ən/", pos: "관사", tip: "모음 소리 단어 앞에서 하나를 뜻해요." },
  and: { kr: "그리고", phonetic: "/ænd/", pos: "접속사", tip: "두 단어와 문장을 자연스럽게 이어줘요." },
  but: { kr: "하지만", phonetic: "/bʌt/", pos: "접속사", tip: "앞뒤 반대되는 내용을 연결할 때 써요." },
  or: { kr: "또는", phonetic: "/ɔːr/", pos: "접속사", tip: "둘 중 하나를 고를 때 써요." },
  in: { kr: "~안에", phonetic: "/ɪn/", pos: "전치사", tip: "안쪽 공간에 들어 있을 때 써요." },
  on: { kr: "~위에", phonetic: "/ɑːn/", pos: "전치사", tip: "표면 위에 닿아 있을 때 써요." },
  at: { kr: "~에서, ~를 향해", phonetic: "/æt/", pos: "전치사", tip: "특정 지점이나 대상을 콕 집을 때 써요." },
  to: { kr: "~로, ~에게", phonetic: "/tuː/", pos: "전치사", tip: "향하는 방향이나 대상을 나타내요." },
  for: { kr: "~를 위해", phonetic: "/fɔːr/", pos: "전치사", tip: "누군가를 위하는 마음을 표현해요." },
  with: { kr: "~와 함께", phonetic: "/wɪð/", pos: "전치사", tip: "친구와 같이 행동할 때 꼭 쓰는 말이에요." },
  by: { kr: "~에 의해, ~옆에", phonetic: "/baɪ/", pos: "전치사", tip: "행동의 주체나 바로 옆 위치를 뜻해요." },
  from: { kr: "~로부터", phonetic: "/frʌm/", pos: "전치사", tip: "출발점이나 온 곳을 알려줘요." },
  under: { kr: "~아래에", phonetic: "/ˈʌn.dər/", pos: "전치사", tip: "무언가의 아래쪽을 가리켜요." },
  over: { kr: "~위로 넘어", phonetic: "/ˈoʊ.vər/", pos: "전치사", tip: "위쪽을 포물선으로 뛰어넘는 느낌이에요." },
  into: { kr: "~안으로", phonetic: "/ˈɪn.tuː/", pos: "전치사", tip: "바깥에서 안쪽으로 들어가는 움직임이에요." },
  of: { kr: "~의", phonetic: "/ʌv/", pos: "전치사", tip: "앞뒤 말을 자연스럽게 소유/소속으로 묶어줘요." },
  is: { kr: "~이다, ~있다", phonetic: "/ɪz/", pos: "동사", tip: "하나의 대상 상태를 설명해 줘요." },
  are: { kr: "~이다, ~있다", phonetic: "/ɑːr/", pos: "동사", tip: "여럿이거나 you와 짝꿍인 동사예요." },
  was: { kr: "~였다, 있었다", phonetic: "/wʌz/", pos: "동사", tip: "지나간 이야기를 들려줄 때 써요." },
  were: { kr: "~였다, 있었다", phonetic: "/wɜːr/", pos: "동사", tip: "여럿의 지난 이야기를 들려줄 때 써요." },
  can: { kr: "~할 수 있다", phonetic: "/kæn/", pos: "조동사", tip: "능력이나 가능성을 자신 있게 말해요." },
  will: { kr: "~할 것이다", phonetic: "/wɪl/", pos: "조동사", tip: "앞으로 할 일이나 다짐을 말해요." },
  i: { kr: "나는", phonetic: "/aɪ/", pos: "대명사", tip: "나 자신을 가리킬 때 항상 대문자로 써요." },
  you: { kr: "너는", phonetic: "/juː/", pos: "대명사", tip: "이야기를 함께 듣는 멋진 너!" },
  he: { kr: "그는", phonetic: "/hiː/", pos: "대명사", tip: "남자 친구를 대신 부르는 말이에요." },
  she: { kr: "그녀는", phonetic: "/ʃiː/", pos: "대명사", tip: "여자 친구를 대신 부르는 말이에요." },
  it: { kr: "그것은", phonetic: "/ɪt/", pos: "대명사", tip: "동물이나 사물 하나를 가리켜요." },
  we: { kr: "우리는", phonetic: "/wiː/", pos: "대명사", tip: "나와 친구들이 함께일 때 써요." },
  they: { kr: "그들은", phonetic: "/ðeɪ/", pos: "대명사", tip: "친구들이나 사물 여럿을 가리켜요." },
  this: { kr: "이, 이것", phonetic: "/ðɪs/", pos: "대명사", tip: "가까이 있는 것을 가리켜요." },
  that: { kr: "저, 그것", phonetic: "/ðæt/", pos: "대명사", tip: "조금 멀리 있는 것을 가리켜요." },
  there: { kr: "거기에, ~이 있다", phonetic: "/ðer/", pos: "부사", tip: "There is/are로 무엇이 있는지 소개해요." },
  here: { kr: "여기에", phonetic: "/hɪr/", pos: "부사", tip: "바로 여기 가까운 곳을 뜻해요." },
  where: { kr: "어디에, ~하는 곳", phonetic: "/wer/", pos: "부사", tip: "장소를 묻거나 설명할 때 써요." },
  what: { kr: "무엇", phonetic: "/wɑːt/", pos: "의문사", tip: "궁금한 것을 물어볼 때 문장 앞에 와요." },
  who: { kr: "누구", phonetic: "/huː/", pos: "의문사", tip: "사람이나 캐릭터가 궁금할 때 물어봐요." },
  how: { kr: "어떻게", phonetic: "/haʊ/", pos: "의문사", tip: "방법이나 기분을 물어볼 때 써요." },
  when: { kr: "언제, ~할 때", phonetic: "/wen/", pos: "부사", tip: "시간이나 때를 이어줄 때 써요." },
  popo: { kr: "포포 (아기고래)", phonetic: "/ˈpoʊ.poʊ/", pos: "이름", tip: "바다를 탐험하는 귀여운 아기 고래 포포!" },
  crab: { kr: "꽃게", phonetic: "/kræb/", pos: "명사", tip: "모래사장을 옆으로 총총 걷는 친구예요." },
  bubble: { kr: "물방울", phonetic: "/ˈbʌb.əl/", pos: "명사", tip: "퐁퐁 떠오르는 동그란 물방울이에요." },
  blow: { kr: "불다", phonetic: "/bloʊ/", pos: "동사", tip: "후~ 하고 물방울이나 바람을 불어요." },
  beach: { kr: "해변", phonetic: "/biːtʃ/", pos: "명사", tip: "파도가 철썩이는 따뜻한 바닷가예요." },
  ancient: { kr: "고대의, 아주 오래된", phonetic: "/ˈeɪn.ʃənt/", pos: "형용사", tip: "오랜 세월 동안 전해진 신비한 보물!" },
  hidden: { kr: "숨겨진", phonetic: "/ˈhɪd.ən/", pos: "분사", tip: "꼭꼭 숨어 있어서 찾으면 기쁜 상태예요." },
  kept: { kr: "유지되는, 지켜진", phonetic: "/kept/", pos: "분사", tip: "깨끗하고 안전하게 계속 유지되는 모습이에요." },
  cave: { kr: "동굴", phonetic: "/keɪv/", pos: "명사", tip: "바닷속 신비한 보물이 숨겨진 동굴!" },
  remember: { kr: "기억하다", phonetic: "/rɪˈmem.bər/", pos: "동사", tip: "배운 내용을 머릿속에 꼭 담아 기억해요." },
  // Common kids story words & verbs
  happy: { kr: "행복한", phonetic: "/ˈhæp.i/", pos: "형용사", tip: "미소가 절로 나오는 기분 좋은 날이에요!" },
  sad: { kr: "슬픈", phonetic: "/sæd/", pos: "형용사", tip: "마음이 울적할 때 쓰는 감정 표현이에요." },
  big: { kr: "커다란", phonetic: "/bɪɡ/", pos: "형용사", tip: "고래처럼 큼직하고 웅장한 크기예요." },
  small: { kr: "작은", phonetic: "/smɔːl/", pos: "형용사", tip: "진주나 조개처럼 앙증맞은 크기예요." },
  little: { kr: "작은, 귀여운", phonetic: "/ˈlɪt.əl/", pos: "형용사", tip: "작고 사랑스러운 느낌을 담아 말할 때 써요." },
  good: { kr: "좋은, 훌륭한", phonetic: "/ɡʊd/", pos: "형용사", tip: "칭찬할 때 가장 많이 쓰는 긍정 단어!" },
  great: { kr: "멋진, 대단한", phonetic: "/ɡreɪt/", pos: "형용사", tip: "최고로 신나고 멋질 때 외쳐봐요!" },
  nice: { kr: "좋은, 다정한", phonetic: "/naɪs/", pos: "형용사", tip: "기분 좋거나 친절한 친구에게 어울려요." },
  new: { kr: "새로운", phonetic: "/njuː/", pos: "형용사", tip: "처음 만나거나 새로 시작할 때 써요." },
  old: { kr: "오래된, 나이가 든", phonetic: "/oʊld/", pos: "형용사", tip: "세월이 오래 지난 물건이나 이야기에 써요." },
  warm: { kr: "따뜻한", phonetic: "/wɔːrm/", pos: "형용사", tip: "햇살처럼 포근하고 따뜻한 느낌이에요." },
  cool: { kr: "시원한, 멋진", phonetic: "/kuːl/", pos: "형용사", tip: "바닷바람처럼 시원하거나 멋질 때 써요." },
  cold: { kr: "차가운, 추운", phonetic: "/koʊld/", pos: "형용사", tip: "얼음물처럼 서늘할 때 써요." },
  bright: { kr: "밝은, 반짝이는", phonetic: "/braɪt/", pos: "형용사", tip: "햇빛이 환하게 비치는 모습이에요." },
  soft: { kr: "부드러운", phonetic: "/sɔːft/", pos: "형용사", tip: "솜사탕이나 모래처럼 말랑한 느낌이에요." },
  red: { kr: "빨간", phonetic: "/red/", pos: "형용사", tip: "사과나 꽃게처럼 선명한 빨간색!" },
  blue: { kr: "파란, 푸른", phonetic: "/bluː/", pos: "형용사", tip: "푸른 바다와 하늘을 닮은 색이에요." },
  green: { kr: "초록빛의", phonetic: "/ɡriːn/", pos: "형용사", tip: "싱그러운 풀과 해초 색이에요." },
  yellow: { kr: "노란", phonetic: "/ˈjel.oʊ/", pos: "형용사", tip: "별빛처럼 밝은 노란색!" },
  white: { kr: "하얀", phonetic: "/waɪt/", pos: "형용사", tip: "하얀 구름과 파도 거품 같은 색!" },
  friend: { kr: "친구", phonetic: "/frend/", pos: "명사", tip: "함께 놀고 모험하는 소중한 단짝 친구!" },
  friendly: { kr: "다정한, 친근한", phonetic: "/ˈfrend.li/", pos: "형용사", tip: "먼저 웃으며 다가가는 상냥한 모습이에요." },
  family: { kr: "가족", phonetic: "/ˈfæm.ə.li/", pos: "명사", tip: "사랑하는 우리 가족을 뜻해요." },
  home: { kr: "집", phonetic: "/hoʊm/", pos: "명사", tip: "편안하게 쉬는 나의 따뜻한 집!" },
  school: { kr: "학교", phonetic: "/skuːl/", pos: "명사", tip: "친구들과 함께 배우고 노는 곳!" },
  book: { kr: "책", phonetic: "/bʊk/", pos: "명사", tip: "재미있는 상상이 담긴 이야기책!" },
  story: { kr: "이야기", phonetic: "/ˈstɔːr.i/", pos: "명사", tip: "오늘 함께 읽는 신나는 모험 이야기!" },
  sun: { kr: "해, 태양", phonetic: "/sʌn/", pos: "명사", tip: "하늘에서 반짝 빛나는 따뜻한 해!" },
  moon: { kr: "달", phonetic: "/muːn/", pos: "명사", tip: "밤바다를 비추는 환한 달님!" },
  star: { kr: "별", phonetic: "/stɑːr/", pos: "명사", tip: "반짝반짝 빛나는 밤하늘의 별!" },
  sky: { kr: "하늘", phonetic: "/skaɪ/", pos: "명사", tip: "바다와 맞닿은 드높고 푸른 하늘!" },
  tree: { kr: "나무", phonetic: "/triː/", pos: "명사", tip: "시원한 그늘을 만들어 주는 큰 나무!" },
  flower: { kr: "꽃", phonetic: "/ˈflaʊ.ər/", pos: "명사", tip: "향기롭고 알록달록 피어나는 꽃!" },
  bird: { kr: "새", phonetic: "/bɜːrd/", pos: "명사", tip: "하늘을 자유롭게 날아다니는 새!" },
  cat: { kr: "고양이", phonetic: "/kæt/", pos: "명사", tip: "야옹~ 귀여운 아기 고양이!" },
  dog: { kr: "강아지", phonetic: "/dɔːɡ/", pos: "명사", tip: "꼬리를 흔드는 씩씩한 강아지!" },
  fish: { kr: "물고기", phonetic: "/fɪʃ/", pos: "명사", tip: "바닷속을 헤엄치는 물고기 친구들!" },
  rabbit: { kr: "토끼", phonetic: "/ˈræb.ɪt/", pos: "명사", tip: "깡총깡총 귀가 긴 토끼!" },
  bear: { kr: "곰", phonetic: "/ber/", pos: "명사", tip: "듬직하고 포근한 숲속 곰!" },
  fox: { kr: "여우", phonetic: "/fɑːks/", pos: "명사", tip: "영리하고 날쌘 여우 친구!" },
  morning: { kr: "아침", phonetic: "/ˈmɔːr.nɪŋ/", pos: "명사", tip: "상쾌하게 하루를 여는 아침 시간!" },
  day: { kr: "날, 하루", phonetic: "/deɪ/", pos: "명사", tip: "햇살이 밝은 낮과 하루를 말해요." },
  night: { kr: "밤", phonetic: "/naɪt/", pos: "명사", tip: "별이 반짝이는 고요한 밤!" },
  today: { kr: "오늘", phonetic: "/təˈdeɪ/", pos: "명사", tip: "바로 지금 우리가 배우는 오늘!" },
  world: { kr: "세상, 세계", phonetic: "/wɜːrld/", pos: "명사", tip: "우리가 함께 탐험할 넓은 세상!" },
  song: { kr: "노래", phonetic: "/sɔːŋ/", pos: "명사", tip: "기분 좋게 흥얼거리는 신나는 노래!" },
  music: { kr: "음악", phonetic: "/ˈmjuː.zɪk/", pos: "명사", tip: "마음을 즐겁게 해주는 아름다운 음악!" },
  magic: { kr: "마법", phonetic: "/ˈmædʒ.ɪk/", pos: "명사", tip: "반짝! 신비로운 일이 일어나는 마법!" },
  dream: { kr: "꿈", phonetic: "/driːm/", pos: "명사", tip: "멋진 미래를 그리는 우리의 꿈!" },
  light: { kr: "빛, 밝은", phonetic: "/laɪt/", pos: "명사", tip: "어둠을 환하게 비춰주는 빛!" },
  food: { kr: "음식", phonetic: "/fuːd/", pos: "명사", tip: "맛있게 먹고 힘을 내는 음식!" },
  park: { kr: "공원", phonetic: "/pɑːrk/", pos: "명사", tip: "뛰어놀기 좋은 넓은 공원!" },
  forest: { kr: "숲", phonetic: "/ˈfɔːr.ɪst/", pos: "명사", tip: "나무와 동물이 어우러진 푸른 숲!" },
  river: { kr: "강", phonetic: "/ˈrɪv.ər/", pos: "명사", tip: "바다로 흘러가는 시원한 강물!" },
  rain: { kr: "비", phonetic: "/reɪn/", pos: "명사", tip: "톡톡 내리는 시원한 빗방울!" },
  wind: { kr: "바람", phonetic: "/wɪnd/", pos: "명사", tip: "살랑살랑 불어오는 상쾌한 바람!" },
  play: { kr: "놀다, 연주하다", phonetic: "/pleɪ/", pos: "동사", tip: "친구들과 신나게 어울려 노는 말이에요!" },
  like: { kr: "좋아하다, ~처럼", phonetic: "/laɪk/", pos: "동사", tip: "마음에 쏙 들 때 자신 있게 말해요!" },
  love: { kr: "사랑하다, 아주 좋아하다", phonetic: "/lʌv/", pos: "동사", tip: "좋아하는 마음이 아주 클 때 써요!" },
  want: { kr: "원하다", phonetic: "/wɑːnt/", pos: "동사", tip: "하고 싶거나 갖고 싶은 걸 표현해요." },
  need: { kr: "필요하다", phonetic: "/niːd/", pos: "동사", tip: "꼭 필요한 것이 있을 때 써요." },
  help: { kr: "돕다, 도움", phonetic: "/help/", pos: "동사", tip: "친구에게 따뜻한 손길을 내밀어요." },
  go: { kr: "가다", phonetic: "/ɡoʊ/", pos: "동사", tip: "새로운 곳으로 출발할 때 써요!" },
  come: { kr: "오다", phonetic: "/kʌm/", pos: "동사", tip: "이쪽으로 가까이 올 때 써요!" },
  see: { kr: "보다", phonetic: "/siː/", pos: "동사", tip: "눈으로 자연스럽게 무언가를 봐요." },
  watch: { kr: "지켜보다", phonetic: "/wɑːtʃ/", pos: "동사", tip: "움직이는 모습을 집중해서 봐요." },
  listen: { kr: "귀 기울여 듣다", phonetic: "/ˈlɪs.ən/", pos: "동사", tip: "소리를 집중해서 들을 때 'Listen to'로 써요!" },
  speak: { kr: "말하다", phonetic: "/spiːk/", pos: "동사", tip: "영어로 또렷하게 목소리를 내요!" },
  say: { kr: "말하다", phonetic: "/seɪ/", pos: "동사", tip: "전하고 싶은 말을 입으로 표현해요." },
  tell: { kr: "들려주다, 말해주다", phonetic: "/tel/", pos: "동사", tip: "친구에게 재미있는 이야기를 들려줘요." },
  ask: { kr: "묻다, 부탁하다", phonetic: "/æsk/", pos: "동사", tip: "궁금한 점을 다정하게 물어봐요." },
  read: { kr: "읽다", phonetic: "/riːd/", pos: "동사", tip: "이야기책을 소리 내어 읽어요!" },
  learn: { kr: "배우다", phonetic: "/lɜːrn/", pos: "동사", tip: "새로운 표현을 내 것으로 배워요!" },
  know: { kr: "알다", phonetic: "/noʊ/", pos: "동사", tip: "이제 확실히 알게 되었을 때 써요!" },
  think: { kr: "생각하다", phonetic: "/θɪŋk/", pos: "동사", tip: "머릿속으로 반짝! 아이디어를 떠올려요." },
  make: { kr: "만들다", phonetic: "/meɪk/", pos: "동사", tip: "멋진 결과물이나 문장을 만들어요." },
  take: { kr: "잡다, 가져가다", phonetic: "/teɪk/", pos: "동사", tip: "손에 쥐거나 사진을 찍을 때도 써요!" },
  give: { kr: "주다", phonetic: "/ɡɪv/", pos: "동사", tip: "친구에게 선물이나 미소를 건네요." },
  get: { kr: "얻다, 받다", phonetic: "/ɡet/", pos: "동사", tip: "보물이나 답을 손에 넣어요!" },
  have: { kr: "가지다, 먹다", phonetic: "/hæv/", pos: "동사", tip: "내 소유의 물건이나 시간을 말해요." },
  run: { kr: "달리다", phonetic: "/rʌn/", pos: "동사", tip: "힘차게 씽씽 뛰어가는 모습이에요!" },
  walk: { kr: "걷다", phonetic: "/wɔːk/", pos: "동사", tip: "한 걸음씩 천천히 산책해요." },
  fly: { kr: "날다", phonetic: "/flaɪ/", pos: "동사", tip: "하늘을 훨훨 날아오르는 동작이에요." },
  sing: { kr: "노래하다", phonetic: "/sɪŋ/", pos: "동사", tip: "목소리를 높여 신나게 노래해요!" },
  dance: { kr: "춤추다", phonetic: "/dæns/", pos: "동사", tip: "음악에 맞춰 몸을 흔들며 춤춰요!" },
  smile: { kr: "미소 짓다", phonetic: "/smaɪl/", pos: "동사", tip: "환하게 웃는 예쁜 얼굴이에요." },
  laugh: { kr: "소리 내어 웃다", phonetic: "/læf/", pos: "동사", tip: "하하호호 즐겁게 웃는 소리예요." },
  share: { kr: "나누다, 공유하다", phonetic: "/ʃer/", pos: "동사", tip: "친구와 즐거운 마음을 함께 나눠요." },
  eat: { kr: "먹다", phonetic: "/iːt/", pos: "동사", tip: "맛있는 간식을 냠냠 먹어요." },
  sleep: { kr: "자다", phonetic: "/sliːp/", pos: "동사", tip: "달콤한 꿈나라로 쿨쿨 자요." },
  live: { kr: "살다", phonetic: "/lɪv/", pos: "동사", tip: "어디에 살고 있는지 말할 때 써요." },
  open: { kr: "열다", phonetic: "/ˈoʊ.pən/", pos: "동사", tip: "보물상자나 책을 활짝 열어요!" },
  close: { kr: "닫다", phonetic: "/kloʊz/", pos: "동사", tip: "조용히 문이나 상자를 닫아요." },
  feel: { kr: "느끼다", phonetic: "/fiːl/", pos: "동사", tip: "마음이나 촉감을 생생하게 느껴요." },
  try: { kr: "시도하다, 노력하다", phonetic: "/traɪ/", pos: "동사", tip: "포포처럼 용기 내어 도전해요!" },
  all: { kr: "모든, 모두", phonetic: "/ɔːl/", pos: "형용사", tip: "하나도 빠짐없이 다 함께!" },
  many: { kr: "많은", phonetic: "/ˈmen.i/", pos: "형용사", tip: "셀 수 있는 것이 아주 많을 때 써요." },
  every: { kr: "모든, 매~", phonetic: "/ˈev.ri/", pos: "형용사", tip: "매일, 모든 친구를 말할 때 꼭 써요!" },
  always: { kr: "항상, 언제나", phonetic: "/ˈɔːl.weɪz/", pos: "부사", tip: "변함없이 언제나 그렇다는 뜻이에요." },
  very: { kr: "매우, 아주", phonetic: "/ˈver.i/", pos: "부사", tip: "뒤에 오는 말을 더 크게 강조해 줘요!" },
  high: { kr: "높이, 높은", phonetic: "/haɪ/", pos: "부사", tip: "파도 위로 솟구쳐 오르는 높은 느낌!" },
  fast: { kr: "빠른, 빠르게", phonetic: "/fæst/", pos: "형용사", tip: "번개처럼 쏜살같이 빠른 모습!" },
  slowly: { kr: "천천히", phonetic: "/ˈsloʊ.li/", pos: "부사", tip: "차분하게 한 걸음씩 천천히!" },
  my: { kr: "나의", phonetic: "/maɪ/", pos: "소유격", tip: "내 것, 내 친구를 말할 때 붙여요." },
  your: { kr: "너의", phonetic: "/jʊr/", pos: "소유격", tip: "네가 가진 것을 말할 때 써요." },
  our: { kr: "우리의", phonetic: "/ˈaʊ.ər/", pos: "소유격", tip: "우리 모두의 소중한 이야기!" },
  their: { kr: "그들의", phonetic: "/ðer/", pos: "소유격", tip: "친구들의 것을 가리킬 때 써요." },
  with_us: { kr: "우리와 함께", phonetic: "/wɪð ʌs/", pos: "구", tip: "모두가 함께 모험하는 표현!" }
};

const IRREGULAR_MAP = {
  found: "find",
  saw: "see",
  went: "go",
  came: "come",
  made: "make",
  took: "take",
  gave: "give",
  got: "get",
  had: "have",
  said: "say",
  told: "tell",
  felt: "feel",
  knew: "know",
  thought: "think",
  ate: "eat",
  slept: "sleep",
  ran: "run",
  swam: "swims",
  flew: "fly",
  sang: "sing"
};

function lookupLexiconWithStemming(rawWord) {
  const clean = String(rawWord || "").replace(/[^a-zA-Z]/g, "").toLowerCase();
  if (!clean) return null;
  if (OCEAN_LEXICON[clean]) {
    return { base: clean, ...OCEAN_LEXICON[clean] };
  }

  // Irregular past
  if (IRREGULAR_MAP[clean] && OCEAN_LEXICON[IRREGULAR_MAP[clean]]) {
    const baseEntry = OCEAN_LEXICON[IRREGULAR_MAP[clean]];
    return {
      base: clean,
      kr: `${baseEntry.kr.split(",")[0]} (과거)`,
      phonetic: `/${clean}/`,
      pos: "동사(과거)",
      tip: `'${IRREGULAR_MAP[clean]}'의 과거형 표현이에요! ${baseEntry.tip}`
    };
  }

  // Stemming rules: -ies -> -y, -es/-s, -ing, -ed, -ly
  const candidates = [];
  if (clean.endsWith("ies") && clean.length > 4) {
    candidates.push({ root: clean.slice(0, -3) + "y", suffix: "s" });
  }
  if (clean.endsWith("es") && clean.length > 3) {
    candidates.push({ root: clean.slice(0, -2), suffix: "s" });
  }
  if (clean.endsWith("s") && clean.length > 2) {
    candidates.push({ root: clean.slice(0, -1), suffix: "s" });
  }
  if (clean.endsWith("ing") && clean.length > 5) {
    const stem = clean.slice(0, -3);
    candidates.push({ root: stem, suffix: "ing" });
    candidates.push({ root: stem + "e", suffix: "ing" });
    if (stem.length > 2 && stem[stem.length - 1] === stem[stem.length - 2]) {
      candidates.push({ root: stem.slice(0, -1), suffix: "ing" });
    }
  }
  if (clean.endsWith("ed") && clean.length > 4) {
    const stem = clean.slice(0, -2);
    candidates.push({ root: stem, suffix: "ed" });
    candidates.push({ root: stem + "e", suffix: "ed" });
  }
  if (clean.endsWith("ly") && clean.length > 4) {
    candidates.push({ root: clean.slice(0, -2), suffix: "ly" });
  }

  for (const cand of candidates) {
    const found = OCEAN_LEXICON[cand.root];
    if (found) {
      let kr = found.kr;
      if (cand.suffix === "ing") kr = `${found.kr.split(",")[0]} (~하고 있는)`;
      else if (cand.suffix === "ed") kr = `${found.kr.split(",")[0]} (~했다/된)`;
      else if (cand.suffix === "ly") kr = `${found.kr.split(",")[0]} (~하게)`;
      return {
        base: clean,
        kr,
        phonetic: `/${clean}/`,
        pos: found.pos,
        tip: `'${cand.root}'에서 변화한 말이에요! ${found.tip}`
      };
    }
  }
  return null;
}

const KNOWN_SENTENCE_KR = {
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

function synthesizePhraseKr(phrase) {
  const words = String(phrase || "")
    .split(/\s+/)
    .map((w) => w.replace(/[^a-zA-Z0-9'-]/g, ""))
    .filter(Boolean);
  if (!words.length) return "원서 구문";

  const glosses = [];
  for (const w of words) {
    const low = w.toLowerCase();
    if (["the", "a", "an"].includes(low)) continue;
    const hit = lookupLexiconWithStemming(low);
    if (hit) {
      glosses.push(hit.kr.split(",")[0].replace(/\s*\([^)]*\)/g, "").trim());
    } else if (/^[A-Z]/.test(w)) {
      glosses.push(w);
    }
  }
  if (glosses.length > 0) {
    return glosses.join(" ");
  }
  return `"${phrase}" 의미 구문`;
}

function translateSentenceToKorean(sentence) {
  const trimmed = String(sentence || "").trim();
  if (!trimmed) return "";
  if (KNOWN_SENTENCE_KR[trimmed]) return KNOWN_SENTENCE_KR[trimmed];

  const lower = trimmed.toLowerCase();
  if (lower.startsWith("look at ")) {
    const rest = trimmed.slice(8).replace(/[.!?]+$/, "");
    return `${synthesizePhraseKr(rest)}을(를) 봐!`;
  }
  if (lower.startsWith("let's ") || lower.startsWith("lets ")) {
    const rest = trimmed.replace(/^let'?s\s+/i, "").replace(/[.!?]+$/, "");
    return `함께 ${synthesizePhraseKr(rest)} 해 보자!`;
  }
  if (lower.startsWith("can you ")) {
    const rest = trimmed.slice(8).replace(/[.!?]+$/, "");
    return `${synthesizePhraseKr(rest)} 할 수 있나요?`;
  }
  if (lower.startsWith("do you ")) {
    const rest = trimmed.slice(7).replace(/[.!?]+$/, "");
    return `여러분은 ${synthesizePhraseKr(rest)} 하나요?`;
  }

  const body = trimmed.replace(/[.!?]+$/, "");
  const phraseKr = synthesizePhraseKr(body);
  return trimmed.endsWith("?")
    ? `${phraseKr}인가요?`
    : `${phraseKr} 이야기 문장이에요.`;
}

function generateBookSpeakingQuestions(sentences, vocabList, chunks, coreExpressions) {
  const questions = [];
  const exps = (coreExpressions && coreExpressions.length) ? coreExpressions : [];
  const usedTargets = new Set();

  if (exps[0]) {
    const e1 = exps[0];
    usedTargets.add(e1.expression);
    questions.push({
      en: `Can you use today's expression "${e1.expression}" to tell Popo what happens?`,
      kr: `[핵심 표현 말하기] 오늘 배운 표현 '${e1.expression}'(${e1.meaning_kr})를 넣어서 포포에게 영어로 크게 말해 볼까요?`,
      target: e1.expression,
      expression: e1.expression
    });
  }

  if (exps[1]) {
    const e2 = exps[1];
    usedTargets.add(e2.expression);
    questions.push({
      en: `How can you say "${e2.meaning_kr}" in English using the pattern from our book?`,
      kr: `[표현 응용 퀴즈] 원서에서 배운 표현을 떠올리며 '${e2.meaning_kr}'를 영어로 말해 볼래요? (힌트: ${e2.expression})`,
      target: e2.expression,
      expression: e2.expression
    });
  }

  // Personal / real-world expression transfer question using a learned verb/noun/expression
  const anchorExpr = exps[2] || exps[0] || { expression: sentences[0] || "Look at this!", meaning_kr: "오늘 배운 멋진 문장" };
  const sampleWord = vocabList.find((v) => !["the", "and", "is", "are", "with", "into"].includes(v.word)) || vocabList[0];
  questions.push({
    en: sampleWord
      ? `Think about your own day! Using "${anchorExpr.expression}" or "${sampleWord.word}", share a fun English sentence with Popo!`
      : `Great job! Say "${anchorExpr.expression}" out loud with a big ocean explorer voice!`,
    kr: sampleWord
      ? `[내 이야기로 표현 확장] 꼭 책 내용과 똑같지 않아도 좋아요! 배운 표현 '${anchorExpr.expression}'이나 단어 '${sampleWord.word}(${sampleWord.meaning_kr})'를 써서 자신 있게 말해보세요!`
      : `[자신감 발화 미션] 원서에서 배운 '${anchorExpr.expression}' 표현을 신나는 탐험가 목소리로 외쳐 보세요!`,
    target: anchorExpr.expression,
    expression: anchorExpr.expression
  });

  if (sentences.length > 0) {
    const firstSent = sentences[0];
    if (!usedTargets.has(firstSent)) {
      questions.push({
        en: `Let's put everything together! Can you say "${firstSent}" smoothly?`,
        kr: `[문장 완성 도전] 배운 단어와 구를 이어서 "${firstSent}" 한 문장을 멋지게 말해 볼까요?`,
        target: firstSent,
        expression: firstSent
      });
    }
  }

  return questions.slice(0, 4);
}

/**
 * Extracts vocabulary (including per-word Korean glosses), breathing chunks,
 * sentence-by-sentence Korean translations, and expression speaking questions.
 */
function analyzeTextWithLLM(rawText, level = "Level 2", customKoreanText = "") {
  const cleanText = rawText.trim().replace(/\s+/g, " ");
  const sentences = cleanText
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);

  // 1. Extract ALL unique story words (prioritizing content words, up to 45 words so every word has DB meaning!)
  const functionSkipForFlashcard = new Set(["the", "a", "an", "and", "but", "or", "is", "are", "was", "were", "in", "on", "at", "to", "for", "of", "by"]);
  const wordsSeen = new Set();
  const contentVocab = [];
  const supportVocab = [];
  const rawTokens = cleanText.split(/\s+/);

  for (const token of rawTokens) {
    const cleanWord = token.replace(/[^a-zA-Z]/g, "").toLowerCase();
    if (cleanWord.length < 1 || wordsSeen.has(cleanWord)) continue;
    wordsSeen.add(cleanWord);

    const entry = lookupLexiconWithStemming(cleanWord) || {
      kr: `${cleanWord} (스토리 어휘)`,
      phonetic: `/${cleanWord}/`,
      pos: cleanWord.length <= 3 ? "기본어" : "핵심어",
      tip: "포포와 함께 소리를 들으며 뜻을 익혀 보세요!"
    };

    const item = {
      word: cleanWord,
      surface: token.replace(/[^a-zA-Z'-]/g, "") || cleanWord,
      meaning_kr: entry.kr,
      phonetic: entry.phonetic,
      pos: entry.pos,
      popo_tip: entry.tip
    };

    if (cleanWord.length >= 3 && !functionSkipForFlashcard.has(cleanWord)) {
      contentVocab.push(item);
    } else {
      supportVocab.push(item);
    }
  }

  const vocabList = [...contentVocab, ...supportVocab].slice(0, 45);

  // 2. Split into native breathing chunks (구 단위)
  const chunks = [];
  const prepositionsAndConjunctions = new Set([
    "on", "in", "at", "across", "through", "under", "over", "with", "and", "but", "where", "while", "to", "from", "by", "into", "for"
  ]);

  sentences.forEach((sentence, sIdx) => {
    const words = sentence.split(/\s+/);
    let currentChunk = [];

    words.forEach((w, idx) => {
      const bare = w.replace(/[^a-zA-Z]/g, "").toLowerCase();
      if (
        currentChunk.length >= 2 &&
        (prepositionsAndConjunctions.has(bare) || currentChunk.length >= 4) &&
        idx < words.length - 1
      ) {
        const chunkStr = currentChunk.join(" ");
        chunks.push({
          id: `chunk_${sIdx}_${chunks.length}`,
          sentence_index: sIdx,
          text: chunkStr,
          meaning_kr: translateChunkHint(chunkStr)
        });
        currentChunk = [w];
      } else {
        currentChunk.push(w);
        if (w.endsWith(",") && currentChunk.length >= 2 && idx < words.length - 1) {
          const chunkStr = currentChunk.join(" ");
          chunks.push({
            id: `chunk_${sIdx}_${chunks.length}`,
            sentence_index: sIdx,
            text: chunkStr,
            meaning_kr: translateChunkHint(chunkStr)
          });
          currentChunk = [];
        }
      }
    });

    if (currentChunk.length > 0) {
      const chunkStr = currentChunk.join(" ");
      chunks.push({
        id: `chunk_${sIdx}_${chunks.length}`,
        sentence_index: sIdx,
        text: chunkStr,
        meaning_kr: translateChunkHint(chunkStr)
      });
    }
  });

  // 3. Extract 3~5 Core Expressions
  const coreExpressions = chunks.slice(0, 4).map((c, i) => ({
    rank: i + 1,
    expression: c.text.replace(/[.,!?]+$/g, ""),
    meaning_kr: c.meaning_kr,
    pattern_note:
      i === 0
        ? "원어민 호흡 1순위 핵심 청크"
        : i === 1
        ? "장소/방향 전치사구 연결 호흡"
        : "동사 + 묘사어 리듬 청크"
  }));

  // 4. Sentence-by-sentence Korean translations (uses optional customKoreanText if entered, else auto-translates)
  const customLines = String(customKoreanText || "")
    .split(/\r?\n+/)
    .map((l) => l.trim())
    .filter(Boolean);
  const sentenceTranslations = sentences.map((sent, idx) => ({
    index: idx,
    en: sent,
    kr: customLines[idx] || translateSentenceToKorean(sent)
  }));

  // 5. Expression-based speaking questions for Page 3 & Week 3/4
  const speakingQuestions = generateBookSpeakingQuestions(sentences, vocabList, chunks, coreExpressions);

  return {
    level,
    extracted_at: new Date().toISOString(),
    vocab: vocabList,
    chunks,
    core_expressions: coreExpressions,
    sentence_translations: sentenceTranslations,
    speaking_questions: speakingQuestions
  };
}

function translateChunkHint(chunkText) {
  const lower = String(chunkText || "").toLowerCase();
  if (lower.includes("look at the starfish")) return "저 불가사리를 봐";
  if (lower.includes("shining on the sandy floor")) return "모래 바닥 위에서 반짝이고 있는";
  if (lower.includes("baby whale popo")) return "아기 고래 포포는";
  if (lower.includes("swims across")) return "산호초를 힘차게 가로질러 헤엄쳐요";
  if (lower.includes("coral reef")) return "아름다운 산호초 숲을";
  if (lower.includes("gentle sea turtle")) return "다정한 바다거북 한 마리가";
  if (lower.includes("glides through")) return "미끄러지듯 나아가요";
  if (lower.includes("clear water")) return "맑고 투명한 바닷물 사이로";
  if (lower.includes("together")) return "친구들과 다 함께,";
  if (lower.includes("find a golden treasure")) return "황금빛 보물 상자를 발견해요";
  if (lower.includes("under the sea")) return "바닷속 깊은 곳에서";
  if (lower.includes("protected by")) return "따뜻한 해류에 의해 안전하게 보호받아요";
  if (lower.includes("glowing cave")) return "은은하게 빛나는 동굴을 탐험해요";
  if (lower.includes("ancient pearls")) return "고대 진주들이 숨겨진 곳을";
  if (lower.includes("kept clean")) return "깨끗하게 유지되는지를";
  if (lower.includes("big water bubble")) return "커다란 물방울을 불어요";
  if (lower.includes("soft waves")) return "부드러운 파도 위로";
  if (lower.includes("red crab")) return "춤추고 있는 빨간 꽃게를";
  return synthesizePhraseKr(chunkText);
}

/**
 * Evaluates student speech in Week 3 and produces the strict 3-step Popo response JSON
 */
function evaluatePopoSpeech({ transcript, bookId, targetChunk, popoQuestion }) {
  const raw = (transcript || "").trim();
  const normalized = raw.toLowerCase().replace(/[^a-z\s]/g, "").replace(/\s+/g, " ").trim();
  const target = (targetChunk || "look at the starfish").toLowerCase().trim();

  // Case 1: Student used "see" instead of "look at" (matches the master spec scenario!)
  if (normalized.includes("see") && normalized.includes("starfish")) {
    return {
      ...POPO_MASTER_PROMPT_SPEC,
      student_utterance: raw,
      evaluation_status: "NEEDS_NUANCE_COACHING",
      accuracy_score: 82,
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
  }

  // Case 2: Student matched target chunk well ("look at the starfish")
  if (normalized.includes("look at") && normalized.includes("starfish")) {
    return {
      agent_config: POPO_MASTER_PROMPT_SPEC.agent_config,
      quiz_session: {
        book_id: bookId || POPO_MASTER_PROMPT_SPEC.quiz_session.book_id,
        target_chunk: target,
        popo_question: popoQuestion || POPO_MASTER_PROMPT_SPEC.quiz_session.popo_question
      },
      student_utterance: raw,
      evaluation_status: "PERFECT_BREACH",
      accuracy_score: 98,
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

  // Case 3: Partial match or other creative attempt
  const targetWords = target.split(" ");
  const matchedWords = targetWords.filter((w) => normalized.includes(w));
  const hitWord = matchedWords[0] || "바다 친구";

  return {
    agent_config: POPO_MASTER_PROMPT_SPEC.agent_config,
    quiz_session: {
      book_id: bookId || POPO_MASTER_PROMPT_SPEC.quiz_session.book_id,
      target_chunk: target,
      popo_question: popoQuestion || POPO_MASTER_PROMPT_SPEC.quiz_session.popo_question
    },
    student_utterance: raw || "(작은 물방울 소리)",
    evaluation_status: "GENTLE_RETRY",
    accuracy_score: Math.max(65, Math.min(88, matchedWords.length * 22)),
    popo_response_template: {
      step1_encourage: `💦 푸슈! 용기 있게 마이크에 대고 '${raw || hitWord}'라고 말해줘서 고마워! 포포가 물방울 박수를 보내줄게!`,
      step2_correction: `이번 탐험 암호는 '${targetChunk || "Look at the starfish"}'야! 이렇게 리듬을 타듯 붙여서 말하면 포포가 더 높이 점프할 수 있어!`,
      step3_retry: `진주조개 마이크가 반짝이고 있어! 포포를 따라 큰 소리로 다시 말해볼까? '${targetChunk || "Look at the starfish"}!'`,
      expected_next_action: "activate_pearl_mic_recording"
    }
  };
}

/**
 * Generates 3 tailored questions for the 4th-week Native Teacher Video Class
 * based on Weeks 1~3 STT weaknesses and book theme.
 */
function generateTeacherQuestions({ studentName, bookTitle, weakPoints, strongPoints, coreExpressions = [] }) {
  if (Array.isArray(coreExpressions) && coreExpressions.length > 0 && !String(bookTitle || "").includes("Ocean Friends")) {
    const e1 = coreExpressions[0];
    const e2 = coreExpressions[1] || e1;
    const e3 = coreExpressions[2] || e1;
    return [
      {
        id: "q1",
        category: "핵심 표현 실전 적용",
        question_en: `Hi ${studentName}! In "${bookTitle}", we learned "${e1.expression}". Can you make your own sentence using "${e1.expression}"?`,
        coaching_tip_kr: `학생이 배운 핵심 표현('${e1.meaning_kr}')을 본인의 일상 예시로 응용해 말하도록 격려해 주세요.`,
        target_chunk: e1.expression
      },
      {
        id: "q2",
        category: "청크 연음 & 리듬 코칭",
        question_en: `Let's practice speaking "${e2.expression}" smoothly in one breath. Can you tell me what "${e2.expression}" means to you?`,
        coaching_tip_kr: `2주차 구 단위 끊어 읽기에서 익힌 '${e2.meaning_kr}' 호흡 리듬이 끊어지지 않고 이어지도록 칭찬해 주세요.`,
        target_chunk: e2.expression
      },
      {
        id: "q3",
        category: "자유 상상 & 확장 질문",
        question_en: `If you tell a friend about "${bookTitle}", how can you use "${e3.expression}" in a fun conversation?`,
        coaching_tip_kr: `책 내용 암기가 아니라, 배운 표현('${e3.expression}')을 자기 생각과 연결해 발화하도록 마무리해 주세요.`,
        target_chunk: e3.expression
      }
    ];
  }

  return [
    {
      id: "q1",
      category: "취약 표현 교정 (see vs look at 뉘앙스)",
      question_en: `Hi ${studentName}! In the story "${bookTitle}", Popo found something shining on the sandy floor. Can you tell me what to look at using "Look at the ~"?`,
      coaching_tip_kr: `학생이 3주차 STT에서 'see the starfish'를 먼저 발화했습니다. 자연스럽게 'Look at the starfish!'를 유도하고 교실 주변 사물로 확장해 주세요.`,
      target_chunk: "Look at the shining starfish!"
    },
    {
      id: "q2",
      category: "발음 집중 케어 (/θ/ & /f/ 발음 호흡 연결)",
      question_en: `How does the gentle sea turtle move through the clear water? Let's say "glides through the clear water" together!`,
      coaching_tip_kr: `2주차 파도 타기 낭독에서 'through(/θruː/)'와 'starfish(/f/)' 발음 시 호흡이 끊기는 패턴이 관찰되었습니다. 연음 리듬을 칭찬과 함께 가이드해 주세요.`,
      target_chunk: "glides through the clear water"
    },
    {
      id: "q3",
      category: "스토리 확장 & 상상 발화 (강점 표현 활용)",
      question_en: `At the end, Popo and friends opened the golden treasure chest! If YOU found a treasure chest under the sea, what would be inside?`,
      coaching_tip_kr: `학생의 강점 표현인 'under the sea', 'golden treasure'를 활용하여 스스로 완벽한 문장을 만들어 성취감을 느끼도록 마무리해 주세요.`,
      target_chunk: "I found a glowing pearl under the sea!"
    }
  ];
}

/**
 * External LLM API Integration (OpenAI / Gemini) for Storybook Analysis
 * - Reads LLM_PROVIDER ('auto' | 'openai' | 'gemini' | 'local')
 * - Reads OPENAI_API_KEY (+ OPENAI_MODEL) or GEMINI_API_KEY (+ GEMINI_MODEL)
 * - Falls back seamlessly to built-in deterministic analyzer when no API key is configured.
 */
async function analyzeTextWithExternalLLM(rawText, level = "Level 2") {
  const providerPref = String(process.env.LLM_PROVIDER || "auto").toLowerCase();
  if (providerPref === "local") return null;

  const openaiKey = process.env.OPENAI_API_KEY || "";
  const geminiKey = process.env.GEMINI_API_KEY || "";
  const useOpenAI = (providerPref === "openai" || (providerPref === "auto" && openaiKey)) && Boolean(openaiKey);
  const useGemini = !useOpenAI && (providerPref === "gemini" || providerPref === "auto") && Boolean(geminiKey);

  if (!useOpenAI && !useGemini) return null;

  const systemPrompt =
    "You are an elementary English storybook curriculum analyzer for Korean students (BADA English). " +
    "Return ONLY valid JSON with keys: vocab, chunks, core_expressions, sentence_translations, speaking_questions. " +
    "1) vocab: array of {word (lowercase), surface (exact token in story), meaning_kr (natural Korean gloss for this story's context), phonetic (IPA like /ˈwɔː.tər/), pos (Korean POS like 명사/동사/형용사/부사/전치사/관사/대명사), popo_tip (very short 10-20 char Korean tip)}. CRITICAL: Include EVERY SINGLE unique word that appears in the story — do NOT skip short words, articles, pronouns, prepositions, plurals, or verb forms (e.g., a, the, in, my, on, is, goes, friends, flowers). " +
    "2) chunks: array of {sentence_index (0-based), text (exact English phrase substring), meaning_kr (warm fairy-tale Korean phrase meaning)}. Split EVERY sentence into natural 2-5 word reading chunks covering the whole sentence in order. " +
    "3) core_expressions: 3-4 items of {rank, expression, meaning_kr, pattern_note}. " +
    "4) sentence_translations: array of {index, en, kr} for EVERY sentence in order. CRITICAL TONE: Translate `kr` in a warm, gentle Korean children's picture-book storytelling voice (그림책 동화 구연체: ~해요, ~예요, ~보아요, ~답니다, ~했어요!). NEVER use stiff declarative '~다.' or harsh imperative '~해라/~봐라'. " +
    "5) speaking_questions: 3-4 items of {en (question encouraging the student to USE the expressions learned, not just plot trivia), kr (Korean subtitle/guide), target (expected English sample answer), expression}.";

  const userPrompt = `Level: ${level}\nStory text:\n${rawText.trim()}`;

  try {
    let rawJsonText = "";
    if (useOpenAI) {
      const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
      const resp = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${openaiKey}`
        },
        body: JSON.stringify({
          model,
          temperature: 0.25,
          max_tokens: 12000,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt }
          ]
        })
      });
      if (!resp.ok) throw new Error(`OpenAI HTTP ${resp.status}`);
      const data = await resp.json();
      rawJsonText = data?.choices?.[0]?.message?.content || "";
    } else if (useGemini) {
      const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(geminiKey)}`;
      const resp = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }] }],
          generationConfig: {
            temperature: 0.3,
            responseMimeType: "application/json"
          }
        })
      });
      if (!resp.ok) throw new Error(`Gemini HTTP ${resp.status}`);
      const data = await resp.json();
      rawJsonText = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
    }

    if (!rawJsonText) return null;
    const parsed = JSON.parse(rawJsonText);
    return {
      provider: useOpenAI ? "openai" : "gemini",
      parsed
    };
  } catch (err) {
    console.warn("⚠️ [BADA LLM] 외부 LLM 호출 실패 ➔ 내장 분석기로 자동 전환:", err.message);
    return null;
  }
}

function splitSentencesIntoPages(rawText) {
  const sentences = String(rawText || "")
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
  const pages = [];
  let buffer = [];
  let charCount = 0;

  for (const en of sentences) {
    const shouldBreakBefore =
      buffer.length >= 2 ||
      (buffer.length >= 1 && (charCount + en.length > 135 || en.length > 90));
    if (shouldBreakBefore) {
      pages.push({ page_index: pages.length, text: buffer.join(" ") });
      buffer = [];
      charCount = 0;
    }
    buffer.push(en);
    charCount += en.length;
  }
  if (buffer.length > 0) {
    pages.push({ page_index: pages.length, text: buffer.join(" ") });
  }
  return pages;
}

function sanitizeSvg(svgRaw) {
  const s = String(svgRaw || "").trim();
  if (!s.includes("<svg")) return "";
  return s
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/\son[a-z]+\s*=\s*(['"]).*?\1/gi, "")
    .replace(/javascript:/gi, "");
}

function buildFallbackPageIllustrationSvg(pageText) {
  const t = String(pageText || "").toLowerCase();
  const isOcean = /ocean|sea|whale|starfish|coral|turtle|bubble|dolphin|crab|water|current|cave|pearl|island/.test(t);
  const bgTop = isOcean ? "#bae6fd" : "#fef3c7";
  const bgBot = isOcean ? "#67e8f9" : "#d9f99d";
  const ground = isOcean ? "#fde68a" : "#86efac";

  const elements = [];
  if (/starfish/.test(t)) {
    elements.push(`<polygon points="90,95 97,112 115,112 101,123 106,140 90,130 74,140 79,123 65,112 83,112" fill="#fb923c" stroke="#ea580c" stroke-width="2"/><circle cx="86" cy="116" r="2" fill="#1e293b"/><circle cx="94" cy="116" r="2" fill="#1e293b"/>`);
  }
  if (/whale|popo/.test(t)) {
    elements.push(`<ellipse cx="185" cy="70" rx="46" ry="26" fill="#38bdf8"/><path d="M225 70 Q245 55 252 62 Q245 72 252 82 Q242 84 225 70" fill="#0284c7"/><circle cx="158" cy="66" r="3" fill="#1e293b"/><path d="M154 75 Q162 81 170 75" stroke="#1e293b" stroke-width="2" fill="none" stroke-linecap="round"/>`);
  }
  if (/turtle/.test(t)) {
    elements.push(`<ellipse cx="260" cy="86" rx="24" ry="16" fill="#34d399" stroke="#059669" stroke-width="2"/><circle cx="288" cy="82" r="9" fill="#6ee7b7"/><circle cx="291" cy="80" r="2" fill="#1e293b"/>`);
  }
  if (/treasure|chest|pearl/.test(t)) {
    elements.push(`<rect x="155" y="102" width="46" height="28" rx="4" fill="#d97706" stroke="#92400e" stroke-width="2"/><rect x="153" y="96" width="50" height="10" rx="4" fill="#fbbf24"/><circle cx="178" cy="108" r="5" fill="#fef08a"/>`);
  }
  if (/tree|yard|flower|garden/.test(t)) {
    elements.push(`<rect x="82" y="74" width="14" height="44" rx="3" fill="#92400e"/><circle cx="89" cy="58" r="26" fill="#22c55e"/><circle cx="74" cy="64" r="18" fill="#4ade80"/><circle cx="104" cy="64" r="18" fill="#4ade80"/>`);
  }
  if (/owl|hoo|school|backpack/.test(t)) {
    elements.push(`<ellipse cx="180" cy="82" rx="22" ry="26" fill="#a78bfa"/><circle cx="172" cy="74" r="6" fill="white"/><circle cx="188" cy="74" r="6" fill="white"/><circle cx="172" cy="74" r="2.5" fill="#1e293b"/><circle cx="188" cy="74" r="2.5" fill="#1e293b"/><polygon points="180,79 176,84 184,84" fill="#f59e0b"/>`);
  }
  if (elements.length === 0) {
    elements.push(`<circle cx="180" cy="72" r="26" fill="#38bdf8"/><circle cx="172" cy="68" r="3" fill="#1e293b"/><circle cx="188" cy="68" r="3" fill="#1e293b"/><path d="M172 78 Q180 85 188 78" stroke="#1e293b" stroke-width="2" fill="none" stroke-linecap="round"/>`);
  }

  return `<svg viewBox="0 0 360 150" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="${bgTop}"/><stop offset="100%" stop-color="${bgBot}"/></linearGradient></defs><rect width="360" height="150" rx="12" fill="url(#bg)"/><path d="M0 116 Q90 106 180 116 T360 116 L360 150 L0 150 Z" fill="${ground}"/>${elements.join("")}</svg>`;
}

async function generatePageIllustrationsWithLLM({ title = "", fullText = "", level = "Level 2" }) {
  const pages = splitSentencesIntoPages(fullText);
  if (pages.length === 0) return [];

  const openaiKey = process.env.OPENAI_API_KEY || "";
  if (!openaiKey) {
    return [];
  }

  try {
    const pagesPrompt = pages.map((p) => `Page ${p.page_index}: "${p.text}"`).join("\n");
    const resp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${openaiKey}`
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-4o-mini",
        temperature: 0.25,
        max_tokens: 4000,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "You are a children's picture-book art director ensuring 100% visual consistency across every page of ONE storybook. " +
              "Step 1: Define `art_style_bible` (consistent 3D painterly picture-book style, lighting, and pastel color palette for the whole book) and `character_sheet` (exact fixed visual design of EVERY character — colors, clothes/accessories, species — AND species rule: if the protagonist is an owl or woodland animal like Little Hoo, ALL classmates, teachers, and background characters MUST also be cute woodland animals like owls, bunnies, squirrels, bears, NEVER human children; if Popo is a baby blue whale, Popo always has the exact same sky-blue body, cream belly, big smiling eyes, and ocean friends). " +
              "Step 2: For each page, write `scene_action` describing the exact pose, setting, and EVERY concrete noun/object on that page so young students can understand the English text visually, with NO text or letters anywhere in the image. " +
              "Return ONLY JSON: { \"art_style_bible\": \"...\", \"character_sheet\": \"...\", \"pages\": [ { \"page_index\": 0, \"scene_caption_kr\": \"짧은 한국어 장면 설명 (~해요 체)\", \"key_objects\": [\"starfish\", \"sandy floor\"], \"scene_action\": \"...\" } ] }."
          },
          {
            role: "user",
            content: `Book Title: ${title}\nLevel: ${level}\nFull Story:\n${fullText}\n\nPages:\n${pagesPrompt}`
          }
        ]
      })
    });

    if (!resp.ok) throw new Error(`OpenAI Scene Prompt HTTP ${resp.status}`);
    const data = await resp.json();
    const parsed = JSON.parse(data?.choices?.[0]?.message?.content || "{}");
    const styleBible = String(
      parsed.art_style_bible ||
        "Consistent warm Pixar-style 3D painterly children's picture-book illustration, soft sunlit pastel palette, gentle rounded shapes, NO text or letters anywhere."
    ).trim();
    const characterSheet = String(parsed.character_sheet || "").trim();
    const llmPages = Array.isArray(parsed.pages) ? parsed.pages : [];

    const results = [];
    for (const p of pages) {
      const match = llmPages.find((lp) => Number(lp.page_index) === p.page_index) || llmPages[p.page_index];
      const sceneAction = String(match?.scene_action || match?.image_prompt || p.text).trim();
      const visualPrompt = `${styleBible} ${characterSheet ? `Characters (keep exact same appearance on every page): ${characterSheet}. ` : ""}Scene for this page: ${sceneAction}. Wide horizontal 3:2 storybook illustration, zero text or letters in the image.`;

      let imageUrl = "";
      try {
        let imgRes = await fetch("https://api.openai.com/v1/images/generations", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${openaiKey}`
          },
          body: JSON.stringify({
            model: process.env.OPENAI_IMAGE_MODEL || "gpt-image-1-mini",
            prompt: visualPrompt,
            size: "1536x1024",
            quality: process.env.OPENAI_IMAGE_QUALITY || "low",
            output_format: "jpeg",
            output_compression: 75
          })
        });

        if (!imgRes.ok) {
          imgRes = await fetch("https://api.openai.com/v1/images/generations", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${openaiKey}`
            },
            body: JSON.stringify({
              model: "gpt-image-1.5",
              prompt: visualPrompt,
              size: "1536x1024",
              quality: "low",
              output_format: "jpeg",
              output_compression: 75
            })
          });
        }

        if (imgRes.ok) {
          const imgData = await imgRes.json();
          const b64 = imgData?.data?.[0]?.b64_json || "";
          if (b64) {
            imageUrl = `data:image/jpeg;base64,${b64}`;
          }
        }
      } catch (imgErr) {
        console.warn(`⚠️ [BADA IMG] Page ${p.page_index} 이미지 생성 실패:`, imgErr.message);
      }

      results.push({
        page_index: p.page_index,
        scene_caption_kr: String(match?.scene_caption_kr || "이야기 장면 그림"),
        key_objects: Array.isArray(match?.key_objects) ? match.key_objects.slice(0, 5) : [],
        image_url: imageUrl
      });
    }
    return results;
  } catch (err) {
    console.warn("⚠️ [BADA IMG] 페이지 일러스트 생성 실패:", err.message);
    return [];
  }
}

async function analyzeTextWithLLMAsync(rawText, level = "Level 2", customKoreanText = "", title = "") {
  const localFallback = analyzeTextWithLLM(rawText, level, customKoreanText);
  const ext = await analyzeTextWithExternalLLM(rawText, level);
  if (!ext || !ext.parsed) {
    return { ...localFallback, llm_provider: "local_deterministic" };
  }

  const p = ext.parsed;
  const customLines = String(customKoreanText || "")
    .split(/\r?\n+/)
    .map((l) => l.trim())
    .filter(Boolean);

  const sentenceTranslations =
    Array.isArray(p.sentence_translations) && p.sentence_translations.length
      ? p.sentence_translations.map((st, idx) => ({
          index: idx,
          en: st.en || (localFallback.sentence_translations[idx] && localFallback.sentence_translations[idx].en) || "",
          kr: customLines[idx] || st.kr || (localFallback.sentence_translations[idx] && localFallback.sentence_translations[idx].kr) || ""
        }))
      : localFallback.sentence_translations;

  const llmVocab = Array.isArray(p.vocab) && p.vocab.length ? p.vocab : [];
  const coveredKeys = new Set();
  for (const v of llmVocab) {
    if (v.word) coveredKeys.add(String(v.word).toLowerCase().replace(/[^a-z']/g, ""));
    if (v.surface) coveredKeys.add(String(v.surface).toLowerCase().replace(/[^a-z']/g, ""));
  }
  const mergedVocab = [...llmVocab];
  for (const fv of localFallback.vocab || []) {
    const k = String(fv.word || "").toLowerCase().replace(/[^a-z']/g, "");
    if (k && !coveredKeys.has(k) && fv.meaning_kr && !fv.meaning_kr.includes("핵심 단어")) {
      coveredKeys.add(k);
      mergedVocab.push(fv);
    }
  }

  const pageIllustrations = await generatePageIllustrationsWithLLM({
    title,
    fullText: rawText,
    level
  });

  return {
    level,
    extracted_at: new Date().toISOString(),
    llm_provider: ext.provider,
    vocab: mergedVocab.length ? mergedVocab : localFallback.vocab,
    chunks: Array.isArray(p.chunks) && p.chunks.length ? p.chunks : localFallback.chunks,
    core_expressions:
      Array.isArray(p.core_expressions) && p.core_expressions.length
        ? p.core_expressions
        : localFallback.core_expressions,
    sentence_translations: sentenceTranslations,
    speaking_questions:
      Array.isArray(p.speaking_questions) && p.speaking_questions.length
        ? p.speaking_questions
        : localFallback.speaking_questions,
    page_illustrations: pageIllustrations
  };
}

async function analyzePronunciationWithLLM({ expectedText = "", spokenTranscript = "", level = "Level 2" }) {
  const norm = (s) =>
    String(s || "")
      .toLowerCase()
      .replace(/[^a-z0-9'\s]/g, " ")
      .split(/\s+/)
      .filter(Boolean);

  const expectedWords = [...new Set(norm(expectedText))];
  const spokenSet = new Set(norm(spokenTranscript));
  const missing = expectedWords.filter((w) => w.length > 2 && !spokenSet.has(w)).slice(0, 6);

  const openaiKey = process.env.OPENAI_API_KEY || "";
  if (openaiKey && spokenTranscript.trim()) {
    try {
      const resp = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${openaiKey}`
        },
        body: JSON.stringify({
          model: process.env.OPENAI_MODEL || "gpt-4o-mini",
          temperature: 0.3,
          max_tokens: 400,
          response_format: { type: "json_object" },
          messages: [
            {
              role: "system",
              content:
                "You are Popo, a warm elementary English pronunciation & intonation coach. " +
                "Compare the target storybook text and what the student's speech recognition produced. " +
                "Return ONLY JSON: {score (0-100), weak_words (array of up to 5 lowercase target words needing practice), pronunciation_tip_kr (1 encouraging sentence in Korean), intonation_tip_kr (1 short Korean tip on rhythm/rising-falling tone)}."
            },
            {
              role: "user",
              content: `Level: ${level}\nTarget text: ${expectedText.slice(0, 800)}\nStudent spoke: ${spokenTranscript.slice(0, 800)}`
            }
          ]
        })
      });
      if (resp.ok) {
        const data = await resp.json();
        const parsed = JSON.parse(data?.choices?.[0]?.message?.content || "{}");
        if (parsed.pronunciation_tip_kr) {
          return {
            score: Math.min(100, Math.max(40, Number(parsed.score) || 85)),
            weak_words: Array.isArray(parsed.weak_words) ? parsed.weak_words : missing,
            pronunciation_tip_kr: String(parsed.pronunciation_tip_kr),
            intonation_tip_kr: String(parsed.intonation_tip_kr || "문장 끝을 자연스럽게 올리거나 내려 읽어 보아요.")
          };
        }
      }
    } catch {
      // fallback below
    }
  }

  const ratio = expectedWords.length
    ? Math.max(0.5, (expectedWords.length - missing.length) / expectedWords.length)
    : 0.85;

  return {
    score: Math.round(ratio * 100),
    weak_words: missing,
    pronunciation_tip_kr:
      missing.length > 0
        ? `오늘 소리 내어 읽은 문장 중 ${missing.slice(0, 3).join(", ")} 단어를 단어 카드에서 한 번 더 또박또박 연습해 보아요!`
        : "모든 단어를 또박또박 아주 잘 읽었어요! 지금처럼 매일 꾸준히 소리 내어 읽어 보아요.",
    intonation_tip_kr: "문장의 끝부분(마침표는 살짝 내려주고, 물음표는 끝을 올려서)에 리듬을 실어 읽어 보면 훨씬 자연스러워져요."
  };
}

module.exports = {
  POPO_MASTER_PROMPT_SPEC,
  analyzeTextWithLLM,
  analyzeTextWithLLMAsync,
  generatePageIllustrationsWithLLM,
  analyzePronunciationWithLLM,
  evaluatePopoSpeech,
  generateTeacherQuestions
};


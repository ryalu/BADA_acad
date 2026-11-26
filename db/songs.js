/**
 * Seasonal Bonus Songs repository (PostgreSQL Primary + SQLite Auto-Fallback).
 * Supports reusable seasonal themes (Christmas, Spring, Summer, Halloween, etc.),
 * Junior & Senior tracks, YouTube URLs, uploaded MP3/audio binary BLOBs, AI lyrics analysis,
 * and 4-week student participation tracking.
 */

const { analyzeSongLyricsWithLLM } = require("../ai-engine");
const {
  getPgPool,
  getSqliteDb,
  parseJsonField,
  getKstTodayDateString
} = require("./connection");

const MAX_AUDIO_BYTES = 12 * 1024 * 1024; // 12 MB binary audio limit

const INITIAL_SEASONAL_SONGS = [
  {
    id: "song_xmas_junior",
    season_key: "christmas",
    season_label: "12월 크리스마스 스페셜",
    track: "junior",
    title: "We Wish You a Merry Christmas",
    subtitle_kr: "즐거운 크리스마스 인사 캐롤",
    artist_label: "Traditional Christmas Carol",
    is_active: true,
    youtube_url: "",
    audio_mime: "",
    audio_filename: "",
    raw_lyrics: [
      "[Chorus 1]",
      "We wish you a merry Christmas,",
      "We wish you a merry Christmas,",
      "We wish you a merry Christmas,",
      "And a happy New Year!",
      "[Verse 1]",
      "Good tidings we bring",
      "To you and your kin!",
      "We wish you a merry Christmas",
      "And a happy New Year!",
      "[Verse 2]",
      "Oh, bring us some figgy pudding,",
      "Oh, bring us some figgy pudding,",
      "Oh, bring us some figgy pudding,",
      "And bring some right here!"
    ].join("\n"),
    lines: [
      {
        index: 0,
        section: "Chorus 1",
        en: "We wish you a merry Christmas,",
        kr: "우리 모두 즐거운 크리스마스가 되기를 바라요,",
        start_sec: null,
        end_sec: null,
        blank_word: "merry",
        distractors: ["sleepy", "rainy"]
      },
      {
        index: 1,
        section: "Chorus 1",
        en: "We wish you a merry Christmas,",
        kr: "행복이 가득한 크리스마스 보내세요,",
        start_sec: null,
        end_sec: null,
        blank_word: "wish",
        distractors: ["jump", "swim"]
      },
      {
        index: 2,
        section: "Chorus 1",
        en: "We wish you a merry Christmas,",
        kr: "사랑하는 여러분의 크리스마스를 축하해요,",
        start_sec: null,
        end_sec: null,
        blank_word: "Christmas",
        distractors: ["Summer", "Monday"]
      },
      {
        index: 3,
        section: "Chorus 1",
        en: "And a happy New Year!",
        kr: "그리고 새해 복 많이 받으세요!",
        start_sec: null,
        end_sec: null,
        blank_word: "happy",
        distractors: ["cold", "small"]
      },
      {
        index: 4,
        section: "Verse 1",
        en: "Good tidings we bring",
        kr: "반갑고 기쁜 소식을 우리가 가져왔어요",
        start_sec: null,
        end_sec: null,
        blank_word: "bring",
        distractors: ["sleep", "close"]
      },
      {
        index: 5,
        section: "Verse 1",
        en: "To you and your kin!",
        kr: "여러분과 사랑하는 가족 모두에게요!",
        start_sec: null,
        end_sec: null,
        blank_word: "kin",
        distractors: ["hat", "cup"]
      },
      {
        index: 6,
        section: "Verse 1",
        en: "We wish you a merry Christmas",
        kr: "모두에게 즐거운 크리스마스를 기원해요",
        start_sec: null,
        end_sec: null,
        blank_word: "merry",
        distractors: ["angry", "quiet"]
      },
      {
        index: 7,
        section: "Verse 1",
        en: "And a happy New Year!",
        kr: "그리고 반짝이는 새해가 오기를 바라요!",
        start_sec: null,
        end_sec: null,
        blank_word: "Year",
        distractors: ["Book", "Door"]
      },
      {
        index: 8,
        section: "Verse 2",
        en: "Oh, bring us some figgy pudding,",
        kr: "오, 우리에게 달콤한 무화과 푸딩을 좀 주세요,",
        start_sec: null,
        end_sec: null,
        blank_word: "pudding",
        distractors: ["pencil", "window"]
      },
      {
        index: 9,
        section: "Verse 2",
        en: "Oh, bring us some figgy pudding,",
        kr: "맛있는 무화과 푸딩을 함께 나누어 먹어요,",
        start_sec: null,
        end_sec: null,
        blank_word: "some",
        distractors: ["none", "never"]
      },
      {
        index: 10,
        section: "Verse 2",
        en: "Oh, bring us some figgy pudding,",
        kr: "따뜻한 무화과 푸딩을 가져다 주세요,",
        start_sec: null,
        end_sec: null,
        blank_word: "figgy",
        distractors: ["salty", "windy"]
      },
      {
        index: 11,
        section: "Verse 2",
        en: "And bring some right here!",
        kr: "바로 여기로 조금만 가져다 주세요!",
        start_sec: null,
        end_sec: null,
        blank_word: "here",
        distractors: ["under", "away"]
      }
    ],
    vocab: [
      { word: "wish", meaning_kr: "바라다, 기원하다", phonetic: "/wɪʃ/", tip_kr: "We wish you~는 '~를 바라고 응원해'라는 따뜻한 인사예요!", line_index: 0 },
      { word: "merry", meaning_kr: "즐거운, 명랑한", phonetic: "/ˈmer.i/", tip_kr: "크리스마스 인사 'Merry Christmas!'에 꼭 들어가는 단어예요.", line_index: 0 },
      { word: "happy", meaning_kr: "행복한", phonetic: "/ˈhæp.i/", tip_kr: "미소가 가득하고 기분 좋을 때 쓰는 말이에요.", line_index: 3 },
      { word: "New Year", meaning_kr: "새해", phonetic: "/nuː jɪr/", tip_kr: "새로운 한 해가 시작되는 날을 말해요.", line_index: 3 },
      { word: "tidings", meaning_kr: "기쁜 소식", phonetic: "/ˈtaɪ.dɪŋz/", tip_kr: "캐롤에서 '반갑고 좋은 소식(news)'을 뜻하는 멋진 말이에요.", line_index: 4 },
      { word: "bring", meaning_kr: "가져오다", phonetic: "/brɪŋ/", tip_kr: "친구에게 선물이나 소식을 건네며 가지고 오는 동작이에요.", line_index: 4 },
      { word: "figgy pudding", meaning_kr: "무화과 푸딩", phonetic: "/ˈfɪɡ.i ˈpʊd.ɪŋ/", tip_kr: "예전 영국 크리스마스에 다 같이 나누어 먹던 전통 케이크예요.", line_index: 8 },
      { word: "right here", meaning_kr: "바로 여기에", phonetic: "/raɪt hɪr/", tip_kr: "멀리가 아니라 지금 내가 있는 '바로 여기'를 가리켜요.", line_index: 11 }
    ]
  },
  {
    id: "song_xmas_senior",
    season_key: "christmas",
    season_label: "12월 크리스마스 스페셜",
    track: "senior",
    title: "Jingle Bells",
    subtitle_kr: "신나는 눈썰매 방울 캐롤",
    artist_label: "Traditional Christmas Carol",
    is_active: true,
    youtube_url: "",
    audio_mime: "",
    audio_filename: "",
    raw_lyrics: [
      "[Verse 1]",
      "Dashing through the snow,",
      "In a one-horse open sleigh,",
      "O'er the fields we go,",
      "Laughing all the way!",
      "Bells on bobtail ring,",
      "Making spirits bright.",
      "What fun it is to ride and sing",
      "A sleighing song tonight!",
      "[Chorus]",
      "Jingle bells, jingle bells,",
      "Jingle all the way!",
      "Oh, what fun it is to ride",
      "In a one-horse open sleigh!",
      "Hey!",
      "Jingle bells, jingle bells,",
      "Jingle all the way!"
    ].join("\n"),
    lines: [
      {
        index: 0,
        section: "Verse 1",
        en: "Dashing through the snow,",
        kr: "새하얀 눈밭 사이를 씽씽 힘차게 달려가요,",
        start_sec: null,
        end_sec: null,
        blank_word: "snow",
        distractors: ["sand", "ocean"]
      },
      {
        index: 1,
        section: "Verse 1",
        en: "In a one-horse open sleigh,",
        kr: "말 한 마리가 끄는 지붕 없는 썰매를 타고요,",
        start_sec: null,
        end_sec: null,
        blank_word: "sleigh",
        distractors: ["bicycle", "submarine"]
      },
      {
        index: 2,
        section: "Verse 1",
        en: "O'er the fields we go,",
        kr: "넓고 하얀 들판 위로 우리는 달려 나아가요,",
        start_sec: null,
        end_sec: null,
        blank_word: "fields",
        distractors: ["desks", "kitchens"]
      },
      {
        index: 3,
        section: "Verse 1",
        en: "Laughing all the way!",
        kr: "가는 내내 하하호호 즐겁게 웃으면서요!",
        start_sec: null,
        end_sec: null,
        blank_word: "Laughing",
        distractors: ["Crying", "Sleeping"]
      },
      {
        index: 4,
        section: "Verse 1",
        en: "Bells on bobtail ring,",
        kr: "짧게 묶은 말 꼬리에 달린 방울이 딸랑딸랑 울려요,",
        start_sec: null,
        end_sec: null,
        blank_word: "ring",
        distractors: ["melt", "hide"]
      },
      {
        index: 5,
        section: "Verse 1",
        en: "Making spirits bright.",
        kr: "우리 마음을 밝고 반짝이게 만들어 주어요.",
        start_sec: null,
        end_sec: null,
        blank_word: "bright",
        distractors: ["dark", "heavy"]
      },
      {
        index: 6,
        section: "Verse 1",
        en: "What fun it is to ride and sing",
        kr: "썰매를 타고 노래 부르는 게 얼마나 신나는지 몰라요",
        start_sec: null,
        end_sec: null,
        blank_word: "ride",
        distractors: ["wait", "read"]
      },
      {
        index: 7,
        section: "Verse 1",
        en: "A sleighing song tonight!",
        kr: "오늘 밤 함께 부르는 신나는 썰매 노래예요!",
        start_sec: null,
        end_sec: null,
        blank_word: "tonight",
        distractors: ["yesterday", "morning"]
      },
      {
        index: 8,
        section: "Chorus",
        en: "Jingle bells, jingle bells,",
        kr: "징글벨, 징글벨, 방울 소리 울려 퍼져요,",
        start_sec: null,
        end_sec: null,
        blank_word: "bells",
        distractors: ["shoes", "clouds"]
      },
      {
        index: 9,
        section: "Chorus",
        en: "Jingle all the way!",
        kr: "가는 길 내내 딸랑딸랑 울려요!",
        start_sec: null,
        end_sec: null,
        blank_word: "way",
        distractors: ["box", "clock"]
      },
      {
        index: 10,
        section: "Chorus",
        en: "Oh, what fun it is to ride",
        kr: "오, 썰매를 타고 달리는 게 정말 신나요",
        start_sec: null,
        end_sec: null,
        blank_word: "fun",
        distractors: ["boring", "tired"]
      },
      {
        index: 11,
        section: "Chorus",
        en: "In a one-horse open sleigh!",
        kr: "말이 끄는 탁 트인 눈썰매를 타고요!",
        start_sec: null,
        end_sec: null,
        blank_word: "open",
        distractors: ["locked", "quiet"]
      },
      {
        index: 12,
        section: "Chorus",
        en: "Jingle bells, jingle bells,",
        kr: "징글벨, 징글벨, 경쾌한 방울 소리,",
        start_sec: null,
        end_sec: null,
        blank_word: "Jingle",
        distractors: ["Whisper", "Tiptoe"]
      },
      {
        index: 13,
        section: "Chorus",
        en: "Jingle all the way!",
        kr: "끝까지 신나게 종을 울려요!",
        start_sec: null,
        end_sec: null,
        blank_word: "all",
        distractors: ["half", "zero"]
      }
    ],
    vocab: [
      { word: "dashing", meaning_kr: "씽씽 달려가는", phonetic: "/ˈdæʃ.ɪŋ/", tip_kr: "dash는 바람을 가르며 재빠르게 달려가는 뜻이에요.", line_index: 0 },
      { word: "sleigh", meaning_kr: "눈썰매", phonetic: "/sleɪ/", tip_kr: "gh는 소리가 나지 않아서 '슬레이'라고 읽어요!", line_index: 1 },
      { word: "fields", meaning_kr: "들판", phonetic: "/fiːldz/", tip_kr: "눈이 소복하게 쌓인 넓은 들판을 떠올려요.", line_index: 2 },
      { word: "laughing", meaning_kr: "소리 내어 웃는", phonetic: "/ˈlæf.ɪŋ/", tip_kr: "gh가 /f/ 소리로 바뀌어 '래핑'이라고 발음해요!", line_index: 3 },
      { word: "bobtail", meaning_kr: "짧게 묶은 말 꼬리", phonetic: "/ˈbɑːb.teɪl/", tip_kr: "방울을 달기 위해 예쁘게 묶어 올린 말 꼬리를 말해요.", line_index: 4 },
      { word: "bright", meaning_kr: "밝고 활기찬", phonetic: "/braɪt/", tip_kr: "여기선 어둠을 밝히는 '신나고 환한 기분'이라는 뜻이에요.", line_index: 5 },
      { word: "spirits", meaning_kr: "기분, 마음", phonetic: "/ˈspɪr.ɪts/", tip_kr: "'make spirits bright'는 모두의 기분을 신나게 띄운다는 표현이에요.", line_index: 5 },
      { word: "tonight", meaning_kr: "오늘 밤", phonetic: "/təˈnaɪt/", tip_kr: "크리스마스이브처럼 설레는 오늘 밤을 뜻해요.", line_index: 7 }
    ]
  }
];

function formatSongRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    season_key: row.season_key || "christmas",
    season_label: row.season_label || "12월 크리스마스 스페셜",
    track: row.track === "senior" ? "senior" : "junior",
    title: row.title || "",
    subtitle_kr: row.subtitle_kr || "",
    artist_label: row.artist_label || "",
    is_active: Boolean(row.is_active),
    youtube_url: row.youtube_url || "",
    audio_mime: row.audio_mime || "",
    audio_filename: row.audio_filename || "",
    has_audio: Boolean(row.has_audio),
    raw_lyrics: row.raw_lyrics || "",
    lines: parseJsonField(row.lines_json, []),
    vocab: parseJsonField(row.vocab_json, []),
    created_at: row.created_at,
    updated_at: row.updated_at
  };
}

function formatProgressRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    user_id: row.user_id,
    song_id: row.song_id,
    week1_done: Boolean(row.week1_done),
    week2_done: Boolean(row.week2_done),
    week3_done: Boolean(row.week3_done),
    week4_done: Boolean(row.week4_done),
    practice_days: parseJsonField(row.practice_days_json, []),
    quiz_best_score: Number(row.quiz_best_score) || 0,
    recording_id: row.recording_id || null,
    updated_at: row.updated_at
  };
}

function parseAudioBase64Input(rawInput, fallbackMime = "audio/mpeg") {
  const str = String(rawInput || "").trim();
  if (!str) return null;
  let mimeType = String(fallbackMime || "audio/mpeg").trim() || "audio/mpeg";
  let base64Body = str;
  const match = /^data:([^;,\s]+);base64,(.+)$/i.exec(str);
  if (match) {
    mimeType = match[1].toLowerCase();
    base64Body = match[2];
  }
  const buffer = Buffer.from(base64Body, "base64");
  if (!buffer.length) return null;
  if (buffer.length > MAX_AUDIO_BYTES) {
    throw new Error("오디오 파일은 12MB 이하의 MP3/M4A/WAV 파일만 업로드할 수 있습니다.");
  }
  return { mimeType, buffer };
}

async function seedSeasonalSongsIfEmpty() {
  const pgPool = getPgPool();
  if (pgPool) {
    const { rows } = await pgPool.query("SELECT COUNT(*)::int AS cnt FROM seasonal_songs");
    if (rows[0].cnt > 0) return { skipped: true, count: rows[0].cnt };
    for (const s of INITIAL_SEASONAL_SONGS) {
      await pgPool.query(
        `INSERT INTO seasonal_songs (
           id, season_key, season_label, track, title, subtitle_kr, artist_label,
           is_active, youtube_url, audio_mime, audio_filename, raw_lyrics, lines_json, vocab_json
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13::jsonb,$14::jsonb)
         ON CONFLICT (id) DO NOTHING`,
        [
          s.id,
          s.season_key,
          s.season_label,
          s.track,
          s.title,
          s.subtitle_kr,
          s.artist_label,
          Boolean(s.is_active),
          s.youtube_url,
          s.audio_mime,
          s.audio_filename,
          s.raw_lyrics,
          JSON.stringify(s.lines),
          JSON.stringify(s.vocab)
        ]
      );
    }
    return { skipped: false, count: INITIAL_SEASONAL_SONGS.length, engine: "postgresql" };
  }

  const sqliteDb = getSqliteDb();
  const cntRow = sqliteDb.prepare("SELECT COUNT(*) AS cnt FROM seasonal_songs").get();
  if ((cntRow?.cnt || 0) > 0) return { skipped: true, count: cntRow.cnt };

  const now = new Date().toISOString();
  const stmt = sqliteDb.prepare(`
    INSERT OR IGNORE INTO seasonal_songs (
      id, season_key, season_label, track, title, subtitle_kr, artist_label,
      is_active, youtube_url, audio_mime, audio_filename, audio_bytes,
      raw_lyrics, lines_json, vocab_json, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  for (const s of INITIAL_SEASONAL_SONGS) {
    stmt.run(
      s.id,
      s.season_key,
      s.season_label,
      s.track,
      s.title,
      s.subtitle_kr,
      s.artist_label,
      s.is_active ? 1 : 0,
      s.youtube_url,
      s.audio_mime,
      s.audio_filename,
      null,
      s.raw_lyrics,
      JSON.stringify(s.lines),
      JSON.stringify(s.vocab),
      now,
      now
    );
  }
  return { skipped: false, count: INITIAL_SEASONAL_SONGS.length, engine: "sqlite" };
}

async function listSeasonalSongs({ activeOnly = false } = {}) {
  const pgPool = getPgPool();
  if (pgPool) {
    const whereClause = activeOnly ? "WHERE is_active = TRUE" : "";
    const { rows } = await pgPool.query(
      `SELECT id, season_key, season_label, track, title, subtitle_kr, artist_label,
              is_active, youtube_url, audio_mime, audio_filename,
              (audio_bytes IS NOT NULL AND octet_length(audio_bytes) > 0) AS has_audio,
              raw_lyrics, lines_json, vocab_json, created_at, updated_at
       FROM seasonal_songs
       ${whereClause}
       ORDER BY CASE WHEN track = 'junior' THEN 0 ELSE 1 END, created_at ASC`
    );
    return rows.map(formatSongRow);
  }

  const sqliteDb = getSqliteDb();
  const whereClause = activeOnly ? "WHERE is_active = 1" : "";
  const rows = sqliteDb
    .prepare(
      `SELECT id, season_key, season_label, track, title, subtitle_kr, artist_label,
              is_active, youtube_url, audio_mime, audio_filename,
              (audio_bytes IS NOT NULL AND length(audio_bytes) > 0) AS has_audio,
              raw_lyrics, lines_json, vocab_json, created_at, updated_at
       FROM seasonal_songs
       ${whereClause}
       ORDER BY CASE WHEN track = 'junior' THEN 0 ELSE 1 END, created_at ASC`
    )
    .all();
  return rows.map(formatSongRow);
}

async function getSeasonalSongAudio(songId) {
  const cleanId = String(songId || "").trim();
  if (!cleanId) return null;
  const pgPool = getPgPool();
  if (pgPool) {
    const { rows } = await pgPool.query(
      "SELECT audio_mime, audio_filename, audio_bytes FROM seasonal_songs WHERE id = $1 LIMIT 1",
      [cleanId]
    );
    const row = rows[0];
    if (!row || !row.audio_bytes || !row.audio_bytes.length) return null;
    return {
      mimeType: row.audio_mime || "audio/mpeg",
      filename: row.audio_filename || `${cleanId}.mp3`,
      buffer: Buffer.from(row.audio_bytes)
    };
  }

  const row = getSqliteDb()
    .prepare("SELECT audio_mime, audio_filename, audio_bytes FROM seasonal_songs WHERE id = ? LIMIT 1")
    .get(cleanId);
  if (!row || !row.audio_bytes || !row.audio_bytes.length) return null;
  return {
    mimeType: row.audio_mime || "audio/mpeg",
    filename: row.audio_filename || `${cleanId}.mp3`,
    buffer: Buffer.from(row.audio_bytes)
  };
}

function normalizeSongLines(lines, rawLyrics) {
  if (!Array.isArray(lines) || lines.length === 0) return [];
  return lines
    .map((l, idx) => ({
      index: idx,
      section: String(l?.section || "Verse").trim(),
      en: String(l?.en || "").trim(),
      kr: String(l?.kr || "").trim(),
      start_sec: l?.start_sec !== null && l?.start_sec !== undefined && l?.start_sec !== "" && Number.isFinite(Number(l.start_sec))
        ? Number(l.start_sec)
        : null,
      end_sec: l?.end_sec !== null && l?.end_sec !== undefined && l?.end_sec !== "" && Number.isFinite(Number(l.end_sec))
        ? Number(l.end_sec)
        : null,
      blank_word: String(l?.blank_word || "").trim(),
      distractors: Array.isArray(l?.distractors)
        ? l.distractors.map((d) => String(d || "").trim()).filter(Boolean).slice(0, 3)
        : []
    }))
    .filter((l) => l.en);
}

function normalizeSongVocab(vocab) {
  if (!Array.isArray(vocab)) return [];
  return vocab
    .map((v) => ({
      word: String(v?.word || "").trim(),
      meaning_kr: String(v?.meaning_kr || "").trim(),
      phonetic: String(v?.phonetic || "").trim(),
      tip_kr: String(v?.tip_kr || "").trim(),
      line_index: Number.isFinite(Number(v?.line_index)) ? Number(v.line_index) : 0
    }))
    .filter((v) => v.word);
}

async function saveSeasonalSong(payload = {}) {
  const title = String(payload.title || "").trim();
  if (!title) throw new Error("곡 제목을 입력해 주세요.");

  const seasonKey = String(payload.season_key || "christmas").replace(/[^a-z0-9_-]/gi, "").slice(0, 40) || "christmas";
  const seasonLabel = String(payload.season_label || "12월 크리스마스 스페셜").trim().slice(0, 100);
  const track = payload.track === "senior" ? "senior" : "junior";
  const subtitleKr = String(payload.subtitle_kr || "").trim().slice(0, 160);
  const artistLabel = String(payload.artist_label || "Seasonal English Song").trim().slice(0, 120);
  const isActive = payload.is_active === undefined ? true : Boolean(payload.is_active);
  const youtubeUrl = String(payload.youtube_url || "").trim().slice(0, 300);
  const rawLyrics = String(payload.raw_lyrics || "").trim();
  const clearAudio = Boolean(payload.clear_audio);

  const incomingAudio = payload.audio_base64
    ? parseAudioBase64Input(payload.audio_base64, payload.audio_mime)
    : null;
  const incomingFilename = String(payload.audio_filename || "").trim().slice(0, 160);

  let cleanLines = normalizeSongLines(payload.lines, rawLyrics);
  let cleanVocab = normalizeSongVocab(payload.vocab);

  if ((Boolean(payload.autoAnalyze) || cleanLines.length === 0) && rawLyrics) {
    const analyzed = await analyzeSongLyricsWithLLM({ title, rawLyrics, track });
    if (cleanLines.length === 0 || Boolean(payload.autoAnalyze)) {
      cleanLines = normalizeSongLines(analyzed.lines, rawLyrics);
    }
    if (cleanVocab.length === 0 || Boolean(payload.autoAnalyze)) {
      cleanVocab = normalizeSongVocab(analyzed.vocab);
    }
  }

  const rawId = String(payload.id || "").trim().replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 75);
  const songId = rawId || `song_${seasonKey}_${track}_${Date.now().toString(36)}`;
  const now = new Date().toISOString();
  const pgPool = getPgPool();

  if (pgPool) {
    const existingRes = await pgPool.query(
      "SELECT id, audio_mime, audio_filename, audio_bytes FROM seasonal_songs WHERE id = $1 LIMIT 1",
      [songId]
    );
    const existing = existingRes.rows[0] || null;
    const nextAudioBytes = clearAudio ? null : incomingAudio ? incomingAudio.buffer : existing?.audio_bytes || null;
    const nextAudioMime = clearAudio
      ? ""
      : incomingAudio
        ? incomingAudio.mimeType
        : existing?.audio_mime || "";
    const nextAudioFilename = clearAudio
      ? ""
      : incomingAudio
        ? incomingFilename || `${songId}.mp3`
        : existing?.audio_filename || "";

    await pgPool.query(
      `INSERT INTO seasonal_songs (
         id, season_key, season_label, track, title, subtitle_kr, artist_label,
         is_active, youtube_url, audio_mime, audio_filename, audio_bytes,
         raw_lyrics, lines_json, vocab_json, updated_at
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14::jsonb,$15::jsonb,NOW())
       ON CONFLICT (id) DO UPDATE SET
         season_key = EXCLUDED.season_key,
         season_label = EXCLUDED.season_label,
         track = EXCLUDED.track,
         title = EXCLUDED.title,
         subtitle_kr = EXCLUDED.subtitle_kr,
         artist_label = EXCLUDED.artist_label,
         is_active = EXCLUDED.is_active,
         youtube_url = EXCLUDED.youtube_url,
         audio_mime = EXCLUDED.audio_mime,
         audio_filename = EXCLUDED.audio_filename,
         audio_bytes = EXCLUDED.audio_bytes,
         raw_lyrics = EXCLUDED.raw_lyrics,
         lines_json = EXCLUDED.lines_json,
         vocab_json = EXCLUDED.vocab_json,
         updated_at = NOW()`,
      [
        songId,
        seasonKey,
        seasonLabel,
        track,
        title,
        subtitleKr,
        artistLabel,
        isActive,
        youtubeUrl,
        nextAudioMime,
        nextAudioFilename,
        nextAudioBytes,
        rawLyrics,
        JSON.stringify(cleanLines),
        JSON.stringify(cleanVocab)
      ]
    );
    const songs = await listSeasonalSongs();
    return songs.find((s) => s.id === songId) || null;
  }

  const sqliteDb = getSqliteDb();
  const existing = sqliteDb
    .prepare("SELECT id, audio_mime, audio_filename, audio_bytes, created_at FROM seasonal_songs WHERE id = ? LIMIT 1")
    .get(songId);
  const nextAudioBytes = clearAudio ? null : incomingAudio ? incomingAudio.buffer : existing?.audio_bytes || null;
  const nextAudioMime = clearAudio
    ? ""
    : incomingAudio
      ? incomingAudio.mimeType
      : existing?.audio_mime || "";
  const nextAudioFilename = clearAudio
    ? ""
    : incomingAudio
      ? incomingFilename || `${songId}.mp3`
      : existing?.audio_filename || "";

  sqliteDb
    .prepare(
      `INSERT INTO seasonal_songs (
         id, season_key, season_label, track, title, subtitle_kr, artist_label,
         is_active, youtube_url, audio_mime, audio_filename, audio_bytes,
         raw_lyrics, lines_json, vocab_json, created_at, updated_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         season_key = excluded.season_key,
         season_label = excluded.season_label,
         track = excluded.track,
         title = excluded.title,
         subtitle_kr = excluded.subtitle_kr,
         artist_label = excluded.artist_label,
         is_active = excluded.is_active,
         youtube_url = excluded.youtube_url,
         audio_mime = excluded.audio_mime,
         audio_filename = excluded.audio_filename,
         audio_bytes = excluded.audio_bytes,
         raw_lyrics = excluded.raw_lyrics,
         lines_json = excluded.lines_json,
         vocab_json = excluded.vocab_json,
         updated_at = excluded.updated_at`
    )
    .run(
      songId,
      seasonKey,
      seasonLabel,
      track,
      title,
      subtitleKr,
      artistLabel,
      isActive ? 1 : 0,
      youtubeUrl,
      nextAudioMime,
      nextAudioFilename,
      nextAudioBytes ? Buffer.from(nextAudioBytes) : null,
      rawLyrics,
      JSON.stringify(cleanLines),
      JSON.stringify(cleanVocab),
      existing?.created_at || now,
      now
    );

  const songs = await listSeasonalSongs();
  return songs.find((s) => s.id === songId) || null;
}

async function toggleSeasonalSong({ songId = "", isActive = true, seasonKey = "" } = {}) {
  const cleanId = String(songId || "").trim();
  const cleanSeason = String(seasonKey || "").trim();
  const activeBool = Boolean(isActive);
  const pgPool = getPgPool();

  if (pgPool) {
    if (cleanId) {
      await pgPool.query("UPDATE seasonal_songs SET is_active = $1, updated_at = NOW() WHERE id = $2", [
        activeBool,
        cleanId
      ]);
    } else if (cleanSeason) {
      await pgPool.query("UPDATE seasonal_songs SET is_active = $1, updated_at = NOW() WHERE season_key = $2", [
        activeBool,
        cleanSeason
      ]);
    } else {
      await pgPool.query("UPDATE seasonal_songs SET is_active = $1, updated_at = NOW()", [activeBool]);
    }
    return listSeasonalSongs();
  }

  const sqliteDb = getSqliteDb();
  const now = new Date().toISOString();
  const activeInt = activeBool ? 1 : 0;
  if (cleanId) {
    sqliteDb.prepare("UPDATE seasonal_songs SET is_active = ?, updated_at = ? WHERE id = ?").run(activeInt, now, cleanId);
  } else if (cleanSeason) {
    sqliteDb
      .prepare("UPDATE seasonal_songs SET is_active = ?, updated_at = ? WHERE season_key = ?")
      .run(activeInt, now, cleanSeason);
  } else {
    sqliteDb.prepare("UPDATE seasonal_songs SET is_active = ?, updated_at = ?").run(activeInt, now);
  }
  return listSeasonalSongs();
}

async function deleteSeasonalSong(songId) {
  const cleanId = String(songId || "").trim();
  if (!cleanId) throw new Error("삭제할 시즌송 ID가 필요합니다.");
  const pgPool = getPgPool();
  if (pgPool) {
    await pgPool.query("DELETE FROM seasonal_songs WHERE id = $1", [cleanId]);
    return listSeasonalSongs();
  }
  const sqliteDb = getSqliteDb();
  sqliteDb.prepare("DELETE FROM student_song_progress WHERE song_id = ?").run(cleanId);
  sqliteDb.prepare("DELETE FROM seasonal_songs WHERE id = ?").run(cleanId);
  return listSeasonalSongs();
}

async function listStudentSongProgress(userId = null) {
  const cleanUid = String(userId || "").trim();
  const pgPool = getPgPool();
  if (pgPool) {
    const { rows } = cleanUid
      ? await pgPool.query(
          "SELECT * FROM student_song_progress WHERE user_id = $1 ORDER BY updated_at DESC",
          [cleanUid]
        )
      : await pgPool.query("SELECT * FROM student_song_progress ORDER BY updated_at DESC");
    return rows.map(formatProgressRow);
  }

  const sqliteDb = getSqliteDb();
  const rows = cleanUid
    ? sqliteDb
        .prepare("SELECT * FROM student_song_progress WHERE user_id = ? ORDER BY updated_at DESC")
        .all(cleanUid)
    : sqliteDb.prepare("SELECT * FROM student_song_progress ORDER BY updated_at DESC").all();
  return rows.map(formatProgressRow);
}

async function updateStudentSongProgress({
  userId,
  songId,
  week1Done = false,
  week2Done = false,
  week3Done = false,
  week4Done = false,
  quizScore = 0,
  recordingId = ""
}) {
  const cleanUid = String(userId || "").trim();
  const cleanSongId = String(songId || "").trim();
  if (!cleanUid || !cleanSongId) {
    throw new Error("userId and songId are required.");
  }

  const rowId = `${cleanUid}::${cleanSongId}`;
  const todayKst = getKstTodayDateString();
  const numericQuizScore = Math.max(0, Math.min(100, Number(quizScore) || 0));
  const cleanRecordingId = String(recordingId || "").trim() || null;
  const pgPool = getPgPool();

  if (pgPool) {
    const existingRes = await pgPool.query(
      "SELECT * FROM student_song_progress WHERE id = $1 LIMIT 1",
      [rowId]
    );
    const prev = existingRes.rows[0] || null;
    const w1 = Boolean(prev?.week1_done) || Boolean(week1Done);
    const w2 = Boolean(prev?.week2_done) || Boolean(week2Done);
    const w3 = Boolean(prev?.week3_done) || Boolean(week3Done);
    const w4 = Boolean(prev?.week4_done) || Boolean(week4Done);
    const bestScore = Math.max(Number(prev?.quiz_best_score) || 0, numericQuizScore);
    const nextRecId = cleanRecordingId || prev?.recording_id || null;
    const prevDays = parseJsonField(prev?.practice_days_json, []);
    const nextDays = prevDays.includes(todayKst) ? prevDays : [...prevDays, todayKst];

    const { rows } = await pgPool.query(
      `INSERT INTO student_song_progress (
         id, user_id, song_id, week1_done, week2_done, week3_done, week4_done,
         practice_days_json, quiz_best_score, recording_id, updated_at
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9,$10,NOW())
       ON CONFLICT (id) DO UPDATE SET
         week1_done = EXCLUDED.week1_done,
         week2_done = EXCLUDED.week2_done,
         week3_done = EXCLUDED.week3_done,
         week4_done = EXCLUDED.week4_done,
         practice_days_json = EXCLUDED.practice_days_json,
         quiz_best_score = EXCLUDED.quiz_best_score,
         recording_id = EXCLUDED.recording_id,
         updated_at = NOW()
       RETURNING *`,
      [rowId, cleanUid, cleanSongId, w1, w2, w3, w4, JSON.stringify(nextDays), bestScore, nextRecId]
    );
    return {
      item: formatProgressRow(rows[0]),
      progress: await listStudentSongProgress(cleanUid)
    };
  }

  const sqliteDb = getSqliteDb();
  const prev = sqliteDb
    .prepare("SELECT * FROM student_song_progress WHERE id = ? LIMIT 1")
    .get(rowId);
  const w1 = Boolean(prev?.week1_done) || Boolean(week1Done) ? 1 : 0;
  const w2 = Boolean(prev?.week2_done) || Boolean(week2Done) ? 1 : 0;
  const w3 = Boolean(prev?.week3_done) || Boolean(week3Done) ? 1 : 0;
  const w4 = Boolean(prev?.week4_done) || Boolean(week4Done) ? 1 : 0;
  const bestScore = Math.max(Number(prev?.quiz_best_score) || 0, numericQuizScore);
  const nextRecId = cleanRecordingId || prev?.recording_id || null;
  const prevDays = parseJsonField(prev?.practice_days_json, []);
  const nextDays = prevDays.includes(todayKst) ? prevDays : [...prevDays, todayKst];
  const now = new Date().toISOString();

  sqliteDb
    .prepare(
      `INSERT INTO student_song_progress (
         id, user_id, song_id, week1_done, week2_done, week3_done, week4_done,
         practice_days_json, quiz_best_score, recording_id, updated_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         week1_done = excluded.week1_done,
         week2_done = excluded.week2_done,
         week3_done = excluded.week3_done,
         week4_done = excluded.week4_done,
         practice_days_json = excluded.practice_days_json,
         quiz_best_score = excluded.quiz_best_score,
         recording_id = excluded.recording_id,
         updated_at = excluded.updated_at`
    )
    .run(rowId, cleanUid, cleanSongId, w1, w2, w3, w4, JSON.stringify(nextDays), bestScore, nextRecId, now);

  const savedRow = sqliteDb.prepare("SELECT * FROM student_song_progress WHERE id = ? LIMIT 1").get(rowId);
  return {
    item: formatProgressRow(savedRow),
    progress: await listStudentSongProgress(cleanUid)
  };
}

module.exports = {
  INITIAL_SEASONAL_SONGS,
  seedSeasonalSongsIfEmpty,
  listSeasonalSongs,
  getSeasonalSongAudio,
  saveSeasonalSong,
  toggleSeasonalSong,
  deleteSeasonalSong,
  listStudentSongProgress,
  updateStudentSongProgress
};

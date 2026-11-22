export function formatTextForNaturalTts(text: string, contextNextWord = ""): string {
  const trimmed = String(text || "").trim();
  if (!trimmed) return "";

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

  return trimmed
    .replace(/^(['"“”‘’]?)A\s+/g, "$1a ")
    .replace(/([.!?]\s+)A\s+/g, "$1a ");
}

interface ExpressiveSegment {
  text: string;
  rate: number;
  pitch: number;
  pauseMs: number;
}

function buildStorybookSegments(
  spokenText: string,
  baseRate: number,
  basePitch: number
): ExpressiveSegment[] {
  const trimmed = spokenText.trim();
  if (!trimmed) return [];

  // Single word or short phrase without internal punctuation
  if (!/[.!?,;:]/.test(trimmed) || trimmed.split(/\s+/).length <= 3) {
    const isQ = trimmed.endsWith("?");
    const isExcl = trimmed.endsWith("!");
    return [
      {
        text: trimmed,
        rate: isExcl ? Math.min(1.12, baseRate * 1.03) : baseRate,
        pitch: isQ ? basePitch + 0.08 : isExcl ? basePitch + 0.09 : basePitch,
        pauseMs: 0
      }
    ];
  }

  // Split into natural storyteller clauses/sentences while keeping punctuation
  const rawParts = trimmed.match(/[^.!?,;:]+[.!?,;:]*\s*/g) || [trimmed];
  const segments: ExpressiveSegment[] = [];

  for (let i = 0; i < rawParts.length; i += 1) {
    const part = rawParts[i].trim();
    if (!part) continue;

    const hasQuotes = /["“”]/.test(part);
    const endsQuestion = /\?["”']?$/.test(part);
    const endsExclamation = /!["”']?$/.test(part);
    const endsComma = /[,;:]["”']?$/.test(part);

    let segRate = baseRate;
    let segPitch = basePitch;
    let pauseMs = 220;

    if (hasQuotes) {
      segPitch += 0.06;
    }
    if (endsQuestion) {
      segPitch += 0.08;
      segRate = Math.max(0.68, baseRate * 0.96);
      pauseMs = 280;
    } else if (endsExclamation) {
      segPitch += 0.09;
      segRate = Math.min(1.12, baseRate * 1.04);
      pauseMs = 260;
    } else if (endsComma) {
      segRate = Math.max(0.68, baseRate * 0.97);
      pauseMs = 130;
    }

    if (i === rawParts.length - 1) {
      pauseMs = 0;
    }

    segments.push({
      text: part,
      rate: Number(segRate.toFixed(2)),
      pitch: Number(Math.min(1.35, segPitch).toFixed(2)),
      pauseMs
    });
  }

  return segments.length > 0 ? segments : [{ text: trimmed, rate: baseRate, pitch: basePitch, pauseMs: 0 }];
}

const VOICE_PRIORITY_PATTERNS: RegExp[] = [
  /Microsoft\s+Ana\s+Online.*Natural/i,
  /Microsoft\s+Aria\s+Online.*Natural/i,
  /Microsoft\s+Jenny\s+Online.*Natural/i,
  /Microsoft\s+.*Online.*Natural.*en-US/i,
  /Google\s+US\s+English/i,
  /Samantha|Ava|Nicky|Allison/i,
  /Natural|Neural/i
];

export function pickBestEnglishVoice(): SpeechSynthesisVoice | null {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return null;
  const voices = window.speechSynthesis.getVoices();
  if (!voices || voices.length === 0) return null;

  const enUsVoices = voices.filter((v) => /^en[-_]US/i.test(v.lang));
  const enVoices = enUsVoices.length > 0 ? enUsVoices : voices.filter((v) => /^en/i.test(v.lang));
  if (enVoices.length === 0) return null;

  for (const pattern of VOICE_PRIORITY_PATTERNS) {
    const match = enVoices.find((v) => pattern.test(v.name));
    if (match) return match;
  }

  return enVoices[0] || null;
}

let activeAudioEl: HTMLAudioElement | null = null;
let playbackToken = 0;
let segmentTimer: number | null = null;
let serverTtsStatus: "unknown" | "available" | "unavailable" = "unknown";
const audioBlobCache = new Map<string, string>();

export function stopAllSpeech(): void {
  playbackToken += 1;
  if (segmentTimer !== null) {
    window.clearTimeout(segmentTimer);
    segmentTimer = null;
  }
  if (activeAudioEl) {
    try {
      activeAudioEl.pause();
      activeAudioEl.currentTime = 0;
    } catch {
      // ignore
    }
    activeAudioEl = null;
  }
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    window.speechSynthesis.cancel();
  }
}

function speakWithBrowserStoryteller(
  spokenText: string,
  rate: number,
  pitch: number,
  onEnd: (() => void) | null,
  token: number
): void {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    if (onEnd) setTimeout(onEnd, 700);
    return;
  }

  const segments = buildStorybookSegments(spokenText, rate, pitch);
  const voice = pickBestEnglishVoice();

  const playSegmentAt = (idx: number) => {
    if (token !== playbackToken) return;
    if (idx >= segments.length) {
      if (onEnd) onEnd();
      return;
    }

    const seg = segments[idx];
    const utter = new SpeechSynthesisUtterance(seg.text);
    utter.lang = "en-US";
    if (voice) utter.voice = voice;
    utter.rate = seg.rate;
    utter.pitch = seg.pitch;

    let handled = false;
    const handleFinish = () => {
      if (handled || token !== playbackToken) return;
      handled = true;
      if (idx + 1 >= segments.length) {
        if (onEnd) onEnd();
        return;
      }
      if (seg.pauseMs > 0) {
        segmentTimer = window.setTimeout(() => playSegmentAt(idx + 1), seg.pauseMs);
      } else {
        playSegmentAt(idx + 1);
      }
    };

    utter.onend = handleFinish;
    utter.onerror = handleFinish;
    window.speechSynthesis.speak(utter);
  };

  playSegmentAt(0);
}

async function tryPlayServerNeuralTts(
  spokenText: string,
  rate: number,
  onEnd: (() => void) | null,
  token: number
): Promise<boolean> {
  if (serverTtsStatus === "unavailable") return false;
  const isSingle = !/\s/.test(spokenText);
  const speed = isSingle ? 0.85 : rate < 0.85 ? 0.80 : 0.90;
  const cacheKey = `v3|${speed.toFixed(2)}|${spokenText}`;

  try {
    let url = audioBlobCache.get(cacheKey);
    if (!url) {
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: spokenText, speed })
      });
      if (res.status === 204 || !res.ok) {
        if (res.status === 204) serverTtsStatus = "unavailable";
        return false;
      }
      const blob = await res.blob();
      if (!blob || blob.size === 0) return false;
      url = URL.createObjectURL(blob);
      audioBlobCache.set(cacheKey, url);
    }

    serverTtsStatus = "available";
    if (token !== playbackToken) return true;

    const audio = new Audio(url);
    audio.volume = 1.0;
    activeAudioEl = audio;

    // Gentle volume boost (1.45x) using shared AudioContext singleton
    try {
      const ctx = getSharedAudioContext();
      if (ctx) {
        const src = ctx.createMediaElementSource(audio);
        const gainNode = ctx.createGain();
        gainNode.gain.value = 1.45;
        src.connect(gainNode);
        gainNode.connect(ctx.destination);
      }
    } catch {
      // fallback to standard audio.volume = 1.0
    }
    audio.onended = () => {
      if (token === playbackToken && onEnd) onEnd();
    };
    audio.onerror = () => {
      if (token === playbackToken && onEnd) onEnd();
    };
    await audio.play();
    return true;
  } catch {
    return false;
  }
}

export function speakEnglish(
  text: string,
  rate = 0.92,
  pitch = 1.06,
  onEnd: (() => void) | null = null,
  contextNextWord = ""
): void {
  stopAllSpeech();
  const token = playbackToken;
  const spokenText = formatTextForNaturalTts(text, contextNextWord);
  if (!spokenText) {
    if (onEnd) onEnd();
    return;
  }

  void (async () => {
    const playedServer = await tryPlayServerNeuralTts(spokenText, rate, onEnd, token);
    if (!playedServer && token === playbackToken) {
      speakWithBrowserStoryteller(spokenText, rate, pitch, onEnd, token);
    }
  })();
}

const PHONEME_TTS_MAP: Record<string, string> = {
  b: "buh",
  c: "kuh",
  d: "duh",
  f: "fuh",
  g: "guh",
  h: "huh",
  j: "juh",
  k: "kuh",
  l: "luh",
  m: "muh",
  n: "nuh",
  p: "puh",
  r: "ruh",
  s: "suh",
  t: "tuh",
  v: "vuh",
  w: "wuh",
  z: "zuh",
  sh: "shh",
  ch: "chuh",
  th: "thuh",
  wh: "wuh",
  ph: "fuh",
  kn: "nuh",
  wr: "ruh"
};

export function speakPhonicsBlend(
  onset: string,
  rime: string,
  wholeWord: string,
  onStep?: (step: "onset" | "rime" | "word" | "done") => void
): void {
  stopAllSpeech();
  const token = playbackToken;
  const onsetSpoken = PHONEME_TTS_MAP[onset.toLowerCase()] || onset;
  const rimeSpoken = rime.replace(/^-/, "");

  const playOne = (txt: string, rate: number) =>
    new Promise<void>((resolve) => {
      if (token !== playbackToken) {
        resolve();
        return;
      }
      void (async () => {
        const played = await tryPlayServerNeuralTts(txt, rate, resolve, token);
        if (!played && token === playbackToken) {
          speakWithBrowserStoryteller(txt, rate, 1.08, resolve, token);
        }
      })();
    });

  const waitMs = (ms: number) => new Promise<void>((r) => window.setTimeout(r, ms));

  void (async () => {
    if (onset) {
      onStep?.("onset");
      await playOne(onsetSpoken, 0.85);
      if (token !== playbackToken) return;
      await waitMs(110);
    }
    if (rimeSpoken) {
      onStep?.("rime");
      await playOne(rimeSpoken, 0.85);
      if (token !== playbackToken) return;
      await waitMs(130);
    }
    onStep?.("word");
    await playOne(wholeWord, 0.88);
    if (token === playbackToken) {
      onStep?.("done");
    }
  })();
}

let sharedAudioCtx: AudioContext | null = null;
function getSharedAudioContext(): AudioContext | null {
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return null;
    if (!sharedAudioCtx || sharedAudioCtx.state === "closed") {
      sharedAudioCtx = new AudioCtx();
    }
    if (sharedAudioCtx.state === "suspended") {
      void sharedAudioCtx.resume();
    }
    return sharedAudioCtx;
  } catch {
    return null;
  }
}

export function playSoftTone(freq = 540, duration = 0.14): void {
  try {
    const ctx = getSharedAudioContext();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(freq * 1.35, ctx.currentTime + duration);
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch {
    // Ignore audio context restriction errors
  }
}

export function playPageFlipSound(): void {
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const duration = 0.24;
    const bufferSize = Math.floor(ctx.sampleRate * duration);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i += 1) {
      const env = Math.sin((i / bufferSize) * Math.PI);
      data[i] = (Math.random() * 2 - 1) * env * 0.28;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(1400, ctx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(2600, ctx.currentTime + duration);
    filter.Q.value = 1.2;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.01, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.22, ctx.currentTime + 0.06);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    noise.start();
    noise.stop(ctx.currentTime + duration);
  } catch {
    // Ignore audio context restriction errors
  }
}

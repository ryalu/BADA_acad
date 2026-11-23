#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Extract, clean, deduplicate, and tag all Elementary 800 & Mid/High 1800 vocabulary entries
from the two Ministry-designated PDFs in `data/word_raw/`, producing `data/vocab_master.json`.
"""

import json
import math
import os
import re
from collections import defaultdict
from datetime import datetime, timezone
from pypdf import PdfReader

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ELEM_PDF = os.path.join(ROOT_DIR, "data", "word_raw", "교육부지정 초등영단어 800.pdf")
MH_PDF = os.path.join(ROOT_DIR, "data", "word_raw", "교육부 지정 중고등 필수단어.pdf")
OUT_JSON = os.path.join(ROOT_DIR, "data", "vocab_master.json")
PROMPTS_JSON = os.path.join(ROOT_DIR, "data", "elem_vocab_prompts.json")
VOCAB_IMG_DIR = os.path.join(ROOT_DIR, "public", "vocab-images")

CURATED_ABSTRACT_WORDS = {
    "a", "about", "above", "across", "after", "again", "against", "ago", "all", "almost",
    "alone", "along", "already", "also", "although", "always", "among", "an", "and",
    "another", "any", "anybody", "anyone", "anything", "anywhere", "around", "as", "at",
    "away", "back", "bad", "be", "because", "become", "before", "behind", "believe",
    "below", "beside", "best", "better", "between", "beyond", "both", "but", "by",
    "can", "cannot", "care", "cause", "certain", "chance", "change", "clear", "close",
    "could", "different", "difficult", "do", "down", "during", "each", "early", "easy",
    "either", "else", "end", "enough", "even", "ever", "every", "everybody", "everyone",
    "everything", "everywhere", "example", "except", "excuse", "fact", "false", "far",
    "fast", "feel", "few", "finally", "find", "fine", "first", "for", "forever", "forget",
    "forward", "free", "from", "front", "full", "fun", "future", "general", "get", "glad",
    "good", "great", "guess", "half", "happen", "hard", "have", "he", "help", "her",
    "here", "hers", "herself", "high", "him", "himself", "his", "hope", "how", "however",
    "i", "idea", "if", "important", "in", "inside", "instead", "into", "it", "its",
    "itself", "just", "keep", "kind", "know", "last", "late", "later", "least", "leave",
    "left", "less", "let", "life", "like", "likely", "little", "long", "lot", "love",
    "low", "luck", "lucky", "main", "make", "many", "may", "maybe", "me", "mean",
    "meaning", "middle", "might", "mind", "mine", "minute", "moment", "more", "most",
    "mostly", "much", "must", "my", "myself", "name", "near", "nearly", "necessary",
    "need", "neither", "never", "new", "next", "nice", "no", "nobody", "none", "nor",
    "not", "nothing", "now", "number", "of", "off", "often", "oh", "ok", "okay", "old",
    "on", "once", "one", "only", "open", "or", "order", "other", "our", "ours",
    "ourselves", "out", "outside", "over", "own", "part", "past", "peace", "perhaps",
    "plan", "please", "point", "polite", "poor", "possible", "power", "present",
    "pretty", "probably", "problem", "promise", "proud", "public", "quick", "quiet",
    "quite", "rather", "ready", "real", "really", "reason", "remember", "right", "round",
    "rule", "sad", "safe", "same", "save", "say", "second", "secret", "seem", "self",
    "sense", "several", "shall", "she", "short", "should", "side", "simple", "since",
    "slow", "small", "so", "some", "somebody", "someone", "something", "sometimes",
    "somewhere", "soon", "sorry", "sort", "special", "start", "still", "stop", "strange",
    "strong", "such", "suddenly", "sure", "surprise", "sweet", "tell", "than", "thank",
    "that", "the", "their", "theirs", "them", "themselves", "then", "there", "these",
    "they", "thing", "think", "this", "those", "though", "through", "till", "time", "to",
    "today", "together", "tomorrow", "too", "toward", "true", "truth", "try", "turn",
    "twice", "under", "understand", "until", "up", "upon", "us", "use", "useful",
    "usual", "usually", "very", "wait", "want", "way", "we", "weak", "welcome", "well",
    "what", "whatever", "when", "where", "whether", "which", "while", "who", "whole",
    "whom", "whose", "why", "will", "wish", "with", "within", "without", "wonder",
    "word", "work", "worry", "worst", "would", "wrong", "yes", "yesterday", "yet", "you",
    "young", "your", "yours", "yourself",
}


def load_curated_prompts():
    if os.path.exists(PROMPTS_JSON):
        with open(PROMPTS_JSON, "r", encoding="utf-8") as f:
            data = json.load(f)
            return data.get("words", {})
    return {}


def clean_elem_meaning(raw_m: str) -> str:
    s = re.sub(r"\s+", " ", raw_m.strip())
    # #79 duplicated cell: "(아침)    breakfast (아침)"
    if "breakfast" in s and s.startswith("(아침)"):
        return "아침"
    # Strip trailing unmatched paren (#277 grape: "포도)")
    if s.endswith(")") and s.count(")") > s.count("("):
        s = s[:-1].strip()
    # Strip matching outermost wrapping parens only
    if s.startswith("(") and s.endswith(")"):
        depth = 0
        wraps_whole = True
        for i, ch in enumerate(s):
            if ch == "(":
                depth += 1
            elif ch == ")":
                depth -= 1
                if depth == 0 and i < len(s) - 1:
                    wraps_whole = False
                    break
        if wraps_whole and depth == 0:
            s = s[1:-1].strip()
    return s


def normalize_word_display(raw_w: str):
    w = re.sub(r"\s+", " ", raw_w.strip())
    if w.lower() == "a. an":
        return "a", "a, an"
    if w.lower() == "dad(dy)":
        return "dad", "dad(dy)"
    if w.lower() == "god(god)":
        return "god", "god(GOD)"
    if w.lower() == "mom(my)":
        return "mom", "mom(my)"
    if w.lower() == "okay(ok)":
        return "okay", "okay(ok)"
    return w.lower(), w


def parse_elementary_800():
    reader = PdfReader(ELEM_PDF)
    elem_map = {}

    for page in reader.pages:
        txt = page.extract_text(extraction_mode="layout") or ""
        lines = txt.splitlines()
        for li, line in enumerate(lines):
            stripped = line.strip()
            if not stripped:
                continue
            if re.match(r"^(No\.|\d+\s*[~-]\s*\d+|-\s*\d+\s*-)", stripped):
                continue

            parts = re.split(r"\s{3,}(?=\d{1,3}\s+[A-Za-z])", stripped)
            for part in parts:
                p = part.strip()
                # Match `<num> <word> <meaning>` allowing parens inside word (e.g., dad(dy))
                # and meaning starting either with `(` or Korean/hangul character
                m = re.match(r"^(\d{1,3})\s+([A-Za-z][A-Za-z0-9.\-'/()]*(?:\s+[a-z]{1,4})?)\s{2,}(.+)$", p)
                if not m:
                    m = re.match(r"^(\d{1,3})\s+([A-Za-z][A-Za-z0-9.\-'/()]*)\s+(\(.+)$", p)
                if not m:
                    continue

                num = int(m.group(1))
                word_raw = m.group(2).strip()
                meaning_raw = m.group(3).strip()

                # Handle wrapped line (#735 understand: `(이` + next line `해하다)`)
                if meaning_raw.count("(") > meaning_raw.count(")") and li + 1 < len(lines):
                    nxt = lines[li + 1].strip()
                    if nxt and not re.match(r"^\d", nxt):
                        meaning_raw += nxt

                norm_w, disp_w = normalize_word_display(word_raw)
                mean_clean = clean_elem_meaning(meaning_raw)
                elem_map[num] = {
                    "elem_no": num,
                    "word": norm_w,
                    "display_word": disp_w,
                    "meaning_kr": mean_clean,
                }

    missing = sorted(set(range(1, 801)) - set(elem_map.keys()))
    assert len(elem_map) == 800 and not missing, f"Elementary 800 incomplete! Got {len(elem_map)}, missing={missing}"
    return elem_map


def parse_mid_high_1800():
    reader = PdfReader(MH_PDF)
    mh_map = {}

    for page in reader.pages:
        txt = page.extract_text(extraction_mode="layout") or ""
        for line in txt.splitlines():
            s = line.strip()
            if not s or s.startswith("번호") or "교육부 지정" in s or "개정 반영" in s or re.match(r"^-\s*\d+\s*-$", s):
                continue
            m = re.match(r"^(\d{1,4})\s+([A-Za-z][A-Za-z0-9.\-'\s/]*?)\s{2,}(.+)$", s)
            if not m:
                continue
            num = int(m.group(1))
            raw_w = re.sub(r"\s+", " ", m.group(2).strip())
            mean_clean = re.sub(r"\s+", " ", m.group(3).strip())
            mh_map[num] = {
                "mh_no": num,
                "word": raw_w.lower(),
                "display_word": raw_w,
                "meaning_kr": mean_clean,
            }

    missing = sorted(set(range(1, 1801)) - set(mh_map.keys()))
    assert len(mh_map) == 1800 and not missing, f"Mid/High 1800 incomplete! Got {len(mh_map)}, missing={missing}"
    return mh_map


INITIAL_SOUND_GUIDE = {
    "A": "A [애 / 에이]",
    "B": "B [브]",
    "C": "C [크 / 스]",
    "D": "D [드]",
    "E": "E [에 / 이]",
    "F": "F [프] (윗니로 아랫입술 살짝)",
    "G": "G [그 / 쥐]",
    "H": "H [흐]",
    "I": "I [이 / 아이]",
    "J": "J [쥐]",
    "K": "K [크]",
    "L": "L [을] (혀끝 윗니 뒤)",
    "M": "M [므] (두 입술 닫기)",
    "N": "N [느]",
    "O": "O [오 / 오우]",
    "P": "P [프] (두 입술 터뜨리기)",
    "Q": "Q [쿠] (qu 조합)",
    "R": "R [르] (혀 안으로 말기)",
    "S": "S [스]",
    "T": "T [트]",
    "U": "U [어 / 유]",
    "V": "V [브] (윗니-아랫입술 떨림)",
    "W": "W [우]",
    "Y": "Y [여 / 이]",
    "Z": "Z [즈] (목 울림)",
}


def build_stage1_units(words_list, tier: str):
    """
    Build unified Stage 1 single-letter A-Z units for `elem_800` or `mid_high`
    (25 letters; X has 0 words in both PDFs).
    """
    is_elem = tier == "elem_800"
    field_flag = "is_elem_800" if is_elem else "is_mid_high"
    unit_field = "elem_unit_key" if is_elem else "mh_unit_key"
    id_prefix = "s1_elem" if is_elem else "s1_mh"
    tier_label = "초등 기초" if is_elem else "중고등 필수"

    by_letter = defaultdict(list)
    for w in words_list:
        if w[field_flag]:
            by_letter[w["initial_letter"]].append(w)

    units = []
    sort_idx = 0
    for code in range(ord("A"), ord("Z") + 1):
        lt = chr(code)
        chunk = by_letter[lt]
        if not chunk:
            continue
        sort_idx += 1
        for item in chunk:
            item[unit_field] = lt
        guide = INITIAL_SOUND_GUIDE.get(lt, lt)
        units.append({
            "id": f"{id_prefix}_{lt.lower()}",
            "tier": tier,
            "stage": 1,
            "unit_key": lt,
            "title_kr": f"{lt} {tier_label} 단어 · {guide}",
            "rule_summary_kr": f"첫 글자 소리 익히기: {guide} ({len(chunk)}단어)",
            "word_count": len(chunk),
            "sort_order": sort_idx,
        })
    return units


def build_stage1_all_units(words_list):
    """
    Build unified Stage 1 single-letter A-Z units combining all Elementary 800
    and Mid/High 1800 words (25 letters; X has 0 words in both lists).
    """
    by_letter = defaultdict(list)
    for w in words_list:
        by_letter[w["initial_letter"]].append(w)

    units = []
    sort_idx = 0
    for code in range(ord("A"), ord("Z") + 1):
        lt = chr(code)
        cnt = len(by_letter[lt])
        if cnt == 0:
            continue
        sort_idx += 1
        guide = INITIAL_SOUND_GUIDE.get(lt, lt)
        units.append({
            "id": f"s1_all_{lt.lower()}",
            "tier": "all",
            "stage": 1,
            "unit_key": lt,
            "title_kr": f"{lt} 단어 · 첫소리 {guide}",
            "rule_summary_kr": f"첫 글자 소리 익히기: {guide} ({cnt}단어)",
            "word_count": cnt,
            "sort_order": sort_idx,
        })
    return units


# Stage 2 phonics tagging with strict phonetic exception filtering
EXCL_AI = {"said", "again", "against", "air", "airplane", "airport", "aisle", "chair", "fair", "hair", "pair", "stair", "repair", "stairs", "mountain", "fountain", "captain", "certain", "curtain", "bargain", "portrait"}
EXCL_AY = {"says"}
EXCL_EA_LONG_E = {
    "bread", "breakfast", "head", "ahead", "dead", "ready", "heavy", "weather", "feather", "leather", "measure", "pleasure", "treasure", "sweater", "thread", "spread", "wealth", "health", "breath", "instead", "meant", "weapon",
    "bear", "beard", "pear", "wear", "swear", "tear", "ear", "dear", "fear", "gear", "hear", "near", "year", "clear", "appear", "disappear", "earth", "early", "earn", "learn", "search", "heard", "pearl", "rehearsal",
    "break", "great", "steak",
    "heart",
    "ocean", "area", "idea", "real", "create", "theater", "theatre", "beautiful", "react", "reality", "realize", "cereal",
}
LONG_O_OW_WORDS = {
    "below", "blow", "bowl", "crow", "fellow", "flow", "follow", "glow", "grow", "growth",
    "hollow", "know", "knowledge", "low", "narrow", "own", "owner", "pillow", "rainbow",
    "row", "shadow", "shallow", "show", "slow", "snow", "sorrow", "sow", "throw",
    "tomorrow", "unknown", "window", "yellow", "arrow", "borrow", "swallow",
}
OU_AU_OW_WORDS = {
    "about", "around", "cloud", "cloudy", "count", "couch", "discount", "doubt", "found",
    "fountain", "ground", "hour", "house", "loud", "mountain", "mouse", "mouth", "noun",
    "out", "outdoor", "outer", "outline", "output", "outside", "outstanding", "pound",
    "proud", "round", "shout", "sound", "south", "sour", "surround", "thousand", "wow",
    "allow", "bow", "brown", "cow", "crowd", "crown", "down", "downtown", "drown",
    "flower", "how", "now", "power", "powerful", "shower", "tower", "town", "towel", "vowel",
}
EXCL_MAGIC_A_E = {"have", "are", "care", "dare", "fare", "rare", "share", "spare", "square", "stare", "ware", "aware", "compare", "declare", "prepare", "orange", "cabbage", "garbage", "language", "luggage", "manage", "message", "package", "passage", "sausage", "village", "image", "damage", "advantage", "average", "courage", "encourage", "private", "chocolate", "climate", "pirate", "accurate", "adequate", "candidate", "delicate", "desperate", "fortunate", "immediate", "moderate", "separate", "surface", "palace", "necklace", "purchase"}
EXCL_MAGIC_I_E = {"give", "forgive", "live", "olive", "active", "aggressive", "alternative", "attractive", "creative", "detective", "effective", "expensive", "massive", "native", "negative", "objective", "passive", "positive", "relative", "sensitive", "police", "office", "notice", "practice", "service", "justice", "device", "advice", "minute", "engine", "examine", "imagine", "determine", "discipline", "favorite", "medicine", "opposite", "promise", "definite", "infinite", "machine", "magazine", "routine", "mobile", "article", "vehicle"}
EXCL_MAGIC_O_E = {"come", "become", "overcome", "welcome", "some", "someone", "something", "sometimes", "somewhere", "awesome", "handsome", "done", "none", "one", "glove", "love", "above", "move", "remove", "improve", "prove", "lose", "whose", "more", "before", "core", "ignore", "score", "shore", "snore", "sore", "store", "explore", "therefore", "purpose", "suppose", "europe", "elope"}
EXCL_MAGIC_U_E = {"blue", "clue", "due", "glue", "true", "value", "argue", "avenue", "continue", "issue", "rescue", "statue", "tissue", "virtue", "culture", "feature", "figure", "future", "gesture", "lecture", "literature", "measure", "mixture", "moisture", "nature", "picture", "pleasure", "pressure", "structure", "temperature", "texture", "treasure", "adventure", "century", "capture", "creature", "furniture", "injure", "minute", "house", "mouse", "course", "cause", "because", "pause", "sauce", "nurse", "purse", "curtain", "purple", "turtle"}
EXCL_OO = {"blood", "flood", "door", "floor", "poor", "outdoor", "indoor"}
EXCL_OA = {"abroad", "broad", "broadcast"}
EXCL_OI = {"choir"}
EXCL_CH = {"school", "scholar", "schedule", "ache", "stomach", "headache", "toothache", "anchor", "architect", "architecture", "character", "chemical", "chemistry", "chorus", "christmas", "chronic", "echo", "mechanic", "mechanism", "orchestra", "psychology", "scheme", "technique", "technology", "machine", "chef"}
EXCL_WH = {"who", "whom", "whose", "whole", "whoever"}

STAGE2_UNITS = [
    {"id": "s2_long_a", "unit_key": "s2_long_a", "title_kr": "장모음 A · ai / ay [에이]", "rule_summary_kr": "ai(단어 중간)와 ay(단어 끝)는 길게 [에이] 소리가 나요."},
    {"id": "s2_long_e", "unit_key": "s2_long_e", "title_kr": "장모음 E · ee / ea [이ː]", "rule_summary_kr": "ee와 ea가 만나면 맑고 길게 [이ː] 소리가 나요."},
    {"id": "s2_long_o", "unit_key": "s2_long_o", "title_kr": "장모음 O · oa / ow [오우]", "rule_summary_kr": "oa와 끝의 ow가 만나 둥글게 [오우] 소리를 내요."},
    {"id": "s2_magic_a_e", "unit_key": "s2_magic_a_e", "title_kr": "매직 e · a_e [에이]", "rule_summary_kr": "끝의 묵음 e가 앞의 a를 [에이]로 길게 읽게 만들어요."},
    {"id": "s2_magic_i_e", "unit_key": "s2_magic_i_e", "title_kr": "매직 e · i_e [아이]", "rule_summary_kr": "끝의 묵음 e가 앞의 i를 [아이]로 길게 읽게 만들어요."},
    {"id": "s2_magic_o_e", "unit_key": "s2_magic_o_e", "title_kr": "매직 e · o_e [오우]", "rule_summary_kr": "끝의 묵음 e가 앞의 o를 [오우]로 길게 읽게 만들어요."},
    {"id": "s2_magic_u_e", "unit_key": "s2_magic_u_e", "title_kr": "매직 e · u_e [유/우]", "rule_summary_kr": "끝의 묵음 e가 앞의 u를 [유/우]로 길게 읽게 만들어요."},
    {"id": "s2_oo", "unit_key": "s2_oo", "title_kr": "이중모음 · oo [우ː/우]", "rule_summary_kr": "o 두 개가 만나 입술을 동그랗게 내밀며 [우] 소리를 내요."},
    {"id": "s2_oi_oy", "unit_key": "s2_oi_oy", "title_kr": "이중모음 · oi / oy [오이]", "rule_summary_kr": "oi(중간)와 oy(끝)는 [오이]로 한 음절에 부드럽게 이어져요."},
    {"id": "s2_ou_ow", "unit_key": "s2_ou_ow", "title_kr": "이중모음 · ou / ow [아우]", "rule_summary_kr": "입을 크게 [아] 했다가 [우]로 오므리며 [아우] 소리를 내요."},
    {"id": "s2_r_vowel", "unit_key": "s2_r_vowel", "title_kr": "R-통제 모음 · ar / or / ir / ur / er", "rule_summary_kr": "모음 뒤 r이 붙어 혀를 살짝 말며 [아르/오르/어르] 소리를 내요."},
    {"id": "s2_sh_ch", "unit_key": "s2_sh_ch", "title_kr": "이중자음 · sh [쉬] / ch [취]", "rule_summary_kr": "sh는 조용히 [쉬~], ch는 힘차게 [취] 소리를 내요."},
    {"id": "s2_th_wh_ph", "unit_key": "s2_th_wh_ph", "title_kr": "이중자음 · th / wh / ph", "rule_summary_kr": "th(혀끝 바람), wh([우]), ph([프]) 두 글자 하나의 소리를 익혀요."},
    {"id": "s2_ck_ng_nk", "unit_key": "s2_ck_ng_nk", "title_kr": "받침 이중자음 · ck / ng / nk", "rule_summary_kr": "단어 뒤에서 ck[크], ng[응], nk[응크] 소리로 깔끔하게 마무리해요."},
]


def tag_phonics_spans(word: str):
    w = word.lower()
    if " " in w or "-" in w or "/" in w or "." in w or len(w) < 3:
        return []
    spans = []

    def add_match(unit_id: str, pattern: str, regex: str, sound_kr: str, split_magic=False):
        m = re.search(regex, w)
        if not m:
            return
        if split_magic:
            spans.append({
                "unit_id": unit_id,
                "pattern": pattern,
                "start": m.start(),
                "end": m.start() + 1,
                "silent_e_index": len(w) - 1,
                "sound_kr": sound_kr,
            })
        else:
            spans.append({
                "unit_id": unit_id,
                "pattern": pattern,
                "start": m.start(),
                "end": m.end(),
                "sound_kr": sound_kr,
            })

    # 1. Long A: ai / ay
    if w not in EXCL_AI and "ai" in w and not w.endswith("air"):
        add_match("s2_long_a", "ai", r"ai", "에이")
    elif w not in EXCL_AY and "ay" in w and not re.search(r"ayer", w):
        add_match("s2_long_a", "ay", r"ay", "에이")

    # 2. Long E: ee / ea
    if "ee" in w:
        add_match("s2_long_e", "ee", r"ee", "이ː")
    elif "ea" in w and w not in EXCL_EA_LONG_E and not w.endswith(("ear", "eal")):
        add_match("s2_long_e", "ea", r"ea", "이ː")

    # 3. Long O: oa / ow(long_o)
    if "oa" in w and w not in EXCL_OA and not re.search(r"oar", w):
        add_match("s2_long_o", "oa", r"oa", "오우")
    elif w in LONG_O_OW_WORDS:
        add_match("s2_long_o", "ow", r"ow", "오우")

    # 4. Magic-E (only when preceding char is consonant so vowel teams like ai_e don't misfire)
    if re.search(r"[^aeiou]a[bcdfghjklmnpqrstvwxyz]e$", w) and w not in EXCL_MAGIC_A_E:
        m = re.search(r"a[bcdfghjklmnpqrstvwxyz]e$", w)
        if m:
            spans.append({"unit_id": "s2_magic_a_e", "pattern": "a_e", "start": m.start(), "end": m.start() + 1, "silent_e_index": len(w) - 1, "sound_kr": "에이"})
    if re.search(r"[^aeiou]i[bcdfghjklmnpqrstvwxyz]e$", w) and w not in EXCL_MAGIC_I_E:
        m = re.search(r"i[bcdfghjklmnpqrstvwxyz]e$", w)
        if m:
            spans.append({"unit_id": "s2_magic_i_e", "pattern": "i_e", "start": m.start(), "end": m.start() + 1, "silent_e_index": len(w) - 1, "sound_kr": "아이"})
    if re.search(r"[^aeiou]o[bcdfghjklmnpqrstvwxyz]e$", w) and w not in EXCL_MAGIC_O_E:
        m = re.search(r"o[bcdfghjklmnpqrstvwxyz]e$", w)
        if m:
            spans.append({"unit_id": "s2_magic_o_e", "pattern": "o_e", "start": m.start(), "end": m.start() + 1, "silent_e_index": len(w) - 1, "sound_kr": "오우"})
    if re.search(r"[^aeiou]u[bcdfghjklmnpqrstvwxyz]e$", w) and w not in EXCL_MAGIC_U_E:
        m = re.search(r"u[bcdfghjklmnpqrstvwxyz]e$", w)
        if m:
            spans.append({"unit_id": "s2_magic_u_e", "pattern": "u_e", "start": m.start(), "end": m.start() + 1, "silent_e_index": len(w) - 1, "sound_kr": "유/우"})

    # 5. oo
    if "oo" in w and w not in EXCL_OO:
        add_match("s2_oo", "oo", r"oo", "우")

    # 6. oi / oy
    if "oi" in w and w not in EXCL_OI:
        add_match("s2_oi_oy", "oi", r"oi", "오이")
    elif "oy" in w:
        add_match("s2_oi_oy", "oy", r"oy", "오이")

    # 7. ou / ow (/aʊ/)
    if w in OU_AU_OW_WORDS:
        if "ou" in w:
            add_match("s2_ou_ow", "ou", r"ou", "아우")
        elif "ow" in w:
            add_match("s2_ou_ow", "ow", r"ow", "아우")

    # 8. R-controlled (ar / or / ir / ur / er — avoid vowel+vowel+r like air/ear/our)
    m_r = re.search(r"(?<![aeiou])(ar|or|ir|ur|er)(?![aeiou])", w)
    if m_r and not (m_r.group(1) == "er" and w.endswith(("very",))):
        pat = m_r.group(1)
        snd = "아르" if pat == "ar" else ("오르" if pat == "or" else "어르")
        spans.append({"unit_id": "s2_r_vowel", "pattern": pat, "start": m_r.start(), "end": m_r.end(), "sound_kr": snd})

    # 9. sh / ch
    if "sh" in w and not re.search(r"tsh", w):
        add_match("s2_sh_ch", "sh", r"sh", "쉬")
    elif "ch" in w and w not in EXCL_CH and not re.search(r"sch", w):
        add_match("s2_sh_ch", "ch", r"ch", "취")

    # 10. th / wh / ph
    if "th" in w and w not in {"clothes"}:
        add_match("s2_th_wh_ph", "th", r"th", "뜨/쓰")
    elif "ph" in w and w not in {"shepherd"}:
        add_match("s2_th_wh_ph", "ph", r"ph", "프")
    elif "wh" in w and w not in EXCL_WH:
        add_match("s2_th_wh_ph", "wh", r"wh", "우")

    # 11. ck / ng / nk
    if "ck" in w:
        add_match("s2_ck_ng_nk", "ck", r"ck", "크")
    elif re.search(r"ng\b", w):
        add_match("s2_ck_ng_nk", "ng", r"ng\b", "응")
    elif "nk" in w:
        add_match("s2_ck_ng_nk", "nk", r"nk", "응크")

    return spans


STAGE3_UNITS = [
    {"id": "s3_pre_un", "unit_key": "s3_pre_un", "title_kr": "접두어 un- (반대 · 부정)", "rule_summary_kr": "형용사·동사 앞에 un-이 붙으면 '~이 아닌 / 반대의' 뜻이 됩니다."},
    {"id": "s3_pre_dis", "unit_key": "s3_pre_dis", "title_kr": "접두어 dis- (반대 · 분리)", "rule_summary_kr": "dis-가 붙으면 '반대, 사라짐, 떨어짐'의 부정 의미로 바뀝니다."},
    {"id": "s3_pre_re", "unit_key": "s3_pre_re", "title_kr": "접두어 re- (다시 · 되돌림)", "rule_summary_kr": "re-가 붙으면 '다시 한 번(again)' 또는 '뒤로(back)'라는 뜻이 됩니다."},
    {"id": "s3_pre_in_im", "unit_key": "s3_pre_in_im", "title_kr": "접두어 in- / im- (아닌 · 안으로)", "rule_summary_kr": "형용사 앞에서는 '반대(not)', 동사 앞에서는 '안으로(in)' 뜻을 더합니다."},
    {"id": "s3_pre_over_sub", "unit_key": "s3_pre_over_sub", "title_kr": "접두어 over- / sub- / pre- (위치 · 시간)", "rule_summary_kr": "over-(넘어/지나치게), sub-(아래), pre-(미리)로 공간·시간 의미를 확장해요."},
    {"id": "s3_suf_ful_less", "unit_key": "s3_suf_ful_less", "title_kr": "접미사 -ful / -less (형용사 만들기)", "rule_summary_kr": "명사 뒤에 -ful(~가 가득한) 또는 -less(~가 없는)를 붙여 형용사를 만들어요."},
    {"id": "s3_suf_ness", "unit_key": "s3_suf_ness", "title_kr": "접미사 -ness (상태 · 성질 명사)", "rule_summary_kr": "형용사 뒤에 -ness를 붙이면 '~함, ~성질'이라는 추상명사가 됩니다."},
    {"id": "s3_suf_ment", "unit_key": "s3_suf_ment", "title_kr": "접미사 -ment (동사 → 명사)", "rule_summary_kr": "동사 뒤에 -ment를 붙이면 '행동·결과'를 뜻하는 명사가 됩니다."},
    {"id": "s3_suf_tion", "unit_key": "s3_suf_tion", "title_kr": "접미사 -tion / -sion (동사 → 명사)", "rule_summary_kr": "동사 뒤에 -tion/-sion이 붙어 '[션]' 소리의 명사로 바뀝니다."},
    {"id": "s3_suf_er_or", "unit_key": "s3_suf_er_or", "title_kr": "접미사 -er / -or (~하는 사람·도구)", "rule_summary_kr": "동사 뒤에 -er/-or를 붙여 '~하는 사람' 또는 '기계/도구' 명사를 만들어요."},
    {"id": "s3_suf_able", "unit_key": "s3_suf_able", "title_kr": "접미사 -able / -ible (~할 수 있는)", "rule_summary_kr": "동사·명사 뒤에 -able/-ible을 붙여 '~할 수 있는' 형용사를 만들어요."},
    {"id": "s3_suf_ly_ive", "unit_key": "s3_suf_ly_ive", "title_kr": "접미사 -ly / -ous / -ive (부사 · 형용사)", "rule_summary_kr": "형용사+-ly는 부사(~하게), 명사·동사+-ous/-ive는 형용사로 변합니다."},
]

# Curated high-utility root->derived families anchored on words from the two PDFs
RAW_AFFIX_FAMILIES = [
    # un-
    ("s3_pre_un", "un-", "prefix", "아닌 · 반대", "happy", "행복한", "형용사", "unhappy", "불행한, 슬픈", "형용사", "반대 뜻의 형용사로 변환"),
    ("s3_pre_un", "un-", "prefix", "아닌 · 반대", "kind", "친절한", "형용사", "unkind", "불친절한", "형용사", "부정 의미로 변환"),
    ("s3_pre_un", "un-", "prefix", "아닌 · 반대", "fair", "공정한", "형용사", "unfair", "불공정한", "형용사", "반대 형용사 생성"),
    ("s3_pre_un", "un-", "prefix", "아닌 · 반대", "able", "할 수 있는", "형용사", "unable", "할 수 없는", "형용사", "능력 부정 형용사"),
    ("s3_pre_un", "un-", "prefix", "아닌 · 반대", "safe", "안전한", "형용사", "unsafe", "위험한, 안전하지 않은", "형용사", "안전의 반대 표현"),
    ("s3_pre_un", "un-", "prefix", "아닌 · 반대", "known", "알려진", "형용사", "unknown", "알려지지 않은", "형용사", "수동형 형용사 부정"),
    ("s3_pre_un", "un-", "prefix", "풀다(동작 취소)", "lock", "잠그다", "동사", "unlock", "잠금을 풀다", "동사", "동작을 되돌리는 un-"),
    ("s3_pre_un", "un-", "prefix", "풀다(동작 취소)", "pack", "짐을 싸다", "동사", "unpack", "짐을 풀다", "동사", "행동 반전 동사"),
    # dis-
    ("s3_pre_dis", "dis-", "prefix", "사라짐 · 반대", "appear", "나타나다", "동사", "disappear", "사라지다", "동사", "반대 동작을 만드는 dis-"),
    ("s3_pre_dis", "dis-", "prefix", "반대 · 부정", "agree", "동의하다", "동사", "disagree", "반대하다, 동의하지 않다", "동사", "의견 반대 동사"),
    ("s3_pre_dis", "dis-", "prefix", "반대 · 싫어함", "like", "좋아하다", "동사", "dislike", "싫어하다", "동사", "호감의 반대 표현"),
    ("s3_pre_dis", "dis-", "prefix", "유리함의 반대", "advantage", "이점, 유리함", "명사", "disadvantage", "불리한 점, 약점", "명사", "긍정 명사의 반대"),
    ("s3_pre_dis", "dis-", "prefix", "기대의 반대", "appoint", "지명·약속하다", "동사", "disappoint", "실망시키다", "동사", "긍정 기대가 어긋남"),
    ("s3_pre_dis", "dis-", "prefix", "닫힘 제거", "close", "닫다", "동사", "disclose", "드러내다, 공개하다", "동사", "닫힌 것을 열어 보임"),
    ("s3_pre_dis", "dis-", "prefix", "정직의 반대", "honest", "정직한", "형용사", "dishonest", "정직하지 않은", "형용사", "성질 부정 형용사"),
    # re-
    ("s3_pre_re", "re-", "prefix", "다시 (again)", "use", "사용하다", "동사", "reuse", "재사용하다", "동사", "다시 사용하는 동작"),
    ("s3_pre_re", "re-", "prefix", "다시 (again)", "write", "쓰다", "동사", "rewrite", "다시 쓰다, 고쳐 쓰다", "동사", "반복 동작 접두어"),
    ("s3_pre_re", "re-", "prefix", "다시 (again)", "build", "짓다, 건설하다", "동사", "rebuild", "재건하다, 다시 짓다", "동사", "초등 기본동사 확장"),
    ("s3_pre_re", "re-", "prefix", "다시 (again)", "cycle", "순환·자전거", "명사/동사", "recycle", "재활용하다", "동사", "자원을 다시 순환시킴"),
    ("s3_pre_re", "re-", "prefix", "뒤로 · 되돌려", "call", "부르다", "동사", "recall", "기억해 내다, 회상하다", "동사", "기억을 다시 불러옴"),
    ("s3_pre_re", "re-", "prefix", "다시 · 회복", "cover", "덮다", "동사", "recover", "회복하다", "동사", "원래 상태로 되돌림"),
    ("s3_pre_re", "re-", "prefix", "다시", "turn", "돌다", "동사", "return", "돌아오다, 반납하다", "동사", "원위치로 되돌아옴"),
    # in- / im-
    ("s3_pre_in_im", "in-", "prefix", "아닌 (not)", "formal", "격식을 차린", "형용사", "informal", "비격식적인, 격의 없는", "형용사", "격식 있음 → 격식 없음"),
    ("s3_pre_in_im", "in-", "prefix", "아닌 (not)", "visible", "눈에 보이는", "형용사", "invisible", "보이지 않는", "형용사", "시각적 부정 형용사"),
    ("s3_pre_in_im", "in-", "prefix", "아닌 (not)", "correct", "올바른", "형용사", "incorrect", "틀린, 부정확한", "형용사", "정확함의 반대"),
    ("s3_pre_in_im", "im-", "prefix", "아닌 (p/m 앞)", "possible", "가능한", "형용사", "impossible", "불가능한", "형용사", "p 앞에서는 in-이 im-으로 변해요"),
    ("s3_pre_in_im", "im-", "prefix", "아닌 (p/m 앞)", "polite", "예의 바른", "형용사", "impolite", "무례한, 예의 없는", "형용사", "p 앞 im- 변형 규칙"),
    ("s3_pre_in_im", "im-", "prefix", "안으로 (into)", "port", "항구", "명사", "import", "수입하다", "동사", "항구 안으로 들여오다"),
    ("s3_pre_in_im", "in-", "prefix", "안으로 (into)", "come", "오다", "동사", "income", "수입, 소득", "명사", "안으로 들어오는 돈"),
    ("s3_pre_in_im", "in-", "prefix", "안으로 (into)", "put", "놓다", "동사", "input", "입력, 투입", "명사/동사", "시스템 안으로 넣다"),
    # over- / sub- / pre-
    ("s3_pre_over_sub", "over-", "prefix", "넘어 · 극복", "come", "오다", "동사", "overcome", "극복하다, 이겨내다", "동사", "어려움 위를 넘어섬"),
    ("s3_pre_over_sub", "over-", "prefix", "위 · 내려다봄", "look", "보다", "동사", "overlook", "내려다보다, 간과하다", "동사", "위에서 훑어보다"),
    ("s3_pre_over_sub", "over-", "prefix", "지나친 (too much)", "weight", "무게", "명사", "overweight", "과체중의", "형용사", "기준 무게를 초과함"),
    ("s3_pre_over_sub", "sub-", "prefix", "아래 (under)", "way", "길", "명사", "subway", "지하철", "명사", "땅 아래로 다니는 길"),
    ("s3_pre_over_sub", "sub-", "prefix", "아래 (under)", "marine", "바다의", "형용사", "submarine", "잠수함", "명사", "바닷속 아래로 다니는 배"),
    ("s3_pre_over_sub", "pre-", "prefix", "미리 (before)", "view", "보다", "동사/명사", "preview", "미리보기, 시사회", "동사/명사", "본편 전에 미리 봄"),
    ("s3_pre_over_sub", "pre-", "prefix", "미리 (before)", "dict", "말하다(어근)", "어근", "predict", "예측하다, 예언하다", "동사", "일어나기 전에 미리 말함"),
    # -ful / -less
    ("s3_suf_ful_less", "-ful", "suffix", "가득한 (형용사화)", "care", "돌봄, 주의", "명사", "careful", "조심스러운, 주의 깊은", "형용사", "명사 + -ful → 형용사"),
    ("s3_suf_ful_less", "-less", "suffix", "없는 (형용사화)", "care", "주의", "명사", "careless", "부주의한, 경솔한", "형용사", "명사 + -less → 부정 형용사"),
    ("s3_suf_ful_less", "-ful", "suffix", "가득한 (형용사화)", "use", "사용, 쓸모", "명사", "useful", "유용한, 쓸모 있는", "형용사", "명사 + -ful → 형용사"),
    ("s3_suf_ful_less", "-less", "suffix", "없는 (형용사화)", "use", "쓸모", "명사", "useless", "쓸모없는, 소용없는", "형용사", "명사 + -less → 반대 형용사"),
    ("s3_suf_ful_less", "-ful", "suffix", "가득한 (형용사화)", "help", "도움", "명사", "helpful", "도움이 되는", "형용사", "도움이 가득한 → 형용사"),
    ("s3_suf_ful_less", "-less", "suffix", "없는 (형용사화)", "home", "집", "명사", "homeless", "집이 없는", "형용사", "집이 없는 상태의 형용사"),
    ("s3_suf_ful_less", "-ful", "suffix", "가득한 (형용사화)", "power", "힘", "명사", "powerful", "강력한, 힘센", "형용사", "초중등 필수 형용사 파생"),
    ("s3_suf_ful_less", "-ful", "suffix", "가득한 (형용사화)", "wonder", "경이, 놀라움", "명사", "wonderful", "멋진, 훌륭한", "형용사", "명사 → 형용사"),
    # -ness
    ("s3_suf_ness", "-ness", "suffix", "~함, 성질 (명사화)", "happy", "행복한", "형용사", "happiness", "행복", "명사", "자음+y를 i로 바꾸고 -ness 결합"),
    ("s3_suf_ness", "-ness", "suffix", "~함, 성질 (명사화)", "kind", "친절한", "형용사", "kindness", "친절", "명사", "형용사 + -ness → 명사"),
    ("s3_suf_ness", "-ness", "suffix", "~함, 성질 (명사화)", "dark", "어두운", "형용사", "darkness", "어둠", "명사", "상태 명사화"),
    ("s3_suf_ness", "-ness", "suffix", "~함, 성질 (명사화)", "sick", "아픈", "형용사", "sickness", "질병, 아픔", "명사", "상태 명사화"),
    ("s3_suf_ness", "-ness", "suffix", "~함, 성질 (명사화)", "weak", "약한", "형용사", "weakness", "약점, 나약함", "명사", "형용사 → 추상명사"),
    ("s3_suf_ness", "-ness", "suffix", "~함, 성질 (명사화)", "good", "착한, 좋은", "형용사", "goodness", "선함, 친절", "명사", "형용사 → 명사"),
    # -ment
    ("s3_suf_ment", "-ment", "suffix", "행위·결과 (명사화)", "agree", "동의하다", "동사", "agreement", "합의, 동의", "명사", "동사 + -ment → 명사"),
    ("s3_suf_ment", "-ment", "suffix", "행위·결과 (명사화)", "develop", "발전시키다", "동사", "development", "발전, 개발", "명사", "중고등 핵심 명사 파생"),
    ("s3_suf_ment", "-ment", "suffix", "행위·결과 (명사화)", "move", "움직이다", "동사", "movement", "움직임, 운동", "명사", "동사 + -ment → 명사"),
    ("s3_suf_ment", "-ment", "suffix", "행위·결과 (명사화)", "excite", "흥분시키다", "동사", "excitement", "흥분, 신남", "명사", "동사 + -ment → 감정 명사"),
    ("s3_suf_ment", "-ment", "suffix", "행위·결과 (명사화)", "treat", "다루다, 치료하다", "동사", "treatment", "치료, 대우", "명사", "동사 + -ment → 명사"),
    ("s3_suf_ment", "-ment", "suffix", "행위·결과 (명사화)", "achieve", "성취하다", "동사", "achievement", "성취, 업적", "명사", "중고등 필수 파생명사"),
    # -tion / -sion
    ("s3_suf_tion", "-tion", "suffix", "행위·상태 (명사화)", "act", "행동하다", "동사", "action", "행동, 조치", "명사", "동사 + -tion(ion) → 명사"),
    ("s3_suf_tion", "-tion", "suffix", "행위·상태 (명사화)", "invent", "발명하다", "동사", "invention", "발명품", "명사", "동사 → 명사 [션]"),
    ("s3_suf_tion", "-tion", "suffix", "행위·상태 (명사화)", "collect", "모으다", "동사", "collection", "수집, 소장품", "명사", "동사 → 명사 [션]"),
    ("s3_suf_tion", "-tion", "suffix", "행위·상태 (명사화)", "protect", "보호하다", "동사", "protection", "보호", "명사", "동사 → 명사 [션]"),
    ("s3_suf_tion", "-tion", "suffix", "행위·상태 (명사화)", "inform", "알리다", "동사", "information", "정보", "명사", "동사 + -ation → 명사"),
    ("s3_suf_tion", "-sion", "suffix", "행위·결과 (명사화)", "decide", "결정하다", "동사", "decision", "결정", "명사", "d로 끝나는 동사 + -sion"),
    # -er / -or
    ("s3_suf_er_or", "-er", "suffix", "~하는 사람·도구", "teach", "가르치다", "동사", "teacher", "선생님", "명사", "동사 + -er → 직업·사람"),
    ("s3_suf_er_or", "-er", "suffix", "~하는 사람·도구", "sing", "노래하다", "동사", "singer", "가수", "명사", "동사 + -er → 사람"),
    ("s3_suf_er_or", "-er", "suffix", "~하는 사람·도구", "write", "쓰다", "동사", "writer", "작가", "명사", "e로 끝나면 -r만 결합"),
    ("s3_suf_er_or", "-er", "suffix", "~하는 사람·도구", "draw", "그리다, 서랍을 당기다", "동사", "drawer", "서랍, 그리는 사람", "명사", "동사 + -er → 도구·사물"),
    ("s3_suf_er_or", "-or", "suffix", "~하는 사람·역할", "act", "연기하다, 행동하다", "동사", "actor", "배우", "명사", "동사 + -or → 사람 명사"),
    ("s3_suf_er_or", "-or", "suffix", "~하는 사람·역할", "visit", "방문하다", "동사", "visitor", "방문객", "명사", "동사 + -or → 사람 명사"),
    ("s3_suf_er_or", "-or", "suffix", "~하는 사람·도구", "create", "창조하다", "동사", "creator", "창작자, 창조주", "명사", "동사 + -or → 사람 명사"),
    # -able / -ible
    ("s3_suf_able", "-able", "suffix", "~할 수 있는 (형용사화)", "comfort", "위로, 편안", "명사/동사", "comfortable", "편안한", "형용사", "명사·동사 + -able → 형용사"),
    ("s3_suf_able", "-able", "suffix", "~할 수 있는 (형용사화)", "enjoy", "즐기다", "동사", "enjoyable", "즐거운", "형용사", "동사 + -able → 형용사"),
    ("s3_suf_able", "-able", "suffix", "~할 수 있는 (형용사화)", "reason", "이유, 이성", "명사", "reasonable", "합리적인", "형용사", "명사 + -able → 형용사"),
    ("s3_suf_able", "-able", "suffix", "~할 수 있는 (형용사화)", "believe", "믿다", "동사", "believable", "믿을 수 있는", "형용사", "묵음 e 탈락 후 -able 결합"),
    ("s3_suf_able", "-ible", "suffix", "~할 수 있는 (형용사화)", "sense", "감각", "명사", "sensible", "분별 있는, 현명한", "형용사", "어근 + -ible → 형용사"),
    ("s3_suf_able", "-able", "suffix", "~할 수 있는 (형용사화)", "value", "가치", "명사", "valuable", "귀중한, 가치 있는", "형용사", "중고등 필수 형용사 파생"),
    # -ly / -ous / -ive
    ("s3_suf_ly_ive", "-ly", "suffix", "~하게 (부사화)", "quick", "빠른", "형용사", "quickly", "빠르게", "부사", "형용사 + -ly → 부사"),
    ("s3_suf_ly_ive", "-ly", "suffix", "~하게 (부사화)", "loud", "시끄러운, 큰", "형용사", "loudly", "큰 소리로", "부사", "형용사 + -ly → 부사"),
    ("s3_suf_ly_ive", "-ly", "suffix", "~하게 (부사화)", "hard", "어려운, 열심히", "형용사", "hardly", "거의 ~않다", "부사", "뜻이 달라지는 중요 -ly 부사"),
    ("s3_suf_ly_ive", "-ous", "suffix", "~이 많은 (형용사화)", "danger", "위험", "명사", "dangerous", "위험한", "형용사", "명사 + -ous → 형용사"),
    ("s3_suf_ly_ive", "-ous", "suffix", "~이 많은 (형용사화)", "fame", "명성", "명사", "famous", "유명한", "형용사", "명사 + -ous → 형용사"),
    ("s3_suf_ly_ive", "-ive", "suffix", "~하는 성질 (형용사화)", "act", "행동하다", "동사", "active", "활동적인, 적극적인", "형용사", "동사 + -ive → 형용사"),
    ("s3_suf_ly_ive", "-ive", "suffix", "~하는 성질 (형용사화)", "effect", "효과", "명사", "effective", "효과적인", "형용사", "명사 + -ive → 형용사"),
    ("s3_suf_ly_ive", "-ive", "suffix", "~하는 성질 (형용사화)", "create", "만들다, 창조하다", "동사", "creative", "창의적인", "형용사", "동사 + -ive → 형용사"),
]


def main():
    elem_map = parse_elementary_800()
    mh_map = parse_mid_high_1800()

    merged = {}
    # Insert elementary first to keep concise elementary display forms where overlapping
    for num in sorted(elem_map.keys()):
        item = elem_map[num]
        w = item["word"]
        merged[w] = {
            "id": f"vb_{re.sub(r'[^a-z0-9]', '_', w)}",
            "word": w,
            "display_word": item["display_word"],
            "meaning_kr": item["meaning_kr"],
            "initial_letter": w[0].upper(),
            "is_elem_800": True,
            "is_mid_high": False,
            "elem_no": num,
            "mh_no": None,
            "elem_unit_key": None,
            "mh_unit_key": None,
            "phonics_spans": [],
            "phonics_unit_ids": [],
        }

    for num in sorted(mh_map.keys()):
        item = mh_map[num]
        w = item["word"]
        if w in merged:
            rec = merged[w]
            rec["is_mid_high"] = True
            rec["mh_no"] = num
            # Keep elementary meaning if identical/subset, otherwise combine concisely
            em = rec["meaning_kr"]
            mm = item["meaning_kr"]
            if mm and mm not in em and em not in mm:
                rec["meaning_kr"] = f"{em} · {mm}"
        else:
            merged[w] = {
                "id": f"vb_{re.sub(r'[^a-z0-9]', '_', w)}",
                "word": w,
                "display_word": item["display_word"],
                "meaning_kr": item["meaning_kr"],
                "initial_letter": w[0].upper(),
                "is_elem_800": False,
                "is_mid_high": True,
                "elem_no": None,
                "mh_no": num,
                "elem_unit_key": None,
                "mh_unit_key": None,
                "phonics_spans": [],
                "phonics_unit_ids": [],
            }

    curated_prompts = load_curated_prompts()
    words_list = sorted(merged.values(), key=lambda x: (x["word"], x["elem_no"] or 9999))
    for w_rec in words_list:
        cur = curated_prompts.get(w_rec["id"])
        if cur is not None and "is_abstract" in cur:
            w_rec["is_abstract"] = bool(cur["is_abstract"])
        else:
            w_rec["is_abstract"] = (
                w_rec["word"] in CURATED_ABSTRACT_WORDS
                or str(w_rec["meaning_kr"]).strip().startswith("~")
            )
        webp_path = os.path.join(VOCAB_IMG_DIR, f"{w_rec['id']}.webp")
        if w_rec["is_elem_800"] and os.path.exists(webp_path) and os.path.getsize(webp_path) > 500:
            w_rec["image_url"] = f"/vocab-images/{w_rec['id']}.webp"
        else:
            w_rec["image_url"] = None

    s1_all_units = build_stage1_all_units(words_list)
    s1_elem_units = build_stage1_units(words_list, "elem_800")
    s1_mh_units = build_stage1_units(words_list, "mid_high")

    # Stage 2 Phonics Tagging
    s2_counts = defaultdict(int)
    s2_samples = defaultdict(list)
    for w in words_list:
        spans = tag_phonics_spans(w["word"])
        w["phonics_spans"] = spans
        w["phonics_unit_ids"] = list(dict.fromkeys(sp["unit_id"] for sp in spans))
        for uid in w["phonics_unit_ids"]:
            s2_counts[uid] += 1
            if w["is_elem_800"] and len(s2_samples[uid]) < 6:
                s2_samples[uid].append(w["word"])
            elif not w["is_elem_800"] and len(s2_samples[uid]) < 6:
                s2_samples[uid].append(w["word"])

    s2_units = []
    for idx, u in enumerate(STAGE2_UNITS, 1):
        s2_units.append({
            **u,
            "tier": "all",
            "stage": 2,
            "word_count": s2_counts[u["id"]],
            "sort_order": idx,
        })

    # Stage 3 Affix Items
    word_lookup = {w["word"]: w for w in words_list}
    s3_counts = defaultdict(int)
    affix_items = []
    for idx, row in enumerate(RAW_AFFIX_FAMILIES, 1):
        uid, affix, atype, amean, root_w, root_m, root_pos, der_w, der_m, der_pos, note = row
        s3_counts[uid] += 1
        affix_items.append({
            "id": f"aff_{idx:03d}_{der_w}",
            "unit_id": uid,
            "affix": affix,
            "affix_type": atype,
            "affix_meaning_kr": amean,
            "root_word": root_w,
            "root_meaning_kr": root_m,
            "root_pos": root_pos,
            "derived_word": der_w,
            "derived_meaning_kr": der_m,
            "derived_pos": der_pos,
            "explanation_kr": note,
            "root_in_pdf": root_w.lower() in word_lookup,
            "derived_in_pdf": der_w.lower() in word_lookup,
            "sort_order": idx,
        })

    s3_units = []
    for idx, u in enumerate(STAGE3_UNITS, 1):
        s3_units.append({
            **u,
            "tier": "all",
            "stage": 3,
            "word_count": s3_counts[u["id"]],
            "sort_order": idx,
        })

    all_units = s1_all_units + s1_elem_units + s1_mh_units + s2_units + s3_units

    payload = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "summary": {
            "elem_800_count": sum(1 for w in words_list if w["is_elem_800"]),
            "mid_high_1800_count": sum(1 for w in words_list if w["is_mid_high"]),
            "overlap_count": sum(1 for w in words_list if w["is_elem_800"] and w["is_mid_high"]),
            "total_unique_words": len(words_list),
            "stage1_all_units": len(s1_all_units),
            "stage1_elem_units": len(s1_elem_units),
            "stage1_mh_units": len(s1_mh_units),
            "stage2_units": len(s2_units),
            "stage3_units": len(s3_units),
            "affix_items_count": len(affix_items),
        },
        "units": all_units,
        "words": words_list,
        "affix_items": affix_items,
    }

    os.makedirs(os.path.dirname(OUT_JSON), exist_ok=True)
    with open(OUT_JSON, "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, indent=2)

    print("SUMMARY:", json.dumps(payload["summary"], ensure_ascii=False))
    print("\n--- STAGE 1 UNIFIED ALL A-Z UNITS ---")
    for u in s1_all_units:
        print(f"  {u['unit_key']:<6} ({u['word_count']:>3}) : {u['title_kr']}")
    for u in s1_elem_units:
        print(f"  {u['unit_key']:<6} ({u['word_count']:>2}) : {u['title_kr']}")
    print("\n--- STAGE 1 MID/HIGH 1800 UNITS ---")
    for u in s1_mh_units:
        print(f"  {u['unit_key']:<8} ({u['word_count']:>2}) : {u['title_kr']}")
    print("\n--- STAGE 2 PHONICS UNITS ---")
    for u in s2_units:
        print(f"  {u['id']:<15} ({u['word_count']:>3}) : {u['title_kr']} | e.g. {', '.join(s2_samples[u['id']])}")
    print("\n--- STAGE 3 AFFIX UNITS ---")
    for u in s3_units:
        print(f"  {u['id']:<16} ({u['word_count']:>2}) : {u['title_kr']}")


if __name__ == "__main__":
    main()

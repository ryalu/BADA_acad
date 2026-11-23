#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Build curated zero-text children's cartoon scene prompts and concrete/abstract tags
for all remaining Elementary 800 words (letters B-Z) in `data/elem_vocab_prompts.json`,
preserving any existing entries (such as the curated 34 Alphabet A entries).
"""

import concurrent.futures
import json
import os
import sys
import time
import urllib.error
import urllib.request

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MASTER_JSON = os.path.join(ROOT_DIR, "data", "vocab_master.json")
PROMPTS_JSON = os.path.join(ROOT_DIR, "data", "elem_vocab_prompts.json")


def load_openai_key() -> str:
    key = os.environ.get("OPENAI_API_KEY", "").strip()
    if key:
        return key
    env_path = os.path.join(ROOT_DIR, ".env")
    if os.path.exists(env_path):
        with open(env_path, "r", encoding="utf-8") as f:
            for line in f:
                s = line.strip()
                if not s or s.startswith("#") or "=" not in s:
                    continue
                k, v = s.split("=", 1)
                if k.strip() == "OPENAI_API_KEY":
                    return v.strip().strip('"').strip("'")
    return ""


def call_chat_batch(api_key: str, batch: list) -> dict:
    url = "https://api.openai.com/v1/chat/completions"
    items_payload = [
        {"id": w["id"], "word": w["word"], "meaning_kr": w["meaning_kr"]}
        for w in batch
    ]
    sys_prompt = (
        "You are an art director for a Korean children's English picture dictionary (elementary 800 words). "
        "For each input vocabulary entry, classify `is_abstract` (boolean: false for concrete objects, animals, "
        "people, places, foods, weather, body parts, clear visible actions or facial emotions; true for articles, "
        "prepositions, conjunctions, pronouns, auxiliaries, degree/time/frequency adverbs, and abstract concepts) "
        "AND write a `scene_prompt` (one vivid 15-30 word English description of a single cheerful children's cartoon illustration). "
        "For abstract words, describe a clear short visual mini-comic scene showing the concept intuitively (no text!). "
        "CRITICAL: Never include ANY written text, letters, numbers, labels, street signs, store signs, school signs, "
        "clock numbers if avoidable (or clean simple hands without numerals), or word bubbles in the description. "
        "For places like bank/school/library/hospital/bus/stop/store/station, depict pure visual architecture & recognizable icons "
        "(e.g., red cross emblem without words, yellow bus without route text, chalkboard with cute stars instead of ABCs). "
        "Return ONLY valid JSON of shape: {\"words\": {\"vb_example\": {\"is_abstract\": false, \"scene_prompt\": \"...\"}}}"
    )

    body = json.dumps({
        "model": "gpt-4o-mini",
        "temperature": 0.4,
        "response_format": {"type": "json_object"},
        "messages": [
            {"role": "system", "content": sys_prompt},
            {"role": "user", "content": json.dumps(items_payload, ensure_ascii=False)},
        ],
    }).encode("utf-8")

    last_err = None
    for attempt in range(4):
        req = urllib.request.Request(
            url,
            data=body,
            method="POST",
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {api_key}",
            },
        )
        try:
            with urllib.request.urlopen(req, timeout=90) as resp:
                data = json.loads(resp.read().decode("utf-8"))
            content = data["choices"][0]["message"]["content"]
            parsed = json.loads(content)
            words_out = parsed.get("words") if isinstance(parsed, dict) else None
            if isinstance(words_out, dict):
                return words_out
            raise RuntimeError("Missing 'words' object in JSON response")
        except urllib.error.HTTPError as e:
            err_txt = e.read().decode("utf-8", errors="ignore")
            last_err = f"HTTP {e.code}: {err_txt[:300]}"
            if e.code in (429, 500, 502, 503, 504) and attempt < 3:
                time.sleep(2.0 * (2 ** attempt))
                continue
            raise RuntimeError(last_err)
        except Exception as e:
            last_err = str(e)
            if attempt < 3:
                time.sleep(2.0 * (2 ** attempt))
                continue
            raise RuntimeError(last_err)
    raise RuntimeError(last_err or "Batch prompt generation failed")


def main():
    api_key = load_openai_key()
    if not api_key:
        print("ERROR: OPENAI_API_KEY not found", file=sys.stderr)
        sys.exit(1)

    with open(MASTER_JSON, "r", encoding="utf-8") as f:
        master = json.load(f)
    with open(PROMPTS_JSON, "r", encoding="utf-8") as f:
        prompts_data = json.load(f)

    existing_words = prompts_data.setdefault("words", {})
    elem_words = [w for w in master["words"] if w.get("is_elem_800")]
    missing = [w for w in elem_words if w["id"] not in existing_words]

    print(f"Elementary words: {len(elem_words)}, existing prompts: {len(existing_words)}, missing: {len(missing)}")
    if not missing:
        print("All 800 prompts already present.")
        return

    batch_size = 40
    batches = [missing[i : i + batch_size] for i in range(0, len(missing), batch_size)]

    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
        futures = {pool.submit(call_chat_batch, api_key, b): idx for idx, b in enumerate(batches, 1)}
        for fut in concurrent.futures.as_completed(futures):
            b_idx = futures[fut]
            batch = batches[b_idx - 1]
            res_map = fut.result()
            added = 0
            for w in batch:
                entry = res_map.get(w["id"])
                if isinstance(entry, dict) and entry.get("scene_prompt"):
                    existing_words[w["id"]] = {
                        "is_abstract": bool(entry.get("is_abstract", w.get("is_abstract", False))),
                        "scene_prompt": str(entry["scene_prompt"]).strip(),
                    }
                    added += 1
                else:
                    existing_words[w["id"]] = {
                        "is_abstract": bool(w.get("is_abstract", False)),
                        "scene_prompt": (
                            f"Cheerful children's cartoon scene clearly illustrating '{w['word']}' "
                            f"with friendly child or animal characters and pure visual cues, zero text or numbers."
                        ),
                    }
                    added += 1
            print(f"[Batch {b_idx}/{len(batches)}] merged {added}/{len(batch)} prompts")

    with open(PROMPTS_JSON, "w", encoding="utf-8") as f:
        json.dump(prompts_data, f, ensure_ascii=False, indent=2)

    elem_ids = {w["id"] for w in elem_words}
    covered = sum(1 for wid in elem_ids if wid in existing_words)
    print(f"Done! Elementary prompt coverage: {covered}/{len(elem_ids)}")
    if covered < len(elem_ids):
        sys.exit(2)


if __name__ == "__main__":
    main()

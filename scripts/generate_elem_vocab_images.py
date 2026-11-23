#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Generate consistent children's cartoon WebP illustrations for Elementary 800 words
using OpenAI Images API (`gpt-image-1-mini`, fallback `gpt-image-1`), resize to 384x384 WebP,
and update `data/vocab_master.json`.
"""

import argparse
import base64
import concurrent.futures
import io
import json
import math
import os
import sys
import time
import urllib.error
import urllib.request
from PIL import Image, ImageDraw, ImageFont

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MASTER_JSON = os.path.join(ROOT_DIR, "data", "vocab_master.json")
PROMPTS_JSON = os.path.join(ROOT_DIR, "data", "elem_vocab_prompts.json")
OUT_DIR = os.path.join(ROOT_DIR, "public", "vocab-images")


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


def build_prompt_for_word(word_rec: dict, prompts_data: dict) -> str:
    style_anchor = prompts_data.get(
        "style_anchor",
        "Cute Korean children's storybook 2D cartoon illustration, clean soft dark-brown ink outlines, warm pastel coloring, centered single visual scene on soft warm-white background, strictly no text, no letters, no numbers."
    )
    curated = prompts_data.get("words", {}).get(word_rec["id"])
    if curated and curated.get("scene_prompt"):
        scene = curated["scene_prompt"]
    elif word_rec.get("is_abstract"):
        scene = (
            f"A short expressive cute cartoon scene visually demonstrating the concept '{word_rec['word']}' "
            f"(meaning: {word_rec['meaning_kr']}) with friendly children or cute animals using clear gestures and storytelling cues, no text anywhere."
        )
    else:
        scene = (
            f"Clear cheerful children's storybook cartoon illustration of '{word_rec['word']}' "
            f"(meaning: {word_rec['meaning_kr']}), centered and easy for young children to recognize immediately, no text anywhere."
        )
    return f"{style_anchor} Scene: {scene}"


def call_openai_image(api_key: str, prompt: str) -> bytes:
    url = "https://api.openai.com/v1/images/generations"
    models = ["gpt-image-1-mini", "gpt-image-1"]
    last_err = None

    for model in models:
        for attempt in range(2):
            body = json.dumps({
                "model": model,
                "prompt": prompt,
                "size": "1024x1024",
                "quality": "low",
                "output_format": "webp",
                "output_compression": 85,
            }).encode("utf-8")
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
                    payload = json.loads(resp.read().decode("utf-8"))
                b64 = (payload.get("data") or [{}])[0].get("b64_json", "")
                if not b64:
                    raise RuntimeError(f"Empty b64_json from {model}")
                return base64.b64decode(b64)
            except urllib.error.HTTPError as e:
                err_txt = e.read().decode("utf-8", errors="ignore")
                last_err = f"HTTP {e.code} ({model}): {err_txt[:300]}"
                if e.code in (429, 500, 502, 503, 504) and attempt == 0:
                    time.sleep(2.0)
                    continue
                break
            except Exception as e:
                last_err = f"{model}: {e}"
                if attempt == 0:
                    time.sleep(1.5)
                    continue
                break
    raise RuntimeError(last_err or "Image generation failed")


def save_resized_webp(raw_bytes: bytes, dest_path: str) -> int:
    img = Image.open(io.BytesIO(raw_bytes)).convert("RGB")
    img = img.resize((384, 384), Image.Resampling.LANCZOS)
    os.makedirs(os.path.dirname(dest_path), exist_ok=True)
    img.save(dest_path, format="WEBP", quality=82, method=6)
    return os.path.getsize(dest_path)


def build_contact_sheet(word_records: list, out_path: str):
    if not word_records:
        return
    cols = 6
    rows = math.ceil(len(word_records) / cols)
    thumb = 210
    pad = 14
    caption_h = 36
    cell_w = thumb + pad
    cell_h = thumb + caption_h + pad
    sheet_w = cols * cell_w + pad
    sheet_h = rows * cell_h + pad + 44

    canvas = Image.new("RGB", (sheet_w, sheet_h), (250, 248, 244))
    draw = ImageDraw.Draw(canvas)

    font_path = r"C:\Windows\Fonts\malgun.ttf"
    if os.path.exists(font_path):
        title_font = ImageFont.truetype(font_path, 22)
        cap_font = ImageFont.truetype(font_path, 15)
    else:
        title_font = ImageFont.load_default()
        cap_font = ImageFont.load_default()

    draw.text(
        (pad, 12),
        f"BADA 초등 영단어 만화 일러스트 샘플 ({len(word_records)}개) - 구체어 18 + 추상어 16",
        fill=(25, 45, 70),
        font=title_font,
    )

    for idx, rec in enumerate(word_records):
        r = idx // cols
        c = idx % cols
        x0 = pad + c * cell_w
        y0 = 48 + pad + r * cell_h
        img_file = os.path.join(OUT_DIR, f"{rec['id']}.webp")
        if os.path.exists(img_file):
            im = Image.open(img_file).convert("RGB").resize((thumb, thumb), Image.Resampling.LANCZOS)
            canvas.paste(im, (x0, y0))
        draw.rectangle([x0, y0, x0 + thumb, y0 + thumb], outline=(210, 218, 228), width=2)
        tag = "[추상]" if rec.get("is_abstract") else "[구체]"
        label_color = (120, 75, 160) if rec.get("is_abstract") else (14, 116, 144)
        draw.text((x0 + 4, y0 + thumb + 5), f"{rec['word']} {tag}", fill=label_color, font=cap_font)

    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    canvas.save(out_path, format="PNG", optimize=True)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--letter", default="A", help="Alphabet letter to generate (e.g. A)")
    parser.add_argument("--all", action="store_true", help="Generate all 800 elementary images")
    parser.add_argument("--force", action="store_true", help="Overwrite existing WebP files")
    parser.add_argument("--workers", type=int, default=5, help="Parallel workers")
    parser.add_argument("--sheet", default="", help="Optional path for labeled contact sheet PNG")
    args = parser.parse_args()

    api_key = load_openai_key()
    if not api_key:
        print("ERROR: OPENAI_API_KEY not found in environment or .env", file=sys.stderr)
        sys.exit(1)

    with open(MASTER_JSON, "r", encoding="utf-8") as f:
        master = json.load(f)
    with open(PROMPTS_JSON, "r", encoding="utf-8") as f:
        prompts_data = json.load(f)

    target_letter = args.letter.strip().upper()[:1]
    targets = [
        w for w in master["words"]
        if w.get("is_elem_800") and (args.all or w.get("initial_letter") == target_letter)
    ]
    # Order concrete first, then abstract
    targets.sort(key=lambda w: (1 if w.get("is_abstract") else 0, w["word"]))

    os.makedirs(OUT_DIR, exist_ok=True)

    def process_one(rec):
        dest = os.path.join(OUT_DIR, f"{rec['id']}.webp")
        if os.path.exists(dest) and not args.force and os.path.getsize(dest) > 500:
            return rec["id"], "skipped", os.path.getsize(dest)
        prompt = build_prompt_for_word(rec, prompts_data)
        raw = call_openai_image(api_key, prompt)
        size_b = save_resized_webp(raw, dest)
        return rec["id"], "generated", size_b

    done_count = 0
    errors = []
    with concurrent.futures.ThreadPoolExecutor(max_workers=max(1, args.workers)) as pool:
        futures = {pool.submit(process_one, rec): rec for rec in targets}
        for fut in concurrent.futures.as_completed(futures):
            rec = futures[fut]
            try:
                wid, status, sz = fut.result()
                done_count += 1
                print(f"[{done_count}/{len(targets)}] {wid} ({rec['word']}): {status} ({sz} bytes)")
            except Exception as e:
                errors.append((rec["id"], str(e)))
                print(f"[ERROR] {rec['id']} ({rec['word']}): {e}", file=sys.stderr)

    # Sync image_url in vocab_master.json for all existing files
    total_with_img = 0
    for w in master["words"]:
        webp_path = os.path.join(OUT_DIR, f"{w['id']}.webp")
        if w.get("is_elem_800") and os.path.exists(webp_path) and os.path.getsize(webp_path) > 500:
            w["image_url"] = f"/vocab-images/{w['id']}.webp"
            total_with_img += 1
        else:
            w["image_url"] = None

    with open(MASTER_JSON, "w", encoding="utf-8") as f:
        json.dump(master, f, ensure_ascii=False, indent=2)

    if args.sheet:
        build_contact_sheet(targets, args.sheet)
        print(f"Contact sheet written to: {args.sheet}")

    print(f"Done: targets={len(targets)}, errors={len(errors)}, total_imaged_in_master={total_with_img}")
    if errors:
        sys.exit(2)


if __name__ == "__main__":
    main()

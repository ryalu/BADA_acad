import type { WorksheetTheme } from "./worksheetThemes";

export function escHtml(s: unknown): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Splits English text on word boundaries so each line fits comfortably
 * inside the printable SVG 4-line guide box without horizontal clipping.
 */
export function wrapEnglishLines(text: string, maxChars = 34): string[] {
  const clean = String(text || "").trim().replace(/\s+/g, " ");
  if (!clean) return [""];
  const words = clean.split(" ");
  const lines: string[] = [];
  let cur = "";

  for (const w of words) {
    if (!cur) {
      cur = w;
    } else if (cur.length + 1 + w.length <= maxChars) {
      cur += ` ${w}`;
    } else {
      lines.push(cur);
      cur = w;
    }
  }
  if (cur) lines.push(cur);
  return lines;
}

export interface RuledSvgOptions {
  text?: string;
  showShadow?: boolean;
  fontSize?: number;
  maxChars?: number;
  minLines?: number;
  svgWidth?: number;
  theme: WorksheetTheme;
}

/**
 * Renders an SVG 4-line handwriting block using `Andika` single-story literacy metrics:
 * - Ascender / Cap top line (`r-top`): baseline - fontSize * 0.74
 * - x-Height dashed midline (`r-mid`): baseline - fontSize * 0.51
 * - Alphabetic baseline (`r-base`): exact `<text y={baselineY}>` coordinate
 * - Descender bottom line (`r-bot`): baseline + fontSize * 0.25
 *
 * When rendered in the print window, `CALIBRATION_SCRIPT_SNIPPET` also measures the loaded
 * `Andika` webfont via Canvas TextMetrics after `document.fonts.ready` and snaps every line.
 */
export function renderRuledSvgBlock({
  text = "",
  showShadow = false,
  fontSize = 26,
  maxChars = 32,
  minLines = 1,
  svgWidth = 560,
  theme
}: RuledSvgOptions): string {
  const lines = text ? wrapEnglishLines(text, maxChars) : [];
  while (lines.length < minLines) {
    lines.push("");
  }

  const padTop = Math.round(fontSize * 0.92);
  const padBot = Math.round(fontSize * 0.34);
  const svgHeight = padTop + padBot;
  const baselineY = padTop;

  const yTop = (baselineY - fontSize * 0.74).toFixed(2);
  const yMid = (baselineY - fontSize * 0.51).toFixed(2);
  const yBase = baselineY.toFixed(2);
  const yBot = (baselineY + fontSize * 0.25).toFixed(2);

  return lines
    .map((lineText) => {
      const shadowHtml =
        showShadow && lineText
          ? `<text class="trace-svg-text" x="8" y="${yBase}" font-size="${fontSize}" dominant-baseline="alphabetic">${escHtml(
              lineText
            )}</text>`
          : "";

      return `
        <svg class="ruled-svg" viewBox="0 0 ${svgWidth} ${svgHeight}" preserveAspectRatio="xMinYMid meet" data-fs="${fontSize}" data-base="${yBase}">
          <line class="r-top" x1="0" y1="${yTop}" x2="${svgWidth}" y2="${yTop}" stroke="${theme.outerlineColor}" stroke-width="1" />
          <line class="r-mid" x1="0" y1="${yMid}" x2="${svgWidth}" y2="${yMid}" stroke="${theme.midlineColor}" stroke-width="1.15" stroke-dasharray="5,4" />
          <line class="r-base" x1="0" y1="${yBase}" x2="${svgWidth}" y2="${yBase}" stroke="${theme.baselineColor}" stroke-width="1.35" stroke-opacity="0.72" />
          <line class="r-bot" x1="0" y1="${yBot}" x2="${svgWidth}" y2="${yBot}" stroke="${theme.outerlineColor}" stroke-width="1" />
          ${shadowHtml}
        </svg>`;
    })
    .join("");
}

/**
 * Runtime script embedded in the print popup so `r-top`, `r-mid`, and `r-bot`
 * snap cleanly to the browser's rendered `Andika` metrics after fonts load.
 */
export const CALIBRATION_SCRIPT_SNIPPET = `
function calibrateRuledLines() {
  try {
    var canvas = document.createElement('canvas');
    var ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.font = '400 100px "Andika", sans-serif';
    var mCap = ctx.measureText('Hbdkl');
    var mX = ctx.measureText('acemnosx');
    var mDesc = ctx.measureText('gjpqy');
    var capRatio = mCap && mCap.actualBoundingBoxAscent ? (mCap.actualBoundingBoxAscent / 100) : 0.74;
    var xRatio = mX && mX.actualBoundingBoxAscent ? (mX.actualBoundingBoxAscent / 100) : 0.51;
    var descRatio = mDesc && mDesc.actualBoundingBoxDescent ? (mDesc.actualBoundingBoxDescent / 100) : 0.25;
    if (capRatio < 0.6 || capRatio > 0.9) capRatio = 0.74;
    if (xRatio < 0.4 || xRatio > 0.65) xRatio = 0.51;
    if (descRatio < 0.15 || descRatio > 0.4) descRatio = 0.25;

    var svgs = document.querySelectorAll('svg.ruled-svg');
    for (var i = 0; i < svgs.length; i++) {
      var svg = svgs[i];
      var fs = parseFloat(svg.getAttribute('data-fs') || '26');
      var base = parseFloat(svg.getAttribute('data-base') || '24');
      var topY = (base - fs * capRatio).toFixed(2);
      var midY = (base - fs * xRatio).toFixed(2);
      var botY = (base + fs * descRatio).toFixed(2);
      var lTop = svg.querySelector('.r-top');
      var lMid = svg.querySelector('.r-mid');
      var lBot = svg.querySelector('.r-bot');
      if (lTop) { lTop.setAttribute('y1', topY); lTop.setAttribute('y2', topY); }
      if (lMid) { lMid.setAttribute('y1', midY); lMid.setAttribute('y2', midY); }
      if (lBot) { lBot.setAttribute('y1', botY); lBot.setAttribute('y2', botY); }
    }
  } catch (e) {}
}
`;

/**
 * Saddle-stitch (중철 A4 -> 반접기 A5) booklet imposition helper.
 * Pads total pages cleanly to a multiple of 4, then pairs front/back A5 slots
 * across A4 landscape sheets so folding & stapling reads 1 -> 2 -> ... -> N.
 */
export function computeBookletImpositionPairs(totalPages: number): {
  sheetNumber: number;
  side: "front" | "back";
  leftIndex: number;
  rightIndex: number;
}[] {
  const safeTotal = Math.max(4, Math.ceil(totalPages / 4) * 4);
  const physicalSheets = safeTotal / 4;
  const pairs: {
    sheetNumber: number;
    side: "front" | "back";
    leftIndex: number;
    rightIndex: number;
  }[] = [];

  for (let s = 0; s < physicalSheets; s += 1) {
    pairs.push({
      sheetNumber: s + 1,
      side: "front",
      leftIndex: safeTotal - 1 - 2 * s,
      rightIndex: 2 * s
    });
    pairs.push({
      sheetNumber: s + 1,
      side: "back",
      leftIndex: 2 * s + 1,
      rightIndex: safeTotal - 2 - 2 * s
    });
  }

  return pairs;
}

export function buildBookletImpositionHtml(
  pagesHtml: string[],
  padPageFactory: (pageNumber: number) => string
): string {
  const padded = [...pagesHtml];
  while (padded.length % 4 !== 0 || padded.length < 4) {
    padded.push(padPageFactory(padded.length + 1));
  }

  const pairs = computeBookletImpositionPairs(padded.length);

  return pairs
    .map(
      (pair) => `
      <div class="booklet-sheet" data-sheet="${pair.sheetNumber}" data-side="${pair.side}">
        <div class="booklet-half">
          <div class="booklet-scale">${padded[pair.leftIndex]}</div>
        </div>
        <div class="booklet-fold-guide" aria-hidden="true"></div>
        <div class="booklet-half">
          <div class="booklet-scale">${padded[pair.rightIndex]}</div>
        </div>
      </div>`
    )
    .join("");
}

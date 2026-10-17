/** @file Error map + wrong/missing pixel scanner.
 * Compares the pixels of a template tile against the live canvas tile and reports which template
 * pixels are correct, wrong (painted with another colour) or missing (not painted yet).
 * The error map idea (green/red markers) comes from Skirk Marble, which got it from Hao-1337's Wplace-BM.
 * This implementation is written for Blue Marble's 3x3 enlarged tile format and palette lookup table.
 * @since 1.0.0
 */

// Little-endian ABGR colours (what a Uint32Array over RGBA ImageData bytes expects)
const COLOR_WRONG = 0xBE0000FF;   // rgba(255, 0, 0, ~0.75)
const COLOR_MISSING = 0x9600D2FF; // rgba(255, 210, 0, ~0.59)
const COLOR_CORRECT = 0x6E00C800; // rgba(0, 200, 0, ~0.43)

/** Scans one template tile.
 * @param {Object} params - Parameters
 * @param {Uint32Array} params.tile32 - The live canvas tile, enlarged, as Uint32Array
 * @param {Uint32Array} params.template32 - The UNFILTERED template tile, enlarged, as Uint32Array
 * @param {number[]} params.templateInfo - [x offset, y offset, width, height] of the template inside the enlarged tile
 * @param {number} params.drawMult - Enlargement factor (odd number, normally 3)
 * @param {number} params.tileWidth - Width of the enlarged tile
 * @param {Map<number, number>} params.lookup - Colour (Uint32) -> palette ID. Erased (#deface) is -1
 * @param {number} params.tolerance - Alpha tolerance used to decide if a pixel is transparent
 * @param {Map<number, boolean>} params.shouldFilter - Palette IDs hidden by the colour filter
 * @param {boolean} [params.drawOverlay=false] - Build the overlay pixel buffer?
 * @param {boolean} [params.showCorrect=false] - Mark correct pixels (green dot)?
 * @param {boolean} [params.showMissing=true] - Mark missing pixels (yellow)?
 * @param {number} [params.maxList=5000] - Maximum number of coordinates remembered per list
 * @returns {{overlay: Uint32Array|null, wrong: number[], missing: number[], counts: {correct: number, wrong: number, missing: number}}}
 *   `wrong` and `missing` are flat arrays of `[x0, y0, colorID0, x1, y1, colorID1, ...]` (tile pixel coordinates 0-999, template palette colour ID)
 */
export function scanTemplateTile({
  tile32, template32, templateInfo, drawMult, tileWidth, lookup, tolerance, shouldFilter,
  drawOverlay = false, showCorrect = false, showMissing = true, maxList = 5000
}) {

  const [offsetX, offsetY, width, height] = templateInfo;
  const overlay = drawOverlay ? new Uint32Array(width * height) : null;
  const wrong = [];
  const missing = [];
  const counts = {correct: 0, wrong: 0, missing: 0};
  const half = (drawMult - 1) >> 1;

  /** Paints the full enlarged pixel block into the overlay */
  const paintBlock = (row, column, color) => {
    for (let dy = -half; dy <= half; dy++) {
      const base = (row + dy) * width;
      for (let dx = -half; dx <= half; dx++) {
        overlay[base + column + dx] = color;
      }
    }
  };

  for (let row = half; row < height; row += drawMult) {
    for (let column = half; column < width; column += drawMult) {

      const tileRow = offsetY + row;
      const tileColumn = offsetX + column;
      if ((tileRow < 0) || (tileColumn < 0) || (tileRow >= tileWidth) || (tileColumn >= tileWidth)) {continue;}

      const templatePixel = template32[(row * width) + column];
      if (((templatePixel >>> 24) & 0xFF) <= tolerance) {continue;} // Not part of the template

      const templateID = lookup.get(templatePixel) ?? -2;
      if ((templateID === -2) || shouldFilter.get(templateID)) {continue;} // Unknown colour, or hidden by the filter

      const tilePixel = tile32[(tileRow * tileWidth) + tileColumn];
      const tileTransparent = ((tilePixel >>> 24) & 0xFF) <= tolerance;

      const pixelX = (tileColumn - half) / drawMult;
      const pixelY = (tileRow - half) / drawMult;

      let state; // 0 = correct, 1 = wrong, 2 = missing
      if (templateID === -1) {
        state = tileTransparent ? 0 : 1; // Erased (#deface) is correct only when the canvas pixel is empty
      } else if (tileTransparent) {
        state = 2;
      } else {
        state = ((lookup.get(tilePixel) ?? -2) === templateID) ? 0 : 1;
      }

      if (state === 0) {
        counts.correct++;
        if (overlay && showCorrect) {overlay[(row * width) + column] = COLOR_CORRECT;} // Subtle: only the centre dot
      } else if (state === 1) {
        counts.wrong++;
        if (wrong.length < (maxList * 3)) {wrong.push(pixelX, pixelY, templateID);}
        if (overlay) {paintBlock(row, column, COLOR_WRONG);}
      } else {
        counts.missing++;
        if (missing.length < (maxList * 3)) {missing.push(pixelX, pixelY, templateID);}
        if (overlay && showMissing) {paintBlock(row, column, COLOR_MISSING);}
      }
    }
  }

  return {overlay: overlay, wrong: wrong, missing: missing, counts: counts};
}

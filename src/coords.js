/** @file Coordinate helpers (tile/pixel <-> latitude/longitude).
 * Wplace is a 2048 x 2048 grid of 1000 x 1000 pixel tiles drawn on a Web Mercator map.
 * The tile/pixel -> lat/lng formula comes from Skirk Marble (courtesy of CloudBurst).
 * @since 1.0.0
 */

export const TILE_SIZE = 1000; // Pixels per tile edge
export const TILES_PER_SIDE = 2048; // Tiles per world edge
export const MAP_SIZE = TILE_SIZE * TILES_PER_SIDE; // 2,048,000 pixels

/** Converts [tileX, tileY, pixelX, pixelY] to a latitude/longitude pair
 * @param {number[]} coordinates - A 4 element array of numbers
 * @returns {{lat: number, lng: number} | undefined} `undefined` if the input is malformed
 * @since 1.0.0
 */
export function canvasPosToLatLng(coordinates) {
  if (!Array.isArray(coordinates) || coordinates.length !== 4) {return undefined;}
  const nums = coordinates.map(Number);
  if (nums.some(n => !Number.isFinite(n))) {return undefined;}

  const x = ((nums[0] * TILE_SIZE) + nums[2] + 0.5) / MAP_SIZE; // +0.5 = centre of the pixel
  const y = ((nums[1] * TILE_SIZE) + nums[3] + 0.5) / MAP_SIZE;

  return {
    lng: (360 * x) - 180,
    lat: (Math.atan(Math.exp(Math.PI - (2 * Math.PI * y))) - (Math.PI / 4)) * 360 / Math.PI
  };
}

/** Converts a latitude/longitude pair to [tileX, tileY, pixelX, pixelY]
 * @param {number} lat - Latitude in degrees
 * @param {number} lng - Longitude in degrees
 * @returns {number[] | undefined} 4 element array, or `undefined` if the input is not usable
 * @since 1.0.0
 */
export function latLngToCanvasPos(lat, lng) {
  lat = Number(lat); lng = Number(lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {return undefined;}
  const latClamped = Math.max(-85.0511, Math.min(85.0511, lat));
  const latRad = latClamped * Math.PI / 180;

  const x = (lng + 180) / 360;
  const y = (1 - (Math.log(Math.tan(latRad) + (1 / Math.cos(latRad))) / Math.PI)) / 2;

  const gx = Math.max(0, Math.min(MAP_SIZE - 1, Math.floor(x * MAP_SIZE)));
  const gy = Math.max(0, Math.min(MAP_SIZE - 1, Math.floor(y * MAP_SIZE)));

  return [Math.floor(gx / TILE_SIZE), Math.floor(gy / TILE_SIZE), gx % TILE_SIZE, gy % TILE_SIZE];
}

/** Parses free text such as "1231, 47, 183, 593", "Tl X: 1231 Tl Y: 47 Px X: 183 Px Y: 593"
 * or "-23.55, -46.63" (latitude, longitude).
 * @param {string} text - The text to parse
 * @returns {{type: 'canvas', coords: number[]} | {type: 'latlng', lat: number, lng: number} | undefined}
 * @since 1.0.0
 */
export function parseLocationText(text) {
  if (typeof text !== 'string') {return undefined;}
  const numbers = (text.match(/-?\d+(?:\.\d+)?/g) || []).map(Number);

  if (numbers.length === 4 && numbers.every(Number.isInteger)
    && numbers[0] >= 0 && numbers[0] < TILES_PER_SIDE && numbers[1] >= 0 && numbers[1] < TILES_PER_SIDE
    && numbers[2] >= 0 && numbers[2] < TILE_SIZE && numbers[3] >= 0 && numbers[3] < TILE_SIZE) {
    return {type: 'canvas', coords: numbers};
  }

  if (numbers.length === 2 && Math.abs(numbers[0]) <= 90 && Math.abs(numbers[1]) <= 180) {
    return {type: 'latlng', lat: numbers[0], lng: numbers[1]};
  }

  return undefined;
}

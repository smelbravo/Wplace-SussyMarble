/** @file Alliance packs: one JSON file lists every template of the alliance, and one click loads them all.
 * Anyone who loads the pack gets exactly the same templates at the same coordinates, and updates arrive by bumping `version`.
 * A pack only contains data (names, coordinates, image links). Nothing in it is ever run as code.
 * @since 1.1.0
 */

export const PACK_LIMITS = Object.freeze({
  maxTemplates: 100,
  maxPixelsPerTemplate: 4_000_000,
  maxImageBytes: 8 * 1024 * 1024,
  nameLength: 60
});

/** Checks a pack and returns clean entries.
 * @param {Object} json - The parsed pack file
 * @param {string} baseURL - Where the pack was loaded from (relative image links are resolved against it)
 * @returns {{name: string, version: string, templates: Array<{name: string, coords: number[], imageURL: string, version: string}>, problems: string[]}}
 */
export function parsePack(json, baseURL) {
  const problems = [];
  const templates = [];
  const packVersion = String(json?.version ?? '1');

  if (!json || !Array.isArray(json.templates)) {
    return {name: '', version: packVersion, templates: [], problems: ['The file has no "templates" list.']};
  }

  const seen = new Set();
  json.templates.slice(0, PACK_LIMITS.maxTemplates).forEach((entry, index) => {
    const label = `#${index + 1}${entry?.name ? ` "${String(entry.name).slice(0, 30)}"` : ''}`;

    const name = String(entry?.name ?? '').trim().slice(0, PACK_LIMITS.nameLength);
    if (!name) {problems.push(`${label}: missing name.`); return;}
    if (seen.has(name)) {problems.push(`${label}: another template already uses this name.`); return;}

    const rawCoords = Array.isArray(entry.coords) ? entry.coords : String(entry.coords ?? '').split(',');
    const coords = rawCoords.map(value => Number(String(value).trim()));
    const valid = (coords.length === 4) && coords.every(Number.isInteger)
      && (coords[0] >= 0) && (coords[0] < 2048) && (coords[1] >= 0) && (coords[1] < 2048)
      && (coords[2] >= 0) && (coords[2] < 1000) && (coords[3] >= 0) && (coords[3] < 1000);
    if (!valid) {problems.push(`${label}: "coords" must be [tileX, tileY, pixelX, pixelY] (tiles 0-2047, pixels 0-999).`); return;}

    let imageURL;
    try {
      imageURL = new URL(String(entry.image ?? ''), baseURL);
    } catch {
      problems.push(`${label}: "image" is not a valid link.`); return;
    }
    if (imageURL.protocol !== 'https:') {problems.push(`${label}: the image link must be https.`); return;}

    seen.add(name);
    templates.push({name: name, coords: coords, imageURL: imageURL.href, version: String(entry.version ?? packVersion)});
  });

  if (json.templates.length > PACK_LIMITS.maxTemplates) {problems.push(`Only the first ${PACK_LIMITS.maxTemplates} templates are used.`);}
  return {name: String(json.name ?? '').slice(0, 60), version: packVersion, templates: templates, problems: problems};
}

/** Makes the templates of the manager match the pack.
 * - A template that is new in the pack is created.
 * - A template whose coordinates, image link or version changed is replaced.
 * - A template that came from this pack but is no longer listed is removed.
 * - Templates the user made by hand, or that came from another pack, are never touched.
 * @param {Object} params - Parameters
 * @param {TemplateManager} params.templateManager - The template manager
 * @param {string} params.packURL - Link of the pack file
 * @param {(url: string) => Promise<string>} params.fetchText - Downloads text
 * @param {(url: string) => Promise<Blob>} params.fetchBlob - Downloads a file
 * @param {(message: string) => void} [params.onProgress] - Progress messages
 * @param {(blob: Blob) => Promise<{width: number, height: number}>} [params.measure] - Image size (default: createImageBitmap)
 * @returns {Promise<{added: string[], updated: string[], unchanged: string[], removed: string[], failed: string[], problems: string[]}>}
 */
export async function syncPack({templateManager, packURL, fetchText, fetchBlob, onProgress = () => {}, measure = measureImage}) {
  const summary = {added: [], updated: [], unchanged: [], removed: [], failed: [], problems: []};

  onProgress('Downloading the pack...');
  let json;
  try {
    json = JSON.parse(await fetchText(packURL));
  } catch (error) {
    throw new Error(`Could not read the pack (${error?.message ?? error}). Check the link.`);
  }

  const pack = parsePack(json, packURL);
  summary.problems = pack.problems;

  const mine = () => templateManager.templatesArray.filter(template => template.pack?.url === packURL);

  for (let index = 0; index < pack.templates.length; index++) {
    const entry = pack.templates[index];
    onProgress(`Loading ${index + 1}/${pack.templates.length}: ${entry.name}`);

    const existing = mine().find(template => template.pack?.name === entry.name);
    const sameCoords = existing?.coords && (existing.coords.map(Number).join(',') === entry.coords.join(','));
    if (existing && sameCoords && (String(existing.pack.version) === entry.version) && (existing.pack.image === entry.imageURL)) {
      summary.unchanged.push(entry.name);
      continue;
    }

    try {
      const blob = await fetchBlob(entry.imageURL);
      if (blob.size > PACK_LIMITS.maxImageBytes) {throw new Error('the image is too big (over 8 MB)');}
      const {width, height} = await measure(blob);
      if (!(width > 0) || !(height > 0)) {throw new Error('not a valid image');}
      if ((width * height) > PACK_LIMITS.maxPixelsPerTemplate) {throw new Error(`the image is too big (${width}x${height})`);}

      if (existing) {await templateManager.removeTemplate(existing);}
      await templateManager.createTemplate(blob, entry.name, entry.coords, {url: packURL, name: entry.name, version: entry.version, image: entry.imageURL});
      (existing ? summary.updated : summary.added).push(entry.name);
    } catch (error) {
      summary.failed.push(`${entry.name}: ${error?.message ?? error}`);
    }
  }

  // Templates that came from this pack and were taken out of it
  const listed = new Set(pack.templates.map(entry => entry.name));
  if (pack.templates.length > 0) { // An empty/broken pack must never wipe everything
    for (const template of mine()) {
      if (!listed.has(template.pack?.name)) {
        await templateManager.removeTemplate(template);
        summary.removed.push(template.displayName);
      }
    }
  }

  return summary;
}

async function measureImage(blob) {
  const bitmap = await createImageBitmap(blob);
  const size = {width: bitmap.width, height: bitmap.height};
  bitmap.close?.();
  return size;
}

/** One line that says what happened. */
export function describeSummary(summary) {
  const parts = [];
  if (summary.added.length) {parts.push(`${summary.added.length} added`);}
  if (summary.updated.length) {parts.push(`${summary.updated.length} updated`);}
  if (summary.removed.length) {parts.push(`${summary.removed.length} removed`);}
  if (summary.unchanged.length) {parts.push(`${summary.unchanged.length} already up to date`);}
  if (summary.failed.length) {parts.push(`${summary.failed.length} failed`);}
  return parts.length ? parts.join(', ') + '.' : 'Nothing to do.';
}

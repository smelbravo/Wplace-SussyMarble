import WindowBase from "./WindowBase";
import { canvasPosToLatLng, latLngToCanvasPos, parseLocationText } from "./coords";
import { httpGetText, storageGetJSON, storageSetJSON } from "./gm";
import { navigate, setPixelRatioZoom } from "./mapBridge";

const FAVORITES_KEY = 'bmFavorites';

/** Location search (OpenStreetMap Nominatim), favorites and "go to coordinates".
 * The search + favorites concept comes from Skirk Marble (which credits pixelkat5's Wplace-Red-planet).
 * "Go to tile coordinates / go to template" is inspired by the t-wy fork's teleport buttons.
 * @class WindowSearch
 * @since 1.0.0
 */
export default class WindowSearch extends WindowBase {

  constructor(name, version) {
    super(name, version, 'bm-window-search', 'Location Search');
    this.favorites = [];
    this.lastSearch = 0; // Nominatim asks for at most 1 request per second
  }

  /** @returns {'fly'|'url'} The user's preferred navigation method */
  #method() {
    return this.settingsManager?.userSettings?.flags?.includes('nav-url') ? 'url' : 'fly';
  }

  async buildWindow() {

    const content = this.createShell();
    if (!content) {return;}

    this.favorites = await storageGetJSON(FAVORITES_KEY, []);
    if (!Array.isArray(this.favorites)) {this.favorites = [];}

    const status = this.el('small', {className: 'bm-sussy-status'});
    this.statusElement = status;

    // --- Search ---
    const input = this.el('input', {type: 'text', placeholder: 'Search for a place...', className: 'bm-sussy-input', maxLength: 120});
    const searchButton = this.el('button', {textContent: 'Search'});
    const results = this.el('div', {className: 'bm-sussy-list'});
    this.resultsElement = results;

    const doSearch = () => this.#search(input.value.trim());
    searchButton.onclick = doSearch;
    input.addEventListener('keydown', (event) => {if (event.key === 'Enter') {doSearch();}});

    // --- Go to coordinates ---
    const goInput = this.el('input', {type: 'text', placeholder: 'Tl X, Tl Y, Px X, Px Y  or  lat, lng', className: 'bm-sussy-input', maxLength: 80});
    const goButton = this.el('button', {textContent: 'Go'});
    goButton.onclick = () => this.#goToInput(goInput.value);
    goInput.addEventListener('keydown', (event) => {if (event.key === 'Enter') {goButton.click();}});

    const goMainButton = this.el('button', {textContent: '📍 Main window coords', title: 'Go to the coordinates in the main window\'s boxes'});
    goMainButton.onclick = () => {
      const coords = this.#mainWindowCoords();
      if (!coords) {this.#setStatus('The coordinate boxes in the main window are empty or invalid.'); return;}
      this.#goTo(coords);
    };

    const goTemplateButton = this.el('button', {textContent: '🗺️ Template corner', title: 'Go to the top-left corner of the first template'});
    goTemplateButton.onclick = () => {
      const template = this.apiManager?.templateManager?.templatesArray?.[0];
      if (!template?.coords) {this.#setStatus('There is no template to go to.'); return;}
      this.#goTo(template.coords.map(Number));
    };

    // --- Favorites ---
    const favFilter = this.el('input', {type: 'text', placeholder: 'Filter favorites...', className: 'bm-sussy-input', maxLength: 60});
    this.favoritesElement = this.el('div', {className: 'bm-sussy-list'});
    favFilter.addEventListener('input', () => this.#renderFavorites(favFilter.value));
    this.favFilter = favFilter;

    const favName = this.el('input', {type: 'text', placeholder: 'Name for the favorite (optional)', className: 'bm-sussy-input', maxLength: 60});
    const favAdd = this.el('button', {textContent: '⭐ Save main window coords'});
    favAdd.onclick = async () => {
      const coords = this.#mainWindowCoords();
      if (!coords) {this.#setStatus('Fill the coordinate boxes in the main window first.'); return;}
      const latlng = canvasPosToLatLng(coords);
      await this.#addFavorite({name: favName.value.trim() || `Tile ${coords[0]},${coords[1]} • Px ${coords[2]},${coords[3]}`, lat: latlng.lat, lng: latlng.lng, coords: coords});
      favName.value = '';
    };

    content.append(
      this.el('div', {className: 'bm-container bm-sussy-row'}, input, searchButton),
      results,
      this.el('hr'),
      this.el('div', {className: 'bm-container bm-sussy-row'}, goInput, goButton),
      this.el('div', {className: 'bm-container bm-sussy-row'}, goMainButton, goTemplateButton),
      this.el('hr'),
      this.el('h2', {textContent: '🔎 Zoom (screen pixels per Wplace pixel)'}),
      this.el('div', {className: 'bm-container bm-sussy-row'}, ...[1, 2, 3, 4, 5, 10].map(ratio => {
        const button = this.el('button', {textContent: `${ratio}x`, title: `Each Wplace pixel covers ${ratio} screen pixel(s): ideal for screenshots`});
        button.onclick = async () => {
          const {ok} = await setPixelRatioZoom(ratio);
          this.#setStatus(ok ? `Zoom set to ${ratio}x.` : 'Could not reach the map to change the zoom.');
        };
        return button;
      })),
      this.el('hr'),
      this.el('h2', {textContent: '⭐ Favorites'}),
      favFilter,
      this.favoritesElement,
      favName,
      favAdd,
      this.el('hr'),
      status
    );

    this.#renderFavorites('');
  }

  #setStatus(text) {
    if (this.statusElement) {this.statusElement.textContent = text;}
  }

  /** Reads the 4 coordinate boxes of the main window */
  #mainWindowCoords() {
    const ids = ['bm-input-tx', 'bm-input-ty', 'bm-input-px', 'bm-input-py'];
    const values = ids.map(id => document.getElementById(id)?.value);
    const parsed = parseLocationText(values.join(', '));
    return (parsed?.type === 'canvas') ? parsed.coords : undefined;
  }

  async #goTo(canvasCoords) {
    const latlng = canvasPosToLatLng(canvasCoords);
    if (!latlng) {this.#setStatus('Those coordinates are not valid.'); return;}
    this.#setStatus('Moving the map...');
    const used = await navigate(latlng.lat, latlng.lng, this.#method());
    this.#setStatus(used === 'fly' ? 'Done.' : 'Opened the location by URL.');
  }

  async #goToInput(text) {
    const parsed = parseLocationText(text);
    if (!parsed) {this.#setStatus('Use "Tl X, Tl Y, Px X, Px Y" or "lat, lng".'); return;}
    if (parsed.type === 'canvas') {return this.#goTo(parsed.coords);}
    this.#setStatus('Moving the map...');
    await navigate(parsed.lat, parsed.lng, this.#method());
    this.#setStatus('Done.');
  }

  async #search(query) {
    if (!query) {return;}

    const wait = 1100 - (Date.now() - this.lastSearch);
    if (wait > 0) {await new Promise(resolve => setTimeout(resolve, wait));}
    this.lastSearch = Date.now();

    this.resultsElement.replaceChildren(this.el('small', {textContent: 'Searching...'}));

    try {
      const text = await httpGetText(`https://nominatim.openstreetmap.org/search?format=json&limit=5&q=${encodeURIComponent(query)}`, {'User-Agent': 'SussyMarble-Userscript/1.0'});
      const data = JSON.parse(text);
      this.resultsElement.replaceChildren();

      if (!Array.isArray(data) || data.length === 0) {
        this.resultsElement.append(this.el('small', {textContent: 'No results found.'}));
        return;
      }

      for (const result of data) {
        const lat = Number(result['lat']);
        const lng = Number(result['lon']);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) {continue;}
        const label = String(result['display_name'] || result['name'] || 'Unknown location');
        this.resultsElement.append(this.#locationRow(label, lat, lng, undefined));
      }
    } catch (error) {
      console.warn('Search failed:', error);
      this.resultsElement.replaceChildren(this.el('small', {textContent: 'The search failed. Try again in a moment.'}));
    }
  }

  /** One row (search result or favorite): a "go" button with the name, and a star/remove button */
  #locationRow(label, lat, lng, favorite) {

    const go = this.el('button', {className: 'bm-sussy-go', textContent: label, title: `${lat.toFixed(5)}, ${lng.toFixed(5)}`});
    go.onclick = async () => {
      this.#setStatus('Moving the map...');
      const used = await navigate(lat, lng, this.#method());
      this.#setStatus(used === 'fly' ? 'Done.' : 'Opened the location by URL.');
    };

    const star = this.el('button', {className: 'bm-button-circle', textContent: favorite ? '🗑️' : '⭐', title: favorite ? 'Remove from favorites' : 'Add to favorites'});
    star.onclick = () => {
      if (favorite) {this.#removeFavorite(favorite.id);}
      else {this.#addFavorite({name: label.slice(0, 80), lat: lat, lng: lng, coords: latLngToCanvasPos(lat, lng)});}
    };

    return this.el('div', {className: 'bm-sussy-row'}, go, star);
  }

  async #addFavorite({name, lat, lng, coords}) {
    this.favorites.unshift({id: `${Date.now()}-${Math.floor(Math.random() * 1e6)}`, name: name, lat: lat, lng: lng, coords: coords});
    this.favorites = this.favorites.slice(0, 200);
    await storageSetJSON(FAVORITES_KEY, this.favorites);
    this.#renderFavorites(this.favFilter?.value ?? '');
    this.#setStatus('Saved to favorites.');
  }

  async #removeFavorite(id) {
    this.favorites = this.favorites.filter(favorite => favorite.id !== id);
    await storageSetJSON(FAVORITES_KEY, this.favorites);
    this.#renderFavorites(this.favFilter?.value ?? '');
  }

  #renderFavorites(filter) {
    const needle = (filter || '').trim().toLowerCase();
    const shown = this.favorites.filter(favorite => !needle || String(favorite.name).toLowerCase().includes(needle));
    this.favoritesElement.replaceChildren();
    if (shown.length === 0) {
      this.favoritesElement.append(this.el('small', {textContent: this.favorites.length ? 'No favorites match.' : 'No favorites yet.'}));
      return;
    }
    for (const favorite of shown) {
      this.favoritesElement.append(this.#locationRow(String(favorite.name), Number(favorite.lat), Number(favorite.lng), favorite));
    }
  }
}

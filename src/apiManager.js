/** ApiManager class for handling API requests, responses, and interactions.
 * Note: Fetch spying is done in main.js, not here.
 * @class ApiManager
 * @since 0.11.1
 */

import { canvasPosToLatLng } from "./coords";
import TemplateManager from "./templateManager.js";
import { consoleError, consoleWarn, escapeHTML, localizeNumber, numberToEncoded, serverTPtoDisplayTP } from "./utils.js";

export default class ApiManager {

  /** Constructor for ApiManager class
   * @param {TemplateManager} templateManager 
   * @since 0.11.34
   */
  constructor(templateManager) {
    this.templateManager = templateManager;
    this.disableAll = false; // Should the entire userscript be disabled?
    this.suspension = {until: 0, reason: ''}; // Sussy Marble (idea from the t-wy fork): account suspension info from /me
    this.chargeRefillTimerID = ''; // Contains the Charge refill timer element ID attribute so we can update the timer.
    this.coordsTilePixel = []; // Contains the last detected tile/pixel coordinate pair requested
    this.templateCoordsTilePixel = []; // Contains the last "enabled" template coords
  }

  /** Determines if the spontaneously received response is something we want.
   * Otherwise, we can ignore it.
   * Note: Due to aggressive compression, make your calls like `data['jsonData']['name']` instead of `data.jsonData.name`
   * 
   * @param {Overlay} overlay - The Overlay class instance
   * @since 0.11.1
  */
  spontaneousResponseListener(overlay) {

    // Triggers whenever a message is sent
    window.addEventListener('message', async (event) => {

      const data = event.data; // The data of the message
      const dataJSON = data['jsonData']; // The JSON response, if any

      // Returns early if the message was not intended for Blue Marble
      if (!(data && data['source'] === 'blue-marble')) {return;}

      // Returns early if the message has no endpoint (intended for Blue Marble, but not this function)
      if (!data['endpoint']) {return;}

      // Trims endpoint to the second to last non-number, non-null directoy.
      // E.g. "wplace.live/api/pixel/0/0?payload" -> "pixel"
      // E.g. "wplace.live/api/files/s0/tiles/0/0/0.png" -> "tiles"
      const endpointText = data['endpoint']?.split('?')[0].split('/').filter(s => s && isNaN(Number(s))).filter(s => s && !s.includes('.')).pop();

      console.log(`%cBlue Marble%c: Recieved message about "%s"`, 'color: cornflowerblue;', '', endpointText);

      // Each case is something that Blue Marble can use from the fetch.
      // For instance, if the fetch was for "me", we can update the overlay stats
      switch (endpointText) {

        case 'me': // Request to retrieve user data

          // If the game can not retrieve the userdata...
          if (dataJSON['status'] && dataJSON['status']?.toString()[0] != '2') {
            // The server is probably down (NOT a 2xx status)
            
            overlay.handleDisplayError(`You are not logged in or Wplace is offline!\nCould not fetch userdata.`);
            return; // Returns early to avoid displaying null userdata
          }

          const nextLevelPixels = Math.ceil(Math.pow(Math.floor(dataJSON['level']) * Math.pow(30, 0.65), (1/0.65)) - dataJSON['pixelsPainted']); // Calculates pixels to the next level

          console.log(dataJSON['id']);
          if (!!dataJSON['id'] || dataJSON['id'] === 0) {
            console.log(numberToEncoded(dataJSON['id']));
          }
          this.templateManager.userID = dataJSON['id'];

          // Sussy Marble: remember if (and until when) the account is suspended
          this.suspension = {
            until: new Date(dataJSON['timeoutUntil'] ?? 0).getTime() || 0,
            reason: String(dataJSON['suspensionReason'] ?? '')
          };

          // Obtains the refill timer for charges
          if (this.chargeRefillTimerID.length != 0) {
            const chargeRefillTimer = document.querySelector('#' + this.chargeRefillTimerID);
            
            // If the refill timer exists...
            if (chargeRefillTimer) {
              
              /** Obtains the information about the user's charges @type {{cooldownMs: number, count: number, max: number}} */
              const chargeData = dataJSON['charges'];
  
              // Date that the user's charges will be refilled
              chargeRefillTimer.dataset['endDate'] = Date.now() + ((chargeData['max'] - chargeData['count']) * chargeData['cooldownMs']);
            }
          }

          // Updates displayed droplet information
          overlay.updateInnerHTML('bm-user-droplets', `Droplets: <b>${localizeNumber(dataJSON['droplets'])}</b>`); // Updates the text content of the droplets field
          overlay.updateInnerHTML('bm-user-nextlevel', `Next level in <b>${localizeNumber(nextLevelPixels)}</b> pixel${nextLevelPixels == 1 ? '' : 's'}`); // Updates the text content of the next level field
          break;

        case 'pixel': // Request to retrieve pixel data
          const coordsTile = data['endpoint'].split('?')[0].split('/').filter(s => s && !isNaN(Number(s))); // Retrieves the tile coords as [x, y]
          const payloadExtractor = new URLSearchParams(data['endpoint'].split('?')[1]); // Declares a new payload deconstructor and passes in the fetch request payload
          const coordsPixel = [payloadExtractor.get('x'), payloadExtractor.get('y')]; // Retrieves the deconstructed pixel coords from the payload
          
          // Are there two coordinates of each type, and are they within range?
          const coordsTileIsValid = ((coordsTile.length === 2) && (coordsTile.every((coord) => (Number(coord) <= 2047) && (Number(coord) >= 0) && (coord !== null) && (coord !== ''))));
          const coordsPixelIsValid = ((coordsPixel.length === 2) && (coordsPixel.every((coord) => (Number(coord) <= 999) && (Number(coord) >= 0) && (coord !== null) && (coord !== ''))));

          // Don't save the coords if there are previous coords that could be used
          if (this.coordsTilePixel.length && (!coordsTileIsValid || !coordsPixelIsValid)) {
            overlay.handleDisplayError(`Coordinates are malformed!\nDid you try clicking the canvas first?\nReceived: ${coordsTile?.[0]}, ${coordsTile?.[1]}, ${coordsPixel?.[0]}, ${coordsPixel?.[1]}`);
            return; // Returns early
          }
          
          this.coordsTilePixel = [...coordsTile, ...coordsPixel]; // Combines the two arrays such that [x, y, x, y]
          
          const displayTP = serverTPtoDisplayTP(coordsTile, coordsPixel); // Retrieves the coordinates that Wplace displays for this region

          const spanElements = document.querySelectorAll('span'); // Retrieves all span elements

          // For every span element, find the one we want (pixel numbers when canvas clicked)
          for (const element of spanElements) {
            // We use the pixel numbers to find this element because it is the only identifiable piece of information, assuming the website can load in non-Engligh languages.

            const elementTextTrimmed = element.textContent.trim(); // Stores the text of the span element, without leading or trailing spaces

            // If the text content of the element includes both coordinates seperatly (avoids failure when the comma seperator changes due to localization)
            if (elementTextTrimmed.includes(displayTP[0]) && elementTextTrimmed.includes(displayTP[1])) {

              let displayCoords = document.querySelector('#bm-display-coords'); // Find the additional pixel coords span
              const displayCoordsStyle = 'display: flex; flex-wrap: wrap; gap: 0 1ch; font-size: small;';

              // If we could not find the addition coord span, we make it
              if (!displayCoords) {
                displayCoords = document.createElement('span');
                displayCoords.id = 'bm-display-coords';
                displayCoords.style = displayCoordsStyle;

                const ourSibling = element.closest(
                  'div.flex[class^="mt-"]:has(div[class*="md"][class*="hidden"]), div.flex[class*=" mt-"]:has(div[class*="md"][class*="hidden"])'
                )

                // Adds the display coordinate flexbox container to the pixel info menu
                ourSibling.insertAdjacentElement('afterend', displayCoords);
              } else {
                // Else, we delete the current contents of the display coords
                displayCoords.innerHTML = '';
              }

              // All 4 coordinate labels, IDs, and values
              const coordsLabel = ['Tl X:', 'Tl Y:', 'Px X:', 'Px Y:'];
              const coordsID = ['bm-tile-x', 'bm-tile-y', 'bm-pixel-x', 'bm-pixel-y'];
              const coordsCombined = [...coordsTile, ...coordsPixel];

              const coordsTileContainer = document.createElement('span');
              const coordsPixelContainer = document.createElement('span');
              coordsTileContainer.style = displayCoordsStyle;
              coordsPixelContainer.style = displayCoordsStyle;

              // For each of the 4 coordinates...
              for (const [coordIndex, coordValue] of coordsCombined.entries()) {

                const coordElement = document.createElement('span'); // Creates a `<span>` element

                coordElement.id = coordsID[coordIndex]; // Applys the ID to the coord element

                // Outputs something like "Tl X: 483"
                coordElement.textContent = `${coordsLabel[coordIndex] ?? '??:'} ${coordValue}`;
                // Or if the amount of labels is less than the provided values, it outputs something like "??: 483" instead of failing

                // Adds the children to their containers (or fallback)
                if (coordIndex <= 1) {
                  coordsTileContainer.appendChild(coordElement);
                } else if (coordIndex <= 3) {
                  coordsPixelContainer.appendChild(coordElement);
                } else {
                  displayCoords.appendChild(coordElement); // Adds the span coordinate as a child for the flexbox container
                }
              }

              // Adds the containers to the display coordinate span
              displayCoords.appendChild(coordsTileContainer);
              displayCoords.appendChild(coordsPixelContainer);

              // Sussy Marble (idea from the t-wy fork): also show the geographic coordinates
              const geo = canvasPosToLatLng([...coordsTile, ...coordsPixel]);
              if (geo) {
                const geoContainer = document.createElement('span');
                geoContainer.style = displayCoordsStyle;
                geoContainer.id = 'bm-geo-coords';
                geoContainer.textContent = `Lat/Lng: ${geo.lat.toFixed(6)}, ${geo.lng.toFixed(6)}`;
                geoContainer.title = 'Click to copy';
                geoContainer.onclick = () => navigator.clipboard?.writeText(`${geo.lat.toFixed(6)}, ${geo.lng.toFixed(6)}`);
                displayCoords.appendChild(geoContainer);
              }
            }
          }
          break;
        
        case 'tile':
        case 'tiles':

          let tileCoordsTile = data['endpoint'].split('/');
          tileCoordsTile = [parseInt(tileCoordsTile[tileCoordsTile.length - 2]), parseInt(tileCoordsTile[tileCoordsTile.length - 1].replace('.png', ''))];
          
          const blobUUID = data['blobID'];
          const blobData = data['blobData'];
          
          const timer = Date.now();
          const templateBlob = await this.templateManager.drawTemplateOnTile(blobData, tileCoordsTile);
          console.log(`Finished loading the tile in ${(Date.now() - timer) / 1000} seconds!`);

          window.postMessage({
            source: 'blue-marble',
            blobID: blobUUID,
            blobData: templateBlob,
            blink: data['blink']
          });
          break;

        case 'robots': // Request to retrieve what script types are allowed
          this.disableAll = dataJSON['userscript']?.toString().toLowerCase() == 'false'; // Disables Blue Marble if site owner wants userscripts disabled
          break;
      }
    });
  }
}

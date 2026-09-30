# OKOC Online — V26 Improvements

## Gameplay UX
- Impossible card actions remain visible and are greyed out with a localized reason.
- Turn progress is visible (`played / required`).
- Required turn quotas are explicitly tested:
  - 4 players: King 2, each Noble 2.
  - 5–8 players: King 3, each Noble 2.
- Card preview now has a dedicated animated presentation.
- Pending card resolutions show a step/response progress indicator.
- Public consequences are surfaced through the unified notification layer.
- Private information remains limited to the authorized client.

## Card presentation
- Every public card event gets a table-landing animation on every connected client.
- Face-down Knight placements use the card back.
- Card-specific visual treatments were added for high-impact effects such as Betrayal, Royal Bomb, Shifting Tides, King's Eye and We Ride Together.

## Interface
- A compact read-only terminal is available from a dedicated game header button.
- The terminal does not permanently occupy the game layout.
- Final game screen now includes the final King, player gold and hand-size summary.
- Errors, card events and generic game messages share a notification architecture.
- Connection/loading feedback is shown while joining or reconnecting.

## Translation
- French and English dictionaries remain key-complete.
- Rules page uses the selected language instead of a hard-coded English rules block.
- Common server errors are localized on the client.
- Game labels such as role, phase, turn progress and terminal diagnostics follow the selected language.

## Multiplayer / publication
- Public lobby now shows a large room code and QR code.
- QR links open the Join screen with the room code prefilled.
- Reconnection automatically retries after a dropped WebSocket while a valid session remains.
- Render deployment is explicitly configured for production mode.
- `docs/DEPLOYMENT.md` documents free publication and phone/4G joining.

## Validation
- 104 automated tests pass.
- Server syntax checks pass.
- The complete Vite browser build could not be executed in this environment because npm package downloads timed out and the archive does not contain `node_modules`.

## Deferred
- The full responsive/mobile audit requested for the next iteration remains intentionally deferred (previous item 11).

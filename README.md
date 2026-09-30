# ONE KING ONE CROWN — ONLINE

Unofficial fan-made browser adaptation of the tabletop game ONE KING ONE CROWN. The interface uses a red / black / white geometric visual language inspired by the supplied reference artwork, while the physical card artwork remains in its original black/white/gray form.

## Run locally

Requirements: Node.js 20+.

```bash
cd C:/Users/Zephy/Downloads/okoc-online
npm install
npm test
npm run build
npm run dev
```

Open `http://localhost:5173/` for the normal game and `http://localhost:5173/dev` for DEV.

## Multiplayer

The application keeps the existing Node/Express + WebSocket architecture. Game state remains server-authoritative. Rooms, room codes, host/admin controls, reconnect sessions, ready state, chat, cards, decisions and the existing game engine are preserved.

## Free deployment

The repository includes `render.yaml` for a Render Web Service. Use the Free plan, with build command `npm install && npm run build` and start command `npm start`. The service uses the `PORT` supplied by the platform.

The current implementation stores rooms in memory, so a server restart or platform sleep can end active rooms.

## Design

- Red / black / white only as the dominant palette
- Geometric King and Noble characters built with HTML/CSS
- Exactly two identical eyes per character; only pupils move
- King is larger and looks subtly downward
- Nobles look toward the King
- Responsive layouts for desktop, tablet and mobile
- Visible keyboard focus and reduced-motion support
- FR / EN interface

## Attribution

ONE KING ONE CROWN is the original tabletop game. This website is an unofficial fan-made adaptation and is not the official website. The supplied print-and-play source identifies the game material as CC BY-NC-SA 4.0; preserve the original attribution and applicable license terms when redistributing adaptations.

Official website: https://onecrown.store/

## Developer mode

The DEV environment has its own frontend entry (`client/dev.html`) but uses the same authoritative `server/game-engine.js` and the same backend process as normal multiplayer. Its game state is isolated from normal rooms. It can switch between DEV 1–4, reset the match, modify gold through the real crown rule, force a crown check, exercise normal card/decision paths, and deliberately trigger a controlled API error. The DEV client has an Error Boundary, request timeout, retry/reset controls and visible diagnostic state. Manual draw and manual King-change controls remain intentionally absent.

Use exactly:

```bash
cd C:/Users/Zephy/Downloads/okoc-online
npm install
npm test
npm run build
npm run dev
```

Open `http://localhost:5173/` for the normal game and `http://localhost:5173/dev` for DEV.

## Physical card/material assets

The online table uses the supplied physical card artwork in its original black/white/gray form. The site UI and digital character/round materials use the red/black/white visual language separately. The supplied print-and-play source states that the material is shared under CC BY-NC-SA 4.0, with attribution and the same license required for adaptations.

## 2026-09 security/rules pass

The current build uses a server-authoritative game engine. Card instances, hands, dice, gold, targets, hidden Knight truth, pending decisions, negotiation limits, turn progression and round progression are validated server-side.

The 42 card designs were recropped from the supplied official print-and-play sheets into consistent 246×346 EN/FR assets. The game UI uses the same red/black/white visual language as the menu, with explicit turn banners, court-seat status, event flashes, decision overlays, private-information indicators and target-selection controls.

Run the full test suite with:

```bash
npm test
```

The repository includes `docs/RULE_AUDIT.md` and `docs/SECURITY.md` for the detailed rule/security checklist.


## Standalone DEV
The `/dev` page runs on a dedicated DEV client and a separate DEV backend on port 10001. See `docs/DEV_MODE.md`.

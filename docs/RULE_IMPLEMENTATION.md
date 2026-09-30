# Physical → online implementation audit

| Physical mechanic | Online equivalent | Visibility | Server validation |
|---|---|---|---|
| Circular table | Responsive arena/player seats | Public | Server turn order |
| Character cards | Role + gold state | Role is public; hidden hand stays private | Server assigns roles |
| Gold tokens | Integer gold counter | Public | Clamp 0–2000; server-only mutations |
| Physical deck | Server deck/hand arrays | Only owner sees hand | Server draws |
| Dice | Server-generated d6 | Result broadcast in log | Client cannot choose result |
| Playing a card | Action request + server resolution | Public event; hidden targets stay private | Effect validation |
| Knight face-down | Hidden protection token | Public existence, hidden identity | Server consumes it |
| Negotiation | Room chat + explicit transfers | Room public | Max 400 transfer enforced |
| Vocal support | Support/vote modal | Required players only | Server validates responders |
| Votes | Synchronized vote request | Vote result can be public | Server waits for all required votes |
| King change | Server role/gold swap | Public | Only rule engine can change King |
| Four rounds | Server round counter | Public | End after round 4 |
| Refresh/reconnect | Session id + server-side player state | Private session token | Server rebinds socket |

## 2026-09-30 playable-table update

`client/src/main.jsx` exports the normal `Game` table component. `client/src/dev-main.jsx` imports that same component and supplies it with an isolated DEV API transport. This keeps card interaction, pending decisions, material rendering and hidden-information UI identical between normal play and DEV.

The DEV API (`server/dev-api.js`) returns the same public game state as the normal engine and additionally returns Sub Rosa's private inspection data only to the controlled DEV player. It accepts the same authoritative game actions through `action()`; it does not implement card rules a second time.

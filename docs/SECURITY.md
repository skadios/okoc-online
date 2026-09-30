# OKOC ONLINE — SECURITY MODEL

## Authoritative state

The server owns the complete game state. The client is a view/controller only.

Authoritative server data includes:

- deck order and card instances;
- every private hand;
- roles and King identity;
- gold;
- dice results;
- face-down Knight truth;
- pending decisions;
- round/turn progression;
- negotiation timer and transfer limits.

## Client actions

Every game action is validated again on the server. A modified browser cannot legally:

- draw an arbitrary card;
- invent a card instance;
- play another player's card;
- play an opposite-role card;
- act out of turn;
- skip a required decision;
- select an invalid target;
- change a dice result;
- change gold directly;
- inspect another player's hand without a server-authorized Sub Rosa action;
- inspect the real/bluff state of a Knight without the authorized Sub Rosa action;
- reuse the same action ID to duplicate a state mutation.

## Reconnection

Sessions are bound server-side to a room and player ID. Reconnecting restores the existing player rather than creating a second copy.

## Private information

Public state contains hand counts, never other players' hand contents. Private Sub Rosa information is delivered only to the authorized player.

## Transport and abuse hardening — 2026-09-30

- WebSocket frames are capped at 32 KiB and each connection is rate-limited to 80 messages per 10 seconds.
- JSON HTTP bodies are capped at 32 KiB.
- Reconnecting rotates the session token and invalidates the previous token/socket binding.
- A superseded WebSocket can no longer issue game actions through its old bound player object.
- Empty/inactive rooms are cleaned up after 30 minutes; finished rooms after 60 minutes.
- The development control API is disabled when `NODE_ENV=production` unless `OKOC_DEV_MODE=1` is explicitly set.
- Server-side validation remains authoritative; client-side controls are treated as presentation only. This follows OWASP guidance that authorization and input validation must be enforced server-side on every request. citeturn0search0turn0search3

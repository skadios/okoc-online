# OKOC ONLINE — RULE AUDIT

This audit compares the online implementation against the supplied official print-and-play card sheets and the official ONE KING ONE CROWN Royal Advisor clarifications.

## Core flow

- 4–8 players.
- Four rounds.
- Players start with 8 cards and, at the end of each turn, the server automatically refills the hand to 8 when needed. Card effects and negotiation may temporarily move the hand above 8.
- The King starts each round.
- The King plays 3 cards, or 2 cards when there are exactly 3 Nobles.
- Nobles play 2 cards.
- Helping Hand draws 2 and grants one additional playable card; Helping Hand itself does not consume a normal play slot.
- Played-card counts, draws, turns, round transitions and game end are server-controlled.
- Rounds alternate direction.
- Rounds 1–3 end in negotiation; round 4 ends immediately after the final card is resolved.
- Negotiation lasts at most 120 seconds and can end earlier only when all connected players agree to move on.
- Gold is clamped to 0–2000.
- Bank gold is infinite.

## Hidden information / anti-cheat

- The browser never owns the authoritative deck, dice, gold, roles, hidden hands or face-down Knight truth.
- A card action is accepted only if the exact instance is in the server-side hand.
- The server validates role, phase, turn, round restrictions and targets.
- Dice are rolled server-side.
- Sub Rosa private hand/Knight information is sent only after the player chooses the inspection mode.
- Sub Rosa uses one server-side roll; invalid client retries cannot reroll it.
- Royal Bomb is not playable. It may only be discarded or traded during negotiation.
- Face-down Knights expose only their existence publicly; the server remembers whether the card is real or a bluff.
- Gold transfers and negotiation limits are validated server-side.
- Action IDs are de-duplicated to prevent replay/double-click duplication.
- React renders chat as text, not HTML.

## Card catalogue

All 42 unique card designs from the supplied card sheets are present in `shared/cards.js` and have:

1. an English asset;
2. a French asset;
3. a server-side effect handler;
4. target/decision UI where the physical card requires a choice.

The card artwork was recropped from the official print-and-play page grid and normalized to 246×346 pixels. Black/white/grey treatment remains the physical source artwork rather than a generic replacement.

## Functional card systems

Implemented server-side:

- Actors acknowledgement + final target;
- Allies choice;
- Bad Blood with automatic round income and out-of-turn settlement;
- Beggar's Blessing;
- Betrayal + post-play support + Knight protection;
- Betray the King + two-player support + King Maker modifiers;
- Council Meeting voting + bonus draw;
- Divine Right restrictions + roll;
- Grudge consent + Noble target;
- Helping Hand;
- Hindsight commitment;
- Icarus;
- Indebted + recurring debt + out-of-turn debt settlement;
- Isolation duration;
- King Maker;
- Knight and Knight bluff;
- Loyalty choice;
- Meat for Meat;
- People's Champion, including self-nomination;
- Royal Bomb negotiation-only handling;
- Scout commitment;
- Shadow Deal;
- Sub Rosa private inspection + one roll + theft;
- Subsidies;
- Tithe;
- Unprotected;
- Suppress Rebellion;
- Wrath's two printed options;
- Black Plague pairing and odd-Noble handling;
- Eye for an Eye;
- Bend the Knee;
- Noble Helping Hand;
- Anchor Player-A decision;
- Loyal Dog amount selection;
- Debt Collector target selection;
- Mad King rolls;
- Royal Parrot response;
- Shifting Tides through normal play and negotiation transfers;
- Snakes voting;
- Scapegoat sequential voting around the King + tie roll;
- King's Eye protection duration;
- We Ride Together roll + post-roll split decision.

## Official clarifications applied

The official Royal Advisor confirms, among other points, that Betrayal support happens after the card is played; Knights are face-down and can be bluffed; a Noble's existing Knights remain when that Noble becomes King; Helping Hand does not consume a normal play slot; players are refilled to 8 cards at the end of their turns; card effects or negotiation can temporarily put a hand above 8; Royal Bomb is not stopped by Isolation; the final round has no negotiation; negotiation can end early by unanimous agreement; the King plays 3 cards, or 2 with 3 Nobles; and the bank is infinite.

Source: https://onecrown.store/

## Automatic Crown / Gold Threshold — 2026-09-29

The supplied guide states that a player becomes King by accumulating more gold than the current King and that, when a new King takes the crown, the players physically swap seats and swap cards. For this adaptation, the project-specific digital interpretation requested by the user also swaps the two players' gold amounts during this automatic threshold crown change. The engine therefore applies the requested seat + hand + gold swap.

The official Royal Advisor separately confirms that **People's Champion** and **Betray the King** switch gold with the King and take their place. citeturn0search0

The server checks the gold threshold after every authoritative action, including negotiations and out-of-turn gold settlements. A client cannot request `changeKing` directly.

## Development Build

`/dev` is a development-only interface available from the Vite development server. It renders the **same `Game` component as the normal game** and lets one operator switch the controlled player between all four dev players. Extra controls are contained in a hidden `DEV` drawer and are not compiled into the production build (`import.meta.env.DEV`).

The dev drawer intentionally has no manual draw or manual King-change command. Special commands use the same server game engine where possible, including the real automatic crown check.

## Second rules/material audit — 2026-09-29

### Round tracker / direction
The official guide pages 8, 12 and 14 were re-read from the supplied PDF.
- The game lasts exactly 4 rounds.
- Turn direction alternates clockwise / counter-clockwise each round.
- The Round Tracker is a physical component placed in the middle and a token marks the current round.
- The King always starts the round; after the King, play proceeds clockwise/counter-clockwise according to that round's tracker direction.
- The next round starts at the King again.

Implementation:
- `startRound()` sets `direction` to clockwise for rounds 1 and 3 and counter-clockwise for rounds 2 and 4.
- `startRound()` always sets `currentPlayerId = kingId`.
- A regression test now verifies round 1 -> round 2 reverses direction while keeping the King first.
- The online UI now reproduces the supplied Round Tracker artwork and displays the active-round token.

### Character cards / gold tracker
The supplied guide page 6 shows a King Character Card and Noble Character Cards with the 0–2000 gold grid and a token used to track gold. The online UI now uses the supplied character-card artwork as the visual gold tracker, with the current gold marker overlaid.

### Starting King
The supplied physical rules say the King Character Card is shuffled/dealt face-down and the player receiving it starts as King. The online version was explicitly requested to use a random-name draw animation instead. The server therefore chooses the starting King randomly, then holds the game in a short authoritative `kingReveal` phase while the client displays the spinning-name animation. This is an online presentation/variant of the physical setup, not a literal reproduction of the face-down character-card draw.

### Normal gold-threshold crown change
The supplied guide says that whenever a player becomes the new King, the players physically swap seats and swap cards; the new King takes the old King's seat/cards and vice versa. The guide does not separately state a gold-token swap in that paragraph. For this online adaptation, the requested interpretation is now implemented: on the normal "Noble has more gold than the current King" crown change, the two players swap seat, hand/cards, and their gold tracker/value together. This is covered by a regression test.

This should be treated as the project's explicit digital interpretation of the requested physical-seat/card swap, rather than as a separately quoted sentence from the source rules.

### Simultaneous crown contenders
The guide explicitly specifies a roll when two players become King at the same time, with the lower roll losing 100 gold. The server resolves the simultaneous two-player case automatically and applies the 100-gold penalty to the loser. Larger simultaneous contests are not explicitly specified by the supplied guide; the engine uses a deterministic server-side extension rather than leaving the game in an undefined state.

### Automatic turn progression
No manual "draw" or "change King" action exists. Cards resolve on the server; end-of-turn drawing, next-player selection, crown changes, negotiation transitions, and the four-round end condition are authoritative.

## Character gold trackers and starting gold — 2026-09-29

The supplied official guide explicitly shows the starting values: **King = 1000 gold; each Noble = 600 gold**. The King therefore starts with more gold than every Noble. The same page shows that the King and Noble character cards use inverse visual schemes: the King's tracker has a black field with light cells/numerals, while the Noble tracker has a light card with dark cells/numerals.

The online UI now uses those two distinct tracker designs rather than recoloring one generic tracker. The gold value remains authoritative in the server game state; the tracker is only its visual representation. When the requested normal gold-threshold crown swap occurs, the **gold amounts** are exchanged in the server state; the UI then renders the appropriate King/Noble tracker according to the player's current role, so the King tracker itself is not treated as a pool of gold or a transferable object.

## Playability pass — 2026-09-30

The normal game table and the DEV table now use the same playable `Game` UI. The DEV frontend is only a controller around an isolated server-side game instance; it does not contain a second rules implementation.

The playable table includes:
- the player's real server-owned hand and original card artwork;
- card selection and effect-specific target/choice dialogs;
- all pending decisions/votes/support actions;
- face-down Knight placement and King Knight placement;
- negotiation gold transfer and card offers;
- Bad Blood / Indebted out-of-turn settlement;
- round tracker, King/Noble gold character cards, deck/discard material, die and negotiation hourglass;
- automatic draw/refill, turn progression, round progression and final-round game end.

Additional rule-enforcement fixes in this pass:
- Council Meeting now exposes the pending decision type expected by the UI;
- Isolation blocks card inspection and gold-taking actions where applicable, while Betrayal and Royal Bomb retain their documented exceptions;
- King's Eye imposes its 100-gold penalty on a Noble attempting the protected inspection/gold-taking action rather than incorrectly behaving like Isolation;
- Shadow Deal requires another player;
- the automatic gold-threshold crown cannot oscillate immediately after the requested gold/seat/hand swap: the demoted player's crown check is suppressed until their gold actually changes again.

The supplied official Royal Advisor confirms the core gameplay clarifications used here, including post-play Betrayal support, face-down/bluff Knights, Helping Hand not counting as a normal play, the final round having no negotiation, the 2-minute maximum negotiation, and automatic handling of simultaneous crown contenders. citeturn0search0

## 2026-09-30 deep gameplay audit — V23

This pass re-read the supplied rules materials and cross-checked the current online implementation against the official Royal Advisor on onecrown.store.

### Corrections made

- Betrayal support now remains open after a refusal until a Noble actually supports it or all eligible Nobles refuse. This follows the official clarification that support happens after the card is played and a supporting player is required for the effect to happen.
- People's Champion now resolves its crown contest as a real simultaneous King contest: server-side rolls, lower roll loses 100 gold, and the winner takes the crown and swaps gold/seat/hand as required by the project interpretation.
- King's Eye now lasts until the King's next turn, rather than the protected player's next turn.
- Shifting Tides is enforced on Noble gold-taking actions, not only negotiation transfers.
- A stale automatic-crown flag can no longer affect a later unrelated card/turn.
- Loyalty now implements both printed options from the card's dotted-line choice: the actor selects the option; the first option lets the selected player decide whether to pay the actor or make the King pay the actor; the second forces a selected non-King player to pay the King and then acknowledge the loyalty pledge.
- Loyal Dog now requires the recipient to acknowledge the printed loyalty pledge after receiving the bank payment.
- Royal Parrot now stores the sentence supplied by the King and gives the selected player the documented accept/refuse choice.
- DEV no longer has a second copied game engine: the old duplicate `server/dev-game-engine.js` is now a re-export of the authoritative normal engine.
- The rules/card page now displays the complete English/French card description for all 42 physical designs, in addition to the original card artwork and physical material.
- Additional visible game controls and pending-decision messages were localized through the existing EN/FR i18n object.

### Verification

The automated suite now contains **85 passing tests**, including one authoritative-resolution entry test for every one of the 42 physical card designs, card asset checks in English/French, hidden-information checks, crown/seat/hand/gold changes, turn/round progression, negotiation, Knight protection, Sub Rosa, Betrayal, Loyalty, Loyal Dog, Royal Parrot, People's Champion, King's Eye, Shifting Tides, and anti-cheat action validation.

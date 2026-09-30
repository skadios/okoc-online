# OKOC Online v27 — Hand, Role and Turn Limits

## Corrections

- The turn limit is a **number of cards that may be played**, not a hand-size limit.
- With 4 players:
  - King: 2 card plays per turn.
  - Each Noble: 2 card plays per turn.
- With 5–8 players:
  - King: 3 card plays per turn.
  - Each Noble: 2 card plays per turn.
- A normal starting hand contains exactly 8 cards.
- At the end of a player's turn, the server automatically draws until that player's hand reaches 8 cards.
- Card effects can temporarily change the hand size during a turn; the end-of-turn refill remains authoritative.
- Cards are role-bound:
  - King may play only cards from the King deck.
  - Noble may play only cards from the Noble deck.
  - The special King Knight is server-generated and remains a King action.
- When the crown changes through the implemented character/seat swap, the physical hand follows the role swap so the new King keeps King cards and the new Noble keeps Noble cards.

## Verification

107 automated tests pass, including explicit tests for all supported player counts, exact starting hand size, end-of-turn refill to 8, and role/hand pairing after a crown change.

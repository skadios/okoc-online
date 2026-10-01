# OKOC Online — Full card audit (2026-10-01)

This audit compares the 42 physical card effects represented by the supplied Print-at-Home OKOC materials with the current online implementation. The official One King One Crown Royal Advisor was also checked for clarifications on Knights, Helping Hand, Sub Rosa, Anchor, Debt Collector, People's Champion, gold limits, turn order, and crown changes.

## Card-by-card resolution

| # | Card | Role | Online resolution | Audit result |
|---:|---|---|---|---|
| 1 | Actors | King | Every player acknowledges the King's glorious rule. The card player then chooses the player who becomes the court's laughter target. | OK — no rule change |
| 2 | Allies | Noble | Choose a Noble. That Noble chooses whether the card player gains 100 from the bank or loses 200 to the bank. | OK — no rule change |
| 3 | Bad Blood | King | Choose two Nobles. The King receives 200 at the start of each round until one of those Nobles pays the other 200 out of turn. The effect ends if either marked Noble becomes King. | OK — crown-change cancellation verified |
| 4 | Beggar's Blessing | Noble | Every Noble with 300 gold or less receives 200 from the bank. | OK — no rule change |
| 5 | Betrayal | King | Target another Noble. After the card is played, a Noble must support it; with support, the King takes all target gold. A Knight can block it once. First round is forbidden. | OK — support-after-play and Knight protection verified |
| 6 | Betray the King | Noble | After the card is played, two players must support/oppose. The King then rolls: 1–3 changes the King to the card player and swaps crown/gold; 4–6 leaves the King in place and gives the King 200. King Maker modifiers can change the roll. First round is forbidden. | OK — staged King roll |
| 7 | Council Meeting | Noble | Everyone votes. All yes: the card player takes 100 from the King. Any no: the card player loses 100 to the bank. The card player then draws 2 and must acknowledge/bow to the King before the card resolves. | FIXED — praise/bow step added |
| 8 | Divine Right | Noble | In rounds 3–4, with 300 gold or less, the player rolls; 5–6 gives 1200 from the bank. | OK — conditions enforced |
| 9 | Grudge | Noble | Choose a player. If they accept, they choose a Noble who loses 200 to the card player; if they refuse, the card player loses 100 to the bank. | OK — player-to-player transfer now cannot create gold from an empty payer |
| 10 | Helping Hand (King) | King | Draw 2, then continue the turn without counting Helping Hand itself. The printed first-card exception is handled: with 3 Nobles the King can make 3 follow-up plays; with 4+ Nobles the normal 3-card King allowance already provides 3 follow-up plays. | FIXED — first-card allowance corrected |
| 11 | Hindsight | Noble | Back a Noble to play Betrayal by the end of the next round. Correct prediction: +300; wrong: −100. Commitment remains until deadline. | OK — commitment tracked |
| 12 | Icarus | Noble | Player rolls. 4–6: every other Noble pays the player 100. 1–3: the player pays every other Noble 100. The card can only be played when the losing payment is affordable. | OK — protection/affordability checked |
| 13 | Indebted | Noble | Choose another Noble; on 3–6 they owe 100 at the start of each round until another player pays 200 to free them. Debt disappears if debtor becomes King. | OK — debt cancellation on crown change; transfer cannot create gold from zero |
| 14 | Isolation | Noble | Protects the player from card-look and gold-taking actions until the end of their next turn, except Betrayal. | OK — no rule change |
| 15 | King Maker | Noble | During Betray the King, choose support (+1) or oppose (−1). Each losing side player pays 300. | OK — out-of-turn action verified |
| 16 | Knight | Both | A face-down card can be placed in front of a Noble as a real Knight or bluff. A real Knight blocks one Betrayal and is discarded. The face-down card cannot be inspected. | FIXED — direct Knight inspection removed |
| 17 | Loyalty | Noble | Choose a player. They choose to pay the card player 100 or force the King to pay 100, after which they acknowledge/promise loyalty to the King. | FIXED — pledge is tied to the actual King; protected-source transfer handling corrected |
| 18 | Meat for Meat | Noble | Two selected Nobles roll. If the card player rolls higher, they collect 200 from the other player. | OK — staged individual rolls; transfer cannot create gold from zero |
| 19 | People's Champion | Noble | Only in round 4. Nominate a Noble; all other Nobles must agree. The nominee and current King roll. A higher nominee roll makes them King and swaps gold with the old King. | FIXED — removed an extra −100 penalty not present on the physical card |
| 20 | Royal Bomb | Noble | Every Noble loses 800. The Bomb cannot be stolen. Its owner may only give it away or discard it during negotiation; if its holder becomes King, it is discarded. | FIXED — normal card trades and Sub Rosa cannot move/discard it |
| 21 | Scout | Noble | Back a Noble to become King by the end of the next round. Correct: +300; wrong: −100. | OK — commitment tracked |
| 22 | Shadow Deal | Noble | Give any other player 100 or 200 from the bank, including the King. | OK — no rule change |
| 23 | Sub Rosa | Both | Noble: inspect another player's hand or a face-down Knight; after 4+, take a card, or take a random card if a Knight was inspected. King copy: inspect another player's hand and after 4+ discard a chosen card. Royal Bomb is excluded. | FIXED — Royal Bomb protected; hand replacement/end-turn draw rules corrected |
| 24 | Subsidies | Noble | Every Noble gets: 300 at 0 gold, 200 at 100–300, 100 at 400–500; other amounts unchanged. | OK — no rule change |
| 25 | Tithe | Noble | Choose a player; they choose another Noble to give 100 to the card player. | OK — server enforces another Noble |
| 26 | Unprotected | Noble | Roll. On 5–6 remove every face-down Knight except the card player's own placed Knights. | OK — no rule change |
| 27 | Suppress Rebellion | Noble | The King rolls. On 1–3, the bank gives 200 to the card player and 100 to each other Noble. | FIXED — the King, not the card player, now rolls |
| 28 | Wrath | Noble | Either lose 100 and make a Noble lose 300, or make a chosen player lose 100 to the bank. | OK — two printed choices |
| 29 | Black Plague | King | The King now chooses the Noble pairings in the online version. Each paired Noble rolls their own die. Any 1 makes both lose 200. With an odd Noble count, the lone Noble rolls two dice; if either is 1, that Noble loses 200. | FIXED — King-controlled pairing and individual dice; odd-player behavior follows the project clarification |
| 30 | Eye for an Eye | King | King loses 100 to the bank; chosen player loses 300 to the bank. | OK — no rule change |
| 31 | Bend the Knee | King | Target either thanks the King/card player or refuses and pays 300. If they cannot afford 300, refusal is not available and they must thank. | OK — affordability enforced |
| 32 | Helping Hand (Noble) | Noble | Draw 2, then play an extra card without counting Helping Hand itself. The printed first-card exception is handled: with 3 Nobles, 3 follow-up cards; with 4+ Nobles, 4 follow-up cards. | FIXED — first-card allowance corrected |
| 33 | Anchor | King | King chooses A and B. A chooses either lose 200 to bank or make B lose 100 to the King. | OK — matches official FAQ clarification |
| 34 | Loyal Dog | King | Give a player 100–300 from the bank. They must acknowledge the printed loyalty pledge. | OK — digital acknowledgement replaces unverifiable spoken performance |
| 35 | Mad King | King | Everyone rolls, including the King. A Noble rolling 1 loses 300; the King rolling 1 loses 500. | OK — individual server-staged rolls |
| 36 | Debt Collector | King | Choose a player; that player chooses another Noble to lose 200 to the bank. They cannot choose themselves or the King. | OK — restriction enforced server-side and in UI |
| 37 | Royal Parrot | King | Chosen player either repeats the supplied sentence and pays 100 to the bank, or refuses and pays 300. | OK — digital acknowledgement; server applies the correct payment |
| 38 | Shifting Tides | King | Choose two Nobles. Until the King’s next turn, those Nobles can only take gold from each other, including during negotiation. Betrayal ignores this restriction. | OK — protection is applied to gold-taking/negotiation paths |
| 39 | Snakes | King | Choose a target. All Nobles vote. Any yes makes the target lose 300 to the bank. | OK — no rule change |
| 40 | Scapegoat | King | Each Noble votes another Noble in sequence. The first voter is the Noble immediately after the King in the seat order. A tie is resolved with a die. | OK with clarification listed below |
| 41 | King’s Eye | King | Protect a player until the King’s next turn. If a Noble looks at their cards or takes gold from them, that Noble pays 100 to the bank. | OK — protection is enforced on look/gold-taking paths |
| 42 | We Ride Together | King | Two Nobles roll individually; tie means reroll. Lower loses 200 to the bank. After both rolls, they may agree to lose 100 each; the higher roller decides whether to accept the proposed split in the online UI. | OK — staged rolls; split is a digital interaction choice |

## Modifications made during the audit

- Council Meeting now has its required post-vote praise/bow step before resolution.
- Suppress Rebellion now waits for the King to roll.
- People's Champion now swaps gold with the King on a winning roll without an extra 100-gold penalty.
- Helping Hand King/Noble first-card play counts were corrected to the printed special cases.
- Player-to-player gold transfers now move only gold that the payer actually has; an empty payer can no longer create gold for the recipient.
- Normal turn endings now draw the normal 2 cards instead of merely refilling up to 8. This matters when a card effect leaves a player above 8 cards.
- Sub Rosa now preserves the target's minimum hand after a taken/discarded card, and the actor still performs the normal 2-card end-of-turn draw.
- Royal Bomb is blocked from normal card exchanges and cannot be removed via Sub Rosa.
- Debt Collector already enforced "another Noble" server-side; a regression test was added.
- Face-down Knights can no longer be inspected through the online UI/API.
- Loyalty pledge text is tied to the current King, and protected-source handling for its player-to-player payments was corrected.
- Black Plague pair selection is King-controlled, with individual rolls and the previously specified odd-Noble two-dice resolution.

## Rules / implementation points that still need clarification

1. **Helping Hand wording conflict:** the supplied printed card contains a first-card special case (3 or 4 follow-up plays depending on Noble count), while the official Royal Advisor currently summarizes Helping Hand as simply drawing 2 and getting one extra card. The implementation currently follows the printed card wording. The project owner should decide which wording is authoritative if this difference matters. https://onecrown.store/

2. **Black Plague pairing:** the supplied card wording says Nobles pair up but does not explicitly state that the King selects the pairs. The online version uses the project owner's explicit rule that the King chooses who pairs with whom.

3. **Black Plague with an odd Noble count:** the supplied card says the lone Noble can lose gold but does not itself specify the two-dice procedure. The online version uses the project owner's explicit clarification: the lone Noble rolls twice and loses 200 if either die is 1.

4. **People's Champion ties:** the physical/official text explains the roll and winning crown change, but does not specify a tie resolution. The current server leaves the crown with the current King because the nominee must roll strictly higher.

5. **Simultaneous crown changes involving more than two candidates:** the official clarification explicitly describes the two-player simultaneous case (both roll; lower loses 100; higher becomes King). The online game has additional deterministic handling for multi-player/gold-crown edge cases; this is not fully specified by the physical wording and should be confirmed if such a situation is intended to be reachable.

6. **Scapegoat "to the King's left":** the online implementation maps this to the next Noble in the server seat order. The physical wording and alternating round direction could be interpreted differently; this should be confirmed if "left" is meant from a table-facing perspective rather than seat order.

7. **We Ride Together split:** the physical card only says the players may agree to lose 100 each after both rolls. The online interface makes the lower roller propose the split and the higher roller accept/refuse. This is a digital interaction choice, not a newly asserted physical rule.

8. **Verbal/vocal requirements:** Actors, Betrayal, Betray the King, Loyal Dog, Royal Parrot, and similar spoken/social requirements are represented with explicit acknowledgement/support buttons. The browser cannot verify a real voice or physical raised hand, so the online resolution is a deterministic digital equivalent.

## External rule clarifications checked

The current official One King One Crown Royal Advisor confirms, among other points, that People's Champion swaps gold with the King, Betrayal support happens after the card is played, face-down Knights cannot be inspected, Helping Hand does not itself count as a normal play, Sub Rosa still allows the normal 2-card end-of-turn draw, Anchor's A/B choice works as implemented, Debt Collector can only choose other Nobles, 0/2000 gold are hard limits, the King plays 3 cards (2 with 3 Nobles), and a simultaneous two-player crown contest uses a die with the lower roller losing 100. These clarifications were used where they were more explicit than the physical card text. https://onecrown.store/

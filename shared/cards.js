const C = (id, side, en, fr, effect, copies, descEn, descFr, extra={}) => ({
  id, side, en, fr, effect, copies, desc:{en:descEn,fr:descFr}, ...extra
});

export const CARDS = [
  C('actors','king','Actors','Acteurs','actors',3,
    'Everyone must thank the King for their glorious rule however horrible and cruel it might have been. Everyone must laugh at the player of your choice.',
    'Tout le monde doit remercier le Roi pour son glorieux règne, qu’importe combien il a pu être horrible et cruel. Tout le monde doit rire du joueur de votre choix.'),
  C('allies','noble','Allies','Alliés','allies',3,
    'Pick a Noble. They choose if you gain 100 gold or lose 200 to the bank. Other players can convince them to take the second option.',
    'Choisissez un noble. Il choisit si vous gagnez 100 pièces ou payez 200 à la banque. Les autres joueurs peuvent essayer de le convaincre de prendre la 2e option.'),
  C('bad-blood','king','Bad Blood','Sang mêlé','bad_blood',3,
    'Pick two Nobles. You gain 200 gold from the bank at the beginning of every round until one of them gives the other 200 gold. They can make this payment out of turn.',
    'Choisissez deux nobles. Vous gagnez 200 pièces de la banque au début de chaque round jusqu’à ce que l’un paie 200 pièces à l’autre. Ils peuvent payer en dehors de leur tour.'),
  C('beggars-blessing','king',"Beggar's Blessing",'Mendiants bénis','beggars',3,
    'All Nobles with 300 gold or lower gain 200.',
    'Tous les nobles ayant 300 pièces ou moins gagnent 200 pièces.'),
  C('betrayal','king','Betrayal','Trahison','betrayal',4,
    'Take all gold from another Noble. Requires vocal support from another Noble after it is played or it has no effect. Not playable in the first round.',
    'Prenez toutes les pièces d’un autre noble. Nécessite l’accord vocal d’un autre noble après avoir été joué, ou n’a pas d’effet. Ne peut pas être joué le premier round.', {minRound:2}),
  C('betray-king','noble','Betray the King','Trahir le Roi','betray_king',2,
    'The King rolls: 1–3, you switch places and gold. 4–6, they remain King and gain 200 gold from the bank. After it is played, you must gain vocal support from TWO players or it has no effect. Not playable in the first round.',
    'Le Roi lance un dé : 1–3, vous échangez de rôle et de pièces. 4–6, le Roi reste Roi et gagne 200 pièces de la banque. Nécessite l’accord vocal de deux joueurs, ou n’a pas d’effet. Ne peut pas être joué le premier round.', {minRound:2}),
  C('council','king','Council Meeting','Réunion du conseil','council',3,
    'If all players vote yes, you take 100 gold from the King. If one votes no, you lose 100 to the bank. Draw 2 cards and bow to your King.',
    'Si tous les joueurs votent pour, vous prenez 100 pièces au Roi. Si un seul vote non, vous payez 100 pièces à la banque. Piochez 2 cartes et prosternez-vous devant votre Roi.'),
  C('divine-right','king','Divine Right','Droit divin','divine',1,
    'If you roll 5+, you gain 1200 gold. Play only if you have 300 gold or less. Can only be played or discarded in the last 2 rounds.',
    'Vous lancez 5-6 : vous gagnez 1200 pièces. Ne peut être joué que si vous avez 300 pièces ou moins. Ne peut être joué ou défaussé que lors des deux derniers rounds.', {minRound:3,lastRounds:true,requiresGoldAtMost:300}),
  C('grudge','king','Grudge','Rancune','grudge',2,
    'Pick a player. They have to agree to you taking 200 gold from the Noble of your choice. If they disagree, you lose 100 gold to the bank.',
    'Choisissez un joueur. Il doit accepter que vous preniez 200 pièces d’un noble de votre choix. S’il refuse, vous payez 100 pièces à la banque.'),
  C('helping-hand','king','Helping Hand','Coup de pouce','helping_king',1,
    'Draw 2 extra cards and play an extra card. So, if this is your first card, you get to play 3 more now.',
    'Piochez 2 cartes supplémentaires et jouez une carte de plus. Si c’est votre première carte ce round, vous pouvez donc en jouer 3.'),

  C('hindsight','noble','Hindsight','Soutien','hindsight',2,
    'Back a specific Noble to play the “Betrayal” card before the end of the next round. If correct, gain 300 gold from the bank. If not, lose 100. Keep this in front of you until then.',
    'Soutenez un noble pour qu’il joue la carte « Trahison » avant la fin du round. Si c’est le cas, gagnez 300 pièces depuis la banque. Sinon, la banque vous prend 100 pièces. Gardez cette carte devant vous jusque-là.'),
  C('icarus','noble','Icarus','Icare','icarus',2,
    'If you roll a 4–6, all Nobles must pay you 100 gold. If you fail, you must pay each Noble 100 gold. You can only play this card if you can afford it.',
    'Lancez un dé : si vous obtenez 4 à 6, tous les nobles vous paient 100 pièces. Sinon, vous payez 100 pièces à tous les nobles. Vous ne pouvez jouer cette carte que si vous en avez les moyens.', {requiresNoblePayment:true}),
  C('indebted','noble','Indebted','Endetté','indebted',2,
    'If you roll a 3–6, a Noble has to pay you 100 gold at the beginning of every round until another player frees them by paying you 200. This payment can be made at any time. Any debts are gone if you become King.',
    'Lancez un dé : si vous obtenez 3-6, un noble vous doit 100 pièces au début de chaque round jusqu’à ce qu’un autre joueur le libère en vous payant 200 pièces. Ce paiement peut être fait n’importe quand. Toutes les dettes sont annulées si vous devenez Roi.'),
  C('isolation','noble','Isolation','Isolation','isolation',3,
    'No one can look at your cards until the end of your next turn. No one can take gold from you until the end of your next turn. This does not apply to the Betrayal card.',
    'Personne ne peut regarder vos cartes jusqu’à la fin de votre prochain tour. Personne ne peut prendre vos pièces jusqu’à la fin de votre prochain tour. Ne s’applique pas à la carte « Trahison ».'),
  C('king-maker','noble','King Maker','Faiseur de roi','king_maker',2,
    'Play this card out of turn when you or someone plays “Betray the King”. Choose a side: support (+1 to the King’s roll) or oppose (−1 to the King’s roll). If your side fails, pay 300 gold to the bank.',
    'Vous pouvez jouer cette carte lorsque vous ou quelqu’un d’autre joue « Trahir le Roi ». Choisissez un parti : soutien (+1 au dé du Roi) ou opposant (-1 au dé du Roi). Si votre parti perd, payez 300 pièces à la banque.', {outOfTurn:true}),
  C('knight-noble','noble','Knight','Chevalier','knight',2,
    'Place this card face down in front of a player to protect them from one Betrayal card. They cannot look at it. Placing a Knight down counts as a card played.',
    'Placez cette carte face cachée devant un joueur pour le protéger d’une carte Trahison. Il ne peut pas la regarder. Poser un Chevalier compte comme une carte jouée.'),
  C('loyalty','noble','Loyalty','Loyauté','loyalty',3,
    'Pick a player. They choose whether to pay you 100 gold or force the King to pay you. Force a player to pay the King 100 gold and pledge their loyalty to them.',
    'Choisissez un joueur. Il choisit entre vous payer 100 pièces ou forcer le Roi à le faire. Forcez un joueur à payer 100 pièces au Roi et à lui promettre sa loyauté.'),
  C('meat-for-meat','noble','Meat for Meat','Face à face','meat',4,
    'You and another Noble roll. If you roll higher, you collect 200 from them.',
    'Vous et un autre noble lancez un dé. Si votre lancé est supérieur, il vous doit 200 pièces.'),
  C('peoples-champion','noble',"People’s Champion",'Champion du peuple','peoples_champion',1,
    'Nominate a Noble as King. If all other Nobles agree, they roll against the current King to take the throne. Can only be played or discarded in the last round.',
    'Nominez un noble pour devenir Roi. Si tous les nobles sont d’accord, il lance un dé contre le Roi : le plus élevé est le Roi. Ne peut être joué ou défaussé qu’au dernier tour.', {lastRoundOnly:true}),
  C('royal-bomb','noble','Royal Bomb','Bombe royale','royal_bomb',1,
    'You and everyone else excluding the King lose 800 gold. This card cannot be stolen and can only be discarded or given away by you during the Negotiation Phase. If you become King, the card is discarded.',
    'Tout le monde sauf le Roi perd 800 pièces. Cette carte ne peut pas être volée et ne peut être défaussée ou donnée que par vous lors des négociations. Si vous devenez Roi, cette carte est défaussée.', {unstealable:true}),
  C('scout','noble','Scout','Scout','scout',2,
    'Back a Noble to become King by the end of the next round. If you are correct, earn 300 gold from the bank. If you are wrong, lose 100. Keep this card in front of you until then.',
    'Désignez un noble et pariez qu’il devient Roi d’ici la fin du round. Si vous avez raison, gagnez 300 pièces depuis la banque ; sinon, perdez-en 100. Gardez cette carte devant vous jusque-là.'),
  C('shadow-deal','noble','Shadow Deal','Marché noir','shadow_deal',5,
    'Give another player 100 or 200 gold (you pick) from the bank. You can give it to the King.',
    'Faites gagner à un joueur de votre choix 100 à 200 pièces depuis la banque. Peut être le Roi.'),
  C('sub-rosa','noble','Sub Rosa','Catimini','sub_rosa',5,
    'Look at another player’s hand. If you roll a 4 or higher, you can also discard a card.',
    'Regardez la main d’un joueur. Si vous lancez 4-6 au dé, vous pouvez défausser une de ses cartes.'),
  C('subsidies','noble','Subsidies','Retombées','subsidies',3,
    'All Nobles get gold for as much gold as they have: No gold → receive 300; 100–300 → receive 200; 400–500 → receive 100.',
    'Tous les nobles gagnent des pièces depuis la banque selon ce qu’ils ont : 0 → 300 ; 100-300 → 200 ; 400-500 → 100.'),
  C('tithe','noble','Tithe','Dîme','tithe',2,
    'Pick a player. They must pick a Noble to give you 100 gold.',
    'Choisissez un joueur. Il doit désigner un noble qui vous paiera 100 pièces.'),
  C('unprotected','noble','Unprotected','Non protégé','unprotected',2,
    'If you roll a 5–6, all face-down Knights in play are removed except yours.',
    'Si vous lancez un 5-6 au dé, tous les Chevaliers face cachée sont défaussés, sauf les vôtres.'),
  C('suppress-rebellion','noble','Suppress Rebellion','Rébellion','suppress_rebellion',2,
    'If the King pathetically rolls a 1–3, the bank must give you 200 gold and every other Noble 100 gold.',
    'Si le Roi lance 1-3, la banque vous paie 200 pièces et 100 pièces à chaque autre noble.'),
  C('wrath','noble','Wrath','Fureur','wrath',4,
    'You lose 100 gold, but a Noble of your choice loses 300. Make a player lose 100 to the bank.',
    'Vous perdez 100 pièces à la banque, mais un noble de votre choix en perd 300. La banque prend 100 pièces à un joueur de votre choix.', {twoModes:true}),
  C('black-plague','noble','Black Plague','Peste noire','black_plague',1,
    'All Nobles pair up and each roll a die. If either Noble in a pair rolls a 1, both Nobles lose 200 gold. If there is an odd number of Nobles, roll with the leftover Noble but you do not lose gold.',
    'Tous les nobles se mettent par deux et chacun lance un dé. Si l’un des deux lance un 1, la banque prend 200 pièces à chacun. Si les nobles sont impairs, soyez son binôme, mais ne perdez pas de pièces.'),
  C('eye-for-eye','noble','Eye for an Eye','Œil pour œil','eye_for_eye',1,
    'You lose 100 gold to the bank but a player of your choice loses 300.',
    'Vous perdez 100 pièces à la banque, mais un joueur de votre choix en perd 300.'),
  C('bend-knee','noble','Bend the Knee','À genoux','bend_knee',2,
    'Force a player to thank you for everything you have done for them. If they refuse, they pay the bank 300 gold. If they cannot afford to, they must thank you.',
    'Forcez un joueur à vous remercier pour tout ce que vous avez fait pour lui. S’il refuse, la banque lui prend 300 pièces. S’il ne peut pas payer, il est obligé de vous remercier.'),
  C('helping-hand-noble','noble','Helping Hand','Main généreuse','helping_noble',3,
    'First draw two, then play an extra card. So, if this is your first card, you play 4 more now (or 3, if you are only playing with 3 Nobles).',
    'Piochez 2, puis jouez 1 carte supplémentaire. Si c’est votre première carte, vous pouvez donc jouer 4 cartes supplémentaires ensuite (3 s’il y a moins de 4 nobles).'),
  C('anchor','king','Anchor','Ancre','anchor',2,
    'A player of your choice loses 200 gold to the bank or lets another player of your choice lose 100 gold to you.',
    'Un joueur de votre choix perd 200 pièces à la banque ou accepte qu’un autre joueur de votre choix perde 100 pièces à votre profit.'),
  C('loyal-dog','king','Loyal Dog','Chien loyal','loyal_dog',3,
    'Give a player 100 to 300 gold (you pick) from the bank but they must say “Thank you my King, I pledge my loyalty to you my King.”',
    'Donnez à un joueur 100 à 300 pièces depuis la banque. Il doit dire « Merci, mon Roi. Je jure de vous être loyal pour toujours, mon Roi ».'),
  C('debt-collector','king','Debt Collector','Collecteur de dettes','debt_collector',2,
    'Pick a player. This player picks someone to lose 200 gold to the bank.',
    'Choisissez un joueur. Ce joueur choisit un autre joueur : il paie 200 pièces à la banque.'),
  C('mad-king','king','Mad King','Roi dément','mad_king',1,
    'Force everyone to roll dice. Whoever rolls a 1 loses 300 to the bank. You must roll as well. If you roll a 1, you lose 500.',
    'Tout le monde lance un dé. Ceux qui lancent un 1 doivent payer 300 pièces à la banque. Si vous lancez un 1, perdez 500 pièces.'),
  C('royal-parrot','king','Royal Parrot','Perroquet royal','royal_parrot',2,
    'As the Royal Parrot, a player of your choice has to pay the bank 100 gold then repeat a sentence you give them in a high-pitched voice. 300 to the bank if they refuse.',
    'En tant que perroquet royal, un joueur de votre choix doit payer 100 pièces à la banque puis répéter une phrase de votre choix avec une voix aiguë. S’il refuse, il paie 300 pièces à la banque.'),
  C('shifting-tides','king','Shifting Tides','Marées mouvantes','shifting_tides',1,
    'Pick two Nobles. They can only take gold from each other until your next turn. This does not include Betrayal cards.',
    'Choisissez deux nobles. Ils ne peuvent prendre de l’or que l’un de l’autre jusqu’à votre prochain tour, y compris lors des négociations. Ne comprend pas les cartes Trahison.'),
  C('snakes','king','Snakes','Vipères','snakes',1,
    'Pick a player and announce it. All Nobles must vote by raising their hand. If even one Noble raises their hand, the chosen player loses 300 gold to the bank.',
    'Désignez un joueur. Les nobles doivent voter en levant ou non leur main. Si un seul lève sa main, le joueur choisi paie 300 pièces à la banque.'),
  C('scapegoat','king','Scapegoat','Bouc émissaire','scapegoat',1,
    'Each Noble must vote on another Noble to lose 300 gold to the bank, starting from the Noble to your left. A tie is decided by a dice roll.',
    'Chaque noble doit voter pour un autre noble qui paiera 300 pièces à la banque, en commençant par le noble à votre gauche. Une égalité est décidée par un lancé au dé.'),
  C('kings-eye','king',"King’s Eye",'Œil du Roi','kings_eye',2,
    'Protect a player of your choice until your next turn. If a Noble looks at their cards or takes gold from them, they must pay the bank 100 gold.',
    'Protégez un joueur de votre choix jusqu’à votre prochain tour. Si un noble veut regarder ses cartes ou lui faire perdre des pièces, il doit payer 100 pièces à la banque.'),
  C('we-ride-together','king','We Ride Together','On fait équipe','we_ride',2,
    'Pick two Nobles. Whoever rolls lower between them has to lose 200 gold to the bank. Players can agree to lose 100 gold each instead only AFTER they both roll. Roll again if they tie.',
    'Désignez 2 nobles. Celui qui lance le plus faible dé (ils relancent en cas d’égalité) paie 200 pièces à la banque. APRÈS le lancé, ils peuvent finalement décider de perdre 100 pièces chacun.')
];

// Authoritative physical-card role mapping from the supplied Print-at-Home PDF.
// King deck = pages 23, 25 and 27, except Wrath.
// Everything else printed in the card sheets belongs to the Noble deck.
// Knight and Sub Rosa also appear in both physical decks; their King copies are
// represented as role-specific deck clones with the same printed card identity.
export const KING_CARD_IDS = new Set([
  'actors','bad-blood','betrayal',
  'helping-hand','black-plague','eye-for-eye','bend-knee','anchor',
  'loyal-dog','mad-king','debt-collector','royal-parrot',
  'shifting-tides','snakes','sub-rosa','scapegoat','kings-eye',
  'we-ride-together','knight-noble'
]);

for(const card of CARDS){
  card.side = KING_CARD_IDS.has(card.id) && !['knight-noble','sub-rosa'].includes(card.id) ? 'king' : 'noble';
}

export const CARD_MAP = Object.fromEntries(CARDS.map(c=>[c.id,c]));
export const KING_CARDS = CARDS
  .filter(c=>KING_CARD_IDS.has(c.id))
  .map(c=>({...c,side:'king', copies:(c.id==='helping-hand'?1:c.id==='sub-rosa'?2:c.id==='knight-noble'?1:c.copies)}));
export const NOBLE_CARDS = CARDS
  .filter(c=>!KING_CARD_IDS.has(c.id))
  .map(c=>({...c,side:'noble'}));
// The three shared-title cards have different physical quantities in each deck.
// Remove their King quantities from the Noble-side definitions when they are in
// the King mapping; the Noble copies are explicitly listed in their definitions.
NOBLE_CARDS.push({...CARDS.find(c=>c.id==='sub-rosa'),side:'noble',copies:5});
NOBLE_CARDS.push({...CARDS.find(c=>c.id==='knight-noble'),side:'noble',copies:2});
// helping-hand-noble already represents the three Noble copies.

export const KING_IDS = new Set(KING_CARDS.map(c=>c.id));
export const NOBLE_IDS = new Set(NOBLE_CARDS.map(c=>c.id));
export const DECK_COUNTS = {
  king:Object.fromEntries(KING_CARDS.map(c=>[c.id,c.copies])),
  noble:Object.fromEntries(NOBLE_CARDS.map(c=>[c.id,c.copies]))
};

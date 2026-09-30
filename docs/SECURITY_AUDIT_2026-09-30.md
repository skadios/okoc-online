# OKOC ONLINE — Audit de stabilité et de sécurité

Date: 2026-09-30

## Périmètre

Audit adversarial du moteur de jeu, du protocole WebSocket, des endpoints HTTP/DEV, des actions client, des traductions et de l’interface responsive.

## Corrections appliquées

### Règles / moteur

- Black Plague : tous les Nobles participent désormais ; le joueur de la carte bénéficie correctement de l’exception en nombre impair.
- Shifting Tides : les transferts touchant l’un des deux Nobles sélectionnés sont limités au duo concerné ; un tiers ne peut plus leur prendre d’or pendant l’effet.
- Crown change : le compteur de cartes jouées ne fuit plus d’un rôle/tour à l’autre.
- Les engagements Hindsight / Scout ne sont plus supprimés arbitrairement par un changement de Roi.
- Une dette est supprimée uniquement lorsque son débiteur devient Roi.
- Bad Blood est supprimé lorsqu’un des deux Nobles concernés devient Roi, afin d’éviter une obligation impossible à satisfaire.
- Anchor exige deux cibles distinctes.
- Une carte rejetée par la validation serveur est restaurée dans la main au lieu d’être consommée.
- Betrayal bloquée par un vrai Knight n’est résolue qu’une seule fois.
- Les échanges directs de cartes via l’action interne `tradeCards` sont désactivés : seuls les flux offre → acceptation/refus restent utilisables.
- Les offres de cartes sont plafonnées pour éviter une accumulation mémoire inutile.
- Les IDs d’action ne sont enregistrés comme consommés qu’après une action réussie.

### Sécurité / serveur

- Limite des corps JSON HTTP à 32 KiB.
- Limite des frames WebSocket à 32 KiB.
- Limitation à 80 messages par connexion sur 10 secondes.
- Une ancienne WebSocket ne peut plus continuer à agir après remplacement par une nouvelle connexion.
- Les reconnexions font tourner le token de session et invalident l’ancien token.
- Une connexion déjà attachée à une salle ne peut pas créer/rejoindre une autre salle avec la même socket.
- Maximum de 200 salles simultanées.
- Nettoyage automatique des salles inactives et terminées.
- En-têtes de sécurité HTTP ajoutés (anti-sniffing, anti-framing, permissions et CSP).
- Normalisation NFKC et suppression de caractères invisibles/bidirectionnels dangereux dans les noms et messages.
- L’API de contrôle DEV n’est plus exposée lorsque `NODE_ENV=production`, sauf opt-in explicite `OKOC_DEV_MODE=1`.

### Interface / traduction

- Les identifiants multi-cibles de l’UI correspondent maintenant aux vrais IDs d’effets serveur (`bad_blood`, `shifting_tides`, `we_ride`, etc.).
- Les cartes à deux cibles exigent réellement deux sélections avant confirmation.
- Suppression de plusieurs textes anglais codés en dur dans les décisions.
- Correction de la traduction `splitLoss` et des clés FR/EN manquantes.
- Nettoyage d’un rendu `Loyal Dog` dupliqué.
- Les événements publics de carte restent visibles pendant les résolutions afin que les autres joueurs comprennent les effets.
- Le mode DEV conserve sa zone de contrôle séparée du jeu classique.

## Validation

- 99 tests automatisés passent.
- Syntaxe serveur validée avec `node --check` sur les modules Node concernés.
- Parcours de complétude des 42 cartes conservé et couvert par la suite existante.

## Limitation de validation

Le build Vite complet n’a pas pu être exécuté dans cet environnement car les dépendances npm n’étaient pas présentes et leur installation réseau a expiré. Le code serveur a été vérifié et testé ; le rendu navigateur final doit encore être vérifié dans un environnement disposant des dépendances npm.

## Sécurité applicative

Les contrôles critiques restent côté serveur : le client ne doit être considéré que comme une interface. Cette approche est cohérente avec les recommandations OWASP concernant la validation des entrées et l’autorisation côté serveur.

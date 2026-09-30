# OKOC Online — mise en ligne détaillée sur Render

## 1. Corriger le dépôt GitHub

La version corrigée ne dépend plus d'un chemin Vite imbriqué manquant.
Le `package.json` utilise maintenant :

```text
npm run build
```

et le dépôt doit contenir à sa racine :

```text
vite.config.js
package.json
render.yaml
server/
shared/
client/
```

## 2. Remplacer le contenu du dépôt

Décompresser l'archive et copier **tout son contenu** dans le dépôt GitHub `okoc-online`.

Vérifier en particulier que ces fichiers existent sur GitHub :

- `vite.config.js`
- `package.json`
- `client/index.html`
- `client/dev.html`
- `client/vite.config.js`
- `server/index.js`
- `server/game-engine.js`
- `shared/cards.js`

Puis commit + push sur `main`.

## 3. Configuration Render

Créer un **Web Service**, pas un Static Site : OKOC possède un backend Express et des WebSockets.

Valeurs recommandées :

```text
Repository: skadios/okoc-online
Branch: main
Root Directory: laisser vide
Runtime: Node
Build Command: npm install && npm run build
Start Command: npm start
Plan: Free
```

Variables d'environnement :

```text
NODE_ENV=production
PORT=10000
```

Le serveur écoute déjà sur `0.0.0.0` et utilise `PORT`.

## 4. Déployer

Lancer le déploiement et regarder les logs.

Un build correct doit notamment montrer :

```text
npm install
npm run build
vite build
...
build completed
npm start
OKOC server listening on 10000
```

## 5. Vérification du serveur

Ouvrir :

```text
https://VOTRE-SERVICE.onrender.com/health
```

La réponse doit ressembler à :

```json
{"ok":true,"rooms":0}
```

Puis ouvrir :

```text
https://VOTRE-SERVICE.onrender.com/
```

## 6. Tester le WebSocket

Le navigateur doit utiliser automatiquement `wss://` lorsque le site est en HTTPS.

Ne remplacez pas l'adresse par `ws://` sur Render.

## 7. Tester une vraie partie

1. Ouvrir le site sur un PC.
2. Créer une salle publique à 4 joueurs.
3. Ouvrir le lien dans trois autres fenêtres/appareils.
4. Vérifier les 4 joueurs dans le lobby.
5. Lancer la partie.
6. Vérifier :
   - 8 cartes par joueur ;
   - bon rôle des cartes ;
   - Roi premier ;
   - 2 cartes chacun à 4 joueurs ;
   - 3 cartes au Roi à 5–8 joueurs ;
   - retour automatique à 8 cartes en fin de tour ;
   - changement de sens au round suivant ;
   - négociation après les trois premiers rounds seulement.

## 8. Téléphone en 4G/5G

Dans le lobby, le QR code contient une URL publique du type :

```text
https://VOTRE-SERVICE.onrender.com/?join=ABC123
```

Le téléphone peut donc être uniquement en données mobiles.

Le téléphone n'a pas besoin d'être sur le même Wi-Fi que le PC.

## 9. Attention au Free Tier

Un Web Service Render gratuit peut se mettre en veille après 15 minutes sans activité. La première requête ou nouvelle connexion WebSocket peut alors subir un délai de réveil.

Cela ne signifie pas que le jeu est arrêté définitivement : Render relance le service lorsqu'il reçoit du trafic.

## 10. Mise à jour du jeu

Après une modification :

```text
git add .
git commit -m "Update OKOC Online"
git push origin main
```

Si l'auto-deploy est activé, Render redéploie automatiquement le nouveau commit.

## 11. Si Render affiche encore l'ancien chemin Vite

Si les logs affichent encore :

```text
Could not resolve /opt/render/project/src/client/vite.config.js
```

vérifier que le commit déployé contient bien le nouveau `package.json` avec :

```json
"build": "vite build"
```

Puis déclencher un nouveau déploiement du commit `main`.

## 12. Vérifier le système de Chevalier après le déploiement

Faire un test avec au moins un Roi et deux Nobles :

1. Pendant son tour, sélectionner **POSER FACE CACHÉE**.
2. Choisir n'importe quelle carte de sa main.
3. Choisir un **Noble** comme cible.
4. Vérifier que la cible reçoit immédiatement l'indicateur de Chevalier et l'animation de carte face cachée.
5. Seul le Noble qui possède l'indicateur doit pouvoir cliquer dessus pour voir la carte réelle.
6. Refaire le test avec le Roi : l'indicateur doit être visuellement différent et signaler la **protection du Roi**, sans révéler si la carte cachée est réellement un Chevalier.
7. Tester un faux Chevalier : une carte quelconque posée face cachée ne doit pas bloquer une Trahison.
8. Tester un vrai Chevalier : la Trahison doit être annulée et le Chevalier doit être consommé/défaussé.
9. Vérifier qu'une carte du paquet Roi ne peut jamais être piochée par un Noble, et inversement.
10. Vérifier qu'un échange de cartes entre Roi et Noble est refusé.

Les quantités physiques sont également séparées par rôle : le paquet Roi contient 25 cartes et le paquet Noble 74 cartes, soit 99 cartes au total dans l'adaptation. Les copies portant les mêmes titres mais imprimées dans les deux paquets restent séparées : **Sub Rosa = 2 Roi / 5 Nobles**, **Knight = 1 Roi / 2 Nobles**, **Helping Hand = 1 Roi / 3 Nobles**.

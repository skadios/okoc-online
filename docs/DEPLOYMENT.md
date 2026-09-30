# Publication gratuite — Render

Cette version peut être publiée gratuitement avec son serveur WebSocket : le frontend et le backend sont servis par le même service Node. Un joueur peut donc ouvrir le lien depuis un téléphone en 4G/5G et rejoindre une partie.

## Méthode recommandée

1. Créez un dépôt GitHub et mettez-y tout le contenu du projet.
2. Sur Render, créez **New → Web Service** et connectez le dépôt.
3. Choisissez le plan **Free**.
4. Laissez Render utiliser le `render.yaml` fourni, ou configurez :
   - Build : `npm install && npm run build`
   - Start : `npm start`
   - `NODE_ENV=production`
5. Lancez le déploiement.
6. Render fournit une URL HTTPS du type `https://votre-jeu.onrender.com`.
7. Partagez cette URL : le navigateur choisira automatiquement `wss://` pour les WebSockets.
8. Dans le lobby, le **code de partie** et un **QR code** permettent à un joueur sur téléphone de rejoindre rapidement.

## Rejoindre depuis un téléphone

Le QR code encode une URL de la forme `https://votre-jeu.onrender.com/?join=ABC123`. L'application ouvre alors directement l'écran de rejoindre avec le code prérempli.

## Limites du gratuit

Le plan gratuit peut mettre le service en veille après une période d'inactivité. Le premier chargement après veille peut donc être plus lent. Les parties sont actuellement conservées en mémoire du serveur : un redémarrage ou une mise en veille destructive peut terminer les salles en cours. Cette version ne promet donc pas de persistance des parties.

Le QR code utilise QuickChart uniquement pour générer l'image du QR dans le navigateur ; aucune carte, main ou donnée de partie n'est envoyée à ce service, seulement l'URL de rejoindre la salle.

# OKOC ONLINE — local smoke test

Run:

```bash
npm install
npm test
npm run build
npm run dev
```

Then verify:

1. `http://localhost:5173/` shows the poster menu.
2. `http://localhost:5173/dev` shows **DEV COURT**, not the normal app.
3. The DEV status becomes `CONNECTÉ` when port 10001 is available.
4. `RESET PARTIE` reloads an isolated four-player DEV game.
5. Switching DEV 1–4 reloads that player's state.
6. `APPLIQUER L’OR` changes server state and runs the real gold-crown check.
7. `VÉRIFIER COURONNE` calls the real engine crown check.
8. `TESTER ERREUR API` produces a readable recoverable error, not a React red screen.
9. Ctrl+R on `/dev` still loads the standalone entry.
10. `/` and `/dev` can be visited repeatedly without sharing React state.

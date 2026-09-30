# OKOC ONLINE — DEV MODE

The DEV environment is intentionally separate from the normal game UI.

## Frontend

- Entry: `client/dev.html`
- React entry: `client/src/dev-main.jsx`
- Route in Vite dev server: `/dev`
- No pathname switch inside the normal `client/src/main.jsx` application.

## Backend

- Normal game server: port `10000`
- DEV server: port `10001`
- DEV endpoints are exposed under `/api/dev-standalone/*` through the Vite proxy.
- DEV state is stored in a separate in-memory `devGame` instance.
- The DEV instance is created with the real `createGame()` engine and actions are passed through the real server engine where applicable.

## Controls

- DEV 1–4 selection
- RESET PARTIE
- RÉESSAYER / SYNCHRONISER
- VÉRIFIER COURONNE
- APPLIQUER L’OR
- TESTER ERREUR API

The controlled API error intentionally returns HTTP 503 and is converted by the frontend into a recoverable message instead of a React crash.

## Verification

The regression suite checks that the standalone DEV entry renders `DevApp` directly and that it does not reference an undefined `App` component.

# Oh Heck Scorer

A multiplayer scoring app for the card game Oh Heck. Each player joins a game
room from their own phone; bids and scores sync live via Firebase Firestore.

## Stack

- React + TypeScript + Vite, packaged as a PWA (`vite-plugin-pwa`)
- Firebase Firestore for room state, Firebase Anonymous Auth for player identity
- Pure, fully-tested rules engine in [`src/lib/gameRules.ts`](src/lib/gameRules.ts)

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Create a Firebase project

1. Go to the [Firebase console](https://console.firebase.google.com) and create a project.
2. Under **Build > Firestore Database**, create a database (start in production mode — the rules in [`firestore.rules`](firestore.rules) handle access control).
3. Under **Build > Authentication > Sign-in method**, enable the **Anonymous** provider (players get a stable session without creating an account).
4. Under **Project settings > General > Your apps**, add a Web app and copy the config values.

### 3. Configure environment variables

```bash
cp .env.example .env.local
```

Fill in the Firebase config values from step 2.4 into `.env.local` (never commit this file — it's gitignored).

### 4. Deploy Firestore security rules

Install the Firebase CLI if you don't have it, then log in and point it at your project:

```bash
npx firebase-tools login
cp .firebaserc.example .firebaserc   # edit the project id inside
npx firebase-tools deploy --only firestore:rules
```

## Scripts

```bash
npm run dev        # start the Vite dev server
npm run build       # type-check and build for production
npm run preview     # preview the production build locally
npm test            # run unit tests once
npm run test:watch  # run unit tests in watch mode
```

## Project structure

```
src/
  types/game.ts     # GameState, Player, RoundState, etc.
  lib/
    gameRules.ts     # pure functions: round sequence, bidding, scoring, state machine
    gameRules.test.ts
    firebase.ts      # Firebase app/Firestore/Auth init, anonymous auth helper
    gameRoom.ts       # Firestore-backed room CRUD, realtime subscription, transactions
    gameRoom.test.ts  # tests for the pure Firestore <-> GameState conversion helpers
    session.ts        # localStorage helpers so a reload can rejoin the same room/player
  hooks/
    useGameRoom.ts     # subscribes a component to a room's live state
  pages/
    Home.tsx           # create a game or enter a code to join
    Join.tsx           # pick a name and join a room by code (or via /join/:code link)
    Lobby.tsx           # live player list, seat order, share code/link, start game
firestore.rules       # security rules for the `games` collection
firebase.json          # Firestore + Hosting config for the Firebase CLI
```

## How rooms work

- Each room is a single document at `games/{roomCode}`, where `roomCode` is a
  human-friendly 6-character code (e.g. `ABC123`) generated on creation.
- A player's identity is their Firebase Anonymous Auth `uid`, persisted by the
  SDK across reloads — no login screen needed.
- All game-state transitions (start game, submit bid, submit tricks, complete
  round) go through the pure functions in `gameRules.ts` inside a Firestore
  transaction in `gameRoom.ts`, so concurrent writes from different players
  can't corrupt turn order or scores.
- Clients subscribe to their room with `subscribeToGameRoom`, which wraps
  Firestore's `onSnapshot` and pushes live updates to the UI.

### Security model (v1)

There's no real login — just Firebase Anonymous Auth. `firestore.rules`:

- Disables listing the `games` collection, so room codes can't be enumerated;
  you can only read a room if you already know its code.
- Only lets a room be created by its host, as the sole player, in the `lobby` status.
- Lets the host, any existing player, or someone joining an open lobby update
  the document, but does not deeply validate every field (e.g. one player
  could technically overwrite another's bid).

This is an intentional trade-off for a casual, friends-and-family scorer. To
harden further later, route all writes through a Cloud Function (or Firestore
callable) that re-runs the same `gameRules.ts` validation server-side and
rejects anything a client tries to write directly.

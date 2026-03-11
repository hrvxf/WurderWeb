# Wurder Website

Next.js App Router website for Wurder marketing, game purchase flow, and members area.

## Local Development

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Required Environment Variables

Create `.env.local` with:

```bash
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=
NEXT_PUBLIC_APP_URL=
```

## Members Area

Members auth uses the same Firebase Auth users and Firestore profile docs as mobile:

- Canonical profile: `users/{uid}`
- Wurder ID lookup: `usernames/{wurderIdLower}`

Routes:

- `/login`
- `/signup`
- `/members`
- `/members/profile`
- `/members/stats`

See [docs/MEMBERS_AREA.md](docs/MEMBERS_AREA.md) for setup details, auth behavior, and caveats.

## Scripts

- `npm run dev` - start local dev server.
- `npm run build` - production build.
- `npm run start` - run production server.
- `npm run lint` - lint checks.
- `npm run test` - unit tests (Vitest).
- `npm run test:e2e` - Playwright tests.

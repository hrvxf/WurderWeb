# Wurder Website

Next.js App Router website for Wurder marketing, join flow, and members area.

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
FIREBASE_ADMIN_PROJECT_ID=
FIREBASE_ADMIN_CLIENT_EMAIL=
FIREBASE_ADMIN_PRIVATE_KEY=
GOOGLE_APPLICATION_CREDENTIALS=
```

Admin notes:
- `FIREBASE_ADMIN_PROJECT_ID` should match your Firebase project (for example `wurderv-1`).
- Use either inline admin env vars or `GOOGLE_APPLICATION_CREDENTIALS`, not both.
- `FIREBASE_ADMIN_CLIENT_EMAIL` and `FIREBASE_ADMIN_PRIVATE_KEY` must come from a Firebase service account key.
- `FIREBASE_ADMIN_PRIVATE_KEY` must preserve newlines (store as a single string with `\n` escapes in `.env.local`).
- `GOOGLE_APPLICATION_CREDENTIALS` should point to a local Firebase service account JSON file path, for example `C:\secrets\wurder-firebase-admin.json`.

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

## B2B Manager Documentation

- [docs/MANAGER_ACCESS_CONTROL.md](docs/MANAGER_ACCESS_CONTROL.md)
- [docs/ORG_DATA_MODEL.md](docs/ORG_DATA_MODEL.md)
- [docs/TEMPLATE_REUSE.md](docs/TEMPLATE_REUSE.md)
- [docs/PRODUCT_TIERS.md](docs/PRODUCT_TIERS.md)
- [docs/REPORTING_EXPORTS.md](docs/REPORTING_EXPORTS.md)
- [docs/B2B_WEB_APP_ARCHITECTURE.md](docs/B2B_WEB_APP_ARCHITECTURE.md)

## Scripts

- `npm run dev` - start local dev server.
- `npm run build` - production build.
- `npm run start` - run production server.
- `npm run lint` - lint checks.
- `npm run test` - unit tests (Vitest).
- `npm run test:e2e` - Playwright tests.

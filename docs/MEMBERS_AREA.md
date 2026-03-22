# Wurder Members Area

## Environment Variables

Set these in `.env.local`:

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

## Firebase Console Setup

1. Firebase Authentication:
   - Enable `Email/Password`.
   - Enable `Google`.
   - Add your local/dev/prod hostnames to Authorized domains.
2. Firestore:
   - Keep canonical `users/{uid}` profile documents.
   - Keep `usernames/{wurderIdLower}` lookup documents.
   - Keep user-level security rules intact; do not loosen rules for web.
3. Username mapping:
   - Username claiming uses a Firestore transaction in web client.
   - Collisions fail with a plain error.
   - Existing Wurder IDs are treated as locked once set.

## Route Map

- `/login`: Email or Wurder ID + password, Google sign-in.
- `/signup`: Create Firebase user and bootstrap canonical profile.
- `/members`: Protected dashboard (requires complete profile).
- `/members/profile`: Protected profile editor (available for incomplete profiles).
- `/members/stats`: Protected stats view (requires complete profile).

## Auth Behavior

1. Browser persistence is set with Firebase `browserLocalPersistence`.
2. `AuthProvider` owns a single `onAuthStateChanged` listener.
3. On auth change, web bootstraps and reads canonical `users/{uid}`.
4. Wurder ID login resolves `usernames/{lowercase}` to email before Firebase login.
5. Unauthenticated users redirect to `/login`.
6. Authenticated users with incomplete profile redirect to `/members/profile`.
7. Logout signs out, clears local member/game cache keys, then redirects to `/login`.

## Data Source Contract (Regression Guardrail)

- Identity/profile fields for Members Area render from `accounts/{uid}`.
- Gameplay aggregate stats render from `profiles/{uid}`.
- `users/{uid}` is not the source of truth for gameplay aggregates in Members Area.
- During bootstrap/backfill, do not copy aggregate stats into `users/{uid}`.
- CI guardrail: `npm run test:contract` (member data contract tests) must pass before full unit tests.

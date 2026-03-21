# Member Web Bootstrap Operation Table

This table traces the post-sign-in members web bootstrap flow and every Firestore operation executed by that path.

## Bootstrap flow (post-sign-in)

1. `onAuthStateChanged` in `AuthProvider` receives a signed-in Firebase user and calls `bootstrapProfile(nextUser)`.
2. `bootstrapProfile` calls `ensureUserProfile(nextUser)`.
3. `ensureUserProfile` reads `users/{uid}`, then reads `accounts/{uid}` via `readAppAccountProfile` for legacy field merge.
4. If `users/{uid}` does not exist, `ensureUserProfile` creates it (`setDoc`).
5. If `users/{uid}` exists, `ensureUserProfile` may run an optional merge write (`setDoc` with `merge: true`) for canonical field backfill.
6. Members area route gating (`AuthGate`, `ProfileCompletionGuard`) only evaluates already-loaded auth/profile state and performs no Firestore operation.

## Firestore operation table

| Step | Function | Op type | Path | Required? | Needed to render existing account doc? | Notes |
|---|---|---|---|---|---|---|
| 1 | `ensureUserProfile` | `getDoc` | `users/{uid}` | Required | **Yes** | Canonical member profile source for members web render state. |
| 2 | `readAppAccountProfile` (called by `ensureUserProfile`) | `getDoc` | `accounts/{uid}` | Optional | No | Legacy/mobile compatibility read used for fallback merge/backfill. |
| 3a | `ensureUserProfile` (missing `users/{uid}` only) | `setDoc` | `users/{uid}` | Required | No (create path) | Missing-doc create path; required to bootstrap first-time web account doc. |
| 3b | `ensureUserProfile` (existing `users/{uid}`) | `setDoc` | `users/{uid}` | Optional | No | Optional merge/backfill write; failure should not block existing profile render. |
| 4 | `fetchUserProfile` (refresh-only path) | `getDoc` | `users/{uid}` | Required | **Yes** | Used by explicit `refreshProfile`; not in initial post-sign-in bootstrap. |
| 5 | `readAppAccountProfile` (called by `fetchUserProfile`) | `getDoc` | `accounts/{uid}` | Optional | No | Same optional compatibility read. |
| 6 | `backfillUsersFromMergedProfile` | `setDoc` | `users/{uid}` | Optional | No | Optional write after merge; failure tolerated. |
| 7 | `claimUsernameForUser` | `runTransaction` | `usernames/{wurderIdLower}` | Required when claiming ID | No | Runs during username claim/update flows, not normal post-sign-in bootstrap. |

## Failure classification checklist

Use diagnostics emitted by `profile-bootstrap.ts` to classify the first failing operation:

- **Required read failure**: `stage` = `ensureUserProfile.readUser` or `fetchUserProfile.readUser`, `op` = `getDoc`, `requirement` = `required`.
- **Optional write failure**: `stage` = `ensureUserProfile.update` or `fetchUserProfile.backfillUsers`, `op` = `setDoc`, `requirement` = `optional`.
- **Missing-doc create failure**: `stage` = `ensureUserProfile.create`, `op` = `setDoc`, `requirement` = `required` (only when `users/{uid}` is missing).
- **Route-guard side effect**: not applicable in current code path (`AuthGate` / `ProfileCompletionGuard` do not call Firestore).

## Diagnostic log contract

On each operation start/success (when enabled):

- Log key: `[auth] bootstrap firestore operation`
- Fields: `stage`, `op`, `path`, `uid`, `requirement`, `optional`, `status`

On failure:

- Log key: `[auth] bootstrap firestore operation failed`
- Fields: `stage`, `op`, `path`, `uid`, `requirement`, `optional`, `permissionDenied`, `code`, `message`

Enable start/success logs in local/dev by setting:

```bash
NEXT_PUBLIC_ENABLE_BOOTSTRAP_FIRESTORE_DIAGNOSTICS=true
```

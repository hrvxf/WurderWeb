# Member Web Bootstrap Operation Table

This table traces the post-sign-in members web bootstrap flow and every Firestore operation executed by that path.

## Bootstrap flow (post-sign-in)

1. `onAuthStateChanged` in `AuthProvider` receives a signed-in Firebase user and calls `bootstrapProfile(nextUser)`.
2. `bootstrapProfile` calls `ensureUserProfile(nextUser)`.
3. `ensureUserProfile` first runs `ensureAccountDoc`: read `accounts/{uid}` and create only when missing.
4. Canonical profile is resolved in memory from `accounts/{uid}` (plus optional `users/{uid}` enrichment for stats/history).
5. Optional repair/snapshot writes (`updateAccountSnapshot`, users backfill) run only after canonical resolution; failures are warnings only.
6. Members area route gating (`AuthGate`, `ProfileCompletionGuard`) only evaluates already-loaded auth/profile state and performs no Firestore operation.

## Firestore operation table

| Step | Function | Op type | Path | Required? | Needed to render existing account doc? | Notes |
|---|---|---|---|---|---|---|
| 1 | `ensureAccountDoc` | `getDoc` | `accounts/{uid}` | Required | **Yes** | Canonical shared app/web member profile source. |
| 2 | `ensureAccountDoc` (missing `accounts/{uid}` only) | `setDoc` | `accounts/{uid}` | Required | No (first-time create only) | Minimal self-owned payload create path. |
| 3 | `ensureUserProfile` | `getDoc` | `users/{uid}` | Optional | No | Legacy/stats enrichment only. |
| 4 | `updateAccountSnapshot` | `setDoc` | `accounts/{uid}` | Optional | No | Safe canonical field sync only when differences exist. |
| 5 | `backfillUsersFromMergedProfile` | `setDoc` | `users/{uid}` | Optional | No | Compatibility mirror write; failure tolerated. |
| 6 | `fetchUserProfile` | `getDoc` | `accounts/{uid}` | Required | **Yes** | Refresh path now also resolves canonical account doc first. |
| 7 | `fetchUserProfile` | `getDoc` | `users/{uid}` | Optional | No | Optional enrichment only. |
| 8 | `claimUsernameForUser` | `runTransaction` | `usernames/{wurderIdLower}` | Required when claiming ID | No | Runs during username claim/update flows. |

## Failure classification checklist

Use diagnostics emitted by `profile-bootstrap.ts` to classify the first failing operation:

- **Required read failure**: `stage` = `ensureAccountDoc.readAccount` or `loadAccountProfile`, `op` = `getDoc`, `requirement` = `required`.
- **Optional write failure**: `stage` = `updateAccountSnapshot.writeAccount` or `fetchUserProfile.backfillUsers`, `op` = `setDoc`, `requirement` = `optional`.
- **Missing-doc create failure**: `stage` = `ensureAccountDoc.createAccount`, `op` = `setDoc`, `requirement` = `required` (only when `accounts/{uid}` is missing).
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

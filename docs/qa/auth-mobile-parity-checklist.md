# Auth + Mobile Parity Checklist

Date:
Environment (`local` / `staging` / `prod`):
Web commit:
Mobile app build/version:
Tester:

## 1. Existing Mobile User Parity (Highest Priority)

Precondition:
- Use a real user that already exists in mobile app.
- Record expected UID and current `users/{uid}` snapshot before test.

Steps:
1. Sign into web using same email/password used in app.
2. Confirm authenticated UID equals expected UID.
3. Confirm web profile reads from `users/{uid}` for that UID.
4. Confirm these fields match current mobile-visible data:
   - `wurderId`
   - `name` (or `firstName` + `lastName`)
   - `avatar` / `avatarUrl`
   - `stats.*`
5. Sign out on web.
6. Sign into web with `Wurder ID + password` for the same user.
7. Confirm UID and profile fields again.
8. Sign back into mobile app and verify account still works as normal.

Evidence to capture:
- UID from Firebase Auth in web
- Firestore path read (`users/{uid}`)
- Before/after screenshots of key profile fields
- Mobile re-login success screenshot

Pass/Fail:

Notes:

## 2. New Signup Consistency

Steps:
1. Create a brand-new account on web.
2. Confirm one Firebase Auth user exists for the new email.
3. Confirm one Firestore profile exists at `users/{uid}`.
4. If Wurder ID was set, confirm one mapping exists at `usernames/{wurderIdLower}`.
5. Sign into mobile immediately using same credentials.
6. If app supports Wurder ID login, verify Wurder ID + password works on web and app.

Evidence to capture:
- Firebase Auth user UID
- `users/{uid}` document
- `usernames/{wurderIdLower}` document
- Mobile login screenshot

Pass/Fail:

Notes:

## 3. Logout + Account-Switch Hygiene

Steps:
1. Login as User A.
2. Visit members pages (dashboard/profile/stats).
3. Logout.
4. Login as User B in same browser profile.
5. Confirm no stale User A name/avatar/stats/game data appears.
6. Open two tabs while logged in.
7. Trigger sign-out in one tab and confirm sign-out propagates to second tab.

Evidence to capture:
- User A dashboard/profile screenshots
- User B dashboard/profile screenshots
- Two-tab sign-out propagation recording or screenshots

Pass/Fail:

Notes:

## 4. Profile Completion Edge Cases

Test users:
- Missing `wurderId`
- Missing name (`name` missing and first/last incomplete)
- Missing avatar (if optional)
- Legacy schema user docs

Steps:
1. Sign in as each test user.
2. Verify redirect behavior:
   - Incomplete profile must be sent to `/members/profile`.
   - Completed legacy profiles must not be blocked from members pages.
3. Complete required fields and confirm access unlocks.

Evidence to capture:
- Redirect target URL
- Profile document fields used in decision
- Before/after access to `/members` and `/members/stats`

Pass/Fail:

Notes:

## 5. Username Collision + Normalization

Steps:
1. Submit username with uppercase characters and verify normalized lookup key is lowercase.
2. Submit username with leading/trailing spaces and verify trim behavior.
3. Submit invalid characters and verify rejection.
4. Attempt to claim same username twice (different users) and verify second claim fails.
5. Run concurrent claim from two sessions and verify only one succeeds.

Evidence to capture:
- Requested username vs stored `usernames/{usernameLower}`
- Error message for invalid/collision cases
- Concurrent attempt timestamps and outcomes

Pass/Fail:

Notes:


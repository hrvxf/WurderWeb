# Wurder Business Journey E2E Checklist

## Scope

Validate the full business path from public discovery (`/business`) to successful session launch (`/business/sessions/new`), including auth return behavior, error handling, and mobile usability.

## Environment

- Web app running with Firebase auth configured
- At least one valid business account for email/password sign-in
- One test account intentionally lacking create access or with injected API failure path for negative testing
- Desktop browser + mobile viewport (or real device)

## 1. Logged-out user path

### Steps

1. Open `/business` while logged out.
2. Click `Start session` CTA.
3. Confirm redirect to `/login?next=%2Fbusiness%2Fsessions%2Fnew`.
4. Sign in with email/password.
5. Confirm redirect returns to `/business/sessions/new`.
6. Complete Step 1, Step 2, Step 3.
7. Click `Start session`.

### Expected

- No dead-end between `/business` and create flow.
- After sign-in, user lands on `/business/sessions/new` (not generic members landing).
- Session is created and success state appears with:
- Game code
- Join QR code
- Copy actions
- Next-step CTA(s)

## 2. Logged-in user path

### Steps

1. Sign in first.
2. Open `/business`.
3. Click `Start session`.
4. Confirm direct load of `/business/sessions/new` (no login interruption).
5. Complete flow and submit.

### Expected

- Direct entry into create flow.
- Successful create returns full success state.
- `Open host dashboard` CTA is functional.
- If host role = host_player, `Join as host-player` CTA appears and is functional.

## 3. Error path (server-side failure)

### Steps

1. Open `/business/sessions/new`.
2. Fill valid Step 1/2 inputs and proceed to Step 3.
3. Trigger server failure (for example temporary API failure, invalid token, or test backend failure mode).
4. Submit `Start session`.

### Expected

- Error is shown in understandable text near top of form.
- User remains in flow context (no forced navigation away).
- Form state is preserved:
- Organisation name
- Session name
- Game mode
- Session length
- Host role
- User can retry after correcting issue or when backend recovers.

## 4. Mobile path

### Viewports

- 390x844 (iPhone 12/13/14)
- 360x800 (common Android)

### Steps

1. Open `/business` on mobile viewport.
2. Verify section readability and CTA accessibility without layout break.
3. Enter create flow and complete all 3 steps.
4. Create session and inspect success state.

### Expected

- Business page remains readable with clear hierarchy.
- Stepper and controls remain tappable and legible.
- No horizontal overflow in create flow.
- Success state QR is readable/scannable and link is copyable.
- Primary next actions remain visible without awkward clipping.

## 5. Host role behavior checks

### Host only

1. Create session with `Host role = Host only`.
2. Confirm success text does not imply host must join gameplay.
3. Confirm host-first CTA points to host dashboard.

### Host participates

1. Create session with `Host role = Host participates as a player`.
2. Confirm success state includes host-player join CTA.

## 6. Regression checks

- `/business` header navigation and CTA still function.
- AuthGate still redirects unauthenticated Business create-route access to login with `next`.
- Login deep-link behavior respects `next` even when user is already authenticated.
- Copy actions in success state still work.

## 7. Completion criteria

- Main CTA on `/business` reliably leads to created session.
- Logged-out flow returns correctly after sign-in.
- Error handling is understandable and non-destructive to form state.
- Mobile experience is usable and readable from `/business` through QR success state.

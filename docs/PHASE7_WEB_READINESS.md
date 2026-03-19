# Phase 7 Web Readiness (Near-Term)

## Does Wurder Web need further major work right now?

No major new web build phase is needed immediately **if** the following are already true:

- Plan gating is wired.
- Dashboard flows are functioning.
- Manager and org routes are protected.
- UI reads plan and entitlement data from backend responses correctly.

## Small web checks to keep in scope

These are validation/follow-up items, not a new large web phase.

1. **Consume backend entitlements directly**
   - Web should use API-provided `plan` + `entitlements`.
   - Avoid duplicating plan logic in multiple front-end surfaces.

2. **Build/deploy reliability fix**
   - Resolve deployment/build failures where Firebase Admin env vars are missing during page-data collection.
   - This is an environment/runtime reliability issue, not a product phase gap.

3. **Analytics visibility gating UI**
   - After backend game-state visibility rules are finalized:
     - show limited analytics during in-session play,
     - show full insights after post-game unlock.

## Priority order from here

### Highest priority

1. **Backend**
   - Enforce `uid ↔ player.userId` on gameplay callables.
   - Include `userId` in analytics events and aggregates.
   - Implement fallback handling for legacy players without `userId`.

2. **App**
   - Ensure all new player creation/join flows persist `userId`.

3. **Backend + Web**
   - Implement analytics visibility gating:
     - in-session limited,
     - post-game full.

4. **Backend**
   - Add TTL/retention for analytics events.
   - Harden org aggregate updates.

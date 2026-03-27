# Wurder UI/UX/Flow Backlog

## Scope

This backlog converts the March 27, 2026 audit into implementation-ready tickets for member profile, all member pages, and cross-site flow consistency.
Last updated: March 27, 2026.

## Triage Snapshot (Post B2B/B2C Split)

### Completed in current migration
- UX-001 Remove duplicate workspace navigation
- UX-002 Fix corrupted character rendering
- UX-003 Block dead-end host actions (Business canonical routes)
- UX-004 Add host history error state
- UX-010 Redesign `/members` dashboard into action hub
- UX-020 Improve stats chart interaction accessibility
- UX-021 Replace misleading "Games trend" metric
- UX-022 Clarify join information architecture
- UX-012 Add avatar validation parity with UI copy
- UX-013 Wurder ID claim confidence UX
- UX-031 Standardize CTA naming and intent

### Next (active queue)
- None.

### Verify / polish queue
- None.

## Milestone 1: Critical UX Debt (Week 1)

### Ticket UX-001: Remove duplicate workspace navigation
- Status: Completed
- Priority: P0
- Areas: Members shell, site header
- Files:
- `src/components/members/MemberShell.tsx`
- `src/components/shell/SiteHeader.tsx`
- Problem:
- Members routes show overlapping workspace navigation in both header and member shell.
- Implementation:
- Keep a single primary workspace navigation pattern for authenticated members.
- Reduce secondary navigation to contextual breadcrumbs/section label only.
- Ensure active route state is visible in one place.
- Acceptance criteria:
- On `/members`, `/members/profile`, `/members/stats`, `/members/host`, `/members/settings`, only one full workspace nav is visible.
- Active section is obvious without scanning multiple nav regions.
- No loss of route discoverability on desktop or mobile.

### Ticket UX-002: Fix corrupted character rendering
- Status: Completed
- Priority: P0
- Areas: Header labels, legacy admin console content
- Files:
- `src/components/shell/SiteHeader.tsx`
- `src/app/(admin)/admin/page.tsx`
- Problem:
- Broken glyphs (mojibake) appear in visible UI text.
- Implementation:
- Replace malformed symbols with ASCII-safe equivalents or proper UTF-8 symbols.
- Ensure source files are UTF-8 encoded consistently.
- Acceptance criteria:
- No corrupted symbols appear in header/admin UI.
- Arrow/separator characters render correctly on Chrome, Safari, Edge.
- Status: Verified and completed.

### Ticket UX-003: Block dead-end host actions
- Status: Completed
- Priority: P0
- Areas: Member host page, business placeholders
- Files:
- `src/components/members/MembersHostClient.tsx`
- `src/app/business/dashboard/page.tsx`
- `src/app/business/settings/page.tsx`
- `src/components/business/dashboard/*` and `src/components/business/sessions/*`
- Problem:
- Host actions lead to placeholder pages that read as unfinished.
- Implementation:
- Hide links to non-functional destinations or mark as "Coming soon" with clear expectation.
- Route primary host CTA to fully functional Business flow (`/business/sessions/new` or `/business/dashboard` where available).
- Acceptance criteria:
- No host action leads to a page that feels broken/unavailable without warning.
- Primary host action completes a real workflow.
- Note: `src/components/business/BusinessSurfacePlaceholder.tsx` has been removed after no-caller verification.

### Ticket UX-004: Add host history error state
- Status: Completed
- Priority: P1
- Areas: Host previous sessions card
- File:
- `src/components/members/HostPreviousGamesCard.tsx`
- Problem:
- Failed fetch silently falls back without user feedback.
- Implementation:
- Track request error state and display retry-friendly inline messaging.
- Preserve initial sessions if network fetch fails.
- Acceptance criteria:
- On API failure, user sees explicit non-blocking error message.
- Initial data remains visible if present.

## Milestone 2: Member Experience Redesign (Week 2)

### Ticket UX-010: Redesign `/members` dashboard into action hub
- Status: Completed
- Priority: P0
- Areas: Members dashboard
- File:
- `src/components/members/MembersDashboardClient.tsx`
- Problem:
- Current dashboard provides minimal value and mostly redirects attention elsewhere.
- Implementation:
- Add four cards:
- Session status (resume/join)
- Profile completion and identity status
- Quick stats snapshot
- Host quick actions
- Include direct CTAs with clear primary/secondary hierarchy.
- Acceptance criteria:
- Dashboard includes at least 3 meaningful actions above the fold.
- User can complete common paths (join session, edit profile, open host flow) in one tap each.

### Ticket UX-011: Convert profile editor to staged flow
- Status: Completed
- Priority: P0
- Areas: Member profile
- File:
- `src/components/members/ProfileForm.tsx`
- Problem:
- Long form with mixed concerns increases cognitive load.
- Implementation:
- Split into two steps:
- Step 1: Name + handle
- Step 2: Avatar + account details review
- Add persistent save bar on mobile and desktop.
- Acceptance criteria:
- User can progress through profile in clear steps with progress indicator.
- Save state and validation feedback persist across step transitions.
- Status: Completed. Final polish pass adds explicit readiness gating and clearer step guidance/checklist.

### Ticket UX-012: Add avatar validation parity with UI copy
- Status: Completed
- Priority: P0
- Areas: Profile avatar upload
- File:
- `src/components/members/ProfileForm.tsx`
- Problem:
- UI says "PNG/JPG up to 5MB" but no client-side file size enforcement.
- Implementation:
- Validate MIME type and file size before upload.
- Return clear errors for unsupported type/size.
- Acceptance criteria:
- Files above 5MB are blocked client-side with explicit message.
- Non-image uploads are blocked before upload request.
- Status: Completed. Avatar upload now enforces PNG/JPG and 5MB limit in picker + validation.

### Ticket UX-013: Wurder ID claim confidence UX
- Status: Completed
- Priority: P1
- Areas: Profile handle claim
- Files:
- `src/components/members/ProfileForm.tsx`
- `src/lib/auth/profile-bootstrap.ts`
- Problem:
- Locked-once handle behavior is high-risk and currently lightly explained.
- Implementation:
- Add explicit confirmation before first claim.
- Optionally add availability precheck endpoint for instant feedback before submit.
- Acceptance criteria:
- First-time claim requires user confirmation.
- Availability/uniqueness feedback appears before final submit.
- Status: Completed. Confirmation plus pre-submit availability endpoint and inline feedback are implemented.

## Milestone 3: Stats + Join Flow Clarity (Week 3)

### Ticket UX-020: Improve stats chart interaction accessibility
- Status: Completed
- Priority: P0
- Areas: Member stats chart
- File:
- `src/components/members/MembersStatsClient.tsx`
- Problem:
- Trend detail is primarily hover-driven; weak on touch and keyboard.
- Implementation:
- Add tap/click selection for points.
- Add keyboard focus navigation for chart points.
- Add visible focus states and accessible labels.
- Acceptance criteria:
- Trend details can be accessed by mouse, touch, and keyboard.
- Selected point state is persistent and visually clear.

### Ticket UX-021: Replace misleading "Games trend" metric
- Status: Completed
- Priority: P1
- Areas: Member stats KPI logic
- File:
- `src/components/members/MembersStatsClient.tsx`
- Problem:
- "Games" trend currently uses cumulative index, causing always-rising chart behavior.
- Implementation:
- Use rolling per-session or per-period games metric aligned to selected timeframe.
- Update label/help copy to define metric basis.
- Acceptance criteria:
- Games chart no longer always rises by definition.
- Metric behavior is explainable and consistent with timeframe filter.
- Status: Completed. Games KPI now uses rolling timeframe-aligned windows with explicit basis copy.

### Ticket UX-022: Clarify join information architecture
- Status: Completed (keep for future copy polish pass)
- Priority: P0
- Areas: Join and download funnel
- Files:
- `src/app/join/page.client.tsx`
- `src/app/join/[gameCode]/page.tsx`
- `src/app/download/page.tsx`
- Problem:
- Join and session-start language drifted across `/join`, `/join/[gameCode]`, and `/download`.
- Implementation:
- Keep `/join` as Personal start-session surface only (no inline game-code entry).
- Use `/join/[gameCode]` and `/download` as explicit app-handoff steps for code-based joins.
- Align `/join/[gameCode]` and `/download` copy to app-first join intent.
- Acceptance criteria:
- User intent is clear within first screen on join route.
- No conflicting language between join/create/download pages.
- Route split and copy alignment implemented (`/join` Personal start flow, `/business/...` Business).

## Milestone 4: System Consistency (Week 4+)

### Ticket UX-030: Unify visual language across dark and light surfaces
- Status: Completed
- Priority: P1
- Areas: Members/public (dark) vs business/org/admin (light)
- Files:
- `src/app/globals.css`
- `src/components/admin/*`
- `src/components/members/*`
- Problem:
- Strong visual discontinuity between major product areas.
- Implementation:
- Define shared design tokens for spacing, border radius, elevation, typography scale, and states.
- Align card/button/input patterns across app areas.
- Acceptance criteria:
- Shared components use common token set.
- Cross-surface transition feels intentional, not like separate products.
- Status: Completed. Shared surface/control tokens in `globals.css` now back member dashboard/host/stats panels, business dashboard/settings/session-creation flows, and core admin dashboard panels/modals with common card/input/secondary-control primitives.

### Ticket UX-031: Standardize CTA naming and intent
- Status: Completed
- Priority: P1
- Areas: Header, members host, business pages
- Files:
- `src/components/shell/SiteHeader.tsx`
- `src/components/members/MembersHostClient.tsx`
- `src/app/business/page.tsx`
- Problem:
- CTA naming is inconsistent (`Play Wurder`, `Start session`, `Create business session`).
- Implementation:
- Define canonical action verbs by context:
- Player: Join game
- Host/Manager: Start session
- Update copy across all primary and secondary CTAs.
- Acceptance criteria:
- Same user intent uses same label across routes.
- Primary CTA labels are predictable and role-aligned.

### Ticket UX-032: Polish legal/support/footer consistency
- Status: Completed
- Priority: P2
- Areas: Footer and legal/support entry points
- Files:
- `src/components/shell/SiteFooter.tsx`
- `src/app/contact/page.tsx`
- `src/app/privacy/page.tsx`
- `src/app/terms/page.tsx`
- `src/app/delete-account/page.tsx`
- Problem:
- Legal/support surfaces vary in visual depth and polish.
- Implementation:
- Normalize heading rhythm, body width, and spacing scale.
- Replace `(c)` with copyright symbol.
- Align legal action links and support contact hierarchy.
- Acceptance criteria:
- Legal/support pages follow consistent layout rhythm.
- Footer format is polished and standards-compliant.
- Status: Completed. Shared legal shell/card/action-link styles now align contact/privacy/terms/delete-account pages and footer legal link hierarchy.

## QA Checklist (Per Milestone)

1. Desktop + mobile visual pass for all touched routes.
2. Keyboard-only navigation pass for interactive controls.
3. Auth state pass:
- logged out
- logged in with incomplete profile
- logged in with complete profile
4. Broken-link pass from members host and join routes.
5. Regression run:
- `npm run lint`
- `npm run test`
- targeted E2E path checks for business/member journeys.

### Current Verification Snapshot (March 27, 2026)
- `npx tsc --noEmit`: pass
- `npm run lint`: pass (2 existing unused-symbol warnings in admin analytics tests/payload)
- `npm run test`: pass (30 files, 121 tests)
- `npm run test:e2e`: pass (5 tests). Coverage now asserts keyboard Enter navigation for public join/business/download flows, current auth-gated business-session shell behavior, and legacy `/manager/[gameCode]` -> `/business/sessions/[gameCode]` redirect contract.
- Broken-link sweep:
- Public join/business routes return HTTP 200 (`/join`, `/join/[code]`, `/download`, `/business`, `/business/dashboard`, `/business/settings`, `/business/sessions/new`)
- Member routes correctly redirect unauthenticated users to login with HTTP 307 (`/members`, `/members/profile`, `/members/stats`, `/members/host`, `/members/settings`)
- Manual desktop/mobile visual pass: signed off (March 27, 2026)
- Manual keyboard-only navigation pass: signed off (March 27, 2026)
- Manual auth-state pass (logged out / incomplete profile / complete profile): signed off (March 27, 2026)
- Milestone QA checklist verified and closed (March 27, 2026).

## Suggested Execution Order

1. Milestone closed.

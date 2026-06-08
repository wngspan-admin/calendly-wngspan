# Cal.diy — Completion Plan for Outstanding Phases

> **As of:** June 2026
> **Branch:** dev
> **Purpose:** Fills gaps discovered after re-auditing the implementation against the original plan.

---

## Reality Check: What's Actually Done

Most phases are further along than they appear. Quick status:

| Phase | Status | Notes |
|---|---|---|
| Phase 1 — Schema | ✅ Done | Team, Membership, OrganizationSettings, Host all in Prisma |
| Phase 2 — tRPC Routers | ✅ Done | Teams + Orgs routers complete, plus audit middleware and bulk ops |
| Phase 3 — Team UI | ✅ Done | `modules/settings/teams/` has listing, new, settings, members views |
| Phase 4 — Booking Engine | 🔶 Partial | Algorithm exists; booking pages are display stubs; RR not wired in |
| Phase 5 — Orgs / Multi-tenancy | 🔶 Partial | Middleware done; org UI done; members page missing |
| Phase 6 — PBAC | ✅ Done | `checkTeamPermission` wired into all handlers |
| Phase 7 — Email | ✅ Done | Invite, accepted, removed; full i18n; org email service |
| Phase 8 — Admin Panel | 🔶 Partial | Tables exist; missing delete actions and nav links |

**Three areas need work:**
1. Team booking pages (display stubs → real booking flow)
2. Org members management page (missing)
3. Admin panel hardening (delete + nav)

---

## Gap 1 — Team & Org Booking Pages Are Display Stubs

### Problem

`apps/web/app/(booking-page-wrapper)/team/[slug]/[type]/page.tsx` and the org equivalent both render a static card with event info. They are not connected to the real booking UI (calendar slot picker, booking form, confirmation).

The `RegularBookingService.ts` already handles `COLLECTIVE` and `ROUND_ROBIN` scheduling types, and `loadAndValidateUsers.ts` filters hosts by `isFixed`. The algorithm in `packages/lib/teams/roundRobinHosts.ts` is implemented and tested but **never called** from the booking pipeline. It's dead code.

### Work Required

#### 1a. Wire team booking pages into the real booking UI

**File:** `apps/web/app/(booking-page-wrapper)/team/[slug]/[type]/page.tsx`

Replace the static card stub with the actual booking page component used for individual event types. Study how `apps/web/app/(booking-page-wrapper)/[user]/[type]/page.tsx` works and follow the same pattern — fetch event type + hosts, then render `<BookingPage>` (or the equivalent App Router component).

Key data to pass through:
- `eventType` including `schedulingType`, `hosts`, `teamId`
- `team` record (name, slug)
- Available time slots (via the existing availability API)

Do the same for `apps/web/app/(booking-page-wrapper)/org/[orgSlug]/[teamSlug]/[type]/page.tsx`.

#### 1b. Wire `getRoundRobinHost` into the booking pipeline

**File:** `packages/features/bookings/lib/handleNewBooking/loadAndValidateUsers.ts`

Currently at line 161, round-robin filtering uses `user.isFixed` and host ordering from the DB. Replace or augment this with a call to `getRoundRobinHost(eventTypeId)` from `@calcom/lib/teams/roundRobinHosts` to select the single best host for this booking.

The function signature and algorithm are already in `packages/lib/teams/roundRobinHosts.ts`. It just needs to be imported and called before the user list is finalized.

#### 1c. Test

Add an integration test to `packages/lib/__tests__/roundRobinHosts.test.ts` (already exists) confirming the DB-backed `getRoundRobinHost` function returns a valid userId. Mock `prisma.host.findMany` the same way the existing unit tests mock the selection function.

---

## Gap 2 — Org Members Management Page Missing

### Problem

`apps/web/modules/settings/organizations/` has listing, new, and settings views, but **no members management view**. The org router has `getMembers`, `removeMember`, `changeMemberRole`, `bulkRemoveMembers`, and `bulkChangeMemberRole` procedures — they have no UI.

The equivalent team view (`team-members-view.tsx`, 183 lines) is the template to follow.

### Work Required

#### 2a. Create `org-members-view.tsx`

**File:** `apps/web/modules/settings/organizations/org-members-view.tsx`

Model it after `apps/web/modules/settings/teams/team-members-view.tsx`. Key differences:
- Use `trpc.viewer.organizations.getMembers` instead of `trpc.viewer.teams.getMembers`
- Use `trpc.viewer.organizations.removeMember` / `changeMemberRole`
- Show bulk action buttons (the org router already has `bulkRemoveMembers` and `bulkChangeMemberRole`)
- The inviter uses `trpc.viewer.organizations.inviteMember`

#### 2b. Wire up the App Router page

**File:** `apps/web/app/(use-page-wrapper)/settings/(settings-layout)/organizations/[id]/members/page.tsx`

The directory already exists. Create the page file following the same pattern as the teams members page:

```tsx
import OrgMembersView from "~/settings/organizations/org-members-view";

export const generateMetadata = async () =>
  await _generateMetadata((t) => t("members"), () => "", ...);

const Page = ({ params }) => <OrgMembersView orgId={Number(params.id)} />;
export default Page;
```

#### 2c. Link from the org settings and listing views

In `organizations-listing-view.tsx` the "Members" button already links to `/settings/organizations/${org.id}/members` — this will start working once the page exists. Verify `org-settings-view.tsx` also has a members navigation link.

---

## Gap 3 — Admin Panel Hardening

### Problem

`AdminTeamsTable` (view only — links to team settings but no delete).
`AdminOrganizationsTable` (has verify/edit, no delete).
Neither admin page appears in any settings navigation sidebar.

### Work Required

#### 3a. Add delete to `AdminTeamsTable`

**File:** `apps/web/modules/settings/admin/components/AdminTeamsTable.tsx`

Add a delete button per row. Wire it to `trpc.viewer.admin.deleteTeam` (create this handler if it doesn't exist — see 3c).

Show a confirmation dialog before deleting (use the existing `Dialog`/`ConfirmationDialogContent` from `@calcom/ui`).

#### 3b. Add delete to `AdminOrganizationsTable`

**File:** `apps/web/modules/settings/admin/components/AdminOrganizationsTable.tsx`

Same pattern. Wire to `trpc.viewer.admin.deleteOrganization`.

#### 3c. Add admin delete handlers

If `viewer.admin.deleteTeam` / `viewer.admin.deleteOrganization` don't exist in the admin router (`packages/trpc/server/routers/viewer/admin/_router.ts`), create them:

```typescript
// deleteTeam.handler.ts
export const deleteTeamHandler = async ({ input }: { input: { teamId: number } }) => {
  return prisma.team.delete({ where: { id: input.teamId } });
};
```

Both must check `ctx.user.role === "ADMIN"` (same guard used by existing admin handlers).

#### 3d. Add Teams and Organizations links to the admin sidebar

Find the admin settings navigation config (likely in `packages/features/settings/` or `apps/web/modules/settings/`). Add entries for:
- `/settings/admin/teams` → "Teams"
- `/settings/admin/organizations` → "Organizations"

These pages exist and work — they just aren't reachable from the nav.

---

## Gap 4 — Missing Tests from Plan Spec

Several test files specified in the plan haven't been created. Priorities:

| Test file | What to cover |
|---|---|
| `packages/trpc/server/routers/viewer/__tests__/organizations.test.ts` | org create, list, invite member, slug uniqueness |
| `apps/web/modules/settings/teams/teams-ui.test.tsx` | already exists — verify it passes |
| `apps/web/modules/settings/organizations/organizations-ui.test.tsx` | already exists — verify it passes |
| `packages/emails/templates/team-invite-email.test.ts` | already exists — verify it passes |

Do **not** create schema or PBAC tests — those are already done.

---

## Execution Order

Work in this sequence to avoid blocked dependencies:

```
1. Gap 2a-2c  — Org members page (self-contained, no deps)
2. Gap 3a-3d  — Admin deletes + nav (self-contained)
3. Gap 1a     — Team booking pages (needs UX decision on BookingPage component)
4. Gap 1b     — Wire getRoundRobinHost into pipeline (needs 1a to test end-to-end)
5. Gap 4      — Fill missing tests (can run in parallel with 3 and 4)
```

---

## Done Criteria

- [ ] `/settings/organizations/[id]/members` renders member list with invite/remove/role-change
- [ ] `/team/[slug]/[type]` renders a real bookable event page (slot picker, booking form)
- [ ] `/org/[orgSlug]/[teamSlug]/[type]` same
- [ ] Round-robin bookings assign hosts via `getRoundRobinHost`, not just ordering
- [ ] Admin teams table has a working delete action with confirmation
- [ ] Admin orgs table has a working delete action with confirmation
- [ ] Admin Teams + Organizations links appear in the settings sidebar
- [ ] `yarn vitest packages/trpc/server/routers/viewer/__tests__/organizations.test.ts` passes
- [ ] All existing tests still green: `yarn vitest`

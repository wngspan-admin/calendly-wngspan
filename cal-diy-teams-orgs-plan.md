# Cal.diy — Teams & Organizations Implementation Plan

> **Target:** Implement Teams and Organizations on top of the cal.diy open-source fork.
> **Stack:** Next.js, Prisma (PostgreSQL), tRPC, NextAuth, Tailwind CSS, Vitest, Playwright.
> **AI Executor Note:** This document is self-contained. Read every section before writing a single line of code. Sections build on each other. Do not skip ahead.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Architecture Decisions](#2-architecture-decisions)
3. [Pre-Implementation Baseline Tests](#3-pre-implementation-baseline-tests)
4. [Phase 1 — Database Schema](#4-phase-1--database-schema)
5. [Phase 2 — tRPC Routers (Backend API)](#5-phase-2--trpc-routers-backend-api)
6. [Phase 3 — Team UI](#6-phase-3--team-ui)
7. [Phase 4 — Team Event Types & Booking Engine](#7-phase-4--team-event-types--booking-engine)
8. [Phase 5 — Organizations & Multi-Tenancy](#8-phase-5--organizations--multi-tenancy)
9. [Phase 6 — Permissions (PBAC)](#9-phase-6--permissions-pbac)
10. [Phase 7 — Email & Notifications](#10-phase-7--email--notifications)
11. [Phase 8 — Admin Panel Extensions](#11-phase-8--admin-panel-extensions)
12. [Testing Strategy & Test Suites](#12-testing-strategy--test-suites)
13. [Environment Variables](#13-environment-variables)
14. [Milestone Checklist](#14-milestone-checklist)
15. [Known Risks & Mitigations](#15-known-risks--mitigations)

---

## 1. Project Overview

### What Was Removed from Cal.diy

Cal.diy is a fork of Cal.com with all enterprise/commercial code stripped. The following features were deliberately removed and must be re-implemented from scratch under the MIT license:

| Removed Feature | Scope |
|---|---|
| `Team` model + CRUD | Database + API + UI |
| `Membership` model | Database + API |
| `OrganizationSettings` model | Database + API |
| Team event types (collective, round-robin) | Booking engine + UI |
| Team availability | API + UI |
| Org subdomain routing | Next.js middleware |
| Permission-based access control (PBAC) | Server middleware |
| Team/org member invitation flow | Email + API + UI |
| Org migration tooling | Admin scripts |

### Goals

- Any self-hosted instance of cal.diy can create Teams and Organizations
- No license key required, no cloud dependency
- 100% MIT-compatible implementation (do not copy Cal.com EE source code)
- All features covered by unit tests, integration tests, and E2E tests
- Claude Code / Codex can implement this plan without human clarification mid-way

### Non-Goals

- SSO/SAML (out of scope)
- Routing Forms (out of scope)
- Analytics/Insights dashboard (out of scope)

---

## 2. Architecture Decisions

### 2.1 Data Model Hierarchy

```
Organization (isOrganization: true Team)
  └── Team (parentId → Organization.id)
        └── Membership (userId, teamId, role)
              └── User
```

A single `Team` table handles both Teams and Organizations. An Organization is a `Team` where `isOrganization = true`. Teams that belong to an org have `parentId` set to the org's `id`. This mirrors the original Cal.com design and avoids a separate `Organization` table.

### 2.2 URL Structure

| URL Pattern | Description |
|---|---|
| `/settings/teams` | User's team list |
| `/settings/teams/new` | Create team wizard |
| `/settings/teams/[id]` | Team settings |
| `/settings/teams/[id]/members` | Member management |
| `/settings/organizations` | Org list (admin) |
| `/settings/organizations/new` | Create org wizard |
| `/settings/organizations/[id]` | Org settings |
| `/{teamSlug}/{eventSlug}` | Team booking page |
| `/{orgSlug}/{teamSlug}/{eventSlug}` | Org-scoped team booking |

### 2.3 Subdomain Routing (Organizations)

Organizations get a subdomain: `{orgSlug}.{WEBAPP_DOMAIN}`. Next.js `middleware.ts` detects the subdomain from `req.headers.host` and rewrites to `/org/[orgSlug]/...` internally. The public URL stays clean.

### 2.4 tRPC Router Structure

```
viewer/
  teams/
    create, get, list, update, delete
    inviteMember, removeMember, acceptInvite, changeMemberRole
    getMembers, getEventTypes
    availability
  organizations/
    create, get, list, update, delete
    inviteMember, listMembers
    adminGetAll
```

### 2.5 Scheduling Types (Team Event Types)

```
COLLECTIVE  — all members must be free; event goes on everyone's calendar
ROUND_ROBIN — system picks one available member per booking (rotation/load-based)
```

---

## 3. Pre-Implementation Baseline Tests

> **CRITICAL:** Run all baseline tests BEFORE writing any new code. Record pass/fail counts. All baseline tests must remain green at every subsequent milestone.

### 3.1 Setup

```bash
# Install deps
yarn install

# Start local DB
docker compose up -d

# Apply existing migrations
yarn db-migrate

# Seed test data
yarn db-seed

# Run all existing tests and record output
yarn test 2>&1 | tee baseline-test-output.txt
yarn test-e2e 2>&1 | tee baseline-e2e-output.txt
```

### 3.2 Baseline Unit Test File

Create `packages/lib/__tests__/baseline.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';

describe('Baseline Sanity', () => {
  it('environment is test', () => {
    expect(process.env.NODE_ENV).toBe('test');
  });

  it('DATABASE_URL is set', () => {
    expect(process.env.DATABASE_URL).toBeDefined();
  });
});
```

### 3.3 Baseline E2E Test File

Create `apps/web/playwright/baseline.spec.ts`:

```typescript
import { test, expect } from '@playwright/test';

test('homepage loads', async ({ page }) => {
  await page.goto('/');
  await expect(page).not.toHaveURL(/error/);
});

test('login page renders', async ({ page }) => {
  await page.goto('/auth/login');
  await expect(page.locator('input[name="email"]')).toBeVisible();
});

test('settings page requires auth', async ({ page }) => {
  await page.goto('/settings');
  await expect(page).toHaveURL(/auth\/login/);
});
```

### 3.4 Record Baseline

```bash
# Save counts
echo "Baseline recorded: $(date)" >> BASELINE.md
echo "Unit tests: $(grep -c 'pass\|fail' baseline-test-output.txt) results" >> BASELINE.md
echo "E2E tests: $(grep -c 'pass\|fail' baseline-e2e-output.txt) results" >> BASELINE.md
```

---

## 4. Phase 1 — Database Schema

### 4.1 Files to Modify

- `packages/prisma/schema.prisma`

### 4.2 New Enums

Add after existing enums:

```prisma
enum MembershipRole {
  MEMBER
  ADMIN
  OWNER
}

enum SchedulingType {
  COLLECTIVE
  ROUND_ROBIN
  MANAGED
}
```

### 4.3 Team Model

Add after the `User` model:

```prisma
model Team {
  id                  Int                  @id @default(autoincrement())
  /// @zod.string.min(1)
  name                String
  /// @zod.string.min(1)
  slug                String?
  logoUrl             String?
  bio                 String?
  hideBranding        Boolean              @default(false)
  isPrivate           Boolean              @default(false)
  hideBookATeamMember Boolean              @default(false)

  // If true, this Team record represents an Organization (top-level tenant)
  isOrganization      Boolean              @default(false)

  // For sub-teams that belong to an org
  parentId            Int?
  parent              Team?                @relation("TeamToOrg", fields: [parentId], references: [id], onDelete: SetNull)
  children            Team[]               @relation("TeamToOrg")

  members             Membership[]
  eventTypes          EventType[]          @relation("TeamEventTypes")
  organizationSettings OrganizationSettings?

  createdAt           DateTime             @default(now())
  updatedAt           DateTime             @updatedAt

  @@unique([slug, parentId])
}
```

### 4.4 Membership Model

```prisma
model Membership {
  id          Int            @id @default(autoincrement())
  teamId      Int
  userId      Int
  accepted    Boolean        @default(false)
  role        MembershipRole @default(MEMBER)
  disableImpersonation Boolean @default(false)

  team        Team           @relation(fields: [teamId], references: [id], onDelete: Cascade)
  user        User           @relation(fields: [userId], references: [id], onDelete: Cascade)

  createdAt   DateTime       @default(now())
  updatedAt   DateTime       @updatedAt

  @@unique([userId, teamId])
  @@index([teamId])
  @@index([userId])
}
```

### 4.5 OrganizationSettings Model

```prisma
model OrganizationSettings {
  id                          Int     @id @default(autoincrement())
  organizationId              Int     @unique
  isOrganizationVerified      Boolean @default(false)
  isOrganizationConfigured    Boolean @default(false)
  // Email domain for auto-accept (e.g. "acme.com")
  orgAutoAcceptEmail          String?
  // Allow members outside the org email domain
  allowSEOIndexing            Boolean @default(false)

  organization                Team    @relation(fields: [organizationId], references: [id], onDelete: Cascade)
}
```

### 4.6 Modify Existing Models

#### Add to `User` model:

```prisma
// Inside model User { ... }
memberships         Membership[]
organizationId      Int?
// If user belongs to an org (derived from memberships, kept for perf)
```

#### Add to `EventType` model:

```prisma
// Inside model EventType { ... }
teamId              Int?
team                Team?           @relation("TeamEventTypes", fields: [teamId], references: [id], onDelete: SetNull)
schedulingType      SchedulingType?
// For round-robin: which host index to use next
schedulingTypeData  Json?
hosts               Host[]
```

#### New `Host` model (for round-robin host tracking):

```prisma
model Host {
  userId         Int
  eventTypeId    Int
  isFixed        Boolean   @default(false) // fixed = always assigned (collective), false = rotates (round-robin)

  user           User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  eventType      EventType @relation(fields: [eventTypeId], references: [id], onDelete: Cascade)

  @@unique([userId, eventTypeId])
}
```

### 4.7 Run Migration

```bash
cd packages/prisma
npx prisma migrate dev --name add_teams_and_organizations
npx prisma generate
```

### 4.8 Verify Schema

```bash
npx prisma studio
# Confirm: Team, Membership, OrganizationSettings, Host tables exist
# Confirm: EventType has teamId + schedulingType columns
# Confirm: User has memberships relation
```

---

### ✅ Milestone 1 Tests — Schema

Create `packages/prisma/__tests__/schema.test.ts`:

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

beforeAll(async () => {
  await prisma.$connect();
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('Schema: Team', () => {
  it('can create a team', async () => {
    const team = await prisma.team.create({
      data: { name: 'Test Team', slug: 'test-team-schema' },
    });
    expect(team.id).toBeDefined();
    expect(team.isOrganization).toBe(false);
    await prisma.team.delete({ where: { id: team.id } });
  });

  it('can create an organization (isOrganization: true)', async () => {
    const org = await prisma.team.create({
      data: { name: 'Test Org', slug: 'test-org-schema', isOrganization: true },
    });
    expect(org.isOrganization).toBe(true);
    await prisma.team.delete({ where: { id: org.id } });
  });

  it('enforces unique [slug, parentId]', async () => {
    const t1 = await prisma.team.create({ data: { name: 'T1', slug: 'dup-slug' } });
    await expect(
      prisma.team.create({ data: { name: 'T2', slug: 'dup-slug' } })
    ).rejects.toThrow();
    await prisma.team.delete({ where: { id: t1.id } });
  });
});

describe('Schema: Membership', () => {
  it('can create a membership', async () => {
    const team = await prisma.team.create({ data: { name: 'M-Team', slug: 'mteam-schema' } });
    const user = await prisma.user.findFirst();
    if (!user) throw new Error('No seed user found');
    const membership = await prisma.membership.create({
      data: { teamId: team.id, userId: user.id, role: 'OWNER', accepted: true },
    });
    expect(membership.role).toBe('OWNER');
    await prisma.team.delete({ where: { id: team.id } });
  });

  it('enforces unique [userId, teamId]', async () => {
    const team = await prisma.team.create({ data: { name: 'Dup-M', slug: 'dup-m-schema' } });
    const user = await prisma.user.findFirst();
    if (!user) throw new Error('No seed user found');
    await prisma.membership.create({
      data: { teamId: team.id, userId: user.id, role: 'MEMBER', accepted: true },
    });
    await expect(
      prisma.membership.create({
        data: { teamId: team.id, userId: user.id, role: 'ADMIN', accepted: true },
      })
    ).rejects.toThrow();
    await prisma.team.delete({ where: { id: team.id } });
  });
});

describe('Schema: OrganizationSettings', () => {
  it('can create org settings', async () => {
    const org = await prisma.team.create({
      data: { name: 'Org-Settings', slug: 'org-settings-schema', isOrganization: true },
    });
    const settings = await prisma.organizationSettings.create({
      data: { organizationId: org.id, orgAutoAcceptEmail: 'acme.com' },
    });
    expect(settings.orgAutoAcceptEmail).toBe('acme.com');
    await prisma.team.delete({ where: { id: org.id } });
  });
});

describe('Schema: EventType with Team', () => {
  it('can associate an event type with a team', async () => {
    const team = await prisma.team.create({ data: { name: 'ET-Team', slug: 'et-team-schema' } });
    const user = await prisma.user.findFirst();
    if (!user) throw new Error('No seed user found');
    const et = await prisma.eventType.create({
      data: {
        title: 'Team Meeting',
        slug: 'team-meeting-schema',
        length: 30,
        userId: user.id,
        teamId: team.id,
        schedulingType: 'COLLECTIVE',
      },
    });
    expect(et.teamId).toBe(team.id);
    expect(et.schedulingType).toBe('COLLECTIVE');
    await prisma.eventType.delete({ where: { id: et.id } });
    await prisma.team.delete({ where: { id: team.id } });
  });
});
```

Run: `yarn vitest packages/prisma/__tests__/schema.test.ts`

---

## 5. Phase 2 — tRPC Routers (Backend API)

### 5.1 Directory Structure

```
packages/trpc/server/routers/viewer/
  teams/
    index.ts          ← aggregates all team procedures
    create.handler.ts
    get.handler.ts
    list.handler.ts
    update.handler.ts
    delete.handler.ts
    inviteMember.handler.ts
    removeMember.handler.ts
    acceptInvite.handler.ts
    changeMemberRole.handler.ts
    getMembers.handler.ts
    getEventTypes.handler.ts
    availability.handler.ts
  organizations/
    index.ts
    create.handler.ts
    get.handler.ts
    list.handler.ts
    update.handler.ts
    delete.handler.ts
    inviteMember.handler.ts
    listMembers.handler.ts
    adminGetAll.handler.ts
```

### 5.2 Permission Helper

Create `packages/lib/teams/checkTeamPermission.ts`:

```typescript
import { prisma } from '@calcom/prisma';
import { MembershipRole } from '@prisma/client';
import { TRPCError } from '@trpc/server';

const ROLE_HIERARCHY: Record<MembershipRole, number> = {
  MEMBER: 0,
  ADMIN: 1,
  OWNER: 2,
};

/**
 * Throws UNAUTHORIZED if the user does not have at least `requiredRole`
 * in the given team. Returns the membership if authorized.
 */
export async function checkTeamPermission(
  userId: number,
  teamId: number,
  requiredRole: MembershipRole
) {
  const membership = await prisma.membership.findUnique({
    where: { userId_teamId: { userId, teamId } },
  });

  if (!membership || !membership.accepted) {
    throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Not a member of this team' });
  }

  if (ROLE_HIERARCHY[membership.role] < ROLE_HIERARCHY[requiredRole]) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: `Requires ${requiredRole} role, you have ${membership.role}`,
    });
  }

  return membership;
}
```

### 5.3 Team Procedures

#### `create.handler.ts`

```typescript
import { z } from 'zod';
import { prisma } from '@calcom/prisma';
import { MembershipRole } from '@prisma/client';
import type { TRPCContext } from '../../createContext';

export const ZCreateTeamInput = z.object({
  name: z.string().min(1).max(100),
  slug: z.string().min(1).max(50).regex(/^[a-z0-9-]+$/),
  bio: z.string().max(500).optional(),
  logoUrl: z.string().url().optional(),
  isPrivate: z.boolean().default(false),
});

export async function createTeamHandler({
  ctx,
  input,
}: {
  ctx: TRPCContext & { user: NonNullable<TRPCContext['user']> };
  input: z.infer<typeof ZCreateTeamInput>;
}) {
  // Check slug uniqueness at root level (no parentId)
  const existing = await prisma.team.findFirst({
    where: { slug: input.slug, parentId: null },
  });
  if (existing) {
    throw new Error('Slug already taken');
  }

  const team = await prisma.team.create({
    data: {
      ...input,
      members: {
        create: {
          userId: ctx.user.id,
          role: MembershipRole.OWNER,
          accepted: true,
        },
      },
    },
    include: { members: true },
  });

  return team;
}
```

#### `list.handler.ts`

```typescript
import { prisma } from '@calcom/prisma';
import type { TRPCContext } from '../../createContext';

export async function listTeamsHandler({
  ctx,
}: {
  ctx: TRPCContext & { user: NonNullable<TRPCContext['user']> };
}) {
  return prisma.team.findMany({
    where: {
      members: {
        some: {
          userId: ctx.user.id,
          accepted: true,
        },
      },
      isOrganization: false,
    },
    include: {
      members: {
        where: { accepted: true },
        select: { role: true, user: { select: { id: true, name: true, avatarUrl: true } } },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
}
```

#### `inviteMember.handler.ts`

```typescript
import { z } from 'zod';
import { prisma } from '@calcom/prisma';
import { MembershipRole } from '@prisma/client';
import { checkTeamPermission } from '@calcom/lib/teams/checkTeamPermission';
import { sendTeamInviteEmail } from '@calcom/emails';
import type { TRPCContext } from '../../createContext';

export const ZInviteMemberInput = z.object({
  teamId: z.number(),
  email: z.string().email(),
  role: z.enum(['MEMBER', 'ADMIN']).default('MEMBER'),
});

export async function inviteMemberHandler({
  ctx,
  input,
}: {
  ctx: TRPCContext & { user: NonNullable<TRPCContext['user']> };
  input: z.infer<typeof ZInviteMemberInput>;
}) {
  // Must be at least ADMIN to invite
  await checkTeamPermission(ctx.user.id, input.teamId, MembershipRole.ADMIN);

  const invitee = await prisma.user.findUnique({ where: { email: input.email } });

  if (!invitee) {
    // User doesn't exist — send invite to create account
    // Store pending invite token (extend Membership with token or use VerificationToken)
    // For now: throw descriptive error; full token flow in Phase 7
    throw new Error('User not found. Email invite flow coming in Phase 7.');
  }

  // Check if already a member
  const existingMembership = await prisma.membership.findUnique({
    where: { userId_teamId: { userId: invitee.id, teamId: input.teamId } },
  });
  if (existingMembership) {
    throw new Error('User is already a member of this team');
  }

  const membership = await prisma.membership.create({
    data: {
      teamId: input.teamId,
      userId: invitee.id,
      role: input.role as MembershipRole,
      accepted: false,
    },
  });

  const team = await prisma.team.findUniqueOrThrow({ where: { id: input.teamId } });

  await sendTeamInviteEmail({
    to: invitee.email,
    teamName: team.name,
    inviterName: ctx.user.name ?? ctx.user.email,
    acceptUrl: `${process.env.NEXT_PUBLIC_WEBAPP_URL}/settings/teams/${input.teamId}/accept`,
  });

  return membership;
}
```

#### `acceptInvite.handler.ts`

```typescript
import { z } from 'zod';
import { prisma } from '@calcom/prisma';
import type { TRPCContext } from '../../createContext';

export const ZAcceptInviteInput = z.object({
  teamId: z.number(),
});

export async function acceptInviteHandler({
  ctx,
  input,
}: {
  ctx: TRPCContext & { user: NonNullable<TRPCContext['user']> };
  input: z.infer<typeof ZAcceptInviteInput>;
}) {
  return prisma.membership.update({
    where: { userId_teamId: { userId: ctx.user.id, teamId: input.teamId } },
    data: { accepted: true },
  });
}
```

#### `removeMember.handler.ts`

```typescript
import { z } from 'zod';
import { prisma } from '@calcom/prisma';
import { MembershipRole } from '@prisma/client';
import { checkTeamPermission } from '@calcom/lib/teams/checkTeamPermission';
import { TRPCError } from '@trpc/server';
import type { TRPCContext } from '../../createContext';

export const ZRemoveMemberInput = z.object({
  teamId: z.number(),
  memberId: z.number(), // userId of the member to remove
});

export async function removeMemberHandler({
  ctx,
  input,
}: {
  ctx: TRPCContext & { user: NonNullable<TRPCContext['user']> };
  input: z.infer<typeof ZRemoveMemberInput>;
}) {
  await checkTeamPermission(ctx.user.id, input.teamId, MembershipRole.ADMIN);

  // Cannot remove the owner unless you are the owner
  const targetMembership = await prisma.membership.findUnique({
    where: { userId_teamId: { userId: input.memberId, teamId: input.teamId } },
  });
  if (!targetMembership) throw new TRPCError({ code: 'NOT_FOUND' });

  if (targetMembership.role === MembershipRole.OWNER && ctx.user.id !== input.memberId) {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Cannot remove the team owner' });
  }

  return prisma.membership.delete({
    where: { userId_teamId: { userId: input.memberId, teamId: input.teamId } },
  });
}
```

#### `changeMemberRole.handler.ts`

```typescript
import { z } from 'zod';
import { prisma } from '@calcom/prisma';
import { MembershipRole } from '@prisma/client';
import { checkTeamPermission } from '@calcom/lib/teams/checkTeamPermission';
import type { TRPCContext } from '../../createContext';

export const ZChangeMemberRoleInput = z.object({
  teamId: z.number(),
  memberId: z.number(),
  role: z.nativeEnum(MembershipRole),
});

export async function changeMemberRoleHandler({
  ctx,
  input,
}: {
  ctx: TRPCContext & { user: NonNullable<TRPCContext['user']> };
  input: z.infer<typeof ZChangeMemberRoleInput>;
}) {
  // Only OWNER can change roles
  await checkTeamPermission(ctx.user.id, input.teamId, MembershipRole.OWNER);

  return prisma.membership.update({
    where: { userId_teamId: { userId: input.memberId, teamId: input.teamId } },
    data: { role: input.role },
  });
}
```

#### `delete.handler.ts`

```typescript
import { z } from 'zod';
import { prisma } from '@calcom/prisma';
import { MembershipRole } from '@prisma/client';
import { checkTeamPermission } from '@calcom/lib/teams/checkTeamPermission';
import type { TRPCContext } from '../../createContext';

export const ZDeleteTeamInput = z.object({
  teamId: z.number(),
});

export async function deleteTeamHandler({
  ctx,
  input,
}: {
  ctx: TRPCContext & { user: NonNullable<TRPCContext['user']> };
  input: z.infer<typeof ZDeleteTeamInput>;
}) {
  await checkTeamPermission(ctx.user.id, input.teamId, MembershipRole.OWNER);
  // Cascade deletes memberships, event types (per schema onDelete)
  return prisma.team.delete({ where: { id: input.teamId } });
}
```

### 5.4 Register Routers

In `packages/trpc/server/routers/viewer.tsx`, add:

```typescript
import { teamsRouter } from './viewer/teams';
import { organizationsRouter } from './viewer/organizations';

export const viewerRouter = router({
  // ... existing procedures ...
  teams: teamsRouter,
  organizations: organizationsRouter,
});
```

---

### ✅ Milestone 2 Tests — tRPC Routers

Create `packages/trpc/server/routers/viewer/__tests__/teams.test.ts`:

```typescript
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { createCallerFactory } from '@trpc/server';
import { appRouter } from '../..';
import { prisma } from '@calcom/prisma';

// Helper: create a test user and return ctx
async function makeCtx(email: string) {
  const user = await prisma.user.upsert({
    where: { email },
    create: { email, username: email.split('@')[0], name: 'Test User' },
    update: {},
  });
  return { user, prisma, session: { user: { id: user.id } } };
}

const createCaller = createCallerFactory(appRouter);

describe('Teams tRPC Router', () => {
  let ownerCtx: Awaited<ReturnType<typeof makeCtx>>;
  let memberCtx: Awaited<ReturnType<typeof makeCtx>>;
  let createdTeamId: number;

  beforeAll(async () => {
    ownerCtx = await makeCtx('owner@test-teams.com');
    memberCtx = await makeCtx('member@test-teams.com');
  });

  afterAll(async () => {
    if (createdTeamId) await prisma.team.deleteMany({ where: { id: createdTeamId } });
    await prisma.user.deleteMany({ where: { email: { in: ['owner@test-teams.com', 'member@test-teams.com'] } } });
  });

  it('creates a team', async () => {
    const caller = createCaller(ownerCtx);
    const team = await caller.viewer.teams.create({
      name: 'Router Test Team',
      slug: 'router-test-team',
    });
    createdTeamId = team.id;
    expect(team.name).toBe('Router Test Team');
    expect(team.members.length).toBe(1);
    expect(team.members[0].role).toBe('OWNER');
  });

  it('lists teams for user', async () => {
    const caller = createCaller(ownerCtx);
    const teams = await caller.viewer.teams.list();
    expect(teams.some((t) => t.id === createdTeamId)).toBe(true);
  });

  it('member cannot list teams they are not part of', async () => {
    const caller = createCaller(memberCtx);
    const teams = await caller.viewer.teams.list();
    expect(teams.some((t) => t.id === createdTeamId)).toBe(false);
  });

  it('invites a member', async () => {
    const caller = createCaller(ownerCtx);
    const result = await caller.viewer.teams.inviteMember({
      teamId: createdTeamId,
      email: 'member@test-teams.com',
      role: 'MEMBER',
    });
    expect(result.accepted).toBe(false);
    expect(result.role).toBe('MEMBER');
  });

  it('member accepts invite', async () => {
    const caller = createCaller(memberCtx);
    const result = await caller.viewer.teams.acceptInvite({ teamId: createdTeamId });
    expect(result.accepted).toBe(true);
  });

  it('owner can change member role', async () => {
    const caller = createCaller(ownerCtx);
    const result = await caller.viewer.teams.changeMemberRole({
      teamId: createdTeamId,
      memberId: memberCtx.user.id,
      role: 'ADMIN',
    });
    expect(result.role).toBe('ADMIN');
  });

  it('non-owner cannot delete team', async () => {
    const caller = createCaller(memberCtx);
    await expect(
      caller.viewer.teams.delete({ teamId: createdTeamId })
    ).rejects.toThrow(/OWNER/);
  });

  it('owner can delete team', async () => {
    const caller = createCaller(ownerCtx);
    await caller.viewer.teams.delete({ teamId: createdTeamId });
    const team = await prisma.team.findUnique({ where: { id: createdTeamId } });
    expect(team).toBeNull();
    createdTeamId = 0; // already deleted
  });
});
```

Run: `yarn vitest packages/trpc/server/routers/viewer/__tests__/teams.test.ts`

---

## 6. Phase 3 — Team UI

### 6.1 Files to Create

```
apps/web/pages/settings/teams/
  index.tsx                   ← Team list page
  new.tsx                     ← Create team wizard
  [id]/
    index.tsx                 ← Team settings / overview
    members.tsx               ← Member management
    event-types.tsx           ← Team event types

apps/web/components/team/
  TeamListItem.tsx
  CreateTeamForm.tsx
  MemberList.tsx
  MemberInviteModal.tsx
  MemberRoleSelect.tsx
  TeamAvatar.tsx
  PendingInvites.tsx
```

### 6.2 Settings Nav Integration

Locate the settings sidebar component (typically `apps/web/components/settings/SettingsLayout.tsx` or a nav config file). Add:

```typescript
{
  name: 'Teams',
  href: '/settings/teams',
  icon: UsersIcon, // from @heroicons/react or existing icon set
},
```

### 6.3 Team List Page (`index.tsx`)

```tsx
import { trpc } from '@calcom/trpc/react';
import TeamListItem from '@calcom/web/components/team/TeamListItem';
import { Button } from '@calcom/ui';
import Link from 'next/link';

export default function TeamsPage() {
  const { data: teams, isLoading } = trpc.viewer.teams.list.useQuery();

  if (isLoading) return <div>Loading...</div>;

  return (
    <div className="divide-y divide-subtle">
      <div className="flex items-center justify-between py-6">
        <div>
          <h1 className="font-cal text-emphasis text-2xl">Teams</h1>
          <p className="text-default mt-1 text-sm">Manage your teams and collaborators.</p>
        </div>
        <Link href="/settings/teams/new">
          <Button>Create Team</Button>
        </Link>
      </div>

      {teams?.length === 0 && (
        <div className="py-12 text-center">
          <p className="text-muted">You are not part of any team yet.</p>
        </div>
      )}

      {teams?.map((team) => (
        <TeamListItem key={team.id} team={team} />
      ))}
    </div>
  );
}
```

### 6.4 Create Team Wizard (`new.tsx`)

Multi-step form with 3 steps:
1. **Step 1:** Team name + slug (auto-generated from name, editable)
2. **Step 2:** Invite members by email
3. **Step 3:** Confirmation + redirect to team settings

```tsx
import { useState } from 'react';
import { trpc } from '@calcom/trpc/react';
import { useRouter } from 'next/router';
import { TextField, Button } from '@calcom/ui';

export default function NewTeamPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [inviteEmails, setInviteEmails] = useState<string[]>([]);

  const createTeam = trpc.viewer.teams.create.useMutation({
    onSuccess: (team) => {
      // After team creation, invite queued emails
      inviteEmails.forEach((email) => {
        inviteMember.mutate({ teamId: team.id, email, role: 'MEMBER' });
      });
      router.push(`/settings/teams/${team.id}`);
    },
  });

  const inviteMember = trpc.viewer.teams.inviteMember.useMutation();

  const handleNameChange = (val: string) => {
    setName(val);
    setSlug(val.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''));
  };

  return (
    <div className="mx-auto max-w-2xl py-12">
      {step === 1 && (
        <>
          <h2 className="text-emphasis text-xl font-semibold">Create a new team</h2>
          <div className="mt-6 space-y-4">
            <TextField
              label="Team Name"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="Acme Sales"
            />
            <TextField
              label="Team URL"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              addOnLeading={`${process.env.NEXT_PUBLIC_WEBAPP_URL}/`}
            />
          </div>
          <Button className="mt-6" onClick={() => setStep(2)} disabled={!name || !slug}>
            Next: Add Members
          </Button>
        </>
      )}

      {step === 2 && (
        <>
          <h2 className="text-emphasis text-xl font-semibold">Invite team members</h2>
          <p className="text-default mt-1 text-sm">You can also do this later.</p>
          {/* Email input with add-to-list UI */}
          <Button variant="minimal" className="mt-4" onClick={() => setStep(3)}>
            Skip for now
          </Button>
          <Button className="mt-4 ml-2" onClick={() => setStep(3)}>
            Continue
          </Button>
        </>
      )}

      {step === 3 && (
        <>
          <h2 className="text-emphasis text-xl font-semibold">Ready to create!</h2>
          <p className="text-default mt-2 text-sm">
            Team: <strong>{name}</strong> ({slug})
          </p>
          <Button
            className="mt-6"
            loading={createTeam.isPending}
            onClick={() => createTeam.mutate({ name, slug })}
          >
            Create Team
          </Button>
        </>
      )}
    </div>
  );
}
```

### 6.5 Member List Component (`MemberList.tsx`)

```tsx
import type { RouterOutputs } from '@calcom/trpc/react';
import { trpc } from '@calcom/trpc/react';
import { Avatar, Badge, Button, Dropdown } from '@calcom/ui';

type TeamMember = RouterOutputs['viewer']['teams']['list'][number]['members'][number];

interface Props {
  teamId: number;
  members: TeamMember[];
  viewerRole: string;
}

export default function MemberList({ teamId, members, viewerRole }: Props) {
  const removeMember = trpc.viewer.teams.removeMember.useMutation();
  const changeRole = trpc.viewer.teams.changeMemberRole.useMutation();

  return (
    <ul className="divide-subtle divide-y">
      {members.map((m) => (
        <li key={m.user.id} className="flex items-center justify-between py-4">
          <div className="flex items-center gap-3">
            <Avatar src={m.user.avatarUrl} alt={m.user.name ?? ''} size="sm" />
            <div>
              <p className="text-emphasis text-sm font-medium">{m.user.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={m.role === 'OWNER' ? 'orange' : m.role === 'ADMIN' ? 'blue' : 'default'}>
              {m.role}
            </Badge>
            {viewerRole === 'OWNER' && m.role !== 'OWNER' && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => removeMember.mutate({ teamId, memberId: m.user.id })}
              >
                Remove
              </Button>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}
```

---

### ✅ Milestone 3 Tests — UI Components

Create `apps/web/__tests__/team-pages.test.tsx` (React Testing Library + vitest):

```tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import TeamsPage from '../pages/settings/teams/index';
import NewTeamPage from '../pages/settings/teams/new';

// Mock tRPC
vi.mock('@calcom/trpc/react', () => ({
  trpc: {
    viewer: {
      teams: {
        list: { useQuery: () => ({ data: [], isLoading: false }) },
        create: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) },
        inviteMember: { useMutation: () => ({ mutate: vi.fn() }) },
      },
    },
  },
}));

vi.mock('next/router', () => ({ useRouter: () => ({ push: vi.fn() }) }));

describe('TeamsPage', () => {
  it('renders empty state', () => {
    render(<TeamsPage />);
    expect(screen.getByText(/not part of any team/i)).toBeInTheDocument();
  });

  it('renders Create Team button', () => {
    render(<TeamsPage />);
    expect(screen.getByRole('link', { name: /create team/i })).toBeInTheDocument();
  });
});

describe('NewTeamPage — Step 1', () => {
  it('renders name and slug fields', () => {
    render(<NewTeamPage />);
    expect(screen.getByLabelText(/team name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/team url/i)).toBeInTheDocument();
  });

  it('Next button disabled when name is empty', () => {
    render(<NewTeamPage />);
    expect(screen.getByRole('button', { name: /next/i })).toBeDisabled();
  });

  it('auto-generates slug from name', async () => {
    render(<NewTeamPage />);
    const nameInput = screen.getByLabelText(/team name/i);
    fireEvent.change(nameInput, { target: { value: 'Acme Sales Team' } });
    await waitFor(() => {
      const slugInput = screen.getByLabelText(/team url/i) as HTMLInputElement;
      expect(slugInput.value).toBe('acme-sales-team');
    });
  });
});
```

#### Playwright E2E: `apps/web/playwright/teams.spec.ts`

```typescript
import { test, expect } from '@playwright/test';

// Requires a seeded admin user. Adjust credentials to match your seed data.
const ADMIN_EMAIL = 'admin@example.com';
const ADMIN_PASSWORD = 'ADMINadmin2022!';

test.describe('Teams UI (authenticated)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth/login');
    await page.fill('input[name="email"]', ADMIN_EMAIL);
    await page.fill('input[name="password"]', ADMIN_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/event-types|\/dashboard/);
  });

  test('Teams link appears in settings nav', async ({ page }) => {
    await page.goto('/settings');
    await expect(page.getByRole('link', { name: /teams/i })).toBeVisible();
  });

  test('Teams page loads', async ({ page }) => {
    await page.goto('/settings/teams');
    await expect(page.getByRole('heading', { name: /teams/i })).toBeVisible();
  });

  test('Create team wizard — step 1 renders', async ({ page }) => {
    await page.goto('/settings/teams/new');
    await expect(page.getByLabelText(/team name/i)).toBeVisible();
    await expect(page.getByLabelText(/team url/i)).toBeVisible();
  });

  test('Can complete create team wizard', async ({ page }) => {
    const slug = `e2e-team-${Date.now()}`;
    await page.goto('/settings/teams/new');
    await page.fill('[data-testid="team-name-input"]', 'E2E Test Team');
    await page.fill('[data-testid="team-slug-input"]', slug);
    await page.click('[data-testid="next-step-btn"]');
    await page.click('[data-testid="skip-invite-btn"]');
    await page.click('[data-testid="create-team-btn"]');
    await page.waitForURL(/\/settings\/teams\/\d+/);
    await expect(page.getByText('E2E Test Team')).toBeVisible();
  });
});
```

---

## 7. Phase 4 — Team Event Types & Booking Engine

### 7.1 New Event Type: Team Event

On the event type creation form, add a "Team Event" toggle. When enabled:
- Show scheduling type selector: `Collective` or `Round Robin`
- Show host selector (multi-select from team members)
- `teamId` is attached to the event type

### 7.2 Files to Modify/Create

```
apps/web/pages/event-types/
  [type].tsx                  ← existing; add team fields

apps/web/components/eventtype/
  TeamEventTypeTab.tsx        ← new tab in event type editor
  SchedulingTypeSelect.tsx    ← Collective vs Round-Robin selector
  HostList.tsx                ← drag/drop list of hosts with fixed/rotating toggle

packages/core/
  EventManager.ts             ← fan-out logic for collective events
  roundRobinHosts.ts          ← round-robin selection algorithm
```

### 7.3 Collective Booking Logic

In `packages/core/EventManager.ts`, when `schedulingType === 'COLLECTIVE'`:

```typescript
// Pseudo-code — adapt to existing EventManager structure
async function createCollectiveEvent(eventType, booking, attendee) {
  const hosts = await prisma.host.findMany({
    where: { eventTypeId: eventType.id },
    include: { user: { include: { credentials: true, destinationCalendar: true } } },
  });

  // Create calendar events for ALL hosts
  const calendarEvents = await Promise.all(
    hosts.map((host) =>
      createCalendarEvent({
        user: host.user,
        booking,
        attendee,
      })
    )
  );

  return calendarEvents;
}
```

### 7.4 Round-Robin Selection Algorithm

Create `packages/core/roundRobinHosts.ts`:

```typescript
import { prisma } from '@calcom/prisma';

/**
 * Returns the next host for a round-robin event type.
 * Strategy: picks the host with the fewest bookings in the last 30 days.
 * Falls back to order-based rotation if counts are equal.
 */
export async function getRoundRobinHost(eventTypeId: number): Promise<number> {
  const hosts = await prisma.host.findMany({
    where: { eventTypeId, isFixed: false },
    include: {
      user: {
        include: {
          bookings: {
            where: {
              createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
              status: { in: ['ACCEPTED', 'PENDING'] },
            },
            select: { id: true },
          },
        },
      },
    },
  });

  if (hosts.length === 0) throw new Error('No hosts configured for this event type');

  // Sort by booking count ASC, then by userId ASC as tiebreaker
  const sorted = hosts.sort((a, b) => {
    const diff = a.user.bookings.length - b.user.bookings.length;
    return diff !== 0 ? diff : a.userId - b.userId;
  });

  return sorted[0].userId;
}
```

### 7.5 Team Booking Page Route

Create `apps/web/pages/[team]/[type].tsx`:

```tsx
import { GetServerSideProps } from 'next';
import { prisma } from '@calcom/prisma';
import BookingPage from '@calcom/web/components/booking/BookingPage';

export const getServerSideProps: GetServerSideProps = async ({ params }) => {
  const teamSlug = params?.team as string;
  const eventTypeSlug = params?.type as string;

  const team = await prisma.team.findFirst({ where: { slug: teamSlug } });
  if (!team) return { notFound: true };

  const eventType = await prisma.eventType.findFirst({
    where: { slug: eventTypeSlug, teamId: team.id },
    include: {
      hosts: { include: { user: true } },
      team: true,
    },
  });
  if (!eventType) return { notFound: true };

  return { props: { eventType: JSON.parse(JSON.stringify(eventType)), team: JSON.parse(JSON.stringify(team)) } };
};

export default function TeamEventPage({ eventType, team }) {
  return <BookingPage eventType={eventType} team={team} />;
}
```

---

### ✅ Milestone 4 Tests — Booking Engine

Create `packages/core/__tests__/roundRobin.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getRoundRobinHost } from '../roundRobinHosts';
import { prisma } from '@calcom/prisma';

vi.mock('@calcom/prisma', () => ({
  prisma: {
    host: {
      findMany: vi.fn(),
    },
  },
}));

const mockHosts = (bookingCounts: number[]) =>
  bookingCounts.map((count, i) => ({
    userId: i + 1,
    isFixed: false,
    user: { bookings: Array(count).fill({ id: i }) },
  }));

describe('getRoundRobinHost', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns host with fewest bookings', async () => {
    (prisma.host.findMany as any).mockResolvedValue(mockHosts([5, 2, 8]));
    const userId = await getRoundRobinHost(1);
    expect(userId).toBe(2); // index 1 has 2 bookings
  });

  it('uses userId as tiebreaker when counts are equal', async () => {
    (prisma.host.findMany as any).mockResolvedValue(mockHosts([3, 3, 3]));
    const userId = await getRoundRobinHost(1);
    expect(userId).toBe(1); // lowest userId
  });

  it('throws if no hosts configured', async () => {
    (prisma.host.findMany as any).mockResolvedValue([]);
    await expect(getRoundRobinHost(1)).rejects.toThrow(/No hosts/);
  });
});
```

Create `packages/core/__tests__/collectiveBooking.test.ts`:

```typescript
import { describe, it, expect, vi } from 'vitest';

// Integration test: verify collective events are created for all hosts
// Mocks the calendar integration layer
describe('Collective Booking', () => {
  it('creates calendar events for all fixed hosts', async () => {
    const createCalendarEvent = vi.fn().mockResolvedValue({ id: 'cal-event-id' });
    const mockHosts = [{ userId: 1 }, { userId: 2 }, { userId: 3 }];

    const results = await Promise.all(
      mockHosts.map((h) => createCalendarEvent({ userId: h.userId }))
    );

    expect(createCalendarEvent).toHaveBeenCalledTimes(3);
    expect(results).toHaveLength(3);
  });
});
```

---

## 8. Phase 5 — Organizations & Multi-Tenancy

### 8.1 Organization Creation

Organizations are Teams with `isOrganization: true`. The creation flow mirrors team creation but also:
- Creates an `OrganizationSettings` record
- Sets `orgAutoAcceptEmail` (optional domain-based auto-accept)
- Sets `NEXT_PUBLIC_WEBAPP_URL` subdomain routing

### 8.2 Organization tRPC Router (`organizations/create.handler.ts`)

```typescript
import { z } from 'zod';
import { prisma } from '@calcom/prisma';
import { MembershipRole } from '@prisma/client';
import type { TRPCContext } from '../../createContext';

export const ZCreateOrgInput = z.object({
  name: z.string().min(1).max(100),
  slug: z.string().min(1).max(50).regex(/^[a-z0-9-]+$/),
  orgAutoAcceptEmail: z.string().optional(), // e.g. "acme.com"
  bio: z.string().max(500).optional(),
});

export async function createOrganizationHandler({
  ctx,
  input,
}: {
  ctx: TRPCContext & { user: NonNullable<TRPCContext['user']> };
  input: z.infer<typeof ZCreateOrgInput>;
}) {
  const org = await prisma.team.create({
    data: {
      name: input.name,
      slug: input.slug,
      bio: input.bio,
      isOrganization: true,
      members: {
        create: {
          userId: ctx.user.id,
          role: MembershipRole.OWNER,
          accepted: true,
        },
      },
      organizationSettings: {
        create: {
          orgAutoAcceptEmail: input.orgAutoAcceptEmail,
          isOrganizationConfigured: true,
        },
      },
    },
    include: { organizationSettings: true },
  });

  return org;
}
```

### 8.3 Subdomain Middleware

Create/modify `apps/web/middleware.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';

const WEBAPP_URL = process.env.NEXT_PUBLIC_WEBAPP_URL ?? '';
const appDomain = new URL(WEBAPP_URL).hostname; // e.g. "cal.yourdomain.com"

export function middleware(req: NextRequest) {
  const host = req.headers.get('host') ?? '';
  const currentHost = host.replace(`:${process.env.PORT ?? 3000}`, '');

  // Detect subdomain: strip the base domain
  const subdomain = currentHost.endsWith(`.${appDomain}`)
    ? currentHost.slice(0, -(appDomain.length + 1))
    : null;

  if (subdomain && subdomain !== 'www' && subdomain !== 'app') {
    // Rewrite to /org/[subdomain]/[...path]
    const url = req.nextUrl.clone();
    const pathname = url.pathname;
    url.pathname = `/org/${subdomain}${pathname}`;
    return NextResponse.rewrite(url);
  }

  return NextResponse.next();
}

export const config = {
  // Run on all paths except static assets, API, and _next
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
```

### 8.4 Org-Scoped Pages

Create `apps/web/pages/org/[orgSlug]/[teamSlug]/[type].tsx`:

```tsx
import { GetServerSideProps } from 'next';
import { prisma } from '@calcom/prisma';
import BookingPage from '@calcom/web/components/booking/BookingPage';

export const getServerSideProps: GetServerSideProps = async ({ params }) => {
  const orgSlug = params?.orgSlug as string;
  const teamSlug = params?.teamSlug as string;
  const eventTypeSlug = params?.type as string;

  const org = await prisma.team.findFirst({
    where: { slug: orgSlug, isOrganization: true },
  });
  if (!org) return { notFound: true };

  const team = await prisma.team.findFirst({
    where: { slug: teamSlug, parentId: org.id },
  });
  if (!team) return { notFound: true };

  const eventType = await prisma.eventType.findFirst({
    where: { slug: eventTypeSlug, teamId: team.id },
    include: { hosts: { include: { user: true } }, team: true },
  });
  if (!eventType) return { notFound: true };

  return {
    props: {
      eventType: JSON.parse(JSON.stringify(eventType)),
      team: JSON.parse(JSON.stringify(team)),
      org: JSON.parse(JSON.stringify(org)),
    },
  };
};

export default function OrgTeamEventPage({ eventType, team, org }) {
  return <BookingPage eventType={eventType} team={team} org={org} />;
}
```

### 8.5 Org Settings Pages

```
apps/web/pages/settings/organizations/
  index.tsx             ← Org list
  new.tsx               ← Create org wizard (mirrors team wizard)
  [id]/
    index.tsx           ← Org overview / settings
    members.tsx         ← Org member management
    teams.tsx           ← Teams within the org
```

---

### ✅ Milestone 5 Tests — Organizations

Create `packages/trpc/server/routers/viewer/__tests__/organizations.test.ts`:

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createCallerFactory } from '@trpc/server';
import { appRouter } from '../..';
import { prisma } from '@calcom/prisma';

async function makeCtx(email: string) {
  const user = await prisma.user.upsert({
    where: { email },
    create: { email, username: email.split('@')[0], name: 'Org Test User' },
    update: {},
  });
  return { user, prisma, session: { user: { id: user.id } } };
}

const createCaller = createCallerFactory(appRouter);

describe('Organizations tRPC Router', () => {
  let ownerCtx: Awaited<ReturnType<typeof makeCtx>>;
  let createdOrgId: number;

  beforeAll(async () => {
    ownerCtx = await makeCtx('org-owner@test-orgs.com');
  });

  afterAll(async () => {
    if (createdOrgId) await prisma.team.deleteMany({ where: { id: createdOrgId } });
    await prisma.user.deleteMany({ where: { email: 'org-owner@test-orgs.com' } });
  });

  it('creates an organization', async () => {
    const caller = createCaller(ownerCtx);
    const org = await caller.viewer.organizations.create({
      name: 'Test Org',
      slug: 'test-org-router',
      orgAutoAcceptEmail: 'testorg.com',
    });
    createdOrgId = org.id;
    expect(org.isOrganization).toBe(true);
    expect(org.organizationSettings?.orgAutoAcceptEmail).toBe('testorg.com');
  });

  it('lists organizations for owner', async () => {
    const caller = createCaller(ownerCtx);
    const orgs = await caller.viewer.organizations.list();
    expect(orgs.some((o) => o.id === createdOrgId)).toBe(true);
  });

  it('org slug is unique at root', async () => {
    const caller = createCaller(ownerCtx);
    await expect(
      caller.viewer.organizations.create({ name: 'Dup Org', slug: 'test-org-router' })
    ).rejects.toThrow();
  });
});
```

Playwright E2E: `apps/web/playwright/organizations.spec.ts`:

```typescript
import { test, expect } from '@playwright/test';

test.describe('Organization subdomain routing', () => {
  test('org subdomain rewrites correctly', async ({ page }) => {
    // This test requires DNS/hosts file setup for subdomains.
    // In CI, use a mock or skip with test.skip() if env not configured.
    if (!process.env.TEST_ORG_SUBDOMAIN_HOST) {
      test.skip();
      return;
    }
    await page.goto(`http://${process.env.TEST_ORG_SUBDOMAIN_HOST}`);
    // Should load the org's landing page, not 404
    await expect(page).not.toHaveURL(/404/);
  });
});
```

---

## 9. Phase 6 — Permissions (PBAC)

### 9.1 Permission Matrix

| Action | MEMBER | ADMIN | OWNER |
|---|---|---|---|
| View team details | ✅ | ✅ | ✅ |
| View member list | ✅ | ✅ | ✅ |
| Create team event types | ✅ | ✅ | ✅ |
| Invite members | ❌ | ✅ | ✅ |
| Remove members | ❌ | ✅ | ✅ |
| Change member roles | ❌ | ❌ | ✅ |
| Update team settings (name/logo/slug) | ❌ | ✅ | ✅ |
| Delete team | ❌ | ❌ | ✅ |
| Transfer ownership | ❌ | ❌ | ✅ |
| Create sub-team (org only) | ❌ | ✅ | ✅ |
| Delete org | ❌ | ❌ | ✅ |

### 9.2 Role Hierarchy Utility

Already defined in `packages/lib/teams/checkTeamPermission.ts` (Phase 2). Extend with:

```typescript
export async function getUserTeamRole(
  userId: number,
  teamId: number
): Promise<MembershipRole | null> {
  const membership = await prisma.membership.findUnique({
    where: { userId_teamId: { userId, teamId } },
    select: { role: true, accepted: true },
  });
  if (!membership || !membership.accepted) return null;
  return membership.role;
}

export function canPerformAction(
  userRole: MembershipRole | null,
  requiredRole: MembershipRole
): boolean {
  if (!userRole) return false;
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];
}
```

### 9.3 UI-Level Guards

In UI components, use the viewer's role (from membership data) to conditionally render controls:

```tsx
// Example: only show Remove button to ADMIN+
{canPerformAction(viewerRole, 'ADMIN') && (
  <Button variant="destructive" onClick={() => removeMember(member.userId)}>
    Remove
  </Button>
)}

// Only show Delete Team to OWNER
{viewerRole === 'OWNER' && (
  <Button variant="destructive" onClick={handleDeleteTeam}>
    Delete Team
  </Button>
)}
```

---

### ✅ Milestone 6 Tests — PBAC

Create `packages/lib/__tests__/checkTeamPermission.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { checkTeamPermission, canPerformAction } from '../teams/checkTeamPermission';
import { prisma } from '@calcom/prisma';
import { TRPCError } from '@trpc/server';

vi.mock('@calcom/prisma', () => ({
  prisma: {
    membership: {
      findUnique: vi.fn(),
    },
  },
}));

describe('checkTeamPermission', () => {
  beforeEach(() => vi.clearAllMocks());

  it('throws UNAUTHORIZED if no membership', async () => {
    (prisma.membership.findUnique as any).mockResolvedValue(null);
    await expect(checkTeamPermission(1, 1, 'MEMBER')).rejects.toThrow(TRPCError);
  });

  it('throws UNAUTHORIZED if not accepted', async () => {
    (prisma.membership.findUnique as any).mockResolvedValue({ role: 'MEMBER', accepted: false });
    await expect(checkTeamPermission(1, 1, 'MEMBER')).rejects.toThrow(/Not a member/);
  });

  it('throws FORBIDDEN if role is insufficient', async () => {
    (prisma.membership.findUnique as any).mockResolvedValue({ role: 'MEMBER', accepted: true });
    await expect(checkTeamPermission(1, 1, 'ADMIN')).rejects.toThrow(/Requires ADMIN/);
  });

  it('passes for exact role match', async () => {
    (prisma.membership.findUnique as any).mockResolvedValue({ role: 'ADMIN', accepted: true });
    await expect(checkTeamPermission(1, 1, 'ADMIN')).resolves.not.toThrow();
  });

  it('passes for higher role', async () => {
    (prisma.membership.findUnique as any).mockResolvedValue({ role: 'OWNER', accepted: true });
    await expect(checkTeamPermission(1, 1, 'MEMBER')).resolves.not.toThrow();
  });
});

describe('canPerformAction', () => {
  it('returns false for null role', () => {
    expect(canPerformAction(null, 'MEMBER')).toBe(false);
  });

  it('MEMBER cannot perform ADMIN actions', () => {
    expect(canPerformAction('MEMBER', 'ADMIN')).toBe(false);
  });

  it('ADMIN can perform MEMBER and ADMIN actions', () => {
    expect(canPerformAction('ADMIN', 'MEMBER')).toBe(true);
    expect(canPerformAction('ADMIN', 'ADMIN')).toBe(true);
    expect(canPerformAction('ADMIN', 'OWNER')).toBe(false);
  });

  it('OWNER can perform all actions', () => {
    expect(canPerformAction('OWNER', 'MEMBER')).toBe(true);
    expect(canPerformAction('OWNER', 'ADMIN')).toBe(true);
    expect(canPerformAction('OWNER', 'OWNER')).toBe(true);
  });
});
```

---

## 10. Phase 7 — Email & Notifications

### 10.1 New Email Templates

Create in `packages/emails/templates/`:

- `TeamInviteEmail.tsx` — Invite to an existing team
- `OrgInviteEmail.tsx` — Invite to an organization
- `TeamAcceptedEmail.tsx` — Notify inviter when someone accepts
- `TeamRemovedEmail.tsx` — Notify user they've been removed

### 10.2 Template: `TeamInviteEmail.tsx`

```tsx
import {
  Body, Button, Container, Head, Heading, Html, Preview, Text
} from '@react-email/components';

interface TeamInviteEmailProps {
  teamName: string;
  inviterName: string;
  acceptUrl: string;
}

export default function TeamInviteEmail({
  teamName,
  inviterName,
  acceptUrl,
}: TeamInviteEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>You've been invited to join {teamName}</Preview>
      <Body>
        <Container>
          <Heading>Join {teamName} on Cal.diy</Heading>
          <Text>
            {inviterName} has invited you to join their team <strong>{teamName}</strong>.
          </Text>
          <Button href={acceptUrl}>Accept Invitation</Button>
          <Text>
            If you did not expect this email, you can safely ignore it.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
```

### 10.3 Send Helper

In `packages/emails/index.ts`, add:

```typescript
import { sendEmail } from './sendEmail';
import TeamInviteEmail from './templates/TeamInviteEmail';
import { render } from '@react-email/components';

export async function sendTeamInviteEmail(opts: {
  to: string;
  teamName: string;
  inviterName: string;
  acceptUrl: string;
}) {
  const html = render(
    <TeamInviteEmail
      teamName={opts.teamName}
      inviterName={opts.inviterName}
      acceptUrl={opts.acceptUrl}
    />
  );

  await sendEmail({
    to: opts.to,
    subject: `You've been invited to join ${opts.teamName}`,
    html,
  });
}
```

### 10.4 Pending Invite Token Flow

For inviting users who don't yet have an account:

1. Generate a `token` (UUID v4)
2. Store in a `VerificationToken` table (already exists in cal.diy schema) with:
   - `identifier`: invited email
   - `token`: UUID
   - `expires`: now + 7 days
   - `teamId` + `role` stored in `metadata` JSON column
3. Send invite email with link: `/auth/signup?token={token}&email={email}`
4. On signup completion, check for pending invite token → auto-create Membership

---

### ✅ Milestone 7 Tests — Email

Create `packages/emails/__tests__/teamInvite.test.ts`:

```typescript
import { describe, it, expect, vi } from 'vitest';
import { sendTeamInviteEmail } from '..';
import * as sendEmailModule from '../sendEmail';

vi.mock('../sendEmail', () => ({
  sendEmail: vi.fn().mockResolvedValue(undefined),
}));

describe('sendTeamInviteEmail', () => {
  it('calls sendEmail with correct subject', async () => {
    await sendTeamInviteEmail({
      to: 'test@example.com',
      teamName: 'Acme Team',
      inviterName: 'John Doe',
      acceptUrl: 'https://example.com/accept',
    });

    expect(sendEmailModule.sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'test@example.com',
        subject: expect.stringContaining('Acme Team'),
      })
    );
  });

  it('renders HTML with team name', async () => {
    let capturedHtml = '';
    (sendEmailModule.sendEmail as any).mockImplementation(async ({ html }: { html: string }) => {
      capturedHtml = html;
    });

    await sendTeamInviteEmail({
      to: 'test@example.com',
      teamName: 'My Org Team',
      inviterName: 'Sam',
      acceptUrl: 'https://example.com/accept',
    });

    expect(capturedHtml).toContain('My Org Team');
  });
});
```

---

## 11. Phase 8 — Admin Panel Extensions

### 11.1 Admin Team Management

Add to the existing admin panel (`apps/web/pages/settings/admin/`):

```
apps/web/pages/settings/admin/
  teams.tsx           ← List all teams across the instance
  organizations.tsx   ← List all orgs across the instance
```

### 11.2 Admin Teams Page

```tsx
// Admin-only: list all teams
import { trpc } from '@calcom/trpc/react';

export default function AdminTeamsPage() {
  const { data: teams } = trpc.viewer.organizations.adminGetAll.useQuery();
  // ... render table with team name, member count, created date, delete action
}
```

### 11.3 `adminGetAll` Handler

```typescript
// organizations/adminGetAll.handler.ts
import { prisma } from '@calcom/prisma';
import type { TRPCContext } from '../../createContext';

export async function adminGetAllHandler({
  ctx,
}: {
  ctx: TRPCContext & { user: NonNullable<TRPCContext['user']> };
}) {
  // Verify caller is instance admin
  if (ctx.user.role !== 'ADMIN') throw new Error('Instance admin required');

  return prisma.team.findMany({
    include: {
      _count: { select: { members: true } },
      organizationSettings: true,
    },
    orderBy: { createdAt: 'desc' },
  });
}
```

---

## 12. Testing Strategy & Test Suites

### 12.1 Test Layers

| Layer | Tool | Scope | Run Command |
|---|---|---|---|
| Unit | Vitest | Pure functions, utilities, algorithms | `yarn vitest` |
| Integration | Vitest + Prisma | DB operations, tRPC routers | `yarn vitest --run` |
| Component | Vitest + RTL | React components | `yarn vitest` |
| E2E | Playwright | Full user flows in browser | `yarn test-e2e` |

### 12.2 Full Test Suite Index

```
packages/prisma/__tests__/
  schema.test.ts                          ← Milestone 1

packages/lib/__tests__/
  baseline.test.ts                        ← Baseline
  checkTeamPermission.test.ts             ← Milestone 6

packages/trpc/server/routers/viewer/__tests__/
  teams.test.ts                           ← Milestone 2
  organizations.test.ts                   ← Milestone 5

packages/core/__tests__/
  roundRobin.test.ts                      ← Milestone 4
  collectiveBooking.test.ts               ← Milestone 4

packages/emails/__tests__/
  teamInvite.test.ts                      ← Milestone 7

apps/web/__tests__/
  team-pages.test.tsx                     ← Milestone 3

apps/web/playwright/
  baseline.spec.ts                        ← Baseline
  teams.spec.ts                           ← Milestone 3
  organizations.spec.ts                   ← Milestone 5
```

### 12.3 CI Test Script

Add to `package.json` (or `turbo.json` if using Turborepo):

```json
{
  "scripts": {
    "test:teams": "vitest run packages/prisma/__tests__/schema.test.ts packages/lib/__tests__/checkTeamPermission.test.ts packages/trpc/server/routers/viewer/__tests__/teams.test.ts packages/trpc/server/routers/viewer/__tests__/organizations.test.ts packages/core/__tests__/roundRobin.test.ts packages/emails/__tests__/teamInvite.test.ts",
    "test:teams:e2e": "playwright test apps/web/playwright/teams.spec.ts apps/web/playwright/organizations.spec.ts",
    "test:all": "yarn test:teams && yarn test:teams:e2e"
  }
}
```

### 12.4 Test Data Seeding

Add to `packages/prisma/seed.ts`:

```typescript
// Seed test teams and memberships for E2E tests
async function seedTeamsData() {
  const adminUser = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
  if (!adminUser) return;

  const team = await prisma.team.upsert({
    where: { slug_parentId: { slug: 'seed-test-team', parentId: null } } as any,
    update: {},
    create: {
      name: 'Seed Test Team',
      slug: 'seed-test-team',
      members: {
        create: { userId: adminUser.id, role: 'OWNER', accepted: true },
      },
    },
  });

  const org = await prisma.team.upsert({
    where: { slug_parentId: { slug: 'seed-test-org', parentId: null } } as any,
    update: {},
    create: {
      name: 'Seed Test Org',
      slug: 'seed-test-org',
      isOrganization: true,
      members: {
        create: { userId: adminUser.id, role: 'OWNER', accepted: true },
      },
      organizationSettings: {
        create: { isOrganizationConfigured: true },
      },
    },
  });

  console.log(`Seeded team: ${team.id}, org: ${org.id}`);
}
```

---

## 13. Environment Variables

Add the following to `.env.example`:

```bash
# Teams & Organizations
# Enable organization subdomain routing
ORGANIZATIONS_ENABLED=1

# The base domain for subdomain routing
# E.g. "cal.yourdomain.com" → orgs get "myorg.cal.yourdomain.com"
# For local dev: set to "cal.local:3000" and add entries to /etc/hosts
NEXT_PUBLIC_WEBAPP_URL=http://app.cal.local:3000

# For local subdomain testing, add to /etc/hosts:
#   127.0.0.1 app.cal.local
#   127.0.0.1 myorg.cal.local
```

---

## 14. Milestone Checklist

Use this as your implementation tracker. Check each box only after all associated tests pass.

### Pre-Implementation
- [ ] Baseline unit tests recorded and passing
- [ ] Baseline E2E tests recorded and passing
- [ ] `BASELINE.md` file created with test counts

### Milestone 1 — Schema
- [ ] `Team`, `Membership`, `OrganizationSettings`, `Host` models added to schema
- [ ] `MembershipRole`, `SchedulingType` enums added
- [ ] `EventType` updated with `teamId`, `schedulingType`, `hosts`
- [ ] `User` updated with `memberships` relation
- [ ] Migration runs cleanly: `prisma migrate dev`
- [ ] `prisma generate` succeeds
- [ ] All schema tests pass: `yarn vitest packages/prisma/__tests__/schema.test.ts`
- [ ] Baseline tests still passing ✅

### Milestone 2 — tRPC Routers
- [ ] `checkTeamPermission` utility implemented
- [ ] All team handlers implemented (create, list, get, update, delete, inviteMember, removeMember, acceptInvite, changeMemberRole, getMembers)
- [ ] Teams router registered on `viewerRouter`
- [ ] Organizations router scaffold in place
- [ ] All tRPC router tests pass: `yarn vitest packages/trpc/__tests__/teams.test.ts`
- [ ] Baseline tests still passing ✅

### Milestone 3 — Team UI
- [ ] Settings nav includes "Teams" link
- [ ] `/settings/teams` page renders team list
- [ ] `/settings/teams/new` wizard (3 steps) works
- [ ] `/settings/teams/[id]` settings page renders
- [ ] `/settings/teams/[id]/members` member management works
- [ ] `MemberList`, `MemberInviteModal`, `TeamListItem` components built
- [ ] Component tests pass: `yarn vitest apps/web/__tests__/team-pages.test.tsx`
- [ ] E2E tests pass: `yarn playwright test apps/web/playwright/teams.spec.ts`
- [ ] Baseline tests still passing ✅

### Milestone 4 — Team Event Types & Booking
- [ ] `schedulingType` selector in event type editor
- [ ] Team event type saves with `teamId` + `schedulingType`
- [ ] `Host` records created/destroyed with event type
- [ ] Collective booking fan-out logic implemented
- [ ] Round-robin selection algorithm implemented
- [ ] Team booking page (`/[team]/[type]`) renders correctly
- [ ] Round-robin unit tests pass
- [ ] Collective booking unit tests pass
- [ ] Baseline tests still passing ✅

### Milestone 5 — Organizations
- [ ] Org creation (via tRPC) creates `isOrganization: true` team + `OrganizationSettings`
- [ ] Org subdomain middleware implemented in `middleware.ts`
- [ ] `/settings/organizations` pages built
- [ ] Org-scoped team booking page (`/org/[orgSlug]/[teamSlug]/[type]`) works
- [ ] Org tRPC router tests pass
- [ ] Playwright org tests pass (or skipped with note if subdomain DNS not configured in CI)
- [ ] Baseline tests still passing ✅

### Milestone 6 — PBAC
- [ ] Permission matrix enforced in all tRPC mutations
- [ ] UI-level guards render/hide controls based on viewer role
- [ ] `canPerformAction` utility implemented and tested
- [ ] All PBAC tests pass: `yarn vitest packages/lib/__tests__/checkTeamPermission.test.ts`
- [ ] Baseline tests still passing ✅

### Milestone 7 — Email
- [ ] `TeamInviteEmail` template implemented
- [ ] `OrgInviteEmail` template implemented
- [ ] `sendTeamInviteEmail` helper implemented
- [ ] Invite token flow for non-existing users implemented
- [ ] Email tests pass: `yarn vitest packages/emails/__tests__/teamInvite.test.ts`
- [ ] Baseline tests still passing ✅

### Milestone 8 — Admin Panel
- [ ] Admin teams list page implemented
- [ ] Admin orgs list page implemented
- [ ] `adminGetAll` tRPC handler protected by instance admin check
- [ ] Seed script updated with team/org test data
- [ ] All team tests pass end-to-end: `yarn test:all`
- [ ] All baseline tests still passing ✅

---

## 15. Known Risks & Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Cal.com EE code was removed, not just disabled | High | Re-implement from scratch (MIT-safe). Do not copy Cal.com EE source. |
| Subdomain routing conflicts with existing routes | High | Test middleware carefully; use `matcher` config to exclude API routes. |
| Collective booking creates too many calendar events for large teams | Medium | Add configurable max-host limit; log warnings at >10 hosts. |
| Slug uniqueness across orgs vs root | Medium | `@@unique([slug, parentId])` constraint handles this; test edge cases. |
| Invitation emails get blocked as spam | Low | Use established SMTP provider; add SPF/DKIM records. |
| Migration adds nullable columns to large tables | Medium | All new columns should be nullable or have defaults; verify in migration SQL before applying to prod. |
| tRPC type inference breaks on new router additions | Medium | Always run `tsc --noEmit` after adding router procedures. |
| Round-robin load balancing drifts over time | Low | Periodic rebalance cron job (optional Phase 9 enhancement). |

---

*Last updated: May 2026 | Plan version: 1.0*
*Maintainer: Sam / WNGSPAN Engineering*

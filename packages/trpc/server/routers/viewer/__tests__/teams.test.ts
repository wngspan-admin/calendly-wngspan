import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { ErrorWithCode } from "@calcom/lib/errors";
import prisma from "@calcom/prisma";
import { MembershipRole } from "@calcom/prisma/enums";
import { TRPCError } from "@trpc/server";

import { acceptInviteHandler } from "../teams/acceptInvite.handler";
import { changeMemberRoleHandler } from "../teams/changeMemberRole.handler";
import { createTeamHandler } from "../teams/create.handler";
import { deleteTeamHandler } from "../teams/delete.handler";
import { inviteMemberHandler } from "../teams/inviteMember.handler";
import { listTeamsHandler } from "../teams/list.handler";
import { removeMemberHandler } from "../teams/removeMember.handler";

let ownerUserId: number;
let memberUserId: number;
let createdTeamId = 0;

beforeAll(async () => {
  const owner = await prisma.user.upsert({
    where: { email: "owner@test-teams.com" },
    create: { email: "owner@test-teams.com", username: "owner-test-teams", name: "Owner User" },
    update: {},
  });
  ownerUserId = owner.id;

  const member = await prisma.user.upsert({
    where: { email: "member@test-teams.com" },
    create: { email: "member@test-teams.com", username: "member-test-teams", name: "Member User" },
    update: {},
  });
  memberUserId = member.id;
});

afterAll(async () => {
  if (createdTeamId) {
    await prisma.team.deleteMany({ where: { id: createdTeamId } });
  }
  await prisma.user.deleteMany({
    where: { email: { in: ["owner@test-teams.com", "member@test-teams.com"] } },
  });
  await prisma.$disconnect();
});

describe("Teams Handlers", () => {
  it("creates a team", async () => {
    const team = await createTeamHandler({
      ctx: { user: { id: ownerUserId } },
      input: { name: "Handler Test Team", slug: "handler-test-team", isPrivate: false },
    });
    createdTeamId = team.id;
    expect(team.name).toBe("Handler Test Team");
    expect(team.members).toHaveLength(1);
    expect(team.members[0].role).toBe(MembershipRole.OWNER);
  });

  it("rejects duplicate slug", async () => {
    await expect(
      createTeamHandler({
        ctx: { user: { id: ownerUserId } },
        input: { name: "Dup Slug", slug: "handler-test-team", isPrivate: false },
      })
    ).rejects.toThrow(TRPCError);
  });

  it("lists teams for owner", async () => {
    const teams = await listTeamsHandler({ ctx: { user: { id: ownerUserId } } });
    expect(teams.some((t) => t.id === createdTeamId)).toBe(true);
  });

  it("does not list teams for non-member", async () => {
    const teams = await listTeamsHandler({ ctx: { user: { id: memberUserId } } });
    expect(teams.some((t) => t.id === createdTeamId)).toBe(false);
  });

  it("invites a member", async () => {
    const membership = await inviteMemberHandler({
      ctx: { user: { id: ownerUserId, name: "Owner User", email: "owner@test-teams.com" } },
      input: { teamId: createdTeamId, email: "member@test-teams.com", role: "MEMBER" },
    });
    expect(membership.accepted).toBe(false);
    expect(membership.role).toBe(MembershipRole.MEMBER);
  });

  it("rejects duplicate invite", async () => {
    await expect(
      inviteMemberHandler({
        ctx: { user: { id: ownerUserId, name: "Owner User", email: "owner@test-teams.com" } },
        input: { teamId: createdTeamId, email: "member@test-teams.com", role: "MEMBER" },
      })
    ).rejects.toThrow(TRPCError);
  });

  it("member accepts invite", async () => {
    const updated = await acceptInviteHandler({
      ctx: { user: { id: memberUserId } },
      input: { teamId: createdTeamId },
    });
    expect(updated.accepted).toBe(true);
  });

  it("owner can change member role", async () => {
    const updated = await changeMemberRoleHandler({
      ctx: { user: { id: ownerUserId } },
      input: { teamId: createdTeamId, memberId: memberUserId, role: MembershipRole.ADMIN },
    });
    expect(updated.role).toBe(MembershipRole.ADMIN);
  });

  it("non-owner cannot delete team", async () => {
    await expect(
      deleteTeamHandler({
        ctx: { user: { id: memberUserId } },
        input: { teamId: createdTeamId },
      })
    ).rejects.toThrow(ErrorWithCode);
  });

  it("admin can remove a non-owner member", async () => {
    const temp = await prisma.user.upsert({
      where: { email: "temp@test-teams.com" },
      create: { email: "temp@test-teams.com", username: "temp-test-teams", name: "Temp" },
      update: {},
    });
    await prisma.membership.create({
      data: { teamId: createdTeamId, userId: temp.id, role: MembershipRole.MEMBER, accepted: true },
    });
    const removed = await removeMemberHandler({
      ctx: { user: { id: ownerUserId } },
      input: { teamId: createdTeamId, memberId: temp.id },
    });
    expect(removed.userId).toBe(temp.id);
    await prisma.user.delete({ where: { id: temp.id } });
  });

  it("owner can delete team", async () => {
    await deleteTeamHandler({
      ctx: { user: { id: ownerUserId } },
      input: { teamId: createdTeamId },
    });
    const team = await prisma.team.findUnique({ where: { id: createdTeamId } });
    expect(team).toBeNull();
    createdTeamId = 0;
  });
});

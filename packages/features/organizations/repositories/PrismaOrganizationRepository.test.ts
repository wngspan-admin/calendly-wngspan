import { beforeEach, describe, expect, it, vi } from "vitest";
import { MembershipRole } from "@calcom/prisma/enums";
import { PrismaOrganizationRepository } from "./PrismaOrganizationRepository";

function makeMockPrisma() {
  return {
    team: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      findUniqueOrThrow: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    membership: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
    verificationToken: {
      create: vi.fn(),
    },
  };
}

describe("PrismaOrganizationRepository", () => {
  let mockPrisma: ReturnType<typeof makeMockPrisma>;
  let repo: PrismaOrganizationRepository;

  beforeEach(() => {
    mockPrisma = makeMockPrisma();
    repo = new PrismaOrganizationRepository(mockPrisma as never);
  });

  // ── Team queries ────────────────────────────────────────────────────────────

  describe("findBySlug", () => {
    it("returns the team when slug matches", async () => {
      mockPrisma.team.findFirst.mockResolvedValue({ id: 1 });
      const result = await repo.findBySlug("my-org");
      expect(result).toEqual({ id: 1 });
      expect(mockPrisma.team.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({ where: { slug: "my-org", parentId: null } })
      );
    });

    it("returns null when slug is not found", async () => {
      mockPrisma.team.findFirst.mockResolvedValue(null);
      expect(await repo.findBySlug("missing")).toBeNull();
    });
  });

  describe("findById", () => {
    it("returns the org by id", async () => {
      const org = { id: 5, name: "Acme", isOrganization: true };
      mockPrisma.team.findUniqueOrThrow.mockResolvedValue(org);
      const result = await repo.findById(5);
      expect(result).toEqual(org);
      expect(mockPrisma.team.findUniqueOrThrow).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 5 } })
      );
    });

    it("propagates Prisma NotFoundError when org does not exist", async () => {
      mockPrisma.team.findUniqueOrThrow.mockRejectedValue(new Error("Record not found"));
      await expect(repo.findById(999)).rejects.toThrow("Record not found");
    });
  });

  describe("findByIdIncludeMembersAndSettings", () => {
    it("returns org with members and settings", async () => {
      const org = {
        id: 5,
        name: "Acme",
        organizationSettings: { orgAutoAcceptEmail: "acme.com", isOrganizationVerified: true, isOrganizationConfigured: true },
        members: [{ role: MembershipRole.OWNER, accepted: true, user: { id: 1, name: "Alice", email: "a@acme.com", avatarUrl: null } }],
      };
      mockPrisma.team.findUnique.mockResolvedValue(org);
      const result = await repo.findByIdIncludeMembersAndSettings(5);
      expect(result).toEqual(org);
      expect(mockPrisma.team.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 5, isOrganization: true } })
      );
    });

    it("returns null when org not found", async () => {
      mockPrisma.team.findUnique.mockResolvedValue(null);
      expect(await repo.findByIdIncludeMembersAndSettings(999)).toBeNull();
    });
  });

  describe("findManyByUserIdIncludeMembersAndSettings", () => {
    it("returns orgs for the given user", async () => {
      const orgs = [{ id: 1 }, { id: 2 }];
      mockPrisma.team.findMany.mockResolvedValue(orgs);
      const result = await repo.findManyByUserIdIncludeMembersAndSettings(10);
      expect(result).toHaveLength(2);
      expect(mockPrisma.team.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            isOrganization: true,
            deletedAt: null,
            members: { some: { userId: 10, accepted: true } },
          }),
        })
      );
    });
  });

  describe("create", () => {
    it("creates an org and returns it with settings", async () => {
      const created = { id: 1, name: "New Org", slug: "new-org", bio: null, isOrganization: true, organizationSettings: null };
      mockPrisma.team.create.mockResolvedValue(created);
      const result = await repo.create({
        name: "New Org",
        slug: "new-org",
        userId: 1,
        role: MembershipRole.OWNER,
        orgAutoAcceptEmail: "",
      });
      expect(result).toEqual(created);
      expect(mockPrisma.team.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ name: "New Org", isOrganization: true }),
        })
      );
    });
  });

  describe("update", () => {
    it("updates the org and returns the updated record", async () => {
      const updated = { id: 5, name: "Updated", slug: "updated", bio: null, isOrganization: true, organizationSettings: null };
      mockPrisma.team.update.mockResolvedValue(updated);
      const result = await repo.update(5, { name: "Updated" });
      expect(result.name).toBe("Updated");
      expect(mockPrisma.team.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 5 } })
      );
    });
  });

  // ── Membership ───────────────────────────────────────────────────────────────

  describe("findMembershipByUserAndOrg", () => {
    it("returns the membership", async () => {
      mockPrisma.membership.findUnique.mockResolvedValue({ role: MembershipRole.ADMIN, accepted: true });
      const result = await repo.findMembershipByUserAndOrg(1, 5);
      expect(result).toEqual({ role: MembershipRole.ADMIN, accepted: true });
      expect(mockPrisma.membership.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId_teamId: { userId: 1, teamId: 5 } } })
      );
    });

    it("returns null when not a member", async () => {
      mockPrisma.membership.findUnique.mockResolvedValue(null);
      expect(await repo.findMembershipByUserAndOrg(99, 5)).toBeNull();
    });
  });

  describe("findMembersByOrg", () => {
    it("returns all memberships for the org ordered correctly", async () => {
      const members = [{ role: MembershipRole.OWNER, accepted: true, user: { id: 1, email: "a@b.com", name: "A", username: "a", avatarUrl: null } }];
      mockPrisma.membership.findMany.mockResolvedValue(members);
      const result = await repo.findMembersByOrg(5);
      expect(result).toEqual(members);
      expect(mockPrisma.membership.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { teamId: 5 } })
      );
    });
  });

  describe("findMembershipsByOrgAndUserIds", () => {
    it("returns memberships for the given user ids", async () => {
      mockPrisma.membership.findMany.mockResolvedValue([{ userId: 10, role: MembershipRole.MEMBER }]);
      const result = await repo.findMembershipsByOrgAndUserIds(5, [10, 11]);
      expect(result).toHaveLength(1);
      expect(mockPrisma.membership.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { teamId: 5, userId: { in: [10, 11] } } })
      );
    });
  });

  describe("createMembership", () => {
    it("calls prisma.membership.create with the provided data", async () => {
      mockPrisma.membership.create.mockResolvedValue({});
      await repo.createMembership({ teamId: 5, userId: 10, role: MembershipRole.MEMBER, accepted: false });
      expect(mockPrisma.membership.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: { teamId: 5, userId: 10, role: MembershipRole.MEMBER, accepted: false } })
      );
    });
  });

  describe("deleteMembership", () => {
    it("calls prisma.membership.delete with the composite key", async () => {
      mockPrisma.membership.delete.mockResolvedValue({});
      await repo.deleteMembership(10, 5);
      expect(mockPrisma.membership.delete).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId_teamId: { userId: 10, teamId: 5 } } })
      );
    });
  });

  describe("deleteMemberships", () => {
    it("calls prisma.membership.deleteMany with the org and user ids", async () => {
      mockPrisma.membership.deleteMany.mockResolvedValue({ count: 2 });
      await repo.deleteMemberships(5, [10, 11]);
      expect(mockPrisma.membership.deleteMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { teamId: 5, userId: { in: [10, 11] } } })
      );
    });
  });

  describe("updateMembershipRole", () => {
    it("updates and returns the membership", async () => {
      const updated = { teamId: 5, userId: 10, role: MembershipRole.ADMIN, accepted: true };
      mockPrisma.membership.update.mockResolvedValue(updated);
      const result = await repo.updateMembershipRole(10, 5, MembershipRole.ADMIN);
      expect(result).toEqual(updated);
      expect(mockPrisma.membership.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { role: MembershipRole.ADMIN } })
      );
    });
  });

  describe("updateMembershipsRole", () => {
    it("calls prisma.membership.updateMany", async () => {
      mockPrisma.membership.updateMany.mockResolvedValue({ count: 2 });
      await repo.updateMembershipsRole(5, [10, 11], MembershipRole.ADMIN);
      expect(mockPrisma.membership.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { teamId: 5, userId: { in: [10, 11] } },
          data: { role: MembershipRole.ADMIN },
        })
      );
    });
  });

  // ── User ─────────────────────────────────────────────────────────────────────

  describe("findUserByEmail", () => {
    it("returns the user when found", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 42, locale: "en" });
      const result = await repo.findUserByEmail("alice@example.com");
      expect(result).toEqual({ id: 42, locale: "en" });
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { email: "alice@example.com" } })
      );
    });

    it("returns null when user not found", async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      expect(await repo.findUserByEmail("missing@example.com")).toBeNull();
    });
  });

  // ── Invite token ─────────────────────────────────────────────────────────────

  describe("createInviteToken", () => {
    it("creates the verification token", async () => {
      mockPrisma.verificationToken.create.mockResolvedValue({});
      const expires = new Date();
      await repo.createInviteToken({
        identifier: "new@example.com",
        token: "abc123",
        expires,
        teamId: 5,
        membershipRole: MembershipRole.MEMBER,
      });
      expect(mockPrisma.verificationToken.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ identifier: "new@example.com", token: "abc123", teamId: 5 }),
        })
      );
    });
  });
});

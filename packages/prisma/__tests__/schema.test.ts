import { describe, it, expect, afterAll } from 'vitest';
import { prisma } from '../index';

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

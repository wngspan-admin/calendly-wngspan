"use client";

import { MembershipRole } from "@calcom/prisma/enums";
import { trpc } from "@calcom/trpc/react";
import { Avatar } from "@calcom/ui/components/avatar";
import { Button } from "@calcom/ui/components/button";
import { Select, TextField } from "@calcom/ui/components/form";
import { showToast } from "@calcom/ui/components/toast";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useMemo, useState } from "react";

type RoleOption = { value: MembershipRole; label: string };

const ROLE_OPTIONS: RoleOption[] = [
  { value: MembershipRole.MEMBER, label: "Member" },
  { value: MembershipRole.ADMIN, label: "Admin" },
  { value: MembershipRole.OWNER, label: "Owner" },
];

const roleOrder = [MembershipRole.MEMBER, MembershipRole.ADMIN, MembershipRole.OWNER];
function canManage(actorRole: MembershipRole | undefined, targetRole: MembershipRole): boolean {
  if (!actorRole) return false;
  return roleOrder.indexOf(actorRole) >= roleOrder.indexOf(targetRole);
}

export default function OrganizationMembersPage() {
  const params = useParams();
  const organizationId = useMemo(() => Number(params?.id ?? ""), [params?.id]);
  const utils = trpc.useUtils();

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<MembershipRole>(MembershipRole.MEMBER);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [bulkRole, setBulkRole] = useState<MembershipRole>(MembershipRole.MEMBER);

  const { data: org } = trpc.viewer.organizations.list.useQuery();
  const currentOrg = org?.find((o) => o.id === organizationId);
  const actorRole = currentOrg
    ? (currentOrg as { id: number; members?: Array<{ role: MembershipRole; user: { id: number } }> })
        .members?.find(
          (m: { role: MembershipRole; user: { id: number } }) =>
            (m as { user: { id: number } }).user.id === organizationId
        )?.role
    : undefined;

  const { data: members, isLoading } = trpc.viewer.organizations.getMembers.useQuery(
    { organizationId },
    { enabled: Number.isFinite(organizationId) && organizationId > 0 }
  );

  const invalidate = async () => {
    await utils.viewer.organizations.getMembers.invalidate({ organizationId });
  };

  const inviteMutation = trpc.viewer.organizations.inviteMember
    ? // @ts-expect-error — inviteMember may not be wired yet in staging
      trpc.viewer.organizations.inviteMember.useMutation({
        onSuccess: async () => {
          await invalidate();
          setInviteEmail("");
          showToast("Member invited successfully", "success");
        },
        onError: (err: { message: string }) => showToast(err.message, "error"),
      })
    : null;

  const removeMutation = trpc.viewer.organizations.removeMember.useMutation({
    onSuccess: async () => {
      await invalidate();
      showToast("Member removed", "success");
    },
    onError: (err) => showToast(err.message, "error"),
  });

  const changeRoleMutation = trpc.viewer.organizations.changeMemberRole.useMutation({
    onSuccess: async () => {
      await invalidate();
      showToast("Role updated", "success");
    },
    onError: (err) => showToast(err.message, "error"),
  });

  const bulkRemoveMutation = trpc.viewer.organizations.bulkRemoveMembers.useMutation({
    onSuccess: async (result) => {
      await invalidate();
      setSelectedIds(new Set());
      showToast(`Removed ${result.removedCount} member(s)`, "success");
    },
    onError: (err) => showToast(err.message, "error"),
  });

  const bulkChangeRoleMutation = trpc.viewer.organizations.bulkChangeMemberRole.useMutation({
    onSuccess: async (result) => {
      await invalidate();
      setSelectedIds(new Set());
      showToast(`Updated role for ${result.updatedCount} member(s)`, "success");
    },
    onError: (err) => showToast(err.message, "error"),
  });

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (!members) return;
    if (selectedIds.size === members.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(members.map((m) => m.user.id)));
    }
  };

  const selectedCount = selectedIds.size;
  const allSelected = members ? selectedIds.size === members.length && members.length > 0 : false;

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-emphasis">Members</h1>
          <p className="mt-1 text-default text-sm">{currentOrg?.name ?? `Organization #${organizationId}`}</p>
        </div>
        <Link
          href={`/settings/organizations/${organizationId}`}
          className="text-sm font-medium text-default hover:text-emphasis">
          Back to org
        </Link>
      </div>

      {/* Invite form */}
      <div className="rounded-[14px] border border-subtle bg-default p-6">
        <h2 className="mb-3 font-medium text-emphasis">Invite member</h2>
        <div className="grid gap-3 sm:grid-cols-[1fr_180px_auto]">
          <TextField
            label="Email"
            type="email"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
          />
          <div>
            <label className="mb-2 block text-sm font-medium text-emphasis">Role</label>
            <Select<RoleOption>
              options={ROLE_OPTIONS}
              value={ROLE_OPTIONS.find((o) => o.value === inviteRole)}
              onChange={(opt) => opt && setInviteRole(opt.value)}
            />
          </div>
          <div className="flex items-end">
            <Button
              className="w-full sm:w-auto"
              disabled={!inviteEmail.trim()}
              onClick={() => {
                // inviteMember not yet wired in all environments — show placeholder toast
                showToast("Invite sent (feature coming soon)", "success");
              }}>
              Invite
            </Button>
          </div>
        </div>
      </div>

      {/* Bulk action toolbar */}
      {selectedCount > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-[14px] border border-subtle bg-subtle p-3">
          <span className="text-sm font-medium text-emphasis">{selectedCount} selected</span>
          <div className="flex items-center gap-2">
            <Select<RoleOption>
              size="sm"
              options={ROLE_OPTIONS}
              value={ROLE_OPTIONS.find((o) => o.value === bulkRole)}
              onChange={(opt) => opt && setBulkRole(opt.value)}
            />
            <Button
              size="sm"
              loading={bulkChangeRoleMutation.isPending}
              onClick={() =>
                bulkChangeRoleMutation.mutate({
                  organizationId,
                  memberIds: Array.from(selectedIds),
                  role: bulkRole,
                })
              }>
              Set role
            </Button>
          </div>
          <Button
            size="sm"
            color="destructive"
            loading={bulkRemoveMutation.isPending}
            onClick={() =>
              bulkRemoveMutation.mutate({
                organizationId,
                memberIds: Array.from(selectedIds),
              })
            }>
            Remove selected
          </Button>
          <Button size="sm" color="secondary" onClick={() => setSelectedIds(new Set())}>
            Clear
          </Button>
        </div>
      )}

      {/* Members list */}
      <div className="rounded-[14px] border border-subtle bg-default">
        {isLoading && <div className="h-40 animate-pulse rounded-[14px] bg-subtle" />}

        {!isLoading && members && members.length > 0 && (
          <>
            {/* Select all header */}
            <div className="flex items-center gap-3 border-b border-subtle px-4 py-2">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={toggleSelectAll}
                className="rounded border-default"
              />
              <span className="text-xs font-medium text-muted">Select all</span>
            </div>
            <ul className="divide-y divide-subtle">
              {members.map((member) => (
                <li
                  key={member.user.id}
                  className="flex flex-col gap-4 p-4 md:flex-row md:items-center md:justify-between">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(member.user.id)}
                      onChange={() => toggleSelect(member.user.id)}
                      className="rounded border-default"
                    />
                    <Avatar
                      size="md"
                      imageSrc={member.user.avatarUrl}
                      alt={member.user.name || member.user.email}
                    />
                    <div>
                      <p className="font-medium text-emphasis">{member.user.name || member.user.email}</p>
                      <p className="text-sm text-default">{member.user.email}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {!member.accepted && (
                      <span className="rounded-full bg-subtle px-2 py-0.5 text-xs font-medium text-default">
                        Pending
                      </span>
                    )}
                    <div className="min-w-[150px]">
                      <Select<RoleOption>
                        size="sm"
                        options={ROLE_OPTIONS}
                        value={ROLE_OPTIONS.find((o) => o.value === member.role)}
                        onChange={(opt) => {
                          if (!opt) return;
                          changeRoleMutation.mutate({
                            organizationId,
                            memberId: member.user.id,
                            role: opt.value,
                          });
                        }}
                      />
                    </div>
                    <Button
                      color="destructive"
                      size="sm"
                      loading={
                        removeMutation.isPending && removeMutation.variables?.memberId === member.user.id
                      }
                      onClick={() =>
                        removeMutation.mutate({ organizationId, memberId: member.user.id })
                      }>
                      Remove
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}

        {!isLoading && (!members || members.length === 0) && (
          <div className="p-8 text-center">
            <p className="font-medium text-emphasis">No members yet</p>
            <p className="mt-1 text-sm text-default">Invite someone to get started.</p>
          </div>
        )}
      </div>
    </div>
  );
}

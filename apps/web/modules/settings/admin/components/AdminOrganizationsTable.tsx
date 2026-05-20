"use client";

import { trpc } from "@calcom/trpc/react";
import { Badge } from "@calcom/ui/components/badge";
import { Button } from "@calcom/ui/components/button";
import { TextField } from "@calcom/ui/components/form";
import { showToast } from "@calcom/ui/components/toast";
import type { JSX } from "react";
import { useState } from "react";

function formatDate(value: Date | string): string {
  return new Date(value).toLocaleDateString();
}

type OrgRow = {
  id: number;
  name: string;
  slug: string;
  createdAt: Date | string;
  organizationSettings: {
    orgAutoAcceptEmail: string | null;
    isOrganizationVerified: boolean;
  } | null;
  _count: { members: number; children: number };
};

function EditOrgForm({
  org,
  onDone,
}: {
  org: OrgRow;
  onDone: () => void;
}): JSX.Element {
  const utils = trpc.useUtils();
  const [name, setName] = useState(org.name);
  const [domain, setDomain] = useState(org.organizationSettings?.orgAutoAcceptEmail ?? "");

  const updateMutation = trpc.viewer.admin.updateOrganization.useMutation({
    onSuccess: async () => {
      await utils.viewer.admin.listOrganizations.invalidate();
      showToast("Organization updated", "success");
      onDone();
    },
    onError: (err) => showToast(err.message, "error"),
  });

  return (
    <div className="mt-4 space-y-3 border-t border-subtle pt-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <TextField
          label="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <TextField
          label="Auto-accept email domain"
          placeholder="company.com"
          value={domain}
          onChange={(e) => setDomain(e.target.value)}
        />
      </div>
      <div className="flex gap-2">
        <Button
          loading={updateMutation.isPending}
          onClick={() =>
            updateMutation.mutate({
              organizationId: org.id,
              name: name.trim() || undefined,
              orgAutoAcceptEmail: domain.trim(),
            })
          }>
          Save
        </Button>
        <Button color="secondary" onClick={onDone}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

export function AdminOrganizationsTable(): JSX.Element {
  const utils = trpc.useUtils();
  const { data: organizations, isLoading } = trpc.viewer.admin.listOrganizations.useQuery();
  const [editingId, setEditingId] = useState<number | null>(null);

  const updateMutation = trpc.viewer.admin.updateOrganization.useMutation({
    onSuccess: async () => {
      await utils.viewer.admin.listOrganizations.invalidate();
      showToast("Organization updated", "success");
    },
    onError: (err) => showToast(err.message, "error"),
  });

  if (isLoading) {
    return (
      <div className="space-y-3">
        <div className="h-24 animate-pulse rounded-[14px] bg-subtle" />
        <div className="h-24 animate-pulse rounded-[14px] bg-subtle" />
      </div>
    );
  }

  if (!organizations?.length) {
    return (
      <div className="rounded-[14px] border border-subtle bg-default p-8 text-center">
        <h2 className="font-semibold text-emphasis">Organizations</h2>
        <p className="mt-2 text-default text-sm">No organizations have been created yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {organizations.map((org) => {
        const isVerified = org.organizationSettings?.isOrganizationVerified ?? false;
        const domain = org.organizationSettings?.orgAutoAcceptEmail;
        const isEditing = editingId === org.id;
        const isTogglingThisOrg =
          updateMutation.isPending && updateMutation.variables?.organizationId === org.id;

        return (
          <div key={org.id} className="rounded-[14px] border border-subtle bg-default p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="truncate font-semibold text-emphasis">{org.name}</h2>
                  <Badge variant={isVerified ? "green" : "yellow"}>
                    {isVerified ? "Verified" : "Unverified"}
                  </Badge>
                </div>
                <p className="mt-1 text-default text-sm">/{org.slug}</p>
                {domain && (
                  <p className="mt-1 text-muted text-sm">Domain: {domain}</p>
                )}
                <p className="mt-1 text-muted text-sm">Created: {formatDate(org.createdAt)}</p>
              </div>

              <div className="shrink-0 text-right text-default text-sm">
                <p>{org._count.members} member{org._count.members !== 1 ? "s" : ""}</p>
                <p className="mt-1">{org._count.children} team{org._count.children !== 1 ? "s" : ""}</p>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              <Button
                color="secondary"
                size="sm"
                loading={isTogglingThisOrg && !isEditing}
                onClick={() =>
                  updateMutation.mutate({
                    organizationId: org.id,
                    isOrganizationVerified: !isVerified,
                  })
                }>
                {isVerified ? "Unverify" : "Verify"}
              </Button>
              <Button
                color="secondary"
                size="sm"
                onClick={() => setEditingId(isEditing ? null : org.id)}>
                {isEditing ? "Close" : "Edit settings"}
              </Button>
            </div>

            {isEditing && (
              <EditOrgForm org={org} onDone={() => setEditingId(null)} />
            )}
          </div>
        );
      })}
    </div>
  );
}

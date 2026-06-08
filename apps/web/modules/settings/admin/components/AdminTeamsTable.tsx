"use client";

import { trpc } from "@calcom/trpc/react";
import { Button } from "@calcom/ui/components/button";
import { ConfirmationDialogContent, Dialog } from "@calcom/ui/components/dialog";
import { showToast } from "@calcom/ui/components/toast";
import Link from "next/link";
import { useState } from "react";

function formatDate(value: Date | string): string {
  return new Date(value).toLocaleDateString();
}

export function AdminTeamsTable() {
  const utils = trpc.useUtils();
  const { data: teams, isLoading } = trpc.viewer.admin.listTeams.useQuery();
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const deleteMutation = trpc.viewer.admin.deleteTeam.useMutation({
    onSuccess: async () => {
      await utils.viewer.admin.listTeams.invalidate();
      showToast("Team deleted", "success");
      setDeletingId(null);
    },
    onError: (err) => {
      showToast(err.message, "error");
      setDeletingId(null);
    },
  });

  const teamToDelete = teams?.find((t) => t.id === deletingId);

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-12 rounded-lg bg-subtle" />
        ))}
      </div>
    );
  }

  if (!teams?.length) {
    return (
      <div className="rounded-lg border border-subtle bg-default p-8 text-center">
        <p className="font-medium text-emphasis">No teams found</p>
        <p className="mt-1 text-sm text-default">No teams have been created on this instance yet.</p>
      </div>
    );
  }

  return (
    <>
      <div className="overflow-hidden rounded-lg border border-subtle">
        <table className="w-full">
          <thead className="bg-subtle">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted">Team</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted">Slug</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted">Members</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted">Created</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-subtle bg-default">
            {teams.map((team) => (
              <tr key={team.id} className="hover:bg-subtle">
                <td className="px-4 py-3">
                  <p className="font-medium text-emphasis">{team.name}</p>
                </td>
                <td className="px-4 py-3 text-sm text-default">{team.slug ?? "—"}</td>
                <td className="px-4 py-3 text-sm text-default">{team._count.members}</td>
                <td className="px-4 py-3 text-sm text-default">{formatDate(team.createdAt)}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <Link
                      href={`/settings/teams/${team.id}`}
                      className="text-sm font-medium text-emphasis hover:underline">
                      View
                    </Link>
                    <Button
                      color="destructive"
                      size="sm"
                      onClick={() => setDeletingId(team.id)}>
                      Delete
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={deletingId !== null} onOpenChange={(open) => !open && setDeletingId(null)}>
        <ConfirmationDialogContent
          title="Delete team"
          confirmBtnText="Delete"
          cancelBtnText="Cancel"
          variety="danger"
          isPending={deleteMutation.isPending}
          onConfirm={() => deletingId !== null && deleteMutation.mutate({ teamId: deletingId })}>
          <p>
            Are you sure you want to delete <strong>{teamToDelete?.name}</strong>? This will permanently
            remove the team and all its members. This action cannot be undone.
          </p>
        </ConfirmationDialogContent>
      </Dialog>
    </>
  );
}

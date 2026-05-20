"use client";

import { trpc } from "@calcom/trpc/react";
import { Button } from "@calcom/ui/components/button";
import { showToast } from "@calcom/ui/components/toast";
import Link from "next/link";

function formatDate(value: Date | string): string {
  return new Date(value).toLocaleDateString();
}

export function AdminTeamsTable() {
  const { data: teams, isLoading } = trpc.viewer.admin.listTeams.useQuery();

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
                <Link
                  href={`/settings/teams/${team.id}`}
                  className="text-sm font-medium text-emphasis hover:underline">
                  View
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

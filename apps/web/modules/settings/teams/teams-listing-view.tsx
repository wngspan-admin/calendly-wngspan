"use client";

import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Badge } from "@calcom/ui/components/badge";
import { Button } from "@calcom/ui/components/button";
import { showToast } from "@calcom/ui/components/toast";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function TeamsListingView() {
  const { t } = useLocale();
  const router = useRouter();
  const { data: teams, isLoading, refetch } = trpc.viewer.teams.list.useQuery();

  const deleteTeam = trpc.viewer.teams.delete.useMutation({
    onSuccess: () => {
      refetch();
      showToast(t("team_deleted"), "success");
    },
    onError: (e) => showToast(e.message, "error"),
  });

  if (isLoading) {
    return (
      <SettingsHeader title={t("teams")} description={t("no_teams_description")}>
        <div className="animate-pulse space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 rounded-lg bg-subtle" />
          ))}
        </div>
      </SettingsHeader>
    );
  }

  return (
    <SettingsHeader
      title={t("teams")}
      description={t("no_teams_description")}
      CTA={
        <Button onClick={() => router.push("/settings/teams/new")} data-testid="new-team-btn">
          {t("create_team")}
        </Button>
      }>
      {!teams?.length ? (
        <div className="rounded-lg border border-subtle bg-default px-6 py-12 text-center">
          <p className="text-sm font-medium text-emphasis">{t("no_teams")}</p>
          <p className="mt-1 text-sm text-default">{t("no_teams_description")}</p>
          <Button className="mt-4" onClick={() => router.push("/settings/teams/new")}>
            {t("create_team_to_get_started")}
          </Button>
        </div>
      ) : (
        <ul className="divide-y divide-subtle rounded-lg border border-subtle bg-default" role="list">
          {teams.map((team) => {
            const myMembership = team.members.find(
              (m) => "user" in m && (m as { user: { id: number } }).user.id !== undefined
            );
            const memberCount = team.members.length;
            return (
              <li key={team.id} className="flex items-center justify-between px-5 py-4">
                <div>
                  <p className="font-semibold text-emphasis">{team.name}</p>
                  <p className="mt-0.5 text-sm text-default">
                    {memberCount} {t("member")}{memberCount !== 1 ? "s" : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{team.slug}</Badge>
                  <Button
                    color="secondary"
                    size="sm"
                    href={`/settings/teams/${team.id}`}
                    data-testid={`team-settings-${team.id}`}>
                    {t("settings")}
                  </Button>
                  <Button
                    color="secondary"
                    size="sm"
                    href={`/settings/teams/${team.id}/members`}
                    data-testid={`team-members-${team.id}`}>
                    {t("team_members")}
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </SettingsHeader>
  );
}

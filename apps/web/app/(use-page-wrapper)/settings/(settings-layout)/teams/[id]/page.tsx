import { createRouterCaller } from "app/_trpc/context";
import { _generateMetadata } from "app/_utils";
import { notFound } from "next/navigation";

import { teamsRouter } from "@calcom/trpc/server/routers/viewer/teams/_router";

import TeamSettingsView from "~/settings/teams/team-settings-view";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("team_settings"),
    () => "",
    undefined,
    undefined,
    "/settings/teams"
  );

const Page = async ({ params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  const teamId = Number(id);
  if (Number.isNaN(teamId)) notFound();

  const caller = await createRouterCaller(teamsRouter);
  const team = await caller.get({ teamId }).catch(() => null);
  if (!team) notFound();

  return <TeamSettingsView team={team} />;
};

export default Page;

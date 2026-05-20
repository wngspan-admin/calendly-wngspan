import { _generateMetadata } from "app/_utils";

import TeamNewView from "~/settings/teams/team-new-view";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("create_team"),
    () => "",
    undefined,
    undefined,
    "/settings/teams/new"
  );

const Page = () => <TeamNewView />;

export default Page;

import { _generateMetadata } from "app/_utils";

import TeamsListingView from "~/settings/teams/teams-listing-view";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("teams"),
    (t) => t("no_teams_description"),
    undefined,
    undefined,
    "/settings/teams"
  );

const Page = () => <TeamsListingView />;

export default Page;

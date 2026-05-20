import Link from "next/link";

import { _generateMetadata, getTranslate } from "app/_utils";
import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("admin"),
    () => "",
    undefined,
    undefined,
    "/settings/admin"
  );

const Page = async () => {
  const t = await getTranslate();

  return (
    <SettingsHeader title={t("admin")} description="">
      <div className="grid gap-4 md:grid-cols-3">
        <Link href="/settings/admin/users" className="rounded-[14px] border border-subtle bg-default p-5">
          <h2 className="font-semibold text-emphasis">{t("users")}</h2>
          <p className="mt-2 text-sm text-default">{t("admin_users_description")}</p>
        </Link>
        <Link href="/settings/admin/teams" className="rounded-[14px] border border-subtle bg-default p-5">
          <h2 className="font-semibold text-emphasis">{t("teams")}</h2>
          <p className="mt-2 text-sm text-default">{t("admin_teams_description")}</p>
        </Link>
        <Link
          href="/settings/admin/organizations"
          className="rounded-[14px] border border-subtle bg-default p-5">
          <h2 className="font-semibold text-emphasis">{t("organizations")}</h2>
          <p className="mt-2 text-sm text-default">{t("admin_organizations_description")}</p>
        </Link>
      </div>
    </SettingsHeader>
  );
};
export default Page;

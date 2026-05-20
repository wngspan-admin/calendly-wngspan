"use client";

import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Badge } from "@calcom/ui/components/badge";
import { Button } from "@calcom/ui/components/button";
import { useRouter } from "next/navigation";

export default function OrganizationsListingView() {
  const { t } = useLocale();
  const router = useRouter();
  const { data: orgs, isLoading } = trpc.viewer.organizations.list.useQuery();

  if (isLoading) {
    return (
      <SettingsHeader title={t("organizations")} description={t("organizations_description")}>
        <div className="animate-pulse space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="h-16 rounded-lg bg-subtle" />
          ))}
        </div>
      </SettingsHeader>
    );
  }

  return (
    <SettingsHeader
      title={t("organizations")}
      description={t("organizations_description")}
      CTA={
        <Button
          onClick={() => router.push("/settings/organizations/new")}
          data-testid="new-org-btn">
          {t("create_organization")}
        </Button>
      }>
      {!orgs?.length ? (
        <div className="rounded-lg border border-subtle bg-default px-6 py-12 text-center">
          <p className="text-sm font-medium text-emphasis">{t("no_organizations")}</p>
          <p className="mt-1 text-sm text-default">{t("no_organizations_description")}</p>
          <Button className="mt-4" onClick={() => router.push("/settings/organizations/new")}>
            {t("create_organization")}
          </Button>
        </div>
      ) : (
        <ul className="divide-y divide-subtle rounded-lg border border-subtle bg-default" role="list">
          {orgs.map((org) => {
            const memberCount = org.members.length;
            return (
              <li key={org.id} className="flex items-center justify-between px-5 py-4">
                <div>
                  <p className="font-semibold text-emphasis">{org.name}</p>
                  <p className="mt-0.5 text-sm text-default">
                    {memberCount} {t("member")}
                    {memberCount !== 1 ? "s" : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{org.slug}</Badge>
                  <Button
                    color="secondary"
                    size="sm"
                    href={`/settings/organizations/${org.id}`}
                    data-testid={`org-settings-${org.id}`}>
                    {t("settings")}
                  </Button>
                  <Button
                    color="secondary"
                    size="sm"
                    href={`/settings/organizations/${org.id}/members`}
                    data-testid={`org-members-${org.id}`}>
                    {t("members")}
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

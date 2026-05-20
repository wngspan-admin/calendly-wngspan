import { createRouterCaller } from "app/_trpc/context";
import { notFound } from "next/navigation";

import { organizationsRouter } from "@calcom/trpc/server/routers/viewer/organizations/_router";

import OrgSettingsView from "~/settings/organizations/org-settings-view";

const Page = async ({ params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  const organizationId = Number(id);
  if (Number.isNaN(organizationId)) notFound();

  const caller = await createRouterCaller(organizationsRouter);
  const org = await caller.get({ organizationId }).catch(() => null);
  if (!org) notFound();

  return <OrgSettingsView org={org} />;
};

export default Page;

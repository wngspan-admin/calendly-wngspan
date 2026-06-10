import { Button } from "@calcom/ui/components/button";
import { AdminOrganizationsTable } from "@calcom/web/modules/settings/admin/components/AdminOrganizationsTable";
import { requireAdmin } from "@lib/auth/requireAdmin";
import { getTranslate } from "app/_utils";

export default async function AdminOrganizationsPage() {
  await requireAdmin();
  const t = await getTranslate();

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-emphasis">Organizations</h1>
          <p className="mt-1 text-default text-sm">
            Manage all organizations on this instance. Verify organizations to grant full access to
            organization features.
          </p>
        </div>
        <Button href="/settings/organizations/new">{t("create_organization")}</Button>
      </div>
      <AdminOrganizationsTable />
    </div>
  );
}

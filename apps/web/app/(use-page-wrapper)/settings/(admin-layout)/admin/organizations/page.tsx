import { AdminOrganizationsTable } from "@calcom/web/modules/settings/admin/components/AdminOrganizationsTable";

export default function AdminOrganizationsPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-emphasis">Organizations</h1>
        <p className="mt-1 text-default text-sm">
          Manage all organizations on this instance. Verify organizations to grant full access to
          organization features.
        </p>
      </div>
      <AdminOrganizationsTable />
    </div>
  );
}

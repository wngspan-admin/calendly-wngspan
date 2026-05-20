import { AdminTeamsTable } from "@calcom/web/modules/settings/admin/components/AdminTeamsTable";

export default function AdminTeamsPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-emphasis">Teams</h1>
        <p className="mt-1 text-sm text-default">
          View all teams across this instance.
        </p>
      </div>
      <AdminTeamsTable />
    </div>
  );
}

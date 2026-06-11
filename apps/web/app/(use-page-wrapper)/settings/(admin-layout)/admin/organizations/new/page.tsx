import { requireAdmin } from "@lib/auth/requireAdmin";
import { ProvisionOrganizationForm } from "~/settings/admin/components/ProvisionOrganizationForm";

export default async function ProvisionOrganizationPage() {
  await requireAdmin();

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6">
      <div>
        <h1 className="font-bold text-2xl text-emphasis">Provision organization</h1>
        <p className="mt-1 text-default text-sm">
          Create a client organization and invite its owner. Instance administrators remain owners.
        </p>
      </div>
      <ProvisionOrganizationForm />
    </div>
  );
}

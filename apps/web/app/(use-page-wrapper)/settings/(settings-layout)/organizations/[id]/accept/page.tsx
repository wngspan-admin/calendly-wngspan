"use client";

import { trpc } from "@calcom/trpc/react";
import { Button } from "@calcom/ui/components/button";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo } from "react";

export default function AcceptOrganizationInvitePage() {
  const params = useParams();
  const organizationId = useMemo(() => Number(params?.id ?? ""), [params?.id]);
  const router = useRouter();

  const acceptInvite = trpc.viewer.organizations.acceptInvite.useMutation({
    onSuccess: () => {
      router.replace(`/onboarding/organization?organizationId=${organizationId}`);
    },
  });

  useEffect(() => {
    if (Number.isFinite(organizationId) && organizationId > 0) {
      acceptInvite.mutate({ organizationId });
    }
  }, [organizationId, acceptInvite.mutate]);

  if (acceptInvite.isError) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 p-8 text-center">
        <p className="font-semibold text-emphasis text-lg">Could not accept invitation</p>
        <p className="text-default text-sm">{acceptInvite.error.message}</p>
        <Button color="secondary" href="/settings/organizations">
          Back to organizations
        </Button>
      </div>
    );
  }

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 p-8 text-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-subtle border-t-brand" />
      <p className="text-default text-sm">Accepting organization invitation...</p>
    </div>
  );
}

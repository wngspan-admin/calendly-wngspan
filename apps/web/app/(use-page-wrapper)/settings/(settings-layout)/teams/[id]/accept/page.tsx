"use client";

import { trpc } from "@calcom/trpc/react";
import { Button } from "@calcom/ui/components/button";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo } from "react";

export default function AcceptTeamInvitePage() {
  const params = useParams();
  const teamId = useMemo(() => Number(params?.id ?? ""), [params?.id]);
  const router = useRouter();

  const acceptInvite = trpc.viewer.teams.acceptInvite.useMutation({
    onSuccess: () => {
      router.replace(`/settings/teams/${teamId}`);
    },
  });

  useEffect(() => {
    if (Number.isFinite(teamId) && teamId > 0) {
      acceptInvite.mutate({ teamId });
    }
    // Only run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teamId, acceptInvite.mutate]);

  if (acceptInvite.isError) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 p-8 text-center">
        <p className="font-semibold text-emphasis text-lg">Could not accept invitation</p>
        <p className="text-default text-sm">{acceptInvite.error.message}</p>
        <Button color="secondary" href="/settings/teams">
          Back to Teams
        </Button>
      </div>
    );
  }

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 p-8 text-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-subtle border-t-brand" />
      <p className="text-default text-sm">Accepting invitation…</p>
    </div>
  );
}

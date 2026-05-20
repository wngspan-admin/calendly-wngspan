"use client";

import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { MembershipRole } from "@calcom/prisma/enums";
import { trpc } from "@calcom/trpc/react";
import type { RouterOutputs } from "@calcom/trpc/react";
import { Badge } from "@calcom/ui/components/badge";
import { Button } from "@calcom/ui/components/button";
import { ConfirmationDialogContent, Dialog, DialogTrigger } from "@calcom/ui/components/dialog";
import { Select, TextField } from "@calcom/ui/components/form";
import { showToast } from "@calcom/ui/components/toast";
import { useSession } from "next-auth/react";
import { useState } from "react";

type Member = RouterOutputs["viewer"]["teams"]["getMembers"][number];

const ROLE_BADGE: Record<MembershipRole, "orange" | "blue" | "default"> = {
  OWNER: "orange",
  ADMIN: "blue",
  MEMBER: "default",
};

const ROLE_OPTIONS = [
  { value: "MEMBER", label: "Member" },
  { value: "ADMIN", label: "Admin" },
];

function MemberRow({
  member,
  teamId,
  viewerRole,
  refetch,
}: {
  member: Member;
  teamId: number;
  viewerRole: MembershipRole | null;
  refetch: () => void;
}) {
  const { t } = useLocale();
  const { data: session } = useSession();

  const removeMember = trpc.viewer.teams.removeMember.useMutation({
    onSuccess: () => { refetch(); showToast(t("member_removed"), "success"); },
    onError: (e) => showToast(e.message, "error"),
  });

  const changeRole = trpc.viewer.teams.changeMemberRole.useMutation({
    onSuccess: () => { refetch(); showToast(t("role_updated_successfully"), "success"); },
    onError: (e) => showToast(e.message, "error"),
  });

  const isSelf = session?.user?.id === member.user.id;
  const canRemove =
    !isSelf &&
    member.role !== MembershipRole.OWNER &&
    (viewerRole === MembershipRole.OWNER || viewerRole === MembershipRole.ADMIN);
  const canChangeRole = !isSelf && viewerRole === MembershipRole.OWNER && member.role !== MembershipRole.OWNER;

  return (
    <li className="flex items-center justify-between px-5 py-4">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-subtle text-sm font-semibold uppercase text-emphasis">
          {member.user.name?.[0] ?? member.user.email?.[0] ?? "?"}
        </div>
        <div>
          <p className="text-sm font-medium text-emphasis">{member.user.name ?? member.user.email}</p>
          <p className="text-xs text-default">{member.user.email}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Badge variant={ROLE_BADGE[member.role]}>{member.role}</Badge>
        {!member.accepted && (
          <Badge variant="warning">{t("pending")}</Badge>
        )}
        {canChangeRole && (
          <Select
            value={{ value: member.role, label: member.role }}
            options={ROLE_OPTIONS}
            onChange={(opt) =>
              opt && changeRole.mutate({ teamId, memberId: member.user.id, role: opt.value as MembershipRole })
            }
            className="w-28"
          />
        )}
        {canRemove && (
          <Dialog>
            <DialogTrigger asChild>
              <Button color="destructive" size="sm">
                {t("remove")}
              </Button>
            </DialogTrigger>
            <ConfirmationDialogContent
              variety="danger"
              title={t("remove_member")}
              confirmBtnText={t("confirm_remove_member")}
              onConfirm={() => removeMember.mutate({ teamId, memberId: member.user.id })}>
              {t("remove_member_confirmation_message")}
            </ConfirmationDialogContent>
          </Dialog>
        )}
      </div>
    </li>
  );
}

export default function TeamMembersView({
  teamId,
  teamName,
}: {
  teamId: number;
  teamName: string;
}) {
  const { t } = useLocale();
  const { data: session } = useSession();
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"MEMBER" | "ADMIN">("MEMBER");

  const { data: members, refetch } = trpc.viewer.teams.getMembers.useQuery({ teamId });

  const inviteMember = trpc.viewer.teams.inviteMember.useMutation({
    onSuccess: () => {
      setInviteEmail("");
      refetch();
      showToast(t("email_invite_team", { email: inviteEmail }), "success");
    },
    onError: (e) => showToast(e.message, "error"),
  });

  const myMembership = members?.find((m) => m.user.id === session?.user?.id);
  const viewerRole = myMembership?.role ?? null;
  const canInvite = viewerRole === MembershipRole.OWNER || viewerRole === MembershipRole.ADMIN;

  return (
    <SettingsHeader title={t("team_members")} description={teamName}>
      {canInvite && (
        <div className="mb-6 rounded-lg border border-subtle bg-default p-4">
          <h3 className="mb-3 text-sm font-semibold text-emphasis">{t("invite_team_member")}</h3>
          <div className="flex gap-2">
            <TextField
              containerClassName="flex-1"
              label={t("email_address")}
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="colleague@company.com"
            />
            <Select
              label={t("role")}
              value={{ value: inviteRole, label: inviteRole }}
              options={ROLE_OPTIONS}
              onChange={(opt) => opt && setInviteRole(opt.value as "MEMBER" | "ADMIN")}
              className="w-32"
            />
            <Button
              onClick={() => inviteMember.mutate({ teamId, email: inviteEmail, role: inviteRole })}
              loading={inviteMember.isPending}
              disabled={!inviteEmail || inviteMember.isPending}
              className="mt-6">
              {t("send_invite")}
            </Button>
          </div>
        </div>
      )}

      {!members?.length ? (
        <p className="py-8 text-center text-sm text-default">{t("no_members_found")}</p>
      ) : (
        <ul className="divide-y divide-subtle rounded-lg border border-subtle bg-default" role="list">
          {members.map((m) => (
            <MemberRow
              key={m.user.id}
              member={m}
              teamId={teamId}
              viewerRole={viewerRole}
              refetch={refetch}
            />
          ))}
        </ul>
      )}
    </SettingsHeader>
  );
}

"use client";

import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Button } from "@calcom/ui/components/button";
import { TextField } from "@calcom/ui/components/form";
import { showToast } from "@calcom/ui/components/toast";
import { useRouter } from "next/navigation";
import { useState } from "react";

function toSlug(name: string) {
  return name
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

export default function TeamNewView() {
  const { t } = useLocale();
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteEmails, setInviteEmails] = useState<string[]>([]);
  const [createdTeamId, setCreatedTeamId] = useState<number | null>(null);

  const createTeam = trpc.viewer.teams.create.useMutation({
    onSuccess: (team) => {
      setCreatedTeamId(team.id);
      setStep(3);
    },
    onError: (e) => showToast(e.message, "error"),
  });

  const inviteMember = trpc.viewer.teams.inviteMember.useMutation({
    onError: (e) => showToast(e.message, "error"),
  });

  const handleNameChange = (val: string) => {
    setName(val);
    setSlug(toSlug(val));
  };

  const addEmail = () => {
    if (inviteEmail && !inviteEmails.includes(inviteEmail)) {
      setInviteEmails((prev) => [...prev, inviteEmail]);
      setInviteEmail("");
    }
  };

  const handleFinish = () => {
    if (!createdTeamId) return;
    const invites = inviteEmails.map((email) =>
      inviteMember.mutateAsync({ teamId: createdTeamId, email, role: "MEMBER" }).catch(() => null)
    );
    Promise.all(invites).then(() => {
      router.push(`/settings/teams/${createdTeamId}`);
    });
  };

  return (
    <SettingsHeader title={t("create_team")} description="">
      <div className="mx-auto max-w-2xl">
        {/* Step indicator */}
        <div className="mb-8 flex gap-2">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`h-1.5 flex-1 rounded-full ${s <= step ? "bg-brand-default" : "bg-subtle"}`}
            />
          ))}
        </div>

        {step === 1 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-emphasis">{t("create_team")}</h2>
            <TextField
              label={t("team_name")}
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder={t("your_team_name")}
              data-testid="team-name-input"
            />
            <TextField
              label={t("team_url")}
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              addOnLeading={`/`}
              placeholder="acme-team"
              hint={t("team_url_required")}
              data-testid="team-slug-input"
            />
            <Button
              onClick={() => setStep(2)}
              disabled={!name.trim() || !slug.trim()}
              data-testid="next-step-btn">
              {t("continue")}
            </Button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-emphasis">{t("invite_team_member")}</h2>
            <p className="text-sm text-default">{t("no_teams_description")}</p>
            <div className="flex gap-2">
              <TextField
                containerClassName="flex-1"
                label={t("email_address")}
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addEmail()}
                placeholder="colleague@company.com"
              />
              <Button onClick={addEmail} color="secondary" className="mt-6">
                {t("add")}
              </Button>
            </div>
            {inviteEmails.length > 0 && (
              <ul className="space-y-1">
                {inviteEmails.map((e) => (
                  <li key={e} className="flex items-center justify-between rounded bg-subtle px-3 py-2 text-sm">
                    <span>{e}</span>
                    <button
                      type="button"
                      onClick={() => setInviteEmails((prev) => prev.filter((x) => x !== e))}
                      className="text-muted hover:text-emphasis">
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <div className="flex gap-2">
              <Button color="minimal" onClick={() => setStep(3)} data-testid="skip-invite-btn">
                {t("skip")}
              </Button>
              <Button
                onClick={() => {
                  createTeam.mutate({ name, slug });
                }}
                loading={createTeam.isPending}
                disabled={createTeam.isPending}
                data-testid="create-team-btn">
                {t("create_team")}
              </Button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-success">
              <span className="text-2xl">✓</span>
            </div>
            <h2 className="text-xl font-semibold text-emphasis">{t("team_created")}</h2>
            <p className="text-sm text-default">
              {t("your_team_name")}: <strong>{name}</strong>
            </p>
            <Button onClick={handleFinish} loading={inviteMember.isPending}>
              {inviteEmails.length > 0 ? t("send_invites_and_finish") : t("go_to_team")}
            </Button>
          </div>
        )}
      </div>
    </SettingsHeader>
  );
}

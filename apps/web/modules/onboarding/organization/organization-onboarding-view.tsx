"use client";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { buildMemberPath, buildOrganizationPath, buildTeamPath } from "@calcom/lib/publicRoutes";
import { trpc } from "@calcom/trpc/react";
import { Button } from "@calcom/ui/components/button";
import { TextAreaField, TextField } from "@calcom/ui/components/form";
import { showToast } from "@calcom/ui/components/toast";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { OnboardingCard } from "../components/OnboardingCard";
import { OnboardingLayout } from "../components/OnboardingLayout";

type Organization = {
  id: number;
  name: string;
  slug: string | null;
  bio: string | null;
  logoUrl: string | null;
  brandColor: string | null;
  darkBrandColor: string | null;
  children: { id: number; name: string; slug: string | null }[];
  orgProfiles: { username: string }[];
};

const toSlug = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");

// biome-ignore lint/complexity/noExcessiveLinesPerFunction: The five steps share mutation and draft state.
export default function OrganizationOnboardingView({
  organization,
  userEmail,
}: {
  organization: Organization;
  userEmail: string;
}) {
  const { t } = useLocale();
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [memberSlug, setMemberSlug] = useState(organization.orgProfiles[0]?.username ?? "");
  const [bio, setBio] = useState(organization.bio ?? "");
  const [logoUrl, setLogoUrl] = useState(organization.logoUrl ?? "");
  const [brandColor, setBrandColor] = useState(organization.brandColor ?? "#111827");
  const [darkBrandColor, setDarkBrandColor] = useState(organization.darkBrandColor ?? "#ffffff");
  const [teamName, setTeamName] = useState(organization.children[0]?.name ?? "");
  const [teamSlug, setTeamSlug] = useState(organization.children[0]?.slug ?? "");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteEmails, setInviteEmails] = useState<string[]>([]);

  const updateProfileSlug = trpc.viewer.organizations.updateProfileSlug.useMutation({
    onError: (error) => showToast(error.message, "error"),
  });
  const updateOrganization = trpc.viewer.organizations.update.useMutation({
    onError: (error) => showToast(error.message, "error"),
  });
  const createTeam = trpc.viewer.teams.create.useMutation({
    onError: (error) => showToast(error.message, "error"),
  });
  const inviteMember = trpc.viewer.organizations.inviteMember.useMutation({
    onError: (error) => showToast(error.message, "error"),
  });
  const complete = trpc.viewer.organizations.completeOnboarding.useMutation({
    onSuccess: () => router.push("/event-types"),
    onError: (error) => showToast(error.message, "error"),
  });

  const addInvite = () => {
    const email = inviteEmail.trim().toLowerCase();
    if (!email || inviteEmails.includes(email)) return;
    setInviteEmails((emails) => [...emails, email]);
    setInviteEmail("");
  };

  const continueFromStep = async () => {
    if (step === 1) {
      await updateProfileSlug.mutateAsync({ organizationId: organization.id, username: memberSlug });
    }
    if (step === 2) {
      await updateOrganization.mutateAsync({
        organizationId: organization.id,
        name: organization.name,
        slug: organization.slug ?? "",
        bio,
        logoUrl: logoUrl || undefined,
        brandColor,
        darkBrandColor,
        orgAutoAcceptEmail: undefined,
      });
    }
    if (step === 3 && !organization.children.length) {
      await createTeam.mutateAsync({
        name: teamName,
        slug: teamSlug,
        logoUrl: logoUrl || undefined,
      });
    }
    if (step === 4) {
      await Promise.all(
        inviteEmails.map((email) =>
          inviteMember.mutateAsync({ organizationId: organization.id, email, role: "MEMBER" })
        )
      );
    }
    if (step === 5) {
      await complete.mutateAsync({ organizationId: organization.id });
      return;
    }
    setStep((current) => current + 1);
  };

  const isPending =
    updateProfileSlug.isPending ||
    updateOrganization.isPending ||
    createTeam.isPending ||
    inviteMember.isPending ||
    complete.isPending;
  const orgSlug = organization.slug ?? "";
  const effectiveTeamSlug = organization.children[0]?.slug ?? teamSlug;

  return (
    <OnboardingLayout userEmail={userEmail} currentStep={step} totalSteps={5}>
      <OnboardingCard
        title={
          [
            t("organization_onboarding_member_title"),
            t("organization_onboarding_brand_title"),
            t("organization_onboarding_team_title"),
            t("organization_onboarding_invite_title"),
            t("organization_onboarding_review_title"),
          ][step - 1]
        }
        subtitle={t("organization_onboarding_subtitle")}
        footer={
          <div className="flex w-full justify-between">
            <Button color="secondary" disabled={step === 1 || isPending} onClick={() => setStep(step - 1)}>
              {t("back")}
            </Button>
            <Button
              loading={isPending}
              disabled={
                (step === 1 && !memberSlug) ||
                (step === 3 && !organization.children.length && (!teamName || !teamSlug))
              }
              onClick={continueFromStep}>
              {step === 5 ? t("finish") : t("continue")}
            </Button>
          </div>
        }>
        {step === 1 && (
          <TextField
            label={t("organization_onboarding_member_url")}
            addOnLeading={`/${orgSlug}/users/`}
            value={memberSlug}
            onChange={(event) => setMemberSlug(toSlug(event.target.value))}
          />
        )}
        {step === 2 && (
          <div className="space-y-4">
            <TextAreaField
              name="bio"
              label={t("organization_bio")}
              value={bio}
              onChange={(event) => setBio(event.target.value)}
            />
            <TextField
              label={t("logo_url")}
              value={logoUrl}
              onChange={(event) => setLogoUrl(event.target.value)}
            />
            <TextField
              label={t("brand_color")}
              value={brandColor}
              onChange={(event) => setBrandColor(event.target.value)}
            />
            <TextField
              label={t("dark_brand_color")}
              value={darkBrandColor}
              onChange={(event) => setDarkBrandColor(event.target.value)}
            />
          </div>
        )}
        {step === 3 && (
          <div className="space-y-4">
            {organization.children.length ? (
              <p>{t("organization_onboarding_existing_team", { teamName: organization.children[0].name })}</p>
            ) : (
              <>
                <TextField
                  label={t("team_name")}
                  value={teamName}
                  onChange={(event) => {
                    setTeamName(event.target.value);
                    setTeamSlug(toSlug(event.target.value));
                  }}
                />
                <TextField
                  label={t("team_url")}
                  addOnLeading={`/${orgSlug}/teams/`}
                  value={teamSlug}
                  onChange={(event) => setTeamSlug(toSlug(event.target.value))}
                />
              </>
            )}
          </div>
        )}
        {step === 4 && (
          <div className="space-y-4">
            <div className="flex items-end gap-2">
              <TextField
                label={t("member_email")}
                type="email"
                value={inviteEmail}
                onChange={(event) => setInviteEmail(event.target.value)}
              />
              <Button color="secondary" onClick={addInvite}>
                {t("add")}
              </Button>
            </div>
            {inviteEmails.map((email) => (
              <p key={email}>{email}</p>
            ))}
          </div>
        )}
        {step === 5 && (
          <div className="space-y-3 rounded-lg border border-subtle p-4 font-mono text-sm">
            <p>{buildOrganizationPath(orgSlug)}</p>
            <p>{buildMemberPath(orgSlug, memberSlug)}</p>
            {effectiveTeamSlug && <p>{buildTeamPath(orgSlug, effectiveTeamSlug)}</p>}
            <p className="font-sans text-subtle">{t("organization_onboarding_visibility_note")}</p>
          </div>
        )}
      </OnboardingCard>
    </OnboardingLayout>
  );
}

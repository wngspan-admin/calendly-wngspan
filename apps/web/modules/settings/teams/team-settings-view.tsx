"use client";

import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";
import SectionBottomActions from "@calcom/features/settings/SectionBottomActions";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { MembershipRole } from "@calcom/prisma/enums";
import type { RouterOutputs } from "@calcom/trpc/react";
import { trpc } from "@calcom/trpc/react";
import { Button } from "@calcom/ui/components/button";
import { ConfirmationDialogContent, Dialog, DialogTrigger } from "@calcom/ui/components/dialog";
import { Form, Switch, TextAreaField, TextField } from "@calcom/ui/components/form";
import { showToast } from "@calcom/ui/components/toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

type Team = RouterOutputs["viewer"]["teams"]["get"];

const ZUpdateForm = z.object({
  name: z.string().min(1).max(100),
  slug: z
    .string()
    .min(1)
    .max(50)
    .regex(/^[a-z0-9-]+$/, "Only lowercase letters, numbers and hyphens"),
  bio: z.string().max(500).optional(),
  isListed: z.boolean(),
});
type UpdateForm = z.infer<typeof ZUpdateForm>;

export default function TeamSettingsView({ team }: { team: Team }) {
  const { t } = useLocale();
  const router = useRouter();
  const utils = trpc.useUtils();

  const isOwner = team.members.some(
    (m) => "role" in m && (m as { role: MembershipRole }).role === MembershipRole.OWNER
  );

  const form = useForm<UpdateForm>({
    resolver: zodResolver(ZUpdateForm),
    defaultValues: {
      name: team.name,
      slug: team.slug ?? "",
      bio: team.bio ?? "",
      isListed: team.isListed,
    },
  });

  useEffect(() => {
    form.reset({
      name: team.name,
      slug: team.slug ?? "",
      bio: team.bio ?? "",
      isListed: team.isListed,
    });
  }, [form, team.bio, team.isListed, team.name, team.slug]);

  const update = trpc.viewer.teams.update.useMutation({
    onSuccess: () => {
      utils.viewer.teams.list.invalidate();
      showToast(t("settings_updated_successfully"), "success");
    },
    onError: (e) => showToast(e.message, "error"),
  });

  const deleteTeam = trpc.viewer.teams.delete.useMutation({
    onSuccess: () => {
      showToast(t("team_deleted"), "success");
      router.push("/settings/teams");
    },
    onError: (e) => showToast(e.message, "error"),
  });

  return (
    <SettingsHeader title={team.name} description={`${t("team_url")}: /${team.slug}`}>
      <Form form={form} handleSubmit={(values) => update.mutate({ teamId: team.id, ...values })}>
        <div className="space-y-4 rounded-lg border border-subtle bg-default p-6">
          <TextField label={t("team_name")} {...form.register("name")} />
          <TextField label={t("team_url")} addOnLeading="/" {...form.register("slug")} />
          <TextAreaField label={t("about")} {...form.register("bio")} rows={3} />
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="font-medium text-emphasis text-sm">{t("list_team_in_organization_directory")}</p>
              <p className="text-sm text-subtle">{t("listed_team_description")}</p>
            </div>
            <Switch
              checked={form.watch("isListed")}
              onCheckedChange={(checked) => form.setValue("isListed", checked, { shouldDirty: true })}
            />
          </div>
        </div>
        <SectionBottomActions align="end">
          <Button type="submit" loading={update.isPending}>
            {t("save")}
          </Button>
        </SectionBottomActions>
      </Form>

      {isOwner && (
        <div className="mt-8 rounded-lg border border-red-200 bg-default p-6">
          <h3 className="font-semibold text-emphasis">{t("danger_zone")}</h3>
          <p className="mt-1 text-default text-sm">{t("team_deletion_cannot_be_undone")}</p>
          <Dialog>
            <DialogTrigger asChild>
              <Button color="destructive" className="mt-4">
                {t("disband_team")}
              </Button>
            </DialogTrigger>
            <ConfirmationDialogContent
              variety="danger"
              title={t("disband_team")}
              confirmBtnText={t("confirm_disband_team")}
              onConfirm={() => deleteTeam.mutate({ teamId: team.id })}>
              {t("disband_team_confirmation_message")}
            </ConfirmationDialogContent>
          </Dialog>
        </div>
      )}
    </SettingsHeader>
  );
}

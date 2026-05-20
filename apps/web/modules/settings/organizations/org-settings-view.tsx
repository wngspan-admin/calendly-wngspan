"use client";

import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";
import SectionBottomActions from "@calcom/features/settings/SectionBottomActions";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { MembershipRole } from "@calcom/prisma/enums";
import { trpc } from "@calcom/trpc/react";
import type { RouterOutputs } from "@calcom/trpc/react";
import { Button } from "@calcom/ui/components/button";
import { Form, TextField, TextAreaField } from "@calcom/ui/components/form";
import { showToast } from "@calcom/ui/components/toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

type Org = RouterOutputs["viewer"]["organizations"]["get"];

const ZUpdateForm = z.object({
  name: z.string().min(1).max(100),
  slug: z
    .string()
    .min(1)
    .max(50)
    .regex(/^[a-z0-9-]+$/, "Only lowercase letters, numbers and hyphens"),
  bio: z.string().max(500).optional(),
  orgAutoAcceptEmail: z.string().optional(),
});
type UpdateForm = z.infer<typeof ZUpdateForm>;

export default function OrgSettingsView({ org }: { org: Org }) {
  const { t } = useLocale();
  const utils = trpc.useUtils();

  const isOwnerOrAdmin = org.members.some(
    (m) =>
      "role" in m &&
      (m.role === MembershipRole.OWNER || m.role === MembershipRole.ADMIN)
  );

  const form = useForm<UpdateForm>({
    resolver: zodResolver(ZUpdateForm),
    defaultValues: {
      name: org.name,
      slug: org.slug ?? "",
      bio: org.bio ?? "",
      orgAutoAcceptEmail: org.organizationSettings?.orgAutoAcceptEmail ?? "",
    },
  });

  useEffect(() => {
    form.reset({
      name: org.name,
      slug: org.slug ?? "",
      bio: org.bio ?? "",
      orgAutoAcceptEmail: org.organizationSettings?.orgAutoAcceptEmail ?? "",
    });
  }, [org.id]);

  const update = trpc.viewer.organizations.update.useMutation({
    onSuccess: () => {
      utils.viewer.organizations.list.invalidate();
      showToast(t("settings_updated_successfully"), "success");
    },
    onError: (e) => showToast(e.message, "error"),
  });

  return (
    <SettingsHeader title={org.name} description={`/${org.slug}`}>
      <Form
        form={form}
        handleSubmit={(values) =>
          update.mutate({
            organizationId: org.id,
            name: values.name,
            slug: values.slug,
            bio: values.bio,
            orgAutoAcceptEmail: values.orgAutoAcceptEmail || undefined,
          })
        }>
        <div className="space-y-4 rounded-lg border border-subtle bg-default p-6">
          <TextField label={t("organization_name")} {...form.register("name")} />
          <TextField
            label={t("organization_url")}
            addOnLeading="/"
            {...form.register("slug")}
          />
          <TextAreaField label={t("about")} {...form.register("bio")} rows={3} />
          <TextField
            label={t("org_auto_accept_email_domain")}
            placeholder="acme.com"
            {...form.register("orgAutoAcceptEmail")}
          />
        </div>
        {isOwnerOrAdmin && (
          <SectionBottomActions align="end">
            <Button type="submit" loading={update.isPending}>
              {t("save")}
            </Button>
          </SectionBottomActions>
        )}
      </Form>
    </SettingsHeader>
  );
}

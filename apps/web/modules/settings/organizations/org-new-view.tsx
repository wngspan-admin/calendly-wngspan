"use client";

import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Button } from "@calcom/ui/components/button";
import { TextField } from "@calcom/ui/components/form";
import { showToast } from "@calcom/ui/components/toast";
import { useRouter } from "next/navigation";
import { useState } from "react";

function toSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

export default function OrgNewView() {
  const { t } = useLocale();
  const router = useRouter();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [orgAutoAcceptEmail, setOrgAutoAcceptEmail] = useState("");

  const createOrg = trpc.viewer.organizations.create.useMutation({
    onSuccess: (org) => {
      showToast(t("organization_created"), "success");
      router.push(`/settings/organizations/${org.id}`);
    },
    onError: (e) => showToast(e.message, "error"),
  });

  const handleNameChange = (val: string) => {
    setName(val);
    setSlug(toSlug(val));
  };

  return (
    <SettingsHeader title={t("create_organization")} description={t("create_organization_description")}>
      <div className="space-y-4 rounded-lg border border-subtle bg-default p-6">
        <TextField
          label={t("organization_name")}
          value={name}
          onChange={(e) => handleNameChange(e.target.value)}
          placeholder="Acme Corp"
          data-testid="org-name-input"
        />
        <TextField
          label={t("organization_url")}
          addOnLeading="/"
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          data-testid="org-slug-input"
        />
        <TextField
          label={t("org_auto_accept_email_domain")}
          value={orgAutoAcceptEmail}
          onChange={(e) => setOrgAutoAcceptEmail(e.target.value)}
          placeholder="acme.com"
          data-testid="org-domain-input"
        />
      </div>
      <div className="mt-4 flex justify-end">
        <Button
          onClick={() =>
            createOrg.mutate({ name, slug, orgAutoAcceptEmail: orgAutoAcceptEmail || undefined })
          }
          loading={createOrg.isPending}
          disabled={!name || !slug || createOrg.isPending}
          data-testid="create-org-btn">
          {t("create_organization")}
        </Button>
      </div>
    </SettingsHeader>
  );
}

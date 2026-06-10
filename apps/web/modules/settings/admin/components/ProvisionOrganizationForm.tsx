"use client";

import { trpc } from "@calcom/trpc/react";
import { Button } from "@calcom/ui/components/button";
import { TextField } from "@calcom/ui/components/form";
import { showToast } from "@calcom/ui/components/toast";
import { useRouter } from "next/navigation";
import { useState } from "react";

const toSlug = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

export function ProvisionOrganizationForm() {
  const router = useRouter();
  const utils = trpc.useUtils();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [bio, setBio] = useState("");

  const provision = trpc.viewer.admin.provisionOrganization.useMutation({
    onSuccess: async () => {
      await utils.viewer.admin.listOrganizations.invalidate();
      showToast("Organization provisioned", "success");
      router.push("/settings/admin/organizations");
    },
    onError: (error: { message: string }) => showToast(error.message, "error"),
  });

  return (
    <div className="space-y-4 rounded-[14px] border border-subtle bg-default p-6">
      <TextField
        label="Organization name"
        value={name}
        onChange={(event) => {
          const nextName = event.target.value;
          setName(nextName);
          if (!slug || slug === toSlug(name)) setSlug(toSlug(nextName));
        }}
      />
      <TextField label="Organization slug" value={slug} onChange={(event) => setSlug(event.target.value)} />
      <TextField
        label="Client owner email"
        type="email"
        value={ownerEmail}
        onChange={(event) => setOwnerEmail(event.target.value)}
      />
      <TextField label="Bio" value={bio} onChange={(event) => setBio(event.target.value)} />
      <div className="flex gap-2">
        <Button
          loading={provision.isPending}
          disabled={!name.trim() || !slug.trim() || !ownerEmail.trim()}
          onClick={() =>
            provision.mutate({
              name: name.trim(),
              slug: slug.trim(),
              ownerEmail: ownerEmail.trim(),
              bio: bio.trim() || undefined,
            })
          }>
          Provision organization
        </Button>
        <Button color="secondary" href="/settings/admin/organizations">
          Cancel
        </Button>
      </div>
    </div>
  );
}

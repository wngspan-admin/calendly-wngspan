import process from "node:process";
import { Dialog } from "@calcom/features/components/controlled-dialog";
import CreateEventTypeForm from "@calcom/features/eventtypes/components/CreateEventTypeForm";
import type { TCreateEventTypeInput } from "@calcom/features/eventtypes/lib/schemas";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { useTypedQuery } from "@calcom/lib/hooks/useTypedQuery";
import type { EventType } from "@calcom/prisma/client";
import type { MembershipRole } from "@calcom/prisma/enums";
import { SchedulingType } from "@calcom/prisma/enums";
import { Button } from "@calcom/ui/components/button";
import { DialogClose, DialogContent, DialogFooter } from "@calcom/ui/components/dialog";
import { showToast } from "@calcom/ui/components/toast";
import { isValidPhoneNumber } from "libphonenumber-js/max";
import { useRouter } from "next/navigation";
import type { JSX } from "react";
import { useEffect } from "react";
import { z } from "zod";
import { useCreateEventType } from "../hooks/useCreateEventType";

const WEBSITE_URL: string = process.env.NEXT_PUBLIC_WEBSITE_URL ?? "";

interface EventTypeParent {
  teamId: number | null | undefined;
  membershipRole?: MembershipRole | null;
  name?: string | null;
  slug?: string | null;
  image?: string | null;
}

interface ProfileOption {
  teamId: number | null | undefined;
  label: string | null;
  image: string;
  membershipRole: MembershipRole | null | undefined;
  slug: string | null;
  permissions: {
    canCreateEventType: boolean;
  };
}

type LocationQueryValue = Array<{
  locationType: string;
  locationAddress?: string;
  displayLocationPublicly?: boolean;
  locationPhoneNumber?: string;
  locationLink?: string;
}>;

type CreateEventTypeQuery = {
  eventPage?: string;
  teamId?: number;
  title?: string;
  slug?: string;
  length?: number;
  description?: string;
  schedulingType?: SchedulingType;
  locations?: LocationQueryValue;
};

const locationFormSchema: z.ZodType<LocationQueryValue> = z.array(
  z.object({
    locationType: z.string(),
    locationAddress: z.string().optional(),
    displayLocationPublicly: z.boolean().optional(),
    locationPhoneNumber: z
      .string()
      .refine((val) => isValidPhoneNumber(val))
      .optional(),
    locationLink: z.string().url().optional(),
  })
);

const querySchema: z.ZodType<CreateEventTypeQuery> = z.object({
  eventPage: z.string().optional(),
  teamId: z.union([z.string().transform((val) => +val), z.number()]).optional(),
  title: z.string().optional(),
  slug: z.string().optional(),
  length: z.union([z.string().transform((val) => +val), z.number()]).optional(),
  description: z.string().optional(),
  schedulingType: z.nativeEnum(SchedulingType).optional(),
  locations: z
    .string()
    .transform((jsonString) => locationFormSchema.parse(JSON.parse(jsonString)))
    .optional(),
});

const getDialogTitle = (teamId: number | undefined, t: (key: string) => string): string => {
  if (teamId) {
    return t("add_new_team_event_type");
  }

  return t("add_new_event_type");
};

const getRedirectPath = (eventTypeId: number, teamId: number | undefined): string => {
  if (teamId) {
    return `/event-types/${eventTypeId}?tabName=team`;
  }

  return `/event-types/${eventTypeId}`;
};

const getSchedulingTypeClassName = (isSelected: boolean): string => {
  if (isSelected) {
    return "border-emphasis bg-muted";
  }

  return "border-subtle";
};

export function CreateEventTypeDialog({
  profileOptions: _profileOptions,
}: {
  profileOptions: ProfileOption[];
}): JSX.Element {
  const { t } = useLocale();
  const router = useRouter();
  const {
    data: { teamId, eventPage: pageSlug, title, slug, length, description, schedulingType, locations },
  } = useTypedQuery(querySchema);
  const { form, createMutation, isManagedEventType } = useCreateEventType(
    (eventType: EventType): void => {
      router.replace(getRedirectPath(eventType.id, teamId));
      showToast(
        t("event_type_created_successfully", {
          eventTypeTitle: eventType.title,
        }),
        "success"
      );
    },
    (errorMessage: string): void => {
      showToast(errorMessage, "error");
    }
  );
  const selectedSchedulingType = form.watch("schedulingType");

  useEffect((): void => {
    if (teamId !== undefined) {
      form.setValue("teamId", teamId);
      form.setValue("schedulingType", schedulingType ?? SchedulingType.COLLECTIVE);
    } else {
      form.setValue("teamId", null);
      form.setValue("schedulingType", schedulingType ?? null);
    }

    if (title !== undefined) {
      form.setValue("title", title);
    }
    if (slug !== undefined) {
      form.setValue("slug", slug);
    }
    if (length !== undefined) {
      form.setValue("length", length);
    }
    if (description !== undefined) {
      form.setValue("description", description);
    }
    if (locations !== undefined) {
      form.setValue(
        "locations",
        locations.map((location) => ({
          type: location.locationType,
          address: location.locationAddress,
          displayLocationPublicly: location.displayLocationPublicly,
          phone: location.locationPhoneNumber,
          link: location.locationLink,
        }))
      );
    }
  }, [description, form, length, locations, schedulingType, slug, teamId, title]);

  const schedulingOptions = [
    {
      value: SchedulingType.COLLECTIVE,
      label: t("collective"),
      description: t("collective_description"),
    },
    {
      value: SchedulingType.ROUND_ROBIN,
      label: t("round_robin"),
      description: t("round_robin_description"),
    },
    {
      value: SchedulingType.MANAGED,
      label: t("managed_event"),
      description: t("managed_event_description"),
    },
  ];

  let schedulingTypeSelector: JSX.Element | null = null;
  if (teamId) {
    schedulingTypeSelector = (
      <div className="mt-3 mb-6 grid gap-3 sm:grid-cols-3">
        {schedulingOptions.map((option) => (
          <button
            key={option.value}
            type="button"
            className={`rounded-md border p-4 text-left transition ${getSchedulingTypeClassName(
              selectedSchedulingType === option.value
            )}`}
            onClick={(): void => {
              form.setValue("schedulingType", option.value);
            }}>
            <div className="font-semibold text-default">{option.label}</div>
            <p className="mt-1 text-sm text-subtle">{option.description}</p>
          </button>
        ))}
      </div>
    );
  }

  return (
    <Dialog
      name="new"
      clearQueryParamsOnClose={["eventPage", "type", "description", "title", "length", "slug", "locations"]}>
      <DialogContent
        type="creation"
        enableOverflow
        title={getDialogTitle(teamId, t)}
        description={t("new_event_type_to_book_description")}>
        {schedulingTypeSelector}
        <CreateEventTypeForm
          urlPrefix={WEBSITE_URL}
          isPending={createMutation.isPending}
          form={form}
          isManagedEventType={isManagedEventType}
          handleSubmit={(values: TCreateEventTypeInput): void => {
            createMutation.mutate(values);
          }}
          SubmitButton={(isPending: boolean): JSX.Element => (
            <DialogFooter showDivider>
              <DialogClose />
              <Button type="submit" loading={isPending}>
                {t("continue")}
              </Button>
            </DialogFooter>
          )}
          pageSlug={pageSlug}
        />
      </DialogContent>
    </Dialog>
  );
}

export type { EventTypeParent, ProfileOption };

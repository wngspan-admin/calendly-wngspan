"use client";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { SchedulingType } from "@calcom/prisma/enums";
import type { FormValues, TeamMember } from "@calcom/features/eventtypes/lib/types";
import { useFormContext, Controller } from "react-hook-form";

type TeamEventType = {
  id: number;
  schedulingType: SchedulingType | null;
  hosts: { userId: number; isFixed: boolean }[];
};

type Team = {
  id: number;
  name: string;
  slug: string | null;
} | null;

interface EventTeamAssignmentTabProps {
  orgId: number | null;
  teamMembers: TeamMember[];
  team: Team;
  eventType: TeamEventType;
}

const SCHEDULING_TYPE_OPTIONS = [
  {
    value: SchedulingType.COLLECTIVE,
    label: "collective",
    description: "collective_description",
  },
  {
    value: SchedulingType.ROUND_ROBIN,
    label: "round_robin",
    description: "round_robin_description",
  },
] as const;

export default function EventTeamAssignmentTab({
  teamMembers,
  team,
  eventType,
}: EventTeamAssignmentTabProps) {
  const { t } = useLocale();
  const form = useFormContext<FormValues>();
  const schedulingType = form.watch("schedulingType");
  const hosts = form.watch("hosts") ?? [];

  if (!team) return null;

  const toggleHost = (userId: number, isFixed: boolean) => {
    const current = form.getValues("hosts") ?? [];
    const exists = current.some((h) => h.userId === userId);
    if (exists) {
      form.setValue(
        "hosts",
        current.filter((h) => h.userId !== userId),
        { shouldDirty: true }
      );
    } else {
      form.setValue("hosts", [...current, { userId, isFixed, priority: 2, weight: 100, groupId: null }], {
        shouldDirty: true,
      });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="mb-3 text-sm font-semibold text-emphasis">{t("scheduling_type")}</h3>
        <Controller
          name="schedulingType"
          control={form.control}
          render={({ field }) => (
            <div className="space-y-2">
              {SCHEDULING_TYPE_OPTIONS.map((opt) => (
                <label
                  key={opt.value}
                  className="flex cursor-pointer items-start gap-3 rounded-lg border border-subtle p-4 hover:bg-subtle has-[:checked]:border-emphasis has-[:checked]:bg-default">
                  <input
                    type="radio"
                    className="mt-1"
                    value={opt.value}
                    checked={field.value === opt.value}
                    onChange={() => field.onChange(opt.value)}
                  />
                  <div>
                    <p className="text-sm font-medium text-emphasis">{t(opt.label)}</p>
                    <p className="text-xs text-default">{t(opt.description)}</p>
                  </div>
                </label>
              ))}
            </div>
          )}
        />
      </div>

      <div>
        <h3 className="mb-3 text-sm font-semibold text-emphasis">{t("team_members")}</h3>
        {teamMembers.length === 0 ? (
          <p className="text-sm text-default">{t("no_members_found")}</p>
        ) : (
          <ul className="space-y-2">
            {teamMembers.map((member) => {
              const isFixed = schedulingType === SchedulingType.COLLECTIVE;
              const isSelected = hosts.some((h) => h.userId === Number(member.value));
              return (
                <li
                  key={member.value}
                  className="flex items-center justify-between rounded-lg border border-subtle p-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-subtle text-xs font-semibold uppercase text-emphasis">
                      {member.label?.[0] ?? "?"}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-emphasis">{member.label}</p>
                      <p className="text-xs text-default">{member.email}</p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={isSelected}
                    data-testid={`host-checkbox-${member.value}`}
                    onChange={() => toggleHost(Number(member.value), isFixed)}
                    className="h-4 w-4 rounded border-default text-emphasis focus:ring-emphasis"
                  />
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

import type { Prisma } from "@calcom/prisma/client";

export const selectOOOEntries: Prisma.OutOfOfficeEntrySelect = {
  id: true,
  start: true,
  end: true,
  createdAt: true,
  updatedAt: true,
  notes: true,
  showNotePublicly: true,
  reasonId: true,
  reason: {
    select: {
      reason: true,
      emoji: true,
    },
  },
  user: {
    select: {
      id: true,
      name: true,
      email: true,
      timeZone: true,
    },
  },
  toUser: {
    select: {
      id: true,
      name: true,
      email: true,
      timeZone: true,
    },
  },
  uuid: true,
};

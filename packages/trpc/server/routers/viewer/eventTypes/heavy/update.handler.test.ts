import { Prisma } from "@calcom/prisma/client";
import { SchedulingType } from "@calcom/prisma/enums";
import { describe, expect, it, vi } from "vitest";
import { buildManagedChildEventData, updateChildrenEventTypes } from "./update.handler";

describe("update.handler", () => {
  describe("managed child event propagation", () => {
    it("builds managed child events as user-owned children of the parent", () => {
      const result = buildManagedChildEventData({
        child: {
          hidden: true,
          owner: {
            id: 7,
            name: "Alex",
            email: "alex@example.com",
            eventTypeSlugs: [],
          },
        },
        parentEvent: {
          id: 44,
          schedulingType: SchedulingType.MANAGED,
          title: "Support",
          slug: "support",
          description: "Managed template",
          length: 30,
          hidden: false,
          locations: [{ type: "integrations:daily" }],
          offsetStart: 0,
          metadata: { managedEventConfig: { unlockedFields: { locations: true } } },
          bookingFields: [],
          periodType: "UNLIMITED",
          periodStartDate: null,
          periodEndDate: null,
          periodDays: null,
          periodCountCalendarDays: null,
          lockTimeZoneToggleOnBookingPage: false,
          lockedTimeZone: null,
          requiresConfirmation: false,
          requiresConfirmationWillBlockSlot: false,
          requiresConfirmationForFreeEmail: false,
          requiresBookerEmailVerification: false,
          canSendCalVideoTranscriptionEmails: true,
          autoTranslateDescriptionEnabled: false,
          autoTranslateInstantMeetingTitleEnabled: true,
          recurringEvent: null,
          disableGuests: false,
          hideCalendarNotes: false,
          hideCalendarEventDetails: false,
          minimumBookingNotice: 120,
          beforeEventBuffer: 0,
          afterEventBuffer: 0,
          seatsPerTimeSlot: null,
          onlyShowFirstAvailableSlot: false,
          showOptimizedSlots: false,
          disableCancelling: false,
          disableRescheduling: false,
          minimumRescheduleNotice: null,
          seatsShowAttendees: false,
          seatsShowAvailabilityCount: true,
          allowReschedulingCancelledBookings: false,
          price: 0,
          currency: "usd",
          slotInterval: null,
          successRedirectUrl: null,
          forwardParamsSuccessRedirect: true,
          bookingLimits: null,
          durationLimits: null,
          isInstantEvent: false,
          instantMeetingExpiryTimeOffsetInSeconds: 90,
          instantMeetingParameters: [],
          useEventTypeDestinationCalendarEmail: false,
          isRRWeightsEnabled: false,
          maxLeadThreshold: null,
          includeNoShowInRRCalculation: false,
          allowReschedulingPastBookings: false,
          hideOrganizerEmail: false,
          maxActiveBookingsPerBooker: null,
          maxActiveBookingPerBookerOfferReschedule: false,
          customReplyToEmail: null,
          eventTypeColor: null,
          rescheduleWithSameRoundRobinHost: false,
          useBookerTimezone: false,
          bookingRequiresAuthentication: false,
          requiresCancellationReason: null,
          enablePerHostLocations: false,
        },
      });

      expect(result.slug).toBe("support");
      expect(result.hidden).toBe(true);
      expect(result.assignAllTeamMembers).toBe(false);
    });

    it("creates, updates, and deletes managed child event rows", async () => {
      const findMany = vi.fn().mockResolvedValue([
        { id: 1001, userId: 7 },
        { id: 1002, userId: 8 },
      ]);
      const findUniqueOrThrow = vi.fn().mockResolvedValue({
        id: 44,
        schedulingType: SchedulingType.MANAGED,
        title: "Support",
        slug: "support",
        description: "Managed template",
        length: 30,
        hidden: false,
        locations: [{ type: "integrations:daily" }],
        offsetStart: 0,
        metadata: { managedEventConfig: { unlockedFields: { locations: true } } },
        bookingFields: [],
        periodType: "UNLIMITED",
        periodStartDate: null,
        periodEndDate: null,
        periodDays: null,
        periodCountCalendarDays: null,
        lockTimeZoneToggleOnBookingPage: false,
        lockedTimeZone: null,
        requiresConfirmation: false,
        requiresConfirmationWillBlockSlot: false,
        requiresConfirmationForFreeEmail: false,
        requiresBookerEmailVerification: false,
        canSendCalVideoTranscriptionEmails: true,
        autoTranslateDescriptionEnabled: false,
        autoTranslateInstantMeetingTitleEnabled: true,
        recurringEvent: null,
        disableGuests: false,
        hideCalendarNotes: false,
        hideCalendarEventDetails: false,
        minimumBookingNotice: 120,
        beforeEventBuffer: 0,
        afterEventBuffer: 0,
        seatsPerTimeSlot: null,
        onlyShowFirstAvailableSlot: false,
        showOptimizedSlots: false,
        disableCancelling: false,
        disableRescheduling: false,
        minimumRescheduleNotice: null,
        seatsShowAttendees: false,
        seatsShowAvailabilityCount: true,
        allowReschedulingCancelledBookings: false,
        price: 0,
        currency: "usd",
        slotInterval: null,
        successRedirectUrl: null,
        forwardParamsSuccessRedirect: true,
        bookingLimits: null,
        durationLimits: null,
        isInstantEvent: false,
        instantMeetingExpiryTimeOffsetInSeconds: 90,
        instantMeetingParameters: [],
        useEventTypeDestinationCalendarEmail: false,
        isRRWeightsEnabled: false,
        maxLeadThreshold: null,
        includeNoShowInRRCalculation: false,
        allowReschedulingPastBookings: false,
        hideOrganizerEmail: false,
        maxActiveBookingsPerBooker: null,
        maxActiveBookingPerBookerOfferReschedule: false,
        customReplyToEmail: null,
        eventTypeColor: null,
        rescheduleWithSameRoundRobinHost: false,
        useBookerTimezone: false,
        bookingRequiresAuthentication: false,
        requiresCancellationReason: null,
        enablePerHostLocations: false,
      });
      const deleteMany = vi.fn().mockResolvedValue({ count: 1 });
      const update = vi.fn().mockResolvedValue({});
      const create = vi.fn().mockResolvedValue({});

      const prismaMock = {
        eventType: {
          findMany,
          findUniqueOrThrow,
          deleteMany,
          update,
          create,
        },
      };

      await updateChildrenEventTypes({
        eventTypeId: 44,
        oldEventType: { schedulingType: SchedulingType.MANAGED },
        updatedEventType: { schedulingType: SchedulingType.MANAGED },
        children: [
          {
            hidden: false,
            owner: { id: 7, name: "Alex", email: "alex@example.com", eventTypeSlugs: [] },
          },
          {
            hidden: true,
            owner: { id: 9, name: "Blair", email: "blair@example.com", eventTypeSlugs: [] },
          },
        ],
        prisma: prismaMock as never,
      });

      expect(deleteMany).toHaveBeenCalledWith({
        where: {
          id: {
            in: [1002],
          },
        },
      });
      expect(update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 1001 },
        })
      );
      expect(create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            owner: {
              connect: {
                id: 9,
              },
            },
            parent: {
              connect: {
                id: 44,
              },
            },
            slug: "support",
          }),
        })
      );
    });

    it("removes all children when a managed event becomes non-managed", async () => {
      const deleteMany = vi.fn().mockResolvedValue({ count: 2 });
      const prismaMock = {
        eventType: {
          findMany: vi.fn().mockResolvedValue([
            { id: 1001, userId: 7 },
            { id: 1002, userId: 8 },
          ]),
          deleteMany,
        },
      };

      await updateChildrenEventTypes({
        eventTypeId: 44,
        oldEventType: { schedulingType: SchedulingType.MANAGED },
        updatedEventType: { schedulingType: null },
        prisma: prismaMock as never,
      });

      expect(deleteMany).toHaveBeenCalledWith({
        where: {
          parentId: 44,
        },
      });
    });
  });

  describe("bookingFields null to Prisma.DbNull transformation", () => {
    function transformBookingFields(
      bookingFields: null | undefined | Prisma.InputJsonValue
    ): typeof Prisma.DbNull | Prisma.InputJsonValue | undefined {
      if (bookingFields === null) {
        return Prisma.DbNull;
      }

      return bookingFields as Prisma.InputJsonValue | undefined;
    }

    it("should convert null to Prisma.DbNull", () => {
      const result = transformBookingFields(null);
      expect(result).toBe(Prisma.DbNull);
    });

    it("should pass through undefined as-is", () => {
      const result = transformBookingFields(undefined);
      expect(result).toBeUndefined();
    });

    it("should pass through an array of booking fields as-is", () => {
      const bookingFieldsArray = [
        {
          name: "email",
          type: "email",
          label: "Email",
          required: true,
          hidden: false,
        },
        {
          name: "name",
          type: "name",
          label: "Name",
          required: true,
          hidden: false,
        },
      ];

      const result = transformBookingFields(bookingFieldsArray);
      expect(result).toEqual(bookingFieldsArray);
    });

    it("should pass through an empty array as-is", () => {
      const result = transformBookingFields([]);
      expect(result).toEqual([]);
    });

    it("should distinguish between null and empty array", () => {
      const nullResult = transformBookingFields(null);
      const emptyArrayResult = transformBookingFields([]);

      expect(nullResult).toBe(Prisma.DbNull);
      expect(emptyArrayResult).toEqual([]);
      expect(nullResult).not.toEqual(emptyArrayResult);
    });
  });
});

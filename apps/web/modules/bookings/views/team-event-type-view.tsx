"use client";

import { BookerWebWrapper as Booker } from "@calcom/web/modules/bookings/components/BookerWebWrapper";
import { getBookerWrapperClasses } from "@calcom/features/bookings/Booker/utils/getBookerWrapperClasses";
import BookingPageErrorBoundary from "@components/error/BookingPageErrorBoundary";

interface TeamEventTypeViewProps {
  teamSlug: string;
  eventSlug: string;
  orgSlug?: string | null;
}

export default function TeamEventTypeView({ teamSlug, eventSlug, orgSlug }: TeamEventTypeViewProps) {
  return (
    <BookingPageErrorBoundary>
      <main className={getBookerWrapperClasses({ isEmbed: false })}>
        <Booker
          username={teamSlug}
          eventSlug={eventSlug}
          isTeamEvent
          entity={{
            considerUnpublished: false,
            teamSlug,
            orgSlug: orgSlug ?? null,
          }}
        />
      </main>
    </BookingPageErrorBoundary>
  );
}

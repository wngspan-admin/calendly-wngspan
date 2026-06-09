import { formatPrice } from "@calcom/lib/currencyConversions";

import type { EventPrice } from "@calcom/features/bookings/types";

export const Price = ({ price, currency, displayAlternateSymbol = true }: EventPrice) => {
  if (price === 0) return null;

  const formattedPrice = formatPrice(price, currency);
  void displayAlternateSymbol;
  return <>{formattedPrice}</>;
};

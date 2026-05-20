import type { RouterInputs } from "../trpc";
import { trpc } from "../trpc";

type MeGetInput = RouterInputs["viewer"]["me"]["get"];

export function useMeQuery(input?: MeGetInput) {
  const meQuery = trpc.viewer.me.get.useQuery(input, {
    retry(failureCount) {
      return failureCount > 3;
    },
  });

  return meQuery;
}

export default useMeQuery;

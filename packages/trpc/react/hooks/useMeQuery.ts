import type { RouterInputs } from "../trpc";
import { trpc } from "../trpc";

export function useMeQuery(input?: RouterInputs["viewer"]["me"]["get"]) {
  const meQuery = trpc.viewer.me.get.useQuery(input, {
    retry(failureCount) {
      return failureCount > 3;
    },
  });

  return meQuery;
}

export default useMeQuery;

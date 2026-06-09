const DUB_API_URL = "https://api.dub.co";

type DubLinkPayload = {
  domain?: string;
  url: string;
  folderId?: string;
};

type DubReferralPayload = {
  programId: string;
  tenantId: string;
  partner: {
    name: string;
    email: string;
    username: string;
    image: string | null;
    tenantId: string;
  };
};

type DubLeadPayload = {
  clickId: string;
  eventName: string;
  externalId: string;
  customerName?: string | null;
  customerEmail?: string | null;
  customerAvatar?: string | null;
};

const getAuthHeaders = (): Record<string, string> => {
  const token = process.env.DUB_API_KEY;
  return token
    ? {
        Authorization: `Bearer ${token}`,
      }
    : {};
};

const postJson = async <TResponse>(path: string, body: unknown): Promise<TResponse> => {
  const response = await fetch(`${DUB_API_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`Dub request failed with status ${response.status}`);
  }

  return (await response.json()) as TResponse;
};

export const dub = {
  customers: {
    async list(params: { externalId: string; includeExpandedFields?: boolean }) {
      const query = new URLSearchParams({
        externalId: params.externalId,
        includeExpandedFields: String(Boolean(params.includeExpandedFields)),
      });
      const response = await fetch(`${DUB_API_URL}/customers?${query.toString()}`, {
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error(`Dub request failed with status ${response.status}`);
      }

      const customer = (await response.json()) as { customers?: unknown[] } | unknown[];
      return Array.isArray(customer)
        ? customer
        : Array.isArray(customer.customers)
          ? customer.customers
          : [];
    },
  },
  embedTokens: {
    async referrals(payload: DubReferralPayload) {
      return postJson<{ publicToken: string }>("/embed-tokens/referrals", payload);
    },
  },
  links: {
    async createMany(payload: DubLinkPayload[]) {
      return postJson<Array<{ shortLink?: string; url?: string; error?: unknown }>>("/links/bulk", payload);
    },
  },
  track: {
    async lead(payload: DubLeadPayload) {
      await postJson("/track/lead", payload);
    },
  },
};

export const getDubCustomer = async (userId: string) => {
  const token = process.env.DUB_API_KEY;
  if (!token) {
    return null;
  }

  const customers = await dub.customers.list({
    externalId: userId,
    includeExpandedFields: true,
  });

  return customers.length > 0 ? customers[0] : null;
};

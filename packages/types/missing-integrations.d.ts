declare module "react-qr-code" {
  import type { ComponentType } from "react";

  const QRCode: ComponentType<{ size?: number; value: string }>;
  export default QRCode;
}

declare module "@getalby/sdk" {
  export const auth: {
    OAuth2User: new (options: {
      client_id: string;
      client_secret: string;
      callback: string;
      scopes: string[];
      user_agent: string;
    }) => unknown;
  };

  export const webln: {
    OauthWeblnProvider: new (options: { auth: unknown }) => {
      enable(): Promise<void>;
    };
  };

  export class Client {
    constructor(authClient: unknown);
    accountInformation(_options: Record<string, never>): Promise<{
      identifier: string;
      email: string;
      lightning_address: string;
    }>;
    createWebhookEndpoint(_options: {
      filter_types: string[];
      url: string;
      description: string;
    }): Promise<{
      id: string;
      endpoint_secret: string;
    }>;
  }
}

declare module "@calcom/app-store/alby/lib/albyCredentialKeysSchema" {
  export const albyCredentialKeysSchema: {
    parse(input: unknown): Record<string, unknown>;
  };
}

declare module "@calcom/app-store/alby/pages/setup/_getServerSideProps" {
  export interface IAlbySetupProps {
    clientId: string;
    clientSecret: string;
    lightningAddress?: string | null;
    email?: string | null;
  }
}

declare module "@calcom/app-store/btcpayserver/components/KeyInput" {
  import type { ComponentType } from "react";

  const KeyField: ComponentType<Record<string, unknown>>;
  export default KeyField;
}

declare module "@calcom/app-store/btcpayserver/lib/btcpayCredentialKeysSchema" {
  export const btcpayCredentialKeysSchema: {
    parse(input: unknown): Record<string, unknown>;
  };
}

declare module "@calcom/app-store/btcpayserver/pages/setup/_getServerSideProps" {
  export interface IBTCPaySetupProps {
    storeId?: string;
    serverUrl?: string;
    apiKey?: string;
    webhookSecret?: string;
  }
}

declare module "@calcom/app-store/hitpay/components/KeyInput" {
  import type { ComponentType } from "react";

  const KeyField: ComponentType<Record<string, unknown>>;
  export default KeyField;
}

declare module "@calcom/app-store/hitpay/lib/hitpayCredentialKeysSchema" {
  export const hitpayCredentialKeysSchema: {
    parse(input: unknown): Record<string, unknown>;
  };
}

declare module "@calcom/app-store/hitpay/pages/setup/_getServerSideProps" {
  export interface IHitPaySetupProps {
    isSandbox?: boolean;
    prod?: {
      apiKey?: string;
      saltKey?: string;
    };
    sandbox?: {
      apiKey?: string;
      saltKey?: string;
    };
  }
}

declare module "@calcom/app-store/hitpay/components/HitPayDropIn" {
  export const useHitPayDropIn: () => {
    isInitialized: boolean;
    init: (
      defaultLink: string,
      options: { domain: string },
      payment: { paymentRequest: string },
      callbacks: {
        onClose: () => void;
        onSuccess: () => void;
        onError: (error: unknown) => void;
      }
    ) => void;
  };
}

declare module "@calcom/app-store/exchangecalendar/enums" {
  export enum ExchangeAuthentication {
    STANDARD = 0,
    NTLM = 1,
  }

  export enum ExchangeVersion {
    Exchange2007_SP1 = 0,
    Exchange2010 = 1,
    Exchange2010_SP1 = 2,
    Exchange2010_SP2 = 3,
    Exchange2013 = 4,
    Exchange2013_SP1 = 5,
    Exchange2015 = 6,
    Exchange2016 = 7,
  }
}

declare module "@calcom/app-store/make/pages/setup/_getServerSideProps" {
  import type { GetServerSideProps } from "next";

  export const getServerSideProps: GetServerSideProps<{
    inviteLink: string;
  }>;
}

declare module "js-yaml" {
  const yaml: {
    JSON_SCHEMA: unknown;
    load(input: string, options?: { schema?: unknown }): unknown;
    dump(input: unknown): string;
  };

  export default yaml;
}

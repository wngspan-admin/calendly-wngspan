import logger from "@calcom/lib/logger";
import type { CredentialPayload } from "@calcom/types/Credential";
import type { CRM } from "@calcom/types/CrmService";

import { CrmServiceMap } from "../crm.apps.generated";

const log = logger.getSubLogger({ prefix: ["CrmManager"] });
type CrmServiceModule = {
  default?: (credential: CredentialPayload, appOptions?: Record<string, unknown>) => CRM;
};
export const getCrm = async (credential: CredentialPayload, appOptions?: Record<string, unknown>) => {
  if (!credential || !credential.key) return null;
  const { type: crmType } = credential;

  const crmName = crmType.split("_")[0];

  const crmServiceMap = CrmServiceMap as Record<string, Promise<CrmServiceModule> | CrmServiceModule | undefined>;
  const crmServiceImportFn = await crmServiceMap[crmName];

  if (!crmServiceImportFn) {
    log.warn(`crm of type ${crmType} is not implemented`);
    return null;
  }

  const createCrmService = crmServiceImportFn.default;

  if (!createCrmService) {
    log.warn(`crm of type ${crmType} is not implemented`);
    return null;
  }

  // CRM services now export factory functions instead of classes
  // to prevent SDK types from leaking into the type system
  return createCrmService(credential, appOptions);
};

export default getCrm;

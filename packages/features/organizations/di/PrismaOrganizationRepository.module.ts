import { bindModuleToClassOnToken, createModule, type ModuleLoader } from "@calcom/features/di/di";
import { moduleLoader as prismaModuleLoader } from "@calcom/features/di/modules/Prisma";

import { PrismaOrganizationRepository } from "../repositories/PrismaOrganizationRepository";
import { ORGANIZATION_DI_TOKENS } from "./tokens";

const thisModule = createModule();
const token = ORGANIZATION_DI_TOKENS.ORGANIZATION_REPOSITORY;
const moduleToken = ORGANIZATION_DI_TOKENS.ORGANIZATION_REPOSITORY_MODULE;

const loadModule = bindModuleToClassOnToken({
  module: thisModule,
  moduleToken,
  token,
  classs: PrismaOrganizationRepository,
  dep: prismaModuleLoader,
});

export const moduleLoader: ModuleLoader = {
  token,
  loadModule,
};

export type { PrismaOrganizationRepository };

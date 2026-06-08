import type BaseEmail from "@calcom/emails/templates/_base-email";

import type { TeamAccepted } from "./templates/team-accepted-email";
import TeamAcceptedEmail from "./templates/team-accepted-email";
import type { TeamInvite } from "./templates/team-invite-email";
import TeamInviteEmail from "./templates/team-invite-email";
import type { TeamRemoved } from "./templates/team-removed-email";
import TeamRemovedEmail from "./templates/team-removed-email";
import type { OrganizationCreation } from "./templates/organization-creation-email";
import OrganizationCreationEmail from "./templates/organization-creation-email";
import type { OrganizationAdminNoSlotsEmailInput } from "./src/templates/OrganizationAdminNoSlots";
import OrganizationAdminNoSlotsEmail from "./templates/organization-admin-no-slots-email";
import type { OrganizationEmailVerify } from "./templates/organization-email-verification";
import OrganizationEmailVerification from "./templates/organization-email-verification";
import type { OrganizationNotification } from "./templates/admin-organization-notification";
import AdminOrganizationNotification from "./templates/admin-organization-notification";

const sendEmail = (prepare: () => BaseEmail) => {
  return new Promise((resolve, reject) => {
    try {
      const email = prepare();
      resolve(email.sendEmail());
    } catch (e) {
      reject(console.error(`${prepare.constructor.name}.sendEmail failed`, e));
    }
  });
};

export const sendTeamInviteEmail = async (teamInviteEvent: TeamInvite) => {
  await sendEmail(() => new TeamInviteEmail(teamInviteEvent));
};

export const sendTeamAcceptedEmail = async (event: TeamAccepted) => {
  await sendEmail(() => new TeamAcceptedEmail(event));
};

export const sendTeamRemovedEmail = async (event: TeamRemoved) => {
  await sendEmail(() => new TeamRemovedEmail(event));
};

export const sendOrganizationCreationEmail = async (organizationCreationEvent: OrganizationCreation) => {
  await sendEmail(() => new OrganizationCreationEmail(organizationCreationEvent));
};

export const sendOrganizationAdminNoSlotsNotification = async (
  orgInviteEvent: OrganizationAdminNoSlotsEmailInput
) => {
  await sendEmail(() => new OrganizationAdminNoSlotsEmail(orgInviteEvent));
};

export const sendOrganizationEmailVerification = async (sendOrgInput: OrganizationEmailVerify) => {
  await sendEmail(() => new OrganizationEmailVerification(sendOrgInput));
};

export const sendAdminOrganizationNotification = async (input: OrganizationNotification) => {
  await sendEmail(() => new AdminOrganizationNotification(input));
};

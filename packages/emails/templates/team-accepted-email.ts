import { EMAIL_FROM_NAME } from "@calcom/lib/constants";

import renderEmail from "../src/renderEmail";
import BaseEmail from "./_base-email";

export type { TeamAccepted } from "../src/templates/TeamAcceptedEmail";
import type { TeamAccepted } from "../src/templates/TeamAcceptedEmail";

export default class TeamAcceptedEmail extends BaseEmail {
  event: TeamAccepted;
  constructor(event: TeamAccepted) {
    super();
    this.name = "SEND_TEAM_ACCEPTED_EMAIL";
    this.event = event;
  }

  protected async getNodeMailerPayload(): Promise<Record<string, unknown>> {
    return {
      to: this.event.to,
      from: `${EMAIL_FROM_NAME} <${this.getMailerOptions().from}>`,
      subject: this.event.language("email_team_accepted|subject", {
        memberName: this.event.memberName,
        teamName: this.event.teamName,
      }),
      html: await renderEmail("TeamAcceptedEmail", this.event),
      text: "",
    };
  }
}

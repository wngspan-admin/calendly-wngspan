import { EMAIL_FROM_NAME } from "@calcom/lib/constants";

import renderEmail from "../src/renderEmail";
import BaseEmail from "./_base-email";

export type { TeamRemoved } from "../src/templates/TeamRemovedEmail";
import type { TeamRemoved } from "../src/templates/TeamRemovedEmail";

export default class TeamRemovedEmail extends BaseEmail {
  event: TeamRemoved;
  constructor(event: TeamRemoved) {
    super();
    this.name = "SEND_TEAM_REMOVED_EMAIL";
    this.event = event;
  }

  protected async getNodeMailerPayload(): Promise<Record<string, unknown>> {
    return {
      to: this.event.to,
      from: `${EMAIL_FROM_NAME} <${this.getMailerOptions().from}>`,
      subject: this.event.language("email_team_removed|subject", {
        teamName: this.event.teamName,
      }),
      html: await renderEmail("TeamRemovedEmail", this.event),
      text: "",
    };
  }
}

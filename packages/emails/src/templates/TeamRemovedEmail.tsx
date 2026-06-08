import type { TFunction } from "i18next";

import { APP_NAME, WEBAPP_URL, IS_PRODUCTION } from "@calcom/lib/constants";

import { V2BaseEmailHtml } from "../components";

export type TeamRemoved = {
  language: TFunction;
  to: string;
  teamName: string;
};

export const TeamRemovedEmail = (
  props: TeamRemoved & Partial<React.ComponentProps<typeof V2BaseEmailHtml>>
) => {
  return (
    <V2BaseEmailHtml
      subject={props.language("email_team_removed|subject", {
        teamName: props.teamName,
      })}>
      <p style={{ fontSize: "24px", marginBottom: "16px", textAlign: "center" }}>
        <>{props.language("email_team_removed|heading")}</>
      </p>
      <img
        style={{
          borderRadius: "16px",
          height: "270px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
        src={
          IS_PRODUCTION
            ? `${WEBAPP_URL}/emails/calendar-email-hero.png`
            : "http://localhost:3000/emails/calendar-email-hero.png"
        }
        alt=""
      />
      <p
        style={{
          fontWeight: 400,
          lineHeight: "24px",
          marginBottom: "32px",
          marginTop: "32px",
          lineHeightStep: "24px",
        }}>
        <>
          {props.language("email_team_removed|content", {
            teamName: props.teamName,
            appName: APP_NAME,
          })}
        </>
      </p>

      <div style={{ borderTop: "1px solid #E1E1E1", marginTop: "32px", paddingTop: "32px" }}>
        <p style={{ fontWeight: 400, margin: 0 }}>
          <>
            {props.language("have_any_questions")}{" "}
            <a href="mailto:support@cal.com" style={{ color: "#3E3E3E" }} target="_blank" rel="noreferrer">
              <>{props.language("contact")}</>
            </a>{" "}
            {props.language("our_support_team")}
          </>
        </p>
      </div>
    </V2BaseEmailHtml>
  );
};

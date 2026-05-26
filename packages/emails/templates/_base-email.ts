import { decodeHTML } from "entities";
import { z } from "zod";

import dayjs from "@calcom/dayjs";
import { FeaturesRepository } from "@calcom/features/flags/features.repository";
import isSmsCalEmail from "@calcom/lib/isSmsCalEmail";
import { resendClient, serverConfig } from "@calcom/lib/serverConfig";
import { getServerErrorFromUnknown } from "@calcom/lib/server/getServerErrorFromUnknown";
import { setTestEmail } from "@calcom/lib/testEmails";
import { prisma } from "@calcom/prisma";

import { sanitizeDisplayName } from "../lib/sanitizeDisplayName";

export default class BaseEmail {
  name = "";

  protected getTimezone() {
    return "";
  }

  protected getLocale(): string {
    return "";
  }

  protected getFormattedRecipientTime({ time, format }: { time: string; format: string }) {
    return dayjs(time).tz(this.getTimezone()).locale(this.getLocale()).format(format);
  }

  protected async getNodeMailerPayload(): Promise<Record<string, unknown>> {
    return {};
  }

  public async sendEmail() {
    const featuresRepository = new FeaturesRepository(prisma);
    const emailsDisabled = await featuresRepository.checkIfFeatureIsEnabledGlobally("emails");
    /** If email kill switch exists and is active, we prevent emails being sent. */
    if (emailsDisabled) {
      console.warn("Skipped Sending Email due to active Kill Switch");
      return new Promise((r) => r("Skipped Sending Email due to active Kill Switch"));
    }

    if (process.env.INTEGRATION_TEST_MODE === "true") {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      //@ts-expect-error
      setTestEmail(await this.getNodeMailerPayload());
      console.log(
        "Skipped Sending Email as process.env.NEXT_PUBLIC_UNIT_TESTS is set. Emails are available in globalThis.testEmails"
      );
      return new Promise((r) => r("Skipped sendEmail for Unit Tests"));
    }

    const payload = await this.getNodeMailerPayload();

    const from = "from" in payload ? (payload.from as string) : "";
    const to = "to" in payload ? (payload.to as string) : "";

    if (isSmsCalEmail(to)) {
      console.log(`Skipped Sending Email to faux email: ${to}`);
      return new Promise((r) => r(`Skipped Sending Email to faux email: ${to}`));
    }

    const sanitizedFrom = sanitizeDisplayName(from);
    const sanitizedTo = sanitizeDisplayName(to);
    const parseSubject = z.string().safeParse(payload?.subject);
    const subject = parseSubject.success ? decodeHTML(parseSubject.data) : "";

    // Resend SDK path — used when RESEND_API_KEY is set
    if (resendClient) {
      const toAddresses = sanitizedTo
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      const { data, error } = await resendClient.emails
        .send({
          from: sanitizedFrom,
          to: toAddresses,
          subject,
          html: payload.html as string,
          ...(payload.text ? { text: payload.text as string } : {}),
        })
        .catch((e: Error) => {
          this.printNodeMailerError(e);
          return { data: null, error: e };
        });

      if (error) {
        console.error(
          "sendEmail via Resend",
          `from: ${sanitizedFrom}`,
          `to: ${sanitizedTo}`,
          `subject: ${subject}`,
          error
        );
      } else {
        console.log("sendEmail via Resend", `id: ${data?.id}`, `to: ${sanitizedTo}`);
      }

      return new Promise((resolve) => resolve("send mail async"));
    }

    // Nodemailer fallback — used when RESEND_API_KEY is not set
    const payloadWithUnEscapedSubject = {
      headers: this.getMailerOptions().headers,
      ...payload,
      ...{
        from: sanitizedFrom,
        to: sanitizedTo,
      },
      ...(parseSubject.success && { subject }),
    };
    const { createTransport } = await import("nodemailer");
    await new Promise((resolve, reject) =>
      createTransport(this.getMailerOptions().transport).sendMail(
        payloadWithUnEscapedSubject,
        (_err, info) => {
          if (_err) {
            const err = getServerErrorFromUnknown(_err);
            this.printNodeMailerError(err);
            reject(err);
          } else {
            resolve(info);
          }
        }
      )
    ).catch((e) =>
      console.error(
        "sendEmail",
        `from: ${"from" in payloadWithUnEscapedSubject ? payloadWithUnEscapedSubject.from : ""}`,
        `subject: ${"subject" in payloadWithUnEscapedSubject ? payloadWithUnEscapedSubject.subject : ""}`,
        e
      )
    );
    return new Promise((resolve) => resolve("send mail async"));
  }

  protected getMailerOptions() {
    return {
      transport: serverConfig.transport,
      from: serverConfig.from,
      headers: serverConfig.headers,
    };
  }

  protected printNodeMailerError(error: Error): void {
    /** Don't clog the logs with unsent emails in E2E */
    if (process.env.NEXT_PUBLIC_IS_E2E) return;
    console.error(`${this.name}_ERROR`, error);
  }
}

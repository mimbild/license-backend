import { Resend } from "resend";

import { env } from "../config/env";
import { ApiError } from "../utils/api-error";
import type { MailAdapter, MailMessage, MailSendResult } from "./mail-adapter";

export class ResendMailAdapter implements MailAdapter {
  private readonly client: Resend;

  constructor() {
    if (!env.RESEND_API_KEY) {
      throw new ApiError(500, "RESEND_API_KEY_MISSING", "RESEND_API_KEY is required");
    }

    this.client = new Resend(env.RESEND_API_KEY);
  }

  async send(message: MailMessage): Promise<MailSendResult> {
    const response = await this.client.emails.send({
      from: env.MAIL_FROM,
      to: message.to,
      subject: message.subject,
      html: message.html,
      text: message.text,
    });

    if (response.error) {
      throw new ApiError(502, "MAIL_DELIVERY_FAILED", response.error.message);
    }

    return {
      provider: "resend",
      providerId: response.data?.id,
    };
  }
}

import net from "net";

import type { MailAdapter, MailMessage, MailSendResult } from "./mail-adapter";

export class SmtpMailAdapter implements MailAdapter {
  async send(_message: MailMessage): Promise<MailSendResult> {
    void net;
    // TODO: Replace this placeholder with Nodemailer or a real SMTP client in production.
    return {
      provider: "smtp",
      providerId: "todo-smtp-provider-id",
    };
  }
}


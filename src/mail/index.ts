import { env } from "../config/env";
import type { MailAdapter } from "./mail-adapter";
import { ConsoleMailAdapter } from "./console-mail.adapter";
import { ResendMailAdapter } from "./resend-mail.adapter";
import { SmtpMailAdapter } from "./smtp-mail.adapter";

export function createMailAdapter(): MailAdapter {
  if (env.MAIL_MODE === "resend") {
    return new ResendMailAdapter();
  }

  if (env.MAIL_MODE === "smtp") {
    return new SmtpMailAdapter();
  }

  return new ConsoleMailAdapter();
}

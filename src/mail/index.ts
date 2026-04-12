import { env } from "../config/env";
import type { MailAdapter } from "./mail-adapter";
import { ConsoleMailAdapter } from "./console-mail.adapter";
import { SmtpMailAdapter } from "./smtp-mail.adapter";

export function createMailAdapter(): MailAdapter {
  if (env.MAIL_MODE === "smtp") {
    return new SmtpMailAdapter();
  }

  return new ConsoleMailAdapter();
}


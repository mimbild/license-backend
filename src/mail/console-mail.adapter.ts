import { logger } from "../config/logger";
import type { MailAdapter, MailMessage, MailSendResult } from "./mail-adapter";

export class ConsoleMailAdapter implements MailAdapter {
  async send(message: MailMessage): Promise<MailSendResult> {
    logger.info({ message }, "console mail delivery");
    return {
      provider: "console",
    };
  }
}


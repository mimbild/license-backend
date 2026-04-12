export type MailMessage = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

export type MailSendResult = {
  provider: string;
  providerId?: string;
};

export interface MailAdapter {
  send(message: MailMessage): Promise<MailSendResult>;
}


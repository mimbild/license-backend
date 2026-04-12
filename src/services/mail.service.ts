import { prisma } from "../config/prisma";
import { env } from "../config/env";
import { createMailAdapter } from "../mail";

const mailAdapter = createMailAdapter();

type MailTemplate =
  | "welcome"
  | "password_setup"
  | "activation_confirmation"
  | "trial_ending_soon"
  | "payment_failed"
  | "access_blocked"
  | "subscription_canceled";

const templateSubjects: Record<MailTemplate, string> = {
  welcome: "Welcome to your account",
  password_setup: "Set up your password",
  activation_confirmation: "Your device is activated",
  trial_ending_soon: "Your trial is ending soon",
  payment_failed: "Payment issue detected",
  access_blocked: "Access has been blocked",
  subscription_canceled: "Your subscription has been canceled",
};

export async function sendTemplatedEmail(input: {
  userId?: string;
  recipient: string;
  template: MailTemplate;
  variables?: Record<string, string | number | undefined>;
}) {
  const subject = templateSubjects[input.template];
  const html = renderTemplate(subject, input.variables);
  const text = `${subject}\n\n${JSON.stringify(input.variables ?? {}, null, 2)}`;

  const delivery = await mailAdapter.send({
    to: input.recipient,
    subject,
    html,
    text,
  });

  await prisma.emailLog.create({
    data: {
      userId: input.userId,
      recipient: input.recipient,
      template: input.template,
      subject,
      status: "SENT",
      provider: delivery.provider,
      providerId: delivery.providerId,
      sentAt: new Date(),
      metadata: {
        variables: input.variables ?? {},
        from: env.MAIL_FROM,
      },
    },
  });
}

function renderTemplate(title: string, variables?: Record<string, string | number | undefined>) {
  const lines = Object.entries(variables ?? {})
    .map(([key, value]) => `<li><strong>${key}</strong>: ${String(value ?? "")}</li>`)
    .join("");

  return `<h1>${title}</h1><p>This is the MVP mail adapter output.</p><ul>${lines}</ul>`;
}

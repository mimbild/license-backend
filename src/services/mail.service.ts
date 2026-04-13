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
  const html = renderTemplate(input.template, subject, input.variables);
  const text = renderPlainTextTemplate(input.template, subject, input.variables);

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

function renderTemplate(
  template: MailTemplate,
  title: string,
  variables?: Record<string, string | number | undefined>,
) {
  if (template === "password_setup") {
    return renderPasswordSetupTemplate({
      title,
      setupUrl: String(variables?.setupUrl ?? ""),
      expiresAt: String(variables?.expiresAt ?? ""),
    });
  }

  const lines = Object.entries(variables ?? {})
    .map(([key, value]) => `<li><strong>${key}</strong>: ${String(value ?? "")}</li>`)
    .join("");

  return `<h1>${title}</h1><p>This is the MVP mail adapter output.</p><ul>${lines}</ul>`;
}

function renderPlainTextTemplate(
  template: MailTemplate,
  title: string,
  variables?: Record<string, string | number | undefined>,
) {
  if (template === "password_setup") {
    const setupUrl = String(variables?.setupUrl ?? "");
    const expiresAt = String(variables?.expiresAt ?? "");

    return [
      title,
      "",
      "Welcome to StudioAutomation.",
      "Use the link below to set your password and finish setting up your account.",
      "",
      setupUrl,
      "",
      `This link expires at ${expiresAt}.`,
    ].join("\n");
  }

  return `${title}\n\n${JSON.stringify(variables ?? {}, null, 2)}`;
}

function renderPasswordSetupTemplate(input: {
  title: string;
  setupUrl: string;
  expiresAt: string;
}) {
  const expiresText = input.expiresAt ? formatMailDate(input.expiresAt) : "";

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(input.title)}</title>
  </head>
  <body style="margin:0;padding:0;background:#f3f4f4;font-family:'Poppins','Avenir Next','Helvetica Neue',Arial,sans-serif;color:#181716;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f3f4f4;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;background:#ffffff;border-radius:28px;overflow:hidden;border:1px solid rgba(18,18,18,0.08);box-shadow:0 24px 60px rgba(84,78,67,0.14);">
            <tr>
              <td style="padding:40px 40px 28px;background:linear-gradient(145deg,#d7d7d7,#aaaaaa);">
                <div style="display:inline-block;padding:8px 14px;border-radius:999px;background:rgba(255,255,255,0.72);color:#66615a;font-size:12px;letter-spacing:0.03em;">
                  StudioAutomation Account
                </div>
                <h1 style="margin:22px 0 14px;font-family:'Manrope','Avenir Next','Helvetica Neue',Arial,sans-serif;font-size:44px;line-height:0.98;letter-spacing:-0.04em;color:#181716;">
                  Set up your password
                </h1>
                <p style="margin:0;max-width:28ch;font-size:17px;line-height:1.65;color:#544f49;">
                  Finish setting up your account so you can sign in, view your license, and activate your software.
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:34px 40px 40px;">
                <p style="margin:0 0 18px;font-size:16px;line-height:1.7;color:#3d3935;">
                  Click the button below to choose your password and complete your account setup.
                </p>
                <table role="presentation" cellspacing="0" cellpadding="0" style="margin:0 0 22px;">
                  <tr>
                    <td>
                      <a href="${escapeHtml(input.setupUrl)}" style="display:inline-block;padding:15px 22px;border-radius:14px;background:linear-gradient(180deg,#c2c2c2,#aaaaaa);border:1px solid rgba(24,23,22,0.08);color:#181716;text-decoration:none;font-weight:700;font-size:15px;">
                        Set password
                      </a>
                    </td>
                  </tr>
                </table>
                <p style="margin:0 0 10px;font-size:14px;line-height:1.65;color:#66615a;">
                  If the button does not work, copy and paste this link into your browser:
                </p>
                <p style="margin:0 0 22px;font-size:14px;line-height:1.65;word-break:break-word;">
                  <a href="${escapeHtml(input.setupUrl)}" style="color:#2563eb;text-decoration:underline;">${escapeHtml(input.setupUrl)}</a>
                </p>
                <p style="margin:0;font-size:13px;line-height:1.65;color:#66615a;">
                  ${expiresText ? `This link expires at ${escapeHtml(expiresText)}.` : ""}
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatMailDate(isoDate: string) {
  return new Date(isoDate).toLocaleString("sv-SE", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/Stockholm",
  });
}

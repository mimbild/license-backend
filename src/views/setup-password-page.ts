type SetupPasswordPageInput =
  | {
      state: "form";
      token: string;
      email: string;
      name: string;
      expiresAt?: string;
      appBaseUrl: string;
      errorMessage?: string;
    }
  | {
      state: "success";
      email: string;
      name: string;
      appBaseUrl: string;
    }
  | {
      state: "invalid";
      appBaseUrl: string;
      errorMessage: string;
    };

export function renderSetupPasswordPage(input: SetupPasswordPageInput) {
  const title =
    input.state === "success"
      ? "Password set"
      : input.state === "invalid"
        ? "Link expired"
        : "Set up your password";

  const content =
    input.state === "form"
      ? renderFormState(input)
      : input.state === "success"
        ? renderSuccessState(input)
        : renderInvalidState(input);

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(title)} | ScanCTRL</title>
    <style>
      :root {
        --bg: #121212;
        --panel: rgba(28, 28, 31, 0.9);
        --panel-border: rgba(255, 255, 255, 0.08);
        --text: #f5f3ef;
        --muted: #b8b2aa;
        --accent: #cf3f2f;
        --accent-dark: #9f2f24;
        --success: #2d9d69;
        --danger: #d25b5b;
        --input: rgba(255, 255, 255, 0.06);
        --shadow: 0 30px 60px rgba(0, 0, 0, 0.35);
      }

      * {
        box-sizing: border-box;
      }

      body {
        margin: 0;
        min-height: 100vh;
        font-family: "Avenir Next", "Helvetica Neue", Helvetica, Arial, sans-serif;
        color: var(--text);
        background:
          radial-gradient(circle at top left, rgba(207, 63, 47, 0.22), transparent 32%),
          radial-gradient(circle at bottom right, rgba(255, 255, 255, 0.08), transparent 28%),
          linear-gradient(160deg, #0f0f10 0%, #171719 48%, #101113 100%);
        display: grid;
        place-items: center;
        padding: 32px 20px;
      }

      .shell {
        width: min(100%, 980px);
        display: grid;
        grid-template-columns: 1.1fr 1fr;
        background: var(--panel);
        border: 1px solid var(--panel-border);
        border-radius: 28px;
        overflow: hidden;
        box-shadow: var(--shadow);
        backdrop-filter: blur(18px);
      }

      .hero {
        padding: 42px;
        background:
          linear-gradient(180deg, rgba(255, 255, 255, 0.04), transparent),
          linear-gradient(145deg, #1a1a1d 0%, #121214 100%);
        position: relative;
      }

      .badge {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 8px 14px;
        border-radius: 999px;
        background: rgba(255, 255, 255, 0.08);
        color: var(--muted);
        font-size: 12px;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }

      .hero h1 {
        margin: 22px 0 14px;
        font-size: clamp(38px, 5vw, 60px);
        line-height: 0.95;
        letter-spacing: -0.04em;
      }

      .hero p {
        max-width: 36ch;
        color: var(--muted);
        font-size: 17px;
        line-height: 1.6;
      }

      .shape {
        margin-top: 48px;
        width: 180px;
        aspect-ratio: 1;
        border-radius: 28px;
        background:
          linear-gradient(160deg, rgba(207, 63, 47, 1), rgba(90, 24, 16, 0.92));
        display: grid;
        place-items: center;
        box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.2);
      }

      .shape::after {
        content: "";
        width: 88px;
        height: 88px;
        border-radius: 24px;
        border: 10px solid rgba(255, 255, 255, 0.85);
        border-top-left-radius: 40px;
        transform: rotate(8deg);
      }

      .panel {
        padding: 42px 36px;
        background: rgba(8, 8, 10, 0.44);
      }

      .panel h2 {
        margin: 0 0 8px;
        font-size: 28px;
        letter-spacing: -0.03em;
      }

      .eyebrow {
        margin: 0 0 26px;
        color: var(--muted);
        line-height: 1.6;
      }

      form {
        display: grid;
        gap: 16px;
      }

      label {
        display: grid;
        gap: 8px;
        font-size: 14px;
        color: var(--muted);
      }

      input {
        width: 100%;
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 14px;
        background: var(--input);
        color: var(--text);
        padding: 15px 16px;
        font-size: 15px;
        outline: none;
      }

      input:focus {
        border-color: rgba(207, 63, 47, 0.7);
        box-shadow: 0 0 0 4px rgba(207, 63, 47, 0.16);
      }

      .readonly {
        opacity: 0.72;
      }

      .button {
        appearance: none;
        border: 0;
        border-radius: 14px;
        background: linear-gradient(180deg, var(--accent), var(--accent-dark));
        color: white;
        padding: 16px 18px;
        font-size: 15px;
        font-weight: 700;
        cursor: pointer;
      }

      .button:hover {
        filter: brightness(1.05);
      }

      .meta {
        margin-top: 18px;
        font-size: 13px;
        color: var(--muted);
        line-height: 1.6;
      }

      .notice {
        margin-bottom: 18px;
        padding: 14px 15px;
        border-radius: 14px;
        line-height: 1.5;
        border: 1px solid rgba(255, 255, 255, 0.08);
      }

      .notice.error {
        background: rgba(210, 91, 91, 0.12);
        border-color: rgba(210, 91, 91, 0.35);
        color: #ffd2d2;
      }

      .notice.success {
        background: rgba(45, 157, 105, 0.14);
        border-color: rgba(45, 157, 105, 0.35);
        color: #d4ffe9;
      }

      a {
        color: #ff9d8c;
      }

      @media (max-width: 820px) {
        .shell {
          grid-template-columns: 1fr;
        }

        .hero,
        .panel {
          padding: 28px;
        }

        .shape {
          width: 132px;
          margin-top: 28px;
        }
      }
    </style>
  </head>
  <body>
    <main class="shell">
      <section class="hero">
        <div class="badge">ScanCTRL account setup</div>
        <h1>${escapeHtml(title)}</h1>
        <p>
          Finish setting up your account so you can sign in, manage your license, and activate
          your desktop software with your backend-backed subscription.
        </p>
        <div class="shape" aria-hidden="true"></div>
      </section>
      <section class="panel">
        ${content}
      </section>
    </main>
  </body>
</html>`;
}

function renderFormState(input: Extract<SetupPasswordPageInput, { state: "form" }>) {
  return `
    <h2>Create your password</h2>
    <p class="eyebrow">
      This account is linked to <strong>${escapeHtml(input.email)}</strong>. Set a password once
      and then sign in normally from your app.
    </p>
    ${input.errorMessage ? `<div class="notice error">${escapeHtml(input.errorMessage)}</div>` : ""}
    <form method="post" action="/setup-password">
      <input type="hidden" name="token" value="${escapeHtml(input.token)}" />
      <label>
        Email
        <input class="readonly" type="email" value="${escapeHtml(input.email)}" readonly />
      </label>
      <label>
        Name
        <input type="text" name="name" value="${escapeHtml(input.name)}" placeholder="Your name" />
      </label>
      <label>
        New password
        <input type="password" name="password" minlength="8" required placeholder="At least 8 characters" />
      </label>
      <label>
        Confirm password
        <input type="password" name="confirmPassword" minlength="8" required placeholder="Repeat your password" />
      </label>
      <button class="button" type="submit">Set password</button>
    </form>
    <p class="meta">
      ${input.expiresAt ? `This link expires at ${escapeHtml(formatDisplayDate(input.expiresAt))}.<br />` : ""}
      After this step, open your app and sign in with your email and password.
    </p>
  `;
}

function renderSuccessState(input: Extract<SetupPasswordPageInput, { state: "success" }>) {
  return `
    <h2>Password saved</h2>
    <div class="notice success">
      Your password is now set for <strong>${escapeHtml(input.email)}</strong>.
    </div>
    <p class="eyebrow">
      You're ready to sign in from your desktop app and use your license.
    </p>
    <p class="meta">
      You can now return to the app and sign in with your new password.
    </p>
  `;
}

function renderInvalidState(input: Extract<SetupPasswordPageInput, { state: "invalid" }>) {
  return `
    <h2>Link unavailable</h2>
    <div class="notice error">${escapeHtml(input.errorMessage)}</div>
    <p class="eyebrow">
      This setup link can no longer be used. Request a new password setup email and try again.
    </p>
    <p class="meta">
      If you already completed setup, just return to your app and sign in normally.
    </p>
  `;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatDisplayDate(isoDate: string) {
  return new Date(isoDate).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

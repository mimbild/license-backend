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
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
      href="https://fonts.googleapis.com/css2?family=Manrope:wght@600;700;800&family=Poppins:wght@400;500;600&display=swap"
      rel="stylesheet"
    />
    <style>
      :root {
        --bg: #f3f4f4;
        --panel: rgba(255, 255, 255, 0.92);
        --panel-border: rgba(18, 18, 18, 0.09);
        --panel-alt: rgba(255, 255, 255, 0.8);
        --text: #181716;
        --muted: #66615a;
        --accent: #b9b9b9;
        --accent-dark: #aaaaaa;
        --success: #2d9d69;
        --danger: #a45353;
        --input: rgba(255, 255, 255, 0.84);
        --shadow: 0 30px 80px rgba(84, 78, 67, 0.18);
      }

      * {
        box-sizing: border-box;
      }

      body {
        margin: 0;
        min-height: 100vh;
        font-family: "Poppins", "Avenir Next", "Helvetica Neue", Helvetica, Arial, sans-serif;
        color: var(--text);
        background:
          radial-gradient(circle at top left, rgba(176, 173, 167, 0.38), transparent 30%),
          radial-gradient(circle at 80% 20%, rgba(255, 255, 255, 0.85), transparent 26%),
          linear-gradient(160deg, #f7f7f7, #f3f4f4 52%, #eceeee);
        padding: 32px 20px;
      }

      .shell {
        width: min(100%, 1080px);
        margin: 0 auto;
        display: grid;
        grid-template-columns: 0.92fr 1.28fr;
        background: var(--panel);
        border: 1px solid var(--panel-border);
        border-radius: 30px;
        overflow: hidden;
        box-shadow: var(--shadow);
      }

      .hero {
        padding: 38px;
        background:
          linear-gradient(180deg, rgba(255,255,255,0.72), rgba(255,255,255,0.08)),
          linear-gradient(145deg, #c5c5c5, #aaaaaa 62%, #9f9f9f);
      }

      .badge {
        display: inline-block;
        padding: 8px 14px;
        border-radius: 999px;
        background: rgba(255,255,255,0.68);
        color: var(--muted);
        font-size: 12px;
        letter-spacing: 0.03em;
      }

      .hero h1 {
        font-family: "Manrope", "Avenir Next", "Helvetica Neue", Helvetica, Arial, sans-serif;
        margin: 22px 0 14px;
        font-size: clamp(40px, 5vw, 64px);
        line-height: 0.95;
        letter-spacing: -0.045em;
      }

      .hero p {
        max-width: 28ch;
        color: var(--muted);
        font-size: 17px;
        line-height: 1.65;
      }

      .mark {
        width: 172px;
        margin-top: 36px;
        display: block;
      }

      .panel {
        padding: 34px;
        background: var(--panel-alt);
      }

      .panel h2 {
        margin: 0 0 8px;
        font-family: "Manrope", "Avenir Next", "Helvetica Neue", Helvetica, Arial, sans-serif;
        font-size: 30px;
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
        border: 1px solid rgba(18, 18, 18, 0.09);
        border-radius: 14px;
        background: var(--input);
        color: var(--text);
        padding: 15px 16px;
        font-size: 15px;
        outline: none;
      }

      input:focus {
        border-color: rgba(170, 170, 170, 0.8);
        box-shadow: 0 0 0 4px rgba(170, 170, 170, 0.18);
      }

      .readonly {
        opacity: 0.74;
      }

      .button {
        appearance: none;
        border: 1px solid rgba(18, 18, 18, 0.08);
        border-radius: 14px;
        background: linear-gradient(180deg, var(--accent), var(--accent-dark));
        color: #22201d;
        padding: 16px 18px;
        font-size: 15px;
        font-weight: 500;
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
        border: 1px solid rgba(18, 18, 18, 0.08);
      }

      .notice.error {
        background: rgba(164, 83, 83, 0.12);
        border-color: rgba(164, 83, 83, 0.24);
        color: #7b3232;
      }

      .notice.success {
        background: rgba(45, 157, 105, 0.14);
        border-color: rgba(45, 157, 105, 0.35);
        color: #1d6a46;
      }

      a {
        color: #5f5a53;
      }

      @media (max-width: 820px) {
        .shell {
          grid-template-columns: 1fr;
        }

        .hero,
        .panel {
          padding: 28px;
        }

        .mark {
          width: 132px;
          margin-top: 28px;
        }
      }
    </style>
  </head>
  <body>
    <main class="shell">
      <section class="hero">
        <div class="badge">StudioAutomation Account</div>
        <h1>${escapeHtml(title)}</h1>
        <p>
          Finish setting up your account so you can sign in, view your licenses, and manage your
          desktop access from the same place.
        </p>
        <img class="mark" src="/brand/ScanCTRL.png" alt="StudioAutomation logo" />
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

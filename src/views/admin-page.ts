import type { LicenseActivation, UserRole } from "@prisma/client";

type AdminDashboardData = {
  user: {
    id: string;
    email: string;
    role: UserRole;
    name: string | null;
    createdAt: Date;
  };
  subscriptions: Array<{
    id: string;
    provider: string;
    status: string;
    providerOrderId: string | null;
    createdAt: Date;
    planName: string;
    productName: string;
  }>;
  licenses: Array<{
    id: string;
    licenseKey: string;
    status: string;
    productName: string;
    subscriptionStatus: string | null;
    activations: LicenseActivation[];
  }>;
};

export function renderAdminLoginPage(input: {
  email?: string;
  errorMessage?: string;
  notice?: string;
}) {
  return renderAdminShell({
    title: "Admin sign in",
    lead: "Sign in to search customers, inspect subscriptions, and handle support actions quickly.",
    panel: `
      <h2>Admin sign in</h2>
      <p class="eyebrow">Use your admin account to manage customers, licenses, and subscription issues.</p>
      ${input.notice ? `<div class="notice success">${escapeHtml(input.notice)}</div>` : ""}
      ${input.errorMessage ? `<div class="notice error">${escapeHtml(input.errorMessage)}</div>` : ""}
      <form method="post" action="/admin/login">
        <label>
          Email
          <input type="email" name="email" value="${escapeHtml(input.email ?? "")}" required />
        </label>
        <label>
          Password
          <input type="password" name="password" minlength="8" required />
        </label>
        <button class="button" type="submit">Sign in</button>
      </form>
    `,
  });
}

export function renderAdminDashboardPage(input: {
  adminEmail: string;
  searchEmail?: string;
  result?: AdminDashboardData | null;
  errorMessage?: string;
  notice?: string;
  syncMessage?: string;
}) {
  const resultMarkup =
    input.result === undefined
      ? `<div class="empty">Search for a customer by email to view subscriptions, licenses, and active devices.</div>`
      : input.result === null
        ? `<div class="empty">No customer matched that email address.</div>`
        : renderUserResult(input.result);

  return renderAdminShell({
    title: "Admin dashboard",
    lead: "Search for a customer, resend access setup, release devices, and run a manual Squarespace sync when needed.",
    panel: `
      <div class="topbar">
        <div>
          <h2>Admin dashboard</h2>
          <p class="eyebrow">${escapeHtml(input.adminEmail)}</p>
        </div>
        <form method="post" action="/admin/logout">
          <button class="button ghost" type="submit">Sign out</button>
        </form>
      </div>
      ${input.notice ? `<div class="notice success">${escapeHtml(input.notice)}</div>` : ""}
      ${input.errorMessage ? `<div class="notice error">${escapeHtml(input.errorMessage)}</div>` : ""}
      ${input.syncMessage ? `<div class="notice success">${escapeHtml(input.syncMessage)}</div>` : ""}
      <div class="admin-grid">
        <section class="section-card">
          <h3>Customer search</h3>
          <form method="get" action="/admin/dashboard">
            <label>
              Customer email
              <input
                type="email"
                name="email"
                value="${escapeHtml(input.searchEmail ?? "")}"
                placeholder="customer@example.com"
                required
              />
            </label>
            <button class="button" type="submit">Search</button>
          </form>
        </section>
        <section class="section-card">
          <h3>Squarespace sync</h3>
          <p class="meta">Run an on-demand sync if you need to pull in a recent order immediately.</p>
          <form method="post" action="/admin/sync/squarespace">
            <label>
              Order fetch limit
              <input type="number" min="1" max="100" name="limit" value="20" required />
            </label>
            <button class="button" type="submit">Run sync</button>
          </form>
        </section>
      </div>
      <section class="results">
        ${resultMarkup}
      </section>
    `,
  });
}

function renderUserResult(result: AdminDashboardData) {
  const subscriptions = result.subscriptions.length
    ? result.subscriptions
        .map(
          (subscription) => `
            <article class="result-card">
              <div class="result-header">
                <div>
                  <strong>${escapeHtml(subscription.productName)}</strong>
                  <div class="muted">${escapeHtml(subscription.planName)}</div>
                </div>
                <div class="pill">${escapeHtml(subscription.status)}</div>
              </div>
              <div class="detail-list">
                <div><strong>Provider:</strong> ${escapeHtml(subscription.provider)}</div>
                <div><strong>Order:</strong> ${escapeHtml(subscription.providerOrderId ?? "n/a")}</div>
                <div><strong>ID:</strong> ${escapeHtml(subscription.id)}</div>
              </div>
            </article>
          `,
        )
        .join("")
    : `<div class="empty compact">No subscriptions on this account yet.</div>`;

  const licenses = result.licenses.length
    ? result.licenses
        .map(
          (license) => `
            <article class="result-card">
              <div class="result-header">
                <div>
                  <strong>${escapeHtml(license.productName)}</strong>
                  <div class="muted">${escapeHtml(license.status)}</div>
                </div>
                <div class="pill">${escapeHtml(license.subscriptionStatus ?? "NO_SUBSCRIPTION")}</div>
              </div>
              <div class="key-block">
                <span>License key</span>
                <code>${escapeHtml(license.licenseKey)}</code>
              </div>
              ${
                license.activations.filter((activation) => activation.status === "ACTIVE").length === 0
                  ? `<div class="empty compact">No active device.</div>`
                  : license.activations
                      .filter((activation) => activation.status === "ACTIVE")
                      .map(
                        (activation) => `
                          <div class="device-row">
                            <div>
                              <strong>${escapeHtml(activation.deviceName ?? "Unnamed device")}</strong>
                              <div class="muted">${escapeHtml(activation.deviceFingerprint)}</div>
                            </div>
                            <form method="post" action="/admin/licenses/${encodeURIComponent(license.licenseKey)}/release-device">
                              <input type="hidden" name="deviceFingerprint" value="${escapeHtml(activation.deviceFingerprint)}" />
                              <button class="button danger" type="submit">Release device</button>
                            </form>
                          </div>
                        `,
                      )
                      .join("")
              }
            </article>
          `,
        )
        .join("")
    : `<div class="empty compact">No licenses found for this account.</div>`;

  return `
    <div class="user-summary">
      <div>
        <h3>${escapeHtml(result.user.name ?? result.user.email)}</h3>
        <p class="eyebrow">${escapeHtml(result.user.email)} · ${escapeHtml(result.user.role)}</p>
      </div>
      <form method="post" action="/admin/users/${encodeURIComponent(result.user.id)}/send-password-setup">
        <button class="button" type="submit">Send password setup email</button>
      </form>
    </div>
    <div class="admin-grid stack">
      <section class="section-card">
        <h3>Subscriptions</h3>
        ${subscriptions}
      </section>
      <section class="section-card">
        <h3>Licenses & devices</h3>
        ${licenses}
      </section>
    </div>
  `;
}

function renderAdminShell(input: { title: string; lead: string; panel: string }) {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(input.title)} | StudioAutomation</title>
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
        --panel-alt: rgba(255, 255, 255, 0.8);
        --text: #181716;
        --muted: #66615a;
        --accent: #b9b9b9;
        --accent-dark: #aaaaaa;
        --danger: #8f5454;
        --success: #2d9d69;
        --border: rgba(18, 18, 18, 0.09);
        --shadow: 0 30px 80px rgba(84, 78, 67, 0.18);
      }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        min-height: 100vh;
        font-family: "Poppins", "Avenir Next", "Helvetica Neue", Helvetica, Arial, sans-serif;
        color: var(--text);
        background:
          radial-gradient(circle at top left, rgba(176, 173, 167, 0.38), transparent 30%),
          radial-gradient(circle at 80% 20%, rgba(255,255,255,0.85), transparent 26%),
          linear-gradient(160deg, #f7f7f7, #f3f4f4 52%, #eceeee);
        padding: 32px 20px;
      }
      .shell {
        width: min(1200px, 100%);
        margin: 0 auto;
        display: grid;
        grid-template-columns: 0.92fr 1.28fr;
        border-radius: 30px;
        overflow: hidden;
        background: var(--panel);
        border: 1px solid var(--border);
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
        letter-spacing: 0.03em;
        font-size: 12px;
      }
      .hero h1 {
        font-family: "Manrope", "Avenir Next", "Helvetica Neue", Helvetica, Arial, sans-serif;
        font-size: clamp(40px, 5vw, 64px);
        line-height: 0.95;
        letter-spacing: -0.045em;
        margin: 20px 0 14px;
      }
      .hero p {
        font-size: 17px;
        line-height: 1.65;
        color: var(--muted);
        max-width: 28ch;
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
      h2, h3 {
        margin: 0;
        font-family: "Manrope", "Avenir Next", "Helvetica Neue", Helvetica, Arial, sans-serif;
        letter-spacing: -0.03em;
      }
      .panel h2 { font-size: 30px; }
      h3 { font-size: 22px; margin-bottom: 12px; }
      .eyebrow, .meta, .muted { color: var(--muted); }
      .eyebrow { line-height: 1.6; margin: 8px 0 24px; }
      .meta, .muted { font-size: 14px; line-height: 1.55; }
      form { display: grid; gap: 16px; }
      label { display: grid; gap: 8px; color: var(--muted); font-size: 14px; }
      input {
        width: 100%;
        border: 1px solid rgba(18, 18, 18, 0.09);
        border-radius: 14px;
        background: rgba(255,255,255,0.84);
        color: var(--text);
        padding: 15px 16px;
        font-size: 15px;
        outline: none;
      }
      input:focus {
        border-color: rgba(170,170,170,0.8);
        box-shadow: 0 0 0 4px rgba(170,170,170,0.18);
      }
      .button {
        appearance: none;
        border: 1px solid rgba(18,18,18,0.08);
        border-radius: 14px;
        background: linear-gradient(180deg, var(--accent), var(--accent-dark));
        color: #22201d;
        padding: 16px 18px;
        font-size: 15px;
        font-weight: 500;
        cursor: pointer;
      }
      .button.ghost {
        background: rgba(255,255,255,0.78);
      }
      .button.danger {
        background: linear-gradient(180deg, #c9b4b4, #b89090);
      }
      .notice {
        margin-bottom: 18px;
        padding: 14px 15px;
        border-radius: 14px;
        line-height: 1.5;
        border: 1px solid rgba(18,18,18,0.08);
      }
      .notice.error {
        background: rgba(164,83,83,0.12);
        border-color: rgba(164,83,83,0.24);
        color: #7b3232;
      }
      .notice.success {
        background: rgba(45,157,105,0.14);
        border-color: rgba(45,157,105,0.35);
        color: #1d6a46;
      }
      .topbar, .user-summary, .result-header, .device-row {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 16px;
      }
      .admin-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 18px;
      }
      .admin-grid.stack {
        margin-top: 18px;
      }
      .section-card, .result-card {
        background: rgba(255,255,255,0.84);
        border: 1px solid var(--border);
        border-radius: 20px;
        padding: 20px;
      }
      .results { margin-top: 22px; }
      .empty {
        padding: 22px;
        border-radius: 18px;
        border: 1px dashed rgba(18,18,18,0.16);
        color: var(--muted);
        background: rgba(255,255,255,0.55);
      }
      .empty.compact {
        padding: 16px;
        margin-top: 10px;
      }
      .detail-list {
        display: grid;
        gap: 8px;
        margin-top: 14px;
        font-size: 14px;
        color: var(--muted);
      }
      .key-block {
        margin-top: 16px;
        padding: 14px;
        border-radius: 16px;
        background: #f7f5f1;
        border: 1px solid rgba(18,18,18,0.06);
      }
      .key-block span {
        display: block;
        font-size: 12px;
        color: var(--muted);
        margin-bottom: 6px;
      }
      code {
        font-size: 14px;
        word-break: break-all;
      }
      .pill {
        padding: 8px 12px;
        border-radius: 999px;
        background: rgba(255,255,255,0.68);
        color: var(--muted);
        font-size: 12px;
      }
      @media (max-width: 920px) {
        .shell { grid-template-columns: 1fr; }
        .admin-grid { grid-template-columns: 1fr; }
        .hero, .panel { padding: 28px; }
        .mark { width: 132px; margin-top: 28px; }
        .topbar, .user-summary, .result-header, .device-row {
          flex-direction: column;
          align-items: stretch;
        }
      }
    </style>
  </head>
  <body>
    <main class="shell">
      <section class="hero">
        <div class="badge">StudioAutomation Admin</div>
        <h1>${escapeHtml(input.title)}</h1>
        <p>${escapeHtml(input.lead)}</p>
        <img class="mark" src="/brand/ScanCTRL.png" alt="StudioAutomation logo" />
      </section>
      <section class="panel">${input.panel}</section>
    </main>
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

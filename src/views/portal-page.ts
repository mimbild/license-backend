import type { License, LicenseActivation, Product, Subscription, UserRole } from "@prisma/client";

type PortalLicense = License & {
  product: Product;
  subscription: Subscription | null;
  activations: LicenseActivation[];
};

export function renderPortalLoginPage(input: {
  appBaseUrl: string;
  email?: string;
  errorMessage?: string;
  notice?: string;
}) {
  return renderShell({
    title: "Sign in",
    lead: "Use your account to view your licenses and manage device activations.",
    panel: `
      <h2>Account sign in</h2>
      <p class="eyebrow">Sign in to view your license keys and release an old device if needed.</p>
      ${input.notice ? `<div class="notice success">${escapeHtml(input.notice)}</div>` : ""}
      ${input.errorMessage ? `<div class="notice error">${escapeHtml(input.errorMessage)}</div>` : ""}
      <form method="post" action="/portal/login">
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
      <p class="meta">
        Need access for the first time? Use the password setup link from your email first.
      </p>
    `,
  });
}

export function renderPortalAccountPage(input: {
  appBaseUrl: string;
  email: string;
  role: UserRole;
  licenses: PortalLicense[];
  releaseMessage?: string;
}) {
  const licenseCards =
    input.licenses.length === 0
      ? `<div class="empty">No licenses found on this account yet.</div>`
      : input.licenses.map(renderLicenseCard).join("");

  return renderShell({
    title: "My licenses",
    lead: "Your account is the source of truth for license access and active devices.",
    panel: `
      <div class="topbar">
        <div>
          <h2>My licenses</h2>
          <p class="eyebrow">${escapeHtml(input.email)}${input.role === "ADMIN" ? " · admin access" : ""}</p>
        </div>
        <form method="post" action="/portal/logout">
          <button class="button ghost" type="submit">Sign out</button>
        </form>
      </div>
      ${input.releaseMessage ? `<div class="notice success">${escapeHtml(input.releaseMessage)}</div>` : ""}
      <div class="license-grid">
        ${licenseCards}
      </div>
    `,
  });
}

function renderLicenseCard(license: PortalLicense) {
  const activeActivations = license.activations.filter((item) => item.status === "ACTIVE");
  const releasedActivations = license.activations.filter((item) => item.status === "RELEASED");

  return `
    <article class="license-card">
      <div class="license-header">
        <div>
          <div class="product-name">${escapeHtml(license.product.name)}</div>
          <div class="product-meta">${escapeHtml(license.product.slug)} · ${escapeHtml(license.status)}</div>
        </div>
        <div class="pill">${escapeHtml(license.subscription?.status ?? "NO_SUBSCRIPTION")}</div>
      </div>

      <div class="key-block">
        <span>License key</span>
        <code>${escapeHtml(license.licenseKey)}</code>
      </div>

      <div class="detail-list">
        <div><strong>Seats:</strong> ${license.maxActivations}</div>
        <div><strong>Current access:</strong> ${escapeHtml(license.subscription?.status ?? "Unavailable")}</div>
        <div><strong>Order:</strong> ${escapeHtml(license.subscription?.providerOrderId ?? "n/a")}</div>
      </div>

      <section class="device-section">
        <h3>Active device${activeActivations.length === 1 ? "" : "s"}</h3>
        ${
          activeActivations.length === 0
            ? `<p class="muted">No active device yet. The first app activation will appear here.</p>`
            : activeActivations
                .map(
                  (activation) => `
                    <div class="device-row">
                      <div>
                        <strong>${escapeHtml(activation.deviceName ?? "Unnamed device")}</strong>
                        <div class="muted">${escapeHtml(activation.deviceFingerprint)}</div>
                      </div>
                      <form method="post" action="/portal/licenses/${encodeURIComponent(license.licenseKey)}/release">
                        <input type="hidden" name="deviceFingerprint" value="${escapeHtml(activation.deviceFingerprint)}" />
                        <button class="button danger" type="submit">Release device</button>
                      </form>
                    </div>
                  `,
                )
                .join("")
        }
      </section>

      ${
        releasedActivations.length > 0
          ? `<section class="device-section history">
              <h3>Previously released</h3>
              ${releasedActivations
                .map(
                  (activation) => `
                    <div class="history-row">
                      <span>${escapeHtml(activation.deviceName ?? "Unnamed device")}</span>
                      <span>${escapeHtml(activation.releasedAt?.toISOString() ?? "")}</span>
                    </div>
                  `,
                )
                .join("")}
            </section>`
          : ""
      }
    </article>
  `;
}

function renderShell(input: { title: string; lead: string; panel: string }) {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(input.title)} | ScanCTRL</title>
    <style>
      :root {
        --bg: #101113;
        --panel: rgba(22, 22, 25, 0.92);
        --panel-alt: rgba(255, 255, 255, 0.03);
        --text: #f5f3ef;
        --muted: #b8b2aa;
        --accent: #cf3f2f;
        --accent-dark: #8c241a;
        --danger: #aa3d3d;
        --success: #2d9d69;
        --border: rgba(255, 255, 255, 0.08);
        --shadow: 0 32px 80px rgba(0, 0, 0, 0.35);
      }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        min-height: 100vh;
        font-family: "Avenir Next", "Helvetica Neue", Helvetica, Arial, sans-serif;
        color: var(--text);
        background:
          radial-gradient(circle at top left, rgba(207, 63, 47, 0.22), transparent 32%),
          radial-gradient(circle at 80% 20%, rgba(255,255,255,0.08), transparent 24%),
          linear-gradient(160deg, #0c0d0f, #17181a 52%, #101214);
        padding: 32px 20px;
      }
      .shell {
        width: min(1100px, 100%);
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
          linear-gradient(180deg, rgba(255,255,255,0.04), transparent),
          linear-gradient(145deg, #1a1a1c, #111214);
      }
      .badge {
        display: inline-block;
        padding: 8px 14px;
        border-radius: 999px;
        background: rgba(255,255,255,0.08);
        color: var(--muted);
        text-transform: uppercase;
        letter-spacing: 0.08em;
        font-size: 12px;
      }
      .hero h1 {
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
        width: 170px;
        aspect-ratio: 1;
        margin-top: 42px;
        border-radius: 28px;
        background: linear-gradient(160deg, var(--accent), #651710);
        display: grid;
        place-items: center;
      }
      .mark::after {
        content: "";
        width: 82px;
        height: 82px;
        border-radius: 22px;
        border: 10px solid rgba(255,255,255,0.86);
        border-top-left-radius: 38px;
      }
      .panel {
        padding: 34px;
        background: rgba(10, 10, 12, 0.55);
      }
      .panel h2 {
        margin: 0;
        font-size: 30px;
        letter-spacing: -0.03em;
      }
      .eyebrow, .meta, .muted {
        color: var(--muted);
      }
      .eyebrow {
        line-height: 1.6;
        margin: 8px 0 24px;
      }
      .meta, .muted {
        font-size: 14px;
        line-height: 1.55;
      }
      form {
        display: grid;
        gap: 16px;
      }
      label {
        display: grid;
        gap: 8px;
        color: var(--muted);
        font-size: 14px;
      }
      input {
        width: 100%;
        border: 1px solid var(--border);
        border-radius: 14px;
        background: rgba(255,255,255,0.06);
        color: var(--text);
        padding: 15px 16px;
        font-size: 15px;
      }
      .button {
        appearance: none;
        border: 0;
        border-radius: 14px;
        padding: 14px 18px;
        cursor: pointer;
        color: white;
        font-size: 14px;
        font-weight: 700;
        background: linear-gradient(180deg, var(--accent), var(--accent-dark));
      }
      .button.ghost {
        background: rgba(255,255,255,0.08);
      }
      .button.danger {
        background: linear-gradient(180deg, var(--danger), #7c2525);
      }
      .notice {
        margin-bottom: 18px;
        padding: 14px 15px;
        border-radius: 14px;
        border: 1px solid var(--border);
      }
      .notice.success {
        background: rgba(45,157,105,0.14);
        border-color: rgba(45,157,105,0.36);
        color: #d7ffea;
      }
      .notice.error {
        background: rgba(210,91,91,0.12);
        border-color: rgba(210,91,91,0.35);
        color: #ffd4d4;
      }
      .topbar {
        display: flex;
        justify-content: space-between;
        gap: 18px;
        align-items: start;
        margin-bottom: 18px;
      }
      .license-grid {
        display: grid;
        gap: 18px;
      }
      .license-card {
        background: var(--panel-alt);
        border: 1px solid var(--border);
        border-radius: 22px;
        padding: 20px;
      }
      .license-header {
        display: flex;
        justify-content: space-between;
        gap: 16px;
        align-items: start;
      }
      .product-name {
        font-size: 22px;
        letter-spacing: -0.03em;
      }
      .product-meta {
        color: var(--muted);
        margin-top: 4px;
      }
      .pill {
        padding: 8px 12px;
        border-radius: 999px;
        background: rgba(255,255,255,0.08);
        font-size: 12px;
        text-transform: uppercase;
        letter-spacing: 0.08em;
      }
      .key-block {
        margin: 18px 0;
        padding: 16px;
        border-radius: 16px;
        background: rgba(0,0,0,0.22);
        border: 1px solid var(--border);
      }
      .key-block span {
        display: block;
        color: var(--muted);
        font-size: 13px;
        margin-bottom: 8px;
      }
      .key-block code {
        font-size: 18px;
        letter-spacing: 0.06em;
        word-break: break-all;
      }
      .detail-list {
        display: grid;
        gap: 8px;
        margin-bottom: 18px;
        color: var(--muted);
      }
      .device-section {
        margin-top: 18px;
        padding-top: 18px;
        border-top: 1px solid var(--border);
      }
      .device-section h3 {
        margin: 0 0 14px;
        font-size: 17px;
      }
      .device-row, .history-row {
        display: flex;
        justify-content: space-between;
        gap: 16px;
        align-items: center;
        padding: 12px 0;
      }
      .history-row {
        color: var(--muted);
        font-size: 14px;
      }
      .empty {
        padding: 26px;
        border-radius: 20px;
        background: var(--panel-alt);
        border: 1px solid var(--border);
        color: var(--muted);
      }
      @media (max-width: 920px) {
        .shell { grid-template-columns: 1fr; }
        .hero, .panel { padding: 28px; }
        .license-header, .device-row, .topbar, .history-row { flex-direction: column; align-items: stretch; }
        .mark { width: 130px; margin-top: 28px; }
      }
    </style>
  </head>
  <body>
    <main class="shell">
      <section class="hero">
        <span class="badge">ScanCTRL account</span>
        <h1>${escapeHtml(input.title)}</h1>
        <p>${escapeHtml(input.lead)}</p>
        <div class="mark" aria-hidden="true"></div>
      </section>
      <section class="panel">
        ${input.panel}
      </section>
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

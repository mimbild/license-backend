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

type AdminListUser = {
  id: string;
  email: string;
  role: UserRole;
  name: string | null;
  createdAt: Date;
  subscriptions: Array<{
    provider: string;
    status: string;
  }>;
  _count: {
    subscriptions: number;
    licenses: number;
  };
};

export function renderAdminLoginPage(input: {
  email?: string;
  errorMessage?: string;
  notice?: string;
}) {
  return renderAdminLoginShell({
    title: "Admin sign in",
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
  provider?: string;
  status?: string;
  users: AdminListUser[];
  selectedUserId?: string;
  result?: AdminDashboardData | null;
  errorMessage?: string;
  notice?: string;
  syncMessage?: string;
}) {
  const userListMarkup = input.users.length
    ? input.users
        .map((user, index) => {
          const currentSubscription = user.subscriptions[0];
          const isActive = input.selectedUserId === user.id && input.result?.user.id === user.id;
          const href = buildDashboardHref({
            email: input.searchEmail,
            provider: input.provider,
            status: input.status,
            userId: isActive ? undefined : user.id,
          });

          return `
            <a class="table-row${isActive ? " active" : ""}" href="${href}">
              <span class="row-number">${index + 1}</span>
              <span>
                <strong>${escapeHtml(user.name ?? "Unnamed user")}</strong>
                <small>${escapeHtml(user.email)}</small>
              </span>
              <span>${escapeHtml(currentSubscription?.provider ?? "—")}</span>
              <span>${escapeHtml(currentSubscription?.status ?? "—")}</span>
              <span>${user._count.subscriptions}</span>
              <span>${user._count.licenses}</span>
            </a>
            ${
              isActive
                ? `<div class="expanded-row">${renderExpandedUser(input.result!, {
                    email: input.searchEmail,
                    provider: input.provider,
                    status: input.status,
                  })}</div>`
                : ""
            }
          `;
        })
        .join("")
    : `<div class="empty compact">No users matched your search.</div>`;

  return renderAdminDashboardShell({
    title: "Admin dashboard",
    adminEmail: input.adminEmail,
    panel: `
      ${input.notice ? `<div class="notice success">${escapeHtml(input.notice)}</div>` : ""}
      ${input.errorMessage ? `<div class="notice error">${escapeHtml(input.errorMessage)}</div>` : ""}
      ${input.syncMessage ? `<div class="notice success">${escapeHtml(input.syncMessage)}</div>` : ""}

      <section class="toolbar">
        <form class="toolbar-form search-form" method="get" action="/admin/dashboard">
          <label class="field field-wide">
            <span>Email</span>
            <input
              type="text"
              name="email"
              value="${escapeHtml(input.searchEmail ?? "")}"
              placeholder="Search by email"
            />
          </label>
          <label class="field">
            <span>Provider</span>
            <select name="provider">
              ${renderSelectOptions(
                ["", "SQUARESPACE", "APPLE_APP_STORE", "GOOGLE_PLAY", "MANUAL", "SEED"],
                input.provider,
              )}
            </select>
          </label>
          <label class="field">
            <span>Status</span>
            <select name="status">
              ${renderSelectOptions(
                ["", "TRIALING", "ACTIVE", "PAST_DUE", "CANCELED", "EXPIRED"],
                input.status,
              )}
            </select>
          </label>
          <button class="button" type="submit">Search</button>
        </form>

        <form class="toolbar-form sync-form" method="post" action="/admin/sync/squarespace">
          <label class="field">
            <span>Sync limit</span>
            <input type="number" min="1" max="100" name="limit" value="20" required />
          </label>
          <button class="button" type="submit">Run sync</button>
        </form>
      </section>

      <section class="table-card">
        <div class="table-header">
          <span>#</span>
          <span>User</span>
          <span>Provider</span>
          <span>Status</span>
          <span>Subscriptions</span>
          <span>Licenses</span>
        </div>
        <div class="table-body">
          ${userListMarkup}
        </div>
      </section>

      ${
        input.result === null
          ? `<section class="post-table"><div class="empty">No customer matched that email address.</div></section>`
          : ""
      }
      ${
        input.result === undefined && input.users.length === 0
          ? `<section class="post-table"><div class="empty">No users matched your current filters.</div></section>`
          : ""
      }
    `,
  });
}

function renderExpandedUser(
  result: AdminDashboardData,
  filters: { email?: string; provider?: string; status?: string },
) {
  const canDeleteUser =
    result.user.role === "CUSTOMER" &&
    result.subscriptions.length === 0 &&
    result.licenses.length === 0;

  const subscriptions = result.subscriptions.length
    ? result.subscriptions
        .map(
          (subscription) => `
            <article class="result-card compact-card">
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
            <article class="result-card compact-card">
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
      <div class="inline-actions">
        <form method="post" action="/admin/users/${encodeURIComponent(result.user.id)}/send-password-setup">
          <button class="button" type="submit">Send password setup email</button>
        </form>
        ${
          canDeleteUser
            ? `<form method="post" action="/admin/users/${encodeURIComponent(result.user.id)}/delete" onsubmit="return confirm('Delete this empty customer account?');">
                <button class="button danger" type="submit">Delete user</button>
              </form>`
            : `<div class="inline-hint">Delete is available only for empty customer accounts.</div>`
        }
        <a class="button ghost link-button" href="${buildDashboardHref(filters)}">Collapse</a>
      </div>
    </div>
    <div class="admin-grid">
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

function renderAdminLoginShell(input: { title: string; panel: string }) {
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
        width: min(980px, 100%);
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
      h1, h2 {
        margin: 0;
        font-family: "Manrope", "Avenir Next", "Helvetica Neue", Helvetica, Arial, sans-serif;
        letter-spacing: -0.04em;
      }
      .hero h1 {
        font-size: clamp(40px, 5vw, 64px);
        line-height: 0.95;
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
      .panel h2 { font-size: 30px; }
      .eyebrow { color: var(--muted); line-height: 1.6; margin: 8px 0 24px; }
      form { display: grid; gap: 16px; }
      label { display: grid; gap: 8px; color: var(--muted); font-size: 14px; }
      input {
        width: 100%;
        border: 1px solid rgba(18,18,18,0.09);
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
      @media (max-width: 920px) {
        .shell { grid-template-columns: 1fr; }
        .hero, .panel { padding: 28px; }
        .mark { width: 132px; margin-top: 28px; }
      }
    </style>
  </head>
  <body>
    <main class="shell">
      <section class="hero">
        <div class="badge">StudioAutomation Admin</div>
        <h1>${escapeHtml(input.title)}</h1>
        <p>Sign in to manage customers, licenses, and support actions.</p>
        <img class="mark" src="/brand/ScanCTRL.png" alt="StudioAutomation logo" />
      </section>
      <section class="panel">${input.panel}</section>
    </main>
  </body>
</html>`;
}

function renderAdminDashboardShell(input: { title: string; adminEmail: string; panel: string }) {
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
        padding: 24px 20px 32px;
      }
      .frame {
        width: min(1400px, 100%);
        margin: 0 auto;
      }
      .admin-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 20px;
        padding: 18px 22px;
        margin-bottom: 18px;
        border-radius: 24px;
        background: linear-gradient(180deg, rgba(255,255,255,0.92), rgba(255,255,255,0.7));
        border: 1px solid var(--border);
        box-shadow: var(--shadow);
      }
      .admin-brand {
        display: flex;
        align-items: center;
        gap: 16px;
      }
      .mark {
        width: 68px;
        display: block;
        flex: 0 0 auto;
      }
      .brand-copy h1 {
        margin: 0;
        font-family: "Manrope", "Avenir Next", "Helvetica Neue", Helvetica, Arial, sans-serif;
        font-size: 28px;
        letter-spacing: -0.04em;
      }
      .brand-copy p {
        margin: 6px 0 0;
        color: var(--muted);
        font-size: 14px;
      }
      .button, .link-button {
        appearance: none;
        border: 1px solid rgba(18,18,18,0.08);
        border-radius: 14px;
        background: linear-gradient(180deg, var(--accent), var(--accent-dark));
        color: #22201d;
        padding: 13px 16px;
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
        text-decoration: none;
        display: inline-flex;
        align-items: center;
        justify-content: center;
      }
      .button.ghost, .link-button.ghost {
        background: rgba(255,255,255,0.9);
      }
      .button.danger {
        background: linear-gradient(180deg, #c9b4b4, #b89090);
      }
      .notice {
        margin-bottom: 14px;
        padding: 13px 15px;
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
      .toolbar {
        display: grid;
        grid-template-columns: minmax(0, 1.8fr) minmax(280px, 0.7fr);
        gap: 14px;
      }
      .toolbar-form {
        display: grid;
        gap: 12px;
        padding: 16px;
        border-radius: 20px;
        background: rgba(255,255,255,0.84);
        border: 1px solid var(--border);
        box-shadow: 0 18px 50px rgba(84, 78, 67, 0.09);
      }
      .search-form {
        grid-template-columns: minmax(0, 1.4fr) minmax(0, 0.8fr) minmax(0, 0.8fr) auto;
        align-items: end;
      }
      .sync-form {
        grid-template-columns: minmax(0, 1fr) auto;
        align-items: end;
      }
      .field { display: grid; gap: 8px; }
      .field span {
        font-size: 12px;
        color: var(--muted);
        letter-spacing: 0.02em;
      }
      input, select {
        width: 100%;
        border: 1px solid rgba(18,18,18,0.09);
        border-radius: 14px;
        background: rgba(255,255,255,0.88);
        color: var(--text);
        padding: 14px 15px;
        font-size: 14px;
        outline: none;
      }
      input:focus, select:focus {
        border-color: rgba(170,170,170,0.8);
        box-shadow: 0 0 0 4px rgba(170,170,170,0.18);
      }
      .table-card {
        margin-top: 16px;
        border: 1px solid var(--border);
        border-radius: 24px;
        overflow: hidden;
        background: rgba(255,255,255,0.84);
        box-shadow: 0 18px 50px rgba(84, 78, 67, 0.09);
      }
      .table-header, .table-row {
        display: grid;
        grid-template-columns: 56px minmax(0, 2.3fr) minmax(140px, 1fr) minmax(140px, 1fr) minmax(110px, 0.8fr) minmax(110px, 0.8fr);
        gap: 16px;
        align-items: center;
      }
      .table-header {
        padding: 14px 20px;
        background: linear-gradient(180deg, #d5d5d5, #bdbdbd);
        color: #4f4a44;
        font-size: 12px;
        letter-spacing: 0.03em;
      }
      .table-body { display: grid; }
      .table-row {
        padding: 14px 20px;
        color: var(--text);
        text-decoration: none;
        border-top: 1px solid rgba(18,18,18,0.06);
        background: rgba(255,255,255,0.68);
      }
      .table-row:nth-child(even) { background: rgba(243,244,244,0.92); }
      .table-row:hover { background: rgba(227,228,228,0.96); }
      .table-row.active { background: rgba(220,221,221,0.98); }
      .row-number { font-weight: 600; color: var(--muted); }
      .table-row strong {
        display: block;
        font-size: 14px;
        font-weight: 600;
      }
      .table-row small {
        display: block;
        margin-top: 2px;
        font-size: 12px;
        color: var(--muted);
      }
      .expanded-row {
        padding: 16px 20px 18px;
        border-top: 1px solid rgba(18,18,18,0.06);
        background: rgba(237,238,238,0.98);
      }
      .user-summary, .result-header, .device-row {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 14px;
      }
      .user-summary { margin-bottom: 16px; }
      .user-summary h3 {
        margin: 0;
        font-family: "Manrope", "Avenir Next", "Helvetica Neue", Helvetica, Arial, sans-serif;
        font-size: 24px;
        letter-spacing: -0.03em;
      }
      .eyebrow, .muted {
        color: var(--muted);
      }
      .eyebrow { margin: 6px 0 0; font-size: 14px; line-height: 1.55; }
      .inline-actions {
        display: flex;
        gap: 10px;
        flex-wrap: wrap;
      }
      .inline-hint {
        display: inline-flex;
        align-items: center;
        padding: 12px 14px;
        border-radius: 14px;
        background: rgba(255,255,255,0.72);
        border: 1px solid rgba(18,18,18,0.08);
        color: var(--muted);
        font-size: 13px;
      }
      .admin-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 16px;
      }
      .section-card, .result-card {
        background: rgba(255,255,255,0.88);
        border: 1px solid var(--border);
        border-radius: 18px;
        padding: 18px;
      }
      .section-card h3 {
        margin: 0 0 10px;
        font-family: "Manrope", "Avenir Next", "Helvetica Neue", Helvetica, Arial, sans-serif;
        font-size: 20px;
        letter-spacing: -0.03em;
      }
      .compact-card + .compact-card { margin-top: 12px; }
      .detail-list {
        display: grid;
        gap: 7px;
        margin-top: 12px;
        font-size: 13px;
        color: var(--muted);
      }
      .key-block {
        margin-top: 14px;
        padding: 12px 14px;
        border-radius: 14px;
        background: #f7f5f1;
        border: 1px solid rgba(18,18,18,0.06);
      }
      .key-block span {
        display: block;
        font-size: 11px;
        color: var(--muted);
        margin-bottom: 6px;
      }
      code { font-size: 13px; word-break: break-all; }
      .pill {
        padding: 7px 11px;
        border-radius: 999px;
        background: rgba(255,255,255,0.68);
        color: var(--muted);
        font-size: 11px;
      }
      .empty {
        padding: 16px;
        border-radius: 16px;
        border: 1px dashed rgba(18,18,18,0.16);
        color: var(--muted);
        background: rgba(255,255,255,0.55);
      }
      .empty.compact { padding: 14px; }
      .post-table { margin-top: 16px; }
      @media (max-width: 980px) {
        .toolbar { grid-template-columns: 1fr; }
        .search-form, .sync-form { grid-template-columns: 1fr; }
        .table-header, .table-row {
          grid-template-columns: 42px minmax(0, 1.5fr) minmax(90px, 0.8fr) minmax(90px, 0.8fr) minmax(80px, 0.7fr) minmax(80px, 0.7fr);
          gap: 10px;
          font-size: 12px;
        }
        .user-summary, .result-header, .device-row {
          flex-direction: column;
          align-items: stretch;
        }
        .admin-grid { grid-template-columns: 1fr; }
        .admin-header {
          flex-direction: column;
          align-items: stretch;
        }
      }
    </style>
  </head>
  <body>
    <main class="frame">
      <header class="admin-header">
        <div class="admin-brand">
          <img class="mark" src="/brand/ScanCTRL.png" alt="StudioAutomation logo" />
          <div class="brand-copy">
            <h1>${escapeHtml(input.title)}</h1>
            <p>${escapeHtml(input.adminEmail)}</p>
          </div>
        </div>
        <form method="post" action="/admin/logout">
          <button class="button ghost" type="submit">Sign out</button>
        </form>
      </header>
      ${input.panel}
    </main>
  </body>
</html>`;
}

function renderSelectOptions(options: string[], selected?: string) {
  return options
    .map((value) => {
      const label = value || "All";
      return `<option value="${escapeHtml(value)}"${selected === value ? " selected" : ""}>${escapeHtml(label)}</option>`;
    })
    .join("");
}

function buildDashboardHref(input: {
  email?: string;
  provider?: string;
  status?: string;
  userId?: string;
}) {
  const params = new URLSearchParams();

  if (input.email) params.set("email", input.email);
  if (input.provider) params.set("provider", input.provider);
  if (input.status) params.set("status", input.status);
  if (input.userId) params.set("userId", input.userId);

  const query = params.toString();
  return query ? `/admin/dashboard?${query}` : "/admin/dashboard";
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

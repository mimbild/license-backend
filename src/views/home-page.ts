export function renderHomePage(input: { appBaseUrl: string }) {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>StudioAutomation</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
      href="https://fonts.googleapis.com/css2?family=Manrope:wght@600;700;800&family=Poppins:wght@400;500;600&display=swap"
      rel="stylesheet"
    />
    <style>
      :root {
        --bg: #f3f4f4;
        --panel: rgba(255, 255, 255, 0.9);
        --text: #181716;
        --muted: #66615a;
        --accent: #b9b9b9;
        --accent-dark: #aaaaaa;
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
        padding: 28px 20px 40px;
      }
      .shell {
        width: min(1180px, 100%);
        margin: 0 auto;
      }
      .hero {
        display: grid;
        grid-template-columns: minmax(0, 1.2fr) minmax(320px, 0.8fr);
        gap: 18px;
        align-items: stretch;
      }
      .panel {
        background: var(--panel);
        border: 1px solid var(--border);
        border-radius: 28px;
        box-shadow: var(--shadow);
      }
      .intro {
        padding: 34px;
        background:
          linear-gradient(180deg, rgba(255,255,255,0.78), rgba(255,255,255,0.26)),
          linear-gradient(145deg, #c5c5c5, #aaaaaa 62%, #9f9f9f);
      }
      .eyebrow {
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
      h1 {
        margin-top: 20px;
        font-size: clamp(44px, 6vw, 76px);
        line-height: 0.94;
      }
      .lead {
        margin: 18px 0 0;
        max-width: 32ch;
        font-size: 18px;
        line-height: 1.65;
        color: var(--muted);
      }
      .mark {
        width: 180px;
        display: block;
        margin-top: 34px;
      }
      .status {
        padding: 28px;
        display: grid;
        align-content: space-between;
        gap: 18px;
      }
      .status h2 {
        font-size: 24px;
        letter-spacing: -0.03em;
      }
      .meta {
        color: var(--muted);
        line-height: 1.6;
        font-size: 14px;
      }
      .meta code {
        font-size: 13px;
      }
      .link-grid {
        margin-top: 18px;
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 18px;
      }
      .card {
        padding: 24px;
      }
      .card h2 {
        font-size: 24px;
        letter-spacing: -0.03em;
      }
      .card p {
        margin: 10px 0 18px;
        color: var(--muted);
        line-height: 1.65;
        font-size: 15px;
      }
      .button {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        padding: 14px 16px;
        border-radius: 14px;
        text-decoration: none;
        color: #22201d;
        font-size: 14px;
        font-weight: 500;
        border: 1px solid rgba(18,18,18,0.08);
        background: linear-gradient(180deg, var(--accent), var(--accent-dark));
      }
      .secondary {
        background: rgba(255,255,255,0.92);
      }
      @media (max-width: 920px) {
        .hero,
        .link-grid {
          grid-template-columns: 1fr;
        }
        .intro,
        .status,
        .card {
          padding: 24px;
        }
        .mark {
          width: 140px;
          margin-top: 24px;
        }
      }
    </style>
  </head>
  <body>
    <main class="shell">
      <section class="hero">
        <article class="panel intro">
          <div class="eyebrow">StudioAutomation</div>
          <h1>License & account server</h1>
          <p class="lead">
            This service handles customer accounts, password setup, licenses, subscriptions, and
            desktop access for ScanCTRL.
          </p>
          <img class="mark" src="/brand/ScanCTRL.png" alt="StudioAutomation logo" />
        </article>

        <aside class="panel status">
          <div>
            <h2>Live endpoints</h2>
            <p class="meta">This is the hosted backend environment currently serving licenses and account flows.</p>
          </div>
          <div class="meta">
            Base URL<br />
            <code>${escapeHtml(input.appBaseUrl)}</code>
          </div>
        </aside>
      </section>

      <section class="link-grid">
        <article class="panel card">
          <h2>Customer portal</h2>
          <p>Customers can sign in, view their licenses, and release an active device.</p>
          <a class="button" href="/portal/login">Open portal</a>
        </article>

        <article class="panel card">
          <h2>Admin portal</h2>
          <p>Admin users can search customers, inspect subscriptions, resend setup emails, and run sync jobs.</p>
          <a class="button" href="/admin/login">Open admin</a>
        </article>

        <article class="panel card">
          <h2>Health check</h2>
          <p>Use this endpoint for uptime checks, hosting verification, or quick environment validation.</p>
          <a class="button secondary" href="/health">Open health</a>
        </article>
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

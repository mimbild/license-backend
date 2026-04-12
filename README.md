# License Backend MVP

Servervaliderat licens- och abonnemangssystem byggt med Node.js, TypeScript, Express, PostgreSQL och Prisma.

## Kort arkitekturöversikt

- `User` ar kundkonto och source of truth for auth och adminroll.
- `Product` och `Plan` modellerar appar, bundles och abonnemangsplaner.
- `Subscription` speglar betalrelationen fran Squarespace idag och ar nu forberedd for flera providers.
- `Entitlement` beskriver vad kunden har ratt till och i vilken kvantitet.
- `License` ar den aktiverbara licensplatsen med nyckel, status och grace-logik.
- `LicenseActivation` knyter licensen till en enhet via `deviceFingerprint` eller `machineId`.
- `WebhookEvent` lagrar inkommande Squarespace-event rad-for-rad for idempotent behandling.
- `EmailLog` loggar skickade mail oavsett adapter.

## Multi-provider foundation

- `BillingProvider` finns nu i datamodellen for `SQUARESPACE`, `APPLE_APP_STORE`, `GOOGLE_PLAY`, `MANUAL` och `SEED`.
- `PlanExternalRef` mappar externa provider-id:n till interna `Plan`, sa att vi kan koppla Apple och Google senare utan att gora om domanmodellen.
- Webhook-processing gar via `src/billing/` och ett provider-register, sa att nya adapters kan laggas till utan att skriva om licens- och entitlement-logiken.
- Apple App Store och Google Play ar scaffoldade i kodbasen men returnerar medvetet `501 Not Implemented` tills apparna ar redo.

## Antaganden i MVP

- Squarespace webhook-payloaden ar antagen och maste justeras nar riktig payload finns.
- Signaturverifiering antar headern `x-squarespace-signature` med HMAC SHA-256 over JSON-payload.
- Webhook- eller sync-skapade anvandare far tills vidare `passwordHash="RESET_REQUIRED"` tills de satt eget losenord via password setup.
- SMTP-adaptern ar en placeholder med TODO; `MAIL_MODE=console` ar default for lokal MVP.
- Bundles stods i datamodellen via `BundleItem`, men automatisk entitlement-expansion for bundlebarn ar TODO.
- Apple och Google ar forberedda i arkitekturen men inte aktiverade integrationer an.

## Projektstruktur

```text
license-backend/
├── prisma/
│   └── schema.prisma
├── src/
│   ├── app.ts
│   ├── billing/
│   ├── server.ts
│   ├── config/
│   │   ├── env.ts
│   │   ├── logger.ts
│   │   └── prisma.ts
│   ├── controllers/
│   ├── integrations/
│   │   └── squarespace/
│   │       └── mapping.ts
│   ├── mail/
│   ├── middleware/
│   ├── routes/
│   ├── services/
│   ├── types/
│   └── utils/
├── .env.example
├── package.json
├── tsconfig.json
└── README.md
```

## API-endpoints i MVP

- `POST /api/webhooks/squarespace`
- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/licenses/activate`
- `POST /api/licenses/validate`
- `POST /api/licenses/release-device`
- `GET /api/licenses/:licenseKey`
- `GET /api/me/licenses`
- `POST /api/admin/licenses/:id/deactivate`
- `POST /api/admin/licenses/:id/reactivate`
- `POST /api/admin/subscriptions/:id/mark-past-due`
- `POST /api/admin/sync/squarespace/orders`

## Lokal korning

1. Installera beroenden:

```bash
cd /Users/peter/Documents/New\ project/license-backend
npm install
```

2. Kopiera miljofil:

```bash
cp .env.example .env
```

3. Starta PostgreSQL och skapa databasen `license_backend`.

4. Generera Prisma-klient och kora migration:

```bash
npx prisma generate
npx prisma migrate dev --name init
npm run prisma:seed
```

5. Starta servern:

```bash
npm run dev
```

6. Healthcheck:

```bash
curl http://localhost:4000/health
```

## Seedad demo-data

- Admin: `admin@example.com` / `ChangeMe123!`
- Demo-kund: `demo@example.com` / `DemoPass123!`
- Produkter: `desktop-pro`, `mobile-companion`, `studio-suite`
- Planer: en singellicensplan, en 10-pack-plan och en suite-plan
- Demo-kunden far en aktiv subscription och 2 seedade licenser for `desktop-pro`

## Exempelpayloads

### Register

```bash
curl -X POST http://localhost:4000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"ChangeMe123!","name":"Test User"}'
```

### Login

```bash
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"ChangeMe123!"}'
```

### Activate license

```bash
curl -X POST http://localhost:4000/api/licenses/activate \
  -H "Content-Type: application/json" \
  -d '{"licenseKey":"AB12CD-34EF56-7890AB-CDEF12","deviceFingerprint":"desktop-001","deviceName":"MacBook Pro"}'
```

### Validate license

```bash
curl -X POST http://localhost:4000/api/licenses/validate \
  -H "Content-Type: application/json" \
  -d '{"licenseKey":"AB12CD-34EF56-7890AB-CDEF12","deviceFingerprint":"desktop-001"}'
```

### Squarespace webhook

```bash
curl -X POST http://localhost:4000/api/webhooks/squarespace \
  -H "Content-Type: application/json" \
  -d '{
    "id": "evt_123",
    "eventType": "order.created",
    "createdOn": "2026-04-10T10:00:00.000Z",
    "orderId": "order_123",
    "customer": { "email": "user@example.com", "name": "Test User" },
    "subscription": { "id": "sub_123", "status": "active" },
    "lineItems": [{ "productSlug": "desktop-pro", "variantId": "variant_001", "quantity": 2 }]
  }'
```

## Beteende i MVP

- `activate` slapper igenom bara nar subscription ar `ACTIVE` eller `PAST_DUE` inom grace.
- `validate` returnerar en av `full_access`, `blocked`, `payment_required`, `grace`.
- `release-device` kravs JWT-auth och att licensen tillhor inloggad anvandare.
- Admin-endpoints ar skyddade med JWT + `role=ADMIN`.
- Past due satter subscription och licenser i grace under `GRACE_DAYS`.
- Nar grace ar slut returnerar validering `payment_required`.

## Nasta forbattringar efter MVP

- Byt placeholder-SMTP mot Nodemailer eller transaktionell mailprovider.
- Implementera riktig setup-password-sida eller invite/reset-flode for kopskapade konton.
- Expandera bundle-entitlements till underliggande produkter.
- Lagga till rate limiting, audit log och IP-baserad webhook-hardening.
- Lagra och validera riktig Squarespace webhook-signatur enligt officiell dokumentation.
- Lagga till refresh tokens, password reset och email verification.
- Skapa seed-script for produkter, planer och testlicenser.

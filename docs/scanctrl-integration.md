# ScanCTRL Backend Integration Guide

Det här dokumentet är tänkt för personen som ska koppla desktop-appen `ScanCTRL` mot backend.

## Production Base URL

```text
https://license-backend-1-ycsl.onrender.com
```

## Auth Model

Systemet använder konto + backend som source of truth.

Användaren ska i normalfallet:
1. köpa i Squarespace
2. få mail för att sätta lösenord
3. logga in i appen
4. hämta sina licenser
5. aktivera en enhet

Desktop-klienten ska alltså inte bygga hela flödet runt bara en lokal licensfil.

## Viktiga Endpoints

### 1. Login

```http
POST /api/auth/login
Content-Type: application/json
```

Request:

```json
{
  "email": "user@example.com",
  "password": "secret"
}
```

Response:

```json
{
  "user": {
    "id": "user_id",
    "email": "user@example.com",
    "role": "CUSTOMER",
    "name": "User Name",
    "trialEndsAt": null,
    "createdAt": "2026-04-12T18:06:43.790Z",
    "updatedAt": "2026-04-12T21:05:41.616Z"
  },
  "token": "jwt-token"
}
```

Klienten ska spara `token` säkert för inloggad session.

### 2. List user licenses

```http
GET /api/me/licenses
Authorization: Bearer <token>
```

Det här returnerar användarens licenser, produktinfo, subscription och aktiveringar.

Klienten bör använda detta för att:
- visa vilken licens användaren har
- visa om licensen redan är aktiverad på en enhet
- välja rätt licens om användaren har flera

### 3. Validate license

```http
POST /api/licenses/validate
Content-Type: application/json
```

Request:

```json
{
  "licenseKey": "D16DA7-077C7E-CBDD3A-58F9C5",
  "deviceFingerprint": "scanctrl-mac-001"
}
```

Response:

```json
{
  "access": "full_access",
  "reason": "subscription_active",
  "license": {
    "id": "license_id",
    "key": "D16DA7-077C7E-CBDD3A-58F9C5",
    "status": "ACTIVE",
    "product": "desktop-pro",
    "maxActivations": 1
  }
}
```

Möjliga `access`-värden:
- `full_access`
- `grace`
- `payment_required`
- `blocked`

Klienten ska mappa dem så här:
- `full_access`: släpp in användaren fullt ut
- `grace`: släpp in användaren men visa tydlig varning
- `payment_required`: blockera användning och visa att betalning måste återaktiveras
- `blocked`: blockera användning och visa att licensen eller subscriptionen inte är giltig

### 4. Activate license

```http
POST /api/licenses/activate
Content-Type: application/json
```

Request:

```json
{
  "licenseKey": "D16DA7-077C7E-CBDD3A-58F9C5",
  "deviceFingerprint": "scanctrl-mac-001",
  "deviceName": "Peter Mac"
}
```

Response on success:

```json
{
  "ok": true,
  "status": "full_access",
  "reason": "subscription_active",
  "licenseStatus": "ACTIVE",
  "activationId": "activation_id"
}
```

Response when blocked by device limit:

```json
{
  "ok": false,
  "status": "blocked",
  "reason": "device_limit_reached",
  "licenseStatus": "ACTIVE"
}
```

Klienten ska använda `activate`:
- första gången användaren aktiverar på sin enhet
- när enheten inte längre finns bland aktiva aktiveringar

### 5. Release device

Normalt hanteras detta via portalen:

```text
/portal/account
```

Men det finns också API:

```http
POST /api/licenses/release-device
Authorization: Bearer <token>
Content-Type: application/json
```

Request:

```json
{
  "licenseKey": "D16DA7-077C7E-CBDD3A-58F9C5",
  "deviceFingerprint": "scanctrl-mac-001"
}
```

## Rekommenderat Appflöde

### Första inloggning

1. Användaren loggar in med email/lösenord
2. Klienten sparar JWT-token
3. Klienten hämtar `GET /api/me/licenses`
4. Klienten väljer licens
5. Klienten anropar `POST /api/licenses/activate`
6. Vid lyckat svar öppnas appen

### Varje appstart

1. Klienten läser lokalt sparad session
2. Klienten anropar `POST /api/licenses/validate`
3. Om `full_access`: fortsätt
4. Om `grace`: fortsätt men visa tydlig varning
5. Om `payment_required` eller `blocked`: stoppa åtkomst

### Om användaren byter dator

1. Användaren går till portalen
2. Frigör gammal enhet
3. Startar appen på ny dator
4. Klienten kör `activate` igen

## Device Fingerprint

Backend kräver minst ett av:
- `deviceFingerprint`
- `machineId`

För MVP rekommenderas ett stabilt `deviceFingerprint` från desktop-klienten.

Krav:
- stabilt över omstarter
- tillräckligt unikt per enhet
- inte beroende av enbart tillfälliga värden

## Felkoder att hantera

Vanliga svar:

### Auth
- `UNAUTHORIZED`
- `INVALID_CREDENTIALS`

### License
- `LICENSE_NOT_FOUND`
- `DEVICE_REQUIRED`
- `ACTIVATION_NOT_FOUND`

### Validation / setup
- `VALIDATION_ERROR`
- `INVALID_SETUP_TOKEN`

## Notes for Production

- Backend kör på Render och syncar Squarespace-order automatiskt.
- Riktiga mail skickas via Resend.
- Kundportal finns för login, licensöversikt och release-device.
- Webhook/OAuth-spåret för Squarespace är inte huvudflödet just nu; produktion använder order-sync.

## Verified Production Flow

Följande är verifierat i produktion:
- köp i Squarespace
- sync till backend
- kundkonto skapas
- password setup via mail
- login fungerar
- `GET /api/me/licenses` fungerar
- `POST /api/licenses/validate` returnerar `full_access`
- `POST /api/licenses/activate` returnerar lyckat svar

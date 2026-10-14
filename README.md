# SecureMonitor AI — deployment-ready project

This package combines the full single-page dashboard with the matching Node.js API from the supplied project. It requires Node.js 18+ and has no npm runtime dependencies.

## Quick local run (Windows PowerShell)

```powershell
npm start
```

Open http://localhost:3000. Keep the terminal window open while using the website. If the port is busy, set `PORT` to an available port before starting the server.

## Deploy to Render without installing Git

1. Create a **Private** repository at https://github.com/new.
2. Open the repository → **Add file → Upload files**.
3. Upload the files in this folder (`server.js`, `securemonitor.html`, `package.json`, `.gitignore`, `render.yaml`, `Dockerfile`, `.env.example`, this `README.md`, and `smoke-test.js`). Do not upload `.env`, real credentials, or a populated `users.json`.
4. In https://dashboard.render.com, choose **New → Blueprint** and connect that private GitHub repository. Render reads `render.yaml`; review the settings and deploy.
5. When deployment completes, open the `onrender.com` URL provided by Render. Test `/api/health` first, then the main URL.

A hosted URL cannot be pre-created by this ZIP: Render must deploy the source inside an account. Do not present the local `localhost` address as a public website URL.

## Demo mode

The dashboard includes an explicit demo mode with Normal/Medium/High preview readings, and the UI labels those readings as demo data. Use this mode for a presentation when no agent or ESP32 is connected. Live mode only displays telemetry received by this backend; it does not make up laptop, mobile, or IoT sensor readings.

## Backend endpoints already in this package

- `GET /api/health`
- `POST /api/auth/register`, `/api/auth/login`, `/api/auth/refresh`, `/api/auth/logout`, `/api/auth/me`
- `GET /api/devices`, `POST /api/devices/agent-key`
- `POST /api/telemetry/laptop`, `/api/telemetry/mobile`, `/api/telemetry/iot` (require `X-Device-Key`)
- `GET /api/alerts`, `PATCH /api/alerts/:alertId`
- `GET /api/devices/:deviceId/assessment`, `GET /api/devices/:deviceId/recommendations`
- `GET/PUT /api/settings/notifications`, `GET/PUT /api/settings/thresholds`

## What is integrated vs needs configuration

- Integrated: dashboard, demo mode, registration/login, short-lived bearer access token, HttpOnly refresh cookie, device-key issuance, telemetry ingestion, rule-based NORMAL/MEDIUM/HIGH risk classification, safe recommendations, alerts, threshold preferences, and notification preferences.
- Optional integration: n8n alert/reset webhooks and Resend email delivery require server environment variables (`N8N_ALERT_WEBHOOK`, `N8N_RESET_WEBHOOK`, `RESEND_API_KEY`, `ALERT_FROM_EMAIL`).
- Important limitation: the supplied backend's assessment endpoint currently returns a rule-based explanation. It does **not** make a Gemini API call yet; setting a `GEMINI_API_KEY` alone will not activate Gemini assessment.
- Real laptop/mobile/ESP32 metrics require their agent/app/device to send authenticated telemetry. Hardware is optional.
- The current backend stores accounts in `users.json` and keeps telemetry, alerts, and refresh sessions in memory. Free hosting filesystems can be ephemeral, and restarts clear in-memory telemetry/sessions. Use a persistent database and persistent storage before treating it as production service.

## Safety

Use a private repository. Never commit `.env`, access/refresh tokens, device keys, provider API keys, n8n secrets, or private user records. Set `JWT_SECRET` on the host. The dashboard is not proof that a device is compromised; risk labels are only anomaly indicators.

## Smoke test

After Node.js is installed, run `npm run check` and `npm run smoke-test`. The smoke test starts its own temporary server and exercises health, registration, authenticated API access, device-key issuance, telemetry ingestion, and alert retrieval.

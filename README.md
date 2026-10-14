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


## Real Windows laptop readings (not browser estimates)

1. Open the public website and create/sign in to your account. Keep the laptop where you run the agent as the device being monitored.
2. Open **Devices** and click **Connect Laptop Agent**. Copy the one-time key shown in the status text. Keep it private. Generating a new key invalidates the previous key for this account.
3. On the Windows laptop, open PowerShell in this folder's `agent` subfolder, then run:

   ```powershell
   py -m pip install psutil
   py laptop_agent.py
   ```

   Or double-click `agent/run_windows_agent.bat`. Enter `https://securemonitor-ai.onrender.com`, paste the device key, and keep the terminal running. The agent reports real CPU %, system RAM %, C: disk %, cumulative network transfer since the prior poll, and running process count every 30 seconds.
4. Return to **Dashboard** and choose **Live** (not a colored Demo Mode). After the first telemetry post, Remote Laptop should appear; after the next poll the connection freshness should be visible. The dashboard uses the server's rule-based NORMAL/MEDIUM/HIGH risk. It is an anomaly signal, not proof of compromise.

## Test email alerts

Email requires a Resend account and valid server-side environment variables in Render: `RESEND_API_KEY` and `ALERT_FROM_EMAIL`. The sender address/domain must be accepted/verified by Resend; check the provider's verified sender/domain requirements. Do not paste API keys into browser code, GitHub, or this chat. After adding both values in Render **Environment**, redeploy/restart the service. Sign in to the dashboard, open **Settings → Send Test Email**. A successful response means the email provider accepted the message; check Inbox and Spam for actual delivery. If the UI says the provider is not configured, add the variables first.

Actual anomaly emails are sent for **HIGH** risk events (subject to the account's Email Notifications setting and configured provider). A test email checks the mail path without faking a device alert. The backend health route now includes `emailConfigured` to show whether both variables are present.

## Important service limits

The hosted backend keeps latest telemetry/alerts/sessions in memory, so a process restart clears these readings and alerts; a free service may sleep when idle. The agent is an opt-in monitor that sends the readings it collects; stop it with Ctrl+C. Do not use this prototype as a production security response system.

const http = require('node:http');
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');

const port = 31873 + Math.floor(Math.random() * 1000);
const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'securemonitor-test-'));
const server = spawn(process.execPath, [path.join(__dirname, 'server.js')], {
  cwd: __dirname,
  env: { ...process.env, PORT: String(port), JWT_SECRET: crypto.randomBytes(32).toString('hex'), DATA_DIR: dataDir, NODE_ENV: 'test' },
  stdio: ['ignore', 'pipe', 'pipe']
});
let logs = '';
server.stdout.on('data', d => { logs += d.toString(); });
server.stderr.on('data', d => { logs += d.toString(); });
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function req(route, options = {}) {
  return fetch(`http://127.0.0.1:${port}${route}`, options);
}
async function run() {
  try {
    let health;
    for (let i = 0; i < 50; i++) {
      try { health = await req('/api/health'); if (health.ok) break; } catch {}
      await sleep(100);
    }
    if (!health || !health.ok) throw new Error('Health endpoint did not start. ' + logs);
    const healthJson = await health.json();
    if (healthJson.app !== 'securemonitor') throw new Error('Unexpected health response.');
    if (typeof healthJson.emailConfigured !== 'boolean') throw new Error('Health response missing emailConfigured status.');

    const email = `smoke-${crypto.randomBytes(4).toString('hex')}@example.com`;
    const reg = await req('/api/auth/register', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'Smoke Test', email, password: 'SecureTest123' })
    });
    if (reg.status !== 201) throw new Error('Registration failed: HTTP ' + reg.status + ' ' + await reg.text());
    const rd = await reg.json();
    if (!rd.accessToken || !rd.user?.id) throw new Error('Registration response missing access token/user.');
    const auth = { authorization: `Bearer ${rd.accessToken}`, 'content-type': 'application/json' };

    const me = await req('/api/auth/me', { headers: auth });
    if (!me.ok) throw new Error('Authenticated /api/auth/me failed: HTTP ' + me.status);

    const keyRes = await req('/api/devices/agent-key', { method: 'POST', headers: auth, body: '{}' });
    if (!keyRes.ok) throw new Error('Device-key issuance failed: HTTP ' + keyRes.status);
    const { key } = await keyRes.json();
    if (!key) throw new Error('Device-key response missing key.');

    const telemetry = await req('/api/telemetry/laptop', {
      method: 'POST', headers: { 'content-type': 'application/json', 'x-device-key': key },
      body: JSON.stringify({ deviceId: 'smoke-laptop', cpu: 96, ram: 96, disk: 55, upload_mb: 1, download_mb: 1, processes: 120 })
    });
    if (telemetry.status !== 202) throw new Error('Telemetry ingestion failed: HTTP ' + telemetry.status + ' ' + await telemetry.text());

    const devices = await req('/api/devices', { headers: auth });
    if (!devices.ok || !(await devices.json()).some(d => d.id === 'smoke-laptop')) throw new Error('Device list did not include ingested telemetry.');

    const alerts = await req('/api/alerts', { headers: auth });
    if (!alerts.ok || !Array.isArray(await alerts.json())) throw new Error('Alert endpoint failed.');
    const mailTest = await req('/api/notifications/test-email', { method: 'POST', headers: auth, body: '{}' });
    if (![200, 502, 503].includes(mailTest.status)) throw new Error('Unexpected email test endpoint response: HTTP ' + mailTest.status);
    console.log('PASS: health, register, bearer auth, device key, telemetry ingestion, devices, alerts, email-test endpoint.');
  } finally {
    server.kill();
    try { fs.rmSync(dataDir, { recursive: true, force: true }); } catch {}
  }
}
run().catch(e => { console.error('FAIL:', e.message); process.exitCode = 1; });

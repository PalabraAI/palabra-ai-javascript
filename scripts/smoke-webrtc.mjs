import { createRequire } from 'node:module';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const libRequire = createRequire(path.join(root, 'packages/lib/package.json'));
const devRequire = createRequire(path.join(root, 'packages/dev-app/package.json'));
const { createServer } = await import(pathToFileURL(path.join(path.dirname(libRequire.resolve('vite/package.json')), 'dist/node/index.js')).href);
const { chromium } = devRequire('@playwright/test');
const environment = process.argv[2] || 'dev';
const mode = process.argv[3] || 'normal';
const origin = environment === 'dev' ? 'https://api.palabra.dev' : 'https://api.palabra.ai';
if (!['dev', 'prod'].includes(environment) || !['normal', 'drop-first', 'browser-load'].includes(mode)) throw new Error('Usage: node scripts/smoke-webrtc.mjs dev|prod [normal|drop-first|browser-load]');
const env = { ...process.env };
for (const filename of [process.env.PALABRA_SMOKE_ENV_FILE, path.join(root, '.env.integration.local')].filter(Boolean)) {
  const contents = await readFile(filename, 'utf8').catch(() => '');
  for (const line of contents.split('\n')) {
    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (match && !env[match[1]]) env[match[1]] = match[2].trim().replace(/^['"]|['"]$/g, '');
  }
}
const keyName = environment === 'dev' ? 'PALABRA_DEV_API_KEY' : 'PALABRA_PROD_API_KEY';
let apiKey = env[keyName];
if (!apiKey && env[keyName + '_FILE']) {
  const line = (await readFile(env[keyName + '_FILE'], 'utf8')).split('\n').find(line => line.trim() && !line.trim().startsWith('#'))?.trim() || '';
  apiKey = line.replace(/^(?:export\s+)?(?:PALABRA_(?:DEV|PROD)_API_KEY|API_KEY)\s*=\s*/, '').replace(/^['"]|['"]$/g, '');
}
const report = { environment, mode, apiOrigin: origin, startedAt: new Date().toISOString(), sdkVersion: '2.22.4' };
const headers = apiKey ? { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' } : {
  ClientId: env.PALABRA_DEV_CLIENT_ID || env.VITE_PALABRA_CLIENT_ID,
  ClientSecret: env.PALABRA_DEV_CLIENT_SECRET || env.VITE_PALABRA_CLIENT_SECRET,
  'Content-Type': 'application/json',
};
let session, credentials;
let server, browser, page;
try {
  if (mode !== 'browser-load') {
    if (!apiKey && (environment === 'prod' || !headers.ClientId || !headers.ClientSecret)) throw new Error(`Missing PALABRA_${environment.toUpperCase()}_API_KEY in .env.integration.local`);
    const sessionsPath = apiKey ? '/session-storage/v2/sessions' : '/session-storage/session';
    const response = await fetch(origin + sessionsPath, { method: 'POST', headers, signal: AbortSignal.timeout(20000), body: JSON.stringify(apiKey ? {
      intent: 's2s', connection_type: 'webrtc', max_session_duration_seconds: 120, expires_in_seconds: 120, single_use: true,
    } : { data: { publisher_count: 1, subscriber_count: 0, publisher_can_subscribe: true, intent: 's2s' } }) });
    const body = await response.json().catch(() => ({}));
    if (!response.ok || !body.ok) throw new Error(`Session API ${response.status}: ${body.errors?.map(error => error.title + ': ' + error.detail).join('; ') || 'request rejected'}`);
    session = body.data;
    credentials = apiKey ? { streamUrl: session.webrtc.url, accessToken: session.token } : { streamUrl: session.webrtc_url, accessToken: session.publisher };
    report.livekitUrl = credentials.streamUrl;
  }
  server = await createServer({
    configFile: false, root, cacheDir: path.join(root, `tmp/vite-${environment}-${mode}`), resolve: { alias: { '~': path.join(root, 'packages/lib/src') } },
    define: { global: 'globalThis' }, server: { port: 0, host: '127.0.0.1', hmr: false },
    plugins: [{ name: 'smoke-page', configureServer(vite) {
      vite.middlewares.use('/__smoke', async (_req, res) => {
        res.setHeader('Content-Type', 'text/html');
        res.end(await vite.transformIndexHtml('/__smoke', await readFile(path.join(root, 'scripts/smoke-webrtc.html'), 'utf8')));
      });
    } }],
  });
  await server.listen();
  browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--autoplay-policy=no-user-gesture-required', '--use-fake-ui-for-media-stream'] });
  page = await browser.newPage();
  const network = [];
  page.on('response', response => {
    const url = new URL(response.url());
    if (response.status() >= 400 && !url.hostname.startsWith('127.')) network.push({ host: url.host, path: url.pathname, status: response.status() });
  });
  await page.goto(`http://127.0.0.1:${server.httpServer.address().port}/__smoke`);
  await page.waitForFunction(() => window.runSmoke);
  if (mode === 'browser-load') report.browserLoaded = true;
  else {
    let smokeDeadline;
    try {
      Object.assign(report, await Promise.race([
        page.evaluate(({ credentials, mode }) => window.runSmoke(credentials, mode), { credentials, mode }),
        new Promise((_, reject) => { smokeDeadline = setTimeout(() => reject(new Error('Browser smoke deadline exceeded (75s)')), 75000); }),
      ]));
    } finally {
      clearTimeout(smokeDeadline);
    }
  }
  report.httpErrors = network;
} catch (error) {
  if (page && !page.isClosed()) Object.assign(report, await page.evaluate(() => window.smokeProgress).catch(() => ({})));
  report.error = error.message.replace(/(access_token|token)=[^&\s]+/g, '$1=<redacted>');
} finally {
  await browser?.close();
  if (session) {
    const cleanupPath = apiKey ? `/session-storage/v2/sessions/${session.id}` : `/session-storage/sessions/${session.id}`;
    const cleanup = await fetch(origin + cleanupPath, { method: 'DELETE', headers, signal: AbortSignal.timeout(20000) }).catch(() => null);
    report.sessionCleanupStatus = cleanup?.status;
  }
  if (server) {
    let closeDeadline;
    try {
      await Promise.race([server.close(), new Promise(resolve => { closeDeadline = setTimeout(() => { report.serverCloseTimedOut = true; resolve(); }, 5000); })]);
    } finally { clearTimeout(closeDeadline); }
  }
  await import('node:fs/promises').then(fs => fs.mkdir(path.join(root, 'tmp'), { recursive: true }));
  await writeFile(path.join(root, `tmp/smoke-${environment}-${mode}.json`), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
}
if (report.error || (mode !== 'browser-load' && (!report.acknowledged || !report.receivedAudio || !report.receivedTranscription || !report.receivedTranslation || !report.noRetriesAfterStop || report.startEvents !== 1 || report.translationStatus !== 'ongoing' || report.cleanupError || report.sessionCleanupStatus >= 400 || !report.sessionCleanupStatus))) process.exitCode = 1;

if (report.serverCloseTimedOut) process.exit(process.exitCode || 0);

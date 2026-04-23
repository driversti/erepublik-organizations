import { readFileSync } from 'fs';
import { gotScraping } from 'got-scraping';
import config from './lib/config.js';
import { sendTelegram } from './lib/telegram.js';
import { checkIpLeak, rotateVpn } from './lib/vpn.js';
import { loadExistingIds, saveOrg, saveFailed, countOrgs } from './lib/db.js';

const API_URL = 'https://www.erepublik.com/en/main/citizen-profile-json-global/';

let processed = 0;
let saved = 0;
let errorCount = 0;
let startTime;
let shuttingDown = false;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function withJitter(ms) {
  const jitter = ms * config.jitterPercent;
  return ms + (Math.random() * 2 - 1) * jitter;
}

function isCloudflareResponse(body) {
  if (typeof body !== 'string') return false;
  return body.includes('Cloudflare') || body.includes('cf-browser-verification') || body.includes('challenge-platform');
}

function formatDuration(ms) {
  const hours = Math.floor(ms / 3600000);
  const mins = Math.floor((ms % 3600000) / 60000);
  return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
}

function parseOrg(data) {
  const accounts = data.organization?.accounts || [];
  const currency = accounts.find((a) => a.type === 'currency')?.amount ?? null;
  const gold = accounts.find((a) => a.type === 'gold')?.amount ?? null;

  return {
    id: data.citizen.id,
    name: data.citizen.name,
    created_at: data.citizen.created_at,
    is_alive: data.citizen.is_alive ? 1 : 0,
    is_banned: data.isBanned ? 1 : 0,
    avatar: data.citizen.avatar || null,
    about_me: data.aboutMe || null,
    country: data.location?.citizenshipCountry?.name || null,
    currency,
    gold,
    newspaper_id: data.newspaper?.id || null,
    newspaper_name: data.newspaper?.name || null,
    friends_count: data.friends?.number ?? null,
  };
}

async function fetchOrg(id) {
  const response = await gotScraping.get(`${API_URL}${id}`, {
    responseType: 'json',
    timeout: { request: 15000 },
  });

  if (typeof response.body === 'string') {
    if (isCloudflareResponse(response.body)) {
      throw Object.assign(new Error('Cloudflare challenge detected'), { code: 'CLOUDFLARE' });
    }
    throw Object.assign(new Error('Non-JSON response'), { code: 'BAD_RESPONSE' });
  }

  return response.body;
}

function isRetryableError(err) {
  if (err.code === 'CLOUDFLARE' || err.code === 'BAD_RESPONSE') return true;
  if (err.response) {
    const status = err.response.statusCode;
    return status === 403 || status === 429 || status >= 500;
  }
  return !err.response || err.code === 'ETIMEDOUT' || err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND';
}

function is404(err) {
  return err.response && err.response.statusCode === 404;
}

async function processId(id, currentIp) {
  let ip = currentIp;

  for (let vpnRotation = 0; vpnRotation < config.maxVpnRotationsPerRequest; vpnRotation++) {
    for (let retry = 0; retry < config.backoffSteps.length; retry++) {
      try {
        const data = await fetchOrg(id);
        const org = parseOrg(data);
        saveOrg(org);
        saved++;
        console.log(`[ok] ${org.id} | ${org.name} | ${org.country} | CC: ${org.currency} | G: ${org.gold}`);
        return ip;
      } catch (err) {
        if (is404(err)) {
          // Org deleted or never existed — save minimal tombstone to skip on resume
          saveFailed(id, '404 Not Found');
          return ip;
        }

        if (!isRetryableError(err)) {
          errorCount++;
          saveFailed(id, err.message);
          console.error(`[error] ID ${id}: ${err.message}`);
          return ip;
        }

        const delay = withJitter(config.backoffSteps[retry]);
        console.warn(`[retry] ID ${id}: ${err.message} (retry ${retry + 1}/${config.backoffSteps.length}, wait ${Math.round(delay)}ms)`);
        await sleep(delay);
      }
    }

    console.warn(`[vpn] Backoff exhausted for ID ${id}. Rotating VPN (attempt ${vpnRotation + 1}/${config.maxVpnRotationsPerRequest})...`);
    ip = await rotateVpn(ip);
  }

  errorCount++;
  const errorMsg = `All retries + ${config.maxVpnRotationsPerRequest} VPN rotations exhausted`;
  saveFailed(id, errorMsg);
  const msg = `❌ Gave up on ID ${id}: ${errorMsg}`;
  console.error(msg);
  await sendTelegram(msg);
  return ip;
}

function loadPendingIds() {
  const csv = readFileSync(config.orgsCsvPath, 'utf-8');
  const allIds = csv
    .trim()
    .split('\n')
    .map((line) => parseInt(line.split(',')[0], 10))
    .filter((id) => !isNaN(id));

  const existing = loadExistingIds();
  const pending = allIds.filter((id) => !existing.has(id));

  console.log(`[init] Total orgs in CSV: ${allIds.length} | Already fetched: ${existing.size} | Pending: ${pending.length}`);
  return pending;
}

async function sendProgress(current, total) {
  const elapsed = Date.now() - startTime;
  const pct = ((processed / total) * 100).toFixed(1);
  const speed = processed > 0 ? ((processed / elapsed) * 60000).toFixed(0) : '0';
  const msg = `📊 Progress: ${processed}/${total} (${pct}%) | Saved: ${saved} | Errors: ${errorCount} | Speed: ${speed}/min | Last ID: ${current}`;
  console.log(msg);
  await sendTelegram(msg);
}

async function main() {
  const pending = loadPendingIds();

  if (pending.length === 0) {
    console.log('All organizations already fetched. Exiting.');
    process.exit(0);
  }

  const { ip, country } = await checkIpLeak();
  let currentIp = ip;

  const startMsg = `🚀 eOrganizations crawler started. Pending: ${pending.length}. IP: ${ip} (${country})`;
  console.log(startMsg);
  await sendTelegram(startMsg);

  startTime = Date.now();

  for (const id of pending) {
    if (shuttingDown) break;

    currentIp = await processId(id, currentIp);
    processed++;

    if (processed % config.progressEveryN === 0) {
      await sendProgress(id, pending.length);
    }

    await sleep(withJitter(config.baseDelayMs));
  }

  if (shuttingDown) {
    const msg = `🛑 Crawler stopped gracefully. Processed: ${processed}/${pending.length}`;
    console.log(msg);
    await sendTelegram(msg);
    process.exit(0);
  }

  const elapsed = formatDuration(Date.now() - startTime);
  const total = countOrgs();
  const msg = `✅ Done. Fetched: ${saved} new orgs. Errors: ${errorCount}. Total in DB: ${total}. Duration: ${elapsed}`;
  console.log(msg);
  await sendTelegram(msg);
}

process.on('SIGTERM', () => { shuttingDown = true; console.log('[shutdown] SIGTERM received.'); });
process.on('SIGINT',  () => { shuttingDown = true; console.log('[shutdown] SIGINT received.'); });

main().catch(async (err) => {
  const msg = `💀 Fatal error: ${err.message}`;
  console.error(msg, err.stack);
  await sendTelegram(msg);
  process.exit(1);
});

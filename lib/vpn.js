import { gotScraping } from 'got-scraping';
import config from './config.js';
import { sendTelegram } from './telegram.js';

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function getCurrentIpInfo() {
  const response = await gotScraping.get('https://ipinfo.io/json', {
    responseType: 'json',
    timeout: { request: 10000 },
  });
  return { ip: response.body.ip, country: response.body.country };
}

export async function checkIpLeak() {
  for (let attempt = 1; attempt <= 5; attempt++) {
    try {
      const { ip, country } = await getCurrentIpInfo();
      const countryName = country === 'PL' ? 'Poland' : country;
      console.log(`[vpn] Current IP: ${ip} (${countryName})`);

      if (country === 'PL') {
        const msg = '🚨 IP LEAK: detected Poland IP. Exiting immediately.';
        console.error(msg);
        await sendTelegram(msg);
        process.exit(1);
      }

      return { ip, country: countryName };
    } catch (err) {
      console.warn(`[vpn] IP check attempt ${attempt}/5 failed: ${err.message}`);
      if (attempt < 5) await sleep(5000);
      else throw err;
    }
  }
}

async function setVpnStatus(status) {
  await gotScraping.put(`${config.gluetunApiUrl}/v1/vpn/status`, {
    json: { status },
    timeout: { request: 10000 },
  });
}

async function getVpnStatus() {
  const response = await gotScraping.get(`${config.gluetunApiUrl}/v1/vpn/status`, {
    responseType: 'json',
    timeout: { request: 5000 },
  });
  return response.body.status;
}

async function pollVpnUntilRunning() {
  const deadline = Date.now() + config.vpnPollTimeoutMs;
  while (Date.now() < deadline) {
    try {
      const status = await getVpnStatus();
      if (status === 'running') return true;
    } catch {
      // Gluetun may not be responding yet
    }
    await sleep(config.vpnPollIntervalMs);
  }
  return false;
}

async function attemptRotation() {
  try {
    console.log('[vpn] Stopping VPN...');
    await setVpnStatus('stopped');
    await sleep(2000);

    console.log('[vpn] Starting VPN...');
    await setVpnStatus('running');

    const connected = await pollVpnUntilRunning();
    if (!connected) {
      console.error('[vpn] Timed out waiting for VPN to reconnect');
      return { success: false };
    }

    await sleep(2000);

    const { ip: newIp } = await getCurrentIpInfo();
    console.log(`[vpn] New IP: ${newIp}`);
    return { success: true, newIp };
  } catch (err) {
    console.error(`[vpn] Rotation attempt failed: ${err.message}`);
    return { success: false };
  }
}

export async function rotateVpn(oldIp) {
  while (true) {
    for (let attempt = 1; attempt <= 3; attempt++) {
      console.log(`[vpn] Rotation attempt ${attempt}/3...`);
      const result = await attemptRotation();
      if (result.success) {
        const msg = `🔄 VPN rotated: ${oldIp} → ${result.newIp}`;
        console.log(msg);
        await sendTelegram(msg);
        return result.newIp;
      }
    }

    const msg = '⚠️ VPN reconnect failed 3x. Sleeping 5min.';
    console.error(msg);
    await sendTelegram(msg);
    await sleep(config.vpnSleepOnFailureMs);
  }
}

const required = (name) => {
  const val = process.env[name];
  if (!val) {
    console.error(`Missing required env var: ${name}`);
    process.exit(1);
  }
  return val;
};

const config = {
  // Input
  orgsCsvPath: process.env.ORGS_CSV_PATH || './data/orgs.csv',

  // Output
  dataDir: './data',
  dbPath: process.env.DB_PATH || './data/orgs.db',
  failedCsvPath: './data/failed.csv',

  // Request tuning
  baseDelayMs: parseInt(process.env.BASE_DELAY_MS || '150', 10),

  // Telegram (all optional)
  botToken: process.env.BOT_TOKEN || null,
  chatId: process.env.CHAT_ID || null,
  topicId: process.env.TOPIC_ID || null,

  // Backoff
  backoffSteps: [1000, 2000, 4000, 8000, 16000],
  jitterPercent: 0.3,
  maxVpnRotationsPerRequest: 3,

  // VPN
  gluetunApiUrl: 'http://localhost:8000',
  vpnPollIntervalMs: 2000,
  vpnPollTimeoutMs: 30000,
  vpnSleepOnFailureMs: 5 * 60 * 1000,

  // Progress
  progressEveryN: 5000,
};

export default config;

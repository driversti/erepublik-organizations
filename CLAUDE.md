# eOrganizations

Crawls details for all known eRepublik organizations from a pre-built ID list and stores them in SQLite.

## Deployment

- **Server:** `erepublik@192.168.10.18`
- **Path:** `~/docker/eorganizations/`
- **Registry:** `registry.yurii.live/eorganizations:latest`

## Commands

```bash
# Build and push image (run locally)
./release.sh

# Deploy on server (after push)
ssh erepublik@192.168.10.18 "cd ~/docker/eorganizations && docker compose pull crawler && docker compose up -d"

# View logs
ssh erepublik@192.168.10.18 "cd ~/docker/eorganizations && docker compose logs crawler --tail 50"

# Check status
ssh erepublik@192.168.10.18 "cd ~/docker/eorganizations && docker compose ps"

# Stop
ssh erepublik@192.168.10.18 "cd ~/docker/eorganizations && docker compose stop crawler"
```

## Architecture

**Stack:** Node.js 20, got-scraping, better-sqlite3, Docker, Gluetun + Surfshark WireGuard

```
organizations/
├── app.js              # Main loop: read CSV → fetch API → store in SQLite
├── lib/
│   ├── config.js       # Env var parsing
│   ├── db.js           # SQLite schema + read/write methods
│   ├── vpn.js          # IP leak check, Gluetun API rotation
│   └── telegram.js     # Telegram notifications
├── Dockerfile
├── docker-compose.yml  # Crawler + Gluetun
├── release.sh          # Multi-arch build + push
└── data/               # Mounted volume (on server)
    ├── orgs.csv        # Input: ID list (from org-crawler output)
    ├── orgs.db         # Output: SQLite database
    └── failed.csv      # IDs that failed after all retries
```

## How It Works

1. **Startup:** Read `orgs.csv` → load already-fetched IDs from DB → compute pending list → IP leak check → Telegram startup message
2. **Main loop:** For each pending ID: fetch `citizen-profile-json-global/{id}` → parse → store in SQLite → sleep
3. **Resumability:** IDs present in `orgs` or `failed` table are skipped on restart — no duplicate work
4. **Error handling:** 404 → saved to `failed` table (deleted org), skip silently. Retryable errors → exponential backoff → VPN rotation → give up after 3 rotations
5. **Progress:** Telegram summary every 5,000 IDs

## SQLite Schema

```sql
CREATE TABLE orgs (
  id            INTEGER PRIMARY KEY,
  name          TEXT,
  created_at    TEXT,
  is_alive      INTEGER,  -- 0/1
  is_banned     INTEGER,  -- 0/1
  avatar        TEXT,
  about_me      TEXT,
  country       TEXT,
  currency      REAL,
  gold          REAL,
  newspaper_id  INTEGER,
  newspaper_name TEXT,
  friends_count INTEGER,
  fetched_at    TEXT
);
```

## API Endpoint

`GET https://www.erepublik.com/en/main/citizen-profile-json-global/{id}`

No authentication required. `got-scraping` handles TLS fingerprint rotation.

import Database from 'better-sqlite3';
import { mkdirSync } from 'fs';
import config from './config.js';

mkdirSync(config.dataDir, { recursive: true });

const db = new Database(config.dbPath);

db.pragma('journal_mode = WAL');
db.pragma('synchronous = NORMAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS orgs (
    id            INTEGER PRIMARY KEY,
    name          TEXT    NOT NULL,
    created_at    TEXT,
    is_alive      INTEGER,
    is_banned     INTEGER,
    avatar        TEXT,
    about_me      TEXT,
    country       TEXT,
    currency      REAL,
    gold          REAL,
    newspaper_id  INTEGER,
    newspaper_name TEXT,
    friends_count INTEGER,
    fetched_at    TEXT    NOT NULL
  );

  CREATE TABLE IF NOT EXISTS failed (
    id        INTEGER PRIMARY KEY,
    error     TEXT,
    failed_at TEXT NOT NULL
  );
`);

const insertOrg = db.prepare(`
  INSERT OR REPLACE INTO orgs
    (id, name, created_at, is_alive, is_banned, avatar, about_me, country,
     currency, gold, newspaper_id, newspaper_name, friends_count, fetched_at)
  VALUES
    (@id, @name, @created_at, @is_alive, @is_banned, @avatar, @about_me, @country,
     @currency, @gold, @newspaper_id, @newspaper_name, @friends_count, @fetched_at)
`);

const insertFailed = db.prepare(`
  INSERT OR REPLACE INTO failed (id, error, failed_at)
  VALUES (@id, @error, @failed_at)
`);

const getExistingIds = db.prepare(`
  SELECT id FROM orgs
  UNION
  SELECT id FROM failed
`);

export function loadExistingIds() {
  const rows = getExistingIds.all();
  return new Set(rows.map((r) => r.id));
}

export function saveOrg(org) {
  insertOrg.run({ ...org, fetched_at: new Date().toISOString() });
}

export function saveFailed(id, error) {
  insertFailed.run({ id, error, failed_at: new Date().toISOString() });
}

export function countOrgs() {
  return db.prepare('SELECT COUNT(*) as n FROM orgs').get().n;
}

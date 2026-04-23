import Database from 'better-sqlite3';

let _db = null;

export function setDb(db) {
  _db = db;
}

export function getDb() {
  if (!_db) {
    const path = process.env.DB_PATH || '/data/orgs.db';
    _db = new Database(path, { readonly: true });
    _db.pragma('journal_mode = WAL');
  }
  return _db;
}

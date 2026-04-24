import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import Database from 'better-sqlite3';
import { setDb } from '../db.js';
import { app } from '../index.js';

const testDb = new Database(':memory:');
testDb.exec(`
  CREATE TABLE orgs (
    id INTEGER PRIMARY KEY, name TEXT, created_at TEXT,
    is_alive INTEGER, is_banned INTEGER, avatar TEXT, about_me TEXT,
    country TEXT, currency REAL, gold REAL,
    newspaper_id INTEGER, newspaper_name TEXT, friends_count INTEGER, fetched_at TEXT
  );
  INSERT INTO orgs VALUES (1,'Bank of England','2007-12-19',1,0,NULL,'UK bank','United Kingdom',52000000,1.27,NULL,NULL,1,'2026-01-01');
  INSERT INTO orgs VALUES (2,'Banque de France','2007-12-20',1,0,NULL,'FR bank','France',981000,2188.0,NULL,NULL,0,'2026-01-01');
  INSERT INTO orgs VALUES (3,'Dead Org','2008-01-01',0,0,NULL,NULL,'Germany',0,0,NULL,NULL,0,'2026-01-01');
  INSERT INTO orgs VALUES (4,'Banned Org','2008-01-02',1,1,NULL,NULL,'France',100,0.5,42,'News',5,'2026-01-01');
`);
setDb(testDb);

describe('GET /api/orgs', () => {
  test('returns paginated response shape', async () => {
    const res = await request(app).get('/api/orgs');
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body.data));
    assert.equal(typeof res.body.total, 'number');
    assert.equal(typeof res.body.pages, 'number');
    assert.equal(res.body.page, 1);
  });

  test('filters by search', async () => {
    const res = await request(app).get('/api/orgs?search=Bank');
    assert.equal(res.status, 200);
    assert.equal(res.body.data.length, 1);
    assert.equal(res.body.data[0].name, 'Bank of England');
  });

  test('filters by country', async () => {
    const res = await request(app).get('/api/orgs?country=France');
    assert.equal(res.status, 200);
    assert.equal(res.body.total, 2);
  });

  test('sorts by gold descending', async () => {
    const res = await request(app).get('/api/orgs?sort=gold&order=desc&limit=100');
    assert.equal(res.status, 200);
    const golds = res.body.data.map(o => o.gold);
    assert.deepEqual(golds, [...golds].sort((a, b) => b - a));
  });

  test('ignores invalid sort column and falls back to currency', async () => {
    const res = await request(app).get('/api/orgs?sort=DROP+TABLE');
    assert.equal(res.status, 200);
    assert.ok(res.body.data);
  });

  test('paginates correctly', async () => {
    const res = await request(app).get('/api/orgs?limit=2&page=2');
    assert.equal(res.status, 200);
    assert.equal(res.body.data.length, 2);
    assert.equal(res.body.page, 2);
  });
});

describe('GET /api/orgs/:id', () => {
  test('returns full org record', async () => {
    const res = await request(app).get('/api/orgs/1');
    assert.equal(res.status, 200);
    assert.equal(res.body.name, 'Bank of England');
    assert.equal(res.body.country, 'United Kingdom');
  });

  test('returns 404 for unknown id', async () => {
    const res = await request(app).get('/api/orgs/99999');
    assert.equal(res.status, 404);
  });

  test('returns 400 for non-numeric id', async () => {
    const res = await request(app).get('/api/orgs/abc');
    assert.equal(res.status, 400);
  });
});

describe('GET /api/countries', () => {
  test('returns sorted unique country list', async () => {
    const res = await request(app).get('/api/countries');
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body));
    assert.ok(res.body.includes('France'));
    assert.ok(res.body.includes('United Kingdom'));
    assert.deepEqual(res.body, [...res.body].sort());
  });
});

describe('GET /api/stats', () => {
  test('returns numeric aggregates', async () => {
    const res = await request(app).get('/api/stats');
    assert.equal(res.status, 200);
    assert.equal(res.body.total, 4);
    assert.equal(res.body.alive, 3);
    assert.equal(res.body.banned, 1);
    assert.ok(res.body.totalCurrency > 0);
    assert.ok(res.body.totalGold > 0);
  });
});

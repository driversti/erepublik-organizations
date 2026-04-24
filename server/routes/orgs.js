import { Router } from 'express';
import { getDb } from '../db.js';

const router = Router();

const ALLOWED_SORT  = new Set(['id', 'name', 'currency', 'gold']);
const ALLOWED_ORDER = new Set(['asc', 'desc']);

router.get('/orgs', (req, res) => {
  try {
    const db     = getDb();
    const rawPage = parseInt(req.query.page) || 1;
    const page   = Math.min(1_000_000, Math.max(1, rawPage));
    const limit  = Math.min(100, Math.max(1, parseInt(req.query.limit) || 50));
    const search  = req.query.search?.trim()  || '';
    const country = req.query.country?.trim() || '';
    const sort    = ALLOWED_SORT.has(req.query.sort)   ? req.query.sort   : 'currency';
    const order   = ALLOWED_ORDER.has(req.query.order) ? req.query.order  : 'desc';
    const offset  = (page - 1) * limit;

    const conditions = ['1=1'];
    const params = [];

    if (search)  { conditions.push('name LIKE ?');  params.push(`%${search}%`); }
    if (country) { conditions.push('country = ?');  params.push(country); }
    if (req.query.alive === '1') { conditions.push('is_alive = 1'); }

    const where = conditions.join(' AND ');

    const total = db.prepare(`SELECT COUNT(*) as n FROM orgs WHERE ${where}`)
      .get(...params).n;

    const data = db.prepare(
      `SELECT id, name, country, avatar, currency, gold, is_alive, is_banned
       FROM orgs WHERE ${where}
       ORDER BY ${sort} ${order}
       LIMIT ? OFFSET ?`
    ).all(...params, limit, offset);

    res.json({ data, total, page, limit, pages: Math.max(1, Math.ceil(total / limit)) });
  } catch (e) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/orgs/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid ID' });

    const org = getDb().prepare('SELECT * FROM orgs WHERE id = ?').get(id);
    if (!org) return res.status(404).json({ error: 'Not found' });

    res.json(org);
  } catch (e) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/countries', (_req, res) => {
  try {
    const rows = getDb()
      .prepare('SELECT DISTINCT country FROM orgs WHERE country IS NOT NULL ORDER BY country')
      .all();
    res.json(rows.map(r => r.country));
  } catch (e) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/stats', (_req, res) => {
  try {
    const stats = getDb().prepare(`
      SELECT
        COUNT(*)                                          AS total,
        SUM(CASE WHEN is_alive = 1 THEN 1 ELSE 0 END)   AS alive,
        SUM(CASE WHEN is_alive = 0 THEN 1 ELSE 0 END)   AS dead,
        SUM(CASE WHEN is_banned = 1 THEN 1 ELSE 0 END)  AS banned,
        COALESCE(SUM(currency), 0)                       AS totalCurrency,
        COALESCE(SUM(gold), 0)                           AS totalGold
      FROM orgs
    `).get();
    res.json(stats);
  } catch (e) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/stats/countries', (_req, res) => {
  try {
    const rows = getDb().prepare(`
      SELECT
        COALESCE(country, 'Unknown')   AS country,
        COUNT(*)                       AS count,
        COALESCE(SUM(currency), 0)     AS totalCurrency,
        COALESCE(SUM(gold), 0)         AS totalGold
      FROM orgs
      GROUP BY country
      ORDER BY count DESC
    `).all();
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/stats/wealth', (_req, res) => {
  try {
    const db = getDb();

    const buckets = db.prepare(`
      SELECT
        CASE
          WHEN currency IS NULL OR currency = 0  THEN '0'
          WHEN currency < 100                    THEN '0–100'
          WHEN currency < 1000                   THEN '100–1K'
          WHEN currency < 10000                  THEN '1K–10K'
          WHEN currency < 100000                 THEN '10K–100K'
          WHEN currency < 1000000                THEN '100K–1M'
          ELSE '1M+'
        END AS bucket,
        COUNT(*)                   AS count,
        COALESCE(SUM(currency), 0) AS totalCurrency
      FROM orgs
      GROUP BY bucket
    `).all();

    const goldBuckets = db.prepare(`
      SELECT
        CASE
          WHEN gold IS NULL OR gold = 0  THEN '0'
          WHEN gold < 100                THEN '0–100'
          WHEN gold < 1000               THEN '100–1K'
          WHEN gold < 10000              THEN '1K–10K'
          WHEN gold < 100000             THEN '10K–100K'
          WHEN gold < 1000000            THEN '100K–1M'
          ELSE '1M+'
        END AS bucket,
        COUNT(*)              AS count,
        COALESCE(SUM(gold), 0) AS totalGold
      FROM orgs
      GROUP BY bucket
    `).all();

    const concentration = db.prepare(`
      WITH cc_ranked AS (
        SELECT currency, ROW_NUMBER() OVER (ORDER BY currency DESC) AS rn
        FROM orgs WHERE currency IS NOT NULL
      ),
      gold_ranked AS (
        SELECT gold, ROW_NUMBER() OVER (ORDER BY gold DESC) AS rn
        FROM orgs WHERE gold IS NOT NULL
      ),
      totals AS (
        SELECT COUNT(*) AS n, SUM(currency) AS totalCC, SUM(gold) AS totalGold FROM orgs
      )
      SELECT
        (SELECT totalCC   FROM totals) AS totalCC,
        (SELECT totalGold FROM totals) AS totalGold,
        (SELECT n         FROM totals) AS total,
        SUM(CASE WHEN cc_ranked.rn   <= CAST((SELECT n FROM totals) * 0.001 AS INTEGER) THEN currency ELSE 0 END) AS top01pctCC,
        SUM(CASE WHEN cc_ranked.rn   <= CAST((SELECT n FROM totals) * 0.01  AS INTEGER) THEN currency ELSE 0 END) AS top1pctCC,
        SUM(CASE WHEN cc_ranked.rn   <= CAST((SELECT n FROM totals) * 0.1   AS INTEGER) THEN currency ELSE 0 END) AS top10pctCC,
        (SELECT SUM(CASE WHEN rn <= CAST((SELECT n FROM totals) * 0.001 AS INTEGER) THEN gold ELSE 0 END) FROM gold_ranked) AS top01pctGold,
        (SELECT SUM(CASE WHEN rn <= CAST((SELECT n FROM totals) * 0.01  AS INTEGER) THEN gold ELSE 0 END) FROM gold_ranked) AS top1pctGold,
        (SELECT SUM(CASE WHEN rn <= CAST((SELECT n FROM totals) * 0.1   AS INTEGER) THEN gold ELSE 0 END) FROM gold_ranked) AS top10pctGold
      FROM cc_ranked
    `).get();

    res.json({ buckets, goldBuckets, concentration });
  } catch (e) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/stats/timeline', (_req, res) => {
  try {
    const rows = getDb().prepare(`
      SELECT
        strftime('%Y', created_at) AS year,
        COUNT(*)                   AS count
      FROM orgs
      WHERE created_at IS NOT NULL AND created_at != ''
      GROUP BY year
      ORDER BY year
    `).all();
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

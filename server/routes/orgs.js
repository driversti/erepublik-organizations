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

export default router;

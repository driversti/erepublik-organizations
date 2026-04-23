# eOrganizations Website — Design Spec

**Date:** 2026-04-23  
**Status:** Approved

## Overview

A minimalist web interface for browsing all known eRepublik organizations (~106K entries). Served from the same server as the crawler (`erepublik@192.168.10.18`), accessible via IP:PORT. No authentication required.

---

## Stack

| Layer | Technology |
|-------|-----------|
| Backend | Node.js 20 + Express |
| Database | better-sqlite3 (read-only, shared `orgs.db` volume with crawler) |
| Frontend | React 18 + Vite |
| Styling | Tailwind CSS v3 with dark mode via `class` strategy |
| Routing | React Router v6 |
| Table | TanStack Table v8 |
| Containerization | Single Docker container, port `3001` |

---

## Pages

### `/` — Organizations Table

**Layout:**
- Navbar: logo `eOrganizations` | org count badge | theme toggle (☀️/🌙)
- Filter bar: text search input (by name) + country dropdown
- Table with columns: avatar (32px circle) | Name (sortable) | Country | Currency CC (sortable, default sort desc) | Gold (sortable)
- Pagination: 50 rows per page, prev/next + page numbers
- Row click navigates to `/org/:id`

**Behavior:**
- All filtering, sorting, pagination handled server-side via API query params
- Country dropdown populated from `/api/countries`
- Search debounced 300ms
- Sort state reflected in URL query string (`?sort=currency&order=desc`)

**Visual:**
- CC values formatted: `52123978` → `52.1M`, `981053` → `981K`
- Gold values: up to 2 decimal places
- Deleted orgs (`is_alive=0`) shown with slightly dimmed name
- Banned orgs (`is_banned=1`) shown with a small 🚫 badge

---

### `/org/:id` — Organization Detail

**Layout:**
- Back link `← Back to organizations`
- Hero: large avatar (48px) | name (bold) | country flag + name | founded date
- Stats grid (2 columns): CC card | Gold card
- About me (if not empty)
- Newspaper link (if exists): `📰 Newspaper name`
- External link button: `🔗 View on eRepublik ↗` → opens `https://www.erepublik.com/en/citizen/profile/:id`

**Behavior:**
- If org not found → 404 message with back link
- Avatar fallback: grey circle placeholder if image fails to load

---

## API

Base path: `/api`

### `GET /api/orgs`

Query params:
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `page` | int | 1 | Page number |
| `limit` | int | 50 | Rows per page (max 100) |
| `search` | string | — | Filter by name (LIKE) |
| `country` | string | — | Filter by exact country name |
| `sort` | string | `currency` | Column: `id`, `name`, `currency`, `gold` |
| `order` | string | `desc` | `asc` or `desc` |

Response:
```json
{
  "data": [{ "id": 6636, "name": "Bank of England", "country": "United Kingdom", "avatar": "...", "currency": 52123978.04, "gold": 1.27, "is_alive": 1, "is_banned": 0 }],
  "total": 106644,
  "page": 1,
  "limit": 50,
  "pages": 2133
}
```

### `GET /api/orgs/:id`

Returns full org record (all columns from DB). 404 if not found.

### `GET /api/countries`

Returns sorted list of distinct country names:
```json
["France", "Germany", "Romania", "United Kingdom", ...]
```

### `GET /api/stats`

```json
{
  "total": 106644,
  "alive": 89201,
  "banned": 312,
  "totalCurrency": 1234567890.12,
  "totalGold": 98765.43
}
```

---

## Dark / Light Theme

- Default: system preference (`prefers-color-scheme`)
- Toggle: stored in `localStorage` key `theme`
- Implementation: Tailwind `darkMode: 'class'` — toggle `dark` class on `<html>`

**Color palette:**

| Token | Dark | Light |
|-------|------|-------|
| Background | `#0f172a` | `#f8fafc` |
| Surface | `#1e293b` | `#ffffff` |
| Border | `#1e293b` | `#f1f5f9` |
| Text primary | `#e2e8f0` | `#0f172a` |
| Text muted | `#475569` | `#94a3b8` |
| CC value | `#34d399` | `#059669` |
| Gold value | `#fbbf24` | `#d97706` |
| Accent | `#3b82f6` | `#3b82f6` |

---

## Docker

Single multi-stage Dockerfile:

```
Stage 1 (frontend): node:20-alpine → npm ci → vite build → dist/
Stage 2 (runtime):  node:20-alpine → copy dist/ to server/public/ → npm ci → node server/index.js
```

Added to existing `docker-compose.yml` as new `website` service:
- Image: `registry.yurii.live/eorganizations-web:latest`
- Port: `3001:3001`
- Volume: `./data:/data` (read-only, same as crawler)
- Restart: `unless-stopped`

---

## File Structure

```
organizations/
├── server/
│   ├── index.js          # Express app: static + API routes
│   ├── db.js             # Read-only DB connection
│   └── routes/
│       └── orgs.js       # /api/orgs, /api/orgs/:id, /api/countries, /api/stats
├── frontend/
│   ├── index.html
│   ├── vite.config.js
│   ├── tailwind.config.js
│   ├── package.json
│   └── src/
│       ├── main.jsx
│       ├── App.jsx           # Router + ThemeProvider
│       ├── pages/
│       │   ├── Home.jsx      # Table page
│       │   └── OrgDetail.jsx # Detail page
│       ├── components/
│       │   ├── Navbar.jsx
│       │   ├── OrgTable.jsx
│       │   ├── Filters.jsx
│       │   ├── Pagination.jsx
│       │   └── ThemeToggle.jsx
│       └── lib/
│           ├── api.js        # fetch wrappers
│           └── format.js     # formatCurrency, formatGold
├── Dockerfile.web
├── app.js                # crawler (existing)
└── docker-compose.yml    # adds website service
```

---

## Deployment

```bash
# Build and push
./release-web.sh

# Deploy
ssh erepublik@192.168.10.18 "cd ~/docker/eorganizations && docker compose pull website && docker compose up -d website"
```

Access: `http://192.168.10.18:3001`

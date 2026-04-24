import { useEffect, useState } from 'react';
import { getStats, getStatsCountries, getStatsWealth, getStatsTimeline } from '../lib/api.js';
import { formatCurrency, formatGold } from '../lib/format.js';

function StatCard({ label, value, sub }) {
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm">
      <div className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">{label}</div>
      <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">{value}</div>
      {sub && <div className="text-xs text-slate-400 dark:text-slate-500 mt-1">{sub}</div>}
    </div>
  );
}

function SectionBox({ title, children }) {
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-sm">
      <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 text-sm font-semibold text-slate-700 dark:text-slate-300">
        {title}
      </div>
      {children}
    </div>
  );
}

const BUCKET_ORDER = ['0', '0–100', '100–1K', '1K–10K', '10K–100K', '100K–1M', '1M+'];

function ConcentrationCards({ top01, top1, top10, total, totalAsset, label, fmt }) {
  const pct  = (v) => totalAsset > 0 ? ((v / totalAsset) * 100).toFixed(1) : '0';
  const orgsN = (f) => Math.round(total * f).toLocaleString();
  return (
    <div className="p-4 grid grid-cols-1 sm:grid-cols-3 gap-3 border-b border-slate-100 dark:border-slate-800">
      {[
        { f: 0.001, v: top01, label: `Top 0.1% (${orgsN(0.001)} orgs)` },
        { f: 0.01,  v: top1,  label: `Top 1% (${orgsN(0.01)} orgs)` },
        { f: 0.1,   v: top10, label: `Top 10% (${orgsN(0.1)} orgs)` },
      ].map(({ v, label: l }) => (
        <div key={l} className="rounded-lg bg-slate-50 dark:bg-slate-800/50 p-4 text-center">
          <div className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">{l}</div>
          <div className="text-3xl font-bold text-slate-900 dark:text-slate-100">{pct(v)}%</div>
          <div className="text-xs text-slate-400 mt-1">of all {label} · {fmt(v)}</div>
        </div>
      ))}
    </div>
  );
}

function WealthSection({ data }) {
  const { buckets, goldBuckets, concentration } = data;
  const { totalCC, totalGold, total,
          top01pctCC, top1pctCC, top10pctCC,
          top01pctGold, top1pctGold, top10pctGold } = concentration;

  const [tab, setTab] = useState('cc');

  const isCC = tab === 'cc';
  const activeBuckets = [...(isCC ? buckets : goldBuckets)].sort(
    (a, b) => BUCKET_ORDER.indexOf(a.bucket) - BUCKET_ORDER.indexOf(b.bucket)
  );
  const maxCount = Math.max(...activeBuckets.map(b => b.count));
  const unit = isCC ? 'CC' : 'Gold';
  const fmt  = isCC ? formatCurrency : formatGold;
  const amountKey = isCC ? 'totalCurrency' : 'totalGold';

  return (
    <SectionBox title="Wealth concentration">
      <div className="flex gap-1 px-4 pt-3">
        {[['cc', 'CC'], ['gold', 'Gold']].map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-3 py-1 text-xs rounded-md font-medium transition-colors ${
              tab === key
                ? 'bg-blue-500 text-white'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {isCC ? (
        <ConcentrationCards
          top01={top01pctCC} top1={top1pctCC} top10={top10pctCC}
          total={total} totalAsset={totalCC}
          label="CC" fmt={formatCurrency}
        />
      ) : (
        <ConcentrationCards
          top01={top01pctGold} top1={top1pctGold} top10={top10pctGold}
          total={total} totalAsset={totalGold}
          label="Gold" fmt={formatGold}
        />
      )}

      <div className="p-4 space-y-2">
        {activeBuckets.map(b => (
          <div key={b.bucket} className="flex items-center gap-3 text-sm">
            <div className="w-20 text-right text-xs text-slate-500 dark:text-slate-400 shrink-0">{b.bucket} {unit}</div>
            <div className="flex-1 bg-slate-100 dark:bg-slate-800 rounded-full h-5 overflow-hidden">
              <div
                className="h-full bg-blue-500 dark:bg-blue-600 rounded-full transition-all"
                style={{ width: `${(b.count / maxCount) * 100}%` }}
              />
            </div>
            <div className="w-24 text-xs tabular-nums text-slate-600 dark:text-slate-400 shrink-0">
              {b.count.toLocaleString()} orgs
            </div>
            <div className="w-24 text-xs tabular-nums text-slate-400 dark:text-slate-500 shrink-0 hidden sm:block">
              {fmt(b[amountKey])} {unit}
            </div>
          </div>
        ))}
      </div>
    </SectionBox>
  );
}

function TimelineSection({ rows }) {
  const maxCount = Math.max(...rows.map(r => r.count));

  return (
    <SectionBox title="Organizations created per year">
      <div className="p-4">
        <div className="flex items-end gap-1.5 h-48">
          {rows.map(r => {
            const heightPct = (r.count / maxCount) * 100;
            return (
              <div key={r.year} className="flex-1 flex flex-col items-center gap-1 group min-w-0">
                <div className="relative w-full flex flex-col justify-end" style={{ height: '160px' }}>
                  <div
                    className="w-full bg-blue-500 dark:bg-blue-600 rounded-t hover:bg-blue-400 dark:hover:bg-blue-500 transition-colors cursor-default"
                    style={{ height: `${heightPct}%` }}
                    title={`${r.year}: ${r.count.toLocaleString()} orgs`}
                  />
                  <div className="absolute -top-5 left-1/2 -translate-x-1/2 text-xs text-slate-500 dark:text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none bg-white dark:bg-slate-900 px-1 rounded shadow text-center z-10">
                    {r.count.toLocaleString()}
                  </div>
                </div>
                <div className="text-xs text-slate-400 dark:text-slate-500 rotate-45 origin-top-left translate-y-2 translate-x-1 w-8 overflow-hidden text-ellipsis whitespace-nowrap">
                  {r.year}
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-6 flex flex-wrap gap-x-6 gap-y-1 text-xs text-slate-400 dark:text-slate-500">
          {rows.map(r => (
            <span key={r.year}><span className="text-slate-600 dark:text-slate-300 font-medium">{r.year}</span> — {r.count.toLocaleString()}</span>
          ))}
        </div>
      </div>
    </SectionBox>
  );
}

export default function Stats() {
  const [stats, setStats]         = useState(null);
  const [countries, setCountries] = useState([]);
  const [wealth, setWealth]       = useState(null);
  const [timeline, setTimeline]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(null);
  const [sort, setSort]           = useState('count');
  const [order, setOrder]         = useState('desc');

  useEffect(() => {
    Promise.all([getStats(), getStatsCountries(), getStatsWealth(), getStatsTimeline()])
      .then(([s, c, w, t]) => { setStats(s); setCountries(c); setWealth(w); setTimeline(t); })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  function handleSort(key) {
    if (sort === key) setOrder(o => o === 'desc' ? 'asc' : 'desc');
    else { setSort(key); setOrder('desc'); }
  }

  const sorted = [...countries].sort((a, b) => {
    const av = a[sort], bv = b[sort];
    if (typeof av === 'string') return order === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
    return order === 'asc' ? av - bv : bv - av;
  });

  if (loading) return <div className="p-12 text-center text-slate-400 text-sm">Loading…</div>;
  if (error)   return <div className="p-12 text-center text-red-500 text-sm">{error}</div>;

  const dead = stats.dead ?? (stats.total - stats.alive);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard label="Total orgs" value={stats.total.toLocaleString()} />
        <StatCard label="Alive"      value={stats.alive.toLocaleString()} />
        <StatCard label="Dead"       value={dead.toLocaleString()} />
        <StatCard label="Banned"     value={stats.banned.toLocaleString()} />
        <StatCard label="Total CC"   value={formatCurrency(stats.totalCurrency)} sub={stats.totalCurrency.toLocaleString('en', { maximumFractionDigits: 0 })} />
        <StatCard label="Total Gold" value={formatGold(stats.totalGold)} />
      </div>

      {wealth && <WealthSection data={wealth} />}

      {timeline.length > 0 && <TimelineSection rows={timeline} />}

      <SectionBox title="Organizations by country">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800">
                {[
                  { key: 'country',       label: 'Country' },
                  { key: 'count',         label: 'Orgs' },
                  { key: 'totalCurrency', label: 'Total CC' },
                  { key: 'totalGold',     label: 'Total Gold' },
                ].map(({ key, label }) => (
                  <th
                    key={key}
                    onClick={() => handleSort(key)}
                    className="px-4 py-2.5 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide cursor-pointer select-none hover:text-slate-700 dark:hover:text-slate-200"
                  >
                    {label}
                    {sort === key && <span className="ml-1">{order === 'desc' ? '↓' : '↑'}</span>}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.map((row, i) => (
                <tr
                  key={row.country}
                  className={`border-b border-slate-50 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800/40 ${i % 2 === 0 ? '' : 'bg-slate-50/40 dark:bg-slate-800/20'}`}
                >
                  <td className="px-4 py-2 font-medium text-slate-800 dark:text-slate-200">{row.country}</td>
                  <td className="px-4 py-2 tabular-nums text-slate-700 dark:text-slate-300">{row.count.toLocaleString()}</td>
                  <td className="px-4 py-2 tabular-nums text-slate-700 dark:text-slate-300">{formatCurrency(row.totalCurrency)}</td>
                  <td className="px-4 py-2 tabular-nums text-slate-700 dark:text-slate-300">{formatGold(row.totalGold)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionBox>
    </div>
  );
}

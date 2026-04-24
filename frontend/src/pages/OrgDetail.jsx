import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getOrg } from '../lib/api.js';
import { formatCurrency, formatGold } from '../lib/format.js';

function StatCard({ label, value, valueClass }) {
  return (
    <div className="rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 p-4">
      <div className="text-xs uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1">{label}</div>
      <div className={`text-2xl font-bold tabular-nums ${valueClass}`}>{value}</div>
    </div>
  );
}

export default function OrgDetail() {
  const { id } = useParams();
  const [org, setOrg]             = useState(null);
  const [loading, setLoading]     = useState(true);
  const [notFound, setNotFound]   = useState(false);

  useEffect(() => {
    setLoading(true);
    setNotFound(false);
    getOrg(id)
      .then(setOrg)
      .catch(e => { if (e.message.startsWith('404')) setNotFound(true); })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return <div className="p-12 text-center text-slate-400 dark:text-slate-500 text-sm">Loading…</div>;
  }

  if (notFound || !org) {
    return (
      <div className="text-center py-16">
        <p className="text-slate-500 dark:text-slate-400 mb-4">Organization not found.</p>
        <Link to="/" className="text-blue-500 hover:underline text-sm">← Back to organizations</Link>
      </div>
    );
  }

  const createdDate = org.created_at
    ? new Date(org.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : null;

  return (
    <div className="max-w-2xl mx-auto">
      <Link to="/" className="text-blue-500 hover:underline text-sm mb-6 block">← Back to organizations</Link>

      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-sm">
        {/* Hero */}
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center gap-4">
          {org.avatar ? (
            <img
              src={org.avatar}
              alt={org.name}
              className="w-14 h-14 rounded-full object-cover bg-slate-200 dark:bg-slate-700 border-2 border-slate-200 dark:border-slate-700 flex-shrink-0"
              onError={e => { e.currentTarget.style.display = 'none'; }}
            />
          ) : (
            <div className="w-14 h-14 rounded-full bg-slate-200 dark:bg-slate-700 flex-shrink-0" />
          )}
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              {org.name}
              {org.is_banned ? <span className="text-base">🚫</span> : null}
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              {org.country && <span>{org.country}</span>}
              {org.country && createdDate && <span className="mx-1.5">·</span>}
              {createdDate && <span>Founded {createdDate}</span>}
            </p>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <StatCard
              label="Currency (CC)"
              value={formatCurrency(org.currency)}
              valueClass="text-emerald-600 dark:text-emerald-400"
            />
            <StatCard
              label="Gold"
              value={formatGold(org.gold)}
              valueClass="text-amber-600 dark:text-amber-400"
            />
          </div>

          {org.about_me && (
            <div className="rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 p-4">
              <div className="text-xs uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">About</div>
              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{org.about_me}</p>
            </div>
          )}

          {org.newspaper_name && (
            <div className="rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 px-4 py-3 text-sm text-slate-600 dark:text-slate-300 flex items-center gap-2">
              <span>📰</span>
              <span>{org.newspaper_name}</span>
            </div>
          )}

          <div>
            <a
              href={`https://www.erepublik.com/en/citizen/profile/${org.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              🔗 View on eRepublik ↗
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

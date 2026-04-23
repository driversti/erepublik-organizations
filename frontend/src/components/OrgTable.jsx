import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatCurrency, formatGold } from '../lib/format.js';

function Avatar({ src, name }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex-shrink-0" />;
  }
  return (
    <img
      src={src}
      alt={name}
      className="w-8 h-8 rounded-full object-cover bg-slate-200 dark:bg-slate-700 flex-shrink-0"
      onError={() => setFailed(true)}
    />
  );
}

const COLUMNS = [
  { key: 'name',     label: 'Name',     sortable: true  },
  { key: 'country',  label: 'Country',  sortable: false },
  { key: 'currency', label: 'CC',       sortable: true  },
  { key: 'gold',     label: 'Gold',     sortable: true  },
];

export default function OrgTable({ orgs, sort, order, onSort }) {
  const navigate = useNavigate();

  function handleSort(key) {
    if (sort === key) {
      onSort(key, order === 'desc' ? 'asc' : 'desc');
    } else {
      onSort(key, 'desc');
    }
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
            <th className="w-10 px-3 py-2" />
            {COLUMNS.map(col => (
              <th
                key={col.key}
                onClick={col.sortable ? () => handleSort(col.key) : undefined}
                className={`px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 ${col.sortable ? 'cursor-pointer select-none hover:text-slate-600 dark:hover:text-slate-300' : ''}`}
              >
                {col.label}
                {col.sortable && sort === col.key && (
                  <span className="ml-1">{order === 'desc' ? '↓' : '↑'}</span>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {orgs.map(org => (
            <tr
              key={org.id}
              onClick={() => navigate(`/org/${org.id}`)}
              className="border-b border-slate-50 dark:border-slate-900 hover:bg-slate-50 dark:hover:bg-slate-900/60 cursor-pointer transition-colors"
            >
              <td className="px-3 py-2">
                <Avatar src={org.avatar} name={org.name} />
              </td>
              <td className="px-3 py-2">
                <span className={org.is_alive ? 'text-slate-800 dark:text-slate-200 font-medium' : 'text-slate-400 dark:text-slate-600 font-medium'}>
                  {org.name}
                </span>
                {org.is_banned ? <span className="ml-1.5 text-xs">🚫</span> : null}
              </td>
              <td className="px-3 py-2 text-slate-500 dark:text-slate-400 text-xs">{org.country}</td>
              <td className="px-3 py-2 font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
                {formatCurrency(org.currency)}
              </td>
              <td className="px-3 py-2 font-medium tabular-nums text-amber-600 dark:text-amber-400">
                {formatGold(org.gold)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

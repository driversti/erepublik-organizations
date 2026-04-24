import { useEffect, useRef } from 'react';

export default function Filters({ search, onSearch, country, onCountry, countries, alive, onAlive }) {
  const timer = useRef(null);

  function handleSearch(e) {
    const val = e.target.value;
    clearTimeout(timer.current);
    timer.current = setTimeout(() => onSearch(val), 300);
  }

  useEffect(() => () => clearTimeout(timer.current), []);

  return (
    <div className="flex gap-2 p-3 border-b border-slate-100 dark:border-slate-800">
      <input
        type="text"
        defaultValue={search}
        onChange={handleSearch}
        placeholder="Search organizations…"
        className="flex-1 text-sm px-3 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
      />
      <select
        value={country}
        onChange={e => onCountry(e.target.value)}
        className="text-sm px-3 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500"
      >
        <option value="">🌍 All countries</option>
        {countries.map(c => (
          <option key={c} value={c}>{c}</option>
        ))}
      </select>
      <button
        type="button"
        onClick={() => onAlive(!alive)}
        className={`text-sm px-3 py-1.5 rounded-md border font-medium whitespace-nowrap focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors ${
          alive
            ? 'border-green-500 bg-green-500 text-white dark:border-green-500 dark:bg-green-600'
            : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
        }`}
      >
        ✅ Alive only
      </button>
    </div>
  );
}

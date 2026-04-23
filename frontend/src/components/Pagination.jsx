export default function Pagination({ page, pages, total, limit, onPage }) {
  if (pages <= 1) return null;

  const start = (page - 1) * limit + 1;
  const end   = Math.min(page * limit, total);

  const pageNums = [];
  const delta = 2;
  for (let i = Math.max(1, page - delta); i <= Math.min(pages, page + delta); i++) {
    pageNums.push(i);
  }

  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-400 dark:text-slate-500">
      <span>Showing {start.toLocaleString()}–{end.toLocaleString()} of {total.toLocaleString()}</span>
      <div className="flex gap-1">
        <button
          onClick={() => onPage(page - 1)}
          disabled={page === 1}
          className="px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 disabled:opacity-30 hover:bg-slate-200 dark:hover:bg-slate-700"
        >
          ←
        </button>
        {pageNums[0] > 1 && <span className="px-2 py-1">…</span>}
        {pageNums.map(n => (
          <button
            key={n}
            onClick={() => onPage(n)}
            className={`px-2 py-1 rounded ${n === page ? 'bg-blue-500 text-white' : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700'}`}
          >
            {n}
          </button>
        ))}
        {pageNums[pageNums.length - 1] < pages && <span className="px-2 py-1">…</span>}
        <button
          onClick={() => onPage(page + 1)}
          disabled={page === pages}
          className="px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 disabled:opacity-30 hover:bg-slate-200 dark:hover:bg-slate-700"
        >
          →
        </button>
      </div>
    </div>
  );
}

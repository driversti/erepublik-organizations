import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import Filters from '../components/Filters.jsx';
import OrgTable from '../components/OrgTable.jsx';
import Pagination from '../components/Pagination.jsx';
import { getOrgs, getCountries } from '../lib/api.js';

const limit = 50;

export default function Home({ setOrgCount }) {
  const [searchParams, setSearchParams] = useSearchParams();

  const [orgs, setOrgs]           = useState([]);
  const [total, setTotal]         = useState(0);
  const [pages, setPages]         = useState(1);
  const [countries, setCountries] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(null);

  const page    = parseInt(searchParams.get('page'))    || 1;
  const sort    = searchParams.get('sort')    || 'currency';
  const order   = searchParams.get('order')   || 'desc';
  const search  = searchParams.get('search')  || '';
  const country = searchParams.get('country') || '';

  function setParam(key, value) {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      if (value) next.set(key, value); else next.delete(key);
      next.delete('page');
      return next;
    });
  }

  function setPage(p) {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      next.set('page', p);
      return next;
    });
  }

  function handleSort(key, dir) {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      next.set('sort', key);
      next.set('order', dir);
      next.delete('page');
      return next;
    });
  }

  const fetchOrgs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getOrgs({ page, limit, search, country, sort, order });
      setOrgs(data.data);
      setTotal(data.total);
      setPages(data.pages);
      setOrgCount(data.total);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [page, limit, search, country, sort, order, setOrgCount]);

  useEffect(() => { fetchOrgs(); }, [fetchOrgs]);
  useEffect(() => { getCountries().then(setCountries).catch(() => {}); }, []);

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-sm">
      <Filters
        search={search}
        onSearch={v => setParam('search', v)}
        country={country}
        onCountry={v => setParam('country', v)}
        countries={countries}
      />

      {error && (
        <div className="p-6 text-center text-red-500 dark:text-red-400 text-sm">{error}</div>
      )}

      {loading && !error && (
        <div className="p-12 text-center text-slate-400 dark:text-slate-500 text-sm">Loading…</div>
      )}

      {!loading && !error && orgs.length === 0 && (
        <div className="p-12 text-center text-slate-400 dark:text-slate-500 text-sm">No organizations found.</div>
      )}

      {!loading && !error && orgs.length > 0 && (
        <>
          <OrgTable orgs={orgs} sort={sort} order={order} onSort={handleSort} />
          <Pagination page={page} pages={pages} total={total} limit={limit} onPage={setPage} />
        </>
      )}
    </div>
  );
}

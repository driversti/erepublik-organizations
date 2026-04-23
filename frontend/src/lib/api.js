const BASE = '/api';

async function get(path) {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json();
}

export function getOrgs({ page = 1, limit = 50, search = '', country = '', sort = 'currency', order = 'desc' } = {}) {
  const params = new URLSearchParams({ page, limit, sort, order });
  if (search)  params.set('search', search);
  if (country) params.set('country', country);
  return get(`/orgs?${params}`);
}

export function getOrg(id) {
  return get(`/orgs/${id}`);
}

export function getCountries() {
  return get('/countries');
}

export function getStats() {
  return get('/stats');
}

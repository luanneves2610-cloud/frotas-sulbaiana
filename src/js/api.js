import { SB_URL, SB_KEY } from './config.js';

// Token JWT do usuário autenticado — atualizado pelo auth.js via onAuthStateChange
let _authToken = null;

export function setAuthToken(token) {
  _authToken = token;
}

export async function sbReq(method, table, data, query) {
  const url = `${SB_URL}/rest/v1/${table}${query ? '?' + query : ''}`;
  const headers = {
    'apikey': SB_KEY,
    'Authorization': 'Bearer ' + (_authToken || SB_KEY),
    'Content-Type': 'application/json',
    'Prefer': 'return=representation'
  };
  const opts = { method, headers };
  if (data) opts.body = JSON.stringify(data);
  if (method === 'GET') delete opts.headers['Content-Type'];
  const r = await fetch(url, opts);
  if (!r.ok) { const e = await r.text(); throw new Error(e); }
  if (method === 'DELETE' || r.status === 204) return true;
  const t = await r.text(); return t ? JSON.parse(t) : [];
}

export const FB = {
  add: async (table, data) => {
    const res = await sbReq('POST', table, data, '');
    return { id: Array.isArray(res) ? res[0]?.id : res?.id };
  },
  upd: async (table, id, data) => {
    await sbReq('PATCH', table, data, `id=eq.${id}`);
  },
  del: async (table, id) => {
    await sbReq('DELETE', table, null, `id=eq.${id}`);
  },
  getAll: async (table, ord) => {
    const selects = {
      veiculos: 'select=*,contratos(nome_contrato),localidades(nome_localidade),centros_custo(nome)',
      centros_custo: 'select=*,contratos(nome_contrato),localidades(nome_localidade)',
    };
    const base = selects[table] || 'select=*';
    const order = ord ? `&order=${ord}` : '&order=id';
    return await sbReq('GET', table, null, base + order);
  },
  ts: () => new Date().toISOString()
};

// Make globally accessible
window.FB = FB;
window.sbReq = sbReq;

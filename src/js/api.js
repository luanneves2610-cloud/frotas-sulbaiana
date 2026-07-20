import { SB_URL, SB_KEY } from './config.js';

// Token JWT do usuário autenticado — atualizado pelo auth.js via onAuthStateChange
let _authToken = null;

export function setAuthToken(token) {
  _authToken = token;
}

export function getAuthToken() {
  return _authToken;
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
  // Busca todos os registros em páginas.
  // Sem paginação, a API corta silenciosamente no limite de linhas do servidor
  // (padrão 1000) e os totais/relatórios ficariam errados sem nenhum aviso.
  getAll: async (table, ord) => {
    const selects = {
      veiculos: 'select=*,contratos(nome_contrato),localidades(nome_localidade),centros_custo(nome)',
      centros_custo: 'select=*,contratos(nome_contrato),localidades(nome_localidade)',
    };
    const base = selects[table] || 'select=*';
    // 'id' como critério de desempate: sem ordenação estável, a paginação pode
    // repetir ou pular linhas quando várias compartilham o mesmo valor de ordem.
    const order = ord ? `&order=${ord},id` : '&order=id';

    const PAGINA = 1000;
    const MAX_PAGINAS = 100; // trava de segurança (100k registros)
    let todos = [], offset = 0, lote;
    for (let i = 0; i < MAX_PAGINAS; i++) {
      lote = await sbReq('GET', table, null, `${base}${order}&limit=${PAGINA}&offset=${offset}`);
      if (!Array.isArray(lote) || lote.length === 0) break;
      todos = todos.concat(lote);
      offset += lote.length;
    }
    return todos;
  },
  ts: () => new Date().toISOString()
};

// Make globally accessible
window.FB = FB;
window.sbReq = sbReq;

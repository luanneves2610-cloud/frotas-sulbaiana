import { supabase } from './config.js';
import { sbReq, setAuthToken } from './api.js';
import { FB } from './api.js';
import { C, SESSION, setSession, clearSession, resetC, setC } from './state.js';
import { lov, slog, now, curMonth, toast } from './utils.js';

// ── Monitora mudanças de sessão (refresh automático de token) ──────────────
supabase.auth.onAuthStateChange((event, session) => {
  setAuthToken(session?.access_token || null);
  if (event === 'SIGNED_OUT') {
    // Se a sessão expirar no Supabase, deslogar a UI também
    const appEl = document.getElementById('app');
    if (appEl && appEl.style.display !== 'none') {
      _forceLogout();
    }
  }
});

function _forceLogout() {
  clearSession();
  resetC();
  sessionStorage.removeItem('frotas_sb_session');
  document.getElementById('app').style.display = 'none';
  document.getElementById('login-screen').style.display = 'flex';
  document.getElementById('l-senha').value = '';
}

// ── initApp ────────────────────────────────────────────────────────────────
export async function initApp() {
  lov(true, 'Inicializando...');
  try {
    // Verifica se há sessão ativa no Supabase Auth
    const { data: { session } } = await supabase.auth.getSession();

    if (session) {
      setAuthToken(session.access_token);

      // Tenta restaurar o perfil do sessionStorage
      const saved = sessionStorage.getItem('frotas_sb_session');
      if (saved) {
        setSession(JSON.parse(saved));
        document.getElementById('login-screen').style.display = 'none';
        document.getElementById('app').style.display = 'flex';
        setupUI();
        await loadAll();
        return;
      }

      // Sem cache local — busca perfil no banco pelo e-mail
      await _carregarPerfilPosAuth(session.user.email);
    } else {
      lov(false);
      document.getElementById('login-screen').style.display = 'flex';
    }
  } catch (e) {
    console.error('initApp error:', e);
    lov(false);
    document.getElementById('login-screen').style.display = 'flex';
  }
}

// ── doLogin ────────────────────────────────────────────────────────────────
export async function doLogin() {
  const email = document.getElementById('l-email').value.trim().toLowerCase();
  const senha = document.getElementById('l-senha').value;
  const err = document.getElementById('lerr');
  const btn = document.getElementById('lbtn');
  err.style.display = 'none';

  if (!email || !senha) {
    err.textContent = 'Preencha e-mail e senha.';
    err.style.display = 'block';
    return;
  }

  btn.innerHTML = '<div class="spin"></div> Verificando...';
  btn.disabled = true;
  lov(true, 'Autenticando...');

  try {
    // 1. Autenticar via Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password: senha
    });

    if (authError) {
      // Fallback para autenticação legada (senha no banco) — para usuários ainda não migrados
      const legacyOk = await _loginLegacy(email, senha);
      if (!legacyOk) throw new Error('credenciais');
      return; // _loginLegacy faz o setup completo
    }

    setAuthToken(authData.session.access_token);
    await _carregarPerfilPosAuth(email);

  } catch (e) {
    lov(false);
    err.textContent = e.message === 'credenciais'
      ? 'E-mail ou senha incorretos.'
      : 'Erro de conexão. Verifique sua internet.';
    err.style.display = 'block';
    console.error('Login error:', e);
  } finally {
    btn.innerHTML = 'Entrar no Sistema';
    btn.disabled = false;
  }
}

// ── Login legado (senha em texto puro na tabela usuarios) ──────────────────
// Mantido para compatibilidade com usuários ainda não migrados para Auth
async function _loginLegacy(email, senha) {
  try {
    const users = await sbReq('GET', 'usuarios', null,
      `email=eq.${encodeURIComponent(email)}&select=*`);
    const user = users.find(u =>
      u.email?.toLowerCase() === email &&
      u.senha === senha &&
      u.status === 'ativo'
    );
    if (!user) return false;
    _finalizarLogin(user);
    slog('Login realizado (modo legado)');
    return true;
  } catch {
    return false;
  }
}

// ── Busca perfil na tabela usuarios após auth bem-sucedido ─────────────────
async function _carregarPerfilPosAuth(email) {
  const users = await sbReq('GET', 'usuarios', null,
    `email=eq.${encodeURIComponent(email)}&select=*`);
  const user = users.find(u => u.email?.toLowerCase() === email && u.status === 'ativo');

  if (!user) {
    await supabase.auth.signOut();
    setAuthToken(null);
    throw new Error('Usuário não encontrado ou inativo. Contate o administrador.');
  }

  _finalizarLogin(user);
  slog('Login realizado');
}

function _finalizarLogin(user) {
  setSession(user);
  sessionStorage.setItem('frotas_sb_session', JSON.stringify(user));
  document.getElementById('login-screen').style.display = 'none';
  document.getElementById('app').style.display = 'flex';
  setupUI();
  loadAll();
}

// ── setupUI ────────────────────────────────────────────────────────────────
export function setupUI() {
  const s = SESSION;
  document.getElementById('u-nome').textContent = s.nome;
  document.getElementById('u-nome2').textContent = s.nome.split(' ')[0];
  document.getElementById('u-perf').textContent = s.perfil.toUpperCase();
  document.getElementById('ua').textContent = s.nome[0].toUpperCase();
  document.getElementById('ua2').textContent = s.nome[0].toUpperCase();
  document.getElementById('tb-date').textContent = new Date().toLocaleDateString('pt-BR', {
    weekday: 'short', day: '2-digit', month: 'short', year: 'numeric'
  });

  const isAdmin = s.perfil === 'admin';
  const isFinanceiro = s.perfil === 'financeiro';
  const isOperacional = s.perfil === 'operacional';
  const isConsulta = s.perfil === 'consulta';

  document.getElementById('adm-sec').style.display = '';
  document.getElementById('nav-users').style.display = '';
  document.getElementById('nav-notificacoes').style.display = '';
  document.getElementById('adm-venda-sec').style.display = '';
  document.getElementById('nav-vendas').style.display = '';
  document.getElementById('nav-contratos').style.display = '';
  document.getElementById('nav-localidades').style.display = '';
  document.getElementById('nav-centros').style.display = '';

  if (!isAdmin) {
    document.getElementById('adm-sec').style.display = 'none';
    document.getElementById('nav-users').style.display = 'none';
    document.getElementById('nav-notificacoes').style.display = 'none';
  }
  if (!isAdmin && !isFinanceiro) {
    document.getElementById('adm-venda-sec').style.display = 'none';
    document.getElementById('nav-vendas').style.display = 'none';
  }
  if (isOperacional || isConsulta) {
    document.getElementById('nav-contratos').style.display = 'none';
    document.getElementById('nav-localidades').style.display = 'none';
    document.getElementById('nav-centros').style.display = 'none';
  }

  const _nd = new Date();
  const _me = document.getElementById('dash-mes');
  const _ae = document.getElementById('dash-ano');
  if (_me) _me.value = String(_nd.getMonth() + 1).padStart(2, '0');
  if (_ae) _ae.value = String(_nd.getFullYear());
}

// ── doLogout ───────────────────────────────────────────────────────────────
export async function doLogout() {
  await slog('Logout');
  window.stopRealtime?.(); // para subscriptions antes de deslogar
  await supabase.auth.signOut();
  setAuthToken(null);
  _forceLogout();
}

// ── loadAll ────────────────────────────────────────────────────────────────
export async function loadAll() {
  lov(true, 'Carregando dados...');
  try {
    const [v, ct, loc, cc, a, m, u, mt, vd, mov] = await Promise.all([
      FB.getAll('veiculos', 'placa'),
      FB.getAll('contratos', 'nome_contrato'),
      FB.getAll('localidades', 'nome_localidade'),
      FB.getAll('centros_custo', 'nome'),
      FB.getAll('abastecimentos', 'data.desc'),
      FB.getAll('manutencoes', 'data.desc'),
      FB.getAll('usuarios', 'nome'),
      FB.getAll('multas', 'data_infracao.desc'),
      FB.getAll('vendas', 'data_venda.desc'),
      FB.getAll('movimentacoes_veiculos', 'data_movimentacao.desc'),
    ]);

    setC('ct', ct); setC('loc', loc); setC('cc', cc); setC('u', u);

    const isAdmin = SESSION?.perfil === 'admin';
    const ctFiltro = (!isAdmin && SESSION?.contrato_id) ? parseInt(SESSION.contrato_id) : null;
    setC('v', (!ctFiltro) ? v : v.filter(x => parseInt(x.contrato_id) == ctFiltro));
    const vids = new Set(C.v.map(x => x.id));
    setC('a', (!ctFiltro) ? a : a.filter(x => vids.has(x.veiculo_id)));
    setC('m', (!ctFiltro) ? m : m.filter(x => vids.has(x.veiculo_id)));
    setC('mt', (!ctFiltro) ? mt : mt.filter(x => vids.has(x.veiculo_id)));
    setC('vd', (!ctFiltro) ? vd : vd.filter(x => vids.has(x.veiculo_id)));
    setC('mov', (!ctFiltro) ? mov : mov.filter(x => vids.has(x.veiculo_id)));

    document.getElementById('bv').textContent = C.v.filter(x => x.status === 'ativo').length;
    document.getElementById('bm').textContent = C.m.length;
    document.getElementById('bmt').textContent = C.mt.filter(x => x.status !== 'paga' && x.status !== 'vencida').length;
    document.getElementById('conn-lbl').textContent = 'Supabase ✓';

    window.populateSel();
    window.renderDash();
    window.initRealtime?.(); // inicia subscriptions em tempo real
  } catch (e) {
    toast('Erro ao carregar: ' + e.message, 'e');
    document.getElementById('conn-lbl').textContent = 'Erro';
    document.querySelector('.dot').style.background = 'var(--rd)';
  } finally {
    lov(false);
  }
}

// ── Exposição global ───────────────────────────────────────────────────────
window.initApp = initApp;
window.doLogin = doLogin;
window.setupUI = setupUI;
window.doLogout = doLogout;
window.loadAll = loadAll;

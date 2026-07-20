import { C, SESSION } from './state.js';
import { now, gCT, slog, toast, lov, esc, validarSenha } from './utils.js';
import { FB, sbReq } from './api.js';
import { supabase, novoClienteIsolado } from './config.js';

let _eu = null;
let _senhaUid = null;

export function renderU() {
  const isAdmin = SESSION?.perfil === 'admin';

  // Controla visibilidade do botão "Novo Usuário"
  const fbarEl = document.querySelector('#usuarios .fbar');
  if (fbarEl) fbarEl.style.display = isAdmin ? '' : 'none';

  // Não-admins só enxergam o próprio cadastro
  const lista = isAdmin ? C.u : C.u.filter(u => u.id == SESSION?.id);

  const pb = p => p === 'admin' ? 'b-rd' : p === 'financeiro' ? 'b-pu' : p === 'operacional' ? 'b-bl' : 'b-gy';
  document.getElementById('tb-u').innerHTML = lista.map(u => {
    const ct = u.contrato_id ? gCT(u.contrato_id).nome_contrato || '—' : 'Todos';
    const nomeEsc  = esc(u.nome);
    const emailEsc = esc(u.email);
    const ctEsc    = esc(ct);
    return `<tr>
      <td><strong>${nomeEsc}</strong></td>
      <td class="t-mu fs11">${emailEsc} <span title="Supabase Auth ativo" style="cursor:help">🔒</span></td>
      <td><span class="badge ${pb(u.perfil)}">${esc(u.perfil?.toUpperCase())}</span></td>
      <td class="fs11"><span class="badge b-gy" style="font-size:10px">${ctEsc}</span></td>
      <td><span class="badge ${u.status === 'ativo' ? 'b-gr' : 'b-gy'}">${esc(u.status)}</span></td>
      <td><div style="display:flex;gap:5px">
        ${isAdmin ? `<button class="btn btn-g btn-sm" onclick="editU('${u.id}')">✏️</button>
        <button class="btn btn-g btn-sm" onclick="togU('${u.id}')">${u.status === 'ativo' ? '🚫' : '✅'}</button>` : ''}
        <button class="btn btn-sm btn-ic" onclick="abrirTrocaSenha('${u.id}','${nomeEsc}','${emailEsc}')" title="${isAdmin ? 'Redefinir senha' : 'Alterar minha senha'}" style="background:#fefce8;border:1px solid #fde68a;color:#b45309">🔑</button>
        ${isAdmin && u.id != SESSION?.id ? `<button class="btn btn-sm btn-ic" onclick="delU('${u.id}','${nomeEsc}')" title="Excluir usuário" style="background:#fef2f2;color:#dc2626;border:1px solid #fecaca">🗑️</button>` : ''}
      </div></td>
    </tr>`;
  }).join('') || `<tr><td colspan="6" style="text-align:center;padding:32px;color:var(--tm)">Nenhum usuário encontrado</td></tr>`;
}

export function populateMuCt() {
  const sel = document.getElementById('mu-ct');
  if (!sel) return;
  const v = sel.value;
  sel.innerHTML = '<option value="">— Todos os contratos —</option>';
  C.ct.forEach(c => { sel.innerHTML += `<option value="${c.id}">${c.nome_contrato}</option>`; });
  sel.value = v;
}

export function abrirMU() {
  _eu = null;
  ['mu-n', 'mu-e', 'mu-s'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('mu-p').value = 'operacional';
  document.getElementById('mu-st').value = 'ativo';
  populateMuCt();
  document.getElementById('mu-ct').value = '';
  document.getElementById('mu-ct-box').style.display = 'block';
  // Campo de senha obrigatório para novos usuários
  const sBox = document.getElementById('mu-s-box');
  if (sBox) sBox.style.display = 'block';
  window.oMo('mo-u');
}

export function editU(id) {
  _eu = C.u.find(u => u.id == id); if (!_eu) return;
  document.getElementById('mu-n').value = _eu.nome;
  document.getElementById('mu-e').value = _eu.email;
  document.getElementById('mu-s').value = '';
  document.getElementById('mu-p').value = _eu.perfil;
  document.getElementById('mu-st').value = _eu.status;
  populateMuCt();
  document.getElementById('mu-ct').value = _eu.contrato_id || '';
  document.getElementById('mu-ct-box').style.display = _eu.perfil === 'admin' ? 'none' : 'block';
  // Senha opcional na edição (não altera o Auth ao editar perfil)
  const sBox = document.getElementById('mu-s-box');
  if (sBox) sBox.style.display = 'none';
  window.oMo('mo-u');
}

export async function salvarU() {
  const nome = document.getElementById('mu-n').value.trim();
  const email = document.getElementById('mu-e').value.trim().toLowerCase();
  const s = document.getElementById('mu-s').value;

  if (!nome || !email) { toast('Nome e e-mail obrigatórios!', 'e'); return; }
  if (!_eu && !s) { toast('Informe a senha para o novo usuário!', 'e'); return; }
  if (!_eu) { const erroSenha = validarSenha(s); if (erroSenha) { toast(erroSenha, 'e'); return; } }

  const p = {
    nome,
    email,
    perfil: document.getElementById('mu-p').value,
    status: document.getElementById('mu-st').value
  };
  const ctVal = document.getElementById('mu-ct').value;
  p.contrato_id = ctVal ? parseInt(ctVal) : null;

  lov(true, _eu ? 'Atualizando usuário...' : 'Criando usuário...');
  try {
    if (_eu) {
      // Edição — atualiza apenas perfil/status/contrato na tabela usuarios
      await FB.upd('usuarios', _eu.id, p);
      slog(`Usuário editado: ${nome}`);
      toast('✅ Usuário atualizado!');
    } else {
      // Novo usuário — cria no Supabase Auth primeiro, depois vincula na tabela
      const jaExiste = await sbReq('GET','usuarios',null,`email=eq.${encodeURIComponent(email)}&select=id`);
      if(jaExiste && jaExiste.length > 0){
        toast(`🚫 E-mail ${email} já está cadastrado!`,'e');
        return;
      }
      // Usa um cliente isolado: o signUp não pode substituir a sessão do admin
      const cli = novoClienteIsolado();
      const { data: authData, error: authErr } = await cli.auth.signUp({ email, password: s });
      if (authErr) {
        toast('Erro ao criar conta: ' + authErr.message, 'e');
        return;
      }
      const authId = authData.user?.id || null;
      await FB.add('usuarios', { ...p, auth_id: authId, data_criacao: now() });
      slog(`Usuário criado: ${nome}`);
      mostrarCredenciais(nome, email, s);
    }
    await window.loadAll();
    window.cMo('mo-u');
    renderU();
  } catch (e) {
    toast('Erro: ' + e.message, 'e');
  } finally {
    lov(false);
  }
}

// Mostra as credenciais do colaborador recém-criado para o admin repassar.
// Fica num modal (não num toast) porque o admin precisa copiar a senha com calma.
function mostrarCredenciais(nome, email, senha) {
  document.getElementById('mcred-nome').textContent  = nome;
  document.getElementById('mcred-email').textContent = email;
  document.getElementById('mcred-senha').textContent = senha;
  window.oMo('mo-cred');
}

export function copiarCredenciais() {
  const nome  = document.getElementById('mcred-nome').textContent;
  const email = document.getElementById('mcred-email').textContent;
  const senha = document.getElementById('mcred-senha').textContent;
  const txt = `Acesso ao Sistema Frotas Sulbaiana\n\nUsuário: ${nome}\nE-mail: ${email}\nSenha: ${senha}\n\nLink: ${window.location.origin}\n\nImportante: troque sua senha no primeiro acesso usando "Esqueci minha senha" na tela de login.`;
  navigator.clipboard.writeText(txt)
    .then(() => toast('📋 Credenciais copiadas!'))
    .catch(() => toast('Não foi possível copiar — selecione e copie manualmente.', 'e'));
}

export function abrirTrocaSenha(uid, nome, email) {
  _senhaUid = uid;
  const isPropria = String(uid) === String(SESSION?.id);

  document.getElementById('ms-title').textContent = isPropria
    ? '🔑 Alterar Minha Senha'
    : `📧 Redefinir Senha — ${nome}`;

  // Guarda o e-mail no modal para uso na redefinição
  const msModal = document.getElementById('mo-senha');
  if (msModal) msModal.dataset.email = email || '';

  // Alterna entre os dois modos de UI
  const modoPropria = document.getElementById('ms-modo-propria');
  const modoEmail   = document.getElementById('ms-modo-email');
  const btnAcao     = document.getElementById('ms-btn-acao');

  if (isPropria) {
    modoPropria.style.display = '';
    modoEmail.style.display   = 'none';
    document.getElementById('ms-nome').value  = nome;
    document.getElementById('ms-nova').value  = '';
    document.getElementById('ms-conf').value  = '';
    btnAcao.textContent = '🔑 Alterar Senha';
  } else {
    modoPropria.style.display = 'none';
    modoEmail.style.display   = '';
    document.getElementById('ms-nome-email').value = `${nome} <${email}>`;
    btnAcao.textContent = '📧 Enviar E-mail de Redefinição';
  }

  window.oMo('mo-senha');
}

export async function salvarNovaSenha() {
  const nova = document.getElementById('ms-nova').value.trim();
  const conf = document.getElementById('ms-conf').value.trim();

  const erroSenha = validarSenha(nova);
  if (erroSenha) { toast(erroSenha, 'e'); return; }
  if (nova !== conf) { toast('As senhas não conferem!', 'e'); return; }

  const u = C.u.find(u => u.id == _senhaUid);
  const msModal = document.getElementById('mo-senha');
  const email = msModal?.dataset.email || u?.email || '';
  const isPropria = u?.id == SESSION?.id;

  lov(true, 'Redefinindo senha...');
  try {
    if (isPropria) {
      // Própria senha: atualiza via SDK (usuário já autenticado)
      const { error } = await supabase.auth.updateUser({ password: nova });
      if (error) throw error;
      await slog('Senha própria alterada');
      window.cMo('mo-senha');
      toast('✅ Senha alterada com sucesso!');
    } else {
      // Outro usuário: envia e-mail de redefinição pelo Supabase Auth
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin
      });
      if (error) throw error;
      await slog(`E-mail de redefinição enviado para ${email}`);
      window.cMo('mo-senha');
      toast(`📧 E-mail de redefinição enviado para ${email}`);
    }
  } catch (e) {
    toast('Erro: ' + e.message, 'e');
  } finally {
    lov(false);
  }
}

export async function togU(id) {
  const u = C.u.find(x => x.id == id); if (!u) return;
  if (u.id == SESSION.id) { toast('Não pode inativar seu próprio usuário!', 'e'); return; }
  lov(true);
  try {
    await FB.upd('usuarios', id, { status: u.status === 'ativo' ? 'inativo' : 'ativo' });
    await window.loadAll();
    renderU();
    toast('✅ Atualizado');
  } catch (e) {
    toast(e.message, 'e');
  } finally {
    lov(false);
  }
}

export async function delU(id, nome) {
  if (id == SESSION?.id) { toast('Não é possível excluir seu próprio usuário!', 'e'); return; }
  if (!confirm(`Excluir o usuário "${nome}"?\nEsta ação é irreversível.`)) return;
  lov(true, 'Excluindo usuário...');
  try {
    await FB.del('usuarios', id);
    await slog(`Usuário excluído: ${nome}`);
    await window.loadAll();
    renderU();
    toast('✅ Usuário excluído!');
  } catch (e) {
    toast('Erro ao excluir: ' + e.message, 'e');
  } finally {
    lov(false);
  }
}

export function onMuPerfil() {
  const p = document.getElementById('mu-p').value;
  const box = document.getElementById('mu-ct-box');
  if (box) box.style.display = p === 'admin' ? 'none' : 'block';
}

// Make globally accessible
window.renderU = renderU;
window.populateMuCt = populateMuCt;
window.abrirMU = abrirMU;
window.editU = editU;
window.salvarU = salvarU;
window.abrirTrocaSenha = abrirTrocaSenha;
window.copiarCredenciais = copiarCredenciais;
window.salvarNovaSenha = salvarNovaSenha;
window.togU = togU;
window.delU = delU;
window.onMuPerfil = onMuPerfil;

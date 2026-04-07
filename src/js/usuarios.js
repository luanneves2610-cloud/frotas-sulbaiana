import { C, SESSION } from './state.js';
import { now, gCT, slog, toast, lov } from './utils.js';
import { FB, sbReq } from './api.js';

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
    const migrado = u.auth_id ? '🔒' : '⚠️';
    const migradoTitle = u.auth_id ? 'Supabase Auth ativo' : 'Usuário legado — senha no banco';
    return `<tr>
      <td><strong>${u.nome}</strong></td>
      <td class="t-mu fs11">${u.email} <span title="${migradoTitle}" style="cursor:help">${migrado}</span></td>
      <td><span class="badge ${pb(u.perfil)}">${u.perfil?.toUpperCase()}</span></td>
      <td class="fs11"><span class="badge b-gy" style="font-size:10px">${ct}</span></td>
      <td><span class="badge ${u.status === 'ativo' ? 'b-gr' : 'b-gy'}">${u.status}</span></td>
      <td><div style="display:flex;gap:5px">
        ${isAdmin ? `<button class="btn btn-g btn-sm" onclick="editU('${u.id}')">✏️</button>
        <button class="btn btn-g btn-sm" onclick="togU('${u.id}')">${u.status === 'ativo' ? '🚫' : '✅'}</button>` : ''}
        <button class="btn btn-sm btn-ic" onclick="abrirTrocaSenha('${u.id}','${u.nome}','${u.email}')" title="${isAdmin ? 'Redefinir senha' : 'Alterar minha senha'}" style="background:#fefce8;border:1px solid #fde68a;color:#b45309">🔑</button>
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
  if (!_eu && s.length < 6) { toast('A senha deve ter pelo menos 6 caracteres!', 'e'); return; }

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
      // Edição — atualiza perfil na tabela usuarios
      await FB.upd('usuarios', _eu.id, p);
      slog(`Usuário editado: ${nome}`);
      toast('✅ Usuário atualizado!');
    } else {
      // Novo usuário — insere direto na tabela (login via modo legado)
      // Evita rate limit do Supabase Auth (signUp só permite 1 por vez a cada 18s)
      const jaExiste = await sbReq('GET','usuarios',null,`email=eq.${encodeURIComponent(email)}&select=id`);
      if(jaExiste && jaExiste.length > 0){
        toast(`🚫 E-mail ${email} já está cadastrado!`,'e');
        return;
      }
      await FB.add('usuarios', { ...p, senha: s, data_criacao: now() });
      slog(`Usuário criado: ${nome}`);
      toast(`✅ Usuário ${nome} criado com sucesso!`);
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

export function abrirTrocaSenha(uid, nome, email) {
  _senhaUid = uid;
  document.getElementById('ms-title').textContent = `🔑 Redefinir Senha — ${nome}`;
  document.getElementById('ms-nome').value = nome;
  document.getElementById('ms-nova').value = '';
  document.getElementById('ms-conf').value = '';

  // Guarda o e-mail no modal para uso na redefinição
  const msModal = document.getElementById('mo-senha');
  if (msModal) msModal.dataset.email = email || '';

  window.oMo('mo-senha');
}

export async function salvarNovaSenha() {
  const nova = document.getElementById('ms-nova').value.trim();
  const conf = document.getElementById('ms-conf').value.trim();

  if (!nova || nova.length < 6) { toast('A senha deve ter pelo menos 6 caracteres!', 'e'); return; }
  if (nova !== conf) { toast('As senhas não conferem!', 'e'); return; }

  // Verifica se o usuário tem auth_id (migrado para Supabase Auth)
  const u = C.u.find(u => u.id == _senhaUid);
  const msModal = document.getElementById('mo-senha');
  const email = msModal?.dataset.email || u?.email || '';

  lov(true, 'Redefinindo senha...');
  try {
    // Atualiza senha direto na tabela (modo legado — sem dependência do Supabase Auth)
    await FB.upd('usuarios', _senhaUid, { senha: nova });
    await slog(`Senha redefinida para usuário id ${_senhaUid}`);
    window.cMo('mo-senha');
    toast('✅ Senha redefinida com sucesso!');
    await window.loadAll();
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
window.salvarNovaSenha = salvarNovaSenha;
window.togU = togU;
window.onMuPerfil = onMuPerfil;

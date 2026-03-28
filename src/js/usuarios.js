import { C, SESSION } from './state.js';
import { now, gCT, slog, toast, lov } from './utils.js';
import { FB } from './api.js';
import { supabase } from './config.js';

let _eu = null;
let _senhaUid = null;

export function renderU() {
  const pb = p => p === 'admin' ? 'b-rd' : p === 'financeiro' ? 'b-pu' : p === 'operacional' ? 'b-bl' : 'b-gy';
  document.getElementById('tb-u').innerHTML = C.u.map(u => {
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
        <button class="btn btn-g btn-sm" onclick="editU('${u.id}')">✏️</button>
        <button class="btn btn-g btn-sm" onclick="togU('${u.id}')">${u.status === 'ativo' ? '🚫' : '✅'}</button>
        <button class="btn btn-sm btn-ic" onclick="abrirTrocaSenha('${u.id}','${u.nome}','${u.email}')" title="Redefinir senha" style="background:#fefce8;border:1px solid #fde68a;color:#b45309">🔑</button>
      </div></td>
    </tr>`;
  }).join('');
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
      // Edição — atualiza apenas o perfil na tabela usuarios
      await FB.upd('usuarios', _eu.id, p);
      slog(`Usuário editado: ${nome}`);
    } else {
      // Novo usuário — cria no Supabase Auth primeiro
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password: s,
        options: { data: { nome, perfil: p.perfil } }
      });

      if (authError) throw new Error('Erro no Auth: ' + authError.message);

      // Insere na tabela usuarios (o trigger handle_new_auth_user vai preencher auth_id)
      await FB.add('usuarios', { ...p, data_criacao: now() });
      slog(`Usuário criado: ${nome}`);

      // Aviso sobre confirmação de e-mail
      if (authData?.user && !authData?.session) {
        toast(`✅ Usuário criado! Um e-mail de confirmação foi enviado para ${email}.`, 'i');
      }
    }
    await window.loadAll();
    window.cMo('mo-u');
    renderU();
    if (_eu) toast('✅ Usuário atualizado!');
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
    if (u?.auth_id) {
      // Usuário Supabase Auth — envia e-mail de redefinição
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin
      });
      if (error) throw new Error(error.message);
      window.cMo('mo-senha');
      toast(`📧 E-mail de redefinição enviado para ${email}`, 'i');
    } else {
      // Usuário legado — atualiza senha diretamente na tabela
      await FB.upd('usuarios', _senhaUid, { senha: nova });

      // Tenta criar/atualizar no Supabase Auth para migrar o usuário
      if (email) {
        await supabase.auth.signUp({ email, password: nova });
      }

      await slog(`Senha redefinida para usuário id ${_senhaUid}`);
      window.cMo('mo-senha');
      toast('✅ Senha redefinida com sucesso!');
      await window.loadAll();
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

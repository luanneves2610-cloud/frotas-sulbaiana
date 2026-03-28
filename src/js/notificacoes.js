import { SESSION } from './state.js';
import { lov, toast } from './utils.js';
import { FB } from './api.js';
import { SB_URL, SB_KEY } from './config.js';

const EVENTOS = [
  { key: 'checklist_reprovado',   label: '🚫 Check-list Reprovado' },
  { key: 'checklist_ressalvas',   label: '⚠️ Check-list com Ressalvas' },
  { key: 'multa_registrada',      label: '🚨 Nova Multa Registrada' },
  { key: 'km_manutencao_vencido', label: '🔧 KM Manutenção Vencido' },
  { key: 'contrato_vencendo',     label: '📋 Contrato Vencendo' },
];

// ── Chamar Edge Function notificar ─────────────────────────────────────────
export async function dispararNotificacao(evento, dados, referencia_id = null) {
  try {
    await fetch(`${SB_URL}/functions/v1/notificar`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SB_KEY,
        'Authorization': 'Bearer ' + SB_KEY,
      },
      body: JSON.stringify({ evento, dados, referencia_id }),
    });
  } catch (e) {
    console.warn('Notificação falhou (não crítico):', e.message);
  }
}

// ── Renderizar seção de configuração ───────────────────────────────────────
export async function renderNotificacoes() {
  const sec = document.getElementById('sec-notificacoes');
  if (!sec) return;

  if (SESSION?.perfil !== 'admin') {
    sec.innerHTML = '<div style="padding:32px;text-align:center;color:var(--tm)">Acesso restrito a administradores.</div>';
    return;
  }

  sec.innerHTML = '<div style="padding:32px;text-align:center;color:var(--tm)"><div class="spin"></div> Carregando...</div>';

  try {
    const configs = await FB.getAll('notificacoes_config', 'evento');
    const logs = await _loadLogs();
    _renderUI(sec, configs, logs);
  } catch (e) {
    sec.innerHTML = `<div style="padding:32px;text-align:center;color:#dc2626">Erro: ${e.message}</div>`;
  }
}

async function _loadLogs() {
  try {
    const res = await fetch(
      `${SB_URL}/rest/v1/notificacoes_log?order=enviado_em.desc&limit=20`,
      { headers: { 'apikey': SB_KEY, 'Authorization': 'Bearer ' + SB_KEY } }
    );
    return res.ok ? await res.json() : [];
  } catch { return []; }
}

function _renderUI(sec, configs, logs) {
  const byEvento = {};
  EVENTOS.forEach(e => { byEvento[e.key] = []; });
  configs.forEach(c => { if (byEvento[c.evento]) byEvento[c.evento].push(c); });

  sec.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;flex-wrap:wrap;gap:12px">
      <h2 style="font-size:18px;font-weight:700;margin:0">🔔 Configuração de Notificações</h2>
      <button class="btn btn-p btn-sm" onclick="abrirAddNotif()">+ Adicionar Destinatário</button>
    </div>

    <div style="display:grid;gap:16px">
      ${EVENTOS.map(ev => `
        <div style="background:var(--bg2);border:1px solid var(--b1);border-radius:10px;padding:16px">
          <div style="font-weight:600;font-size:14px;margin-bottom:10px">${ev.label}</div>
          <div id="notif-list-${ev.key}">
            ${byEvento[ev.key].length === 0
              ? '<div style="font-size:12px;color:var(--tm);padding:4px 0">Nenhum destinatário configurado</div>'
              : byEvento[ev.key].map(c => _rowHTML(c)).join('')
            }
          </div>
        </div>
      `).join('')}
    </div>

    <div style="margin-top:24px">
      <div style="font-weight:600;font-size:14px;margin-bottom:10px">📋 Histórico de Envios (últimos 20)</div>
      <div style="background:var(--bg2);border:1px solid var(--b1);border-radius:10px;overflow:hidden">
        <table style="width:100%;border-collapse:collapse;font-size:12px">
          <thead><tr style="background:var(--bg3)">
            <th style="padding:8px 12px;text-align:left;color:var(--tm)">Data/Hora</th>
            <th style="padding:8px 12px;text-align:left;color:var(--tm)">Evento</th>
            <th style="padding:8px 12px;text-align:left;color:var(--tm)">E-mail</th>
            <th style="padding:8px 12px;text-align:left;color:var(--tm)">Status</th>
          </tr></thead>
          <tbody>
            ${logs.length === 0
              ? '<tr><td colspan="4" style="padding:20px;text-align:center;color:var(--tm)">Nenhum envio registrado</td></tr>'
              : logs.map(l => `<tr style="border-top:1px solid var(--b1)">
                  <td style="padding:7px 12px;color:var(--tm)">${new Date(l.enviado_em).toLocaleString('pt-BR')}</td>
                  <td style="padding:7px 12px">${EVENTOS.find(e => e.key === l.evento)?.label || l.evento}</td>
                  <td style="padding:7px 12px;font-family:monospace">${l.email}</td>
                  <td style="padding:7px 12px">
                    <span class="badge ${l.status === 'enviado' ? 'b-gr' : 'b-rd'}" style="font-size:10px">${l.status}</span>
                  </td>
                </tr>`).join('')
            }
          </tbody>
        </table>
      </div>
    </div>

    <!-- Modal Adicionar -->
    <div id="mo-add-notif" class="modal-overlay" style="display:none" onclick="if(event.target===this)fecharAddNotif()">
      <div class="modal" style="max-width:420px;width:92%">
        <div class="modal-header"><span class="modal-title">+ Adicionar Destinatário</span><button class="modal-close" onclick="fecharAddNotif()">✕</button></div>
        <div class="modal-body" style="display:grid;gap:12px;padding:20px">
          <div>
            <label class="form-label">Evento *</label>
            <select id="an-evento" class="inp">
              ${EVENTOS.map(e => `<option value="${e.key}">${e.label}</option>`).join('')}
            </select>
          </div>
          <div>
            <label class="form-label">E-mail *</label>
            <input id="an-email" class="inp" type="email" placeholder="destinatario@empresa.com">
          </div>
          <div>
            <label class="form-label">Nome (opcional)</label>
            <input id="an-nome" class="inp" type="text" placeholder="Ex: Gerente de Frotas">
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-g btn-sm" onclick="fecharAddNotif()">Cancelar</button>
          <button class="btn btn-p btn-sm" onclick="salvarNotif()">Salvar</button>
        </div>
      </div>
    </div>
  `;
}

function _rowHTML(c) {
  return `<div id="notif-row-${c.id}" style="display:flex;align-items:center;justify-content:space-between;padding:6px 10px;border-radius:6px;background:var(--bg3);margin-bottom:4px">
    <div style="display:flex;align-items:center;gap:8px">
      <span style="font-size:11px;font-family:monospace;color:${c.ativo ? 'var(--tx)' : 'var(--tm)'}">${c.email}</span>
      ${c.nome_destino ? `<span style="font-size:11px;color:var(--tm)">(${c.nome_destino})</span>` : ''}
    </div>
    <div style="display:flex;gap:6px;align-items:center">
      <label style="display:flex;align-items:center;gap:4px;cursor:pointer;font-size:11px;color:var(--tm)">
        <input type="checkbox" ${c.ativo ? 'checked' : ''} onchange="toggleNotif(${c.id},this.checked)" style="cursor:pointer"> Ativo
      </label>
      <button class="btn btn-sm btn-ic" style="background:#fef2f2;color:#dc2626;border:1px solid #fecaca;padding:3px 7px" onclick="delNotif(${c.id})">🗑️</button>
    </div>
  </div>`;
}

// ── CRUD ──────────────────────────────────────────────────────────────────
export function abrirAddNotif() {
  const mo = document.getElementById('mo-add-notif');
  if (mo) { mo.style.display = 'flex'; document.getElementById('an-email').focus(); }
}

export function fecharAddNotif() {
  const mo = document.getElementById('mo-add-notif');
  if (mo) mo.style.display = 'none';
}

export async function salvarNotif() {
  const evento = document.getElementById('an-evento').value;
  const email  = document.getElementById('an-email').value.trim().toLowerCase();
  const nome   = document.getElementById('an-nome').value.trim();
  if (!email || !/^[^@]+@[^@]+\.[^@]+$/.test(email)) { toast('Informe um e-mail válido!', 'e'); return; }
  lov(true, 'Salvando...');
  try {
    await FB.add('notificacoes_config', { evento, email, nome_destino: nome || null, ativo: true });
    fecharAddNotif();
    toast('✅ Destinatário adicionado!');
    await renderNotificacoes();
  } catch (e) {
    toast('Erro: ' + (e.message.includes('duplicate') ? 'Este e-mail já está configurado para este evento.' : e.message), 'e');
  } finally { lov(false); }
}

export async function toggleNotif(id, ativo) {
  try {
    await FB.upd('notificacoes_config', id, { ativo });
    toast(ativo ? '✅ Notificação ativada' : 'Notificação desativada');
  } catch (e) {
    toast('Erro: ' + e.message, 'e');
    await renderNotificacoes();
  }
}

export async function delNotif(id) {
  if (!confirm('Remover este destinatário?')) return;
  lov(true);
  try {
    await FB.del('notificacoes_config', id);
    toast('✅ Destinatário removido!');
    await renderNotificacoes();
  } catch (e) { toast('Erro: ' + e.message, 'e'); } finally { lov(false); }
}

// ── Exposição global ───────────────────────────────────────────────────────
window.renderNotificacoes = renderNotificacoes;
window.abrirAddNotif      = abrirAddNotif;
window.fecharAddNotif     = fecharAddNotif;
window.salvarNotif        = salvarNotif;
window.toggleNotif        = toggleNotif;
window.delNotif           = delNotif;
window.dispararNotificacao = dispararNotificacao;

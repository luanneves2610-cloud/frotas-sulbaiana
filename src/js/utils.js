import { C, SESSION } from './state.js';
import { sbReq } from './api.js';

// Escapa caracteres HTML para evitar XSS ao usar innerHTML com dados do banco
export const esc = s => String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#x27;');

export const fd = d => { if(!d) return '—'; try{const[y,mo,dy]=d.slice(0,10).split('-');return`${dy}/${mo}/${y}`}catch{return d} };
export const cur = v => 'R$ '+Number(v||0).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2});
export const now = () => { const d=new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; };
export const curMonth = () => { const d=new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`; };
export const gV = id => C.v.find(x=>x.id==id)||{placa:'—',modelo:'—'};
export const gCT = id => C.ct.find(x=>x.id==id)||{nome_contrato:'—'};
export const gLoc = id => C.loc.find(x=>x.id==id)||{nome_localidade:'—'};
export const gCC = id => C.cc.find(x=>x.id==id)||{nome:'—'};
export const costV = id => C.m.filter(x=>x.veiculo_id==id).reduce((s,x)=>s+Number(x.valor),0)+C.a.filter(x=>x.veiculo_id==id).reduce((s,x)=>s+Number(x.valor_total),0);
export const normStr = s => String(s||'').trim().toUpperCase();

// ── Mês de referência para análise (regra oficial 09/2026) ────────────────
// Manutenção é contabilizada SEMPRE pelo mês da DATA DE PAGAMENTO, nunca pela
// data de execução do serviço: OS executada em 25/08 e paga em 05/09 entra em
// SETEMBRO. OS sem data_pagamento não pertencem a mês nenhum — ficam fora de
// toda visão mensal e só aparecem no "Total Geral"/sem filtro. O volume que
// isso representa é exibido como aviso no dashboard e na aba Manutenção.
// Abastecimento, multas e vendas não possuem campo de pagamento no banco;
// seguem pela data própria e a UI rotula a base de cada indicador.
export const mNoMes    = (m, mes) => !!m.data_pagamento && m.data_pagamento.startsWith(mes);
export const mesRefM   = m => m.data_pagamento?.slice(0,7) || null;
// OS EXECUTADAS no mês selecionado que ainda não tiveram o pagamento lançado.
// Elas não entram na análise do mês (a referência é a data de pagamento); o
// aviso serve para responder "o que rodou neste mês e segue em aberto".
export const pendentesDoMes = (arr, mes) => arr.filter(m => !m.data_pagamento && m.data?.startsWith(mes));
export const somaValor = arr => arr.reduce((s,m) => s + Number(m.valor||0), 0);

// ── Validação de data (camada 2 de 3) ─────────────────────────────────────
// O <input type="date"> do Chrome aceita até 6 dígitos no campo de ano, então
// digitação rápida produz 20265-01-06, 42026-02-18 ou 0002-03-19 sem qualquer
// aviso. Esta checagem espelha o CHECK do banco (faixa 2020–2035) para que o
// usuário veja uma mensagem clara no formulário, em vez do erro cru da API.
export const DATA_MIN = '2020-01-01', DATA_MAX = '2035-12-31';
export function validarData(v, label='Data'){
  if(!v) return null;                       // campo opcional vazio é válido
  const s = String(v).trim();
  const [ano, mes, dia] = s.split('-');
  if(!ano || !mes || !dia || ano.length !== 4 || isNaN(Number(ano)))
    return `${label} inválida: o ano "${ano||''}" tem ${(ano||'').length} dígito(s). Digite um ano de 4 dígitos, como 2026.`;
  if(s.slice(0,10) < DATA_MIN || s.slice(0,10) > DATA_MAX)
    return `${label} fora da faixa permitida (ano ${ano}). Confira se o ano foi digitado corretamente.`;
  return null;
}
// Valida vários campos; exibe o primeiro erro e devolve false para abortar o salvamento.
export function checarDatas(...pares){
  for(const [v, label] of pares){
    const erro = validarData(v, label);
    if(erro){ toast(erro, 'e'); return false; }
  }
  return true;
}

// Regras de senha — espelham as políticas do Supabase Auth
// (Minimum password length = 8, Password requirements = "Letters and digits").
// Retorna null se válida, ou a mensagem de erro.
export const SENHA_MIN = 8;
export function validarSenha(s){
  s = String(s || '');
  if (s.length < SENHA_MIN) return `A senha deve ter pelo menos ${SENHA_MIN} caracteres!`;
  if (!/[a-zA-Z]/.test(s) || !/[0-9]/.test(s)) return 'A senha deve conter pelo menos uma letra e um número!';
  return null;
}

export function toast(msg, type='s'){
  const c=document.getElementById('tc'),t=document.createElement('div');
  t.className=`toast ${type}`;
  t.innerHTML=`<span>${type==='s'?'✅':type==='e'?'❌':type==='w'?'⚠️':'ℹ️'}</span> ${msg}`;
  c.appendChild(t);
  setTimeout(()=>{t.style.cssText='opacity:0;transform:translateX(16px);transition:all .3s';setTimeout(()=>t.remove(),300)},3500);
}

export function lov(show, msg='Aguarde...'){
  document.getElementById('lov').classList.toggle('show',show);
  document.getElementById('lmsg').textContent=msg;
}

export async function slog(acao){
  try{ await sbReq('POST','logs',{acao,usuario:SESSION?.nome||'—',tipo:'success',timestamp:new Date().toISOString()},''); }catch(e){}
}

// Make globally accessible
window.esc = esc;
window.toast = toast;
window.lov = lov;
window.slog = slog;
window.fd = fd;
window.cur = cur;
window.now = now;
window.curMonth = curMonth;
window.gV = gV;
window.gCT = gCT;
window.gLoc = gLoc;
window.gCC = gCC;
window.costV = costV;
window.normStr = normStr;
window.mNoMes = mNoMes;
window.mesRefM = mesRefM;
window.pendentesDoMes = pendentesDoMes;
window.somaValor = somaValor;
window.validarData = validarData;
window.checarDatas = checarDatas;
window.validarSenha = validarSenha;

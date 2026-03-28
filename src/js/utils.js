import { C, SESSION } from './state.js';
import { sbReq } from './api.js';

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

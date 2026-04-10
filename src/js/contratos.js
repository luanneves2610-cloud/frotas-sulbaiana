import { C, SESSION } from './state.js';
import { cur, fd, lov, slog, now } from './utils.js';
import { FB } from './api.js';

let _ect=null;

export function renderCT(){
  const isAdmin=SESSION?.perfil==='admin';
  // Botão "Novo Contrato" na fbar — visível apenas para admin
  const fbarEl=document.querySelector('#contratos .fbar');
  if(fbarEl) fbarEl.style.display=isAdmin?'':'none';
  document.getElementById('lct').textContent=C.ct.length+' contratos';
  document.getElementById('tb-ct').innerHTML=C.ct.map(ct=>{
    const ids=C.v.filter(v=>v.contrato_id===ct.id).map(v=>v.id);
    const tot=C.m.filter(m=>ids.includes(m.veiculo_id)).reduce((s,m)=>s+Number(m.valor),0)+C.a.filter(a=>ids.includes(a.veiculo_id)).reduce((s,a)=>s+Number(a.valor_total),0);
    return`<tr><td><strong>${ct.nome_contrato}</strong><div class="fs11 t-mu">${ct.descricao||''}</div></td><td class="mono">${ct.numero_contrato||'—'}</td><td class="fs11">${fd(ct.data_inicio)}${ct.data_fim?' → '+fd(ct.data_fim):''}</td><td><span class="badge b-bl">${ids.length}</span></td><td class="t-or fw7 mono">${cur(tot)}</td><td><span class="badge ${ct.status==='ativo'?'b-gr':'b-gy'}">${ct.status}</span></td><td>${isAdmin?`<div style="display:flex;gap:5px"><button class="btn btn-g btn-sm" onclick="editCT('${ct.id}')">✏️</button><button class="btn btn-g btn-sm" onclick="togCT('${ct.id}')">${ct.status==='ativo'?'🚫':'✅'}</button></div>`:''}</td></tr>`;
  }).join('');
}

export function abrirMCT(){_ect=null;document.getElementById('mct-t').textContent='📄 Novo Contrato';['mct-n','mct-num','mct-d','mct-di','mct-df'].forEach(id=>document.getElementById(id).value='');document.getElementById('mct-st').value='ativo';window.oMo('mo-ct');}

export function editCT(id){_ect=C.ct.find(x=>x.id==id);if(!_ect)return;document.getElementById('mct-t').textContent=`✏️ ${_ect.nome_contrato}`;document.getElementById('mct-n').value=_ect.nome_contrato;document.getElementById('mct-num').value=_ect.numero_contrato||'';document.getElementById('mct-d').value=_ect.descricao||'';document.getElementById('mct-di').value=_ect.data_inicio||'';document.getElementById('mct-df').value=_ect.data_fim||'';document.getElementById('mct-st').value=_ect.status;window.oMo('mo-ct');}

export async function salvarCT(){const nome=document.getElementById('mct-n').value.trim();if(!nome){window.toast('Informe o nome!','e');return;}const p={nome_contrato:nome,numero_contrato:document.getElementById('mct-num').value,descricao:document.getElementById('mct-d').value,data_inicio:document.getElementById('mct-di').value||null,data_fim:document.getElementById('mct-df').value||null,status:document.getElementById('mct-st').value};lov(true);try{if(_ect)await FB.upd('contratos',_ect.id,p);else await FB.add('contratos',p);slog(`Contrato ${_ect?'editado':'criado'}: ${nome}`);await window.loadAll();window.cMo('mo-ct');renderCT();window.toast('✅ Contrato salvo!');}catch(e){window.toast('Erro: '+e.message,'e');}finally{lov(false);}};

export async function togCT(id){const ct=C.ct.find(x=>x.id==id);if(!ct)return;lov(true);try{await FB.upd('contratos',id,{status:ct.status==='ativo'?'inativo':'ativo'});await window.loadAll();renderCT();window.toast('✅ Atualizado');}catch(e){window.toast(e.message,'e');}finally{lov(false);}};

// Make globally accessible
window.renderCT = renderCT;
window.abrirMCT = abrirMCT;
window.editCT = editCT;
window.salvarCT = salvarCT;
window.togCT = togCT;

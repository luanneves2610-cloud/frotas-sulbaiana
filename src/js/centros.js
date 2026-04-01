import { C } from './state.js';
import { cur, lov, slog } from './utils.js';
import { FB } from './api.js';

let _ecc=null;

export function renderCC(){
  const fct=document.getElementById('fcc-ct').value;
  const fb=(document.getElementById('fcc-b')?.value||'').toLowerCase();
  let data=fct?C.cc.filter(c=>c.contrato_id==fct):C.cc;
  if(fb) data=data.filter(c=>(c.nome||'').toLowerCase().includes(fb)||(window.gLoc(c.localidade_id).nome_localidade||'').toLowerCase().includes(fb));
  document.getElementById('lcc').textContent=data.length+' centros';
  document.getElementById('tb-cc').innerHTML=data.map(c=>{
    const ids=C.v.filter(v=>v.centro_custo_id===c.id).map(v=>v.id);
    const tot=C.m.filter(m=>ids.includes(m.veiculo_id)).reduce((s,m)=>s+Number(m.valor),0)+C.a.filter(a=>ids.includes(a.veiculo_id)).reduce((s,a)=>s+Number(a.valor_total),0);
    return`<tr><td><strong>${c.nome}</strong></td><td><span class="badge b-bl">${window.gCT(c.contrato_id).nome_contrato}</span></td><td><span class="badge b-cy">📍 ${window.gLoc(c.localidade_id).nome_localidade}</span></td><td><span class="badge b-gy">${ids.length}</span></td><td class="t-or fw7 mono">${cur(tot)}</td><td><span class="badge ${c.status==='ativo'?'b-gr':'b-gy'}">${c.status}</span></td><td><div style="display:flex;gap:5px"><button class="btn btn-g btn-sm" onclick="editCC('${c.id}')">✏️</button><button class="btn btn-g btn-sm" onclick="togCC('${c.id}')">${c.status==='ativo'?'🚫':'✅'}</button><button class="btn btn-sm btn-ic" style="background:#fef2f2;color:#dc2626;border:1px solid #fecaca" onclick="delCC('${c.id}')" title="Excluir">🗑️</button></div></td></tr>`;
  }).join('');
  const el=document.getElementById('fcc-ct');if(el){const v=el.value;el.innerHTML='<option value="">Todos contratos</option>';C.ct.forEach(x=>{el.innerHTML+=`<option value="${x.id}">${x.nome_contrato}</option>`;});el.value=v;}
}

export function abrirMCC(){_ecc=null;document.getElementById('mcc-t').textContent='🏢 Novo Centro';['mcc-n','mcc-d'].forEach(id=>document.getElementById(id).value='');document.getElementById('mcc-s').value='ativo';window.populateSel();window.oMo('mo-cc');}

export function editCC(id){_ecc=C.cc.find(c=>c.id==id);if(!_ecc)return;document.getElementById('mcc-t').textContent=`✏️ ${_ecc.nome}`;document.getElementById('mcc-n').value=_ecc.nome;document.getElementById('mcc-d').value=_ecc.descricao||'';document.getElementById('mcc-s').value=_ecc.status;window.populateSel();document.getElementById('mcc-ct').value=_ecc.contrato_id;document.getElementById('mcc-loc').value=_ecc.localidade_id;window.oMo('mo-cc');}

export async function salvarCC(){const nome=document.getElementById('mcc-n').value.trim().toUpperCase();const ctId=document.getElementById('mcc-ct').value;const locId=document.getElementById('mcc-loc').value;if(!nome||!ctId||!locId){window.toast('Nome, contrato e localidade obrigatórios!','e');return;}const p={nome,contrato_id:ctId,localidade_id:locId,descricao:document.getElementById('mcc-d').value,status:document.getElementById('mcc-s').value};lov(true);try{if(_ecc)await FB.upd('centros_custo',_ecc.id,p);else await FB.add('centros_custo',p);slog(`Centro ${_ecc?'editado':'criado'}: ${nome}`);await window.loadAll();window.cMo('mo-cc');renderCC();window.toast('✅ Centro salvo!');}catch(e){window.toast('Erro: '+e.message,'e');}finally{lov(false);}};

export async function togCC(id){const c=C.cc.find(x=>x.id==id);if(!c)return;lov(true);try{await FB.upd('centros_custo',id,{status:c.status==='ativo'?'inativo':'ativo'});await window.loadAll();renderCC();window.toast('✅ Atualizado');}catch(e){window.toast(e.message,'e');}finally{lov(false);}};

export async function delCC(id){
  const c=C.cc.find(x=>x.id==id);if(!c)return;
  const veics=C.v.filter(v=>v.centro_custo_id==id);
  if(veics.length>0){window.toast(`🚫 Não é possível excluir: ${veics.length} veículo(s) vinculado(s). Transfira os veículos antes.`,'e');return;}
  if(!confirm(`Excluir o centro de custo "${c.nome}"?\nEsta ação é irreversível.`))return;
  lov(true,'Excluindo...');
  try{await FB.del('centros_custo',id);slog(`Centro excluído: ${c.nome}`);await window.loadAll();renderCC();window.toast('✅ Centro de custo excluído!');}
  catch(e){window.toast('Erro: '+e.message,'e');}finally{lov(false);}
}

// Make globally accessible
window.renderCC = renderCC;
window.abrirMCC = abrirMCC;
window.editCC = editCC;
window.salvarCC = salvarCC;
window.togCC = togCC;
window.delCC = delCC;

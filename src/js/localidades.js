import { C } from './state.js';
import { cur, lov, slog } from './utils.js';
import { FB } from './api.js';

let _eloc=null;

export function renderLoc(){
  const fct=document.getElementById('floc-ct')?.value||'';
  let locs=C.loc;
  if(fct) locs=C.loc.filter(l=>C.cc.some(c=>c.localidade_id==l.id&&c.contrato_id==fct));
  document.getElementById('tb-loc').innerHTML=locs.map(l=>{
    const ids=C.v.filter(v=>v.localidade_id===l.id).map(v=>v.id);
    const tot=C.m.filter(m=>ids.includes(m.veiculo_id)).reduce((s,m)=>s+Number(m.valor),0)+C.a.filter(a=>ids.includes(a.veiculo_id)).reduce((s,a)=>s+Number(a.valor_total),0);
    return`<tr><td><strong>📍 ${l.nome_localidade}</strong></td><td>${l.cidade||'—'}</td><td>${l.estado||'—'}</td><td><span class="badge b-bl">${ids.length}</span></td><td class="t-or fw7 mono">${cur(tot)}</td><td><span class="badge ${l.status==='ativo'?'b-gr':'b-gy'}">${l.status}</span></td><td><div style="display:flex;gap:5px"><button class="btn btn-g btn-sm" onclick="editLoc('${l.id}')">✏️</button><button class="btn btn-g btn-sm" onclick="togLoc('${l.id}')">${l.status==='ativo'?'🚫':'✅'}</button></div></td></tr>`;
  }).join('')||'<tr><td colspan="7" style="text-align:center;padding:24px;color:var(--tm)">Nenhuma localidade encontrada</td></tr>';
  const el=document.getElementById('floc-ct');
  if(el){const v=el.value;el.innerHTML='<option value="">Todos contratos</option>';C.ct.forEach(c=>{el.innerHTML+=`<option value="${c.id}">${c.nome_contrato}</option>`;});el.value=v;}
}

export function abrirMLoc(){_eloc=null;document.getElementById('mloc-t').textContent='📍 Nova Localidade';['mloc-n','mloc-c','mloc-d'].forEach(id=>document.getElementById(id).value='');document.getElementById('mloc-e').value='BA';document.getElementById('mloc-s').value='ativo';window.oMo('mo-loc');}

export function editLoc(id){_eloc=C.loc.find(x=>x.id==id);if(!_eloc)return;document.getElementById('mloc-t').textContent=`✏️ ${_eloc.nome_localidade}`;document.getElementById('mloc-n').value=_eloc.nome_localidade;document.getElementById('mloc-c').value=_eloc.cidade||'';document.getElementById('mloc-e').value=_eloc.estado||'BA';document.getElementById('mloc-s').value=_eloc.status;document.getElementById('mloc-d').value=_eloc.descricao||'';window.oMo('mo-loc');}

export async function salvarLoc(){const nome=document.getElementById('mloc-n').value.trim().toUpperCase();if(!nome){window.toast('Informe o nome!','e');return;}const p={nome_localidade:nome,cidade:document.getElementById('mloc-c').value,estado:document.getElementById('mloc-e').value,descricao:document.getElementById('mloc-d').value,status:document.getElementById('mloc-s').value};lov(true);try{if(_eloc)await FB.upd('localidades',_eloc.id,p);else await FB.add('localidades',p);slog(`Localidade ${_eloc?'editada':'criada'}: ${nome}`);await window.loadAll();window.cMo('mo-loc');renderLoc();window.toast('✅ Localidade salva!');}catch(e){window.toast('Erro: '+e.message,'e');}finally{lov(false);}};

export async function togLoc(id){const l=C.loc.find(x=>x.id==id);if(!l)return;lov(true);try{await FB.upd('localidades',id,{status:l.status==='ativo'?'inativo':'ativo'});await window.loadAll();renderLoc();window.toast('✅ Atualizado');}catch(e){window.toast(e.message,'e');}finally{lov(false);}};

// Make globally accessible
window.renderLoc = renderLoc;
window.abrirMLoc = abrirMLoc;
window.editLoc = editLoc;
window.salvarLoc = salvarLoc;
window.togLoc = togLoc;

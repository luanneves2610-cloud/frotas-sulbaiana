import { C, SESSION } from './state.js';
import { cur, lov, slog, now } from './utils.js';
import { FB } from './api.js';

let _ev=null;

export function renderV(){
  const b=document.getElementById('fv-b').value.toLowerCase();
  const fct=document.getElementById('fv-ct').value,floc=document.getElementById('fv-loc').value;
  const fcc=document.getElementById('fv-cc').value,fst=document.getElementById('fv-st').value;
  const fcls=document.getElementById('fv-cls')?.value||'';
  const ftipo=document.getElementById('fv-tipo')?.value||'';
  let d=C.v.filter(v=>(!b||v.placa?.toLowerCase().includes(b)||v.modelo?.toLowerCase().includes(b)||(v.responsavel||'').toLowerCase().includes(b))&&(!fct||v.contrato_id==fct)&&(!floc||v.localidade_id==floc)&&(!fcc||v.centro_custo_id==fcc)&&(!fst||v.status===fst)&&(!fcls||(v.classificacao||'producao')===fcls)&&(!ftipo||(v.tipo||'').toUpperCase()===ftipo.toUpperCase()));
  const ativos=C.v.filter(v=>v.status==='ativo').length;
  const manut=C.v.filter(v=>v.status==='manutenção').length;
  const inat=C.v.filter(v=>v.status==='inativo').length;
  const devolvidos=C.v.filter(v=>v.status==='devolvido').length;
  const dispVenda=C.v.filter(v=>v.status==='disp. para venda').length;
  const vendidosV=C.v.filter(v=>v.status==='vendido').length;
  const prod=C.v.filter(v=>(v.classificacao||'producao')==='producao').length;
  const fix=C.v.filter(v=>v.classificacao==='unidade_fixa').length;
  const cEl=document.getElementById('veiculo-counters');
  if(cEl) cEl.innerHTML=`
    <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:8px 16px;font-size:12px;display:flex;align-items:center;gap:8px"><span style="font-size:16px">✅</span><div><div style="font-weight:700;font-size:15px;color:#15803d">${ativos}</div><div style="color:#64748b">Ativos</div></div></div>
    <div style="background:#fefce8;border:1px solid #fde68a;border-radius:8px;padding:8px 16px;font-size:12px;display:flex;align-items:center;gap:8px"><span style="font-size:16px">🔧</span><div><div style="font-weight:700;font-size:15px;color:#b45309">${manut}</div><div style="color:#64748b">Manutenção</div></div></div>
    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:8px 16px;font-size:12px;display:flex;align-items:center;gap:8px"><span style="font-size:16px">🚫</span><div><div style="font-weight:700;font-size:15px;color:#64748b">${inat}</div><div style="color:#64748b">Inativos</div></div></div>
    <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:8px;padding:8px 16px;font-size:12px;display:flex;align-items:center;gap:8px"><span style="font-size:16px">🏢</span><div><div style="font-weight:700;font-size:15px;color:#c2410c">${devolvidos}</div><div style="color:#64748b">Devolvidos</div></div></div>
    <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:8px 16px;font-size:12px;display:flex;align-items:center;gap:8px"><span style="font-size:16px">🚛</span><div><div style="font-weight:700;font-size:15px;color:#1d6fdf">${prod}</div><div style="color:#64748b">Produção</div></div></div>
    <div style="background:#f5f3ff;border:1px solid #ddd6fe;border-radius:8px;padding:8px 16px;font-size:12px;display:flex;align-items:center;gap:8px"><span style="font-size:16px">🏭</span><div><div style="font-weight:700;font-size:15px;color:#7c3aed">${fix}</div><div style="color:#64748b">Unid. Fixa</div></div></div>
    <div style="background:#faf5ff;border:1px solid #e9d5ff;border-radius:8px;padding:8px 16px;font-size:12px;display:flex;align-items:center;gap:8px"><span style="font-size:16px">🏷️</span><div><div style="font-weight:700;font-size:15px;color:#7c3aed">${dispVenda}</div><div style="color:#64748b">Disp. Venda</div></div></div>
    <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:8px 16px;font-size:12px;display:flex;align-items:center;gap:8px"><span style="font-size:16px">💰</span><div><div style="font-weight:700;font-size:15px;color:#dc2626">${vendidosV}</div><div style="color:#64748b">Vendidos</div></div></div>
  `;
  document.getElementById('lv').textContent=d.length+' veículos';
  const sb=s=>s==='ativo'?'b-gr':s==='manutenção'?'b-ye':s==='devolvido'?'b-or':s==='vendido'?'b-rd':s==='disp. para venda'?'b-pu':'b-gy';
  const clsBadge=c=>c==='unidade_fixa'?'<span class="badge" style="background:#f5f3ff;color:#7c3aed;border:1px solid #ddd6fe;font-size:10px">🏭 Unid. Fixa</span>':'<span class="badge" style="background:#eff6ff;color:#1d6fdf;border:1px solid #bfdbfe;font-size:10px">🚛 Produção</span>';
  document.getElementById('tb-v').innerHTML=d.map(v=>{
    const nMov=(C.mov||[]).filter(m=>m.veiculo_id==v.id).length;
    return`<tr>
    <td><strong class="mono t-bl">${v.placa}</strong></td>
    <td>${v.modelo} <span class="t-mu fs11">${v.ano||''}</span></td>
    <td>${clsBadge(v.classificacao||'producao')}</td>
    <td><span class="badge b-bl">${v.contratos?.nome_contrato||window.gCT(v.contrato_id).nome_contrato}</span></td>
    <td><span class="badge b-cy">📍 ${v.localidades?.nome_localidade||window.gLoc(v.localidade_id).nome_localidade}</span></td>
    <td class="fs11">${v.centros_custo?.nome||window.gCC(v.centro_custo_id).nome}</td>
    <td class="fs11">${v.responsavel||'—'}</td>
    <td><span class="badge ${sb(v.status)}">${v.status}</span>${v.status==='devolvido'&&v.destino_devolucao?`<div class="fs11 t-mu" style="margin-top:2px">🏁 ${v.destino_devolucao==='sede'?'Sede':window.gCT(v.destino_devolucao).nome_contrato||v.destino_devolucao}</div>`:''}</td>
    <td class="mono">${(v.km_atual||0).toLocaleString('pt-BR')} km</td>
    <td class="t-or fw7 mono fs11">${cur(window.costV(v.id))}</td>
    <td><div style="display:flex;gap:4px;flex-wrap:wrap">
      <button class="btn btn-g btn-sm btn-ic" onclick="editV('${v.id}')" title="Editar">✏️</button>
      <button class="btn btn-sm btn-ic" style="background:#eff6ff;color:#1d6fdf;border:1px solid #bfdbfe" onclick="verMovVeiculo(${v.id})" title="Movimentações"${nMov>0?` data-badge="${nMov}"`:''}>🔄${nMov>0?` <span style="font-size:9px;background:#1d6fdf;color:#fff;border-radius:8px;padding:0 4px">${nMov}</span>`:''}</button>
      <button class="btn btn-g btn-sm btn-ic" onclick="togV('${v.id}')">${v.status==='inativo'?'✅':'🚫'}</button>
      <button class="btn btn-sm btn-ic" style="background:#fef2f2;color:#dc2626;border:1px solid #fecaca" onclick="solicitarDelV('${v.id}')">🗑️</button>
    </div></td>
  </tr>`;
  }).join('')||'<tr><td colspan="11" style="text-align:center;padding:32px;color:var(--tm)">Nenhum veículo encontrado</td></tr>';
}

export function onMvFrota(){
  const frota=document.getElementById('mv-frota').value;
  const isLocada=frota==='locada';
  document.getElementById('mv-locador-box').style.display=isLocada?'block':'none';
  document.getElementById('mv-locacao-valor-box').style.display=isLocada?'block':'none';
  if(!isLocada){['mv-loc-nome','mv-loc-email','mv-loc-fone'].forEach(id=>document.getElementById(id).value='');document.getElementById('mv-valor-locacao').value='';}
}

export function abrirMV(){
  _ev=null;document.getElementById('mv-t').textContent='🚗 Novo Veículo';
  ['mv-placa','mv-modelo','mv-cor','mv-renavan','mv-resp','mv-obs','mv-med-nome','mv-med-local','mv-loc-nome','mv-loc-email','mv-loc-fone','mv-valor-locacao'].forEach(id=>document.getElementById(id).value='');
  document.getElementById('mv-frota').value='propria';
  document.getElementById('mv-locador-box').style.display='none';
  document.getElementById('mv-locacao-valor-box').style.display='none';
  document.getElementById('mv-ano').value=new Date().getFullYear();document.getElementById('mv-km').value=0;
  document.getElementById('mv-med-leitura').value=0;
  document.getElementById('mv-cls-prod').checked=true;
  document.getElementById('mv-medicao-box').style.display='none';
  const ctEl=document.getElementById('mv-ct');ctEl.innerHTML='<option value="">— Selecione —</option>';
  C.ct.filter(x=>x.status==='ativo').forEach(x=>{ctEl.innerHTML+=`<option value="${x.id}">${x.nome_contrato}</option>`;});
  document.getElementById('mv-loc').innerHTML='<option value="">— Selecione contrato —</option>';
  document.getElementById('mv-cc').innerHTML='<option value="">— Selecione localidade —</option>';
  window.oMo('mo-v');
}

export function editV(id){
  _ev=C.v.find(v=>v.id==id);if(!_ev)return;
  document.getElementById('mv-t').textContent=`✏️ ${_ev.placa}`;
  document.getElementById('mv-placa').value=_ev.placa;document.getElementById('mv-modelo').value=_ev.modelo;
  document.getElementById('mv-ano').value=_ev.ano;document.getElementById('mv-tipo').value=_ev.tipo||'MOTO';
  document.getElementById('mv-cor').value=_ev.cor||'';document.getElementById('mv-renavan').value=_ev.renavan||'';
  document.getElementById('mv-resp').value=_ev.responsavel||'';document.getElementById('mv-st').value=_ev.status;
  document.getElementById('mv-km').value=_ev.km_atual||0;document.getElementById('mv-obs').value=_ev.obs||'';
  document.getElementById('mv-cli').value=_ev.cliente||'EMBASA';
  const _tipoFrota=_ev.tipo_frota||'propria';
  document.getElementById('mv-frota').value=_tipoFrota;
  document.getElementById('mv-loc-nome').value=_ev.locador_nome||'';
  document.getElementById('mv-loc-email').value=_ev.locador_email||'';
  document.getElementById('mv-loc-fone').value=_ev.locador_fone||'';
  document.getElementById('mv-locador-box').style.display=(_tipoFrota==='locada')?'block':'none';
  document.getElementById('mv-locacao-valor-box').style.display=(_tipoFrota==='locada')?'block':'none';
  document.getElementById('mv-valor-locacao').value=_ev.valor_locacao||'';
  const devBox=document.getElementById('mv-dev-box');
  if(devBox) devBox.style.display=_ev.status==='devolvido'?'block':'none';
  if(_ev.status==='devolvido'){
    window.onMvStatus();
    document.getElementById('mv-dev-data').value=_ev.data_devolucao||'';
    document.getElementById('mv-dev-km').value=_ev.km_devolucao||0;
    const dest=_ev.destino_devolucao||'sede';
    document.getElementById('mv-dev-dest').value=dest;
  }
  const cls=_ev.classificacao||'producao';
  document.getElementById(cls==='unidade_fixa'?'mv-cls-fix':'mv-cls-prod').checked=true;
  document.getElementById('mv-medicao-box').style.display=cls==='unidade_fixa'?'block':'none';
  if(cls==='unidade_fixa'){
    document.getElementById('mv-med-nome').value=_ev.med_nome||'';
    document.getElementById('mv-med-unidade').value=_ev.med_unidade||'horas';
    document.getElementById('mv-med-leitura').value=_ev.med_leitura||0;
    document.getElementById('mv-med-local').value=_ev.med_local||'';
  }
  const ctEl=document.getElementById('mv-ct');ctEl.innerHTML='<option value="">— Selecione —</option>';
  C.ct.filter(x=>x.status==='ativo').forEach(x=>{ctEl.innerHTML+=`<option value="${x.id}">${x.nome_contrato}</option>`;});
  ctEl.value=_ev.contrato_id;window.onMvContrato();
  setTimeout(()=>{document.getElementById('mv-loc').value=_ev.localidade_id;window.onMvLocalidade();setTimeout(()=>{document.getElementById('mv-cc').value=_ev.centro_custo_id;},60);},60);
  window.oMo('mo-v');
}

export async function salvarV(){
  const placa=document.getElementById('mv-placa').value.trim().toUpperCase();
  const modelo=document.getElementById('mv-modelo').value.trim();
  const ctId=document.getElementById('mv-ct').value,locId=document.getElementById('mv-loc').value,ccId=document.getElementById('mv-cc').value;
  if(!placa||!modelo){window.toast('Placa e modelo obrigatórios!','e');return;}
  if(!ctId||!locId||!ccId){window.toast('Selecione Contrato, Localidade e Centro de Custo!','e');return;}
  const cls=document.querySelector('input[name="mv-cls"]:checked')?.value||'producao';
  const medicao=cls==='unidade_fixa'?{
    med_nome:document.getElementById('mv-med-nome').value,
    med_unidade:document.getElementById('mv-med-unidade').value,
    med_leitura:parseFloat(document.getElementById('mv-med-leitura').value)||0,
    med_local:document.getElementById('mv-med-local').value
  }:{med_nome:'',med_unidade:'',med_leitura:0,med_local:''};
  const tipoFrota=document.getElementById('mv-frota').value;
  const p={placa,modelo,ano:parseInt(document.getElementById('mv-ano').value)||null,tipo:document.getElementById('mv-tipo').value,cor:document.getElementById('mv-cor').value,renavan:document.getElementById('mv-renavan').value,contrato_id:ctId,localidade_id:locId,centro_custo_id:ccId,responsavel:document.getElementById('mv-resp').value,status:document.getElementById('mv-st').value,km_atual:parseInt(document.getElementById('mv-km').value)||0,cliente:document.getElementById('mv-cli').value,obs:document.getElementById('mv-obs').value,classificacao:cls,...medicao,data_cadastro:now(),tipo_frota:tipoFrota,locador_nome:document.getElementById('mv-loc-nome').value||null,locador_email:document.getElementById('mv-loc-email').value||null,locador_fone:document.getElementById('mv-loc-fone').value||null,valor_locacao:tipoFrota==='locada'?(parseFloat(document.getElementById('mv-valor-locacao').value)||null):null};
  if(p.status==='devolvido'){
    p.data_devolucao=document.getElementById('mv-dev-data').value||null;
    p.km_devolucao=parseInt(document.getElementById('mv-dev-km').value)||null;
    const destVal=document.getElementById('mv-dev-dest').value;
    p.destino_devolucao=destVal||'sede';
  } else {
    p.data_devolucao=null; p.km_devolucao=null; p.destino_devolucao=null;
  }
  lov(true,'Salvando...');try{if(_ev)await FB.upd('veiculos',_ev.id,p);else await FB.add('veiculos',p);slog(`Veículo ${_ev?'editado':'cadastrado'}: ${placa}`);await window.loadAll();window.cMo('mo-v');renderV();window.toast(`✅ ${placa} salvo!`);}catch(e){window.toast('Erro: '+e.message,'e');}finally{lov(false);}
}

export function onMvClassificacao(){
  const isFixed=document.getElementById('mv-cls-fix')?.checked;
  document.getElementById('mv-medicao-box').style.display=isFixed?'block':'none';
}

export async function togV(id){const v=C.v.find(x=>x.id==id);if(!v)return;const ns=v.status==='inativo'?'ativo':'inativo';lov(true);try{await FB.upd('veiculos',id,{status:ns});slog(`Veículo ${ns}: ${v.placa}`);await window.loadAll();renderV();window.toast(`✅ ${v.placa} ${ns}`);}catch(e){window.toast(e.message,'e');}finally{lov(false);}};

let _delVId = null;
export function solicitarDelV(id){
  if(SESSION?.perfil!=='admin'){
    window.toast('🚫 Sem permissão. Contate o administrador.','e');
    return;
  }
  _delVId = id;
  const v = C.v.find(x=>x.id==id); if(!v) return;
  const ct  = (v.contratos||{}).nome_contrato  || window.gCT(v.contrato_id).nome_contrato;
  const loc = (v.localidades||{}).nome_localidade || window.gLoc(v.localidade_id).nome_localidade;
  const custo = window.costV(v.id);
  const osCount = C.m.filter(m=>m.veiculo_id==id).length;
  document.getElementById('del-v-info').innerHTML=
    `<div style="display:grid;gap:6px">
      <div><span style="color:#64748b">Placa:</span> <strong class="t-bl" style="font-family:monospace">${v.placa}</strong></div>
      <div><span style="color:#64748b">Modelo:</span> <strong>${v.modelo}</strong> ${v.ano||''} — ${v.tipo||''}</div>
      <div><span style="color:#64748b">Contrato:</span> ${ct} / ${loc}</div>
      <div><span style="color:#64748b">OS vinculadas:</span> <strong>${osCount}</strong> ordens de serviço</div>
      <div><span style="color:#64748b">Custo total:</span> <strong class="t-or">${cur(custo)}</strong></div>
    </div>`;
  window.oMo('mo-del-v');
}

export async function confirmarDelV(){
  if(!_delVId){ window.cMo('mo-del-v'); return; }
  const v = C.v.find(x=>x.id==_delVId);
  lov(true,'Excluindo veículo...');
  try{
    await FB.del('veiculos', _delVId);
    const hoje = new Date().toLocaleDateString('pt-BR');
    await slog(`VEÍCULO EXCLUÍDO: ${v.placa} — ${v.modelo} — ${hoje}`);
    await window.loadAll(); window.cMo('mo-del-v'); renderV();
    window.toast('✅ Veículo excluído com sucesso!');
  }catch(e){ window.toast('Erro: '+e.message,'e'); }
  finally{ lov(false); _delVId=null; }
}

// Make globally accessible
window.renderV = renderV;
window.onMvFrota = onMvFrota;
window.abrirMV = abrirMV;
window.editV = editV;
window.salvarV = salvarV;
window.onMvClassificacao = onMvClassificacao;
window.togV = togV;
window.solicitarDelV = solicitarDelV;
window.confirmarDelV = confirmarDelV;

import { C, SESSION } from './state.js';
import { cur, fd, lov, slog, now } from './utils.js';
import { FB } from './api.js';

let _em=null;

export function renderM(){
  window.populateSel();
  const b=document.getElementById('fm-b').value.toLowerCase(),fct=document.getElementById('fm-ct').value;
  const tp=document.getElementById('fm-t').value,mes=document.getElementById('fm-m').value;
  let d=[...C.m];
  if(b)d=d.filter(m=>{const v=window.gV(m.veiculo_id);return v.placa?.toLowerCase().includes(b)||m.tipo_servico?.toLowerCase().includes(b)||(m.descricao||'').toLowerCase().includes(b);});
  if(fct)d=d.filter(m=>window.gV(m.veiculo_id).contrato_id==fct);
  if(tp)d=d.filter(m=>m.tipo_servico===tp);
  if(mes)d=d.filter(m=>m.data?.startsWith(mes));
  const tot=d.reduce((s,m)=>s+Number(m.valor),0);
  document.getElementById('lm').textContent=`${d.length} OS · Total: ${cur(tot)}`;
  document.getElementById('tb-m').innerHTML=d.map(m=>{const v=window.gV(m.veiculo_id);return`<tr><td><strong class="mono t-bl">${v.placa}</strong></td><td><span class="badge b-ye">${m.tipo_servico}</span></td><td class="fs11" style="max-width:160px;overflow:hidden;text-overflow:ellipsis">${m.descricao||'—'}</td><td class="fs11"><span class="badge b-bl">${v.contratos?.nome_contrato||window.gCT(v.contrato_id).nome_contrato}</span></td><td class="fs11">📍 ${v.localidades?.nome_localidade||window.gLoc(v.localidade_id).nome_localidade}</td><td>${fd(m.data)}</td><td class="mono">${(m.km||0).toLocaleString('pt-BR')}</td><td class="t-or fw7 mono">${cur(m.valor)}</td><td>${m.nf?`<span class="badge b-gr">📎</span>`:'—'}</td><td><div style="display:flex;gap:4px"><button class="btn btn-g btn-sm btn-ic" onclick="editM('${m.id}')">✏️</button><button class="btn btn-sm btn-ic" style="background:#fef2f2;color:#dc2626;border:1px solid #fecaca" onclick="solicitarDelOS('${m.id}')">🗑️</button></div></td></tr>`;}).join('')||'<tr><td colspan="10" style="text-align:center;padding:32px;color:var(--tm)">Nenhuma OS</td></tr>';
}

export function abrirMM(){
  _em=null;
  document.getElementById('mm-t').textContent='🔧 Nova OS';
  document.getElementById('mm-lado-box').style.display='none';
  ['mm-km','mm-val','mm-desc'].forEach(id=>document.getElementById(id).value='');
  document.getElementById('mm-data').value=now();
  document.getElementById('mm-nfn').textContent='';
  document.getElementById('mm-placa-busca').value='';
  document.getElementById('mm-v').value='';
  document.getElementById('mm-veiculo-info').style.display='none';
  document.getElementById('mm-sugestoes').style.display='none';
  window.populateSel();
  window.oMo('mo-m');
}

export function editM(id){
  _em=C.m.find(m=>m.id==id);if(!_em)return;
  document.getElementById('mm-t').textContent='✏️ Editar OS';
  window.populateSel();
  const v=window.gV(_em.veiculo_id);
  document.getElementById('mm-placa-busca').value=v.placa||'';
  document.getElementById('mm-v').value=_em.veiculo_id;
  if(v.placa){
    document.getElementById('mm-vi-placa').textContent=v.placa;
    document.getElementById('mm-vi-modelo').textContent=v.modelo;
    document.getElementById('mm-vi-ct').textContent=v.contratos?.nome_contrato||window.gCT(v.contrato_id).nome_contrato;
    document.getElementById('mm-vi-loc').textContent=v.localidades?.nome_localidade||window.gLoc(v.localidade_id).nome_localidade;
    document.getElementById('mm-veiculo-info').style.display='block';
  }
  document.getElementById('mm-tip').value=_em.tipo_servico;
  document.getElementById('mm-data').value=_em.data;
  document.getElementById('mm-km').value=_em.km||'';
  document.getElementById('mm-val').value=_em.valor;
  document.getElementById('mm-cc').value=_em.centro_custo_id;
  document.getElementById('mm-desc').value=_em.descricao||'';
  document.getElementById('mm-nfn').textContent=_em.nf?`📎 ${_em.nf}`:'';
  window.oMo('mo-m');
}

export async function salvarM(){
  const vid=document.getElementById('mm-v').value;
  const val=parseFloat(document.getElementById('mm-val').value);
  const km=parseInt(document.getElementById('mm-km').value);
  if(!vid){window.toast('Selecione um veículo pela placa!','e');return;}
  if(!km||km<=0){window.toast('KM é obrigatório e deve ser maior que zero!','e');document.getElementById('mm-km').focus();return;}
  if(!val||val<=0){window.toast('Informe o valor!','e');return;}
  const nf=document.getElementById('mm-nf').files[0];
  const _lado=document.getElementById('mm-lado-box').style.display!=='none'?document.getElementById('mm-lado').value:null;
  const p={veiculo_id:vid,tipo_servico:document.getElementById('mm-tip').value+((_lado)?` — ${_lado}`:''),descricao:document.getElementById('mm-desc').value,data:document.getElementById('mm-data').value,km:km,valor:val,centro_custo_id:document.getElementById('mm-cc').value||C.v.find(x=>x.id==vid)?.centro_custo_id||'',nf:nf?nf.name:(_em?.nf||''),usuario_id:SESSION.id,data_lancamento:now()};
  lov(true);try{if(_em)await FB.upd('manutencoes',_em.id,p);else await FB.add('manutencoes',p);slog(`OS: ${window.gV(vid).placa} — ${cur(val)}`);await window.loadAll();window.cMo('mo-m');renderM();window.toast('✅ OS salva!');}catch(e){window.toast('Erro: '+e.message,'e');}finally{lov(false);}
}

export function onTipoManutChange(){
  const tipo=document.getElementById('mm-tip').value;
  const vid=document.getElementById('mm-v').value;
  const v=vid?C.v.find(x=>x.id==vid):null;
  const tiposComLado=['Suspensão Dianteira','Suspensão Traseira','Sistema de Freio Dianteiro','Sistema de Freio Traseiro','Pneu','Alinhamento'];
  const exibir=v&&v.tipo==='CARRO'&&tiposComLado.includes(tipo);
  document.getElementById('mm-lado-box').style.display=exibir?'block':'none';
}

export function limparSelV(){
  document.getElementById('mm-v').value='';
  document.getElementById('mm-placa-busca').value='';
  document.getElementById('mm-km').value='';
  document.getElementById('mm-veiculo-info').style.display='none';
  document.getElementById('mm-placa-busca').focus();
}

export function acPlaca(el){
  el.value = el.value.toUpperCase();
  const q = el.value.replace(/\s/g,'');
  const sug  = document.getElementById('mm-sugestoes');
  const info = document.getElementById('mm-veiculo-info');
  document.getElementById('mm-v').value = '';
  info.style.display = 'none';
  if(!q){ sug.style.display='none'; return; }
  const res = C.v.filter(v=>(v.placa||'').toUpperCase().replace(/\s/g,'').includes(q) && v.status!=='inativo').slice(0,8);
  sug.style.display = 'block';
  if(!res.length){
    sug.innerHTML = '<div style="padding:14px 16px;font-size:13px;color:#dc2626;display:flex;align-items:center;gap:10px">'
      +'<span style="font-size:20px">⚠️</span>'
      +'<div><strong>Veículo não cadastrado</strong>'
      +'<div style="font-size:11px;color:#64748b;margin-top:2px">Placa "'+q+'" não encontrada</div></div></div>';
    return;
  }
  sug.innerHTML = res.map(v=>{
    const ct = (v.contratos||{}).nome_contrato || window.gCT(v.contrato_id).nome_contrato;
    const resp = v.responsavel ? '<span style="color:#64748b">👤 '+v.responsavel+'</span>' : '';
    return '<div onmousedown="acSel('+v.id+')" style="padding:11px 16px;cursor:pointer;border-bottom:1px solid #e2e8f0;display:flex;justify-content:space-between;align-items:center" onmouseover="this.style.background=\'#eff6ff\'" onmouseout="this.style.background=\'\'">'
      +'<div><strong style="color:#1d6fdf;font-family:monospace;font-size:14px;letter-spacing:1px">'+v.placa+'</strong>'
      +' <span style="color:#0f172a;font-size:13px">'+v.modelo+' <span style="color:#94a3b8">'+( v.ano||'')+'</span></span></div>'
      +'<div style="text-align:right;font-size:11px;line-height:1.6">'+resp+'<br><span style="color:#475569">'+ct+'</span></div></div>';
  }).join('');
}

export function acSel(vid){
  const v = C.v.find(x=>x.id==vid); if(!v) return;
  document.getElementById('mm-v').value           = v.id;
  document.getElementById('mm-placa-busca').value  = v.placa;
  document.getElementById('mm-sugestoes').style.display = 'none';
  const info = document.getElementById('mm-veiculo-info');
  document.getElementById('mm-vi-placa').textContent  = v.placa;
  document.getElementById('mm-vi-modelo').textContent = v.modelo+' '+(v.ano||'');
  document.getElementById('mm-vi-ct').textContent     = (v.contratos||{}).nome_contrato  || window.gCT(v.contrato_id).nome_contrato;
  document.getElementById('mm-vi-loc').textContent    = (v.localidades||{}).nome_localidade || window.gLoc(v.localidade_id).nome_localidade;
  info.style.display = 'flex';
  if(v.km_atual>0 && !document.getElementById('mm-km').value)
    document.getElementById('mm-km').value = v.km_atual;
  if(v.centro_custo_id) document.getElementById('mm-cc').value = v.centro_custo_id;
}

export function acKey(e){
  const sug   = document.getElementById('mm-sugestoes');
  const items = Array.from(sug.querySelectorAll('[onmousedown]'));
  if(!items.length) return;
  let idx = items.findIndex(x=>x.classList.contains('ac-sel'));
  if(e.key==='ArrowDown')  { e.preventDefault(); items[idx]?.classList.remove('ac-sel','bg'); idx=Math.min(idx+1,items.length-1); items[idx].classList.add('ac-sel'); items[idx].style.background='#dbeafe'; }
  else if(e.key==='ArrowUp'){ e.preventDefault(); items[idx]?.classList.remove('ac-sel'); items[idx]?.style && (items[idx].style.background=''); idx=Math.max(idx-1,0); items[idx].classList.add('ac-sel'); items[idx].style.background='#dbeafe'; }
  else if(e.key==='Enter') { e.preventDefault(); const sel=items[idx]??items[0]; if(sel){ const m=sel.getAttribute('onmousedown').match(/\d+/); if(m)acSel(m[0]); } }
  else if(e.key==='Escape'){ sug.style.display='none'; }
}

export function acBlur(){ setTimeout(()=>{ const s=document.getElementById('mm-sugestoes'); if(s)s.style.display='none'; },180); }

let _delOsId = null;
export function solicitarDelOS(id){
  if(SESSION?.perfil!=='admin'){
    window.toast('🚫 Sem permissão. Contate o administrador.','e');
    return;
  }
  _delOsId=id;
  const m=C.m.find(x=>x.id==id);if(!m)return;
  const v=window.gV(m.veiculo_id);
  document.getElementById('del-os-info').innerHTML=
    `<div style="display:grid;gap:6px">
      <div><span style="color:#64748b">Veículo:</span> <strong>${v.placa}</strong> — ${v.modelo}</div>
      <div><span style="color:#64748b">Tipo:</span> <strong>${m.tipo_servico}</strong></div>
      <div><span style="color:#64748b">Data:</span> ${fd(m.data)}</div>
      <div><span style="color:#64748b">Valor:</span> <strong class="t-or">${cur(m.valor)}</strong></div>
    </div>`;
  window.oMo('mo-del-os');
}

export async function confirmarDelOS(){
  if(!_delOsId){window.cMo('mo-del-os');return;}
  const m=C.m.find(x=>x.id==_delOsId);
  const v=window.gV(m?.veiculo_id);
  lov(true,'Excluindo OS...');
  try{
    await FB.del('manutencoes',_delOsId);
    await slog(`OS EXCLUÍDA: ${v.placa} — ${m.tipo_servico} — ${cur(m.valor)}`);
    await window.loadAll();window.cMo('mo-del-os');renderM();
    window.toast('✅ OS excluída com sucesso!');
  }catch(e){window.toast('Erro: '+e.message,'e');}
  finally{lov(false);_delOsId=null;}
}

// Make globally accessible
window.renderM = renderM;
window.abrirMM = abrirMM;
window.editM = editM;
window.salvarM = salvarM;
window.onTipoManutChange = onTipoManutChange;
window.limparSelV = limparSelV;
window.acPlaca = acPlaca;
window.acSel = acSel;
window.acKey = acKey;
window.acBlur = acBlur;
window.solicitarDelOS = solicitarDelOS;
window.confirmarDelOS = confirmarDelOS;

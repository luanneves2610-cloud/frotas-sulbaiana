import { C, SESSION } from './state.js';
import { cur, fd, lov, slog, now } from './utils.js';
import { FB } from './api.js';

let _ea=null;

export function calcA(){
  const l=parseFloat(document.getElementById('ma-lit').value)||0,v=parseFloat(document.getElementById('ma-val').value)||0;
  const el=document.getElementById('ma-calc');
  if(l>0&&v>0){el.style.display='block';document.getElementById('ma-rpl').textContent='R$ '+(v/l).toFixed(3);
    const vid=document.getElementById('ma-v').value,km=parseInt(document.getElementById('ma-km').value)||0;
    if(vid&&km>0){const prev=C.a.filter(x=>x.veiculo_id===vid&&x.km_atual<km).sort((a,b)=>b.km_atual-a.km_atual)[0];if(prev)document.getElementById('ma-kml').textContent=((km-prev.km_atual)/l).toFixed(2);}
  }
}

export function renderA(){
  window.populateSel();
  const b=document.getElementById('fa-b').value.toLowerCase(),fct=document.getElementById('fa-ct').value;
  const vid=document.getElementById('fa-v').value,mes=document.getElementById('fa-m').value;
  let d=[...C.a];
  if(b)d=d.filter(a=>{const v=window.gV(a.veiculo_id);return v.placa?.toLowerCase().includes(b)||(a.posto||'').toLowerCase().includes(b);});
  if(fct)d=d.filter(a=>window.gV(a.veiculo_id).contrato_id==fct);
  if(vid)d=d.filter(a=>a.veiculo_id==vid);
  if(mes)d=d.filter(a=>a.data?.startsWith(mes));
  document.getElementById('la').textContent=d.length+' registros';
  document.getElementById('tb-a').innerHTML=d.map(a=>{
    const v=window.gV(a.veiculo_id);
    const prev=C.a.filter(x=>x.veiculo_id===a.veiculo_id&&x.km_atual<a.km_atual).sort((x,y)=>y.km_atual-x.km_atual)[0];
    const kml=prev&&a.litros>0?((a.km_atual-prev.km_atual)/a.litros).toFixed(2):'—';
    return`<tr><td><strong class="mono t-bl">${v.placa}</strong><div class="fs11 t-mu">${v.modelo}</div></td><td class="fs11"><span class="badge b-bl">${v.contratos?.nome_contrato||window.gCT(v.contrato_id).nome_contrato}</span></td><td class="fs11">📍 ${v.localidades?.nome_localidade||window.gLoc(v.localidade_id).nome_localidade}</td><td>${fd(a.data)}</td><td class="mono">${(a.km_atual||0).toLocaleString('pt-BR')}</td><td>${Number(a.litros).toFixed(2)} L</td><td class="t-or fw7 mono">${cur(a.valor_total)}</td><td><span class="badge b-bl">${a.tipo_combustivel||'—'}</span></td><td class="t-gr">${kml}</td><td><button class="btn btn-g btn-sm btn-ic" onclick="editA('${a.id}')">✏️</button></td></tr>`;
  }).join('')||'<tr><td colspan="10" style="text-align:center;padding:32px;color:var(--tm)">Nenhum registro</td></tr>';
  const tot=d.reduce((s,a)=>s+Number(a.valor_total),0),lit=d.reduce((s,a)=>s+Number(a.litros),0);
  document.getElementById('abast-res').innerHTML=`<div class="stat-row"><div class="stat-item">Total gasto<strong class="t-or">${cur(tot)}</strong></div><div class="stat-item">Total litros<strong class="t-bl">${lit.toFixed(2)} L</strong></div><div class="stat-item">Registros<strong>${d.length}</strong></div><div class="stat-item">R$/Litro médio<strong>${lit>0?'R$ '+(tot/lit).toFixed(3):'—'}</strong></div></div>`;
}

export function abrirMA(){
  _ea=null;
  document.getElementById('ma-t').textContent='⛽ Novo Abastecimento';
  ['ma-km','ma-lit','ma-val','ma-pos'].forEach(id=>document.getElementById(id).value='');
  document.getElementById('ma-data').value=now().slice(0,10);
  document.getElementById('ma-calc').style.display='none';
  document.getElementById('ma-placa-busca').value='';
  document.getElementById('ma-v').value='';
  document.getElementById('ma-veiculo-info').style.display='none';
  document.getElementById('ma-sugestoes').style.display='none';
  window.oMo('mo-a');
  setTimeout(()=>document.getElementById('ma-placa-busca').focus(),200);
}

export function editA(id){
  _ea=C.a.find(a=>a.id==id);if(!_ea)return;
  document.getElementById('ma-t').textContent='✏️ Editar Abastecimento';
  const v=window.gV(_ea.veiculo_id);
  document.getElementById('ma-placa-busca').value=v.placa||'';
  document.getElementById('ma-v').value=_ea.veiculo_id;
  document.getElementById('ma-vi-placa').textContent=v.placa||'';
  document.getElementById('ma-vi-modelo').textContent=`${v.modelo} ${v.ano||''}`;
  document.getElementById('ma-vi-resp').textContent=v.responsavel||'—';
  document.getElementById('ma-veiculo-info').style.display='flex';
  document.getElementById('ma-sugestoes').style.display='none';
  document.getElementById('ma-data').value=_ea.data;
  document.getElementById('ma-km').value=_ea.km_atual;
  document.getElementById('ma-lit').value=_ea.litros;
  document.getElementById('ma-val').value=_ea.valor_total;
  document.getElementById('ma-tip').value=_ea.tipo_combustivel;
  document.getElementById('ma-pos').value=_ea.posto||'';
  calcA();window.oMo('mo-a');
}

export async function salvarA(){
  const vid=document.getElementById('ma-v').value,km=parseInt(document.getElementById('ma-km').value);
  const lit=parseFloat(document.getElementById('ma-lit').value),val=parseFloat(document.getElementById('ma-val').value);
  if(!vid){window.toast('Selecione um veículo pela placa!','e');return;}
  if(!km||!lit||!val){window.toast('Preencha todos os campos obrigatórios!','e');return;}
  const p={veiculo_id:vid,data:document.getElementById('ma-data').value,km_atual:km,litros:lit,valor_total:val,tipo_combustivel:document.getElementById('ma-tip').value,posto:document.getElementById('ma-pos').value,usuario_id:SESSION.id,data_lancamento:now()};
  lov(true);try{if(_ea)await FB.upd('abastecimentos',_ea.id,p);else await FB.add('abastecimentos',p);slog(`Abastecimento: ${window.gV(vid).placa} — ${cur(val)}`);await window.loadAll();window.cMo('mo-a');renderA();window.toast('✅ Salvo!');}catch(e){window.toast('Erro: '+e.message,'e');}finally{lov(false);}
}

export function limparSelA(){
  document.getElementById('ma-v').value='';
  document.getElementById('ma-placa-busca').value='';
  document.getElementById('ma-veiculo-info').style.display='none';
  document.getElementById('ma-sugestoes').style.display='none';
  document.getElementById('ma-placa-busca').focus();
}

let _acAIdx=-1;
export function acPlacaA(el){
  el.value=el.value.toUpperCase();
  const q=el.value.replace(/\s/g,'');
  const sug=document.getElementById('ma-sugestoes');
  document.getElementById('ma-v').value='';
  document.getElementById('ma-veiculo-info').style.display='none';
  _acAIdx=-1;
  if(!q){sug.style.display='none';return;}
  const res=C.v.filter(v=>(v.placa||'').toUpperCase().replace(/\s/g,'').includes(q)&&v.status!=='inativo').slice(0,8);
  sug.style.display='block';
  if(!res.length){
    sug.innerHTML='<div style="padding:14px 16px;font-size:13px;color:#dc2626;display:flex;align-items:center;gap:10px"><span style="font-size:18px">⚠️</span><div><strong>Veículo não cadastrado</strong><div style="font-size:11px;color:#64748b;margin-top:2px">Placa "'+q+'" não encontrada</div></div></div>';
    return;
  }
  sug.innerHTML=res.map(v=>{
    const resp=v.responsavel?'👤 '+v.responsavel:'';
    return'<div onmousedown="acSelA('+v.id+')" style="padding:10px 16px;cursor:pointer;border-bottom:1px solid #e2e8f0;display:flex;justify-content:space-between;align-items:center" onmouseover="this.style.background=\'#eff6ff\'" onmouseout="this.style.background=\'\'">'
      +'<div><strong style="color:#1d6fdf;font-family:monospace;font-size:14px;letter-spacing:1px">'+v.placa+'</strong>'
      +' <span style="color:#0f172a;font-size:13px">'+v.modelo+' <span style="color:#94a3b8">'+(v.ano||'')+'</span></span></div>'
      +'<div style="font-size:11px;color:#64748b">'+resp+'</div></div>';
  }).join('');
}

export function acSelA(vid){
  const v=C.v.find(x=>x.id==vid);if(!v)return;
  document.getElementById('ma-v').value=v.id;
  document.getElementById('ma-placa-busca').value=v.placa;
  document.getElementById('ma-sugestoes').style.display='none';
  document.getElementById('ma-vi-placa').textContent=v.placa;
  document.getElementById('ma-vi-modelo').textContent=v.modelo+' '+(v.ano||'');
  document.getElementById('ma-vi-resp').textContent=v.responsavel||'—';
  const info=document.getElementById('ma-veiculo-info');
  info.style.display='flex';
  const kmAtual=v.km_atual||0;
  if(kmAtual>0&&!document.getElementById('ma-km').value)
    document.getElementById('ma-km').value=kmAtual;
}

export function acKeyA(e){
  const sug=document.getElementById('ma-sugestoes');
  const items=sug.querySelectorAll('div[onmousedown]');
  if(!items.length)return;
  if(e.key==='ArrowDown'){_acAIdx=Math.min(_acAIdx+1,items.length-1);items.forEach((el,i)=>el.style.background=i===_acAIdx?'#eff6ff':'');}
  else if(e.key==='ArrowUp'){_acAIdx=Math.max(_acAIdx-1,0);items.forEach((el,i)=>el.style.background=i===_acAIdx?'#eff6ff':'');}
  else if(e.key==='Enter'&&_acAIdx>=0){items[_acAIdx].dispatchEvent(new MouseEvent('mousedown'));e.preventDefault();}
  else if(e.key==='Escape'){sug.style.display='none';}
}

export function acBlurA(){setTimeout(()=>{const s=document.getElementById('ma-sugestoes');if(s)s.style.display='none';},180);}

// Make globally accessible
window.calcA = calcA;
window.renderA = renderA;
window.abrirMA = abrirMA;
window.editA = editA;
window.salvarA = salvarA;
window.limparSelA = limparSelA;
window.acPlacaA = acPlacaA;
window.acSelA = acSelA;
window.acKeyA = acKeyA;
window.acBlurA = acBlurA;

import { C, SESSION } from './state.js';
import { cur, fd, lov, slog, now } from './utils.js';
import { FB } from './api.js';

let _evd=null;

export function renderVendas(){
  const d=C.vd||[];
  document.getElementById('lvd').textContent=d.length+' vendas';
  const totalVendas=d.reduce((s,x)=>s+Number(x.valor_venda||0),0);
  document.getElementById('venda-kpis').innerHTML=`
    <div class="kpi bl"><div class="kpi-top"><div class="kpi-lbl">Veículos Vendidos</div><div class="kpi-ico">🚗</div></div><div class="kpi-val">${d.length}</div><div class="kpi-sub">histórico total</div></div>
    <div class="kpi gr"><div class="kpi-top"><div class="kpi-lbl">Total Arrecadado</div><div class="kpi-ico">💰</div></div><div class="kpi-val">${cur(totalVendas).replace('R$ ','R$')}</div><div class="kpi-sub">em vendas</div></div>
    <div class="kpi or"><div class="kpi-top"><div class="kpi-lbl">Custo Total Frota</div><div class="kpi-ico">🔧</div></div><div class="kpi-val">${cur(d.reduce((s,x)=>s+Number(x.custo_total||0),0)).replace('R$ ','R$')}</div><div class="kpi-sub">veículos vendidos</div></div>`;
  document.getElementById('tb-vd').innerHTML=d.map(vd=>{
    const v=C.v.find(x=>x.id==vd.veiculo_id)||{placa:'—',modelo:'—'};
    const custo=Number(vd.custo_total||0);
    const venda=Number(vd.valor_venda||0);
    const resultado=venda-custo;
    const rCls=resultado>=0?'t-gr':'t-or';
    const rSign=resultado>=0?'+':'';
    return`<tr>
      <td><strong class="mono t-bl">${v.placa}</strong><div class="badge b-rd fs11" style="margin-top:2px;display:inline-block">vendido</div></td>
      <td>${v.modelo} <span class="t-mu fs11">${v.ano||''}</span></td>
      <td>${fd(vd.data_venda)}</td>
      <td>${vd.comprador||'—'}</td>
      <td class="t-gr fw7 mono">${cur(vd.valor_venda)}</td>
      <td class="fs11"><span class="badge b-gy">${vd.forma_pagamento||'—'}</span></td>
      <td class="t-mu mono">${cur(custo)}</td>
      <td class="fw7 mono ${rCls}">${rSign}${cur(resultado)}</td>
      <td><div style="display:flex;gap:4px">
        <button class="btn btn-g btn-sm" onclick="verHistoricoVeiculo('${vd.veiculo_id}')">📋 Histórico</button>
        ${SESSION?.perfil==='admin'?`<button class="btn btn-sm btn-ic" style="background:#fef2f2;color:#dc2626;border:1px solid #fecaca" onclick="delVenda('${vd.id}')">🗑️</button>`:''}
      </div></td>
    </tr>`;
  }).join('')||'<tr><td colspan="9" style="text-align:center;padding:32px;color:var(--tm)">Nenhuma venda registrada</td></tr>';
}

export function abrirMVenda(){
  if(SESSION?.perfil!=='admin'&&SESSION?.perfil!=='financeiro'){window.toast('🚫 Sem permissão.','e');return;}
  _evd=null;
  document.getElementById('mvd-t').textContent='💰 Registrar Venda';
  ['mvd-comprador','mvd-obs'].forEach(id=>document.getElementById(id).value='');
  document.getElementById('mvd-data').value=now();
  document.getElementById('mvd-valor').value='';
  document.getElementById('mvd-v').value='';
  document.getElementById('mvd-placa-busca').value='';
  document.getElementById('mvd-v-info').style.display='none';
  document.getElementById('mvd-sugestoes').style.display='none';
  document.getElementById('mvd-resultado').style.display='none';
  window.oMo('mo-vd');
  setTimeout(()=>document.getElementById('mvd-placa-busca').focus(),200);
}

export function calcVenda(){
  const vid=document.getElementById('mvd-v').value;
  const venda=parseFloat(document.getElementById('mvd-valor').value)||0;
  const resEl=document.getElementById('mvd-resultado');
  if(!vid||!venda){resEl.style.display='none';return;}
  const custo=window.costV(vid);
  const resultado=venda-custo;
  const pos=resultado>=0;
  resEl.style.cssText=`display:block;background:${pos?'#f0fdf4':'#fef2f2'};border:1px solid ${pos?'#bbf7d0':'#fecaca'};border-radius:8px;padding:12px 16px;font-size:13px`;
  resEl.innerHTML=`<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px">
    <div><div style="color:#64748b;font-size:11px">Custo Total Frota</div><div class="t-or fw7 mono">${cur(custo)}</div></div>
    <div><div style="color:#64748b;font-size:11px">Valor de Venda</div><div class="t-gr fw7 mono">${cur(venda)}</div></div>
    <div><div style="color:#64748b;font-size:11px">Resultado</div><div class="fw7 mono ${pos?'t-gr':'t-or'}">${pos?'+':''}${cur(resultado)}</div></div>
  </div>`;
}

export async function salvarVenda(){
  if(SESSION?.perfil!=='admin'&&SESSION?.perfil!=='financeiro'){window.toast('🚫 Sem permissão.','e');return;}
  const vid=document.getElementById('mvd-v').value;
  const valor=parseFloat(document.getElementById('mvd-valor').value);
  const data=document.getElementById('mvd-data').value;
  const comprador=document.getElementById('mvd-comprador').value.trim();
  if(!vid){window.toast('Selecione um veículo!','e');return;}
  if(!valor||valor<=0){window.toast('Informe o valor de venda!','e');return;}
  if(!comprador){window.toast('Informe o comprador!','e');return;}
  const v=window.gV(vid);
  const custo=window.costV(vid);
  const p={
    veiculo_id:vid,placa:v.placa,modelo:v.modelo,ano:v.ano,
    data_venda:data, valor_venda:valor, comprador,
    forma_pagamento:document.getElementById('mvd-pgto').value,
    obs:document.getElementById('mvd-obs').value,
    custo_total:custo, resultado:valor-custo,
    usuario_id:SESSION.id, data_lancamento:now()
  };
  lov(true,'Registrando venda...');
  try{
    await FB.add('vendas',p);
    await FB.upd('veiculos',vid,{status:'vendido',data_venda:data,valor_venda:valor,comprador});
    await slog(`VENDA: ${v.placa} — ${v.modelo} — ${cur(valor)} para ${comprador}`);
    await window.loadAll();window.cMo('mo-vd');renderVendas();
    window.toast(`✅ Venda de ${v.placa} registrada!`);
  }catch(e){window.toast('Erro: '+e.message,'e');}finally{lov(false);}
}

export async function delVenda(id){
  if(SESSION?.perfil!=='admin'){window.toast('🚫 Sem permissão.','e');return;}
  if(!confirm('Excluir este registro de venda? O veículo não será reativado automaticamente.'))return;
  lov(true);
  try{
    await FB.del('vendas',id);
    await window.loadAll();renderVendas();window.toast('✅ Registro excluído!');
  }catch(e){window.toast('Erro: '+e.message,'e');}finally{lov(false);}
}

export function verHistoricoVeiculo(vid){
  const v=C.v.find(x=>x.id==vid)||C.vd.find(x=>x.veiculo_id==vid);
  const placa=v?.placa||'—';
  const modelo=v?.modelo||'—';
  const vd=C.vd.find(x=>x.veiculo_id==vid);
  const multas=(C.mt||[]).filter(m=>m.veiculo_id==vid);
  const manut=C.m.filter(m=>m.veiculo_id==vid);
  const abast=C.a.filter(a=>a.veiculo_id==vid);
  const custM=manut.reduce((s,x)=>s+Number(x.valor),0);
  const custA=abast.reduce((s,x)=>s+Number(x.valor_total),0);
  const custMulta=multas.reduce((s,x)=>s+Number(x.valor||0),0);
  const total=custM+custA+custMulta;
  document.getElementById('hist-vd-title').textContent=`📋 Histórico Completo — ${placa} (${modelo})`;
  document.getElementById('hist-vd-body').innerHTML=`
    <div style="padding:16px 20px">
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:18px">
        <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:12px;text-align:center">
          <div style="font-size:11px;color:#64748b">Combustível</div>
          <div class="fw7 t-gr mono">${cur(custA)}</div>
          <div style="font-size:11px;color:#94a3b8">${abast.length} registros</div>
        </div>
        <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:12px;text-align:center">
          <div style="font-size:11px;color:#64748b">Manutenção</div>
          <div class="fw7 t-bl mono">${cur(custM)}</div>
          <div style="font-size:11px;color:#94a3b8">${manut.length} OS</div>
        </div>
        <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:12px;text-align:center">
          <div style="font-size:11px;color:#64748b">Multas</div>
          <div class="fw7 mono" style="color:#dc2626">${cur(custMulta)}</div>
          <div style="font-size:11px;color:#94a3b8">${multas.length} autuações</div>
        </div>
        <div style="background:#fefce8;border:1px solid #fde68a;border-radius:8px;padding:12px;text-align:center">
          <div style="font-size:11px;color:#64748b">Custo Total</div>
          <div class="fw7 t-or mono">${cur(total)}</div>
          ${vd?`<div style="font-size:11px;color:#16a34a">Vendido: ${cur(vd.valor_venda)}</div>`:''}
        </div>
      </div>
      ${vd?`<div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:12px 16px;margin-bottom:16px;font-size:13px">
        💰 <strong>Venda:</strong> ${fd(vd.data_venda)} — ${cur(vd.valor_venda)} para <strong>${vd.comprador}</strong> (${vd.forma_pagamento}) — Resultado: <strong class="${vd.resultado>=0?'t-gr':'t-or'}">${vd.resultado>=0?'+':''}${cur(vd.resultado)}</strong>
      </div>`:''}
      ${manut.length?`<div style="font-weight:600;margin-bottom:8px;font-size:13px">🔧 Manutenções (${manut.length})</div>
      <div style="overflow-x:auto;margin-bottom:16px"><table style="width:100%;border-collapse:collapse;font-size:12px">
        <thead><tr>${['Data','Tipo','Descrição','KM','Valor'].map(h=>`<th style="background:#1e3a8a;color:#fff;padding:7px 10px;text-align:left">${h}</th>`).join('')}</tr></thead>
        <tbody>${manut.map((m,i)=>`<tr style="background:${i%2?'#f8fafc':'#fff'}"><td style="padding:6px 10px">${fd(m.data)}</td><td>${m.tipo_servico}</td><td style="color:#64748b">${m.descricao||'—'}</td><td class="mono">${m.km||0}</td><td class="t-or mono">${cur(m.valor)}</td></tr>`).join('')}</tbody>
      </table></div>`:''}
      ${abast.length?`<div style="font-weight:600;margin-bottom:8px;font-size:13px">⛽ Abastecimentos (${abast.length})</div>
      <div style="overflow-x:auto;margin-bottom:16px"><table style="width:100%;border-collapse:collapse;font-size:12px">
        <thead><tr>${['Data','KM','Litros','Valor','Tipo','Posto'].map(h=>`<th style="background:#1e3a8a;color:#fff;padding:7px 10px;text-align:left">${h}</th>`).join('')}</tr></thead>
        <tbody>${abast.map((a,i)=>`<tr style="background:${i%2?'#f8fafc':'#fff'}"><td style="padding:6px 10px">${fd(a.data)}</td><td class="mono">${a.km_atual||0}</td><td>${Number(a.litros).toFixed(2)}L</td><td class="t-gr mono">${cur(a.valor_total)}</td><td>${a.tipo_combustivel||'—'}</td><td>${a.posto||'—'}</td></tr>`).join('')}</tbody>
      </table></div>`:''}
      ${multas.length?`<div style="font-weight:600;margin-bottom:8px;font-size:13px">🚨 Multas (${multas.length})</div>
      <div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:12px">
        <thead><tr>${['Nº Multa','Data','Tipo Infração','Local','Condutor','Valor','Status'].map(h=>`<th style="background:#1e3a8a;color:#fff;padding:7px 10px;text-align:left">${h}</th>`).join('')}</tr></thead>
        <tbody>${multas.map((m,i)=>`<tr style="background:${i%2?'#f8fafc':'#fff'}"><td style="padding:6px 10px;font-family:monospace">${m.numero_multa||'—'}</td><td>${fd(m.data_infracao)}</td><td>${m.tipo_infracao||'—'}</td><td>${m.local_infracao||'—'}</td><td>${m.condutor||'—'}</td><td class="t-or mono">${cur(m.valor)}</td><td><span class="badge ${window.MT_ST_COLORS[m.status]||'b-gy'}" style="font-size:10px">${m.status}</span></td></tr>`).join('')}</tbody>
      </table></div>`:''}
    </div>`;
  window.oMo('mo-hist-vd');
}

export function limparSelVD(){
  document.getElementById('mvd-v').value='';
  document.getElementById('mvd-placa-busca').value='';
  document.getElementById('mvd-v-info').style.display='none';
  document.getElementById('mvd-resultado').style.display='none';
  document.getElementById('mvd-placa-busca').focus();
}

export function acPlacaVD(el){
  el.value=el.value.toUpperCase();
  const q=el.value.replace(/\s/g,'');
  const sug=document.getElementById('mvd-sugestoes');
  document.getElementById('mvd-v').value='';
  document.getElementById('mvd-v-info').style.display='none';
  document.getElementById('mvd-resultado').style.display='none';
  if(!q){sug.style.display='none';return;}
  const res=C.v.filter(v=>(v.placa||'').toUpperCase().includes(q)&&v.status!=='vendido'&&v.status!=='inativo').slice(0,8);
  sug.style.display='block';
  if(!res.length){sug.innerHTML='<div style="padding:12px 14px;font-size:13px;color:#dc2626">⚠️ Veículo não encontrado ou já vendido</div>';return;}
  sug.innerHTML=res.map(v=>`<div onmousedown="acSelVD(${v.id})" style="padding:9px 14px;cursor:pointer;border-bottom:1px solid #e2e8f0;font-size:13px" onmouseover="this.style.background='#eff6ff'" onmouseout="this.style.background=''">
    <strong style="color:#1d6fdf;font-family:monospace">${v.placa}</strong> <span style="color:#64748b">${v.modelo} ${v.ano||''}</span>
    <span style="font-size:11px;color:#94a3b8;margin-left:8px">${window.gCT(v.contrato_id).nome_contrato}</span>
  </div>`).join('');
}

export function acSelVD(vid){
  const v=C.v.find(x=>x.id==vid);if(!v)return;
  document.getElementById('mvd-v').value=v.id;
  document.getElementById('mvd-placa-busca').value=v.placa;
  document.getElementById('mvd-sugestoes').style.display='none';
  document.getElementById('mvd-vi-placa').textContent=v.placa;
  document.getElementById('mvd-vi-modelo').textContent=v.modelo+' '+(v.ano||'');
  document.getElementById('mvd-vi-custo').textContent=cur(window.costV(v.id));
  document.getElementById('mvd-v-info').style.display='block';
  calcVenda();
}

export function acKeyVD(e){if(e.key==='Escape')document.getElementById('mvd-sugestoes').style.display='none';}
export function acBlurVD(){setTimeout(()=>{const s=document.getElementById('mvd-sugestoes');if(s)s.style.display='none';},180);}

// Make globally accessible
window.renderVendas = renderVendas;
window.abrirMVenda = abrirMVenda;
window.calcVenda = calcVenda;
window.salvarVenda = salvarVenda;
window.delVenda = delVenda;
window.verHistoricoVeiculo = verHistoricoVeiculo;
window.limparSelVD = limparSelVD;
window.acPlacaVD = acPlacaVD;
window.acSelVD = acSelVD;
window.acKeyVD = acKeyVD;
window.acBlurVD = acBlurVD;

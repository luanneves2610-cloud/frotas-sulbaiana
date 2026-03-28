import { C, SESSION } from './state.js';
import { fd, lov, slog, now } from './utils.js';
import { FB } from './api.js';
import { sbReq } from './api.js';

export const MOV_TIPO_COLORS={
  'Entrada':'b-gr','Transferência':'b-bl','Devolução':'b-ye',
  'Saída para manutenção':'b-rd','Retorno de manutenção':'b-cy','Venda':'b-pu'
};
let _emov=null;

export function renderMov(){
  const b=(document.getElementById('fmov-b')?.value||'').toLowerCase();
  const tipo=document.getElementById('fmov-tipo')?.value||'';
  const fct=document.getElementById('fmov-ct')?.value||'';
  const di=document.getElementById('fmov-di')?.value||'';
  const df=document.getElementById('fmov-df')?.value||'';
  let d=C.mov||[];
  if(b) d=d.filter(m=>(window.gV(m.veiculo_id).placa||'').toLowerCase().includes(b)||(m.origem||'').toLowerCase().includes(b)||(m.destino||'').toLowerCase().includes(b));
  if(tipo) d=d.filter(m=>m.tipo_movimentacao===tipo);
  if(fct) d=d.filter(m=>window.gV(m.veiculo_id).contrato_id==fct);
  if(di) d=d.filter(m=>m.data_movimentacao>=di);
  if(df) d=d.filter(m=>m.data_movimentacao<=df);
  const total=C.mov.length;
  const porTipo={};(C.mov).forEach(m=>{porTipo[m.tipo_movimentacao]=(porTipo[m.tipo_movimentacao]||0)+1;});
  const kpiEl=document.getElementById('mov-kpis');
  if(kpiEl) kpiEl.innerHTML=Object.entries(porTipo).map(([t,n])=>`
    <div style="background:#f8fafc;border:1px solid var(--b1);border-radius:8px;padding:8px 14px;font-size:12px;display:flex;align-items:center;gap:8px">
      <span class="badge ${MOV_TIPO_COLORS[t]||'b-gy'}" style="font-size:10px">${t}</span>
      <strong style="font-size:15px">${n}</strong>
    </div>`).join('');
  document.getElementById('lmov').textContent=d.length+' registros';
  document.getElementById('tb-mov').innerHTML=d.map(m=>{
    const v=window.gV(m.veiculo_id);
    return`<tr>
      <td class="fs11">${fd(m.data_movimentacao)}</td>
      <td><strong class="mono t-bl">${v.placa||'—'}</strong><div class="fs11 t-mu">${v.modelo||''}</div></td>
      <td><span class="badge ${MOV_TIPO_COLORS[m.tipo_movimentacao]||'b-gy'}" style="font-size:10px">${m.tipo_movimentacao}</span></td>
      <td class="fs11">${m.origem||'—'}</td>
      <td class="fs11">${m.destino||'—'}</td>
      <td class="mono fs11">${m.km||0}</td>
      <td class="fs11">${m.usuario_responsavel||'—'}</td>
      <td class="fs11" style="max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${m.observacao||''}">${m.observacao||'—'}</td>
      <td><div style="display:flex;gap:4px">
        ${SESSION?.perfil==='admin'?`<button class="btn btn-sm btn-ic" style="background:#fef2f2;color:#dc2626;border:1px solid #fecaca" onclick="delMov('${m.id}')">🗑️</button>`:''}
      </div></td>
    </tr>`;
  }).join('')||'<tr><td colspan="9" style="text-align:center;padding:32px;color:var(--tm)">Nenhuma movimentação registrada</td></tr>';
}

export function abrirMMov(vidPresel){
  _emov=null;
  document.getElementById('mmov-t').textContent='🔄 Nova Movimentação';
  ['mmov-origem','mmov-destino','mmov-obs','mmov-resp'].forEach(id=>document.getElementById(id).value='');
  document.getElementById('mmov-data').value=now();
  document.getElementById('mmov-km').value='';
  document.getElementById('mmov-v').value='';
  document.getElementById('mmov-placa-busca').value='';
  document.getElementById('mmov-v-info').style.display='none';
  document.getElementById('mmov-sugestoes').style.display='none';
  document.getElementById('mmov-ct-box').style.display='none';
  const ctSel=document.getElementById('mmov-novo-ct');
  ctSel.innerHTML='<option value="">— Manter contrato atual —</option>';
  C.ct.forEach(c=>{ctSel.innerHTML+=`<option value="${c.id}">${c.nome_contrato}</option>`;});
  document.getElementById('mmov-resp').value=SESSION?.nome||'';
  if(vidPresel){
    const v=C.v.find(x=>x.id==vidPresel);
    if(v){
      document.getElementById('mmov-v').value=v.id;
      document.getElementById('mmov-placa-busca').value=v.placa;
      document.getElementById('mmov-vi-placa').textContent=v.placa;
      document.getElementById('mmov-vi-modelo').textContent=v.modelo;
      document.getElementById('mmov-vi-st').textContent=v.status;
      document.getElementById('mmov-v-info').style.display='block';
      document.getElementById('mmov-origem').value=window.gCT(v.contrato_id).nome_contrato||'';
    }
  }
  window.oMo('mo-mov');
}

export function onMmovTipo(){
  const tipo=document.getElementById('mmov-tipo').value;
  const mostrarCt=['Transferência','Devolução','Entrada'].includes(tipo);
  document.getElementById('mmov-ct-box').style.display=mostrarCt?'block':'none';
}

export function previewFotosMov(input){
  const prev=document.getElementById('mmov-fotos-preview');if(!prev)return;
  prev.innerHTML='';
  Array.from(input.files).forEach(file=>{
    const reader=new FileReader();
    reader.onload=e=>{
      const div=document.createElement('div');
      div.style.cssText='position:relative;width:72px;height:72px;border-radius:8px;overflow:hidden;border:2px solid var(--b1)';
      div.innerHTML=`<img src="${e.target.result}" style="width:100%;height:100%;object-fit:cover"><div style="position:absolute;bottom:0;left:0;right:0;background:rgba(0,0,0,.5);color:#fff;font-size:9px;padding:2px 4px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${file.name}</div>`;
      prev.appendChild(div);
    };reader.readAsDataURL(file);
  });
}

export function getChecklist(){
  const items={'chk-pneus':'Pneus','chk-luzes':'Luzes','chk-docs':'Documentação','chk-freios':'Freios','chk-oleo':'Óleo','chk-agua':'Água','chk-retrovisor':'Retrovisores','chk-parabrisa':'Para-brisa','chk-bateria':'Bateria','chk-extintor':'Extintor','chk-triangulo':'Triângulo','chk-macaco':'Macaco/Chave'};
  const ok=[],nok=[];
  Object.entries(items).forEach(([id,lbl])=>{(document.getElementById(id)?.checked?ok:nok).push(lbl);});
  const obs=document.getElementById('mmov-chk-obs')?.value||'';
  return{ok,nok,obs,resumo:`✅OK: ${ok.join(', ')||'nenhum'} | ❌NOK: ${nok.join(', ')||'nenhum'}${obs?' | Obs: '+obs:''}`};
}

export async function salvarMov(){
  const tipo=document.getElementById('mmov-tipo').value;
  const tiposQueExigem=['Saída para manutenção','Devolução','Transferência'];
  if(tiposQueExigem.includes(tipo)){
    const vid=document.getElementById('mmov-v').value;
    if(vid){
      const ontem=new Date(Date.now()-24*3600000).toISOString();
      try{
        const chks=await sbReq('GET','checklist_execucoes',null,
          `veiculo_id=eq.${vid}&status=eq.concluido&criado_em=gte.${ontem}&limit=1`);
        if(!chks.length){
          if(!confirm(`⚠️ Esta movimentação (${tipo}) requer um check-list recente.\n\nNão foi encontrado check-list concluído nas últimas 24h para este veículo.\n\nDeseja prosseguir mesmo assim? (Para gerar o check-list, cancele e use a aba Check-list)`)){
            return;
          }
        }
      }catch(e){ /* falha silenciosa — não bloquear */ }
    }
  }
  const vid=document.getElementById('mmov-v').value;
  const data=document.getElementById('mmov-data').value;
  const tipoMov=document.getElementById('mmov-tipo').value;
  const origem=document.getElementById('mmov-origem').value.trim();
  const destino=document.getElementById('mmov-destino').value.trim();
  if(!vid){window.toast('Selecione um veículo!','e');return;}
  if(!data||!origem||!destino){window.toast('Data, origem e destino são obrigatórios!','e');return;}
  const novoCt=document.getElementById('mmov-novo-ct').value;
  const p={
    veiculo_id:vid, data_movimentacao:data, tipo_movimentacao:tipoMov,
    origem, destino, km:parseInt(document.getElementById('mmov-km').value)||0,
    observacao:(()=>{const obs=document.getElementById('mmov-obs').value;const chk=getChecklist();return obs?(obs+'\n[CHECK-LIST] '+chk.resumo):'[CHECK-LIST] '+chk.resumo;})(),
    usuario_responsavel:document.getElementById('mmov-resp').value||SESSION?.nome,
    usuario_id:SESSION?.id
  };
  lov(true,'Registrando...');
  try{
    await FB.add('movimentacoes_veiculos',p);
    const vUpd={};
    if(novoCt) vUpd.contrato_id=novoCt;
    if(parseInt(document.getElementById('mmov-km').value)>0) vUpd.km_atual=parseInt(document.getElementById('mmov-km').value);
    const stMap={'Saída para manutenção':'manutenção','Retorno de manutenção':'ativo','Entrada':'ativo','Devolução':'devolvido','Venda':'vendido'};
    if(stMap[tipoMov]) vUpd.status=stMap[tipoMov];
    if(Object.keys(vUpd).length>0) await FB.upd('veiculos',vid,vUpd);
    await slog(`Movimentação: ${window.gV(vid).placa} — ${tipoMov} → ${destino}`);
    await window.loadAll();window.cMo('mo-mov');renderMov();
    window.toast('✅ Movimentação registrada!');
  }catch(e){window.toast('Erro: '+e.message,'e');}finally{lov(false);}
}

export async function delMov(id){
  if(!confirm('Excluir esta movimentação?'))return;
  lov(true);
  try{await FB.del('movimentacoes_veiculos',id);await window.loadAll();renderMov();window.toast('✅ Excluído!');}
  catch(e){window.toast('Erro: '+e.message,'e');}finally{lov(false);}
}

export function verMovVeiculo(vid){
  const v=window.gV(vid);
  const movs=(C.mov||[]).filter(m=>m.veiculo_id==vid).sort((a,b)=>b.data_movimentacao>a.data_movimentacao?1:-1);
  document.getElementById('hist-mov-title').textContent=`🔄 Movimentações — ${v.placa} (${v.modelo})`;
  document.getElementById('hist-mov-nova-btn').onclick=()=>{window.cMo('mo-hist-mov');abrirMMov(vid);};
  document.getElementById('hist-mov-body').innerHTML=movs.length?`
    <div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:12px">
      <thead><tr>${['Data','Tipo','Origem','Destino','KM','Usuário','Obs'].map(h=>`<th style="background:#1e3a8a;color:#fff;padding:7px 10px;text-align:left">${h}</th>`).join('')}</tr></thead>
      <tbody>${movs.map((m,i)=>`<tr style="background:${i%2?'#f8fafc':'#fff'}">
        <td style="padding:6px 10px">${fd(m.data_movimentacao)}</td>
        <td><span class="badge ${MOV_TIPO_COLORS[m.tipo_movimentacao]||'b-gy'}" style="font-size:10px">${m.tipo_movimentacao}</span></td>
        <td>${m.origem||'—'}</td><td>${m.destino||'—'}</td>
        <td class="mono">${m.km||0}</td><td>${m.usuario_responsavel||'—'}</td>
        <td style="color:var(--tm)">${m.observacao||'—'}</td>
      </tr>`).join('')}</tbody>
    </table></div>`
    :'<div style="text-align:center;padding:24px;color:var(--tm)">Nenhuma movimentação registrada para este veículo.</div>';
  window.oMo('mo-hist-mov');
}

export function limparSelMov(){
  document.getElementById('mmov-v').value='';
  document.getElementById('mmov-placa-busca').value='';
  document.getElementById('mmov-v-info').style.display='none';
  document.getElementById('mmov-placa-busca').focus();
}

export function acPlacaMov(el){
  el.value=el.value.toUpperCase();
  const q=el.value.replace(/\s/g,'');
  const sug=document.getElementById('mmov-sugestoes');
  document.getElementById('mmov-v').value='';
  document.getElementById('mmov-v-info').style.display='none';
  if(!q){sug.style.display='none';return;}
  const res=C.v.filter(v=>(v.placa||'').toUpperCase().includes(q)).slice(0,8);
  sug.style.display='block';
  if(!res.length){sug.innerHTML='<div style="padding:12px 14px;font-size:13px;color:#dc2626">⚠️ Veículo não encontrado</div>';return;}
  sug.innerHTML=res.map(v=>`<div onmousedown="acSelMov(${v.id})" style="padding:9px 14px;cursor:pointer;border-bottom:1px solid #e2e8f0;font-size:13px" onmouseover="this.style.background='#eff6ff'" onmouseout="this.style.background=''">
    <strong style="color:#1d6fdf;font-family:monospace">${v.placa}</strong> <span style="color:#64748b">${v.modelo} ${v.ano||''}</span>
    <span class="badge ${v.status==='ativo'?'b-gr':v.status==='manutenção'?'b-ye':'b-gy'}" style="font-size:10px;margin-left:6px">${v.status}</span>
  </div>`).join('');
}

export function acSelMov(vid){
  const v=C.v.find(x=>x.id==vid);if(!v)return;
  document.getElementById('mmov-v').value=v.id;
  document.getElementById('mmov-placa-busca').value=v.placa;
  document.getElementById('mmov-sugestoes').style.display='none';
  document.getElementById('mmov-vi-placa').textContent=v.placa;
  document.getElementById('mmov-vi-modelo').textContent=v.modelo+' '+(v.ano||'');
  document.getElementById('mmov-vi-st').textContent=v.status;
  document.getElementById('mmov-v-info').style.display='block';
  document.getElementById('mmov-origem').value=window.gCT(v.contrato_id).nome_contrato||'';
}

export function acKeyMov(e){if(e.key==='Escape')document.getElementById('mmov-sugestoes').style.display='none';}
export function acBlurMov(){setTimeout(()=>{const s=document.getElementById('mmov-sugestoes');if(s)s.style.display='none';},180);}

// Make globally accessible
window.MOV_TIPO_COLORS = MOV_TIPO_COLORS;
window.renderMov = renderMov;
window.abrirMMov = abrirMMov;
window.onMmovTipo = onMmovTipo;
window.previewFotosMov = previewFotosMov;
window.getChecklist = getChecklist;
window.salvarMov = salvarMov;
window.delMov = delMov;
window.verMovVeiculo = verMovVeiculo;
window.limparSelMov = limparSelMov;
window.acPlacaMov = acPlacaMov;
window.acSelMov = acSelMov;
window.acKeyMov = acKeyMov;
window.acBlurMov = acBlurMov;

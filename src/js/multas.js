import { C, SESSION } from './state.js';
import { cur, fd, lov, slog, now } from './utils.js';
import { FB } from './api.js';
import { dispararNotificacao } from './notificacoes.js';

export const MT_ST_COLORS={
  'recebida':'b-bl','aguardando indicação':'b-ye','condutor indicado':'b-cy',
  'em recurso':'b-pu','paga':'b-gr','vencida':'b-rd'
};
let _emt=null;

export function renderMulatas(){
  const b=(document.getElementById('fmt-b')?.value||'').toLowerCase();
  const fst=document.getElementById('fmt-st')?.value||'';
  const fct=document.getElementById('fmt-ct')?.value||'';
  const fctEl=document.getElementById('fmt-ct');
  if(fctEl){const v=fctEl.value;fctEl.innerHTML='<option value="">Todos contratos</option>';C.ct.forEach(x=>{fctEl.innerHTML+=`<option value="${x.id}">${x.nome_contrato}</option>`;});fctEl.value=v;}
  let d=C.mt||[];
  if(b) d=d.filter(m=>m.numero_multa?.toLowerCase().includes(b)||m.condutor?.toLowerCase().includes(b)||(window.gV(m.veiculo_id).placa||'').toLowerCase().includes(b));
  if(fst) d=d.filter(m=>m.status===fst);
  if(fct) d=d.filter(m=>window.gV(m.veiculo_id).contrato_id==fct);
  document.getElementById('lmt').textContent=d.length+' multas';
  document.getElementById('tb-mt').innerHTML=d.map(m=>{
    const v=window.gV(m.veiculo_id);
    return`<tr>
      <td class="mono fs11">${m.numero_multa||'—'}</td>
      <td><strong class="mono t-bl">${v.placa}</strong></td>
      <td class="fs11">${fd(m.data_infracao)}<br><span class="t-mu">${m.hora_infracao||''}</span></td>
      <td class="fs11" style="max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${m.tipo_infracao||'—'}</td>
      <td class="fs11" style="max-width:140px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${m.local_infracao||'—'}</td>
      <td class="fs11">${m.orgao_autuador||'—'}</td>
      <td class="fs11">${m.condutor||'—'}</td>
      <td class="t-or fw7 mono">${cur(m.valor)}</td>
      <td class="t-mu fs11">${m.pontuacao||0} pts</td>
      <td><span class="badge ${MT_ST_COLORS[m.status]||'b-gy'}" style="font-size:10px">${m.status}</span></td>
      <td><div style="display:flex;gap:4px">
        <button class="btn btn-g btn-sm btn-ic" onclick="editMulta('${m.id}')">✏️</button>
        <button class="btn btn-sm btn-ic" style="background:#fef2f2;color:#dc2626;border:1px solid #fecaca" onclick="delMulta('${m.id}')">🗑️</button>
      </div></td>
    </tr>`;
  }).join('')||'<tr><td colspan="11" style="text-align:center;padding:32px;color:var(--tm)">Nenhuma multa registrada</td></tr>';
}

export function abrirMMU(){
  _emt=null;
  document.getElementById('mmt-t').textContent='🚨 Nova Multa';
  ['mmt-num','mmt-hora','mmt-orgao','mmt-local','mmt-condutor','mmt-obs'].forEach(id=>document.getElementById(id).value='');
  ['mmt-pdf','mmt-foto','mmt-comp','mmt-cnh'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
  document.getElementById('mmt-data').value=now();
  document.getElementById('mmt-valor').value='';
  document.getElementById('mmt-pts').value='0';
  document.getElementById('mmt-st').value='recebida';
  document.getElementById('mmt-v').value='';
  document.getElementById('mmt-placa-busca').value='';
  document.getElementById('mmt-v-info').style.display='none';
  document.getElementById('mmt-sugestoes').style.display='none';
  document.getElementById('mmt-ct-nome').value='';
  document.getElementById('mmt-loc-nome').value='';
  window.oMo('mo-mt');
  setTimeout(()=>document.getElementById('mmt-placa-busca').focus(),200);
}

export function editMulta(id){
  _emt=C.mt.find(x=>x.id==id);if(!_emt)return;
  document.getElementById('mmt-t').textContent='✏️ Editar Multa';
  document.getElementById('mmt-num').value=_emt.numero_multa||'';
  document.getElementById('mmt-data').value=_emt.data_infracao||'';
  document.getElementById('mmt-hora').value=_emt.hora_infracao||'';
  document.getElementById('mmt-tipo').value=_emt.tipo_infracao||'';
  document.getElementById('mmt-orgao').value=_emt.orgao_autuador||'';
  document.getElementById('mmt-local').value=_emt.local_infracao||'';
  document.getElementById('mmt-condutor').value=_emt.condutor||'';
  document.getElementById('mmt-valor').value=_emt.valor||'';
  document.getElementById('mmt-pts').value=_emt.pontuacao||0;
  document.getElementById('mmt-st').value=_emt.status||'recebida';
  document.getElementById('mmt-obs').value=_emt.obs||'';
  const v=window.gV(_emt.veiculo_id);
  document.getElementById('mmt-v').value=_emt.veiculo_id;
  document.getElementById('mmt-placa-busca').value=v.placa||'';
  document.getElementById('mmt-vi-placa').textContent=v.placa||'';
  document.getElementById('mmt-vi-modelo').textContent=v.modelo||'';
  document.getElementById('mmt-vi-ct').textContent=window.gCT(v.contrato_id).nome_contrato||'';
  document.getElementById('mmt-ct-nome').value=window.gCT(v.contrato_id).nome_contrato||'';
  document.getElementById('mmt-loc-nome').value=window.gLoc(v.localidade_id).nome_localidade||'';
  document.getElementById('mmt-v-info').style.display='block';
  window.oMo('mo-mt');
}

export async function salvarMulta(){
  const vid=document.getElementById('mmt-v').value;
  const num=document.getElementById('mmt-num').value.trim();
  const val=parseFloat(document.getElementById('mmt-valor').value);
  const data=document.getElementById('mmt-data').value;
  const local=document.getElementById('mmt-local').value.trim();
  const orgao=document.getElementById('mmt-orgao').value.trim();
  if(!vid){window.toast('Selecione um veículo!','e');return;}
  if(!num){window.toast('Informe o número da multa!','e');return;}
  if(!val||val<=0){window.toast('Informe o valor!','e');return;}
  if(!data){window.toast('Informe a data!','e');return;}
  if(!local){window.toast('Informe o local!','e');return;}
  if(!orgao){window.toast('Informe o órgão autuador!','e');return;}
  const p={
    numero_multa:num, veiculo_id:vid,
    data_infracao:data, hora_infracao:document.getElementById('mmt-hora').value,
    tipo_infracao:document.getElementById('mmt-tipo').value,
    local_infracao:local, orgao_autuador:orgao,
    condutor:document.getElementById('mmt-condutor').value,
    valor:val, pontuacao:parseInt(document.getElementById('mmt-pts').value)||0,
    status:document.getElementById('mmt-st').value,
    obs:document.getElementById('mmt-obs').value,
    arquivo_cnh:document.getElementById('mmt-cnh').files[0]?.name||_emt?.arquivo_cnh||null,
    contrato_id:window.gV(vid).contrato_id, localidade_id:window.gV(vid).localidade_id,
    usuario_id:SESSION.id, data_lancamento:now()
  };
  lov(true,'Salvando...');
  try{
    if(_emt)await FB.upd('multas',_emt.id,p);
    else{
      const [nova]=await FB.add('multas',p);
      // Notificação de nova multa (não crítico — fire-and-forget)
      dispararNotificacao('multa_registrada',{
        placa:window.gV(vid).placa,
        descricao:p.tipo_infracao||'—',
        valor:cur(val),
        data_infracao:fd(data),
        data_vencimento:null,
        url:window.location.origin,
      },nova?.id||null);
    }
    await slog(`Multa ${_emt?'editada':'lançada'}: ${window.gV(vid).placa} — ${num} — ${cur(val)}`);
    await window.loadAll();window.cMo('mo-mt');renderMulatas();
    window.toast('✅ Multa salva!');
  }catch(e){window.toast('Erro: '+e.message,'e');}finally{lov(false);}
}

export async function delMulta(id){
  if(!confirm('Excluir esta multa? Ação irreversível.'))return;
  const m=C.mt.find(x=>x.id==id);
  lov(true);
  try{
    await FB.del('multas',id);
    await slog(`Multa excluída: ${m?.numero_multa} — ${window.gV(m?.veiculo_id).placa}`);
    await window.loadAll();renderMulatas();window.toast('✅ Multa excluída!');
  }catch(e){window.toast('Erro: '+e.message,'e');}finally{lov(false);}
}

export function limparSelMT(){
  document.getElementById('mmt-v').value='';
  document.getElementById('mmt-placa-busca').value='';
  document.getElementById('mmt-v-info').style.display='none';
  document.getElementById('mmt-ct-nome').value='';
  document.getElementById('mmt-loc-nome').value='';
  document.getElementById('mmt-placa-busca').focus();
}

export function acPlacaMT(el){
  el.value=el.value.toUpperCase();
  const q=el.value.replace(/\s/g,'');
  const sug=document.getElementById('mmt-sugestoes');
  document.getElementById('mmt-v').value='';
  document.getElementById('mmt-v-info').style.display='none';
  if(!q){sug.style.display='none';return;}
  const res=C.v.filter(v=>(v.placa||'').toUpperCase().includes(q)&&v.status!=='vendido').slice(0,8);
  sug.style.display='block';
  if(!res.length){sug.innerHTML='<div style="padding:12px 14px;font-size:13px;color:#dc2626">⚠️ Veículo não encontrado</div>';return;}
  sug.innerHTML=res.map(v=>`<div onmousedown="acSelMT(${v.id})" style="padding:9px 14px;cursor:pointer;border-bottom:1px solid #e2e8f0;font-size:13px" onmouseover="this.style.background='#eff6ff'" onmouseout="this.style.background=''">
    <strong style="color:#1d6fdf;font-family:monospace">${v.placa}</strong> <span style="color:#64748b">${v.modelo} ${v.ano||''}</span>
    <span style="font-size:11px;color:#94a3b8;margin-left:8px">${window.gCT(v.contrato_id).nome_contrato}</span>
  </div>`).join('');
}

export function acSelMT(vid){
  const v=C.v.find(x=>x.id==vid);if(!v)return;
  document.getElementById('mmt-v').value=v.id;
  document.getElementById('mmt-placa-busca').value=v.placa;
  document.getElementById('mmt-sugestoes').style.display='none';
  document.getElementById('mmt-vi-placa').textContent=v.placa;
  document.getElementById('mmt-vi-modelo').textContent=v.modelo+' '+(v.ano||'');
  document.getElementById('mmt-vi-ct').textContent=window.gCT(v.contrato_id).nome_contrato;
  document.getElementById('mmt-ct-nome').value=window.gCT(v.contrato_id).nome_contrato;
  document.getElementById('mmt-loc-nome').value=window.gLoc(v.localidade_id).nome_localidade;
  document.getElementById('mmt-v-info').style.display='block';
}

export function acKeyMT(e){
  const sug=document.getElementById('mmt-sugestoes');
  const items=sug.querySelectorAll('div[onmousedown]');
  if(!items.length)return;
  if(e.key==='Escape')sug.style.display='none';
}

export function acBlurMT(){setTimeout(()=>{const s=document.getElementById('mmt-sugestoes');if(s)s.style.display='none';},180);}

// Make globally accessible
window.MT_ST_COLORS = MT_ST_COLORS;
window.renderMulatas = renderMulatas;
window.abrirMMU = abrirMMU;
window.editMulta = editMulta;
window.salvarMulta = salvarMulta;
window.delMulta = delMulta;
window.limparSelMT = limparSelMT;
window.acPlacaMT = acPlacaMT;
window.acSelMT = acSelMT;
window.acKeyMT = acKeyMT;
window.acBlurMT = acBlurMT;

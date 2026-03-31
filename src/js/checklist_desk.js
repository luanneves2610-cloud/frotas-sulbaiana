import { C, SESSION } from './state.js';
import { fd, lov, slog } from './utils.js';
import { sbReq } from './api.js';
import { SB_URL, SB_KEY, SITE_URL } from './config.js';

// Retorna a base URL correta: produção em localhost, origem real em deploy
function _getBaseUrl(){
  const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  const origin  = isLocal && SITE_URL ? SITE_URL : window.location.origin;
  return origin + '/';
}

let _chkExecs=[], _chkItens=[];

export async function renderChecklist_desk(){
  try{
    _chkExecs=await sbReq('GET','checklist_execucoes',null,'select=*,veiculos(placa,modelo)&order=criado_em.desc&limit=200');
    _chkItens=await sbReq('GET','checklist_itens',null,'ativo=eq.true&order=ordem.asc&select=*');
  }catch(e){
    document.getElementById('tb-chk').innerHTML='<tr><td colspan="10" style="text-align:center;padding:24px;color:#b45309;background:#fef3c7">⚠️ Execute o SQL v6 no Supabase para ativar o Check-list</td></tr>';
    document.getElementById('lchk').textContent='SQL v6 necessário';
    return;
  }

  const selCt=document.getElementById('fchk-ct');
  if(selCt){ const v=selCt.value; selCt.innerHTML='<option value="">Todos os contratos</option>'; C.ct.forEach(x=>{selCt.innerHTML+=`<option value="${x.id}">${x.nome_contrato}</option>`;}); selCt.value=v; }

  const selV=document.getElementById('fchk-v');
  const fct=document.getElementById('fchk-ct')?.value||'';
  if(selV){
    const vAtual=selV.value;
    const veicsFiltrados=fct?C.v.filter(v=>v.contrato_id==fct):C.v;
    selV.innerHTML='<option value="">Todos os veículos</option>';
    veicsFiltrados.forEach(x=>{selV.innerHTML+=`<option value="${x.id}">${x.placa} — ${x.modelo}</option>`;});
    selV.value=vAtual;
    selV.onchange=renderChecklist_desk;
  }

  const fv=document.getElementById('fchk-v')?.value||'';
  const ftp=document.getElementById('fchk-tp')?.value||'';
  const fst=document.getElementById('fchk-st')?.value||'';
  let data=_chkExecs;
  if(fct){
    const vidsContrato=new Set(C.v.filter(v=>v.contrato_id==fct).map(v=>v.id));
    data=data.filter(x=>vidsContrato.has(x.veiculo_id));
  }
  if(fv) data=data.filter(x=>x.veiculo_id==fv);
  if(ftp) data=data.filter(x=>x.tipo===ftp);
  if(fst) data=data.filter(x=>x.status===fst);

  const total=_chkExecs.length;
  const concluidos=_chkExecs.filter(x=>x.status==='concluido').length;
  const reprovados=_chkExecs.filter(x=>x.classificacao==='Reprovado').length;
  const pendentes=_chkExecs.filter(x=>x.status==='pendente'||x.status==='em_andamento').length;
  document.getElementById('chk-kpis').innerHTML=`
    <div class="kpi bl" style="min-width:120px"><div class="kpi-top"><div class="kpi-lbl">Total</div><div class="kpi-ico">📋</div></div><div class="kpi-val">${total}</div></div>
    <div class="kpi gr" style="min-width:120px"><div class="kpi-top"><div class="kpi-lbl">Concluídos</div><div class="kpi-ico">✅</div></div><div class="kpi-val">${concluidos}</div></div>
    <div class="kpi rd" style="min-width:120px"><div class="kpi-top"><div class="kpi-lbl">Reprovados</div><div class="kpi-ico">🚫</div></div><div class="kpi-val">${reprovados}</div></div>
    <div class="kpi ye" style="min-width:120px"><div class="kpi-top"><div class="kpi-lbl">Pendentes</div><div class="kpi-ico">⏳</div></div><div class="kpi-val">${pendentes}</div></div>`;

  document.getElementById('lchk').textContent=data.length+' check-lists';

  const stColor={'pendente':'b-gy','em_andamento':'b-ye','concluido':'b-gr','expirado':'b-rd'};
  const clsColor={'Aprovado':'b-gr','Aprovado com ressalvas':'b-ye','Reprovado':'b-rd'};

  document.getElementById('tb-chk').innerHTML=data.map(x=>{
    const v=x.veiculos||window.gV(x.veiculo_id)||{};
    const dur=x.inicio_em&&x.fim_em?Math.round((new Date(x.fim_em)-new Date(x.inicio_em))/60000)+'min':'—';
    const scoreHtml=x.score!=null?`<strong style="color:${x.score>=90?'#16a34a':x.score>=70?'#b45309':'#dc2626'}">${x.score}%</strong>`:'—';
    return`<tr>
      <td><strong class="mono t-bl">${v.placa||'—'}</strong><div class="fs11 t-mu">${v.modelo||''}</div></td>
      <td><span class="badge ${x.tipo==='movimentacao'?'b-cy':'b-pu'}">${x.tipo==='movimentacao'?'🔄 Movimentação':'📊 Auditoria'}</span></td>
      <td class="fs11">${x.tipo_movimentacao||'—'}</td>
      <td>${scoreHtml}</td>
      <td>${x.classificacao?`<span class="badge ${clsColor[x.classificacao]||'b-gy'}">${x.classificacao}</span>`:'—'}</td>
      <td class="fs11">${x.usuario_nome||'—'}</td>
      <td>${fd(x.criado_em?.slice(0,10))}</td>
      <td class="fs11">${dur}</td>
      <td><span class="badge ${stColor[x.status]||'b-gy'}">${x.status}</span></td>
      <td><div style="display:flex;gap:4px">
        ${x.status==='pendente'||x.status==='em_andamento'?`<button class="btn btn-g btn-sm btn-ic" onclick="copiarLinkExec('${x.token}')" title="Copiar link">🔗</button><button class="btn btn-g btn-sm btn-ic" onclick="mostrarQR('${x.token}')" title="QR Code">📱</button>`:''}
        ${x.status==='concluido'?`<button class="btn btn-g btn-sm btn-ic" onclick="verDetalhesChk(${x.id})" title="Ver detalhes">👁️</button>`:''}
        <button class="btn btn-sm btn-ic" style="background:#fef2f2;color:#dc2626;border:1px solid #fecaca" onclick="excluirChk(${x.id},'${v.placa||'?'}')" title="Excluir">🗑️</button>
      </div></td>
    </tr>`;
  }).join('')||'<tr><td colspan="10" style="text-align:center;padding:32px;color:var(--tm)">Nenhum check-list encontrado</td></tr>';
}

export async function excluirChk(id, placa){
  if(!confirm(`Excluir o check-list do veículo ${placa}?\nTodas as respostas e fotos serão removidas. Ação irreversível.`)) return;
  lov(true,'Excluindo...');
  try{
    // Remove fotos do Storage (pasta inteira pelo prefixo execucao_id/)
    try{
      await fetch(`${SB_URL}/storage/v1/object/checklist-fotos`,{
        method:'DELETE',
        headers:{'apikey':SB_KEY,'Authorization':'Bearer '+SB_KEY,'Content-Type':'application/json'},
        body:JSON.stringify({prefixes:[`${id}/`]})
      });
    }catch(e){ console.warn('Não foi possível limpar o Storage:',e); }

    await sbReq('DELETE','checklist_fotos',null,`execucao_id=eq.${id}`);
    await sbReq('DELETE','checklist_respostas',null,`execucao_id=eq.${id}`);
    await sbReq('DELETE','checklist_execucoes',null,`id=eq.${id}`);
    await slog(`Check-list excluído: ${placa} — id ${id}`);
    await renderChecklist_desk();
    window.toast('✅ Check-list excluído!');
  }catch(e){window.toast('Erro ao excluir: '+e.message,'e');}
  finally{lov(false);}
}

export function gerarToken(len=32){
  const chars='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  return Array.from({length:len},()=>chars[Math.floor(Math.random()*chars.length)]).join('');
}

export function abrirGerarChk(){
  try{
    const el=document.getElementById('chk-placa-busca');
    if(el) el.value='';
    const elv=document.getElementById('chk-v');
    if(elv) elv.value='';
    const elvi=document.getElementById('chk-v-info');
    if(elvi) elvi.style.display='none';
    const elr=document.getElementById('chk-result');
    if(elr) elr.style.display='none';
    const elqr=document.getElementById('chk-qr');
    if(elqr) elqr.innerHTML='';
    const elkm=document.getElementById('chk-km');
    if(elkm) elkm.value='';
    window.oMo('mo-chk');
  }catch(e){ console.error('Erro abrirGerarChk:',e); window.toast('Erro ao abrir: '+e.message,'e'); }
}

export async function gerarChecklistToken(){
  const vid=document.getElementById('chk-v').value;
  if(!vid){window.toast('Selecione um veículo!','e');return;}
  const tipo=document.getElementById('chk-tipo').value;
  const exp=parseInt(document.getElementById('chk-exp').value);
  const token=gerarToken();
  const expiraEm=exp>0?new Date(Date.now()+exp*3600000).toISOString():null;
  lov(true,'Gerando check-list...');
  try{
    const kmGer=parseInt(document.getElementById('chk-km')?.value)||window.gV(vid).km_atual||0;
    const vistoriador=document.getElementById('chk-vistoriador')?.value.trim()||'';
    const localVistoria=document.getElementById('chk-local-vistoria')?.value.trim()||'';
    const tipoVeiculo=window._chkTipoVeiculo||'carro';
    const anoFab=window._chkAnoFabricacao||window.gV(vid).ano||'';
    await sbReq('POST','checklist_execucoes',{
      token, veiculo_id:parseInt(vid), tipo,
      status:'pendente', usuario_id:SESSION.id, usuario_nome:SESSION.nome,
      km_veiculo:kmGer, expira_em:expiraEm,
      tipo_movimentacao:tipo==='movimentacao'?'A definir':null,
      tipo_veiculo:tipoVeiculo, vistoriador:vistoriador||null,
      local_vistoria:localVistoria||null, ano_fabricacao:anoFab||null
    },'');
    await slog(`Check-list gerado: ${window.gV(vid).placa} — token ${token.slice(0,8)}...`);
    const base=_getBaseUrl();
    const url=`${base}checklist.html?t=${token}`;
    document.getElementById('chk-link').value=url;
    document.getElementById('chk-result').style.display='block';
    document.getElementById('chk-qr').innerHTML='';
    new QRCode(document.getElementById('chk-qr'),{text:url,width:180,height:180,colorDark:'#1e3a8a',colorLight:'#ffffff'});
    await renderChecklist_desk();
    window.toast('✅ Check-list gerado!');
  }catch(e){window.toast('Erro: '+e.message,'e');}finally{lov(false);}
}

export function copiarLink(){
  const link=document.getElementById('chk-link').value;
  navigator.clipboard?.writeText(link)||document.execCommand('copy');
  window.toast('✅ Link copiado!');
}

export function copiarLinkExec(token){
  const base=_getBaseUrl();
  const url=`${base}checklist.html?t=${token}`;
  if(navigator.clipboard) navigator.clipboard.writeText(url);
  window.toast('✅ Link copiado!');
}

export function mostrarQR(token){
  const base=_getBaseUrl();
  const url=`${base}checklist.html?t=${token}`;
  document.getElementById('chk-link').value=url;
  document.getElementById('chk-qr').innerHTML='';
  new QRCode(document.getElementById('chk-qr'),{text:url,width:180,height:180,colorDark:'#1e3a8a',colorLight:'#ffffff'});
  document.getElementById('chk-result').style.display='block';
  window.oMo('mo-chk');
}

export async function verDetalhesChk(execId){
  lov(true,'Carregando...');
  try{
    const [exec,respostas,fotos]=await Promise.all([
      sbReq('GET','checklist_execucoes',null,`id=eq.${execId}&select=*,veiculos(placa,modelo)`),
      sbReq('GET','checklist_respostas',null,`execucao_id=eq.${execId}&select=*,checklist_itens(descricao,categoria)`),
      sbReq('GET','checklist_fotos',null,`execucao_id=eq.${execId}&select=*`)
    ]);
    const ex=exec[0];
    const v=ex.veiculos||{};
    const dur=ex.inicio_em&&ex.fim_em?Math.round((new Date(ex.fim_em)-new Date(ex.inicio_em))/60000)+' min':'—';
    const fotosGerais=fotos.filter(f=>['frente','traseira','lateral_esq','lateral_dir','extra'].includes(f.tipo));
    const fotosItem=fotos.filter(f=>f.tipo==='item');
    const cats={};
    respostas.forEach(r=>{
      const cat=r.checklist_itens?.categoria||'Outros';
      if(!cats[cat]) cats[cat]=[];
      cats[cat].push(r);
    });
    let html=`
      <div style="background:linear-gradient(135deg,#1e3a8a,#1d6fdf);color:#fff;border-radius:12px;padding:16px;margin-bottom:16px">
        <div style="display:flex;justify-content:space-between;align-items:flex-start">
          <div><div style="font-size:22px;font-weight:800;font-family:monospace">${v.placa||'—'}</div>
          <div style="font-size:13px;opacity:.85">${v.modelo||''}</div></div>
          <div style="text-align:right">
            <div style="font-size:32px;font-weight:800">${ex.score||0}%</div>
            <div style="font-size:11px;background:rgba(255,255,255,.2);padding:3px 10px;border-radius:20px">${ex.classificacao||'—'}</div>
          </div>
        </div>
        <div style="display:flex;gap:16px;margin-top:12px;font-size:11px;opacity:.85">
          <span>👤 ${ex.usuario_nome||'—'}</span>
          <span>📅 ${fd(ex.criado_em?.slice(0,10))}</span>
          <span>⏱️ ${dur}</span>
          ${ex.latitude?`<span>📍 Localização registrada</span>`:''}
        </div>
      </div>
    `;
    Object.entries(cats).forEach(([cat,itens])=>{
      html+=`<div style="margin-bottom:12px"><div style="font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:1px;padding:6px 0;border-bottom:1px solid #e2e8f0;margin-bottom:6px">📁 ${cat}</div>`;
      itens.forEach(r=>{
        const cor=r.resposta==='OK'?'#16a34a':r.resposta==='NÃO'?'#dc2626':'#94a3b8';
        const bg=r.resposta==='OK'?'#f0fdf4':r.resposta==='NÃO'?'#fef2f2':'#f8fafc';
        const fotosR=fotosItem.filter(f=>f.resposta_id===r.id);
        html+=`<div style="background:${bg};border-radius:8px;padding:10px 12px;margin-bottom:6px;border-left:3px solid ${cor}">
          <div style="display:flex;justify-content:space-between;align-items:flex-start">
            <div style="font-size:13px;font-weight:500;flex:1">${r.checklist_itens?.descricao||'—'}</div>
            <span style="font-size:12px;font-weight:700;color:${cor};margin-left:10px;white-space:nowrap">${r.resposta==='OK'?'✅ OK':r.resposta==='NÃO'?'❌ NÃO':'➖ N/A'}</span>
          </div>
          ${fotosR.length?`<div style="display:flex;gap:6px;margin-top:8px;flex-wrap:wrap">${fotosR.map(f=>{const src=f.url||f.dados_base64||'';return`<img src="${src}" style="width:60px;height:60px;border-radius:6px;object-fit:cover;border:2px solid #fca5a5" onclick="verFotoGrande('${src}')" loading="lazy">`;}).join('')}</div>`:''}
        </div>`;
      });
      html+=`</div>`;
    });
    if(fotosGerais.length){
      html+=`<div style="margin-top:16px"><div style="font-size:13px;font-weight:700;margin-bottom:10px">📷 Fotos do Veículo</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
          ${fotosGerais.map(f=>{
            const labels={frente:'🚘 Frente',traseira:'🚗 Traseira',lateral_esq:'◀️ Lateral Esq',lateral_dir:'▶️ Lateral Dir',extra:'📷 Extra'};
            const src=f.url||f.dados_base64||'';
            return`<div style="border-radius:8px;overflow:hidden;border:1px solid #e2e8f0">
              <img src="${src}" style="width:100%;height:120px;object-fit:cover;display:block" onclick="verFotoGrande('${src}')" loading="lazy">
              <div style="font-size:10px;padding:4px 8px;background:#f8fafc;font-weight:600;color:#64748b">${labels[f.tipo]||f.tipo}</div>
            </div>`;
          }).join('')}
        </div>
      </div>`;
    }
    document.getElementById('chk-det-title').textContent=`📋 Check-list — ${v.placa} — ${ex.score||0}%`;
    document.getElementById('chk-det-body').innerHTML=html;
    window._pdfExecId=execId; // usado pelo botão Exportar PDF
    window.oMo('mo-chk-det');
  }catch(e){window.toast('Erro: '+e.message,'e');}finally{lov(false);}
}

export function verFotoGrande(src){
  const ov=document.createElement('div');
  ov.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.85);z-index:99999;display:flex;align-items:center;justify-content:center;cursor:pointer';
  ov.innerHTML=`<img src="${src}" style="max-width:90vw;max-height:90vh;border-radius:8px;box-shadow:0 8px 32px rgba(0,0,0,.5)">`;
  ov.onclick=()=>ov.remove();
  document.body.appendChild(ov);
}

export function acKeyChk(){
  const q=document.getElementById('chk-placa-busca').value.toUpperCase().trim();
  const sug=document.getElementById('chk-sugestoes');
  if(!q){sug.style.display='none';return;}
  const res=C.v.filter(v=>v.placa?.includes(q)||v.modelo?.toUpperCase().includes(q)).slice(0,8);
  if(!res.length){sug.style.display='none';return;}
  sug.innerHTML=res.map(v=>`<div onclick="acSelChk(${v.id})" style="padding:10px 14px;cursor:pointer;border-bottom:1px solid #f1f5f9;font-size:13px" onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background=''">${v.placa} <span style="color:#64748b">— ${v.modelo}</span></div>`).join('');
  sug.style.display='block';
}

export function acSelChk(vid){
  const v=C.v.find(x=>x.id==vid);if(!v)return;
  document.getElementById('chk-placa-busca').value=v.placa;
  document.getElementById('chk-v').value=v.id;
  document.getElementById('chk-sugestoes').style.display='none';
  document.getElementById('chk-vi-placa').textContent=v.placa;
  document.getElementById('chk-vi-modelo').textContent=`${v.modelo} — KM: ${(v.km_atual||0).toLocaleString('pt-BR')}`;
  document.getElementById('chk-v-info').style.display='block';
  // Detectar tipo do veículo (MOTO vs CARRO)
  const tipoRaw=(v.tipo||'').toLowerCase();
  const isMoto=tipoRaw.includes('moto')||tipoRaw.includes('motocicleta')||tipoRaw.includes('scooter');
  window._chkTipoVeiculo=isMoto?'moto':'carro';
  window._chkAnoFabricacao=v.ano||'';
  const badge=document.getElementById('chk-tipo-veiculo-badge');
  if(badge){
    badge.textContent=isMoto?'🏍️ Moto detectada':'🚗 Carro detectado';
    badge.style.background=isMoto?'#fef3c7':'#dbeafe';
    badge.style.color=isMoto?'#92400e':'#1e40af';
    badge.style.display='inline-block';
  }
}

export function acBlurChk(){ setTimeout(()=>{document.getElementById('chk-sugestoes').style.display='none';},200); }

// ── Exportar check-list em PDF (janela de impressão) ──────────────────────
export async function exportarPDFChk(execId){
  if(!execId){window.toast('Nenhum check-list selecionado','e');return;}
  lov(true,'Gerando PDF...');
  try{
    const [exec,respostas,fotos]=await Promise.all([
      sbReq('GET','checklist_execucoes',null,`id=eq.${execId}&select=*,veiculos(placa,modelo,contratos(nome_contrato))`),
      sbReq('GET','checklist_respostas',null,`execucao_id=eq.${execId}&select=*,checklist_itens(descricao,categoria,ordem)&order=checklist_itens(ordem).asc`),
      sbReq('GET','checklist_fotos',null,`execucao_id=eq.${execId}&select=*`)
    ]);
    const ex=exec[0]; const v=ex.veiculos||{};
    const dur=ex.inicio_em&&ex.fim_em?Math.round((new Date(ex.fim_em)-new Date(ex.inicio_em))/60000)+' min':'—';
    const score=ex.score||0;
    const corScore=score>=90?'#16a34a':score>=70?'#b45309':'#dc2626';
    const bgScore=score>=90?'#dcfce7':score>=70?'#fef3c7':'#fee2e2';
    const txtCls=score>=90?'✅ APROVADO':score>=70?'⚠️ COM RESSALVAS':'🚫 REPROVADO';
    const fotosGerais=fotos.filter(f=>['frente','traseira','lateral_esq','lateral_dir'].includes(f.tipo));
    const fotosExtras=fotos.filter(f=>f.tipo==='extra');
    const fotosItem=fotos.filter(f=>f.tipo==='item');
    const cats={};
    respostas.forEach(r=>{
      const cat=r.checklist_itens?.categoria||'Outros';
      if(!cats[cat])cats[cat]=[];
      cats[cat].push(r);
    });
    const oks=respostas.filter(r=>r.resposta==='OK').length;
    const naos=respostas.filter(r=>r.resposta==='NÃO').length;
    const nas=respostas.filter(r=>r.resposta==='N/A').length;

    // ── Gera linhas da tabela de itens ──
    let itensHTML='';
    Object.entries(cats).forEach(([cat,itens])=>{
      itensHTML+=`<tr><td colspan="3" class="cat-row">📁 ${cat}</td></tr>`;
      itens.forEach((r,i)=>{
        const fotosR=fotosItem.filter(f=>f.resposta_id===r.id);
        const resIcon=r.resposta==='OK'?'✅ OK':r.resposta==='NÃO'?'❌ NÃO':'➖ N/A';
        const trCls=r.resposta==='NÃO'?'row-nao':r.resposta==='N/A'?'row-na':'';
        itensHTML+=`<tr class="${trCls}">
          <td class="num">${String(respostas.indexOf(r)+1).padStart(2,'0')}</td>
          <td class="desc">${r.checklist_itens?.descricao||'—'}
            ${fotosR.length?`<div class="fotos-item">${fotosR.map(f=>{const src=f.url||f.dados_base64||'';return src?`<img src="${src}" class="thumb-item">`:''}).join('')}</div>`:''}</td>
          <td class="resp resp-${r.resposta==='OK'?'ok':r.resposta==='NÃO'?'nao':'na'}">${resIcon}</td>
        </tr>`;
      });
    });

    // ── Fotos gerais (grid 2x2) ──
    const labelsF={frente:'Frente',traseira:'Traseira',lateral_esq:'Lateral Esq.',lateral_dir:'Lateral Dir.'};
    const fotosGeraisHTML=fotosGerais.length?`
      <div class="section-title">📷 Fotos do Veículo</div>
      <div class="fotos-grid">
        ${fotosGerais.map(f=>{
          const src=f.url||f.dados_base64||'';
          return src?`<div class="foto-card"><img src="${src}" class="foto-geral"><div class="foto-label">${labelsF[f.tipo]||f.tipo}</div></div>`:'';
        }).join('')}
      </div>`:'';

    // ── Fotos extras ──
    const fotosExtrasHTML=fotosExtras.length?`
      <div class="section-title" style="margin-top:12px">📷 Fotos Extras</div>
      <div class="fotos-grid">
        ${fotosExtras.map(f=>{const src=f.url||f.dados_base64||'';return src?`<div class="foto-card"><img src="${src}" class="foto-geral"><div class="foto-label">Extra</div></div>`:''}).join('')}
      </div>`:'';

    // ── Detecta tipo de veículo ──
    const isMotoPDF=(ex.tipo_veiculo||'carro')==='moto';
    const pdfIcon=isMotoPDF?'🏍️':'🚛';
    const pdfTipoLabel=isMotoPDF?'CHECK-LIST DE MOTO':'CHECK-LIST DE VEÍCULO';
    const headerBg=isMotoPDF?'#78350f':'#1e3a8a';
    const catRowColor=isMotoPDF?'#78350f':'#1e3a8a';
    const catRowBg=isMotoPDF?'#fff7ed':'#eff6ff';

    // ── HTML completo do PDF ──
    const html=`<!DOCTYPE html><html lang="pt-BR"><head>
<meta charset="UTF-8">
<title>${pdfTipoLabel} — ${v.placa||''} — ${fd(ex.criado_em?.slice(0,10))}</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:'Segoe UI',Arial,sans-serif;font-size:11px;color:#0f172a;background:#fff;padding:20px}
  @page{size:A4;margin:15mm 12mm}
  @media print{body{padding:0}.no-print{display:none!important}}
  /* Cabeçalho */
  .header{display:flex;justify-content:space-between;align-items:flex-start;padding:14px 16px;background:${headerBg};color:#fff;border-radius:8px;margin-bottom:12px}
  .header-left .brand{font-size:16px;font-weight:800;letter-spacing:.5px}
  .header-left .sub{font-size:10px;opacity:.75;margin-top:2px}
  .header-right{text-align:right}
  .placa{font-size:26px;font-weight:900;font-family:monospace;letter-spacing:3px}
  .modelo{font-size:11px;opacity:.8;margin-top:2px}
  /* Info grid */
  .info-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-bottom:10px}
  .info-cell{background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:7px 10px}
  .info-cell .label{font-size:9px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.5px;margin-bottom:2px}
  .info-cell .value{font-size:12px;font-weight:600;color:#0f172a}
  /* Bloco de vistoria */
  .vistoria-box{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:10px;padding:10px 12px;background:#f0f9ff;border:1px solid #bae6fd;border-radius:8px}
  .vistoria-box .label{font-size:9px;font-weight:700;color:#0369a1;text-transform:uppercase;letter-spacing:.5px;margin-bottom:2px}
  .vistoria-box .value{font-size:12px;font-weight:600;color:#0f172a}
  /* Score */
  .score-box{display:flex;align-items:center;gap:16px;background:${bgScore};border:2px solid ${corScore};border-radius:8px;padding:12px 16px;margin-bottom:10px}
  .score-num{font-size:42px;font-weight:900;color:${corScore};line-height:1;font-family:monospace}
  .score-right{flex:1}
  .score-cls{font-size:14px;font-weight:800;color:${corScore};margin-bottom:6px}
  .score-bar-bg{height:8px;background:rgba(0,0,0,.1);border-radius:4px;margin-bottom:8px}
  .score-bar-fill{height:8px;background:${corScore};border-radius:4px;width:${score}%}
  .score-stats{display:flex;gap:16px;font-size:11px}
  .score-stats span{font-weight:700}
  /* Tabela de itens */
  .section-title{font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:1px;margin:12px 0 6px;border-bottom:1px solid #e2e8f0;padding-bottom:4px}
  table{width:100%;border-collapse:collapse;font-size:11px;margin-bottom:12px}
  table th{background:#f1f5f9;padding:6px 8px;text-align:left;font-size:9px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.5px;border-bottom:2px solid #e2e8f0}
  table td{padding:6px 8px;border-bottom:1px solid #f1f5f9;vertical-align:middle}
  .cat-row{background:${catRowBg};font-weight:700;font-size:10px;color:${catRowColor};padding:5px 8px!important}
  .num{width:28px;color:#94a3b8;font-size:10px;text-align:center}
  .desc{flex:1}
  .resp{width:80px;text-align:center;font-weight:700;font-size:11px;white-space:nowrap}
  .resp-ok{color:#16a34a}
  .resp-nao{color:#dc2626}
  .resp-na{color:#94a3b8}
  .row-nao td{background:#fff5f5}
  .row-na td{background:#fafafa;color:#94a3b8}
  .fotos-item{display:flex;gap:4px;margin-top:4px;flex-wrap:wrap}
  .thumb-item{width:48px;height:48px;object-fit:cover;border-radius:4px;border:1px solid #fca5a5}
  /* Fotos gerais */
  .fotos-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px}
  .foto-card{border:1px solid #e2e8f0;border-radius:6px;overflow:hidden}
  .foto-geral{width:100%;height:130px;object-fit:cover;display:block}
  .foto-label{font-size:9px;font-weight:700;color:#64748b;padding:4px 8px;background:#f8fafc;text-align:center}
  /* Assinaturas */
  .sig-area{display:grid;grid-template-columns:1fr 1fr;gap:48px;margin-top:28px;padding-top:0}
  .sig-box{text-align:center}
  .sig-line{border-bottom:1.5px solid #334155;margin-bottom:5px;height:40px}
  .sig-name{font-size:10px;color:#334155;font-weight:700}
  .sig-role{font-size:9px;color:#94a3b8;margin-top:2px}
  /* Rodapé */
  .footer{margin-top:16px;padding-top:10px;border-top:1px solid #e2e8f0;display:flex;justify-content:space-between;font-size:9px;color:#94a3b8}
  .print-btn{position:fixed;top:16px;right:16px;padding:10px 20px;background:#1d6fdf;color:#fff;border:none;border-radius:8px;font-size:14px;font-weight:700;cursor:pointer}
  .print-btn:hover{background:#1e3a8a}
</style>
</head><body>
<button class="print-btn no-print" onclick="window.print()">🖨️ Imprimir / Salvar PDF</button>

<div class="header">
  <div class="header-left">
    <div class="brand">${pdfIcon} FROTAS SULBAIANA</div>
    <div class="sub">Sulbaiana Empreendimentos — ${pdfTipoLabel}</div>
  </div>
  <div class="header-right">
    <div class="placa">${v.placa||'—'}</div>
    <div class="modelo">${v.modelo||'—'} · ${v.contratos?.nome_contrato||''}</div>
  </div>
</div>

<div class="info-grid">
  <div class="info-cell"><div class="label">Data</div><div class="value">${fd(ex.criado_em?.slice(0,10))}</div></div>
  <div class="info-cell"><div class="label">Usuário</div><div class="value">${ex.usuario_nome||'—'}</div></div>
  <div class="info-cell"><div class="label">KM Registrado</div><div class="value">${(ex.km_veiculo||0).toLocaleString('pt-BR')} km</div></div>
  <div class="info-cell"><div class="label">Tipo de Vistoria</div><div class="value">${ex.tipo==='movimentacao'?'🔄 Movimentação':'📊 Auditoria'}</div></div>
  <div class="info-cell"><div class="label">Duração</div><div class="value">${dur}</div></div>
  <div class="info-cell"><div class="label">Ano de Fabricação</div><div class="value">${ex.ano_fabricacao||'—'}</div></div>
</div>

${(ex.vistoriador||ex.local_vistoria)?`
<div class="vistoria-box">
  <div><div class="label">👤 Vistoriador</div><div class="value">${ex.vistoriador||'—'}</div></div>
  <div><div class="label">📍 Local da Vistoria</div><div class="value">${ex.local_vistoria||'—'}</div></div>
</div>`:''}


<div class="score-box">
  <div class="score-num">${score}%</div>
  <div class="score-right">
    <div class="score-cls">${txtCls}</div>
    <div class="score-bar-bg"><div class="score-bar-fill"></div></div>
    <div class="score-stats">
      <span style="color:#16a34a">✅ ${oks} OK</span>
      <span style="color:#dc2626">❌ ${naos} NÃO</span>
      <span style="color:#94a3b8">➖ ${nas} N/A</span>
      <span style="color:#0f172a">📋 ${respostas.length} itens</span>
    </div>
  </div>
</div>

<div class="section-title">Itens Verificados</div>
<table>
  <thead><tr><th>#</th><th>Item</th><th>Resposta</th></tr></thead>
  <tbody>${itensHTML}</tbody>
</table>

${fotosGeraisHTML}
${fotosExtrasHTML}

<div class="sig-area">
  <div class="sig-box">
    <div class="sig-line"></div>
    <div class="sig-name">${ex.vistoriador||'Vistoriador'}</div>
    <div class="sig-role">Responsável pela Vistoria</div>
  </div>
  <div class="sig-box">
    <div class="sig-line"></div>
    <div class="sig-name">Motorista / Responsável</div>
    <div class="sig-role">Confirmação de Recebimento</div>
  </div>
</div>

<div class="footer">
  <span>${pdfTipoLabel} gerado em ${new Date(ex.criado_em).toLocaleString('pt-BR')} · Sistema FROTAS — Sulbaiana Empreendimentos</span>
  <span>Token: ${ex.token?.slice(0,12)||'—'}...</span>
</div>

<script>window.onload=()=>setTimeout(()=>window.print(),400);<\/script>
</body></html>`;

    lov(false);
    const w=window.open('','_blank','width=900,height=700');
    if(!w){window.toast('Popup bloqueado — permita popups para este site','w');return;}
    w.document.write(html);
    w.document.close();
  }catch(e){
    lov(false);
    window.toast('Erro ao gerar PDF: '+e.message,'e');
  }
}

// Make globally accessible
window.renderChecklist_desk = renderChecklist_desk;
window.excluirChk = excluirChk;
window.gerarToken = gerarToken;
window.abrirGerarChk = abrirGerarChk;
window.gerarChecklistToken = gerarChecklistToken;
window.copiarLink = copiarLink;
window.copiarLinkExec = copiarLinkExec;
window.mostrarQR = mostrarQR;
window.verDetalhesChk = verDetalhesChk;
window.verFotoGrande = verFotoGrande;
window.acKeyChk = acKeyChk;
window.acSelChk = acSelChk;
window.acBlurChk = acBlurChk;
window.exportarPDFChk = exportarPDFChk;

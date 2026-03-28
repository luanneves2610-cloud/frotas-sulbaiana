import { C, SESSION } from './state.js';
import { now, normStr, slog, toast, lov } from './utils.js';
import { FB } from './api.js';
import { SB_URL, SB_KEY } from './config.js';

export let impVData = [];
export let impCData = [];

export function baixarModeloVeiculos(){
  const rows = [
    ['PLACA','MODELO','ANO','CONTRATO','LOCALIDADE','CENTRO DE CUSTO','TIPO','COR','RENAVAN','RESPONSÁVEL','STATUS','KM ATUAL'],
    ['RDH8A02','STRADA',2021,'ALAGOINHAS','ACAJUTIBA','ACAJUTIBA','PICKUP','BRANCO',13256056491,'LUAN','ATIVO',132000],
    ['SKJ1H29','CG 160 START',2024,'ALAGOINHAS','ACAJUTIBA','ACAJUTIBA','MOTO','VERMELHA','','JOÃO SILVA','ATIVO',24500],
  ];
  window.gerarExcelSimples('Modelo_Importacao_Veiculos', rows);
  toast('✅ Modelo baixado! Preencha e faça upload.','i');
}

export function onDropV(e){
  e.preventDefault();e.stopPropagation();
  document.getElementById('iz-v').classList.remove('drag');
  const f=e.dataTransfer.files[0];
  if(f) lerArquivoVeiculos({files:[f]});
}

// FINAL version — uses SheetJS (XLSX CDN global)
export function lerArquivoVeiculos(input){
  const file=input.files[0];if(!file)return;
  const reader=new FileReader();
  reader.onload=function(e){
    try{
      if(file.name.endsWith('.csv')){
        const rows=e.target.result.split('\n').map(r=>r.split(/[,;]/).map(c=>c.trim().replace(/^"|"$/g,'')));
        processarPlanilhaVeiculos(rows);
      } else {
        const wb=XLSX.read(e.target.result,{type:'array'});
        const ws=wb.Sheets[wb.SheetNames[0]];
        const rows=XLSX.utils.sheet_to_array(ws).map(r=>r.map(c=>String(c||'').trim()));
        processarPlanilhaVeiculos(rows);
      }
    }catch(err){toast('Erro ao ler: '+err.message,'e');}
  };
  if(file.name.endsWith('.csv')) reader.readAsText(file,'utf-8');
  else reader.readAsArrayBuffer(file);
}

export function processarPlanilhaVeiculos(rows){
  if(rows.length < 2){toast('Planilha vazia!','e');return;}
  const headers = rows[0].map(h=>normStr(String(h||'').trim()));
  const findCol = (...opts) => { for(const o of opts){ const i=headers.indexOf(normStr(o)); if(i>=0) return i; } return -1; };
  const iPlaca    = findCol('PLACA');
  const iModelo   = findCol('MODELO');
  const iAno      = findCol('ANO');
  const iContrato = findCol('CONTRATO');
  const iLoc      = findCol('LOCALIDADE');
  const iCC       = findCol('CENTRO DE CUSTO','CENTRO CC','CENTRO_CC','CENTRO');
  const iTipo     = findCol('TIPO');
  const iCor      = findCol('COR');
  const iRenavan  = findCol('RENAVAN');
  const iResp     = findCol('RESPONSÁVEL','RESPONSAVEL');
  const iStatus   = findCol('STATUS');
  const iKm       = findCol('KM ATUAL','KM_ATUAL','KM');
  const iFrota    = findCol('TIPO FROTA','TIPO_FROTA','FROTA');
  const iLocNome  = findCol('LOCADOR NOME','LOCADOR_NOME','NOME LOCADOR');
  const iLocEmail = findCol('LOCADOR EMAIL','LOCADOR_EMAIL','EMAIL LOCADOR');
  const iLocFone  = findCol('LOCADOR FONE','LOCADOR_FONE','FONE LOCADOR','TELEFONE LOCADOR');
  const get = (row, idx) => idx >= 0 ? String(row[idx]||'').trim() : '';
  impVData = [];
  for(let i=1;i<rows.length;i++){
    const row=rows[i];if(row.every(c=>!String(c||'').trim()))continue;
    const placa        = get(row,iPlaca).toUpperCase().replace(/\s/g,'');
    const modelo       = get(row,iModelo);
    const nomeContrato = get(row,iContrato).toUpperCase().trim();
    const nomeLoc      = get(row,iLoc).toUpperCase().trim();
    const nomeCC       = get(row,iCC).toUpperCase().trim();
    const errsLinha    = [];
    if(!placa)  errsLinha.push('Placa vazia');
    if(!modelo) errsLinha.push('Modelo vazio');
    const ct  = C.ct.find(x=>normStr(x.nome_contrato)===normStr(nomeContrato));
    if(!nomeContrato) errsLinha.push('Contrato vazio');
    else if(!ct) errsLinha.push(`Contrato "${nomeContrato}" não cadastrado`);
    const loc = C.loc.find(x=>normStr(x.nome_localidade)===normStr(nomeLoc));
    if(!nomeLoc) errsLinha.push('Localidade vazia');
    else if(!loc) errsLinha.push(`Localidade "${nomeLoc}" não cadastrada`);
    const cc  = C.cc.find(x=>normStr(x.nome)===normStr(nomeCC));
    if(!nomeCC) errsLinha.push('Centro CC vazio');
    else if(!cc) errsLinha.push(`Centro "${nomeCC}" não cadastrado`);
    const jaExiste = C.v.find(x=>x.placa===placa);
    if(jaExiste) errsLinha.push(`Placa ${placa} já cadastrada`);
    const kmRaw = get(row,iKm).replace(/\./g,'').replace(',','.');
    const kmVal = parseInt(kmRaw)||0;
    impVData.push({
      linha:i+1, placa, modelo,
      ano:      parseInt(get(row,iAno))||null,
      tipo:     get(row,iTipo)||'MOTO',
      cor:      get(row,iCor),
      renavan:  get(row,iRenavan),
      contrato_id:     ct ? parseInt(ct.id) : null,  contrato_nome: nomeContrato,
      localidade_id:   loc ? parseInt(loc.id) : null, localidade_nome: nomeLoc,
      centro_custo_id: cc ? parseInt(cc.id) : null,   cc_nome: nomeCC,
      responsavel: get(row,iResp),
      km_atual:    kmVal,
      status:      (()=>{ const s=(get(row,iStatus)||'').toLowerCase().trim(); const map={'ativa':'ativo','ativo':'ativo','manutenção':'manutenção','manutencao':'manutenção','manutenco':'manutenção','inativo':'inativo','inativa':'inativo','devolvido':'devolvido','devolvida':'devolvido','vendido':'vendido','vendida':'vendido'}; return map[s]||'ativo'; })(),
      cliente:     'EMBASA',
      tipo_frota:  (()=>{ const f=(get(row,iFrota)||'').toLowerCase().trim(); return f==='locada'?'locada':'propria'; })(),
      locador_nome:  get(row,iLocNome)||null,
      locador_email: get(row,iLocEmail)||null,
      locador_fone:  get(row,iLocFone)||null,
      erros: errsLinha, ok: errsLinha.length===0
    });
  }
  const ok=impVData.filter(x=>x.ok).length, er=impVData.filter(x=>!x.ok).length;
  document.getElementById('imp-v-info').textContent=`${impVData.length} linhas lidas — ✅ ${ok} OK · ❌ ${er} com erro`;
  document.getElementById('imp-v-prev').style.display='block';
  document.getElementById('imp-v-sum').style.display='flex';
  document.getElementById('imp-v-sum').innerHTML=`<div class="imp-chip ok">✅ ${ok} prontos</div><div class="imp-chip er">❌ ${er} com erro</div>`;
  document.getElementById('imp-v-btn').textContent=`🚀 Importar ${ok} Veículos`;
  document.getElementById('imp-v-table').innerHTML=`<table><thead><tr><th>#</th><th>Placa</th><th>Modelo</th><th>Contrato</th><th>Localidade</th><th>Centro CC</th><th>KM</th><th>Status</th></tr></thead><tbody>${impVData.map(r=>`<tr class="${r.ok?'row-ok':'row-err'}"><td>${r.linha}</td><td><strong>${r.placa}</strong></td><td>${r.modelo}</td><td>${r.contrato_nome}</td><td>${r.localidade_nome}</td><td>${r.cc_nome}</td><td>${r.km_atual.toLocaleString('pt-BR')}</td><td>${r.ok?`<span class="badge b-gr">✅ OK</span>`:`<span class="err-cell">❌ ${r.erros.join(', ')}</span>`}</td></tr>`).join('')}</tbody></table>`;
}

export async function importarVeiculos(){
  const validos=impVData.filter(x=>x.ok);
  if(!validos.length){toast('Nenhum registro válido para importar!','e');return;}
  const btn=document.getElementById('imp-v-btn');btn.disabled=true;
  const pg=document.getElementById('imp-v-pg'),pgb=document.getElementById('imp-v-pgb');
  const sumEl=document.getElementById('imp-v-sum');
  pg.style.display='block';
  let ok=0,er=0,erros=[];

  // Teste rápido com o primeiro registro antes de importar todos
  const teste = validos[0];
  const payloadTeste = {
    placa:teste.placa, modelo:teste.modelo,
    ano:teste.ano ? parseInt(teste.ano) : null,
    tipo:teste.tipo||'MOTO',
    cor:teste.cor||null, renavan:teste.renavan||null,
    contrato_id:parseInt(teste.contrato_id),
    localidade_id:parseInt(teste.localidade_id),
    centro_custo_id:parseInt(teste.centro_custo_id),
    responsavel:teste.responsavel||null,
    km_atual:parseInt(teste.km_atual)||0,
    status:(()=>{ const s=(teste.status||'').toLowerCase().trim(); const map={'ativa':'ativo','ativo':'ativo','manutenção':'manutenção','manutencao':'manutenção','inativo':'inativo','inativa':'inativo','devolvido':'devolvido','vendido':'vendido'}; return map[s]||'ativo'; })(),
    cliente:teste.cliente||'EMBASA',
    classificacao:teste.classificacao||'producao',
    data_cadastro:now()
  };
  console.log('🔍 Payload de teste:', JSON.stringify(payloadTeste));

  try{
    const url = SB_URL+'/rest/v1/veiculos';
    const resp = await fetch(url, {
      method:'POST',
      headers:{
        'apikey':SB_KEY,
        'Authorization':'Bearer '+SB_KEY,
        'Content-Type':'application/json',
        'Prefer':'return=representation'
      },
      body: JSON.stringify(payloadTeste)
    });
    const txt = await resp.text();
    console.log('🔍 Resposta Supabase status:', resp.status, 'body:', txt);
    if(!resp.ok){
      const msg = txt||resp.statusText;
      sumEl.style.display='flex';
      sumEl.innerHTML=`<div class="imp-chip er" style="max-width:100%;word-break:break-all">❌ Erro Supabase (HTTP ${resp.status}): ${msg}</div>`;
      btn.disabled=false;
      toast(`❌ Erro: ${msg.substring(0,120)}`,'e');
      return;
    }
    ok++;
    pgb.style.width=`${Math.round(1/validos.length*100)}%`;
  }catch(e){
    sumEl.style.display='flex';
    sumEl.innerHTML=`<div class="imp-chip er">❌ Erro de rede: ${e.message}</div>`;
    btn.disabled=false;
    toast(`❌ Erro de rede: ${e.message}`,'e');
    return;
  }

  // Importar os restantes
  for(let i=1;i<validos.length;i++){
    const r=validos[i];
    try{
      const payload={
        placa:r.placa, modelo:r.modelo,
        ano:r.ano ? parseInt(r.ano) : null,
        tipo:r.tipo||'MOTO',
        cor:r.cor||null, renavan:r.renavan||null,
        contrato_id:parseInt(r.contrato_id),
        localidade_id:parseInt(r.localidade_id),
        centro_custo_id:parseInt(r.centro_custo_id),
        responsavel:r.responsavel||null,
        km_atual:parseInt(r.km_atual)||0,
        status:(()=>{ const s=(r.status||'').toLowerCase().trim(); const map={'ativa':'ativo','ativo':'ativo','manutenção':'manutenção','manutencao':'manutenção','inativo':'inativo','inativa':'inativo','devolvido':'devolvido','vendido':'vendido'}; return map[s]||'ativo'; })(),
        cliente:r.cliente||'EMBASA',
        classificacao:r.classificacao||'producao',
        tipo_frota:r.tipo_frota||'propria',
        locador_nome:r.locador_nome||null,
        locador_email:r.locador_email||null,
        locador_fone:r.locador_fone||null,
        data_cadastro:now()
      };
      const resp2=await fetch(SB_URL+'/rest/v1/veiculos',{
        method:'POST',
        headers:{'apikey':SB_KEY,'Authorization':'Bearer '+SB_KEY,'Content-Type':'application/json','Prefer':'return=representation'},
        body:JSON.stringify(payload)
      });
      if(!resp2.ok){const t=await resp2.text();throw new Error(t);}
      ok++;
    }catch(e){
      er++;
      const msg=e.message.substring(0,200);
      console.error(`❌ Linha ${i+1} (${r.placa}):`,msg);
      erros.push(`${r.placa}: ${msg}`);
    }
    pgb.style.width=`${Math.round((i+1)/validos.length*100)}%`;
    await new Promise(res=>setTimeout(res,40));
  }

  sumEl.style.display='flex';
  sumEl.innerHTML=`<div class="imp-chip ok">✅ ${ok} importados</div>${er?`<div class="imp-chip er">❌ ${er} falharam</div>`:''}`;
  if(er>0) sumEl.innerHTML+=`<div style="font-size:11px;color:#dc2626;margin-top:4px;width:100%">Primeiro erro: ${erros[0]}</div>`;
  btn.disabled=false;
  slog(`Importação veículos: ${ok} cadastrados, ${er} falharam`);
  await window.loadAll();
  if(ok>0 && er===0) toast(`✅ ${ok} veículos importados com sucesso!`);
  else if(ok>0) toast(`⚠️ ${ok} importados, ${er} falharam`,'w');
  else toast(`❌ Todos falharam. Erro: ${erros[0]||'verifique o console'}`,'e');
}

export function limparImpV(){
  impVData=[];document.getElementById('imp-v-prev').style.display='none';
  document.getElementById('imp-v-file').value='';document.getElementById('imp-v-pg').style.display='none';
  document.getElementById('imp-v-pgb').style.width='0%';
}

export function baixarModeloCombustivel(){
  const rows = [
    ['PLACA','DATA','KM_ATUAL','LITROS','VALOR_TOTAL','TIPO_COMBUSTIVEL','POSTO'],
    ['SKJ1H29','25/01/2026',24500,35.5,245.80,'Gasolina','Auto Posto Central'],
    ['ABC1D23','26/01/2026',18200,28.0,193.60,'Gasolina','Posto BR'],
  ];
  window.gerarExcelSimples('Modelo_Importacao_Combustivel', rows);
  toast('✅ Modelo baixado!','i');
}

// FINAL version — uses SheetJS (XLSX CDN global)
export function lerArquivoCombustivel(input){
  const file=input.files[0];if(!file)return;
  const reader=new FileReader();
  reader.onload=function(e){
    try{
      if(file.name.endsWith('.csv')){
        const rows=e.target.result.split('\n').map(r=>r.split(/[,;]/).map(c=>c.trim().replace(/^"|"$/g,'')));
        processarPlanilhaCombustivel(rows);
      } else {
        const wb=XLSX.read(e.target.result,{type:'array'});
        const ws=wb.Sheets[wb.SheetNames[0]];
        const rows=XLSX.utils.sheet_to_array(ws).map(r=>r.map(c=>String(c||'').trim()));
        processarPlanilhaCombustivel(rows);
      }
    }catch(err){toast('Erro ao ler: '+err.message,'e');}
  };
  if(file.name.endsWith('.csv')) reader.readAsText(file,'utf-8');
  else reader.readAsArrayBuffer(file);
}

export function parseBRDate(s){
  if(!s)return null;
  s=String(s).trim();
  if(s.includes('/')){const[d,m,y]=s.split('/');return`${y}-${m.padStart(2,'0')}-${d.padStart(2,'0')}`;}
  return s.slice(0,10);
}

export function parseBRNum(s){return parseFloat(String(s||'').replace(',','.'));}

export function processarPlanilhaCombustivel(rows){
  if(rows.length<2){toast('Planilha vazia!','e');return;}
  const headers=rows[0].map(h=>normStr(h));
  const idx=h=>headers.indexOf(h);
  const get=(row,h)=>String(row[idx(h)]||'').trim();
  impCData=[];
  for(let i=1;i<rows.length;i++){
    const row=rows[i];if(row.every(c=>!c))continue;
    const placa=get(row,'PLACA').toUpperCase();
    const data=parseBRDate(get(row,'DATA'));
    const km=parseInt(get(row,'KM_ATUAL'))||0;
    const litros=parseBRNum(get(row,'LITROS'));
    const valor=parseBRNum(get(row,'VALOR_TOTAL'));
    const errs=[];
    const veiculo=C.v.find(x=>x.placa===placa);
    if(!placa) errs.push('Placa vazia');
    else if(!veiculo) errs.push(`Placa "${placa}" não cadastrada`);
    if(!data) errs.push('Data inválida');
    if(!km) errs.push('KM inválido');
    if(!litros||isNaN(litros)) errs.push('Litros inválido');
    if(!valor||isNaN(valor)) errs.push('Valor inválido');
    impCData.push({
      linha:i+1,placa,data,km,litros,valor,
      tipo_combustivel:get(row,'TIPO_COMBUSTIVEL')||'Gasolina',
      posto:get(row,'POSTO'),
      veiculo_id:veiculo?.id||null,
      erros:errs,ok:errs.length===0
    });
  }
  const ok=impCData.filter(x=>x.ok).length,er=impCData.filter(x=>!x.ok).length;
  document.getElementById('imp-c-info').textContent=`${impCData.length} linhas — ✅ ${ok} OK · ❌ ${er} com erro`;
  document.getElementById('imp-c-prev').style.display='block';
  document.getElementById('imp-c-sum').style.display='flex';
  document.getElementById('imp-c-sum').innerHTML=`<div class="imp-chip ok">✅ ${ok} prontos</div><div class="imp-chip er">❌ ${er} com erro</div>`;
  document.getElementById('imp-c-btn').textContent=`🚀 Importar ${ok} Abastecimentos`;
  document.getElementById('imp-c-table').innerHTML=`<table><thead><tr><th>#</th><th>Placa</th><th>Data</th><th>KM</th><th>Litros</th><th>Valor</th><th>Tipo</th><th>Status</th></tr></thead><tbody>${impCData.map(r=>`<tr class="${r.ok?'row-ok':'row-err'}"><td>${r.linha}</td><td><strong>${r.placa}</strong></td><td>${window.fd(r.data)}</td><td>${r.km}</td><td>${r.litros}</td><td>R$ ${r.valor}</td><td>${r.tipo_combustivel}</td><td>${r.ok?`<span class="badge b-gr">✅ OK</span>`:`<span class="err-cell">❌ ${r.erros.join(', ')}</span>`}</td></tr>`).join('')}</tbody></table>`;
}

export async function importarCombustivel(){
  const validos=impCData.filter(x=>x.ok);
  if(!validos.length){toast('Nenhum registro válido!','e');return;}
  const btn=document.getElementById('imp-c-btn');btn.disabled=true;
  const pg=document.getElementById('imp-c-pg'),pgb=document.getElementById('imp-c-pgb');pg.style.display='block';
  let ok=0,er=0,erros=[];
  for(let i=0;i<validos.length;i++){
    const r=validos[i];
    try{
      await FB.add('abastecimentos',{veiculo_id:r.veiculo_id,data:r.data,km_atual:r.km,litros:r.litros,valor_total:r.valor,tipo_combustivel:r.tipo_combustivel,posto:r.posto,usuario_id:SESSION.id,data_lancamento:now()});
      ok++;
    }catch(e){er++;console.error('Erro importando',r.placa,e.message);erros.push(`${r.placa}: ${e.message}`);}
    pgb.style.width=`${Math.round((i+1)/validos.length*100)}%`;
    await new Promise(res=>setTimeout(res,60));
  }
  document.getElementById('imp-c-sum').innerHTML=`<div class="imp-chip ok">✅ ${ok} importados</div>${er?`<div class="imp-chip er">❌ ${er} falharam</div>`:''}`;
  btn.disabled=false;
  slog(`Importação combustível: ${ok} registros`);
  await window.loadAll();
  toast(`✅ ${ok} abastecimentos importados!`);
}

export function limparImpC(){
  impCData=[];document.getElementById('imp-c-prev').style.display='none';
  document.getElementById('imp-c-file').value='';document.getElementById('imp-c-pg').style.display='none';
  document.getElementById('imp-c-pgb').style.width='0%';
}

// Drag-and-drop event listeners — attached after DOM ready
export function initImportacaoDragDrop(){
  const izv=document.getElementById('iz-v');
  if(izv){
    izv.addEventListener('dragover',e=>{e.preventDefault();e.currentTarget.classList.add('drag');});
    izv.addEventListener('dragleave',e=>{e.currentTarget.classList.remove('drag');});
  }
}

// Make globally accessible
window.impVData = impVData;
window.impCData = impCData;
window.baixarModeloVeiculos = baixarModeloVeiculos;
window.onDropV = onDropV;
window.lerArquivoVeiculos = lerArquivoVeiculos;
window.processarPlanilhaVeiculos = processarPlanilhaVeiculos;
window.importarVeiculos = importarVeiculos;
window.limparImpV = limparImpV;
window.baixarModeloCombustivel = baixarModeloCombustivel;
window.lerArquivoCombustivel = lerArquivoCombustivel;
window.parseBRDate = parseBRDate;
window.parseBRNum = parseBRNum;
window.processarPlanilhaCombustivel = processarPlanilhaCombustivel;
window.importarCombustivel = importarCombustivel;
window.limparImpC = limparImpC;
window.initImportacaoDragDrop = initImportacaoDragDrop;

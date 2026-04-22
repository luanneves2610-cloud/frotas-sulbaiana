import { C, SESSION } from './state.js';
import { cur, fd, now, gV, gCT, gLoc, gCC, slog, toast } from './utils.js';

export const RELS=[
  {id:'analitico',  icon:'🚗', title:'Analítico de Veículos', desc:'Custo individual por veículo com todos os detalhes'},
  {id:'combustivel',icon:'⛽', title:'Combustível',            desc:'Todos os abastecimentos com KM/L e valores'},
  {id:'manutencao', icon:'🔧', title:'Manutenção',             desc:'Todas as ordens de serviço'},
  {id:'contratos',  icon:'📄', title:'Por Contrato',           desc:'Custos totais agrupados por contrato'},
  {id:'veiculos',   icon:'🚙', title:'Por Veículo',            desc:'Resumo de custo por cada veículo'},
  {id:'mensal',     icon:'📅', title:'Consolidado Mensal',     desc:'Gastos mês a mês — combustível, manutenção e total'},
  {id:'movimentacoes',icon:'🔄',title:'Movimentação de Veículos',desc:'Histórico completo de todas as movimentações'},
  {id:'frota',      icon:'🏢', title:'Relatório de Frota',     desc:'Frota própria e locada com dados do locador'},
  {id:'status',     icon:'📊', title:'Status de Veículos',     desc:'Veículos por status: vendidos, disp. para venda e mais'},
];

export function getFiltrosRel(){
  return{
    di:document.getElementById('rel-di')?.value||'',
    df:document.getElementById('rel-df')?.value||'',
    ct:document.getElementById('rel-ct')?.value||'',
    loc:document.getElementById('rel-loc')?.value||'',
    frota:document.getElementById('rel-frota')?.value||'',
    statusV:document.getElementById('rel-status-v')?.value||''
  };
}

export function filtrarDados(tipo){
  const f=getFiltrosRel();
  const dentroData=(data)=>{
    if(!data)return false;
    if(f.di&&data<f.di)return false;
    if(f.df&&data>f.df)return false;
    return true;
  };
  let veics=C.v;
  if(f.ct) veics=veics.filter(v=>String(v.contrato_id)===String(f.ct));
  if(f.loc) veics=veics.filter(v=>String(v.localidade_id)===String(f.loc));
  const vids=new Set(veics.map(v=>String(v.id)));

  let abast=C.a.filter(a=>vids.has(String(a.veiculo_id)));
  let manut=C.m.filter(m=>vids.has(String(m.veiculo_id)));
  let multas=(C.mt||[]).filter(m=>m.veiculo_id!=null&&vids.has(String(m.veiculo_id)));
  if(f.di||f.df){
    abast=abast.filter(a=>dentroData(a.data));
    manut=manut.filter(m=>dentroData(m.data));
    multas=multas.filter(m=>dentroData(m.data_infracao));
  }
  return{veics,vids,abast,manut,multas};
}

export function renderRelCards(){
  const ct=document.getElementById('rel-ct');
  const loc=document.getElementById('rel-loc');
  if(ct){const v=ct.value;ct.innerHTML='<option value="">Todos os contratos</option>';C.ct.forEach(x=>{ct.innerHTML+=`<option value="${x.id}">${x.nome_contrato}</option>`;});ct.value=v;}
  if(loc){const v=loc.value;loc.innerHTML='<option value="">Todas as localidades</option>';C.loc.forEach(x=>{loc.innerHTML+=`<option value="${x.id}">${x.nome_localidade}</option>`;});loc.value=v;}
  document.getElementById('rel-cards').innerHTML=RELS.map(r=>`
    <div class="rc">
      <div class="rcb"><span class="rci">${r.icon}</span><div class="rct">${r.title}</div><div class="rcd">${r.desc}</div></div>
      <div class="rcf" style="display:flex;gap:6px">
        <button class="btn btn-g btn-sm" style="flex:1;justify-content:center" onclick="previewRel('${r.id}')">👁 Prévia</button>
        <button class="btn btn-p btn-sm" style="flex:1;justify-content:center" onclick="exportarExcel('${r.id}')">📥 Excel</button>
      </div>
    </div>`).join('');
}

export function limparFiltrosRel(){
  ['rel-di','rel-df'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
  ['rel-ct','rel-loc'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
  fecharPreview();
}

export function fecharPreview(){
  const p=document.getElementById('rel-preview');if(p)p.style.display='none';
}

export function previewRel(tipo){
  const {veics,abast,manut}=filtrarDados(tipo);
  const dt=new Date().toLocaleDateString('pt-BR');
  let headers=[],rows=[];
  const rel=RELS.find(r=>r.id===tipo);

  if(tipo==='analitico'){
    headers=['Placa','Modelo','Classificação','Ano','Tipo','Contrato','Localidade','Responsável','Status','KM','Manut R$','Comb R$','Total R$'];
    rows=veics.map(v=>{
      const cm=manut.filter(m=>m.veiculo_id==v.id).reduce((s,m)=>s+Number(m.valor),0);
      const ca=abast.filter(a=>a.veiculo_id==v.id).reduce((s,a)=>s+Number(a.valor_total),0);
      const cls=(v.classificacao||'producao')==='producao'?'Produção':'Unidade Fixa';
      return[v.placa,v.modelo,cls,v.ano||'',v.tipo||'',gCT(v.contrato_id).nome_contrato,gLoc(v.localidade_id).nome_localidade,v.responsavel||'—',v.status,v.km_atual||0,cur(cm),cur(ca),cur(cm+ca)];
    }).sort((a,b)=>b[12]>a[12]?1:-1);
  } else if(tipo==='combustivel'){
    headers=['Placa','Modelo','Classificação','Contrato','Localidade','Data','KM','Litros','Valor','Tipo','Posto','KM/L'];
    rows=abast.map(a=>{
      const v=gV(a.veiculo_id);
      const prev=C.a.filter(x=>x.veiculo_id===a.veiculo_id&&x.km_atual<a.km_atual).sort((x,y)=>y.km_atual-x.km_atual)[0];
      const kmr=prev?a.km_atual-prev.km_atual:0;
      const kml=kmr>0&&a.litros>0?(kmr/a.litros).toFixed(2):'-';
      const cls=(v.classificacao||'producao')==='producao'?'Produção':'Unidade Fixa';
      return[v.placa,v.modelo,cls,gCT(v.contrato_id).nome_contrato,gLoc(v.localidade_id).nome_localidade,fd(a.data),a.km_atual||0,Number(a.litros).toFixed(2),cur(a.valor_total),a.tipo_combustivel||'',a.posto||'',kml];
    });
  } else if(tipo==='manutencao'){
    headers=['Placa','Modelo','Classificação','Contrato','Localidade','Tipo Serviço','Descrição','Data','KM','Valor'];
    rows=manut.map(m=>{
      const v=gV(m.veiculo_id);
      const cls=(v.classificacao||'producao')==='producao'?'Produção':'Unidade Fixa';
      return[v.placa,v.modelo,cls,gCT(v.contrato_id).nome_contrato,gLoc(v.localidade_id).nome_localidade,m.tipo_servico,m.descricao||'—',fd(m.data),m.km||0,cur(m.valor)];
    });
  } else if(tipo==='contratos'){
    headers=['Contrato','Nº Veículos','Produção','Unid. Fixa','OS','Abastec.','Manut R$','Comb R$','Total R$'];
    rows=C.ct.map(ct=>{
      const vids2=veics.filter(v=>v.contrato_id==ct.id).map(v=>v.id);
      const vProd=veics.filter(v=>v.contrato_id==ct.id&&(v.classificacao||'producao')==='producao').length;
      const vFix=veics.filter(v=>v.contrato_id==ct.id&&v.classificacao==='unidade_fixa').length;
      const cm=manut.filter(m=>vids2.includes(m.veiculo_id)).reduce((s,m)=>s+Number(m.valor),0);
      const ca=abast.filter(a=>vids2.includes(a.veiculo_id)).reduce((s,a)=>s+Number(a.valor_total),0);
      return[ct.nome_contrato,vids2.length,vProd,vFix,manut.filter(m=>vids2.includes(m.veiculo_id)).length,abast.filter(a=>vids2.includes(a.veiculo_id)).length,cur(cm),cur(ca),cur(cm+ca)];
    });
  } else if(tipo==='veiculos'){
    headers=['Placa','Modelo','Classificação','Contrato','Localidade','Abastec.','OS','Comb R$','Manut R$','Locação R$','Total R$'];
    rows=veics.map(v=>{
      const cm=manut.filter(m=>m.veiculo_id==v.id).reduce((s,m)=>s+Number(m.valor),0);
      const ca=abast.filter(a=>a.veiculo_id==v.id).reduce((s,a)=>s+Number(a.valor_total),0);
      const loc=Number(v.valor_locacao||0);
      const cls=(v.classificacao||'producao')==='producao'?'🚛 Produção':'🏭 Unidade Fixa';
      return[v.placa,v.modelo,cls,gCT(v.contrato_id).nome_contrato,gLoc(v.localidade_id).nome_localidade,abast.filter(a=>a.veiculo_id==v.id).length,manut.filter(m=>m.veiculo_id==v.id).length,cur(ca),cur(cm),cur(loc),cur(cm+ca+loc)];
    }).sort((a,b)=>b[10]>a[10]?1:-1);
  } else if(tipo==='mensal'){
    headers=['Mês','Abastecimentos','Manutenções','Comb R$','Manut R$','Total R$'];
    const mset=[...new Set([...abast.map(a=>a.data?.slice(0,7)),...manut.map(m=>m.data?.slice(0,7))].filter(Boolean))].sort().reverse();
    rows=mset.map(m=>{
      const ca=abast.filter(a=>a.data?.startsWith(m)).reduce((s,a)=>s+Number(a.valor_total),0);
      const cm=manut.filter(x=>x.data?.startsWith(m)).reduce((s,x)=>s+Number(x.valor),0);
      const[y,mo]=m.split('-');
      return[`${mo}/${y}`,abast.filter(a=>a.data?.startsWith(m)).length,manut.filter(x=>x.data?.startsWith(m)).length,cur(ca),cur(cm),cur(ca+cm)];
    });
  } else if(tipo==='status'){
    headers=['Placa','Modelo','Tipo','Contrato','Localidade','Status','KM Atual','Responsável','Tipo Frota'];
    const f2=getFiltrosRel();
    let veicsStatus=C.v;
    if(f2.ct) veicsStatus=veicsStatus.filter(v=>v.contrato_id==f2.ct);
    if(f2.statusV) veicsStatus=veicsStatus.filter(v=>v.status===f2.statusV);
    rows=veicsStatus.map(v=>[
      v.placa,v.modelo,v.tipo||'',
      gCT(v.contrato_id).nome_contrato||'—',
      gLoc(v.localidade_id).nome_localidade||'—',
      v.status,
      (v.km_atual||0).toLocaleString('pt-BR'),
      v.responsavel||'—',
      (v.tipo_frota||'propria')==='locada'?'Locado':'Próprio'
    ]);
  } else if(tipo==='frota'){
    const f2=getFiltrosRel();
    let veicsFrota=C.v;
    if(f2.ct) veicsFrota=veicsFrota.filter(v=>v.contrato_id==f2.ct);
    if(f2.frota) veicsFrota=veicsFrota.filter(v=>(v.tipo_frota||'propria')===f2.frota);
    headers=['Placa','Modelo','Renavan','Contrato','Localidade','Responsável','Status','Tipo Frota','Locação R$','Locador','E-mail','Telefone'];
    rows=veicsFrota.map(v=>[
      v.placa,v.modelo,
      v.renavan||'—',
      gCT(v.contrato_id).nome_contrato||'—',
      gLoc(v.localidade_id).nome_localidade||'—',
      v.responsavel||'—',
      v.status,
      (v.tipo_frota||'propria')==='locada'?'Veículo Locado':'Frota Própria',
      cur(v.valor_locacao||0),
      v.locador_nome||'—',v.locador_email||'—',v.locador_fone||'—'
    ]);
  } else if(tipo==='movimentacoes'){
    headers=['Data','Veículo','Modelo','Contrato','Tipo','Origem','Destino','KM','Usuário','Obs.'];
    const f2=getFiltrosRel();
    let movs=C.mov||[];
    if(f2.di) movs=movs.filter(m=>m.data_movimentacao>=f2.di);
    if(f2.df) movs=movs.filter(m=>m.data_movimentacao<=f2.df);
    if(f2.ct){const vids=new Set(C.v.filter(v=>v.contrato_id==f2.ct).map(v=>v.id));movs=movs.filter(m=>vids.has(m.veiculo_id));}
    rows=movs.map(m=>{
      const v=gV(m.veiculo_id);
      return[fd(m.data_movimentacao),v.placa||'—',v.modelo||'—',gCT(v.contrato_id).nome_contrato||'—',m.tipo_movimentacao,m.origem||'—',m.destino||'—',m.km||0,m.usuario_responsavel||'—',m.observacao||'—'];
    });
  }

  if(!rows.length){toast('Nenhum dado com os filtros selecionados.','i');return;}

  const f=getFiltrosRel();
  const filtroInfo=(f.di||f.df||f.ct||f.loc)?`<div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:6px;padding:7px 12px;margin-bottom:10px;font-size:11px;color:#1d4ed8">
    🔍 Filtros: ${f.di?'De '+fd(f.di)+' ':''} ${f.df?'até '+fd(f.df)+' ':''} ${f.ct?'| Contrato: '+gCT(f.ct).nome_contrato+' ':''} ${f.loc?'| Localidade: '+gLoc(f.loc).nome_localidade:''}
  </div>`:'';

  const tbl=`${filtroInfo}<div style="overflow-x:auto;-webkit-overflow-scrolling:touch"><table style="border-collapse:collapse;min-width:600px;width:max-content">
    <thead><tr>${headers.map(h=>`<th style="background:#1e3a8a;color:#fff;padding:8px 10px;text-align:left;font-size:11px;white-space:nowrap">${h}</th>`).join('')}</tr></thead>
    <tbody>${rows.map((r,i)=>`<tr style="background:${i%2?'#f8fafc':'#fff'}">${r.map(c=>`<td style="padding:7px 10px;border-bottom:1px solid #e2e8f0;font-size:12px;white-space:nowrap">${c}</td>`).join('')}</tr>`).join('')}</tbody>
  </table></div><div style="margin-top:8px;font-size:11px;color:#94a3b8">${rows.length} registros | Gerado em ${dt}</div>`;

  document.getElementById('rel-prev-title').textContent=`${rel?.icon||'📋'} ${rel?.title||tipo} — Pré-visualização`;
  document.getElementById('rel-prev-body').innerHTML=tbl;
  document.getElementById('rel-prev-export').onclick=()=>exportarExcel(tipo);
  const prev=document.getElementById('rel-preview');
  prev.style.display='block';
  prev.scrollIntoView({behavior:'smooth',block:'start'});
}

export function switchRelTab(tab){
  const isTbl=tab==='tabelas';
  document.getElementById('rel-painel-tabelas').style.display=isTbl?'block':'none';
  document.getElementById('rel-painel-graficos').style.display=isTbl?'none':'block';
  const tTbl=document.getElementById('rel-tab-tabelas');
  const tGrf=document.getElementById('rel-tab-graficos');
  tTbl.style.borderBottomColor=isTbl?'#1d6fdf':'transparent';
  tTbl.style.color=isTbl?'#1d6fdf':'var(--tm)';
  tGrf.style.borderBottomColor=isTbl?'transparent':'#1d6fdf';
  tGrf.style.color=isTbl?'var(--tm)':'#1d6fdf';
  if(!isTbl) renderGraficos();
}

export function initGrafFiltros(){
  const ct=document.getElementById('graf-sel-ct');
  const loc=document.getElementById('graf-sel-loc');
  if(ct){const v=ct.value;ct.innerHTML='<option value="">Todos os contratos</option>';C.ct.forEach(x=>{ct.innerHTML+=`<option value="${x.id}">${x.nome_contrato}</option>`;});ct.value=v;}
  if(loc){const v=loc.value;loc.innerHTML='<option value="">Todas as localidades</option>';C.loc.forEach(x=>{loc.innerHTML+=`<option value="${x.id}">${x.nome_localidade}</option>`;});loc.value=v;}
}

export function getFiltrosGraf(){
  return{
    di:document.getElementById('graf-di')?.value||'',
    df:document.getElementById('graf-df')?.value||'',
    ct:document.getElementById('graf-sel-ct')?.value||'',
    loc:document.getElementById('graf-sel-loc')?.value||'',
    tema:document.getElementById('graf-tema')?.value||'manutencao'
  };
}

export function filtrarGraf(){
  const f=getFiltrosGraf();
  const dentroData=d=>{if(!d)return false;if(f.di&&d<f.di)return false;if(f.df&&d>f.df)return false;return true;};
  let veics=C.v;
  if(f.ct) veics=veics.filter(v=>String(v.contrato_id)===String(f.ct));
  if(f.loc) veics=veics.filter(v=>String(v.localidade_id)===String(f.loc));
  const vids=new Set(veics.map(v=>String(v.id)));
  let abast=C.a.filter(a=>vids.has(String(a.veiculo_id)));
  let manut=C.m.filter(m=>vids.has(String(m.veiculo_id)));
  let multas=(C.mt||[]).filter(m=>m.veiculo_id!=null&&vids.has(String(m.veiculo_id)));
  if(f.di||f.df){
    abast=abast.filter(a=>dentroData(a.data));
    manut=manut.filter(m=>dentroData(m.data));
    multas=multas.filter(m=>dentroData(m.data_infracao));
  }
  return{veics,vids,abast,manut,multas,f};
}

export function limparFiltrosGraf(){
  ['graf-di','graf-df'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
  ['graf-sel-ct','graf-sel-loc'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
  renderGraficos();
}

// ══════════════════════════════════════════════════
// CHART.JS — gráficos avançados
// ══════════════════════════════════════════════════
export const _chartInstances = {};

export function destroyChart(id){
  if(_chartInstances[id]){
    _chartInstances[id].destroy();
    delete _chartInstances[id];
  }
}

export function chartBar(canvasId, labels, datasets, options={}){
  destroyChart(canvasId);
  const canvas = document.getElementById(canvasId);
  if(!canvas) return;
  const ctx = canvas.getContext('2d');
  _chartInstances[canvasId] = new Chart(ctx, {
    type: options.horizontal ? 'bar' : 'bar',
    data: { labels, datasets },
    options: {
      indexAxis: options.horizontal ? 'y' : 'x',
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: datasets.length > 1, position:'top', labels:{font:{size:11}} },
        tooltip: {
          callbacks: {
            label: ctx => ` R$ ${Number(ctx.parsed[options.horizontal?'x':'y']||0).toLocaleString('pt-BR',{minimumFractionDigits:2})}`
          }
        }
      },
      scales: {
        x: { ticks: { callback: v => options.horizontal ? `R$ ${Number(v).toLocaleString('pt-BR',{notation:'compact'})}` : v, font:{size:10} }, grid:{color:'#f1f5f9'} },
        y: { ticks: { font:{size:10} }, grid:{color:'#f1f5f9'} }
      }
    }
  });
}

export function chartDoughnut(canvasId, labels, data, cores){
  destroyChart(canvasId);
  const canvas = document.getElementById(canvasId);
  if(!canvas) return;
  const ctx = canvas.getContext('2d');
  _chartInstances[canvasId] = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels,
      datasets:[{ data, backgroundColor: cores, borderWidth:2, borderColor:'#fff' }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position:'right', labels:{font:{size:10}, padding:10} },
        tooltip: {
          callbacks: {
            label: ctx => ` ${ctx.label}: R$ ${Number(ctx.parsed||0).toLocaleString('pt-BR',{minimumFractionDigits:2})} (${((ctx.parsed/ctx.dataset.data.reduce((a,b)=>a+b,0))*100).toFixed(1)}%)`
          }
        }
      }
    }
  });
}

export const CHART_COLORS = [
  '#1d6fdf','#e05a00','#057a55','#b45309','#6d28d9',
  '#0e7490','#be185d','#92400e','#1e40af','#065f46',
  '#7c2d12','#4338ca','#0f766e','#9f1239','#374151'
];

export function renderGraficos(){
  const {veics,abast,manut,multas,f}=filtrarGraf();
  const tema=f.tema;
  const COR={manutencao:'#2258a5',combustivel:'#ff8b00',multas:'#dc2626'};
  const cor=COR[tema]||'#1d6fdf';
  const LABEL={manutencao:'🔧 Manutenção',combustivel:'⛽ Combustível',multas:'🚨 Multas'};
  const lbl=LABEL[tema];
  ['ct','loc','vei','tipo'].forEach(k=>{
    const tmap={ct:'Por Contrato',loc:'Por Localidade',vei:'Por Veículo (Top 10)',tipo:'Por Tipo'};
    const el=document.getElementById('gtit-'+k);if(el)el.textContent=`${lbl} — ${tmap[k]}`;
  });

  const getVal=r=>Number(tema==='combustivel'?r.valor_total:r.valor||0);
  const records=tema==='manutencao'?manut:tema==='combustivel'?abast:multas;
  const getVid=r=>r.veiculo_id;

  // Garantir que os divs têm canvas
  ['ct','loc','vei','tipo'].forEach(k=>{
    const div=document.getElementById('gchart-'+k);
    if(div&&!div.querySelector('canvas')){
      div.innerHTML=`<canvas id="canvas-${k}" style="max-height:260px"></canvas>`;
    }
  });

  // 1. Por Contrato — barras horizontais
  const byCt=C.ct.map(ct=>{
    const ids=new Set(veics.filter(v=>String(v.contrato_id)===String(ct.id)).map(v=>String(v.id)));
    return{lbl:ct.nome_contrato,val:records.filter(r=>ids.has(String(getVid(r)))).reduce((s,r)=>s+getVal(r),0)};
  }).filter(d=>d.val>0).sort((a,b)=>b.val-a.val);

  if(byCt.length){
    chartBar('canvas-ct', byCt.map(d=>d.lbl), [{
      label:'Total',data:byCt.map(d=>d.val),
      backgroundColor:byCt.map((_,i)=>CHART_COLORS[i%CHART_COLORS.length]+'cc'),
      borderColor:byCt.map((_,i)=>CHART_COLORS[i%CHART_COLORS.length]),
      borderWidth:1, borderRadius:4
    }], {horizontal:true});
  } else {
    document.getElementById('gchart-ct').innerHTML='<div style="padding:24px;text-align:center;color:var(--tm);font-size:13px">Sem dados no período</div>';
  }

  // 2. Por Localidade — barras horizontais
  const byLoc=C.loc.map(l=>{
    const ids=new Set(veics.filter(v=>String(v.localidade_id)===String(l.id)).map(v=>String(v.id)));
    return{lbl:l.nome_localidade,val:records.filter(r=>ids.has(String(getVid(r)))).reduce((s,r)=>s+getVal(r),0)};
  }).filter(d=>d.val>0).sort((a,b)=>b.val-a.val);

  if(byLoc.length){
    chartBar('canvas-loc', byLoc.map(d=>d.lbl), [{
      label:'Total',data:byLoc.map(d=>d.val),
      backgroundColor:byLoc.map((_,i)=>CHART_COLORS[(i+3)%CHART_COLORS.length]+'cc'),
      borderColor:byLoc.map((_,i)=>CHART_COLORS[(i+3)%CHART_COLORS.length]),
      borderWidth:1, borderRadius:4
    }], {horizontal:true});
  } else {
    document.getElementById('gchart-loc').innerHTML='<div style="padding:24px;text-align:center;color:var(--tm);font-size:13px">Sem dados no período</div>';
  }

  // 3. Por Veículo Top 10 — barras verticais com 2 séries (manut+comb)
  const byVei=[...veics].map(v=>({
    lbl:v.placa,
    comb:abast.filter(r=>r.veiculo_id==v.id).reduce((s,r)=>s+Number(r.valor_total||0),0),
    manut:manut.filter(r=>r.veiculo_id==v.id).reduce((s,r)=>s+Number(r.valor||0),0),
  })).map(v=>({...v,total:v.comb+v.manut})).filter(d=>d.total>0).sort((a,b)=>b.total-a.total).slice(0,10);

  if(byVei.length){
    chartBar('canvas-vei', byVei.map(d=>d.lbl), [
      {label:'Combustível',data:byVei.map(d=>d.comb),backgroundColor:'#ff8b00cc',borderColor:'#ff8b00',borderWidth:1,borderRadius:4},
      {label:'Manutenção',data:byVei.map(d=>d.manut),backgroundColor:'#2258a5cc',borderColor:'#2258a5',borderWidth:1,borderRadius:4}
    ], {horizontal:false, stacked:true});
  } else {
    document.getElementById('gchart-vei').innerHTML='<div style="padding:24px;text-align:center;color:var(--tm);font-size:13px">Sem dados no período</div>';
  }

  // 4. Por Tipo — Donut
  let byTipo=[];
  if(tema==='manutencao'){
    const tipos=[...new Set(manut.map(m=>m.tipo_servico||'Outros'))];
    byTipo=tipos.map(t=>({lbl:t,val:manut.filter(m=>m.tipo_servico===t).reduce((s,m)=>s+getVal(m),0)}));
  } else if(tema==='combustivel'){
    const tipos=[...new Set(abast.map(a=>a.tipo_combustivel||'Gasolina'))];
    byTipo=tipos.map(t=>({lbl:t,val:abast.filter(a=>a.tipo_combustivel===t).reduce((s,a)=>s+getVal(a),0)}));
  } else {
    ['recebida','aguardando indicação','condutor indicado','em recurso','paga','vencida'].forEach(st=>{
      byTipo.push({lbl:st,val:multas.filter(m=>m.status===st).reduce((s,m)=>s+getVal(m),0)});
    });
  }
  byTipo=byTipo.filter(d=>d.val>0).sort((a,b)=>b.val-a.val);

  if(byTipo.length){
    chartDoughnut('canvas-tipo', byTipo.map(d=>d.lbl), byTipo.map(d=>d.val),
      byTipo.map((_,i)=>CHART_COLORS[i%CHART_COLORS.length]));
  } else {
    document.getElementById('gchart-tipo').innerHTML='<div style="padding:24px;text-align:center;color:var(--tm);font-size:13px">Sem dados no período</div>';
  }
}

export function exportarGraficosExcel(){
  const {veics,abast,manut,multas,f}=filtrarGraf();
  const tema=f.tema;
  const getVal=r=>Number(tema==='combustivel'?r.valor_total:r.valor||0);
  const records=tema==='manutencao'?manut:tema==='combustivel'?abast:multas;
  const getVid=r=>r.veiculo_id;
  const TEMA_LABELS={manutencao:'Manutencao',combustivel:'Combustivel',multas:'Multas'};
  const lbl=TEMA_LABELS[tema]||tema;
  const toCSV=rows=>rows.map(r=>r.join('\t')).join('\n');
  const rowsCt=[['Contrato','Registros','Valor Total (R$)'],...C.ct.map(ct=>{
    const ids=new Set(veics.filter(v=>v.contrato_id==ct.id).map(v=>v.id));
    const recs=records.filter(r=>ids.has(getVid(r)));
    return[ct.nome_contrato,recs.length,recs.reduce((s,r)=>s+getVal(r),0).toFixed(2)];
  })];
  const rowsLoc=[['Localidade','Registros','Valor Total (R$)'],...C.loc.map(l=>{
    const ids=new Set(veics.filter(v=>v.localidade_id==l.id).map(v=>v.id));
    const recs=records.filter(r=>ids.has(getVid(r)));
    return[l.nome_localidade,recs.length,recs.reduce((s,r)=>s+getVal(r),0).toFixed(2)];
  })];
  const rowsVei=[['Placa','Modelo','Registros','Valor Total (R$)'],...veics.map(v=>{
    const recs=records.filter(r=>getVid(r)==v.id);
    return[v.placa,v.modelo,recs.length,recs.reduce((s,r)=>s+getVal(r),0).toFixed(2)];
  }).sort((a,b)=>b[3]-a[3])];
  const blob=new Blob([
    `DASHBOARD ${lbl.toUpperCase()} — Exportado em ${new Date().toLocaleDateString('pt-BR')}\n\n`,
    `=== Por Contrato ===\n${toCSV(rowsCt)}\n\n`,
    `=== Por Localidade ===\n${toCSV(rowsLoc)}\n\n`,
    `=== Por Veículo ===\n${toCSV(rowsVei)}\n`
  ],{type:'text/plain;charset=utf-8'});
  const a=document.createElement('a');
  a.href=URL.createObjectURL(blob);
  a.download=`Dashboard_${lbl}_${now()}.xls`;
  a.click();
  toast('✅ Excel exportado!');
}

// Make globally accessible
window.RELS = RELS;
window.getFiltrosRel = getFiltrosRel;
window.filtrarDados = filtrarDados;
window.renderRelCards = renderRelCards;
window.limparFiltrosRel = limparFiltrosRel;
window.fecharPreview = fecharPreview;
window.previewRel = previewRel;
window.switchRelTab = switchRelTab;
window.initGrafFiltros = initGrafFiltros;
window.getFiltrosGraf = getFiltrosGraf;
window.filtrarGraf = filtrarGraf;
window.limparFiltrosGraf = limparFiltrosGraf;
window._chartInstances = _chartInstances;
window.destroyChart = destroyChart;
window.chartBar = chartBar;
window.chartDoughnut = chartDoughnut;
window.CHART_COLORS = CHART_COLORS;
window.renderGraficos = renderGraficos;
window.exportarGraficosExcel = exportarGraficosExcel;

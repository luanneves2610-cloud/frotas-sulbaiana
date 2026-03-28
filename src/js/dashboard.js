import { C, SESSION } from './state.js';
import { cur, curMonth, fd, toast } from './utils.js';
import { supabase } from './config.js';
import { dispararNotificacao } from './notificacoes.js';

// ── Estado ─────────────────────────────────────────────────────────────────
let _semFiltro = false;
window._semFiltro = false;
let _chartLine  = null;
let _chartDonut = null;
let _chartBar   = null;

// ── Sem Filtro toggle ──────────────────────────────────────────────────────
export function toggleFiltroData() {
  _semFiltro = !_semFiltro;
  window._semFiltro = _semFiltro;
  const btn = document.getElementById('btn-sem-filtro');
  if (btn) {
    btn.style.background     = _semFiltro ? 'var(--ac)' : 'var(--s2)';
    btn.style.color          = _semFiltro ? '#fff'      : 'var(--tm)';
    btn.style.borderColor    = _semFiltro ? 'var(--ac)' : 'var(--b2)';
    btn.style.boxShadow      = _semFiltro ? '0 2px 8px rgba(37,99,235,.3)' : 'none';
  }
  const mes = document.getElementById('dash-mes');
  const ano = document.getElementById('dash-ano');
  if (mes) mes.disabled = _semFiltro;
  if (ano) ano.disabled = _semFiltro;
  renderDash();
}

export function getDashMes() {
  if (_semFiltro) return null;
  const el = document.getElementById('dash-mes');
  const ea = document.getElementById('dash-ano');
  if (el && ea) return `${ea.value}-${el.value}`;
  return curMonth();
}

// ── Render principal ───────────────────────────────────────────────────────
export function renderDash() {
  const mes = getDashMes(); // null = sem filtro

  const fA = (arr) => mes ? arr.filter(a => a.data?.startsWith(mes)) : arr;
  const fM = (arr) => mes ? arr.filter(m => m.data?.startsWith(mes)) : arr;

  const tc = fA(C.a).reduce((s,a) => s + Number(a.valor_total), 0);
  const tm = fM(C.m).reduce((s,m) => s + Number(m.valor),       0);
  const tt = tc + tm;

  const ativos    = C.v.filter(v => v.status === 'ativo').length;
  const emManut   = C.v.filter(v => v.status === 'manutenção').length;
  const devolvidos= C.v.filter(v => v.status === 'devolvido').length;
  const dispVenda = C.v.filter(v => v.status === 'disp. para venda').length;
  const vendidos  = C.v.filter(v => v.status === 'vendido').length;
  const sede      = C.v.filter(v => v.status === 'devolvido' && (v.destino_devolucao === 'sede' || !v.destino_devolucao)).length;

  const ranked = [...C.v].map(v => ({...v, total: window.costV(v.id)})).sort((a,b) => b.total - a.total);
  const top    = ranked[0] || {placa: '—', total: 0};

  const lbl = mes
    ? (() => { const [y,m] = mes.split('-'); return new Date(parseInt(y), parseInt(m)-1, 1).toLocaleDateString('pt-BR', {month:'long', year:'numeric'}); })()
    : 'Total Geral';

  document.getElementById('kpi-grid').innerHTML = `
    <div class="kpi bl"><div class="kpi-top"><div class="kpi-lbl">Total ${lbl}</div><div class="kpi-ico">💰</div></div><div class="kpi-val">${cur(tt).replace('R$ ','R$')}</div><div class="kpi-sub">Manut. + Combustível</div></div>
    <div class="kpi or"><div class="kpi-top"><div class="kpi-lbl">Combustível</div><div class="kpi-ico">⛽</div></div><div class="kpi-val">${cur(tc).replace('R$ ','R$')}</div><div class="kpi-sub">${fA(C.a).length} abastecimentos</div></div>
    <div class="kpi ye"><div class="kpi-top"><div class="kpi-lbl">Manutenção</div><div class="kpi-ico">🔧</div></div><div class="kpi-val">${cur(tm).replace('R$ ','R$')}</div><div class="kpi-sub">${fM(C.m).length} ordens</div></div>
    <div class="kpi gr"><div class="kpi-top"><div class="kpi-lbl">Em Operação</div><div class="kpi-ico">🚗</div></div><div class="kpi-val">${ativos}</div><div class="kpi-sub">${emManut} em manutenção</div></div>
    <div class="kpi pu"><div class="kpi-top"><div class="kpi-lbl">Devolvidos/Sede</div><div class="kpi-ico">🏢</div></div><div class="kpi-val">${devolvidos}</div><div class="kpi-sub">${sede} na sede</div></div>
    <div class="kpi ye"><div class="kpi-top"><div class="kpi-lbl">Disp. para Venda</div><div class="kpi-ico">🏷️</div></div><div class="kpi-val">${dispVenda}</div><div class="kpi-sub">aguardando venda</div></div>
    <div class="kpi rd"><div class="kpi-top"><div class="kpi-lbl">Vendidos</div><div class="kpi-ico">💰</div></div><div class="kpi-val">${vendidos}</div><div class="kpi-sub">veículos vendidos</div></div>
    <div class="kpi or"><div class="kpi-top"><div class="kpi-lbl">Maior Custo</div><div class="kpi-ico">📍</div></div><div class="kpi-val">${top.placa}</div><div class="kpi-sub">${cur(top.total)} acumulado</div></div>`;

  // Frota por contrato
  const ctKpis = C.ct.filter(x => x.status === 'ativo').map(ct => {
    const n = C.v.filter(v => v.contrato_id == ct.id && v.status === 'ativo').length;
    return `<div style="background:#f8fafc;border:1px solid var(--b1);border-radius:8px;padding:8px 14px;font-size:12px;display:flex;justify-content:space-between;align-items:center;min-width:160px">
      <span style="color:var(--tm);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:120px" title="${ct.nome_contrato}">${ct.nome_contrato}</span>
      <strong class="t-bl" style="font-size:14px;margin-left:8px">${n}</strong>
    </div>`;
  }).join('');
  document.getElementById('dash-frota-ct').innerHTML = `
    <div style="font-weight:600;font-size:12px;color:var(--tm);margin-bottom:8px">🚗 Veículos Ativos por Contrato</div>
    <div style="display:flex;gap:8px;flex-wrap:wrap">${ctKpis}
      <div style="background:#fefce8;border:1px solid #fde68a;border-radius:8px;padding:8px 14px;font-size:12px;display:flex;justify-content:space-between;align-items:center;min-width:120px">
        <span style="color:#b45309">🏢 Sede</span><strong class="t-or" style="font-size:14px;margin-left:8px">${sede}</strong>
      </div>
    </div>`;

  // Indicador composição
  const compLbl = document.getElementById('dash-comp-lbl');
  if (compLbl) {
    const pctM = tt > 0 ? ((tm/tt)*100).toFixed(0) : 0;
    const pctC = tt > 0 ? ((tc/tt)*100).toFixed(0) : 0;
    compLbl.textContent = `Manut. ${pctM}% · Comb. ${pctC}%`;
  }

  renderChart();
  _renderDonut(tc, tm);
  renderRank(ranked);
  renderDashContratos();
  renderDashLocalidades();
  renderAlertas();
}

// ── Gráfico de linha — Evolução Mensal (Chart.js) ─────────────────────────
export function renderChart() {
  const meses = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - i);
    const mk = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
    meses.push({ key: mk, lbl: d.toLocaleDateString('pt-BR', {month:'short'}).replace('.','') });
  }
  const bc = meses.map(m => C.a.filter(a => a.data?.startsWith(m.key)).reduce((s,a) => s + Number(a.valor_total), 0));
  const bm = meses.map(m => C.m.filter(x => x.data?.startsWith(m.key)).reduce((s,x) => s + Number(x.valor),       0));
  const bt = bc.map((v,i) => v + bm[i]);

  const canvas = document.getElementById('canvas-evolucao');
  if (!canvas) return;
  if (_chartLine) { _chartLine.destroy(); _chartLine = null; }

  _chartLine = new Chart(canvas, {
    type: 'line',
    data: {
      labels: meses.map(m => m.lbl),
      datasets: [
        { label:'Total',       data:bt, borderColor:'#2563eb', backgroundColor:'rgba(37,99,235,.1)',  tension:.4, fill:true,  pointBackgroundColor:'#2563eb', pointBorderColor:'#fff', pointRadius:4, pointHoverRadius:6, borderWidth:2.5 },
        { label:'Manutenção',  data:bm, borderColor:'#ea580c', backgroundColor:'transparent',         tension:.4, fill:false, pointBackgroundColor:'#ea580c', pointBorderColor:'#fff', pointRadius:4, borderWidth:2 },
        { label:'Combustível', data:bc, borderColor:'#059669', backgroundColor:'transparent',         tension:.4, fill:false, pointBackgroundColor:'#059669', pointBorderColor:'#fff', pointRadius:4, borderWidth:2 }
      ]
    },
    options: {
      responsive:true, maintainAspectRatio:false,
      plugins: {
        legend: { position:'top', labels:{ usePointStyle:true, boxWidth:12, font:{family:'Inter',size:11} } },
        tooltip: { callbacks:{ label: ctx => ` ${ctx.dataset.label}: ${cur(ctx.raw)}` } }
      },
      scales: {
        y: { beginAtZero:true, grid:{color:'rgba(0,0,0,.04)'}, ticks:{ callback: v => v>=1000 ? 'R$'+(v/1000).toFixed(1)+'k' : 'R$'+v, font:{size:11} } },
        x: { grid:{display:false}, ticks:{ font:{size:11} } }
      }
    }
  });
}

// ── Gráfico doughnut — Composição ─────────────────────────────────────────
function _renderDonut(tc, tm) {
  const canvas = document.getElementById('canvas-donut');
  if (!canvas) return;
  if (_chartDonut) { _chartDonut.destroy(); _chartDonut = null; }

  const total = tc + tm;
  const pM = total > 0 ? ((tm/total)*100).toFixed(1) : 0;
  const pC = total > 0 ? ((tc/total)*100).toFixed(1) : 0;

  _chartDonut = new Chart(canvas, {
    type: 'doughnut',
    data: {
      labels: [`🔧 Manutenção ${pM}%`, `⛽ Combustível ${pC}%`],
      datasets: [{
        data: [tm || 0.001, tc || 0.001],
        backgroundColor: ['#ea580c', '#059669'],
        borderWidth: 0,
        hoverOffset: 10,
        cutout: '65%',
        borderRadius: 8,
        spacing: 4
      }]
    },
    options: {
      responsive:true, maintainAspectRatio:false,
      plugins: {
        legend: { position:'bottom', labels:{ usePointStyle:true, boxWidth:10, font:{family:'Inter',size:11} } },
        tooltip: { callbacks:{ label: ctx => ` ${cur(ctx.raw === 0.001 ? 0 : ctx.raw)}` } }
      }
    }
  });
}

// ── Ranking ────────────────────────────────────────────────────────────────
export function renderRank(ranked) {
  const medalColors = ['#f59e0b','#94a3b8','#cd7c2f'];
  document.getElementById('rank-list').innerHTML = ranked.slice(0,6).map((v,i) => {
    const pct = (v.total / (ranked[0]?.total || 1) * 100).toFixed(0);
    const barColor = i===0?'#f59e0b':i===1?'#3b82f6':i===2?'#10b981':'#6366f1';
    return `<div style="padding:10px 0;border-bottom:1px solid var(--b1);display:flex;align-items:center;gap:12px">
      <div style="width:24px;height:24px;border-radius:8px;background:${i<3?medalColors[i]:'var(--s2)'};display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:${i<3?'#fff':'var(--tm)'};flex-shrink:0">${i+1}</div>
      <div style="flex:1;min-width:0">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">
          <strong style="font-size:12px;font-family:'JetBrains Mono'">${v.placa}</strong>
          <span style="font-size:12px;font-weight:600;color:var(--a2)">${cur(v.total)}</span>
        </div>
        <div style="font-size:10px;color:var(--tm);margin-bottom:5px">${v.modelo} · ${window.gCT(v.contrato_id).nome_contrato}</div>
        <div style="height:4px;background:var(--b1);border-radius:2px;overflow:hidden">
          <div style="height:100%;width:${pct}%;background:${barColor};border-radius:2px;transition:width .5s"></div>
        </div>
      </div>
    </div>`;
  }).join('');
}

// ── Por Contrato (lista + gráfico de barras) ───────────────────────────────
export function renderDashContratos() {
  const isAdmin  = SESSION?.perfil === 'admin' || SESSION?.perfil === 'financeiro';
  const ctFiltro = (!isAdmin && SESSION?.contrato_id) ? parseInt(SESSION.contrato_id) : null;
  const contratos = ctFiltro
    ? C.ct.filter(x => x.status === 'ativo' && parseInt(x.id) === ctFiltro)
    : C.ct.filter(x => x.status === 'ativo');
  const mes = getDashMes();

  const ctData = contratos.map(ct => {
    const ids = C.v.filter(v => v.contrato_id == ct.id).map(v => v.id);
    const veicsAtivos = C.v.filter(v => v.contrato_id == ct.id && v.status === 'ativo').length;
    const tot = mes
      ? C.m.filter(m => ids.includes(m.veiculo_id) && m.data?.startsWith(mes)).reduce((s,m) => s+Number(m.valor),0)
        + C.a.filter(a => ids.includes(a.veiculo_id) && a.data?.startsWith(mes)).reduce((s,a) => s+Number(a.valor_total),0)
      : C.m.filter(m => ids.includes(m.veiculo_id)).reduce((s,m) => s+Number(m.valor),0)
        + C.a.filter(a => ids.includes(a.veiculo_id)).reduce((s,a) => s+Number(a.valor_total),0);
    return { nome: ct.nome_contrato, custo: tot, veiculos: veicsAtivos };
  });

  // Gráfico bar + line
  const canvas = document.getElementById('canvas-contratos-bar');
  if (canvas && window.Chart) {
    if (_chartBar) { _chartBar.destroy(); _chartBar = null; }
    _chartBar = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: ctData.map(c => c.nome.length > 14 ? c.nome.slice(0,14)+'…' : c.nome),
        datasets: [
          {
            label: 'Custo (R$)',
            data: ctData.map(c => c.custo),
            backgroundColor: 'rgba(37,99,235,.75)',
            borderRadius: 8,
            barPercentage: 0.6,
            borderSkipped: false,
            hoverBackgroundColor: '#ea580c'
          },
          {
            label: 'Veículos ativos',
            data: ctData.map(c => c.veiculos),
            type: 'line',
            borderColor: '#059669',
            backgroundColor: 'transparent',
            borderWidth: 2.5,
            tension: 0.2,
            pointRadius: 5,
            pointBackgroundColor: '#059669',
            pointBorderColor: '#fff',
            yAxisID: 'y1',
            fill: false
          }
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { position:'top', labels:{ usePointStyle:true, boxWidth:12, font:{family:'Inter',size:11} } },
          tooltip: { callbacks:{ label: ctx => ctx.dataset.label === 'Custo (R$)' ? ` ${cur(ctx.raw)}` : ` ${ctx.raw} veículos` } }
        },
        scales: {
          y:  { beginAtZero:true, grid:{color:'rgba(0,0,0,.04)'}, ticks:{ callback: v => v>=1000?'R$'+(v/1000).toFixed(1)+'k':'R$'+v, font:{size:11} } },
          y1: { position:'right', beginAtZero:true, grid:{drawOnChartArea:false}, ticks:{font:{size:11}} },
          x:  { grid:{display:false}, ticks:{font:{size:11}, maxRotation:25} }
        }
      }
    });
  }

  // Lista texto
  document.getElementById('dash-contratos').innerHTML = ctData.map(c =>
    `<div style="display:flex;justify-content:space-between;align-items:center;padding:9px 0;border-bottom:1px solid var(--b1)">
      <div><strong style="font-size:13px">${c.nome}</strong><div class="fs11 t-mu">${c.veiculos} veículos ativos</div></div>
      <div class="t-or fw7" style="font-family:'Space Grotesk';font-size:13px">${cur(c.custo)}</div>
    </div>`
  ).join('') || '<div style="padding:16px;color:var(--tm);font-size:13px;text-align:center">Sem dados no período</div>';
}

// ── Por Localidade ─────────────────────────────────────────────────────────
export function renderDashLocalidades() {
  const isAdmin  = SESSION?.perfil === 'admin' || SESSION?.perfil === 'financeiro';
  const ctFiltro = (!isAdmin && SESSION?.contrato_id) ? parseInt(SESSION.contrato_id) : null;
  const mes = getDashMes();
  let locs = C.loc.filter(x => x.status === 'ativo');
  if (ctFiltro) locs = locs.filter(l => C.cc.some(c => c.localidade_id == l.id && c.contrato_id == ctFiltro));
  document.getElementById('dash-localidades').innerHTML = locs.map(l => {
    const ids = C.v.filter(v => v.localidade_id == l.id).map(v => v.id);
    const tot = mes
      ? C.m.filter(m => ids.includes(m.veiculo_id) && m.data?.startsWith(mes)).reduce((s,m) => s+Number(m.valor),0)
        + C.a.filter(a => ids.includes(a.veiculo_id) && a.data?.startsWith(mes)).reduce((s,a) => s+Number(a.valor_total),0)
      : C.m.filter(m => ids.includes(m.veiculo_id)).reduce((s,m) => s+Number(m.valor),0)
        + C.a.filter(a => ids.includes(a.veiculo_id)).reduce((s,a) => s+Number(a.valor_total),0);
    return `<div style="display:flex;justify-content:space-between;align-items:center;padding:9px 0;border-bottom:1px solid var(--b1)">
      <div><strong style="font-size:13px">📍 ${l.nome_localidade}</strong><div class="fs11 t-mu">${l.cidade||''} · ${ids.length} veíc.</div></div>
      <div class="t-bl fw7" style="font-family:'Space Grotesk';font-size:13px">${cur(tot)}</div>
    </div>`;
  }).join('') || '<div style="padding:16px;color:var(--tm);font-size:13px;text-align:center">Sem dados no período</div>';
}

// ── Alertas de KM ─────────────────────────────────────────────────────────
export function calcAlertasKM() {
  const INTERVALOS = {
    'CARRO': {'Troca de Óleo':9500,'Alinhamento':7000},
    'MOTO':  {'Troca de Óleo':900}
  };
  const alertas = [];
  C.v.filter(v => v.status === 'ativo' || v.status === 'manutenção').forEach(v => {
    const regras = INTERVALOS[v.tipo] || {};
    Object.entries(regras).forEach(([servico, intervalo]) => {
      const oss = C.m.filter(m => m.veiculo_id == v.id && m.tipo_servico?.startsWith(servico)).sort((a,b) => (b.km||0)-(a.km||0));
      if (!oss.length) return;
      const ultima   = oss[0];
      const kmUltimo = ultima.km || 0;
      const kmProximo= kmUltimo + intervalo;
      const kmAtual  = v.km_atual || 0;
      const restante = kmProximo - kmAtual;
      if (restante > 500) return;
      alertas.push({v, servico, kmUltimo, kmProximo, kmAtual, restante});
    });
  });
  return alertas;
}

export function renderAlertas() {
  const al = [];
  C.v.filter(v => v.status === 'manutenção').forEach(v => al.push({ico:'🟡', tipo:'manut', msg:`${v.placa} em manutenção`}));
  calcAlertasKM().forEach(a => {
    const vencido = a.restante <= 0;
    al.push({ico: vencido?'🔴':'⚠️', tipo:'km',
      msg:`${a.v.placa} — ${a.servico}: ${vencido
        ? `<strong style="color:#dc2626">VENCIDO ${Math.abs(a.restante).toLocaleString('pt-BR')} km atrás</strong>`
        : `próximo em <strong style="color:#b45309">${a.restante.toLocaleString('pt-BR')} km</strong>`} (KM atual: ${a.kmAtual.toLocaleString('pt-BR')})`});
  });
  C.ct.filter(c => c.data_fim && new Date(c.data_fim) < new Date(Date.now() + 90*86400000))
    .forEach(c => al.push({ico:'⚠️', tipo:'ct', msg:`Contrato "${c.nome_contrato}" vence ${fd(c.data_fim)}`}));
  if (!al.length) al.push({ico:'🟢', tipo:'ok', msg:'Nenhum alerta ativo'});

  const bgMap     = {ok:'rgba(22,163,74,.08)',  km:'rgba(220,38,38,.08)',  manut:'rgba(217,119,6,.08)',  ct:'rgba(217,119,6,.08)'};
  const borderMap = {ok:'#16a34a',              km:'#ef4444',              manut:'#f59e0b',              ct:'#f59e0b'};
  document.getElementById('alertas').innerHTML = al.slice(0,10).map(a =>
    `<div style="display:flex;align-items:flex-start;gap:10px;padding:9px 12px;margin-bottom:6px;border-radius:9px;background:${bgMap[a.tipo]||bgMap.km};border-left:3px solid ${borderMap[a.tipo]||borderMap.km}">
      <span style="font-size:14px;margin-top:1px;flex-shrink:0">${a.ico}</span>
      <span style="font-size:12px;line-height:1.5;color:var(--tx)">${a.msg}</span>
    </div>`
  ).join('');

  _dispararAlertasKM();
  _dispararAlertasContrato();
}

// ── Notificações throttle ──────────────────────────────────────────────────
function _throttleKey(key) {
  const today = new Date().toISOString().slice(0,10);
  const k = `notif_${key}_${today}`;
  if (localStorage.getItem(k)) return false;
  localStorage.setItem(k,'1');
  return true;
}

function _dispararAlertasKM() {
  calcAlertasKM().filter(a => a.restante <= 0).forEach(a => {
    const key = `km_${a.v.id}_${a.servico.replace(/\s/g,'_')}`;
    if (!_throttleKey(key)) return;
    dispararNotificacao('km_manutencao_vencido', {
      placa: a.v.placa, modelo: a.v.modelo||'—',
      km_atual: a.kmAtual.toLocaleString('pt-BR'),
      km_proxima_manut: a.kmProximo.toLocaleString('pt-BR'),
      km_excedido: Math.abs(a.restante).toLocaleString('pt-BR'),
      url: window.location.origin,
    }, a.v.id);
  });
}

function _dispararAlertasContrato() {
  C.ct.filter(c => c.data_fim).forEach(c => {
    const dias = Math.ceil((new Date(c.data_fim) - Date.now()) / 86400000);
    if (dias > 90 || dias < 0) return;
    const key = `ct_${c.id}_${dias <= 30 ? '30' : '90'}`;
    if (!_throttleKey(key)) return;
    const veicsVinculados = C.v.filter(v => v.contrato_id == c.id && v.status === 'ativo').length;
    dispararNotificacao('contrato_vencendo', {
      nome_contrato: c.nome_contrato, data_fim: fd(c.data_fim),
      dias_restantes: dias, total_veiculos: veicsVinculados,
      url: window.location.origin,
    }, c.id);
  });
}

// ── Supabase Realtime ──────────────────────────────────────────────────────
let _realtimeChannel = null;
let _novoChkCount    = 0;

export function initRealtime() {
  if (_realtimeChannel) { supabase.removeChannel(_realtimeChannel); _realtimeChannel = null; }

  _realtimeChannel = supabase.channel('frotas-dashboard')
    .on('postgres_changes', { event:'UPDATE', schema:'public', table:'checklist_execucoes', filter:'status=eq.concluido' }, payload => {
      const ex = payload.new;
      const score = ex.score || 0;
      const veiculo = ex.usuario_nome ? `— ${ex.usuario_nome}` : '';
      if      (score < 70) { toast(`🚫 Check-list REPROVADO (${score}%) ${veiculo}`, 'e'); _pulseNav('nav-checklist','rd'); }
      else if (score < 90) { toast(`⚠️ Check-list com ressalvas (${score}%) ${veiculo}`, 'w'); _pulseNav('nav-checklist','ye'); }
      else                 { toast(`✅ Check-list aprovado (${score}%) ${veiculo}`, 's'); }
      _novoChkCount++;
      _setBadge('bchk', _novoChkCount);
      if (document.getElementById('checklist')?.classList.contains('active')) window.renderChecklist_desk?.();
    })
    .on('postgres_changes', { event:'INSERT', schema:'public', table:'multas' }, () => {
      toast('🚨 Nova multa registrada no sistema', 'w');
      _pulseNav('nav-multas','rd');
      window.loadAll?.();
    })
    .on('postgres_changes', { event:'UPDATE', schema:'public', table:'veiculos' }, () => { window.loadAll?.(); })
    .subscribe(status => {
      const dot = document.querySelector('.dot');
      const lbl = document.getElementById('conn-lbl');
      if (status === 'SUBSCRIBED') {
        if (dot) { dot.style.background = 'var(--a3)'; dot.classList.add('pulse'); }
        if (lbl) lbl.textContent = 'Supabase ● live';
      } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
        if (dot) { dot.style.background = 'var(--rd)'; dot.classList.remove('pulse'); }
        if (lbl) lbl.textContent = 'Reconectando...';
      }
    });
}

function _setBadge(id, n) {
  const el = document.getElementById(id);
  if (el) { el.textContent = n; el.style.display = n > 0 ? '' : 'none'; }
}
function _pulseNav(navId, color) {
  const el = document.getElementById(navId);
  if (!el) return;
  el.style.background = color === 'rd' ? 'rgba(220,38,38,.15)' : 'rgba(180,83,9,.12)';
  setTimeout(() => { el.style.background = ''; }, 4000);
}
export function stopRealtime() {
  if (_realtimeChannel) { supabase.removeChannel(_realtimeChannel); _realtimeChannel = null; }
}
export function resetChkBadge() { _novoChkCount = 0; _setBadge('bchk', 0); }

// ── Globals ────────────────────────────────────────────────────────────────
window.getDashMes            = getDashMes;
window.renderDash            = renderDash;
window.renderChart           = renderChart;
window.renderRank            = renderRank;
window.renderDashContratos   = renderDashContratos;
window.renderDashLocalidades = renderDashLocalidades;
window.calcAlertasKM         = calcAlertasKM;
window.renderAlertas         = renderAlertas;
window.toggleFiltroData      = toggleFiltroData;
window.initRealtime          = initRealtime;
window.stopRealtime          = stopRealtime;
window.resetChkBadge         = resetChkBadge;

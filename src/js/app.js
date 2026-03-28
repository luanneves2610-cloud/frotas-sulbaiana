import { C, SESSION } from './state.js';
import { now, curMonth, lov } from './utils.js';
import { sbReq } from './api.js';

export const TITLES={dashboard:'Dashboard',contratos:'Contratos',localidades:'Localidades',centros:'Centros de Custo',veiculos:'Veículos',movimentacao:'🔄 Movimentação de Veículos',checklist:'📋 Check-list de Veículos',abastecimento:'Abastecimento',manutencao:'Manutenção',multas:'🚨 Gestão de Multas',vendas:'💰 Venda de Veículos','imp-veiculos':'📥 Importar Veículos','imp-combustivel':'📥 Importar Combustível',relatorios:'Relatórios',historico:'Histórico',usuarios:'Usuários',notificacoes:'🔔 Notificações'};

export function goTo(sec,el){
  document.querySelectorAll('.section').forEach(s=>s.classList.remove('active'));
  document.querySelectorAll('.ni').forEach(n=>n.classList.remove('active'));
  document.getElementById(sec).classList.add('active');
  if(el) el.classList.add('active');
  document.getElementById('page-title').textContent=TITLES[sec]||sec;
  cPM();
  const fn={contratos:window.renderCT,localidades:window.renderLoc,veiculos:()=>{populateFiltros();window.renderV();},movimentacao:()=>{populateMovFiltros();window.renderMov();},abastecimento:()=>{populateSel();document.getElementById('fa-m').value=curMonth();window.renderA();},manutencao:()=>{populateSel();document.getElementById('fm-m').value=curMonth();window.renderM();},relatorios:()=>{window.renderRelCards();window.initGrafFiltros();},historico:loadLogs,checklist:()=>{window.renderChecklist_desk();},usuarios:window.renderU,centros:()=>{populateSel();window.renderCC();},multas:window.renderMulatas,vendas:window.renderVendas,notificacoes:()=>{window.renderNotificacoes?.();}};
  if(fn[sec]) fn[sec]();
}

export function tPM(){document.getElementById('pm').classList.toggle('open');}
export function cPM(){document.getElementById('pm').classList.remove('open');}

export const oMo=id=>document.getElementById(id).classList.add('open');
export const cMo=id=>document.getElementById(id).classList.remove('open');

export function toggleTheme(){
  const html=document.documentElement;
  const isDark=html.getAttribute('data-theme')==='dark';
  if(isDark){
    html.removeAttribute('data-theme');
    document.getElementById('theme-ico').textContent='🌙';
    document.getElementById('theme-lbl').textContent='Escuro';
    localStorage.setItem('frotas-theme','light');
  } else {
    html.setAttribute('data-theme','dark');
    document.getElementById('theme-ico').textContent='☀️';
    document.getElementById('theme-lbl').textContent='Claro';
    localStorage.setItem('frotas-theme','dark');
  }
}

// Restaurar tema salvo
(function(){
  const saved=localStorage.getItem('frotas-theme');
  if(saved==='dark'){
    document.documentElement.setAttribute('data-theme','dark');
    const ico=document.getElementById('theme-ico');
    const lbl=document.getElementById('theme-lbl');
    if(ico) ico.textContent='☀️';
    if(lbl) lbl.textContent='Claro';
  }
})();

export function populateSel(){
  const fill=(id,items,blank)=>{const el=document.getElementById(id);if(!el)return;const v=el.value;el.innerHTML=`<option value="">${blank}</option>`;items.forEach(x=>{el.innerHTML+=`<option value="${x.id}">${x.nome||x.nome_contrato||x.nome_localidade}</option>`;});el.value=v;};
  fill('mcc-ct',C.ct.filter(x=>x.status==='ativo'),'— Contrato —');
  fill('mcc-loc',C.loc.filter(x=>x.status==='ativo'),'— Localidade —');
  ['ma-v','mm-v'].forEach(id=>{fill(id,C.v.filter(x=>x.status!=='inativo'),'— Selecione —');});
  ['fa-ct','fm-ct'].forEach(id=>{const el=document.getElementById(id);if(!el)return;const v=el.value;el.innerHTML='<option value="">Todos contratos</option>';C.ct.forEach(x=>{el.innerHTML+=`<option value="${x.id}">${x.nome_contrato}</option>`;});el.value=v;});
  const fav=document.getElementById('fa-v');if(fav){const v=fav.value;fav.innerHTML='<option value="">Todos veículos</option>';C.v.forEach(x=>{fav.innerHTML+=`<option value="${x.id}">${x.placa} — ${x.modelo}</option>`;});fav.value=v;}
  const mmc=document.getElementById('mm-cc');if(mmc){const v=mmc.value;mmc.innerHTML='';C.cc.filter(x=>x.status==='ativo').forEach(x=>{mmc.innerHTML+=`<option value="${x.id}">${x.nome}</option>`;});mmc.value=v;}
}

export function populateFiltros(){
  const fill=(id,items,blank)=>{const el=document.getElementById(id);if(!el)return;const v=el.value;el.innerHTML=`<option value="">${blank}</option>`;items.forEach(x=>{el.innerHTML+=`<option value="${x.id}">${x.nome||x.nome_contrato||x.nome_localidade}</option>`;});el.value=v;};
  fill('fv-ct',C.ct,'Todos contratos');fill('fv-loc',C.loc,'Todas localidades');fill('fv-cc',C.cc,'Todos centros');
}

export function onFiltContrato(){
  const ctId=document.getElementById('fv-ct').value;
  const locEl=document.getElementById('fv-loc'),ccEl=document.getElementById('fv-cc');
  const fl=ctId?C.loc.filter(l=>C.cc.some(c=>c.contrato_id==ctId&&c.localidade_id==l.id)):C.loc;
  const fc=ctId?C.cc.filter(c=>c.contrato_id==ctId):C.cc;
  locEl.innerHTML='<option value="">Todas localidades</option>';fl.forEach(x=>{locEl.innerHTML+=`<option value="${x.id}">${x.nome_localidade}</option>`;});
  ccEl.innerHTML='<option value="">Todos centros</option>';fc.forEach(x=>{ccEl.innerHTML+=`<option value="${x.id}">${x.nome}</option>`;});
}

export function onMvContrato(){
  const ctId=document.getElementById('mv-ct').value;
  const locEl=document.getElementById('mv-loc'),ccEl=document.getElementById('mv-cc');
  locEl.innerHTML='<option value="">— Selecione —</option>';ccEl.innerHTML='<option value="">— Selecione —</option>';
  if(!ctId)return;
  const locIds=[...new Set(C.cc.filter(c=>c.contrato_id==ctId&&c.status==='ativo').map(c=>c.localidade_id))];
  C.loc.filter(l=>locIds.includes(l.id)).forEach(l=>{locEl.innerHTML+=`<option value="${l.id}">${l.nome_localidade}</option>`;});
}

export function onMvLocalidade(){
  const ctId=document.getElementById('mv-ct').value,locId=document.getElementById('mv-loc').value;
  const ccEl=document.getElementById('mv-cc');ccEl.innerHTML='<option value="">— Selecione —</option>';
  if(!ctId||!locId)return;
  C.cc.filter(c=>c.contrato_id==ctId&&c.localidade_id==locId&&c.status==='ativo').forEach(c=>{ccEl.innerHTML+=`<option value="${c.id}">${c.nome}</option>`;});
}

export function onMvStatus(){
  const st=document.getElementById('mv-st').value;
  const devBox=document.getElementById('mv-dev-box');
  if(devBox) devBox.style.display=st==='devolvido'?'block':'none';
  if(st==='devolvido'){
    const destSel=document.getElementById('mv-dev-dest');
    if(destSel){
      destSel.innerHTML='<option value="">— Selecione o destino —</option><option value="sede">🏢 Sede</option>';
      C.ct.filter(x=>x.status==='ativo').forEach(c=>{destSel.innerHTML+=`<option value="${c.id}">${c.nome_contrato}</option>`;});
    }
    document.getElementById('mv-dev-ct-box').style.display='none';
    if(!document.getElementById('mv-dev-data').value) document.getElementById('mv-dev-data').value=now();
  }
}

export function onMvDevDest(){
  document.getElementById('mv-dev-ct-box').style.display='none';
}

export function populateMovFiltros(){
  const ct=document.getElementById('fmov-ct');
  if(ct){const v=ct.value;ct.innerHTML='<option value="">Todos contratos</option>';C.ct.forEach(x=>{ct.innerHTML+=`<option value="${x.id}">${x.nome_contrato}</option>`;});ct.value=v;}
}

export async function loadLogs(){
  lov(true);
  try{
    const logs=await window.FB.getAll('logs','timestamp');
    const rev=[...logs].reverse().slice(0,150);
    const cols={success:'#16a34a',error:'#dc2626',info:'#2563eb'};
    document.getElementById('log-list').innerHTML=rev.map(l=>`<div class="litem"><div class="ldot" style="background:${cols[l.tipo]||'#94a3b8'}"></div><div style="flex:1"><strong style="font-size:13px">${l.acao}</strong><div style="color:var(--tm);font-size:11px">por ${l.usuario}</div></div><div class="ltime">${l.timestamp?new Date(l.timestamp).toLocaleString('pt-BR'):''}</div></div>`).join('')||'<div class="es"><div class="ei">📜</div><p>Sem registros</p></div>';
  }catch(e){window.toast('Erro','e');}finally{lov(false);}
}

// Setup event listeners after DOM ready
document.addEventListener('click',e=>{if(!e.target.closest('#pm')&&!e.target.closest('[onclick*="tPM"]'))cPM();});
document.querySelectorAll('.mo').forEach(o=>o.addEventListener('click',e=>{if(e.target===o)o.classList.remove('open');}));
document.getElementById('mm-nf').addEventListener('change',function(){document.getElementById('mm-nfn').textContent=this.files[0]?`📎 ${this.files[0].name}`:''});

// Make globally accessible
window.goTo = goTo;
window.tPM = tPM;
window.cPM = cPM;
window.oMo = oMo;
window.cMo = cMo;
window.toggleTheme = toggleTheme;
window.populateSel = populateSel;
window.populateFiltros = populateFiltros;
window.onFiltContrato = onFiltContrato;
window.onMvContrato = onMvContrato;
window.onMvLocalidade = onMvLocalidade;
window.onMvStatus = onMvStatus;
window.onMvDevDest = onMvDevDest;
window.populateMovFiltros = populateMovFiltros;
window.loadLogs = loadLogs;
window.TITLES = TITLES;

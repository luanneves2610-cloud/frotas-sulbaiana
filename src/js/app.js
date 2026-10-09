import { C, SESSION } from './state.js';
import { now, curMonth, lov, esc } from './utils.js';
import { sbReq } from './api.js';

export const TITLES={dashboard:'Dashboard',contratos:'Contratos',localidades:'Localidades',centros:'Centros de Custo',veiculos:'Veículos',movimentacao:'🔄 Movimentação de Veículos',checklist:'📋 Check-list de Veículos',abastecimento:'Abastecimento',manutencao:'Manutenção',multas:'🚨 Gestão de Multas',vendas:'💰 Venda de Veículos','imp-veiculos':'📥 Importar Veículos','imp-combustivel':'📥 Importar Combustível',relatorios:'Relatórios',historico:'Histórico',usuarios:'Usuários',notificacoes:'🔔 Notificações'};

export function goTo(sec,el){
  // Bloqueia seções restritas para não-admins
  if(sec==='usuarios' && SESSION?.perfil !== 'admin'){
    // Permite acesso apenas para ver o próprio cadastro
    // renderU() já filtra — deixa passar mas não executa nenhuma ação restrita
  }
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
  const body=document.body;
  const isDark=html.getAttribute('data-theme')==='dark';
  if(isDark){
    // → Modo Claro
    html.removeAttribute('data-theme');
    body.classList.add('light');
    body.classList.remove('dark');
    document.getElementById('theme-ico').textContent='🌙';
    document.getElementById('theme-lbl').textContent='Escuro';
    localStorage.setItem('frotas-theme','light');
  } else {
    // → Modo Escuro
    html.setAttribute('data-theme','dark');
    body.classList.add('dark');
    body.classList.remove('light');
    document.getElementById('theme-ico').textContent='☀️';
    document.getElementById('theme-lbl').textContent='Claro';
    localStorage.setItem('frotas-theme','dark');
  }
}

// Restaurar tema salvo
(function(){
  const saved=localStorage.getItem('frotas-theme');
  const body=document.body;
  if(saved==='dark'){
    document.documentElement.setAttribute('data-theme','dark');
    body.classList.add('dark');
    body.classList.remove('light');
    const ico=document.getElementById('theme-ico');
    const lbl=document.getElementById('theme-lbl');
    if(ico) ico.textContent='☀️';
    if(lbl) lbl.textContent='Claro';
  } else {
    // Padrão: sidebar escura (sem classe → body:not(.light) = dark sidebar)
    body.classList.remove('light','dark');
  }
})();

// Monta todas as <option> numa string e atribui innerHTML UMA vez só.
// O padrão anterior — `el.innerHTML += ...` dentro do forEach — faz o navegador
// re-serializar e re-analisar o select inteiro a cada item: custo quadrático.
// Com 402 veículos distribuídos em 3 selects, isso levava segundos e rodava a
// cada tecla digitada na busca da aba Manutenção (medido: 8,4 s → 51 ms).
const _setOpts=(el,items,lbl,blank)=>{
  if(!el)return;
  const v=el.value;
  el.innerHTML=(blank!=null?`<option value="">${blank}</option>`:'')
    +items.map(x=>`<option value="${x.id}">${lbl(x)}</option>`).join('');
  el.value=v;
};
const _nomeGen=x=>x.nome||x.nome_contrato||x.nome_localidade;

export function populateSel(){
  const $=id=>document.getElementById(id);
  _setOpts($('mcc-ct'),C.ct.filter(x=>x.status==='ativo'),_nomeGen,'— Contrato —');
  _setOpts($('mcc-loc'),C.loc.filter(x=>x.status==='ativo'),_nomeGen,'— Localidade —');
  const vAtivos=C.v.filter(x=>x.status!=='inativo');
  ['ma-v','mm-v'].forEach(id=>_setOpts($(id),vAtivos,_nomeGen,'— Selecione —'));
  ['fa-ct','fm-ct'].forEach(id=>_setOpts($(id),C.ct,x=>x.nome_contrato,'Todos contratos'));
  _setOpts($('fa-v'),C.v,x=>`${x.placa} — ${x.modelo}`,'Todos veículos');
  _setOpts($('mm-cc'),C.cc.filter(x=>x.status==='ativo'),x=>x.nome,null);
}

export function populateFiltros(){
  const $=id=>document.getElementById(id);
  _setOpts($('fv-ct'),C.ct,_nomeGen,'Todos contratos');
  _setOpts($('fv-loc'),C.loc,_nomeGen,'Todas localidades');
  _setOpts($('fv-cc'),C.cc,_nomeGen,'Todos centros');
}

export function onFiltContrato(){
  const ctId=document.getElementById('fv-ct').value;
  const locEl=document.getElementById('fv-loc'),ccEl=document.getElementById('fv-cc');
  const fl=ctId?C.loc.filter(l=>C.cc.some(c=>c.contrato_id==ctId&&c.localidade_id==l.id)):C.loc;
  const fc=ctId?C.cc.filter(c=>c.contrato_id==ctId):C.cc;
  locEl.innerHTML='<option value="">Todas localidades</option>'+fl.map(x=>`<option value="${x.id}">${x.nome_localidade}</option>`).join('');
  ccEl.innerHTML='<option value="">Todos centros</option>'+fc.map(x=>`<option value="${x.id}">${x.nome}</option>`).join('');
}

// Centro de custo deixou de depender da localidade escolhida. Antes a lista só
// mostrava os centros com o MESMO localidade_id, o que obrigava centro e
// localidade a andarem casados pelo nome. Agora a lista traz todos os centros
// ativos do contrato, e qualquer um pode ser alocado em qualquer localidade.
// O campo centros_custo.localidade_id continua existindo (é o que liga contrato
// a localidade na aba Localidades e no acesso do usuário não-admin), mas não
// restringe mais o cadastro do veículo.
export function preencherCCdoContrato(ccEl,ctId,manter,locId){
  if(!ccEl)return;
  const atual = manter!=null ? String(manter) : ccEl.value;
  const locSel = locId!=null ? String(locId) : (document.getElementById('mv-loc')?.value||'');
  const busca = (document.getElementById('mv-cc-busca')?.value||'').trim().toLowerCase();

  let ccs=C.cc.filter(c=>c.contrato_id==ctId&&c.status==='ativo');
  if(busca) ccs=ccs.filter(c=>
    (c.nome||'').toLowerCase().includes(busca) ||
    (window.gLoc(c.localidade_id).nome_localidade||'').toLowerCase().includes(busca));

  // Centros da localidade escolhida vêm primeiro: é o caso de 100% dos
  // veículos hoje, então o mais provável fica a um clique. Os demais ficam
  // agrupados por localidade, com 📍 marcando que a alocação é cruzada.
  const daLoc  = locSel ? ccs.filter(c=>String(c.localidade_id)===locSel) : [];
  const idsLoc = new Set(daLoc.map(c=>c.id));
  const outros = ccs.filter(c=>!idsLoc.has(c.id));

  const opt=(c,cruzado)=>`<option value="${c.id}">${esc(c.nome)}${cruzado?' 📍':''}</option>`;
  let html='<option value="">— Selecione —</option>';
  if(daLoc.length) html+=`<optgroup label="Centros desta localidade">${daLoc.map(c=>opt(c,false)).join('')}</optgroup>`;

  const porLoc=new Map();
  outros.forEach(c=>{
    const nome=window.gLoc(c.localidade_id).nome_localidade||'(sem localidade)';
    if(!porLoc.has(nome)) porLoc.set(nome,[]);
    porLoc.get(nome).push(c);
  });
  [...porLoc.entries()].sort((a,b)=>a[0].localeCompare(b[0])).forEach(([nome,arr])=>{
    html+=`<optgroup label="📍 ${esc(nome)}">${arr.map(c=>opt(c,true)).join('')}</optgroup>`;
  });

  // Centro já gravado no veículo que não esteja na lista (inativo, de outro
  // contrato, ou escondido pela busca) continua selecionável, para a edição
  // não apagá-lo em silêncio.
  if(atual&&!ccs.some(c=>String(c.id)===atual)){
    const cc=C.cc.find(c=>String(c.id)===atual);
    if(cc) html+=`<optgroup label="Centro atual do veículo"><option value="${cc.id}">${esc(cc.nome)}</option></optgroup>`;
  }
  ccEl.innerHTML=html;
  ccEl.value=atual||'';
}

// Rebusca a lista mantendo o centro já escolhido (chamada pelo campo de busca).
export function buscarCC(){
  const ct=document.getElementById('mv-ct')?.value;
  preencherCCdoContrato(document.getElementById('mv-cc'),ct);
}

export function onMvContrato(){
  const ctId=document.getElementById('mv-ct').value;
  const locEl=document.getElementById('mv-loc'),ccEl=document.getElementById('mv-cc');
  locEl.innerHTML='<option value="">— Selecione —</option>';
  ccEl.innerHTML='<option value="">— Selecione —</option>';
  if(!ctId)return;
  // Localidades do contrato primeiro; as demais logo abaixo, porque 25 das 104
  // não têm centro de custo nenhum e eram inalcançáveis no cadastro de veículo.
  const doCt=new Set(C.cc.filter(c=>c.contrato_id==ctId&&c.status==='ativo').map(c=>String(c.localidade_id)));
  const ativas=C.loc.filter(l=>l.status==='ativo');
  const dentro=ativas.filter(l=>doCt.has(String(l.id)));
  const fora  =ativas.filter(l=>!doCt.has(String(l.id)));
  const grupo=(rot,arr)=>arr.length?`<optgroup label="${rot}">`+arr.map(l=>`<option value="${l.id}">${esc(l.nome_localidade)}</option>`).join('')+'</optgroup>':'';
  locEl.innerHTML+=grupo('Localidades do contrato',dentro)+grupo('Outras localidades',fora);
  preencherCCdoContrato(ccEl,ctId,'');
}

export function onMvLocalidade(){
  // A localidade não filtra mais os centros — só garante que a lista do
  // contrato esteja carregada, preservando o que já estiver selecionado.
  const ctId=document.getElementById('mv-ct').value;
  const ccEl=document.getElementById('mv-cc');
  if(!ccEl)return;
  if(!ctId){ccEl.innerHTML='<option value="">— Selecione —</option>';return;}
  preencherCCdoContrato(ccEl,ctId);
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
window.preencherCCdoContrato = preencherCCdoContrato;
window.buscarCC = buscarCC;
window.onMvContrato = onMvContrato;
window.onMvLocalidade = onMvLocalidade;
window.onMvStatus = onMvStatus;
window.onMvDevDest = onMvDevDest;
window.populateMovFiltros = populateMovFiltros;
window.loadLogs = loadLogs;
window.TITLES = TITLES;

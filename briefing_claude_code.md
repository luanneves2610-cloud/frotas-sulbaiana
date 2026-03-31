# BRIEFING — SISTEMA FROTAS SULBAIANA EMPREENDIMENTOS
## Para o Claude Code dar continuidade ao desenvolvimento

---

## 1. CONTEXTO DO SISTEMA

**Nome:** FROTAS — Sulbaiana Empreendimentos
**Tipo:** Sistema de gestão de frota corporativa
**Stack atual:** Single-file HTML + CSS + JS puro | Supabase (PostgreSQL + REST API)
**Deploy:** GitHub → Vercel (deploy automático)
**URLs:**
- Sistema: https://frotas-sulbaiana.vercel.app/
- Check-list mobile: https://frotas-sulbaiana.vercel.app/checklist.html
- Supabase: https://kjblegripbhbrttejiyv.supabase.co

---

## 2. ARQUIVOS ANEXADOS

| Arquivo | Descrição |
|---|---|
| `index.html` | Sistema principal (~4600 linhas, single-file) |
| `checklist.html` | Aplicativo mobile do check-list (~490 linhas) |
| `sulbaiana_frotas_completo_v7.sql` | SQL completo com todas as tabelas e dados iniciais |

---

## 3. CREDENCIAIS (apenas para referência de desenvolvimento)

- **Supabase URL:** https://kjblegripbhbrttejiyv.supabase.co
- **Anon Key:** eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtqYmxlZ3JpcGJoYnJ0dGVqaXl2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI2MzIyMTQsImV4cCI6MjA4ODIwODIxNH0.OdyBIFPqSd9NyXwsIAQVhVl2vYln9A_wBtmcJ84ty5c
- **Login admin:** admin@sulbaiana.com.br / admin123
- **GitHub:** github.com/luanneves2610-cloud/frotas-sulbaiana

---

## 4. BANCO DE DADOS — TABELAS EXISTENTES

```
contratos              → clientes/contratos da empresa
localidades            → locais de operação
centros_custo          → centros de custo por contrato
usuarios               → usuários do sistema (perfis: admin, financeiro, operacional, consulta)
veiculos               → frota completa
abastecimentos         → lançamentos de combustível
manutencoes            → ordens de serviço
multas                 → infrações de trânsito
vendas                 → venda de veículos
movimentacoes_veiculos → entradas, saídas, transferências
logs                   → histórico de ações
checklist_itens        → template dos 26 itens do check-list
checklist_execucoes    → execuções geradas (token, status, score)
checklist_respostas    → respostas por item de cada execução
checklist_fotos        → fotos em base64 (item + 4 posições do veículo)
```

**Campos importantes em `veiculos`:**
- `status`: ativo | manutenção | inativo | devolvido | disp. para venda | vendido
- `tipo_frota`: propria | locada
- `classificacao`: producao | unidade_fixa
- `locador_nome`, `locador_email`, `locador_fone` (quando locada)

---

## 5. ARQUITETURA ATUAL

```
index.html (single-file ~306KB)
├── CSS completo (variáveis, dark mode, componentes)
├── HTML (sidebar, topbar, todas as seções/modais)
└── JavaScript (~3500 linhas)
    ├── Supabase REST API (fetch direto, sem SDK)
    ├── FB.add/upd/del/getAll → camada sobre sbReq()
    ├── Cache global: C = {v, ct, loc, cc, a, m, u, mt, vd, mov}
    ├── SESSION → sessionStorage como JSON
    └── Funções por módulo: renderV(), salvarV(), editV()...

checklist.html (mobile, ~490 linhas)
├── Fluxo: Confirmar Veículo → Check-list → Fotos → Score
├── Acesso via token único na URL: ?t=TOKEN
└── Comunica com Supabase diretamente via fetch
```

---

## 6. FUNCIONALIDADES IMPLEMENTADAS

- ✅ Dashboard com KPIs, gráfico de gastos, ranking de custos, alertas de KM
- ✅ Dark/Light mode com toggle (preferência salva em localStorage)
- ✅ Menu lateral escuro com ícones SVG (estilo Linear/GitHub)
- ✅ CRUD: Contratos, Localidades, Centros de Custo, Veículos, Usuários
- ✅ Movimentação de veículos (entrada, saída, transferência, devolução, venda)
- ✅ Abastecimento e Manutenção (OS com tipos específicos)
- ✅ Multas com upload de CNH
- ✅ Venda de veículos com cálculo de resultado
- ✅ Check-list digital: QR Code + link, execução mobile, score automático
- ✅ Relatórios + gráficos (Chart.js) + exportação Excel nativo
- ✅ Importação em massa via Excel (veículos e combustível)
- ✅ Controle de acesso por perfil (admin/financeiro/operacional/consulta)
- ✅ Filtro de dados por contrato (operacional só vê seu contrato)
- ✅ Status "disp. para venda" nos veículos
- ✅ Tipo de frota: própria/locada com dados do locador
- ✅ Redefinição de senha pelo admin

---

## 7. MELHORIAS SOLICITADAS — PRIORIDADE ALTA

### 7.1 Migrar de single-file para projeto organizado

**Objetivo:** Separar o `index.html` em arquivos organizados por módulo para facilitar manutenção e evitar limitações de tamanho.

**Estrutura sugerida:**
```
frotas-sulbaiana/
├── index.html              ← entrada principal (apenas estrutura HTML)
├── checklist.html          ← app mobile (manter separado)
├── src/
│   ├── css/
│   │   ├── base.css        ← variáveis, reset, dark mode
│   │   ├── layout.css      ← sidebar, topbar, content
│   │   ├── components.css  ← botões, badges, modais, tabelas
│   │   └── dashboard.css   ← KPIs, gráficos, ranking
│   └── js/
│       ├── config.js       ← Supabase URL/KEY, constantes
│       ├── api.js          ← sbReq, FB.add/upd/del/getAll
│       ├── auth.js         ← login, logout, SESSION, setupUI
│       ├── app.js          ← init, loadAll, goTo, cache C
│       ├── dashboard.js    ← renderDash, charts, alertas, ranking
│       ├── veiculos.js     ← renderV, salvarV, editV, importação
│       ├── movimentacao.js ← renderMov, salvarMov, abrirMMov
│       ├── checklist.js    ← renderChecklist_desk, gerarToken, QR
│       ├── manutencao.js   ← renderM, salvarM, OS
│       ├── abastecimento.js← renderA, salvarA
│       ├── multas.js       ← renderMulatas, salvarMulta
│       ├── relatorios.js   ← previewRel, exportarExcel, gráficos
│       ├── usuarios.js     ← renderU, salvarU, senha
│       └── utils.js        ← fd(), cur(), now(), toast(), lov()
└── vite.config.js          ← ou webpack se preferir bundler
```

**Importante:** O sistema usa Supabase via fetch direto (sem SDK). Manter essa abordagem ou migrar para @supabase/supabase-js.

---

### 7.2 Autenticação real com Supabase Auth

**Problema atual:** Senhas armazenadas em texto puro na tabela `usuarios`. Login feito via query SQL simples.

**Objetivo:** Migrar para Supabase Auth nativo.

**O que mudar:**
1. Criar usuários via `supabase.auth.signUp()` vinculados à tabela `usuarios`
2. Login via `supabase.auth.signInWithPassword()`
3. Sessão gerenciada pelo Supabase (não mais sessionStorage manual)
4. RLS policies usar `auth.uid()` em vez de anon total
5. Manter a tabela `usuarios` com perfil, contrato_id e status (dados extras)
6. Tela de recuperação de senha via e-mail (Supabase Auth já suporta)

**Atenção:** Hoje há um usuário admin@sulbaiana.com.br que precisa ser migrado. Os demais usuários cadastrados também precisam ser migrados.

---

### 7.3 Upload real de fotos no Supabase Storage

**Problema atual:** Fotos do check-list ficam em base64 na coluna `dados_base64` da tabela `checklist_fotos`. Isso gera registros enormes e desperdiça espaço do banco.

**Objetivo:** Migrar para Supabase Storage.

**Estrutura de buckets sugerida:**
```
checklist-fotos/
├── {execucao_id}/
│   ├── item_{resposta_id}_{n}.jpg    ← fotos de não conformidades
│   ├── frente.jpg
│   ├── traseira.jpg
│   ├── lateral_esq.jpg
│   ├── lateral_dir.jpg
│   └── extra_{n}.jpg
```

**O que mudar:**
1. Criar bucket `checklist-fotos` no Supabase Storage (público ou com signed URLs)
2. No `checklist.html`: substituir base64 por upload direto ao Storage
3. Na tabela `checklist_fotos`: substituir `dados_base64 TEXT` por `url TEXT`
4. No sistema desktop (verDetalhesChk): carregar fotos via URL em vez de base64
5. Manter compressão de imagem antes do upload (já implementada)

---

## 8. MELHORIAS SOLICITADAS — PRIORIDADE MÉDIA

### 8.1 Notificações automáticas

**Gatilhos:**
- Check-list reprovado (score < 70%)
- Check-list com ressalvas (score 70-89%)
- Multa registrada
- KM de manutenção vencido
- Contrato vencendo em 90 dias

**Sugestão de implementação:**
- Supabase Edge Functions + Resend (e-mail) ou Twilio (WhatsApp/SMS)
- Tabela `notificacoes_config` para o admin definir quem recebe o quê

---

### 8.2 PWA — Progressive Web App para o check-list mobile

**Objetivo:** Transformar o `checklist.html` em PWA instalável no celular.

**Implementar:**
1. `manifest.json` com ícone, nome, cor do tema
2. `service-worker.js` para cache offline dos assets
3. Estratégia offline: salvar respostas em IndexedDB e sincronizar quando voltar a internet
4. Botão "Instalar app" na tela de confirmação do check-list

---

### 8.3 Exportar check-list em PDF

**Objetivo:** Gerar PDF do check-list concluído com layout profissional.

**Conteúdo do PDF:**
- Cabeçalho: logo Sulbaiana, placa, modelo, data, KM, usuário
- Score em destaque com classificação
- Tabela de itens agrupada por categoria (OK/NÃO/N/A)
- Fotos das não conformidades (thumbnail)
- Fotos gerais do veículo (4 posições em grid)
- Geolocalização e horário de início/fim
- Rodapé com assinatura

**Sugestão:** jsPDF + html2canvas, ou Puppeteer em Edge Function.

---

### 8.4 Dashboard com dados em tempo real

**Objetivo:** Atualizar KPIs e alertas automaticamente sem precisar recarregar a página.

**Implementar:**
- Supabase Realtime para as tabelas `veiculos`, `manutencoes`, `checklist_execucoes`
- Indicador visual de "novo dado" quando algum check-list for concluído
- Notificação toast quando alerta de KM for detectado

---

## 9. PADRÕES DE CÓDIGO ATUAIS (manter)

```javascript
// Supabase fetch direto (sem SDK)
async function sbReq(method, table, data, query) {
  const url = `${SB_URL}/rest/v1/${table}?${query}`;
  const opts = { method, headers: { ...SB_H } };
  if (data) opts.body = JSON.stringify(data);
  const r = await fetch(url, opts);
  if (!r.ok) throw new Error(await r.text());
  if (method === 'DELETE' || r.status === 204) return true;
  return r.json();
}

// Cache global
const C = { v:[], ct:[], loc:[], cc:[], a:[], m:[], u:[], mt:[], vd:[], mov:[] };

// SESSION no sessionStorage
SESSION = JSON.parse(sessionStorage.getItem('frotas_session'));

// Utilitários
const fd = d => { /* formatar data pt-BR */ };
const cur = v => { /* formatar moeda R$ */ };
const now = () => { /* datetime local ISO */ };
```

---

## 10. DESIGN SYSTEM ATUAL

```css
/* Variáveis principais */
:root {
  --bg:#f1f5f9; --s1:#ffffff; --s2:#f8fafc;
  --b1:#e2e8f0; --b2:#cbd5e1;
  --ac:#1d6fdf;  /* azul principal */
  --tx:#0f172a; --tm:#475569; --td:#94a3b8;
  --sw:264px;    /* largura sidebar */

  /* Sidebar sempre escura */
  --sb-bg:#0f172a; --sb-s1:#1e293b; --sb-s2:#334155;
  --sb-ac:#3b82f6;
}

/* Dark mode */
[data-theme="dark"] {
  --bg:#0a0f1e; --s1:#111827; --s2:#1f2937;
  --b1:#1f2937; --b2:#374151;
  --tx:#f1f5f9; --tm:#94a3b8;
}
```

**Fontes:** Inter (corpo), Space Grotesk (títulos/valores), JetBrains Mono (placas/códigos)
**Ícones:** SVG inline estilo Heroicons/Lucide (stroke 1.8px, sem emojis no menu)
**Biblioteca de gráficos:** Chart.js 4.x (já carregada via CDN)
**QR Code:** qrcodejs (já carregada via CDN)

---

## 11. PONTOS DE ATENÇÃO

1. **Comparação de IDs:** usar `==` (loose) pois Supabase retorna bigint e o JS pode ter string
2. **Datas:** usar hora local, não UTC (função `now()` customizada)
3. **Filtro de contrato:** usuários operacional/consulta só veem dados do seu `contrato_id`
4. **Status de veículos:** ativo | manutenção | inativo | devolvido | disp. para venda | vendido
5. **Constraint no banco:** `veiculos_status_check` já atualizada para incluir "disp. para venda"
6. **Check-list:** tabelas com constraint UNIQUE em `descricao` (itens) e `(execucao_id, item_id)` (respostas)
7. **Dark mode:** sidebar é SEMPRE escura independente do tema escolhido pelo usuário

---

## 12. SEQUÊNCIA RECOMENDADA DE IMPLEMENTAÇÃO

```
1. Refatorar para projeto organizado (base para tudo)
   └── Usar Vite ou apenas separar em múltiplos JS com ES modules

2. Migrar autenticação para Supabase Auth
   └── Atualizar RLS policies no banco

3. Migrar fotos para Supabase Storage
   └── Atualizar tabela checklist_fotos (dados_base64 → url)

4. PWA no checklist.html
   └── service-worker + manifest + IndexedDB offline

5. Export PDF do check-list
   └── jsPDF ou Edge Function com Puppeteer

6. Notificações
   └── Edge Functions + Resend

7. Realtime no dashboard
   └── Supabase Realtime subscriptions
```

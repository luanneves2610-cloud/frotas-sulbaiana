-- ============================================================
-- SQL COMPLETO — FROTAS SULBAIANA EMPREENDIMENTOS
-- Versão final consolidada — todas as tabelas, constraints,
-- índices, RLS e dados iniciais
-- Execute no Supabase → SQL Editor → Nova aba → RUN
-- ⚠️  ATENÇÃO: Este script usa CREATE TABLE IF NOT EXISTS e
--     ALTER ... IF NOT EXISTS — seguro para rodar em banco
--     existente com dados. NÃO apaga nenhum dado.
-- ============================================================

-- ============================================================
-- 1. CONTRATOS
-- ============================================================
CREATE TABLE IF NOT EXISTS contratos (
  id              BIGSERIAL PRIMARY KEY,
  nome_contrato   TEXT NOT NULL,
  numero_contrato TEXT,
  descricao       TEXT,
  data_inicio     DATE,
  data_fim        DATE,
  status          TEXT DEFAULT 'ativo' CHECK (status IN ('ativo','inativo')),
  criado_em       TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 2. LOCALIDADES
-- ============================================================
CREATE TABLE IF NOT EXISTS localidades (
  id               BIGSERIAL PRIMARY KEY,
  nome_localidade  TEXT NOT NULL,
  cidade           TEXT,
  estado           TEXT DEFAULT 'BA',
  descricao        TEXT,
  status           TEXT DEFAULT 'ativo' CHECK (status IN ('ativo','inativo')),
  contrato_id      BIGINT REFERENCES contratos(id) ON DELETE SET NULL,
  criado_em        TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 3. CENTROS DE CUSTO
-- ============================================================
CREATE TABLE IF NOT EXISTS centros_custo (
  id             BIGSERIAL PRIMARY KEY,
  nome           TEXT NOT NULL,
  descricao      TEXT,
  contrato_id    BIGINT REFERENCES contratos(id) ON DELETE SET NULL,
  localidade_id  BIGINT REFERENCES localidades(id) ON DELETE SET NULL,
  status         TEXT DEFAULT 'ativo' CHECK (status IN ('ativo','inativo')),
  criado_em      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 4. USUÁRIOS
-- ============================================================
CREATE TABLE IF NOT EXISTS usuarios (
  id             BIGSERIAL PRIMARY KEY,
  nome           TEXT NOT NULL,
  email          TEXT UNIQUE NOT NULL,
  senha          TEXT NOT NULL,
  perfil         TEXT DEFAULT 'operacional' CHECK (perfil IN ('admin','financeiro','operacional','consulta')),
  status         TEXT DEFAULT 'ativo' CHECK (status IN ('ativo','inativo')),
  contrato_id    BIGINT REFERENCES contratos(id) ON DELETE SET NULL,
  data_criacao   TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 5. VEÍCULOS
-- ============================================================
CREATE TABLE IF NOT EXISTS veiculos (
  id               BIGSERIAL PRIMARY KEY,
  placa            TEXT NOT NULL,
  modelo           TEXT NOT NULL,
  ano              INTEGER,
  tipo             TEXT DEFAULT 'MOTO',
  cor              TEXT,
  renavan          TEXT,
  contrato_id      BIGINT REFERENCES contratos(id) ON DELETE SET NULL,
  localidade_id    BIGINT REFERENCES localidades(id) ON DELETE SET NULL,
  centro_custo_id  BIGINT REFERENCES centros_custo(id) ON DELETE SET NULL,
  responsavel      TEXT,
  status           TEXT DEFAULT 'ativo'
                   CHECK (status IN ('ativo','manutenção','inativo','devolvido','vendido','disp. para venda')),
  km_atual         INTEGER DEFAULT 0,
  cliente          TEXT,
  obs              TEXT,
  classificacao    TEXT DEFAULT 'producao' CHECK (classificacao IN ('producao','unidade_fixa')),
  -- Medição (para unidade fixa)
  med_nome         TEXT,
  med_unidade      TEXT,
  med_leitura      NUMERIC(12,3),
  med_local        TEXT,
  -- Tipo de frota
  tipo_frota       TEXT DEFAULT 'propria' CHECK (tipo_frota IN ('propria','locada')),
  locador_nome     TEXT,
  locador_email    TEXT,
  locador_fone     TEXT,
  -- Devolução
  data_devolucao   DATE,
  km_devolucao     INTEGER,
  destino_devolucao TEXT,
  obs_devolucao    TEXT,
  -- Venda
  data_venda       DATE,
  valor_venda      NUMERIC(12,2),
  comprador        TEXT,
  -- Controle
  data_cadastro    TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 6. ABASTECIMENTOS
-- ============================================================
CREATE TABLE IF NOT EXISTS abastecimentos (
  id               BIGSERIAL PRIMARY KEY,
  veiculo_id       BIGINT NOT NULL REFERENCES veiculos(id) ON DELETE CASCADE,
  data             DATE NOT NULL,
  km_atual         INTEGER NOT NULL,
  litros           NUMERIC(10,3) NOT NULL,
  valor_total      NUMERIC(12,2) NOT NULL,
  tipo_combustivel TEXT,
  posto            TEXT,
  usuario_id       BIGINT REFERENCES usuarios(id) ON DELETE SET NULL,
  data_lancamento  TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 7. MANUTENÇÕES (Ordens de Serviço)
-- ============================================================
CREATE TABLE IF NOT EXISTS manutencoes (
  id               BIGSERIAL PRIMARY KEY,
  veiculo_id       BIGINT NOT NULL REFERENCES veiculos(id) ON DELETE CASCADE,
  tipo_servico     TEXT NOT NULL,
  descricao        TEXT,
  data             DATE NOT NULL,
  km               INTEGER,
  valor            NUMERIC(12,2) NOT NULL,
  nf               TEXT,
  centro_custo_id  BIGINT REFERENCES centros_custo(id) ON DELETE SET NULL,
  usuario_id       BIGINT REFERENCES usuarios(id) ON DELETE SET NULL,
  data_lancamento  TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 8. MULTAS
-- ============================================================
CREATE TABLE IF NOT EXISTS multas (
  id               BIGSERIAL PRIMARY KEY,
  veiculo_id       BIGINT NOT NULL REFERENCES veiculos(id) ON DELETE CASCADE,
  numero_multa     TEXT NOT NULL,
  data_infracao    DATE NOT NULL,
  hora_infracao    TEXT,
  tipo_infracao    TEXT,
  local_infracao   TEXT NOT NULL,
  orgao_autuador   TEXT NOT NULL,
  condutor         TEXT,
  valor            NUMERIC(12,2) NOT NULL,
  pontuacao        INTEGER DEFAULT 0,
  status           TEXT DEFAULT 'recebida'
                   CHECK (status IN ('recebida','aguardando indicação','condutor indicado','em recurso','paga','vencida')),
  obs              TEXT,
  arquivo_pdf      TEXT,
  arquivo_foto     TEXT,
  arquivo_comp     TEXT,
  arquivo_cnh      TEXT,
  contrato_id      BIGINT REFERENCES contratos(id) ON DELETE SET NULL,
  localidade_id    BIGINT REFERENCES localidades(id) ON DELETE SET NULL,
  usuario_id       BIGINT REFERENCES usuarios(id) ON DELETE SET NULL,
  data_lancamento  TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 9. VENDAS DE VEÍCULOS
-- ============================================================
CREATE TABLE IF NOT EXISTS vendas (
  id               BIGSERIAL PRIMARY KEY,
  veiculo_id       BIGINT NOT NULL REFERENCES veiculos(id) ON DELETE CASCADE,
  data_venda       DATE NOT NULL,
  valor_venda      NUMERIC(12,2) NOT NULL,
  comprador        TEXT NOT NULL,
  forma_pagamento  TEXT,
  obs              TEXT,
  custo_total      NUMERIC(12,2),
  resultado        NUMERIC(12,2),
  usuario_id       BIGINT REFERENCES usuarios(id) ON DELETE SET NULL,
  data_lancamento  TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 10. MOVIMENTAÇÕES DE VEÍCULOS
-- ============================================================
CREATE TABLE IF NOT EXISTS movimentacoes_veiculos (
  id                  BIGSERIAL PRIMARY KEY,
  veiculo_id          BIGINT NOT NULL REFERENCES veiculos(id) ON DELETE CASCADE,
  data_movimentacao   DATE NOT NULL,
  tipo_movimentacao   TEXT NOT NULL
                      CHECK (tipo_movimentacao IN (
                        'Entrada','Transferência','Devolução',
                        'Saída para manutenção','Retorno de manutenção','Venda'
                      )),
  origem              TEXT NOT NULL,
  destino             TEXT NOT NULL,
  km                  INTEGER DEFAULT 0,
  observacao          TEXT,
  usuario_responsavel TEXT,
  usuario_id          BIGINT REFERENCES usuarios(id) ON DELETE SET NULL,
  novo_contrato_id    BIGINT REFERENCES contratos(id) ON DELETE SET NULL,
  criado_em           TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 11. LOGS / HISTÓRICO
-- ============================================================
CREATE TABLE IF NOT EXISTS logs (
  id         BIGSERIAL PRIMARY KEY,
  acao       TEXT NOT NULL,
  usuario    TEXT,
  tipo       TEXT DEFAULT 'info',
  criado_em  TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 12. CHECK-LIST — ITENS (template)
-- ============================================================
CREATE TABLE IF NOT EXISTS checklist_itens (
  id          BIGSERIAL PRIMARY KEY,
  categoria   TEXT NOT NULL,
  descricao   TEXT NOT NULL,
  obrigatorio BOOLEAN DEFAULT true,
  ativo       BOOLEAN DEFAULT true,
  ordem       INTEGER DEFAULT 0,
  CONSTRAINT chk_itens_descricao_unique UNIQUE (descricao)
);

-- ============================================================
-- 13. CHECK-LIST — EXECUÇÕES
-- ============================================================
CREATE TABLE IF NOT EXISTS checklist_execucoes (
  id                BIGSERIAL PRIMARY KEY,
  token             TEXT UNIQUE NOT NULL,
  veiculo_id        BIGINT REFERENCES veiculos(id) ON DELETE CASCADE,
  movimentacao_id   BIGINT REFERENCES movimentacoes_veiculos(id) ON DELETE SET NULL,
  tipo              TEXT DEFAULT 'independente'
                    CHECK (tipo IN ('independente','movimentacao')),
  tipo_movimentacao TEXT,
  status            TEXT DEFAULT 'pendente'
                    CHECK (status IN ('pendente','em_andamento','concluido','expirado')),
  score             NUMERIC(5,2),
  classificacao     TEXT,
  usuario_id        BIGINT REFERENCES usuarios(id) ON DELETE SET NULL,
  usuario_nome      TEXT,
  km_veiculo        INTEGER,
  latitude          NUMERIC(10,7),
  longitude         NUMERIC(10,7),
  inicio_em         TIMESTAMPTZ,
  fim_em            TIMESTAMPTZ,
  expira_em         TIMESTAMPTZ,
  criado_em         TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 14. CHECK-LIST — RESPOSTAS
-- ============================================================
CREATE TABLE IF NOT EXISTS checklist_respostas (
  id           BIGSERIAL PRIMARY KEY,
  execucao_id  BIGINT NOT NULL REFERENCES checklist_execucoes(id) ON DELETE CASCADE,
  item_id      BIGINT NOT NULL REFERENCES checklist_itens(id) ON DELETE CASCADE,
  resposta     TEXT CHECK (resposta IN ('OK','NÃO','N/A')),
  observacao   TEXT,
  criado_em    TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT chk_resp_exec_item_unique UNIQUE (execucao_id, item_id)
);

-- ============================================================
-- 15. CHECK-LIST — FOTOS
-- ============================================================
CREATE TABLE IF NOT EXISTS checklist_fotos (
  id           BIGSERIAL PRIMARY KEY,
  execucao_id  BIGINT NOT NULL REFERENCES checklist_execucoes(id) ON DELETE CASCADE,
  resposta_id  BIGINT REFERENCES checklist_respostas(id) ON DELETE CASCADE,
  tipo         TEXT DEFAULT 'item'
               CHECK (tipo IN ('item','frente','traseira','lateral_esq','lateral_dir','extra')),
  nome_arquivo TEXT,
  dados_base64 TEXT,
  criado_em    TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 16. ROW LEVEL SECURITY (RLS) — acesso anon para todas as tabelas
-- ============================================================
DO $$ DECLARE t TEXT;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'contratos','localidades','centros_custo','usuarios','veiculos',
    'abastecimentos','manutencoes','multas','vendas','movimentacoes_veiculos',
    'logs','checklist_itens','checklist_execucoes','checklist_respostas','checklist_fotos'
  ]) LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies WHERE tablename = t AND policyname = 'anon_all_' || t
    ) THEN
      EXECUTE format(
        'CREATE POLICY "anon_all_%s" ON %I FOR ALL TO anon USING (true) WITH CHECK (true)', t, t
      );
    END IF;
  END LOOP;
END $$;

-- ============================================================
-- 17. ÍNDICES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_veiculos_contrato      ON veiculos(contrato_id);
CREATE INDEX IF NOT EXISTS idx_veiculos_localidade     ON veiculos(localidade_id);
CREATE INDEX IF NOT EXISTS idx_veiculos_status         ON veiculos(status);
CREATE INDEX IF NOT EXISTS idx_veiculos_placa          ON veiculos(placa);
CREATE INDEX IF NOT EXISTS idx_abast_veiculo           ON abastecimentos(veiculo_id);
CREATE INDEX IF NOT EXISTS idx_abast_data              ON abastecimentos(data);
CREATE INDEX IF NOT EXISTS idx_manut_veiculo           ON manutencoes(veiculo_id);
CREATE INDEX IF NOT EXISTS idx_manut_data              ON manutencoes(data);
CREATE INDEX IF NOT EXISTS idx_multas_veiculo          ON multas(veiculo_id);
CREATE INDEX IF NOT EXISTS idx_multas_status           ON multas(status);
CREATE INDEX IF NOT EXISTS idx_vendas_veiculo          ON vendas(veiculo_id);
CREATE INDEX IF NOT EXISTS idx_mov_veiculo             ON movimentacoes_veiculos(veiculo_id);
CREATE INDEX IF NOT EXISTS idx_mov_data                ON movimentacoes_veiculos(data_movimentacao);
CREATE INDEX IF NOT EXISTS idx_logs_criado             ON logs(criado_em DESC);
CREATE INDEX IF NOT EXISTS idx_chk_exec_token          ON checklist_execucoes(token);
CREATE INDEX IF NOT EXISTS idx_chk_exec_veiculo        ON checklist_execucoes(veiculo_id);
CREATE INDEX IF NOT EXISTS idx_chk_resp_execucao       ON checklist_respostas(execucao_id);
CREATE INDEX IF NOT EXISTS idx_chk_fotos_exec          ON checklist_fotos(execucao_id);

-- ============================================================
-- 18. CORREÇÃO DE CONSTRAINTS EXISTENTES
--     (seguro rodar mesmo se já existir)
-- ============================================================

-- Garantir que veiculos_status_check aceita 'disp. para venda'
ALTER TABLE veiculos DROP CONSTRAINT IF EXISTS veiculos_status_check;
ALTER TABLE veiculos ADD CONSTRAINT veiculos_status_check
  CHECK (status IN ('ativo','manutenção','inativo','devolvido','vendido','disp. para venda'));

-- ============================================================
-- 19. USUÁRIO ADMIN PADRÃO
--     (só insere se não existir)
-- ============================================================
INSERT INTO usuarios (nome, email, senha, perfil, status)
VALUES ('Administrador', 'admin@sulbaiana.com.br', 'admin123', 'admin', 'ativo')
ON CONFLICT (email) DO NOTHING;

-- ============================================================
-- 20. ITENS PADRÃO DO CHECK-LIST
--     (só insere se não existir — constraint UNIQUE em descricao)
-- ============================================================
INSERT INTO checklist_itens (categoria, descricao, obrigatorio, ordem) VALUES
  ('Documentação', 'CRLV / Documento do veículo em dia',           true,  1),
  ('Documentação', 'CNH do motorista válida',                       true,  2),
  ('Documentação', 'Seguro vigente',                                true,  3),
  ('Pneus',        'Pneu dianteiro esquerdo — calibragem e estado', true,  4),
  ('Pneus',        'Pneu dianteiro direito — calibragem e estado',  true,  5),
  ('Pneus',        'Pneu traseiro esquerdo — calibragem e estado',  true,  6),
  ('Pneus',        'Pneu traseiro direito — calibragem e estado',   true,  7),
  ('Pneus',        'Estepe presente e calibrado',                   true,  8),
  ('Iluminação',   'Faróis dianteiros funcionando',                  true,  9),
  ('Iluminação',   'Lanternas traseiras funcionando',                true, 10),
  ('Iluminação',   'Pisca-alerta funcionando',                       true, 11),
  ('Iluminação',   'Luz de ré funcionando',                          true, 12),
  ('Segurança',    'Extintor de incêndio presente e válido',         true, 13),
  ('Segurança',    'Triângulo de segurança presente',                true, 14),
  ('Segurança',    'Macaco e chave de roda presentes',               true, 15),
  ('Segurança',    'Cinto de segurança funcionando',                 true, 16),
  ('Mecânica',     'Nível de óleo do motor OK',                      true, 17),
  ('Mecânica',     'Nível de água do radiador OK',                   true, 18),
  ('Mecânica',     'Freios funcionando corretamente',                true, 19),
  ('Mecânica',     'Buzina funcionando',                             true, 20),
  ('Mecânica',     'Limpador de para-brisa funcionando',             true, 21),
  ('Lataria',      'Para-brisa sem trincas ou rachaduras',           true, 22),
  ('Lataria',      'Retrovisores íntegros e regulados',              true, 23),
  ('Lataria',      'Ausência de avarias visíveis na lataria',        true, 24),
  ('Limpeza',      'Interior limpo e organizado',                    false, 25),
  ('Limpeza',      'Exterior limpo',                                 false, 26)
ON CONFLICT (descricao) DO NOTHING;

-- ============================================================
-- 21. LOG DE INSTALAÇÃO
-- ============================================================
INSERT INTO logs (acao, usuario, tipo)
VALUES ('SQL completo aplicado — FROTAS Sulbaiana v6', 'Sistema', 'info');

-- ============================================================
-- 22. VERIFICAÇÃO FINAL
-- ============================================================
SELECT
  table_name,
  (SELECT COUNT(*) FROM information_schema.columns c
   WHERE c.table_name = t.table_name AND c.table_schema = 'public') AS colunas
FROM information_schema.tables t
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE'
  AND table_name IN (
    'contratos','localidades','centros_custo','usuarios','veiculos',
    'abastecimentos','manutencoes','multas','vendas','movimentacoes_veiculos',
    'logs','checklist_itens','checklist_execucoes','checklist_respostas','checklist_fotos'
  )
ORDER BY table_name;

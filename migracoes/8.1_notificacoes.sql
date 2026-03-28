-- ============================================================
-- MIGRAÇÃO 8.1 — Notificações Automáticas
-- Execute no SQL Editor do Supabase Dashboard
-- ============================================================

-- 1. Tabela de configuração de notificações
-- Cada linha define: qual evento, para qual e-mail, ativo/inativo
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS notificacoes_config (
  id            BIGSERIAL PRIMARY KEY,
  evento        TEXT NOT NULL CHECK (evento IN (
                  'checklist_reprovado',
                  'checklist_ressalvas',
                  'multa_registrada',
                  'km_manutencao_vencido',
                  'contrato_vencendo'
                )),
  email         TEXT NOT NULL,
  nome_destino  TEXT,                        -- nome do destinatário (opcional)
  ativo         BOOLEAN DEFAULT true,
  criado_em     TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (evento, email)
);

-- RLS
ALTER TABLE notificacoes_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon_all_notificacoes_config" ON notificacoes_config
  FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_notificacoes_config" ON notificacoes_config
  FOR ALL TO authenticated USING (true) WITH CHECK (true);


-- 2. Tabela de log de notificações enviadas
--    (evita reenvios duplicados e serve como histórico)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS notificacoes_log (
  id            BIGSERIAL PRIMARY KEY,
  evento        TEXT NOT NULL,
  referencia_id BIGINT,                      -- id do checklist/multa/veículo
  email         TEXT NOT NULL,
  status        TEXT DEFAULT 'enviado' CHECK (status IN ('enviado','erro')),
  mensagem      TEXT,
  enviado_em    TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE notificacoes_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon_all_notificacoes_log" ON notificacoes_log
  FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_notificacoes_log" ON notificacoes_log
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_notif_log_evento ON notificacoes_log(evento);
CREATE INDEX IF NOT EXISTS idx_notif_log_ref    ON notificacoes_log(referencia_id);
CREATE INDEX IF NOT EXISTS idx_notif_log_data   ON notificacoes_log(enviado_em DESC);


-- 3. Dados iniciais de exemplo (ajuste os e-mails conforme necessário)
-- ------------------------------------------------------------
INSERT INTO notificacoes_config (evento, email, nome_destino) VALUES
  ('checklist_reprovado',    'admin@sulbaiana.com.br', 'Administrador'),
  ('checklist_ressalvas',    'admin@sulbaiana.com.br', 'Administrador'),
  ('multa_registrada',       'admin@sulbaiana.com.br', 'Administrador'),
  ('km_manutencao_vencido',  'admin@sulbaiana.com.br', 'Administrador'),
  ('contrato_vencendo',      'admin@sulbaiana.com.br', 'Administrador')
ON CONFLICT (evento, email) DO NOTHING;

-- ============================================================
-- FIM DA MIGRAÇÃO 8.1
-- ============================================================

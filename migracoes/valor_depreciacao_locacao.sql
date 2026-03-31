-- ─────────────────────────────────────────────────────────────────────────────
-- MIGRAÇÃO: Adiciona colunas valor_depreciacao e valor_locacao em veiculos
-- Execute no Supabase > SQL Editor
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE veiculos
  ADD COLUMN IF NOT EXISTS valor_depreciacao NUMERIC(12,2) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS valor_locacao     NUMERIC(12,2) DEFAULT NULL;

-- Comentários
COMMENT ON COLUMN veiculos.valor_depreciacao IS 'Valor mensal de depreciação (R$) — apenas frota própria';
COMMENT ON COLUMN veiculos.valor_locacao     IS 'Valor mensal de locação (R$) — apenas veículos locados';

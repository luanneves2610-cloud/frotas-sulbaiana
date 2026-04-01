-- ─────────────────────────────────────────────────────────────────────────────
-- MIGRAÇÃO: Adiciona coluna valor_locacao na tabela veiculos
-- Execute no Supabase > SQL Editor > New Query > Cole e clique em RUN
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE veiculos
  ADD COLUMN IF NOT EXISTS valor_locacao NUMERIC(12,2) DEFAULT NULL;

COMMENT ON COLUMN veiculos.valor_locacao IS 'Valor mensal de locação (R$) — apenas veículos locados';

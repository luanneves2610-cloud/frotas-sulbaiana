-- ============================================================
-- MIGRAÇÃO 8.4 — Supabase Realtime
-- Execute no SQL Editor do Supabase Dashboard
-- ============================================================

-- Habilita Realtime para as tabelas monitoradas pelo dashboard
-- (Supabase Realtime usa Publication do Postgres)

-- 1. Adiciona tabelas à publicação supabase_realtime
ALTER PUBLICATION supabase_realtime ADD TABLE checklist_execucoes;
ALTER PUBLICATION supabase_realtime ADD TABLE multas;
ALTER PUBLICATION supabase_realtime ADD TABLE veiculos;
ALTER PUBLICATION supabase_realtime ADD TABLE manutencoes;
ALTER PUBLICATION supabase_realtime ADD TABLE abastecimentos;

-- Nota: se der erro "already member", ignore — a tabela já estava na publicação.

-- 2. Verifica quais tabelas estão habilitadas:
-- SELECT tablename FROM pg_publication_tables WHERE pubname = 'supabase_realtime';

-- ============================================================
-- FIM DA MIGRAÇÃO 8.4
-- ============================================================

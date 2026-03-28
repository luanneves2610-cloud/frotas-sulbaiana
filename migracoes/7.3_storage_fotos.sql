-- ============================================================
-- MIGRAÇÃO 7.3 — Supabase Storage para fotos do check-list
-- Execute este script no SQL Editor do Supabase Dashboard
-- ============================================================


-- 1. Adiciona coluna url em checklist_fotos
--    Mantém dados_base64 como nullable (retrocompat. com registros antigos)
-- ------------------------------------------------------------
ALTER TABLE checklist_fotos
  ADD COLUMN IF NOT EXISTS url TEXT;

ALTER TABLE checklist_fotos
  ALTER COLUMN dados_base64 DROP NOT NULL;


-- 2. Cria o bucket checklist-fotos (público)
-- ------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'checklist-fotos',
  'checklist-fotos',
  true,
  5242880,      -- 5 MB por arquivo
  ARRAY['image/jpeg','image/jpg','image/png','image/webp']
)
ON CONFLICT (id) DO NOTHING;


-- 3. Políticas RLS do Storage
-- ------------------------------------------------------------

-- Leitura pública (bucket já é public, mas garante via policy)
DROP POLICY IF EXISTS "public_read_checklist_fotos" ON storage.objects;
CREATE POLICY "public_read_checklist_fotos"
  ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'checklist-fotos');

-- Upload pelo app mobile (anon) — checklist.html usa anon key
DROP POLICY IF EXISTS "anon_insert_checklist_fotos" ON storage.objects;
CREATE POLICY "anon_insert_checklist_fotos"
  ON storage.objects FOR INSERT
  TO anon
  WITH CHECK (bucket_id = 'checklist-fotos');

-- Upload e exclusão pelo sistema desktop (authenticated)
DROP POLICY IF EXISTS "auth_manage_checklist_fotos" ON storage.objects;
CREATE POLICY "auth_manage_checklist_fotos"
  ON storage.objects FOR ALL
  TO authenticated
  USING (bucket_id = 'checklist-fotos')
  WITH CHECK (bucket_id = 'checklist-fotos');


-- 4. Estrutura de paths no bucket:
--    checklist-fotos/
--      {execucao_id}/
--        item_{resposta_id}_{timestamp}.jpg   ← não conformidades
--        frente_{timestamp}.jpg
--        traseira_{timestamp}.jpg
--        lateral_esq_{timestamp}.jpg
--        lateral_dir_{timestamp}.jpg
--        extra_{n}_{timestamp}.jpg
-- ------------------------------------------------------------


-- 5. (OPCIONAL) Migrar base64 antigas para Storage
--    Rode via script externo ou Edge Function — não recomendado via SQL
--    por causa do tamanho dos dados.
--
-- Verificar quantos registros ainda têm base64:
-- SELECT COUNT(*) FROM checklist_fotos WHERE dados_base64 IS NOT NULL;
-- SELECT COUNT(*) FROM checklist_fotos WHERE url IS NOT NULL;


-- ============================================================
-- FIM DA MIGRAÇÃO 7.3
-- ============================================================

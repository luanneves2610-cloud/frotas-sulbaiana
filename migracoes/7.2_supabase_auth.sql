-- ============================================================
-- MIGRAÇÃO 7.2 — Supabase Auth
-- Execute este script no SQL Editor do Supabase Dashboard
-- ============================================================

-- 1. Adiciona coluna auth_id na tabela usuarios
--    Vincula cada usuário ao auth.users do Supabase Auth
-- ------------------------------------------------------------
ALTER TABLE usuarios
  ADD COLUMN IF NOT EXISTS auth_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_usuarios_auth_id ON usuarios(auth_id);


-- 2. Função: ao criar um usuário no Supabase Auth,
--    vincula automaticamente ao registro em usuarios via e-mail
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Atualiza o auth_id do usuario existente (criado pelo admin no sistema)
  UPDATE usuarios
  SET auth_id = NEW.id
  WHERE LOWER(email) = LOWER(NEW.email)
    AND auth_id IS NULL;
  RETURN NEW;
END;
$$;

-- Trigger disparado após INSERT em auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();


-- 3. Função: ao excluir usuário do Auth, limpa auth_id em usuarios
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_delete_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE usuarios SET auth_id = NULL WHERE auth_id = OLD.id;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_deleted ON auth.users;
CREATE TRIGGER on_auth_user_deleted
  AFTER DELETE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_delete_auth_user();


-- 4. (OPCIONAL) Políticas RLS aprimoradas
--    Por padrão, mantemos as políticas anon existentes para compatibilidade.
--    Quando quiser restringir acesso somente a usuários autenticados,
--    execute os blocos abaixo.
-- ------------------------------------------------------------

/*
-- Remover políticas anon das tabelas principais
DO $$ DECLARE t TEXT;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'contratos','localidades','centros_custo','usuarios','veiculos',
    'abastecimentos','manutencoes','multas','vendas','movimentacoes_veiculos',
    'logs'
  ]) LOOP
    EXECUTE format('DROP POLICY IF EXISTS "anon_all_%s" ON %I', t, t);

    -- Política: usuários autenticados têm acesso total
    EXECUTE format(
      'CREATE POLICY "auth_all_%s" ON %I FOR ALL TO authenticated USING (true) WITH CHECK (true)',
      t, t
    );
  END LOOP;
END $$;
*/

-- Tabelas do check-list precisam de acesso anon (checklist.html usa token público)
-- Manter as políticas anon existentes para essas tabelas.


-- 5. MIGRAÇÃO DE USUÁRIOS EXISTENTES PARA O SUPABASE AUTH
--    Opção A: Execute via Supabase Dashboard > Authentication > Users > Add User
--    Opção B: Use o script abaixo para ver quais usuários ainda precisam migrar
-- ------------------------------------------------------------

-- Listar usuários que ainda não têm auth_id (não migrados):
-- SELECT id, nome, email, senha FROM usuarios WHERE auth_id IS NULL ORDER BY id;

-- Após criar cada usuário no Supabase Auth (com o mesmo e-mail),
-- o trigger handle_new_auth_user preenche o auth_id automaticamente.

-- USUÁRIO ADMIN PADRÃO — crie manualmente no Supabase Dashboard:
--   E-mail:  admin@sulbaiana.com.br
--   Senha:   admin123  (ou nova senha segura)
--   Em: Authentication > Users > Invite User

-- ============================================================
-- FIM DA MIGRAÇÃO 7.2
-- ============================================================

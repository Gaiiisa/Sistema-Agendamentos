-- ============================================================
-- Migração idempotente — Controle de Acesso e Permissões (RBAC) — 2026-07-13
--
-- Adiciona:
--   • usuarios.admin_principal  → marca a ÚNICA conta administradora principal
--                                 (acesso total; gerencia permissões das demais).
--   • usuarios.ultimo_acesso    → data/hora do último login (exibido na tela).
--   • tabela usuario_permissoes → permissões granulares por (usuário, módulo, ação).
--                                 A presença da linha = permissão concedida.
--
-- Preserva todas as contas existentes. Não remove dados.
--
-- Rodar:
--   mysql --default-character-set=utf8mb4 -u root -proot agendamentos < database/migracao-2026-07-13-permissoes.sql
-- Reexecutável com segurança.
--
-- >>> Como definir/trocar o administrador principal manualmente (via SQL):
--       UPDATE usuarios SET admin_principal = 0;                       -- zera todos
--       UPDATE usuarios SET admin_principal = 1 WHERE email = 'admin@navalha.local';
--     (Deve existir SEMPRE exatamente um usuário com admin_principal = 1.)
-- ============================================================

-- 1) Colunas novas em usuarios (idempotente)
DROP PROCEDURE IF EXISTS _add_cols_rbac;
DELIMITER $$
CREATE PROCEDURE _add_cols_rbac()
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='usuarios' AND column_name='admin_principal') THEN
    ALTER TABLE usuarios ADD COLUMN admin_principal BOOLEAN NOT NULL DEFAULT FALSE AFTER papel;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='usuarios' AND column_name='ultimo_acesso') THEN
    ALTER TABLE usuarios ADD COLUMN ultimo_acesso DATETIME NULL AFTER atualizado_em;
  END IF;
END$$
DELIMITER ;
CALL _add_cols_rbac();
DROP PROCEDURE _add_cols_rbac;

-- 2) Tabela de permissões granulares (idempotente)
CREATE TABLE IF NOT EXISTS usuario_permissoes (
  usuario_id CHAR(36)    NOT NULL,
  modulo     VARCHAR(40) NOT NULL,       -- ex.: 'financeiro', 'agenda', 'config'
  acao       VARCHAR(30) NOT NULL,       -- ex.: 'ver', 'criar', 'editar', 'excluir', 'exportar'
  criado_em  DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (usuario_id, modulo, acao),
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
);

-- 3) Designa o administrador principal se ainda não houver nenhum.
--    Escolhe o dono/admin ativo mais antigo (dono tem prioridade).
SET @has_principal = (SELECT COUNT(*) FROM usuarios WHERE admin_principal = 1);
UPDATE usuarios u
JOIN (
  SELECT id FROM usuarios
  WHERE papel IN ('dono','admin') AND ativo = 1
    AND senha_hash LIKE '$2%'                 -- só conta com senha bcrypt utilizável
  ORDER BY (papel='dono') DESC, criado_em ASC, id ASC
  LIMIT 1
) pick ON pick.id = u.id
SET u.admin_principal = 1
WHERE @has_principal = 0;

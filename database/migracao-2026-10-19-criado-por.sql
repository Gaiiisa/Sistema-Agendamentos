-- ============================================================
-- Migração idempotente — Autor da conta (2026-10-19)
--
-- Adiciona usuarios.criado_por: quem criou a conta. Usado na hierarquia:
-- um CEO só vê e gerencia as contas de nível 'usuario' que ele mesmo criou
-- (não vê outros CEOs). Contas antigas ficam com NULL: só o master as vê.
-- Se o autor for excluído, o campo volta a NULL.
--
-- Rodar DEPOIS de migracao-2026-10-19-niveis.sql:
--   mysql --default-character-set=utf8mb4 -u root -proot agendamentos < database/migracao-2026-10-19-criado-por.sql
-- Reexecutável com segurança.
-- ============================================================

DROP PROCEDURE IF EXISTS _criado_por;
DELIMITER $$
CREATE PROCEDURE _criado_por()
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='usuarios' AND column_name='criado_por') THEN
    ALTER TABLE usuarios ADD COLUMN criado_por CHAR(36) NULL AFTER nivel;
    ALTER TABLE usuarios ADD CONSTRAINT fk_usuarios_criado_por FOREIGN KEY (criado_por) REFERENCES usuarios(id) ON DELETE SET NULL;
  END IF;
END$$
DELIMITER ;
CALL _criado_por();
DROP PROCEDURE _criado_por;

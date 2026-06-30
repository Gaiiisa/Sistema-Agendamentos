-- ============================================================
-- Migração idempotente — autenticação real (2026-06-29)
-- Adiciona colunas de status/auditoria em `usuarios`, espelhando schema.sql.
-- Aditivo e retrocompatível. Reexecutável com segurança.
--
-- Rodar: mysql --default-character-set=utf8mb4 -u root -proot agendamentos < database/migracao-2026-06-29-auth.sql
-- ============================================================
DROP PROCEDURE IF EXISTS _add_col;
DELIMITER $$
CREATE PROCEDURE _add_col(IN tbl VARCHAR(64), IN col VARCHAR(64), IN ddl TEXT)
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema = DATABASE() AND table_name = tbl AND column_name = col) THEN
    SET @s = CONCAT('ALTER TABLE `', tbl, '` ADD COLUMN ', ddl);
    PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;
  END IF;
END$$
DELIMITER ;

CALL _add_col('usuarios', 'ativo',         "ativo BOOLEAN NOT NULL DEFAULT TRUE AFTER papel");
CALL _add_col('usuarios', 'atualizado_em', "atualizado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER criado_em");

DROP PROCEDURE _add_col;

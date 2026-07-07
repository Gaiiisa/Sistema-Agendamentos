-- ============================================================
-- Migração idempotente — imagem do produto (2026-07-03)
-- Adiciona coluna `imagem` (MEDIUMTEXT) em `produtos` para armazenar
-- data URL (base64) ou URL externa da foto do produto.
--
-- Rodar:  mysql --default-character-set=utf8mb4 -u root -proot agendamentos < database/migracao-imagem-produto.sql
-- Pode ser reexecutado com segurança (verifica information_schema antes).
-- ============================================================

DROP PROCEDURE IF EXISTS _add_col_prod_img;
DELIMITER $$

CREATE PROCEDURE _add_col_prod_img()
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema = DATABASE()
                   AND table_name = 'produtos'
                   AND column_name = 'imagem') THEN
    ALTER TABLE produtos ADD COLUMN imagem MEDIUMTEXT AFTER fornecedor_id;
  END IF;
END$$

DELIMITER ;

CALL _add_col_prod_img();
DROP PROCEDURE _add_col_prod_img;

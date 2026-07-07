-- ============================================================
-- Migração idempotente — categorias de serviço (2026-07-06)
-- Cria tabela `categorias_servico` para permitir criar categorias
-- avulsas (sem serviço associado) na tela de Serviços.
--
-- A coluna `servicos.categoria` continua sendo a fonte principal;
-- esta tabela apenas guarda categorias criadas manualmente pelo
-- usuário para persistir entre recarregamentos, mesmo vazias.
--
-- Rodar:  mysql --default-character-set=utf8mb4 -u root -proot agendamentos < database/migracao-categorias-servico.sql
-- Pode ser reexecutado com segurança.
-- ============================================================

DROP PROCEDURE IF EXISTS _create_categorias_servico;
DELIMITER $$

CREATE PROCEDURE _create_categorias_servico()
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables
                 WHERE table_schema = DATABASE()
                   AND table_name = 'categorias_servico') THEN
    CREATE TABLE categorias_servico (
      id                 CHAR(36) PRIMARY KEY DEFAULT (UUID()),
      estabelecimento_id CHAR(36) NOT NULL,
      nome               VARCHAR(255) NOT NULL,
      criado_em          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uq_cat_estab_nome (estabelecimento_id, nome),
      FOREIGN KEY (estabelecimento_id) REFERENCES estabelecimentos(id) ON DELETE CASCADE
    );
  END IF;
END$$

DELIMITER ;

CALL _create_categorias_servico();
DROP PROCEDURE _create_categorias_servico;

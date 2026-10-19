-- ============================================================
-- Migração idempotente — configurações de pagamento (2026-07-13)
-- Adiciona em `estabelecimentos` as colunas da aba Configurações › Pagamentos:
--   métodos aceitos, dados da chave Pix e taxa de cartão (maquininha).
-- Mesmo estilo "flat" das políticas de agenda já existentes na tabela.
--
-- Rodar:  mysql --default-character-set=utf8mb4 -u root -proot agendamentos < database/migracao-2026-07-13-pagamentos.sql
-- Pode ser reexecutado com segurança (verifica information_schema antes).
-- ============================================================

DROP PROCEDURE IF EXISTS _add_cols_pagamentos;
DELIMITER $$

CREATE PROCEDURE _add_cols_pagamentos()
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='estabelecimentos' AND column_name='aceita_pix') THEN
    ALTER TABLE estabelecimentos ADD COLUMN aceita_pix BOOLEAN NOT NULL DEFAULT TRUE AFTER sinal_valor;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='estabelecimentos' AND column_name='aceita_debito') THEN
    ALTER TABLE estabelecimentos ADD COLUMN aceita_debito BOOLEAN NOT NULL DEFAULT TRUE AFTER aceita_pix;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='estabelecimentos' AND column_name='aceita_credito') THEN
    ALTER TABLE estabelecimentos ADD COLUMN aceita_credito BOOLEAN NOT NULL DEFAULT TRUE AFTER aceita_debito;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='estabelecimentos' AND column_name='aceita_dinheiro') THEN
    ALTER TABLE estabelecimentos ADD COLUMN aceita_dinheiro BOOLEAN NOT NULL DEFAULT TRUE AFTER aceita_credito;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='estabelecimentos' AND column_name='aceita_fiado') THEN
    ALTER TABLE estabelecimentos ADD COLUMN aceita_fiado BOOLEAN NOT NULL DEFAULT FALSE AFTER aceita_dinheiro;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='estabelecimentos' AND column_name='pix_tipo') THEN
    ALTER TABLE estabelecimentos ADD COLUMN pix_tipo VARCHAR(20) AFTER aceita_fiado;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='estabelecimentos' AND column_name='pix_chave') THEN
    ALTER TABLE estabelecimentos ADD COLUMN pix_chave VARCHAR(255) AFTER pix_tipo;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='estabelecimentos' AND column_name='pix_nome') THEN
    ALTER TABLE estabelecimentos ADD COLUMN pix_nome VARCHAR(255) AFTER pix_chave;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='estabelecimentos' AND column_name='repassa_taxa_cartao') THEN
    ALTER TABLE estabelecimentos ADD COLUMN repassa_taxa_cartao BOOLEAN NOT NULL DEFAULT FALSE AFTER pix_nome;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='estabelecimentos' AND column_name='taxa_cartao_pct') THEN
    ALTER TABLE estabelecimentos ADD COLUMN taxa_cartao_pct NUMERIC(5,2) NOT NULL DEFAULT 0 AFTER repassa_taxa_cartao;
  END IF;
END$$

DELIMITER ;

CALL _add_cols_pagamentos();
DROP PROCEDURE _add_cols_pagamentos;

-- ============================================================
-- Migração idempotente — completude do banco (2026-06-29)
-- Aplica em bancos JÁ populados as mesmas mudanças já refletidas em schema.sql.
-- Tudo aditivo e retrocompatível: novas colunas/índices/tabela, nada removido.
--
-- Rodar:  mysql --default-character-set=utf8mb4 -u root -proot agendamentos < database/migracao-2026-06-29-completude.sql
-- Pode ser reexecutado com segurança (verifica information_schema antes de cada passo).
-- ============================================================

-- ---------- Helpers idempotentes ----------
DROP PROCEDURE IF EXISTS _add_col;
DROP PROCEDURE IF EXISTS _add_idx;
DELIMITER $$

CREATE PROCEDURE _add_col(IN tbl VARCHAR(64), IN col VARCHAR(64), IN ddl TEXT)
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema = DATABASE() AND table_name = tbl AND column_name = col) THEN
    SET @s = CONCAT('ALTER TABLE `', tbl, '` ADD COLUMN ', ddl);
    PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;
  END IF;
END$$

CREATE PROCEDURE _add_idx(IN tbl VARCHAR(64), IN idx VARCHAR(64), IN cols TEXT)
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.statistics
                 WHERE table_schema = DATABASE() AND table_name = tbl AND index_name = idx) THEN
    SET @s = CONCAT('CREATE INDEX `', idx, '` ON `', tbl, '` (', cols, ')');
    PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;
  END IF;
END$$

DELIMITER ;

-- ---------- 1. estabelecimentos: campos de cadastro / redes sociais ----------
CALL _add_col('estabelecimentos', 'documento',     "documento VARCHAR(20) AFTER slug");
CALL _add_col('estabelecimentos', 'tipo_negocio',  "tipo_negocio VARCHAR(60) NOT NULL DEFAULT 'Barbearia' AFTER documento");
CALL _add_col('estabelecimentos', 'cep',           "cep VARCHAR(9) AFTER cidade");
CALL _add_col('estabelecimentos', 'descricao',     "descricao TEXT AFTER endereco");
CALL _add_col('estabelecimentos', 'instagram',     "instagram VARCHAR(120) AFTER descricao");
CALL _add_col('estabelecimentos', 'site',          "site VARCHAR(255) AFTER instagram");
CALL _add_col('estabelecimentos', 'google_perfil', "google_perfil VARCHAR(255) AFTER site");

-- ---------- 2. estabelecimento_horarios (nova tabela) ----------
CREATE TABLE IF NOT EXISTS estabelecimento_horarios (
  estabelecimento_id CHAR(36) NOT NULL,
  dia_semana   SMALLINT NOT NULL CHECK (dia_semana BETWEEN 0 AND 6),
  aberto       BOOLEAN NOT NULL DEFAULT TRUE,
  hora_inicio  TIME NOT NULL DEFAULT '09:00',
  hora_fim     TIME NOT NULL DEFAULT '19:00',
  pausa_inicio TIME,
  pausa_fim    TIME,
  PRIMARY KEY (estabelecimento_id, dia_semana),
  CHECK (hora_fim > hora_inicio),
  CHECK (pausa_inicio IS NULL OR pausa_fim IS NULL OR pausa_fim > pausa_inicio),
  FOREIGN KEY (estabelecimento_id) REFERENCES estabelecimentos(id) ON DELETE CASCADE
);

-- ---------- 3. modelos_mensagem: descrição, categoria, canal, assunto, status ----------
CALL _add_col('modelos_mensagem', 'descricao', "descricao VARCHAR(255) AFTER nome");
CALL _add_col('modelos_mensagem', 'categoria', "categoria VARCHAR(60) AFTER descricao");
CALL _add_col('modelos_mensagem', 'canal',     "canal ENUM('whatsapp','email','sms','app') NOT NULL DEFAULT 'whatsapp' AFTER gatilho");
CALL _add_col('modelos_mensagem', 'assunto',   "assunto VARCHAR(255) AFTER canal");
CALL _add_col('modelos_mensagem', 'status',    "status ENUM('ativo','inativo') NOT NULL DEFAULT 'ativo'");

-- ---------- 4. fechamentos_comissao: atendimentos, bruto, comissão, forma ----------
CALL _add_col('fechamentos_comissao', 'qtd_atendimentos', "qtd_atendimentos INTEGER NOT NULL DEFAULT 0 AFTER status");
CALL _add_col('fechamentos_comissao', 'valor_bruto',      "valor_bruto NUMERIC(10,2) NOT NULL DEFAULT 0 AFTER qtd_atendimentos");
CALL _add_col('fechamentos_comissao', 'valor_comissao',   "valor_comissao NUMERIC(10,2) NOT NULL DEFAULT 0 AFTER valor_bruto");
CALL _add_col('fechamentos_comissao', 'forma_pagamento',  "forma_pagamento ENUM('pix','cartao','dinheiro') AFTER valor_pago");

-- ---------- 5. Índices multi-tenant ----------
CALL _add_idx('profissionais',   'idx_profissionais_estab', 'estabelecimento_id');
CALL _add_idx('servicos',        'idx_servicos_estab',      'estabelecimento_id');
CALL _add_idx('clientes',        'idx_clientes_estab',      'estabelecimento_id');
CALL _add_idx('produtos',        'idx_produtos_estab',      'estabelecimento_id');
CALL _add_idx('fornecedores',    'idx_fornecedores_estab',  'estabelecimento_id');
CALL _add_idx('campanhas',       'idx_campanhas_estab',     'estabelecimento_id');
CALL _add_idx('modelos_mensagem','idx_modelos_estab',       'estabelecimento_id');
CALL _add_idx('recorrencias',    'idx_recorrencias_estab',  'estabelecimento_id');
CALL _add_idx('projetos',        'idx_projetos_estab',      'estabelecimento_id');

-- ---------- Limpeza ----------
DROP PROCEDURE _add_col;
DROP PROCEDURE _add_idx;

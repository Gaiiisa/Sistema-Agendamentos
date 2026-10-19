-- ============================================================
-- Migração idempotente — status 'rascunho' em modelos de mensagem (2026-10-19)
--
-- A tela de Fidelidade › Modelos tem o botão "Salvar rascunho", mas a coluna
-- modelos_mensagem.status só aceitava 'ativo'/'inativo' — gravar um rascunho
-- falhava no banco. Acrescenta o valor (não altera os registros existentes).
--
-- Rodar:  mysql --default-character-set=utf8mb4 -u root -proot agendamentos < database/migracao-2026-10-19-modelo-rascunho.sql
-- ============================================================
ALTER TABLE modelos_mensagem
  MODIFY COLUMN status ENUM('ativo', 'inativo', 'rascunho') NOT NULL DEFAULT 'ativo';

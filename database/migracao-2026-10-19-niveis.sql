-- ============================================================
-- Migração idempotente — Níveis de acesso (2026-10-19)
--
-- Substitui o booleano usuarios.admin_principal por usuarios.nivel:
--   • master  → conta do desenvolvedor. Acesso total; cria, edita e exclui
--               QUALQUER conta (inclusive CEO). Existe exatamente uma.
--   • ceo     → dono da empresa. Acesso total aos módulos; cria, edita e
--               exclui qualquer conta abaixo do master.
--   • usuario → demais contas; acesso definido em usuario_permissoes.
--
-- Rodar DEPOIS de migracao-2026-07-13-permissoes.sql:
--   mysql --default-character-set=utf8mb4 -u root -proot agendamentos < database/migracao-2026-10-19-niveis.sql
-- Reexecutável com segurança.
-- ============================================================

DROP PROCEDURE IF EXISTS _niveis;
DELIMITER $$
CREATE PROCEDURE _niveis()
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='usuarios' AND column_name='nivel') THEN
    ALTER TABLE usuarios ADD COLUMN nivel ENUM('master','ceo','usuario') NOT NULL DEFAULT 'usuario' AFTER papel;
  END IF;
  -- quem era o administrador principal vira master; depois a coluna antiga sai
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='usuarios' AND column_name='admin_principal') THEN
    UPDATE usuarios SET nivel='master' WHERE admin_principal=1;
    ALTER TABLE usuarios DROP COLUMN admin_principal;
  END IF;
END$$
DELIMITER ;
CALL _niveis();
DROP PROCEDURE _niveis;

-- master/ceo têm acesso total: permissões granulares não se aplicam a eles
DELETE p FROM usuario_permissoes p JOIN usuarios u ON u.id = p.usuario_id WHERE u.nivel IN ('master','ceo');

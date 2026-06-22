-- ============================================================
-- Schema do banco de dados — Sistema de Agendamentos (Barbearia/SaaS)
-- MySQL 8.0+
-- Baseado em docs/mapeamento-campos.md e no modelo do app (data.service.ts)
--
-- Convenções:
--  · ids CHAR(36) (UUID())
--  · valores monetários NUMERIC(10,2)
--  · datas puras DATE · horas TIME
--  · timestamps de auditoria: DATETIME SEMPRE EM UTC.
--    A exibição no fuso local usa estabelecimentos.fuso_horario.
--    (DATETIME, e não TIMESTAMP, para evitar o limite de 2038 e a
--     conversão automática dependente do time_zone da sessão.)
--  · multi-tenant: quase tudo referencia estabelecimento_id
--  · valores derivados (KPIs, ticket médio, etc.) NÃO têm coluna —
--    ver views de exemplo no fim do arquivo
-- ============================================================

-- ---------- Tabelas ----------

-- ============================================================
-- 1. Estabelecimento e usuários
-- ============================================================
CREATE TABLE estabelecimentos (
  id          CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  nome        VARCHAR(255) NOT NULL,
  plano       VARCHAR(255) NOT NULL DEFAULT 'Profissional',
  slug        VARCHAR(120) UNIQUE,                     -- usado na página pública de agendamento
  cidade      VARCHAR(255),
  telefone    VARCHAR(20),
  endereco    VARCHAR(255),
  fuso_horario VARCHAR(64) NOT NULL DEFAULT 'America/Sao_Paulo',
  -- identidade visual (alimenta a página pública)
  logo_url        TEXT,
  cor_primaria    VARCHAR(7),                          -- hex, ex. '#0e9f6e'
  cor_secundaria  VARCHAR(7),
  -- políticas (tela de Configurações)
  antecedencia_min_agendamento_horas  INTEGER NOT NULL DEFAULT 0,
  antecedencia_min_cancelamento_horas INTEGER NOT NULL DEFAULT 0,
  exige_sinal_padrao BOOLEAN NOT NULL DEFAULT FALSE,
  sinal_tipo  ENUM('valor', 'percentual') NOT NULL DEFAULT 'percentual',
  sinal_valor NUMERIC(10,2) NOT NULL DEFAULT 0,        -- R$ ou % conforme sinal_tipo
  criado_em   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Integrações externas (WhatsApp e notificações) — dados sensíveis separados
CREATE TABLE integracoes (
  estabelecimento_id   CHAR(36) PRIMARY KEY,
  whatsapp_ativo       BOOLEAN NOT NULL DEFAULT FALSE,
  whatsapp_numero      VARCHAR(20),
  whatsapp_instancia   VARCHAR(255),
  whatsapp_token       TEXT,
  confirmacao_imediata BOOLEAN NOT NULL DEFAULT TRUE,   -- mensagem ao agendar
  lembrete_vespera     BOOLEAN NOT NULL DEFAULT TRUE,   -- lembrete 1 dia antes
  atualizado_em        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (estabelecimento_id) REFERENCES estabelecimentos(id) ON DELETE CASCADE
);

-- ============================================================
-- 2. Equipe / Profissionais
-- ============================================================
CREATE TABLE profissionais (
  id                 CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  estabelecimento_id CHAR(36) NOT NULL,
  nome               VARCHAR(255) NOT NULL,
  apelido            VARCHAR(255),
  cor                VARCHAR(7),                              -- hex p/ agenda, ex. '#0e9f6e'
  comissao_pct       NUMERIC(5,2) NOT NULL DEFAULT 0,
  contato            VARCHAR(255),
  bio                TEXT,
  foto_url           TEXT,
  meta_mensal        NUMERIC(10,2),
  hora_inicio        TIME NOT NULL DEFAULT '09:00',
  hora_fim           TIME NOT NULL DEFAULT '19:00',
  ativo              BOOLEAN NOT NULL DEFAULT TRUE,
  criado_em          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (estabelecimento_id) REFERENCES estabelecimentos(id) ON DELETE CASCADE
);

-- Folgas semanais fixas. dia_semana: 0=domingo, 1=segunda, ... 6=sábado
-- (no app os valores 'dom','seg',... são mapeados para 0..6)
CREATE TABLE profissional_folgas (
  profissional_id CHAR(36) NOT NULL,
  dia_semana      SMALLINT NOT NULL CHECK (dia_semana BETWEEN 0 AND 6),
  PRIMARY KEY (profissional_id, dia_semana),
  FOREIGN KEY (profissional_id) REFERENCES profissionais(id) ON DELETE CASCADE
);

-- Férias / ausências por período (alimenta a disponibilidade da agenda)
CREATE TABLE profissional_ferias (
  id              CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  profissional_id CHAR(36) NOT NULL,
  data_inicio     DATE NOT NULL,
  data_fim        DATE NOT NULL,
  motivo          VARCHAR(255),
  CHECK (data_fim >= data_inicio),
  FOREIGN KEY (profissional_id) REFERENCES profissionais(id) ON DELETE CASCADE
);

CREATE TABLE profissional_especialidades (
  profissional_id CHAR(36) NOT NULL,
  especialidade   VARCHAR(255) NOT NULL,
  PRIMARY KEY (profissional_id, especialidade),
  FOREIGN KEY (profissional_id) REFERENCES profissionais(id) ON DELETE CASCADE
);

CREATE TABLE usuarios (
  id                 CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  estabelecimento_id CHAR(36) NOT NULL,
  nome               VARCHAR(255) NOT NULL,
  email              VARCHAR(255) NOT NULL,
  senha_hash         TEXT NOT NULL,
  papel              ENUM('dono', 'admin', 'gerente', 'profissional', 'recepcao') NOT NULL DEFAULT 'profissional',
  cor                VARCHAR(7),
  profissional_id    CHAR(36),
  criado_em          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (estabelecimento_id, email),                  -- email único por estabelecimento (multi-tenant)
  FOREIGN KEY (estabelecimento_id) REFERENCES estabelecimentos(id) ON DELETE CASCADE,
  FOREIGN KEY (profissional_id) REFERENCES profissionais(id) ON DELETE SET NULL
);

-- ============================================================
-- 3. Serviços
-- ============================================================
CREATE TABLE servicos (
  id                 CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  estabelecimento_id CHAR(36) NOT NULL,
  nome               VARCHAR(255) NOT NULL,
  categoria          VARCHAR(255) NOT NULL,
  duracao_min        INTEGER NOT NULL CHECK (duracao_min > 0),
  preco              NUMERIC(10,2) NOT NULL,
  custo              NUMERIC(10,2) NOT NULL DEFAULT 0,
  descricao          TEXT,
  cor                VARCHAR(7),
  foto_url           TEXT,
  combo              BOOLEAN NOT NULL DEFAULT FALSE,
  exige_sinal        BOOLEAN NOT NULL DEFAULT FALSE,
  sinal_valor        NUMERIC(10,2),                    -- valor/% específico; NULL usa o padrão do estabelecimento
  sessoes            INTEGER NOT NULL DEFAULT 1 CHECK (sessoes > 0),  -- serviços multi-sessão (ex. tatuagem)
  ativo              BOOLEAN NOT NULL DEFAULT TRUE,
  criado_em          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (estabelecimento_id) REFERENCES estabelecimentos(id) ON DELETE CASCADE
);

-- Quem executa cada serviço + preço/duração próprios opcionais
-- (preço variável por profissional: sênior cobra mais que júnior)
CREATE TABLE servico_profissionais (
  servico_id      CHAR(36) NOT NULL,
  profissional_id CHAR(36) NOT NULL,
  preco           NUMERIC(10,2),                       -- NULL = usa servicos.preco
  duracao_min     INTEGER CHECK (duracao_min IS NULL OR duracao_min > 0),  -- NULL = usa servicos.duracao_min
  PRIMARY KEY (servico_id, profissional_id),
  FOREIGN KEY (servico_id) REFERENCES servicos(id) ON DELETE CASCADE,
  FOREIGN KEY (profissional_id) REFERENCES profissionais(id) ON DELETE CASCADE
);

-- ============================================================
-- 4. Clientes
-- ============================================================
CREATE TABLE clientes (
  id                       CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  estabelecimento_id       CHAR(36) NOT NULL,
  nome                     VARCHAR(255) NOT NULL,
  whatsapp                 VARCHAR(255),
  email                    VARCHAR(255),
  nascimento               DATE,
  foto_url                 TEXT,
  observacoes              TEXT,
  profissional_favorito_id CHAR(36),
  criado_em                DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (estabelecimento_id) REFERENCES estabelecimentos(id) ON DELETE CASCADE,
  FOREIGN KEY (profissional_favorito_id) REFERENCES profissionais(id) ON DELETE SET NULL
);

CREATE TABLE cliente_tags (
  cliente_id CHAR(36) NOT NULL,
  tag        VARCHAR(255) NOT NULL,
  PRIMARY KEY (cliente_id, tag),
  FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE CASCADE
);

-- ============================================================
-- 5. Agendamentos
-- ============================================================

-- Projetos multi-sessão (tatuagem: um projeto = vários agendamentos)
CREATE TABLE projetos (
  id                 CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  estabelecimento_id CHAR(36) NOT NULL,
  cliente_id         CHAR(36) NOT NULL,
  profissional_id    CHAR(36),
  nome               VARCHAR(255) NOT NULL,
  descricao          TEXT,
  sessoes_previstas  INTEGER,
  valor_total        NUMERIC(10,2),
  status             ENUM('ativo', 'concluido', 'cancelado') NOT NULL DEFAULT 'ativo',
  -- vertical tatuagem: consentimento e verificação de idade
  termo_aceito_em    DATETIME,
  idade_verificada   BOOLEAN NOT NULL DEFAULT FALSE,
  criado_em          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (estabelecimento_id) REFERENCES estabelecimentos(id) ON DELETE CASCADE,
  FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE RESTRICT,
  FOREIGN KEY (profissional_id) REFERENCES profissionais(id) ON DELETE SET NULL
);

-- Imagens de referência (tatuagem) anexadas ao projeto
CREATE TABLE projeto_imagens (
  id         CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  projeto_id CHAR(36) NOT NULL,
  url        TEXT NOT NULL,
  descricao  VARCHAR(255),
  criado_em  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (projeto_id) REFERENCES projetos(id) ON DELETE CASCADE
);

-- Regras de recorrência ("toda quarta às 15h")
CREATE TABLE recorrencias (
  id                 CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  estabelecimento_id CHAR(36) NOT NULL,
  cliente_id         CHAR(36) NOT NULL,
  servico_id         CHAR(36) NOT NULL,
  profissional_id    CHAR(36) NOT NULL,
  frequencia         ENUM('diaria', 'semanal', 'quinzenal', 'mensal') NOT NULL,
  intervalo          SMALLINT NOT NULL DEFAULT 1,      -- a cada N períodos
  dia_semana         SMALLINT CHECK (dia_semana IS NULL OR dia_semana BETWEEN 0 AND 6),
  hora_inicio        TIME NOT NULL,
  data_inicio        DATE NOT NULL,
  data_fim           DATE,                             -- NULL = sem término
  ativo              BOOLEAN NOT NULL DEFAULT TRUE,
  criado_em          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (estabelecimento_id) REFERENCES estabelecimentos(id) ON DELETE CASCADE,
  FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE CASCADE,
  FOREIGN KEY (servico_id) REFERENCES servicos(id) ON DELETE CASCADE,
  FOREIGN KEY (profissional_id) REFERENCES profissionais(id) ON DELETE CASCADE
);

CREATE TABLE agendamentos (
  id                 CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  estabelecimento_id CHAR(36) NOT NULL,
  cliente_id         CHAR(36) NOT NULL,
  servico_id         CHAR(36) NOT NULL,                -- serviço principal / resumo (ver agendamento_servicos)
  profissional_id    CHAR(36) NOT NULL,
  data               DATE NOT NULL,
  hora_inicio        TIME NOT NULL,
  duracao_min        INTEGER NOT NULL,                 -- duração total
  valor              NUMERIC(10,2) NOT NULL,           -- valor total
  comissao_pct       NUMERIC(5,2),
  status             ENUM('pendente', 'confirmado', 'atendimento', 'concluido', 'faltou', 'cancelado') NOT NULL DEFAULT 'pendente',
  sinal_pago         BOOLEAN NOT NULL DEFAULT FALSE,
  sinal_valor        NUMERIC(10,2),                    -- valor efetivamente cobrado de sinal
  projeto_id         CHAR(36),                         -- sessão de um projeto multi-sessão
  recorrencia_id     CHAR(36),                         -- gerado por uma regra de recorrência
  observacoes        TEXT,
  criado_em          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizado_em      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (estabelecimento_id) REFERENCES estabelecimentos(id) ON DELETE CASCADE,
  FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE RESTRICT,
  FOREIGN KEY (servico_id) REFERENCES servicos(id) ON DELETE RESTRICT,
  FOREIGN KEY (profissional_id) REFERENCES profissionais(id) ON DELETE RESTRICT,
  FOREIGN KEY (projeto_id) REFERENCES projetos(id) ON DELETE SET NULL,
  FOREIGN KEY (recorrencia_id) REFERENCES recorrencias(id) ON DELETE SET NULL
);

CREATE INDEX idx_agendamentos_dia          ON agendamentos (estabelecimento_id, data);
CREATE INDEX idx_agendamentos_profissional ON agendamentos (profissional_id, data);
CREATE INDEX idx_agendamentos_cliente      ON agendamentos (cliente_id, data DESC);

-- Detalhamento de serviços de um agendamento (múltiplos serviços / combos compostos).
-- Cada item pode ter profissional, valor e comissão próprios.
CREATE TABLE agendamento_servicos (
  id              CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  agendamento_id  CHAR(36) NOT NULL,
  servico_id      CHAR(36) NOT NULL,
  profissional_id CHAR(36) NOT NULL,
  valor           NUMERIC(10,2) NOT NULL,
  duracao_min     INTEGER NOT NULL CHECK (duracao_min > 0),
  comissao_pct    NUMERIC(5,2),
  ordem           SMALLINT NOT NULL DEFAULT 0,
  FOREIGN KEY (agendamento_id) REFERENCES agendamentos(id) ON DELETE CASCADE,
  FOREIGN KEY (servico_id) REFERENCES servicos(id) ON DELETE RESTRICT,
  FOREIGN KEY (profissional_id) REFERENCES profissionais(id) ON DELETE RESTRICT
);

CREATE INDEX idx_agendamento_servicos ON agendamento_servicos (agendamento_id, ordem);

-- Bloqueios de horário (almoço, folga pontual, manutenção, evento).
-- profissional_id NULL = bloqueio de todo o estabelecimento.
CREATE TABLE bloqueios_agenda (
  id                 CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  estabelecimento_id CHAR(36) NOT NULL,
  profissional_id    CHAR(36),
  data               DATE NOT NULL,
  hora_inicio        TIME NOT NULL,
  hora_fim           TIME NOT NULL,
  tipo               ENUM('almoco', 'folga', 'manutencao', 'evento', 'outro') NOT NULL DEFAULT 'outro',
  motivo             VARCHAR(255),
  criado_em          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK (hora_fim > hora_inicio),
  FOREIGN KEY (estabelecimento_id) REFERENCES estabelecimentos(id) ON DELETE CASCADE,
  FOREIGN KEY (profissional_id) REFERENCES profissionais(id) ON DELETE CASCADE
);

CREATE INDEX idx_bloqueios_dia ON bloqueios_agenda (estabelecimento_id, data);

-- ============================================================
-- 6. Estoque
-- ============================================================
CREATE TABLE fornecedores (
  id                 CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  estabelecimento_id CHAR(36) NOT NULL,
  nome               VARCHAR(255) NOT NULL,
  contato            VARCHAR(255),
  FOREIGN KEY (estabelecimento_id) REFERENCES estabelecimentos(id) ON DELETE CASCADE
);

CREATE TABLE produtos (
  id                  CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  estabelecimento_id  CHAR(36) NOT NULL,
  nome                VARCHAR(255) NOT NULL,
  categoria           VARCHAR(255) NOT NULL,
  quantidade          INTEGER NOT NULL DEFAULT 0,
  quantidade_minima   INTEGER NOT NULL DEFAULT 0,
  custo               NUMERIC(10,2) NOT NULL DEFAULT 0,
  preco_venda         NUMERIC(10,2),
  fornecedor_id       CHAR(36),
  ativo               BOOLEAN NOT NULL DEFAULT TRUE,
  criado_em           DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (estabelecimento_id) REFERENCES estabelecimentos(id) ON DELETE CASCADE,
  FOREIGN KEY (fornecedor_id) REFERENCES fornecedores(id) ON DELETE SET NULL
);

-- Consumo de produto por serviço, com quantidade fracionada (baixa automática).
-- Ex.: cada "Platinado" consome 0.250 de Pó Descolorante.
CREATE TABLE servico_consumo (
  servico_id CHAR(36) NOT NULL,
  produto_id CHAR(36) NOT NULL,
  quantidade NUMERIC(10,3) NOT NULL DEFAULT 1 CHECK (quantidade > 0),
  PRIMARY KEY (servico_id, produto_id),
  FOREIGN KEY (servico_id) REFERENCES servicos(id) ON DELETE CASCADE,
  FOREIGN KEY (produto_id) REFERENCES produtos(id) ON DELETE CASCADE
);

CREATE TABLE movimentacoes_estoque (
  id             CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  produto_id     CHAR(36) NOT NULL,
  tipo           ENUM('entrada', 'saida') NOT NULL,
  quantidade     INTEGER NOT NULL CHECK (quantidade > 0),
  motivo         TEXT,
  agendamento_id CHAR(36),
  criado_em      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (produto_id) REFERENCES produtos(id) ON DELETE CASCADE,
  FOREIGN KEY (agendamento_id) REFERENCES agendamentos(id) ON DELETE SET NULL
);

CREATE INDEX idx_mov_estoque_produto ON movimentacoes_estoque (produto_id, criado_em DESC);

-- ============================================================
-- 7. Financeiro / Caixa
-- ============================================================
CREATE TABLE caixas (
  id                 CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  estabelecimento_id CHAR(36) NOT NULL,
  operador_id        CHAR(36) NOT NULL,
  aberto_em          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  valor_abertura     NUMERIC(10,2) NOT NULL DEFAULT 0,
  fechado_em         DATETIME,
  valor_fechamento   NUMERIC(10,2),
  FOREIGN KEY (estabelecimento_id) REFERENCES estabelecimentos(id) ON DELETE CASCADE,
  FOREIGN KEY (operador_id) REFERENCES usuarios(id)
);

CREATE TABLE lancamentos (
  id                 CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  estabelecimento_id CHAR(36) NOT NULL,
  caixa_id           CHAR(36),
  tipo               ENUM('receita', 'despesa') NOT NULL,
  categoria          VARCHAR(255) NOT NULL,
  descricao          TEXT NOT NULL,
  valor              NUMERIC(10,2) NOT NULL CHECK (valor >= 0),
  forma              ENUM('pix', 'cartao', 'dinheiro') NOT NULL,
  profissional_id    CHAR(36),
  agendamento_id     CHAR(36),
  produto_id         CHAR(36),                         -- quando a receita é venda de produto
  criado_em          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (estabelecimento_id) REFERENCES estabelecimentos(id) ON DELETE CASCADE,
  FOREIGN KEY (caixa_id) REFERENCES caixas(id) ON DELETE SET NULL,
  FOREIGN KEY (profissional_id) REFERENCES profissionais(id) ON DELETE SET NULL,
  FOREIGN KEY (agendamento_id) REFERENCES agendamentos(id) ON DELETE SET NULL,
  FOREIGN KEY (produto_id) REFERENCES produtos(id) ON DELETE SET NULL
);

CREATE INDEX idx_lancamentos_dia ON lancamentos (estabelecimento_id, criado_em);

CREATE TABLE contas_receber (
  id                 CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  estabelecimento_id CHAR(36) NOT NULL,
  cliente_id         CHAR(36) NOT NULL,
  descricao          TEXT NOT NULL,
  valor              NUMERIC(10,2) NOT NULL,
  vencimento         DATE NOT NULL,
  agendamento_id     CHAR(36),
  pago_em            DATETIME,
  lancamento_id      CHAR(36),
  criado_em          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (estabelecimento_id) REFERENCES estabelecimentos(id) ON DELETE CASCADE,
  FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE RESTRICT,
  FOREIGN KEY (agendamento_id) REFERENCES agendamentos(id) ON DELETE SET NULL,
  FOREIGN KEY (lancamento_id) REFERENCES lancamentos(id) ON DELETE SET NULL
);

CREATE INDEX idx_contas_receber_venc ON contas_receber (estabelecimento_id, vencimento);

-- ============================================================
-- 8. Comissões
-- ============================================================
CREATE TABLE fechamentos_comissao (
  id                 CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  estabelecimento_id CHAR(36) NOT NULL,
  profissional_id    CHAR(36) NOT NULL,
  periodo_inicio     DATE NOT NULL,
  periodo_fim        DATE NOT NULL,
  status             ENUM('aberto', 'pago') NOT NULL DEFAULT 'aberto',
  valor_pago         NUMERIC(10,2),
  pago_em            DATETIME,
  UNIQUE (profissional_id, periodo_inicio, periodo_fim),
  FOREIGN KEY (estabelecimento_id) REFERENCES estabelecimentos(id) ON DELETE CASCADE,
  FOREIGN KEY (profissional_id) REFERENCES profissionais(id) ON DELETE CASCADE
);

-- ============================================================
-- 9. Fidelidade & Marketing
-- ============================================================
CREATE TABLE config_fidelidade (
  estabelecimento_id CHAR(36) PRIMARY KEY,
  tipo               ENUM('pontos', 'cashback') NOT NULL DEFAULT 'pontos',
  meta_pontos        INTEGER NOT NULL DEFAULT 10,
  recompensa         TEXT,
  cashback_pct       NUMERIC(5,2) NOT NULL DEFAULT 0,
  ativo              BOOLEAN NOT NULL DEFAULT TRUE,
  FOREIGN KEY (estabelecimento_id) REFERENCES estabelecimentos(id) ON DELETE CASCADE
);

CREATE TABLE fidelidade_movimentos (
  id             CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  cliente_id     CHAR(36) NOT NULL,
  tipo           ENUM('acumulo', 'resgate', 'ajuste') NOT NULL,
  pontos         INTEGER NOT NULL,
  agendamento_id CHAR(36),
  criado_em      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE CASCADE,
  FOREIGN KEY (agendamento_id) REFERENCES agendamentos(id) ON DELETE SET NULL
);

CREATE TABLE campanhas (
  id                 CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  estabelecimento_id CHAR(36) NOT NULL,
  nome               VARCHAR(255) NOT NULL,
  tipo               ENUM('retorno', 'aniversario', 'promo') NOT NULL,
  alvo               TEXT NOT NULL,
  cor                VARCHAR(32),                       -- rótulo visual (hex ou token de tema)
  status             ENUM('rascunho', 'agendada', 'ativa', 'encerrada') NOT NULL DEFAULT 'rascunho',
  criado_em          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (estabelecimento_id) REFERENCES estabelecimentos(id) ON DELETE CASCADE
);

CREATE TABLE campanha_envios (
  id           CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  campanha_id  CHAR(36) NOT NULL,
  cliente_id   CHAR(36) NOT NULL,
  enviado_em   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  retornou_em  DATETIME,
  UNIQUE (campanha_id, cliente_id),
  FOREIGN KEY (campanha_id) REFERENCES campanhas(id) ON DELETE CASCADE,
  FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE CASCADE
);

CREATE TABLE modelos_mensagem (
  id                 CHAR(36) PRIMARY KEY DEFAULT (UUID()),
  estabelecimento_id CHAR(36) NOT NULL,
  nome               VARCHAR(255) NOT NULL,
  gatilho            TEXT NOT NULL,
  texto              TEXT NOT NULL,
  FOREIGN KEY (estabelecimento_id) REFERENCES estabelecimentos(id) ON DELETE CASCADE
);

-- ============================================================
-- Views de exemplo — valores derivados (não armazenados)
-- NOTA: MySQL não suporta a sintaxe FILTER para COUNT/SUM/AVG.
--       As views abaixo foram adaptadas para usar CASE WHEN.
-- ============================================================

-- Estatísticas do cliente (visitas, ticket médio, total, última visita, frequência)
CREATE VIEW vw_cliente_stats AS
SELECT
  c.id AS cliente_id,
  COUNT(CASE WHEN a.status = 'concluido' THEN a.id END) AS visitas,
  COALESCE(AVG(CASE WHEN a.status = 'concluido' THEN a.valor END), 0) AS ticket_medio,
  COALESCE(SUM(CASE WHEN a.status = 'concluido' THEN a.valor END), 0) AS total_gasto,
  MAX(CASE WHEN a.status = 'concluido' THEN a.data END) AS ultima_visita,
  CASE WHEN COUNT(CASE WHEN a.status = 'concluido' THEN a.id END) > 1
       THEN DATEDIFF(MAX(CASE WHEN a.status = 'concluido' THEN a.data END),
                      MIN(CASE WHEN a.status = 'concluido' THEN a.data END))
            / NULLIF(COUNT(CASE WHEN a.status = 'concluido' THEN a.id END) - 1, 0)
       ELSE NULL END AS frequencia_dias
FROM clientes c
LEFT JOIN agendamentos a ON a.cliente_id = c.id
GROUP BY c.id;

-- Total vendido por profissional no mês corrente (campo "vendido" do mock)
CREATE VIEW vw_profissional_vendido AS
SELECT
  p.id AS profissional_id,
  COALESCE(SUM(CASE
    WHEN a.status = 'concluido'
      AND DATE_FORMAT(a.data, '%Y-%m') = DATE_FORMAT(CURRENT_DATE(), '%Y-%m')
    THEN a.valor END
  ), 0) AS vendido_mes
FROM profissionais p
LEFT JOIN agendamentos a ON a.profissional_id = p.id
GROUP BY p.id;

-- Itens de comissão de um período (base da tela de comissões).
-- Usa agendamento_servicos quando há detalhamento; senão, cai no resumo do agendamento.
-- (UNION dos itens detalhados + agendamentos sem itens, evitando dupla contagem.)
CREATE VIEW vw_comissao_itens AS
SELECT
  it.profissional_id,
  a.data,
  a.cliente_id,
  it.servico_id,
  it.valor,
  COALESCE(it.comissao_pct, p.comissao_pct) AS comissao_pct,
  (it.valor * COALESCE(it.comissao_pct, p.comissao_pct) / 100) AS valor_comissao
FROM agendamento_servicos it
JOIN agendamentos a ON a.id = it.agendamento_id
JOIN profissionais p ON p.id = it.profissional_id
WHERE a.status = 'concluido'
UNION ALL
SELECT
  a.profissional_id,
  a.data,
  a.cliente_id,
  a.servico_id,
  a.valor,
  COALESCE(a.comissao_pct, p.comissao_pct) AS comissao_pct,
  (a.valor * COALESCE(a.comissao_pct, p.comissao_pct) / 100) AS valor_comissao
FROM agendamentos a
JOIN profissionais p ON p.id = a.profissional_id
WHERE a.status = 'concluido'
  AND NOT EXISTS (SELECT 1 FROM agendamento_servicos it WHERE it.agendamento_id = a.id);

-- Fluxo de caixa diário (gráfico do financeiro)
CREATE VIEW vw_fluxo_diario AS
SELECT
  l.estabelecimento_id,
  DATE(l.criado_em) AS dia,
  COALESCE(SUM(CASE WHEN l.tipo = 'receita' THEN l.valor END), 0) AS receitas,
  COALESCE(SUM(CASE WHEN l.tipo = 'despesa' THEN l.valor END), 0) AS despesas
FROM lancamentos l
GROUP BY l.estabelecimento_id, DATE(l.criado_em);

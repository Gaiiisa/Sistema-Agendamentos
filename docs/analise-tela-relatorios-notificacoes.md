# Nova Tela — Central de Relatórios & Notificações

> **Sistema analisado:** SaaS de agendamento — _"Navalha & Cia"_ (barbearia)
> **Arquivos-base do mapeamento:**
> - `src/app/data.service.ts` — modelo de dados completo (fonte da verdade)
> - `src/app/screens/relatorios.component.ts` — tela de BI já existente (a nova tela **complementa**, não substitui)
> - `src/app/screens/fidelidade.component.ts` — `modelos` (templates de mensagem ao cliente) e `campanhas`
> - `src/app/shared/sidebar.component.ts` / `src/app/app.component.ts` — navegação e mecanismo de `notify()` (toast in-app)
>
> **Data da análise:** 2026-06-29
> **Perfil-foco:** Gestor / Dono (decisão, controle operacional, financeiro e gestão de equipe)

---

## 1. Visão geral da nova tela

Hoje o sistema **já tem BI** (tela `Relatórios / BI`, somente visualização: faturamento, ticket, ocupação, no-show, ranking de serviços, heatmap) e **já tem notificações ao cliente** (aba _Modelos_ da Fidelidade, com `gatilho` + `canal` WhatsApp). O que **não existe** é:

1. um lugar para **exportar** dados de qualquer módulo em formato de arquivo (Excel/PDF/CSV);
2. um lugar para configurar as **notificações internas** — as que avisam o **gestor e a equipe** (não o cliente) sobre eventos operacionais, financeiros e de estoque;
3. **controle de quem recebe o quê**, por qual canal, com qual prioridade.

A nova tela — proposta de nome **"Relatórios & Alertas"** (id de rota: `central`) — preenche exatamente essa lacuna. Ela é dividida em duas áreas em abas:

| Aba | Função | Complementa |
|---|---|---|
| **📤 Relatórios** | Catálogo de relatórios exportáveis + filtros + histórico de exportações | A tela `Relatórios/BI` (que continua sendo a de _visualização_ analítica) |
| **🔔 Notificações** | Matriz de eventos × destinatários × canais, com prioridade e recorrência | A aba `Modelos` da Fidelidade (que continua cuidando das mensagens **ao cliente**) |

> **Distinção crítica para não confundir os módulos:**
> - **Modelos (Fidelidade)** = mensagens que saem **para o cliente** (confirmação, lembrete, aniversário, reativação).
> - **Notificações (nova tela)** = avisos que chegam **para a equipe interna** (gestor, atendente, profissional). É disso que esta tela trata. Onde houver sobreposição (ex.: "novo agendamento" notifica tanto o cliente quanto o gestor), a tela referencia o módulo de origem.

---

## 2. Objetivo da funcionalidade

Dar ao **gestor** controle centralizado sobre **o que sai do sistema** (exportações) e **o que entra como alerta** (notificações), respeitando permissões por cargo. Em uma frase: _transformar o sistema de um painel passivo em uma ferramenta que avisa a pessoa certa, no canal certo, na hora certa — e que entrega dados prontos para análise externa (contador, sócio, planejamento)._

Metas concretas:
- Reduzir perdas operacionais (faltas, estoque zerado, contas a receber atrasadas) via alerta proativo.
- Acelerar fechamento contábil/fiscal e prestação de contas a sócios (exportações padronizadas).
- Dar autonomia segura: cada cargo configura/exporta só o que lhe compete.

---

## 3. Modelo de cargos assumido (base das permissões)

O sistema hoje tem um único usuário (`data.usuario` = _Carlos Menezes · Dono / Admin_) e a equipe em `staff` (4 profissionais). Para a tela fazer sentido, assumimos a evolução natural para **4 cargos**:

| Cargo | Quem é | Escopo padrão |
|---|---|---|
| **Admin / Dono** | Carlos Menezes | Tudo: configura notificações globais, exporta qualquer relatório (inclusive sensíveis). |
| **Gestor** | Gerente de unidade | Quase tudo, exceto dados societários/fiscais críticos e gestão de usuários. |
| **Atendente / Recepção** | Operação do balcão | Relatórios operacionais (agenda, clientes, no-show); notificações operacionais. **Sem** financeiro consolidado, comissões ou margem. |
| **Profissional** | Rafael, Diego, Lucas, Bruno (`staff`) | Só os **próprios** dados: própria agenda, próprias comissões, próprio desempenho. |

Esse modelo é o eixo das seções 6 (permissão de relatório) e 7 (destinatário de notificação).

---

## 4. Mapeamento completo de RELATÓRIOS

Para cada relatório: **objetivo · dados · filtros · formato · permissão · módulo de origem · valor para o gestor.** Todos os dados citados existem no `data.service.ts`.

### Categoria A — Agendamentos & Operação

#### R1 · Relatório de Agendamentos
- **Objetivo:** consolidar todos os horários de um período por status.
- **Dados:** data, hora, cliente, serviço, profissional, status (`pendente/confirmado/atendimento/concluido/faltou/cancelado`), valor, sinal pago (sim/não). _(arrays `agendamentos` + `hoje`)_
- **Filtros:** período · profissional · serviço · status · cliente.
- **Formato:** **Excel** (operacional, permite ordenar/filtrar) e **CSV**.
- **Permissão:** Admin, Gestor, Atendente (Profissional só os próprios).
- **Origem:** Agenda / Agendamentos.
- **Valor:** base de tudo — volume, mix de serviços, distribuição por profissional.

#### R2 · Relatório de Cancelamentos & Faltas (No-show)
- **Objetivo:** quantificar e qualificar perda por `cancelado` + `faltou`.
- **Dados:** data, cliente, serviço, profissional, status, valor perdido, sinal retido/devolvido, reincidência do cliente. _(`status` `faltou`/`cancelado`; cruzar com `relatorio.noShowTaxa/noShowQtd/noShowCusto`)_
- **Filtros:** período · profissional · cliente · tipo (falta vs cancelamento).
- **Formato:** **PDF** (apresentação) + **Excel**.
- **Permissão:** Admin, Gestor, Atendente.
- **Origem:** Agendamentos + BI.
- **Valor:** dinheiro deixado na mesa. Identifica clientes reincidentes (candidatos a exigir sinal) — hoje o BI mostra o total (`noShowCusto: 320`), mas não **quem**.

#### R3 · Relatório de Ocupação da Agenda
- **Objetivo:** medir aproveitamento de horas vendidas vs disponíveis.
- **Dados:** ocupação por dia/semana, por faixa de horário (heatmap), por profissional. _(`relatorio.ocupacaoSemana`, `relatorio.heatmap`, `ocupacaoPorHora()`)_
- **Filtros:** período · profissional · dia da semana.
- **Formato:** **PDF**.
- **Permissão:** Admin, Gestor.
- **Valor:** revela buracos de agenda (ex.: terça/quarta fracas) → base para promoção dirigida ("Terça do Degradê" já existe como campanha).

### Categoria B — Clientes (CRM)

#### R4 · Relatório de Clientes (base completa)
- **Objetivo:** cadastro analítico da carteira.
- **Dados:** nome, contato (wpp/email), nascimento, tags (`vip/novo/sumido`), visitas, ticket médio, total gasto (LTV), última visita, frequência (dias), profissional favorito. _(array `clientes`)_
- **Filtros:** tag · profissional favorito · faixa de LTV · período de cadastro.
- **Formato:** **Excel** / **CSV** (importável em ferramentas de marketing).
- **Permissão:** Admin, Gestor (Atendente: versão **sem** LTV/total).
- **Valor:** ativo nº 1 do negócio — a carteira.

#### R5 · Relatório de Clientes Ausentes / Inativos (em risco)
- **Objetivo:** lista nominal de quem parou de voltar.
- **Dados:** cliente, última visita, dias sem retornar, frequência habitual, LTV, profissional favorito, tag. _(usar `clientesEmRisco()` — já existe: tag `sumido` OU `diasDesde(ultima) > 60`)_
- **Filtros:** dias sem retorno (30/60/90) · LTV mínimo · profissional.
- **Formato:** **Excel** / **CSV**.
- **Permissão:** Admin, Gestor, Atendente.
- **Valor:** **o relatório de retenção mais acionável.** Vira lista de campanha de reativação em 1 passo (integra com a campanha "Cliente sumido — volta aí").

#### R6 · Relatório de Aniversariantes
- **Objetivo:** oportunidades de relacionamento/oferta.
- **Dados:** cliente, data de nascimento, contato, tag, última visita. _(campo `nasc`)_
- **Filtros:** mês · próximos 7/15/30 dias.
- **Formato:** **CSV** / **Excel**.
- **Permissão:** Admin, Gestor, Atendente.
- **Valor:** alimenta a campanha "Feliz aniversário 🎂".

### Categoria C — Financeiro

#### R7 · Relatório Financeiro Consolidado (DRE simplificado)
- **Objetivo:** receita × despesa × resultado do período.
- **Dados:** receita por categoria (Atendimento/Produto), despesa por categoria (Insumos/Marketing/Operacional), resultado, ticket médio, comparativo com período anterior, fluxo diário. _(`financeiro.*`, `relatorio.faturamento/faturamentoAnt`)_
- **Filtros:** período · categoria.
- **Formato:** **PDF** (relatório para sócio/contador) + **Excel**.
- **Permissão:** **Admin, Gestor apenas** (sensível).
- **Valor:** documento de prestação de contas e decisão de investimento.

#### R8 · Relatório de Pagamentos / Lançamentos
- **Objetivo:** extrato detalhado do caixa.
- **Dados:** data/hora, tipo (receita/despesa), categoria, descrição, valor, forma (pix/cartão/dinheiro), profissional vinculado. _(array `lancamentos`)_
- **Filtros:** período · tipo · forma de pagamento · categoria · profissional.
- **Formato:** **Excel** / **CSV** (conciliação bancária).
- **Permissão:** Admin, Gestor.
- **Valor:** base de conciliação e auditoria de caixa.

#### R9 · Relatório de Contas a Receber
- **Objetivo:** controlar fiados, saldos e sinais pendentes.
- **Dados:** cliente, descrição, valor, vencimento, dias em atraso (negativo = vencido). _(array `aReceber` — ex.: `r2` com `dias: -1` já vencido)_
- **Filtros:** status (a vencer / vencido) · cliente · período de vencimento.
- **Formato:** **PDF** + **Excel**.
- **Permissão:** Admin, Gestor.
- **Valor:** evita "esquecer" dinheiro a receber; prioriza cobrança.

#### R10 · Relatório de Formas de Pagamento
- **Objetivo:** distribuição do recebido por meio.
- **Dados:** Pix / Cartão / Dinheiro — valor e %. _(`financeiro.receitaForma`, `relatorio.porForma`)_
- **Filtros:** período.
- **Formato:** **PDF**.
- **Permissão:** Admin, Gestor.
- **Valor:** negociação de taxa de maquininha; previsão de antecipação.

### Categoria D — Vendas, Serviços & Produtos

#### R11 · Relatório de Vendas de Produtos
- **Objetivo:** isolar receita de **revenda** (não-serviço).
- **Dados:** produto, qtd vendida, receita, margem (preço − custo). _(lançamentos `cat: 'Produto'` + `produtos.preco/custo`)_
- **Filtros:** período · produto · profissional que vendeu.
- **Formato:** **Excel**.
- **Permissão:** Admin, Gestor.
- **Valor:** revela se a revenda compensa e quem mais vende no balcão.

#### R12 · Relatório de Serviços (ranking & margem)
- **Objetivo:** quais serviços geram volume e lucro.
- **Dados:** serviço, categoria, qtd executada, receita, custo, **margem**, duração média. _(`relatorio.rankingServicos` + `servicos.preco/custo/dur`)_
- **Filtros:** período · categoria (Cabelo/Barba/Combo/Química/Estética) · profissional.
- **Formato:** **PDF** + **Excel**.
- **Permissão:** Admin, Gestor.
- **Valor:** decisão de preço, foco comercial e tabela de combos.

#### R13 · Relatório de Estoque (posição atual)
- **Objetivo:** inventário e itens em ruptura.
- **Dados:** produto, categoria, qtd atual, mínimo, **status (abaixo do mínimo?)**, custo, valor imobilizado, fornecedor, serviço de consumo. _(array `produtos`; `produtosAlerta` já lista qtd ≤ mín — ex.: Pomada 3/8, Cera 1/6, Lâminas 2/5)_
- **Filtros:** categoria · fornecedor · só abaixo do mínimo.
- **Formato:** **Excel** / **PDF**.
- **Permissão:** Admin, Gestor.
- **Valor:** evita parar atendimento por falta de insumo; planeja compra.

#### R14 · Relatório de Movimentações de Estoque (entradas/saídas)
- **Objetivo:** rastrear consumo e compras.
- **Dados:** data/hora, produto, tipo (entrada/saída), qtd, motivo (consumo/compra/fornecedor). _(array `movEstoque`)_
- **Filtros:** período · produto · tipo · fornecedor.
- **Formato:** **Excel** / **CSV**.
- **Permissão:** Admin, Gestor.
- **Valor:** identifica desperdício/furo e valida compras. _(Nota: o sistema hoje tem **movimentações**, mas **não tem módulo formal de Pedidos/Compras** — ver seção 12.)_

### Categoria E — Equipe & Comissões

#### R15 · Relatório de Desempenho por Profissional
- **Objetivo:** ranking de produtividade.
- **Dados:** profissional, atendimentos, receita gerada, ticket médio, ocupação, % da meta (`vendido/meta`), no-show atribuído. _(`staff.meta/vendido`, `financeiro.porProfissional`, `desempenhoHoje()`, `metasEquipe()`)_
- **Filtros:** período · profissional.
- **Formato:** **PDF** (reunião de equipe) + **Excel**.
- **Permissão:** Admin, Gestor (Profissional: só o próprio).
- **Valor:** base de feedback, bonificação e escala.

#### R16 · Relatório de Comissões
- **Objetivo:** fechamento de comissão por período.
- **Dados:** profissional, itens (data/cliente/serviço/valor), base, % comissão, total a pagar, status (aberto/pago). _(`comissoes`, `staff.comissao`, `comissoesAPagar`)_
- **Filtros:** período de fechamento · profissional · status.
- **Formato:** **PDF** (comprovante por profissional) + **Excel**.
- **Permissão:** **Admin, Gestor** (Profissional: só o próprio recibo).
- **Valor:** pagamento sem erro e transparente — substitui planilha manual.

#### R17 · Relatório de Equipe (cadastro & jornada)
- **Objetivo:** dados contratuais e disponibilidade.
- **Dados:** profissional, especialidades, % comissão, meta, contato, jornada (início/fim), folgas. _(array `staff`)_
- **Filtros:** especialidade · dia de folga.
- **Formato:** **Excel** / **PDF**.
- **Permissão:** **Admin apenas** (dados de contrato/contato).
- **Valor:** gestão de escala e capacidade instalada.

### Categoria F — Marketing & Fidelidade

#### R18 · Relatório de Campanhas
- **Objetivo:** ROI de marketing de relacionamento.
- **Dados:** campanha, tipo, público-alvo, enviadas, retornos, **taxa de conversão**, status. _(array `campanhas`)_
- **Filtros:** período · tipo (retorno/aniversário/promo) · status.
- **Formato:** **PDF** + **Excel**.
- **Permissão:** Admin, Gestor.
- **Valor:** decide onde investir o marketing (a campanha aniversário converte 44% vs promo 34%).

#### R19 · Relatório de Fidelidade
- **Objetivo:** saúde do programa de pontos/cashback.
- **Dados:** clientes ativos no programa, pontos emitidos, recompensas resgatadas, próximos do prêmio. _(`fidelidade.*`)_
- **Filtros:** período · status do cliente no programa.
- **Formato:** **Excel**.
- **Permissão:** Admin, Gestor.
- **Valor:** mede se o programa retém. _(Atenção: hoje os números de `fidelidade` são parcialmente fixos — ver `docs/analise-tela-fidelidade.md`. O relatório só terá valor após corrigir aquela base.)_

### Categoria G — Gerencial consolidado

#### R20 · Relatório Gerencial (KPIs consolidados)
- **Objetivo:** uma página com tudo que importa para decisão.
- **Dados:** faturamento (vs anterior), ticket médio, ocupação, no-show, novos vs recorrentes, taxa de retorno, projeção do mês, comissões a pagar, alertas de estoque. _(consolida `relatorio.*`, `metaMes()`, `taxaRetorno()`, `projecaoMes()`, `comissoesAPagar`, `produtosAlerta`)_
- **Filtros:** período (semana/mês/ano — mesmo recorte do BI).
- **Formato:** **PDF** (relatório executivo — ideal para envio recorrente por e-mail).
- **Permissão:** **Admin, Gestor.**
- **Valor:** "o raio-X do negócio em 1 folha". Forte candidato a **exportação recorrente automática** (ver seção 9).

> **Resumo de cobertura:** dos 16 tipos de relatório pedidos no briefing, **15 têm dados reais no sistema hoje.** O único sem base própria é **Compras/Pedidos** (existe só como `movEstoque` de entrada + campo `fornecedor`) — tratado como melhoria futura (seção 12).

---

## 5. Mapeamento completo de NOTIFICAÇÕES

Atributos por notificação: **evento · módulo · quem recebe · canais · prioridade · obrigatória/configurável · liga-desliga · escolha de destinatário · escopo (cargo/usuário/grupo) · exemplo de mensagem.**

Convenções:
- **Canais:** 🟦 Sistema (toast/central in-app — já existe via `notify()`) · ✉️ E-mail · 🟢 WhatsApp · 📱 Push.
- **Prioridade:** 🔴 Alta · 🟡 Média · ⚪ Baixa.
- **Obrigatória** = não pode ser totalmente desligada (apenas escolher canais); **Configurável** = pode ligar/desligar.

### Categoria 1 — Agendamentos

| # | Notificação | Evento (gatilho) | Recebe | Canais | Prior. | Tipo | Exemplo de mensagem |
|---|---|---|---|---|---|---|---|
| N1 | Novo agendamento | `agendamento_criado` | Gestor, Atendente, Profissional do horário | 🟦 ✉️ 📱 | 🟡 | Configurável | "Novo agendamento: André Lima — Corte+Barba com Rafa, 09/06 às 14h." |
| N2 | Agendamento confirmado | status → `confirmado` | Atendente, Profissional | 🟦 | ⚪ | Configurável | "André confirmou o horário das 14h." |
| N3 | Agendamento reagendado | `updateAppt` (ini/prof alterado) | Profissional (antigo e novo), Atendente | 🟦 📱 | 🟡 | Configurável | "Horário de André movido para 15h30 / com Diego." |
| N4 | Agendamento cancelado | status → `cancelado` | Gestor, Atendente, Profissional | 🟦 📱 ✉️ | 🔴 | Configurável | "Cancelado: Caio Fernandes — Corte 17h. Horário liberado." |
| N5 | Lembrete de horário próximo | X min antes de `ini` | Profissional | 🟦 📱 | 🟡 | Configurável (definir antecedência) | "Seu próximo cliente (Thiago) chega em 15 min." |
| N6 | Cliente faltou (no-show) | status → `faltou` | Gestor, Atendente | 🟦 ✉️ | 🔴 | **Obrigatória** | "Falta registrada: Rodrigo — Corte 09h (perda R$ 45)." |

### Categoria 2 — Clientes (CRM)

| # | Notificação | Evento | Recebe | Canais | Prior. | Tipo | Exemplo |
|---|---|---|---|---|---|---|---|
| N7 | Cliente inativo / sem retorno | `cliente_inativo` (`diasDesde(ultima) > 60` ou tag `sumido`) | Gestor, Atendente | 🟦 ✉️ | 🟡 | Configurável | "5 clientes passaram de 60 dias sem voltar. Ver lista de reativação." |
| N8 | Novo cliente cadastrado | `addCliente` | Gestor, Atendente | 🟦 | ⚪ | Configurável | "Novo cliente: Pedro Henrique (veio pelo Instagram)." |
| N9 | Aniversário de cliente | `aniversario` (campo `nasc`) | Atendente | 🟦 🟢 | ⚪ | Configurável | "Hoje é aniversário de André Lima 🎉 — vale uma oferta." |

### Categoria 3 — Financeiro

| # | Notificação | Evento | Recebe | Canais | Prior. | Tipo | Exemplo |
|---|---|---|---|---|---|---|---|
| N10 | Pagamento recebido | `lancamento` tipo `receita` | Gestor (Profissional: o próprio) | 🟦 | ⚪ | Configurável | "Recebido R$ 70 (Pix) — Corte+Barba do Eduardo." |
| N11 | Conta a receber a vencer | `aReceber.dias` chega a 0/1 | Gestor, Atendente | 🟦 ✉️ | 🟡 | Configurável | "Sinal do Platinado (Vinícius) vence amanhã — R$ 75." |
| N12 | Conta a receber **atrasada** | `aReceber.dias < 0` | Gestor | 🟦 ✉️ 📱 | 🔴 | **Obrigatória** | "Vencido: saldo de barba do Leonardo (R$ 20) — 1 dia em atraso." |
| N13 | Despesa relevante lançada | `lancamento` tipo `despesa` acima de limite | Gestor | 🟦 | 🟡 | Configurável (definir valor-gatilho) | "Despesa de R$ 150 (Insumos) registrada por Carlos." |
| N14 | Fechamento de caixa / resumo do dia | fim do expediente | Gestor, Admin | 🟦 ✉️ | 🟡 | Configurável (recorrente) | "Caixa do dia: R$ 410 recebidos · R$ 278 despesas · resultado +R$ 132." |
| N15 | Meta do mês (marco) | `metaMes().pct` cruza 50/80/100% | Gestor, Admin | 🟦 📱 | 🟡 | Configurável | "🎯 Equipe bateu 80% da meta do mês." |

### Categoria 4 — Vendas & Estoque

| # | Notificação | Evento | Recebe | Canais | Prior. | Tipo | Exemplo |
|---|---|---|---|---|---|---|---|
| N16 | Venda de produto realizada | `lancamento` `cat: 'Produto'` | Gestor | 🟦 | ⚪ | Configurável | "Venda balcão: Óleo para Barba — R$ 45." |
| N17 | Produto com estoque **baixo** | `qtd ≤ min` (`produtosAlerta`) | Gestor, Atendente | 🟦 ✉️ | 🟡 | Configurável | "Estoque baixo: Pomada Modeladora (3 de 8 mín.)." |
| N18 | Produto **sem** estoque | `qtd = 0` | Gestor, Atendente | 🟦 📱 ✉️ | 🔴 | **Obrigatória** | "ZERADO: Cera Capilar. Atendimentos que a usam podem parar." |
| N19 | Entrada de compra registrada | `movEstoque` tipo `entrada` | Gestor | 🟦 | ⚪ | Configurável | "Entrada: +12 Óleo para Barba (Barba Brava Dist.)." |

### Categoria 5 — Marketing & Fidelidade

| # | Notificação | Evento | Recebe | Canais | Prior. | Tipo | Exemplo |
|---|---|---|---|---|---|---|---|
| N20 | Nova campanha criada | `addCampanha` | Gestor, Admin | 🟦 | ⚪ | Configurável | "Campanha 'Terça do Degradê' criada (rascunho)." |
| N21 | Campanha ativada/finalizada | `campanha.status` → ativa/finalizada | Gestor | 🟦 ✉️ | ⚪ | Configurável | "Campanha 'Combo -20%' encerrada: 34% de conversão." |
| N22 | Cliente atingiu recompensa de fidelidade | `visitas` cruza `meta` | Gestor, Atendente | 🟦 🟢 | 🟡 | Configurável | "Thiago atingiu 10 pontos — liberar 1 corte grátis." |

### Categoria 6 — Administrativo & Segurança

| # | Notificação | Evento | Recebe | Canais | Prior. | Tipo | Exemplo |
|---|---|---|---|---|---|---|---|
| N23 | Alteração sensível por usuário interno | edição de preço/comissão/usuário | **Admin** | 🟦 ✉️ | 🔴 | **Obrigatória** | "Carlos alterou a comissão de Diego de 45% para 50%." |
| N24 | Novo usuário / mudança de cargo | gestão de usuários | **Admin** | 🟦 ✉️ | 🔴 | **Obrigatória** | "Novo acesso de 'Atendente' criado para Marina." |
| N25 | Alerta operacional do dia | abertura de caixa / agenda vazia / sobrecarga | Gestor, Atendente | 🟦 | 🟡 | Configurável | "Hoje a agenda do Bruno está com 1 horário só." |

**Detalhamento dos atributos de configurabilidade** (aplicável às tabelas acima):
- **Escolha de destinatário:** todas permitem _adicionar/remover_ destinatários, exceto as **obrigatórias administrativas** (N23, N24) que vão **sempre** ao Admin.
- **Escopo por cargo/usuário/grupo:** o gestor define o público de cada notificação por **cargo** (ex.: "todos os Profissionais"), **usuário específico** (ex.: só o Rafael) ou **grupo** (ex.: "equipe da manhã"). Notificações pessoais (N5, N10-profissional, N16) seguem regra "o dono do dado recebe".
- **Imediata vs agendada:** N1–N13, N16–N24 são **imediatas**; N7, N14, N15, N20 podem ser **agendadas/resumidas** (digest diário/semanal — ver seção 7).

---

## 6. Sugestão de layout da tela

```
┌──────────────────────────────────────────────────────────────┐
│  Relatórios & Alertas                          [Admin/Dono]   │
│  ┌────────────┐ ┌──────────────┐                              │
│  │ 📤 Relatórios │ │ 🔔 Notificações │   ← abas (seg control)    │
│  └────────────┘ └──────────────┘                              │
└──────────────────────────────────────────────────────────────┘

ABA RELATÓRIOS
┌──────────── filtros (linha) ───────────────────────────────────┐
│ [Categoria ▾] [Período: Semana|Mês|Ano|Custom] [🔍 buscar]     │
└────────────────────────────────────────────────────────────────┘
┌── catálogo (grid de cards, minmax(280px,1fr)) ─────────────────┐
│ ┌───────────────┐ ┌───────────────┐ ┌───────────────┐         │
│ │ R1 Agendamentos│ │ R7 Financeiro  │ │ R16 Comissões │  ...    │
│ │ ⓘ objetivo     │ │ 🔒 sensível    │ │               │         │
│ │ [xlsx][pdf][csv]│ │ [pdf][xlsx]   │ │ [pdf][xlsx]   │         │
│ │ [ Exportar ▸ ] │ │ [ Exportar ▸ ]│ │ [ Exportar ▸ ]│         │
│ └───────────────┘ └───────────────┘ └───────────────┘         │
└────────────────────────────────────────────────────────────────┘
┌── histórico de exportações (tabela) ───────────────────────────┐
│ Quando        │ Relatório    │ Formato │ Período   │ Por quem   │
│ 29/06 14:32   │ Financeiro   │ PDF     │ Jun 1–9   │ Carlos     │
│ 28/06 09:10   │ Comissões    │ XLSX    │ Jun 1–15  │ Carlos     │
└────────────────────────────────────────────────────────────────┘

ABA NOTIFICAÇÕES
┌── filtros ─────────────────────────────────────────────────────┐
│ [Módulo ▾] [Cargo ▾] [só ativas ▢]                             │
└────────────────────────────────────────────────────────────────┘
┌── matriz de eventos (lista agrupada por categoria) ────────────┐
│ ▸ Agendamentos                                                  │
│   ┌──────────────────────────────────────────────────────────┐ │
│   │ N1 Novo agendamento          [●ON]  🔴🟡⚪→[🟡]          │ │
│   │ canais: [🟦✓][✉️✓][🟢 ][📱✓]                              │ │
│   │ recebe: [Gestor][Atendente][Profissional do horário] [+] │ │
│   │ envio:  ( ) imediato  (•) digest diário 19h               │ │
│   │ [👁 pré-visualizar mensagem]                              │ │
│   └──────────────────────────────────────────────────────────┘ │
│ ▸ Financeiro · ▸ Estoque · ▸ Marketing · ▸ Administrativo       │
└────────────────────────────────────────────────────────────────┘
```

**Padrões reaproveitados do sistema atual** (consistência visual): controle de abas/período `.seg` (igual ao `relatorios.component`), cards `.stat`, botões `.btn .btn-ghost .btn-sm`, ícones via `app-icon` (`download`, `bell`, `mail`), toast via `notify()`, `app-avatar` na coluna "por quem". Responsivo via `grid-template-columns: repeat(auto-fit, minmax(280px,1fr))` (padrão já usado nas campanhas).

---

## 7. Regras de permissão

| Recurso | Admin | Gestor | Atendente | Profissional |
|---|---|---|---|---|
| Exportar relatórios operacionais (R1–R6, R13–R14) | ✅ | ✅ | ✅ | só próprios |
| Exportar financeiro/comissões/margem (R7–R12, R15–R16, R20) | ✅ | ✅ | ❌ | só próprio recibo (R16/R15) |
| Exportar cadastro de equipe (R17) | ✅ | ❌ | ❌ | ❌ |
| Configurar **minhas** notificações | ✅ | ✅ | ✅ | ✅ |
| Configurar notificações **de outros usuários** | ✅ | ✅ | ❌ | ❌ |
| Definir destinatários/canais **globais** | ✅ | parcial¹ | ❌ | ❌ |
| Receber alertas administrativos (N23–N24) | ✅ | ❌ | ❌ | ❌ |
| Ver histórico de exportações de **todos** | ✅ | ✅ | só as próprias | só as próprias |

> ¹ Gestor configura o global de tudo **exceto** alertas administrativos/societários (N23, N24) e cadastro de equipe (R17).

**Princípios:**
1. **Menor privilégio por padrão** — usuário comum vê só o que é da sua função.
2. **Dados sensíveis exigem cargo** — financeiro consolidado, comissões de terceiros e margem nunca aparecem para Atendente/Profissional.
3. **Trilha de auditoria** — toda exportação sensível e toda mudança de config de notificação **gera registro** (alimenta N23 e o histórico).
4. **Profissional é sempre "self-service"** — só os próprios números, nunca de colegas.

---

## 8. Regras de configuração (notificações)

1. **Liga/desliga por evento** — exceto as obrigatórias (N6, N12, N18, N23, N24), que só permitem ajustar **canais**, nunca silenciar por completo.
2. **Canais por evento** — múltipla escolha; ao menos 1 canal ativo se a notificação estiver ligada. WhatsApp/E-mail dependem de integração configurada (senão fica desabilitado com aviso).
3. **Destinatários** — por **cargo**, **usuário específico** ou **grupo**; "dono do dado" para notificações pessoais.
4. **Janela de envio** — imediato **ou** agendado (digest diário/semanal em horário definido — ideal para N7, N14, N15, N20, reduzindo ruído).
5. **Recorrência** — resumos podem ser diários (ex.: fechamento 19h), semanais (ex.: gerencial segunda 08h) ou mensais.
6. **Prioridade** — define destaque visual e se "fura" o digest (🔴 sempre imediata, mesmo em modo resumo).
7. **Anti-ruído** — agrupamento (ex.: "5 clientes inativos" em vez de 5 avisos) e _quiet hours_ (não notificar fora do expediente, salvo 🔴).
8. **Pré-visualização** — toda notificação mostra o texto final com variáveis resolvidas (`{nome_cliente}`, `{profissional}`, `{valor}`) — mesmo motor de variáveis dos `modelos`.

---

## 9. Regras de exportação

1. **Formato por natureza do dado:**
   - **Excel/CSV** → dados tabulares para reanálise (R1, R4, R8, R11, R14, R17).
   - **PDF** → apresentação/prestação de contas (R7, R9, R16, R20).
   - Vários relatórios oferecem ambos; o card mostra só os formatos válidos.
2. **Período obrigatório** — toda exportação exige recorte temporal (default: período ativo no topo). Sem período = barrado.
3. **Filtros aplicados entram no arquivo** — cabeçalho do export registra filtros usados, período, data/hora e autor (rastreabilidade).
4. **Permissão verificada na geração** — botão desabilitado (🔒) para quem não pode; tentativa via API também é barrada no back.
5. **Histórico persistido** — cada export grava: quando, relatório, formato, período, filtros, **quem exportou**. Visível na aba Relatórios (escopo conforme permissão da seção 7).
6. **Exportação recorrente (agendada)** — Admin/Gestor pode programar o R20 (Gerencial) e o R7 (Financeiro) para envio automático por e-mail (ex.: toda segunda 08h). Reaproveita a infraestrutura de recorrência das notificações.
7. **Volume/limites** — exports muito grandes processados de forma assíncrona, com notificação 🟦 ao concluir ("Seu relatório está pronto").
8. **LGPD** — exports com dados pessoais (R4, R5, R6) marcados como sensíveis; idealmente anonimizáveis e sempre logados.

---

## 10. Sugestões de filtros (consolidado)

| Filtro | Aplica-se a | Fonte no modelo |
|---|---|---|
| **Período** (semana/mês/ano/custom) | todos | `data`/`hora`, mesmo recorte do BI |
| **Profissional** | R1, R2, R3, R8, R11, R12, R15, R16 | `staff` / `prof` |
| **Serviço / categoria de serviço** | R1, R12 | `servicos.cat` |
| **Status do agendamento** | R1, R2 | `status` (6 valores) |
| **Cliente / tag** | R1, R4, R5, R6, R9 | `clientes.tags` (`vip/novo/sumido`) |
| **Dias sem retorno** (30/60/90) | R5 | `diasDesde(ultima)` |
| **Forma de pagamento** | R8, R10 | `lancamentos.forma` |
| **Tipo (receita/despesa)** + categoria | R8 | `lancamentos.tipo/cat` |
| **Status da conta** (a vencer/vencido) | R9 | `aReceber.dias` |
| **Categoria / fornecedor de produto** | R13, R14 | `produtos.cat/fornecedor` |
| **Só abaixo do mínimo** | R13 | `produtosAlerta` |
| **Status / tipo de campanha** | R18 | `campanhas.status/tipo` |
| **Cargo / módulo / só ativas** | aba Notificações | modelo de cargos (seção 3) |

---

## 11. Sugestões de melhoria para o gestor

1. **Resumo executivo automático no e-mail** (R20 recorrente) — o gestor recebe o raio-X do negócio sem abrir o sistema.
2. **Alertas viram ação em 1 clique** — "5 clientes inativos" → abre lista → "Criar campanha de reativação" (liga N7 ao R5 e à campanha existente).
3. **Notificação de no-show reincidente** — cruzar `faltou` recorrente por cliente para sugerir _exigir sinal_ (reduz a perda de R$ 320/mês que o BI já mostra).
4. **Estoque preditivo** — em vez de avisar só quando zera (N18), avisar "no ritmo atual, a Pomada acaba em ~4 dias" cruzando `movEstoque` de saída.
5. **Comparativo de equipe no relatório** — R15 com semáforo de quem está acima/abaixo da meta (`metasEquipe()` já calcula).
6. **Favoritos de exportação** — salvar "relatório + filtros + formato" como atalho ("Comissões quinzenais", "Financeiro mensal p/ contador").
7. **Central de notificações in-app** — o sininho do `sidebar` (hoje só decorativo, com `tn-dot`) deve abrir o histórico real de alertas 🟦.

---

## 12. Critérios de aceite

- [ ] A tela aparece na navegação (`sidebar` + rota no `app.component`) com duas abas: Relatórios e Notificações.
- [ ] O catálogo lista os relatórios **permitidos ao cargo logado** (os bloqueados aparecem com 🔒 ou ocultos, conforme política).
- [ ] Cada relatório respeita os filtros e exige período antes de exportar.
- [ ] Exportar gera arquivo no formato escolhido (XLSX/PDF/CSV) **com cabeçalho de filtros/autor/data**.
- [ ] Toda exportação cria um registro no **histórico** com quem/quando/o quê (visível conforme permissão).
- [ ] A matriz de notificações lista os 25 eventos agrupados por categoria.
- [ ] Cada notificação permite: ligar/desligar (exceto obrigatórias), escolher canais, escolher destinatários (cargo/usuário/grupo), definir prioridade e janela de envio.
- [ ] Notificações **obrigatórias** não podem ser silenciadas — só têm canais ajustáveis.
- [ ] Pré-visualização mostra a mensagem com variáveis resolvidas.
- [ ] Permissões: Atendente/Profissional **não** acessam financeiro consolidado, comissões de terceiros nem config global.
- [ ] Mudança sensível (preço/comissão/usuário) dispara N23 ao Admin.
- [ ] Layout responsivo (grid `auto-fit`) e coerente com o tema (claro/escuro) do sistema.
- [ ] Funciona com a base mock e via API (`DataService` com fallback resiliente).

## 13. Possíveis melhorias futuras

1. **Módulo formal de Compras/Pedidos** — hoje só existe `movEstoque` (entrada) + `fornecedor`. Criar entidade `Pedido` (status criado/aprovado/cancelado/recebido) destrava os relatórios e notificações de **pedido criado/aprovado/cancelado** e **entrada de nota** pedidos no briefing.
2. **Construtor de relatórios customizados** — o gestor escolhe colunas/filtros e salva um relatório próprio.
3. **Agendamento avançado de exports** — múltiplos destinatários, cópia para o contador, formato por destinatário.
4. **Integração real de canais** — provedor de WhatsApp Business API, SMTP de e-mail e push (PWA/app). Hoje WhatsApp existe só conceitualmente nos `modelos`.
5. **Dashboards exportáveis** — exportar o próprio BI (gráficos) como PDF, não só os dados.
6. **Webhooks / integração contábil** — empurrar lançamentos para sistema contábil externo.
7. **Notificações inteligentes (anomalias)** — "faturamento de hoje 40% abaixo da média de quintas" em vez de só eventos discretos.
8. **Assinatura/criptografia de PDFs** sensíveis e expiração de links de download.

---

### Referências de mercado (benchmarking)
- [Fresha — Reports & analytics](https://www.fresha.com/for-business)
- [Booksy — Salon software reporting features](https://biz.booksy.com/)
- [Square Appointments — Reporting & notifications](https://squareup.com/us/en/appointments)

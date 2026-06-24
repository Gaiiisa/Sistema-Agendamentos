# Repaginação — Dashboard e Financeiro

Data: 2026-06-24
Status: aprovado (aguardando plano de implementação)

## Contexto

SaaS de agendamento para barbearia ("Navalha & Cia"), Angular standalone, tema
"Studio Clean" (índigo + neutros quentes, Inter / Geist Mono). Os dados vêm do
`DataService`, hidratado por API (porta 3000) com fallback para mock local.

O dono ficou insatisfeito com duas telas:

- **Dashboard** — estática, sem gráficos, indicadores com deltas inventados
  (`+3 vs. ontem`, `−2 melhor que a média` hardcoded), pouca informação acionável.
- **Financeiro · Visão geral** — monótona: cinco blocos de barras horizontais
  idênticas (forma, receita por categoria, despesa por categoria, por profissional),
  sem variedade visual; margem só aparece como texto.

Objetivo: mais informação **útil para o dono** e linguagem visual de gráficos
**variada**, mantendo o design system e sem adicionar bibliotecas de gráfico.

## Princípios

1. **Sem libs novas.** Gráficos em SVG/CSS leve, no mesmo espírito do que o app já
   faz (barras em flexbox, `.progress`). Criar componentes SVG reutilizáveis.
2. **Dados reais.** Tudo deriva de `DataService` (getters novos quando preciso).
   Zero números inventados na UI — deltas e projeções calculados.
3. **Reuso.** Aproveitar `.stat`, `.card`, `.progress`, `app-avatar`, `app-icon`,
   `app-status-pill`, tokens de `styles.css`.
4. **Escopo fechado.** Mexer só em Dashboard e na aba "Visão geral" do Financeiro.
   Abas Caixa / Lançamentos / A receber permanecem como estão.

## Componentes visuais novos (compartilhados)

Criar em `src/app/shared/` componentes standalone pequenos, cada um com uma
responsabilidade e API por `@Input()`:

### `app-sparkline`
- **Faz:** mini gráfico de linha inline (KPI cards).
- **Input:** `pontos: number[]`, `cor?: string`, `w?`, `h?`.
- **Saída:** `<svg><polyline>` com pontos normalizados ao min/max.
- **Depende de:** nada.

### `app-mini-ring`
- **Faz:** anel de progresso (ocupação, etc.).
- **Input:** `pct: number`, `cor?: string`, `size?`, `label?`.
- **Saída:** dois `<circle>` com `stroke-dasharray`/`dashoffset` calculados.

### `app-area-chart`
- **Faz:** gráfico de área/linha com 1–2 séries, eixo Y rotulado, gridlines suaves.
- **Input:** `labels: string[]`, `series: {dados:number[]; cor:string; tracejado?:boolean}[]`,
  `altura?`, `formatY?: (v)=>string`.
- **Saída:** `<svg>` responsivo (viewBox) — `<polygon>` para área, `<polyline>`
  para linha, `<line>` para grid, `<text>` para ticks. Pontos com `<circle>`.
- **Substitui:** o gráfico de barras em flexbox do fluxo de caixa.

### `app-donut`
- **Faz:** rosca de composição com fatias coloridas.
- **Input:** `fatias: {valor:number; cor:string; label:string}[]`, `size?`,
  `tampaCentro?: string` (texto central opcional).
- **Saída:** `<svg>` com `<circle>` por fatia via `stroke-dasharray` + offset
  acumulado (sem libs). Legenda renderizada pelo container, não pelo componente.

### `app-gauge`
- **Faz:** medidor semicircular (margem de lucro).
- **Input:** `pct: number`, `cor?: string`, `texto?: string`.
- **Saída:** dois `<path>` de arco semicircular (trilho + preenchido por
  `stroke-dasharray`), valor central em `<text>`.

Todos usam `currentColor`/variáveis de tema e funcionam em dark mode.

## Tela 1 — Dashboard

Ordem dos blocos (reaproveita `.page`, `.stat-grid`, `.grid-dash`):

1. **Saudação** — mantém.
2. **KPIs (4)** — reformulados, com mini-visual real em vez de delta fixo:
   - Faturamento hoje (realizado/previsto) + `app-sparkline` dos últimos 7 dias.
   - Agendamentos hoje + barra segmentada (feitos / a fazer / pendentes).
   - Ocupação + `app-mini-ring`.
   - Ticket médio hoje + delta real vs. ticket médio do mês.
3. **Meta do mês** — card slim: progresso `Σ vendido` / `Σ meta` da equipe +
   projeção linear de fechamento (`vendido / diaDoMes * diasNoMes`) com rótulo
   "meta batida / abaixo". (Mantido na proposta; baixa prioridade — fácil de cortar.)
4. **Faturamento · últimos 7 dias** — `app-area-chart` (série única) a partir de
   `financeiro.fluxo[].rec`. Mostra média/dia no cabeçalho.
5. **Grid 2 colunas:**
   - **Ocupação por horário** — barras por hora (09–18) com % de cadeiras ocupadas,
     destacando janelas livres (cor de alerta) + dica de encaixe. Derivado de
     `hoje` (appts por hora ÷ nº de profissionais ativos na hora).
   - **Desempenho por profissional · hoje** — por profissional: nº de atendimentos
     concluídos/agendados e receita do dia, com barra. Derivado de `hoje` + `servicos`.
6. **Grid 2 colunas (mantidos, refinados):**
   - **Próximos atendimentos** — como hoje.
   - Coluna lateral: **Alertas** (inclui "título vencido" puxado de `aReceber`) +
     **Aniversariante(s)** condensado.

### Getters novos em `DataService` (Dashboard)
- `faturamentoSparkline(): number[]` → `financeiro.fluxo.map(f => f.rec)`.
- `ticketMedioHoje(): number` → receita concluída hoje / nº concluídos.
- `metaMes(): { vendido; meta; pct; projecao; bateu }`.
- `ocupacaoPorHora(): { hora; pct }[]` (08–18).
- `desempenhoHoje(): { prof; atend; receita }[]`.
- `agendamentosHojeBreakdown(): { feitos; aFazer; pendentes }`.

## Tela 2 — Financeiro · Visão geral

Substitui o conteúdo atual da aba `visao` (demais abas intactas):

1. **KPIs (4)** — Faturamento (mês) com delta real vs. mês anterior; Despesas
   (% da receita); Resultado líquido (margem); **Projeção do mês** (novo).
2. **Receita × Despesa · 7 dias** — `app-area-chart` com duas séries
   (receita sólida, despesa tracejada) de `financeiro.fluxo`.
3. **Grid 2 colunas:**
   - **Receita por forma de pagamento** — `app-donut` (Pix/Cartão/Dinheiro) +
     legenda com valor e %.
   - **Margem de lucro** — `app-gauge` + frase em linguagem de dono.
4. **Grid 2 colunas:**
   - **De onde vem a receita** — `receitaCategoria` em barras (mantém, enxuto).
   - **Para onde vai a despesa** — `despesaCategoria` em barras.
5. **Receita por profissional · mês** — mantém (`porProfissional`), com pódio.

### Getters novos em `DataService` (Financeiro)
- `projecaoMes(): number` (ritmo dos dias decorridos).
- Reusar `recDelta`, `margem`, `pctDespesa` que já existem no componente.

## Cores dos gráficos

Reaproveitar tokens existentes para coerência:
- Receita / accent: `var(--accent)`.
- Despesa: `var(--st-faltou)`.
- Formas: Pix `var(--st-atendimento)`, Cartão `#7c3aed`, Dinheiro `var(--accent)`
  (já definidos em `FORMA_COR`).
- Profissionais: `staff[].cor`.

## Fora de escopo (YAGNI)

- Bibliotecas de gráfico (Chart.js etc.).
- Drill-down / filtros de período no gráfico do dashboard.
- Mudanças nas abas Caixa, Lançamentos e A receber.
- Persistência/edição de novos dados — só leitura/visualização.

## Critérios de aceite

- Dashboard e Financeiro·Visão renderizam com dados do `DataService` (mock ou API),
  sem valores hardcoded de tendência.
- Nenhuma dependência nova no `package.json`.
- Componentes de gráfico funcionam em tema claro e escuro.
- Responsivo: grids colapsam para 1 coluna em telas estreitas (igual hoje).
- Build (`ng build`) sem erros.

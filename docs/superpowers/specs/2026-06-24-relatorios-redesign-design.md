# Repaginação — Relatórios (BI)

Data: 2026-06-24
Status: proposta aprovada como mockup · implementação pendente

## Contexto

Continuação do redesign de [Dashboard e Financeiro](2026-06-24-dashboard-financeiro-redesign-design.md).
A tela de Relatórios (`src/app/screens/relatorios.component.ts`) é informativa, mas
tem dois problemas:

1. **Monotonia visual** — quase tudo é barra horizontal (`.progress`): ranking de
   serviços, ranking de profissionais, forma de pagamento, novos×recorrentes.
2. **Falta tendência temporal** — não há nenhum gráfico ao longo do tempo, que é o
   item mais valioso de um BI. Hoje só existe o total do período + delta.

Objetivo: mais informação acionável para o dono e linguagem de gráficos variada,
reusando os componentes SVG já criados (`app-area-chart`, `app-donut`) e sem libs.

## Princípios

Os mesmos do redesign anterior: sem libs de gráfico, dados reais do `DataService`,
reuso de componentes/tokens, escopo fechado (só a tela de Relatórios).

## Estrutura proposta (ordem dos blocos)

1. **Header** — título + seg de período (Semana / Mês / Ano) + Exportar. Mantém.
2. **KPIs (5)** — Faturamento (+delta real), Ticket médio, Ocupação, No-show,
   **Taxa de retorno** (novo: `recorrentes / (novos+recorrentes)`).
3. **Evolução do faturamento** — `app-area-chart` com duas séries: faturamento
   semanal (linha sólida) + meta semanal (linha tracejada). **Bloco novo, principal.**
4. **Grid 2 colunas:**
   - **Mapa de calor · horários de pico** — grade dia-da-semana × faixa horária,
     intensidade por volume de atendimentos. **Novo.**
   - **Forma de pagamento** — `app-donut` (reusa componente) + legenda com %.
5. **Grid 2 colunas:**
   - **Ranking de serviços** — barras (mantém), por receita.
   - **Metas da equipe** — progresso `vendido / meta` por profissional, com %.
     Dado já existe em `staff`; hoje só aparece na tela de Equipe. **Novo aqui.**
6. **Grid 2 colunas:**
   - **Mix de clientes** — novos × recorrentes (mantém) + frequência média.
   - **Clientes em risco** — clientes +60 dias sem voltar (tag `sumido` / `ultima`),
     com valor histórico e ação "Reativar". **Novo.**

## Novos componentes visuais

### `app-heatmap`
- **Faz:** grade de calor (dia × faixa horária) com célula colorida por intensidade.
- **Input:** `colLabels: string[]` (dias), `rowLabels: string[]` (faixas),
  `matriz: number[][]` (linhas = faixas, colunas = dias), `cor?: string`.
- **Saída:** CSS grid; cada célula com `background` em `rgba(cor, alpha)` onde
  `alpha = base + valorNormalizado`. Sem SVG, sem libs.
- **Depende de:** nada.

Os demais blocos reusam `app-area-chart` e `app-donut` já existentes.

## Dados novos no `DataService`

O objeto `relatorio` ganha dois campos; o resto já existe.

### `faturamentoSemanal: number[]`
Série das últimas ~8 semanas para a `app-area-chart`. Hoje só há `faturamento`
(total) e `faturamentoAnt`. Adicionar no mock e no payload da API.

```ts
faturamentoSemanal: [4200, 4650, 5120, 4980, 5340, 5510, 5120, 5860],
metaSemanal: 5000,
```

### `heatmap: number[][]`  (ou derivado)
Duas opções:

- **Mock (recomendado p/ consistência):** matriz `faixas × dias` no `relatorio`,
  no mesmo padrão dos outros agregados (`porForma`, `ocupacaoSemana`).
  ```ts
  heatmapDias:   ['Seg','Ter','Qua','Qui','Sex','Sáb'],
  heatmapFaixas: ['9h','11h','13h','15h','17h','19h'],
  heatmap: [ /* [faixa][dia] */
    [2,3,2,3,4,3],[3,4,3,4,4,3],[1,2,1,2,3,2],
    [2,3,2,4,4,3],[3,4,3,4,5,4],[4,5,4,5,5,3],
  ],
  ```
- **Derivado:** getter `heatmapHorarios()` que agrupa `agendamentos` por
  `dia-da-semana × hora`. Mais "real", porém limitado ao volume de mock existente
  (poucos pontos → mapa esparso).

### Getters auxiliares
- `taxaRetorno(): number` → `recorrentes / (novos + recorrentes) * 100`.
- `metasEquipe(): { prof: Staff; pct: number }[]` → `vendido / meta` por staff.
- `clientesEmRisco(): Cliente[]` → `clientes` com `tag 'sumido'` ou
  `diasDesde(ultima) > 60`, ordenados por total histórico desc.

## Cores dos gráficos

- Faturamento / accent: `var(--accent)`; meta: `var(--text-3)` tracejada.
- Heatmap: escala de `var(--accent)` por opacidade.
- Forma de pagamento: `FORMA_COR` existente (Pix/Cartão/Dinheiro).
- Serviços: `srv.cor`; profissionais: `staff.cor`.
- Metas/risco: semáforo via tokens de status (`--st-confirmado` / `--st-faltou`).

## Fora de escopo (YAGNI)

- Bibliotecas de gráfico.
- Filtros que recalculam as séries por período (o seg Semana/Mês/Ano permanece
  visual, como já é hoje) — pode ser fase posterior.
- Exportação real de PDF.

## Critérios de aceite

- Relatórios renderiza com dados do `DataService` (mock ou API), sem hardcode na UI.
- Nenhuma dependência nova no `package.json`.
- `app-heatmap` e os gráficos funcionam em tema claro e escuro.
- Grids colapsam para 1 coluna em telas estreitas.
- `ng build` sem erros.
